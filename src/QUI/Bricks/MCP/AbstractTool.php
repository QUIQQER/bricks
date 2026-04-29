<?php

/**
 * This file contains \QUI\Bricks\MCP\AbstractTool
 */

namespace QUI\Bricks\MCP;

use QUI;
use QUI\AI\MCP\Server;
use QUI\Bricks\Brick;
use QUI\Bricks\Manager;
use QUI\Exception;
use QUI\MCP\ToolInterface;
use QUI\Permissions\Permission;
use QUI\Projects\Project;
use QUI\Projects\Site\Edit;

use function array_map;
use function array_slice;
use function is_array;
use function is_string;
use function json_decode;
use function max;
use function min;
use function str_contains;
use function strtolower;
use function trim;

abstract class AbstractTool implements ToolInterface
{
    public const BRICKS_MCP_PERMISSION = 'quiqqer.bricks.mcp';

    protected static function checkBricksPermission(): void
    {
        Permission::checkPermission(
            self::BRICKS_MCP_PERMISSION,
            Server::getRequestUser()
        );
    }

    protected static function getProject(string $project, ?string $lang = null): Project
    {
        if (empty($lang)) {
            return QUI::getProject($project);
        }

        return QUI::getProject($project, $lang);
    }

    protected static function getEditSite(string $project, int $siteId, ?string $lang = null): Edit
    {
        return new Edit(self::getProject($project, $lang), $siteId);
    }

    /**
     * @throws Exception
     */
    protected static function getManager(): Manager
    {
        $Manager = Manager::init();

        if ($Manager === null) {
            throw new Exception('Bricks manager could not be initialized');
        }

        return $Manager;
    }

    /**
     * @param array<string, mixed> $brickType
     * @return array<string, mixed>
     */
    protected static function parseBrickType(array $brickType, bool $withSettings = false): array
    {
        $control = (string)($brickType['control'] ?? '');

        $result = [
            'control' => $control,
            'title' => self::parseLocaleValue($brickType['title'] ?? null),
            'description' => self::parseLocaleValue($brickType['description'] ?? null),
            'hasContent' => (bool)($brickType['hasContent'] ?? true),
            'cacheable' => (bool)($brickType['cacheable'] ?? true),
            'recommended' => (bool)($brickType['recommended'] ?? false),
            'deprecated' => (bool)($brickType['deprecated'] ?? false),
            'mockup' => $brickType['mockup'] ?? null,
            'thumbnail' => $brickType['thumbnail'] ?? null,
            'mockups' => $brickType['mockups'] ?? [],
            'galleryMockups' => $brickType['galleryMockups'] ?? []
        ];

        if (!empty($brickType['name'])) {
            $result['name'] = $brickType['name'];
        }

        if (!empty($brickType['inheritance'])) {
            $result['inheritance'] = $brickType['inheritance'];
        }

        if (!empty($brickType['priority'])) {
            $result['priority'] = $brickType['priority'];
        }

        if ($withSettings) {
            $result['settings'] = array_map(
                static fn(array $setting): array => self::parseSetting($setting),
                self::getManager()->getAvailableBrickSettingsByBrickType($control)
            );
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $setting
     * @return array<string, mixed>
     */
    protected static function parseSetting(array $setting): array
    {
        return [
            'name' => (string)($setting['name'] ?? ''),
            'title' => self::parseLocaleValue($setting['text'] ?? null),
            'description' => is_string($setting['description'] ?? null) ? $setting['description'] : '',
            'type' => (string)($setting['type'] ?? ''),
            'class' => (string)($setting['class'] ?? ''),
            'dataQui' => (string)($setting['data-qui'] ?? ''),
            'options' => $setting['options'] ?? null,
            'dataAttributes' => $setting['data-attributes'] ?? []
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected static function parseBrick(Brick $Brick, bool $withAttributes = false): array
    {
        $Project = $Brick->getAttribute('project');
        $lang = $Brick->getAttribute('lang');

        $result = [
            'id' => (int)$Brick->getAttribute('id'),
            'project' => is_string($Project) ? $Project : '',
            'lang' => is_string($lang) ? $lang : '',
            'title' => $Brick->getAttribute('title'),
            'frontendTitle' => $Brick->getAttribute('frontendTitle'),
            'description' => $Brick->getAttribute('description'),
            'type' => $Brick->getAttribute('type'),
            'active' => (bool)$Brick->getAttribute('active'),
            'areas' => $Brick->getAttribute('areas'),
            'hasContent' => (bool)$Brick->getAttribute('hasContent'),
            'cacheable' => (bool)$Brick->getAttribute('cacheable'),
            'deprecated' => (bool)$Brick->getAttribute('deprecated')
        ];

        if ($withAttributes) {
            $result['attributes'] = $Brick->getAttributes();
            $result['settings'] = $Brick->getSettings();
            $result['cssClasses'] = $Brick->getCSSClasses();
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $area
     * @return array<string, mixed>
     */
    protected static function parseArea(array $area): array
    {
        return [
            'name' => (string)($area['name'] ?? ''),
            'title' => self::parseLocaleValue($area['title'] ?? null),
            'description' => self::parseLocaleValue($area['description'] ?? null),
            'inheritance' => (string)($area['inheritance'] ?? ''),
            'priority' => (string)($area['priority'] ?? '')
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected static function parseSiteBrickAreas(Edit $Site): array
    {
        $areas = $Site->getAttribute('quiqqer.bricks.areas');

        if (!is_string($areas) || $areas === '') {
            return [];
        }

        $decoded = json_decode($areas, true);

        if (!is_array($decoded)) {
            return [];
        }

        return $decoded;
    }

    /**
     * @param mixed $value
     * @return array{text: string, locale: array{group: string, var: string}|null}
     */
    protected static function parseLocaleValue(mixed $value): array
    {
        if (!is_array($value)) {
            return [
                'text' => is_string($value) ? $value : '',
                'locale' => null
            ];
        }

        $group = $value['group'] ?? $value[0] ?? '';
        $var = $value['var'] ?? $value[1] ?? '';

        if (!is_string($group) || !is_string($var) || $group === '' || $var === '') {
            return [
                'text' => '',
                'locale' => null
            ];
        }

        return [
            'text' => (string)QUI::getLocale()->get($group, $var),
            'locale' => [
                'group' => $group,
                'var' => $var
            ]
        ];
    }

    protected static function sanitizeLimit(?int $limit): int
    {
        if (empty($limit)) {
            return 50;
        }

        return (int)min(100, max(1, $limit));
    }

    /**
     * @param array<int, array<string, mixed>> $list
     * @return array<int, array<string, mixed>>
     */
    protected static function applyLimit(array $list, ?int $limit, ?int $offset): array
    {
        return array_slice(
            $list,
            (int)max(0, $offset ?? 0),
            self::sanitizeLimit($limit)
        );
    }

    /**
     * @param array<int, array<string, mixed>> $brickTypes
     * @return array<int, array<string, mixed>>
     */
    protected static function filterBrickTypes(
        array $brickTypes,
        bool $includeDeprecated,
        ?string $query
    ): array {
        $query = is_string($query) ? trim($query) : '';
        $result = [];

        foreach ($brickTypes as $brickType) {
            if (!$includeDeprecated && !empty($brickType['deprecated'])) {
                continue;
            }

            if ($query !== '') {
                $haystack = strtolower(
                    (string)($brickType['control'] ?? '')
                    . ' '
                    . (string)($brickType['name'] ?? '')
                    . ' '
                    . self::parseLocaleValue($brickType['title'] ?? null)['text']
                    . ' '
                    . self::parseLocaleValue($brickType['description'] ?? null)['text']
                );

                if (!str_contains($haystack, strtolower($query))) {
                    continue;
                }
            }

            $result[] = $brickType;
        }

        return $result;
    }
}
