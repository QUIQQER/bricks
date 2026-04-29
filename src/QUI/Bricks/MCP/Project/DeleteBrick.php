<?php

/**
 * This file contains \QUI\Bricks\MCP\Project\DeleteBrick
 */

namespace QUI\Bricks\MCP\Project;

use Mcp\Schema\Result\CallToolResult;
use Mcp\Server\Builder;
use QUI\AI\MCP\ToolHelper;
use QUI\Bricks\MCP\AbstractTool;
use Throwable;

class DeleteBrick extends AbstractTool
{
    public function register(Builder $serverBuilder): void
    {
        $serverBuilder->addTool(
            function (
                array $ids
            ): CallToolResult | array {
                try {
                    self::checkBricksPermission();

                    $Manager = self::getManager();
                    $deleted = [];

                    foreach ($ids as $id) {
                        $brickId = (int)$id;

                        if ($brickId < 1) {
                            continue;
                        }

                        $Manager->deleteBrick($brickId);
                        $deleted[] = $brickId;
                    }

                    return [
                        'deleted' => $deleted
                    ];
                } catch (Throwable $Exception) {
                    return ToolHelper::parseExceptionToResult($Exception);
                }
            },
            name: 'quiqqer_bricks_delete',
            description: 'Deletes one or more existing QUIQQER bricks.',
            inputSchema: [
                'type' => 'object',
                'additionalProperties' => false,
                'required' => ['ids'],
                'properties' => [
                    'ids' => [
                        'type' => 'array',
                        'items' => ['type' => 'integer', 'minimum' => 1],
                        'description' => 'Brick IDs to delete.'
                    ]
                ]
            ]
        );
    }
}
