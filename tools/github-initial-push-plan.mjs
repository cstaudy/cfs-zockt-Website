import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const out=path.join(root,'reports','github-initial-push-plan.md');
fs.mkdirSync(path.dirname(out),{recursive:true});
const remote='https://github.com/cstaudy/cfs-zockt-Website.git';
const body=`# GitHub Initial Push Plan\n\nRepository: \`cstaudy/cfs-zockt-Website\`\n\n\`\`\`bash\nnpm run github21:check\ngit init -b main\ngit remote add origin ${remote}\ngit add .\ngit status --short\ngit commit -m "Initial cfs_zockt Creator Suite release candidate"\ngit push -u origin main\n\`\`\`\n\nNach dem Push zuerst den Quality Gate ausführen. Danach den manuellen Lockfile-Workflow starten und die erzeugten Lockfiles committen.\n`;
fs.writeFileSync(out,body);
console.log(out);
