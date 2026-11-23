<?php

namespace QUITests\Bricks\Integration;

use PHPUnit\Framework\TestCase;
use QUI;
use QUI\Bricks\BackendSearch\Provider\Bricks as SearchProvider;
use QUI\Bricks\Manager;
use QUI\Projects\Project;

class DatabaseAccessTest extends TestCase
{
    private Manager $Manager;
    private Project $Project;
    private int $brickId;
    private string $title;
    private string $uid;

    protected function setUp(): void
    {
        parent::setUp();

        $projects = QUI::getProjectManager()->getProjectList();

        if ($projects === []) {
            self::markTestSkipped('No QUIQQER project is available for the Bricks integration test.');
        }

        $Project = reset($projects);

        if (!$Project instanceof Project) {
            self::markTestSkipped('No usable QUIQQER project is available for the Bricks integration test.');
        }

        $SchemaManager = QUI::getSchemaManager();

        if (
            !$SchemaManager->tablesExist([Manager::getTable()])
            || !$SchemaManager->tablesExist([Manager::getUIDTable()])
        ) {
            self::markTestSkipped('The Bricks database tables are not installed.');
        }

        $this->Project = $Project;
        $this->Manager = new Manager(true);
        $suffix = bin2hex(random_bytes(8));
        $this->title = 'PHPUnit DBAL Needle ' . $suffix;
        $this->uid = QUI\Utils\Uuid::get();

        $Connection = QUI::getDataBaseConnection();
        $Connection->insert(QUI\Utils\Doctrine::quoteIdentifier(Manager::getTable()), [
            QUI\Utils\Doctrine::quoteIdentifier('project') => $Project->getName(),
            QUI\Utils\Doctrine::quoteIdentifier('lang') => $Project->getLang(),
            QUI\Utils\Doctrine::quoteIdentifier('title') => $this->title,
            QUI\Utils\Doctrine::quoteIdentifier('description') => 'Portable DBAL integration fixture',
            QUI\Utils\Doctrine::quoteIdentifier('type') => 'content',
            QUI\Utils\Doctrine::quoteIdentifier('active') => 1
        ]);

        $QueryBuilder = QUI::getQueryBuilder();
        $brickId = $QueryBuilder
            ->select('id')
            ->from(QUI\Utils\Doctrine::quoteIdentifier(Manager::getTable()))
            ->where($QueryBuilder->expr()->eq('project', ':project'))
            ->andWhere($QueryBuilder->expr()->eq('lang', ':lang'))
            ->andWhere($QueryBuilder->expr()->eq('title', ':title'))
            ->setParameter('project', $Project->getName())
            ->setParameter('lang', $Project->getLang())
            ->setParameter('title', $this->title)
            ->setMaxResults(1)
            ->executeQuery()
            ->fetchOne();

        if ($brickId === false) {
            self::fail('Could not load the inserted Bricks integration fixture.');
        }

        $this->brickId = (int)$brickId;

        $Connection->insert(QUI\Utils\Doctrine::quoteIdentifier(Manager::getUIDTable()), [
            QUI\Utils\Doctrine::quoteIdentifier('uid') => $this->uid,
            QUI\Utils\Doctrine::quoteIdentifier('brickId') => $this->brickId,
            QUI\Utils\Doctrine::quoteIdentifier('project') => $Project->getName(),
            QUI\Utils\Doctrine::quoteIdentifier('lang') => $Project->getLang(),
            QUI\Utils\Doctrine::quoteIdentifier('siteId') => 1,
            QUI\Utils\Doctrine::quoteIdentifier('customfields') => null,
            QUI\Utils\Doctrine::quoteIdentifier('attributes') => '{}'
        ]);
    }

    protected function tearDown(): void
    {
        if (isset($this->uid)) {
            QUI::getDataBaseConnection()->delete(
                QUI\Utils\Doctrine::quoteIdentifier(Manager::getUIDTable()),
                [QUI\Utils\Doctrine::quoteIdentifier('uid') => $this->uid]
            );
        }

        if (isset($this->brickId)) {
            QUI::getDataBaseConnection()->delete(
                QUI\Utils\Doctrine::quoteIdentifier(Manager::getTable()),
                [QUI\Utils\Doctrine::quoteIdentifier('id') => $this->brickId]
            );
        }

        parent::tearDown();
    }

    public function testNonInheritablePlacementsKeepSeparateUuidsWhenReordered(): void
    {
        $areas = json_encode(['noSidebar' => [
            ['brickId' => $this->brickId, 'customfields' => ['max' => 5, 'inheritance' => 1]],
            ['brickId' => $this->brickId, 'customfields' => ['max' => 15]]
        ]], JSON_THROW_ON_ERROR);
        $Site = $this->createMock(QUI\Interfaces\Projects\Site::class);
        $Site->method('getId')->willReturn(random_int(1800000000, 2000000000));
        $Site->method('getProject')->willReturn($this->Project);
        $Site->method('getAttribute')->with('quiqqer.bricks.areas')->willReturnCallback(
            static function () use (&$areas): string {
                return $areas;
            }
        );
        $Site->method('setAttribute')->willReturnCallback(
            static function ($name, $value) use (&$areas, $Site) {
                $areas = $value;
                return $Site;
            }
        );
        $User = $this->createMock(QUI\Users\User::class);
        $User->method('isSU')->willReturn(true);

        $PreviousManager = Manager::$BrickManager;
        $Manager = $this->getMockBuilder(Manager::class)
            ->setConstructorArgs([true])
            ->onlyMethods(['getAreasByProject'])
            ->getMock();
        $Manager->method('getAreasByProject')->willReturn([['name' => 'noSidebar', 'inheritance' => false]]);
        $Connection = QUI::getDataBaseConnection();
        $Connection->beginTransaction();
        Manager::$BrickManager = $Manager;

        try {
            QUI\Bricks\Events::onSiteSave($Site, $User);
            $placements = json_decode($areas, true, flags: JSON_THROW_ON_ERROR)['noSidebar'];
            [$first, $second] = array_column($placements, 'uid');
            self::assertTrue(\Ramsey\Uuid\Uuid::isValid($first));
            self::assertTrue(\Ramsey\Uuid\Uuid::isValid($second));
            self::assertNotSame($first, $second);

            $areas = json_encode(['noSidebar' => array_reverse($placements)], JSON_THROW_ON_ERROR);
            QUI\Bricks\Events::onSiteSave($Site, $User);
            self::assertSame(
                [$second, $first],
                array_column(json_decode($areas, true, flags: JSON_THROW_ON_ERROR)['noSidebar'], 'uid')
            );
            self::assertSame('5', $Manager->getBrickByUID($first)->getSetting('max'));
            self::assertSame('15', $Manager->getBrickByUID($second)->getSetting('max'));

            $areas = '[]';
            QUI\Bricks\Events::onSiteSave($Site, $User);
            self::assertFalse($Manager->existsUniqueBrickId($first));
            self::assertFalse($Manager->existsUniqueBrickId($second));
        } finally {
            Manager::$BrickManager = $PreviousManager;
            $Connection->rollBack();
        }
    }

    public function testManagerReadsBrickAndUniqueIdThroughDbal(): void
    {
        $Brick = $this->Manager->getBrickById($this->brickId);

        self::assertSame($this->title, $Brick->getAttribute('title'));
        self::assertTrue($this->Manager->titleExists($this->Project, $this->title));
        self::assertFalse($this->Manager->titleExists($this->Project, $this->title . ' missing'));
        self::assertTrue($this->Manager->existsUniqueBrickId($this->uid));
        self::assertFalse($this->Manager->existsUniqueBrickId($this->uid . '-missing'));

        $records = $this->Manager->getBrickRecordsFromProject($this->Project);
        $recordIds = array_map(static fn (array $record): int => (int)$record['id'], $records);

        self::assertContains($this->brickId, $recordIds);
    }

    public function testManagerReadsBrickByNumericIdOrUuid(): void
    {
        self::assertSame(
            $this->brickId,
            $this->Manager->getBrickByIdentifier($this->brickId)->getAttribute('id')
        );
        self::assertSame(
            $this->brickId,
            $this->Manager->getBrickByIdentifier((string)$this->brickId)->getAttribute('id')
        );
        self::assertSame(
            $this->brickId,
            (int)$this->Manager->getBrickByIdentifier($this->uid)->getAttribute('id')
        );
    }

    public function testManagerRejectsInvalidBrickIdentifier(): void
    {
        $this->expectException(QUI\Exception::class);
        $this->expectExceptionMessage('Invalid brick identifier');

        $this->Manager->getBrickByIdentifier('not-a-brick-identifier');
    }

    public function testBackendSearchUsesPortableCaseInsensitiveQueryAndLimit(): void
    {
        $Provider = new SearchProvider();
        $results = $Provider->search(mb_strtoupper($this->title), ['limit' => 1]);

        self::assertCount(1, $results);
        self::assertSame($this->title, $results[0]['title']);
        self::assertSame(
            $this->Project->getName() . '-' . $this->Project->getLang() . '-' . $this->brickId,
            $results[0]['id']
        );
    }
}
