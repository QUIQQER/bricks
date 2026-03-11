<?php

/**
 * This file contains \QUI\Bricks\Brick
 */

namespace QUI\Bricks;

use Exception;
use QUI;
use QUI\Control;

use function array_filter;
use function array_flip;
use function array_merge;
use function array_unique;
use function array_values;
use function class_exists;
use function dirname;
use function explode;
use function fnmatch;
use function get_class;
use function implode;
use function is_array;
use function is_callable;
use function is_object;
use function is_string;
use function json_decode;
use function md5;
use function serialize;
use function trim;

/**
 * Class Brick
 * A Brick from the Brick-Manager
 */
class Brick extends QUI\QDOM
{
    /**
     * internal brick id
     *
     * @var int|bool
     */
    protected int | bool $id = false;

    /**
     * internal unique ID
     * This ID is unique for the complete system
     */
    protected mixed $uniqueId = false;

    /**
     * Brick settings
     *
     * @var array<string, mixed>
     */
    protected array $settings = [];

    /**
     * Fields can be overwritten by another user
     *
     * @var array<string, mixed>
     */
    protected array $customfields = [];

    /**
     * Internal control
     *
     * @var null|Control
     */
    protected ?Control $Control = null;

    /**
     * List of extra CSS classes
     *
     * @var array<string>
     */
    protected array $cssClasses = [];

    /**
     * @var string
     */
    protected string $hash;

    /**
     * Constructor
     *
     * @param array<string, mixed> $params - brick params
     * @throws QUI\Exception
     */
    public function __construct(array $params = [])
    {
        // default
        $default = [
            'type' => 'content',
            'content' => '',
            'title' => '',
            'description' => '',
            'active' => 1,
            'project' => '',
            'lang' => '',
            'areas' => '',
            'height' => '',
            'width' => '',
            'classes' => '',
            'frontendTitle' => '',
            'hasContent' => 1,
            'recommended' => 0,
            'cacheable' => 1, // if the brick is cacheable or not
            'deprecated' => 0
        ];

        $this->setAttributes($default);

        foreach ($default as $key => $value) {
            if (isset($params[$key])) {
                $this->setAttribute($key, $params[$key]);
            }
        }

        if (isset($params['id'])) {
            $this->id = (int)$params['id'];
        }

        if (isset($params['uniqueId'])) {
            $this->uniqueId = $params['uniqueId'];
        }

        if (isset($params['classes'])) {
            $cssClasses = json_decode($params['classes'], true);

            if (!$cssClasses) {
                $cssClasses = [];
            }

            foreach ($cssClasses as $cssClass) {
                $this->addCSSClass($cssClass);
            }

            unset($params['classes']);
        }

        // default settings from control
        if (isset($params['Site'])) {
            $this->setAttribute('Site', $params['Site']);
        }

        $Control = $this->getControl();
        $Manager = Manager::init();

        $availableSettings = $Manager?->getAvailableBrickSettingsByBrickType(
            (string)$this->getAttribute('type')
        ) ?? [];

        foreach ($availableSettings as $entry) {
            $this->settings[$entry['name']] = false;
        }

        $availableAttributes = Utils::getAttributesForBrick($this);

        foreach ($availableAttributes as $attribute) {
            $this->settings[$attribute] = false;
        }

        $this->settings['customCSS'] = '';
        $this->settings['customJS'] = '';
        $this->settings['footer'] = '';

        // control default settings
        if (is_object($Control)) {
            $controlSettings = $Control->getAttributes();

            foreach ($this->settings as $key => $value) {
                if (isset($controlSettings[$key])) {
                    $this->settings[$key] = $controlSettings[$key];
                }
            }
        }

        // settings from database
        if (isset($params['settings'])) {
            $settings = $params['settings'];

            if (is_string($settings)) {
                $settings = json_decode($settings, true);
            }

            if (is_array($settings)) {
                foreach ($this->settings as $key => $value) {
                    if (isset($settings[$key])) {
                        $this->settings[$key] = $settings[$key];
                    }
                }
            }
        }

        // customfields
        if (isset($params['customfields'])) {
            $customfields = $params['customfields'];

            if (is_string($customfields)) {
                $customfields = json_decode($customfields, true);
            }

            if (is_array($customfields)) {
                $this->customfields = $customfields;
            }
        }

        // deprecated
        $BricksManager = QUI\Bricks\Manager::init();
        $type = $this->getAttribute('type');

        $brickList = $BricksManager?->getAvailableBricks() ?? [];
        $brick = array_filter($brickList, function ($brick) use ($type) {
            if (!isset($brick['control'])) {
                return false;
            }

            return $brick['control'] === $type;
        });

        if ($brick) {
            $brick = array_values($brick)[0];

            if (!empty($brick['deprecated'])) {
                $this->setAttribute('deprecated', 1);
            }
        }

        $this->hash = $this->createBrickHash();
    }

    /**
     * Return the class type
     *
     * @return String
     * @throws QUI\Exception
     */
    public function getType(): string
    {
        $Control = $this->getControl();

        if (is_object($Control)) {
            return get_class($Control);
        }

        return get_class($this);
    }

    /**
     * Checks if the internal control is of this class or has this class as one of its parents
     *
     * @param string $className
     * @return bool
     * @throws QUI\Exception
     */
    public function isInstanceOf(string $className): bool
    {
        $Control = $this->getControl();

        if (is_object($Control)) {
            return $Control instanceof $className;
        }

        return $this instanceof $className;
    }

    /**
     * Check if control can be created
     *
     * @return QUI\Bricks\Brick
     * @throws QUI\Exception
     */
    public function check(): Brick
    {
        if ($this->getAttribute('type') == 'content') {
            return $this;
        }

        $Control = $this->getControl();

        if (!$Control) {
            throw new QUI\Exception(
                'Control not found. Brick could not be created. Maybe wrong type ' . $this->getAttribute('type')
            );
        }

        return $this;
    }

    /**
     * Create a unique brick hash
     * which is created from the brick data
     *
     * @return string
     */
    protected function createBrickHash(): string
    {
        $attributes = $this->getAttributes();
        $hashParams = array_filter($attributes, function ($entry) {
            return is_object($entry) === false;
        });

        $hash = serialize($hashParams);

        return md5($hash);
    }

    protected function getScopedCustomCSS(string $css): string
    {
        $css = trim($css);

        if ($css === '') {
            return '';
        }

        if (!$this->id) {
            return $css;
        }

        $scope = '[data-brickid="' . $this->id . '"]';

        if (str_contains($css, $scope)) {
            return $css;
        }

        $scopeRules = function (string $input) use (&$scopeRules, $scope): string {
            $out = '';
            $len = strlen($input);
            $i = 0;

            while ($i < $len) {
                $ch = $input[$i];

                if (ctype_space($ch)) {
                    $out .= $ch;
                    $i++;
                    continue;
                }

                if ($ch === '/' && ($i + 1) < $len && $input[$i + 1] === '*') {
                    $end = strpos($input, '*/', $i + 2);

                    if ($end === false) {
                        $out .= substr($input, $i);
                        break;
                    }

                    $out .= substr($input, $i, $end + 2 - $i);
                    $i = $end + 2;
                    continue;
                }

                if ($ch === '@') {
                    $start = $i;
                    $bracePos = strpos($input, '{', $i);

                    if ($bracePos === false) {
                        $out .= substr($input, $i);
                        break;
                    }

                    $header = trim(substr($input, $start, $bracePos - $start));
                    $lowerHeader = strtolower($header);

                    $depth = 0;
                    $j = $bracePos;

                    while ($j < $len) {
                        if ($input[$j] === '{') {
                            $depth++;
                        } elseif ($input[$j] === '}') {
                            $depth--;
                            if ($depth === 0) {
                                break;
                            }
                        }

                        $j++;
                    }

                    if ($j >= $len) {
                        $out .= substr($input, $i);
                        break;
                    }

                    $blockContent = substr($input, $bracePos + 1, $j - $bracePos - 1);

                    if (str_starts_with($lowerHeader, '@media') || str_starts_with($lowerHeader, '@supports')) {
                        $out .= $header . '{' . $scopeRules($blockContent) . '}';
                    } else {
                        $out .= substr($input, $start, ($j + 1) - $start);
                    }

                    $i = $j + 1;
                    continue;
                }

                $bracePos = strpos($input, '{', $i);

                if ($bracePos === false) {
                    $out .= substr($input, $i);
                    break;
                }

                $selector = trim(substr($input, $i, $bracePos - $i));

                $depth = 0;
                $j = $bracePos;

                while ($j < $len) {
                    if ($input[$j] === '{') {
                        $depth++;
                    } elseif ($input[$j] === '}') {
                        $depth--;
                        if ($depth === 0) {
                            break;
                        }
                    }

                    $j++;
                }

                if ($j >= $len) {
                    $out .= substr($input, $i);
                    break;
                }

                $declarations = substr($input, $bracePos + 1, $j - $bracePos - 1);

                if ($selector === '') {
                    $out .= '{' . $declarations . '}';
                    $i = $j + 1;
                    continue;
                }

                if (preg_match('/(^|,)[\s]*(:root|html|body)\b/i', $selector)) {
                    $out .= $selector . '{' . $declarations . '}';
                    $i = $j + 1;
                    continue;
                }

                $selectors = array_map('trim', explode(',', $selector));
                $scopedSelectors = [];

                foreach ($selectors as $sel) {
                    if ($sel === '') {
                        continue;
                    }

                    $scopedSelectors[] = $scope . ' ' . $sel;
                }

                if (empty($scopedSelectors)) {
                    $out .= $selector . '{' . $declarations . '}';
                    $i = $j + 1;
                    continue;
                }

                $out .= implode(', ', $scopedSelectors) . '{' . $declarations . '}';
                $i = $j + 1;
            }

            return $out;
        };

        return $scopeRules($css);
    }

    /**
     * Return the HTML of the Brick
     *
     * @return string
     *
     * @throws QUI\Exception
     * @throws Exception
     */
    public function create(): string
    {
        $settings = $this->getSettings();
        $settings = array_filter($settings, function ($entry) {
            return is_object($entry) === false;
        });

        $cacheName = Manager::getBrickCacheNamespace()
            . md5($this->getType())
            . '/'
            . $this->hash
            . '/' . md5(serialize($settings));

        if ($this->getAttribute('cacheable')) {
            try {
                $data = QUI\Cache\Manager::get($cacheName);
                $cssFiles = $data['cssFiles'];
                $cssClasses = $data['cssClasses'];

                if (is_array($cssClasses)) {
                    foreach ($cssClasses as $cssClass) {
                        $this->addCSSClass($cssClass);
                    }
                }

                if (is_array($cssFiles)) {
                    foreach ($cssFiles as $cssFile) {
                        QUI\Control\Manager::addCSSFile($cssFile);
                    }
                }

                if (!empty($data['html'])) {
                    return $data['html'];
                }
            } catch (Exception) {
            }
        }

        if ($this->getAttribute('type') == 'content') {
            $_classes = [
                'brick-' . $this->id
            ];

            foreach ($this->cssClasses as $cssClass) {
                $_classes[] = $cssClass;
            }


            $oldCssClasses = $this->getAttribute('classes');
            $oldCssClassesJson = null;

            if (is_string($oldCssClasses)) {
                $oldCssClassesJson = json_decode($oldCssClasses, true);
            }

            if (is_array($oldCssClassesJson)) {
                $oldCssClasses = $oldCssClassesJson;
            }

            $classes = $oldCssClasses;

            if (is_string($oldCssClasses)) {
                $classes = explode(' ', $oldCssClasses);
            }

            foreach ($classes as $class) {
                $_classes[] = trim($class);
            }

            $_classes = array_unique($_classes);
            $classesStr = implode(' ', $_classes);
            $classesStr = 'class="' . $classesStr . '"';

            $Engine = QUI::getTemplateManager()->getEngine();

            $Engine->assign([
                'this' => $this,
                'classesStr' => $classesStr
            ]);

            $result = $Engine->fetch(dirname(__FILE__) . '/Brick.html');
            $result = $this->extendCustomCSS($result);
            $result = $this->extendCustomJs($result);
            $result = $this->extendFooter($result);

            QUI\Cache\Manager::set($cacheName, [
                'html' => $result,
                'cssClasses' => $this->cssClasses,
                'cssFiles' => []
            ]);

            return $result;
        }

        $Control = $this->getControl();

        if (!$Control) {
            throw new QUI\Exception('Control not found. Brick could not be created');
        }

        $Control->setAttributes($this->getSettings());

        if ($this->getAttribute('classes')) {
            $Control->addCSSClass($this->getAttribute('classes'));
        }

        if ($Control->existsAttribute('cacheable')) {
            $Control->setAttribute('cacheable', $Control->getAttribute('cacheable'));
        }

        // workaround wegen title bug
        // @todo backendTitle einführen und title als frontend Title nutzen (Versionssprung)
        $Control->setAttribute('title', $this->getAttribute('frontendTitle'));

        if ($this->id) {
            $Control->addCSSClass('brick-' . $this->id);
            $Control->setAttribute('data-brickid', $this->id);
        }

        if ($this->uniqueId) {
            $Control->setAttribute('data-brickuid', $this->uniqueId);
        }

        foreach ($this->cssClasses as $cssClass) {
            $Control->addCSSClass($cssClass);
        }

        $result = $Control->create();
        $result = $this->extendCustomCSS($result);
        $result = $this->extendCustomJs($result);
        $result = $this->extendFooter($result);

        $cssFiles = $Control->getCSSFiles();

        QUI\Cache\Manager::set($cacheName, [
            'html' => $result,
            'cssClasses' => $this->cssClasses,
            'cssFiles' => $cssFiles
        ]);

        return $result;
    }

    protected function extendCustomCSS(string $result = ''): string
    {
        $settings = $this->getSettings();
        $css = '';
        $customCSS = '';

        if (isset($settings['customCSS']) && is_string($settings['customCSS'])) {
            $customCSS = $this->getScopedCustomCSS($settings['customCSS']);
        }

        if (!empty($customCSS)) {
            $css = '<style>' . $customCSS . '</style>';
        }

        return $css . $result;
    }

    protected function extendCustomJs(string $result = ''): string
    {
        $settings = $this->getSettings();
        $customJS = '';
        $extraJs = '';

        if (isset($settings['customJS']) && is_string($settings['customJS'])) {
            $customJS = trim($settings['customJS']);
        }

        if (!empty($customJS)) {
            $extraJs = "
            <script data-no-cache='1'>
              (function () {
                const script = document.currentScript;
                const prevEl = script.previousElementSibling;
                const brickId = parseInt('$this->id', 10);
        
                if (!prevEl) return;
                if (brickId !== parseInt(prevEl.dataset.brickid, 10)) return;
                
                new Promise((resolve) => {
                    // Kein QUI-Kontext -> trotzdem Custom-JS ausführen
                    if (!prevEl?.dataset?.qui) {
                      resolve(null);
                      return;
                    }
                
                    if (prevEl.dataset.quiid) {
                      resolve(QUI.Controls.getById(prevEl.dataset.quiid) || null);
                      return;
                    }
                
                    const onLoad = () => resolve(QUI.Controls.getById(prevEl.dataset.quiid) || null);
                
                    if (typeof prevEl.addEvent === 'function') {
                      prevEl.addEvent('load', onLoad);
                      return;
                    }
                
                    prevEl.addEventListener('load', onLoad, { once: true });
                  }).then((control) => {
                    try {
                      (function (prevEl, brickId, control) {
                        $customJS
                      }).call(control ?? undefined, prevEl, brickId, control);
                    } catch (err) {
                      console.error('Custom JS runtime error:', err);
                    }
                });
              })();
            </script>";
        }

        return $result . $extraJs;
    }

    protected function extendFooter(string $result = ''): string
    {
        $settings = $this->getSettings();

        if (!isset($settings['footer']) || !is_string($settings['footer'])) {
            return $result;
        }

        $footer = trim($settings['footer']);

        if ($footer === '') {
            return $result;
        }

        return $result . '<div class="quiqqer-brick-footer control-footer">' . $footer . '</div>';
    }

    /**
     * Return the internal control
     *
     * @return Control|false|null
     * @throws QUI\Exception
     */
    protected function getControl(): Control | false | null
    {
        if ($this->Control) {
            return $this->Control;
        }

        $Ctrl = $this->getAttribute('type');

        if ($Ctrl === 'content') {
            return false;
        }

        if (!is_callable($Ctrl) && !class_exists($Ctrl)) {
            return false;
        }

        $Site = $this->getAttribute('Site');

        if ($Site instanceof QUI\Projects\Site && is_string($Ctrl)) {
            $Project = $Site->getProject();
            $BricksManager = QUI\Bricks\Manager::init();

            if ($BricksManager === null) {
                return false;
            }

            $template = $Project->getAttribute('template');

            $Ctrl = $BricksManager->getAlternateClass(
                $Ctrl,
                is_string($template) ? $template : false
            );
        }

        if (!is_string($Ctrl)) {
            return false;
        }

        /* @var $Control Control */
        $Control = new $Ctrl(
            array_merge($this->getSettings(), $this->getAttributes())
        );

        if (!($Control instanceof Control)) {
            return false;
        }

        $Control->setAttribute('height', $this->getAttribute('height'));
        $Control->setAttribute('width', $this->getAttribute('width'));
        $Control->setAttribute('content', $this->getAttribute('content'));

        if ($this->getAttribute('Site')) {
            $Control->setAttribute('Site', $this->getAttribute('Site'));
        } else {
            $Control->setAttribute('Site', QUI::getRewrite()->getSite());
        }

        $this->Control = $Control;

        if ($this->Control->existsAttribute('cacheable')) {
            $this->setAttribute('cacheable', $this->Control->getAttribute('cacheable'));
        }

        return $Control;
    }

    /**
     * Return the brick settings
     *
     * @return array<string, mixed>
     */
    public function getSettings(): array
    {
        $this->settings['classes'] = $this->getCSSClasses();

        return $this->settings;
    }

    /**
     * Set brick settings
     *
     * @param array<string, mixed> $settings - list of settings
     *
     * @return void
     */
    public function setSettings(array $settings): void
    {
        foreach ($settings as $key => $value) {
            if ($key === 'classes') {
                $this->clearCSSClasses();
                $this->addCSSClass($value);
                continue;
            }
            $this->setSetting($key, $value);
        }
    }

    /**
     * Return the setting of the brick
     *
     * @param string $name - Name of the setting
     *
     * @return bool|string|array<string, mixed>
     */
    public function getSetting(string $name): bool | array | string
    {
        if ($name === 'classes') {
            return $this->getCSSClasses();
        }

        if (isset($this->settings[$name])) {
            return $this->settings[$name];
        }

        return false;
    }

    /**
     * Set a brick setting
     *
     * @param string $name - name of the setting
     * @param mixed $value - value of the setting
     *
     * @return void
     */
    public function setSetting(string $name, mixed $value): void
    {
        $this->settings[$name] = $value;

        if ($this->Control instanceof Control) {
            $this->Control->setAttribute($name, $value);
        }
    }

    /**
     * @param string $name
     * @return mixed
     */
    public function getAttribute(string $name): mixed
    {
        if ($name === 'classes') {
            return $this->getCSSClasses();
        }

        return parent::getAttribute($name);
    }

    /**
     * @return array<string, mixed>
     */
    public function getAttributes(): array
    {
        $attributes = parent::getAttributes();
        $attributes['classes'] = $this->getCSSClasses();

        return $attributes;
    }

    /**
     * @return array<string>
     */
    public function getCustomFields(): array
    {
        return $this->customfields;
    }

    /**
     * Add an extra CSS Class to the control
     *
     * @param array<string> $cssClass - Name of the CSS Class
     *
     * @return void
     */
    public function addCSSClass(array | string $cssClass): void
    {
        if (is_array($cssClass)) {
            $cssClass = implode(' ', $cssClass);
        }

        if (empty($cssClass)) {
            return;
        }

        $classes = QUI\ControlUtils::clearClassName($cssClass);
        $classes = explode(' ', $classes);

        $keys = array_flip($this->cssClasses);

        foreach ($classes as $cssClass) {
            if (!isset($keys[$cssClass])) {
                $this->cssClasses[] = $cssClass;
                $keys[$cssClass] = true;
            }
        }
    }

    /**
     * Remove all CSS classes
     */
    public function clearCSSClasses(): void
    {
        $this->cssClasses = [];
    }

    /**
     * Return all CSS classes
     *
     * @return array<string>
     */
    public function getCSSClasses(): array
    {
        return $this->cssClasses;
    }

    /**
     * Match pattern against the CSS classes
     *
     * @param string $pattern - The shell wildcard pattern.
     *
     * @return boolean
     */
    public function hasCSSClass(string $pattern): bool
    {
        $cssClasses = $this->getAttribute('classes');

        if (is_array($cssClasses)) {
            $cssClasses = implode(' ', $cssClasses);
        }

        if ($cssClasses && fnmatch($pattern, $cssClasses)) {
            return true;
        }

        if (empty($this->cssClasses)) {
            return false;
        }

        foreach ($this->cssClasses as $cssClass) {
            if (fnmatch($pattern, $cssClass)) {
                return true;
            }
        }

        return false;
    }
}
