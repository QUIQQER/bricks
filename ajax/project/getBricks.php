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

        $bricks = $BrickManager?->getBrickRecordsFromProject($Project) ?? [];
        $availableBricks = $BrickManager?->getAvailableBricks() ?? [];
        $result = [];
        $availableByControl = [];

        foreach ($availableBricks as $availableBrick) {
            if (empty($availableBrick['control'])) {
                continue;
            }

            $availableByControl[$availableBrick['control']] = $availableBrick;
        }

        foreach ($bricks as $attributes) {
            $type = $attributes['type'] ?? '';
            $definitionData = $availableByControl[$type] ?? [];
            $missingControl = $type !== 'content' && empty($definitionData);

            $mockup = $definitionData['mockup'] ?? $placeholderMockup;
            $thumbnail = $definitionData['thumbnail'] ?? $mockup;

            $attributes['name'] = $definitionData['title'] ?? ($definitionData['name'] ?? '');
            $attributes['mockup'] = $mockup;
            $attributes['thumbnail'] = $thumbnail;
            $attributes['deprecated'] = !empty($definitionData['deprecated']) || !empty($attributes['deprecated']) ? 1 : 0;
            $attributes['missingControl'] = $missingControl ? 1 : 0;

            // categories come from the brick definition, not from the stored
            // brick, so a picker can offer a filtered choice without knowing
            // any control class
            $attributes['categories'] = $definitionData['categories'] ?? [];

            if (!$area) {
                $result[] = $attributes;
                continue;
            }

            $areas = $attributes['areas'] ?? '';

            if (str_contains($areas, ',' . $area . ',')) {
                $result[] = $attributes;
            }
        }

        return $result;
    },
    ['project', 'area'],
    'Permission::checkAdminUser'
);
