<?php

/**
 * This file contains package_quiqqer_bricks_ajax_brick_render
 */

use QUI\Bricks\Utils;

/**
 * renders a brick
 *
 * Optional brickParams (a JSON map) are applied as brick settings, but always
 * under the "param-" prefix, so a client can never overwrite a real setting
 * such as a system prompt or a recipient address. A brick opts in by reading
 * the prefixed name. Because the parameters are client supplied and the brick
 * cache is keyed by the settings hash, a parametrised render bypasses the
 * cache instead of minting an entry per distinct value.
 */
QUI::getAjax()->registerFunction(
    'package_quiqqer_bricks_ajax_brick_render',
    function ($brickId, $brickParams) {
        $bm = QUI\Bricks\Manager::init();
        $brick = $bm?->getBrickByIdentifier($brickId);

        $params = Utils::brickParamsFromRequest($brickParams);

        if ($brick && $params !== []) {
            $brick->setAttribute('cacheable', 0);

            foreach ($params as $name => $value) {
                $brick->setSetting($name, $value);
            }
        }

        // body has to be loaded before CSS render, some controls changes it during rendering
        $body = $brick?->create() ?? '';

        $html = QUI\Control\Manager::getCSS();
        $html .= $body;

        return $html;
    },
    ['brickId', 'brickParams']
);
