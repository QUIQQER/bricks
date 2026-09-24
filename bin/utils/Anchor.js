/**
 * Helpers for user entered anchors (fragment ids), e.g. deep links to
 * accordion entries. Usable by every brick that offers an anchor field.
 *
 * The rules follow the site URL cleanup of the core (utils/Site
 * notAllowedUrlSigns, cleanupUrl in controls/projects/project/site/Panel):
 * forbidden URL signs are removed and whitespace becomes the URL space
 * character. Case and umlauts are kept.
 *
 * Mirrors QUI\Bricks\Utils::cleanupAnchor() on the PHP side.
 *
 * @module package/quiqqer/bricks/bin/utils/Anchor
 */
define('package/quiqqer/bricks/bin/utils/Anchor', [

    'utils/Site'

], function (SiteUtils) {
    "use strict";

    const escapeRegExp = function (value) {
        return value.replace(/[.*+?^${}()|[\]\\\-\/]/g, '\\$&');
    };

    const getSpaceCharacter = function () {
        return window.QUIQQER?.Rewrite?.URL_SPACE_CHARACTER || '-';
    };

    return {

        /**
         * Remove forbidden signs and replace whitespace.
         * Keeps a trailing space character, so it can be used while typing.
         *
         * @param {String} value
         * @return {String}
         */
        cleanup: function (value) {
            const space = escapeRegExp(getSpaceCharacter());
            const signs = Object.keys(SiteUtils.notAllowedUrlSigns()).map(escapeRegExp).join('');

            return String(value)
                .replace(new RegExp('[' + signs + ']', 'g'), '')
                .replace(/\s+/g, getSpaceCharacter())
                .replace(new RegExp('(' + space + '){2,}', 'g'), getSpaceCharacter());
        },

        /**
         * Complete cleanup, additionally trims the space character at both ends.
         *
         * @param {String} value
         * @return {String}
         */
        finalize: function (value) {
            const space = escapeRegExp(getSpaceCharacter());

            return this.cleanup(value).replace(new RegExp('^(' + space + ')+|(' + space + ')+$', 'g'), '');
        },

        /**
         * Clean an input field live: while typing and completely on blur.
         *
         * @param {HTMLInputElement} Input
         */
        bindInput: function (Input) {
            Input.addEventListener('input', () => {
                const value = Input.value;
                const cleaned = this.cleanup(value);

                if (cleaned === value) {
                    return;
                }

                const position = Math.max(0, Input.selectionStart - (value.length - cleaned.length));

                Input.value = cleaned;
                Input.setSelectionRange(position, position);
            });

            Input.addEventListener('blur', () => {
                Input.value = this.finalize(Input.value);
            });
        }
    };
});
