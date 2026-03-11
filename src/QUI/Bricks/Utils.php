<?php

/**
 * This file contains \QUI\Bricks\Utils
 */

namespace QUI\Bricks;

use DOMElement;
use DOMNameSpaceNode;
use DOMNode;
use DOMXPath;
use QUI;
use QUI\Projects\Project;
use QUI\Utils\Text\XML;

use function file_exists;
use function md5;
use function realpath;
use function trim;

use const OPT_DIR;
use const USR_DIR;

/**
 * Class Utils
 * Bricks helper class
 */
class Utils
{
    /**
     * Return the bricks from an XML file
     *
     * @param string $file - path to file
     * @return array<int, array<string, mixed>>
     */
    public static function getBricksFromXML(string $file): array
    {
        if (!file_exists($file)) {
            return [];
        }

        $Dom = XML::getDomFromXml($file);
        $Path = new DOMXPath($Dom);

        $bricks = $Path->query("//quiqqer/bricks/brick");
        $list = [];

        if (!$bricks || !$bricks->length) {
            return $list;
        }

        foreach ($bricks as $Brick) {
            if (!method_exists($Brick, 'getAttribute')) {
                continue;
            }

            if ($Brick->getAttribute('control') == '*') {
                continue;
            }

            $list[] = self::parseAreaToArray($Brick, $Path);
        }

        return $list;
    }

    /**
     * Return the template bricks from an XML file
     *
     * @param string $file - path to xm file
     * @param bool|string $layoutType - optional, return only the bricks for the specific layout type
     * @param bool|string $siteType - optional, return only the bricks for the specific site type
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getTemplateAreasFromXML(
        string $file,
        bool | string $layoutType = false,
        bool | string $siteType = false
    ): array {
        if (!file_exists($file)) {
            return [];
        }

        $Dom = XML::getDomFromXml($file);
        $Path = new DOMXPath($Dom);

        $globalAreas = $Path->query("//quiqqer/bricks/templateAreas/areas/area");

        if ($layoutType) {
            $typeAreas = $Path->query(
                "//quiqqer/bricks/templateAreas/layouts/layout[@layout='$layoutType']/area"
            );
        } else {
            $typeAreas = $Path->query("//quiqqer/bricks/templateAreas/layouts/layout/area");
        }

        if ($siteType) {
            $siteTypeAreas = $Path->query(
                "//quiqqer/bricks/templateAreas/siteTypes/type[@type='$siteType']/area"
            );
        } else {
            $siteTypeAreas = $Path->query(
                "//quiqqer/bricks/templateAreas/siteTypes/type/area"
            );
        }


        $list = [];

        if ($globalAreas && $globalAreas->length) {
            foreach ($globalAreas as $Area) {
                $list[] = self::parseAreaToArray($Area, $Path);
            }
        }

        if ($typeAreas && $typeAreas->length) {
            foreach ($typeAreas as $Area) {
                $list[] = self::parseAreaToArray($Area, $Path);
            }
        }

        if ($siteTypeAreas && $siteTypeAreas->length) {
            foreach ($siteTypeAreas as $Area) {
                $list[] = self::parseAreaToArray($Area, $Path);
            }
        }

        return $list;
    }

    public static function getGlobalTemplateAreasFromXML(): void
    {
    }

    /**
     * @param string $file
     * @param string $siteType
     */
    public static function getTypeTemplateAreasFromXML(string $file, string $siteType): void
    {
    }

    /**
     * parse a <area> XML node to an array
     *
     * @param DOMNode|DOMElement|DOMNameSpaceNode $Brick
     * @param DOMXPath $Path
     *
     * @return array<string, mixed>
     */
    public static function parseAreaToArray(DOMNode | DOMElement | DOMNameSpaceNode $Brick, DOMXPath $Path): array
    {
        $control = '';
        $name = '';

        if (method_exists($Brick, 'getAttribute')) {
            $control = $Brick->getAttribute('control');
            $name = $Brick->getAttribute('name');
        }

        $hasContent = 1;
        $cacheable = 1;
        $deprecated = 0;
        $recommended = 0;

        if (
            method_exists($Brick, 'getAttribute')
            && method_exists($Brick, 'hasAttribute')
            && $Brick->hasAttribute('deprecated')
            && (int)$Brick->getAttribute('deprecated') === 1
        ) {
            $deprecated = 1;
        }

        if (
            method_exists($Brick, 'getAttribute')
            && method_exists($Brick, 'hasAttribute')
            && $Brick->hasAttribute('hasContent')
            && (int)$Brick->getAttribute('hasContent') === 0
        ) {
            $hasContent = 0;
        }

        if (
            method_exists($Brick, 'getAttribute')
            && method_exists($Brick, 'hasAttribute')
            && $Brick->hasAttribute('cacheable')
            && (int)$Brick->getAttribute('cacheable') === 0
        ) {
            $cacheable = 0;
        }

        if (
            method_exists($Brick, 'getAttribute')
            && method_exists($Brick, 'hasAttribute')
            && $Brick->hasAttribute('recommended')
            && (int)$Brick->getAttribute('recommended') === 1
        ) {
            $recommended = 1;
        }

        $title = [];
        $description = [];

        $contextNode = $Brick instanceof DOMNameSpaceNode ? $Brick->ownerDocument : $Brick;
        $titleLocale = $Path->query('./title/locale', $contextNode);
        $descLocale = $Path->query('./description/locale', $contextNode);

        if (
            $titleLocale
            && $titleLocale->length
            && $titleLocale->item(0)
            && method_exists($titleLocale->item(0), 'getAttribute')
        ) {
            $title = [
                'group' => $titleLocale->item(0)->getAttribute('group'),
                'var' => $titleLocale->item(0)->getAttribute('var')
            ];
        }

        if (
            $descLocale
            && $descLocale->length
            && $descLocale->item(0)
            && method_exists($descLocale->item(0), 'getAttribute')
        ) {
            $description = [
                'group' => $descLocale->item(0)->getAttribute('group'),
                'var' => $descLocale->item(0)->getAttribute('var')
            ];
        }

        // mockups
        $mockupList = [];
        $mainMockup = null;
        $thumbnailMockup = null;
        $galleryMockups = [];
        $mockups = $Path->query('./mockups/mockup', $contextNode);

        if (
            $mockups
            && $mockups->length
            && $mockups->item(0)
        ) {
            foreach ($mockups as $mockup) {
                if (
                    !method_exists($mockup, 'getAttribute')
                    || empty($mockup->getAttribute('src'))
                ) {
                    continue;
                }

                $src = $mockup->getAttribute('src');
                $src = str_replace(
                    [
                        '{URL_BIN_DIR}',
                        '{URL_OPT_DIR}',
                        '{URL_USR_DIR}',
                        '{BIN_DIR}',
                        '{OPT_DIR}',
                        '{URL_DIR}',
                        '{SYS_DIR}',
                        '{CMS_DIR}',
                        '{USR_DIR}'
                    ],
                    [
                        URL_BIN_DIR,
                        URL_OPT_DIR,
                        URL_USR_DIR,
                        BIN_DIR,
                        OPT_DIR,
                        URL_DIR,
                        SYS_DIR,
                        CMS_DIR,
                        USR_DIR
                    ],
                    $src
                );

                $type = $mockup->getAttribute('type');

                $mockupList[] = $src;

                if ($type === 'preview') {
                    $mainMockup = $src;
                }

                if ($type === 'thumbnail') {
                    $thumbnailMockup = $src;
                }

                if ($type !== 'thumbnail' && $type !== 'preview') {
                    $galleryMockups[] = $src;
                }
            }

            if (
                empty($mainMockup)
                && method_exists($mockups->item(0), 'getAttribute')
                && !empty($mockups->item(0)->getAttribute('src'))
            ) {
                $mainMockup = $mockups->item(0)->getAttribute('src');
            }
        }

        if (empty($thumbnailMockup)) {
            $thumbnailMockup = $mainMockup;
        }

        return [
            'control' => $control,
            'hasContent' => $hasContent,
            'cacheable' => $cacheable,
            'recommended' => $recommended,
            'name' => $name,
            'title' => $title,
            'description' => $description,
            'inheritance' => method_exists($Brick, 'getAttribute') ? $Brick->getAttribute('inheritance') : '',
            'priority' => method_exists($Brick, 'getAttribute') ? $Brick->getAttribute('priority') : '',
            'deprecated' => $deprecated,
            'mockups' => $mockupList,
            'galleryMockups' => $galleryMockups,
            'mockup' => $mainMockup,
            'thumbnail' => $thumbnailMockup
        ];
    }

    /**
     *
     * @param Project $Project
     * @param string $areaName
     *
     * @return bool
     */
    public static function hasInheritance(
        Project $Project,
        string $areaName
    ): bool {
        $template = $Project->getAttribute('template');

        if (!is_string($template) || $template === '') {
            return false;
        }

        // getAreasByProject
        $brickXML = realpath(OPT_DIR . $template . '/bricks.xml');
        $bricks = $brickXML ? self::getTemplateAreasFromXML($brickXML) : [];

        foreach ($bricks as $brickData) {
            if ($brickData['name'] != $areaName) {
                continue;
            }

            if (isset($brickData['inheritance']) && $brickData['inheritance']) {
                return true;
            }

            return false;
        }

        return true;
    }

    /**
     * List of available bricks.xml files
     *
     * @return array<int, string>
     */
    public static function getBricksXMLFiles(): array
    {
        $cache = 'quiqqer/bricks/availableBrickFiles';

        try {
            return QUI\Cache\Manager::get($cache);
        } catch (QUI\Exception) {
        }

        $PKM = QUI::getPackageManager();
        $Projects = QUI::getProjectManager();
        $packages = $PKM->getInstalled();
        $result = [];

        // package bricks
        foreach ($packages as $package) {
            $bricksXML = OPT_DIR . $package['name'] . '/bricks.xml';

            if (file_exists($bricksXML)) {
                $result[] = $bricksXML;
            }
        }

        // project bricks
        $projects = $Projects->getProjects();

        foreach ($projects as $project) {
            $bricksXML = USR_DIR . $project . '/bricks.xml';

            if (file_exists($bricksXML)) {
                $result[] = $bricksXML;
            }
        }


        QUI\Cache\Manager::set($cache, $result);

        return $result;
    }

    /**
     * Return all available attributes for a brick
     *
     * @param Brick $Brick
     * @return array<int, string>
     */
    public static function getAttributesForBrick(Brick $Brick): array
    {
        $attributes = [];
        $files = Panel::getInstance()->getXMLFilesForBricks($Brick);

        // main path
        $type = $Brick->getAttribute('type');
        $type = '\\' . trim($type, '\\');

        $path = '//quiqqer/bricks/brick[@control="' . $type . '"]';
        $cache = 'quiqqer/bricks/' . md5($type) . '/attributes';

        try {
            return QUI\Cache\Manager::get($cache);
        } catch (QUI\Exception) {
        }


        $settingsPath = $path . '/settings/setting';
        $categoriesPath = $path . '/window/categories/category/settings';

        foreach ($files as $file) {
            $Dom = QUI\Utils\Text\XML::getDomFromXml($file);
            $Path = new DOMXPath($Dom);

            // settings
            $settings = $Path->query($settingsPath);

            if ($settings) {
                foreach ($settings as $Setting) {
                    if (method_exists($Setting, 'getAttribute')) {
                        $attributes[] = $Setting->getAttribute('name');
                    }
                }
            }

            // categories
            $categories = $Path->query($categoriesPath);

            if ($categories) {
                /* @var $Settings DOMElement */
                foreach ($categories as $Settings) {
                    if (!($Settings instanceof DOMElement)) {
                        continue;
                    }

                    $children = $Settings->childNodes;

                    /* @var $Child DOMElement */
                    foreach ($children as $Child) {
                        if (!($Child instanceof DOMElement)) {
                            continue;
                        }

                        switch ($Child->nodeName) {
                            case 'input':
                            case 'textarea':
                                $attributes[] = $Child->getAttribute('conf');
                                break;
                        }
                    }
                }
            }
        }

        QUI\Cache\Manager::set($cache, $attributes);

        return $attributes;
    }
}
