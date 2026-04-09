define('package/quiqqer/bricks/bin/Controls/backend/BlockSlot', [

    'qui/QUI',
    'qui/controls/Control',
    'qui/controls/elements/ColorPicker',
    'qui/controls/windows/Confirm',
    'Locale',
    'package/quiqqer/bricks/bin/Controls/backend/BrickSelectWindow',

    'css!package/quiqqer/bricks/bin/Controls/backend/BlockSlot.css'

], function (QUI, QUIControl, QUIColorPicker, QUIConfirm, QUILocale, BrickSelectWindow) {
    "use strict";

    const lg = 'quiqqer/bricks';
    const localePrefix = 'blockSlot.';
    const MODE_EDITOR = 'editor';
    const MODE_BRICK = 'brick';
    const MODE_IMAGE = 'image';
    const DEFAULT_ALLOWED_MODES = [MODE_EDITOR, MODE_BRICK, MODE_IMAGE];
    const DEFAULT_SETTINGS_VISIBILITY = {
        contentPadding: true,
        mobileOrder: true,
        verticalAlign: true,
        background: true,
        backgroundColor: true,
        textColor: true,
        image: true
    };
    const IMAGE_FIT_AUTO = 'auto';
    const IMAGE_FIT_COVER = 'cover';
    const IMAGE_FIT_CONTAIN = 'contain';
    const BACKGROUND_POSITION_CENTER = 'center center';
    const BACKGROUND_POSITION_TOP = 'center top';
    const BACKGROUND_POSITION_BOTTOM = 'center bottom';
    const BACKGROUND_POSITION_LEFT = 'left center';
    const BACKGROUND_POSITION_RIGHT = 'right center';
    const VERTICAL_ALIGN_CENTER = 'center';

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Controls/backend/BlockSlot',

        Binds: [
            '$onChange'
        ],

        options: {
            area: null,
            helperContainer: null,
            index: 0,
            allowedModes: DEFAULT_ALLOWED_MODES,
            allowModeSwitch: true,
            settingsVisibility: null
        },

        initialize: function (options) {
            this.parent(options);

            this.$area = this.getAttribute('area') || {};
            this.$helperContainer = this.getAttribute('helperContainer') || null;
            this.$index = this.getAttribute('index') || 0;
            this.$Project = null;
            this.$allowedModes = this.$normalizeAllowedModes(this.getAttribute('allowedModes'));
            this.$allowModeSwitch = this.getAttribute('allowModeSwitch') !== false;
            this.$settingsVisibility = this.$normalizeSettingsVisibility(
                this.getAttribute('settingsVisibility')
            );

            this.$ensureAreaMode();
        },

        create: function () {
            this.$Elm = new Element('section', {
                'class': 'quiqqer-bricks-blockSlot-card'
            });

            this.$render();

            return this.$Elm;
        },

        setProject: function (Project) {
            this.$Project = Project;
            this.$applyProjectToControls(this.$Elm);
        },

        setArea: function (area, index) {
            this.$area = area || {};
            this.$index = typeof index === 'number' ? index : this.$index;
            this.$ensureAreaMode();
            this.$render();
        },

        $render: function () {
            if (!this.$Elm) {
                return;
            }

            const area = this.$area;
            const activeMode = this.$getActiveMode(area);

            this.$Elm.empty();

            const Header = new Element('header', {
                'class': 'quiqqer-bricks-blockSlot-cardHeader'
            }).inject(this.$Elm);

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-cardTitle',
                text: area.title || ''
            }).inject(Header);

            new Element('span', {
                'class': 'quiqqer-bricks-blockSlot-cardMode',
                text: this.$getModeLabel(activeMode)
            }).inject(Header);

            const PreviewButton = new Element('button', {
                type: 'button',
                'class': 'quiqqer-bricks-blockSlot-preview',
                events: {
                    click: this.$openQuickEdit.bind(this)
                }
            }).inject(this.$Elm);

            this.$fillPreview(PreviewButton, area, activeMode);

            const Footer = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-cardFooter'
            }).inject(this.$Elm);

            const Actions = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-cardActions'
            }).inject(Footer);

            new Element('button', {
                type: 'button',
                'class': 'quiqqer-bricks-blockSlot-cardAction',
                html: '<span class="fa fa-cog"></span><span>' +
                    this.$getLocale('settings.button') + '</span>',
                title: this.$getLocale('settings.button'),
                events: {
                    click: this.$openSettingsPopup.bind(this)
                }
            }).inject(Actions);

            if (this.$canRemoveAreaContent(area)) {
                new Element('button', {
                    type: 'button',
                    'class': 'quiqqer-bricks-blockSlot-cardAction '
                        + 'quiqqer-bricks-blockSlot-cardAction--danger',
                    html: '<span class="fa fa-times"></span><span>' +
                        this.$getLocale('remove.button') + '</span>',
                    title: this.$getLocale('remove.button'),
                    events: {
                        click: this.$confirmRemoveAreaContent.bind(this)
                    }
                }).inject(Actions);
            }
        },

        $onChange: function () {
            this.$ensureAreaMode();
            this.$render();
            this.fireEvent('change', [this, this.$area, this.$index]);
        },

        $fillPreview: function (PreviewButton, area, mode) {
            PreviewButton.empty();
            PreviewButton.set('data-mode', mode);
            PreviewButton.set('title', this.$getLocale('quickEdit.title', {
                mode: this.$getModeLabel(mode)
            }));
            this.$applyPreviewStyles(PreviewButton, area);

            switch (mode) {
                case MODE_BRICK:
                    this.$fillBrickPreview(PreviewButton, area);
                    break;

                case MODE_IMAGE:
                    this.$fillImagePreview(PreviewButton, area);
                    break;

                case MODE_EDITOR:
                default:
                    this.$fillEditorPreview(PreviewButton, area);
            }

            const PreviewMeta = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewMeta'
            }).inject(PreviewButton);

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewHint',
                text: this.$getQuickEditLabel(mode)
            }).inject(PreviewMeta);

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-cardInfo',
                text: this.$getLocale('mobileOrder.info', {
                    number: area.mobileOrder
                })
            }).inject(PreviewMeta);
        },

        $applyPreviewStyles: function (PreviewButton, area) {
            const backgroundImage = area.backgroundEnabled && area.backgroundImage
                ? 'url("' + area.backgroundImage.replace(/"/g, '\\"') + '")'
                : '';
            const backgroundOverlay = this.$getPreviewBackgroundOverlay(area);
            const styles = {
                backgroundColor: '',
                backgroundImage: '',
                backgroundPosition: '',
                backgroundRepeat: '',
                backgroundSize: '',
                color: area.textColor || ''
            };

            if (backgroundImage) {
                styles.backgroundImage = backgroundOverlay
                    ? backgroundOverlay + ', ' + backgroundImage
                    : backgroundImage;
                styles.backgroundPosition = area.backgroundImagePosition || BACKGROUND_POSITION_CENTER;
                styles.backgroundRepeat = 'no-repeat';
                styles.backgroundSize = area.backgroundImageFit || IMAGE_FIT_COVER;
            }

            if (area.backgroundColorEnabled && area.backgroundColor && !backgroundImage) {
                styles.backgroundColor = this.$getPreviewBackgroundColor(area);
            }

            PreviewButton.setStyles(styles);
        },

        $getPreviewBackgroundOverlay: function (area) {
            const color = this.$getPreviewBackgroundColor(area);

            if (!color) {
                return '';
            }

            return 'linear-gradient(' + color + ', ' + color + ')';
        },

        $getPreviewBackgroundColor: function (area) {
            const color = area.backgroundColor || '';

            if (!color || !area.backgroundColorEnabled) {
                return '';
            }

            const opacity = Math.max(0, Math.min(100, parseInt(area.backgroundColorOpacity, 10) || 0));

            if (opacity >= 100) {
                return color;
            }

            const rgba = this.$hexToRgba(color, opacity / 100);

            return rgba || color;
        },

        $hexToRgba: function (color, alpha) {
            const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color || '');

            if (!match) {
                return null;
            }

            let hex = match[1];

            if (hex.length === 3) {
                hex = hex.split('').map(function (part) {
                    return part + part;
                }).join('');
            }

            return 'rgba(' + parseInt(hex.slice(0, 2), 16) + ', '
                + parseInt(hex.slice(2, 4), 16) + ', '
                + parseInt(hex.slice(4, 6), 16) + ', '
                + alpha + ')';
        },

        $fillEditorPreview: function (PreviewButton, area) {
            if (!area.content || !area.content.trim()) {
                this.$createPlaceholder(
                    PreviewButton,
                    'fa fa-align-left',
                    this.$getLocale('editor.empty')
                );
                return;
            }

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewHtml',
                html: area.content
            }).inject(PreviewButton);
        },

        $fillBrickPreview: function (PreviewButton, area) {
            if (!area.brickId && !area.brickTitle) {
                this.$createPlaceholder(
                    PreviewButton,
                    'fa fa-cubes',
                    this.$getLocale('brick.empty')
                );
                return;
            }

            const Wrap = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewBrick'
            }).inject(PreviewButton);

            const Content = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewBrickCard'
            }).inject(Wrap);

            new Element('span', {
                'class': 'fa fa-cubes quiqqer-bricks-blockSlot-previewIcon'
            }).inject(Content);

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewBrickTitle',
                text: area.brickTitle || this.$getLocale('brick.untitled')
            }).inject(Content);

            if (area.brickType) {
                new Element('div', {
                    'class': 'quiqqer-bricks-blockSlot-previewBrickType',
                    text: area.brickType
                }).inject(Content);
            }
        },

        $fillImagePreview: function (PreviewButton, area) {
            if (!area.image) {
                this.$createPlaceholder(
                    PreviewButton,
                    'fa fa-picture-o',
                    this.$getLocale('image.empty')
                );
                return;
            }

            const Wrap = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewImageWrap',
                styles: area.imageMaxWidth ? {
                    maxWidth: area.imageMaxWidth
                } : {}
            }).inject(PreviewButton);

            const Image = new Element('img', {
                'class': 'quiqqer-bricks-blockSlot-previewImage',
                src: area.image,
                alt: area.title || ''
            }).inject(Wrap);

            if (area.imageFit === IMAGE_FIT_COVER) {
                Image.addClass('quiqqer-bricks-blockSlot-previewImage--cover');
            } else if (area.imageFit === IMAGE_FIT_CONTAIN) {
                Image.addClass('quiqqer-bricks-blockSlot-previewImage--contain');
            } else {
                Image.addClass('quiqqer-bricks-blockSlot-previewImage--auto');
            }
        },

        $createPlaceholder: function (Parent, iconClass, text) {
            const Placeholder = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewPlaceholder'
            }).inject(Parent);

            new Element('span', {
                'class': iconClass + ' quiqqer-bricks-blockSlot-previewPlaceholderIcon'
            }).inject(Placeholder);

            new Element('span', {
                'class': 'quiqqer-bricks-blockSlot-previewPlaceholderText',
                text: text
            }).inject(Placeholder);
        },

        $openQuickEdit: function () {
            switch (this.$getActiveMode(this.$area)) {
                case MODE_BRICK:
                    this.$openBrickSelect();
                    break;

                case MODE_IMAGE:
                    this.$openImageSelect();
                    break;

                case MODE_EDITOR:
                default:
                    this.$openEditor();
            }
        },

        $openEditor: function () {
            const Holder = new Element('div').inject(this.$helperContainer);
            const Input = new Element('input', {
                type: 'hidden',
                'data-qui': 'controls/editors/Input',
                value: this.$area.content || ''
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
                    this.$area.content = Input.value || '';
                    Holder.destroy();
                    this.$onChange();
                }.bind(this));

                Control.open();
            }.bind(this));
        },

        $openBrickSelect: function () {
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

                        this.$area.brickId = selected.id ? parseInt(selected.id, 10) || 0 : 0;
                        this.$area.brickTitle = selected.title || selected.name || '';
                        this.$area.brickType = selected.type || '';

                        this.$onChange();
                    }.bind(this)
                }
            }).open();
        },

        $openImageSelect: function () {
            const Holder = new Element('div').inject(this.$helperContainer);
            const Input = new Element('input', {
                type: 'text',
                'data-qui': 'controls/projects/project/media/Input',
                'data-qui-options-selectable_types': 'image',
                value: this.$area.image || ''
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
                        this.$area.image = value || '';
                        Holder.destroy();
                        this.$onChange();
                    }.bind(this));
                }

                if (Control.$MediaButton && 'click' in Control.$MediaButton) {
                    Control.$MediaButton.click();
                    return;
                }

                Holder.destroy();
            }.bind(this));
        },

        $openSettingsPopup: function () {
            const area = this.$area;
            const activeMode = this.$getActiveMode(area);

            new QUIConfirm({
                icon: 'fa fa-cog',
                title: this.$getLocale('settings.popup.title', {
                    title: area.title
                }),
                maxWidth: 520,
                maxHeight: 520,
                events: {
                    onOpen: function (Win) {
                        const Content = Win.getContent();

                        Content.set('html', '');
                        Content.addClass('quiqqer-bricks-blockSlot-popup');

                        const Form = new Element('div', {
                            'class': 'quiqqer-bricks-blockSlot-popupForm'
                        }).inject(Content);

                        const ModeField = this.$createPopupModeField(Form, activeMode);

                        if (this.$isSettingVisible('contentPadding')) {
                            this.$createPopupCheckboxField(
                                Form,
                                this.$getLocale('contentPadding'),
                                area.contentPadding,
                                'contentPadding'
                            );
                        }

                        if (this.$isSettingVisible('mobileOrder')) {
                            this.$createPopupInputField(Form, {
                                label: this.$getLocale('mobileOrder'),
                                type: 'number',
                                value: area.mobileOrder,
                                min: 1,
                                step: 1,
                                name: 'mobileOrder'
                            });
                        }

                        if (this.$isSettingVisible('verticalAlign')) {
                            this.$createPopupSelectField(
                                Form,
                                this.$getLocale('verticalAlign'),
                                [
                                    {
                                        value: 'top',
                                        text: this.$getLocale('verticalAlign.top')
                                    },
                                    {
                                        value: VERTICAL_ALIGN_CENTER,
                                        text: this.$getLocale('verticalAlign.center')
                                    },
                                    {
                                        value: 'bottom',
                                        text: this.$getLocale('verticalAlign.bottom')
                                    }
                                ],
                                area.verticalAlign,
                                'data-name',
                                'verticalAlign'
                            );
                        }

                        let BackgroundOptions = null;
                        let BackgroundEnabledField = null;

                        if (this.$isSettingVisible('background')) {
                            const Background = this.$createPopupBackgroundSettings(Form, area);
                            BackgroundOptions = Background.options;
                            BackgroundEnabledField = Background.enabledField;
                        }

                        let OverlayOptions = null;
                        let BackgroundColorEnabledField = null;

                        if (this.$isSettingVisible('backgroundColor')) {
                            const Overlay = this.$createPopupBackgroundColorSettings(Form, area);
                            OverlayOptions = Overlay.options;
                            BackgroundColorEnabledField = Overlay.enabledField;
                        }

                        let TextColorOptions = null;
                        let TextColorEnabledField = null;

                        if (this.$isSettingVisible('textColor')) {
                            const TextColor = this.$createPopupTextColorSettings(Form, area);
                            TextColorOptions = TextColor.options;
                            TextColorEnabledField = TextColor.enabledField;
                        }

                        let ImageSettings = null;

                        if (this.$isSettingVisible('image')) {
                            ImageSettings = this.$createPopupImageSettings(Form, area);
                        }

                        const toggleImageSettings = function () {
                            if (!ImageSettings) {
                                return;
                            }

                            const mode = ModeField ? ModeField.value : activeMode;

                            ImageSettings.setStyle('display', mode === MODE_IMAGE ? '' : 'none');
                        };

                        const toggleBackgroundSettings = function () {
                            if (!BackgroundOptions || !BackgroundEnabledField) {
                                return;
                            }

                            BackgroundOptions.setStyle(
                                'display',
                                BackgroundEnabledField.checked ? '' : 'none'
                            );
                        };

                        const toggleOverlaySettings = function () {
                            if (!OverlayOptions || !BackgroundColorEnabledField) {
                                return;
                            }

                            OverlayOptions.setStyle(
                                'display',
                                BackgroundColorEnabledField.checked ? '' : 'none'
                            );
                        };

                        const toggleTextColorSettings = function () {
                            if (!TextColorOptions || !TextColorEnabledField) {
                                return;
                            }

                            TextColorOptions.setStyle(
                                'display',
                                TextColorEnabledField.checked ? '' : 'none'
                            );
                        };

                        if (ModeField) {
                            ModeField.addEvent('change', toggleImageSettings);
                        }

                        if (BackgroundEnabledField) {
                            BackgroundEnabledField.addEvent('change', toggleBackgroundSettings);
                        }

                        if (BackgroundColorEnabledField) {
                            BackgroundColorEnabledField.addEvent('change', toggleOverlaySettings);
                        }

                        if (TextColorEnabledField) {
                            TextColorEnabledField.addEvent('change', toggleTextColorSettings);
                        }

                        toggleImageSettings();
                        toggleBackgroundSettings();
                        toggleOverlaySettings();
                        toggleTextColorSettings();

                        QUI.parse(Content).then(function () {
                            this.$applyProjectToControls(Content);
                        }.bind(this));
                    }.bind(this),

                    onSubmit: function (Win) {
                        const Content = Win.getContent();
                        const modeField = Content.getElement('select[data-name="mode"]');
                        const contentPaddingField = Content.getElement('input[data-name="contentPadding"]');
                        const orderField = Content.getElement('input[data-name="mobileOrder"]');
                        const verticalAlignField = Content.getElement('select[data-name="verticalAlign"]');
                        const imageFitField = Content.getElement('select[data-name="imageFit"]');
                        const imageMaxWidthField = Content.getElement('input[data-name="imageMaxWidth"]');
                        const backgroundEnabledField = Content.getElement('input[data-name="backgroundEnabled"]');
                        const backgroundImageField = Content.getElement('input[data-name="backgroundImage"]');
                        const backgroundImageFitField = Content.getElement('select[data-name="backgroundImageFit"]');
                        const backgroundImagePositionField = Content.getElement(
                            'select[data-name="backgroundImagePosition"]'
                        );
                        const backgroundColorEnabledField = Content.getElement(
                            'input[data-name="backgroundColorEnabled"]'
                        );
                        const backgroundColorField = Content.getElement('input[data-name="backgroundColor"]');
                        const backgroundColorOpacityField = Content.getElement(
                            'input[data-name="backgroundColorOpacity"]'
                        );
                        const textColorEnabledField = Content.getElement('input[data-name="textColorEnabled"]');
                        const textColorField = Content.getElement('input[data-name="textColor"]');
                        const mobileOrder = orderField ? parseInt(orderField.value, 10) : area.mobileOrder;
                        const backgroundColorOpacity = backgroundColorOpacityField
                            ? parseInt(backgroundColorOpacityField.value, 10)
                            : area.backgroundColorOpacity;

                        area.mode = this.$normalizeMode(modeField ? modeField.value : area.mode);

                        if (this.$isSettingVisible('contentPadding')) {
                            area.contentPadding = !!(contentPaddingField && contentPaddingField.checked);
                        }

                        if (this.$isSettingVisible('mobileOrder')) {
                            area.mobileOrder = isNaN(mobileOrder) || mobileOrder < 1 ? 1 : mobileOrder;
                        }

                        if (this.$isSettingVisible('verticalAlign')) {
                            area.verticalAlign = verticalAlignField
                                ? verticalAlignField.value
                                : VERTICAL_ALIGN_CENTER;
                        }

                        if (this.$isSettingVisible('image')) {
                            area.imageFit = imageFitField ? imageFitField.value : IMAGE_FIT_AUTO;
                            area.imageMaxWidth = imageMaxWidthField ? imageMaxWidthField.value.trim() : '';
                        }

                        if (this.$isSettingVisible('background')) {
                            area.backgroundEnabled = !!(backgroundEnabledField && backgroundEnabledField.checked);
                            area.backgroundImage = backgroundImageField ? backgroundImageField.value || '' : '';
                            area.backgroundImageFit = backgroundImageFitField
                                ? backgroundImageFitField.value
                                : IMAGE_FIT_COVER;
                            area.backgroundImagePosition = backgroundImagePositionField
                                ? backgroundImagePositionField.value
                                : BACKGROUND_POSITION_CENTER;
                        }

                        if (this.$isSettingVisible('backgroundColor')) {
                            area.backgroundColorEnabled = !!(
                                backgroundColorEnabledField && backgroundColorEnabledField.checked
                            );
                            area.backgroundColor = backgroundColorField
                                ? backgroundColorField.value || '#000000'
                                : '#000000';
                            area.backgroundColorOpacity = isNaN(backgroundColorOpacity)
                                ? 100
                                : Math.max(0, Math.min(100, backgroundColorOpacity));
                        }

                        if (this.$isSettingVisible('textColor')) {
                            area.textColor = textColorEnabledField && textColorEnabledField.checked && textColorField
                                ? textColorField.value.trim()
                                : '';
                        }

                        this.$onChange();
                    }.bind(this)
                }
            }).open();
        },

        $createPopupSelectField: function (Parent, label, options, value, attrName, attrValue) {
            const Field = new Element('label', {
                'class': 'quiqqer-bricks-blockSlot-popupField'
            }).inject(Parent);

            new Element('span', {
                'class': 'quiqqer-bricks-blockSlot-popupLabel',
                text: label
            }).inject(Field);

            const Select = new Element('select', {
                'class': 'quiqqer-bricks-blockSlot-popupSelect'
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

        $createPopupModeField: function (Parent, activeMode) {
            if (!this.$shouldShowModeField()) {
                return null;
            }

            return this.$createPopupSelectField(
                Parent,
                this.$getLocale('mode'),
                this.$getModeOptions(),
                activeMode,
                'data-name',
                'mode'
            );
        },

        $createPopupBackgroundSettings: function (Parent, area) {
            const Section = this.$createPopupSection(
                Parent,
                this.$getLocale('background.section')
            );

            const EnabledField = this.$createPopupCheckboxField(
                Section,
                this.$getLocale('background.enabled'),
                area.backgroundEnabled,
                'backgroundEnabled'
            );

            const Options = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupSectionBody'
            }).inject(Section);

            this.$createPopupMediaField(Options, {
                label: this.$getLocale('background.image'),
                value: area.backgroundImage,
                name: 'backgroundImage'
            });

            this.$createPopupSelectField(
                Options,
                this.$getLocale('background.fit'),
                [
                    {
                        value: IMAGE_FIT_COVER,
                        text: this.$getLocale('background.fit.cover')
                    },
                    {
                        value: IMAGE_FIT_CONTAIN,
                        text: this.$getLocale('background.fit.contain')
                    },
                    {
                        value: IMAGE_FIT_AUTO,
                        text: this.$getLocale('background.fit.auto')
                    }
                ],
                area.backgroundImageFit,
                'data-name',
                'backgroundImageFit'
            );

            this.$createPopupSelectField(
                Options,
                this.$getLocale('background.position'),
                [
                    {
                        value: BACKGROUND_POSITION_CENTER,
                        text: this.$getLocale('background.position.center')
                    },
                    {
                        value: BACKGROUND_POSITION_TOP,
                        text: this.$getLocale('background.position.top')
                    },
                    {
                        value: BACKGROUND_POSITION_BOTTOM,
                        text: this.$getLocale('background.position.bottom')
                    },
                    {
                        value: BACKGROUND_POSITION_LEFT,
                        text: this.$getLocale('background.position.left')
                    },
                    {
                        value: BACKGROUND_POSITION_RIGHT,
                        text: this.$getLocale('background.position.right')
                    }
                ],
                area.backgroundImagePosition,
                'data-name',
                'backgroundImagePosition'
            );

            return {
                enabledField: EnabledField,
                options: Options
            };
        },

        $createPopupBackgroundColorSettings: function (Parent, area) {
            const Section = this.$createPopupSection(
                Parent,
                this.$getLocale('backgroundColor.section')
            );

            const EnabledField = this.$createPopupCheckboxField(
                Section,
                this.$getLocale('backgroundColor.enabled'),
                area.backgroundColorEnabled,
                'backgroundColorEnabled'
            );

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupHint',
                text: this.$getLocale('backgroundColor.description')
            }).inject(Section);

            const Options = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupSectionBody'
            }).inject(Section);

            this.$createPopupColorField(Options, {
                label: this.$getLocale('backgroundColor.color'),
                value: area.backgroundColor,
                name: 'backgroundColor'
            });

            this.$createPopupRangeField(Options, {
                label: this.$getLocale('backgroundColor.opacity'),
                value: area.backgroundColorOpacity,
                name: 'backgroundColorOpacity',
                min: 0,
                max: 100,
                step: 1
            });

            return {
                enabledField: EnabledField,
                options: Options
            };
        },

        $createPopupTextColorSettings: function (Parent, area) {
            const Section = this.$createPopupSection(
                Parent,
                this.$getLocale('textColor.section')
            );

            const EnabledField = this.$createPopupCheckboxField(
                Section,
                this.$getLocale('textColor.enabled'),
                !!area.textColor,
                'textColorEnabled'
            );

            const Options = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupSectionBody'
            }).inject(Section);

            this.$createPopupColorField(Options, {
                label: this.$getLocale('backgroundColor.color'),
                value: area.textColor,
                name: 'textColor'
            });

            return {
                enabledField: EnabledField,
                options: Options
            };
        },

        $createPopupImageSettings: function (Parent, area) {
            const Section = this.$createPopupSection(
                Parent,
                this.$getLocale('image.section')
            );

            this.$createPopupSelectField(
                Section,
                this.$getLocale('image.fit'),
                [
                    {
                        value: IMAGE_FIT_AUTO,
                        text: this.$getLocale('image.fit.auto')
                    },
                    {
                        value: IMAGE_FIT_COVER,
                        text: this.$getLocale('image.fit.cover')
                    },
                    {
                        value: IMAGE_FIT_CONTAIN,
                        text: this.$getLocale('image.fit.contain')
                    }
                ],
                area.imageFit,
                'data-name',
                'imageFit'
            );

            const MaxWidthField = this.$createPopupInputField(Section, {
                label: this.$getLocale('image.maxWidth'),
                type: 'text',
                value: area.imageMaxWidth,
                name: 'imageMaxWidth'
            });

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupHint',
                text: this.$getLocale('image.maxWidth.help')
            }).inject(MaxWidthField);

            return Section;
        },

        $createPopupSection: function (Parent, title) {
            const Section = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupSection'
            }).inject(Parent);

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupSectionTitle',
                text: title
            }).inject(Section);

            return Section;
        },

        $createPopupCheckboxField: function (Parent, label, checked, name) {
            const Field = new Element('label', {
                'class': 'quiqqer-bricks-blockSlot-popupCheckbox'
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
                'class': 'quiqqer-bricks-blockSlot-popupField'
            }).inject(Parent);

            new Element('span', {
                'class': 'quiqqer-bricks-blockSlot-popupLabel',
                text: options.label
            }).inject(Field);

            const Input = new Element('input', {
                type: options.type || 'text',
                'class': 'quiqqer-bricks-blockSlot-popupInput',
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
                'class': 'quiqqer-bricks-blockSlot-popupField '
                    + 'quiqqer-bricks-blockSlot-popupField--range'
            }).inject(Parent);

            const Header = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupFieldHeader'
            }).inject(Field);

            new Element('span', {
                'class': 'quiqqer-bricks-blockSlot-popupLabel',
                text: options.label
            }).inject(Header);

            const Value = new Element('span', {
                'class': 'quiqqer-bricks-blockSlot-popupRangeValue'
            }).inject(Header);

            const Input = new Element('input', {
                type: 'range',
                'class': 'quiqqer-bricks-blockSlot-popupInput',
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
                'class': 'quiqqer-bricks-blockSlot-popupField'
            }).inject(Parent);

            new Element('span', {
                'class': 'quiqqer-bricks-blockSlot-popupLabel',
                text: options.label
            }).inject(Field);

            const Input = new Element('input', {
                type: 'text',
                'class': 'quiqqer-bricks-blockSlot-popupInput',
                'data-qui': 'controls/projects/project/media/Input',
                'data-qui-options-selectable_types': 'image',
                value: options.value || ''
            }).inject(Field);

            Input.set('data-name', options.name || 'backgroundImage');

            return Field;
        },

        $canRemoveAreaContent: function (area) {
            switch (this.$getActiveMode(area)) {
                case MODE_BRICK:
                    return !!(area.brickId || area.brickTitle);

                case MODE_IMAGE:
                    return !!area.image;

                default:
                    return false;
            }
        },

        $removeAreaContent: function () {
            switch (this.$getActiveMode(this.$area)) {
                case MODE_BRICK:
                    this.$area.brickId = 0;
                    this.$area.brickTitle = '';
                    this.$area.brickType = '';
                    break;

                case MODE_IMAGE:
                    this.$area.image = '';
                    break;
            }

            this.$onChange();
        },

        $confirmRemoveAreaContent: function () {
            new QUIConfirm({
                icon: 'fa fa-times',
                title: this.$getLocale('remove.popup.title', {
                    title: this.$area.title
                }),
                information: this.$getLocale('remove.popup.information'),
                text: this.$getLocale('remove.popup.text', {
                    mode: this.$getModeLabel(this.$getActiveMode(this.$area))
                }),
                events: {
                    onSubmit: function () {
                        this.$removeAreaContent();
                    }.bind(this)
                }
            }).open();
        },

        $getModeLabel: function (mode) {
            switch (mode) {
                case MODE_BRICK:
                    return this.$getLocale('mode.brick');

                case MODE_IMAGE:
                    return this.$getLocale('mode.image');

                case MODE_EDITOR:
                default:
                    return this.$getLocale('mode.editor');
            }
        },

        $getQuickEditLabel: function (mode) {
            switch (mode) {
                case MODE_BRICK:
                    return this.$getLocale('quickEdit.brick');

                case MODE_IMAGE:
                    return this.$getLocale('quickEdit.image');

                case MODE_EDITOR:
                default:
                    return this.$getLocale('quickEdit.editor');
            }
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

        $getLocale: function (name, data) {
            return QUILocale.get(lg, localePrefix + name, data);
        },

        $normalizeAllowedModes: function (allowedModes) {
            if (typeOf(allowedModes) !== 'array') {
                return DEFAULT_ALLOWED_MODES.slice();
            }

            const modes = [];

            allowedModes.forEach(function (mode) {
                if (DEFAULT_ALLOWED_MODES.indexOf(mode) === -1 || modes.indexOf(mode) !== -1) {
                    return;
                }

                modes.push(mode);
            });

            return modes.length ? modes : DEFAULT_ALLOWED_MODES.slice();
        },

        $normalizeSettingsVisibility: function (settingsVisibility) {
            const visibility = Object.append({}, DEFAULT_SETTINGS_VISIBILITY);

            if (typeOf(settingsVisibility) !== 'object') {
                return visibility;
            }

            Object.keys(DEFAULT_SETTINGS_VISIBILITY).forEach(function (key) {
                if (key in settingsVisibility) {
                    visibility[key] = settingsVisibility[key] !== false;
                }
            });

            return visibility;
        },

        $isSettingVisible: function (name) {
            return this.$settingsVisibility[name] !== false;
        },

        $normalizeMode: function (mode) {
            return this.$allowedModes.indexOf(mode) !== -1
                ? mode
                : this.$allowedModes[0];
        },

        $getActiveMode: function (area) {
            area = typeOf(area) === 'object' ? area : {};

            return this.$normalizeMode(area.mode);
        },

        $ensureAreaMode: function () {
            this.$area.mode = this.$getActiveMode(this.$area);
        },

        $shouldShowModeField: function () {
            return this.$allowModeSwitch && this.$allowedModes.length > 1;
        },

        $getModeOptions: function () {
            return this.$allowedModes.map(function (mode) {
                return {
                    value: mode,
                    text: this.$getModeLabel(mode)
                };
            }.bind(this));
        }
    });
});
