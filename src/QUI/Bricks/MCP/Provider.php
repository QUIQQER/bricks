<?php

/**
 * This file contains \QUI\Bricks\MCP\Provider
 */

namespace QUI\Bricks\MCP;

use Mcp\Server\Builder;
use QUI\AI\MCP\ProviderInterface;
use QUI\AI\MCP\Server;
use QUI\Bricks\MCP\BrickTypes\GetBrickType;
use QUI\Bricks\MCP\BrickTypes\ListBrickTypes;
use QUI\Bricks\MCP\Project\CreateBrick;
use QUI\Bricks\MCP\Project\DeleteBrick;
use QUI\Bricks\MCP\Project\GetBrick;
use QUI\Bricks\MCP\Project\GetSiteBrickAreas;
use QUI\Bricks\MCP\Project\ListAreas;
use QUI\Bricks\MCP\Project\ListBricks;
use QUI\Bricks\MCP\Project\SetSiteAreaBricks;
use QUI\Bricks\MCP\Project\UpdateBrick;
use QUI\MCP\ToolInterface;
use QUI\Permissions\Permission;
use Throwable;

/**
 * Bricks MCP provider
 */
class Provider implements ProviderInterface
{
    /**
     * @var array<ToolInterface>
     */
    protected array $tools;

    public function __construct()
    {
        $this->tools = [
            new ListBrickTypes(),
            new GetBrickType(),
            new ListAreas(),
            new ListBricks(),
            new GetBrick(),
            new CreateBrick(),
            new UpdateBrick(),
            new DeleteBrick(),
            new GetSiteBrickAreas(),
            new SetSiteAreaBricks()
        ];
    }

    public function register(Builder $serverBuilder): void
    {
        if (!$this->canUseMcp()) {
            return;
        }

        foreach ($this->tools as $Tool) {
            $Tool->register($serverBuilder);
        }
    }

    protected function canUseMcp(): bool
    {
        try {
            Permission::checkPermission(
                AbstractTool::BRICKS_MCP_PERMISSION,
                Server::getRequestUser()
            );

            return true;
        } catch (Throwable) {
            return false;
        }
    }
}
