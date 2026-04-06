<?php

/**
 * This file contains package_quiqqer_bricks_ajax_getGroupNames
 */

/**
 * Returns group names by a list of group ids.
 *
 * @param string|array<int, string|int> $groupIds
 * @return array<string, string>
 */
QUI::getAjax()->registerFunction(
    'package_quiqqer_bricks_ajax_getGroupNames',
    static function ($groupIds): array {
        if (is_string($groupIds)) {
            $groupIds = json_decode($groupIds, true);
        }

        if (!is_array($groupIds)) {
            return [];
        }

        $result = [];
        $Groups = QUI::getGroups();

        foreach ($groupIds as $groupId) {
            if ($groupId === '' || $groupId === null) {
                continue;
            }

            try {
                $result[(string)$groupId] = $Groups->getGroupNameById((string)$groupId);
            } catch (Exception) {
                $result[(string)$groupId] = (string)$groupId;
            }
        }

        return $result;
    },
    ['groupIds'],
    'Permission::checkAdminUser'
);
