define('package/quiqqer/bricks/bin/Controls/backend/MultiLayoutSettings', [

    'qui/controls/Control',
    'qui/controls/windows/Confirm',
    'Ajax',
    'Locale',
    'Projects',
    'package/quiqqer/bricks/bin/Controls/backend/BlockSlot',
    'package/quiqqer/bricks/bin/vendor/gridstack/GridStack',

    'css!package/quiqqer/bricks/bin/Controls/backend/MultiLayoutSettings.css'

], function (QUIControl, QUIConfirm, QUIAjax, QUILocale, Projects, BlockSlot, GridStack) {
    "use strict";

    const lg = 'quiqqer/bricks';
    const MODE_EDITOR = 'editor';
    const MODE_BRICK = 'brick';
    const MODE_IMAGE = 'image';
    const EDIT_MODE_CONTENT = 'content';
    const EDIT_MODE_LAYOUT = 'layout';
    const IMAGE_FIT_AUTO = 'auto';
    const IMAGE_FIT_COVER = 'cover';
    const IMAGE_FIT_CONTAIN = 'contain';
    const BACKGROUND_POSITION_CENTER = 'center center';
    const BACKGROUND_POSITION_TOP = 'center top';
    const BACKGROUND_POSITION_BOTTOM = 'center bottom';
    const BACKGROUND_POSITION_LEFT = 'left center';
    const BACKGROUND_POSITION_RIGHT = 'right center';
    const VERTICAL_ALIGN_TOP = 'top';
    const VERTICAL_ALIGN_CENTER = 'center';
    const VERTICAL_ALIGN_BOTTOM = 'bottom';
    const DEFAULT_COLUMNS = 12;
    const MIN_SLOT_WIDTH = 2;
    const AJAX_GET_PRESETS = 'package_quiqqer_bricks_ajax_getMultiLayoutPresets';

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Controls/MultiLayoutSettings',

        Binds: [
            '$onImport',
            '$onAreaChange',
            '$onSlotRemove',
            '$onSlotSelect'
        ],

        initialize: function (options) {
            this.parent(options);

            this.$AreaControls = [];
            this.$Input = null;
            this.$Elm = null;
            this.$Container = null;
            this.$Project = null;
            this.$document = null;
            this.$HelperContainer = null;
            this.$Toolbar = null;
            this.$Canvas = null;
            this.$Grid = null;
            this.$GridContainer = null;
            this.$editMode = EDIT_MODE_CONTENT;
            this.$selectedSlotId = '';
            this.$presets = [];

            this.addEvents({
                onImport: this.$onImport
            });
        },

        $onImport: function () {
            this.$Input = this.getElm();
            this.$Input.type = 'hidden';
            this.$Input.addClass('quiqqer-bricks-multiLayout-settings-input');

            this.$Elm = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings'
            }).wraps(this.$Input);

            this.$Toolbar = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-toolbar'
            }).inject(this.$Elm);

            this.$Container = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-container'
            }).inject(this.$Elm);

            this.$HelperContainer = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-helper'
            }).inject(this.$Elm);

            this.$loadPresets().then(function () {
                this.$document = this.$normalizeDocument(this.$parseValue(this.$Input.value));
                this.$selectedSlotId = this.$getDesktopSlots().length
                    ? this.$getDesktopSlots()[0].id
                    : '';

                this.$render();
                this.$update();
            }.bind(this)).catch(function () {
                this.$presets = [];
            }.bind(this));
        },

        $loadPresets: function () {
            return new Promise(function (resolve, reject) {
                QUIAjax.get(AJAX_GET_PRESETS, function (presets) {
                    this.$presets = typeOf(presets) === 'array'
                        ? presets.sort(function (presetA, presetB) {
                            return (presetA.sort || 0) - (presetB.sort || 0);
                        })
                        : [];

                    resolve(this.$presets);
                }.bind(this), {
                    'package': 'quiqqer/bricks',
                    onError: reject
                });
            }.bind(this));
        },

        $getPresets: function () {
            return this.$presets;
        },

        $getDefaultPresetId: function () {
            const presets = this.$getPresets();

            return presets.length ? presets[0].id : null;
        },

        setProject: function (Project) {
            if (typeOf(Project) === 'string') {
                Project = Projects.get(Project);
            }

            this.$Project = typeOf(Project) === 'object' ? Project : null;
            this.$applyProjectToChildControls();
        },

        $onAreaChange: function (Control, area, slotId) {
            this.$document.areas[slotId] = this.$normalizeArea(area, this.$getSlotIndex(slotId), slotId);
            this.$selectedSlotId = slotId;
            this.$updateMobileOrder();
            this.$update();
        },

        $onSlotRemove: function (Control, slotId) {
            this.$removeSlot(slotId);
        },

        $onSlotSelect: function (Control, slotId) {
            this.$selectedSlotId = slotId;
            this.$refreshSelection();
        },

        $render: function () {
            if (!this.$Container) {
                return;
            }

            this.$destroyGrid();
            this.$destroyAreaControls();

            this.$Toolbar.empty();
            this.$Container.empty();
            this.$Container.set('data-mode', this.$editMode);

            this.$renderToolbar();

            this.$Canvas = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-canvas'
            }).inject(this.$Container);

            if (this.$editMode === EDIT_MODE_LAYOUT) {
                this.$renderLayoutCanvas();
            } else {
                this.$renderContentCanvas();
            }
        },

        $renderToolbar: function () {
            const PresetGroup = new Element('label', {
                'class': 'quiqqer-bricks-multiLayout-settings-toolbarGroup'
            }).inject(this.$Toolbar);

            new Element('span', {
                'class': 'quiqqer-bricks-multiLayout-settings-toolbarLabel',
                text: QUILocale.get(lg, 'brick.multiLayout.toolbar.preset')
            }).inject(PresetGroup);

            const PresetSelect = new Element('select', {
                'class': 'quiqqer-bricks-multiLayout-settings-select'
            }).inject(PresetGroup);

            this.$getPresets().forEach(function (preset) {
                new Element('option', {
                    value: preset.id,
                    text: QUILocale.get(lg, preset.labelKey),
                    selected: this.$document.preset === preset.id
                }).inject(PresetSelect);
            }.bind(this));

            PresetSelect.addEvent('change', function () {
                this.$changePreset(PresetSelect.value);
            }.bind(this));

            const ModeGroup = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-toolbarGroup '
                    + 'quiqqer-bricks-multiLayout-settings-toolbarGroup--modes'
            }).inject(this.$Toolbar);

            new Element('span', {
                'class': 'quiqqer-bricks-multiLayout-settings-toolbarLabel',
                text: QUILocale.get(lg, 'brick.multiLayout.toolbar.mode')
            }).inject(ModeGroup);

            this.$createModeButton(
                ModeGroup,
                EDIT_MODE_CONTENT,
                QUILocale.get(lg, 'brick.multiLayout.toolbar.mode.content')
            );
            this.$createModeButton(
                ModeGroup,
                EDIT_MODE_LAYOUT,
                QUILocale.get(lg, 'brick.multiLayout.toolbar.mode.layout')
            );

            const ActionGroup = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-toolbarGroup '
                    + 'quiqqer-bricks-multiLayout-settings-toolbarGroup--actions'
            }).inject(this.$Toolbar);

            if (this.$editMode !== EDIT_MODE_LAYOUT) {
                return;
            }

            new Element('button', {
                type: 'button',
                'class': 'quiqqer-bricks-multiLayout-settings-button',
                html: '<span class="fa fa-plus"></span><span>'
                    + QUILocale.get(lg, 'brick.multiLayout.toolbar.addSlot') + '</span>',
                events: {
                    click: this.$addSlot.bind(this)
                }
            }).inject(ActionGroup);
        },

        $createModeButton: function (Parent, mode, label) {
            new Element('button', {
                type: 'button',
                'class': 'quiqqer-bricks-multiLayout-settings-modeButton'
                    + (this.$editMode === mode ? ' is-active' : ''),
                text: label,
                events: {
                    click: function () {
                        if (this.$editMode === mode) {
                            return;
                        }

                        this.$editMode = mode;
                        this.$render();
                    }.bind(this)
                }
            }).inject(Parent);
        },

        $renderContentCanvas: function () {
            const Grid = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-contentGrid',
                styles: {
                    gridTemplateColumns: 'repeat(' + this.$document.columns + ', minmax(0, 1fr))'
                }
            }).inject(this.$Canvas);

            this.$getOrderedDesktopSlots().forEach(function (slot, index) {
                const AreaControl = new BlockSlot({
                    area: this.$document.areas[slot.id],
                    helperContainer: this.$HelperContainer,
                    slotId: slot.id,
                    index: index,
                    interactionMode: EDIT_MODE_CONTENT,
                    allowedModes: [MODE_EDITOR, MODE_BRICK, MODE_IMAGE],
                    allowModeSwitch: true,
                    settingsVisibility: {
                        contentPadding: true,
                        mobileOrder: true,
                        verticalAlign: true,
                        background: true,
                        backgroundColor: true,
                        textColor: true,
                        image: true
                    },
                    events: {
                        change: this.$onAreaChange
                    }
                });

                const Wrap = new Element('div', {
                    'class': 'quiqqer-bricks-multiLayout-settings-slotWrap',
                    styles: this.$getSlotGridStyles(slot)
                }).inject(Grid);

                AreaControl.inject(Wrap);

                if (this.$Project) {
                    AreaControl.setProject(this.$Project);
                }

                this.$AreaControls.push(AreaControl);
            }.bind(this));
        },

        $renderLayoutCanvas: function () {
            this.$GridContainer = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-layoutGrid grid-stack'
            }).inject(this.$Canvas);

            this.$getOrderedDesktopSlots().forEach(function (slot, index) {
                const Item = new Element('div', {
                    'class': 'grid-stack-item',
                    'gs-id': slot.id,
                    'gs-x': slot.x,
                    'gs-y': slot.y,
                    'gs-w': slot.w,
                    'gs-h': slot.h,
                    'gs-min-w': MIN_SLOT_WIDTH
                }).inject(this.$GridContainer);

                const Content = new Element('div', {
                    'class': 'grid-stack-item-content'
                }).inject(Item);

                const AreaControl = new BlockSlot({
                    area: this.$document.areas[slot.id],
                    helperContainer: this.$HelperContainer,
                    slotId: slot.id,
                    index: index,
                    interactionMode: EDIT_MODE_LAYOUT,
                    selected: this.$selectedSlotId === slot.id,
                    allowRemoveSlot: this.$getDesktopSlots().length > 1,
                    allowModeSwitch: false,
                    settingsVisibility: {
                        contentPadding: false,
                        mobileOrder: false,
                        verticalAlign: false,
                        background: false,
                        backgroundColor: false,
                        textColor: false,
                        image: false
                    },
                    events: {
                        select: this.$onSlotSelect,
                        removeSlot: this.$onSlotRemove
                    }
                });

                AreaControl.inject(Content);
                this.$AreaControls.push(AreaControl);
            }.bind(this));

            this.$initGrid();
        },

        $initGrid: function () {
            if (!this.$GridContainer || !GridStack) {
                return;
            }

            this.$Grid = GridStack.init({
                column: this.$document.columns,
                cellHeight: 200,
                disableOneColumnMode: true,
                float: true,
                margin: 12,
                resizable: {
                    handles: 'e, se, s, sw, w'
                }
            }, this.$GridContainer);

            this.$Grid.on('change', function () {
                this.$syncSlotsFromGrid();
            }.bind(this));
        },

        $syncSlotsFromGrid: function () {
            if (!this.$GridContainer) {
                return;
            }

            const slots = [];

            this.$GridContainer.getElements('.grid-stack-item').forEach(function (Item) {
                if (!Item.gridstackNode) {
                    return;
                }

                slots.push(this.$normalizeSlot({
                    id: Item.gridstackNode.id || Item.get('gs-id') || Item.getAttribute('gs-id'),
                    x: Item.gridstackNode.x,
                    y: Item.gridstackNode.y,
                    w: Item.gridstackNode.w,
                    h: Item.gridstackNode.h
                }, slots.length));
            }.bind(this));

            this.$document.breakpoints.desktop.slots = slots.sort(this.$compareSlots);
            this.$updateMobileOrder();
            this.$update();
        },

        $changePreset: function (presetId) {
            presetId = this.$normalizeLayoutValue(presetId);

            if (presetId === this.$document.preset) {
                this.$syncLayoutInput();
                return;
            }

            const applyPreset = function () {
                this.$document = this.$createDocumentFromPreset(presetId, this.$document);
                this.$selectedSlotId = this.$getDesktopSlots().length
                    ? this.$getDesktopSlots()[0].id
                    : '';
                this.$render();
                this.$update();
            }.bind(this);

            if (!this.$hasAreaContent()) {
                applyPreset();
                return;
            }

            new QUIConfirm({
                icon: 'fa fa-columns',
                title: QUILocale.get(lg, 'brick.multiLayout.presetChange.title'),
                information: QUILocale.get(lg, 'brick.multiLayout.presetChange.information'),
                text: QUILocale.get(lg, 'brick.multiLayout.presetChange.text'),
                events: {
                    onSubmit: applyPreset
                }
            }).open();
        },

        $addSlot: function () {
            const nextId = this.$createNextSlotId();
            const index = this.$getDesktopSlots().length;
            const defaultSlotWidth = this.$getDefaultSlotWidth();
            const nextPosition = this.$findNextSlotPosition(defaultSlotWidth, 1);

            this.$document.breakpoints.desktop.slots.push(this.$normalizeSlot({
                id: nextId,
                x: nextPosition.x,
                y: nextPosition.y,
                w: defaultSlotWidth,
                h: 1
            }, index));

            this.$document.areas[nextId] = this.$normalizeArea({}, index, nextId);
            this.$selectedSlotId = nextId;
            this.$updateMobileOrder();
            this.$render();
            this.$update();
        },

        $removeSlot: function (slotId) {
            const slots = this.$getDesktopSlots().filter(function (slot) {
                return slot.id !== slotId;
            });

            if (!slots.length) {
                return;
            }

            this.$document.breakpoints.desktop.slots = slots;
            delete this.$document.areas[slotId];
            this.$selectedSlotId = slots[0].id;
            this.$updateMobileOrder();
            this.$render();
            this.$update();
        },

        $destroyGrid: function () {
            if (this.$Grid && typeof this.$Grid.destroy === 'function') {
                this.$Grid.destroy(false);
            }

            this.$Grid = null;
            this.$GridContainer = null;
        },

        $destroyAreaControls: function () {
            this.$AreaControls.forEach(function (Control) {
                if (Control && 'destroy' in Control) {
                    Control.destroy();
                }
            });

            this.$AreaControls = [];
        },

        $applyProjectToChildControls: function () {
            this.$AreaControls.forEach(function (Control) {
                if (Control && 'setProject' in Control) {
                    Control.setProject(this.$Project);
                }
            }.bind(this));
        },

        $refreshSelection: function () {
            this.$AreaControls.forEach(function (Control) {
                if (Control && 'setSelected' in Control) {
                    Control.setSelected(
                        'getSlotId' in Control && Control.getSlotId() === this.$selectedSlotId
                    );
                }
            }.bind(this));
        },

        $update: function () {
            this.$Input.value = JSON.encode(this.$document);
        },

        $parseValue: function (value) {
            if (!value) {
                return null;
            }

            try {
                return JSON.decode(value);
            } catch (e) {
                return null;
            }
        },

        $normalizeDocument: function (value) {
            const preset = this.$getPreset(this.$normalizeLayoutValue(
                value && value.preset ? value.preset : null
            ));
            const sourceColumns = value && !isNaN(parseInt(value.columns, 10))
                ? parseInt(value.columns, 10)
                : preset.columns;
            const slotsSource = value
                && value.breakpoints
                && value.breakpoints.desktop
                && typeOf(value.breakpoints.desktop.slots) === 'array'
                ? value.breakpoints.desktop.slots
                : preset.slots;
            const areasSource = value && typeOf(value.areas) === 'object' ? value.areas : {};
            const slots = this.$normalizeSlots(slotsSource, sourceColumns, preset.columns);
            const areas = {};

            slots.forEach(function (slot, index) {
                let sourceArea = null;

                if (areasSource[slot.id] && typeOf(areasSource[slot.id]) === 'object') {
                    sourceArea = areasSource[slot.id];
                }

                areas[slot.id] = this.$normalizeArea(sourceArea || {}, index, slot.id);
            }.bind(this));

            const documentData = {
                preset: preset.id,
                columns: preset.columns,
                breakpoints: {
                    desktop: {
                        slots: slots.sort(this.$compareSlots)
                    },
                    tablet: {
                        mode: 'inherit'
                    },
                    mobile: {
                        mode: 'stack',
                        order: []
                    }
                },
                areas: areas
            };

            documentData.breakpoints.mobile.order = this.$buildMobileOrder(documentData);

            return documentData;
        },

        $createDocumentFromPreset: function (presetId, previousDocument) {
            const preset = this.$getPreset(presetId);
            const nextDocument = this.$normalizeDocument({
                preset: preset.id,
                columns: preset.columns,
                breakpoints: {
                    desktop: {
                        slots: preset.slots
                    }
                },
                areas: {}
            });
            const previousSlots = this.$getOrderedSlotsFromDocument(previousDocument);

            this.$getOrderedSlotsFromDocument(nextDocument).forEach(function (slot, index) {
                const sameSlotArea = previousDocument.areas[slot.id];
                const mappedSlot = previousSlots[index];
                const mappedArea = mappedSlot && previousDocument.areas[mappedSlot.id]
                    ? previousDocument.areas[mappedSlot.id]
                    : null;

                nextDocument.areas[slot.id] = this.$normalizeArea(
                    sameSlotArea || mappedArea || {},
                    index,
                    slot.id
                );
            }.bind(this));

            nextDocument.breakpoints.mobile.order = this.$buildMobileOrder(nextDocument);

            return nextDocument;
        },

        $normalizeLayoutValue: function (layout) {
            const found = this.$getPresets().some(function (preset) {
                return preset.id === layout;
            });

            return found ? layout : this.$getDefaultPresetId();
        },

        $normalizeSlots: function (slots, sourceColumns, targetColumns) {
            const normalized = [];
            const used = {};
            sourceColumns = parseInt(sourceColumns, 10) || DEFAULT_COLUMNS;
            targetColumns = parseInt(targetColumns, 10) || sourceColumns;

            if (typeOf(slots) !== 'array') {
                slots = this.$getPreset(this.$getDefaultPresetId()).slots;
            }

            slots.forEach(function (slot, index) {
                slot = this.$normalizeSlot(slot, index, sourceColumns, targetColumns);

                if (used[slot.id]) {
                    slot.id = this.$createUniqueSlotId(used);
                }

                used[slot.id] = true;
                normalized.push(slot);
            }.bind(this));

            return normalized.length
                ? normalized
                : this.$getPreset(this.$getDefaultPresetId()).slots.map(function (slot, index) {
                    return this.$normalizeSlot(slot, index, targetColumns, targetColumns);
                }.bind(this));
        },

        $normalizeSlot: function (slot, index, sourceColumns, targetColumns) {
            slot = typeOf(slot) === 'object' ? slot : {};
            sourceColumns = parseInt(sourceColumns, 10) || DEFAULT_COLUMNS;
            targetColumns = parseInt(targetColumns, 10) || sourceColumns;

            let width = parseInt(slot.w, 10);
            let height = parseInt(slot.h, 10);
            let x = parseInt(slot.x, 10);
            let y = parseInt(slot.y, 10);

            if (isNaN(width) || width < 1) {
                width = 1;
            }

            if (isNaN(height) || height < 1) {
                height = 1;
            }

            if (sourceColumns !== targetColumns) {
                const ratio = targetColumns / sourceColumns;

                width = Math.max(1, Math.round(width * ratio));
                x = isNaN(x) ? 0 : Math.round(x * ratio);
            }

            width = Math.min(targetColumns, width);
            x = isNaN(x) || x < 0 ? 0 : Math.min(targetColumns - width, x);
            y = isNaN(y) || y < 0 ? index : y;

            return {
                id: slot.id ? slot.id.toString() : 'slot-' + (index + 1),
                x: x,
                y: y,
                w: width,
                h: height
            };
        },

        $normalizeArea: function (area, index) {
            area = typeOf(area) === 'object' ? area : {};

            let mode = area.mode;

            if ([MODE_EDITOR, MODE_BRICK, MODE_IMAGE].indexOf(mode) === -1) {
                mode = MODE_EDITOR;
            }

            let mobileOrder = parseInt(area.mobileOrder, 10);

            if (isNaN(mobileOrder) || mobileOrder < 1) {
                mobileOrder = index + 1;
            }

            let imageFit = area.imageFit;

            if ([IMAGE_FIT_AUTO, IMAGE_FIT_COVER, IMAGE_FIT_CONTAIN].indexOf(imageFit) === -1) {
                imageFit = IMAGE_FIT_AUTO;
            }

            let verticalAlign = area.verticalAlign;

            if ([VERTICAL_ALIGN_TOP, VERTICAL_ALIGN_CENTER, VERTICAL_ALIGN_BOTTOM].indexOf(verticalAlign) === -1) {
                verticalAlign = VERTICAL_ALIGN_CENTER;
            }

            let backgroundImageFit = area.backgroundImageFit;

            if ([IMAGE_FIT_AUTO, IMAGE_FIT_COVER, IMAGE_FIT_CONTAIN].indexOf(backgroundImageFit) === -1) {
                backgroundImageFit = IMAGE_FIT_COVER;
            }

            let backgroundImagePosition = area.backgroundImagePosition;

            if (
                [
                    BACKGROUND_POSITION_CENTER,
                    BACKGROUND_POSITION_TOP,
                    BACKGROUND_POSITION_BOTTOM,
                    BACKGROUND_POSITION_LEFT,
                    BACKGROUND_POSITION_RIGHT
                ].indexOf(backgroundImagePosition) === -1
            ) {
                backgroundImagePosition = BACKGROUND_POSITION_CENTER;
            }

            let backgroundColorOpacity = parseInt(area.backgroundColorOpacity, 10);

            if (isNaN(backgroundColorOpacity)) {
                backgroundColorOpacity = 100;
            }

            backgroundColorOpacity = Math.max(0, Math.min(100, backgroundColorOpacity));

            return {
                title: area.title || QUILocale.get(lg, 'brick.multiLayout.area.label', {
                    number: index + 1
                }),
                mode: mode,
                contentPadding: area.contentPadding !== false,
                content: area.content || '',
                brickId: area.brickId ? parseInt(area.brickId, 10) || 0 : 0,
                brickTitle: area.brickTitle || '',
                brickType: area.brickType || '',
                image: area.image || '',
                imageFit: imageFit,
                imageMaxWidth: area.imageMaxWidth ? area.imageMaxWidth.toString().trim() : '',
                backgroundEnabled: !!area.backgroundEnabled,
                backgroundImage: area.backgroundImage || '',
                backgroundImageFit: backgroundImageFit,
                backgroundImagePosition: backgroundImagePosition,
                backgroundColorEnabled: !!area.backgroundColorEnabled,
                backgroundColor: area.backgroundColor || '#000000',
                backgroundColorOpacity: backgroundColorOpacity,
                textColor: area.textColor ? area.textColor.toString().trim() : '',
                verticalAlign: verticalAlign,
                mobileOrder: mobileOrder
            };
        },

        $buildMobileOrder: function (documentData) {
            return this.$getOrderedSlotsFromDocument(documentData).sort(function (slotA, slotB) {
                const areaA = documentData.areas[slotA.id] || {};
                const areaB = documentData.areas[slotB.id] || {};

                if (areaA.mobileOrder === areaB.mobileOrder) {
                    return this.$compareSlots(slotA, slotB);
                }

                return (areaA.mobileOrder || 0) - (areaB.mobileOrder || 0);
            }.bind(this)).map(function (slot) {
                return slot.id;
            });
        },

        $updateMobileOrder: function () {
            this.$document.breakpoints.mobile.order = this.$buildMobileOrder(this.$document);
        },

        $getSlotGridStyles: function (slot) {
            return {
                gridColumn: (slot.x + 1) + ' / span ' + slot.w,
                gridRow: (slot.y + 1) + ' / span ' + slot.h
            };
        },

        $hasAreaContent: function () {
            return this.$getDesktopSlots().some(function (slot) {
                const area = this.$document.areas[slot.id];

                if (!area) {
                    return false;
                }

                return !!(
                    (area.content && area.content.trim())
                    || area.brickId
                    || area.image
                );
            }.bind(this));
        },

        $getPreset: function (presetId) {
            let found = this.$getPresets().filter(function (preset) {
                return preset.id === presetId;
            })[0];

            if (!found) {
                found = this.$getPresets()[0];
            }

            return {
                id: found.id,
                labelKey: found.labelKey,
                columns: found.columns,
                defaultSlotWidth: found.defaultSlotWidth,
                slots: found.slots.map(function (slot, index) {
                    return this.$normalizeSlot(slot, index, found.columns);
                }.bind(this))
            };
        },

        $getDefaultSlotWidth: function () {
            const preset = this.$getPreset(this.$document && this.$document.preset);
            let width = parseInt(preset.defaultSlotWidth, 10);
            const columns = parseInt(this.$document && this.$document.columns, 10) || DEFAULT_COLUMNS;

            if (isNaN(width) || width < 1) {
                width = columns;
            }

            return Math.max(1, Math.min(columns, width));
        },

        $getDesktopSlots: function () {
            if (!this.$document
                || !this.$document.breakpoints
                || !this.$document.breakpoints.desktop
                || typeOf(this.$document.breakpoints.desktop.slots) !== 'array'
            ) {
                return [];
            }

            return this.$document.breakpoints.desktop.slots;
        },

        $getOrderedDesktopSlots: function () {
            return this.$getDesktopSlots().slice().sort(this.$compareSlots);
        },

        $getOrderedSlotsFromDocument: function (documentData) {
            if (!documentData
                || !documentData.breakpoints
                || !documentData.breakpoints.desktop
                || typeOf(documentData.breakpoints.desktop.slots) !== 'array'
            ) {
                return [];
            }

            return documentData.breakpoints.desktop.slots.slice().sort(this.$compareSlots);
        },

        $compareSlots: function (slotA, slotB) {
            if (slotA.y === slotB.y) {
                if (slotA.x === slotB.x) {
                    return slotA.id.localeCompare(slotB.id);
                }

                return slotA.x - slotB.x;
            }

            return slotA.y - slotB.y;
        },

        $createUniqueSlotId: function (used) {
            let counter = 1;
            let slotId = 'slot-' + counter;

            while (used[slotId]) {
                counter++;
                slotId = 'slot-' + counter;
            }

            return slotId;
        },

        $createNextSlotId: function () {
            const used = {};

            this.$getDesktopSlots().forEach(function (slot) {
                used[slot.id] = true;
            });

            return this.$createUniqueSlotId(used);
        },

        $getNextSlotY: function () {
            let maxY = 0;

            this.$getDesktopSlots().forEach(function (slot) {
                maxY = Math.max(maxY, slot.y + slot.h);
            });

            return maxY;
        },

        $findNextSlotPosition: function (width, height) {
            const columns = parseInt(this.$document && this.$document.columns, 10) || DEFAULT_COLUMNS;
            const slots = this.$getDesktopSlots();
            let pointer = 0;

            width = Math.max(1, Math.min(columns, parseInt(width, 10) || 1));
            height = Math.max(1, parseInt(height, 10) || 1);

            while (true) {
                const x = pointer % columns;
                const y = Math.floor(pointer / columns);

                if (x + width > columns) {
                    pointer = (y + 1) * columns;
                    continue;
                }

                if (this.$isSlotAreaFree(x, y, width, height, slots)) {
                    return {
                        x: x,
                        y: y
                    };
                }

                pointer++;
            }
        },

        $isSlotAreaFree: function (x, y, width, height, slots) {
            return !slots.some(function (slot) {
                return !(
                    y >= slot.y + slot.h
                    || y + height <= slot.y
                    || x + width <= slot.x
                    || x >= slot.x + slot.w
                );
            });
        },

        $getSlotIndex: function (slotId) {
            const slots = this.$getOrderedDesktopSlots();

            for (let i = 0, len = slots.length; i < len; i++) {
                if (slots[i].id === slotId) {
                    return i;
                }
            }

            return -1;
        }
    });
});
