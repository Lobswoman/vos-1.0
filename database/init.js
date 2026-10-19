import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
export function readDemo() {
  const demo = JSON.parse(readFileSync(resolve(root, 'demo.json'), 'utf8'));
  for (const k of ['identificacao','origem','destino','descricao']) {
    if (typeof demo[k] !== 'string' || !demo[k].trim() || demo[k].length > 1000) throw new Error('Configuração da excursão inválida: ' + k);
  }
  if (!Number.isInteger(demo.valor_centavos) || demo.valor_centavos < 0 || !Number.isSafeInteger(demo.valor_centavos * 5)) throw new Error('Preço inválido: use centavos inteiros.');
  if (!Number.isFinite(Date.parse(demo.data_partida)) || !Number.isFinite(Date.parse(demo.data_retorno)) || Date.parse(demo.data_retorno) < Date.parse(demo.data_partida)) throw new Error('Datas da excursão inválidas.');
  return demo;
}
export function demoValues(d) { return [d.identificacao,d.origem,d.destino,d.data_partida,d.data_retorno,d.descricao,d.valor_centavos]; }
export function openDatabase(path = process.env.VOS_DB_PATH || resolve(root, 'database.db')) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec(readFileSync(resolve(root, 'schema.sql'), 'utf8'));
  const demo = readDemo();
  db.prepare(`INSERT OR IGNORE INTO viagens_config
    (id, identificacao, origem, destino, data_partida, data_retorno, descricao, valor_centavos)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)`).run(...demoValues(demo));
  return db;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = openDatabase(); db.close(); console.log('SQLite inicializado (dados fictícios).');
}
