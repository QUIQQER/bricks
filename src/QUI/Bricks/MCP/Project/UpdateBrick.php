<?php

/**
 * This file contains \QUI\Bricks\MCP\Project\UpdateBrick
 */

namespace QUI\Bricks\MCP\Project;

use Mcp\Schema\Result\CallToolResult;
use Mcp\Server\Builder;
use QUI\AI\MCP\ToolHelper;
use QUI\Bricks\MCP\AbstractTool;
use Throwable;

class UpdateBrick extends AbstractTool
{
    public function register(Builder $serverBuilder): void
    {
        $serverBuilder->addTool(
            function (
                int $id,
                array $attributes,
                array | null $settings = null,
                array | null $customfields = null
            ): CallToolResult | array {
                try {
                    self::checkBricksPermission();

                    $Manager = self::getManager();
                    $Brick = $Manager->getBrickById($id);
                    $saveData = [
                        'title' => $Brick->getAttribute('title'),
                        'description' => $Brick->getAttribute('description'),
                        'content' => $Brick->getAttribute('content'),
                        'type' => $Brick->getAttribute('type'),
                        'active' => (int)$Brick->getAttribute('active'),
                        'frontendTitle' => $Brick->getAttribute('frontendTitle'),
                        'areas' => $Brick->getAttribute('areas'),
                        'width' => $Brick->getAttribute('width'),
                        'height' => $Brick->getAttribute('height'),
                        'classes' => $Brick->getCSSClasses(),
                        'settings' => $Brick->getSettings(),
                        'customfields' => $Brick->getCustomFields()
                    ];

                    foreach ($attributes as $attribute => $value) {
                        $saveData[$attribute] = $value;
                    }

                    if ($settings !== null) {
                        $saveData['settings'] = $settings;
                    }

                    if ($customfields !== null) {
                        $saveData['customfields'] = $customfields;
                    }

                    $Manager->saveBrick($id, $saveData);

                    return self::parseBrick(
                        $Manager->getBrickById($id),
                        true
                    );
                } catch (Throwable $Exception) {
                    return ToolHelper::parseExceptionToResult($Exception);
                }
            },
            name: 'quiqqer_bricks_update',
            description: 'Updates an existing QUIQQER brick.',
            inputSchema: [
                'type' => 'object',
                'additionalProperties' => false,
                'required' => ['id', 'attributes'],
                'properties' => [
                    'id' => ['type' => 'integer', 'description' => 'Brick ID.', 'minimum' => 1],
                    'attributes' => [
                        'type' => 'object',
                        'description' => 'Brick attributes such as title, description, content, active or areas.',
                        'additionalProperties' => true
                    ],
                    'settings' => ['type' => 'object', 'additionalProperties' => true],
                    'customfields' => ['type' => 'array', 'items' => ['type' => 'string']]
                ]
            ]
        );
    }
}
