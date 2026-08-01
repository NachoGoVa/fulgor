// La sala de bombillas. El DOM se construye una vez y luego se actualiza a mano
// atributo a atributo: sin reconciliación, sin recrear nodos en cada frame.

import { TIERS, CORE, forzadoCost } from '../engine/config.js';
import { stats, socketOutput } from '../engine/engine.js';
import { bulbSvg, brokenSvg, emptySvg, icon } from './art.js';
import { fmt } from '../engine/format.js';

const R_CHARGE = 48, R_WEAR = 39;
const C_CHARGE = 2 * Math.PI * R_CHARGE;
const C_WEAR = 2 * Math.PI * R_WEAR;
const DANGER = 1 - CORE.surgeLo;   // porción del anillo que es zona de riesgo
const SWEET = CORE.surgeLo - CORE.sweetLo;

let root, parts = [], onClick, onBuy, onForzado;
let sig = '';   // firma del estado visual: si cambia, reconstruimos

const ringsSvg = () => `
  <svg class="rings" viewBox="0 0 120 170" aria-hidden="true">
   <g transform="rotate(-90 60 96)">
    <circle class="ring-bg" cx="60" cy="96" r="${R_CHARGE}" />
    <circle class="ring-sweet" cx="60" cy="96" r="${R_CHARGE}"
      stroke-dasharray="${(SWEET * C_CHARGE).toFixed(2)} ${C_CHARGE.toFixed(2)}"
      stroke-dashoffset="${(-CORE.sweetLo * C_CHARGE).toFixed(2)}" />
    <circle class="ring-danger" cx="60" cy="96" r="${R_CHARGE}"
      stroke-dasharray="${(DANGER * C_CHARGE).toFixed(2)} ${C_CHARGE.toFixed(2)}"
      stroke-dashoffset="${(-CORE.surgeLo * C_CHARGE).toFixed(2)}" />
    <circle class="ring-charge" cx="60" cy="96" r="${R_CHARGE}"
      stroke-dasharray="${C_CHARGE.toFixed(2)}" stroke-dashoffset="0" />
    <circle class="ring-wear" cx="60" cy="96" r="${R_WEAR}"
      stroke-dasharray="${C_WEAR.toFixed(2)}" stroke-dashoffset="${C_WEAR.toFixed(2)}" />
   </g>
  </svg>`;

/** Firma que obliga a reconstruir: nº de zócalos y qué bombilla lleva cada uno. */
const signature = (s) =>
  s.sockets.map((sk) => `${sk.tier}${sk.bulb ? '' : sk.broken ? 'r' : 'x'}:${sk.forzado}`).join('|');

// Cuántas columnas queremos según cuántos zócalos haya (2x2 antes que 4x1, etc.).
const COLS = [1, 1, 2, 3, 2, 3, 3, 4, 4, 3, 4, 4, 4];
let lastN = 0;

/**
 * Rejilla calculada a mano en píxeles. `repeat(auto-fit, min(...))` daba
 * tamaños de pista absurdos (una a 365px y tres a 0px), así que fijamos
 * columnas y tamaño de celda explícitos: es predecible en cualquier pantalla.
 */
export function layout(n = lastN) {
  if (!root || !n) return;
  lastN = n;
  const avail = (root.clientWidth || window.innerWidth) - 28;
  const ideal = n <= 1 ? 196 : n <= 2 ? 182 : n <= 4 ? 168 : n <= 6 ? 154 : n <= 9 ? 140 : 126;
  let cols = Math.min(COLS[n] || 4, n);
  // En pantallas estrechas reducimos columnas antes que dejar celdas minúsculas.
  while (cols > 1 && avail / cols < 92) cols--;
  const cell = Math.max(76, Math.min(ideal, Math.floor(avail / cols)));
  root.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
}

export function mount(el, handlers) {
  root = el;
  onClick = handlers.onClick;
  onBuy = handlers.onBuy;
  onForzado = handlers.onForzado;

  // Un único listener para toda la sala en vez de uno por bombilla.
  root.addEventListener('pointerdown', (ev) => {
    const lamp = ev.target.closest('.lamp');
    if (lamp) {
      ev.preventDefault();
      const i = +lamp.parentElement.dataset.i;
      if (lamp.classList.contains('is-empty')) onBuy(i);
      else onClick(i, ev);
      return;
    }
    const btn = ev.target.closest('.forzar');
    if (btn) { ev.preventDefault(); onForzado(+btn.closest('.socket').dataset.i); }
  });
  // Sin menú contextual ni selección: molesta muchísimo en un juego de clicks.
  root.addEventListener('contextmenu', (ev) => ev.preventDefault());
}

export function build(s) {
  const next = signature(s);
  if (next === sig) return false;
  sig = next;

  root.innerHTML = s.sockets.map((sk, i) => {
    // El zócalo conserva su nivel (y su color) aunque la bombilla haya reventado.
    const t = TIERS[sk.tier];
    const vars = `--glow:${t.glow};--core:${t.core};--rim:${t.rim}`;
    const art = sk.bulb ? bulbSvg(sk.tier)
      : (sk.broken || sk.respawn > 0 ? brokenSvg() : emptySvg());
    return `<div class="socket${sk.bulb ? '' : ' vacio'}" data-i="${i}" style="${vars}">
      <div class="halo"></div>
      <button class="lamp${sk.bulb ? '' : ' is-empty'}" type="button"
              aria-label="${sk.bulb ? t.name : `Reponer ${t.name}`}">
        ${ringsSvg()}
        ${art}
        <span class="stack">x2</span>
      </button>
      <div class="plate">
        <span class="pname">${sk.tier + 1}· ${t.name}</span>
        <span class="pout">—</span>
      </div>
      <button class="forzar" type="button" title="Forzar la instalación">
        ${icon('bolt')}<span class="fz">Forzar</span>
      </button>
    </div>`;
  }).join('');

  layout(s.sockets.length);

  parts = [...root.querySelectorAll('.socket')].map((el) => ({
    el,
    halo: el.querySelector('.halo'),
    lamp: el.querySelector('.lamp'),
    ringC: el.querySelector('.ring-charge'),
    ringW: el.querySelector('.ring-wear'),
    core: el.querySelector('.core'),
    cracks: [...el.querySelectorAll('.crack')],
    stack: el.querySelector('.stack'),
    out: el.querySelector('.pout'),
    forzar: el.querySelector('.forzar'),
    fz: el.querySelector('.fz'),
    _s: -1, _o: '',
  }));
  return true;
}

/** Actualización por frame. Todo aquí debe ser barato: se ejecuta a 60 fps. */
export function frame(s, st = stats(s)) {
  let lit = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i], sk = s.sockets[i];
    if (!p || !sk) continue;
    const b = sk.bulb;

    if (!b) {
      if (p._s !== 0) {
        p._s = 0;
        p.halo.style.opacity = 0;
        p.ringC.style.strokeDashoffset = C_CHARGE;
        p.ringW.style.strokeDashoffset = C_WEAR;
        p.el.classList.remove('surging', 'critical');
        p.stack.classList.remove('on');
      }
      // Un zócalo vacío se repone con una bombilla de SU MISMO nivel.
      const cost = TIERS[sk.tier].cost;
      p.lamp.classList.toggle('can-buy', s.money >= cost);
      const label = cost ? `Reponer · ${fmt(cost)} €` : 'Pulsa para reponer';
      if (p._o !== label) { p._o = label; p.out.textContent = label; }
      continue;
    }

    const c = b.charge;
    lit += c;

    // Halo: la luz que emite. No usamos filtros SVG (caros), sólo opacidad.
    p.halo.style.opacity = (0.12 + 0.88 * c) * (b.surge ? 1.35 : 1);
    p.core.style.opacity = 0.18 + 0.82 * c;

    p.ringC.style.strokeDashoffset = C_CHARGE * (1 - c);

    const w = Math.min(1, b.wear / st.maxWear);
    p.ringW.style.strokeDashoffset = C_WEAR * (1 - w);

    // Las grietas se abren por fases conforme se acerca la rotura.
    for (let k = 0; k < p.cracks.length; k++) {
      const at = 0.35 + k * 0.22;
      p.cracks[k].style.opacity = w > at ? Math.min(1, (w - at) / 0.2) : 0;
    }

    const state = b.surge ? 2 : (c >= CORE.surgeLo ? 1 : 0);
    const crit = w > 0.75;
    if (p._s !== state * 2 + (crit ? 1 : 0)) {
      p._s = state * 2 + (crit ? 1 : 0);
      p.el.classList.toggle('surging', state === 2);
      p.el.classList.toggle('ready', state === 1);
      p.el.classList.toggle('critical', crit);
    }
    if (b.surge) {
      p.stack.textContent = 'x' + (1 + b.surge);
      p.stack.classList.add('on');
    } else p.stack.classList.remove('on');

    // El texto sólo se toca si cambia: escribir en el DOM fuerza layout.
    const out = fmt(socketOutput(sk, st)) + ' €/s';
    if (p._o !== out) { p._o = out; p.out.textContent = out; }

    const cost = forzadoCost(sk.tier, sk.forzado);
    const maxed = sk.forzado >= CORE.forzadoMax;
    p.forzar.classList.toggle('afford', !maxed && s.money >= cost);
    p.forzar.classList.toggle('maxed', maxed);
    const label = maxed ? 'Máx' : `${fmt(cost)} €`;
    if (p.fz.textContent !== label) p.fz.textContent = label;
    p.el.style.setProperty('--fz', sk.forzado);
  }

  // La sala se ilumina con la suma de lo que esté encendido: si todo se apaga,
  // la pantalla se queda a oscuras. Es el mejor recordatorio de que hay trabajo.
  const amb = parts.length ? lit / parts.length : 0;
  root.style.setProperty('--ambient', amb.toFixed(3));
}

/** Coordenadas del centro de un zócalo, para lanzar ahí los números flotantes. */
export function socketAnchor(i) {
  const p = parts[i];
  if (!p) return null;
  const r = p.lamp.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height * 0.55 };
}

export function pulse(i, kind) {
  const p = parts[i];
  if (!p) return;
  p.el.classList.remove('hit', 'hit-surge', 'hit-break');
  void p.el.offsetWidth;              // reinicia la animación CSS
  p.el.classList.add(kind === 'break' ? 'hit-break' : kind === 'surge' ? 'hit-surge' : 'hit');
}
