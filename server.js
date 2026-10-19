import { openDatabase } from './database/init.js';
import { createApp } from './src/app.js';
const db=openDatabase();
const server=createApp(db).listen(3000,'127.0.0.1',()=>console.log('VOS disponível em http://localhost:3000 — demonstração acadêmica local.'));
server.on('error', error=>{ console.error(error.code==='EADDRINUSE'?'Porta 3000 ocupada. Encerre a outra aplicação.':'Não foi possível iniciar o servidor.'); db.close(); process.exitCode=1; });
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));
