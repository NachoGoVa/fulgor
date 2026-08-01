// Barra superior: banco, cuota del día, reloj del turno y experiencia.

import { stats } from '../engine/engine.js';
import { RANKS, CONSUMABLES } from '../engine/config.js';
import { fmt, money, pct } from '../engine/format.js';
import { icon, logoSvg } from './art.js';

const CON = Object.fromEntries(CONSUMABLES.map((c) => [c.id, c]));
let el, refs, last = {};

export function mount(node) {
  el = node;
  el.innerHTML = `
    <div class="brand">${logoSvg()}<h1>FULGOR</h1></div>
    <div class="readouts">
      <div class="ro money">
        <span class="ro-lbl" data-short="Banco">Banco</span>
        <b class="ro-val" data-k="bank">0 €</b>
        <small class="ro-sub" data-k="debt"></small>
      </div>
      <div class="ro quota">
        <span class="ro-lbl" data-short="Cuota">Cuota del día</span>
        <b class="ro-val" data-k="quota">—</b>
        <small class="ro-sub" data-k="qpct"></small>
      </div>
      <div class="ro clockro">
        <span class="ro-lbl" data-short="Turno">Turno</span>
        <b class="ro-val clock" data-k="clock">—</b>
        <small class="ro-sub" data-k="dayinfo"></small>
      </div>
      <div class="ro spark">
        <span class="ro-lbl" data-short="XP">Experiencia</span>
        <b class="ro-val" data-k="xp">0</b>
      </div>
    </div>
    <div class="buffs"></div>`;
  refs = {
    bank: el.querySelector('[data-k=bank]'),
    debt: el.querySelector('[data-k=debt]'),
    quota: el.querySelector('[data-k=quota]'),
    qpct: el.querySelector('[data-k=qpct]'),
    clock: el.querySelector('[data-k=clock]'),
    dayinfo: el.querySelector('[data-k=dayinfo]'),
    xp: el.querySelector('[data-k=xp]'),
    buffs: el.querySelector('.buffs'),
    money: el.querySelector('.ro.money'),
  };
}

const set = (node, key, val) => {
  if (last[key] === val) return;
  last[key] = val;
  node.textContent = val;
};

const mmss = (sec) => {
  sec = Math.max(0, Math.ceil(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

export function frame(s, st = stats(s)) {
  set(refs.bank, 'b', money(s.bank));
  set(refs.debt, 'd', s.debt > 0 ? `debes ${money(s.debt)}` : '');
  refs.money.classList.toggle('indebt', s.debt > 0);

  const sh = s.shift;
  const running = sh && sh.active;
  // La cuota del día vive congelada en el turno; entre días se estima la de mañana.
  const quota = sh && sh.quota != null ? sh.quota : s.quota * st.jornadaMult;
  set(refs.quota, 'q', sh
    ? `${fmt(sh.produced)} / ${fmt(quota)}`
    : `— / ${fmt(quota)}`);
  const ratio = sh ? Math.min(1, sh.produced / quota) : 0;
  set(refs.qpct, 'qp', sh ? (ratio >= 1 ? '¡cumplida!' : pct(ratio, 0)) : '');
  refs.qpct.classList.toggle('over', ratio >= 1);

  set(refs.clock, 'c', running ? mmss(sh.left) : '—');
  refs.clock.classList.toggle('urgent', running && sh.left <= 15);
  set(refs.dayinfo, 'di', `Día ${s.day || '—'} · ${RANKS[s.rank].name}`);

  set(refs.xp, 'x', fmt(s.xp) + ' XP');

  const key = s.buffs.map((b) => b.id + Math.ceil(b.time)).join(',');
  if (last.buffs !== key) {
    last.buffs = key;
    refs.buffs.innerHTML = s.buffs.map((b) => {
      const def = CON[b.id];
      return `<div class="buff">${icon(def ? def.icon : 'surge')}
        <span>${def ? def.name : b.id}</span><b>${Math.ceil(b.time)}s</b></div>`;
    }).join('');
  }
}

export function flashMoney() {
  refs.bank.classList.remove('pop');
  void refs.bank.offsetWidth;
  refs.bank.classList.add('pop');
}
