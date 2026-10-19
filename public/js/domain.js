export const TERM_VERSION = 'bagagem-demo-1';
export const CONTRACT_VERSION = 'contrato-demo-1';
export const digits = value => String(value ?? '').replace(/\D/g, '');
export function validCPF(value) {
  const c = digits(value);
  if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
  for (let n = 9; n <= 10; n++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Number(c[i]) * (n + 1 - i);
    const d = (sum * 10 % 11) % 10;
    if (d !== Number(c[n])) return false;
  }
  return true;
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}
export function ageAt(birth, reference) {
  let age = Number(reference.slice(0, 4)) - Number(birth.slice(0, 4));
  if (reference.slice(5, 10) < birth.slice(5, 10)) age--;
  return age;
}
// Proposta operacional: 11 fileiras; 1–2 | 3–4, 5–6 | 7–8, etc.
// Sequência física em zigue-zague de cada lado: [1,2,6,5,9,10,...] ou [3,4,8,7,...].
// A passagem entre fileiras é vertical, sem salto diagonal ou travessia do corredor.
export function consecutive(seats) {
  if (!Array.isArray(seats) || seats.length < 1 || seats.length > 5 || new Set(seats).size !== seats.length) return false;
  if (seats.some(n => !Number.isInteger(n) || n < 1 || n > 44)) return false;
  const side = n => (n - 1) % 4 < 2 ? 0 : 1;
  if (seats.some(n => side(n) !== side(seats[0]))) return false;
  const positions = seats.map(n => Math.floor((n - 1) / 4) * 2 + (Math.floor((n - 1) / 4) % 2 ? 1 - (n - 1) % 2 : (n - 1) % 2)).sort((a,b) => a-b);
  return positions.every((p,i) => !i || p === positions[i-1] + 1);
}
