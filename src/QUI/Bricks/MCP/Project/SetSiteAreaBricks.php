<?php

/**
 * This file contains \QUI\Bricks\MCP\Project\SetSiteAreaBricks
 */

namespace QUI\Bricks\MCP\Project;

use Mcp\Schema\Result\CallToolResult;
use Mcp\Server\Builder;
use QUI\AI\MCP\Server;
use QUI\AI\MCP\ToolHelper;
use QUI\Bricks\MCP\AbstractTool;
use Throwable;

use function is_array;
use function is_string;
use function json_encode;

class SetSiteAreaBricks extends AbstractTool
{
    public function register(Builder $serverBuilder): void
    {
        $serverBuilder->addTool(
            function (
                string $project,
                int $siteId,
                string $area,
                array $bricks,
                string | null $lang = null,
                bool | null $deactivate = null
            ): CallToolResult | array {
                try {
                    self::checkBricksPermission();

                    $Manager = self::getManager();
                    $Site = self::getEditSite($project, $siteId, $lang);
                    $areas = self::parseSiteBrickAreas($Site);

                    if ($deactivate === true) {
                        $areas[$area] = [
                            ['deactivate' => 1]
                        ];
                    } else {
                        $areaBricks = [];

                        foreach ($bricks as $brick) {
                            if (!is_array($brick) || empty($brick['brickId'])) {
                                continue;
                            }

                            $brickId = (int)$brick['brickId'];
                            $Manager->getBrickById($brickId);

                            $entry = [
                                'brickId' => $brickId
                            ];

                            if (!empty($brick['uid']) && is_string($brick['uid'])) {
                                $entry['uid'] = $brick['uid'];
                            }

                            if (isset($brick['customfields'])) {
                                $entry['customfields'] = $brick['customfields'];
                            }

                            $areaBricks[] = $entry;
                        }

                        $areas[$area] = $areaBricks;
                    }

                    $Site->setAttribute('quiqqer.bricks.areas', json_encode($areas));
                    $Site->save(Server::getRequestUser());

                    return [
                        'saved' => true,
                        'project' => $Site->getProject()->getName(),
                        'lang' => $Site->getProject()->getLang(),
                        'siteId' => $Site->getId(),
                        'area' => $area,
                        'areas' => self::parseSiteBrickAreas($Site)
                    ];
                } catch (Throwable $Exception) {
                    return ToolHelper::parseExceptionToResult($Exception);
                }
            },
            name: 'quiqqer_site_bricks_set_area',
            description: 'Sets the brick assignment for one area on a QUIQQER site.',
            inputSchema: [
                'type' => 'object',
                'additionalProperties' => false,
                'required' => ['project', 'siteId', 'area', 'bricks'],
                'properties' => [
                    'project' => ['type' => 'string', 'description' => 'Project name.'],
                    'lang' => ['type' => 'string', 'description' => 'Project language.'],
                    'siteId' => ['type' => 'integer', 'description' => 'Site ID.', 'minimum' => 1],
                    'area' => ['type' => 'string', 'description' => 'Brick area name.'],
                    'bricks' => [
                        'type' => 'array',
                        'description' => 'Ordered brick assignments for the area.',
                        'items' => [
                            'type' => 'object',
                            'required' => ['brickId'],
                            'additionalProperties' => true,
                            'properties' => [
                                'brickId' => ['type' => 'integer', 'minimum' => 1],
                                'uid' => ['type' => 'string'],
                                'customfields' => [
                                    'oneOf' => [
                                        ['type' => 'string'],
                                        ['type' => 'object', 'additionalProperties' => true]
                                    ]
                                ]
                            ]
                        ]
                    ],
                    'deactivate' => ['type' => 'boolean', 'default' => false]
                ]
            ]
        );
    }
}
