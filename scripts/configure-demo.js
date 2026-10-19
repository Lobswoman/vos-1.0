import {openDatabase,readDemo,demoValues} from '../database/init.js';
const db=openDatabase();
try {
  db.exec('BEGIN IMMEDIATE');
  const count=db.prepare('SELECT COUNT(*) AS n FROM reservas_viagem WHERE viagem_id=1').get().n;
  if(count)throw new Error('A excursão já possui reservas. Alteração bloqueada para preservar os contratos e vouchers. Use um banco de demonstração separado com VOS_DB_PATH.');
  db.prepare(`UPDATE viagens_config SET identificacao=?,origem=?,destino=?,data_partida=?,data_retorno=?,descricao=?,valor_centavos=? WHERE id=1`).run(...demoValues(readDemo()));
  db.exec('COMMIT');console.log('Configuração fictícia da excursão atualizada a partir de database/demo.json.');
}catch(error){db.exec('ROLLBACK');console.error(error.message);process.exitCode=1;}finally{db.close();}
