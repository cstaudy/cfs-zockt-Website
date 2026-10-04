# Security Baseline v184

- Stream Lifecycle akzeptiert nur Creator-eigene, veröffentlichte Scene-IDs über die bestehende Stream-Studio-Sanitization.
- Automatik ist standardmäßig deaktiviert und zusätzlich separat opt-in.
- Keine Stream Keys, OAuth-Secrets oder Provider-Credentials werden in Lifecycle-Konfigurationen gespeichert.
- Runtime-Automatik arbeitet ausschließlich mit lokaler Launcher-Telemetrie und vorhandenen Scene-Referenzen.
