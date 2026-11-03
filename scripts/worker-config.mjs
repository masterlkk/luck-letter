import {mkdir,writeFile} from 'node:fs/promises';
if(!process.env.D1_DATABASE_ID||!/^[\da-f-]{36}$/i.test(process.env.D1_DATABASE_ID))throw new Error('Set the D1_DATABASE_ID repository variable first.');
await mkdir('.wrangler',{recursive:true});
await writeFile('.wrangler/deploy.json',JSON.stringify({name:'luck-letter',main:'../worker/index.mjs',compatibility_date:'2026-11-03',assets:{directory:'../dist',binding:'ASSETS',run_worker_first:['/api/*']},vars:{DEEPSEEK_MODEL:'deepseek-flash',ALLOWED_ORIGINS:process.env.ALLOWED_ORIGINS||'https://masterlkk.github.io'},d1_databases:[{binding:'DB',database_name:'luck-letter',database_id:process.env.D1_DATABASE_ID,migrations_dir:'../worker/migrations'}]},null,2));
console.log('Deployment configuration prepared. No model credentials are written to source.');
