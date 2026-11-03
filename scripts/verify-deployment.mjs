import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const base=new URL(process.env.PUBLISHED_URL);
if(base.protocol!=='https:')throw new Error('Published URL must use HTTPS.');
if(!base.pathname.endsWith('/'))base.pathname+='/';
const hash=text=>createHash('sha256').update(text).digest('hex');
const filenames=['index.html','styles.css','app.mjs','domain.mjs','favicon.svg'];
let lastError;
for(let attempt=0;attempt<4;attempt++){
  try{
    const results=await Promise.all(filenames.map(async filename=>{
      const url=new URL(filename,base);url.searchParams.set('verify',process.env.GITHUB_SHA||'latest');
      const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'Cache-Control':'no-cache'}});
      if(!response.ok)throw new Error(filename+' returned HTTP '+response.status);
      const content=await response.text(),expected=await readFile(path.join(root,'public',filename),'utf8');
      if(hash(content)!==hash(expected))throw new Error(filename+' does not yet match this source commit.');
      return filename+' HTTP '+response.status+' matches source';
    }));
    const config=await fetch(new URL('config.js',base),{signal:AbortSignal.timeout(15000)});
    if(!config.ok)throw new Error('Frontend configuration is unavailable.');
    const content=await config.text();
    if(!content.includes('LUCK_CONFIG')||/sk-[a-zA-Z0-9]{20,}/.test(content))throw new Error('Invalid public frontend configuration.');
    console.log('Verified published site: '+base.href);
    results.forEach(result=>console.log(result));
    console.log('Public configuration contains no API credential.');
    lastError=null;break;
  }catch(error){lastError=error;if(attempt<3)await new Promise(resolve=>setTimeout(resolve,5000));}
}
if(lastError)throw lastError;
