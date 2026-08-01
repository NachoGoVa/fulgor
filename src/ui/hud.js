// Barra superior: dinero, producción, chispas y los buffs que estén corriendo.

import { stats, income, potential } from '../engine/engine.js';
import { fmt, money, pct } from '../engine/format.js';
import { CONSUMABLES } from '../engine/config.js';
import { icon, logoSvg } from './art.js';

const CON = Object.fromEntries(CONSUMABLES.map((c) => [c.id, c]));
let el, refs, last = {};

export function mount(node) {
  el = node;
  el.innerHTML = `
    <div class="brand">${logoSvg()}<h1>FULGOR</h1></div>
    <div class="readouts">
      <div class="ro money">
        <span class="ro-lbl" data-short="Dinero">Dinero</span>
        <b class="ro-val" data-k="money">0 €</b>
      </div>
      <div class="ro">
        <span class="ro-lbl" data-short="€/s">Producción</span>
        <b class="ro-val" data-k="rate">0 €/s</b>
        <small class="ro-sub" data-k="pot"></small>
      </div>
      <div class="ro spark">
        <span class="ro-lbl" data-short="Chispas">Chispas</span>
        <b class="ro-val" data-k="sparks">0</b>
      </div>
      <div class="ro mult">
        <span class="ro-lbl" data-short="Multi">Multiplicador</span>
        <b class="ro-val" data-k="mult">x1</b>
      </div>
    </div>
    <div class="buffs"></div>`;
  refs = {
    money: el.querySelector('[data-k=money]'),
    rate: el.querySelector('[data-k=rate]'),
    pot: el.querySelector('[data-k=pot]'),
    sparks: el.querySelector('[data-k=sparks]'),
    mult: el.querySelector('[data-k=mult]'),
    buffs: el.querySelector('.buffs'),
  };
}

const set = (node, key, val) => {
  if (last[key] === val) return;
  last[key] = val;
  node.textContent = val;
};

export function frame(s, st = stats(s)) {
  set(refs.money, 'm', money(s.money));
  const now = income(s, st), max = potential(s, st);
  set(refs.rate, 'r', fmt(now) + ' €/s');
  // Por encima del 100% significa que hay sobrecargas corriendo: se marca.
  const ratio = max > 0 ? now / max : 0;
  set(refs.pot, 'p', max > 0 ? `${pct(ratio, 0)} del ritmo base` : '');
  refs.pot.classList.toggle('over', ratio > 1.01);
  set(refs.sparks, 's', fmt(s.sparks) + ' ⚡');
  set(refs.mult, 'x', 'x' + fmt(st.money, st.money < 100 ? 2 : 0));
  // Al empezar no hay ningún multiplicador: enseñar "x1.00" hacía pensar que
  // la partida arranca con bonificaciones puestas. Aparece cuando existe.
  refs.mult.parentElement.classList.toggle('hide', st.money < 1.02);
  refs.sparks.parentElement.classList.toggle('hide', !s.sparks && !s.stats.prestiges);

  // Los buffs activos, con su cuenta atrás.
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

/** Marca visualmente que acabas de cobrar algo gordo. */
export function flashMoney() {
  refs.money.classList.remove('pop');
  void refs.money.offsetWidth;
  refs.money.classList.add('pop');
}
