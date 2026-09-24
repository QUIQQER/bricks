<?php

namespace QUI\Bricks\Controls;

use Exception;
use QUI;
use Seld\JsonLint\JsonParser;

use function array_filter;
use function array_values;
use function is_array;
use function in_array;
use function preg_match;
use function str_replace;
use function trim;

/**
 * Class Accordion
 */
class Accordion extends QUI\Control
{
    /**
     * [
     *   'entryTitle' => string,
     *   'entryContent' => string,
     *   'anchor' => string (optional, rendered as id for deep links)
     * ]
     *
     * @var array<int, mixed>
     */
    protected array $entries = [];

    /**
     * constructor
     *
     * @param array<string, mixed> $attributes
     */
    public function __construct(array $attributes = [])
    {
        // default options
        $this->setAttributes([
            'nodeName' => 'section',
            'class' => 'quiqqer-accordion',
            'qui-class' => 'package/quiqqer/bricks/bin/Controls/Accordion',
            'template' => 'default',
            'columns' => 1,
            'iconPosition' => 'right',
            'iconStyle' => 'angle',
            'stayOpen' => false, // if true make accordion items stay open when another item is opened
            'openFirst' => false, // the first entry is initially opened
            'listMaxWidth' => '', // empty or 0 disables this option.
            'entries' => [],
            'useFaqStructuredData' => false
        ]);

        parent::__construct($attributes);

        $this->addCSSFile(dirname(__FILE__) . '/Accordion.css');
    }

    public function getBody(): string
    {
        $Engine = QUI::getTemplateManager()->getEngine();
        $entries = $this->getAttribute('entries');

        if ($this->getAttribute('stayOpen') !== false) {
            $this->setJavaScriptControlOption('stayopen', $this->getAttribute('stayOpen'));
        }

        $maxWidth = $this->getNormalizedListMaxWidth();

        if ($maxWidth !== false) {
            $this->setCustomVariable('list-maxWidth', $maxWidth);
        }

        if (is_string($entries)) {
            $entries = str_replace("\n", "", $entries);

            try {
                $entries = (new JsonParser())->parse($entries, JsonParser::PARSE_TO_ASSOC);
            } catch (Exception $Exception) {
                QUI\System\Log::writeException($Exception);
                $entries = [];
            }
        }

        if (!is_array($entries)) {
            $entries = [];
        }

        $entries = $this->prepareAnchors($this->filterDisabledEntries($entries));
        $template = $this->getTemplateName();
        $columns = $this->getColumns();
        $iconPosition = $this->getIconPosition();
        $iconStyle = $this->getIconStyle();
        $rotateAngle = $this->getRotateAngle($iconStyle);
        $this->entries = $entries;
        [
            $entriesColumnLeft,
            $entriesColumnRight
        ] = $this->prepareEntriesForRender($entries, $columns);

        $this->setCustomVariable('rotate', $rotateAngle . 'deg');

        $Engine->assign([
            'this' => $this,
            'columns' => $columns,
            'openFirst' => $this->getAttribute('openFirst'),
            'entries' => $this->entries,
            'entriesColumnLeft' => $entriesColumnLeft,
            'entriesColumnRight' => $entriesColumnRight,
            'template' => $template,
            'iconPosition' => $iconPosition,
            'iconClass' => $this->getIconClass($iconStyle),
            'useFaqStructuredData' => $this->getAttribute('useFaqStructuredData')
        ]);

        $this->addCSSFile(dirname(__FILE__) . '/' . $this->getResolvedCssFile($template) . '.css');

        return $Engine->fetch(dirname(__FILE__) . '/' . $this->getResolvedTemplateFile($template) . '.html');
    }

    /**
     * Generate JSON-LD FAQ Schema Code
     *
     * @return string
     */
    public function createJSONLDFAQSchemaCode(): string
    {
        $entries = $this->entries;

        if (empty($entries)) {
            $entries = $this->getAttribute('entries');
        }

        if (is_string($entries)) {
            try {
                $entries = (new JsonParser())->parse(
                    str_replace("\n", "", $entries),
                    JsonParser::PARSE_TO_ASSOC
                );
            } catch (Exception $Exception) {
                QUI\System\Log::writeException($Exception);
                $entries = [];
            }
        }

        if (!is_array($entries)) {
            $entries = [];
        }

        $this->entries = $this->filterDisabledEntries($entries);

        if (empty($this->entries)) {
            return '';
        }

        $mainEntity = array_values(array_filter(array_map(function ($entry) {
            if (!is_array($entry)) {
                return null;
            }

            $question = $this->normalizeFAQSchemaText($entry['entryTitle'] ?? null);
            $answer = $this->normalizeFAQSchemaText($entry['entryContent'] ?? null);

            if ($question === '' || $answer === '') {
                return null;
            }

            return [
                '@type' => 'Question',
                'name' => $question,
                'acceptedAnswer' => [
                    '@type' => 'Answer',
                    'text' => $answer
                ]
            ];
        }, $this->entries)));

        if (empty($mainEntity)) {
            return '';
        }

        $schema = json_encode([
            '@context' => 'https://schema.org',
            '@type' => 'FAQPage',
            'mainEntity' => $mainEntity
        ], JSON_UNESCAPED_UNICODE);

        if ($schema === false) {
            return '';
        }

        return '<script type="application/ld+json">' . $schema . '</script>';
    }

    protected function getTemplateName(): string
    {
        $template = $this->getAttribute('template');

        if (!is_string($template)) {
            return 'default';
        }

        if (
            !in_array($template, [
                'default',
                'simple',
                'boxOutline',
                'boxOutlineAccent',
                'boxOutlineAccentOpen',
                'boxOutlineTextColor',
                'boxFill',
                'boxFillAccent',
                'boxFillAccentOpen',
                'card',
                'cardFillAccent'
            ], true)
        ) {
            return 'default';
        }

        return $template;
    }

    protected function getIconPosition(): string
    {
        $iconPosition = $this->getAttribute('iconPosition');

        if (!is_string($iconPosition)) {
            return 'right';
        }

        if (!in_array($iconPosition, ['left', 'right'], true)) {
            return 'right';
        }

        return $iconPosition;
    }

    protected function getColumns(): int
    {
        return (int)$this->getAttribute('columns') === 2 ? 2 : 1;
    }

    protected function getNormalizedListMaxWidth(): string|false
    {
        $listMaxWidth = trim((string)$this->getAttribute('listMaxWidth'));

        if ($listMaxWidth === '' || $listMaxWidth === '0') {
            return false;
        }

        if (str_contains($listMaxWidth, ';') || str_contains($listMaxWidth, '{') || str_contains($listMaxWidth, '}')) {
            return false;
        }

        if (preg_match('/^\d+$/', $listMaxWidth)) {
            return $listMaxWidth . 'px';
        }

        return $listMaxWidth;
    }

    private function setCustomVariable(string $name, string $value): void
    {
        if ($name === '' || $value === '') {
            return;
        }

        $this->setStyle('--_q-controlConf-' . $name, $value);
    }

    protected function getResolvedTemplateFile(string $template): string
    {
        return match ($template) {
            'boxOutlineAccent', 'boxOutlineAccentOpen', 'boxOutlineTextColor' => 'Accordion.boxOutline',
            'boxFillAccentOpen', 'boxFill' => 'Accordion.boxFillAccent',
            'cardFillAccent' => 'Accordion.card',
            'simple' => 'Accordion.default',
            default => 'Accordion.' . $template
        };
    }

    protected function getResolvedCssFile(string $template): string
    {
        return match ($template) {
            'boxOutlineAccentOpen' => 'Accordion.boxOutlineAccent',
            'boxFillAccentOpen' => 'Accordion.boxFillAccent',
            default => 'Accordion.' . $template
        };
    }

    protected function getIconStyle(): string
    {
        $iconStyle = $this->getAttribute('iconStyle');

        if (!is_string($iconStyle)) {
            return 'angle';
        }

        if (!in_array($iconStyle, ['angle', 'plus'], true)) {
            return 'angle';
        }

        return $iconStyle;
    }

    protected function getIconClass(string $iconStyle): string
    {
        return match ($iconStyle) {
            'plus' => 'fa-plus',
            default => 'fa-angle-down'
        };
    }

    protected function getRotateAngle(string $iconStyle): int
    {
        return match ($iconStyle) {
            'plus' => 45,
            default => 180
        };
    }

    /**
     * @param array<int|string, mixed> $entries
     * @return array{
     *     0: array<int, array{index: int, entry: mixed}>,
     *     1: array<int, array{index: int, entry: mixed}>
     * }
     */
    protected function prepareEntriesForRender(array $entries, int $columns): array
    {
        $preparedEntries = [];

        foreach (array_values($entries) as $index => $entry) {
            $preparedEntries[] = [
                'index' => $index,
                'entry' => $entry
            ];
        }

        if ($columns !== 2) {
            return [$preparedEntries, []];
        }

        $splitAt = (int)ceil(count($preparedEntries) / 2);

        return [
            array_slice($preparedEntries, 0, $splitAt),
            array_slice($preparedEntries, $splitAt)
        ];
    }

    /**
     * @param array<int|string, mixed> $entries
     * @return array<int, mixed>
     */
    protected function filterDisabledEntries(array $entries): array
    {
        return array_values(array_filter($entries, function ($entry) {
            if (!is_array($entry) || !isset($entry['disabled'])) {
                return true;
            }

            return !in_array($entry['disabled'], [true, 1, '1'], true);
        }));
    }

    /**
     * Clean the optional anchor of every entry, entries without a usable
     * anchor get none.
     *
     * @param array<int, mixed> $entries
     * @return array<int, mixed>
     */
    protected function prepareAnchors(array $entries): array
    {
        foreach ($entries as $key => $entry) {
            if (!is_array($entry) || !isset($entry['anchor'])) {
                continue;
            }

            $anchor = QUI\Bricks\Utils::cleanupAnchor((string)$entry['anchor']);

            if ($anchor === '') {
                unset($entries[$key]['anchor']);
                continue;
            }

            $entries[$key]['anchor'] = $anchor;
        }

        return $entries;
    }

    protected function normalizeFAQSchemaText(mixed $value): string
    {
        if (!is_string($value) || $value === '') {
            return '';
        }

        $text = strip_tags($value);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\s+/u', ' ', $text);

        return trim((string)$text);
    }
}
