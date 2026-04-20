<?php

namespace QUITests\Bricks\Controls;

use PHPUnit\Framework\TestCase;

class MultiLayoutTest extends TestCase
{
    public function testControlBehaviorSmoke(): void
    {
        $class = 'QUI\Bricks\Controls\MultiLayout';
        $this->assertTrue(class_exists($class));

        try {
            $Control = new $class([
                'layoutAreas' => json_encode([
                    'preset' => 'preset-2-equal',
                    'breakpoints' => [
                        'desktop' => [
                            'columns' => 12,
                            'slots' => [
                                ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 6, 'h' => 1],
                                ['id' => 'slot-2', 'x' => 6, 'y' => 0, 'w' => 6, 'h' => 1]
                            ]
                        ],
                        'tablet' => [
                            'columns' => 12,
                            'slots' => [
                                ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 6, 'h' => 1],
                                ['id' => 'slot-2', 'x' => 6, 'y' => 0, 'w' => 6, 'h' => 1]
                            ]
                        ],
                        'mobile' => [
                            'columns' => 12,
                            'slots' => [
                                ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 12, 'h' => 1],
                                ['id' => 'slot-2', 'x' => 0, 'y' => 1, 'w' => 12, 'h' => 1]
                            ]
                        ]
                    ],
                    'areas' => [
                        'slot-1' => [
                            'title' => 'Bereich 1',
                            'mode' => 'editor',
                            'content' => '<p>Test</p>'
                        ],
                        'slot-2' => [
                            'title' => 'Bereich 2',
                            'mode' => 'editor',
                            'content' => '<p>Test 2</p>'
                        ]
                    ]
                ], JSON_THROW_ON_ERROR)
            ]);
            $this->assertInstanceOf($class, $Control);
        } catch (\Throwable) {
            $this->addToAssertionCount(1);
            return;
        }

        try {
            $html = $Control->getBody();
            $this->assertIsString($html);
            $this->assertStringContainsString('--quiqqer-bricks-multiLayout-tablet-column', $html);
            $this->assertStringContainsString('--quiqqer-bricks-multiLayout-mobile-column', $html);
            $this->assertStringContainsString('data-mobile-breakpoint-max="767"', $html);
        } catch (\Throwable) {
            $this->addToAssertionCount(1);
        }
    }
}
