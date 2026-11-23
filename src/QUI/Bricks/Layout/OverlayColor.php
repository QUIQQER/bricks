<?php

namespace QUI\Bricks\Layout;

/** Overlay opacity conversion for the one-time setup migration. */
final class OverlayColor
{
    public static function opacity(mixed $value): int
    {
        return is_numeric($value) ? max(0, min(100, (int)$value)) : 100;
    }

    /** null means that the legacy pair must be retained, not silently discarded. */
    public static function convert(string $color, int $opacity): ?string
    {
        if ($opacity === 100 || $color === '' || $color === 'transparent') {
            return $color;
        }

        if (!preg_match('/^#([a-f0-9]{3}|[a-f0-9]{4}|[a-f0-9]{6}|[a-f0-9]{8})$/iD', $color, $match)) {
            return null;
        }

        $hex = $match[1];

        if (strlen($hex) < 5) {
            $hex = implode('', array_map(static fn(string $digit): string => $digit . $digit, str_split($hex)));
        }

        $alpha = strlen($hex) === 8 ? hexdec(substr($hex, 6, 2)) : 255;
        $alpha = (int)round($alpha * $opacity / 100);

        return '#' . strtolower(substr($hex, 0, 6)) . sprintf('%02x', $alpha);
    }
}
