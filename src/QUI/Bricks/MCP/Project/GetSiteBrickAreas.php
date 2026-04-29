<?php

/**
 * This file contains \QUI\Bricks\MCP\Project\GetSiteBrickAreas
 */

namespace QUI\Bricks\MCP\Project;

use Mcp\Schema\Result\CallToolResult;
use Mcp\Server\Builder;
use QUI\AI\MCP\ToolHelper;
use QUI\Bricks\MCP\AbstractTool;
use Throwable;

use function is_array;

class GetSiteBrickAreas extends AbstractTool
{
    public function register(Builder $serverBuilder): void
    {
        $serverBuilder->addTool(
            function (
                string $project,
                int $siteId,
                string | null $lang = null,
                string | null $area = null,
                bool | null $withBrickData = null
            ): CallToolResult | array {
                try {
                    self::checkBricksPermission();

                    $Manager = self::getManager();
                    $Site = self::getEditSite($project, $siteId, $lang);
                    $areas = self::parseSiteBrickAreas($Site);

                    if ($area !== null) {
                        $areas = [
                            $area => $areas[$area] ?? []
                        ];
                    }

                    if ($withBrickData === true) {
                        foreach ($areas as $areaName => $bricks) {
                            if (!is_array($bricks)) {
                                continue;
                            }

                            foreach ($bricks as $index => $brick) {
                                if (!is_array($brick) || empty($brick['brickId'])) {
                                    continue;
                                }

                                try {
                                    $areas[$areaName][$index]['brick'] = self::parseBrick(
                                        $Manager->getBrickById((int)$brick['brickId'])
                                    );
                                } catch (Throwable) {
                                }
                            }
                        }
                    }

                    return [
                        'project' => $Site->getProject()->getName(),
                        'lang' => $Site->getProject()->getLang(),
                        'siteId' => $Site->getId(),
                        'areas' => $areas
                    ];
                } catch (Throwable $Exception) {
                    return ToolHelper::parseExceptionToResult($Exception);
                }
            },
            name: 'quiqqer_site_bricks_get_areas',
            description: 'Returns current brick assignments for a QUIQQER site.',
            inputSchema: [
                'type' => 'object',
                'additionalProperties' => false,
                'required' => ['project', 'siteId'],
                'properties' => [
                    'project' => ['type' => 'string', 'description' => 'Project name.'],
                    'lang' => ['type' => 'string', 'description' => 'Project language.'],
                    'siteId' => ['type' => 'integer', 'description' => 'Site ID.', 'minimum' => 1],
                    'area' => ['type' => 'string', 'description' => 'Optional area name filter.'],
                    'withBrickData' => ['type' => 'boolean', 'default' => false]
                ]
            ]
        );
    }
}
