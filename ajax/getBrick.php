<?php

/**
 * This file contains package_quiqqer_bricks_ajax_getBrick
 */

/**
 * Returns the Brick data
 *
 * @param {String|Integer} $brickId - Brick-ID
 *
 * @return array
 */

QUI::getAjax()->registerFunction(
    'package_quiqqer_bricks_ajax_getBrick',
    function ($brickId) {
        $formatUserDisplay = static function ($userId): string {
            if (empty($userId)) {
                return '';
            }

            try {
                $User = QUI::getUsers()->get((string)$userId);
                return $User->getName() . ' (' . $userId . ')';
            } catch (Exception) {
                return (string)$userId;
            }
        };

        $BrickManager = QUI\Bricks\Manager::init();
        $Brick = $BrickManager?->getBrickById($brickId);

        if (!$Brick) {
            return [
                'attributes' => [],
                'settings' => [],
                'customfields' => [],
                'availableSettings' => []
            ];
        }

        $attributes = $Brick->getAttributes();
        $attributes['c_user_display'] = $formatUserDisplay($Brick->getAttribute('c_user'));
        $attributes['e_user_display'] = $formatUserDisplay($Brick->getAttribute('e_user'));

        return [
            'attributes' => $attributes,
            'settings' => $Brick->getSettings(),
            'customfields' => $Brick->getCustomFields(),
            'availableSettings' => $BrickManager->getAvailableBrickSettingsByBrickType(
                (string)$Brick->getAttribute('type')
            )
        ];
    },
    ['brickId'],
    'Permission::checkAdminUser'
);
