<?php

/**
 * This file contains \QUI\Bricks\MCP\Project\CreateBrick
 */

namespace QUI\Bricks\MCP\Project;

use Mcp\Schema\Result\CallToolResult;
use Mcp\Server\Builder;
use QUI\AI\MCP\ToolHelper;
use QUI\Bricks\Brick;
use QUI\Bricks\MCP\AbstractTool;
use Throwable;

use function implode;
use function is_array;

class CreateBrick extends AbstractTool
{
    public function register(Builder $serverBuilder): void
    {
        $serverBuilder->addTool(
            function (
                string $project,
                string $type,
                string $title,
                string | null $lang = null,
                string | null $description = null,
                string | null $content = null,
                bool | null $active = null,
                string | null $frontendTitle = null,
                array | null $settings = null,
                array | string | null $areas = null,
                array | null $customfields = null,
                string | null $width = null,
                string | null $height = null,
                array | null $classes = null
            ): CallToolResult | array {
                try {
                    self::checkBricksPermission();

                    $Project = self::getProject($project, $lang);
                    $Manager = self::getManager();
                    $brickData = [
                        'type' => $type,
                        'title' => $title,
                        'description' => $description ?? '',
                        'active' => $active === false ? 0 : 1
                    ];

                    $brickId = $Manager->createBrickForProject(
                        $Project,
                        new Brick($brickData)
                    );

                    if (
                        $content !== null
                        || $frontendTitle !== null
                        || $settings !== null
                        || $areas !== null
                        || $customfields !== null
                        || $width !== null
                        || $height !== null
                        || $classes !== null
                    ) {
                        $saveData = [
                            'title' => $title,
                            'description' => $description ?? '',
                            'content' => $content ?? '',
                            'type' => $type,
                            'active' => $active === false ? 0 : 1,
                            'frontendTitle' => $frontendTitle ?? '',
                            'settings' => $settings ?? [],
                            'customfields' => $customfields ?? [],
                            'width' => $width ?? '',
                            'height' => $height ?? '',
                            'classes' => $classes ?? []
                        ];

                        if ($areas !== null) {
                            $saveData['areas'] = is_array($areas) ? implode(',', $areas) : $areas;
                        }

                        $Manager->saveBrick($brickId, $saveData);
                    }

                    return self::parseBrick(
                        $Manager->getBrickById($brickId),
                        true
                    );
                } catch (Throwable $Exception) {
                    return ToolHelper::parseExceptionToResult($Exception);
                }
            },
            name: 'quiqqer_bricks_create',
            description: 'Creates a new QUIQQER brick for a project.',
            inputSchema: [
                'type' => 'object',
                'additionalProperties' => false,
                'required' => ['project', 'type', 'title'],
                'properties' => [
                    'project' => ['type' => 'string', 'description' => 'Project name.'],
                    'lang' => ['type' => 'string', 'description' => 'Project language.'],
                    'type' => ['type' => 'string', 'description' => 'Brick type/control identifier.'],
                    'title' => ['type' => 'string', 'description' => 'Internal brick title.'],
                    'description' => ['type' => 'string', 'default' => ''],
                    'content' => ['type' => 'string', 'default' => ''],
                    'active' => ['type' => 'boolean', 'default' => true],
                    'frontendTitle' => ['type' => 'string', 'default' => ''],
                    'settings' => ['type' => 'object', 'additionalProperties' => true],
                    'areas' => [
                        'oneOf' => [
                            ['type' => 'string'],
                            ['type' => 'array', 'items' => ['type' => 'string']]
                        ]
                    ],
                    'customfields' => ['type' => 'array', 'items' => ['type' => 'string']],
                    'width' => ['type' => 'string', 'default' => ''],
                    'height' => ['type' => 'string', 'default' => ''],
                    'classes' => ['type' => 'array', 'items' => ['type' => 'string']]
                ]
            ]
        );
    }
}
