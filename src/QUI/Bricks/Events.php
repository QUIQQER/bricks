<?php

/**
 * This file contains \QUI\Bricks\Events
 */

namespace QUI\Bricks;

use Exception;
use QUI;
use QUI\ExceptionStack;
use Smarty;
use Smarty_Internal_Template;
use SmartyException;

use function array_flip;
use function explode;
use function is_array;
use function is_string;
use function json_decode;
use function json_encode;
use function method_exists;
use function preg_replace_callback;
use function str_replace;
use function trim;

/**
 * Class Events
 */
class Events
{
    /**
     * @var array<int, bool>
     */
    protected static array $saved = [];

    /**
     * Event: on site save
     * Create site brick cache, for inheritance
     *
     * @param QUI\Interfaces\Projects\Site $Site
     * @param QUI\Interfaces\Users\User|null $SaveUser
     * @throws QUI\Exception
     */
    public static function onSiteSave(
        QUI\Interfaces\Projects\Site $Site,
        ?QUI\Interfaces\Users\User $SaveUser = null
    ): void {
        if (isset(self::$saved[$Site->getId()])) {
            return;
        }

        QUI\Permissions\Permission::checkPermission('quiqqer.bricks.assign', $SaveUser);

        $areas = $Site->getAttribute('quiqqer.bricks.areas');
        $oldAreaString = $areas;
        $areas = json_decode($areas, true);

        if (empty($areas)) {
            return;
        }

        $Manager = Manager::init();

        if ($Manager === null) {
            return;
        }

        // get inheritance areas
        $Project = $Site->getProject();
        $projectAreas = $Manager->getAreasByProject($Project);
        $projectTable = QUI::getDBProjectTableName(Manager::TABLE_CACHE, $Project);

        $uidTable = QUI\Bricks\Manager::getUIDTable();
        $availableUniqueIds = [];
        $Connection = QUI::getDataBaseConnection();

        foreach ($projectAreas as $area) {
            if (!$area['inheritance']) {
                continue;
            }

            if (!isset($areas[$area['name']])) {
                continue;
            }

            if (empty($areas[$area['name']])) {
                continue;
            }

            $bricks = $areas[$area['name']];

            // clear area and new data set
            $Connection->delete(QUI\Utils\Doctrine::quoteIdentifier($projectTable), [
                QUI\Utils\Doctrine::quoteIdentifier('id') => $Site->getId(),
                QUI\Utils\Doctrine::quoteIdentifier('area') => $area['name']
            ]);

            // check if deactivated
            if (isset($bricks[0]['deactivate'])) {
                $Connection->insert(QUI\Utils\Doctrine::quoteIdentifier($projectTable), [
                    QUI\Utils\Doctrine::quoteIdentifier('id') => $Site->getId(),
                    QUI\Utils\Doctrine::quoteIdentifier('area') => $area['name'],
                    QUI\Utils\Doctrine::quoteIdentifier('brick') => -1
                ]);

                continue;
            }

            foreach ($bricks as $bricksKey => $brick) {
                try {
                    $Manager->getBrickById($brick['brickId']);
                } catch (QUI\Exception) {
                    unset($areas[$area['name']][$bricksKey]);
                    continue;
                }

                try {
                    $uid = $Manager->createUniqueSiteBrick($Site, $brick);
                } catch (QUI\Exception) {
                    unset($areas[$area['name']][$bricksKey]);
                    continue;
                }

                $areas[$area['name']][$bricksKey]['uid'] = $uid;

                $availableUniqueIds[] = $uid;
                $customFields = [];

                // Custom data cache
                if (isset($brick['customfields']) && is_string($brick['customfields'])) {
                    $customFields = json_decode($brick['customfields'], true);
                }

                if (isset($brick['customfields']) && is_array($brick['customfields'])) {
                    $customFields = $brick['customfields'];
                }

                if (!isset($customFields['inheritance']) || !(int)$customFields['inheritance']) {
                    continue;
                }

                $Connection->insert(QUI\Utils\Doctrine::quoteIdentifier($projectTable), [
                    QUI\Utils\Doctrine::quoteIdentifier('id') => $Site->getId(),
                    QUI\Utils\Doctrine::quoteIdentifier('area') => $area['name'],
                    QUI\Utils\Doctrine::quoteIdentifier('brick') => (int)$brick['brickId']
                ]);
            }
        }

        // cleanup unique ids
        $QueryBuilder = QUI::getQueryBuilder();
        $uniquerIdsInDataBase = $QueryBuilder
            ->select('uid')
            ->from(QUI\Utils\Doctrine::quoteIdentifier($uidTable))
            ->where($QueryBuilder->expr()->eq('project', ':project'))
            ->andWhere($QueryBuilder->expr()->eq('lang', ':lang'))
            ->andWhere($QueryBuilder->expr()->eq(QUI\Utils\Doctrine::quoteIdentifier('siteId'), ':siteId'))
            ->setParameter('project', $Project->getName())
            ->setParameter('lang', $Project->getLang())
            ->setParameter('siteId', $Site->getId())
            ->executeQuery()
            ->fetchFirstColumn();

        $availableUniqueIds = array_flip($availableUniqueIds);

        foreach ($uniquerIdsInDataBase as $uid) {
            if (isset($availableUniqueIds[$uid])) {
                continue;
            }

            $Connection->delete(QUI\Utils\Doctrine::quoteIdentifier($uidTable), [
                QUI\Utils\Doctrine::quoteIdentifier('uid') => $uid
            ]);
        }

        self::$saved[$Site->getId()] = true;

        // save bricks with unique ids
        if ($oldAreaString !== json_encode($areas)) {
            $Site->setAttribute('quiqqer.bricks.areas', json_encode($areas));

            if (method_exists($Site, 'save')) {
                $Site->save($SaveUser);
            }
        }
    }

    /**
     * event: on project delete
     *
     * @param string $project
     */
    public static function onDeleteProject(string $project): void
    {
        // delete uid entries
        try {
            QUI::getDataBaseConnection()->delete(
                QUI\Utils\Doctrine::quoteIdentifier(QUI\Bricks\Manager::getUIDTable()),
                [
                    QUI\Utils\Doctrine::quoteIdentifier('project') => $project
                ]
            );
        } catch (\Doctrine\DBAL\Exception $Exception) {
            QUI\System\Log::addError($Exception->getMessage());
        }


        // delete project bricks
        try {
            QUI::getDataBaseConnection()->delete(
                QUI\Utils\Doctrine::quoteIdentifier(QUI\Bricks\Manager::getTable()),
                [
                    QUI\Utils\Doctrine::quoteIdentifier('project') => $project
                ]
            );
        } catch (\Doctrine\DBAL\Exception $Exception) {
            QUI\System\Log::addError($Exception->getMessage());
        }


        // delete bricks project tables
        // Mainproject_de_bricksCache
        $SchemaManager = QUI::getSchemaManager();
        $tables = $SchemaManager->listTableNames();

        foreach ($tables as $table) {
            if (!str_starts_with($table, $project)) {
                continue;
            }

            if (!str_contains($table, '_bricksCache')) {
                continue;
            }

            $SchemaManager->dropTable($table);
        }
    }

    /**
     * Event: on smarty init
     * add a new {brickarea} function
     *
     * @param Smarty $Smarty
     * @throws SmartyException
     */
    public static function onSmartyInit(Smarty $Smarty): void
    {
        // {brickarea}
        if (
            !isset($Smarty->registered_plugins['function'])
            || !isset($Smarty->registered_plugins['function']['brickarea'])
        ) {
            $Smarty->registerPlugin("function", "brickarea", "\\QUI\\Bricks\\Events::brickarea");
        }
    }

    /**
     * Smarty brickarea function {brickarea}
     *
     * @param array<string, mixed> $params - function parameter
     * @param Smarty_Internal_Template $smarty
     * @return string|array<int, Brick>
     * @throws ExceptionStack
     */
    public static function brickarea(array $params, Smarty_Internal_Template $smarty): array | string
    {
        if (!isset($params['Site']) || !isset($params['area'])) {
            if (!isset($params['assign'])) {
                return '';
            }

            $smarty->assign($params['assign'], []);

            return '';
        }


        $BricksManager = QUI\Bricks\Manager::init();

        if ($BricksManager === null) {
            if (!isset($params['assign'])) {
                return [];
            }

            $smarty->assign($params['assign'], []);
            return '';
        }

        $Site = $params['Site'];
        $area = $params['area'];

        $result = $BricksManager->getBricksByArea($area, $Site);

        if (!isset($params['assign'])) {
            return $result;
        }

        $smarty->assign($params['assign'], $result);

        return '';
    }

    /**
     * @param QUI\Package\Package $Package
     * @throws \Doctrine\DBAL\Exception
     */
    public static function onPackageSetup(QUI\Package\Package $Package): void
    {
        if ($Package->getName() !== 'quiqqer/bricks') {
            return;
        }

        $SchemaManager = QUI::getSchemaManager();
        $bricksTable = Manager::getTable();

        if ($SchemaManager->tablesExist([$bricksTable])) {
            $Table = $SchemaManager->introspectTable($bricksTable);
            $addedColumns = [];

            if (!$Table->hasColumn('active')) {
                $addedColumns[] = new \Doctrine\DBAL\Schema\Column(
                    'active',
                    \Doctrine\DBAL\Types\Type::getType(\Doctrine\DBAL\Types\Types::BOOLEAN),
                    ['notnull' => true, 'default' => 1]
                );
            }

            foreach (['c_date', 'e_date'] as $column) {
                if (!$Table->hasColumn($column)) {
                    $addedColumns[] = new \Doctrine\DBAL\Schema\Column(
                        $column,
                        \Doctrine\DBAL\Types\Type::getType(\Doctrine\DBAL\Types\Types::DATETIME_MUTABLE),
                        ['notnull' => false, 'default' => null]
                    );
                }
            }

            foreach (['c_user', 'e_user'] as $column) {
                if (!$Table->hasColumn($column)) {
                    $addedColumns[] = new \Doctrine\DBAL\Schema\Column(
                        $column,
                        \Doctrine\DBAL\Types\Type::getType(\Doctrine\DBAL\Types\Types::STRING),
                        ['length' => 50, 'notnull' => false, 'default' => null]
                    );
                }
            }

            if ($addedColumns !== []) {
                $SchemaManager->alterTable(new \Doctrine\DBAL\Schema\TableDiff(
                    $Table,
                    addedColumns: $addedColumns
                ));
            }
        }

        QUI\Cache\Manager::clear('quiqqer/backendsearch/providers');
        QUI\Cache\Manager::clear('quiqqer/desktopsearch/filtergroups');

        // unique bricks cache patch
        $projects = QUI::getProjectManager()->getProjectList();

        foreach ($projects as $Project) {
            $projectCacheTable = QUI::getDBProjectTableName(
                Manager::TABLE_CACHE,
                $Project
            );

            if (!$SchemaManager->tablesExist([$projectCacheTable])) {
                // at installation, ignore missing table
                continue;
            }

            try {
                $Table = $SchemaManager->introspectTable($projectCacheTable);
                $PrimaryKey = $Table->getPrimaryKey();

                if ($PrimaryKey !== null) {
                    $SchemaManager->alterTable(new \Doctrine\DBAL\Schema\TableDiff(
                        $Table,
                        droppedIndexes: [$PrimaryKey]
                    ));
                }
            } catch (\Doctrine\DBAL\Exception $Exception) {
                QUI\System\Log::addInfo($Exception->getMessage());
            }
        }
    }

    //region output filter

    /**
     * @param string|null $content
     */
    public static function onOutputParseEnd(string | null &$content): void
    {
        if (!str_contains((string)$content, '{{brick id=')) {
            return;
        }

        // search CSS files
        $content = preg_replace_callback(
            '#{{brick ([^}}]*)}}#',
            ['QUI\Bricks\Events', "outputParsing"],
            (string)$content
        );
    }

    /**
     * @param array<int, string> $match
     * @return string
     */
    public static function outputParsing(array $match): string
    {
        $params = $match[0];
        $params = str_replace('{{brick', '', $params);
        $params = trim($params, '}}');
        $params = trim($params);
        $params = explode(' ', $params);

        $attributes = [];

        foreach ($params as $param) {
            $a = explode('=', $param);

            $attributes[$a[0]] = $a[1];
        }

        if (!isset($attributes['id'])) {
            return $match[0];
        }

        try {
            $brickId = (int)$attributes['id'];
            $Manager = Manager::init();

            if ($Manager === null) {
                return $match[0];
            }

            $Brick = $Manager->getBrickById($brickId);

            return QUI\Output::getInstance()->parse($Brick->create());
        } catch (Exception) {
        }

        return $match[0];
    }

    //endregion
}
