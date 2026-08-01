// Panel lateral: mejoras, bombillas, economato, carrera y logros.
// Las filas se construyen una vez por pestaña y luego sólo se refresca el precio
// y si te lo puedes permitir — así no se pierde el scroll ni el estado del botón.

import {
  TIERS, CORE, RANKS, UPGRADES, AUTOMATION, CONSUMABLES, SKILLS, ACHIEVEMENTS,
} from '../engine/config.js';
import {
  stats, upgradeCost, consumableCost, skillCost, skillMax, socketAction,
  upgradeLocked, isBecario, UPG, AUT, SKL,
} from '../engine/engine.js';
import { fmt, money, pct } from '../engine/format.js';
import { icon } from './art.js';

export const TABS = [
  { id: 'mejoras', name: 'Mejoras',   ico: 'bolt' },
  { id: 'luz',     name: 'Bombillas', ico: 'bulb' },
  { id: 'tienda',  name: 'Economato', ico: 'coin' },
  { id: 'carrera', name: 'Carrera',   ico: 'wrench' },
  { id: 'logros',  name: 'Logros',    ico: 'trophy' },
];

let root, tabsEl, bodyEl, on;
let tab = 'mejoras';
let rows = [];
let builtFor = '';
export let bulk = 1;

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
    const txt = d.label != null ? d.label
      : d.cost == null ? 'MÁX'
      : fmt(d.cost) + (d.xp ? ' XP' : ' €');
    if (r.price.textContent !== txt) r.price.textContent = txt;
    const can = d.cost != null && !d.blocked && (d.xp ? s.xp : s.bank) >= d.cost;
    r.btn.disabled = !can;
    r.el.classList.toggle('afford', can);
    r.el.classList.toggle('maxed', d.cost == null);
    r.el.classList.toggle('blocked', !!d.blocked);
    if (d.lvl != null && r.lvlEl.textContent !== d.lvl) r.lvlEl.textContent = d.lvl;
    if (d.detail != null && r.detEl.innerHTML !== d.detail) r.detEl.innerHTML = d.detail;
  }
}

// ---------------------------------------------------------- mejoras
export function bulkCost(def, level, budget, n) {
  let total = 0, count = 0;
  const cap = def.max != null ? def.max - level : 500;
  for (let k = 0; k < Math.min(cap, n === 'max' ? 500 : n); k++) {
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
    const top = u.max != null && lvl >= u.max;
    const locked = upgradeLocked(s, u);
    if (locked) {
      d[u.id] = { cost: null, blocked: true, lvl: RANKS[u.minRank].name + ' o superior',
                  label: 'BLOQUEADA',
                  detail: `Necesitas ser <b>${RANKS[u.minRank].name}</b>. Primero, el ritmo básico.` };
      continue;
    }
    const { total, count } = bulk === 1
      ? { total: upgradeCost(u, lvl), count: 1 }
      : bulkCost(u, lvl, s.bank, bulk === 10 ? 10 : 'max');
    d[u.id] = {
      cost: top ? null : (count ? total : upgradeCost(u, lvl)),
      blocked: s.debt > 0,
      lvl: u.max != null ? `Nv ${lvl}/${u.max}` : 'Nv ' + lvl,
      detail: effectText(u.id, s, st) + (count > 1 ? ` <em>· compras ${count}</em>` : ''),
    };
  }
  for (const a of AUTOMATION) {
    const lvl = s.auto[a.id];
    d[a.id] = {
      cost: lvl >= a.max ? null : a.base * Math.pow(a.growth, lvl),
      blocked: s.debt > 0,
      lvl: `Nv ${lvl}/${a.max}`,
      detail: a.detail(lvl),
    };
  }
  return d;
}

function effectText(id, s, st) {
  const l = s.upgrades[id];
  switch (id) {
    case 'voltaje':    return `Ahora <b>x${(1 + l * 0.12).toFixed(2)}</b> de producción`;
    case 'filamento':  return `Ahora <b>-${pct(1 - st.decay, 0)}</b> de apagado`;
    case 'pulso':      return `Ahora <b>x${st.click.toFixed(2)}</b> por click`;
    case 'aislamiento':return `Ahora <b>-${pct(1 - Math.pow(0.96, l), 0)}</b> de desgaste`;
    case 'disipador':  return `Enfría <b>x${st.cool.toFixed(2)}</b> más rápido`;
    case 'reactor':    return `Sobrecarga de <b>${st.surgeTime.toFixed(2)} s</b>`;
    case 'cristal':    return `Aguanta <b>x${st.maxWear.toFixed(2)}</b> de desgaste`;
    case 'jornada':    return `Turno de <b>${st.shiftLen} s</b> · sueldo y cuota <b>x${st.jornadaMult.toFixed(2)}</b>`;
    case 'sobrecarga': return l ? 'Autorizado: la banda roja ya dispara la producción'
                                : 'Sin permiso, pulsar en rojo sólo recarga (click desperdiciado)';
    case 'bote':       return `Propina del <b>${pct(st.tipRate, 0)}</b> del sueldo al superar la cuota`;
    default: return '';
  }
}

function renderMejoras(s) {
  const list = [
    ...UPGRADES.map((u) => ({ key: u.id, name: u.name, desc: u.desc, ico: u.icon, act: 'upg', price: '', lvl: '' })),
    ...AUTOMATION.map((a) => ({ key: a.id, name: a.name, desc: a.desc, ico: a.icon, act: 'aut', price: '', lvl: '', cls: 'auto' })),
  ];
  const debtWarn = s.debt > 0
    ? `<p class="hint debt-hint">⚠ Con deuda no hay caprichos: paga al Sr. Braulio y hablamos.</p>` : '';
  build(list, `<div class="bulk">
      <span>Comprar</span>
      ${[1, 10, 'max'].map((n) => `<button class="bk ${bulk === n ? 'on' : ''}"
        data-act="bulk" data-id="${n}">${n === 'max' ? 'Máx' : 'x' + n}</button>`).join('')}
    </div>${debtWarn}
    <h3 class="sec">Herramientas propias</h3>`);
  const first = bodyEl.querySelector('.row.auto');
  if (first) first.insertAdjacentHTML('beforebegin', '<h3 class="sec">Automatismos</h3>');
}

// ---------------------------------------------------------- bombillas
function ladderHTML(s) {
  const best = Math.max(...s.sockets.map((sk) => sk.tier));
  const cap = RANKS[s.rank].maxTier;
  return `<div class="ladder">${TIERS.map((t, n) => {
    const here = s.sockets.filter((sk) => sk.tier === n).length;
    const cls = here ? 'on' : n <= best ? 'past' : n > cap ? 'locked' : 'future';
    return `<div class="rung ${cls}" style="--glow:${t.glow}">
      <i></i><b>${n + 1}</b><span>${t.name}</span>
      <em>${n > cap ? 'asciende para tocarla' : `${fmt(t.base)} €/s · ${(1 / t.decay).toFixed(0)} s`}</em>
      ${here ? `<u>${here}</u>` : ''}
    </div>`;
  }).join('')}</div>`;
}

function renderLuz(s) {
  const list = s.sockets.map((sk, i) => ({
    key: 'sk' + i, act: 'bulb', arg: i, ico: 'bulb',
    name: `Zócalo ${i + 1}`, desc: '', cls: 'sock', price: '', lvl: '',
  }));
  build(list, `<h3 class="sec">La escalera</h3>
    <p class="hint">Cada zócalo sube <b>de uno en uno</b>. La empresa sólo te deja tocar
    maquinaria hasta <b>${TIERS[RANKS[s.rank].maxTier].name}</b> — para más, asciende.
    Si una revienta y no la repones antes de fichar, <b>va a la nómina</b>.</p>
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
      label: a.kind === 'locked' ? 'ASCIENDE' : a.kind === 'max' ? 'MÁX' : null,
      lvl: `Nv ${sk.tier + 1} · ${t.name}`,
      detail: a.kind === 'max' ? `Tope de la escalera${fz}`
        : a.kind === 'locked' ? `La empresa no te deja tocar una ${TIERS[a.tier].name}… aún${fz}`
        : a.kind === 'repair'
          ? `<b>Reponer</b> otra ${t.name} (reventó)${fz}`
          : `<b>Subir a ${TIERS[a.tier].name}</b> · ${fmt(TIERS[a.tier].base)} €/s y ` +
            `${(1 / TIERS[a.tier].decay).toFixed(0)} s encendida${fz}`,
    };
    if (a.kind === 'locked' || a.kind === 'max') d['sk' + i].cost = null;
  });
  return d;
}

// ---------------------------------------------------------- economato
function renderTienda(s) {
  build(CONSUMABLES.map((c) => ({
    key: c.id, act: 'con', ico: c.icon, name: c.name, desc: c.desc, price: '', lvl: '',
  })), `<h3 class="sec">El economato de la fábrica</h3>
  <p class="hint">Precios «ajustados a tu categoría profesional» (los sube cuando
  asciendes, el muy ladino). Lo que se guarda, se gasta solo cuando hace falta.</p>`);
}

function tiendaData(s) {
  const d = {};
  for (const c of CONSUMABLES) {
    d[c.id] = {
      cost: consumableCost(s, c.id),
      blocked: s.debt > 0,
      lvl: c.stack ? `Tienes ${s.bag[c.id]}` : '',
      detail: c.buff ? `Dura ${c.buff.time} s de turno` : c.stack ? 'Se guarda en la taquilla' : 'Efecto inmediato',
    };
  }
  return d;
}

// ---------------------------------------------------------- carrera
function renderCarrera(s) {
  const R = RANKS[s.rank];
  const next = RANKS[s.rank + 1];
  build(SKILLS.map((k) => ({
    key: k.id, act: 'skl', ico: k.icon, name: k.name, desc: k.desc, price: '', lvl: '', cls: 'pres',
  })), `
    <div class="rankcard">
      <div class="rk-head">${icon('wrench')}<div>
        <b>${R.name}</b><small>${R.mote}</small>
      </div><span class="rk-salary">${money(R.salary)}/día</span></div>
      ${next ? `
        <div class="bar"><i style="width:${Math.min(100, (s.metDays / R.promoteDays) * 100).toFixed(0)}%"></i></div>
        <small>Ascenso a <b>${next.name}</b>: ${s.metDays}/${R.promoteDays} días cumpliendo la cuota
        · sueldo ${money(next.salary)}/día · ${next.sockets} zócalos</small>`
        : '<small>Has llegado a lo más alto. El despacho con ventana es tuyo.</small>'}
      <button class="big off dimitir" data-act="dimitir">Dimitir (te llevas el finiquito en XP)</button>
    </div>
    <h3 class="sec">Currículum · ${fmt(s.xp)} XP</h3>
    <p class="hint">Las habilidades se pagan con experiencia y <b>no se pierden nunca</b>:
    ni despedido, ni en el calabozo. Son lo que eres, no lo que tienes.</p>`);
}

function carreraData(s) {
  const d = {};
  for (const k of SKILLS) {
    const lvl = s.skills[k.id];
    const max = skillMax(k);
    d[k.id] = {
      cost: skillCost(k, lvl), xp: true,
      lvl: max < 900 ? `Nv ${lvl}/${max}` : 'Nv ' + lvl,
      detail: skillEffect(k.id, lvl),
    };
  }
  return d;
}

function skillEffect(id, l) {
  switch (id) {
    case 'callo':      return `Ahora <b>x${(1 + l * 0.10).toFixed(2)}</b> de nómina`;
    case 'enchufe':    return `Empiezas de <b>${RANKS[Math.min(RANKS.length - 1, l)].name}</b>`;
    case 'colchon':    return l ? `Empiezas con <b>2 sueldos × ${l}</b> en el banco` : 'Empiezas sin un euro';
    case 'manitas':    return `Ahora <b>-${pct(1 - Math.pow(0.92, l), 0)}</b> de desgaste`;
    case 'ojoclinico': return `Tope de sobrecarga <b>x${CORE.surgeCap + l + 1}</b>`;
    case 'madrugador': return `Turno base <b>+${l * 12} s</b>`;
    case 'labia':      return `Facturas al <b>${pct(Math.max(0.4, 1 - l * 0.08), 0)}</b>`;
    case 'esponja':    return `Experiencia <b>x${(1 + l * 0.15).toFixed(2)}</b>`;
    default: return '';
  }
}

// ---------------------------------------------------------- logros
function renderLogros(s) {
  const got = ACHIEVEMENTS.filter((a) => s.achievements.includes(a.id));
  const total = got.reduce((t, a) => t + a.mult, 0);
  bodyEl.innerHTML = `
    <h3 class="sec">Logros · ${got.length}/${ACHIEVEMENTS.length}</h3>
    <p class="hint">Cada logro suma un bonus permanente a la producción.
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
    <h3 class="sec">Expediente laboral</h3>
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
    ['Vida laboral nº', fmt(t.lives)],
    ['Días trabajados', fmt(t.daysWorked)],
    ['Cuotas cumplidas', fmt(t.quotasMet)],
    ['Ascensos', fmt(t.promotions)],
    ['Clicks', fmt(t.clicks)],
    ['Sobrecargas', fmt(t.surges)],
    ['Bombillas rotas', fmt(t.breaks)],
    ['Producción total', money(t.produced)],
    ['Mejor día', money(t.bestDay)],
    ['Despidos', fmt(t.despidos)],
    ['Calabozos', fmt(t.calabozos)],
    ['XP acumulada', fmt(t.xpEarned)],
  ];
}

// ------------------------------------------------------------- refresco
const RENDER = { mejoras: renderMejoras, luz: renderLuz, tienda: renderTienda, carrera: renderCarrera, logros: renderLogros };
const DATA = { mejoras: mejorasData, luz: luzData, tienda: tiendaData, carrera: carreraData, logros: () => ({}) };

export function refresh(s) {
  const key = tab + '|' + structureKey(s);
  if (key !== builtFor) { builtFor = key; RENDER[tab](s); }
  tick(s, DATA[tab](s));
}

function structureKey(s) {
  switch (tab) {
    case 'luz':     return s.rank + ':' + s.sockets.map((k) => `${k.tier}${k.bulb ? '' : 'x'}`).join('');
    case 'carrera': return s.rank + ':' + s.metDays;
    case 'logros':  return s.achievements.length + ':' + Math.floor(s.stats.clicks / 25);
    case 'mejoras': return 'b' + bulk + (s.debt > 0 ? 'D' : '');
    case 'tienda':  return s.debt > 0 ? 'D' : '';
    default:        return '';
  }
}
