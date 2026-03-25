<?php

/**
 * This file contains QUI\Bricks\Controls\Slider\CustomerReviewsFlow
 */

namespace QUI\Bricks\Controls\Slider;

use QUI;
use QUI\Slider\Controls\ScrollingStrip;

use function count;
use function dirname;
use function in_array;
use function is_array;
use function is_string;
use function json_decode;

/**
 * Class CustomerReviewsFlow
 */
class CustomerReviewsFlow extends QUI\Control
{
    /**
     * @param array<string, mixed> $attributes
     */
    public function __construct(array $attributes = [])
    {
        $this->setAttributes([
            'rows' => 2,
            'animationDirection' => 'alternate',
            'animationDuration' => 60,
            'gapDesktop' => 'normal',
            'gapMobile' => 'small',
            'pauseOnHover' => true,
            'entries' => []
        ]);

        parent::__construct($attributes);
    }

    public function getBody(): string
    {
        $Engine = QUI::getTemplateManager()->getEngine();
        $entries = $this->getAttribute('entries');

        if (is_string($entries)) {
            $entries = json_decode($entries, true);
        }

        if (!is_array($entries) || empty($entries)) {
            QUI\System\Log::addNotice(
                'QUI\Bricks\Controls\Slider\CustomerReviewsFlow - No customer reviews found.'
            );

            return '';
        }

        $enabledEntries = [];

        foreach ($entries as $entry) {
            if (!empty($entry['isDisabled'])) {
                continue;
            }

            $enabledEntries[] = $entry;
        }

        if (empty($enabledEntries)) {
            return '';
        }

        $rows = (int)$this->getAttribute('rows');

        if ($rows < 1) {
            $rows = 1;
        }

        if ($rows > count($enabledEntries)) {
            $rows = count($enabledEntries);
        }

        $rowEntries = $this->distributeEntriesToRows($enabledEntries, $rows);
        $rowStrips = [];

        foreach ($rowEntries as $index => $entriesForRow) {
            $direction = $this->getRowDirection($index);
            $scrollingEntries = [];

            foreach ($entriesForRow as $entry) {
                $scrollingEntries[] = [
                    'htmlContent' => $this->renderEntry($entry)
                ];
            }

            $Strip = new ScrollingStrip([
                'entries' => $scrollingEntries,
                'animationDirection' => $direction,
                'animationDuration' => $this->getAttribute('animationDuration'),
                'gapDesktop' => $this->getAttribute('gapDesktop'),
                'gapMobile' => $this->getAttribute('gapMobile'),
                'pauseOnHover' => $this->getAttribute('pauseOnHover')
            ]);

            $this->addCSSFiles($Strip->getCSSFiles());

            $rowStrips[] = [
                'direction' => $direction,
                'html' => $Strip->create()
            ];
        }

        $this->addCSSFile(dirname(__FILE__) . '/CustomerReviewsFlow.css');

        $Engine->assign([
            'this' => $this,
            'rows' => $rowStrips
        ]);

        return $Engine->fetch(dirname(__FILE__) . '/CustomerReviewsFlow.html');
    }

    /**
     * @param array<int, array<string, mixed>> $entries
     * @return array<int, array<int, array<string, mixed>>>
     */
    protected function distributeEntriesToRows(array $entries, int $rows): array
    {
        $distributed = [];

        for ($i = 0; $i < $rows; $i++) {
            $distributed[$i] = [];
        }

        foreach ($entries as $index => $entry) {
            $rowIndex = $index % $rows;
            $distributed[$rowIndex][] = $entry;
        }

        return $distributed;
    }

    protected function getRowDirection(int $rowIndex): string
    {
        $animationDirection = $this->getAttribute('animationDirection');

        if (!in_array($animationDirection, ['toLeft', 'toRight', 'alternate'], true)) {
            $animationDirection = 'alternate';
        }

        if ($animationDirection === 'alternate') {
            return $rowIndex % 2 === 0 ? 'toLeft' : 'toRight';
        }

        return $animationDirection;
    }

    /**
     * @param array<string, mixed> $entry
     */
    protected function renderEntry(array $entry): string
    {
        $Engine = QUI::getTemplateManager()->getEngine();

        $Engine->assign([
            'entry' => $entry
        ]);

        return $Engine->fetch(dirname(__FILE__) . '/CustomerReviewsFlow.card.html');
    }
}
