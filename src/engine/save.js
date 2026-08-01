// Guardado en localStorage: un único blob, con debounce.
// (lightkeeper hacía 15 escrituras síncronas por tick — 150/s. Aquí, una cada 5 s.)

import { newState } from './engine.js';

// v2: el nivel pasó de la bombilla al zócalo y se rehizo el balance de salida.
// Subir la versión descarta las partidas viejas en vez de intentar migrarlas.
const KEY = 'fulgor.save.v2';
const EVERY = 5000;

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
    const { events, ...rest } = s; // los eventos son efímeros, no se guardan
    localStorage.setItem(KEY, JSON.stringify({ ...rest, lastSeen: Date.now() }));
  } catch (e) {
    console.warn('No se pudo guardar la partida:', e);
  }
}

/** Devuelve { state, away } donde `away` son los segundos que has estado fuera. */
export function load() {
  let raw;
  try { raw = localStorage.getItem(KEY); } catch { raw = null; }
  if (!raw) return { state: newState(), away: 0 };
  try {
    const data = JSON.parse(raw);
    const away = data.lastSeen ? Math.max(0, (Date.now() - data.lastSeen) / 1000) : 0;
    // Rellenamos con un estado nuevo para que un save viejo no rompa al añadir campos.
    const base = newState();
    const state = {
      ...base, ...data,
      prestige: { ...base.prestige, ...(data.prestige || {}) },
      upgrades: { ...base.upgrades, ...(data.upgrades || {}) },
      auto: { ...base.auto, ...(data.auto || {}) },
      bag: { ...base.bag, ...(data.bag || {}) },
      stats: { ...base.stats, ...(data.stats || {}) },
      buffs: data.buffs || [],
      achievements: data.achievements || [],
      events: [],
    };
    return { state, away };
  } catch (e) {
    console.warn('Partida corrupta, empezando de cero:', e);
    return { state: newState(), away: 0 };
  }
}

export function wipe() {
  if (timer) { clearTimeout(timer); timer = null; }
  pending = null;
  try { localStorage.removeItem(KEY); } catch {}
}
