/**
 * QUIQQER Accordion Control
 */
define('package/quiqqer/bricks/bin/Controls/Accordion', [

    'qui/QUI',
    'qui/controls/Control',
    'utils/Controls',

], function (QUI, QUIControl, QUIControlUtils) {
    "use strict";

    return new Class({

        Extends: QUIControl,
        Type: 'Controls/Accordion',

        options: {
            stayopen: false,
            openfirst: true
        },

        Binds: [
            '$onImport',
            '$onDestroy',
            '$onHashChange',
            '$toggle',
            'open',
            'close'
        ],

        initialize: function (options) {
            this.parent(options);

            this.accordionItems = [];

            this.addEvents({
                onImport: this.$onImport,
                onDestroy: this.$onDestroy
            });
        },

        /**
         * event: on import
         */
        $onImport: function () {
            const self = this;

            this.accordionItems = this.getElm().getElements('.quiqqer-accordion-item');

            this.accordionItems.forEach(function (Item) {
                const Header = Item.getElement('.quiqqer-accordion-item-header');

                if (!Header) {
                    return;
                }

                Header.addEvent('click', self.$toggle);
            });

            // deep link: open the entry referenced by the URL hash
            this.openFromHash(false);
            window.addEventListener('hashchange', this.$onHashChange);
        },

        $onDestroy: function () {
            window.removeEventListener('hashchange', this.$onHashChange);
        },

        $onHashChange: function () {
            this.openFromHash(true);
        },

        /**
         * Open the entry that the URL hash points to and scroll to the target.
         * The target can be the entry itself (its anchor) or any element with
         * an id inside the entry.
         *
         * @param {Boolean} animate - false on page load, so nothing moves
         *                            while the page scrolls to the target
         */
        openFromHash: function (animate) {
            const Target = this.$getHashTarget();
            const Item = Target?.closest('[data-name="item"]');

            if (!Item || !this.getElm().contains(Item)) {
                return;
            }

            const scrollToTarget = () => Target.scrollIntoView({block: 'start'});
            const ContentWrapper = Item.querySelector('[data-name="content-wrapper"]');
            const Content = ContentWrapper?.querySelector('[data-name="content"]');

            if (Item.open || !Content) {
                scrollToTarget();
                return;
            }

            if (animate && !this.prefersReducedMotion()) {
                // scroll after the height animation, closing entries above
                // would otherwise shift the target
                this.open(ContentWrapper, Content, Item);
                setTimeout(scrollToTarget, this.$getTransitionDurationMs(Item));
                return;
            }

            if (this.getAttribute('stayopen') === false) {
                Array.from(this.accordionItems).forEach((Other) => {
                    Other.open = false;
                });
            }

            Item.open = true;
            scrollToTarget();
        },

        /**
         * @return {HTMLElement|null}
         */
        $getHashTarget: function () {
            const hash = window.location.hash.substring(1);

            if (hash === '') {
                return null;
            }

            try {
                // umlauts arrive percent-encoded
                return document.getElementById(decodeURIComponent(hash));
            } catch (e) {
                return document.getElementById(hash);
            }
        },

        $toggle: function (event) {
            // prevent the native <details> toggle, the animation is handled here
            // (covers mouse click as well as Enter / Space on the summary)
            event.preventDefault();

            const Target = event.target,
                Item = Target.getParent('.quiqqer-accordion-item'),
                ContentWrapper = Item.getElement('.quiqqer-accordion-item-content-wrapper'),
                Content = ContentWrapper.getElement('.quiqqer-accordion-item-content');

            if (!Item.open) {
                this.open(ContentWrapper, Content, Item);
                return;
            }

            this.close(ContentWrapper, Content, Item);
        },

        open: function (ContentWrapper, Content, Item) {
            const self = this;

            if (self.getAttribute('stayopen') === false) {
                this.accordionItems.forEach(function (Other) {
                    if (Other === Item || !Other.open) {
                        return;
                    }

                    const OtherWrapper = Other.getElement('.quiqqer-accordion-item-content-wrapper'),
                        OtherContent = OtherWrapper.getElement('.quiqqer-accordion-item-content');

                    self.close(OtherWrapper, OtherContent, Other);
                });
            }

            // reveal natively first so the content becomes measurable
            Item.classList.remove('quiqqer-accordion-item--closing');
            Item.open = true;

            if (self.prefersReducedMotion()) {
                return;
            }

            ContentWrapper.setStyle('height', 0);

            const height = Content.getHeight();

            moofx(ContentWrapper).animate({
                height: height
            }, {
                duration: self.getTransitionDuration(Item),
                callback: function () {
                    ContentWrapper.setStyle('height', null);
                }
            });
        },

        close: function (ContentWrapper, Content, Item) {
            if (this.prefersReducedMotion()) {
                Item.open = false;
                return;
            }

            // rotate the icon back right away while the height collapses
            Item.classList.add('quiqqer-accordion-item--closing');
            ContentWrapper.setStyle('height', Content.getHeight());

            moofx(ContentWrapper).animate({
                height: 0
            }, {
                duration: this.getTransitionDuration(Item),
                callback: function () {
                    // hide natively only after the collapse animation finished
                    Item.open = false;
                    Item.classList.remove('quiqqer-accordion-item--closing');
                    ContentWrapper.setStyle('height', null);
                }
            });
        },

        prefersReducedMotion: function () {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        },

        /**
         * Read the shared transition duration from CSS so the height animation
         * (moofx) and the icon rotation (CSS) stay in sync and can be overridden
         * in one place via --quiqqer-bricks-accordion-transition-duration.
         *
         * @param {HTMLElement} Item
         * @return {string} e.g. "500ms" or "0.3s"
         */
        getTransitionDuration: function (Item) {
            const value = window.getComputedStyle(Item)
                .getPropertyValue('--_transition-duration').trim();

            return value || '500ms';
        },

        /**
         * @param {HTMLElement} Item
         * @return {Number}
         */
        $getTransitionDurationMs: function (Item) {
            const value = this.getTransitionDuration(Item);
            const duration = parseFloat(value) * (value.endsWith('ms') ? 1 : 1000);

            return Number.isNaN(duration) ? 500 : duration;
        }
    });
});
