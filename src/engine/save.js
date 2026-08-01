// Guardado en localStorage: un único blob, con debounce.
// (lightkeeper hacía 15 escrituras síncronas por tick — 150/s. Aquí, una cada 5 s.)

import { newState } from './engine.js';

// v4: jornada de 30 s con escalado de sueldo/cuota, propina y cierre de día
// idempotente. Subir la versión descarta las partidas viejas en vez de migrarlas.
const KEY = 'fulgor.save.v5';
const EVERY = 3000;   // en móvil, pagehide no siempre llega: mejor perder poco

let pending = null;
let timer = null;

export function save(s, force = false) {
  pending = s;
  if (force) return flush();
  if (!timer) timer = setTimeout(flush, EVERY);
}

export function flush() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!pending) return;
  const s = pending;
  pending = null;
  try {
    const { events, _achN, _achM, ...rest } = s; // lo efímero no se guarda
    localStorage.setItem(KEY, JSON.stringify({ ...rest, lastSeen: Date.now() }));
  } catch (e) {
    console.warn('No se pudo guardar la partida:', e);
  }
}

export function load() {
  let raw;
  try { raw = localStorage.getItem(KEY); } catch { raw = null; }
  if (!raw) return { state: newState() };
  try {
    const data = JSON.parse(raw);
    // Rellenamos con un estado nuevo para que un save viejo no rompa al añadir campos.
    const base = newState();
    const state = {
      ...base, ...data,
      skills: { ...base.skills, ...(data.skills || {}) },
      upgrades: { ...base.upgrades, ...(data.upgrades || {}) },
      auto: { ...base.auto, ...(data.auto || {}) },
      bag: { ...base.bag, ...(data.bag || {}) },
      stats: { ...base.stats, ...(data.stats || {}) },
      buffs: data.buffs || [],
      achievements: data.achievements || [],
      shift: data.shift || null,
      events: [],
    };
    return { state };
  } catch (e) {
    console.warn('Partida corrupta, empezando de cero:', e);
    return { state: newState() };
  }
}

export function wipe() {
  if (timer) { clearTimeout(timer); timer = null; }
  pending = null;
  try { localStorage.removeItem(KEY); } catch {}
}
