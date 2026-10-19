// Harness exclusivo da medição: nenhuma rota de diagnóstico é exposta pela aplicação.
import '../server.js';
process.on('message',message=>{if(message==='memory')process.send(process.memoryUsage());});
