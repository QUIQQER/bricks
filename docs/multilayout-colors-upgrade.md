# MultiLayout-Farben mit Alpha

MultiLayout verwendet `qui/controls/elements/ColorField` für Overlay-, Hintergrund-
und Textfarben. Die Deckkraft gehört zum Farbwert; der separate Regler entfällt.
Einzelfarben bleiben Strings (einschließlich HEX mit Alpha, `transparent` und
Leerwerten). Palettenverknüpfungen und Hell-/Dunkelpaare werden nicht freigeschaltet.
Benötigt wird `quiqqer/qui >= 1.15.1` innerhalb der Hauptversion 1.

## Bestehende Werte

Nach dem Bricks-Setup läuft einmalig die Migration
`QUI\Bricks\Layout\OverlayMigration`. Sie verarbeitet zentrale MultiLayout-Bausteine,
individuelle UID-Einstellungen und die zugehörigen Seitenzuweisungen, einschließlich
Sublayouts und deaktivierter Bereiche. Andere Einstellungen und Bearbeitungsdaten
bleiben erhalten. Historische Revisionen werden nicht verändert.

Bei 100 % oder fehlender Deckkraft bleibt der Farbwert unverändert; ein solcher
Datensatz wird allein dafür nicht neu gespeichert. Bei abweichender Deckkraft gilt
`neues Alpha = vorhandenes Alpha × Deckkraft / 100`. Beispielsweise werden
`#000000` und 66 % zu `#000000a8`. Die bisherige Ganzzahlbegrenzung auf 0–100 bleibt
erhalten. Die Rundung auf 8-Bit-Alpha weicht höchstens etwa 0,2 Prozentpunkte ab.

Der Abschlussmarker liegt außerhalb des Caches:
`var/package/quiqqer/bricks/migrations/multilayout-overlay-alpha-v1.done`.
Er wird erst nach Verarbeitung und Cache-Invalidierung geschrieben. Ein Fehler
nennt den betroffenen Datensatz und verhindert den Abschluss. Nach Behebung das
Paket-Setup erneut ausführen; bereits konvertierte Farben werden nicht nochmals
multipliziert. Den Marker beim Übertragen eines Systems zusammen mit der Datenbank
behandeln. Editor und Frontend verwenden den gespeicherten Farbwert direkt;
eine nachträglich wiederhergestellte separate Deckkraft wird nicht ausgewertet.

Nicht konvertierbare alte CSS-Farben mit eigener Deckkraft bleiben unverändert und
werden vom Patch gemeldet. Eine bewusst geleerte Overlayfarbe bleibt transparent.

## CSS-Anpassungen

`--quiqqer-bricks-layout-background-overlay-opacity` bleibt mit Standard `1`
als zusätzlicher Theme-Faktor bestehen. Die gespeicherte Deckkraft wird für
konvertierte Farben nicht mehr in diese Variable geschrieben. Ein eigenes Override
wirkt daher auf das bereits enthaltene Alpha; es ersetzt die frühere gespeicherte
Deckkraft nicht mehr. Projektspezifische Overrides entsprechend prüfen.

## Prüfung

- Overlayfarbe mit Alpha wählen, Bereich übernehmen, Baustein speichern und erneut öffnen.
- Farbdialog übernehmen, aber Bereichsdialog abbrechen: Bereich bleibt unverändert.
- Hintergrund- und Textfarbe sowie Farbfelder in Sublayouts prüfen.
- Overlayfarbe leeren: kein schwarzes Overlay; Escape schließt nur den Farbdialog.
- Frontend und Vorschau vergleichen; Setup erneut ausführen: keine weiteren Datenänderungen.
