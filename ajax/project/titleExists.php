<?php

/**
 * This file contains package_quiqqer_bricks_ajax_project_titleExists
 */

/**
 * Check whether a brick title already exists in the project
 *
 * @param string $project - json array, Project Data
 * @param string $title
 *
 * @return int
 */
QUI::getAjax()->registerFunction(
    'package_quiqqer_bricks_ajax_project_titleExists',
    function ($project, $title) {
        $Project = QUI::getProjectManager()->decode($project);
        $BrickManager = QUI\Bricks\Manager::init();

        return $BrickManager?->titleExists($Project, $title) ? 1 : 0;
    },
    ['project', 'title'],
    'Permission::checkAdminUser'
);
