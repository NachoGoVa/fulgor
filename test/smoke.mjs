/**
 * Prueba de humo en un navegador de verdad: `npm run smoke`.
 * Levanta el servidor, abre Chrome headless por CDP y comprueba que el juego
 * monta, que el bucle corre, que el click y la sobrecarga responden y que no
 * hay errores de consola ni desbordes horizontales en móvil.
 *
 * Sin dependencias: usa el WebSocket integrado de Node. Si no encuentra Chrome
 * no falla, avisa y sale — los tests de engine.test.js siguen siendo los que mandan.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const CHROME = CANDIDATES.find((p) => existsSync(p));
if (!CHROME) {
  console.log('· Sin Chrome/Edge instalado: se omite la prueba de humo.');
  process.exit(0);
}

const PORT = 5181, DBG = 9222 + (process.pid % 500);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = [];
const check = (ok, msg) => { if (!ok) fail.push(msg); console.log(`  ${ok ? '✔' : '✘'} ${msg}`); };

const server = spawn(process.execPath, [join(import.meta.dirname, '..', 'serve.mjs')],
  { env: { ...process.env, PORT }, stdio: 'ignore' });
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${DBG}`, '--disable-gpu', '--no-first-run',
  '--no-default-browser-check', '--user-data-dir=' + join(process.env.TEMP || '/tmp', 'fulgor-smoke'),
  'about:blank',
], { stdio: 'ignore' });

let ws, id = 0;
const pending = new Map();
const errors = [];
const send = (method, params = {}) => new Promise((res, rej) => {
  const n = ++id;
  pending.set(n, { res, rej });
  ws.send(JSON.stringify({ id: n, method, params }));
});

try {
  let url;
  for (let i = 0; i < 60 && !url; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DBG}/json/list`)).json();
      url = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
    } catch {}
    if (!url) await sleep(250);
  }
  if (!url) throw new Error('Chrome no abrió el puerto de depuración');

  ws = new WebSocket(url);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const h = pending.get(m.id); pending.delete(m.id);
      m.error ? h.rej(new Error(m.error.message)) : h.res(m.result);
      return;
    }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      errors.push(d.exception?.description || d.text);
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      errors.push(m.params.entry.text + ' ' + (m.params.entry.url || ''));
    }
  };

  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',
    { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  // Partida limpia: si arrastramos el guardado de la ejecución anterior, el
  // juego empieza con dinero arbitrario y las comprobaciones dejan de ser fiables.
  await send('Page.navigate', { url: `http://localhost:${PORT}/__limpiar` });
  await sleep(600);
  const ev = async (e) => {
    const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval falló');
    return r.result.value;
  };
  // Partida, service worker Y cachés: si queda el SW de una ejecución anterior,
  // sirve el juego viejo desde su caché y el smoke prueba un fantasma.
  await ev(`(async () => {
    localStorage.clear();
    const regs = await (navigator.serviceWorker?.getRegistrations?.() || []);
    for (const r of regs) await r.unregister();
    for (const k of await caches.keys()) await caches.delete(k);
  })()`);
  await send('Page.navigate', { url: `http://localhost:${PORT}/` });
  await sleep(2500);
  // Sólo nos interesan los errores del juego, no el 404 de la página de limpieza.
  errors.length = 0;

  console.log('\nFULGOR · prueba de humo');
  const shape = await ev(`(() => ({
    sockets: document.querySelectorAll('.socket').length,
    bulbs: document.querySelectorAll('.bulb-svg').length,
    tabs: document.querySelectorAll('.tab').length,
    rows: document.querySelectorAll('.row').length,
    fichar: !!document.querySelector('.modal.locked [data-btn]'),
  }))()`);
  check(shape.sockets >= 1 && shape.bulbs >= 1, `la sala monta (${shape.sockets} zócalos)`);
  check(shape.tabs === 5, `las 5 pestañas están (${shape.tabs})`);
  check(shape.rows > 5, `el panel lista mejoras (${shape.rows} filas)`);
  check(shape.fichar, 'la pantalla de fichar espera al operario');

  // Fichamos: arranca el turno, el reloj corre y la producción sube.
  await ev(`document.querySelector('.modal.locked [data-btn]').click()`);
  await sleep(400);
  const objs = await ev(`document.querySelectorAll('#objbar .obj').length`);
  check(objs >= 3, `los objetivos del día están a la vista (${objs} chips)`);
  const c1 = await ev(`document.querySelector('[data-k=clock]').textContent`);
  const p1 = await ev(`document.querySelector('[data-k=quota]').textContent`);
  await sleep(2000);
  const c2 = await ev(`document.querySelector('[data-k=clock]').textContent`);
  const p2 = await ev(`document.querySelector('[data-k=quota]').textContent`);
  check(c1 !== c2, `el reloj del turno corre (${c1} → ${c2})`);
  check(p1 !== p2, `la producción del día sube (${p1} → ${p2})`);

  const clicked = await ev(`(() => {
    const l = document.querySelector('.lamp'), r = l.getBoundingClientRect();
    const o = {bubbles:true, cancelable:true, clientX:r.left+r.width/2, clientY:r.top+r.height/2};
    l.dispatchEvent(new PointerEvent('pointerdown', o));
    return document.querySelectorAll('.float').length;
  })()`);
  check(clicked > 0, 'el click suelta número flotante');

  const surge = await ev(`(() => {
    const l = document.querySelector('.lamp'), r = l.getBoundingClientRect();
    const o = {bubbles:true, cancelable:true, clientX:r.left+r.width/2, clientY:r.top+r.height/2};
    for (let i=0;i<3;i++) l.dispatchEvent(new PointerEvent('pointerdown', o));
    return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => res({
      on: document.querySelector('.stack')?.classList.contains('on'),
      txt: document.querySelector('.stack')?.textContent,
      sparks: document.querySelectorAll('.fx-spark').length,
    }))));
  })()`);
  check(surge.on && surge.sparks > 0, `pulsar rápido encadena sobrecarga (${surge.txt})`);

  for (const t of ['luz', 'tienda', 'carrera', 'logros', 'mejoras']) {
    const n = await ev(`(() => { document.querySelector('[data-tab=${t}]').click();
      return document.querySelector('.panel-body').childElementCount; })()`);
    await sleep(200);
    check(n > 0, `la pestaña «${t}» renderiza (${n} bloques)`);
  }

  await send('Emulation.setDeviceMetricsOverride',
    { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(800);
  const mob = await ev(`({ over: document.body.scrollWidth > window.innerWidth + 1,
    panel: document.getElementById('panel').clientHeight,
    scene: document.getElementById('scene').clientHeight })`);
  check(!mob.over, 'en móvil no hay desbordamiento horizontal');
  check(mob.panel > 100 && mob.scene > 100, `en móvil escena y panel conviven (${mob.scene}px / ${mob.panel}px)`);

  check(errors.length === 0, `sin errores de consola${errors.length ? ': ' + errors[0].slice(0, 120) : ''}`);
} catch (e) {
  fail.push('la prueba reventó: ' + e.message);
  console.error('  ✘', e.message);
} finally {
  try { ws?.close(); } catch {}
  chrome.kill(); server.kill();
  console.log(fail.length ? `\n${fail.length} fallo(s)\n` : '\nTodo correcto\n');
  process.exitCode = fail.length ? 1 : 0;
}
