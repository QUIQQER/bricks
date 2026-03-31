<?php

/**
 * This file contains QUI\Bricks\Controls\Buttons
 */

namespace QUI\Bricks\Controls;

use QUI;
use QUI\Components\Controls\Button;

/**
 * Class Buttons
 */
class Buttons extends QUI\Control
{
    /**
     * @param array<string, mixed> $attributes
     */
    public function __construct(array $attributes = [])
    {
        $this->setAttributes([
            'class' => 'quiqqer-bricks-buttons',
            'buttons' => false,
            'displayMode' => 'button', // button, icon-only, icon-only-rounded
            'size' => 'default',
        ]);

        parent::__construct($attributes);
    }

    public function getBody(): string
    {
        $Engine = QUI::getTemplateManager()->getEngine();

        $displayMode = (string)$this->getAttribute('displayMode');
        $displayMode = in_array($displayMode, ['icon-only', 'icon-only-rounded'], true)
            ? $displayMode
            : 'button';
        $defaultSize = in_array((string)$this->getAttribute('size'), ['sm', 'lg'], true)
            ? (string)$this->getAttribute('size')
            : 'default';

        $buttons = $this->getAttribute('buttons');
        if (is_string($buttons)) {
            $buttons = json_decode($buttons, true);
        }

        if (!is_array($buttons)) {
            $buttons = [];
        }

        $buttonControls = [];

        foreach ($buttons as $button) {
            if (!is_array($button)) {
                continue;
            }

            if (isset($button['iconClass']) && !isset($button['icon'])) {
                $button['icon'] = $button['iconClass'];
            }

            $button['iconType'] = $button['iconType'] ?? 'fa';
            $button['size'] = !empty($button['size']) ? $button['size'] : $defaultSize;

            $Button = new Button(array_merge($button, [
                'displayMode' => $displayMode,
            ]));

            $buttonControls[] = $Button;
        }

        $Engine->assign([
            'this' => $this,
            'buttons' => $buttonControls,
        ]);

        return $Engine->fetch(dirname(__FILE__) . '/Buttons.html');
    }
}
