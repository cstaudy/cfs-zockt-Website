import {spawnSync} from 'node:child_process';
const candidates=process.platform==='win32'?[['py','-3'],['python']]:[['python3'],['python']];
let found=false,exit=1;
for(const [cmd,...extra] of candidates){
 const result=spawnSync(cmd,[...extra,'tools/cfs-ai-design-factory/test_design_factory.py'],{stdio:'inherit'});
 if(result.error?.code==='ENOENT')continue;
 found=true;exit=result.status??1;break;
}
if(!found)console.error('Python 3.10+ benötigt, damit die lokalen CFS-AI-Design-Tests laufen.');
process.exit(exit);
