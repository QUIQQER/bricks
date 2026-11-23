<?php

namespace QUITests\Bricks\Integration;

use Doctrine\DBAL\DriverManager;
use PHPUnit\Framework\TestCase;
use QUI\Bricks\Layout\OverlayMigration;

class OverlayMigrationTest extends TestCase
{
    public function testSetupEndRegistrationMatchesCoreDispatch(): void
    {
        $xml = simplexml_load_file(__DIR__ . '/../../events.xml');
        $called = false;
        $Events = new \QUI\Events\Event();
        foreach ($xml->event as $event) {
            if ((string)$event['fire'] === '\\QUI\\Bricks\\Layout\\OverlayMigration::onSetup') {
                $Events->addEvent((string)$event['on'], static function () use (&$called): void {
                    $called = true;
                });
            }
        }
        $Events->fireEvent('packageSetupEnd-quiqqer/bricks');
        self::assertTrue($called);
    }

    public function testAllStoragePathsRetryAndUnchangedRows(): void
    {
        $DB = DriverManager::getConnection(['driver' => 'pdo_sqlite', 'memory' => true]);
        $DB->executeStatement('CREATE TABLE bricks (id INTEGER PRIMARY KEY, type TEXT, settings TEXT, e_date TEXT)');
        $DB->executeStatement('CREATE TABLE uids (uid TEXT PRIMARY KEY, brickId INTEGER, customfields TEXT)');
        $DB->executeStatement('CREATE TABLE sites (id INTEGER PRIMARY KEY, extra TEXT, e_date TEXT)');
        $legacy = json_encode(['layoutAreas' => json_encode(['areas' => ['a' => [
            'backgroundOverlayColor' => '#11223380', 'backgroundOverlayOpacity' => 50
        ]]])]);
        $opaque = '{ "layoutAreas": "{\"areas\":{\"a\":{\"backgroundOverlayColor\":\"#fff\",\"backgroundOverlayOpacity\":100}}}" }';
        $invalid = '{"layoutAreas":"invalid json"}';
        $type = '\\QUI\\Bricks\\Controls\\MultiLayout';
        $DB->insert('bricks', ['id' => 1, 'type' => $type, 'settings' => $legacy, 'e_date' => 'keep']);
        $DB->insert('bricks', ['id' => 0, 'type' => $type, 'settings' => $invalid]);
        $DB->insert('bricks', ['id' => 3, 'type' => $type, 'settings' => $opaque]);
        $DB->insert('bricks', ['id' => 4, 'type' => 'other', 'settings' => $legacy]);
        $DB->insert('uids', ['uid' => 'bad', 'brickId' => 1, 'customfields' => $invalid]);
        $DB->insert('uids', ['uid' => 'u', 'brickId' => 1, 'customfields' => $legacy]);
        $extra = json_encode(['unrelated' => (object)[], 'quiqqer.bricks.areas' => json_encode([
            'header' => [
                (object)['brickId' => 1, 'customfields' => $invalid],
                (object)['brickId' => 1, 'uid' => 'u', 'customfields' => $legacy]
            ],
            'footer' => [(object)['brickId' => 4, 'customfields' => $legacy]]
        ])]);
        $nullAssignments = '{"quiqqer.bricks.areas":"null"}';
        $DB->insert('sites', ['id' => 1, 'extra' => $nullAssignments]);
        $emptyAssignments = '{"quiqqer.bricks.areas":""}';
        $DB->insert('sites', ['id' => 2, 'extra' => $emptyAssignments]);
        $invalidJson = '{"quiqqer.bricks.areas":"{"}';
        $DB->insert('sites', ['id' => 3, 'extra' => $invalidJson]);
        $DB->insert('sites', ['id' => 4, 'extra' => $extra, 'e_date' => 'keep']);

        self::assertSame(3, OverlayMigration::migrate($DB, 'bricks', 'uids', ['sites']));
        $converted = $DB->fetchOne('SELECT settings FROM bricks WHERE id = 1');
        self::assertStringContainsString('#11223340', $converted);
        self::assertSame(0, OverlayMigration::migrate($DB, 'bricks', 'uids', ['sites']));
        self::assertSame($converted, $DB->fetchOne('SELECT settings FROM bricks WHERE id = 1'));
        self::assertSame($invalid, $DB->fetchOne('SELECT settings FROM bricks WHERE id = 0'));
        self::assertSame($invalid, $DB->fetchOne("SELECT customfields FROM uids WHERE uid = 'bad'"));
        self::assertSame($converted, $DB->fetchOne("SELECT customfields FROM uids WHERE uid = 'u'"));
        self::assertSame($opaque, $DB->fetchOne('SELECT settings FROM bricks WHERE id = 3'));
        self::assertSame($legacy, $DB->fetchOne('SELECT settings FROM bricks WHERE id = 4'));
        self::assertSame('keep', $DB->fetchOne('SELECT e_date FROM bricks WHERE id = 1'));
        self::assertSame('keep', $DB->fetchOne('SELECT e_date FROM sites WHERE id = 4'));
        self::assertSame($nullAssignments, $DB->fetchOne('SELECT extra FROM sites WHERE id = 1'));
        self::assertSame($emptyAssignments, $DB->fetchOne('SELECT extra FROM sites WHERE id = 2'));
        self::assertSame($invalidJson, $DB->fetchOne('SELECT extra FROM sites WHERE id = 3'));
        $result = json_decode($DB->fetchOne('SELECT extra FROM sites WHERE id = 4'));
        $areas = json_decode($result->{'quiqqer.bricks.areas'});
        self::assertEquals((object)[], $result->unrelated);
        self::assertSame($invalid, $areas->header[0]->customfields);
        self::assertSame($converted, $areas->header[1]->customfields);
        self::assertSame($legacy, $areas->footer[0]->customfields);
        $DB->close();
    }
}
