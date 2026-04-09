define('package/quiqqer/bricks/bin/Controls/backend/MultiLayoutSettings', [

    'qui/controls/Control',
    'Locale',
    'Projects',
    'package/quiqqer/bricks/bin/Controls/backend/BlockSlot',

    'css!package/quiqqer/bricks/bin/Controls/backend/MultiLayoutSettings.css'

], function (QUIControl, QUILocale, Projects, BlockSlot) {
    "use strict";

    const lg = 'quiqqer/bricks';
    const MODE_EDITOR = 'editor';
    const MODE_BRICK = 'brick';
    const MODE_IMAGE = 'image';
    const LAYOUT_TWO = 'grid-2-equal';
    const LAYOUT_FOUR = 'grid-2x2';
    const LEGACY_LAYOUT_TWO = '2-chamber';
    const LEGACY_LAYOUT_FOUR = '4-chamber';
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

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Controls/MultiLayoutSettings',

        Binds: [
            '$onImport',
            '$onLayoutChange',
            '$onAreaChange'
        ],

        initialize: function (options) {
            this.parent(options);

            this.$AreaControls = [];
            this.$Input = null;
            this.$Elm = null;
            this.$Container = null;
            this.$LayoutInput = null;
            this.$Project = null;
            this.$data = [];
            this.$HelperContainer = null;

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

            this.$Container = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-container'
            }).inject(this.$Elm);

            this.$HelperContainer = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-helper'
            }).inject(this.$Elm);

            this.$data = this.$parseValue(this.$Input.value);
            this.$attachLayoutInput();
            this.$render();
            this.$update();
        },

        setProject: function (Project) {
            if (typeOf(Project) === 'string') {
                Project = Projects.get(Project);
            }

            this.$Project = Project;
            this.$applyProjectToChildControls();
        },

        $attachLayoutInput: function () {
            const Form = this.$Elm.getParent('form');

            if (!Form || !Form.elements.layout) {
                return;
            }

            this.$LayoutInput = document.id(Form.elements.layout);
            this.$LayoutInput.value = this.$normalizeLayoutValue(this.$LayoutInput.value);
            this.$LayoutInput.removeEvent('change', this.$onLayoutChange);
            this.$LayoutInput.addEvent('change', this.$onLayoutChange);
        },

        $onLayoutChange: function () {
            this.$render();
            this.$update();
        },

        $onAreaChange: function (Control, area, index) {
            this.$data[index] = this.$normalizeArea(area, index);
            this.$update();
            this.$render();
        },

        $getLayout: function () {
            if (!this.$LayoutInput) {
                return LAYOUT_TWO;
            }

            const value = this.$normalizeLayoutValue(this.$LayoutInput.value);

            return value === LAYOUT_FOUR ? LAYOUT_FOUR : LAYOUT_TWO;
        },

        $normalizeLayoutValue: function (layout) {
            if (layout === LEGACY_LAYOUT_FOUR) {
                return LAYOUT_FOUR;
            }

            if (layout === LEGACY_LAYOUT_TWO) {
                return LAYOUT_TWO;
            }

            return layout === LAYOUT_FOUR ? LAYOUT_FOUR : LAYOUT_TWO;
        },

        $getAreaCount: function () {
            return this.$getLayout() === LAYOUT_FOUR ? 4 : 2;
        },

        $parseValue: function (value) {
            if (!value) {
                return [];
            }

            try {
                value = JSON.decode(value);
            } catch (e) {
                return [];
            }

            if (typeOf(value) !== 'array') {
                return [];
            }

            return value.map(function (area, index) {
                return this.$normalizeArea(area, index);
            }.bind(this));
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
                backgroundColor: area.backgroundColor || '',
                backgroundColorOpacity: backgroundColorOpacity,
                textColor: area.textColor ? area.textColor.toString().trim() : '',
                verticalAlign: verticalAlign,
                mobileOrder: mobileOrder
            };
        },

        $getAreaData: function (index) {
            if (!this.$data[index]) {
                this.$data[index] = this.$normalizeArea({}, index);
            }

            return this.$data[index];
        },

        $render: function () {
            if (!this.$Container) {
                return;
            }

            this.$destroyAreaControls();
            this.$Container.empty();
            this.$Container.set('data-layout', this.$getLayout());

            new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-description',
                text: QUILocale.get(lg, 'brick.multiLayout.settings.description')
            }).inject(this.$Container);

            for (let i = 0, len = this.$getAreaCount(); i < len; i++) {
                const AreaControl = new BlockSlot({
                    area: this.$getAreaData(i),
                    helperContainer: this.$HelperContainer,
                    index: i,
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
                }).inject(this.$Container);

                if (this.$Project) {
                    AreaControl.setProject(this.$Project);
                }

                this.$AreaControls.push(AreaControl);
            }
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

        $update: function () {
            const maxAreas = this.$getAreaCount();
            const data = [];

            for (let i = 0; i < maxAreas; i++) {
                data.push(this.$normalizeArea(this.$getAreaData(i), i));
            }

            this.$Input.value = JSON.encode(data);
        }
    });
});
