import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,statSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
const dir=mkdtempSync(join(tmpdir(),'vos-runtime-'));
const child=spawn(process.execPath,['scripts/runtime-child.js'],{env:{...process.env,VOS_DB_PATH:join(dir,'database.db')},stdio:['ignore','pipe','pipe','ipc']});
try {
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Servidor não iniciou em 10 s. Verifique a porta 3000.')),10000);child.once('exit',()=>{clearTimeout(timeout);reject(new Error('Servidor encerrou antes de ficar pronto.'));});child.stdout.on('data',data=>{if(data.toString().includes('VOS disponível')){clearTimeout(timeout);resolve();}});});
 const samples=[];
 for(let i=0;i<30;i++){const start=performance.now();const r=await fetch('http://127.0.0.1:3000/api/viagens/1/assentos');const data=await r.json();if(r.status!==200||data.length!==44)throw new Error('Mapa inválido');samples.push(performance.now()-start);}
 samples.sort((a,b)=>a-b);
 const usage=await new Promise(resolve=>{child.once('message',resolve);child.send('memory');});const rssMiB=Number((usage.rss/1024/1024).toFixed(2));
 const treeSize=path=>statSync(path).isDirectory()?readdirSync(path).reduce((sum,file)=>sum+treeSize(join(path,file)),0):statSync(path).size;
 const report={executadoEm:new Date().toISOString(),node:process.version,plataforma:process.platform,amostras:30,operacao:'GET assentos, aplicação em processo separado, banco temporário, sem concorrência',medianaMs:Number(samples[15].toFixed(2)),maximoMs:Number(samples[29].toFixed(2)),rssMiB,frontendMaisBancoBytes:treeSize('public')+treeSize(dir)};
 mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/runtime-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve);});rmSync(dir,{recursive:true,force:true});}
