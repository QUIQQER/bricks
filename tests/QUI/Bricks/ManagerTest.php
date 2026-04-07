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
        $this->assertSame('foo', $result['data-attributes']['data-extra']);
        $this->assertSame('Size description', trim((string)$result['description']));
        $this->assertCount(2, $result['options']);
        $this->assertSame('small', $result['options'][0]['value']);
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
        $Manager = new class (true) extends Manager {
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

    public function testGroupVisibilityIncludesNobodyUsersForGuestGroup(): void
    {
        $GuestGroup = new \QUI\Groups\Guest();

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
            $Manager->exposeIsBrickVisibleForUserStatus(
                ['visibility' => 'groups', 'visibilityGroups' => $GuestGroup->getUUID()],
                false
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
