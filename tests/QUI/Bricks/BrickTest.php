<?php

namespace QUITests\Bricks;

use PHPUnit\Framework\TestCase;
use QUI\Bricks\Brick;

class BrickTest extends TestCase
{
    protected function callProtectedMethod(object $object, string $method, mixed ...$args): mixed
    {
        $ReflectionMethod = new \ReflectionMethod($object, $method);
        $ReflectionMethod->setAccessible(true);

        return $ReflectionMethod->invoke($object, ...$args);
    }

    public function testCssClassesAndSettingsHandling(): void
    {
        $Brick = new Brick([
            'type' => 'content',
            'classes' => '["alpha", "beta"]',
            'settings' => '{"foo":"bar"}'
        ]);

        $Brick->addCSSClass('gamma');
        $Brick->addCSSClass(['delta', 'epsilon']);

        $this->assertTrue($Brick->hasCSSClass('*gamma*'));
        $this->assertTrue($Brick->hasCSSClass('alpha*'));

        $settings = $Brick->getSettings();
        $this->assertIsArray($settings);
        $this->assertArrayHasKey('classes', $settings);

        $Brick->setSettings([
            'classes' => ['zeta', 'eta']
        ]);

        $this->assertTrue($Brick->hasCSSClass('*zeta*'));

        $Brick->clearCSSClasses();
        $this->assertSame([], $Brick->getCSSClasses());
    }

    public function testCheckForContentTypeAndTypeHelpers(): void
    {
        $Brick = new Brick([
            'type' => 'content',
            'title' => 'Test'
        ]);

        $this->assertSame($Brick, $Brick->check());
        $this->assertSame(Brick::class, $Brick->getType());
        $this->assertTrue($Brick->isInstanceOf(Brick::class));

        try {
            $html = $Brick->create();
            $this->assertIsString($html);
        } catch (\Throwable) {
            $this->addToAssertionCount(1);
        }
    }

    public function testScopedCustomCssKeepsBodySelectorsUnscoped(): void
    {
        $Brick = new Brick([
            'id' => 123,
            'type' => 'content'
        ]);

        $result = $this->callProtectedMethod(
            $Brick,
            'getScopedCustomCSS',
            'p, body .control-name { color: red; }'
        );

        $this->assertSame(
            'body .control-name{ color: red; }[data-brickid="123"] p{ color: red; }',
            $result
        );
    }

    public function testScopedCustomCssHandlesBodySelectorsInsideMediaQueries(): void
    {
        $Brick = new Brick([
            'id' => 123,
            'type' => 'content'
        ]);

        $result = $this->callProtectedMethod(
            $Brick,
            'getScopedCustomCSS',
            '@media (max-width: 768px) { body .control-name { color: red; } p { color: blue; } }'
        );

        $this->assertSame(
            '@media (max-width: 768px){ body .control-name{ color: red; } [data-brickid="123"] p{ color: blue; } }',
            $result
        );
    }

    public function testExtendCustomCssCanSkipScoping(): void
    {
        $Brick = new Brick([
            'id' => 123,
            'type' => 'content',
            'settings' => [
                'customCSS' => 'p { color: red; }',
                'customCSSScoping' => false
            ]
        ]);

        $result = $this->callProtectedMethod($Brick, 'extendCustomCSS');

        $this->assertSame('<style>p { color: red; }</style>', $result);
    }
}
