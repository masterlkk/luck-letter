import {cp,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist=path.join(root,'dist');await mkdir(dist,{recursive:true});
await cp(path.join(root,'public'),dist,{recursive:true});
const apiBase=process.env.PUBLIC_API_BASE||'';
if(apiBase){const url=new URL(apiBase);if(url.protocol!=='https:')throw new Error('PUBLIC_API_BASE must use HTTPS');}
await writeFile(path.join(dist,'config.js'),'window.LUCK_CONFIG = '+JSON.stringify({apiBase})+';\n');
const files=await readdir(dist);for(const file of files){const text=await readFile(path.join(dist,file),'utf8');if(/sk-[a-zA-Z0-9]{20,}/.test(text))throw new Error('Possible API credential in public output');}
console.log('Built dist/ ('+files.length+' files). No frontend dependencies.');
