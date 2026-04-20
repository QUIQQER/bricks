<?php

/**
 * This file contains \QUI\Bricks\Controls\MultiLayout
 */

namespace QUI\Bricks\Controls;

use Exception;
use QUI;
use QUI\Bricks\Manager;
use QUI\Projects\Site\Utils as SiteUtils;

use function array_key_exists;
use function count;
use function dirname;
use function htmlspecialchars;
use function implode;
use function in_array;
use function is_array;
use function is_callable;
use function is_numeric;
use function is_string;
use function json_decode;
use function max;
use function min;
use function round;
use function str_replace;
use function trim;
use function usort;

/**
 * MultiLayout brick
 */
class MultiLayout extends QUI\Control
{
    protected const DEFAULT_COLUMNS = 12;
    protected const TABLET_BREAKPOINT_MAX = 1023;
    protected const MOBILE_BREAKPOINT_MAX = 767;
    protected const LINK_REL_OPTIONS = [
        '',
        'nofollow',
        'noopener',
        'noreferrer',
        'noopener noreferrer',
        'nofollow noopener noreferrer'
    ];
    protected const LINK_TARGET_OPTIONS = [
        '',
        '_self',
        '_blank'
    ];
    protected const PRESETS = [
        'preset-2-equal' => [
            'id' => 'preset-2-equal',
            'sort' => 10,
            'labelKey' => 'brick.multiLayout.layout.1',
            'columns' => self::DEFAULT_COLUMNS,
            'defaultSlotWidth' => 6,
            'slots' => [
                ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 6, 'h' => 1],
                ['id' => 'slot-2', 'x' => 6, 'y' => 0, 'w' => 6, 'h' => 1]
            ]
        ],
        'preset-2-left-narrow' => [
            'id' => 'preset-2-left-narrow',
            'sort' => 20,
            'labelKey' => 'brick.multiLayout.layout.2',
            'columns' => self::DEFAULT_COLUMNS,
            'defaultSlotWidth' => 6,
            'slots' => [
                ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 4, 'h' => 1],
                ['id' => 'slot-2', 'x' => 4, 'y' => 0, 'w' => 8, 'h' => 1]
            ]
        ],
        'preset-2-right-narrow' => [
            'id' => 'preset-2-right-narrow',
            'sort' => 30,
            'labelKey' => 'brick.multiLayout.layout.3',
            'columns' => self::DEFAULT_COLUMNS,
            'defaultSlotWidth' => 6,
            'slots' => [
                ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 8, 'h' => 1],
                ['id' => 'slot-2', 'x' => 8, 'y' => 0, 'w' => 4, 'h' => 1]
            ]
        ],
        'preset-4-equal' => [
            'id' => 'preset-4-equal',
            'sort' => 40,
            'labelKey' => 'brick.multiLayout.layout.4',
            'columns' => self::DEFAULT_COLUMNS,
            'defaultSlotWidth' => 6,
            'slots' => [
                ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 6, 'h' => 1],
                ['id' => 'slot-2', 'x' => 6, 'y' => 0, 'w' => 6, 'h' => 1],
                ['id' => 'slot-3', 'x' => 0, 'y' => 1, 'w' => 6, 'h' => 1],
                ['id' => 'slot-4', 'x' => 6, 'y' => 1, 'w' => 6, 'h' => 1]
            ]
        ],
        'preset-4-offset-a' => [
            'id' => 'preset-4-offset-a',
            'sort' => 50,
            'labelKey' => 'brick.multiLayout.layout.5',
            'columns' => self::DEFAULT_COLUMNS,
            'defaultSlotWidth' => 6,
            'slots' => [
                ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 4, 'h' => 1],
                ['id' => 'slot-2', 'x' => 4, 'y' => 0, 'w' => 8, 'h' => 1],
                ['id' => 'slot-3', 'x' => 0, 'y' => 1, 'w' => 8, 'h' => 1],
                ['id' => 'slot-4', 'x' => 8, 'y' => 1, 'w' => 4, 'h' => 1]
            ]
        ],
        'preset-4-offset-b' => [
            'id' => 'preset-4-offset-b',
            'sort' => 60,
            'labelKey' => 'brick.multiLayout.layout.6',
            'columns' => self::DEFAULT_COLUMNS,
            'defaultSlotWidth' => 6,
            'slots' => [
                ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 8, 'h' => 1],
                ['id' => 'slot-2', 'x' => 8, 'y' => 0, 'w' => 4, 'h' => 1],
                ['id' => 'slot-3', 'x' => 0, 'y' => 1, 'w' => 4, 'h' => 1],
                ['id' => 'slot-4', 'x' => 4, 'y' => 1, 'w' => 8, 'h' => 1]
            ]
        ],
        'preset-3x2-equal' => [
            'id' => 'preset-3x2-equal',
            'sort' => 70,
            'labelKey' => 'brick.multiLayout.layout.7',
            'columns' => self::DEFAULT_COLUMNS,
            'defaultSlotWidth' => 4,
            'slots' => [
                ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 4, 'h' => 1],
                ['id' => 'slot-2', 'x' => 4, 'y' => 0, 'w' => 4, 'h' => 1],
                ['id' => 'slot-3', 'x' => 8, 'y' => 0, 'w' => 4, 'h' => 1],
                ['id' => 'slot-4', 'x' => 0, 'y' => 1, 'w' => 4, 'h' => 1],
                ['id' => 'slot-5', 'x' => 4, 'y' => 1, 'w' => 4, 'h' => 1],
                ['id' => 'slot-6', 'x' => 8, 'y' => 1, 'w' => 4, 'h' => 1]
            ]
        ],
        'preset-3x2-alternating' => [
            'id' => 'preset-3x2-alternating',
            'sort' => 80,
            'labelKey' => 'brick.multiLayout.layout.8',
            'columns' => self::DEFAULT_COLUMNS,
            'defaultSlotWidth' => 4,
            'slots' => [
                ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 3, 'h' => 1],
                ['id' => 'slot-2', 'x' => 3, 'y' => 0, 'w' => 6, 'h' => 1],
                ['id' => 'slot-3', 'x' => 9, 'y' => 0, 'w' => 3, 'h' => 1],
                ['id' => 'slot-4', 'x' => 0, 'y' => 1, 'w' => 6, 'h' => 1],
                ['id' => 'slot-5', 'x' => 6, 'y' => 1, 'w' => 3, 'h' => 1],
                ['id' => 'slot-6', 'x' => 9, 'y' => 1, 'w' => 3, 'h' => 1]
            ]
        ],
        'preset-3rows-middle-full' => [
            'id' => 'preset-3rows-middle-full',
            'sort' => 90,
            'labelKey' => 'brick.multiLayout.layout.9',
            'columns' => self::DEFAULT_COLUMNS,
            'defaultSlotWidth' => 4,
            'slots' => [
                ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 4, 'h' => 1],
                ['id' => 'slot-2', 'x' => 4, 'y' => 0, 'w' => 4, 'h' => 1],
                ['id' => 'slot-3', 'x' => 8, 'y' => 0, 'w' => 4, 'h' => 1],
                ['id' => 'slot-4', 'x' => 0, 'y' => 1, 'w' => 12, 'h' => 1],
                ['id' => 'slot-5', 'x' => 0, 'y' => 2, 'w' => 4, 'h' => 1],
                ['id' => 'slot-6', 'x' => 4, 'y' => 2, 'w' => 4, 'h' => 1],
                ['id' => 'slot-7', 'x' => 8, 'y' => 2, 'w' => 4, 'h' => 1]
            ]
        ],
        'preset-top-full-bottom-2' => [
            'id' => 'preset-top-full-bottom-2',
            'sort' => 100,
            'labelKey' => 'brick.multiLayout.layout.10',
            'columns' => self::DEFAULT_COLUMNS,
            'defaultSlotWidth' => 6,
            'slots' => [
                ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 12, 'h' => 1],
                ['id' => 'slot-2', 'x' => 0, 'y' => 1, 'w' => 6, 'h' => 1],
                ['id' => 'slot-3', 'x' => 6, 'y' => 1, 'w' => 6, 'h' => 1]
            ]
        ],
        'preset-left-tall-right-stack' => [
            'id' => 'preset-left-tall-right-stack',
            'sort' => 110,
            'labelKey' => 'brick.multiLayout.layout.11',
            'columns' => self::DEFAULT_COLUMNS,
            'defaultSlotWidth' => 6,
            'slots' => [
                ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 6, 'h' => 2],
                ['id' => 'slot-2', 'x' => 6, 'y' => 0, 'w' => 6, 'h' => 1],
                ['id' => 'slot-3', 'x' => 6, 'y' => 1, 'w' => 6, 'h' => 1]
            ]
        ],
        'preset-center-tall-side-stacks' => [
            'id' => 'preset-center-tall-side-stacks',
            'sort' => 120,
            'labelKey' => 'brick.multiLayout.layout.12',
            'columns' => self::DEFAULT_COLUMNS,
            'defaultSlotWidth' => 3,
            'slots' => [
                ['id' => 'slot-1', 'x' => 0, 'y' => 0, 'w' => 3, 'h' => 1],
                ['id' => 'slot-2', 'x' => 0, 'y' => 1, 'w' => 3, 'h' => 1],
                ['id' => 'slot-3', 'x' => 0, 'y' => 2, 'w' => 3, 'h' => 1],
                ['id' => 'slot-4', 'x' => 3, 'y' => 0, 'w' => 6, 'h' => 3],
                ['id' => 'slot-5', 'x' => 9, 'y' => 0, 'w' => 3, 'h' => 1],
                ['id' => 'slot-6', 'x' => 9, 'y' => 1, 'w' => 3, 'h' => 1],
                ['id' => 'slot-7', 'x' => 9, 'y' => 2, 'w' => 3, 'h' => 1]
            ]
        ]
    ];

    /**
     * @param array<string, mixed> $attributes
     */
    public function __construct(array $attributes = [])
    {
        $this->setAttributes([
            'class' => 'quiqqer-bricks-controls-multiLayout',
            'layout' => self::getDefaultPresetId(),
            'areaBackgroundEnabled' => false,
            'gridGapEnabled' => true,
            'layoutAreas' => '[]'
        ]);

        parent::__construct($attributes);
    }

    public function getBody(): string
    {
        $document = $this->normalizeLayoutDocument(
            $this->getAttribute('layoutAreas'),
            $this->getAttribute('layout')
        );

        $areas = $this->prepareAreas($document);

        $this->addCSSFile(dirname(__FILE__) . '/MultiLayout.css');

        $Engine = QUI::getTemplateManager()->getEngine();
        $Engine->assign([
            'this' => $this,
            'layoutDocument' => $document,
            'areas' => $areas,
            'areaCount' => count($areas),
            'desktopColumns' => $document['breakpoints']['desktop']['columns'],
            'tabletBreakpointMax' => self::TABLET_BREAKPOINT_MAX,
            'mobileBreakpointMax' => self::MOBILE_BREAKPOINT_MAX,
            'areaBackgroundEnabled' => !empty($this->getAttribute('areaBackgroundEnabled')),
            'gridGapEnabled' => !empty($this->getAttribute('gridGapEnabled'))
        ]);

        return $Engine->fetch(dirname(__FILE__) . '/MultiLayout.html');
    }

    protected function normalizeLayout(mixed $layout): string
    {
        if (is_string($layout) && array_key_exists($layout, self::PRESETS)) {
            return $layout;
        }

        return self::getDefaultPresetId();
    }

    /**
     * @return array<string, mixed>
     */
    protected function normalizeLayoutDocument(mixed $value, mixed $layout): array
    {
        $decoded = $this->parseDocumentValue($value);

        if (!is_array($decoded)) {
            $decoded = [];
        }

        $preset = $this->normalizeLayout(
            $decoded['preset'] ?? $layout
        );
        $presetDefinition = $this->getPresetDefinition($preset);
        $desktopColumns = self::DEFAULT_COLUMNS;
        $desktopSourceColumns = isset($decoded['breakpoints']['desktop']['columns'])
            && is_numeric($decoded['breakpoints']['desktop']['columns'])
            ? (int)$decoded['breakpoints']['desktop']['columns']
            : $desktopColumns;
        $desktopSlots = $this->normalizeDesktopSlots(
            $decoded['breakpoints']['desktop']['slots'] ?? $presetDefinition['slots'],
            $desktopSourceColumns,
            $desktopColumns
        );
        $tabletSlots = $this->normalizeBreakpointSlots(
            $decoded['breakpoints']['tablet']['slots'] ?? null,
            isset($decoded['breakpoints']['tablet']['columns']) && is_numeric($decoded['breakpoints']['tablet']['columns'])
                ? (int)$decoded['breakpoints']['tablet']['columns']
                : $desktopColumns,
            $desktopSlots,
            [$this, 'buildTabletDefaultSlots']
        );
        $mobileSlots = $this->normalizeBreakpointSlots(
            $decoded['breakpoints']['mobile']['slots'] ?? null,
            isset($decoded['breakpoints']['mobile']['columns']) && is_numeric($decoded['breakpoints']['mobile']['columns'])
                ? (int)$decoded['breakpoints']['mobile']['columns']
                : $desktopColumns,
            $desktopSlots,
            [$this, 'buildMobileDefaultSlots']
        );
        $areasSource = is_array($decoded['areas'] ?? null)
            ? $decoded['areas']
            : [];
        $areas = [];

        foreach ($desktopSlots as $index => $slot) {
            $areas[$slot['id']] = $this->normalizeAreaData(
                isset($areasSource[$slot['id']]) && is_array($areasSource[$slot['id']])
                    ? $areasSource[$slot['id']]
                    : [],
                $index
            );
        }

        return [
            'preset' => $presetDefinition['id'],
            'breakpoints' => [
                'desktop' => [
                    'columns' => $desktopColumns,
                    'slots' => $desktopSlots
                ],
                'tablet' => [
                    'columns' => $desktopColumns,
                    'slots' => $tabletSlots
                ],
                'mobile' => [
                    'columns' => $desktopColumns,
                    'slots' => $mobileSlots
                ]
            ],
            'areas' => $areas
        ];
    }

    protected function parseDocumentValue(mixed $value): mixed
    {
        if (is_string($value) && trim($value) !== '') {
            return json_decode($value, true);
        }

        return $value;
    }

    /**
     * @return array<string, mixed>
     */
    protected function getPresetDefinition(string $preset): array
    {
        return self::PRESETS[$preset] ?? self::PRESETS[self::getDefaultPresetId()];
    }

    protected static function getDefaultPresetId(): string
    {
        return 'preset-2-equal';
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function getPresets(): array
    {
        return self::PRESETS;
    }

    /**
     * @param mixed $slots
     * @return array<int, array<string, int|string>>
     */
    protected function normalizeDesktopSlots(mixed $slots, int $sourceColumns, int $targetColumns): array
    {
        if (!is_array($slots)) {
            $slots = $this->getPresetDefinition(self::getDefaultPresetId())['slots'];
        }

        $normalized = [];
        $used = [];

        foreach ($slots as $index => $slot) {
            $slot = $this->normalizeSlot($slot, (int)$index, $sourceColumns, $targetColumns);

            if (isset($used[$slot['id']])) {
                $slot['id'] = 'slot-' . (count($normalized) + 1);
            }

            $used[$slot['id']] = true;
            $normalized[] = $slot;
        }

        usort($normalized, [$this, 'compareSlots']);

        return $normalized;
    }

    /**
     * @param mixed $slots
     * @param callable $fallbackBuilder
     * @param array<int, array<string, int|string>> $desktopSlots
     * @return array<int, array<string, int|string>>
     */
    protected function normalizeBreakpointSlots(
        mixed $slots,
        int $sourceColumns,
        array $desktopSlots,
        callable $fallbackBuilder
    ): array {
        $normalized = [];
        $slotsById = [];

        if (is_array($slots)) {
            foreach ($slots as $index => $slot) {
                $normalizedSlot = $this->normalizeSlot($slot, (int)$index, $sourceColumns, self::DEFAULT_COLUMNS);
                $slotsById[$normalizedSlot['id']] = $normalizedSlot;
            }
        }

        $fallbackSlots = $fallbackBuilder($desktopSlots);

        foreach ($desktopSlots as $index => $desktopSlot) {
            $slotId = $desktopSlot['id'];
            $sourceSlot = $slotsById[$slotId] ?? $fallbackSlots[$index] ?? $desktopSlot;

            $slot = $this->normalizeSlot($sourceSlot, (int)$index, self::DEFAULT_COLUMNS, self::DEFAULT_COLUMNS);
            $slot['id'] = $slotId;
            $normalized[] = $slot;
        }

        usort($normalized, [$this, 'compareSlots']);

        return $normalized;
    }

    /**
     * @param array<int, array<string, int|string>> $desktopSlots
     * @return array<int, array<string, int|string>>
     */
    protected function buildTabletDefaultSlots(array $desktopSlots): array
    {
        return array_values($desktopSlots);
    }

    /**
     * @param array<int, array<string, int|string>> $desktopSlots
     * @return array<int, array<string, int|string>>
     */
    protected function buildMobileDefaultSlots(array $desktopSlots): array
    {
        usort($desktopSlots, [$this, 'compareSlots']);

        $mobileSlots = [];
        $y = 0;

        foreach ($desktopSlots as $slot) {
            $height = isset($slot['h']) && is_numeric($slot['h'])
                ? max(1, (int)$slot['h'])
                : 1;

            $mobileSlots[] = [
                'id' => $slot['id'],
                'x' => 0,
                'y' => $y,
                'w' => self::DEFAULT_COLUMNS,
                'h' => $height
            ];

            $y += $height;
        }

        return $mobileSlots;
    }

    /**
     * @param mixed $slot
     * @return array<string, int|string>
     */
    protected function normalizeSlot(mixed $slot, int $index, int $sourceColumns, int $targetColumns): array
    {
        if (!is_array($slot)) {
            $slot = [];
        }

        $sourceColumns = max(1, $sourceColumns);
        $targetColumns = max(1, $targetColumns);
        $width = isset($slot['w']) && is_numeric($slot['w'])
            ? max(1, (int)$slot['w'])
            : 1;
        $height = isset($slot['h']) && is_numeric($slot['h'])
            ? max(1, (int)$slot['h'])
            : 1;
        $x = isset($slot['x']) && is_numeric($slot['x'])
            ? max(0, (int)$slot['x'])
            : 0;
        $y = isset($slot['y']) && is_numeric($slot['y'])
            ? max(0, (int)$slot['y'])
            : $index;

        if ($sourceColumns !== $targetColumns) {
            $ratio = $targetColumns / $sourceColumns;
            $width = max(1, (int)round($width * $ratio));
            $x = max(0, (int)round($x * $ratio));
        }

        $width = min($targetColumns, $width);
        $x = min($targetColumns - $width, $x);

        return [
            'id' => isset($slot['id']) && is_string($slot['id']) && $slot['id'] !== ''
                ? $slot['id']
                : 'slot-' . ($index + 1),
            'x' => $x,
            'y' => $y,
            'w' => $width,
            'h' => $height
        ];
    }

    /**
     * @param array<string, mixed> $area
     * @return array<string, mixed>
     */
    protected function normalizeAreaData(array $area, int $index): array
    {
        $link = $this->normalizeAreaLink($area['link'] ?? null);

        return [
            'title' => isset($area['title']) && is_string($area['title'])
                ? $area['title']
                : 'Bereich ' . ($index + 1),
            'mode' => isset($area['mode']) && in_array($area['mode'], ['editor', 'brick', 'image'], true)
                ? $area['mode']
                : 'editor',
            'contentPadding' => !isset($area['contentPadding']) || !empty($area['contentPadding']),
            'content' => isset($area['content']) && is_string($area['content']) ? $area['content'] : '',
            'brickId' => isset($area['brickId']) ? (int)$area['brickId'] : 0,
            'brickTitle' => isset($area['brickTitle']) && is_string($area['brickTitle'])
                ? $area['brickTitle']
                : '',
            'brickType' => isset($area['brickType']) && is_string($area['brickType'])
                ? $area['brickType']
                : '',
            'image' => isset($area['image']) && is_string($area['image']) ? $area['image'] : '',
            'imageFit' => isset($area['imageFit']) && in_array($area['imageFit'], ['auto', 'cover', 'contain'], true)
                ? $area['imageFit']
                : 'auto',
            'imageMaxWidth' => isset($area['imageMaxWidth']) && is_string($area['imageMaxWidth'])
                ? trim($area['imageMaxWidth'])
                : '',
            'backgroundEnabled' => !empty($area['backgroundEnabled']),
            'backgroundImage' => isset($area['backgroundImage']) && is_string($area['backgroundImage'])
                ? $area['backgroundImage']
                : '',
            'backgroundImageFit' => isset($area['backgroundImageFit']) && in_array($area['backgroundImageFit'], ['auto', 'cover', 'contain'], true)
                ? $area['backgroundImageFit']
                : 'cover',
            'backgroundImagePosition' => isset($area['backgroundImagePosition']) &&
                in_array($area['backgroundImagePosition'], ['center center', 'center top', 'center bottom', 'left center', 'right center'], true)
                ? $area['backgroundImagePosition']
                : 'center center',
            'backgroundColorEnabled' => !empty($area['backgroundColorEnabled']),
            'backgroundColor' => isset($area['backgroundColor']) && is_string($area['backgroundColor'])
                ? $area['backgroundColor']
                : '#000000',
            'backgroundColorOpacity' => isset($area['backgroundColorOpacity']) && is_numeric($area['backgroundColorOpacity'])
                ? max(0, min(100, (int)$area['backgroundColorOpacity']))
                : 100,
            'textColor' => isset($area['textColor']) && is_string($area['textColor'])
                ? trim($area['textColor'])
                : '',
            'link' => $link,
            'verticalAlign' => isset($area['verticalAlign']) && in_array($area['verticalAlign'], ['top', 'center', 'bottom'], true)
                ? $area['verticalAlign']
                : 'center'
        ];
    }

    /**
     * @param array<string, int|string> $slotA
     * @param array<string, int|string> $slotB
     */
    protected function compareSlots(array $slotA, array $slotB): int
    {
        if ((int)$slotA['y'] === (int)$slotB['y']) {
            if ((int)$slotA['x'] === (int)$slotB['x']) {
                return (string)$slotA['id'] <=> (string)$slotB['id'];
            }

            return (int)$slotA['x'] <=> (int)$slotB['x'];
        }

        return (int)$slotA['y'] <=> (int)$slotB['y'];
    }

    /**
     * @param array<string, mixed> $document
     * @return array<int, array<string, mixed>>
     */
    protected function prepareAreas(array $document): array
    {
        $areas = [];
        $slots = $document['breakpoints']['desktop']['slots'] ?? [];

        foreach ($slots as $index => $slot) {
            $slotId = $slot['id'];
            $area = $document['areas'][$slotId] ?? $this->normalizeAreaData([], $index);
            $area['slotId'] = $slotId;
            $area['slotStyle'] = $this->buildSlotStyle($document, (string)$slotId, $area);
            $areas[] = $this->prepareArea($area);
        }

        return $areas;
    }

    /**
     * @param array<string, mixed> $area
     * @return array<string, mixed>
     */
    protected function prepareArea(array $area): array
    {
        $area['contentHtml'] = $this->renderAreaContent($area);
        $area['link'] = $this->prepareAreaLink($area['link'] ?? null);

        return $area;
    }

    /**
     * @param mixed $link
     * @return array<string, string>|null
     */
    protected function normalizeAreaLink(mixed $link): ?array
    {
        if (!is_array($link)) {
            return null;
        }

        $href = isset($link['href']) && is_string($link['href'])
            ? trim($link['href'])
            : '';

        if ($href === '') {
            return null;
        }

        $rel = isset($link['rel']) && is_string($link['rel']) && in_array($link['rel'], self::LINK_REL_OPTIONS, true)
            ? $link['rel']
            : '';
        $target = isset($link['target']) && is_string($link['target']) && in_array($link['target'], self::LINK_TARGET_OPTIONS, true)
            ? $link['target']
            : '';

        return [
            'href' => $href,
            'rel' => $rel,
            'target' => $target,
            'title' => isset($link['title']) && is_string($link['title'])
                ? trim($link['title'])
                : ''
        ];
    }

    /**
     * @param mixed $link
     * @return array<string, string>|null
     */
    protected function prepareAreaLink(mixed $link): ?array
    {
        $link = $this->normalizeAreaLink($link);

        if ($link === null) {
            return null;
        }

        $href = $link['href'];

        if (SiteUtils::isSiteLink($href)) {
            try {
                $href = SiteUtils::getSiteByLink($href)->getUrlRewritten();
            } catch (Exception) {
                return null;
            }
        }

        return [
            'href' => htmlspecialchars($href, ENT_QUOTES),
            'rel' => htmlspecialchars($link['rel'], ENT_QUOTES),
            'target' => htmlspecialchars($link['target'], ENT_QUOTES),
            'title' => htmlspecialchars($link['title'], ENT_QUOTES)
        ];
    }

    /**
     * @param array<string, mixed> $document
     * @param array<string, mixed> $area
     */
    protected function buildSlotStyle(array $document, string $slotId, array $area): string
    {
        $desktopSlot = $this->findSlotById($document['breakpoints']['desktop']['slots'] ?? [], $slotId);
        $tabletSlot = $this->findSlotById($document['breakpoints']['tablet']['slots'] ?? [], $slotId) ?? $desktopSlot;
        $mobileSlot = $this->findSlotById($document['breakpoints']['mobile']['slots'] ?? [], $slotId) ?? $desktopSlot;

        if (!$desktopSlot || !$tabletSlot || !$mobileSlot) {
            return '';
        }

        $style = [
            '--quiqqer-bricks-multiLayout-desktop-column: ' . $this->buildGridLineValue($desktopSlot),
            '--quiqqer-bricks-multiLayout-desktop-row: ' . $this->buildGridRowValue($desktopSlot),
            '--quiqqer-bricks-multiLayout-tablet-column: ' . $this->buildGridLineValue($tabletSlot),
            '--quiqqer-bricks-multiLayout-tablet-row: ' . $this->buildGridRowValue($tabletSlot),
            '--quiqqer-bricks-multiLayout-mobile-column: ' . $this->buildGridLineValue($mobileSlot),
            '--quiqqer-bricks-multiLayout-mobile-row: ' . $this->buildGridRowValue($mobileSlot)
        ];

        if (!empty($area['backgroundEnabled']) && !empty($area['backgroundImage'])) {
            $style[] = '--quiqqer-bricks-multiLayout-bg-image: url(\''
                . $this->escapeStyleValue((string)$area['backgroundImage'])
                . '\')';
            $style[] = '--quiqqer-bricks-multiLayout-bg-size: '
                . $this->mapBackgroundSize((string)$area['backgroundImageFit']);
            $style[] = '--quiqqer-bricks-multiLayout-bg-position: '
                . $this->escapeStyleValue((string)$area['backgroundImagePosition']);
        }

        if (!empty($area['backgroundColorEnabled'])) {
            $style[] = '--quiqqer-bricks-multiLayout-background-color: '
                . $this->escapeStyleValue((string)$area['backgroundColor']);
            $style[] = '--quiqqer-bricks-multiLayout-background-color-opacity: '
                . ((int)$area['backgroundColorOpacity'] / 100);
        }

        if (!empty($area['textColor'])) {
            $style[] = '--quiqqer-bricks-multiLayout-text-color: '
                . $this->escapeStyleValue((string)$area['textColor']);
        }

        return implode('; ', $style);
    }

    /**
     * @param array<string, int|string> $slot
     */
    protected function buildGridLineValue(array $slot): string
    {
        return ((int)$slot['x'] + 1) . ' / span ' . (int)$slot['w'];
    }

    /**
     * @param array<string, int|string> $slot
     */
    protected function buildGridRowValue(array $slot): string
    {
        return ((int)$slot['y'] + 1) . ' / span ' . (int)$slot['h'];
    }

    /**
     * @param array<int, array<string, int|string>> $slots
     * @return array<string, int|string>|null
     */
    protected function findSlotById(array $slots, string $slotId): ?array
    {
        foreach ($slots as $slot) {
            if (($slot['id'] ?? null) === $slotId) {
                return $slot;
            }
        }

        return null;
    }

    protected function mapBackgroundSize(string $fit): string
    {
        return match ($fit) {
            'contain' => 'contain',
            'auto' => 'auto',
            default => 'cover'
        };
    }

    /**
     * @param array<string, mixed> $area
     */
    protected function renderAreaContent(array $area): string
    {
        return match ($area['mode']) {
            'brick' => $this->renderBrickContent((int)$area['brickId']),
            'image' => $this->renderImageContent($area),
            default => (string)$area['content']
        };
    }

    protected function renderBrickContent(int $brickId): string
    {
        if ($brickId < 1) {
            return '';
        }

        try {
            $Brick = Manager::init()?->getBrickById($brickId);

            return $Brick?->create() ?? '';
        } catch (Exception) {
            return '';
        }
    }

    /**
     * @param array<string, mixed> $area
     */
    protected function renderImageContent(array $area): string
    {
        if (empty($area['image'])) {
            return '';
        }

        $classes = [
            'quiqqer-bricks-controls-multiLayout-areaImage',
            'quiqqer-bricks-controls-multiLayout-areaImage--' . $area['imageFit']
        ];

        $style = '';

        if (!empty($area['imageMaxWidth'])) {
            $style = ' style="max-width: ' . htmlspecialchars((string)$area['imageMaxWidth']) . ';"';
        }

        return '<img class="' . implode(' ', $classes)
            . '" src="' . htmlspecialchars((string)$area['image'], ENT_QUOTES)
            . '" alt="' . htmlspecialchars((string)$area['title'], ENT_QUOTES)
            . '"' . $style . ' />';
    }

    protected function escapeStyleValue(string $value): string
    {
        return str_replace(
            ["\\", "'", "\n", "\r"],
            ["\\\\", "\\'", '', ''],
            trim($value)
        );
    }
}
