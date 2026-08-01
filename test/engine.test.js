// node --test   (sin dependencias: usa el runner integrado de Node)
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  newState, newBulb, step, click, stats, income, potential,
  buyUpgrade, buySocket, buyBulb, repairSocket, upgradeSocket, upgradeAll,
  socketAction, buyForzado, buyConsumable, buyPrestige,
  doPrestige, canPrestige, pendingSparks, applyOffline, upgradeCost, consumableCost,
} from '../src/engine/engine.js';
import { CORE, TIERS, socketCost, sparksFor } from '../src/engine/config.js';
import { fmt } from '../src/engine/format.js';

const fresh = () => newState();
const bulb = (s, i = 0) => s.sockets[i].bulb;

test('la partida arranca con un zócalo encendido y sin dinero', () => {
  const s = fresh();
  assert.equal(s.sockets.length, 1);
  assert.equal(s.sockets[0].tier, 0, 'se empieza en el peldaño más bajo');
  assert.equal(s.money, 0, 'y sin un euro');
  assert.ok(income(s) > 0, 'una bombilla encendida debe producir');
});

test('la carga decae y el ingreso baja con ella', () => {
  const s = fresh();
  const full = income(s);
  step(s, 5);
  assert.ok(bulb(s).charge < 1, 'la bombilla debe haberse apagado un poco');
  assert.ok(income(s) < full, 'menos carga, menos ingreso');
  assert.ok(s.money > 0, 'debe haber ganado dinero durante el tick');
});

test('una bombilla apagada NO produce: si las dejas morir, dejas de cobrar', () => {
  const s = fresh();
  step(s, 600);
  assert.equal(bulb(s).charge, 0);
  assert.equal(income(s), 0, 'sin luz no hay dinero — es la regla que sostiene el juego');
  const antes = s.money;
  step(s, 60);
  assert.equal(s.money, antes, 'y quieto no se gana nada con el tiempo');
});

test('sin tocar nada durante dos minutos no se hace uno rico', () => {
  const s = fresh();
  for (let i = 0; i < 3600; i++) step(s, 1 / 30);   // 120 s
  assert.ok(s.money < 15, `dejarlo solo debe rendir poco (rindió ${s.money.toFixed(1)} €)`);
});

// ------------------------------------------------------- las tres bandas
test('click con la bombilla apagada: reencendido limpio, sin desgaste', () => {
  const s = fresh();
  bulb(s).charge = 0.2;
  const r = click(s, 0);
  assert.equal(r.band, 'relight');
  assert.equal(bulb(s).charge, 1);
  assert.equal(bulb(s).wear, 0);
  assert.equal(bulb(s).surge, 0);
});

test('click en la banda buena: bonus y desgaste mínimo', () => {
  const s = fresh();
  bulb(s).charge = (CORE.sweetLo + CORE.surgeLo) / 2;
  const r = click(s, 0);
  assert.equal(r.band, 'sweet');
  assert.ok(bulb(s).wear > 0 && bulb(s).wear < CORE.wearBase);
});

test('click por encima del umbral: sobrecarga, x2 y desgaste real', () => {
  const s = fresh();
  bulb(s).charge = 0.95;
  const r = click(s, 0);
  assert.equal(r.band, 'surge');
  assert.equal(r.stacks, 1);
  assert.equal(bulb(s).surge, 1);
  assert.ok(bulb(s).surgeT > 0);
  assert.ok(Math.abs(bulb(s).wear - CORE.wearBase) < 1e-9);
  assert.equal(s.stats.surges, 1);
});

test('sobrecargar multiplica el ingreso por (1 + stacks)', () => {
  const s = fresh();
  // Nota: cada click puede desbloquear logros, que cambian el multiplicador
  // global. Por eso el esperado se calcula con stats() de después del click.
  const at = () => TIERS[0].base * stats(s).money;
  bulb(s).charge = 1;
  click(s, 0);           // stack 1 -> x2
  assert.equal(bulb(s).surge, 1);
  assert.ok(Math.abs(income(s) - at() * 2) < 1e-9);
  bulb(s).charge = 1;
  click(s, 0);           // stack 2 -> x3
  assert.equal(bulb(s).surge, 2);
  assert.ok(Math.abs(income(s) - at() * 3) < 1e-9);
});

test('los stacks se acumulan hasta el tope y el desgaste escala con el stack', () => {
  const s = fresh();
  const cap = stats(s).surgeCap;
  const wears = [];
  for (let n = 0; n < cap; n++) {
    bulb(s).charge = 1;
    bulb(s).wear = 0; // aislamos el coste de cada stack
    click(s, 0);
    assert.ok(bulb(s), 'con el desgaste reseteado no debería romperse aún');
    wears.push(bulb(s).wear);
  }
  assert.equal(bulb(s).surge, cap, 'debe haber llegado al tope de stacks');
  for (let i = 1; i < wears.length; i++) {
    assert.ok(wears[i] > wears[i - 1], 'cada stack debe quemar más que el anterior');
  }
  // Una vez en el tope, seguir pulsando no da más stacks.
  bulb(s).charge = 1;
  bulb(s).wear = 0;
  click(s, 0);
  assert.equal(bulb(s).surge, cap);
});

test('encadenar sobrecargas acaba rompiendo la bombilla', () => {
  const s = fresh();
  let broke = false;
  for (let i = 0; i < 40 && !broke; i++) {
    if (!bulb(s)) break;
    bulb(s).charge = 1;
    const r = click(s, 0);
    broke = r.broke;
  }
  assert.ok(broke, 'pulsando siempre en la banda de riesgo debe romperse');
  assert.equal(bulb(s), null);
  assert.equal(s.stats.breaks, 1);
  assert.equal(s.sockets[0].broken, true, 'el zócalo queda marcado como reventado');

  // Y al reponer, deja de estarlo (si no, los cristales se quedan para siempre).
  s.money = 1e6;
  assert.ok(repairSocket(s, 0));
  assert.equal(s.sockets[0].broken, false);
});

test('reencender siempre en banda segura nunca rompe', () => {
  const s = fresh();
  for (let i = 0; i < 500; i++) {
    bulb(s).charge = 0.1;
    click(s, 0);
  }
  assert.ok(bulb(s), 'jugar seguro no debe destruir nada');
  assert.equal(s.stats.breaks, 0);
});

test('el desgaste se enfría con el tiempo, pero no durante la sobrecarga', () => {
  const s = fresh();
  bulb(s).charge = 1;
  click(s, 0);
  const hot = bulb(s).wear;
  step(s, 0.5); // dentro del coolDelay y en sobrecarga
  assert.equal(bulb(s).wear, hot, 'no debe enfriar mientras sobrecarga');
  step(s, 30);
  assert.equal(bulb(s).wear, 0, 'con tiempo suficiente vuelve a cero');
});

test('el fusible se gasta y salva la bombilla en vez de romperla', () => {
  const s = fresh();
  s.bag.fusible = 1;
  // Pulsamos en zona de riesgo hasta que el fusible salte.
  for (let i = 0; i < 40 && s.bag.fusible > 0; i++) {
    bulb(s).charge = 1;
    click(s, 0);
  }
  assert.equal(s.bag.fusible, 0, 'el fusible debe haberse consumido');
  assert.ok(bulb(s), 'la bombilla debe seguir en su sitio');
  assert.equal(s.stats.breaks, 0, 'con fusible no cuenta como rotura');
  assert.equal(bulb(s).wear, 0, 'y queda fría, no al borde');
});

test('un repuesto repone la bombilla sola y gratis al romperse', () => {
  const s = fresh();
  s.bag.repuesto = 1;
  const before = s.money;
  for (let i = 0; i < 40; i++) {
    if (s.stats.breaks) break;
    bulb(s).charge = 1;
    click(s, 0);
  }
  assert.equal(s.stats.breaks, 1);
  assert.ok(bulb(s), 'el repuesto debe haber ocupado el zócalo');
  assert.equal(s.bag.repuesto, 0);
  assert.ok(s.money >= before, 'reponer con repuesto no cuesta dinero');
});

// ------------------------------------------------------------- economía
test('los costes escalan y el dinero se descuenta de verdad', () => {
  const s = fresh();
  const c0 = upgradeCost({ base: 25, growth: 1.17 }, 0);
  s.money = c0;
  assert.ok(buyUpgrade(s, 'voltaje'));
  assert.equal(s.upgrades.voltaje, 1);
  assert.ok(Math.abs(s.money) < 1e-9);
  assert.equal(buyUpgrade(s, 'voltaje'), false, 'sin dinero no se compra');
  assert.equal(s.upgrades.voltaje, 1);
});

test('voltaje sube el dinero por segundo', () => {
  const s = fresh();
  const before = income(s);
  s.money = 1e9;
  buyUpgrade(s, 'voltaje');
  assert.ok(income(s) > before);
});

test('filamento ralentiza el apagado', () => {
  const a = fresh(), b = fresh();
  b.money = 1e9;
  for (let i = 0; i < 10; i++) buyUpgrade(b, 'filamento');
  step(a, 5); step(b, 5);
  assert.ok(bulb(b).charge > bulb(a).charge, 'con filamento debe aguantar más');
});

test('comprar zócalos cuesta lo que dice la curva y añade producción', () => {
  const s = fresh();
  s.money = socketCost(1);
  assert.ok(buySocket(s));
  assert.equal(s.sockets.length, 2);
  assert.equal(s.sockets[1].bulb, null, 'el zócalo nuevo llega vacío');
  s.money = TIERS[0].cost + 10;
  assert.ok(repairSocket(s, 1));
  assert.ok(s.sockets[1].bulb);
});

test('no se puede pasar del máximo de zócalos', () => {
  const s = fresh();
  s.money = Infinity;
  while (s.sockets.length < CORE.maxSockets) assert.ok(buySocket(s));
  assert.equal(buySocket(s), false);
  assert.equal(s.sockets.length, CORE.maxSockets);
});

// ------------------------------------------------------- la escalera
test('la escalera sube de uno en uno, por mucho dinero que tengas', () => {
  const s = fresh();
  s.money = 1e12;                       // dinero de sobra para el nivel máximo
  assert.equal(s.sockets[0].tier, 0);
  assert.ok(upgradeSocket(s, 0));
  assert.equal(s.sockets[0].tier, 1, 'debe subir exactamente un peldaño');
  assert.ok(upgradeSocket(s, 0));
  assert.equal(s.sockets[0].tier, 2, 'y otro, nunca un salto');
});

test('cada peldaño cuesta lo que dice su nivel y nunca se degrada', () => {
  const s = fresh();
  s.money = TIERS[1].cost;
  assert.ok(upgradeSocket(s, 0));
  assert.ok(Math.abs(s.money) < 1e-9, 'se cobra el precio del nivel siguiente');
  assert.equal(upgradeSocket(s, 0), false, 'sin dinero no se sube');
  assert.equal(s.sockets[0].tier, 1);
});

test('subir de nivel da más dinero y más tiempo encendida', () => {
  const s = fresh();
  const base = potential(s);
  const a = fresh(); step(a, 4);
  s.money = 1e12;
  upgradeSocket(s, 0);
  assert.ok(potential(s) > base, 'más producción');
  step(s, 4);
  assert.ok(bulb(s).charge > bulb(a).charge, 'y aguanta más encendida');
});

test('no se puede subir por encima del último peldaño', () => {
  const s = fresh();
  s.money = 1e14;
  while (s.sockets[0].tier < TIERS.length - 1) assert.ok(upgradeSocket(s, 0));
  assert.equal(upgradeSocket(s, 0), false);
  assert.equal(socketAction(s, 0).kind, 'max');
});

test('al romperse conservas el nivel: repones una igual, no vuelves al principio', () => {
  const s = fresh();
  s.money = 1e12;
  upgradeSocket(s, 0); upgradeSocket(s, 0);   // nivel 2 (Fluorescente)
  assert.equal(s.sockets[0].tier, 2);
  for (let i = 0; i < 40 && !s.stats.breaks; i++) { bulb(s).charge = 1; click(s, 0); }
  assert.equal(s.stats.breaks, 1);
  assert.equal(s.sockets[0].tier, 2, 'el zócalo mantiene su nivel tras reventar');

  const a = socketAction(s, 0);
  assert.equal(a.kind, 'repair');
  assert.equal(a.cost, TIERS[2].cost, 'reponer cuesta lo que vale ESE nivel');
  assert.ok(repairSocket(s, 0));
  assert.equal(s.sockets[0].tier, 2);
});

test('romper una bombilla barata no regala la mejor de la partida', () => {
  const s = fresh();
  s.money = 1e12;
  upgradeSocket(s, 0);                        // zócalo 0 sube a nivel 1
  for (let i = 0; i < 6; i++) upgradeSocket(s, 0);
  const alto = s.sockets[0].tier;
  buySocket(s);                               // zócalo 1, nivel 0
  repairSocket(s, 1);
  assert.equal(s.sockets[1].tier, 0);
  s.auto.tecnico = 5;                         // que lo reponga el técnico
  for (let i = 0; i < 40 && s.sockets[1].bulb; i++) { s.sockets[1].bulb.charge = 1; click(s, 1); }
  step(s, 20);
  assert.equal(s.sockets[1].tier, 0, `debe seguir en nivel 0, no saltar a ${alto}`);
});

test('un zócalo nuevo llega vacío y en el peldaño más bajo', () => {
  const s = fresh();
  s.money = 1e12;
  for (let i = 0; i < 5; i++) upgradeSocket(s, 0);
  assert.ok(buySocket(s));
  assert.equal(s.sockets[1].tier, 0, 'no hereda tu mejor nivel');
  assert.equal(s.sockets[1].bulb, null);
});

test('«mejorar todas» sube un peldaño a cada zócalo que puedas pagar', () => {
  const s = fresh();
  s.money = 1e12;
  buySocket(s); repairSocket(s, 1);
  buySocket(s); repairSocket(s, 2);
  const n = upgradeAll(s);
  assert.equal(n, 3);
  assert.deepEqual(s.sockets.map((sk) => sk.tier), [1, 1, 1]);
});

test('el forzado sube producción y también apagado y desgaste', () => {
  const s = fresh();
  const before = potential(s);
  s.money = 1e9;
  assert.ok(buyForzado(s, 0));
  assert.ok(Math.abs(potential(s) - before * CORE.forzadoOut) < 1e-6);

  const plain = fresh();
  step(plain, 5); step(s, 5);
  assert.ok(bulb(s).charge < bulb(plain).charge, 'forzada se apaga antes');
});

test('el precio de los consumibles escala con tu mejor bombilla', () => {
  const s = fresh();
  const cheap = consumableCost(s, 'fusible');
  s.stats.maxTier = 5;
  assert.ok(consumableCost(s, 'fusible') > cheap * 100);
});

test('el refrigerante pone el desgaste a cero en todas', () => {
  const s = fresh();
  bulb(s).charge = 1; click(s, 0);
  assert.ok(bulb(s).wear > 0);
  s.money = consumableCost(s, 'refrigerante');
  assert.ok(buyConsumable(s, 'refrigerante'));
  assert.equal(bulb(s).wear, 0);
});

test('la sobretensión multiplica el dinero mientras dura y luego caduca', () => {
  const s = fresh();
  const before = income(s);
  s.money = consumableCost(s, 'sobretension');
  assert.ok(buyConsumable(s, 'sobretension'));
  assert.ok(Math.abs(income(s) - before * 3) < 1e-6);
  step(s, 31);
  assert.equal(s.buffs.length, 0, 'el buff debe caducar');
});

test('el estabilizador anula el desgaste mientras está activo', () => {
  const s = fresh();
  s.money = consumableCost(s, 'estabilizador');
  buyConsumable(s, 'estabilizador');
  for (let i = 0; i < 50; i++) { bulb(s).charge = 1; click(s, 0); }
  assert.ok(bulb(s), 'con estabilizador no se puede romper');
  assert.equal(bulb(s).wear, 0);
});

// ---------------------------------------------------------- automatismos
test('la Chispa reenciende sola la bombilla más apagada', () => {
  const s = fresh();
  s.auto.chispa = 1;                // dispara cada 5/(1+0.45) ≈ 3.45 s
  bulb(s).charge = 0.1;
  assert.equal(s.stats.clicks, 0);
  step(s, 1);
  assert.equal(s.stats.clicks, 0, 'todavía no le toca');
  step(s, 3);                       // pasado el intervalo, debe haber disparado
  assert.ok(s.stats.clicks > 0, 'la Chispa debe haber pulsado sola');
  assert.ok(bulb(s).charge > 0.9, 'y haberla dejado encendida');
});

test('la Chispa elige la bombilla más apagada, no una cualquiera', () => {
  const s = fresh();
  s.money = 1e9;
  buySocket(s); repairSocket(s, 1);
  s.auto.chispa = 1;
  s.sockets[0].bulb.charge = 0.9;
  s.sockets[1].bulb.charge = 0.15;  // ésta es la que pide auxilio
  step(s, 4);
  assert.ok(s.sockets[1].bulb.charge > 0.9, 'debe atender a la más apagada');
});

test('sin Condensador la Chispa nunca sobrecarga', () => {
  const s = fresh();
  s.auto.chispa = 12;
  for (let i = 0; i < 200; i++) step(s, 0.5);
  assert.equal(s.stats.surges, 0, 'la automatización segura no debe arriesgar');
  assert.equal(s.stats.breaks, 0);
  assert.ok(bulb(s));
});

test('con Condensador la Chispa sí sobrecarga, hasta su tope', () => {
  const s = fresh();
  s.auto.chispa = 12;
  s.auto.condensador = 1;
  s.upgrades.aislamiento = 60; // que no rompa, sólo miramos los stacks
  for (let i = 0; i < 200; i++) step(s, 0.5);
  assert.ok(s.stats.surges > 0, 'debe atreverse a sobrecargar');
  assert.ok(s.stats.maxStack <= 1, 'pero no más allá de lo contratado');
});

// -------------------------------------------------------------- offline
test('sin mejoras de offline no se cobra nada por estar fuera', () => {
  const s = fresh();
  const r = applyOffline(s, 3600);
  assert.equal(r.money, 0);
  assert.equal(bulb(s).charge, 0, 'pero la bombilla sí se apaga');
});

test('con Espejo se cobra algo, y está topado por horas', () => {
  const s = fresh();
  s.money = 1e12;
  for (let i = 0; i < 10; i++) buyUpgrade(s, 'espejo');
  const short = applyOffline(fresh0(s), 3600);
  const long = applyOffline(fresh0(s), 100 * 3600);
  assert.ok(short.money > 0);
  assert.equal(long.seconds, CORE.offlineCapH * 3600, 'debe topar en el máximo');
  assert.ok(long.money > short.money);

  function fresh0(src) {
    const c = JSON.parse(JSON.stringify(src));
    c.events = [];
    return c;
  }
});

// ------------------------------------------------------------ prestigio
test('el Apagón está bloqueado hasta llegar al umbral', () => {
  const s = fresh();
  assert.equal(canPrestige(s), false);
  assert.equal(pendingSparks(s), 0);
  assert.equal(doPrestige(s), null);
  s.runEarned = CORE.prestigeAt;
  assert.ok(canPrestige(s));
  assert.ok(pendingSparks(s) > 0);
});

test('las chispas crecen de forma útil, no plana', () => {
  // lightkeeper usaba raíz cúbica y se estancaba; aquí x1000 de dinero debe notarse.
  const a = sparksFor(1e6), b = sparksFor(1e9);
  assert.ok(a > 0);
  assert.ok(b / a > 30, `x1000 de dinero debe dar bastantes más chispas (dio x${(b / a).toFixed(1)})`);
});

test('el Apagón resetea la partida pero conserva chispas, logros y estadísticas', () => {
  const s = fresh();
  s.money = 1e9;
  buyUpgrade(s, 'voltaje');
  buySocket(s);
  s.runEarned = 1e8;
  s.stats.lifeEarned = 5e8;
  s.achievements.push('first');

  const { state: n, gained } = doPrestige(s);
  assert.ok(gained > 0);
  assert.equal(n.sparks, gained);
  assert.equal(n.upgrades.voltaje, 0, 'las mejoras de € se pierden');
  assert.equal(n.runEarned, 0);
  assert.equal(n.sockets.length, 1, 'vuelves a un zócalo');
  assert.ok(n.achievements.includes('first'), 'los logros se conservan');
  assert.equal(n.stats.lifeEarned, 5e8, 'el total histórico se conserva');
  assert.equal(n.stats.prestiges, 1);
});

test('las mejoras de prestigio cambian el arranque de la siguiente partida', () => {
  const s = fresh();
  s.sparks = 1e6;
  buyPrestige(s, 'genesis');
  buyPrestige(s, 'herencia');
  buyPrestige(s, 'memoria');
  s.runEarned = 1e7;
  const { state: n } = doPrestige(s);
  assert.equal(n.sockets.length, 2, 'Génesis da un zócalo extra');
  assert.equal(n.sockets[0].tier, 1, 'Herencia arranca con mejor bombilla');
  assert.ok(n.money > 0, 'Memoria da dinero inicial');
});

test('Núcleo multiplica el dinero para siempre', () => {
  const a = fresh(), b = fresh();
  b.sparks = 1000;
  buyPrestige(b, 'nucleo');
  assert.ok(income(b) > income(a));
});

test('Avaricia sube el tope de stacks', () => {
  const s = fresh();
  assert.equal(stats(s).surgeCap, CORE.surgeCap);
  s.sparks = 1e6;
  buyPrestige(s, 'avaricia');
  assert.equal(stats(s).surgeCap, CORE.surgeCap + 1);
});

// --------------------------------------------------------------- logros
test('los logros se desbloquean solos y suman multiplicador', () => {
  const s = fresh();
  const before = stats(s).achMult;
  bulb(s).charge = 0.1;
  click(s, 0);
  assert.ok(s.achievements.includes('first'));
  assert.ok(stats(s).achMult > before, 'un logro debe subir el multiplicador global');
});

test('ningún logro se concede dos veces', () => {
  const s = fresh();
  for (let i = 0; i < 200; i++) { bulb(s).charge = 0.1; click(s, 0); }
  assert.equal(new Set(s.achievements).size, s.achievements.length);
});

// -------------------------------------------------------------- formato
test('los números grandes se formatean de forma legible', () => {
  assert.equal(fmt(0), '0');
  assert.equal(fmt(999), '999');
  assert.equal(fmt(1000), '1.00K');
  assert.equal(fmt(1234567), '1.23M');
  assert.equal(fmt(1e9), '1.00B');
  assert.equal(fmt(1e12), '1.00T');
  assert.ok(fmt(1e100).includes('e'), 'lo absurdo cae a notación científica');
  assert.equal(fmt(-2500), '-2.50K');
});

// --------------------------------------------------------- integración
test('una partida larga automatizada no rompe ni produce NaN', () => {
  const s = fresh();
  s.money = 1e6;
  buySocket(s); repairSocket(s, 1);
  s.auto.chispa = 6;
  s.auto.tecnico = 3;
  for (let i = 0; i < 5000; i++) {
    step(s, 0.1);
    if (i % 37 === 0) { const b = bulb(s); if (b) { b.charge = 1; click(s, 0); } }
  }
  assert.ok(Number.isFinite(s.money) && s.money > 0, 'el dinero debe ser un número real');
  assert.ok(Number.isFinite(income(s)));
  for (const sk of s.sockets) {
    if (!sk.bulb) continue;
    assert.ok(sk.bulb.charge >= 0 && sk.bulb.charge <= 1, 'la carga debe quedarse en [0,1]');
    assert.ok(sk.bulb.wear >= 0);
  }
});
