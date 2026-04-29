<?php

/**
 * This file contains \QUI\Bricks\MCP\Project\GetBrick
 */

namespace QUI\Bricks\MCP\Project;

use Mcp\Schema\Result\CallToolResult;
use Mcp\Server\Builder;
use QUI\AI\MCP\ToolHelper;
use QUI\Bricks\MCP\AbstractTool;
use Throwable;

class GetBrick extends AbstractTool
{
    public function register(Builder $serverBuilder): void
    {
        $serverBuilder->addTool(
            function (
                int $id,
                bool | null $withAttributes = null
            ): CallToolResult | array {
                try {
                    self::checkBricksPermission();

                    return self::parseBrick(
                        self::getManager()->getBrickById($id),
                        $withAttributes !== false
                    );
                } catch (Throwable $Exception) {
                    return ToolHelper::parseExceptionToResult($Exception);
                }
            },
            name: 'quiqqer_bricks_get',
            description: 'Returns one existing QUIQQER brick by its numeric brick ID.',
            inputSchema: [
                'type' => 'object',
                'additionalProperties' => false,
                'required' => ['id'],
                'properties' => [
                    'id' => ['type' => 'integer', 'description' => 'Brick ID.', 'minimum' => 1],
                    'withAttributes' => ['type' => 'boolean', 'default' => true]
                ]
            ]
        );
    }
}
