// Panel lateral: mejoras, bombillas, tienda, apagón y logros.
// Las filas se construyen una vez por pestaña y luego sólo se refresca el precio
// y si te lo puedes permitir — así no se pierde el scroll ni el estado del botón.

import {
  TIERS, CORE, UPGRADES, AUTOMATION, CONSUMABLES, PRESTIGE, ACHIEVEMENTS, socketCost,
} from '../engine/config.js';
import {
  stats, upgradeCost, consumableCost, prestigeCost, prestigeMax,
  pendingSparks, canPrestige, socketAction,
} from '../engine/engine.js';
import { fmt, money, pct } from '../engine/format.js';
import { icon } from './art.js';

export const TABS = [
  { id: 'mejoras',  name: 'Mejoras',   ico: 'bolt' },
  { id: 'luz',      name: 'Bombillas', ico: 'bulb' },
  { id: 'tienda',   name: 'Tienda',    ico: 'coin' },
  { id: 'apagon',   name: 'Apagón',    ico: 'power' },
  { id: 'logros',   name: 'Logros',    ico: 'trophy' },
];

let root, tabsEl, bodyEl, on;
let tab = 'mejoras';
let rows = [];
let builtFor = '';
export let bulk = 1;   // x1 · x10 · Máx

export function mount(el, handlers) {
  root = el;
  on = handlers;
  root.innerHTML = `
    <div class="tabs" role="tablist">
      ${TABS.map((t) => `<button class="tab" data-tab="${t.id}" role="tab">
        ${icon(t.ico)}<span>${t.name}</span></button>`).join('')}
    </div>
    <div class="panel-body"></div>`;
  tabsEl = root.querySelector('.tabs');
  bodyEl = root.querySelector('.panel-body');

  root.addEventListener('click', (ev) => {
    const t = ev.target.closest('.tab');
    if (t) { setTab(t.dataset.tab); return; }
    const b = ev.target.closest('[data-act]');
    if (!b || b.disabled) return;
    on.action(b.dataset.act, b.dataset.id, b.dataset.arg);
  });
}

export function setTab(id) {
  tab = id;
  builtFor = '';
  [...tabsEl.children].forEach((c) => c.classList.toggle('on', c.dataset.tab === id));
  refresh(on.state());
}

export function setBulk(n) { bulk = n; builtFor = ''; }

// --------------------------------------------------------------- filas
// Cada fila declara cómo se dibuja y cómo se refresca. `cost: null` = tope.
function rowHTML(r) {
  return `<div class="row ${r.cls || ''}" data-row="${r.key}">
    <div class="row-ic">${icon(r.ico)}</div>
    <div class="row-txt">
      <div class="row-top"><b>${r.name}</b><span class="lvl">${r.lvl || ''}</span></div>
      <p>${r.desc}</p>
      <div class="row-detail">${r.detail || ''}</div>
    </div>
    <button class="buy" data-act="${r.act}" data-id="${r.key}" ${r.arg != null ? `data-arg="${r.arg}"` : ''}>
      <span class="price">${r.price}</span>
    </button>
  </div>`;
}

function build(list, extraHTML = '') {
  bodyEl.innerHTML = extraHTML + list.map(rowHTML).join('');
  rows = list.map((r) => {
    const el = bodyEl.querySelector(`[data-row="${CSS.escape(r.key)}"]`);
    return { ...r, el, btn: el?.querySelector('.buy'), price: el?.querySelector('.price'),
             lvlEl: el?.querySelector('.lvl'), detEl: el?.querySelector('.row-detail') };
  });
}

/** Refresca precios/afordabilidad sin tocar la estructura. */
function tick(s, cur) {
  for (const r of rows) {
    if (!r.el) continue;
    const d = cur[r.key];
    if (!d) continue;
    const txt = d.cost == null ? 'MÁX' : fmt(d.cost) + (d.spark ? ' ⚡' : ' €');
    if (r.price.textContent !== txt) r.price.textContent = txt;
    const can = d.cost != null && (d.spark ? s.sparks : s.money) >= d.cost;
    r.btn.disabled = !can;
    r.el.classList.toggle('afford', can);
    r.el.classList.toggle('maxed', d.cost == null);
    if (d.lvl != null && r.lvlEl.textContent !== d.lvl) r.lvlEl.textContent = d.lvl;
    if (d.detail != null && r.detEl.innerHTML !== d.detail) r.detEl.innerHTML = d.detail;
  }
}

// ---------------------------------------------------------- definiciones
/** Coste total de comprar `n` niveles seguidos (para los botones x10/Máx). */
export function bulkCost(def, level, budget, n) {
  let total = 0, count = 0;
  for (let k = 0; k < (n === 'max' ? 500 : n); k++) {
    const c = def.base * Math.pow(def.growth, level + k);
    if (n === 'max' && total + c > budget) break;
    total += c; count++;
  }
  return { total, count };
}

function mejorasData(s) {
  const st = stats(s);
  const d = {};
  for (const u of UPGRADES) {
    const lvl = s.upgrades[u.id];
    const { total, count } = bulk === 1
      ? { total: upgradeCost(u, lvl), count: 1 }
      : bulkCost(u, lvl, s.money, bulk === 10 ? 10 : 'max');
    d[u.id] = {
      cost: count ? total : upgradeCost(u, lvl),
      lvl: 'Nv ' + lvl,
      detail: effectText(u.id, s, st) + (count > 1 ? ` <em>· compras ${count}</em>` : ''),
    };
  }
  for (const a of AUTOMATION) {
    const lvl = s.auto[a.id];
    d[a.id] = {
      cost: lvl >= a.max ? null : a.base * Math.pow(a.growth, lvl),
      lvl: `Nv ${lvl}/${a.max}`,
      detail: a.detail(lvl),
    };
  }
  return d;
}

function effectText(id, s, st) {
  const l = s.upgrades[id];
  switch (id) {
    case 'voltaje':    return `Ahora <b>x${(1 + l * 0.12).toFixed(2)}</b> al dinero`;
    case 'filamento':  return `Ahora <b>-${pct(1 - st.decay, 0)}</b> de apagado`;
    case 'pulso':      return `Ahora <b>x${st.click.toFixed(2)}</b> por click`;
    case 'aislamiento':return `Ahora <b>-${pct(1 - Math.pow(0.96, l), 0)}</b> de desgaste`;
    case 'disipador':  return `Enfría <b>x${st.cool.toFixed(2)}</b> más rápido`;
    case 'reactor':    return `Sobrecarga de <b>${st.surgeTime.toFixed(2)} s</b>`;
    case 'cristal':    return `Aguanta <b>x${st.maxWear.toFixed(2)}</b> de desgaste`;
    case 'espejo':     return `Offline al <b>${pct(st.offline, 0)}</b> (tope ${CORE.offlineCapH} h)`;
    default: return '';
  }
}

function renderMejoras(s) {
  const list = [
    ...UPGRADES.map((u) => ({ key: u.id, name: u.name, desc: u.desc, ico: u.icon, act: 'upg', price: '', lvl: '' })),
    ...AUTOMATION.map((a) => ({ key: a.id, name: a.name, desc: a.desc, ico: a.icon, act: 'aut', price: '', lvl: '', cls: 'auto' })),
  ];
  build(list, `<div class="bulk">
      <span>Comprar</span>
      ${[1, 10, 'max'].map((n) => `<button class="bk ${bulk === n ? 'on' : ''}"
        data-act="bulk" data-id="${n}">${n === 'max' ? 'Máx' : 'x' + n}</button>`).join('')}
    </div>
    <h3 class="sec">Estadísticas</h3>`);
  // el separador de automatismos va justo antes de la primera fila 'auto'
  const first = bodyEl.querySelector('.row.auto');
  if (first) first.insertAdjacentHTML('beforebegin', '<h3 class="sec">Automatismos</h3>');
}

/** La escalera de niveles, con la posición de cada zócalo marcada. */
function ladderHTML(s) {
  const best = Math.max(...s.sockets.map((sk) => sk.tier));
  return `<div class="ladder">${TIERS.map((t, n) => {
    const here = s.sockets.filter((sk) => sk.tier === n).length;
    const cls = here ? 'on' : n <= best ? 'past' : 'future';
    return `<div class="rung ${cls}" style="--glow:${t.glow}">
      <i></i><b>${n + 1}</b><span>${t.name}</span>
      <em>${fmt(t.base)} €/s · ${(1 / t.decay).toFixed(0)} s</em>
      ${here ? `<u>${here}</u>` : ''}
    </div>`;
  }).join('')}</div>`;
}

function renderLuz(s) {
  const list = s.sockets.map((sk, i) => ({
    key: 'sk' + i, act: 'bulb', arg: i, ico: 'bulb',
    name: `Zócalo ${i + 1}`, desc: '', cls: 'sock', price: '', lvl: '',
  }));
  list.push({ key: 'newsock', act: 'sock', ico: 'grid', name: 'Nuevo zócalo',
    desc: 'Una boca más donde enchufar. Llega <b>vacío y en el nivel 1</b>: más luz, pero más que vigilar.',
    cls: 'sock', price: '', lvl: '' });
  build(list, `<h3 class="sec">La escalera</h3>
    <p class="hint">Cada zócalo sube <b>de uno en uno</b>, nunca salta. Al subir de nivel
    la bombilla da más dinero <b>y aguanta más encendida</b>. Si revienta, repones
    una igual: no pierdes el nivel.</p>
    ${ladderHTML(s)}
    <div class="rowbtns"><button class="big alt" data-act="upall">Mejorar todas un nivel</button></div>
    <h3 class="sec">Zócalos</h3>`);
}

function luzData(s) {
  const d = {};
  s.sockets.forEach((sk, i) => {
    const a = socketAction(s, i);
    const t = TIERS[sk.tier];
    const fz = sk.forzado ? ` · forzado <b>x${sk.forzado}</b>` : '';
    d['sk' + i] = {
      cost: a.cost,
      lvl: `Nv ${sk.tier + 1} · ${t.name}`,
      detail: a.kind === 'max' ? `Tope de la escalera${fz}`
        : a.kind === 'repair'
          ? `<b>Reponer</b> otra ${t.name} (reventó)${fz}`
          : `<b>Subir a ${TIERS[a.tier].name}</b> · ${fmt(TIERS[a.tier].base)} €/s y ` +
            `${(1 / TIERS[a.tier].decay).toFixed(0)} s encendida${fz}`,
    };
  });
  d.newsock = {
    cost: s.sockets.length >= CORE.maxSockets ? null : socketCost(s.sockets.length),
    lvl: `${s.sockets.length}/${CORE.maxSockets}`,
    detail: s.sockets.length >= CORE.maxSockets ? 'Instalación completa' : 'Llega vacío, nivel 1',
  };
  return d;
}

function renderTienda(s) {
  build(CONSUMABLES.map((c) => ({
    key: c.id, act: 'con', ico: c.icon, name: c.name, desc: c.desc, price: '', lvl: '',
  })), `<h3 class="sec">Consumibles</h3>
  <p class="hint">Se encarecen con tu mejor bombilla, así que siguen valiendo la pena
  toda la partida. Los que se guardan se gastan solos cuando hacen falta.</p>`);
}

function tiendaData(s) {
  const d = {};
  for (const c of CONSUMABLES) {
    d[c.id] = {
      cost: consumableCost(s, c.id),
      lvl: c.stack ? `Tienes ${s.bag[c.id]}` : '',
      detail: c.buff ? `Dura ${c.buff.time} s` : c.stack ? 'Se guarda en la mochila' : 'Efecto inmediato',
    };
  }
  return d;
}

function renderApagon(s) {
  const gain = pendingSparks(s);
  const ok = canPrestige(s);
  const prog = Math.min(1, s.runEarned / CORE.prestigeAt);
  build(PRESTIGE.map((p) => ({
    key: p.id, act: 'pre', ico: p.icon, name: p.name, desc: p.desc, price: '', lvl: '', cls: 'pres',
  })), `
    <div class="apagon ${ok ? 'ready' : ''}">
      <div class="ap-head">${icon('power')}<div>
        <b>Apagón</b>
        <p>Reinicias la instalación entera y te llevas <b class="sp">${fmt(gain)} ⚡ chispas</b>
        permanentes. Conservas chispas, logros y estadísticas.</p>
      </div></div>
      ${ok ? '' : `<div class="bar"><i style="width:${(prog * 100).toFixed(1)}%"></i></div>
        <small>Llevas ${money(s.runEarned)} de ${money(CORE.prestigeAt)} en esta partida</small>`}
      <button class="big ${ok ? '' : 'off'}" data-act="prestige" ${ok ? '' : 'disabled'}>
        ${ok ? `Apagar y cobrar ${fmt(gain)} ⚡` : 'Aún no disponible'}
      </button>
    </div>
    <h3 class="sec">Mejoras permanentes · ${fmt(s.sparks)} ⚡</h3>`);
}

function apagonData(s) {
  const d = {};
  for (const p of PRESTIGE) {
    const lvl = s.prestige[p.id];
    const max = prestigeMax(p);
    d[p.id] = {
      cost: prestigeCost(p, lvl), spark: true,
      lvl: max < 900 ? `Nv ${lvl}/${max}` : 'Nv ' + lvl,
      detail: presEffect(p.id, lvl),
    };
  }
  return d;
}

function presEffect(id, l) {
  switch (id) {
    case 'nucleo':   return `Ahora <b>x${(1 + l * 0.25).toFixed(2)}</b> al dinero`;
    case 'genesis':  return `Empiezas con <b>${1 + l}</b> zócalos`;
    case 'herencia': return `Empiezas con <b>${TIERS[Math.min(TIERS.length - 1, l)].name}</b>`;
    case 'memoria':  return l ? `Empiezas con <b>${fmt(250 * Math.pow(8, l - 1))} €</b>` : 'Empiezas sin nada';
    case 'reflejo':  return l ? `Chispa nivel <b>${l}</b> de salida` : 'Sin automatismo inicial';
    case 'temple':   return `Ahora <b>-${pct(1 - Math.pow(0.92, l), 0)}</b> de desgaste`;
    case 'avaricia': return `Tope de sobrecarga <b>x${CORE.surgeCap + l + 1}</b>`;
    case 'eco':      return `Offline base <b>+${pct(l * 0.2, 0)}</b>`;
    default: return '';
  }
}

function renderLogros(s) {
  const got = ACHIEVEMENTS.filter((a) => s.achievements.includes(a.id));
  const total = got.reduce((t, a) => t + a.mult, 0);
  bodyEl.innerHTML = `
    <h3 class="sec">Logros · ${got.length}/${ACHIEVEMENTS.length}</h3>
    <p class="hint">Cada logro suma un bonus permanente al dinero.
    Llevas <b>+${total}%</b>.</p>
    <div class="ach-grid">
      ${ACHIEVEMENTS.map((a) => {
        const un = s.achievements.includes(a.id);
        return `<div class="ach ${un ? 'on' : ''}" title="${a.desc}">
          ${icon(un ? 'trophy' : 'lock')}
          <div><b>${un ? a.name : '???'}</b><span>${a.desc}</span></div>
          <em>+${a.mult}%</em>
        </div>`;
      }).join('')}
    </div>
    <h3 class="sec">Estadísticas</h3>
    <div class="stats-grid">
      ${statRows(s).map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}
    </div>
    <div class="danger-zone">
      <button class="big off" data-act="wipe">Borrar la partida</button>
    </div>`;
  rows = [];
}

function statRows(s) {
  const t = s.stats;
  return [
    ['Clicks', fmt(t.clicks)],
    ['Sobrecargas', fmt(t.surges)],
    ['Stack máximo', 'x' + (t.maxStack + 1)],
    ['Bombillas rotas', fmt(t.breaks)],
    ['Mejor bombilla', TIERS[Math.min(TIERS.length - 1, t.maxTier)].name],
    ['Ganado (partida)', money(s.runEarned)],
    ['Ganado (histórico)', money(t.lifeEarned)],
    ['Mejor partida', money(t.bestRun)],
    ['Apagones', fmt(t.prestiges)],
    ['Chispas', fmt(s.sparks) + ' ⚡'],
  ];
}

// ------------------------------------------------------------- refresco
const RENDER = { mejoras: renderMejoras, luz: renderLuz, tienda: renderTienda, apagon: renderApagon, logros: renderLogros };
const DATA = { mejoras: mejorasData, luz: luzData, tienda: tiendaData, apagon: apagonData, logros: () => ({}) };

/** Llamado varias veces por segundo: reconstruye sólo si cambió la estructura. */
export function refresh(s) {
  const key = tab + '|' + structureKey(s);
  if (key !== builtFor) { builtFor = key; RENDER[tab](s); }
  tick(s, DATA[tab](s));
}

/** Lo que obliga a redibujar la pestaña (no los precios, que se refrescan solos). */
function structureKey(s) {
  switch (tab) {
    case 'luz':    return s.sockets.length + ':' + s.sockets.map((k) => `${k.tier}${k.bulb ? '' : 'x'}`).join('');
    case 'apagon': return canPrestige(s) ? 'ok' + pendingSparks(s) : 'no' + Math.floor(s.runEarned / (CORE.prestigeAt / 60));
    case 'logros': return s.achievements.length + ':' + Math.floor(s.stats.clicks / 25);
    case 'mejoras':return 'b' + bulk;
    default:       return '';
  }
}
