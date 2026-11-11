<?php

/**
 * This file contains QUI\Bricks\Controls\Slider\BasicSlider
 */

namespace QUI\Bricks\Controls\Slider;

use QUI;
use QUI\Projects\Media\Folder;

use function dirname;

/**
 * Class BrickSlider
 */
class BasicSlider extends QUI\Control
{
    /**
     * @param array<array<string, mixed>> $attributes
     */
    public function __construct(array $attributes = [])
    {
        // default options
        $this->setAttributes([
            'nodeName' => 'section',
            'class' => 'quiqqer-bricks-slider-basicSlider',
            'data-qui' => 'package/quiqqer/bricks/bin/Controls/Slider/BasicSlider',

            'mediaFolder' => false,
            'showDotNav' => false,
            'prioritizeFirstImage' => false,
            'delay' => 7000,
            'animationType' => 'hideSlideToLeftShowSlideFromLeft', // see js control options for possible values
            'imgLeft' => false,
            'imgTopMobile' => false,
            'maxImageWidth' => 300,
            'sliderHeight' => false,
            'sliderHeightMobile' => false,
            'sliderContent' => '',
            'textPosition' => 'center',
        ]);

        parent::__construct($attributes);

        $this->addCSSFile(
            dirname(__FILE__) . '/BasicSlider.css'
        );
    }


    public function getBody(): string
    {
        $Engine = QUI::getTemplateManager()->getEngine();

        $mediaFolder = $this->getAttribute('mediaFolder');
        $Folder = false;
        $images = [];
        $sliderContent = $this->getAttribute('sliderContent');

        if (!$mediaFolder) {
            return '';
        }

        /* @var $Folder Folder */
        if (str_contains($mediaFolder, 'image.php')) {
            try {
                $Folder = QUI\Projects\Media\Utils::getMediaItemByUrl(
                    $mediaFolder
                );
            } catch (QUI\Exception) {
            }
        }

        if ($Folder && method_exists($Folder, 'getImages')) {
            $images = $Folder->getImages();
        } elseif (!empty($this->ownImages)) {
            $images = $this->ownImages;
        }

        $delay = 7000;
        if (intval($this->getAttribute('delay')) >= 1000) {
            $delay = $this->getAttribute('delay');
        }

        $containerChildDirection = 'row';
        $containerChildDirectionMobile = 'column';

        if ($this->getAttribute('imgLeft')) {
            $containerChildDirection = 'row-reverse';
        }

        if ($this->getAttribute('imgTopMobile')) {
            $containerChildDirectionMobile = 'column-reverse';
        }

        $maxImageWidth = false;
        if (intval($this->getAttribute('maxImageWidth')) > 0) {
            $maxImageWidth = intval($this->getAttribute('maxImageWidth'));
        }

        $sliderHeight = false;
        $sliderHeightMobile = false;
        if (intval($this->getAttribute('sliderHeight')) > 0) {
            $sliderHeight = intval($this->getAttribute('sliderHeight'));
        }
        if (intval($this->getAttribute('sliderHeightMobile')) > 0) {
            $sliderHeightMobile = intval($this->getAttribute('sliderHeightMobile'));
        }

        $textPosition = match ($this->getAttribute('textPosition')) {
            'center' => 'center',
            'bottom' => 'flex-end',
            default => 'flex-start',
        };

        $this->setCustomVariable('textPosition', $textPosition);
        $this->setCustomVariable('direction', $containerChildDirection);
        $this->setCustomVariable('direction--mobile', $containerChildDirectionMobile);
        $this->setCustomVariable('image-maxWidth', $maxImageWidth . 'px');
        $this->setCustomVariable('slider-height', $sliderHeight . 'px');
        $this->setCustomVariable('slider-height--mobile', $sliderHeightMobile . 'px');

        $this->setJavaScriptControlOption('delay', $delay);
        $this->setJavaScriptControlOption('animationtype', $this->getAttribute('animationType'));

        $options = [
            'this' => $this,
            'images' => $images,
            'sliderContent' => $sliderContent,
            'maxImageWidth' => $maxImageWidth,
            'textPosition' => $textPosition,
            'showDotNav' => $this->getAttribute('showDotNav'),
            'prioritizeFirstImage' => (bool)$this->getAttribute('prioritizeFirstImage'),
        ];

        $Engine->assign($options);

        return $Engine->fetch(dirname(__FILE__) . '/BasicSlider.html');
    }

    /**
     * Set custom css variable to the control as inline style
     *   --_qui-bricks-slider-basicSlider-settings-$name: $value;
     *
     * Example:
     *   --_qui-bricks-slider-basicSlider-settings-sliderHEight: 300px;
     *
     * @param string $name
     * @param string $value
     *
     * @return void
     */
    private function setCustomVariable(string $name, string $value): void
    {
        if (!$name || !$value) {
            return;
        }

        $this->setStyle(
            '--_qui-bricks-slider-basicSlider-settings-' . $name,
            $value
        );
    }
}
