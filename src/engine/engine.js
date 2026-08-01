// Simulación pura de FULGOR. Sin DOM, sin timers: sólo funciones sobre el estado.
// Todo lo que muta el estado vive aquí, para poder probarlo con `node --test`.

import {
  TIERS, CORE, UPGRADES, AUTOMATION, CONSUMABLES, PRESTIGE, ACHIEVEMENTS,
  socketCost, forzadoCost, sparksFor,
} from './config.js';

const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
export const UPG = byId(UPGRADES);
export const AUT = byId(AUTOMATION);
export const CON = byId(CONSUMABLES);
export const PRE = byId(PRESTIGE);
const ACH = byId(ACHIEVEMENTS);

/**
 * Multiplicador de logros, cacheado en el propio estado. stats() se llama varias
 * veces por frame y recorrer los logros cada vez salía a ~150k iteraciones/s.
 */
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
// El NIVEL vive en el zócalo, no en la bombilla. Así al romperse no se pierde
// el progreso: repones una bombilla del mismo nivel que tenías instalado.
export function newBulb() {
  return { charge: 1, wear: 0, surge: 0, surgeT: 0, since: 99 };
}

export const newSocket = (tier = 0, withBulb = true) =>
  ({ tier, forzado: 0, respawn: 0, broken: false, bulb: withBulb ? newBulb() : null });

const zeroed = (list) => Object.fromEntries(list.map((x) => [x.id, 0]));

/** Estado inicial de una partida. `meta` conserva lo que sobrevive al Apagón. */
export function newState(meta = {}) {
  const prestige = { ...zeroed(PRESTIGE), ...(meta.prestige || {}) };
  const sockets = 1 + (prestige.genesis || 0);
  const tier = Math.min(TIERS.length - 1, prestige.herencia || 0);
  return {
    money: prestige.memoria ? 250 * Math.pow(8, prestige.memoria - 1) : 0,
    runEarned: 0,
    sparks: meta.sparks || 0,
    prestige,
    sockets: Array.from({ length: sockets }, () => newSocket(tier)),
    upgrades: zeroed(UPGRADES),
    auto: { ...zeroed(AUTOMATION), chispa: prestige.reflejo || 0 },
    bag: zeroed(CONSUMABLES),
    buffs: [],
    achievements: meta.achievements || [],
    autoT: 0,
    lastSeen: 0, // lo pone la capa de guardado
    stats: {
      clicks: 0, surges: 0, breaks: 0, maxStack: 0, maxTier: tier, prestiges: 0,
      lifeEarned: 0, bestRun: 0, ...(meta.stats || {}),
    },
    events: [],
  };
}

const emit = (s, type, data) => { s.events.push({ type, ...data }); };

// ------------------------------------------------------------ derivados
/** Todos los multiplicadores derivados del estado. Barato: se llama cada tick. */
export function stats(s) {
  const u = s.upgrades, p = s.prestige, a = s.auto;
  let buffMult = 1, noWear = false;
  for (const b of s.buffs) {
    if (b.mult) buffMult *= b.mult;
    if (b.noWear) noWear = true;
  }
  const ach = achMult(s);
  return {
    money: (1 + u.voltaje * 0.12) * (1 + p.nucleo * 0.25) * ach * buffMult,
    achMult: ach,
    buffMult,
    decay: Math.pow(0.97, u.filamento),
    click: 1 + u.pulso * 0.25,
    wear: noWear ? 0 : Math.pow(0.96, u.aislamiento) * Math.pow(0.92, p.temple),
    cool: 1 + u.disipador * 0.08,
    surgeTime: CORE.surgeTime + u.reactor * 0.35,
    maxWear: 1 + u.cristal * 0.06,
    surgeCap: CORE.surgeCap + p.avaricia,
    offline: Math.min(1, u.espejo * 0.03 + p.eco * 0.2),
    autoEvery: a.chispa ? 5 / (1 + 0.45 * a.chispa) : 0,
    fixDelay: a.tecnico ? 12 / a.tecnico : 0,
    autoSurge: a.condensador,
  };
}

/** €/s que produce un zócalo ahora mismo, ya con multiplicadores globales. */
export function socketOutput(sk, st) {
  const b = sk.bulb;
  if (!b) return 0;
  const bright = CORE.dimFloor + (1 - CORE.dimFloor) * b.charge;
  return TIERS[sk.tier].base * bright * (1 + b.surge) *
         Math.pow(CORE.forzadoOut, sk.forzado) * st.money;
}

export const income = (s, st = stats(s)) =>
  s.sockets.reduce((t, sk) => t + socketOutput(sk, st), 0);

/** €/s teórico si todo estuviese al 100% y sin sobrecargas. Para la UI. */
export const potential = (s, st = stats(s)) =>
  s.sockets.reduce((t, sk) => t + (sk.bulb
    ? TIERS[sk.tier].base * Math.pow(CORE.forzadoOut, sk.forzado) * st.money : 0), 0);

const decayOf = (sk, st) => TIERS[sk.tier].decay * st.decay * Math.pow(CORE.forzadoDecay, sk.forzado);

// ---------------------------------------------------------------- tick
/** Avanza la simulación `dt` segundos. Muta `s`. */
export function step(s, dt) {
  const st = stats(s);

  const earned = income(s, st) * dt;
  s.money += earned;
  s.runEarned += earned;
  s.stats.lifeEarned += earned;

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
    // Repartimos dt entre "sobrecargando" y "enfriando": con un dt grande
    // (pestaña en segundo plano) tiene que caber lo uno y lo otro.
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

  // buffs
  if (s.buffs.length) {
    for (const b of s.buffs) b.time -= dt;
    s.buffs = s.buffs.filter((b) => b.time > 0);
  }

  // Chispa: reenciende sola la bombilla más apagada.
  if (st.autoEvery > 0) {
    s.autoT += dt;
    while (s.autoT >= st.autoEvery) {
      s.autoT -= st.autoEvery;
      autoClick(s, st);
    }
  } else s.autoT = 0;

  checkAchievements(s);
  return s;
}

function autoClick(s, st) {
  let best = -1, low = Infinity;
  for (let i = 0; i < s.sockets.length; i++) {
    const b = s.sockets[i].bulb;
    if (b && b.charge < low) { low = b.charge; best = i; }
  }
  if (best < 0) return;
  // Sin Condensador nunca entra en la banda de riesgo; con él, sobrecarga
  // sólo hasta el número de stacks que tenga contratado.
  const b = s.sockets[best].bulb;
  // Se abstiene si al pulsar entraría en riesgo por encima de lo contratado.
  if (b.charge >= CORE.surgeLo && b.surge >= st.autoSurge) return;
  click(s, best, true);
}

// --------------------------------------------------------------- click
/**
 * El corazón del juego. La banda en la que pulsas decide el premio y el riesgo.
 *  carga <  sweetLo  -> reencendido limpio, sin desgaste
 *  carga >= sweetLo  -> buen reencendido, desgaste mínimo
 *  carga >= surgeLo  -> SOBRECARGA: x2..xN acumulable, pero quema la bombilla
 */
export function click(s, i, auto = false) {
  const sk = s.sockets[i];
  if (!sk || !sk.bulb) return null;
  const st = stats(s);
  const b = sk.bulb;
  const c = b.charge;
  const base = TIERS[sk.tier].base * CORE.clickRatio * st.click *
               Math.pow(CORE.forzadoOut, sk.forzado) * st.money;

  let band, gain, broke = false;
  if (c >= CORE.surgeLo) {
    band = 'surge';
    b.surge = Math.min(st.surgeCap, b.surge + 1);
    b.surgeT = st.surgeTime;
    gain = base * CORE.surgeBonus * b.surge;
    // El desgaste crece con el stack: encadenar sobrecargas es lo que rompe.
    b.wear += CORE.wearBase * Math.pow(b.surge, CORE.wearExp) * st.wear;
    s.stats.surges++;
    if (b.surge > s.stats.maxStack) s.stats.maxStack = b.surge;
  } else if (c >= CORE.sweetLo) {
    band = 'sweet';
    gain = base * CORE.sweetBonus;
    b.wear += CORE.sweetWear * st.wear;
  } else {
    band = 'relight';
    gain = base;
  }

  b.charge = 1;
  b.since = 0;
  s.money += gain;
  s.runEarned += gain;
  s.stats.lifeEarned += gain;
  s.stats.clicks++;

  if (b.wear >= st.maxWear) broke = breakBulb(s, i, st);

  emit(s, 'click', { i, band, gain, stacks: b.surge, broke, auto });
  checkAchievements(s);
  return { band, gain, stacks: b.surge, broke };
}

function breakBulb(s, i, st) {
  const sk = s.sockets[i];
  const tier = sk.tier;
  // Un fusible se gasta y salva la bombilla, dejándola fría.
  if (s.bag.fusible > 0) {
    s.bag.fusible--;
    sk.bulb.wear = 0;
    sk.bulb.surge = 0;
    sk.bulb.surgeT = 0;
    emit(s, 'saved', { i });
    return false;
  }
  sk.bulb = null;
  sk.broken = true;   // deja los cristales a la vista hasta que repongas
  s.stats.breaks++;
  emit(s, 'break', { i, tier });
  if (!tryAutoReplace(s, i, st) && st.fixDelay > 0) sk.respawn = st.fixDelay;
  return true;
}

/**
 * Repuesto gratis si lo hay; si no, el Técnico compra una IGUAL a la que había.
 * Ojo: se repone al nivel del zócalo, no al mejor nivel de la partida — si no,
 * romper una bombilla barata te regalaba gratis la mejor que hubieras tenido.
 */
function tryAutoReplace(s, i, st) {
  const sk = s.sockets[i];
  if (sk.bulb) return true;
  const tier = sk.tier;
  if (s.bag.repuesto > 0) {
    s.bag.repuesto--;
    sk.bulb = newBulb();
    sk.broken = false;
    emit(s, 'replaced', { i, free: true });
    return true;
  }
  if (st.fixDelay > 0 && sk.respawn === 0) {
    const cost = TIERS[tier].cost;
    if (s.money >= cost) {
      s.money -= cost;
      sk.bulb = newBulb();
      sk.broken = false;
      emit(s, 'replaced', { i, free: false });
      return true;
    }
  }
  return false;
}

// --------------------------------------------------------------- compras
export const upgradeCost = (def, level) => def.base * Math.pow(def.growth, level);

export function buyUpgrade(s, id) {
  const def = UPG[id];
  const cost = upgradeCost(def, s.upgrades[id]);
  if (s.money < cost) return false;
  s.money -= cost;
  s.upgrades[id]++;
  return true;
}

export function buyAutomation(s, id) {
  const def = AUT[id];
  if (s.auto[id] >= def.max) return false;
  const cost = def.base * Math.pow(def.growth, s.auto[id]);
  if (s.money < cost) return false;
  s.money -= cost;
  s.auto[id]++;
  return true;
}

export function buySocket(s) {
  if (s.sockets.length >= CORE.maxSockets) return false;
  const cost = socketCost(s.sockets.length);
  if (s.money < cost) return false;
  s.money -= cost;
  // Llega vacío y al nivel más bajo: la escalera se sube desde abajo.
  s.sockets.push(newSocket(0, false));
  return true;
}

/** Lo que cuesta la acción disponible en el zócalo: reponer o mejorar. */
export function socketAction(s, i) {
  const sk = s.sockets[i];
  if (!sk) return null;
  if (!sk.bulb) return { kind: 'repair', tier: sk.tier, cost: TIERS[sk.tier].cost };
  if (sk.tier >= TIERS.length - 1) return { kind: 'max', tier: sk.tier, cost: null };
  return { kind: 'upgrade', tier: sk.tier + 1, cost: TIERS[sk.tier + 1].cost };
}

/** Pone una bombilla nueva del MISMO nivel en un zócalo vacío o reventado. */
export function repairSocket(s, i) {
  const sk = s.sockets[i];
  if (!sk || sk.bulb) return false;
  const cost = TIERS[sk.tier].cost;
  if (s.money < cost) return false;
  s.money -= cost;
  s.sockets[i] = { ...sk, bulb: newBulb(), respawn: 0, broken: false };
  emit(s, 'install', { i, tier: sk.tier, repair: true });
  return true;
}

/** Sube el zócalo EXACTAMENTE un peldaño. Nunca salta niveles. */
export function upgradeSocket(s, i) {
  const sk = s.sockets[i];
  if (!sk || !sk.bulb || sk.tier >= TIERS.length - 1) return false;
  const next = sk.tier + 1;
  const cost = TIERS[next].cost;
  if (s.money < cost) return false;
  s.money -= cost;
  sk.tier = next;
  sk.bulb = newBulb();      // la nueva entra a plena carga
  sk.broken = false;
  if (next > s.stats.maxTier) s.stats.maxTier = next;
  emit(s, 'install', { i, tier: next });
  checkAchievements(s);
  return true;
}

/** Reponer o mejorar, lo que toque. Es lo que hace pulsar el botón del zócalo. */
export function buyBulb(s, i) {
  const a = socketAction(s, i);
  if (!a) return false;
  return a.kind === 'repair' ? repairSocket(s, i)
       : a.kind === 'upgrade' ? upgradeSocket(s, i) : false;
}

/** Sube un peldaño todos los zócalos que se pueda pagar, del más barato al más caro. */
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
  if (s.money < cost) return false;
  s.money -= cost;
  sk.forzado++;
  return true;
}

/** Los consumibles se encarecen con tu mejor bombilla: siguen importando siempre. */
export function economyScale(s) {
  return Math.max(1, TIERS[Math.min(TIERS.length - 1, s.stats.maxTier)].base) * 60;
}
export const consumableCost = (s, id) => CON[id].mult * economyScale(s);

export function buyConsumable(s, id) {
  const def = CON[id];
  const cost = consumableCost(s, id);
  if (s.money < cost) return false;
  s.money -= cost;
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

// ------------------------------------------------------------- prestigio
export const pendingSparks = (s) => sparksFor(s.runEarned);
export const canPrestige = (s) => s.runEarned >= CORE.prestigeAt;

export function doPrestige(s) {
  if (!canPrestige(s)) return null;
  const gained = pendingSparks(s);
  const meta = {
    sparks: s.sparks + gained,
    prestige: s.prestige,
    achievements: s.achievements,
    stats: {
      ...s.stats,
      prestiges: s.stats.prestiges + 1,
      bestRun: Math.max(s.stats.bestRun, s.runEarned),
      maxTier: s.prestige.herencia || 0, // el tier heredado, no el alcanzado
    },
  };
  const next = newState(meta);
  next.stats.maxTier = Math.max(next.stats.maxTier, ...next.sockets.map((sk) => sk.tier));
  checkAchievements(next);
  return { state: next, gained };
}

export function prestigeCost(def, level) {
  if (def.costs) return level < def.costs.length ? def.costs[level] : null;
  if (def.max != null && level >= def.max) return null;
  return Math.round(def.base * Math.pow(def.growth, level));
}
export const prestigeMax = (def) => def.costs ? def.costs.length : def.max;

export function buyPrestige(s, id) {
  const def = PRE[id];
  const cost = prestigeCost(def, s.prestige[id]);
  if (cost == null || s.sparks < cost) return false;
  s.sparks -= cost;
  s.prestige[id]++;
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

// -------------------------------------------------------------- offline
/**
 * Ganancia mientras no jugabas. Las bombillas se apagan de verdad, así que sólo
 * se paga una fracción, y hace falta la mejora Espejo/Eco para cobrar algo.
 */
export function offlineGains(s, seconds) {
  const st = stats(s);
  const capped = Math.min(seconds, CORE.offlineCapH * 3600);
  if (capped < 60 || st.offline <= 0) return { seconds: capped, money: 0 };
  const money = potential(s, st) * CORE.offlineRate * st.offline * capped;
  return { seconds: capped, money };
}

export function applyOffline(s, seconds) {
  const res = offlineGains(s, seconds);
  if (res.money > 0) {
    s.money += res.money;
    s.runEarned += res.money;
    s.stats.lifeEarned += res.money;
  }
  // Aunque no cobres, el tiempo pasa: las bombillas se apagan y se enfrían.
  const st = stats(s);
  for (const sk of s.sockets) {
    if (!sk.bulb) continue;
    sk.bulb.charge = Math.max(0, sk.bulb.charge - decayOf(sk, st) * res.seconds);
    sk.bulb.wear = 0;
    sk.bulb.surge = 0;
    sk.bulb.surgeT = 0;
  }
  return res;
}
