// node --test   (sin dependencias: usa el runner integrado de Node)
// FULGOR v2 «El operario»: el turno, la nómina, las facturas y las vidas.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  newState, step, click, stats, income, potential, startDay, endDay, resetLife,
  objectiveProgress, buyUpgrade, buyAutomation, buyBulb, repairSocket, upgradeSocket,
  upgradeAll, socketAction, buyForzado, buyConsumable, buySkill, skillCost,
  upgradeCost, consumableCost, checkAchievements,
} from '../src/engine/engine.js';
import { CORE, TIERS, RANKS, XP, forzadoCost } from '../src/engine/config.js';
import { fmt } from '../src/engine/format.js';

const fresh = () => newState();
const bulb = (s, i = 0) => s.sockets[i].bulb;
/** Ficha y deja los objetivos imposibles de cumplir sin querer (deterministas). */
function day(s) {
  startDay(s);
  s.shift.objectives = [
    { type: 'surges', target: 9999, met: false },
    { type: 'sweet', target: 9999, met: false },
  ];
  return s;
}

// ------------------------------------------------------------ el arranque
test('empiezas como Aprendiz, sin un euro y sin fichar', () => {
  const s = fresh();
  assert.equal(s.rank, 0);
  assert.equal(s.bank, 0);
  assert.equal(s.day, 0);
  assert.equal(s.shift, null);
  assert.equal(s.sockets.length, RANKS[0].sockets);
  assert.ok(bulb(s), 'la empresa presta la primera bombilla');
});

test('sin fichar, NADA se mueve: ni producción, ni clicks, ni desgaste', () => {
  const s = fresh();
  const before = JSON.stringify(s.sockets);
  step(s, 60);
  assert.equal(JSON.stringify(s.sockets), before, 'el mundo está parado');
  assert.equal(click(s, 0), null, 'no se puede trabajar sin fichar');
});

test('fichar arranca el reloj y reparte dos objetivos', () => {
  const s = fresh();
  const sh = startDay(s);
  assert.equal(s.day, 1);
  assert.ok(sh.active);
  assert.equal(sh.left, stats(s).shiftLen);
  assert.equal(sh.objectives.length, 2);
  assert.notEqual(sh.objectives[0].type, sh.objectives[1].type);
});

test('el reloj corre, y al llegar a cero suena la sirena', () => {
  const s = day(s0());
  function s0() { return fresh(); }
  const len = s.shift.left;
  step(s, 10);
  assert.ok(Math.abs(s.shift.left - (len - 10)) < 1e-9);
  step(s, len);
  assert.equal(s.shift.left, 0);
  assert.equal(s.shift.active, false, 'turno cerrado: ni un click más');
  assert.equal(click(s, 0), null);
  assert.ok(s.events.some((e) => e.type === 'shiftOver'));
});

// ------------------------------------------------------- las tres bandas
test('la producción del turno crece sola mientras la bombilla está encendida', () => {
  const s = day(fresh());
  step(s, 3);
  assert.ok(s.shift.produced > 0);
  assert.equal(s.bank, 0, 'pero tu banco ni se entera: eso es de la empresa');
});

test('las tres bandas del click: limpio, bueno y sobrecarga', () => {
  const s = day(fresh());
  bulb(s).charge = 0.2;
  assert.equal(click(s, 0).band, 'relight');
  assert.equal(bulb(s).wear, 0);
  bulb(s).charge = (CORE.sweetLo + CORE.surgeLo) / 2;
  assert.equal(click(s, 0).band, 'sweet');
  bulb(s).charge = 0.95;
  const r = click(s, 0);
  assert.equal(r.band, 'surge');
  assert.equal(bulb(s).surge, 1);
  assert.equal(s.shift.surges, 1);
});

test('sobrecargar multiplica la producción por (1 + stacks), hasta el tope', () => {
  const s = day(fresh());
  const cap = stats(s).surgeCap;
  const at = () => TIERS[0].base * stats(s).money;
  bulb(s).charge = 1; click(s, 0);
  assert.ok(Math.abs(income(s) - at() * 2) < 1e-9);
  for (let i = 0; i < cap + 2; i++) { bulb(s).charge = 1; bulb(s).wear = 0; click(s, 0); }
  assert.equal(bulb(s).surge, cap, 'no pasa del tope contratado');
});

test('encadenar sobrecargas rompe la bombilla y la empresa lo apunta', () => {
  const s = day(fresh());
  let broke = false;
  for (let i = 0; i < 40 && !broke; i++) {
    if (!bulb(s)) break;
    bulb(s).charge = 1;
    broke = click(s, 0).broke;
  }
  assert.ok(broke);
  assert.equal(bulb(s), null);
  assert.equal(s.sockets[0].broken, true);
  assert.equal(s.sockets[0].pending, TIERS[0].cost, 'la rotura queda anotada para la nómina');
  assert.equal(s.shift.breaks, 1);
});

test('si repones de tu bolsillo antes de fichar, la nómina no se entera', () => {
  const s = day(fresh());
  for (let i = 0; i < 40 && bulb(s); i++) { bulb(s).charge = 1; click(s, 0); }
  assert.ok(s.sockets[0].pending > 0);
  s.bank = 1000;
  assert.ok(repairSocket(s, 0));
  assert.equal(s.sockets[0].pending, 0, 'rotura resuelta: borrada del parte');
});

test('el fusible salva la bombilla y no apunta nada', () => {
  const s = day(fresh());
  s.bag.fusible = 1;
  for (let i = 0; i < 40 && s.bag.fusible > 0; i++) { bulb(s).charge = 1; click(s, 0); }
  assert.equal(s.bag.fusible, 0);
  assert.ok(bulb(s));
  assert.equal(s.sockets[0].pending, 0);
});

test('el repuesto repone gratis y limpia el parte', () => {
  const s = day(fresh());
  s.bag.repuesto = 1;
  for (let i = 0; i < 40 && !s.stats.breaks; i++) { bulb(s).charge = 1; click(s, 0); }
  assert.ok(bulb(s), 'repuesto colocado solo');
  assert.equal(s.sockets[0].pending, 0);
  assert.equal(s.bank, 0, 'y sin tocar el banco');
});

// ------------------------------------------------------------- la nómina
test('cuota cumplida = sueldo completo; a medias = a medias', () => {
  const s = day(fresh());
  s.shift.produced = s.quota;
  let r = endDay(s);
  assert.ok(Math.abs(r.base - RANKS[0].salary) < 1e-9, 'cuota al 100% → sueldo base entero');
  assert.ok(r.quotaMet);

  const s2 = day(fresh());
  s2.shift.produced = s2.quota * 0.5;
  r = endDay(s2);
  assert.ok(Math.abs(r.base - RANKS[0].salary * 0.5) < 1e-9);
  assert.equal(r.quotaMet, false);
});

test('el exceso sobre la cuota paga al 10%, con tope de un sueldo', () => {
  const s = day(fresh());
  s.shift.produced = s.quota + RANKS[0].salary * 5; // exceso modesto
  let r = endDay(s);
  assert.ok(Math.abs(r.excess - RANKS[0].salary * 0.5) < 1e-9);

  const s2 = day(fresh());
  s2.shift.produced = s2.quota * 1000; // exceso desorbitado
  r = endDay(s2);
  assert.ok(Math.abs(r.excess - RANKS[0].salary * CORE.excessCap) < 1e-9, 'la empresa no paga horas extra infinitas');
});

test('las roturas sin resolver se descuentan, con tope del 60% del bruto', () => {
  const s = day(fresh());
  s.shift.produced = s.quota;
  s.sockets[0].bulb = null;
  s.sockets[0].broken = true;
  s.sockets[0].pending = 10; // rotura barata
  let r = endDay(s);
  assert.ok(Math.abs(r.deduct - 10) < 1e-9);

  const s2 = day(fresh());
  s2.shift.produced = s2.quota;
  s2.sockets[0].bulb = null;
  s2.sockets[0].broken = true;
  s2.sockets[0].pending = 1e6; // día catastrófico
  r = endDay(s2);
  assert.ok(Math.abs(r.deduct - CORE.deductCap * r.base) < 1e-6, 'nunca más del 60% del bruto');
  assert.ok(r.nomina > 0, 'un día horrible paga poco, jamás negativo');
});

test('los objetivos cumplidos pagan prima', () => {
  const s = fresh();
  startDay(s);
  s.shift.objectives = [
    { type: 'surges', target: 1, met: false },
    { type: 'sweet', target: 9999, met: false },
  ];
  bulb(s).charge = 1; click(s, 0);         // una sobrecarga → primer objetivo ✓
  s.shift.produced = s.quota;
  const r = endDay(s);
  assert.equal(r.objectives.filter((o) => o.met).length, 1);
  assert.ok(Math.abs(r.primas - CORE.primaRate * RANKS[0].salary) < 1e-9);
});

// ------------------------------------------------------------ las facturas
test('la comida se cobra a diario y el alquiler cada 5 días', () => {
  const s = day(fresh());
  s.shift.produced = s.quota;
  let r = endDay(s);
  assert.ok(r.food > 0);
  assert.equal(r.rent, 0, 'día 1: aún no toca alquiler');

  const s2 = fresh();
  for (let d = 1; d <= CORE.rentEvery; d++) {
    day(s2);
    s2.shift.produced = s2.quota;
    r = endDay(s2);
  }
  assert.ok(r.rent > 0, `día ${CORE.rentEvery}: el Sr. Braulio pasa a cobrar`);
});

test('si no llegas a las facturas, naces deudor; la deuda cría intereses', () => {
  const s = day(fresh());
  s.shift.produced = 0; // día en blanco
  let r = endDay(s);
  assert.ok(s.debt > 0, 'la comida se debe');
  const before = s.debt;
  day(s);
  s.shift.produced = 0;
  r = endDay(s);
  assert.ok(r.interest > 0, 'el interés corre');
  assert.ok(s.debt > before);
});

test('con deuda no hay caprichos, pero la maquinaria sí se puede tocar', () => {
  const s = fresh();
  s.debt = 50;
  s.bank = 1e6;
  assert.equal(buyUpgrade(s, 'voltaje'), false, 'mejoras bloqueadas');
  assert.equal(buyConsumable(s, 'fusible'), false, 'economato bloqueado');
  assert.ok(upgradeSocket(s, 0), 'las bombillas son tu salida del hoyo');
});

test('la deuda se paga sola en cuanto entra nómina', () => {
  const s = fresh();
  s.debt = 10;
  day(s);
  s.shift.produced = s.quota;
  const r = endDay(s);
  assert.ok(r.repaid > 0);
  assert.ok(s.debt < 10 + r.interest);
});

test('deuda desbocada = calabozo', () => {
  const s = day(fresh());
  s.debt = CORE.jailDebt * RANKS[0].salary * CORE.rentRate * 3;
  s.shift.produced = 0;
  const r = endDay(s);
  assert.equal(r.fail, 'calabozo');
});

test('tres días seguidos bajo el 50% de la cuota = despido', () => {
  const s = fresh();
  let r;
  for (let d = 0; d < CORE.fireDays; d++) {
    day(s);
    s.shift.produced = 0;
    r = endDay(s);
  }
  assert.equal(r.fail, 'despido');
});

// -------------------------------------------------------------- la vida
test('el reset conserva lo que eres y borra lo que tienes', () => {
  const s = fresh();
  s.xp = 500;
  s.skills.callo = 2;
  s.achievements.push('first');
  s.bank = 9999;
  s.upgrades.voltaje = 10;
  s.rank = 3;
  s.day = 9;
  const { state: n, finiquito } = resetLife(s, 'despido');
  assert.ok(finiquito > 0, 'siempre hay finiquito, aunque sea triste');
  assert.equal(n.xp, 500 + finiquito);
  assert.equal(n.skills.callo, 2);
  assert.ok(n.achievements.includes('first'));
  assert.equal(n.bank, 0, 'el banco se queda en la otra vida');
  assert.equal(n.upgrades.voltaje, 0);
  assert.equal(n.rank, 0, 'sin Enchufe, de Aprendiz otra vez');
  assert.equal(n.stats.lives, 2);
  assert.equal(n.stats.despidos, 1);
});

test('dimitir paga mejor finiquito que el despido, y éste mejor que el calabozo', () => {
  const base = () => {
    const s = fresh();
    s.rank = 2; s.day = 9;
    return s;
  };
  const q = resetLife(base(), 'dimision').finiquito;
  const f = resetLife(base(), 'despido').finiquito;
  const j = resetLife(base(), 'calabozo').finiquito;
  assert.ok(q > f && f > j, `dimitir a tiempo es un arte (${q} > ${f} > ${j})`);
});

test('Enchufe y Colchón cambian cómo nace la vida siguiente', () => {
  const s = fresh();
  s.skills.enchufe = 2;
  s.skills.colchon = 1;
  const { state: n } = resetLife(s, 'dimision');
  assert.equal(n.rank, 2, 'empiezas de Oficial');
  assert.equal(n.sockets.length, RANKS[2].sockets, 'con los zócalos del rango');
  assert.equal(n.bank, RANKS[2].salary * 2, 'y con colchón');
});

// -------------------------------------------------------------- carrera
test('cumplir la cuota N días te asciende: más sueldo, más zócalos', () => {
  const s = fresh();
  let r;
  for (let d = 0; d < RANKS[0].promoteDays; d++) {
    day(s);
    s.shift.produced = s.quota * 2;
    r = endDay(s);
  }
  assert.equal(r.promotion, 1, 'ascendido a Peón');
  assert.equal(s.rank, 1);
  assert.equal(s.sockets.length, RANKS[1].sockets);
  assert.equal(s.sockets[1].bulb, null, 'el zócalo nuevo llega vacío');
  assert.ok(Math.abs(s.quota - RANKS[1].quota) < 1e-9, 'cuota nueva del rango');
});

test('la cuota aprieta al cumplir y afloja al fallar, con suelo', () => {
  const s = fresh();
  const q0 = s.quota;
  day(s); s.shift.produced = s.quota; endDay(s);
  assert.ok(s.quota > q0, 'cumplir sube la cuota');
  for (let d = 0; d < 20; d++) { day(s); s.shift.produced = 0; endDay(s); if (s.stats.despidos) break; }
  // (acabará despedido, pero la cuota nunca baja del suelo)
  assert.ok(s.quota >= RANKS[0].quota * CORE.quotaFloor - 1e-9);
});

test('la empresa no te deja tocar maquinaria por encima de tu rango', () => {
  const s = fresh();
  s.bank = 1e9;
  assert.ok(upgradeSocket(s, 0), 'subir a nivel 2 sí (tope de Aprendiz)');
  const a = socketAction(s, 0);
  assert.equal(a.kind, 'locked', 'nivel 3 requiere ascenso');
  assert.equal(upgradeSocket(s, 0), false);
  s.rank = 3;
  assert.ok(upgradeSocket(s, 0), 'con rango, la escalera sigue');
});

test('por la noche, mantenimiento deja la fábrica como nueva', () => {
  const s = day(fresh());
  for (let i = 0; i < 40 && bulb(s); i++) { bulb(s).charge = 1; click(s, 0); }
  assert.equal(bulb(s), null, 'rota al acabar el día');
  s.shift.produced = s.quota;
  endDay(s);
  assert.ok(bulb(s), 'mañana hay bombilla otra vez (ya descontada)');
  assert.equal(bulb(s).charge, 1);
  assert.equal(bulb(s).wear, 0);
  assert.equal(s.buffs.length, 0, 'los buffs no duermen en la fábrica');
});

// ---------------------------------------------------------- experiencia
test('trabajar da experiencia; cumplir y los objetivos dan más', () => {
  const s = day(fresh());
  s.shift.produced = s.quota;
  const r = endDay(s);
  assert.ok(Math.abs(r.xp - (XP.day + XP.quota)) < 1e-9, 'día + cuota, rango 1');
  assert.equal(s.xp, r.xp);
});

test('las habilidades se compran con XP y hacen lo que dicen', () => {
  const s = fresh();
  s.xp = 10000;
  const len0 = stats(s).shiftLen;
  assert.ok(buySkill(s, 'madrugador'));
  assert.equal(stats(s).shiftLen, len0 + 12, 'Madrugador alarga el turno');
  assert.ok(buySkill(s, 'ojoclinico'));
  assert.equal(stats(s).surgeCap, CORE.surgeCap + 1, 'Ojo clínico sube el tope');
  const bill0 = stats(s).billMult;
  assert.ok(buySkill(s, 'labia'));
  assert.ok(stats(s).billMult < bill0, 'Labia rebaja facturas');
  assert.ok(s.xp < 10000, 'y todo eso se ha pagado');
});

test('Callo laboral engorda la nómina', () => {
  const a = day(fresh());
  a.shift.produced = a.quota;
  const ra = endDay(a);
  const b = fresh();
  b.skills.callo = 5;
  day(b);
  b.shift.produced = b.quota;
  const rb = endDay(b);
  assert.ok(Math.abs(rb.nomina - ra.nomina * 1.5) < 1e-6);
});

// ------------------------------------------------------------- objetivos
test('objectiveProgress entiende los cuatro tipos', () => {
  const s = day(fresh());
  const sh = s.shift;
  sh.surges = 3; sh.sweets = 2; sh.breaks = 0;
  assert.equal(objectiveProgress(s, { type: 'surges', target: 3 }).ok, true);
  assert.equal(objectiveProgress(s, { type: 'sweet', target: 5 }).ok, false);
  assert.equal(objectiveProgress(s, { type: 'roturas', target: 1 }).ok, true);
  bulb(s).charge = 0.9;
  assert.equal(objectiveProgress(s, { type: 'final', target: 0.3 }).ok, true);
  bulb(s).charge = 0.1;
  assert.equal(objectiveProgress(s, { type: 'final', target: 0.3 }).ok, false);
});

// -------------------------------------------------------------- economía
test('los precios del economato suben con tu categoría', () => {
  const s = fresh();
  const cheap = consumableCost(s, 'fusible');
  s.rank = 4;
  assert.ok(consumableCost(s, 'fusible') > cheap * 20, 'el economato es un ladino');
});

test('mejoras: coste escalado, tope de la Jornada y descuento real', () => {
  const s = fresh();
  s.bank = 1e9;
  assert.ok(buyUpgrade(s, 'voltaje'));
  assert.ok(s.bank < 1e9);
  for (let i = 0; i < 30; i++) buyUpgrade(s, 'jornada');
  assert.equal(s.upgrades.jornada, 20, 'la Jornada tiene tope');
});

// ---------------------------------------------------- jornada y propina
test('la Jornada alarga el turno y escala sueldo y cuota en proporción', () => {
  const s = fresh();
  s.bank = 1e9;
  buyUpgrade(s, 'jornada');            // +6 s sobre 30 → x1.2
  const st = stats(s);
  assert.equal(st.shiftLen, CORE.shift + 6);
  assert.ok(Math.abs(st.jornadaMult - (CORE.shift + 6) / CORE.shift) < 1e-9);
  startDay(s);
  assert.ok(Math.abs(s.shift.salary - RANKS[0].salary * st.jornadaMult) < 1e-9, 'sueldo del día escalado');
  assert.ok(Math.abs(s.shift.quota - s.quota * st.jornadaMult) < 1e-9, 'cuota del día escalada');
});

test('el sueldo y la cuota del día se congelan al fichar', () => {
  const s = fresh();
  s.bank = 1e9;
  day(s);
  const antes = s.shift.salary;
  buyUpgrade(s, 'jornada');            // comprada a media mañana
  assert.equal(s.shift.salary, antes, 'hoy no cambia nada: cuenta desde mañana');
});

test('superar la cuota deja propina directa en el banco', () => {
  const s = day(fresh());
  s.shift.produced = s.shift.quota;    // justo la cuota
  const r = endDay(s);
  assert.ok(Math.abs(r.tip - CORE.tipBase * RANKS[0].salary) < 1e-9, '10% del sueldo del día');
  // la propina no pasa por deducciones ni por el Callo: es bruta y tuya
  assert.ok(Math.abs(s.bank - (r.nomina + r.tip - r.food)) < 1e-9);
});

test('sin cumplir la cuota no hay propina', () => {
  const s = day(fresh());
  s.shift.produced = s.shift.quota * 0.9;
  assert.equal(endDay(s).tip, 0);
});

test('el Bote de propinas sube el porcentaje', () => {
  const s = fresh();
  s.bank = 1e9;
  buyUpgrade(s, 'bote');
  buyUpgrade(s, 'bote');
  assert.ok(Math.abs(stats(s).tipRate - (CORE.tipBase + 2 * CORE.tipPer)) < 1e-9);
  day(s);
  s.shift.produced = s.shift.quota;
  const r = endDay(s);
  assert.ok(Math.abs(r.tip - (CORE.tipBase + 2 * CORE.tipPer) * s.shift.salary) < 1e-6);
});

// ------------------------------------------------- el cierre no se pierde
test('fichar la salida dos veces no paga dos veces', () => {
  const s = day(fresh());
  s.shift.produced = s.shift.quota;
  const r1 = endDay(s);
  const bank = s.bank;
  const r2 = endDay(s);
  assert.equal(r2, r1, 'la segunda vez devuelve el mismo parte');
  assert.equal(s.bank, bank, 'y no vuelve a ingresar nada');
});

test('no se puede fichar la entrada con un día terminado sin pagar', () => {
  // Es el bug que atascó al owner: el turno acabó, el cierre se perdió, y el
  // juego quedó colgado. Ahora el estado lo impide y endDay() lo repara.
  const s = day(fresh());
  step(s, 9999);                        // la sirena suena, turno inactivo
  assert.equal(s.shift.active, false);
  assert.equal(s.shift.closed, undefined, 'terminado pero SIN pagar');
  assert.equal(startDay(s), null, 'no se salta la nómina de ayer');
  const r = endDay(s);                  // el vigilante haría exactamente esto
  assert.ok(r, 'el día pendiente se paga');
  assert.ok(startDay(s), 'y entonces sí, al día siguiente');
  assert.equal(s.day, 2);
});

test('el forzado sube producción a costa de apagarse y desgastar más', () => {
  const s = day(fresh());
  const before = potential(s);
  s.bank = 1e9;
  assert.ok(buyForzado(s, 0));
  assert.ok(Math.abs(potential(s) - before * CORE.forzadoOut) < 1e-6);
});

// ----------------------------------------------------------- automatismos
test('la Chispa trabaja sola durante el turno y nunca arriesga', () => {
  const s = day(fresh());
  s.auto.chispa = 12;
  for (let i = 0; i < 100; i++) step(s, 0.5);
  assert.ok(s.stats.clicks > 0, 'la Chispa ha currado');
  assert.equal(s.stats.surges, 0, 'sin Condensador, ni una sobrecarga');
});

test('el técnico repone en turno pagando de tu banco', () => {
  const s = day(fresh());
  s.auto.tecnico = 5;
  s.bank = 1000;
  for (let i = 0; i < 40 && bulb(s); i++) { bulb(s).charge = 1; click(s, 0); }
  step(s, 5);
  assert.ok(bulb(s), 'el técnico ha pasado');
  assert.ok(s.bank < 1000, 'y ha pasado factura');
  assert.equal(s.sockets[0].pending, 0, 'la nómina queda limpia');
});

// -------------------------------------------------------------- logros
test('los logros laborales se desbloquean y no se duplican', () => {
  const s = day(fresh());
  s.shift.produced = s.quota;
  endDay(s);
  assert.ok(s.achievements.includes('day1'), 'primer día sobrevivido');
  checkAchievements(s);
  assert.equal(new Set(s.achievements).size, s.achievements.length);
});

// -------------------------------------------------------------- formato
test('los números grandes se formatean de forma legible', () => {
  assert.equal(fmt(999), '999');
  assert.equal(fmt(1234567), '1.23M');
  assert.equal(fmt(-2500), '-2.50K');
});

// --------------------------------------------------------- integración
test('tres días completos de un jugador decente: sin NaN y con vida digna', () => {
  const s = fresh();
  for (let d = 0; d < 3; d++) {
    day(s);
    while (s.shift.active) {
      step(s, 0.1);
      const b = bulb(s);
      if (b && b.charge <= CORE.sweetLo + 0.05 && b.charge > 0.1) click(s, 0);
    }
    const r = endDay(s);
    assert.ok(Number.isFinite(r.nomina) && r.nomina >= 0);
    assert.ok(Number.isFinite(s.bank) && s.bank >= 0);
  }
  assert.equal(s.day, 3);
  assert.equal(s.stats.daysWorked, 3);
  assert.equal(s.stats.despidos, 0, 'jugando normal no te despiden');
});

// ------------------------------------------------- el balance del arranque
test('BALANCE: la cuota del día 1 se cumple jugando activo, no mirando', () => {
  // pasivo: no debe llegar
  const idle = fresh();
  day(idle);
  while (idle.shift.active) step(idle, 0.1);
  const rIdle = endDay(idle);
  assert.ok(rIdle.ratio < 1, `mirar las musarañas no paga (${(rIdle.ratio * 100).toFixed(0)}%)`);

  // activo (banda buena): debe llegar
  const good = fresh();
  day(good);
  while (good.shift.active) {
    step(good, 0.1);
    const b = bulb(good);
    if (b && b.charge <= CORE.sweetLo + 0.05) click(good, 0);
  }
  const rGood = endDay(good);
  assert.ok(rGood.ratio >= 1, `jugando bien la cuota sale (${(rGood.ratio * 100).toFixed(0)}%)`);
});
