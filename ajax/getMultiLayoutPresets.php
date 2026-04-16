<?php

/**
 * This file contains package_quiqqer_bricks_ajax_getMultiLayoutPresets
 */

use QUI\Bricks\Controls\MultiLayout;

QUI::getAjax()->registerFunction(
    'package_quiqqer_bricks_ajax_getMultiLayoutPresets',
    static function () {
        return array_values(MultiLayout::getPresets());
    },
    false,
    'Permission::checkAdminUser'
);
