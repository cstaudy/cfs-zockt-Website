# cfs_zockt – Release Readiness v138

## Interne Basis
Die automatisierte lokale Basis ist als Release-Gate zusammengeführt. Ein grünes internes Gate bedeutet, dass die im Repository prüfbaren Verträge konsistent sind.

Es bedeutet ausdrücklich nicht, dass der öffentliche Production-Release bereits extern abgenommen ist.

## Production-Freigabe
Vor einer breiten Creator-Freigabe bleiben verpflichtend:

1. unabhängiger Penetrationstest
2. Online-Advisory-/Dependency-Audit
3. Windows-Code-Signing, Installer- und Update-Abnahme
4. produktiver Backup-/Restore-Test
5. Mehraccount-/Mehrgeräte-/Reconnect-/Soak-Test
6. Incident-/Credential-Rotation-Drill

## Release-Prinzip
- kein stilles Überschreiben im Widget Studio
- keine unsichere Remote-HTTP-Bridge
- signierte mutierende Launcher-Anfragen
- Replay-Schutz
- Creator-Zustand und Release-Zustand getrennt sichtbar
- keine Behauptung `production_ready`, solange externe Gates offen sind
