<?php

namespace QUITests\Bricks;

use DOMDocument;
use PHPUnit\Framework\TestCase;
use QUI\Bricks\Manager;

class ManagerTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tmpDir = sys_get_temp_dir() . '/quiqqer-bricks-manager-tests-' . md5((string)mt_rand());
        mkdir($this->tmpDir, 0777, true);
    }

    protected function tearDown(): void
    {
        parent::tearDown();

        if (is_dir($this->tmpDir)) {
            foreach ((array)scandir($this->tmpDir) as $file) {
                if ($file === '.' || $file === '..') {
                    continue;
                }

                @unlink($this->tmpDir . '/' . $file);
            }

            @rmdir($this->tmpDir);
        }
    }

    public function testInitAndCacheNamespace(): void
    {
        $Manager = Manager::init();

        $this->assertInstanceOf(Manager::class, $Manager);
        $this->assertSame('quiqqer/package/quiqqer/bricks/', Manager::getBrickCacheNamespace());
    }

    public function testBrickTypeLookupCachesExistingAndMissingIds(): void
    {
        $Manager = new class (true) extends Manager {
            public int $lookups = 0;

            protected function fetchBrickTypeById(int $id): ?string
            {
                $this->lookups++;

                return $id === 42 ? '\\Vendor\\FlexibleBrick' : null;
            }
        };

        $this->assertSame('\\Vendor\\FlexibleBrick', $Manager->getBrickTypeById(42));
        $this->assertSame('\\Vendor\\FlexibleBrick', $Manager->getBrickTypeById(42));
        $this->assertNull($Manager->getBrickTypeById(404));
        $this->assertNull($Manager->getBrickTypeById(404));
        $this->assertNull($Manager->getBrickTypeById(0));
        $this->assertSame(2, $Manager->lookups);
    }

    public function testWindowAutoHeightCapabilityBelongsToTheExactBrickType(): void
    {
        $Manager = new class (true) extends Manager {
            public int $definitionLookups = 0;

            public function getAvailableBricks(): array
            {
                $this->definitionLookups++;

                return [
                    [
                        'control' => '\\Vendor\\FlexibleBrick',
                        'supportsWindowAutoHeight' => 1
                    ],
                    [
                        'control' => '\\Vendor\\FixedBrick',
                        'supportsWindowAutoHeight' => 0
                    ]
                ];
            }
        };

        $this->assertTrue($Manager->supportsWindowAutoHeight('Vendor\\FlexibleBrick'));
        $this->assertTrue($Manager->supportsWindowAutoHeight(' \\Vendor\\FlexibleBrick '));
        $this->assertFalse($Manager->supportsWindowAutoHeight('\\Vendor\\FixedBrick'));
        $this->assertFalse($Manager->supportsWindowAutoHeight('\\Vendor\\UnknownBrick'));
        $this->assertSame(1, $Manager->definitionLookups);
    }

    public function testParseSettingToBrickArray(): void
    {
        $doc = new DOMDocument();
        $doc->loadXML(<<<'XML'
<setting name="size" type="select" class="SizeControl" data-qui="package/size" data-extra="foo">
  Size
  <description>Size description</description>
  <option value="small">Small</option>
  <option value="large">Large</option>
</setting>
XML
        );

        $node = $doc->getElementsByTagName('setting')->item(0);
        $this->assertNotNull($node);

        $Manager = new class (true) extends Manager {
            public function exposeParseSettingToBrickArray(\DOMNode $Setting): array
            {
                return $this->parseSettingToBrickArray($Setting);
            }
        };

        $result = $Manager->exposeParseSettingToBrickArray($node);

        $this->assertSame('size', $result['name']);
        $this->assertSame('select', $result['type']);
        $this->assertSame('SizeControl', $result['class']);
        $this->assertSame('package/size', $result['data-qui']);
        $this->assertSame('settings', $result['source']);
        $this->assertSame('foo', $result['data-attributes']['data-extra']);
        $this->assertSame('Size description', trim((string)$result['description']));
        $this->assertCount(2, $result['options']);
        $this->assertSame('small', $result['options'][0]['value']);
    }

    public function testParseWindowSettingToBrickArray(): void
    {
        $doc = new DOMDocument();
        $doc->loadXML(<<<'XML'
<settings name="accordion-entries">
  <title>Entries</title>
  <input conf="entries" type="hidden" label="false" data-qui="package/accordion" data-extra="foo">
    <text>
      <locale group="quiqqer/bricks" var="brick.accordion.entries"/>
    </text>
  </input>
</settings>
XML
        );

        $node = $doc->getElementsByTagName('settings')->item(0);
        $this->assertNotNull($node);

        $Manager = new class (true) extends Manager {
            public function exposeParseWindowSettingToBrickArray(\DOMNode $Setting): array
            {
                return $this->parseWindowSettingToBrickArray($Setting);
            }
        };

        $result = $Manager->exposeParseWindowSettingToBrickArray($node);

        $this->assertCount(1, $result);
        $this->assertSame('entries', $result[0]['name']);
        $this->assertSame(
            ['quiqqer/bricks', 'brick.accordion.entries'],
            $result[0]['text']
        );
        $this->assertSame('hidden', $result[0]['type']);
        $this->assertSame('package/accordion', $result[0]['data-qui']);
        $this->assertSame('window', $result[0]['source']);
        $this->assertSame('foo', $result[0]['data-attributes']['data-extra']);
    }

    public function testGetAvailableBrickSettingsIncludesWindowFieldsOnce(): void
    {
        $brickType = '\Vendor\Accordion' . md5((string)mt_rand());
        $xmlFile = $this->tmpDir . '/bricks.xml';

        file_put_contents($xmlFile, <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<quiqqer>
    <bricks>
        <brick control="{$brickType}">
            <settings>
                <setting name="template" type="select">
                    <option value="default">Default</option>
                </setting>
            </settings>
            <window>
                <categories>
                    <category name="accordion-entries" index="1">
                        <settings name="accordion-entries">
                            <title>Entries</title>
                            <input conf="entries" type="hidden" data-qui="package/accordion">
                                <text>Accordion entries</text>
                            </input>
                        </settings>
                        <settings name="accordion-template">
                            <title>Duplicate template</title>
                            <input conf="template" type="text">
                                <text>Template duplicate</text>
                            </input>
                        </settings>
                    </category>
                </categories>
            </window>
        </brick>
    </bricks>
</quiqqer>
XML);

        $Manager = new class ($xmlFile) extends Manager {
            public function __construct(private readonly string $xmlFile)
            {
                parent::__construct(true);
            }

            protected function getBricksXMLFiles(): array
            {
                return [$this->xmlFile];
            }
        };

        $result = $Manager->getAvailableBrickSettingsByBrickType($brickType);
        $names = array_column($result, 'name');
        $entries = array_values(array_filter($result, static function (array $setting) {
            return $setting['name'] === 'entries';
        }));

        $this->assertContains('entries', $names);
        $this->assertCount(1, array_keys($names, 'template', true));
        $this->assertCount(1, $entries);
        $this->assertSame('window', $entries[0]['source']);
        $this->assertSame('package/accordion', $entries[0]['data-qui']);
    }

    public function testBrickVisibilityModeDefaultsToAlways(): void
    {
        $Manager = new class (true) extends Manager {
            public function exposeGetBrickVisibilityMode(array|string $customFields): string
            {
                return $this->getBrickVisibilityMode($customFields);
            }
        };

        $this->assertSame('always', $Manager->exposeGetBrickVisibilityMode([]));
        $this->assertSame('always', $Manager->exposeGetBrickVisibilityMode(''));
        $this->assertSame(
            'always',
            $Manager->exposeGetBrickVisibilityMode(['visibility' => 'invalid'])
        );
    }

    public function testBrickVisibilityModeAcceptsPhaseOneValues(): void
    {
        $Manager = new class (new \QUI\Users\SystemUser()) extends Manager {
            private \QUI\Interfaces\Users\User $SessionUser;

            public function __construct(\QUI\Interfaces\Users\User $SessionUser)
            {
                $this->SessionUser = $SessionUser;
                parent::__construct(true);
            }

            protected function getSessionUser(): \QUI\Interfaces\Users\User
            {
                return $this->SessionUser;
            }

            public function exposeGetBrickVisibilityMode(array|string $customFields): string
            {
                return $this->getBrickVisibilityMode($customFields);
            }

            public function exposeIsBrickVisibleForUserStatus(
                array|string $customFields,
                bool $isAuthenticated
            ): bool {
                return $this->isBrickVisibleForUserStatus($customFields, $isAuthenticated);
            }
        };

        $this->assertSame(
            'guest',
            $Manager->exposeGetBrickVisibilityMode(['visibility' => 'guest'])
        );
        $this->assertSame(
            'authenticated',
            $Manager->exposeGetBrickVisibilityMode('{"visibility":"authenticated"}')
        );
        $this->assertSame(
            'groups',
            $Manager->exposeGetBrickVisibilityMode(['visibility' => 'groups'])
        );

        $this->assertTrue(
            $Manager->exposeIsBrickVisibleForUserStatus(['visibility' => 'guest'], false)
        );
        $this->assertFalse(
            $Manager->exposeIsBrickVisibleForUserStatus(['visibility' => 'guest'], true)
        );
        $this->assertTrue(
            $Manager->exposeIsBrickVisibleForUserStatus(
                ['visibility' => 'authenticated'],
                true
            )
        );
        $this->assertFalse(
            $Manager->exposeIsBrickVisibleForUserStatus(
                ['visibility' => 'authenticated'],
                false
            )
        );
    }

    public function testGuestVisibilityIncludesNobodyUsersEvenWhenAuthenticated(): void
    {
        $Manager = new class (new \QUI\Users\Nobody()) extends Manager {
            private \QUI\Interfaces\Users\User $SessionUser;

            public function __construct(\QUI\Interfaces\Users\User $SessionUser)
            {
                $this->SessionUser = $SessionUser;
                parent::__construct(true);
            }

            protected function getSessionUser(): \QUI\Interfaces\Users\User
            {
                return $this->SessionUser;
            }

            public function exposeIsBrickVisibleForUserStatus(
                array|string $customFields,
                bool $isAuthenticated
            ): bool {
                return $this->isBrickVisibleForUserStatus($customFields, $isAuthenticated);
            }
        };

        $this->assertTrue(
            $Manager->exposeIsBrickVisibleForUserStatus(['visibility' => 'guest'], true)
        );
    }

    public function testGuestVisibilityDoesNotTreatSystemUserAsGuest(): void
    {
        $Manager = new class (new \QUI\Users\SystemUser()) extends Manager {
            private \QUI\Interfaces\Users\User $SessionUser;

            public function __construct(\QUI\Interfaces\Users\User $SessionUser)
            {
                $this->SessionUser = $SessionUser;
                parent::__construct(true);
            }

            protected function getSessionUser(): \QUI\Interfaces\Users\User
            {
                return $this->SessionUser;
            }

            public function exposeIsBrickVisibleForUserStatus(
                array|string $customFields,
                bool $isAuthenticated
            ): bool {
                return $this->isBrickVisibleForUserStatus($customFields, $isAuthenticated);
            }
        };

        $this->assertFalse(
            $Manager->exposeIsBrickVisibleForUserStatus(['visibility' => 'guest'], true)
        );
    }

    public function testAuthenticatedVisibilityExcludesNobodyUsersEvenWhenAuthenticated(): void
    {
        $Manager = new class (new \QUI\Users\Nobody()) extends Manager {
            private \QUI\Interfaces\Users\User $SessionUser;

            public function __construct(\QUI\Interfaces\Users\User $SessionUser)
            {
                $this->SessionUser = $SessionUser;
                parent::__construct(true);
            }

            protected function getSessionUser(): \QUI\Interfaces\Users\User
            {
                return $this->SessionUser;
            }

            public function exposeIsBrickVisibleForUserStatus(
                array|string $customFields,
                bool $isAuthenticated
            ): bool {
                return $this->isBrickVisibleForUserStatus($customFields, $isAuthenticated);
            }
        };

        $this->assertFalse(
            $Manager->exposeIsBrickVisibleForUserStatus(
                ['visibility' => 'authenticated'],
                true
            )
        );
    }

    public function testBrickVisibilityGroupsAreParsedAndMatched(): void
    {
        $Manager = new class (true) extends Manager {
            public function exposeGetBrickVisibilityGroupIds(array|string $customFields): array
            {
                return $this->getBrickVisibilityGroupIds($customFields);
            }

            public function exposeIsBrickVisibleForGroups(
                array|string $customFields,
                array $userGroupIds
            ): bool {
                return $this->isBrickVisibleForGroups($customFields, $userGroupIds);
            }
        };

        $this->assertSame(
            ['1', '2'],
            $Manager->exposeGetBrickVisibilityGroupIds(['visibilityGroups' => '1,2'])
        );
        $this->assertSame(
            ['3', '4'],
            $Manager->exposeGetBrickVisibilityGroupIds(['visibilityGroups' => ['3', '4']])
        );

        $this->assertTrue(
            $Manager->exposeIsBrickVisibleForGroups(
                ['visibilityGroups' => '1,2'],
                ['2', '8']
            )
        );
        $this->assertFalse(
            $Manager->exposeIsBrickVisibleForGroups(
                ['visibilityGroups' => '1,2'],
                ['8', '9']
            )
        );
        $this->assertFalse(
            $Manager->exposeIsBrickVisibleForGroups(
                ['visibilityGroups' => ''],
                ['1']
            )
        );
    }
}
