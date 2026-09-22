<?php

namespace QUITests\Bricks\Controls;

use PHPUnit\Framework\TestCase;
use QUI\Bricks\Brick;
use QUI\Bricks\Controls\Buttons;
use QUI\Bricks\Manager;

class ButtonsTest extends TestCase
{
    public function testAutoHeightIsResolvedPerEntryWithCachedTargetTypes(): void
    {
        $previousManager = Manager::$BrickManager;
        $Manager = new class (true) extends Manager {
            public int $typeLookups = 0;

            protected function fetchBrickTypeById(int $id): ?string
            {
                $this->typeLookups++;

                return match ($id) {
                    42 => '\\Vendor\\FlexibleBrick',
                    43 => '\\Vendor\\FixedBrick',
                    default => null,
                };
            }

            public function getAvailableBricks(): array
            {
                return [
                    ['control' => '\\Vendor\\FlexibleBrick', 'supportsWindowAutoHeight' => 1],
                    ['control' => '\\Vendor\\FixedBrick', 'supportsWindowAutoHeight' => 0],
                ];
            }

            public function getBrickById(int $id): Brick
            {
                throw new \LogicException('The full target brick must not be loaded.');
            }
        };

        Manager::$BrickManager = $Manager;

        try {
            foreach ([[42], [42, 43, 44, 0, 42, 44]] as $targetIds) {
                $entries = [];

                foreach ($targetIds as $index => $targetId) {
                    $entries[] = [
                        'text' => 'Open ' . $index,
                        'openBrickId' => $targetId,
                        'dataAttributes' => [
                            ['name' => 'data-track-id', 'value' => (string)$index],
                        ],
                    ];
                }

                $html = (new Buttons(['buttons' => json_encode($entries)]))->create();
                $Document = new \DOMDocument();
                $Document->loadHTML($html);
                $renderedButtons = $Document->getElementsByTagName('button');
                $this->assertCount(count($targetIds), $renderedButtons);

                foreach ($targetIds as $index => $targetId) {
                    $Element = $renderedButtons->item($index);
                    $this->assertSame((string)$index, $Element?->getAttribute('data-track-id'));
                    $this->assertSame(
                        $targetId === 42 ? '1' : '',
                        $Element?->getAttribute('data-window-auto-height')
                    );
                }
            }
        } finally {
            Manager::$BrickManager = $previousManager;
        }

        $this->assertSame(3, $Manager->typeLookups);
    }

    public function testButtonComponentCssIsForwardedOncePerRender(): void
    {
        $Brick = new Buttons([
            'buttons' => [
                ['text' => 'Download'],
                ['text' => 'Contact'],
            ],
        ]);

        $html = $Brick->create();

        // the buttons were actually rendered through the delegated component
        $this->assertSame(2, substr_count($html, 'btn__text'));

        // forwarded exactly once, even for multiple buttons (no duplicates)
        $forwarded = array_filter(
            $Brick->getCSSFiles(),
            static fn(string $file): bool => str_ends_with($file, 'Components/Controls/Button.css')
        );

        $this->assertCount(1, $forwarded);
    }

    public function testDataAttributesPerEntryAreRenderedOnEachButton(): void
    {
        $html = (new Buttons([
            'buttons' => [
                [
                    'text' => 'Track',
                    'titleAttribute' => 'Track this action',
                    'dataAttributes' => [
                        ['name' => 'data-track-id', 'value' => '42'],
                        ['name' => 'plain', 'value' => 'ignored'],
                    ],
                ],
                ['text' => 'Plain'],
            ],
        ]))->create();

        $this->assertStringContainsString('data-track-id="42"', $html);
        $this->assertStringContainsString('title="Track this action"', $html);
        $this->assertStringNotContainsString('data-data-', $html);
        $this->assertStringNotContainsString('ignored', $html);
    }

    public function testMobileModeIsAppliedPerPopupButton(): void
    {
        $html = (new Buttons([
            'buttons' => [
                [
                    'text' => 'Default fullscreen',
                    'openBrickId' => 17,
                ],
                [
                    'text' => 'Popup',
                    'openBrickId' => 18,
                    'openBrickMobileMode' => 'popup',
                ],
            ],
        ]))->create();

        $this->assertStringContainsString(
            'data-open-brick-id="17" data-win-mobile-mode="fullScreen"',
            $html
        );
        $this->assertStringContainsString(
            'data-open-brick-id="18" data-win-mobile-mode="popup"',
            $html
        );
    }

    public function testNoButtonCssIsForwardedWithoutEntries(): void
    {
        $Brick = new Buttons(['buttons' => []]);
        $Brick->create();

        $forwarded = array_filter(
            $Brick->getCSSFiles(),
            static fn(string $file): bool => str_ends_with($file, 'Components/Controls/Button.css')
        );

        $this->assertCount(0, $forwarded);
    }
}
