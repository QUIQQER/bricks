---
name: quiqqer_bricks_develop_brick_types
description: Use when developing a new brick type or changing an existing one in a QUIQQER package, including the PHP control and render lifecycle, registration and editor settings in bricks.xml, locale variables, configurable CSS, frontend JavaScript, custom setting controls, custom editor tabs, and composed controls. Not for creating or editing brick instances in a project.
category: developer
---

# QUIQQER Bricks Develop Brick Types

Use this skill to build a brick type in a package. For editing brick instances in a project, load
`quiqqer_bricks_create_and_edit_blocks` instead.

## Load The Core Skills

The following skills are provided by `quiqqer/core` and are expected to be available. Load them before
editing the corresponding files; their rules override legacy patterns found in older bricks:

- Always load `quiqqer_frontend_css_variables` for CSS or settings that affect styling. Use its complete
  three-layer pattern, not only a direct CSS variable on the control.
- Always load `quiqqer_frontend_accessibility` when PHP, templates, or JavaScript produce or modify markup,
  including markup in backend setting controls.
- Load `quiqqer_frontend_javascript` for every JavaScript change. Keep AMD and `new Class` as QUIQQER
  infrastructure, but write new DOM logic in vanilla JavaScript and select through `data-name`.
- Load `quiqqer_secure_coding` for PHP or template output.
- Load `quiqqer_extension_points` for XML registration, providers, package structure, or asset integration.

## Mental Model And Files

- A brick type is a PHP class extending `QUI\Control`. The bricks system reads its root-level `bricks.xml`
  entry and passes the saved brick settings to the control as attributes.
- `QUI\Control::create()` renders the outer element. `nodeName`, `class`, styles, JavaScript control data,
  and brick metadata belong to this outer element. `getBody()` returns only its inner HTML.
- An installed package's root-level `bricks.xml` is discovered automatically. No PHP provider is required
  for a normal brick registration.
- Keep the class autoloadable through the package's `composer.json` PSR-4 mapping. A typical brick uses:

  ```text
  package/
  +-- bricks.xml
  +-- locale.xml
  +-- composer.json
  +-- src/Vendor/Package/Bricks/
      +-- FeatureGrid.php
      +-- FeatureGrid.html
      +-- FeatureGrid.css
  ```

- Follow the package's existing `Bricks` or `Controls` namespace convention; both occur in QUIQQER.
- Declare every reused package in `composer.json`. Do not assume an optional package is installed.

## Reserved Brick Setting Names

Do not reuse attributes owned by the bricks runtime as top-level brick-specific setting names in
`<setting name="...">` or custom-tab `<input conf="...">` declarations. The runtime passes brick data to
the control and writes some attributes again during rendering, so a collision can replace the configured
value or give one name two different meanings.

- Standard brick content and editor settings: `title`, `content`, `frontendTitle`, `width`, `height`,
  `classes`, `customId`, `customCSS`, `customCSSScoping`, `customJS`, and `footer`.
- Brick metadata and lifecycle attributes: `type`, `description`, `active`, `c_date`, `c_user`, `e_date`,
  `e_user`, `project`, `lang`, `areas`, `hasContent`, `recommended`, `cacheable`, and `deprecated`.
- Runtime identity and context attributes: `id`, `uniqueId`, `frontendId`, `Site`, `data-brickid`, and
  `data-brickuid`.
- Control root attributes such as `class`, `nodeName`, `styles`, `events`, and `qui-class` belong in the
  PHP control and must not be exposed as ordinary brick-specific editor settings.

`title` is especially unsafe: after applying the saved settings, the bricks runtime replaces the control's
`title` attribute with the brick's `frontendTitle` or removes it. Use a purpose-specific name such as
`titleAttribute`, `heading`, `introContent`, or `buttonLabel` instead. Read standard values such as `content`
and `frontendTitle` from the control when needed, but do not redeclare them for a different purpose.

This restriction applies to top-level settings passed onto the brick control. Keys inside a structured JSON
setting do not collide with brick attributes; for example, an entry inside a `buttons` setting may carry its
own `title`. Map nested values explicitly when composing a child control.

## CSS Class Naming And BEM

- Derive the control root class from vendor, package, namespace folders below the package namespace, and control name:
  `vendor-package-folder-controlName`. For example, `QUI\Bricks\Controls\Image` in `quiqqer/bricks` uses
  `quiqqer-bricks-controls-image`.
- Set the root class through the PHP control's `class` attribute. Do not add a template wrapper only to carry the
  control class; `QUI\Control::create()` already renders the outer element.
- Use pragmatic BEM below that root: `root__element` for owned parts and `root--modifier` or `root__element--modifier`
  for real variants. Keep compound element and modifier names in lower camel case, matching patterns such as
  `quiqqer-bricks-layout__contentInner`.
- Do not force shared framework classes such as `control-header`, `control-content`, state classes, or utility classes
  into the control's BEM namespace.
- Treat newer controls such as MultiLayout and `QUI\Bricks\Layout\Layout` as naming references. Do not copy legacy
  short classes from older controls.

## Site And Project Context

The bricks runtime normally sets the current `Site` object on the control before rendering it. Still use a
typed helper with a rewrite fallback because controls can also be instantiated directly in tests, other
controls, or non-standard render flows:

```php
protected function getSite(): QUI\Interfaces\Projects\Site
{
    $Site = $this->getAttribute('Site');

    if ($Site instanceof QUI\Interfaces\Projects\Site) {
        return $Site;
    }

    $Site = QUI::getRewrite()->getSite();

    if (!$Site instanceof QUI\Interfaces\Projects\Site) {
        throw new QUI\Exception('No site available.');
    }

    $this->setAttribute('Site', $Site);

    return $Site;
}
```

- Check with `instanceof`, not only truthiness: control attributes are mixed values and the return type must
  be guaranteed.
- Throw when the brick requires a site and none exists. If rendering without a site is valid, return
  `?QUI\Interfaces\Projects\Site` instead and handle `null` explicitly.
- Use the inherited protected `$this->getProject()` from `QUI\Control` when only the current project is
  needed. Use `$this->getSite()->getProject()` when the project must belong to the resolved site.
- Do not assume a rewrite context in CLI, queue, test, or nested-control usage. Inject `Site` or `Project`
  explicitly in those contexts when available.

## Minimal Working Brick

Start with a PHP control, template, CSS file, XML registration, and locale variables. Add JavaScript or a
custom backend editor only when the requirement needs them.

### PHP Control

Set defaults before `parent::__construct($attributes)` so caller and saved setting values override them.
Keep PHP defaults even when XML defines editor defaults: controls are also instantiated directly and old
brick data may be incomplete.

```php
namespace Vendor\Package\Bricks;

use QUI;

class FeatureGrid extends QUI\Control
{
    private const GAP_PRESETS = [
        'small' => '0.75rem',
        'normal' => '1.5rem',
        'large' => '2.5rem'
    ];

    public function __construct(array $attributes = [])
    {
        $this->setAttributes([
            'nodeName' => 'section',
            'class' => 'vendor-package-bricks-featureGrid',
            'showTitle' => false,
            'gap' => 'normal'
        ]);

        parent::__construct($attributes);
        $this->addCSSFile(dirname(__FILE__) . '/FeatureGrid.css');
    }

    public function getBody(): string
    {
        $gap = (string)$this->getAttribute('gap');

        if (!isset(self::GAP_PRESETS[$gap])) {
            $gap = 'normal';
        }

        $this->setCustomVariable('gap', self::GAP_PRESETS[$gap]);

        $Engine = QUI::getTemplateManager()->getEngine();
        $Engine->assign('this', $this);

        return $Engine->fetch(dirname(__FILE__) . '/FeatureGrid.html');
    }

    private function setCustomVariable(string $name, string $value): void
    {
        if ($name === '' || $value === '') {
            return;
        }

        $this->setStyle('--_q-controlConf-' . $name, $value);
    }
}
```

### Template

The bricks runtime supplies standard brick attributes such as `frontendTitle` and `content`. Define
brick-specific display flags such as `showTitle` in the control and `bricks.xml`. Render the optional
generic content only when the brick should support it. Do not add another outer `section`;
`QUI\Control::create()` already creates it from `nodeName`.

```smarty
{if $this->getAttribute('showTitle') && $this->getAttribute('frontendTitle')}
    <header class="control-header">
        <h2>{$this->getAttribute('frontendTitle')|escape:'html'}</h2>
    </header>
{/if}

{if $this->getAttribute('content') != ''}
    <div class="control-content">
        {$this->getAttribute('content')}
    </div>
{/if}

<div class="control-template vendor-package-bricks-featureGrid__grid">
    {* Brick-specific output *}
</div>
```

Treat plain text as untrusted and escape it for its context. Output editor HTML or `nofilter` only when the
field explicitly carries HTML and the established input flow sanitizes it.

### Configurable CSS: Three Layers

For every setting-backed style, implement all three layers from `quiqqer_frontend_css_variables`:

1. Long public theming variable: `--vendor-package-featureGrid-gap`.
2. PHP-written config variable: `--_q-controlConf-gap`.
3. CSS fallback: the stable default.

Bind these once to a short private variable on the control root, then use only the short variable:

```css
.vendor-package-bricks-featureGrid {
    --_gap: var(--vendor-package-featureGrid-gap, var(--_q-controlConf-gap, 1.5rem));
}

.vendor-package-bricks-featureGrid__grid {
    display: grid;
    gap: var(--_gap);
}
```

Map editor presets to validated CSS values in PHP and call `setStyle()` only through
`--_q-controlConf-<name>`. Do not write the long theming variable from PHP. Let CSS own the theming hook and
fallback. The config variable is placed on the outer control and inherits into the template markup.

### Registration In bricks.xml

```xml
<quiqqer>
    <bricks>
        <brick control="\Vendor\Package\Bricks\FeatureGrid" hasContent="1">
            <title>
                <locale group="vendor/package" var="brick.featureGrid.title"/>
            </title>
            <description>
                <locale group="vendor/package" var="brick.featureGrid.description"/>
            </description>

            <settings>
                <setting name="showTitle" type="checkbox">
                    <locale group="vendor/package" var="brick.featureGrid.showTitle"/>
                    <defaultValue>0</defaultValue>
                </setting>
                <setting name="gap" type="select">
                    <locale group="vendor/package" var="brick.featureGrid.gap"/>
                    <option value="small">
                        <locale group="vendor/package" var="brick.featureGrid.gap.small"/>
                    </option>
                    <option value="normal">
                        <locale group="vendor/package" var="brick.featureGrid.gap.normal"/>
                    </option>
                    <option value="large">
                        <locale group="vendor/package" var="brick.featureGrid.gap.large"/>
                    </option>
                    <defaultValue>normal</defaultValue>
                </setting>
            </settings>
        </brick>
    </bricks>
</quiqqer>
```

- Prefer `<defaultValue>` for new settings and keep it identical to the PHP default. Existing packages may
  contain legacy `default="1"` or `selected="selected"` forms; do not copy them without a compatibility
  reason.
- Omit `hasContent` or use `hasContent="1"` to expose the generic content editor. Use `hasContent="0"`
  only when editors must not receive that generic field; custom settings and custom tabs remain available.
- Use localized titles, descriptions, setting labels, and option labels from `locale.xml`. Ensure the
  locale group has the required `php` and/or `js` datatype when PHP or JavaScript reads it.
- Use standard setting types such as `text`, `number`, `checkbox`, `select`, `color`, and `hidden`. Reuse
  established controls and classes for site, media, or folder selection instead of rebuilding them.
- Add `recommended`, `deprecated`, `cacheable`, `inheritance`, `priority`, or `name` only for a concrete
  requirement.
- Add optional `preview` and `thumbnail` mockups using the existing package path and image-size convention.

### Descriptions For Editors And AI

The brick `<description>` and each setting `<description>` are read by editors and by AI tools over
MCP (`quiqqer_bricks_create_and_edit_blocks` inspects them to choose a brick and fill its settings).
Write them for both audiences.

- Brick description: a teaser, not a settings list. State what the brick is, when to use it
  (concrete use cases), and what makes it distinctive. Keep it short and benefit-oriented; do not
  enumerate every setting. Use `brick.multiLayout.description` as the length and format reference (a
  short intro, a few benefit bullets, a closing sentence).
- Setting description: add a `<description>` to every setting whose effect is not already
  unambiguous from its label. This primarily helps AI choose the right value; editors benefit too.
  Skip it only when the label is self-explanatory, for example a media-image picker labelled
  "Background image".
- When an option maps to a concrete frontend output, put that output in the option label, for
  example `Default text ("Before")` instead of a bare `Default text`.

```xml
<setting name="gap" type="select">
    <locale group="vendor/package" var="brick.featureGrid.gap"/>
    <description>
        <locale group="vendor/package" var="brick.featureGrid.gap.desc"/>
    </description>
    <option value="small">
        <locale group="vendor/package" var="brick.featureGrid.gap.small"/>
    </option>
    <option value="normal">
        <locale group="vendor/package" var="brick.featureGrid.gap.normal"/>
    </option>
    <defaultValue>normal</defaultValue>
</setting>
```

## Choose The Editor Integration

Use the least complex editor surface that makes the setting understandable to editors.

### Standard Setting

Use an ordinary `<setting>` for a scalar value that is clear as a checkbox, input, or short select.

### Conditional Setting

Show or hide a dependent setting based on another setting's value with the core dependency control
`package/quiqqer/core/bin/QUI/controls/settings/Dependency`. Attach it via `data-qui` to the
controlling field; each dependent field declares its own condition:

```xml
<setting name="labelMode" type="select"
         data-qui="package/quiqqer/core/bin/QUI/controls/settings/Dependency">
    <locale group="vendor/package" var="brick.featureGrid.labelMode"/>
    <option value="default">
        <locale group="vendor/package" var="brick.featureGrid.labelMode.default"/>
    </option>
    <option value="custom">
        <locale group="vendor/package" var="brick.featureGrid.labelMode.custom"/>
    </option>
    <option value="hidden">
        <locale group="vendor/package" var="brick.featureGrid.labelMode.hidden"/>
    </option>
    <defaultValue>default</defaultValue>
</setting>

<setting name="labelText" type="text"
         data-dependency="labelMode"
         data-dependency-options="custom">
    <locale group="vendor/package" var="brick.featureGrid.labelText"/>
</setting>
```

- Put `data-dependency="<controllingName>"` on the dependent field and list the values that reveal
  it in `data-dependency-options`. Use `valueA,valueB` for a positive list, `!valueA` to hide for a
  value, or `*` / `!*` for "while filled" / "while empty". A checkbox counts as `1` or `0`.
- The control scopes to the closest `form` or `table` and hides the closest `[data-dependency-row]`,
  the closest `<tr>`, or the field itself.
- Prefer an explicit mode select plus a dependent field over an empty-string sentinel to separate
  "use the default" from "hidden". This is clearer for editors and for AI, and avoids ambiguous
  empty values.
- Normalize the resulting combination in PHP as well; the backend condition is UX, not a trust
  boundary.

### Visual Setting Control

Use `data-qui` on a hidden setting when a visual choice is materially clearer than a select. The loaded
QUIControl owns the presentation, while the original input remains the stored value:

```xml
<setting name="layout" type="hidden"
         data-qui="package/vendor/package/bin/Controls/backend/LayoutSelect">
    <locale group="vendor/package" var="brick.featureGrid.layout"/>
</setting>
```

In the backend control:

- Extend `QUIControl` in the normal AMD/`new Class` scaffold.
- Capture `this.getElm()` as the original input during `onImport` and hide or wrap it.
- Read the current value from the input and render the visual choices.
- Write every selection back to `input.value` and fire the control's `change` event.
- Use native buttons, keyboard handling, `aria-pressed`, and visible focus states.
- Normalize against an allowlist and keep the input value compatible with the PHP control.

Use `quiqqer/bricks/bin/Controls/backend/AccordionLayoutSelect.js` as the focused reference for a visual
layout picker. It produces the card selection shown inside the normal settings tab.

### Structured JSON Setting

Use a hidden setting with a custom backend control when editors manage a repeatable or nested structure:

```xml
<setting name="entries" type="hidden" label="false"
         data-qui="package/vendor/package/bin/Controls/backend/EntrySettings">
    <locale group="vendor/package" var="brick.featureGrid.entries"/>
</setting>
```

- Treat the hidden input as the persistence boundary: parse its JSON on import and write the complete JSON
  document back after add, edit, delete, reorder, or enable/disable actions.
- Recover from empty, invalid, and legacy values; never assume decoded data has the current shape.
- Normalize the same schema again in PHP. Backend validation improves UX but is not a trust boundary.
- Keep the serialized field names stable or provide an explicit compatibility migration.

Use the Accordion entries editor as the compact list-editor reference. Use MultiLayout only when the data
is genuinely a complex responsive document; do not copy its complexity into ordinary repeaters.

### Custom Editor Tab

Use `<window><categories>` when a substantial editor needs its own navigation tab instead of crowding the
normal settings tab:

```xml
<window>
    <categories>
        <category name="feature-grid-entries" index="35">
            <text>
                <locale group="vendor/package" var="brick.featureGrid.entries"/>
            </text>
            <image>fa fa-list</image>

            <settings name="feature-grid-entries">
                <title>
                    <locale group="vendor/package" var="brick.featureGrid.entries"/>
                </title>
                <input conf="entries" type="hidden" label="false"
                       data-qui="package/vendor/package/bin/Controls/backend/EntrySettings">
                    <text>
                        <locale group="vendor/package" var="brick.featureGrid.entries"/>
                    </text>
                </input>
            </settings>
        </category>
    </categories>
</window>
```

- Keep `category name` unique and use `index` for its position in the brick window.
- Make `input conf` exactly match the PHP control attribute and persisted setting name.
- Use the Accordion `<window>` entry as the reference for a focused list tab.
- Use the MultiLayout `areas` category plus `MultiLayoutSettings`/`LayoutSettings` as the modern reference
  for a large visual editor with nested structured data.

## Frontend JavaScript

Attach frontend behavior either with a `qui-class` default or explicitly:

```php
$this->setJavaScriptControl('package/vendor/package/bin/Controls/FeatureGrid');
$this->setJavaScriptControlOption('mode', $normalizedMode);
```

Create an AMD module that extends `QUIControl`, initialize from `onImport`, and scope all DOM access to
`this.getElm()`. Select elements through `[data-name="..."]`, use vanilla event APIs, and keep ARIA state
synchronized. Do not use a CSS class as the JavaScript selector API.

## Compose Existing Controls

Prefer composing an installed control over reimplementing its behavior. The brick prepares normalized
data and settings, creates the child control, forwards its assets, and renders it with `create()`:

```php
$Carousel = new \QUI\Slider\Controls\Carousel([
    'slides' => $slides,
    'slidesPerView' => $slidesPerView
]);

$this->addCSSFiles($Carousel->getCSSFiles());
$Engine->assign('Carousel', $Carousel);
```

```smarty
{$Carousel->create()}
```

Declare `quiqqer/slider` in `composer.json` before using this example. Use
`quiqqer/slider/src/QUI/Slider/Bricks/Carousel.php` as the composition reference. Do not reference a brick
from a package that is not guaranteed to be installed.

## Reference Selection

Do not treat all controls in `quiqqer/bricks` as current examples; the package contains legacy PHP,
markup, CSS, and MooTools patterns. Use the core skills as the source of truth and inspect only the pattern
needed for the task:

- Visual scalar setting: `AccordionLayoutSelect.js` and the Accordion `template` setting.
- Focused custom tab and repeatable entries: Accordion `<window>` and `AccordionSettings.js`.
- Modern complex custom tab: MultiLayout `areas` category, `MultiLayoutSettings`, and `LayoutSettings`.
- Composed frontend control: `quiqqer/slider` Carousel brick.
- Configurable CSS: `quiqqer_frontend_css_variables` and its Breadcrumb reference.

## Completion Checklist

- Confirm the PSR-4 namespace, class path, `bricks.xml` control name, and declared package dependencies.
- Confirm the PHP control owns the convention-based root class and its owned markup uses pragmatic BEM names.
- Confirm XML defaults, PHP defaults, JavaScript defaults, and CSS fallbacks describe the same behavior.
- Confirm every top-level `<setting name>` and custom-tab `<input conf>` avoids reserved brick and control
  attribute names.
- Confirm every locale exists and is available to PHP or JavaScript where required.
- Confirm the brick description reads as a teaser for editors and AI, and every setting whose effect
  is not obvious from its label carries a description.
- Confirm scalar and structured settings are normalized in PHP, including invalid and legacy values.
- Confirm required Site or Project context works both through brick rendering and direct control usage.
- Confirm template output is escaped by context and deliberate HTML output has a documented trust boundary.
- Confirm configurable styling follows all three CSS-variable layers.
- Confirm interactive frontend and backend UI is semantic, keyboard accessible, and keeps ARIA state current.
- Confirm child-control CSS and other required assets reach the rendered page.
- Confirm existing brick instances retain their stored format and behavior unless a migration was requested.
- Run package-local checks when the task or repository instructions require validation. Test direct control
  construction, empty data, defaults, variants, invalid data, editor save/reload, and frontend rendering in
  an active template.
