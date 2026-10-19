import { PNG } from 'pngjs';
import { TERM_VERSION, CONTRACT_VERSION, digits, validCPF, validDate, ageAt, consecutive } from '../public/js/domain.js';
export { TERM_VERSION, CONTRACT_VERSION, validCPF, validDate, ageAt, consecutive };
function clean(value, max = 150) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}
export function validSignature(value) {
  if (typeof value !== 'string' || value.length > 200000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value)) return false;
  try {
    const bytes = Buffer.from(value.split(',')[1], 'base64');
    // Read dimensions before decompressing; reject oversized images.
    if (bytes.length < 33 || bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a') return false;
    const w = bytes.readUInt32BE(16), h = bytes.readUInt32BE(20);
    if (w < 100 || h < 50 || w > 1200 || h > 600) return false;
    const png = PNG.sync.read(bytes, { checkCRC: true });
    let ink = 0;
    for (let i=0;i<png.data.length;i+=4) {
      if (png.data[i+3] > 40 && png.data[i] + png.data[i+1] + png.data[i+2] < 650) ink++;
    }
    return ink >= 25;
  } catch { return false; }
}
export function validateReservation(body, trip) {
  const errors = [];
  if (!body || typeof body !== 'object') return { errors:['Reserva inválida.'] };
  const seats = body.assentos;
  if (!consecutive(seats)) errors.push('Escolha de 1 a 5 posições consecutivas no mesmo lado do corredor.');
  const people = Array.isArray(body.passageiros) ? body.passageiros : [];
  if (!Array.isArray(seats) || people.length !== seats.length || people.length > 5) errors.push('Cadastre um passageiro para cada poltrona.');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  const cpfs = new Set();
  const normalized = people.slice(0,5).map((raw, i) => {
    const p = raw && typeof raw === 'object' ? raw : {};
    const person = {
      nome:clean(p.nome), cpf:digits(p.cpf), nascimento:p.nascimento,
      telefone:digits(p.telefone), email:clean(p.email,200), documento:clean(p.documento,40),
      responsavelNome:clean(p.responsavelNome), responsavelCpf:digits(p.responsavelCpf), vinculo:clean(p.vinculo,60)
    };
    const prefix = `Passageiro ${i+1}: `;
    if (person.nome.length < 3 || person.nome.split(' ').length < 2 || /[<>\x00-\x1f]/.test(person.nome)) errors.push(prefix+'informe nome completo.');
    if (!validCPF(person.cpf)) errors.push(prefix+'CPF inválido.');
    if (cpfs.has(person.cpf)) errors.push(prefix+'CPF repetido nesta reserva.');
    cpfs.add(person.cpf);
    if (!validDate(person.nascimento) || person.nascimento > today || person.nascimento < '1900-01-01') errors.push(prefix+'data de nascimento inválida.');
    else if (trip && ageAt(person.nascimento, trip.data_partida) < 18) {
      if (person.responsavelNome.length < 3 || person.responsavelNome.split(' ').length < 2 || /[<>]/.test(person.responsavelNome) || !validCPF(person.responsavelCpf) || person.vinculo.length < 2) errors.push(prefix+'informe nome completo, CPF válido e vínculo do responsável legal.');
    }
    if (!/^\d{10,11}$/.test(person.telefone)) errors.push(prefix+'telefone deve ter DDD e 10 ou 11 dígitos.');
    if (person.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(person.email)) errors.push(prefix+'e-mail inválido.');
    return person;
  });
  if (body.aceiteBagagem !== true || body.versaoTermos !== TERM_VERSION) errors.push('Aceite os termos de bagagem vigentes.');
  if (body.versaoContrato !== CONTRACT_VERSION || !validSignature(body.assinatura)) errors.push('Desenhe uma assinatura válida e aceite o contrato vigente.');
  const signatory = clean(body.signatario);
  if (signatory.length < 3 || signatory.split(' ').length < 2 || /[<>]/.test(signatory)) errors.push('Informe o nome completo de quem assina pela transação.');
  if (!['PIX','DINHEIRO','CARTAO'].includes(body.formaPagamento)) errors.push('Selecione uma forma de pagamento válida.');
  if (body.confirmacao !== true) errors.push('Confirme a revisão dos dados.');
  return { errors, people:normalized, signatory };
}
