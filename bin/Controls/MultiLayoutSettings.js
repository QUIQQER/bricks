define('package/quiqqer/bricks/bin/Controls/MultiLayoutSettings', [

    'qui/QUI',
    'qui/controls/Control',
    'qui/controls/elements/ColorPicker',
    'qui/controls/windows/Confirm',
    'Locale',
    'Projects',
    'package/quiqqer/bricks/bin/Controls/backend/BrickSelectWindow',

    'css!package/quiqqer/bricks/bin/Controls/MultiLayoutSettings.css'

], function (QUI, QUIControl, QUIColorPicker, QUIConfirm, QUILocale, Projects, BrickSelectWindow) {
    "use strict";

    const lg = 'quiqqer/bricks';
    const MODE_EDITOR = 'editor';
    const MODE_BRICK = 'brick';
    const MODE_IMAGE = 'image';
    const LAYOUT_TWO = '2-chamber';
    const LAYOUT_FOUR = '4-chamber';
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
            '$onLayoutChange'
        ],

        initialize: function (options) {
            this.parent(options);

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
            this.$LayoutInput.removeEvent('change', this.$onLayoutChange);
            this.$LayoutInput.addEvent('change', this.$onLayoutChange);
        },

        $onLayoutChange: function () {
            this.$render();
            this.$update();
        },

        $getLayout: function () {
            if (!this.$LayoutInput) {
                return LAYOUT_TWO;
            }

            const value = this.$LayoutInput.value;

            return value === LAYOUT_FOUR ? LAYOUT_FOUR : LAYOUT_TWO;
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

            this.$Container.empty();
            this.$Container.set('data-layout', this.$getLayout());

            new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-description',
                text: QUILocale.get(lg, 'brick.multiLayout.settings.description')
            }).inject(this.$Container);

            for (let i = 0, len = this.$getAreaCount(); i < len; i++) {
                this.$createAreaCard(i).inject(this.$Container);
            }

            this.$applyProjectToChildControls();
        },

        $createAreaCard: function (index) {
            const area = this.$getAreaData(index);
            const Card = new Element('section', {
                'class': 'quiqqer-bricks-multiLayout-settings-card'
            });

            const Header = new Element('header', {
                'class': 'quiqqer-bricks-multiLayout-settings-cardHeader'
            }).inject(Card);

            new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-cardTitle',
                text: area.title
            }).inject(Header);

            new Element('span', {
                'class': 'quiqqer-bricks-multiLayout-settings-cardMode',
                text: this.$getModeLabel(area.mode)
            }).inject(Header);

            if (area.backgroundColorEnabled) {
                new Element('span', {
                    'class': 'quiqqer-bricks-multiLayout-settings-cardBadge',
                    text: QUILocale.get(lg, 'brick.multiLayout.backgroundColor.badge')
                }).inject(Header);
            }

            const Preview = new Element('button', {
                type: 'button',
                'class': 'quiqqer-bricks-multiLayout-settings-preview',
                events: {
                    click: this.$openQuickEdit.bind(this, index)
                }
            }).inject(Card);

            this.$fillPreview(Preview, area);

            const Footer = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-cardFooter'
            }).inject(Card);

            new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-cardInfo',
                text: QUILocale.get(lg, 'brick.multiLayout.mobileOrder.info', {
                    number: area.mobileOrder
                })
            }).inject(Footer);

            const Actions = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-cardActions'
            }).inject(Footer);

            new Element('button', {
                type: 'button',
                'class': 'quiqqer-bricks-multiLayout-settings-cardAction',
                html: '<span class="fa fa-cog"></span><span>' +
                    QUILocale.get(lg, 'brick.multiLayout.settings.button') + '</span>',
                title: QUILocale.get(lg, 'brick.multiLayout.settings.button'),
                events: {
                    click: this.$openSettingsPopup.bind(this, index)
                }
            }).inject(Actions);

            if (this.$canRemoveAreaContent(area)) {
                new Element('button', {
                    type: 'button',
                    'class': 'quiqqer-bricks-multiLayout-settings-cardAction quiqqer-bricks-multiLayout-settings-cardAction--danger',
                    html: '<span class="fa fa-times"></span><span>' +
                        QUILocale.get(lg, 'brick.multiLayout.remove.button') + '</span>',
                    title: QUILocale.get(lg, 'brick.multiLayout.remove.button'),
                    events: {
                        click: this.$confirmRemoveAreaContent.bind(this, index)
                    }
                }).inject(Actions);
            }

            return Card;
        },

        $fillPreview: function (Preview, area) {
            Preview.empty();
            Preview.set('data-mode', area.mode);
            Preview.set('title', QUILocale.get(lg, 'brick.multiLayout.quickEdit.title', {
                mode: this.$getModeLabel(area.mode)
            }));

            switch (area.mode) {
                case MODE_BRICK:
                    this.$fillBrickPreview(Preview, area);
                    break;

                case MODE_IMAGE:
                    this.$fillImagePreview(Preview, area);
                    break;

                case MODE_EDITOR:
                default:
                    this.$fillEditorPreview(Preview, area);
            }

            new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-previewHint',
                text: this.$getQuickEditLabel(area.mode)
            }).inject(Preview);
        },

        $fillEditorPreview: function (Preview, area) {
            if (!area.content || !area.content.trim()) {
                this.$createPlaceholder(
                    Preview,
                    'fa fa-align-left',
                    QUILocale.get(lg, 'brick.multiLayout.editor.empty')
                );
                return;
            }

            new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-previewHtml',
                html: area.content
            }).inject(Preview);
        },

        $fillBrickPreview: function (Preview, area) {
            if (!area.brickId && !area.brickTitle) {
                this.$createPlaceholder(
                    Preview,
                    'fa fa-cubes',
                    QUILocale.get(lg, 'brick.multiLayout.brick.empty')
                );
                return;
            }

            const Wrap = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-previewBrick'
            }).inject(Preview);

            new Element('span', {
                'class': 'fa fa-cubes quiqqer-bricks-multiLayout-settings-previewIcon'
            }).inject(Wrap);

            new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-previewBrickTitle',
                text: area.brickTitle || QUILocale.get(lg, 'brick.multiLayout.brick.untitled')
            }).inject(Wrap);

            if (area.brickType) {
                new Element('div', {
                    'class': 'quiqqer-bricks-multiLayout-settings-previewBrickType',
                    text: area.brickType
                }).inject(Wrap);
            }
        },

        $fillImagePreview: function (Preview, area) {
            if (!area.image) {
                this.$createPlaceholder(
                    Preview,
                    'fa fa-picture-o',
                    QUILocale.get(lg, 'brick.multiLayout.image.empty')
                );
                return;
            }

            const Wrap = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-previewImageWrap',
                styles: area.imageMaxWidth ? {
                    maxWidth: area.imageMaxWidth
                } : {}
            }).inject(Preview);

            const Image = new Element('img', {
                'class': 'quiqqer-bricks-multiLayout-settings-previewImage',
                src: area.image,
                alt: area.title
            }).inject(Wrap);

            if (area.imageFit === IMAGE_FIT_COVER) {
                Image.addClass('quiqqer-bricks-multiLayout-settings-previewImage--cover');
            } else if (area.imageFit === IMAGE_FIT_CONTAIN) {
                Image.addClass('quiqqer-bricks-multiLayout-settings-previewImage--contain');
            } else {
                Image.addClass('quiqqer-bricks-multiLayout-settings-previewImage--auto');
            }
        },

        $createPlaceholder: function (Parent, iconClass, text) {
            const Placeholder = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-previewPlaceholder'
            }).inject(Parent);

            new Element('span', {
                'class': iconClass + ' quiqqer-bricks-multiLayout-settings-previewPlaceholderIcon'
            }).inject(Placeholder);

            new Element('span', {
                'class': 'quiqqer-bricks-multiLayout-settings-previewPlaceholderText',
                text: text
            }).inject(Placeholder);
        },

        $openQuickEdit: function (index) {
            const area = this.$getAreaData(index);

            switch (area.mode) {
                case MODE_BRICK:
                    this.$openBrickSelect(index);
                    break;

                case MODE_IMAGE:
                    this.$openImageSelect(index);
                    break;

                case MODE_EDITOR:
                default:
                    this.$openEditor(index);
            }
        },

        $openEditor: function (index) {
            const area = this.$getAreaData(index);
            const Holder = new Element('div').inject(this.$HelperContainer);
            const Input = new Element('input', {
                type: 'hidden',
                'data-qui': 'controls/editors/Input',
                value: area.content
            }).inject(Holder);

            QUI.parse(Holder).then(function () {
                const Control = QUI.Controls.getById(Input.get('data-quiid'));

                if (!Control) {
                    Holder.destroy();
                    return;
                }

                if (this.$Project && 'setProject' in Control) {
                    Control.setProject(this.$Project);
                }

                Input.addEvent('change', function () {
                    this.$getAreaData(index).content = Input.value || '';
                    this.$render();
                    this.$update();
                    Holder.destroy();
                }.bind(this));

                Control.open();
            }.bind(this));
        },

        $openBrickSelect: function (index) {
            new BrickSelectWindow({
                project: this.$getProjectName(),
                lang: this.$getProjectLang(),
                autoclose: true,
                events: {
                    submit: function (Win, value) {
                        if (!value || !value.length) {
                            return;
                        }

                        const selected = value[0];
                        const area = this.$getAreaData(index);

                        area.brickId = selected.id ? parseInt(selected.id, 10) || 0 : 0;
                        area.brickTitle = selected.title || selected.name || '';
                        area.brickType = selected.type || '';

                        this.$render();
                        this.$update();
                    }.bind(this)
                }
            }).open();
        },

        $openImageSelect: function (index) {
            const area = this.$getAreaData(index);
            const Holder = new Element('div').inject(this.$HelperContainer);
            const Input = new Element('input', {
                type: 'text',
                'data-qui': 'controls/projects/project/media/Input',
                'data-qui-options-selectable_types': 'image',
                value: area.image
            }).inject(Holder);

            QUI.parse(Holder).then(function () {
                const Control = QUI.Controls.getById(Input.get('data-quiid'));

                if (!Control) {
                    Holder.destroy();
                    return;
                }

                if (this.$Project && 'setProject' in Control) {
                    Control.setProject(this.$Project);
                }

                if ('addEvent' in Control) {
                    Control.addEvent('change', function (ControlInstance, value) {
                        this.$getAreaData(index).image = value || '';
                        this.$render();
                        this.$update();
                        Holder.destroy();
                    }.bind(this));
                }

                if (Control.$MediaButton && 'click' in Control.$MediaButton) {
                    Control.$MediaButton.click();
                    return;
                }

                Holder.destroy();
            }.bind(this));
        },

        $openSettingsPopup: function (index) {
            const area = this.$getAreaData(index);

            new QUIConfirm({
                icon: 'fa fa-cog',
                title: QUILocale.get(lg, 'brick.multiLayout.settings.popup.title', {
                    title: area.title
                }),
                maxWidth: 520,
                maxHeight: 520,
                events: {
                    onOpen: function (Win) {
                        const Content = Win.getContent();

                        Content.set('html', '');
                        Content.addClass('quiqqer-bricks-multiLayout-settings-popup');

                        const Form = new Element('div', {
                            'class': 'quiqqer-bricks-multiLayout-settings-popupForm'
                        }).inject(Content);

                        const ModeField = this.$createPopupSelectField(
                            Form,
                            QUILocale.get(lg, 'brick.multiLayout.mode'),
                            [
                                {
                                    value: MODE_EDITOR,
                                    text: QUILocale.get(lg, 'brick.multiLayout.mode.editor')
                                },
                                {
                                    value: MODE_BRICK,
                                    text: QUILocale.get(lg, 'brick.multiLayout.mode.brick')
                                },
                                {
                                    value: MODE_IMAGE,
                                    text: QUILocale.get(lg, 'brick.multiLayout.mode.image')
                                }
                            ],
                            area.mode
                        );

                        const OrderField = this.$createPopupInputField(Form, {
                            label: QUILocale.get(lg, 'brick.multiLayout.mobileOrder'),
                            type: 'number',
                            value: area.mobileOrder,
                            min: 1,
                            step: 1
                        });

                        this.$createPopupSelectField(
                            Form,
                            QUILocale.get(lg, 'brick.multiLayout.verticalAlign'),
                            [
                                {
                                    value: VERTICAL_ALIGN_TOP,
                                    text: QUILocale.get(lg, 'brick.multiLayout.verticalAlign.top')
                                },
                                {
                                    value: VERTICAL_ALIGN_CENTER,
                                    text: QUILocale.get(lg, 'brick.multiLayout.verticalAlign.center')
                                },
                                {
                                    value: VERTICAL_ALIGN_BOTTOM,
                                    text: QUILocale.get(lg, 'brick.multiLayout.verticalAlign.bottom')
                                }
                            ],
                            area.verticalAlign,
                            'data-name',
                            'verticalAlign'
                        );

                        const BackgroundSettings = this.$createPopupSection(
                            Form,
                            QUILocale.get(lg, 'brick.multiLayout.background.section')
                        );

                        const BackgroundEnabledField = this.$createPopupCheckboxField(
                            BackgroundSettings,
                            QUILocale.get(lg, 'brick.multiLayout.background.enabled'),
                            area.backgroundEnabled,
                            'backgroundEnabled'
                        );

                        const BackgroundOptions = new Element('div', {
                            'class': 'quiqqer-bricks-multiLayout-settings-popupSectionBody'
                        }).inject(BackgroundSettings);

                        this.$createPopupMediaField(BackgroundOptions, {
                            label: QUILocale.get(lg, 'brick.multiLayout.background.image'),
                            value: area.backgroundImage,
                            name: 'backgroundImage'
                        });

                        this.$createPopupSelectField(
                            BackgroundOptions,
                            QUILocale.get(lg, 'brick.multiLayout.background.fit'),
                            [
                                {
                                    value: IMAGE_FIT_COVER,
                                    text: QUILocale.get(lg, 'brick.multiLayout.background.fit.cover')
                                },
                                {
                                    value: IMAGE_FIT_CONTAIN,
                                    text: QUILocale.get(lg, 'brick.multiLayout.background.fit.contain')
                                },
                                {
                                    value: IMAGE_FIT_AUTO,
                                    text: QUILocale.get(lg, 'brick.multiLayout.background.fit.auto')
                                }
                            ],
                            area.backgroundImageFit,
                            'data-name',
                            'backgroundImageFit'
                        );

                        this.$createPopupSelectField(
                            BackgroundOptions,
                            QUILocale.get(lg, 'brick.multiLayout.background.position'),
                            [
                                {
                                    value: BACKGROUND_POSITION_CENTER,
                                    text: QUILocale.get(lg, 'brick.multiLayout.background.position.center')
                                },
                                {
                                    value: BACKGROUND_POSITION_TOP,
                                    text: QUILocale.get(lg, 'brick.multiLayout.background.position.top')
                                },
                                {
                                    value: BACKGROUND_POSITION_BOTTOM,
                                    text: QUILocale.get(lg, 'brick.multiLayout.background.position.bottom')
                                },
                                {
                                    value: BACKGROUND_POSITION_LEFT,
                                    text: QUILocale.get(lg, 'brick.multiLayout.background.position.left')
                                },
                                {
                                    value: BACKGROUND_POSITION_RIGHT,
                                    text: QUILocale.get(lg, 'brick.multiLayout.background.position.right')
                                }
                            ],
                            area.backgroundImagePosition,
                            'data-name',
                            'backgroundImagePosition'
                        );

                        const OverlaySettings = this.$createPopupSection(
                            Form,
                            QUILocale.get(lg, 'brick.multiLayout.backgroundColor.section')
                        );

                        const BackgroundColorEnabledField = this.$createPopupCheckboxField(
                            OverlaySettings,
                            QUILocale.get(lg, 'brick.multiLayout.backgroundColor.enabled'),
                            area.backgroundColorEnabled,
                            'backgroundColorEnabled'
                        );

                        const OverlayOptions = new Element('div', {
                            'class': 'quiqqer-bricks-multiLayout-settings-popupSectionBody'
                        }).inject(OverlaySettings);

                        this.$createPopupColorField(OverlayOptions, {
                            label: QUILocale.get(lg, 'brick.multiLayout.backgroundColor.color'),
                            value: area.backgroundColor,
                            name: 'backgroundColor'
                        });

                        this.$createPopupRangeField(OverlayOptions, {
                            label: QUILocale.get(lg, 'brick.multiLayout.backgroundColor.opacity'),
                            value: area.backgroundColorOpacity,
                            name: 'backgroundColorOpacity',
                            min: 0,
                            max: 100,
                            step: 1
                        });

                        const ImageSettings = this.$createPopupSection(
                            Form,
                            QUILocale.get(lg, 'brick.multiLayout.image.section')
                        );

                        this.$createPopupSelectField(
                            ImageSettings,
                            QUILocale.get(lg, 'brick.multiLayout.image.fit'),
                            [
                                {
                                    value: IMAGE_FIT_AUTO,
                                    text: QUILocale.get(lg, 'brick.multiLayout.image.fit.auto')
                                },
                                {
                                    value: IMAGE_FIT_COVER,
                                    text: QUILocale.get(lg, 'brick.multiLayout.image.fit.cover')
                                },
                                {
                                    value: IMAGE_FIT_CONTAIN,
                                    text: QUILocale.get(lg, 'brick.multiLayout.image.fit.contain')
                                }
                            ],
                            area.imageFit,
                            'data-name',
                            'imageFit'
                        );

                        const MaxWidthField = this.$createPopupInputField(ImageSettings, {
                            label: QUILocale.get(lg, 'brick.multiLayout.image.maxWidth'),
                            type: 'text',
                            value: area.imageMaxWidth,
                            name: 'imageMaxWidth'
                        });

                        new Element('div', {
                            'class': 'quiqqer-bricks-multiLayout-settings-popupHint',
                            text: QUILocale.get(lg, 'brick.multiLayout.image.maxWidth.help')
                        }).inject(MaxWidthField);

                        const toggleImageSettings = function () {
                            ImageSettings.setStyle(
                                'display',
                                ModeField.value === MODE_IMAGE ? '' : 'none'
                            );
                        };

                        const toggleBackgroundSettings = function () {
                            BackgroundOptions.setStyle(
                                'display',
                                BackgroundEnabledField.checked ? '' : 'none'
                            );
                        };

                        const toggleOverlaySettings = function () {
                            OverlayOptions.setStyle(
                                'display',
                                BackgroundColorEnabledField.checked ? '' : 'none'
                            );
                        };

                        ModeField.addEvent('change', toggleImageSettings);
                        BackgroundEnabledField.addEvent('change', toggleBackgroundSettings);
                        BackgroundColorEnabledField.addEvent('change', toggleOverlaySettings);
                        toggleImageSettings();
                        toggleBackgroundSettings();
                        toggleOverlaySettings();

                        QUI.parse(Content).then(function () {
                            this.$applyProjectToControls(Content);
                        }.bind(this));
                    }.bind(this),

                    onSubmit: function (Win) {
                        const Content = Win.getContent();
                        const area = this.$getAreaData(index);
                        const modeField = Content.getElement('select[data-name="mode"]');
                        const orderField = Content.getElement('input[data-name="mobileOrder"]');
                        const verticalAlignField = Content.getElement('select[data-name="verticalAlign"]');
                        const imageFitField = Content.getElement('select[data-name="imageFit"]');
                        const imageMaxWidthField = Content.getElement('input[data-name="imageMaxWidth"]');
                        const backgroundEnabledField = Content.getElement('input[data-name="backgroundEnabled"]');
                        const backgroundImageField = Content.getElement('input[data-name="backgroundImage"]');
                        const backgroundImageFitField = Content.getElement('select[data-name="backgroundImageFit"]');
                        const backgroundImagePositionField = Content.getElement('select[data-name="backgroundImagePosition"]');
                        const backgroundColorEnabledField = Content.getElement('input[data-name="backgroundColorEnabled"]');
                        const backgroundColorField = Content.getElement('input[data-name="backgroundColor"]');
                        const backgroundColorOpacityField = Content.getElement('input[data-name="backgroundColorOpacity"]');
                        const mobileOrder = parseInt(orderField.value, 10);
                        const backgroundColorOpacity = backgroundColorOpacityField
                            ? parseInt(backgroundColorOpacityField.value, 10)
                            : 100;

                        area.mode = modeField ? modeField.value : MODE_EDITOR;
                        area.mobileOrder = isNaN(mobileOrder) || mobileOrder < 1 ? 1 : mobileOrder;
                        area.verticalAlign = verticalAlignField ? verticalAlignField.value : VERTICAL_ALIGN_CENTER;
                        area.imageFit = imageFitField ? imageFitField.value : IMAGE_FIT_AUTO;
                        area.imageMaxWidth = imageMaxWidthField ? imageMaxWidthField.value.trim() : '';
                        area.backgroundEnabled = !!(backgroundEnabledField && backgroundEnabledField.checked);
                        area.backgroundImage = backgroundImageField ? backgroundImageField.value || '' : '';
                        area.backgroundImageFit = backgroundImageFitField ? backgroundImageFitField.value : IMAGE_FIT_COVER;
                        area.backgroundImagePosition = backgroundImagePositionField
                            ? backgroundImagePositionField.value
                            : BACKGROUND_POSITION_CENTER;
                        area.backgroundColorEnabled = !!(backgroundColorEnabledField && backgroundColorEnabledField.checked);
                        area.backgroundColor = backgroundColorField ? backgroundColorField.value || '#000000' : '#000000';
                        area.backgroundColorOpacity = isNaN(backgroundColorOpacity)
                            ? 100
                            : Math.max(0, Math.min(100, backgroundColorOpacity));

                        this.$render();
                        this.$update();
                    }.bind(this)
                }
            }).open();
        },

        $createPopupSelectField: function (Parent, label, options, value, attrName, attrValue) {
            const Field = new Element('label', {
                'class': 'quiqqer-bricks-multiLayout-settings-popupField'
            }).inject(Parent);

            new Element('span', {
                'class': 'quiqqer-bricks-multiLayout-settings-popupLabel',
                text: label
            }).inject(Field);

            const Select = new Element('select', {
                'class': 'quiqqer-bricks-multiLayout-settings-popupSelect'
            }).inject(Field);

            Select.set(attrName || 'data-name', attrValue || 'mode');

            options.forEach(function (entry) {
                new Element('option', {
                    value: entry.value,
                    text: entry.text,
                    selected: value === entry.value
                }).inject(Select);
            });

            return Select;
        },

        $createPopupSection: function (Parent, title) {
            const Section = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-popupSection'
            }).inject(Parent);

            new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-popupSectionTitle',
                text: title
            }).inject(Section);

            return Section;
        },

        $createPopupCheckboxField: function (Parent, label, checked, name) {
            const Field = new Element('label', {
                'class': 'quiqqer-bricks-multiLayout-settings-popupCheckbox'
            }).inject(Parent);

            const Input = new Element('input', {
                type: 'checkbox'
            }).inject(Field);

            Input.set('data-name', name);

            if (checked) {
                Input.checked = true;
            }

            new Element('span', {
                text: label
            }).inject(Field);

            return Input;
        },

        $createPopupInputField: function (Parent, options) {
            const Field = new Element('label', {
                'class': 'quiqqer-bricks-multiLayout-settings-popupField'
            }).inject(Parent);

            new Element('span', {
                'class': 'quiqqer-bricks-multiLayout-settings-popupLabel',
                text: options.label
            }).inject(Field);

            const Input = new Element('input', {
                type: options.type || 'text',
                'class': 'quiqqer-bricks-multiLayout-settings-popupInput',
                value: options.value !== undefined ? options.value : ''
            }).inject(Field);

            Input.set('data-name', options.name || 'mobileOrder');

            if (options.min !== undefined) {
                Input.set('min', options.min);
            }

            if (options.step) {
                Input.set('step', options.step);
            }

            if (options.max !== undefined) {
                Input.set('max', options.max);
            }

            return Field;
        },

        $createPopupColorField: function (Parent, options) {
            const Field = this.$createPopupInputField(Parent, {
                label: options.label,
                type: 'color',
                value: options.value,
                name: options.name
            });

            const Input = Field.getElement('input[data-name="' + (options.name || '') + '"]');

            if (Input) {
                new QUIColorPicker().imports(Input);
            }

            return Field;
        },

        $createPopupRangeField: function (Parent, options) {
            const Field = new Element('label', {
                'class': 'quiqqer-bricks-multiLayout-settings-popupField quiqqer-bricks-multiLayout-settings-popupField--range'
            }).inject(Parent);

            const Header = new Element('div', {
                'class': 'quiqqer-bricks-multiLayout-settings-popupFieldHeader'
            }).inject(Field);

            new Element('span', {
                'class': 'quiqqer-bricks-multiLayout-settings-popupLabel',
                text: options.label
            }).inject(Header);

            const Value = new Element('span', {
                'class': 'quiqqer-bricks-multiLayout-settings-popupRangeValue'
            }).inject(Header);

            const Input = new Element('input', {
                type: 'range',
                'class': 'quiqqer-bricks-multiLayout-settings-popupInput',
                value: options.value !== undefined ? options.value : ''
            }).inject(Field);

            Input.set('data-name', options.name || 'range');

            if (options.min !== undefined) {
                Input.set('min', options.min);
            }

            if (options.step) {
                Input.set('step', options.step);
            }

            if (options.max !== undefined) {
                Input.set('max', options.max);
            }

            const updateValue = function () {
                Value.set('text', Input.value);
            };

            Input.addEvent('input', updateValue);
            Input.addEvent('change', updateValue);
            updateValue();

            return Field;
        },

        $createPopupMediaField: function (Parent, options) {
            const Field = new Element('label', {
                'class': 'quiqqer-bricks-multiLayout-settings-popupField'
            }).inject(Parent);

            new Element('span', {
                'class': 'quiqqer-bricks-multiLayout-settings-popupLabel',
                text: options.label
            }).inject(Field);

            const Input = new Element('input', {
                type: 'text',
                'class': 'quiqqer-bricks-multiLayout-settings-popupInput',
                'data-qui': 'controls/projects/project/media/Input',
                'data-qui-options-selectable_types': 'image',
                value: options.value || ''
            }).inject(Field);

            Input.set('data-name', options.name || 'backgroundImage');

            return Field;
        },

        $canRemoveAreaContent: function (area) {
            if (area.mode === MODE_BRICK) {
                return !!(area.brickId || area.brickTitle);
            }

            if (area.mode === MODE_IMAGE) {
                return !!area.image;
            }

            return false;
        },

        $removeAreaContent: function (index) {
            const area = this.$getAreaData(index);

            if (area.mode === MODE_BRICK) {
                area.brickId = 0;
                area.brickTitle = '';
                area.brickType = '';
            }

            if (area.mode === MODE_IMAGE) {
                area.image = '';
            }

            this.$render();
            this.$update();
        },

        $confirmRemoveAreaContent: function (index) {
            const area = this.$getAreaData(index);

            new QUIConfirm({
                icon: 'fa fa-times',
                title: QUILocale.get(lg, 'brick.multiLayout.remove.popup.title', {
                    title: area.title
                }),
                information: QUILocale.get(lg, 'brick.multiLayout.remove.popup.information'),
                text: QUILocale.get(lg, 'brick.multiLayout.remove.popup.text', {
                    mode: this.$getModeLabel(area.mode)
                }),
                events: {
                    onSubmit: function () {
                        this.$removeAreaContent(index);
                    }.bind(this)
                }
            }).open();
        },

        $getModeLabel: function (mode) {
            switch (mode) {
                case MODE_BRICK:
                    return QUILocale.get(lg, 'brick.multiLayout.mode.brick');

                case MODE_IMAGE:
                    return QUILocale.get(lg, 'brick.multiLayout.mode.image');

                case MODE_EDITOR:
                default:
                    return QUILocale.get(lg, 'brick.multiLayout.mode.editor');
            }
        },

        $getQuickEditLabel: function (mode) {
            switch (mode) {
                case MODE_BRICK:
                    return QUILocale.get(lg, 'brick.multiLayout.quickEdit.brick');

                case MODE_IMAGE:
                    return QUILocale.get(lg, 'brick.multiLayout.quickEdit.image');

                case MODE_EDITOR:
                default:
                    return QUILocale.get(lg, 'brick.multiLayout.quickEdit.editor');
            }
        },

        $applyProjectToChildControls: function () {
            this.$applyProjectToControls(this.$Elm);
        },

        $applyProjectToControls: function (Elm) {
            if (!Elm || !this.$Project) {
                return;
            }

            const controls = QUI.Controls.getControlsInElement(Elm);

            controls.each(function (Control) {
                if (Control === this) {
                    return;
                }

                if ('setProject' in Control) {
                    Control.setProject(this.$Project);
                }
            }.bind(this));
        },

        $getProjectName: function () {
            if (!this.$Project || !('getName' in this.$Project)) {
                return '';
            }

            return this.$Project.getName();
        },

        $getProjectLang: function () {
            if (!this.$Project || !('getLang' in this.$Project)) {
                return '';
            }

            return this.$Project.getLang();
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
