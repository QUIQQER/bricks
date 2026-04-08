<?php

/**
 * This file contains \QUI\Bricks\Controls\MultiLayout
 */

namespace QUI\Bricks\Controls;

use Exception;
use QUI;
use QUI\Bricks\Manager;

use function array_slice;
use function count;
use function dirname;
use function htmlspecialchars;
use function in_array;
use function is_array;
use function is_numeric;
use function implode;
use function json_decode;
use function max;
use function min;
use function trim;

/**
 * MultiLayout brick
 */
class MultiLayout extends QUI\Control
{
    protected const LAYOUT_TWO = 'grid-2-equal';
    protected const LAYOUT_FOUR = 'grid-2x2';
    protected const LEGACY_LAYOUT_TWO = '2-chamber';
    protected const LEGACY_LAYOUT_FOUR = '4-chamber';

    /**
     * @param array<string, mixed> $attributes
     */
    public function __construct(array $attributes = [])
    {
        $this->setAttributes([
            'class' => 'quiqqer-bricks-controls-multiLayout',
            'layout' => self::LAYOUT_TWO,
            'areaBackgroundEnabled' => false,
            'gridGapEnabled' => true,
            'layoutAreas' => '[]'
        ]);

        parent::__construct($attributes);
    }

    public function getBody(): string
    {
        $layout = $this->normalizeLayout($this->getAttribute('layout'));
        $areasSource = $this->getAttribute('layoutAreas');

        if (
            (!is_string($areasSource) || trim($areasSource) === '')
            && $this->getAttribute('areas')
        ) {
            $areasSource = $this->getAttribute('areas');
        }

        $areas = $this->prepareAreas(
            $this->normalizeAreas($areasSource, $layout)
        );

        $this->addCSSFile(dirname(__FILE__) . '/MultiLayout.css');

        $Engine = QUI::getTemplateManager()->getEngine();
        $Engine->assign([
            'this' => $this,
            'layout' => $layout,
            'areas' => $areas,
            'areaCount' => count($areas),
            'areaBackgroundEnabled' => !empty($this->getAttribute('areaBackgroundEnabled')),
            'gridGapEnabled' => !empty($this->getAttribute('gridGapEnabled'))
        ]);

        return $Engine->fetch(dirname(__FILE__) . '/MultiLayout.html');
    }

    protected function normalizeLayout(mixed $layout): string
    {
        if (!is_string($layout)) {
            return self::LAYOUT_TWO;
        }

        return match ($layout) {
            self::LEGACY_LAYOUT_FOUR => self::LAYOUT_FOUR,
            self::LEGACY_LAYOUT_TWO => self::LAYOUT_TWO,
            self::LAYOUT_FOUR => self::LAYOUT_FOUR,
            default => self::LAYOUT_TWO
        };
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function normalizeAreas(mixed $areas, string $layout): array
    {
        if (is_string($areas) && trim($areas) !== '') {
            $areas = json_decode($areas, true);
        }

        if (!is_array($areas)) {
            $areas = [];
        }

        $normalized = [];
        $maxAreas = $this->getAreaCountByLayout($layout);

        foreach ($areas as $index => $area) {
            if (!is_array($area)) {
                $area = [];
            }

            $mobileOrder = $index + 1;

            if (isset($area['mobileOrder']) && is_numeric($area['mobileOrder'])) {
                $mobileOrder = (int)$area['mobileOrder'];
            }

            $normalized[] = [
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

        while (count($normalized) < $maxAreas) {
            $index = count($normalized);
            $normalized[] = [
                'title' => 'Bereich ' . ($index + 1),
                'mode' => 'editor',
                'contentPadding' => true,
                'content' => '',
                'brickId' => 0,
                'brickTitle' => '',
                'brickType' => '',
                'image' => '',
                'imageFit' => 'auto',
                'imageMaxWidth' => '',
                'backgroundEnabled' => false,
                'backgroundImage' => '',
                'backgroundImageFit' => 'cover',
                'backgroundImagePosition' => 'center center',
                'backgroundColorEnabled' => false,
                'backgroundColor' => '#000000',
                'backgroundColorOpacity' => 100,
                'textColor' => '',
                'verticalAlign' => 'center',
                'mobileOrder' => $index + 1
            ];
        }

        return array_slice($normalized, 0, $maxAreas);
    }

    protected function getAreaCountByLayout(string $layout): int
    {
        return $layout === self::LAYOUT_FOUR ? 4 : 2;
    }

    /**
     * @param array<int, array<string, mixed>> $areas
     * @return array<int, array<string, mixed>>
     */
    protected function prepareAreas(array $areas): array
    {
        foreach ($areas as $index => $area) {
            $areas[$index] = $this->prepareArea($area);
        }

        return $areas;
    }

    /**
     * @param array<string, mixed> $area
     * @return array<string, mixed>
     */
    protected function prepareArea(array $area): array
    {
        $area['areaStyle'] = $this->buildAreaStyle($area);
        $area['contentHtml'] = $this->renderAreaContent($area);

        return $area;
    }

    /**
     * @param array<string, mixed> $area
     */
    protected function buildAreaStyle(array $area): string
    {
        $style = [];

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
