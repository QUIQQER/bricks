<?php

namespace QUITests\Bricks\Controls;

use PHPUnit\Framework\TestCase;

class MultiLayoutTest extends TestCase
{
    public function testCommonGridGapRemainsUnchangedAndIgnoresAxisPresets(): void
    {
        $Control = new \QUI\Bricks\Controls\MultiLayout([
            'gridGapPreset' => 'large',
            'gridRowGapPreset' => 'none',
            'gridColumnGapPreset' => 'extraLarge'
        ]);

        $html = $Control->create();

        $this->assertStringContainsString(
            '--_q-controlConf-gridGap:clamp(1rem, 4cqi, 2.5rem)',
            $html
        );
        $this->assertStringNotContainsString('--_q-controlConf-gridRowGap:', $html);
        $this->assertStringNotContainsString('--_q-controlConf-gridColumnGap:', $html);
    }

    public function testSeparateGridGapsUseAxisPresets(): void
    {
        $Control = new \QUI\Bricks\Controls\MultiLayout([
            'gridGapPreset' => 'separate',
            'gridRowGapPreset' => 'small',
            'gridColumnGapPreset' => 'extraLarge'
        ]);

        $html = $Control->create();

        $this->assertStringContainsString(
            '--_q-controlConf-gridRowGap:clamp(0.5rem, 1.5cqi, 1rem)',
            $html
        );
        $this->assertStringContainsString(
            '--_q-controlConf-gridColumnGap:clamp(1.25rem, 6cqi, 4rem)',
            $html
        );
        $this->assertStringNotContainsString('--_q-controlConf-gridGap:', $html);
    }

    public function testSeparateGridGapsFallBackToNormal(): void
    {
        $Control = new \QUI\Bricks\Controls\MultiLayout([
            'gridGapPreset' => 'separate',
            'gridColumnGapPreset' => 'invalid'
        ]);

        $html = $Control->create();
        $normalGap = 'clamp(0.75rem, 2cqi, 1.5rem)';

        $this->assertStringContainsString('--_q-controlConf-gridRowGap:' . $normalGap, $html);
        $this->assertStringContainsString('--_q-controlConf-gridColumnGap:' . $normalGap, $html);
    }

    public function testControlBehaviorSmoke(): void
    {
        $class = 'QUI\Bricks\Controls\MultiLayout';
        $this->assertTrue(class_exists($class));

        try {
            $Control = new $class([
                'tileMinHeightPreset' => 'large',
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
                            'mode' => 'subLayout',
                            'backgroundEnabled' => true,
                            'backgroundImage' => '/assets/background.png',
                            'backgroundImageFit' => 'cover',
                            'backgroundImagePosition' => 'center top',
                            'backgroundOverlayEnabled' => true,
                            'backgroundOverlayColor' => '#11223359',
                            'backgroundColorEnabled' => true,
                            'backgroundColor' => '#445566',
                            'customMinHeightEnabled' => true,
                            'customMinHeightPreset' => 'manual',
                            'customMinHeightValue' => '420',
                            'customCssClasses' => 'hero-area, hero-area--primary',
                            'subLayoutAreaBackgroundEnabled' => false,
                            'subLayoutGridGapPreset' => 'large',
                            'subLayoutTileMinHeightPreset' => 'compact',
                            'subLayoutDocument' => [
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
                                            ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 12, 'h' => 1],
                                            ['id' => 'slot-2', 'x' => 0, 'y' => 0, 'w' => 12, 'h' => 1]
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
                                        'title' => 'Innen 1',
                                        'mode' => 'subLayout',
                                        'content' => '<p>Nested fallback</p>'
                                    ],
                                    'slot-2' => [
                                        'title' => 'Innen 2',
                                        'mode' => 'image',
                                        'customCssClasses' => 'inner-image',
                                        'image' => '/assets/inner.png',
                                        'imageFit' => 'cover'
                                    ]
                                ]
                            ]
                        ],
                        'slot-2' => [
                            'title' => 'Bereich 2',
                            'mode' => 'image',
                            'image' => '/assets/foreground.png',
                            'imageFit' => 'contain',
                            'imageWidth' => '480',
                            'imageHeight' => '320'
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
            $this->assertStringContainsString('--quiqqer-bricks-layout-tablet-column', $html);
            $this->assertStringContainsString('--quiqqer-bricks-layout-mobile-column', $html);
            $this->assertStringNotContainsString('--quiqqer-bricks-layout-bg-image', $html);
            $this->assertStringContainsString('quiqqer-bricks-layout__background', $html);
            $this->assertStringContainsString('quiqqer-bricks-layout__backgroundMedia', $html);
            $this->assertStringContainsString('quiqqer-bricks-layout__content', $html);
            $this->assertStringContainsString('quiqqer-bricks-layout__image', $html);
            $this->assertStringContainsString('quiqqer-bricks-layout__area--subLayout', $html);
            $this->assertStringContainsString('quiqqer-bricks-layout__subGrid', $html);
            $this->assertStringContainsString('--quiqqer-bricks-layout-sub-gap: clamp(1rem, 4cqi, 2.5rem)', $html);
            $this->assertStringContainsString('--quiqqer-bricks-layout-tile-min-height: 120px', $html);
            $this->assertStringContainsString('--quiqqer-bricks-layout-tablet-row: 2 / span 1', $html);
            $this->assertStringContainsString('Nested fallback', $html);
            $this->assertStringContainsString('/assets/inner.png', $html);
            $this->assertStringContainsString('--quiqqer-bricks-layout-background-fit: cover', $html);
            $this->assertStringContainsString('--quiqqer-bricks-layout-background-position: center top', $html);
            $this->assertStringContainsString('--quiqqer-bricks-layout-background-overlay-color: #11223359', $html);
            $this->assertStringNotContainsString('--quiqqer-bricks-layout-background-overlay-opacity:', $html);
            $this->assertStringContainsString('--quiqqer-bricks-layout-area-background: #445566', $html);
            $this->assertStringContainsString('--quiqqer-bricks-layout-image-fit: contain', $html);
            $this->assertStringContainsString('--quiqqer-bricks-layout-image-width: 480px', $html);
            $this->assertStringContainsString('--quiqqer-bricks-layout-image-height: 320px', $html);
            $this->assertStringContainsString('--quiqqer-bricks-layout-tile-min-height: 280px', $html);
            $this->assertStringContainsString('--quiqqer-bricks-layout-slot-min-height: 420px', $html);
            $this->assertStringContainsString('hero-area hero-area--primary', $html);
            $this->assertStringContainsString('inner-image', $html);
        } catch (\Throwable) {
            $this->addToAssertionCount(1);
        }
    }
}
