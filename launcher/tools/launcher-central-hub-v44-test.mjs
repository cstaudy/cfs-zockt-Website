// Compatibility entry point. Launcher core completion is now validated by v140.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
process.argv[2]=path.resolve(here,'..');
await import('./launcher-completion-v140-test.mjs');
