<?php

namespace QUI\Bricks\Layout;

use Doctrine\DBAL\Connection;
use QUI;
use QUI\Bricks\Manager;
use RuntimeException;
use stdClass;

/** One-time setup migration; individual updates are safe to retry after interruption. */
final class OverlayMigration
{
    public const MARKER = 'multilayout-overlay-alpha-v1.done';

    public static function onSetup(QUI\Package\Package $Package): void
    {
        if ($Package->getName() !== 'quiqqer/bricks') {
            return;
        }

        $directory = $Package->getVarDir() . 'migrations/';
        QUI\Utils\System\File::mkdir($directory);
        $marker = $directory . self::MARKER;

        if (is_file($marker)) {
            return;
        }

        $lock = fopen($directory . self::MARKER . '.lock', 'c');

        if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
            throw new RuntimeException('Cannot lock the MultiLayout overlay migration.');
        }

        try {
            if (is_file($marker)) {
                return;
            }

            $Projects = QUI::getProjectManager()->getProjectList();
            $siteTables = [];
            foreach ($Projects as $Project) {
                $siteTables[] = $Project->table();
            }
            self::migrate(QUI::getDataBaseConnection(), Manager::getTable(), Manager::getUIDTable(), $siteTables);
            QUI\Cache\Manager::clear('quiqqer/bricks');

            foreach ($Projects as $Project) {
                $Project->clearCache();
            }

            $temporary = tempnam($directory, 'overlay-');

            if ($temporary === false) {
                throw new RuntimeException('Cannot create the MultiLayout migration marker.');
            }

            try {
                if (file_put_contents($temporary, "1\n") !== 2 || !rename($temporary, $marker)) {
                    throw new RuntimeException('Cannot persist the MultiLayout migration marker.');
                }
            } finally {
                if (is_file($temporary)) {
                    unlink($temporary);
                }
            }
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /** @param list<string> $siteTables */
    public static function migrate(Connection $DB, string $bricksTable, string $uidTable, array $siteTables): int
    {
        $Platform = $DB->getDatabasePlatform();
        $ids = $DB->createQueryBuilder()
            ->select('id')
            ->from($Platform->quoteIdentifier($bricksTable))
            ->where('type = :type')
            ->setParameter('type', '\\QUI\\Bricks\\Controls\\MultiLayout')
            ->executeQuery()->fetchFirstColumn();
        $types = array_fill_keys(array_map('strval', $ids), true);

        if ($types === []) {
            return 0;
        }

        $changed = self::updateRows($DB, $bricksTable, 'id', 'settings', function ($value, $row) use ($types) {
            return isset($types[(string)$row['id']]) ? self::settings($value) : $value;
        });
        $changed += self::updateRows($DB, $uidTable, 'uid', 'customfields', function ($value, $row) use ($types) {
            return isset($types[(string)$row['brickId']]) ? self::settings($value) : $value;
        }, ['brickId']);

        foreach (array_unique($siteTables) as $table) {
            $changed += self::updateRows($DB, $table, 'id', 'extra', function ($value) use ($types) {
                if (!is_string($value) || !str_contains($value, 'quiqqer.bricks.areas')) {
                    return $value;
                }

                $extra = json_decode($value, false, 512, JSON_THROW_ON_ERROR);

                if (!$extra instanceof stdClass || !isset($extra->{'quiqqer.bricks.areas'})) {
                    return $value;
                }

                $original = $extra->{'quiqqer.bricks.areas'};
                if (is_string($original) && trim($original) === '') {
                    return $value;
                }
                $areas = is_string($original) ? json_decode($original, false, 512, JSON_THROW_ON_ERROR) : $original;
                $changed = false;

                if (!is_array($areas) && !$areas instanceof stdClass) {
                    throw new RuntimeException('Invalid site brick assignments.');
                }

                $assignmentsByArea = $areas instanceof stdClass ? get_object_vars($areas) : $areas;

                foreach ($assignmentsByArea as $assignments) {
                    if (!is_array($assignments)) {
                        continue;
                    }
                    foreach ($assignments as $assignment) {
                        if (!$assignment instanceof stdClass || !isset($types[(string)($assignment->brickId ?? '')])) {
                            continue;
                        }
                        $before = $assignment->customfields ?? null;
                        $after = self::settings($before);
                        if ($before !== $after) {
                            $assignment->customfields = $after;
                            $changed = true;
                        }
                    }
                }

                if (!$changed) {
                    return $value;
                }
                $extra->{'quiqqer.bricks.areas'} = is_string($original)
                    ? json_encode($areas, JSON_THROW_ON_ERROR) : $areas;
                return json_encode($extra, JSON_THROW_ON_ERROR);
            });
        }

        return $changed;
    }

    /** Only rewrite a settings payload when a color actually requires conversion. */
    public static function settings(mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return $value;
        }
        if (!is_string($value) && !$value instanceof stdClass) {
            return $value;
        }
        $data = is_string($value) ? json_decode($value, false, 512, JSON_THROW_ON_ERROR) : clone $value;
        if (!$data instanceof stdClass || !isset($data->layoutAreas)) {
            return $value;
        }
        $before = $data->layoutAreas;
        $data->layoutAreas = self::document($before);
        if ($before === $data->layoutAreas) {
            return $value;
        }
        return is_string($value) ? json_encode($data, JSON_THROW_ON_ERROR) : $data;
    }

    public static function document(mixed $value): mixed
    {
        if ($value === '' || $value === null) {
            return $value;
        }
        $document = is_string($value) ? json_decode($value, false, 512, JSON_THROW_ON_ERROR) : $value;
        if ($document === []) {
            return $value;
        }
        if (!$document instanceof stdClass) {
            throw new RuntimeException('Invalid layoutAreas document.');
        }
        // Deep copy: comparison and callers must retain the original document.
        $document = json_decode(json_encode($document, JSON_THROW_ON_ERROR), false, 512, JSON_THROW_ON_ERROR);
        $changed = self::convertDocument($document, 'layoutAreas');
        if (!$changed) {
            return $value;
        }
        return is_string($value) ? json_encode($document, JSON_THROW_ON_ERROR) : $document;
    }

    private static function convertDocument(stdClass $document, string $path): bool
    {
        $changed = false;
        $areas = $document->areas ?? [];
        if (!is_array($areas) && !$areas instanceof stdClass) {
            throw new RuntimeException('Invalid areas at ' . $path);
        }
        if ($areas instanceof stdClass) {
            $areas = get_object_vars($areas);
        }
        foreach ($areas as $id => $area) {
            if (!$area instanceof stdClass) {
                continue;
            }
            $opacity = OverlayColor::opacity($area->backgroundOverlayOpacity ?? null);
            if ($opacity !== 100) {
                $color = is_string($area->backgroundOverlayColor ?? null) ? $area->backgroundOverlayColor : '#000000';
                $converted = OverlayColor::convert($color, $opacity);
                if ($converted === null) {
                    throw new RuntimeException('Unsupported overlay color at ' . $path . '.areas.' . $id);
                }
                $area->backgroundOverlayColor = $converted;
                unset($area->backgroundOverlayOpacity);
                $changed = true;
            }
            if (isset($area->subLayoutDocument)) {
                $before = $area->subLayoutDocument;
                $after = self::document($before);
                if ($after !== $before) {
                    $area->subLayoutDocument = $after;
                    $changed = true;
                }
            }
        }
        return $changed;
    }

    /**
     * Bounded reads and compare-and-swap writes: do not overwrite concurrent editor changes.
     * @param callable(mixed, array<string, mixed>): mixed $transform
     * @param list<string> $extraColumns
     */
    private static function updateRows(
        Connection $DB,
        string $table,
        string $key,
        string $column,
        callable $transform,
        array $extraColumns = []
    ): int {
        $Platform = $DB->getDatabasePlatform();
        $table = $Platform->quoteIdentifier($table);
        $key = $Platform->quoteIdentifier($key);
        $column = $Platform->quoteIdentifier($column);
        $columns = array_map($Platform->quoteIdentifier(...), $extraColumns);
        $changed = 0;
        $offset = 0;
        do {
            $rows = $DB->createQueryBuilder()->select($key, $column, ...$columns)->from($table)
                ->orderBy($key)->setFirstResult($offset)->setMaxResults(200)->executeQuery()->fetchAllAssociative();
            foreach ($rows as $row) {
                // Fetch results use unquoted field names.
                $values = array_values($row);
                [$id, $before] = $values;
                try {
                    $after = $transform($before, $row);
                    if ($after === $before) {
                        continue;
                    }
                    $count = $DB->createQueryBuilder()->update($table)->set($column, ':after')
                        ->where($key . ' = :id')->andWhere($column . ' = :before')
                        ->setParameter('id', $id)->setParameter('before', $before)->setParameter('after', $after)
                        ->executeStatement();
                    if ($count !== 1) {
                        throw new RuntimeException('Concurrent change; retry setup.');
                    }
                    $changed++;
                } catch (\Throwable $Exception) {
                    throw new RuntimeException($table . ' [' . $id . ']: ' . $Exception->getMessage(), 0, $Exception);
                }
            }
            $offset += count($rows);
        } while (count($rows) === 200);
        return $changed;
    }
}
