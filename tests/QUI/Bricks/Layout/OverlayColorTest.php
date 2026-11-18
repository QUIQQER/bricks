<?php

namespace QUITests\Bricks\Layout;

use PHPUnit\Framework\TestCase;
use QUI\Bricks\Layout\OverlayColor;
use QUI\Bricks\Layout\OverlayMigration;

class OverlayColorTest extends TestCase
{
    public function testRenderedAlphaAndEmptyOverlayWithoutSecondOpacity(): void
    {
        $Control = new class extends \QUI\Bricks\Controls\MultiLayout {
            public function style(array $area): string
            {
                $document = ['breakpoints' => ['desktop' => ['slots' => [
                    ['id' => 'slot', 'x' => 0, 'y' => 0, 'w' => 12, 'h' => 1]
                ]]]];
                return $this->buildSlotStyle($document, 'slot', $this->normalizeAreaData($area, 0));
            }
        };
        $style = $Control->style([
            'backgroundOverlayEnabled' => true,
            'backgroundOverlayColor' => '#11223340'
        ]);
        self::assertStringContainsString('background-overlay-color: #11223340', $style);
        self::assertStringNotContainsString('background-overlay-opacity:', $style);
        $empty = $Control->style(['backgroundOverlayEnabled' => true, 'backgroundOverlayColor' => '']);
        self::assertStringContainsString('background-overlay-color: transparent', $empty);
    }

    public function testColorConversionCases(): void
    {
        $cases = json_decode(file_get_contents(__DIR__ . '/../../../fixtures/overlay-colors.json'), true);
        foreach ($cases as [$color, $opacity, $expected]) {
            self::assertSame($expected, OverlayColor::convert($color, OverlayColor::opacity($opacity)));
        }
    }

    public function testMissingAndEmptyColorsAreDistinct(): void
    {
        $document = json_encode(['areas' => [
            'missing' => ['backgroundOverlayOpacity' => 50],
            'empty' => ['backgroundOverlayColor' => '', 'backgroundOverlayOpacity' => 50]
        ]]);
        $result = json_decode(OverlayMigration::document($document), true);
        self::assertSame(['backgroundOverlayColor' => '#00000080'], $result['areas']['missing']);
        self::assertSame(['backgroundOverlayColor' => ''], $result['areas']['empty']);
    }

    public function testOpaqueDocumentsAreNotReserialized(): void
    {
        $json = '{ "areas": {"a": {"backgroundOverlayColor":"#ABC", "backgroundOverlayOpacity":100}} }';
        self::assertSame($json, OverlayMigration::document($json));
        self::assertSame('[]', OverlayMigration::document('[]'));
    }

    public function testNestedDisabledAreasAndUnknownFieldsSurvive(): void
    {
        $document = (object)[
            'unknown' => (object)[],
            'areas' => (object)[
                'unused-slot' => (object)[
                    'backgroundOverlayEnabled' => false,
                    'backgroundOverlayColor' => '#11223380',
                    'backgroundOverlayOpacity' => 50,
                    'subLayoutDocument' => (object)[
                        'areas' => (object)[
                            'child' => (object)['backgroundOverlayColor' => '#123', 'backgroundOverlayOpacity' => 0]
                        ]
                    ]
                ]
            ]
        ];
        $original = json_encode($document);
        $converted = OverlayMigration::document($original);
        $result = json_decode($converted);
        self::assertEquals((object)[], $result->unknown);
        self::assertFalse($result->areas->{'unused-slot'}->backgroundOverlayEnabled);
        self::assertSame('#11223340', $result->areas->{'unused-slot'}->backgroundOverlayColor);
        self::assertSame('#11223300', $result->areas->{'unused-slot'}->subLayoutDocument->areas->child->backgroundOverlayColor);
        self::assertSame($converted, OverlayMigration::document($converted));
        self::assertSame($original, json_encode($document));
    }

    public function testUnsupportedColorIsReportedByPatch(): void
    {
        $area = ['backgroundOverlayColor' => 'red', 'backgroundOverlayOpacity' => 25];
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('areas.slot');
        OverlayMigration::document(json_encode(['areas' => ['slot' => $area]]));
    }
}
