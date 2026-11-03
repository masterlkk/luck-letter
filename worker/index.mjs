import {handleApi} from '../server/api.mjs';

function d1Store(db){return {
  async allow(kind,id,max,windowMs){
    const now=Date.now(),period=Math.floor(now/windowMs),key=kind+':'+id+':'+period;
    await db.prepare('DELETE FROM rate_limits WHERE expires < ?').bind(now).run();
    const row=await db.prepare('INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,(period+1)*windowMs).first();
    return row.count<=max;
  },
  async listReviews(){
    const [stats,rows,stars]=await Promise.all([
      db.prepare('SELECT COUNT(*) AS count, ROUND(AVG(rating),1) AS average FROM reviews').first(),
      db.prepare('SELECT * FROM reviews ORDER BY created_at DESC LIMIT 24').all(),
      db.prepare('SELECT rating,COUNT(*) AS count FROM reviews GROUP BY rating').all()
    ]);
    return {count:stats.count,average:stats.average,distribution:[1,2,3,4,5].map(n=>stars.results.find(s=>s.rating===n)?.count||0),reviews:rows.results.map(r=>({id:r.id,rating:r.rating,helpful:r.helpful,note:r.note,nickname:r.nickname,quote:r.quote,archetype:r.archetype,style:r.style,mode:r.mode,createdAt:r.created_at}))};
  },
  async addReview(r){await db.prepare('INSERT INTO reviews (id,rating,helpful,note,nickname,quote,archetype,style,mode,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),r.rating,r.helpful,r.note,r.nickname,r.quote,r.archetype,r.style,r.mode,r.createdAt).run();}
};}

const headers={
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https:; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
};
export default {async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/')){
    const bytes=new TextEncoder().encode((env.RATE_LIMIT_SALT||'luck-letter')+(request.headers.get('CF-Connecting-IP')||'unknown'));
    const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
    return handleApi(request,env,env.DB?d1Store(env.DB):null,id);
  }
  if(!env.ASSETS)return new Response('Not found',{status:404});
  const response=await env.ASSETS.fetch(request);const output=new Response(response.body,response);for(const [key,value]of Object.entries(headers))output.headers.set(key,value);return output;
}};
