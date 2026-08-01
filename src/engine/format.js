// Formateo de números grandes. Un idle sin sufijos es ilegible a los 10 minutos.

const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc',
                'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

export function fmt(n, decimals) {
  if (!isFinite(n)) return '∞';
  const sign = n < 0 ? '-' : '';
  n = Math.abs(n);
  if (n < 1000) {
    const d = decimals != null ? decimals : (n < 10 && n % 1 !== 0 ? 1 : 0);
    return sign + n.toFixed(d);
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= SUFFIX.length) return sign + n.toExponential(2).replace('e+', 'e');
  const scaled = n / Math.pow(1000, tier);
  return sign + scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + SUFFIX[tier];
}

export const money = (n) => fmt(n) + ' €';
export const rate = (n) => fmt(n) + ' €/s';

export function duration(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min ${s} s`;
  return `${s} s`;
}

export const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';
