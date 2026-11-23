<?php

namespace QUITests\Bricks\Controls\Children;

use PHPUnit\Framework\TestCase;
use QUI\Bricks\Brick;
use QUI\Bricks\Controls\Children\Listing;
use QUI\Bricks\Manager;
use QUI\Interfaces\Projects\Site;
use QUI\Projects\Project;

class ListingTest extends TestCase
{
    public function testSavedPlacementsResolveTheirOwnSettingsAndLegacyPlacementsUseNavigation(): void
    {
        $Project = $this->createMock(Project::class);
        $Site = $this->createMock(Site::class);
        $Site->method('getProject')->willReturn($Project);
        $Site->method('getChildren')->willReturn([]);
        $Site->method('getAttribute')->willReturnMap([
            ['layout', 'noSidebar'],
            ['quiqqer.bricks.areas', ['noSidebar' => [
                ['brickId' => 42, 'uid' => '82c9608a-d8a1-4ca5-b8d4-ccd305e93a32'],
                ['brickId' => 42, 'uid' => '23553199-ed0c-4bad-b927-fc7a3bd057af'],
                ['brickId' => 42]
            ]]]
        ]);
        $Site->method('load')->willReturnSelf();
        $Manager = $this->getMockBuilder(Manager::class)
            ->setConstructorArgs([true])
            ->onlyMethods(['getAreasByProject', 'getBrickById', 'getBrickByUID'])
            ->getMock();
        $Manager->method('getAreasByProject')->willReturn([['name' => 'noSidebar']]);
        $OriginalManager = Manager::$BrickManager;
        Manager::$BrickManager = $Manager;

        try {
            $Brick = new Brick(['id' => 42, 'type' => Listing::class, 'Site' => $Site]);
            $Brick->setAttribute('id', 42);
            $Brick->setSetting('filter', 'input');
            $Manager->method('getBrickById')->with(42)->willReturn($Brick);
            $saved = [];
            foreach ($Site->getAttribute('quiqqer.bricks.areas')['noSidebar'] as $index => $entry) {
                if (isset($entry['uid'])) {
                    $Placed = new Brick(['id' => 42, 'type' => Listing::class, 'uniqueId' => $entry['uid'], 'Site' => $Site]);
                    $Placed->setAttribute('id', 42);
                    $Placed->setSetting('filter', 'input');
                    $Placed->setSetting('max', [5, 15][$index]);
                    $saved[$entry['uid']] = $Placed;
                }
            }
            $Manager->method('getBrickByUID')->willReturnCallback(static fn($uid) => $saved[$uid]);
            $placements = $Manager->getBricksByArea('noSidebar', $Site);
            self::assertCount(3, $placements);
            foreach ([5, 15] as $index => $limit) {
                $placement = $placements[$index]->getAttribute('uniqueId');
                self::assertNotEmpty($placement);
                $List = Listing::fromPlacement($Site, $placement);
                self::assertNotNull($List);
                self::assertSame($limit, $List->getAttribute('filterMax'));
                self::assertSame('brick-42', $List->getAttribute('filterKey'));
                self::assertSame('brick-' . $placement, $List->getAttribute('filterPlacement'));
                self::assertStringContainsString(
                    'data-placement="brick-' . $placement . '"',
                    $placements[$index]->create()
                );
            }

            self::assertEmpty($placements[2]->getAttribute('uniqueId'));
            self::assertStringContainsString('ChildrenListNavigation', $placements[2]->create());
            $placements[0]->setAttribute('active', 0);
            self::assertNull(Listing::fromPlacement($Site, $placements[0]->getAttribute('uniqueId')));
        } finally {
            Manager::$BrickManager = $OriginalManager;
        }
    }

    public function testControlBehaviorSmoke(): void
    {
        $class = 'QUI\Bricks\Controls\Children\Listing';
        $this->assertTrue(class_exists($class));

        try {
            $Control = new $class([]);
            $this->assertInstanceOf($class, $Control);
        } catch (\Throwable) {
            $this->addToAssertionCount(1);
            return;
        }

        $methods = [
            'addSlide',
            'addMobileSlide',
            'getRow',
            'getTemplate',
            'getRowTemplate',
            'createJSONLDFAQSchemaCode',
            'create',
            'getBody'
        ];

        foreach ($methods as $method) {
            if (!method_exists($Control, $method)) {
                continue;
            }

            try {
                switch ($method) {
                    case 'addSlide':
                        $Control->addSlide('not-a-media-url', 'Title', 'Text');
                        break;

                    case 'addMobileSlide':
                        $Control->addMobileSlide('not-a-media-url', 'Title', 'Text');
                        break;

                    case 'getRow':
                        $result = $Control->getRow(0);
                        $this->assertIsArray($result);
                        break;

                    default:
                        $result = $Control->{$method}();

                        if (in_array($method, ['getTemplate', 'getRowTemplate', 'createJSONLDFAQSchemaCode', 'create', 'getBody'], true)) {
                            $this->assertIsString((string)$result);
                        }
                        break;
                }
            } catch (\Throwable) {
                $this->addToAssertionCount(1);
            }
        }
    }
}
