import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import {handleApi} from './server/api.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const publicRoot=path.join(root,'public'),dataRoot=path.join(root,'data');
const reviewsFile=path.join(dataRoot,'reviews.json');
const limits=new Map();let queue=Promise.resolve();
async function readReviews(){try{return JSON.parse(await readFile(reviewsFile,'utf8'));}catch(error){if(error.code==='ENOENT')return [];throw error;}}
export const store={
  async allow(kind,id,max,windowMs){
    const now=Date.now(),key=kind+':'+id+':'+Math.floor(now/windowMs);
    for(const [key,item]of limits)if(item.expires<now)limits.delete(key);
    if(!limits.has(key)&&limits.size>=20000)return false;
    const item=limits.get(key)||{count:0,expires:now+windowMs};item.count++;limits.set(key,item);return item.count<=max;
  },
  async listReviews(){
    await queue;const reviews=await readReviews(),count=reviews.length;
    return {reviews:reviews.slice(-24).reverse(),count,average:count?Math.round(reviews.reduce((s,r)=>s+r.rating,0)/count*10)/10:null,distribution:[1,2,3,4,5].map(n=>reviews.filter(r=>r.rating===n).length)};
  },
  async addReview(review){
    const task=queue.then(async()=>{await mkdir(dataRoot,{recursive:true});const reviews=await readReviews();reviews.push({...review,id:crypto.randomUUID()});await writeFile(reviewsFile+'.tmp',JSON.stringify(reviews),'utf8');await rename(reviewsFile+'.tmp',reviewsFile);});
    queue=task.catch(()=>{});await task;
  }
};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https:; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"};
export const server=http.createServer(async(req,res)=>{
  try{
    const host=req.headers.host||'localhost',url=new URL(req.url,'http://'+host);
    if(url.pathname.startsWith('/api/')){
      const init={method:req.method,headers:req.headers};
      if(!['GET','HEAD'].includes(req.method)){init.body=Readable.toWeb(req);init.duplex='half';}
      const request=new Request(url,init);
      const client=process.env.TRUST_PROXY==='true'?(req.headers['x-forwarded-for']||'').split(',')[0].trim():req.socket.remoteAddress;
      const id=createHash('sha256').update((process.env.RATE_LIMIT_SALT||'local')+client).digest('hex');
      const response=await handleApi(request,process.env,store,id);
      res.writeHead(response.status,{...security,...Object.fromEntries(response.headers)});res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,security);res.end();return;}
    const decoded=decodeURIComponent(url.pathname),filename=path.resolve(publicRoot,'.'+(decoded==='/'?'/index.html':decoded));
    if(!filename.startsWith(publicRoot+path.sep)){res.writeHead(403,security);res.end();return;}
    let content;try{content=await readFile(filename);}catch{res.writeHead(404,{...security,'Content-Type':'text/plain; charset=utf-8'});res.end('这封信还没有寄到这里。');return;}
    res.writeHead(200,{...security,'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);
  }catch{res.writeHead(500,security);res.end('服务暂时繁忙。');}
});
server.requestTimeout=90000;server.headersTimeout=15000;
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  server.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('好运来信 Local: http://127.0.0.1:'+(Number(process.env.PORT)||4173)));
}
