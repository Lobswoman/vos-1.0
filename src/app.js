import express from 'express';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { TERM_VERSION, CONTRACT_VERSION, validateReservation } from './rules.js';
const sha = data => createHash('sha256').update(data).digest('hex');
const code = prefix => prefix + '-' + randomBytes(8).toString('hex').toUpperCase();
class AppError extends Error { constructor(status, message) { super(message); this.status = status; } }
export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req,res,next) => {
    res.set({
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'X-Frame-Options':'DENY',
      'Permissions-Policy':'camera=(), microphone=(), geolocation=()'
    });
    // Same-origin API only; mitigates cross-site writes and DNS rebinding.
    const host = req.hostname;
    if (!['localhost','127.0.0.1','[::1]','::1'].includes(host)) return res.status(403).json({erro:'Host não autorizado.'});
    if (req.path.startsWith('/api/')) {
      res.set('Cache-Control','no-store');
      const origin = req.get('origin');
      if ((origin && origin !== `http://${req.get('host')}`) || req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({erro:'Origem não autorizada.'});
    }
    next();
  });
  app.use(express.json({limit:'300kb'}));
  const tripById = id => db.prepare('SELECT * FROM viagens_config WHERE id=?').get(id);
  const tripReady = id => {
    const trip = tripById(id);
    if (!trip) throw new AppError(404,'Excursão não encontrada.');
    if (trip.status !== 'DISPONIVEL' || Date.parse(trip.data_partida) <= Date.now()) throw new AppError(409,'Esta excursão está indisponível.');
    return trip;
  };
  app.get('/api/viagens', (req,res) => res.json(db.prepare(`SELECT v.*, 44-(SELECT COUNT(*) FROM reserva_passageiros rp WHERE rp.viagem_id=v.id) AS disponiveis FROM viagens_config v`).all()));
  app.get('/api/viagens/:id', (req,res) => {
    const trip = tripById(req.params.id);
    if (!trip) throw new AppError(404,'Excursão não encontrada.');
    res.json(trip);
  });
  app.get('/api/viagens/:id/assentos', (req,res) => {
    const trip = tripReady(req.params.id);
    const occupied = new Set(db.prepare('SELECT numero_poltrona FROM reserva_passageiros WHERE viagem_id=?').all(trip.id).map(r=>r.numero_poltrona));
    res.json(Array.from({length:44},(_,i)=>({numero:i+1,estado:occupied.has(i+1)?'OCUPADO':'LIVRE'})));
  });
  function validate(body) {
    if (!Number.isInteger(body?.viagemId)) throw new AppError(422,'Viagem inválida.');
    const trip = tripReady(body.viagemId);
    const result = validateReservation(body,trip);
    if (result.errors.length) throw new AppError(422,result.errors.join(' '));
    const occupied = db.prepare('SELECT numero_poltrona FROM reserva_passageiros WHERE viagem_id=?').all(trip.id).map(r=>r.numero_poltrona);
    if (body.assentos.some(n=>occupied.includes(n))) throw new AppError(409,'Uma poltrona foi reservada por outra pessoa. Volte à seleção e escolha novamente.');
    return {trip,...result};
  }
  app.post('/api/reservas/validar', (req,res) => { validate(req.body); res.json({valida:true}); });
  app.post('/api/reservas', (req,res) => {
    const b=req.body;
    if (!/^[a-f0-9-]{36}$/.test(b?.chaveIdempotencia || '') || !/^[a-f0-9]{64}$/.test(b?.chaveAcesso || '')) throw new AppError(422,'Chaves da reserva inválidas. Recarregue o fluxo.');
    const digest = sha(JSON.stringify(b));
    db.exec('BEGIN IMMEDIATE');
    try {
      const previous = db.prepare('SELECT * FROM reservas_viagem WHERE chave_idempotencia=?').get(b.chaveIdempotencia);
      if (previous) {
        if (previous.payload_hash !== digest) throw new AppError(409,'Esta tentativa já foi concluída com dados diferentes. Consulte o voucher salvo.');
        db.exec('COMMIT');
        return res.json({codigoReserva:previous.codigo_reserva,reutilizada:true});
      }
      const {trip,people,signatory} = validate(b);
      const now=new Date().toISOString(), reservationCode=code('RM');
      const r=db.prepare(`INSERT INTO reservas_viagem (viagem_id,codigo_reserva,acesso_hash,chave_idempotencia,payload_hash,data_criacao) VALUES (?,?,?,?,?,?)`).run(trip.id,reservationCode,sha(b.chaveAcesso),b.chaveIdempotencia,digest,now);
      for (let i=0;i<people.length;i++) {
        const p=people[i];
        const passenger=db.prepare(`INSERT INTO passageiros (nome_completo,cpf,data_nascimento,telefone,email,documento,nome_responsavel,cpf_responsavel,vinculo_responsavel) VALUES (?,?,?,?,?,?,?,?,?)`).run(p.nome,p.cpf,p.nascimento,p.telefone,p.email,p.documento,p.responsavelNome,p.responsavelCpf,p.vinculo);
        db.prepare(`INSERT INTO reserva_passageiros (reserva_id,viagem_id,passageiro_id,numero_poltrona,codigo_embarque) VALUES (?,?,?,?,?)`).run(r.lastInsertRowid,trip.id,passenger.lastInsertRowid,b.assentos[i],code('VOS'));
      }
      db.prepare('INSERT INTO pagamentos (reserva_id,forma_pagamento,valor_total_centavos,data_registro) VALUES (?,?,?,?)').run(r.lastInsertRowid,b.formaPagamento,trip.valor_centavos*people.length,now);
      db.prepare('INSERT INTO contratos (reserva_id,assinatura_base64,nome_signatario,data_assinatura,versao_documento) VALUES (?,?,?,?,?)').run(r.lastInsertRowid,b.assinatura,signatory,now,CONTRACT_VERSION);
      db.prepare('INSERT INTO aceites_bagagem (reserva_id,versao_termos,aceito,data_aceite) VALUES (?,?,1,?)').run(r.lastInsertRowid,TERM_VERSION,now);
      db.exec('COMMIT');
      res.status(201).json({codigoReserva:reservationCode});
    } catch (error) {
      db.exec('ROLLBACK');
      if (String(error.message).includes('UNIQUE constraint failed: reserva_passageiros')) throw new AppError(409,'Poltrona indisponível. Atualize a seleção.');
      throw error;
    }
  });
  app.get('/api/reservas/:codigo/voucher',(req,res) => {
    const r=db.prepare('SELECT * FROM reservas_viagem WHERE codigo_reserva=?').get(req.params.codigo);
    const token=req.get('authorization')?.replace(/^Bearer /,'') || '';
    if (!r || !timingSafeEqual(Buffer.from(sha(token)),Buffer.from(r.acesso_hash))) throw new AppError(404,'Voucher não encontrado ou acesso inválido.');
    const trip=tripById(r.viagem_id);
    const passengers=db.prepare(`SELECT p.nome_completo AS nome,rp.numero_poltrona AS poltrona,rp.codigo_embarque AS codigoEmbarque FROM reserva_passageiros rp JOIN passageiros p ON p.id=rp.passageiro_id WHERE reserva_id=? ORDER BY numero_poltrona`).all(r.id);
    const payment=db.prepare('SELECT forma_pagamento AS forma,status,valor_total_centavos AS totalCentavos FROM pagamentos WHERE reserva_id=?').get(r.id);
    res.json({codigoReserva:r.codigo_reserva,status:r.status,dataCriacao:r.data_criacao,viagem:trip,passageiros:passengers,pagamento:payment});
  });
  app.use(express.static(fileURLToPath(new URL('../public',import.meta.url))));
  app.use('/api',(req,res)=>res.status(404).json({erro:'Rota não encontrada.'}));
  app.use((error,req,res,next)=> {
    const status=error.status || 500;
    res.status(status).json({erro:status===500?'Não foi possível salvar os dados. Nenhuma reserva parcial foi mantida. Tente novamente.':error.type==='entity.parse.failed'?'JSON inválido.':error.message});
  });
  return app;
}
