<?php

/**
 * This file contains \QUI\Bricks\Controls\MultiLayout
 */

namespace QUI\Bricks\Controls;

use Exception;
use QUI;
use QUI\Bricks\Manager;
use QUI\Bricks\Layout\Document;
use QUI\Bricks\Layout\Presets;
use QUI\Bricks\Layout\Renderer;
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
    protected const DEFAULT_TILE_MIN_HEIGHT_PRESET = 'standard';
    protected const TILE_MIN_HEIGHT_PRESETS = [
        'none'       => '0px',
        'compact'    => '120px',
        'standard'   => '200px',
        'large'      => '280px',
        'extraLarge' => '360px',
        'manual'     => null
    ];
    protected const DEFAULT_GRID_GAP_PRESET = 'normal';
    protected const GRID_GAP_PRESETS = [
        'none'       => '0',
        'small'      => 'clamp(0.5rem, 1.5cqi, 1rem)',
        'normal'     => 'clamp(0.75rem, 2cqi, 1.5rem)',
        'large'      => 'clamp(1rem, 4cqi, 2.5rem)',
        'extraLarge' => 'clamp(1.25rem, 6cqi, 4rem)',
    ];
    protected const DEFAULT_CONTENT_PADDING_PRESET = 'normal';
    protected const CONTENT_PADDING_PRESETS = [
        'none'       => '0',
        'small'      => 'clamp(1rem, 1.5cqi, 1.5rem)',
        'normal'     => 'clamp(1rem, 2cqi, 2rem)',
        'large'      => 'clamp(1rem, 3.5cqi, 3rem)',
        'extraLarge' => 'clamp(1rem, 5cqi, 5rem)',
    ];
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

    /**
     * @param array<string, mixed> $attributes
     */
    public function __construct(array $attributes = [])
    {
        $this->setAttributes([
            'class' => 'quiqqer-bricks-controls-multiLayout',
            'layout' => Presets::getDefaultPresetId(),
            'areaBackgroundEnabled' => true,
            'gridGapPreset' => self::DEFAULT_GRID_GAP_PRESET,
            'gridRowGapPreset' => self::DEFAULT_GRID_GAP_PRESET,
            'gridColumnGapPreset' => self::DEFAULT_GRID_GAP_PRESET,
            'tileMinHeightPreset' => self::DEFAULT_TILE_MIN_HEIGHT_PRESET,
            'tileMinHeightValue' => '',
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

        $this->addCSSFile(dirname(__FILE__, 2) . '/Layout/Layout.css');

        if ($this->getAttribute('gridGapPreset') === 'separate') {
            $this->setCustomVariable(
                'gridRowGap',
                $this->getGridGapPresetValue($this->getAttribute('gridRowGapPreset'))
            );
            $this->setCustomVariable(
                'gridColumnGap',
                $this->getGridGapPresetValue($this->getAttribute('gridColumnGapPreset'))
            );
        } else {
            $this->setCustomVariable(
                'gridGap',
                $this->getGridGapPresetValue($this->getAttribute('gridGapPreset'))
            );
        }

        $layoutHtml = (new Renderer())->render(
            $this,
            $document,
            $areas,
            $this->buildDocumentStyle($document),
            'quiqqer-bricks-controls-multiLayout',
            !empty($this->getAttribute('areaBackgroundEnabled'))
        );

        $Engine = QUI::getTemplateManager()->getEngine();
        $Engine->assign([
            'this' => $this,
            'layoutHtml' => $layoutHtml
        ]);

        return $Engine->fetch(dirname(__FILE__) . '/MultiLayout.html');
    }

    protected function normalizeLayout(mixed $layout): string
    {
        return Document::normalizePresetId($layout);
    }

    /**
     * @return array<string, mixed>
     */
    protected function normalizeLayoutDocument(mixed $value, mixed $layout, bool $allowSubLayout = true): array
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
                $index,
                $allowSubLayout
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
        return Document::getPresetDefinition($preset);
    }

    protected static function getDefaultPresetId(): string
    {
        return Presets::getDefaultPresetId();
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function getPresets(): array
    {
        return Presets::getPresets();
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

        if ($this->hasOverlappingSlots($normalized)) {
            $normalized = [];

            foreach ($desktopSlots as $index => $desktopSlot) {
                $slot = $fallbackSlots[$index] ?? $desktopSlot;
                $slot = $this->normalizeSlot($slot, (int)$index, self::DEFAULT_COLUMNS, self::DEFAULT_COLUMNS);
                $slot['id'] = $desktopSlot['id'];
                $normalized[] = $slot;
            }

            usort($normalized, [$this, 'compareSlots']);
        }

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
    protected function normalizeAreaData(array $area, int $index, bool $allowSubLayout = true): array
    {
        $link = $this->normalizeAreaLink($area['link'] ?? null);
        $allowedModes = $allowSubLayout
            ? ['editor', 'brick', 'image', 'subLayout']
            : ['editor', 'brick', 'image'];
        $mode = isset($area['mode']) && in_array($area['mode'], $allowedModes, true)
            ? $area['mode']
            : 'editor';

        $normalized = [
            'title' => isset($area['title']) && is_string($area['title'])
                ? $area['title']
                : 'Bereich ' . ($index + 1),
            'mode' => $mode,
            'contentPaddingPreset' => isset($area['contentPaddingPreset'])
                && is_string($area['contentPaddingPreset'])
                && array_key_exists($area['contentPaddingPreset'], self::CONTENT_PADDING_PRESETS)
                    ? $area['contentPaddingPreset']
                    : self::DEFAULT_CONTENT_PADDING_PRESET,
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
            'imageWidth' => isset($area['imageWidth']) && (is_string($area['imageWidth']) || is_numeric($area['imageWidth']))
                ? trim((string)$area['imageWidth'])
                : '',
            'imageHeight' => isset($area['imageHeight']) && (is_string($area['imageHeight']) || is_numeric($area['imageHeight']))
                ? trim((string)$area['imageHeight'])
                : '',
            'imagePosition' => isset($area['imagePosition']) &&
                in_array($area['imagePosition'], [
                    'left top', 'center top', 'right top',
                    'left center', 'center center', 'right center',
                    'left bottom', 'center bottom', 'right bottom'
                ], true)
                ? $area['imagePosition']
                : 'center center',
            'backgroundEnabled' => !empty($area['backgroundEnabled']),
            'backgroundImage' => isset($area['backgroundImage']) && is_string($area['backgroundImage'])
                ? $area['backgroundImage']
                : '',
            'backgroundImageFit' => isset($area['backgroundImageFit']) && in_array($area['backgroundImageFit'], ['auto', 'cover', 'contain'], true)
                ? $area['backgroundImageFit']
                : 'cover',
            'backgroundImagePosition' => isset($area['backgroundImagePosition']) &&
                in_array($area['backgroundImagePosition'], [
                    'left top', 'center top', 'right top',
                    'left center', 'center center', 'right center',
                    'left bottom', 'center bottom', 'right bottom'
                ], true)
                ? $area['backgroundImagePosition']
                : 'center center',
            'backgroundOverlayEnabled' => !empty($area['backgroundOverlayEnabled']),
            'backgroundOverlayColor' => isset($area['backgroundOverlayColor']) && is_string($area['backgroundOverlayColor'])
                ? $area['backgroundOverlayColor']
                : '#000000',
            'backgroundColorEnabled' => !empty($area['backgroundColorEnabled']),
            'backgroundColor' => isset($area['backgroundColor']) && is_string($area['backgroundColor'])
                ? $area['backgroundColor']
                : '#000000',
            'textColor' => isset($area['textColor']) && is_string($area['textColor'])
                ? trim($area['textColor'])
                : '',
            'customMinHeightEnabled' => !empty($area['customMinHeightEnabled']),
            'customMinHeightPreset' => $this->normalizeTileMinHeightPreset(
                $area['customMinHeightPreset'] ?? null
            ),
            'customMinHeightValue' => $this->normalizeTileMinHeightValue(
                $area['customMinHeightValue'] ?? null
            ),
            'customCssClasses' => $this->normalizeCustomCssClasses(
                $area['customCssClasses'] ?? null
            ),
            'link' => $link,
            'verticalAlign' => isset($area['verticalAlign'])
                && in_array($area['verticalAlign'], ['top', 'center', 'bottom', 'stretch', 'sticky'], true)
                ? $area['verticalAlign']
                : 'center',
            'stickyOffset' => $this->normalizeCssSizeValue($area['stickyOffset'] ?? null),
            'subLayoutAreaBackgroundEnabled' => array_key_exists('subLayoutAreaBackgroundEnabled', $area)
                ? !empty($area['subLayoutAreaBackgroundEnabled'])
                : !empty($this->getAttribute('areaBackgroundEnabled')),
            'subLayoutGridGapPreset' => isset($area['subLayoutGridGapPreset'])
                && is_string($area['subLayoutGridGapPreset'])
                && array_key_exists($area['subLayoutGridGapPreset'], self::GRID_GAP_PRESETS)
                    ? $area['subLayoutGridGapPreset']
                    : self::DEFAULT_GRID_GAP_PRESET,
            'subLayoutTileMinHeightPreset' => $this->normalizeTileMinHeightPreset(
                $area['subLayoutTileMinHeightPreset'] ?? null
            ),
            'subLayoutTileMinHeightValue' => $this->normalizeTileMinHeightValue(
                $area['subLayoutTileMinHeightValue'] ?? null
            )
        ];

        if ($mode === 'subLayout') {
            $normalized['subLayoutDocument'] = $this->normalizeLayoutDocument(
                $area['subLayoutDocument'] ?? [],
                self::getDefaultPresetId(),
                false
            );
        }

        return $normalized;
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
     * @param array<int, array<string, int|string>> $slots
     */
    protected function hasOverlappingSlots(array $slots): bool
    {
        $count = count($slots);

        for ($i = 0; $i < $count; $i++) {
            $slotA = $slots[$i];
            $ax1 = (int)$slotA['x'];
            $ay1 = (int)$slotA['y'];
            $ax2 = $ax1 + (int)$slotA['w'];
            $ay2 = $ay1 + (int)$slotA['h'];

            for ($j = $i + 1; $j < $count; $j++) {
                $slotB = $slots[$j];
                $bx1 = (int)$slotB['x'];
                $by1 = (int)$slotB['y'];
                $bx2 = $bx1 + (int)$slotB['w'];
                $by2 = $by1 + (int)$slotB['h'];

                if (!($ay1 >= $by2 || $ay2 <= $by1 || $ax2 <= $bx1 || $ax1 >= $bx2)) {
                    return true;
                }
            }
        }

        return false;
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
        if ($area['mode'] === 'subLayout') {
            $area['subLayoutAreas'] = $this->prepareAreas($area['subLayoutDocument']);
            $area['subLayoutDesktopColumns'] = $area['subLayoutDocument']['breakpoints']['desktop']['columns']
                ?? self::DEFAULT_COLUMNS;
            $area['subLayoutGridGap'] = self::GRID_GAP_PRESETS[$area['subLayoutGridGapPreset']]
                ?? self::GRID_GAP_PRESETS[self::DEFAULT_GRID_GAP_PRESET];
            $area['subLayoutTileMinHeight'] = $this->resolveTileMinHeightValue(
                (string)$area['subLayoutTileMinHeightPreset'],
                (string)$area['subLayoutTileMinHeightValue']
            );
        }

        $area['contentHtml'] = $this->renderAreaContent($area);
        $area['customCssClassAttribute'] = $this->buildCustomCssClassAttribute(
            $area['customCssClasses'] ?? ''
        );
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

        $paddingPreset = isset($area['contentPaddingPreset'])
            && is_string($area['contentPaddingPreset'])
            && array_key_exists($area['contentPaddingPreset'], self::CONTENT_PADDING_PRESETS)
                ? $area['contentPaddingPreset']
                : self::DEFAULT_CONTENT_PADDING_PRESET;

        $style = [
            '--quiqqer-bricks-layout-desktop-column: ' . $this->buildGridLineValue($desktopSlot),
            '--quiqqer-bricks-layout-desktop-row: ' . $this->buildGridRowValue($desktopSlot),
            '--quiqqer-bricks-layout-tablet-column: ' . $this->buildGridLineValue($tabletSlot),
            '--quiqqer-bricks-layout-tablet-row: ' . $this->buildGridRowValue($tabletSlot),
            '--quiqqer-bricks-layout-mobile-column: ' . $this->buildGridLineValue($mobileSlot),
            '--quiqqer-bricks-layout-mobile-row: ' . $this->buildGridRowValue($mobileSlot),
            '--quiqqer-bricks-layout-content-padding: ' . self::CONTENT_PADDING_PRESETS[$paddingPreset]
        ];

        if (!empty($area['backgroundEnabled']) && !empty($area['backgroundImage'])) {
            $style[] = '--quiqqer-bricks-layout-background-fit: '
                . $this->mapObjectFitValue((string)$area['backgroundImageFit']);
            $style[] = '--quiqqer-bricks-layout-background-position: '
                . $this->escapeStyleValue((string)$area['backgroundImagePosition']);
        }

        if (!empty($area['backgroundOverlayEnabled'])) {
            $style[] = '--quiqqer-bricks-layout-background-overlay-color: '
                . $this->escapeStyleValue((string)$area['backgroundOverlayColor'] ?: 'transparent');
        }

        if (!empty($area['backgroundColorEnabled']) && !empty($area['backgroundColor'])) {
            $style[] = '--quiqqer-bricks-layout-area-background: '
                . $this->escapeStyleValue((string)$area['backgroundColor']);
        }

        if (!empty($area['textColor'])) {
            $style[] = '--quiqqer-bricks-layout-text-color: '
                . $this->escapeStyleValue((string)$area['textColor']);
        }

        if (!empty($area['image'])) {
            $style[] = '--quiqqer-bricks-layout-image-fit: '
                . $this->mapObjectFitValue((string)$area['imageFit']);

            if (!empty($area['imageWidth'])) {
                $style[] = '--quiqqer-bricks-layout-image-width: '
                    . $this->escapeStyleValue(
                        $this->normalizeCssSizeValue((string)$area['imageWidth'])
                    );
            }

            if (!empty($area['imageHeight'])) {
                $style[] = '--quiqqer-bricks-layout-image-height: '
                    . $this->escapeStyleValue(
                        $this->normalizeCssSizeValue((string)$area['imageHeight'])
                    );
            }

            if (!empty($area['imagePosition'])) {
                $style[] = '--quiqqer-bricks-layout-image-position: '
                    . $this->escapeStyleValue((string)$area['imagePosition']);
            }
        }

        if (!empty($area['customMinHeightEnabled'])) {
            $customMinHeight = $this->resolveCustomTileMinHeightValue($area);

            if ($customMinHeight !== '') {
                $style[] = '--quiqqer-bricks-layout-slot-min-height: '
                    . $this->escapeStyleValue($customMinHeight);
            }
        }

        // only emit an explicit offset when a value was entered ('0'/'0px'
        // stay as-is); an empty field lets the CSS fall back to the nav offset
        if (($area['verticalAlign'] ?? '') === 'sticky' && ($area['stickyOffset'] ?? '') !== '') {
            $style[] = '--quiqqer-bricks-layout-sticky-top: '
                . $this->escapeStyleValue((string)$area['stickyOffset']);
        }

        return implode('; ', $style);
    }

    /**
     * @param array<string, mixed> $document
     */
    protected function buildDocumentStyle(array $document): string
    {
        $tileMinHeight = $this->resolveTileMinHeightValue(
            (string)$this->getAttribute('tileMinHeightPreset'),
            (string)$this->getAttribute('tileMinHeightValue')
        );

        return '--quiqqer-bricks-layout-tile-min-height: '
            . $this->escapeStyleValue($tileMinHeight);
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

    protected function mapObjectFitValue(string $fit): string
    {
        return match ($fit) {
            'contain' => 'contain',
            default => 'cover'
        };
    }

    protected function normalizeTileMinHeightPreset(mixed $preset): string
    {
        if (is_string($preset) && array_key_exists($preset, self::TILE_MIN_HEIGHT_PRESETS)) {
            return $preset;
        }

        return self::DEFAULT_TILE_MIN_HEIGHT_PRESET;
    }

    protected function normalizeTileMinHeightValue(mixed $value): string
    {
        return is_string($value) || is_numeric($value) ? trim((string)$value) : '';
    }

    protected function normalizeCustomCssClasses(mixed $value): string
    {
        if (!is_string($value) && !is_numeric($value)) {
            return '';
        }

        $parts = preg_split('/\s*,\s*/', trim((string)$value)) ?: [];
        $parts = array_filter($parts, static function ($part) {
            return $part !== '';
        });

        return implode(', ', $parts);
    }

    protected function normalizeCssSizeValue(mixed $value): string
    {
        if (!is_string($value) && !is_numeric($value)) {
            return '';
        }

        $value = trim((string)$value);

        if ($value === '') {
            return '';
        }

        if (preg_match('/^-?\d+(?:\.\d+)?$/', $value)) {
            return $value . 'px';
        }

        return $value;
    }

    protected function resolveTileMinHeightValue(string $preset, string $manualValue): string
    {
        $preset = $this->normalizeTileMinHeightPreset($preset);

        if ($preset === 'manual') {
            $manualValue = $this->normalizeCssSizeValue($manualValue);

            if ($manualValue !== '') {
                return $manualValue;
            }

            return (string)self::TILE_MIN_HEIGHT_PRESETS[self::DEFAULT_TILE_MIN_HEIGHT_PRESET];
        }

        return (string)self::TILE_MIN_HEIGHT_PRESETS[$preset];
    }

    /**
     * @param array<string, mixed> $area
     */
    protected function resolveCustomTileMinHeightValue(array $area): string
    {
        $preset = $this->normalizeTileMinHeightPreset($area['customMinHeightPreset'] ?? null);

        if ($preset === 'manual') {
            return $this->normalizeCssSizeValue($area['customMinHeightValue'] ?? null);
        }

        return (string)self::TILE_MIN_HEIGHT_PRESETS[$preset];
    }

    protected function buildCustomCssClassAttribute(mixed $value): string
    {
        $normalized = $this->normalizeCustomCssClasses($value);

        if ($normalized === '') {
            return '';
        }

        $classes = preg_split('/\s*,\s*/', $normalized) ?: [];
        $classes = array_filter($classes, static function ($className) {
            return $className !== '';
        });

        if ($classes === []) {
            return '';
        }

        return htmlspecialchars(implode(' ', $classes), ENT_QUOTES);
    }

    /**
     * @param array<string, mixed> $area
     */
    protected function renderAreaContent(array $area): string
    {
        return match ($area['mode']) {
            'brick' => $this->renderBrickContent((int)$area['brickId']),
            'image' => '',
            'subLayout' => '',
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

            if (!$Brick) {
                return '';
            }

            $result = $Brick->create();
            $this->addCSSFiles($Brick->getCSSFiles());

            return $result;
        } catch (Exception) {
            return '';
        }
    }

    protected function escapeStyleValue(string $value): string
    {
        return str_replace(
            ["\\", "'", "\n", "\r"],
            ["\\\\", "\\'", '', ''],
            trim($value)
        );
    }

    private function getGridGapPresetValue(mixed $preset): string
    {
        if (!is_string($preset) || !array_key_exists($preset, self::GRID_GAP_PRESETS)) {
            $preset = self::DEFAULT_GRID_GAP_PRESET;
        }

        return self::GRID_GAP_PRESETS[$preset];
    }

    private function setCustomVariable(string $name, string $value): void
    {
        if ($name === '' || $value === '') {
            return;
        }

        $this->setStyle('--_q-controlConf-' . $name, $value);
    }
}
