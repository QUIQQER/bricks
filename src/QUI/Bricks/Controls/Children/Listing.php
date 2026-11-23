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
            'filter' => 'disabled',
            'filterPageSize' => 0,
            'tags' => '',
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
        $Control = $this->createList();
        $result = $Control->create();
        $this->addCSSFiles($Control->getCSSFiles());

        return $result;
    }

    /**
     * Resolve the saved placement with the same visibility and overrides as the page.
     */
    public static function fromPlacement(
        QUI\Interfaces\Projects\Site $Site,
        string $placement
    ): ?QUI\Controls\ChildrenList {
        $Manager = QUI\Bricks\Manager::init();

        if ($Manager === null || $placement === '' || $Site instanceof QUI\Projects\Site\PermissionDenied) {
            return null;
        }

        $Site->load();
        QUI\Utils\Site::setRecursiveAttribute($Site, 'layout');
        $areas = $Manager->getAreasByProject(
            $Site->getProject(),
            (string)$Site->getAttribute('layout'),
            (string)$Site->getAttribute('type')
        );

        foreach ($areas as $area) {
            foreach ($Manager->getBricksByArea($area['name'], $Site) as $Brick) {
                if ($Brick->getAttribute('uniqueId') !== $placement || $Brick->getType() !== self::class) {
                    continue;
                }

                $Listing = new self();
                $Listing->setAttributes($Brick->getAttributes());
                $Listing->setAttributes($Brick->getSettings());
                $Listing->setAttribute('Site', $Site);
                $Listing->setAttribute('data-brickuid', $placement);
                $Listing->setAttribute('data-brickid', $Brick->getAttribute('id'));

                return $Listing->createList();
            }
        }

        return null;
    }

    private function createList(): QUI\Controls\ChildrenList
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
        $Control->setAttribute('filter', $this->getAttribute('filter'));
        $Control->setAttribute('tags', $this->getAttribute('tags'));
        $max = (int)$this->getAttribute('max');
        $placement = $this->getAttribute('data-brickuid');
        $brickId = (int)$this->getAttribute('data-brickid');

        if ($brickId > 0) {
            $Control->setAttribute('filterKey', 'brick-' . $brickId);

            if ($placement) {
                $Control->setAttribute('filterPlacement', 'brick-' . $placement);
            }
        }

        $Control->setAttribute('showShort', $this->getAttribute('showShort'));
        $Control->setAttribute('showSheets', $this->getAttribute('showSheets'));
        $Control->setAttribute('showImages', $this->getAttribute('showImages'));
        $Control->setAttribute('showTime', $this->getAttribute('showTime'));
        $Control->setAttribute('showDate', $this->getAttribute('showDate'));
        $Control->setAttribute('showCreator', $this->getAttribute('showCreator'));
        $Site = $this->getAttribute('Site');

        if ($Site instanceof QUI\Interfaces\Projects\Site) {
            $Control->setAttribute('Site', $Site);
            $Control->setAttribute('Project', $Site->getProject());
        }

        $pageSize = (int)$this->getAttribute('filterPageSize');

        $max = $max > 0 ? $max : 6;
        $Control->setAttribute('filterMax', $max);

        if ($pageSize > 0 && $this->getAttribute('showSheets') && $Control->isFilterEnabled()) {
            $Control->setAttribute('limit', min($pageSize, $max));
        }

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

        return $Control;
    }
}
