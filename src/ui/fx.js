// Efectos: números que suben, chispas y avisos. Un clicker sin feedback táctil
// se siente muerto, así que aquí es donde se gasta el presupuesto de "gracia".

import { fmt } from '../engine/format.js';
import { icon } from './art.js';

let layer, toastBox;
const MAX_FLOATS = 60;   // tope duro: en pleno spam no queremos inundar el DOM

export function mount(fxEl, toastEl) {
  layer = fxEl;
  toastBox = toastEl;
}

/** Número flotante de dinero ganado. `kind` cambia color y tamaño. */
export function float(x, y, text, kind = '') {
  if (!layer || layer.childElementCount > MAX_FLOATS) return;
  const n = document.createElement('span');
  n.className = 'float ' + kind;
  n.textContent = text;
  // Un poco de dispersión para que dos clicks seguidos no se solapen.
  const dx = (Math.random() - 0.5) * 46;
  n.style.cssText = `left:${x}px;top:${y}px;--dx:${dx.toFixed(1)}px;--rot:${(dx / 6).toFixed(1)}deg`;
  layer.appendChild(n);
  n.addEventListener('animationend', () => n.remove(), { once: true });
}

/** Corona de chispas al sobrecargar. */
export function burst(x, y, count = 10, kind = '') {
  if (!layer || layer.childElementCount > MAX_FLOATS) return;
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const d = 34 + Math.random() * 42;
    const p = document.createElement('i');
    p.className = 'fx-spark ' + kind;
    p.style.cssText = `left:${x}px;top:${y}px;--ex:${(Math.cos(a) * d).toFixed(1)}px;` +
                      `--ey:${(Math.sin(a) * d).toFixed(1)}px;--d:${(0.4 + Math.random() * 0.4).toFixed(2)}s`;
    layer.appendChild(p);
    p.addEventListener('animationend', () => p.remove(), { once: true });
  }
}

/** Lluvia de cristales cuando una bombilla revienta. */
export function shatter(x, y) {
  if (!layer) return;
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('i');
    p.className = 'shard-fx';
    const dx = (Math.random() - 0.5) * 130;
    p.style.cssText = `left:${x}px;top:${y}px;--ex:${dx.toFixed(1)}px;` +
                      `--ey:${(70 + Math.random() * 90).toFixed(1)}px;` +
                      `--d:${(0.5 + Math.random() * 0.5).toFixed(2)}s;--rot:${(Math.random() * 720 - 360).toFixed(0)}deg`;
    layer.appendChild(p);
    p.addEventListener('animationend', () => p.remove(), { once: true });
  }
}

let lastToast = '';
export function toast(text, kind = '', ico = null) {
  if (!toastBox) return;
  if (text === lastToast && toastBox.childElementCount) return; // no repetir en bucle
  lastToast = text;
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.innerHTML = (ico ? icon(ico) : '') + `<span>${text}</span>`;
  toastBox.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    t.addEventListener('animationend', () => t.remove(), { once: true });
  }, 2600);
  while (toastBox.childElementCount > 4) toastBox.firstElementChild.remove();
}

/** Sacudida de pantalla: se reserva para las roturas y el Apagón. */
export function shake(el, hard = false) {
  el.classList.remove('shake', 'shake-hard');
  void el.offsetWidth;
  el.classList.add(hard ? 'shake-hard' : 'shake');
}

export const gainText = (n) => '+' + fmt(n) + ' €';
