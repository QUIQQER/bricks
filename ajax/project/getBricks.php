<?php

/**
 * This file contains package_quiqqer_bricks_ajax_project_getBricks
 */

/**
 * Returns the bricks of the project area
 *
 * @param string $project - json array, Project Data
 * @param string|bool $area - (optional), Area name
 *
 * @return array
 */
QUI::getAjax()->registerFunction(
    'package_quiqqer_bricks_ajax_project_getBricks',
    function ($project, $area = false) {
        $Project = QUI::getProjectManager()->decode($project);
        $BrickManager = QUI\Bricks\Manager::init();
        $placeholderMockup = '/packages/quiqqer/bricks/bin/images/mockup-placeholder.svg';

        $bricks = $BrickManager?->getBricksFromProject($Project) ?? [];
        $availableBricks = $BrickManager?->getAvailableBricks() ?? [];
        $result = [];
        $availableByControl = [];

        foreach ($availableBricks as $availableBrick) {
            if (empty($availableBrick['control'])) {
                continue;
            }

            $availableByControl[$availableBrick['control']] = $availableBrick;
        }

        foreach ($bricks as $Brick) {
            /* @var $Brick QUI\Bricks\Brick */
            $attributes = $Brick->getAttributes();
            $type = $Brick->getAttribute('type');
            $definitionData = $availableByControl[$type] ?? [];

            $mockup = $definitionData['mockup'] ?? $placeholderMockup;
            $thumbnail = $definitionData['thumbnail'] ?? $mockup;

            $attributes['name'] = $definitionData['title'] ?? ($definitionData['name'] ?? '');
            $attributes['mockup'] = $mockup;
            $attributes['thumbnail'] = $thumbnail;

            if (!$area) {
                $result[] = $attributes;
                continue;
            }

            $areas = $Brick->getAttribute('areas');

            if (str_contains($areas, ',' . $area . ',')) {
                $result[] = $attributes;
            }
        }

        return $result;
    },
    ['project', 'area'],
    'Permission::checkAdminUser'
);
