import fs from 'fs';
import path from 'path';
import assert from 'assert/strict';
import { execFileSync } from 'child_process';

const root=process.argv[2]?path.resolve(process.argv[2]):process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=rel=>fs.existsSync(path.join(root,rel));
const checks=[];
const check=(name,pass,detail='')=>checks.push({name,pass:Boolean(pass),detail});

const catalogPath='public/assets/data/original-design-catalog-v32065.json';
check('Original design catalog JSON exists',exists(catalogPath));
const catalog=JSON.parse(read(catalogPath));
check('Catalog kind and schema are correct',catalog.kind==='cfs-original-design-catalog'&&catalog.schema===1);
check('Catalog contains 31 original designs',Array.isArray(catalog.designs)&&catalog.designs.length===31,`found ${catalog.designs?.length}`);
check('Every original design exposes 16 colors',catalog.designs.every(item=>Array.isArray(item.colors)&&item.colors.length===16));
check('Catalog includes theme categories',Array.isArray(catalog.categories)&&catalog.categories.length>=6);

const makerCatalog=JSON.parse(read('public/assets/data/design-pack-catalog-v211.json'));
check('Maker catalog contains same 31 designs',Array.isArray(makerCatalog.designs)&&makerCatalog.designs.length===31);
check('Maker catalog preview URLs use original-design preview route',makerCatalog.designs.every(item=>String(item.preview?.master||'').startsWith('/api/original-designs/preview/')));

const shopHtml=read('public/pages/shop.html');
check('Shop page contains original designs section',shopHtml.includes('id="originalDesigns"')&&shopHtml.includes('Originaldesigns direkt im Shop'));
check('Shop page loads original design shop script',shopHtml.includes('/assets/js/page-shop-original-designs-v32066.js'));

const shopCss=read('public/assets/css/cfs-shop-v172.css');
check('Shop CSS styles original design grid',shopCss.includes('.original-design-grid')&&shopCss.includes('.original-design-card'));

const server=read('server.js');
check('Server exposes original design catalog route',server.includes('"/api/original-designs/catalog"'));
check('Server exposes original design preview route',server.includes('"/api/original-designs/preview/:designId/:colorId.jpg"'));
check('Server exposes original design package route',server.includes('"/api/original-designs/package/:designId/:colorId.zip"'));

const makerJs=read('public/assets/js/stream-maker.js');
check('Stream Maker can open original design pack variants',makerJs.includes('entry?.preview?.master')&&makerJs.includes('q.get(\'pack\')'));
const makerCore=read('public/assets/js/stream-maker-core.js');
check('Stream Maker asset allowlist accepts original design preview URLs',/api\\\/original-designs\\\/preview/.test(makerCore));

const sourceZip='resources/original-designs/Streaming-Gesamtpaket-31-Designs-496-Farbvarianten-Animiert-DE.zip';
check('Original source ZIP is included in project',exists(sourceZip));
const zipList=execFileSync('unzip',['-Z','-1',path.join(root,sourceZip)],{encoding:'utf8',maxBuffer:64*1024*1024}).split(/\r?\n/).filter(Boolean);
const designRoots=new Set(zipList.filter(name=>name.startsWith('Streaming-Gesamtpaket-31-Designs-496-Farbvarianten-Animiert-DE/Designs/')).map(name=>name.split('/')[2]).filter(Boolean));
check('Source ZIP still contains 31 top-level design folders',designRoots.size===31,`found ${designRoots.size}`);

let ok=true;
for(const entry of checks){
  const prefix=entry.pass?'✅':'❌';
  console.log(`${prefix} ${entry.name}${entry.detail?` (${entry.detail})`:''}`);
  if(!entry.pass)ok=false;
}
if(!ok)process.exit(1);
