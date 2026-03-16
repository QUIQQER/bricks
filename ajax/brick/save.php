<?php

/**
 * This file contains package_quiqqer_bricks_ajax_brick_save
 */

/**
 * saves the brick
 *
 * @param string|Integer $brickId - Brick-ID
 * @param string $data - JSON Data
 *
 * @return array
 */
QUI::getAjax()->registerFunction(
    'package_quiqqer_bricks_ajax_brick_save',
    function ($brickId, $data) {
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
        $data = json_decode($data, true);

        $BrickManager?->saveBrick($brickId, $data);
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
    ['brickId', 'data'],
    'Permission::checkAdminUser'
);
