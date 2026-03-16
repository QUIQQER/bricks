<?php

/**
 * This file contains package_quiqqer_bricks_ajax_brick_render
 */

/**
 * renders a brick
 */
QUI::getAjax()->registerFunction(
    'package_quiqqer_bricks_ajax_brick_render',
    function ($brickId) {
        $bm = QUI\Bricks\Manager::init();
        $brick = $bm?->getBrickById($brickId);

        // body has to be loaded before CSS render, some controls changes it during rendering
        $body = $brick?->create() ?? '';

        $html = QUI\Control\Manager::getCSS();
        $html .= $body;

        return $html;
    },
    ['brickId']
);
