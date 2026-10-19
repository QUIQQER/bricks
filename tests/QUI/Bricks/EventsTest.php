<?php

namespace QUITests\Bricks;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Platforms\SQLitePlatform;
use Doctrine\DBAL\Query\QueryBuilder;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use QUI;
use QUI\Bricks\Brick;
use QUI\Bricks\Events;
use QUI\Bricks\Manager;
use QUI\Permissions\Permission;
use QUI\Projects\Project;
use QUI\Projects\Site\Edit;
use ReflectionProperty;
use Smarty;

class EventsTest extends TestCase
{
    private mixed $previousSaved;
    private mixed $previousPermissionUser;
    private mixed $previousConnection;
    private ?Manager $PreviousManager;

    protected function setUp(): void
    {
        $this->previousSaved = (new ReflectionProperty(Events::class, 'saved'))->getValue();
        $this->previousPermissionUser = (new ReflectionProperty(Permission::class, 'User'))->getValue();
        $this->previousConnection = (new ReflectionProperty(QUI::class, 'QueryBuilder'))->getValue();
        $this->PreviousManager = Manager::$BrickManager;
        (new ReflectionProperty(Events::class, 'saved'))->setValue(null, []);
    }

    protected function tearDown(): void
    {
        (new ReflectionProperty(Events::class, 'saved'))->setValue(null, $this->previousSaved);
        (new ReflectionProperty(Permission::class, 'User'))->setValue(null, $this->previousPermissionUser);
        (new ReflectionProperty(QUI::class, 'QueryBuilder'))->setValue(null, $this->previousConnection);
        Manager::$BrickManager = $this->PreviousManager;
    }

    public function testOnSmartyInitRegistersBrickareaPlugin(): void
    {
        $Smarty = new Smarty();

        Events::onSmartyInit($Smarty);

        $this->assertArrayHasKey('function', $Smarty->registered_plugins);
        $this->assertArrayHasKey('brickarea', $Smarty->registered_plugins['function']);
    }

    public function testOnSiteSaveReturnsEarlyIfSiteAlreadySaved(): void
    {
        $Site = $this->createMock(\QUI\Interfaces\Projects\Site::class);
        $Site->method('getId')->willReturn(42);

        $Reflection = new \ReflectionClass(Events::class);
        $savedProperty = $Reflection->getProperty('saved');
        $savedProperty->setAccessible(true);
        $savedProperty->setValue(null, [42 => true]);

        Events::onSiteSave($Site);

        $saved = $savedProperty->getValue();
        $this->assertIsArray($saved);
        $this->assertArrayHasKey(42, $saved);
    }

    /** @return iterable<string, array{bool}> */
    public static function saveUserContexts(): iterable
    {
        yield 'explicit user with anonymous session' => [true];
        yield 'legacy call without user' => [false];
    }

    #[DataProvider('saveUserContexts')]
    public function testOnSiteSavePreservesUserForPermissionAndNestedSave(bool $explicitUser): void
    {
        $User = $this->createMock(QUI\Users\User::class);
        $User->method('isSU')->willReturn(true);
        $Nobody = new QUI\Users\Nobody();
        Permission::setUser($explicitUser ? $Nobody : $User);

        $Result = $this->createMock(Result::class);
        $Result->method('fetchFirstColumn')->willReturn([]);
        $Connection = $this->createMock(Connection::class);
        $Connection->method('getDatabasePlatform')->willReturn(new SQLitePlatform());
        $Connection->method('executeQuery')->willReturn($Result);
        $Connection->method('createQueryBuilder')->willReturnCallback(
            static fn(): QueryBuilder => new QueryBuilder($Connection)
        );
        (new ReflectionProperty(QUI::class, 'QueryBuilder'))->setValue(null, $Connection);

        $Project = $this->createMock(Project::class);
        $Project->method('getName')->willReturn('phpunit_bricks_save_user');
        $Project->method('getLang')->willReturn('de');
        $Site = $this->createMock(Edit::class);
        $Site->method('getId')->willReturn(42);
        $Site->method('getProject')->willReturn($Project);
        $Site->method('getAttribute')->with('quiqqer.bricks.areas')->willReturn(
            '{"content":[{"brickId":7}]}'
        );
        $Site->expects(self::once())->method('setAttribute')->with(
            'quiqqer.bricks.areas',
            '{"content":[{"brickId":7,"uid":"phpunit-brick-uid"}]}'
        );
        $Site->expects(self::once())->method('save')->with($explicitUser ? $User : null);

        $Manager = $this->createMock(Manager::class);
        $Manager->method('getAreasByProject')->willReturn([
            ['name' => 'content', 'inheritance' => true]
        ]);
        $Manager->method('getBrickById')->willReturn($this->createMock(Brick::class));
        $Manager->method('createUniqueSiteBrick')->willReturn('phpunit-brick-uid');
        Manager::$BrickManager = $Manager;

        $SessionUser = $explicitUser ? $Nobody : $User;
        QUI::getUsers()->withSessionUser(
            $SessionUser,
            static function () use ($Site, $User, $explicitUser): void {
                if ($explicitUser) {
                    Events::onSiteSave($Site, $User);
                    return;
                }

                Events::onSiteSave($Site);
            }
        );
    }

    public function testOnSiteSaveDoesNotUseGlobalUserToBypassExplicitUserPermissions(): void
    {
        $GlobalUser = $this->createMock(QUI\Users\User::class);
        $GlobalUser->method('isSU')->willReturn(true);
        Permission::setUser($GlobalUser);
        $Site = $this->createMock(Edit::class);
        $Site->method('getId')->willReturn(42);
        $Site->expects(self::never())->method('save');

        $this->expectException(QUI\Permissions\Exception::class);
        Events::onSiteSave($Site, new QUI\Users\Nobody());
    }
}
