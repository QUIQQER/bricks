<?php

/**
 * This file contains QUI\Bricks\Panel
 */

namespace QUI\Bricks;

use DOMXPath;
use Exception;
use QUI;

use function array_merge;
use function is_array;
use function trim;

/**
 * Class Panel
 * - Helper class for the brick panel in the administration
 */
class Panel extends QUI\Utils\Singleton
{
    /**
     * @param integer $brickId
     * @param string $category
     *
     * @return string
     */
    public function getCategoryFromBrick(int $brickId, string $category): string
    {
        try {
            $BrickManager = QUI\Bricks\Manager::init();
            if ($BrickManager === null) {
                return '';
            }
            $Brick = $BrickManager->getBrickById($brickId);
            $type = $Brick->getAttribute('type');
        } catch (QUI\Exception $Exception) {
            QUI\System\Log::addError($Exception->getMessage());

            return '';
        }

        $cacheName = 'quiqqer/bricks/categories/category/' . $type . '/' . $category;

        try {
            return QUI\Cache\Manager::get($cacheName);
        } catch (QUI\Exception) {
        }

        $files = Utils::getBricksXMLFiles();
        $path = $this->getPath($Brick);
        $path = $path . '/window';

        $Settings = QUI\Utils\XML\Settings::getInstance();
        $Settings->setXMLPath($path);

        $result = '';

        try {
            $result = $Settings->getCategoriesHtml($files, $category);
            QUI\Cache\Manager::set($cacheName, $result);
        } catch (Exception $Exception) {
            QUI\System\Log::writeException($Exception);
        }

        return $result;
    }

    /**
     * @param integer|string $brickId
     * @return array<int, array<string, mixed>>
     */
    public function getCategoriesFromBrick(int | string $brickId): array
    {
        try {
            $BrickManager = QUI\Bricks\Manager::init();
            if ($BrickManager === null) {
                return [];
            }
            $Brick = $BrickManager->getBrickById((int)$brickId);
        } catch (QUI\Exception $Exception) {
            QUI\System\Log::addError($Exception->getMessage());

            return [];
        }

        $xmlFiles = $this->getXMLFilesForBricks($Brick);
        $path = $this->getPath($Brick);
        $path = $path . '/window';

        $Settings = QUI\Utils\XML\Settings::getInstance();
        $Settings->setXMLPath($path);

        $categories = [];

        foreach ($xmlFiles as $file) {
            $panel = $Settings->getPanel($file);
            $categories = array_merge(
                $categories,
                $panel['categories']->toArray()
            );
        }

        // locale
        foreach ($categories as $key => $category) {
            if (isset($category['text']) && is_array($category['text'])) {
                $categories[$key]['text'] = QUI::getLocale()->get(
                    $category['text'][0],
                    $category['text'][1]
                );
            }

            if (isset($category['title']) && is_array($category['title'])) {
                $categories[$key]['title'] = QUI::getLocale()->get(
                    $category['title'][0],
                    $category['title'][1]
                );
            }

            if (empty($categories[$key]['text']) && !empty($categories[$key]['title'])) {
                $categories[$key]['text'] = $categories[$key]['title'];
            }

            if (empty($categories[$key]['title']) && !empty($categories[$key]['text'])) {
                $categories[$key]['title'] = $categories[$key]['text'];
            }
        }

        return $categories;
    }

    /**
     * @param Brick $Brick
     * @return array<string>
     */
    public function getXMLFilesForBricks(Brick $Brick): array
    {
        $path = $this->getPath($Brick);

        $xmlFiles = Utils::getBricksXMLFiles();
        $result = [];

        foreach ($xmlFiles as $xmlFile) {
            try {
                $Dom = QUI\Utils\Text\XML::getDomFromXml($xmlFile);
                $Path = new DOMXPath($Dom);
                $bricks = $Path->query($path);

                if ($bricks && $bricks->length) {
                    $result[] = $xmlFile;
                }
            } catch (QUI\Exception $Exception) {
                continue;
            }
        }

        return $result;
    }

    /**
     * @param Brick $Brick
     * @return string
     */
    protected function getPath(Brick $Brick): string
    {
        $type = $Brick->getAttribute('type');
        $type = '\\' . trim($type, '\\');

        return '//quiqqer/bricks/brick[@control="' . $type . '"]';
    }
}
