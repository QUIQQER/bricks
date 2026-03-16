<?php

// Manual fallback patch for legacy installations.
// Regular package setup already adds these columns via onPackageSetup().
// Do not execute unless package setup failed to add the metadata columns.

define('QUIQQER_SYSTEM', true);
define('SYSTEM_INTERN', true);
require dirname(dirname(dirname(dirname(__FILE__)))) . '/header.php';

if (!class_exists('QUI\Bricks\Manager')) {
    exit;
}

$tableManager = QUI::getDataBase()->table();

if ($tableManager === null) {
    exit;
}

$bricksTable = QUI\Bricks\Manager::getTable();
$columns = array_flip($tableManager->getColumns($bricksTable));
$fields = [];

if (!isset($columns['c_date'])) {
    $fields['c_date'] = 'TIMESTAMP NULL DEFAULT NULL';
}

if (!isset($columns['e_date'])) {
    $fields['e_date'] = 'TIMESTAMP NULL DEFAULT NULL';
}

if (!isset($columns['c_user'])) {
    $fields['c_user'] = 'VARCHAR(50) NULL DEFAULT NULL';
}

if (!isset($columns['e_user'])) {
    $fields['e_user'] = 'VARCHAR(50) NULL DEFAULT NULL';
}

if (empty($fields)) {
    echo 'Already executed' . PHP_EOL;
    exit;
}

$tableManager->addColumn($bricksTable, $fields);

echo 'Brick metadata columns added' . PHP_EOL;
