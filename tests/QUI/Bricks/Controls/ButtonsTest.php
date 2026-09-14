<?php

namespace QUITests\Bricks\Controls;

use PHPUnit\Framework\TestCase;
use QUI\Bricks\Controls\Buttons;

class ButtonsTest extends TestCase
{
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
