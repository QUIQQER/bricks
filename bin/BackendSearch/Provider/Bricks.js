define('package/quiqqer/bricks/bin/BackendSearch/Provider/Bricks', [
    'package/quiqqer/bricks/bin/BrickEdit',
    'utils/Panels'
], function (BrickEdit, PanelUtils) {
    "use strict";

    return new Class({
        Type: 'package/quiqqer/bricks/bin/BackendSearch/Provider/Bricks',

        initialize: function (options) {
            PanelUtils.openPanelInTasks(
                new BrickEdit({
                    '#id': 'brick-edit-' + options.id,
                    id: options.id,
                    projectName: options.projectName,
                    projectLang: options.projectLang
                })
            );
        }
    });
});
