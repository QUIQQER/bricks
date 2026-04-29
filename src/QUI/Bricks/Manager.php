<?php

/**
 * This file contains \QUI\Bricks\Manager
 */

namespace QUI\Bricks;

use DOMElement;
use DOMNameSpaceNode;
use DOMNode;
use DOMXPath;
use Exception;
use QUI;
use QUI\ExceptionStack;
use QUI\Projects\Project;
use QUI\Projects\Site;
use QUI\Utils\Text\XML;

use function array_filter;
use function array_flip;
use function array_intersect;
use function array_map;
use function array_merge;
use function array_reverse;
use function array_unique;
use function array_values;
use function class_exists;
use function count;
use function defined;
use function explode;
use function file_exists;
use function implode;
use function in_array;
use function is_array;
use function is_callable;
use function is_string;
use function json_decode;
use function json_encode;
use function md5;
use function realpath;
use function str_replace;
use function trim;
use function usort;

use const OPT_DIR;

/**
 * Brick Manager
 */
class Manager
{
    /**
     * Bricks table name
     */
    const TABLE = 'bricks';

    /**
     * Bricks uid table name
     */
    const TABLE_UID = 'bricksUID';

    /**
     * Brick Cache table name
     */
    const TABLE_CACHE = 'bricksCache';

    /**
     * Brick temp collector
     *
     * @var array<Brick>
     */
    protected array $bricks = [];

    /**
     * Brick UID temp collector
     *
     * @var array<Brick>
     */
    protected array $brickUIDs = [];

    /**
     * @var null|array<string, int>
     */
    protected ?array $tableColumns = null;

    /**
     * Initialized brick manager
     *
     * @var null|Manager
     */
    public static ?Manager $BrickManager = null;

    /**
     * Return the global QUI\Bricks\Manager
     *
     * @return Manager|null
     */
    public static function init(): ?Manager
    {
        if (self::$BrickManager === null) {
            self::$BrickManager = new Manager(true);
        }

        return self::$BrickManager;
    }

    /**
     * Constructor
     * Please use \QUI\Bricks\Manager::init()
     *
     * @param boolean $init - please use \QUI\Bricks\Manager::init()
     */
    public function __construct(bool $init = false)
    {
        if ($init === false) {
            QUI\System\Log::addWarning('Please use \QUI\Bricks\Manager::init()');
        }
    }

    /**
     * Returns the bricks table name
     *
     * @return String
     */
    public static function getTable(): string
    {
        return QUI::getDBTableName(self::TABLE);
    }

    /**
     * @return string
     */
    public static function getUIDTable(): string
    {
        return QUI::getDBTableName(self::TABLE_UID);
    }

    /**
     * Return the long time cache namespace
     *
     * @return string
     */
    public static function getBrickCacheNamespace(): string
    {
        return 'quiqqer/package/quiqqer/bricks/';
    }

    /**
     * Creates a new brick for the project
     *
     * @param Project $Project
     * @param Brick $Brick
     *
     * @return integer - Brick-ID
     *
     * @throws QUI\Exception
     */
    public function createBrickForProject(Project $Project, Brick $Brick): int
    {
        QUI\Permissions\Permission::checkPermission('quiqqer.bricks.create');

        $insertData = [
            'project' => $Project->getName(),
            'lang' => $Project->getLang(),
            'title' => $Brick->getAttribute('title'),
            'description' => $Brick->getAttribute('description'),
            'type' => $Brick->getAttribute('type'),
            'active' => (int)$Brick->getAttribute('active')
        ];

        $result = QUI::getDataBase()->fetch([
            'from' => $this->getTable(),
            'where' => [
                'title' => $insertData['title'],
                'project' => $insertData['project'],
                'lang' => $insertData['lang']
            ],
            'limit' => 1
        ]);

        if (isset($result[0])) {
            throw new QUI\Exception([
                'quiqqer/bricks',
                'exception.brick.title.already.exists',
                ['brickTitle' => $insertData['title']]
            ]);
        }

        $SessionUser = QUI::getUserBySession();
        $currentDate = date('Y-m-d H:i:s');

        if ($this->hasBrickTableColumn('c_date')) {
            $insertData['c_date'] = $currentDate;
        }

        if ($this->hasBrickTableColumn('e_date')) {
            $insertData['e_date'] = $currentDate;
        }

        if ($this->hasBrickTableColumn('c_user')) {
            $insertData['c_user'] = $SessionUser->getUUID();
        }

        if ($this->hasBrickTableColumn('e_user')) {
            $insertData['e_user'] = $SessionUser->getUUID();
        }

        QUI::getDataBase()->insert($this->getTable(), $insertData);

        $brickId = QUI::getPDO()->lastInsertId();

        try {
            QUI::getEvents()->fireEvent('quiqqerBricksCreate', [$brickId]);
        } catch (Exception $Exception) {
            QUI\System\Log::writeException($Exception);
        }

        return (int)$brickId;
    }

    /**
     * Create and update a unique site brick
     *
     * @param QUI\Interfaces\Projects\Site $Site
     * @param array{brickId?: int, uid?: string, customfields?: mixed} $brickData
     * @return string - Unique ID
     *
     * @throws QUI\Exception
     */
    public function createUniqueSiteBrick(QUI\Interfaces\Projects\Site $Site, array $brickData = []): string
    {
        if (empty($brickData['brickId'])) {
            throw new QUI\Exception('brickId is required to create a unique brick id');
        }

        if (!empty($brickData['uid'])) {
            $uid = $brickData['uid'];

            if ($this->existsUniqueBrickId($uid) === false) {
                $uid = $this->createUniqueBrickId((int)$brickData['brickId'], $Site);
            }
        } else {
            $uid = $this->createUniqueBrickId((int)$brickData['brickId'], $Site);
        }

        $customFields = [];

        if (isset($brickData['customfields'])) {
            $customFields = $brickData['customfields'];
        }

        if (is_array($customFields)) {
            $customFields = json_encode($customFields);
        }

        QUI::getDataBase()->update($this->getUIDTable(), [
            'customfields' => $customFields
        ], [
            'uid' => $uid
        ]);


        return $uid;
    }

    /**
     * Create a new unique Brick ID
     *
     * @param integer $brickId - Brick ID
     * @param QUI\Interfaces\Projects\Site $Site - Current Site
     * @return string
     *
     * @throws QUI\Exception
     */
    protected function createUniqueBrickId(int $brickId, QUI\Interfaces\Projects\Site $Site): string
    {
        $Project = $Site->getProject();
        $uuid = QUI\Utils\Uuid::get();
        $Brick = $this->getBrickById($brickId);

        QUI::getDataBase()->insert($this->getUIDTable(), [
            'uid' => $uuid,
            'brickId' => $brickId,
            'project' => $Project->getName(),
            'lang' => $Project->getLang(),
            'siteId' => $Site->getId(),
            'attributes' => json_encode($Brick->getAttributes())
        ]);

        return $uuid;
    }

    /**
     * Check if an unique brick ID exists
     *
     * @param string $uid - Brick Unique ID
     * @return bool
     */
    public function existsUniqueBrickId(string $uid): bool
    {
        try {
            $result = QUI::getDataBase()->fetch([
                'from' => $this->getUIDTable(),
                'where' => [
                    'uid' => $uid
                ],
                'limit' => 1
            ]);
        } catch (QUI\Database\Exception $Exception) {
            QUI\System\Log::addError($Exception->getMessage());

            return false;
        }

        return isset($result[0]);
    }

    /**
     * Clears the bricks cache
     */
    public function clearCache(): void
    {
        QUI\Cache\Manager::clear('quiqqer/bricks');
    }

    /**
     * Delete the brick
     *
     * @param integer $brickId - Brick-ID
     * @throws QUI\Exception
     */
    public function deleteBrick(int $brickId): void
    {
        QUI\Permissions\Permission::checkPermission('quiqqer.bricks.delete');

        // check if brick exist
        $Brick = $this->getBrickById($brickId);

        QUI::getEvents()->fireEvent('quiqqerBricksBrickDeleteBefore', [$Brick]);

        QUI::getDataBase()->delete($this->getTable(), [
            'id' => $brickId
        ]);

        if (isset($this->bricks[$brickId])) {
            unset($this->bricks[$brickId]);
        }

        $uniqueBrickIds = QUI::getDataBase()->fetch([
            'select' => 'siteId, project, lang',
            'from' => QUI\Bricks\Manager::getUIDTable(),
            'where' => [
                'brickId' => $brickId,
                'project' => $Brick->getAttribute('project'),
                'lang' => $Brick->getAttribute('lang')
            ],
            'group' => 'siteId, project, lang'
        ]);

        // delete bricks in sites
        foreach ($uniqueBrickIds as $uniqueBrickId) {
            $project = $uniqueBrickId['project'];
            $lang = $uniqueBrickId['lang'];

            $Project = QUI::getProject($project, $lang);
            $Site = $Project->get($uniqueBrickId['siteId']);
            $Edit = $Site->getEdit();

            if ($Edit) {
                $Edit->load();
                $Edit->save(QUI::getUsers()->getSystemUser());
            }
        }

        // delete unique ids
        QUI::getDataBase()->delete(QUI\Bricks\Manager::getUIDTable(), [
            'brickId' => $brickId,
            'project' => $Brick->getAttribute('project'),
            'lang' => $Brick->getAttribute('lang')
        ]);

        QUI::getEvents()->fireEvent('quiqqerBricksBrickDeleteAfter', [$brickId]);
    }

    /**
     * Return the areas which are available in the project
     *
     * @param Project $Project
     * @param boolean|string $layoutType - optional, returns only the areas
     *                                     for the specific layout type
     *                                     (default = false)
     * @param boolean|string $siteType - optional, returns only the areas
     *                                     for the specific site type
     *                                     (default = false)
     * @return array<int, array<string, mixed>>
     */
    public function getAreasByProject(
        Project $Project,
        bool | string $layoutType = false,
        bool | string $siteType = false
    ): array {
        $templates = [];
        $bricks = [];

        $projectName = $Project->getName();

        $projectTemplate = $Project->getAttribute('template');
        if (is_string($projectTemplate) && $projectTemplate !== '') {
            $templates[] = $projectTemplate;
        }

        // inheritance
        try {
            if (!is_string($projectTemplate) || $projectTemplate === '') {
                throw new QUI\Exception('Invalid project template');
            }

            $Package = QUI::getPackage($projectTemplate);
            $Parent = $Package->getTemplateParent();

            if ($Parent) {
                $templates[] = $Parent->getName();
            }
        } catch (QUI\Exception) {
        }

        // get all vhosts, and the used templates of the project
        $vhosts = QUI::getRewrite()->getVHosts();

        foreach ($vhosts as $vhost) {
            if (!isset($vhost['template'])) {
                continue;
            }

            if ($vhost['project'] != $projectName) {
                continue;
            }

            $templates[] = $vhost['template'];
        }

        $templates = array_unique($templates);

        // get bricks
        foreach ($templates as $template) {
            $brickXML = realpath(OPT_DIR . $template . '/bricks.xml');

            if (!$brickXML) {
                continue;
            }

            $bricks = array_merge(
                $bricks,
                Utils::getTemplateAreasFromXML($brickXML, $layoutType, $siteType)
            );
        }


        // unique values
        $cleaned = [];

        foreach ($bricks as $val) {
            if (!isset($cleaned[$val['name']])) {
                $cleaned[$val['name']] = $val;
            }
        }

        $bricks = array_values($cleaned);

        // use @ because: https://bugs.php.net/bug.php?id=50688
        @usort($bricks, function ($a, $b) {
            if (isset($a['priority']) && isset($b['priority'])) {
                if ($a['priority'] == $b['priority']) {
                    return 0;
                }

                return ($a['priority'] < $b['priority']) ? -1 : 1;
            }

            $transA = QUI::getLocale()->get(
                $a['title']['group'],
                $a['title']['var']
            );

            $transB = QUI::getLocale()->get(
                $b['title']['group'],
                $b['title']['var']
            );

            return $transA > $transB ? 1 : -1;
        });

        try {
            QUI::getEvents()->fireEvent(
                'onBricksGetAreaByProject',
                [$this, $Project, &$bricks]
            );
        } catch (QUI\Exception $Exception) {
            QUI\System\Log::writeException($Exception);
        }

        return $bricks;
    }

    /**
     * Returns the available bricks
     *
     * @return array<int, array<string, mixed>>
     */
    public function getAvailableBricks(): array
    {
        $cache = 'quiqqer/bricks/availableBricks';

        try {
            return QUI\Cache\Manager::get($cache);
        } catch (QUI\Exception) {
        }

        $xmlFiles = $this->getBricksXMLFiles();
        $result = [];

        $result[] = [
            'title' => ['quiqqer/bricks', 'brick.content.title'],
            'description' => [
                'quiqqer/bricks',
                'brick.content.description'
            ],
            'control' => 'content'
        ];

        foreach ($xmlFiles as $bricksXML) {
            $result = array_merge($result, Utils::getBricksFromXML($bricksXML));
        }

        $result = array_filter($result, function ($brick) {
            return !empty($brick['title']);
        });

        // js workaround
        $list = [];

        foreach ($result as $entry) {
            $list[] = $entry;
        }

        try {
            QUI\Cache\Manager::set($cache, $list);
        } catch (Exception $Exception) {
            QUI\System\Log::writeException($Exception);
        }

        return $list;
    }

    /**
     * Get a Brick by its Brick-ID
     *
     * @param integer $id
     *
     * @return Brick
     * @throws QUI\Exception
     */
    public function getBrickById(int $id): Brick
    {
        if (isset($this->bricks[$id])) {
            return $this->bricks[$id];
        }

        $data = QUI::getDataBase()->fetch([
            'from' => $this->getTable(),
            'where' => [
                'id' => $id
            ],
            'limit' => 1
        ]);

        if (!isset($data[0])) {
            throw new QUI\Exception('Brick not found');
        }

        $Brick = new Brick($data[0]);
        $Brick->setAttribute('id', $id);

        $this->bricks[$id] = $Brick;

        return $this->bricks[$id];
    }

    /**
     * Get a Brick by its unique ID
     *
     * @param string $uid - unique id
     * @param QUI\Interfaces\Projects\Site|null $Site - unique id
     *
     * @return Brick
     * @throws QUI\Exception
     */
    public function getBrickByUID(string $uid, null | QUI\Interfaces\Projects\Site $Site = null): Brick
    {
        if (isset($this->brickUIDs[$uid])) {
            return $this->brickUIDs[$uid];
        }

        $data = QUI::getDataBase()->fetch([
            'from' => $this->getUIDTable(),
            'where' => [
                'uid' => $uid
            ],
            'limit' => 1
        ]);

        if (!isset($data[0])) {
            throw new QUI\Exception('Brick not found');
        }

        $data = $data[0];
        $brickId = $data['brickId'];
        $custom = $data['customfields'];

        $attributes = $data['attributes'];
        $attributes = json_decode($attributes, true);

        $real = QUI::getDataBase()->fetch([
            'from' => $this->getTable(),
            'where' => [
                'id' => (int)$brickId
            ],
            'limit' => 1
        ]);

        $real[0]['Site'] = $Site;

        $Original = new Brick($real[0]);
        $Original->setAttribute('id', $brickId);

        $Clone = clone $Original;

        if (!empty($custom)) {
            $custom = json_decode($custom, true);

            if ($custom) {
                $Clone->setSettings($custom);
            }

            // workaround
            if (isset($custom['brickTitle'])) {
                $Clone->setAttribute('frontendTitle', $custom['brickTitle']);
            }
        }

        $this->brickUIDs[$uid] = $Clone;

        return $Clone;
    }

    /**
     * Return the available brick settings by the brick type
     *
     * @param string $brickType
     * @return array<int, array<string, mixed>>
     */
    public function getAvailableBrickSettingsByBrickType(string $brickType): array
    {
        $cache = 'quiqqer/bricks/brickType/' . md5($brickType);

        try {
            return QUI\Cache\Manager::get($cache);
        } catch (QUI\Exception) {
        }


        $settings = [];

        $settings[] = [
            'name' => 'width',
            'text' => ['quiqqer/bricks', 'site.area.window.settings.setting.width'],
            'type' => '',
            'class' => '',
            'data-qui' => '',
            'options' => false
        ];

        $settings[] = [
            'name' => 'height',
            'text' => ['quiqqer/bricks', 'site.area.window.settings.setting.height'],
            'type' => '',
            'class' => '',
            'data-qui' => '',
            'options' => false
        ];

        $settings[] = [
            'name' => 'classes',
            'text' => ['quiqqer/bricks', 'site.area.window.settings.setting.classes'],
            'type' => '',
            'class' => '',
            'data-qui' => '',
            'options' => false
        ];

        $xmlFiles = $this->getBricksXMLFiles();

        foreach ($xmlFiles as $brickXML) {
            $Dom = XML::getDomFromXml($brickXML);
            $Path = new DOMXPath($Dom);

            $Settings = $Path->query(
                "//quiqqer/bricks/brick[@control='$brickType']/settings/setting"
            );

            $Globals = $Path->query(
                "//quiqqer/bricks/brick[@control='*']/settings/setting"
            );

            if ($Globals) {
                foreach ($Globals as $Setting) {
                    $settings[] = $this->parseSettingToBrickArray($Setting);
                }
            }

            if ($Settings) {
                foreach ($Settings as $Setting) {
                    $settings[] = $this->parseSettingToBrickArray($Setting);
                }
            }
        }

        // cleanup duplicated
        // quiqqer/package-bricks#90
        $exists = [];

        $settings = array_filter($settings, function ($entry) use (&$exists) {
            $name = $entry['name'];

            if (isset($exists[$name])) {
                return false;
            }

            $exists[$name] = true;

            return true;
        });

        $settings = array_values($settings);

        try {
            QUI\Cache\Manager::set($cache, $settings);
        } catch (Exception $Exception) {
            QUI\System\Log::writeException($Exception);
        }

        return $settings;
    }

    /**
     * Parse an XML setting element to a brick array
     *
     * @param DOMNode|DOMElement $Setting
     * @return array<string, mixed>
     */
    protected function parseSettingToBrickArray(DOMNode | DOMElement | DOMNameSpaceNode $Setting): array
    {
        $options = null;

        if (
            method_exists($Setting, 'getAttribute')
            && method_exists($Setting, 'getElementsByTagName')
            && $Setting->getAttribute('type') == 'select'
        ) {
            $optionElements = $Setting->getElementsByTagName('option');

            foreach ($optionElements as $Option) {
                $options[] = [
                    'value' => $Option->getAttribute('value'),
                    'text' => QUI\Utils\DOM::getTextFromNode($Option, false)
                ];
            }
        }

        $dataAttributes = [];
        $description = '';

        if ($Setting instanceof DOMElement) {
            foreach ($Setting->attributes as $attribute) {
                if ($attribute->nodeName === 'data-qui') {
                    continue;
                }

                if (str_contains($attribute->nodeName, 'data-')) {
                    $dataAttributes[$attribute->nodeName] = trim($attribute->nodeValue ?? '');
                }
            }
        }

        if (method_exists($Setting, 'getElementsByTagName')) {
            $Description = $Setting->getElementsByTagName('description');

            if ($Description->length) {
                $description = QUI\Utils\DOM::getTextFromNode($Description->item(0), false);
            }
        }

        return [
            'name' => method_exists($Setting, 'getAttribute') ? $Setting->getAttribute('name') : '',
            'text' => $Setting instanceof DOMNode
                ? QUI\Utils\DOM::getTextFromNode($Setting, false)
                : '',
            'description' => $description,
            'type' => method_exists($Setting, 'getAttribute') ? $Setting->getAttribute('type') : '',
            'class' => method_exists($Setting, 'getAttribute') ? $Setting->getAttribute('class') : '',
            'data-qui' => method_exists($Setting, 'getAttribute') ? $Setting->getAttribute('data-qui') : '',
            'options' => $options,
            'data-attributes' => $dataAttributes
        ];
    }

    /**
     * @param array<string, mixed>|string $customFields
     * @return string
     */
    protected function getBrickVisibilityMode(array | string $customFields): string
    {
        if (is_string($customFields)) {
            $customFields = json_decode($customFields, true);
        }

        if (!is_array($customFields)) {
            return 'always';
        }

        if (!isset($customFields['visibility'])) {
            return 'always';
        }

        return match ($customFields['visibility']) {
            'guest', 'authenticated', 'groups' => $customFields['visibility'],
            default => 'always'
        };
    }

    /**
     * @param array<string, mixed>|string $customFields
     * @return array<int, string>
     */
    protected function getBrickVisibilityGroupIds(array | string $customFields): array
    {
        if (is_string($customFields)) {
            $customFields = json_decode($customFields, true);
        }

        if (!is_array($customFields) || empty($customFields['visibilityGroups'])) {
            return [];
        }

        if (is_array($customFields['visibilityGroups'])) {
            return array_values(array_filter($customFields['visibilityGroups']));
        }

        if (!is_string($customFields['visibilityGroups'])) {
            return [];
        }

        return array_values(array_filter(explode(',', $customFields['visibilityGroups'])));
    }

    /**
     * @return \QUI\Interfaces\Users\User
     */
    protected function getSessionUser(): \QUI\Interfaces\Users\User
    {
        return QUI::getUserBySession();
    }

    /**
     * @param array<string, mixed>|string $customFields
     * @param bool $isAuthenticated
     * @return bool
     */
    protected function isBrickVisibleForUserStatus(
        array | string $customFields,
        bool $isAuthenticated
    ): bool {
        $visibilityMode = $this->getBrickVisibilityMode($customFields);
        $SessionUser = $this->getSessionUser();

        // Check if user is guest. quiqqer/order-guestorder provides a guest-like user
        $isGuestLikeUser = $SessionUser instanceof \QUI\Users\Nobody
            && !($SessionUser instanceof \QUI\Users\SystemUser);

        if ($visibilityMode === 'guest') {
            return !$isAuthenticated || $isGuestLikeUser;
        }

        if ($visibilityMode === 'authenticated') {
            return $isAuthenticated && !$isGuestLikeUser;
        }

        if ($visibilityMode === 'groups') {
            return $this->isBrickVisibleForGroups(
                $customFields,
                $SessionUser->getGroups(false)
            );
        }

        return true;
    }

    /**
     * @param array<string, mixed>|string $customFields
     * @param array<int, string|int> $userGroupIds
     * @return bool
     */
    protected function isBrickVisibleForGroups(
        array | string $customFields,
        array $userGroupIds
    ): bool {
        $visibilityGroupIds = $this->getBrickVisibilityGroupIds($customFields);

        if (empty($visibilityGroupIds)) {
            return false;
        }

        return !empty(array_intersect($visibilityGroupIds, $userGroupIds));
    }

    /**
     * Return the bricks from the area
     *
     * @param string $brickArea - Name of the area
     * @param QUI\Interfaces\Projects\Site $Site
     *
     * @return array<int, Brick>
     * @throws ExceptionStack
     */
    public function getBricksByArea(
        string $brickArea,
        QUI\Interfaces\Projects\Site $Site
    ): array {
        if (empty($brickArea)) {
            return [];
        }

        $brickAreas = $Site->getAttribute('quiqqer.bricks.areas');

        if (!is_array($brickAreas)) {
            $brickAreas = json_decode($brickAreas, true);
        }

        if (empty($brickAreas[$brickArea])) {
            $bricks = $this->getInheritedBricks($brickArea, $Site);
        } else {
            $bricks = [];
            $brickData = $brickAreas[$brickArea];

            foreach ($brickData as $brick) {
                if (isset($brick['deactivate'])) {
                    break;
                }

                $bricks[] = $brick;
            }
        }


        $result = [];

        QUI::getEvents()->fireEvent(
            'onQuiqqerBricksGetBricksByAreaBegin',
            [$brickArea, $Site, &$result]
        );

        foreach ($bricks as $brickData) {
            $brickId = (int)$brickData['brickId'];
            $visibilityMode = 'always';

            if (isset($brickData['customfields'])) {
                $visibilityMode = $this->getBrickVisibilityMode($brickData['customfields']);

                if (
                    !$this->isBrickVisibleForUserStatus(
                        $brickData['customfields'],
                        QUI::getUsers()->isAuth(QUI::getUserBySession())
                    )
                ) {
                    continue;
                }
            }

            try {
                if (!empty($brickData['uid'])) {
                    $Brick = $this->getBrickByUID($brickData['uid'], $Site);

                    if (!(int)$Brick->getAttribute('active')) {
                        continue;
                    }

                    if ($visibilityMode !== 'always') {
                        $Brick->setAttribute('cacheable', 0);
                    }

                    $result[] = $Brick->check();
                    continue;
                }
            } catch (QUI\Exception) {
            }

            try {
                if (!$brickId) {
                    continue;
                }

                // fallback
                $Brick = $this->getBrickById($brickId);

                if (!(int)$Brick->getAttribute('active')) {
                    continue;
                }

                $Clone = clone $Brick;

                if (!empty($brickData['customfields'])) {
                    $custom = json_decode($brickData['customfields'], true);

                    if ($custom) {
                        $Clone->setSettings($custom);
                    }
                }

                if ($visibilityMode !== 'always') {
                    $Clone->setAttribute('cacheable', 0);
                }

                $result[] = $Clone->check();
            } catch (QUI\Exception $Exception) {
                QUI\System\Log::writeRecursive($brickData);
                QUI\System\Log::writeException($Exception);
            }
        }

        QUI::getEvents()->fireEvent(
            'onQuiqqerBricksGetBricksByAreaEnd',
            [$brickArea, $Site, &$result]
        );

        return $result;
    }

    /**
     * Return a list with \QUI\Bricks\Brick which are assigned to a project
     *
     * @param Project $Project
     * @return array<int, Brick>
     *
     * @throws QUI\Exception
     */
    public function getBricksFromProject(Project $Project): array
    {
        $result = [];

        $list = QUI::getDataBase()->fetch([
            'from' => $this->getTable(),
            'where' => [
                'project' => $Project->getName(),
                'lang' => $Project->getLang()
            ]
        ]);

        foreach ($list as $entry) {
            $result[] = $this->getBrickById($entry['id']);
        }

        return $result;
    }

    /**
     * Check whether a title already exists in a project
     *
     * @param Project $Project
     * @param string $title
     * @return bool
     */
    public function titleExists(Project $Project, string $title): bool
    {
        $title = trim($title);

        if ($title === '') {
            return false;
        }

        $result = QUI::getDataBase()->fetch([
            'select' => ['id'],
            'from' => $this->getTable(),
            'where' => [
                'title' => $title,
                'project' => $Project->getName(),
                'lang' => $Project->getLang()
            ],
            'limit' => 1
        ]);

        return isset($result[0]);
    }


    /**
     * Return a list with \QUI\Bricks\Brick which are assigned to a project
     *
     * @param Brick $Brick
     * @return Site\Edit[]|Site[]
     */
    public function getSitesByBrick(Brick $Brick): array
    {
        try {
            $list = QUI::getDataBase()->fetch([
                'select' => ['brickId', 'project', 'lang', 'siteId'],
                'from' => $this->getUIDTable(),
                'where' => [
                    'project' => $Brick->getAttribute('project'),
                    'lang' => $Brick->getAttribute('lang'),
                    'brickId' => $Brick->getAttribute('id')
                ]
            ]);

            $Project = QUI::getProject(
                $Brick->getAttribute('project'),
                $Brick->getAttribute('lang')
            );
        } catch (QUI\Exception $Exception) {
            QUI\System\Log::addError($Exception->getMessage());

            return [];
        }

        $result = [];

        foreach ($list as $entry) {
            try {
                $result[] = $Project->get($entry['siteId']);
            } catch (QUI\Exception $Exception) {
                QUI\System\Log::writeDebugException($Exception);
                continue;
            }
        }

        return $result;
    }

    /**
     * @param integer|string $brickId - Brick-ID
     * @param array<string, mixed> $brickData - Brick data
     * @throws QUI\Exception
     */
    public function saveBrick(int | string $brickId, array $brickData): void
    {
        QUI\Permissions\Permission::checkPermission('quiqqer.bricks.edit');

        QUI::getEvents()->fireEvent('quiqqerBricksSaveBefore', [$brickId]);

        $Brick = $this->getBrickById((int)$brickId);
        $areas = [];
        $areaString = '';

        if (isset($brickData['id'])) {
            unset($brickData['id']);
        }

        // check areas
        $Project = QUI::getProjectManager()->getProject(
            $Brick->getAttribute('project')
        );

        $availableAreas = array_map(function ($data) {
            if (isset($data['name'])) {
                return $data['name'];
            }

            return '';
        }, $this->getAreasByProject($Project));

        if (isset($brickData['attributes']['areas'])) {
            $brickData['areas'] = $brickData['attributes']['areas'];
        }

        if (isset($brickData['areas'])) {
            $parts = explode(',', $brickData['areas']);

            foreach ($parts as $area) {
                if (defined('QUIQQER_BRICKS_IGNORE_AREA_CHECK')) {
                    $areas[] = $area;
                    continue;
                }

                if (in_array($area, $availableAreas)) {
                    $areas[] = $area;
                }
            }
        }

        if (!empty($areas)) {
            $areaString = ',' . implode(',', $areas) . ',';
        }

        $Brick->setAttributes($brickData);

        // fields
        if (isset($brickData['attributes']) && is_array($brickData['attributes'])) {
            foreach ($brickData['attributes'] as $key => $value) {
                if ($key == 'areas') {
                    continue;
                }

                $Brick->setAttribute($key, $value);
            }
        }

        // brick settings
        if (isset($brickData['settings'])) {
            $Brick->setSettings($brickData['settings']);
        }

        $brickAttributes = Utils::getAttributesForBrick($Brick);

        foreach ($brickAttributes as $attribute) {
            if (isset($brickData['attributes'][$attribute])) {
                $Brick->setSetting($attribute, $brickData['attributes'][$attribute]);
            }
        }

        // custom fields
        $customFields = [];

        if (isset($brickData['customfields']) && is_array($brickData['customfields'])) {
            $availableSettings = $Brick->getSettings();
            $availableSettings['width'] = true;
            $availableSettings['height'] = true;

            foreach ($brickData['customfields'] as $customField) {
                $customField = str_replace('flexible-', '', $customField);

                if ($customField == 'classes') {
                    $customFields[] = $customField;
                    continue;
                }

                if (isset($availableSettings[$customField])) {
                    $customFields[] = $customField;
                }
            }
        }

        $type = $Brick->getAttribute('type');

        $checkType = function ($type) {
            if ($type === 'content') {
                return true;
            }

            if (is_callable($type)) {
                return true;
            }

            if (class_exists($type)) {
                return true;
            }

            QUI\System\Log::addError(
                QUI::getLocale()->get('quiqqer/bricks', 'exception.type.is.not.allowed'),
                ['type' => $type]
            );

            throw new QUI\Exception([
                'quiqqer/bricks',
                'exception.type.is.not.allowed'
            ]);
        };

        $checkType($type);

        // check duplicated titles
        $result = QUI::getDataBase()->fetch([
            'from' => $this->getTable(),
            'where' => [
                'title' => $Brick->getAttribute('title'),
                'project' => $Brick->getAttribute('project'),
                'lang' => $Brick->getAttribute('lang'),
                'id' => [
                    'type' => 'NOT',
                    'value' => (int)$brickId
                ]
            ],
            'limit' => 1
        ]);

        if (isset($result[0])) {
            throw new QUI\Exception([
                'quiqqer/bricks',
                'exception.brick.title.already.exists',
                ['brickTitle' => $Brick->getAttribute('title')]
            ]);
        }


        // update
        $updateData = [
            'title' => $Brick->getAttribute('title'),
            'active' => (int)$Brick->getAttribute('active'),
            'frontendTitle' => $Brick->getAttribute('frontendTitle'),
            'description' => $Brick->getAttribute('description'),
            'content' => $Brick->getAttribute('content'),
            'type' => $type,
            'settings' => json_encode($Brick->getSettings()),
            'customfields' => json_encode($customFields),
            'areas' => $areaString,
            'height' => $Brick->getAttribute('height'),
            'width' => $Brick->getAttribute('width'),
            'classes' => json_encode($Brick->getCSSClasses())
        ];

        $SessionUser = QUI::getUserBySession();

        if ($this->hasBrickTableColumn('e_date')) {
            $updateData['e_date'] = date('Y-m-d H:i:s');
        }

        if ($this->hasBrickTableColumn('e_user')) {
            $updateData['e_user'] = $SessionUser->getUUID();
        }

        QUI::getDataBase()->update($this->getTable(), $updateData, [
            'id' => (int)$brickId
        ]);

        // refresh all bricks with this id
        $uniqueBricks = QUI::getDataBase()->fetch([
            'from' => QUI\Bricks\Manager::getUIDTable(),
            'where' => [
                'project' => $Project->getName(),
                'lang' => $Project->getLang(),
                'brickId' => (int)$brickId
            ]
        ]);

        foreach ($uniqueBricks as $uniqueBrick) {
            $customFieldsUniqueBrick = json_decode($uniqueBrick['customfields'], true);
            $attributes = $Brick->getAttributes();

            if (isset($attributes['attributes'])) {
                unset($attributes['attributes']);
            }

            if (!is_array($customFieldsUniqueBrick)) {
                $customFieldsUniqueBrick = [];
            }

            QUI::getDataBase()->update(QUI\Bricks\Manager::getUIDTable(), [
                'customfields' => json_encode($customFieldsUniqueBrick),
                'attributes' => json_encode($attributes)
            ], [
                'uid' => $uniqueBrick['uid']
            ]);
        }

        // clear project cache
        $cache = Project::getProjectLanguageCachePath(
            $Project->getName(),
            $Project->getLang()
        );

        QUI\Cache\Manager::clear($cache);

        QUI\Cache\Manager::clear(
            self::getBrickCacheNamespace() . md5($Brick->getType())
        );

        QUI::getEvents()->fireEvent('quiqqerBricksSave', [$brickId]);

        if (isset($this->bricks[$brickId])) {
            unset($this->bricks[$brickId]);
        }

        if (isset($this->brickUIDs[$brickId])) {
            unset($this->brickUIDs[$brickId]);
        }
    }

    /**
     * @return array<string, int>
     */
    protected function getBrickTableColumns(): array
    {
        if ($this->tableColumns !== null) {
            return $this->tableColumns;
        }

        $tableManager = QUI::getDataBase()->table();

        if ($tableManager === null) {
            $this->tableColumns = [];
            return $this->tableColumns;
        }

        $this->tableColumns = array_flip(
            $tableManager->getColumns($this->getTable())
        );

        return $this->tableColumns;
    }

    protected function hasBrickTableColumn(string $column): bool
    {
        $columns = $this->getBrickTableColumns();

        return isset($columns[$column]);
    }

    /**
     * Copy a brick
     *
     * @param integer|string $brickId
     * @param array<string, mixed> $params - project, lang, title, description
     * @return integer
     *
     * @throws QUI\Exception
     */
    public function copyBrick(int | string $brickId, array $params = []): int
    {
        QUI\Permissions\Permission::checkPermission('quiqqer.bricks.create');

        $result = QUI::getDataBase()->fetch([
            'from' => $this->getTable(),
            'where' => [
                'id' => $brickId
            ]
        ]);

        if (!isset($result[0])) {
            throw new QUI\Exception('Brick not found');
        }

        $allowed = ['project', 'lang', 'title', 'description'];
        $allowed = array_flip($allowed);
        $data = $result[0];

        unset($data['id']);

        foreach ($params as $param => $value) {
            if (!isset($allowed[$param])) {
                continue;
            }

            $data[$param] = $value;
        }

        QUI::getDataBase()->insert($this->getTable(), $data);

        return (int)QUI::getPDO()->lastInsertId();
    }

    /**
     * List of available bricks.xml files
     *
     * @return array<string>
     */
    protected function getBricksXMLFiles(): array
    {
        return Utils::getBricksXMLFiles();
    }

    /**
     * Return the bricks from an area which are inherited from its parents
     *
     * @param string $brickArea - Name of the area
     * @param QUI\Interfaces\Projects\Site $Site - Site object
     *
     * @return array<int, Brick>
     */
    protected function getInheritedBricks(
        string $brickArea,
        QUI\Interfaces\Projects\Site $Site
    ): array {
        // inheritance ( vererbung )
        $Project = $Site->getProject();
        $areas = $this->getAreasByProject($Project);


        foreach ($areas as $area) {
            if ($area['name'] != $brickArea) {
                continue;
            }

            if (!$area['inheritance']) {
                return [];
            }

            break;
        }

        if (!isset($area) || !isset($area['name'])) {
            return [];
        }

        if ($area['name'] != $brickArea) {
            return [];
        }

        if (!Utils::hasInheritance($Project, $brickArea)) {
            return [];
        }


        $result = [];
        $parentIds = $Site->getParentIdTree();
        $parentIds = array_reverse($parentIds);

        $projectCacheTable = QUI::getDBProjectTableName(
            self::TABLE_CACHE,
            $Project
        );

        foreach ($parentIds as $parentId) {
            try {
                $bricks = QUI::getDataBase()->fetch([
                    'from' => $projectCacheTable,
                    'where' => [
                        'id' => $parentId,
                        'area' => $brickArea
                    ]
                ]);
            } catch (QUI\Database\Exception $Exception) {
                QUI\System\Log::addError($Exception->getMessage());
                continue;
            }

            if (empty($bricks)) {
                continue;
            }

            try {
                $Parent = $Project->get($parentId);
            } catch (QUI\Exception) {
                continue;
            }

            $parentAreas = $Parent->getAttribute('quiqqer.bricks.areas');
            $parentAreas = json_decode($parentAreas, true);


            if (!isset($parentAreas[$brickArea])) {
                continue;
            }


            $brickIds = [];
            $area = $parentAreas[$brickArea];

            foreach ($bricks as $brick) {
                $brickIds[$brick['brick']] = true;
            }

            foreach ($area as $brick) {
                if (!isset($brick['customfields'])) {
                    continue;
                }

                $customFields = json_decode($brick['customfields'], true);

                if (
                    $customFields
                    && isset($customFields['inheritance'])
                    && $customFields['inheritance'] === false
                ) {
                    continue;
                }

                if (
                    isset($brick['brickId'])
                    && isset($brickIds[$brick['brickId']])
                ) {
                    $result[] = $brick;
                }
            }

            if (empty($result)) {
                continue;
            }

            break;
        }

        return $result;
    }

    /**
     * @param string $control
     * @param bool|string $template - optional, name of the current template
     * @return string
     */
    public function getAlternateClass(string $control, bool | string $template = false): string
    {
        $control = trim($control, '\\ ');

        try {
            $alternates = QUI\Cache\Manager::get('quiqqer/bricks/alternates');
        } catch (QUI\Exception) {
            $alternates = [];

            $PKM = QUI::getPackageManager();
            $packages = $PKM->getInstalled();

            // package bricks
            foreach ($packages as $package) {
                $packageName = $package['name'];
                $bricksXML = OPT_DIR . $packageName . '/bricks.xml';

                if (!file_exists($bricksXML)) {
                    continue;
                }

                $Dom = XML::getDomFromXml($bricksXML);
                $Path = new DOMXPath($Dom);

                $list = $Path->query('//quiqqer/bricks/overwrite/brick');

                if (!$list) {
                    $list = [];
                }

                foreach ($list as $Overwrite) {
                    if (!method_exists($Overwrite, 'getAttribute')) {
                        continue;
                    }

                    $src = $Overwrite->getAttribute('parent');
                    $alt = $Overwrite->getAttribute('alternate');

                    $alternates[] = [
                        'package' => $packageName,
                        'parent' => trim($src, '\\ '),
                        'alternate' => trim($alt, '\\ ')
                    ];
                }
            }
        }

        $result = array_filter($alternates, function ($entry) use ($control, $template) {
            if ($control !== $entry['parent']) {
                return false;
            }

            if (!$template) {
                return true;
            }

            return $template === $entry['package'];
        });

        if (count($result)) {
            return $result[0]['alternate'];
        }

        return $control;
    }
}
