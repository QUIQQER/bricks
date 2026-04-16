<?php

/**
 * This file contains \QUI\Bricks\Controls\MultiLayout
 */

namespace QUI\Bricks\Controls;

use Exception;
use QUI;
use QUI\Bricks\Manager;

use function array_map;
use function array_key_exists;
use function count;
use function dirname;
use function htmlspecialchars;
use function implode;
use function in_array;
use function is_array;
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
            'columns' => $document['columns'],
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
        $columns = $presetDefinition['columns'];
        $sourceColumns = isset($decoded['columns']) && is_numeric($decoded['columns'])
            ? (int)$decoded['columns']
            : $columns;
        $slotsSource = $decoded['breakpoints']['desktop']['slots'] ?? $presetDefinition['slots'];
        $slots = $this->normalizeDesktopSlots($slotsSource, $sourceColumns, $columns);
        $areasSource = is_array($decoded['areas'] ?? null)
            ? $decoded['areas']
            : [];
        $areas = [];

        foreach ($slots as $index => $slot) {
            $areaSource = [];

            if (
                isset($areasSource[$slot['id']])
                && is_array($areasSource[$slot['id']])
            ) {
                $areaSource = $areasSource[$slot['id']];
            }

            $areas[$slot['id']] = $this->normalizeAreaData($areaSource, $index);
        }

        $document = [
            'preset' => $presetDefinition['id'],
            'columns' => $columns,
            'breakpoints' => [
                'desktop' => [
                    'slots' => $slots
                ],
                'tablet' => [
                    'mode' => 'inherit'
                ],
                'mobile' => [
                    'mode' => 'stack',
                    'order' => []
                ]
            ],
            'areas' => $areas
        ];

        $document['breakpoints']['mobile']['order'] = $this->buildMobileOrder($document);

        return $document;
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
        $mobileOrder = $index + 1;

        if (isset($area['mobileOrder']) && is_numeric($area['mobileOrder'])) {
            $mobileOrder = max(1, (int)$area['mobileOrder']);
        }

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
            'verticalAlign' => isset($area['verticalAlign']) && in_array($area['verticalAlign'], ['top', 'center', 'bottom'], true)
                ? $area['verticalAlign']
                : 'center',
            'mobileOrder' => $mobileOrder
        ];
    }

    /**
     * @param array<string, mixed> $document
     * @return array<int, string>
     */
    protected function buildMobileOrder(array $document): array
    {
        $slots = $document['breakpoints']['desktop']['slots'] ?? [];

        usort($slots, function (array $slotA, array $slotB) use ($document) {
            $areaA = $document['areas'][$slotA['id']] ?? [];
            $areaB = $document['areas'][$slotB['id']] ?? [];
            $mobileOrderA = isset($areaA['mobileOrder']) ? (int)$areaA['mobileOrder'] : 0;
            $mobileOrderB = isset($areaB['mobileOrder']) ? (int)$areaB['mobileOrder'] : 0;

            if ($mobileOrderA === $mobileOrderB) {
                return $this->compareSlots($slotA, $slotB);
            }

            return $mobileOrderA <=> $mobileOrderB;
        });

        return array_map(static function (array $slot) {
            return $slot['id'];
        }, $slots);
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
            $area['slotStyle'] = $this->buildSlotStyle($slot, $area);
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

        return $area;
    }

    /**
     * @param array<string, int|string> $slot
     * @param array<string, mixed> $area
     */
    protected function buildSlotStyle(array $slot, array $area): string
    {
        $style = [
            'grid-column: ' . ((int)$slot['x'] + 1) . ' / span ' . (int)$slot['w'],
            'grid-row: ' . ((int)$slot['y'] + 1) . ' / span ' . (int)$slot['h'],
            'order: ' . max(1, (int)$area['mobileOrder'])
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
