// Arranque y bucle principal. La vida del operario: fichar, currar 2,5 minutos,
// cobrar (o llorar), pagar facturas y vuelta a empezar. El motor sólo corre
// durante el turno: fuera de él, el juego está literalmente parado.

import {
  step, click, startDay, endDay, resetLife, objectiveProgress,
  buyUpgrade, buyAutomation, buyBulb, upgradeAll, buyForzado,
  buyConsumable, buySkill, stats,
} from './engine/engine.js';
import { ACHIEVEMENTS, RANKS, TIERS, CORE, XP } from './engine/config.js';
import { load, save, flush, wipe } from './engine/save.js';
import { fmt, money, pct } from './engine/format.js';
import * as scene from './ui/scene.js';
import * as shop from './ui/shop.js';
import * as hud from './ui/hud.js';
import * as fx from './ui/fx.js';
import * as flavor from './ui/flavor.js';
import { speech } from './ui/characters.js';
import { icon } from './ui/art.js';

/** Pinta una réplica [quién, texto, humor] del guion como bocadillo con cara. */
const say = (line) => speech(line[0], line[1], line[2]);

const app = document.getElementById('app');
const objbar = document.getElementById('objbar');
let S = load().state;

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

// ------------------------------------------------------------- diálogos
let sheetEl = null;
function sheet(html, buttons, locked = true) {
  closeSheet();
  const d = document.createElement('div');
  d.className = 'modal' + (locked ? ' locked' : '');
  d.innerHTML = `<div class="sheet">${html}<div class="sheet-btns">
    ${buttons.map((b, i) => `<button class="${b.cls || 'big'}" data-btn="${i}">${b.label}</button>`).join('')}
  </div></div>`;
  document.body.appendChild(d);
  sheetEl = d;
  d.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-btn]');
    if (b) { const cb = buttons[+b.dataset.btn].cb; closeSheet(); if (cb) cb(); }
    else if (!locked && ev.target === d) closeSheet();
  });
}
function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; } }

/**
 * Momentos con guion (fin de prácticas, permiso nuevo…). Se encolan y se van
 * mostrando de uno en uno; al vaciarse, sigue el flujo normal del día.
 */
const story = [];
function tellStory(next) {
  if (!story.length) return next ? next() : undefined;
  const { title, line, ico } = story.shift();
  sheet(`<h2>${icon(ico || 'wrench')} ${title}</h2>${say(line)}`,
    [{ label: 'Entendido', cb: () => tellStory(next) }]);
}

// ----------------------------------------------------------- flujo del día
function ficharScreen() {
  const R = RANKS[S.rank];
  const rentToday = (S.day + 1) % CORE.rentEvery === 0;
  const st = stats(S);
  sheet(`
    <h2>${icon('clock')} Día ${S.day + 1} · ${R.name}</h2>
    ${say(flavor.pick(flavor.JEFE_MANANA))}
    <div class="briefing">
      <div><span>Cuota de hoy</span><b>${money(S.quota * st.jornadaMult)}</b></div>
      <div><span>Sueldo del día</span><b>${money(R.salary * st.jornadaMult)}</b></div>
      <div><span>Turno</span><b>${st.shiftLen} s</b></div>
      <div><span>Facturas de hoy</span><b>${money(R.salary * CORE.foodRate * st.billMult + (rentToday ? R.salary * CORE.rentRate * st.billMult : 0))}${rentToday ? ' 🏠' : ''}</b></div>
    </div>
    ${S.debt > 0 ? `<p class="warn debt-hint">⚠ ${flavor.CALABOZO_AVISO} Debes ${money(S.debt)}.</p>` : ''}
    <p class="warn">Si superas la cuota hay <b>propina</b> directa al banco. Las roturas
    que no repongas antes de salir, van a la nómina.</p>`,
    [{ label: flavor.pick(flavor.FICHAR_BTN), cb: beginDay }]);
}

function beginDay() {
  if (!startDay(S)) return;   // turno en marcha o día sin cerrar: el vigilante decide
  drainEvents();
  scene.build(S);
  buildObjbar();
  save(S, true);
}

function buildObjbar() {
  const sh = S.shift;
  if (!sh || !sh.active) { objbar.innerHTML = ''; return; }
  objbar.innerHTML = `
    <span class="obj-label">Hoy:</span>
    <span class="obj" data-o="quota">${icon('bolt')}<i>cuota ${fmt(sh.quota)} €</i><b></b></span>
    ${sh.objectives.map((o, i) =>
      `<span class="obj" data-o="${i}" title="${flavor.OBJETIVO_DESC[o.type](o.target)}">
        ${icon(o.type === 'roturas' ? 'shield' : o.type === 'surges' ? 'surge' : o.type === 'sweet' ? 'tap' : 'bulb')}
        <i>${flavor.OBJETIVO_CORTO[o.type](o.target)}</i><b></b>
      </span>`).join('')}`;
}

let objRefs = null;
function tickObjbar() {
  const sh = S.shift;
  if (!sh || !sh.active) return;
  if (!objRefs || objRefs.bar !== objbar.firstElementChild) {
    objRefs = { bar: objbar.firstElementChild, els: [...objbar.querySelectorAll('.obj')] };
  }
  for (const el of objRefs.els) {
    const key = el.dataset.o;
    let txt, ok;
    if (key === 'quota') {
      const r = Math.min(1, sh.produced / sh.quota);
      txt = pct(r, 0); ok = r >= 1;
    } else {
      const o = sh.objectives[+key];
      const p = objectiveProgress(S, o);
      ok = p.ok;
      txt = o.type === 'roturas' ? `${p.cur}/${p.max}` :
            o.type === 'final' ? `${p.cur}/${p.max}` : `${Math.min(p.cur, p.max)}/${p.max}`;
    }
    const b = el.querySelector('b');
    if (b.textContent !== txt) b.textContent = txt;
    el.classList.toggle('ok', ok);
  }
}

function endDayFlow() {
  const r = endDay(S);
  if (!r) return;
  drainEvents();
  objbar.innerHTML = '';
  objRefs = null;
  save(S, true);
  summaryScreen(r);
}

function summaryScreen(r) {
  const quote = say(r.ratio >= 1 ? flavor.pick(flavor.PAGA_BIEN)
              : r.ratio >= CORE.fireRatio ? flavor.pick(flavor.PAGA_REGULAR)
              : flavor.pick(flavor.PAGA_MAL));
  const objLines = r.objectives.map((o) =>
    `<div class="pl ${o.met ? 'ok' : 'ko'}"><span>${o.met ? '✓' : '✗'} ${flavor.OBJETIVO_CORTO[o.type](o.target)}</span>
     <b>${o.met ? '+' + money(CORE.primaRate * r.salary) : '—'}</b></div>`).join('');
  // Las roturas SIEMPRE tienen su línea si las hubo: que quede claro qué pasó
  // con cada bombilla — descontada, o repuesta por ti sin castigo.
  const breakLine = r.breaks === 0 ? ''
    : r.deduct > 0
      ? `<div class="pl ko"><span>Roturas (${r.breaks}) — «${flavor.pick(flavor.ROTURA)}»</span><b>−${money(r.deduct)}</b></div>`
      : `<div class="pl"><span>Roturas (${r.breaks}) — repuestas en el turno</span><b>sin descuento</b></div>`;
  sheet(`
    <h2>${icon('coin')} Parte del día ${r.day}</h2>
    ${quote}
    <div class="payroll">
      <div class="pl"><span>Producción</span><b>${money(r.produced)} · ${pct(r.ratio, 0)} de la cuota</b></div>
      <div class="pl"><span>Sueldo base</span><b>${money(r.base)}</b></div>
      ${objLines}
      ${r.excess > 0 ? `<div class="pl ok"><span>Prima de productividad</span><b>+${money(r.excess)}</b></div>` : ''}
      ${breakLine}
      <div class="pl total"><span>Nómina</span><b>${money(r.nomina)}</b></div>
      ${r.tip > 0 ? `<div class="pl ok"><span>Propina por superar la cuota 🎉</span><b>+${money(r.tip)} directa al banco</b></div>` : ''}
      <div class="pl bill"><span>${flavor.pick(flavor.COMIDA)}</span><b>−${money(r.food)}</b></div>
      ${r.rent > 0 ? `<div class="pl bill"><span>${flavor.pick(flavor.ALQUILER)}</span><b>−${money(r.rent)}</b></div>` : ''}
      ${r.interest > 0 ? `<div class="pl ko"><span>Interés de la deuda</span><b>+${money(r.interest)} a deber</b></div>` : ''}
      ${r.repaid > 0 ? `<div class="pl"><span>Pago de deuda</span><b>−${money(r.repaid)}</b></div>` : ''}
      <div class="pl total"><span>Banco</span><b>${money(r.bank)}${r.debt > 0 ? ` · debes ${money(r.debt)}` : ''}</b></div>
      <div class="pl xp"><span>Experiencia</span><b>+${fmt(r.xp)} XP</b></div>
    </div>
    ${r.promotion != null ? `<div class="promo">
      <b>🎉 ¡Ascendido a ${RANKS[r.promotion].name}!</b> <span>${RANKS[r.promotion].mote}</span>
      </div>${say(flavor.pick(flavor.ASCENSO_TXT))}` : ''}
    ${r.fail === 'calabozo' ? '' : r.fireStreak > 0 ? `<p class="warn">⚠ Llevas ${r.fireStreak} día(s) muy por debajo de la cuota. A los ${CORE.fireDays}, despido.</p>` : ''}`,
    r.fail
      ? [{ label: 'Asumir las consecuencias…', cb: () => failScreen(r.fail) }]
      : [{ label: 'Al día siguiente', cb: () => {
          // El día siguiente al último de prácticas, se acabó la red de seguridad.
          if (r.day === CORE.becarioDays) {
            story.push({ title: 'Fin del periodo de prácticas', ico: 'shield',
                         line: flavor.pick(flavor.BECARIO_FIN) });
          }
          tellStory(ficharScreen);
        } }]);
  if (r.promotion != null) { fx.shake(app); scene.build(S); }
}

function failScreen(reason) {
  const txt = say(flavor.pick(reason === 'calabozo' ? flavor.CALABOZO_TXT : flavor.DESPIDO_TXT));
  const { state, finiquito } = resetLife(S, reason);
  sheet(`
    <h2>${icon(reason === 'calabozo' ? 'lock' : 'wrench')} ${reason === 'calabozo' ? 'Calabozo' : 'Despedido'}</h2>
    ${txt}
    <div class="payroll">
      <div class="pl xp"><span>Finiquito en experiencia</span><b>+${fmt(finiquito)} XP</b></div>
      <div class="pl"><span>Empiezas de</span><b>${RANKS[state.rank].name}</b></div>
    </div>
    <p class="warn">Tu experiencia, habilidades y logros siguen contigo. Lo demás… lo demás no.</p>`,
    [{ label: 'Siguiente vida laboral', cb: () => { S = state; afterReset(); } }]);
  fx.shake(app, true);
}

function askDimitir() {
  if (S.shift && S.shift.active) return;
  const st = stats(S);
  const fin = Math.round(XP.quitBase * (S.rank + 1) * Math.sqrt(Math.max(1, S.day)) * st.xpMult);
  sheet(`
    <h2>${icon('power')} ¿Dimitir?</h2>
    <p>Portazo, finiquito y a empezar de cero en otra empresa. Te llevas
    <b class="sp">${fmt(fin)} XP</b> de finiquito además de todo lo aprendido.</p>
    <p class="warn">Pierdes: banco, maquinaria, mejoras y rango. Conservas: experiencia,
    habilidades y logros.</p>`,
    [{ label: 'Me quedo', cls: 'ghost', cb: null },
     { label: 'Dimito, con estilo', cb: () => {
        const { state, finiquito } = resetLife(S, 'dimision');
        S = state;
        fx.toast(`Finiquito: +${fmt(finiquito)} XP. Portazo de manual.`, 'gold', 'power');
        afterReset();
      } }], false);
}

function afterReset() {
  scene.build(S);
  shop.setTab('carrera');
  save(S, true);
  ficharScreen();
}

// ---------------------------------------------------------------- click
function doClick(i, ev) {
  const r = click(S, i);
  if (!r) return;
  drainEvents(ev);
  hud.flashMoney();
}

function drainEvents() {
  if (!S.events.length) return;
  let over = false;
  for (const e of S.events) {
    const at = e.i != null ? scene.socketAnchor(e.i) : null;
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
        // Que quede claro el trato: o la repones tú antes de fichar, o va a la nómina.
        fx.toast(`${TIERS[e.tier].name} rota (−${fmt(TIERS[e.tier].cost)} € de la nómina si no la repones). ${flavor.pick(flavor.ROTURA)}`, 'bad', 'bulb');
        fx.shake(app, true);
        scene.build(S);
        if (S.stats.breaks === 1) {
          story.push({ title: 'Tu primera rotura', ico: 'bulb', line: flavor.pick(flavor.PRIMERA_ROTURA) });
        }
        break;
      case 'protected':
        if (at) fx.float(at.x, at.y, 'REFORZADA', 'save');
        fx.toast('La bombilla de prácticas aguanta. De momento.', 'good', 'shield');
        break;
      case 'saved':
        if (at) fx.float(at.x, at.y, 'FUSIBLE', 'save');
        fx.toast('El fusible ha saltado. La bombilla vive.', 'good', 'fuse');
        break;
      case 'replaced':
        fx.toast(e.free ? 'Repuesto colocado, ni rastro del crimen.' : 'El técnico ha pasado factura. Literalmente.', '', 'wrench');
        scene.build(S);
        break;
      case 'install':
        if (at) fx.burst(at.x, at.y, 10);
        scene.build(S);
        break;
      case 'achievement': {
        const a = ACHIEVEMENTS.find((x) => x.id === e.id);
        if (a) fx.toast(`Logro: ${a.name} · +${a.mult}% producción`, 'gold', 'trophy');
        break;
      }
      case 'consumable':
        scene.build(S);
        break;
      case 'shiftOver':
        over = true;
        break;
    }
  }
  S.events.length = 0;
  if (over) endDayFlow();
}

// -------------------------------------------------------------- compras
function act(kind, id, arg) {
  let ok = false;
  switch (kind) {
    case 'bulk':  shop.setBulk(id === 'max' ? 'max' : +id); return;
    case 'upg': {
      const antes = S.upgrades[id];
      ok = buyBulk(id);
      if (ok && id === 'sobrecarga' && antes === 0) {
        story.push({ title: 'Permiso de sobrecarga', ico: 'surge',
                     line: flavor.pick(flavor.SOBRECARGA_NUEVA) });
        scene.build(S);
        tellStory();
      }
      break;
    }
    case 'aut':   ok = buyAutomation(S, id); break;
    case 'bulb':  ok = buyBulb(S, +arg); break;
    case 'upall': ok = upgradeAll(S) > 0; if (ok) scene.build(S); break;
    case 'forzar': {
      const i = +arg;
      ok = buyForzado(S, i);
      if (ok) { scene.build(S); const at = scene.socketAnchor(i); if (at) fx.burst(at.x, at.y, 8, 'hot'); }
      break;
    }
    case 'con':   ok = buyConsumable(S, id); break;
    case 'skl':   ok = buySkill(S, id); break;
    case 'dimitir': return askDimitir();
    case 'wipe':  return askWipe();
  }
  if (!ok) return;
  drainEvents();
  save(S);
  shop.refresh(S);
}

function buyBulk(id) {
  const n = shop.bulk === 'max' ? 500 : shop.bulk;
  let bought = 0;
  for (let k = 0; k < n; k++) {
    if (!buyUpgrade(S, id)) break;
    bought++;
  }
  return bought > 0;
}

function askWipe() {
  sheet(`<h2>${icon('lock')} Borrar la partida</h2>
    <p>Esto elimina <b>todo</b>: experiencia, habilidades, logros, expediente.
    Como si nunca hubieras trabajado aquí. No hay vuelta atrás.</p>`,
    [{ label: 'Mejor no', cls: 'ghost', cb: null },
     { label: 'Borrarlo todo', cb: () => { wipe(); location.reload(); } }], false);
}

// ----------------------------------------------------------- bucle
let prev = performance.now();
let acc = 0, guardAcc = 0;
const UI_EVERY = 1 / 12;

/**
 * El vigilante. El flujo del día se deriva del ESTADO, no de eventos efímeros:
 * si hay un día terminado sin pagar, se paga; si estamos entre días y no hay
 * ninguna pantalla abierta, se abre la de fichar. Así una excepción perdida o
 * una recarga a mitad de cierre nunca dejan el juego atascado.
 */
function ensureFlow() {
  if (S.shift && !S.shift.active && !S.shift.closed) { endDayFlow(); return; }
  if ((!S.shift || S.shift.closed) && !sheetEl) ficharScreen();
}

function loop(now) {
  let dt = (now - prev) / 1000;
  prev = now;
  // Pestaña oculta a mitad de turno: el reloj laboral no corre sin ti.
  if (dt > 1) dt = 1;

  // El bucle NO puede morir: una excepción en un frame se apunta y se sigue.
  // (Ya pasó: un frame roto congelaba el juego con el reloj a 0:01.)
  try {
    step(S, dt);
    drainEvents();

    const st = stats(S);
    scene.frame(S, st);
    hud.frame(S, st);
    tickObjbar();

    acc += dt;
    if (acc >= UI_EVERY) { acc = 0; shop.refresh(S); }

    guardAcc += dt;
    if (guardAcc >= 1) { guardAcc = 0; ensureFlow(); }

    save(S);
  } catch (err) {
    console.error('FULGOR: frame roto (el juego sigue):', err);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Al arrancar: turno a medias se retoma; día terminado sin pagar se paga
// (esto repara partidas que se quedaron colgadas justo al acabar el turno);
// y si no, a fichar.
if (S.shift && S.shift.active) buildObjbar();
else setTimeout(ensureFlow, 350);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { flush(); return; }
  prev = performance.now();
});
window.addEventListener('pagehide', () => flush());
window.addEventListener('beforeunload', () => flush());

// Cache local: el juego abre al instante y funciona sin conexión.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

let resizeT;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => scene.layout(), 120);
});

// Teclas 1..9: pulsar el zócalo correspondiente.
window.addEventListener('keydown', (ev) => {
  if (ev.repeat || ev.metaKey || ev.ctrlKey) return;
  const n = parseInt(ev.key, 10);
  if (n >= 1 && n <= 9 && S.sockets[n - 1]) { doClick(n - 1); ev.preventDefault(); }
});
