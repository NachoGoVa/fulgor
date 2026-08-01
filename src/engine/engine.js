// Simulación pura de FULGOR v2 «El operario». Sin DOM, sin timers.
// Todo lo que muta el estado vive aquí, para poder probarlo con `node --test`.
//
// La regla de oro del rediseño: LO QUE PRODUCES NO ES TUYO. La producción va a
// la cuenta de la empresa y se compara con la cuota; tú cobras nómina al fichar
// la salida, y de tu banco salen facturas, maquinaria y caprichos.

import {
  TIERS, CORE, RANKS, UPGRADES, AUTOMATION, CONSUMABLES, SKILLS, XP,
  OBJECTIVE_TYPES, ACHIEVEMENTS, forzadoCost, consumablePrice,
} from './config.js';

const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
export const UPG = byId(UPGRADES);
export const AUT = byId(AUTOMATION);
export const CON = byId(CONSUMABLES);
export const SKL = byId(SKILLS);
const ACH = byId(ACHIEVEMENTS);

/** Multiplicador de logros, cacheado (stats() corre varias veces por frame). */
function achMult(s) {
  if (s._achN !== s.achievements.length) {
    s._achN = s.achievements.length;
    let m = 1;
    for (const id of s.achievements) if (ACH[id]) m += ACH[id].mult / 100;
    s._achM = m;
  }
  return s._achM;
}

// ----------------------------------------------------------------- estado
export function newBulb() {
  return { charge: 1, wear: 0, surge: 0, surgeT: 0, since: 99 };
}

// pending = coste de la rotura aún sin resolver: si repones tú (o el técnico,
// o un repuesto) se limpia; si llega al final del día, se descuenta de la nómina.
export const newSocket = (tier = 0, withBulb = true) =>
  ({ tier, forzado: 0, respawn: 0, broken: false, pending: 0, bulb: withBulb ? newBulb() : null });

const zeroed = (list) => Object.fromEntries(list.map((x) => [x.id, 0]));

/**
 * Estado inicial de una VIDA laboral. `meta` es lo que sobrevive de la anterior:
 * experiencia, habilidades, logros y estadísticas. Lo demás se pierde.
 */
export function newState(meta = {}) {
  const skills = { ...zeroed(SKILLS), ...(meta.skills || {}) };
  const rank = Math.min(RANKS.length - 1, skills.enchufe || 0);
  const R = RANKS[rank];
  return {
    // tu vida
    bank: skills.colchon ? RANKS[rank].salary * 2 * skills.colchon : 0,
    debt: 0,
    rank,
    day: 0,             // días de ESTA vida; startDay lo sube a 1
    quota: R.quota,
    metDays: 0,         // días con cuota cumplida en el rango actual (ascenso)
    fireStreak: 0,      // días seguidos por debajo del 50% (despido)
    shift: null,        // el turno en curso, o null entre días
    // la fábrica te presta el kit de bienvenida: todas las bocas con bombilla básica
    sockets: Array.from({ length: R.sockets }, () => newSocket(0)),
    upgrades: zeroed(UPGRADES),
    auto: zeroed(AUTOMATION),
    bag: zeroed(CONSUMABLES),
    buffs: [],
    autoT: 0,
    // lo que nadie te quita
    xp: meta.xp || 0,
    skills,
    achievements: meta.achievements || [],
    stats: {
      clicks: 0, surges: 0, breaks: 0, maxStack: 0, maxTier: 0,
      daysWorked: 0, quotasMet: 0, objectivesMet: 0, promotions: 0,
      lives: 1, calabozos: 0, despidos: 0, dimisiones: 0,
      xpEarned: meta.xp || 0, produced: 0, bestDay: 0,
      ...(meta.stats || {}),
    },
    events: [],
  };
}

const emit = (s, type, data) => { s.events.push({ type, ...data }); };

// ------------------------------------------------------------- derivados
/** Todos los multiplicadores del estado. Barato: se llama cada frame. */
export function stats(s) {
  const u = s.upgrades, k = s.skills, a = s.auto;
  let buffMult = 1, noWear = false;
  for (const b of s.buffs) {
    if (b.mult) buffMult *= b.mult;
    if (b.noWear) noWear = true;
  }
  const ach = achMult(s);
  return {
    money: (1 + u.voltaje * 0.12) * ach * buffMult,   // multiplica la PRODUCCIÓN
    achMult: ach,
    decay: Math.pow(0.97, u.filamento),
    click: 1 + u.pulso * 0.25,
    wear: noWear ? 0 : Math.pow(0.96, u.aislamiento) * Math.pow(0.92, k.manitas),
    cool: 1 + u.disipador * 0.08,
    surgeTime: CORE.surgeTime + u.reactor * 0.35,
    maxWear: 1 + u.cristal * 0.06,
    surgeCap: CORE.surgeCap + k.ojoclinico,
    canSurge: u.sobrecarga > 0,   // sin el permiso, la banda roja no hace nada especial
    shiftLen: CORE.shift + u.jornada * 6 + k.madrugador * 12,
    // La jornada escala TODO el día: sueldo, cuota y propina van en proporción
    // al turno. Trabajar más horas paga más… y exige más.
    jornadaMult: (CORE.shift + u.jornada * 6 + k.madrugador * 12) / CORE.shift,
    tipRate: CORE.tipBase + u.bote * CORE.tipPer,
    nomMult: 1 + k.callo * 0.10,
    billMult: Math.max(0.4, 1 - k.labia * 0.08),
    xpMult: 1 + k.esponja * 0.15,
    autoEvery: a.chispa ? 5 / (1 + 0.45 * a.chispa) : 0,
    fixDelay: a.tecnico ? 12 / a.tecnico : 0,
    autoSurge: a.condensador,
  };
}

/** €/s de producción de un zócalo ahora mismo. */
export function socketOutput(sk, st) {
  const b = sk.bulb;
  if (!b) return 0;
  return TIERS[sk.tier].base * b.charge * (1 + b.surge) *
         Math.pow(CORE.forzadoOut, sk.forzado) * st.money;
}

export const income = (s, st = stats(s)) =>
  s.sockets.reduce((t, sk) => t + socketOutput(sk, st), 0);

export const potential = (s, st = stats(s)) =>
  s.sockets.reduce((t, sk) => t + (sk.bulb
    ? TIERS[sk.tier].base * Math.pow(CORE.forzadoOut, sk.forzado) * st.money : 0), 0);

const decayOf = (sk, st) => TIERS[sk.tier].decay * st.decay * Math.pow(CORE.forzadoDecay, sk.forzado);

// ------------------------------------------------------------ el día
/** Ficha la entrada: genera los objetivos y arranca el reloj del turno. */
export function startDay(s) {
  // No se ficha con un turno en marcha NI con un día terminado sin pagar:
  // ese día pendiente tiene que pasar por endDay() primero (nada se salta la nómina).
  if (s.shift && (s.shift.active || !s.shift.closed)) return null;
  s.day++;
  const st = stats(s);
  // dos objetivos secundarios distintos, al azar
  const pool = [...OBJECTIVE_TYPES];
  const objectives = [];
  for (let n = 0; n < 2; n++) {
    const i = Math.floor(Math.random() * pool.length);
    const def = pool.splice(i, 1)[0];
    objectives.push({ type: def.type, ...def.gen(s.rank), met: false });
  }
  // Sueldo y cuota del día se congelan al fichar: comprar Jornada a media
  // mañana no mueve la portería de hoy, cuenta desde mañana.
  s.shift = {
    active: true, left: st.shiftLen, len: st.shiftLen,
    quota: s.quota * st.jornadaMult,
    salary: RANKS[s.rank].salary * st.jornadaMult,
    produced: 0, clicks: 0, sweets: 0, surges: 0, breaks: 0,
    objectives,
  };
  emit(s, 'dayStart', { day: s.day });
  return s.shift;
}

/** Progreso vivo de un objetivo (para la UI). */
export function objectiveProgress(s, o) {
  const sh = s.shift;
  if (!sh) return { cur: 0, max: 1, ok: false };
  switch (o.type) {
    case 'roturas': return { cur: sh.breaks, max: o.target, ok: sh.breaks <= o.target };
    case 'surges':  return { cur: sh.surges, max: o.target, ok: sh.surges >= o.target };
    case 'sweet':   return { cur: sh.sweets, max: o.target, ok: sh.sweets >= o.target };
    case 'final': {
      const on = s.sockets.filter((k) => k.bulb && k.bulb.charge >= o.target).length;
      return { cur: on, max: s.sockets.length, ok: on === s.sockets.length };
    }
    default: return { cur: 0, max: 1, ok: false };
  }
}

/**
 * Ficha la salida. Calcula la nómina, cobra las facturas, aplica deuda,
 * revisa ascenso y despidos, reparte la experiencia y deja la fábrica lista
 * para mañana. Devuelve el parte del día para la pantalla de cierre.
 */
export function endDay(s) {
  const sh = s.shift;
  if (!sh) return null;
  if (sh.closed) return sh.report;   // idempotente: fichar la salida dos veces no paga dos veces
  sh.active = false;
  const st = stats(s);
  const R = RANKS[s.rank];
  // partidas guardadas antes de que existiera la jornada escalada
  const salary = sh.salary ?? R.salary;
  const quota = sh.quota ?? s.quota;

  // --- nómina ---
  const ratio = Math.min(1, sh.produced / quota);
  const base = salary * ratio;
  for (const o of sh.objectives) o.met = objectiveProgress(s, o).ok;
  const met = sh.objectives.filter((o) => o.met);
  const primas = met.length * CORE.primaRate * salary;
  const excess = Math.min(CORE.excessRate * Math.max(0, sh.produced - quota),
                          CORE.excessCap * salary);
  const bruto = base + primas + excess;
  const pendingSum = s.sockets.reduce((t, k) => t + k.pending, 0);
  const deduct = Math.min(pendingSum, CORE.deductCap * bruto);
  const nomina = (bruto - deduct) * st.nomMult;
  s.bank += nomina;

  // --- propina: superar la cuota deja algo directo en el bolsillo, sin pasar
  // por deducciones. Es un % del sueldo del día (así no explota en rangos altos).
  const quotaMet0 = ratio >= 1;
  const tip = quotaMet0 ? st.tipRate * salary : 0;
  s.bank += tip;

  // --- facturas (sobre el sueldo BASE del rango: vivir no se encarece por currar más) ---
  const food = R.salary * CORE.foodRate * st.billMult;
  const rentDue = s.day % CORE.rentEvery === 0;
  const rent = rentDue ? R.salary * CORE.rentRate * st.billMult : 0;
  s.bank -= food + rent;
  let shortfall = 0;
  if (s.bank < 0) { shortfall = -s.bank; s.debt += shortfall; s.bank = 0; }

  // --- deuda: interés sobre lo que ya debías, y se paga sola si hay banco ---
  let interest = 0;
  if (s.debt > shortfall) {
    interest = (s.debt - shortfall) * CORE.debtInterest;
    s.debt += interest;
  }
  const repaid = Math.min(s.bank, s.debt);
  s.bank -= repaid;
  s.debt -= repaid;

  // --- cuota del día siguiente y carrera ---
  const quotaMet = quotaMet0;
  if (quotaMet) {
    s.metDays++;
    s.stats.quotasMet++;
    s.quota *= 1 + CORE.quotaGrowth;
  } else {
    s.quota = Math.max(R.quota * CORE.quotaFloor, s.quota * (1 - CORE.quotaRelief));
  }
  s.fireStreak = ratio < CORE.fireRatio ? s.fireStreak + 1 : 0;

  let promotion = null;
  if (quotaMet && s.metDays >= R.promoteDays && s.rank < RANKS.length - 1) {
    s.rank++;
    const N = RANKS[s.rank];
    promotion = s.rank;
    s.metDays = 0;
    s.quota = N.quota;
    s.stats.promotions++;
    while (s.sockets.length < N.sockets) s.sockets.push(newSocket(0, false));
  }

  // --- experiencia ---
  const r1 = s.rank + 1;
  let xp = XP.day * r1 + (quotaMet ? XP.quota * r1 : 0) + met.length * XP.objective * r1;
  if (promotion != null) xp += XP.promotion * r1;
  xp = Math.round(xp * st.xpMult);
  s.xp += xp;
  s.stats.xpEarned += xp;

  // --- ¿calabozo o despido? ---
  const jailAt = CORE.jailDebt * R.salary * CORE.rentRate;
  const fail = s.debt > jailAt ? 'calabozo'
             : s.fireStreak >= CORE.fireDays ? 'despido' : null;

  // --- la noche: mantenimiento repone lo roto (ya descontado) y todo descansa ---
  for (const sk of s.sockets) {
    if (sk.bulb) {
      sk.bulb.charge = 1; sk.bulb.wear = 0; sk.bulb.surge = 0; sk.bulb.surgeT = 0; sk.bulb.since = 99;
    } else if (sk.broken) {
      sk.bulb = newBulb();
    }
    sk.broken = false; sk.pending = 0; sk.respawn = 0;
  }
  s.buffs = [];
  s.autoT = 0;

  s.stats.daysWorked++;
  s.stats.produced += sh.produced;
  if (sh.produced > s.stats.bestDay) s.stats.bestDay = sh.produced;
  checkAchievements(s);

  const report = {
    day: s.day, rank: s.rank, produced: sh.produced, quota, salary, ratio,
    base, primas, objectives: sh.objectives, excess, tip, deduct, breaks: sh.breaks,
    nomina, food, rent, shortfall, interest, repaid,
    bank: s.bank, debt: s.debt, xp, quotaMet, promotion, fail,
    fireStreak: s.fireStreak, metDays: s.metDays,
  };
  // `closed` es la marca de que este día YA está pagado: el flujo de la UI se
  // deriva de aquí (no de eventos efímeros), así que sobrevive a recargas.
  s.shift = { ...sh, closed: true, report };
  emit(s, 'dayEnd', { report });
  return report;
}

/**
 * Fin de una vida laboral: calabozo, despido o dimisión. La experiencia, las
 * habilidades, los logros y las estadísticas sobreviven; todo lo demás no.
 * Devuelve { state, finiquito }.
 */
export function resetLife(s, reason) {
  const st = stats(s);
  const baseXp = reason === 'dimision' ? XP.quitBase
               : reason === 'despido' ? XP.firedBase : XP.jailBase;
  const finiquito = Math.round(baseXp * (s.rank + 1) * Math.sqrt(Math.max(1, s.day)) * st.xpMult);
  const stats2 = { ...s.stats, lives: s.stats.lives + 1 };
  if (reason === 'calabozo') stats2.calabozos++;
  else if (reason === 'despido') stats2.despidos++;
  else stats2.dimisiones++;
  stats2.xpEarned += finiquito;
  const next = newState({
    xp: s.xp + finiquito,
    skills: s.skills,
    achievements: s.achievements,
    stats: stats2,
  });
  checkAchievements(next);
  return { state: next, finiquito };
}

// ---------------------------------------------------------------- tick
/** Avanza la simulación. SOLO corre durante el turno: fuera de él, nada se mueve. */
export function step(s, dt) {
  const sh = s.shift;
  if (!sh || !sh.active) return s;
  const st = stats(s);

  // el reloj manda: si el dt se pasa del final, se recorta
  if (dt > sh.left) dt = sh.left;

  const earned = income(s, st) * dt;
  sh.produced += earned;

  for (let i = 0; i < s.sockets.length; i++) {
    const sk = s.sockets[i];
    if (!sk.bulb) {
      if (sk.respawn > 0) {
        sk.respawn -= dt;
        if (sk.respawn <= 0) { sk.respawn = 0; tryAutoReplace(s, i, st); }
      }
      continue;
    }
    const b = sk.bulb;
    b.since += dt;
    b.charge = Math.max(0, b.charge - decayOf(sk, st) * dt);
    let cool = dt;
    if (b.surgeT > 0) {
      const spent = Math.min(dt, b.surgeT);
      b.surgeT -= spent;
      cool -= spent;
      if (b.surgeT <= 0) { b.surgeT = 0; b.surge = 0; }
    }
    if (cool > 0 && b.wear > 0 && b.since > CORE.coolDelay) {
      b.wear = Math.max(0, b.wear - CORE.coolRate * st.cool * cool);
    }
  }

  if (s.buffs.length) {
    for (const b of s.buffs) b.time -= dt;
    s.buffs = s.buffs.filter((b) => b.time > 0);
  }

  if (st.autoEvery > 0) {
    s.autoT += dt;
    while (s.autoT >= st.autoEvery) {
      s.autoT -= st.autoEvery;
      autoClick(s, st);
    }
  } else s.autoT = 0;

  sh.left -= dt;
  if (sh.left <= 0) {
    sh.left = 0;
    sh.active = false;   // sirena: se acabó — ni un click más hasta mañana
    emit(s, 'shiftOver', {});
  }
  return s;
}

function autoClick(s, st) {
  let best = -1, low = Infinity;
  for (let i = 0; i < s.sockets.length; i++) {
    const b = s.sockets[i].bulb;
    if (b && b.charge < low) { low = b.charge; best = i; }
  }
  if (best < 0) return;
  const b = s.sockets[best].bulb;
  if (b.charge >= CORE.surgeLo && b.surge >= st.autoSurge) return;
  click(s, best, true);
}

// --------------------------------------------------------------- click
/**
 * El corazón del juego, intacto de v1. La banda decide premio y riesgo.
 * La diferencia: lo que ganas va a la PRODUCCIÓN del día, no a tu bolsillo.
 */
export function click(s, i, auto = false) {
  const sh = s.shift;
  if (!sh || !sh.active) return null;
  const sk = s.sockets[i];
  if (!sk || !sk.bulb) return null;
  const st = stats(s);
  const b = sk.bulb;
  const c = b.charge;
  const base = TIERS[sk.tier].base * CORE.clickRatio * st.click *
               Math.pow(CORE.forzadoOut, sk.forzado) * st.money;

  let band, gain, broke = false;
  if (c >= CORE.surgeLo && !st.canSurge) {
    // Sin permiso de sobrecarga, pulsar tan pronto sólo desperdicia el click:
    // la recargas sin sacarle nada. Es la lección de ritmo del principio.
    band = 'early';
    gain = base;
  } else if (c >= CORE.surgeLo) {
    band = 'surge';
    b.surge = Math.min(st.surgeCap, b.surge + 1);
    b.surgeT = st.surgeTime;
    gain = base * CORE.surgeBonus * b.surge;
    b.wear += CORE.wearBase * Math.pow(b.surge, CORE.wearExp) * st.wear;
    sh.surges++;
    s.stats.surges++;
    if (b.surge > s.stats.maxStack) s.stats.maxStack = b.surge;
  } else if (c >= CORE.sweetLo) {
    band = 'sweet';
    gain = base * CORE.sweetBonus;
    b.wear += CORE.sweetWear * st.wear;
    sh.sweets++;
  } else {
    band = 'relight';
    gain = base;
  }

  b.charge = 1;
  b.since = 0;
  sh.produced += gain;
  sh.clicks++;
  s.stats.clicks++;

  if (b.wear >= st.maxWear) broke = breakBulb(s, i, st);

  emit(s, 'click', { i, band, gain, stacks: b.surge, broke, auto });
  checkAchievements(s);
  return { band, gain, stacks: b.surge, broke };
}

/** ¿Sigues en prácticas? La empresa te pone bombilla reforzada, no revienta. */
export const isBecario = (s) => s.day <= CORE.becarioDays;

function breakBulb(s, i, st) {
  const sk = s.sockets[i];
  // Periodo de prácticas: la reforzada aguanta lo que le eches. Aprendes el
  // ritmo sin que te cueste la nómina.
  if (isBecario(s)) {
    sk.bulb.wear = 0;
    sk.bulb.surge = 0;
    sk.bulb.surgeT = 0;
    emit(s, 'protected', { i });
    return false;
  }
  if (s.bag.fusible > 0) {
    s.bag.fusible--;
    sk.bulb.wear = 0;
    sk.bulb.surge = 0;
    sk.bulb.surgeT = 0;
    emit(s, 'saved', { i });
    return false;
  }
  sk.bulb = null;
  sk.broken = true;
  // La empresa apunta la rotura. Si la resuelves tú antes de fichar la salida
  // (repuesto, técnico o de tu bolsillo), se borra; si no, va a la nómina.
  sk.pending = TIERS[sk.tier].cost;
  s.shift.breaks++;
  s.stats.breaks++;
  emit(s, 'break', { i, tier: sk.tier });
  if (!tryAutoReplace(s, i, st) && st.fixDelay > 0) sk.respawn = st.fixDelay;
  return true;
}

/** Repuesto gratis si lo hay; si no, el técnico paga de tu banco una IGUAL. */
function tryAutoReplace(s, i, st) {
  const sk = s.sockets[i];
  if (sk.bulb) return true;
  if (s.bag.repuesto > 0) {
    s.bag.repuesto--;
    sk.bulb = newBulb();
    sk.broken = false;
    sk.pending = 0;
    emit(s, 'replaced', { i, free: true });
    return true;
  }
  if (st.fixDelay > 0 && sk.respawn === 0) {
    const cost = TIERS[sk.tier].cost;
    if (s.bank >= cost) {
      s.bank -= cost;
      sk.bulb = newBulb();
      sk.broken = false;
      sk.pending = 0;
      emit(s, 'replaced', { i, free: false });
      return true;
    }
  }
  return false;
}

// -------------------------------------------------------------- compras
// Con deuda no hay caprichos: mejoras, automatismos y consumibles quedan
// bloqueados. La maquinaria (bombillas) sí se puede tocar: es tu salida del hoyo.
const inDebt = (s) => s.debt > 0;

export const upgradeCost = (def, level) => def.base * Math.pow(def.growth, level);

/** Algunas mejoras (el permiso de sobrecarga) exigen categoría profesional. */
export const upgradeLocked = (s, def) => def.minRank != null && s.rank < def.minRank;

export function buyUpgrade(s, id) {
  const def = UPG[id];
  if (inDebt(s) || upgradeLocked(s, def)) return false;
  if (def.max != null && s.upgrades[id] >= def.max) return false;
  const cost = upgradeCost(def, s.upgrades[id]);
  if (s.bank < cost) return false;
  s.bank -= cost;
  s.upgrades[id]++;
  return true;
}

export function buyAutomation(s, id) {
  const def = AUT[id];
  if (inDebt(s)) return false;
  if (s.auto[id] >= def.max) return false;
  const cost = def.base * Math.pow(def.growth, s.auto[id]);
  if (s.bank < cost) return false;
  s.bank -= cost;
  s.auto[id]++;
  return true;
}

/** Reponer, mejorar (un peldaño) o tope: lo que el zócalo admita. */
export function socketAction(s, i) {
  const sk = s.sockets[i];
  if (!sk) return null;
  if (!sk.bulb) return { kind: 'repair', tier: sk.tier, cost: TIERS[sk.tier].cost };
  if (sk.tier >= TIERS.length - 1) return { kind: 'max', tier: sk.tier, cost: null };
  const next = sk.tier + 1;
  if (next > RANKS[s.rank].maxTier) return { kind: 'locked', tier: next, cost: null };
  return { kind: 'upgrade', tier: next, cost: TIERS[next].cost };
}

export function repairSocket(s, i) {
  const sk = s.sockets[i];
  if (!sk || sk.bulb) return false;
  const cost = TIERS[sk.tier].cost;
  if (s.bank < cost) return false;
  s.bank -= cost;
  s.sockets[i] = { ...sk, bulb: newBulb(), respawn: 0, broken: false, pending: 0 };
  emit(s, 'install', { i, tier: sk.tier, repair: true });
  return true;
}

export function upgradeSocket(s, i) {
  const a = socketAction(s, i);
  if (!a || a.kind !== 'upgrade') return false;
  const sk = s.sockets[i];
  if (s.bank < a.cost) return false;
  s.bank -= a.cost;
  sk.tier = a.tier;
  sk.bulb = newBulb();
  sk.broken = false;
  sk.pending = 0;
  if (a.tier > s.stats.maxTier) s.stats.maxTier = a.tier;
  emit(s, 'install', { i, tier: a.tier });
  checkAchievements(s);
  return true;
}

export function buyBulb(s, i) {
  const a = socketAction(s, i);
  if (!a) return false;
  return a.kind === 'repair' ? repairSocket(s, i)
       : a.kind === 'upgrade' ? upgradeSocket(s, i) : false;
}

export function upgradeAll(s) {
  let n = 0;
  const order = s.sockets.map((sk, i) => i).sort((a, b) => s.sockets[a].tier - s.sockets[b].tier);
  for (const i of order) if (buyBulb(s, i)) n++;
  return n;
}

export function buyForzado(s, i) {
  const sk = s.sockets[i];
  if (!sk || !sk.bulb || sk.forzado >= CORE.forzadoMax) return false;
  const cost = forzadoCost(sk.tier, sk.forzado);
  if (s.bank < cost) return false;
  s.bank -= cost;
  sk.forzado++;
  return true;
}

export const consumableCost = (s, id) => consumablePrice(s.rank, id);

export function buyConsumable(s, id) {
  const def = CON[id];
  if (inDebt(s)) return false;
  const cost = consumableCost(s, id);
  if (s.bank < cost) return false;
  s.bank -= cost;
  if (def.stack) { s.bag[id]++; return true; }
  applyConsumable(s, id);
  return true;
}

function applyConsumable(s, id) {
  const def = CON[id];
  if (def.instant === 'cool') {
    for (const sk of s.sockets) if (sk.bulb) sk.bulb.wear = 0;
  } else if (def.instant === 'charge') {
    for (const sk of s.sockets) if (sk.bulb) sk.bulb.charge = 1;
  } else if (def.buff) {
    const cur = s.buffs.find((b) => b.id === id);
    if (cur) cur.time += def.buff.time;
    else s.buffs.push({ id, ...def.buff });
  }
  emit(s, 'consumable', { id });
}

// ------------------------------------------------------------ habilidades
export function skillCost(def, level) {
  if (def.costs) return level < def.costs.length ? def.costs[level] : null;
  if (def.max != null && level >= def.max) return null;
  return Math.round(def.base * Math.pow(def.growth, level));
}
export const skillMax = (def) => def.costs ? def.costs.length : (def.max ?? 999);

export function buySkill(s, id) {
  const def = SKL[id];
  const cost = skillCost(def, s.skills[id]);
  if (cost == null || s.xp < cost) return false;
  s.xp -= cost;
  s.skills[id]++;
  return true;
}

// -------------------------------------------------------------- logros
export function checkAchievements(s) {
  if (s.achievements.length === ACHIEVEMENTS.length) return;
  const have = new Set(s.achievements);
  for (const a of ACHIEVEMENTS) {
    if (have.has(a.id)) continue;
    if (a.test(s)) {
      s.achievements.push(a.id);
      emit(s, 'achievement', { id: a.id });
    }
  }
}
