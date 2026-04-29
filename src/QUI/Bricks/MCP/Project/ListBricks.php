<?php

/**
 * This file contains \QUI\Bricks\MCP\Project\ListBricks
 */

namespace QUI\Bricks\MCP\Project;

use Mcp\Schema\Result\CallToolResult;
use Mcp\Server\Builder;
use QUI\AI\MCP\ToolHelper;
use QUI\Bricks\Brick;
use QUI\Bricks\MCP\AbstractTool;
use Throwable;

class ListBricks extends AbstractTool
{
    public function register(Builder $serverBuilder): void
    {
        $serverBuilder->addTool(
            function (
                string $project,
                string | null $lang = null,
                int | null $limit = null,
                int | null $offset = null
            ): CallToolResult | array {
                try {
                    self::checkBricksPermission();

                    $Project = self::getProject($project, $lang);
                    $bricks = self::getManager()->getBricksFromProject($Project);
                    $bricks = self::applyLimit(
                        array_map(
                            static fn(Brick $Brick): array => self::parseBrick($Brick),
                            $bricks
                        ),
                        $limit,
                        $offset
                    );

                    return [
                        'project' => [
                            'name' => $Project->getName(),
                            'title' => $Project->getTitle(),
                            'lang' => $Project->getLang()
                        ],
                        'bricks' => $bricks
                    ];
                } catch (Throwable $Exception) {
                    return ToolHelper::parseExceptionToResult($Exception);
                }
            },
            name: 'quiqqer_bricks_list',
            description: 'Lists existing QUIQQER bricks assigned to a project.',
            inputSchema: [
                'type' => 'object',
                'additionalProperties' => false,
                'required' => ['project'],
                'properties' => [
                    'project' => ['type' => 'string', 'description' => 'Project name.'],
                    'lang' => ['type' => 'string', 'description' => 'Project language.'],
                    'limit' => ['type' => 'integer', 'default' => 50, 'minimum' => 1, 'maximum' => 100],
                    'offset' => ['type' => 'integer', 'default' => 0, 'minimum' => 0]
                ]
            ]
        );
    }
}
