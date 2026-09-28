<?php

/**
 * This file contains QUI\Bricks\Children\Listing
 */

namespace QUI\Bricks\Controls\Children;

use Exception;
use QUI;

/**
 * Class Listing
 */
class Listing extends QUI\Control
{
    /**
     * constructor
     *
     * @param array<array<string, mixed>> $attributes
     */
    public function __construct(array $attributes = [])
    {
        // default options
        $this->setAttributes([
            'class' => 'qui-control-brick',
            'limit' => 2,
            'showSheets' => false,
            'showImages' => true,
            'showShort' => true,
            'showHeader' => true,
            'showContent' => true,
            'showTime' => false,
            'showCreator' => false,
            'Site' => true,
            'where' => false,
            'itemtype' => 'https://schema.org/ItemList',
            'child-itemtype' => 'https://schema.org/ListItem',
            'child-itemprop' => 'itemListElement',
            'template' => 'cards',
            'order' => 'c_date DESC',
            'pinnedFirst' => false,
            'cardLayout' => 'standard',
            'cardColumns' => 3,
            'cardColumnsTablet' => '',
            'cardColumnsMobile' => 1,
            'cardImageFit' => 'cover',
            'cardAspectRatio' => '3/2',
            'cardGap' => 'normal',
            'mediaImagePosition' => 'left',
            'mediaImageWidth' => 'normal'
        ]);

        parent::__construct($attributes);

        $this->setAttribute('cacheable', 0);
    }

    /**
     * Return the inner body of the element
     * Can be overwritten
     *
     * @return string
     * @throws Exception
     */
    public function getBody(): string
    {
        $Control = new QUI\Controls\ChildrenList();

        $Control->setAttribute('parentInputList', $this->getAttribute('site'));
        $Control->setAttribute('order', $this->getAttribute('order'));

        if ($this->getAttribute('pinnedFirst') && $this->getAttribute('site')) {
            $Control->setAttribute('pinnedAttribute', [
                'quiqqer.settings.blog.pinned',
                'quiqqer.settings.news.pinned'
            ]);
        }

        $Control->setAttribute('display', $this->getAttribute('template'));
        $Control->setAttribute('limit', $this->getAttribute('max'));
        $Control->setAttribute('showShort', $this->getAttribute('showShort'));
        $Control->setAttribute('showSheets', $this->getAttribute('showSheets'));
        $Control->setAttribute('showImages', $this->getAttribute('showImages'));
        $Control->setAttribute('showTime', $this->getAttribute('showTime'));
        $Control->setAttribute('showDate', $this->getAttribute('showDate'));
        $Control->setAttribute('showCreator', $this->getAttribute('showCreator'));
        $Control->setAttribute('showSheets', $this->getAttribute('showSheets'));
        $Control->setAttribute('Site', false);
        $Control->setAttribute('content', $this->getAttribute('content'));
        $Control->setAttribute('cardLayout', $this->getAttribute('cardLayout'));
        $Control->setAttribute('cardColumns', $this->getAttribute('cardColumns'));
        $Control->setAttribute('cardColumnsTablet', $this->getAttribute('cardColumnsTablet'));
        $Control->setAttribute('cardColumnsMobile', $this->getAttribute('cardColumnsMobile'));
        $Control->setAttribute('cardImageFit', $this->getAttribute('cardImageFit'));
        $Control->setAttribute('cardAspectRatio', $this->getAttribute('cardAspectRatio'));
        $Control->setAttribute('cardGap', $this->getAttribute('cardGap'));
        $Control->setAttribute('mediaImagePosition', $this->getAttribute('mediaImagePosition'));
        $Control->setAttribute('mediaImageWidth', $this->getAttribute('mediaImageWidth'));

        $Control->setAttribute('frontendTitle', $this->getAttribute('frontendTitle'));
        $Control->setAttribute('showTitle', $this->getAttribute('showTitle'));
        $result = $Control->create();

        $this->addCSSFiles($Control->getCSSFiles());

        return $result;
    }
}
