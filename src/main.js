// Arranque y bucle principal. La simulación va con delta-time real, así que
// da igual a qué fps corra el navegador ni si la pestaña se queda en segundo plano.

import {
  step, click, buyUpgrade, buyAutomation, buySocket, buyBulb, upgradeAll, buyForzado,
  buyConsumable, buyPrestige, doPrestige, applyOffline, stats,
} from './engine/engine.js';
import { ACHIEVEMENTS, TIERS } from './engine/config.js';
import { load, save, flush, wipe } from './engine/save.js';
import { fmt, money, duration } from './engine/format.js';
import * as scene from './ui/scene.js';
import * as shop from './ui/shop.js';
import * as hud from './ui/hud.js';
import * as fx from './ui/fx.js';
import { icon } from './ui/art.js';

const app = document.getElementById('app');
const boot = load();
let S = boot.state;

// -------------------------------------------------------------- montaje
hud.mount(document.getElementById('hud'));
scene.mount(document.getElementById('scene'), {
  onClick: doClick,
  onBuy: (i) => act('bulb', null, i),
  onForzado: (i) => act('forzar', null, i),
});
shop.mount(document.getElementById('panel'), { action: act, state: () => S });
fx.mount(document.getElementById('fx'), document.getElementById('toasts'));

scene.build(S);
shop.setTab('mejoras');

// ---------------------------------------------------------------- click
function doClick(i, ev) {
  const before = S.money;
  const r = click(S, i);
  if (!r) return;
  drainEvents(ev);
  if (S.money - before > 0) hud.flashMoney();
}

/**
 * Los eventos que emite el motor se traducen aquí a efectos visuales.
 * El motor no sabe nada del DOM; esto es el único puente.
 */
function drainEvents(ev) {
  if (!S.events.length) return;
  for (const e of S.events) {
    const at = scene.socketAnchor(e.i);
    switch (e.type) {
      case 'click': {
        if (at && !e.auto) {
          const kind = e.band === 'surge' ? 'big' : e.band === 'sweet' ? 'good' : '';
          fx.float(at.x, at.y, fx.gainText(e.gain), kind);
          if (e.band === 'surge') {
            fx.float(at.x, at.y - 34, `¡SOBRECARGA x${1 + e.stacks}!`, 'label');
            fx.burst(at.x, at.y, 8 + e.stacks * 4, 'hot');
          }
        }
        scene.pulse(e.i, e.band === 'surge' ? 'surge' : 'tap');
        break;
      }
      case 'break':
        if (at) { fx.shatter(at.x, at.y); fx.float(at.x, at.y, '¡REVENTÓ!', 'bad'); }
        fx.toast(`Se rompió una ${TIERS[e.tier].name}. Toca reponerla.`, 'bad', 'bulb');
        fx.shake(app, true);
        scene.build(S);
        break;
      case 'saved':
        if (at) fx.float(at.x, at.y, 'FUSIBLE', 'save');
        fx.toast('El fusible ha salvado la bombilla.', 'good', 'fuse');
        break;
      case 'replaced':
        fx.toast(e.free ? 'Repuesto colocado.' : 'El técnico ha repuesto la bombilla.', '', 'wrench');
        scene.build(S);
        break;
      case 'install':
        if (at) fx.burst(at.x, at.y, 10);
        scene.build(S);
        break;
      case 'achievement': {
        const a = ACHIEVEMENTS.find((x) => x.id === e.id);
        if (a) fx.toast(`Logro: ${a.name} · +${a.mult}% dinero`, 'gold', 'trophy');
        break;
      }
      case 'consumable':
        scene.build(S);
        break;
    }
  }
  S.events.length = 0;
}

// -------------------------------------------------------------- compras
function act(kind, id, arg) {
  let ok = false;
  switch (kind) {
    case 'bulk':  shop.setBulk(id === 'max' ? 'max' : +id); return;
    case 'upg':   ok = buyBulk(id); break;
    case 'aut':   ok = buyAutomation(S, id); break;
    case 'sock':  ok = buySocket(S); if (ok) scene.build(S); break;
    // Reponer si reventó, o subir exactamente un peldaño. Nunca salta niveles.
    case 'bulb':  ok = buyBulb(S, +arg); break;
    case 'upall': ok = upgradeAll(S) > 0; if (ok) scene.build(S); break;
    case 'forzar': {
      const i = +arg;
      ok = buyForzado(S, i);
      if (ok) { scene.build(S); const at = scene.socketAnchor(i); if (at) fx.burst(at.x, at.y, 8, 'hot'); }
      break;
    }
    case 'con':   ok = buyConsumable(S, id); break;
    case 'pre':   ok = buyPrestige(S, id); break;
    case 'prestige': return askPrestige();
    case 'wipe':  return askWipe();
  }
  if (!ok) return;
  drainEvents();
  save(S);
  shop.refresh(S);
}

/** Compra en lote respetando el selector x1 / x10 / Máx. */
function buyBulk(id) {
  const n = shop.bulk === 'max' ? 500 : shop.bulk;
  let bought = 0;
  for (let k = 0; k < n; k++) {
    if (!buyUpgrade(S, id)) break;
    bought++;
  }
  return bought > 0;
}

// ------------------------------------------------------------ diálogos
function dialog(html, onYes, opts = {}) {
  const d = document.createElement('div');
  d.className = 'modal';
  // Los avisos informativos sólo llevan un botón: preguntar "¿cancelar?" por
  // algo que ya ha pasado no tiene sentido.
  const btns = opts.okOnly
    ? `<button class="big" data-no>${opts.ok || 'Entendido'}</button>`
    : `<button class="ghost" data-no>Cancelar</button>
       <button class="big" data-yes>${opts.ok || 'Confirmar'}</button>`;
  d.innerHTML = `<div class="sheet">${html}<div class="sheet-btns">${btns}</div></div>`;
  document.body.appendChild(d);
  d.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-yes]')) { d.remove(); onYes(); }
    else if (ev.target.closest('[data-no]') || ev.target === d) d.remove();
  });
}

function askPrestige() {
  const res = doPrestige(S);
  if (!res) return;
  dialog(`<h2>${icon('power')} Apagón</h2>
    <p>Vas a reiniciar la instalación entera: pierdes dinero, zócalos, mejoras y
    automatismos. A cambio te llevas <b class="sp">${fmt(res.gained)} ⚡ chispas</b>
    permanentes para gastar en mejoras que ya nunca se pierden.</p>
    <p class="warn">Los logros, las chispas y las estadísticas se conservan.</p>`,
    () => {

      S = res.state;
      fx.shake(app, true);
      fx.toast(`Apagón. +${fmt(res.gained)} ⚡ chispas`, 'gold', 'power');
      scene.build(S);
      shop.setTab('apagon');
      save(S, true);
    });
}

function askWipe() {
  dialog(`<h2>${icon('lock')} Borrar la partida</h2>
    <p>Esto elimina <b>todo</b>: dinero, chispas, logros y estadísticas.
    No hay vuelta atrás.</p>`, () => {
      wipe();
      location.reload();
    });
}

// -------------------------------------------------------- ganancias offline
if (boot.away > 60) {
  const r = applyOffline(S, boot.away);
  scene.build(S);
  const st = stats(S);
  setTimeout(() => dialog(`<h2>${icon('clock')} Mientras no estabas</h2>
    <p>Han pasado <b>${duration(r.seconds)}</b>. Tus bombillas se han ido apagando solas.</p>
    ${r.money > 0
      ? `<p>Aun así has recogido <b class="sp">${money(r.money)}</b>
         (${(st.offline * 100).toFixed(0)}% de eficiencia offline).</p>`
      : `<p class="warn">No has cobrado nada: necesitas la mejora <b>Espejo</b>
         (o <b>Eco</b> con chispas) para producir mientras no juegas.</p>`}`,
    () => {}, { okOnly: true, ok: 'Seguir jugando' }), 350);
}

// ----------------------------------------------------------- bucle
let prev = performance.now();
let acc = 0;               // acumulador para refrescar la UI a menos de 60 Hz
const UI_EVERY = 1 / 12;   // el panel no necesita ir a 60 fps

function loop(now) {
  let dt = (now - prev) / 1000;
  prev = now;
  // Si el navegador nos ha tenido parados (pestaña oculta), lo tratamos como
  // ausencia y lo capamos: nada de saltos de 20 minutos en un solo frame.
  if (dt > 1) dt = 1;

  step(S, dt);
  drainEvents();

  const st = stats(S);
  scene.frame(S, st);
  hud.frame(S, st);

  acc += dt;
  if (acc >= UI_EVERY) { acc = 0; shop.refresh(S); }

  save(S);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Al volver de segundo plano, cobramos el tiempo perdido como si fuese offline.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { flush(); return; }
  prev = performance.now();
});
window.addEventListener('pagehide', () => flush());
window.addEventListener('beforeunload', () => flush());

// Cache local: el juego abre al instante y se puede jugar sin conexión.
// Sólo bajo http(s): con file:// los service workers no existen.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// La rejilla se mide en píxeles, así que hay que recalcularla al cambiar de tamaño.
let resizeT;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => scene.layout(), 120);
});

// Atajo de teclado: 1..9 pulsan el zócalo correspondiente. Se juega mucho mejor.
window.addEventListener('keydown', (ev) => {
  if (ev.repeat || ev.metaKey || ev.ctrlKey) return;
  const n = parseInt(ev.key, 10);
  if (n >= 1 && n <= 9 && S.sockets[n - 1]) { doClick(n - 1); ev.preventDefault(); }
});
