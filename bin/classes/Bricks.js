/**
 * Main Brick Handler
 *
 * @event onBrickSave [brickId, data, result]
 * @event onBrickCopy [brickId, params, result]
 * @event onBrickCreate [brick, project, lang, data]
 * @event onBrickDelete [brickIds]
 */
define('package/quiqqer/bricks/bin/classes/Bricks', [

    'qui/QUI',
    'qui/classes/DOM',
    'Ajax'

], function (QUI, QDOM, QUIAjax) {
    "use strict";

    return new Class({

        Extends: QDOM,
        Type: 'package/quiqqer/bricks/bin/classes/Bricks',

        initialize: function (options) {
            this.parent(options);
        },

        /**
         * Return the data of a brick
         *
         * @param {Number|String} brickId
         * @return Promise
         */
        getBrick: function (brickId) {
            return new Promise(function (resolve, reject) {
                QUIAjax.get('package_quiqqer_bricks_ajax_getBrick', resolve, {
                    'package': 'quiqqer/bricks',
                    brickId: brickId,
                    onError: reject
                });
            });
        },

        /**
         * Return the data of a brick
         *
         * @param {Number|String} brickId
         * @param {Object} data - Brick data
         * @return Promise
         */
        saveBrick: function (brickId, data) {
            const self = this;

            return new Promise(function (resolve, reject) {
                QUIAjax.get('package_quiqqer_bricks_ajax_brick_save', function (result) {
                    self.fireEvent('brickSave', [
                        brickId,
                        data,
                        result
                    ]);
                    resolve(result);
                }, {
                    'package': 'quiqqer/bricks',
                    brickId: brickId,
                    data: JSON.encode(data),
                    onError: reject
                });
            });
        },

        /**
         * Return the data of a brick
         *
         * @param {Number|String} brickId
         * @param {Object} params
         * @return Promise
         */
        copyBrick: function (brickId, params) {
            const self = this;

            params = params || {};

            return new Promise(function (resolve, reject) {
                QUIAjax.get('package_quiqqer_bricks_ajax_brick_copy', function (result) {
                    self.fireEvent('brickCopy', [
                        brickId,
                        params,
                        result
                    ]);
                    resolve(result);
                }, {
                    'package': 'quiqqer/bricks',
                    brickId: brickId,
                    params: JSON.encode(params),
                    onError: reject
                });
            });
        },

        /**
         * Return the bricks from a project
         *
         * @param {String} project - name of the project
         * @param {String} lang - Language of the project
         * @return Promise
         */
        getBricksFromProject: function (project, lang) {
            return new Promise(function (resolve, reject) {
                QUIAjax.get('package_quiqqer_bricks_ajax_project_getBricks', resolve, {
                    'package': 'quiqqer/bricks',
                    project: JSON.encode({
                        name: project,
                        lang: lang
                    }),
                    onError: reject
                });
            });
        },

        /**
         * Check whether a title already exists in a project
         *
         * @param {String} title
         * @param {String} project
         * @param {String} lang
         * @return Promise
         */
        titleExists: function (title, project, lang) {
            return new Promise(function (resolve, reject) {
                QUIAjax.get('package_quiqqer_bricks_ajax_project_titleExists', resolve, {
                    'package': 'quiqqer/bricks',
                    title: title,
                    project: JSON.encode({
                        name: project,
                        lang: lang
                    }),
                    onError: reject
                });
            });
        },

        /**
         * Return all available bricks
         *
         * @return Promise
         */
        getAvailableBricks: function () {
            return new Promise(function (resolve, reject) {
                QUIAjax.get('package_quiqqer_bricks_ajax_getAvailableBricks', resolve, {
                    'package': 'quiqqer/bricks',
                    onError: reject
                });
            });
        },

        /**
         * Create a new brick
         *
         * @param {String} project - name of the project
         * @param {String} lang - Language of the project
         * @param {Object} data - Data of the brick
         *
         * @return Promise
         */
        createBrick: function (project, lang, data) {
            const self = this;

            return new Promise(function (resolve, reject) {
                QUIAjax.post('package_quiqqer_bricks_ajax_project_createBrick', function (brick) {
                    self.fireEvent('brickCreate', [
                        brick,
                        project,
                        lang,
                        data
                    ]);
                    resolve(brick);
                }, {
                    'package': 'quiqqer/bricks',
                    project: JSON.encode({
                        name: project,
                        lang: lang
                    }),
                    data: JSON.encode(data),
                    onError: reject
                });
            });
        },

        /**
         * Delete the Brick-Ids
         *
         * @param {Array} brickIds - Brick IDs which should be deleted
         * @return Promise
         */
        deleteBricks: function (brickIds) {
            const self = this;

            let panels = QUI.Controls.getByType(
                'package/quiqqer/bricks/bin/BrickEdit'
            );

            return new Promise(function (resolve, reject) {
                QUIAjax.post('package_quiqqer_bricks_ajax_brick_delete', function () {
                    // exist brick panels?
                    let c, i, len, clen, brickId;

                    for (i = 0, len = brickIds.length; i < len; i++) {
                        brickId = brickIds[i];

                        for (c = 0, clen = panels.length; c < clen; c++) {
                            if (panels[c].getAttribute('id') === brickId) {
                                panels[c].destroy();
                            }
                        }
                    }

                    self.fireEvent('brickDelete', [brickIds]);
                    resolve();
                }, {
                    'package': 'quiqqer/bricks',
                    brickIds: JSON.encode(brickIds),
                    onError: reject
                });
            });
        }
    });
});
