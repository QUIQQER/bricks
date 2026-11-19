# MultiLayout colors and opacity

MultiLayout uses `qui/controls/elements/ColorField` for overlay, background, and
text colors. The color's alpha channel replaces the separate opacity slider.
Each field stores a single color as a string, including hex colors with alpha,
`transparent`, and empty strings. Palette links and light/dark color pairs remain
disabled. MultiLayout requires `quiqqer/qui` version 1.15.1 or later in the 1.x series.

## Migrating existing values

The one-time `QUI\Bricks\Layout\OverlayMigration` migration runs at the end of
Bricks package setup. It processes shared MultiLayout bricks, UID-specific
settings, and the corresponding page assignments, including nested layouts and
disabled areas. It preserves other settings, editing data, and historical revisions.

If opacity is 100% or absent, the migration keeps the color and skips writing
the record unless another value needs conversion. For other opacity values, it
uses `new alpha = existing alpha × opacity / 100`. For example, `#000000` at
66% opacity becomes `#000000a8`. The migration applies the same integer range
of 0–100 as before. Rounding to 8-bit alpha introduces a maximum error of about
0.2 percentage points.

If brick settings, UID-specific settings, or a page assignment contain invalid
data, the migration skips the affected entry. The warning log identifies the
record and the reason. If the page's assignment list is readable, the migration
continues with the remaining assignments on that page.

After processing the records and clearing the caches, the migration writes its
completion marker, even if it skipped individual entries. It stores the marker
outside the cache at
`var/package/quiqqer/bricks/migrations/multilayout-overlay-alpha-v1.done`.
If a database operation or write fails, fix the cause and rerun package setup.
The migration applies opacity only once to each converted color. When moving
an installation, transfer the marker together with the corresponding database.

The editor and frontend read the stored color directly. Restoring a separate
opacity value later has no effect. If the migration cannot convert a legacy CSS
color with a separate opacity value, it preserves the original data and logs a
warning. An intentionally empty overlay color stays transparent.

## CSS overrides

The `--quiqqer-bricks-layout-background-overlay-opacity` custom property defaults
to `1` and acts as an additional theme multiplier. Converted colors already
include the saved opacity in their alpha channel. Review project-specific
overrides that previously replaced the saved opacity. They now multiply the
alpha already present in the color.

## Verification

- Choose an overlay color with alpha, confirm the area changes, save the brick,
  and reopen it. Verify that the color and opacity are preserved.
- Confirm a color change in the color dialog, then cancel the area dialog.
  Verify that the area retains its original settings.
- Check background and text colors, including the color fields in nested layouts.
- Clear the overlay color and verify that the overlay is transparent. With the
  color dialog open, press Escape and verify that only that dialog closes.
- Compare the frontend with the preview. Rerun package setup and verify that
  it makes no further data changes.
