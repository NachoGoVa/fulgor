// FULGOR v2 «El operario» — todo el balance del juego vive aquí.
// Eres operario de Lumínicas Paquita e Hijos, S.L. Cada día fichas, cumples
// la cuota, cobras la nómina, pagas las facturas y rezas por no acabar en
// el calabozo. La experiencia (XP) es lo único que nadie te puede quitar.

// ---------------------------------------------------------------- bombillas
// LA ESCALERA. El nivel es del zócalo y sube de uno en uno. Curva de producción
// plana (~x2.4 por peldaño) porque el ingreso real lo marca la nómina, no el click.
//   base  = €/s de producción a carga 100%
//   decay = carga perdida por segundo (1/decay = segundos encendida)
//   cost  = lo que cuesta instalar ese nivel (del banco del jugador)
export const TIERS = [
  { id: 'incandescente', name: 'Incandescente', base: 1,    decay: 0.167, cost: 25,    glow: '#FFB347', core: '#FFF0C2', rim: '#FF8A2B' },
  { id: 'halogena',      name: 'Halógena',      base: 2.4,  decay: 0.147, cost: 70,    glow: '#FFD98A', core: '#FFFBE8', rim: '#FFA92E' },
  { id: 'fluorescente',  name: 'Fluorescente',  base: 5.8,  decay: 0.130, cost: 200,   glow: '#9FF5D8', core: '#EAFFF8', rim: '#2FD6A5' },
  { id: 'led',           name: 'LED',           base: 14,   decay: 0.114, cost: 480,   glow: '#7FD4FF', core: '#E9F8FF', rim: '#2A9BE8' },
  { id: 'xenon',         name: 'Xenón',         base: 33,   decay: 0.100, cost: 1100,  glow: '#C7B8FF', core: '#F3EFFF', rim: '#7A5CF0' },
  { id: 'neon',          name: 'Neón',          base: 80,   decay: 0.088, cost: 2600,  glow: '#FF5FA8', core: '#FFE6F2', rim: '#E01E76' },
  { id: 'plasma',        name: 'Plasma',        base: 190,  decay: 0.077, cost: 6000,  glow: '#FF7A45', core: '#FFEDE2', rim: '#E23C0B' },
  { id: 'fotonica',      name: 'Fotónica',      base: 460,  decay: 0.068, cost: 13000, glow: '#3DF5FF', core: '#E2FEFF', rim: '#00B4C6' },
  { id: 'cuantica',      name: 'Cuántica',      base: 1100, decay: 0.060, cost: 30000, glow: '#6BFF9E', core: '#E9FFF1', rim: '#12C25C' },
  { id: 'estelar',       name: 'Estelar',       base: 2600, decay: 0.053, cost: 70000, glow: '#FFF3C4', core: '#FFFFFF', rim: '#FFC94A' },
];

// ---------------------------------------------------------------- núcleo
export const CORE = {
  // el turno (idéntico a v1: bandas, sobrecarga, desgaste)
  surgeLo: 0.85,
  sweetLo: 0.62,
  surgeTime: 4.5,
  surgeCap: 2,
  // Calibrado con la simulación de carrera: con 0.075 un jugador agresivo
  // acababa 40 días con CERO roturas — el riesgo no mordía. Con 0.105,
  // encadenar sobrecargas sin respiro rompe de verdad.
  wearBase: 0.105,
  wearExp: 1.25,
  coolRate: 0.05,
  coolDelay: 1.2,
  sweetWear: 0.012,
  clickRatio: 1.5,
  sweetBonus: 1.5,
  surgeBonus: 3,
  dimFloor: 0,
  forzadoOut: 1.5,
  forzadoDecay: 1.12,
  forzadoWear: 1.1,
  forzadoMax: 8,
  maxSockets: 12,

  // el día laboral
  shift: 30,         // s de turno base — jornadas relámpago; la mejora Jornada lo alarga
  tipBase: 0.10,     // propina al superar la cuota: 10% del sueldo del día, directa al banco
  tipPer: 0.05,      // +5% por nivel del Bote de propinas
  primaRate: 0.20,   // cada objetivo cumplido paga 20% del sueldo
  excessRate: 0.10,  // el exceso sobre la cuota paga al 10%…
  excessCap: 1.0,    // …hasta un máximo de 1 sueldo (la empresa no es tonta)
  deductCap: 0.60,   // las roturas descuentan como mucho el 60% del bruto
  quotaGrowth: 0.06, // la cuota sube 6% por día cumplido en el mismo rango
  quotaRelief: 0.12, // y baja 12% tras un día fallido (persigue, no entierra)
  quotaFloor: 0.60,  // …sin bajar del 60% de la base del rango

  // la vida
  foodRate: 0.15,    // comida diaria = 15% del sueldo
  rentRate: 1.0,     // alquiler = 1 sueldo…
  rentEvery: 5,      // …cada 5 días
  debtInterest: 0.08,// interés diario de la deuda (el Sr. Braulio no perdona)
  jailDebt: 2.0,     // calabozo si la deuda supera 2 alquileres
  fireRatio: 0.5,    // despido si produces menos del 50% de la cuota…
  fireDays: 3,       // …3 días seguidos
};

// El forzado se paga según la maquinaria del zócalo.
export const forzadoCost = (tier, level) =>
  Math.max(40, TIERS[tier].base * 25) * Math.pow(2.2, level);

// ---------------------------------------------------------------- la carrera
// salary = sueldo base diario · quota = cuota base del rango (a jornada de 30 s;
// la mejora Jornada escala sueldo y cuota en proporción al turno)
// sockets/maxTier = lo que la empresa te deja tocar
// promoteDays = días cumpliendo la cuota (no seguidos) para el ascenso
export const RANKS = [
  { id: 'aprendiz',   name: 'Aprendiz',       mote: 'el chaval de las bombillas', salary: 40,    quota: 26,    sockets: 1,  maxTier: 1, promoteDays: 3 },
  { id: 'peon',       name: 'Peón',           mote: 'ya te dejan tocar dos',      salary: 95,    quota: 84,    sockets: 2,  maxTier: 2, promoteDays: 4 },
  { id: 'oficial',    name: 'Oficial',        mote: 'con taquilla propia',        salary: 220,   quota: 260,   sockets: 3,  maxTier: 3, promoteDays: 4 },
  { id: 'tecnico',    name: 'Técnico',        mote: 'de filamentos y sus cosas',  salary: 500,   quota: 760,   sockets: 4,  maxTier: 4, promoteDays: 5 },
  { id: 'encargado',  name: 'Encargado',      mote: 'con llavero y todo',         salary: 1150,  quota: 2400,  sockets: 6,  maxTier: 5, promoteDays: 6 },
  { id: 'jefeturno',  name: 'Jefe de Turno',  mote: 'Don Fulgencio te saluda',    salary: 2600,  quota: 8400,  sockets: 8,  maxTier: 7, promoteDays: 7 },
  { id: 'jefeplanta', name: 'Jefe de Planta', mote: 'tu firma ya vale algo',      salary: 6000,  quota: 26000, sockets: 10, maxTier: 8, promoteDays: 8 },
  { id: 'direccion',  name: 'Dirección',      mote: 'despacho con ventana',       salary: 14000, quota: 80000, sockets: 12, maxTier: 9, promoteDays: 9999 },
];

// ---------------------------------------------------------------- mejoras €
export const UPGRADES = [
  { id: 'voltaje',    name: 'Voltaje',     desc: '+12% a toda la producción.',                 base: 25,  growth: 1.17, icon: 'bolt' },
  { id: 'filamento',  name: 'Filamento',   desc: '-3% de velocidad de apagado.',               base: 40,  growth: 1.21, icon: 'wave' },
  { id: 'pulso',      name: 'Pulso',       desc: '+25% a la producción de cada click.',        base: 20,  growth: 1.16, icon: 'tap' },
  { id: 'aislamiento',name: 'Aislamiento', desc: '-4% de desgaste al sobrecargar.',            base: 120, growth: 1.25, icon: 'shield' },
  { id: 'disipador',  name: 'Disipador',   desc: '+8% de velocidad de enfriado del desgaste.', base: 90,  growth: 1.22, icon: 'fan' },
  { id: 'reactor',    name: 'Reactor',     desc: '+0.35 s de duración de la sobrecarga.',      base: 300, growth: 1.30, icon: 'core' },
  { id: 'cristal',    name: 'Cristal',     desc: '+6% de resistencia antes de romperse.',      base: 200, growth: 1.26, icon: 'gem' },
  // La Jornada es la palanca gorda: el turno crece y, con él, sueldo, cuota y propina
  // (todo escala con turno/30). Pagas por trabajar más — muy de operario.
  { id: 'jornada',    name: 'Jornada',     desc: '+6 s de turno, con subida de sueldo y cuota en proporción. Más horas, más nómina… y más propina.', base: 120, growth: 1.45, icon: 'clock', max: 20 },
  { id: 'bote',       name: 'Bote de propinas', desc: '+5% de propina por nivel (la propina es un % del sueldo del día y va directa al banco).', base: 60, growth: 1.6, icon: 'coin', max: 8 },
];

// ---------------------------------------------------------------- automatismos €
export const AUTOMATION = [
  {
    id: 'chispa', name: 'Chispa', max: 12, base: 120, growth: 1.9, icon: 'spark',
    desc: 'Un becario eléctrico: reenciende sola la bombilla más apagada. Nunca arriesga.',
    detail: (l) => l ? `Cada ${(5 / (1 + 0.45 * l)).toFixed(2)} s` : 'Inactiva',
  },
  {
    id: 'tecnico', name: 'Técnico de guardia', max: 5, base: 400, growth: 2.4, icon: 'wrench',
    desc: 'Repone las bombillas rotas en pleno turno, pagando de tu banco.',
    detail: (l) => l ? `Repone en ${(12 / l).toFixed(1)} s` : 'Inactivo',
  },
  {
    id: 'condensador', name: 'Condensador', max: 3, base: 900, growth: 4, icon: 'stack',
    desc: 'Permite que la Chispa se atreva a sobrecargar, hasta cierto nivel.',
    detail: (l) => l ? `Sobrecarga hasta x${l + 1}` : 'Inactivo',
  },
];

// ---------------------------------------------------------------- consumibles €
// Precio ligado a tu sueldo: siguen doliendo (y valiendo) en cualquier rango.
export const CONSUMABLES = [
  { id: 'fusible',      name: 'Fusible',       mult: 8,  icon: 'fuse',   stack: true,
    desc: 'Evita la siguiente rotura. Se gasta al salvarte.' },
  { id: 'repuesto',     name: 'Repuesto',      mult: 6,  icon: 'bulb',   stack: true,
    desc: 'Bombilla de recambio. Se coloca sola y gratis cuando una revienta.' },
  { id: 'refrigerante', name: 'Refrigerante',  mult: 4,  icon: 'snow',   instant: 'cool',
    desc: 'Pone a cero el desgaste de todas las bombillas.' },
  { id: 'bateria',      name: 'Batería',       mult: 3,  icon: 'battery',instant: 'charge',
    desc: 'Carga todas las bombillas al 100% al instante.' },
  { id: 'sobretension', name: 'Sobretensión',  mult: 15, icon: 'surge',  buff: { mult: 3, time: 15 },
    desc: 'x3 a toda la producción durante 15 s de turno.' },
  { id: 'estabilizador',name: 'Estabilizador', mult: 20, icon: 'lock',   buff: { noWear: true, time: 20 },
    desc: 'Sin desgaste durante 20 s de turno. Sobrecarga sin miedo.' },
];

export const consumablePrice = (rank, id) =>
  CONSUMABLES.find((c) => c.id === id).mult * RANKS[rank].salary / 10;

// ---------------------------------------------------------------- habilidades XP
// La experiencia NO se pierde nunca: ni en el calabozo, ni despedido, ni dimitiendo.
// costs[] = niveles finitos · base/growth = escalera infinita (salvo `max`)
export const SKILLS = [
  { id: 'callo',      name: 'Callo laboral', icon: 'tap',    base: 60,  growth: 1.6,
    desc: '+10% de nómina por nivel. Las manos ya saben solas.' },
  { id: 'enchufe',    name: 'Enchufe',       icon: 'bolt',   costs: [150, 600, 2000, 6000],
    desc: 'Tu cuñado conoce al jefe: cada vida nueva empiezas un rango más arriba.' },
  { id: 'colchon',    name: 'Colchón',       icon: 'coin',   base: 80,  growth: 2.0,
    desc: 'Empiezas cada vida con ahorros bajo el colchón.' },
  { id: 'manitas',    name: 'Manitas',       icon: 'shield', base: 90,  growth: 1.7,
    desc: '-8% de desgaste global por nivel. Tocas con cariño.' },
  { id: 'ojoclinico', name: 'Ojo clínico',   icon: 'gem',    costs: [200, 1200, 5000],
    desc: '+1 al máximo de stacks de sobrecarga. Sabes hasta dónde aguanta.' },
  { id: 'madrugador', name: 'Madrugador',    icon: 'clock',  base: 100, growth: 1.8, max: 5,
    desc: '+12 s de turno por nivel. El primero en fichar.' },
  { id: 'labia',      name: 'Labia',         icon: 'mirror', base: 70,  growth: 1.7, max: 6,
    desc: '-8% en todas las facturas por nivel. Al Sr. Braulio le caes bien.' },
  { id: 'esponja',    name: 'Esponja',       icon: 'grid',   base: 120, growth: 2.0, max: 5,
    desc: '+15% de experiencia ganada por nivel.' },
];

// ---------------------------------------------------------------- experiencia
export const XP = {
  day: 4,        // por día trabajado, ×(rango+1)
  quota: 6,      // por cumplir la cuota, ×(rango+1)
  objective: 8,  // por objetivo secundario, ×(rango+1)
  promotion: 60, // por ascenso, ×(rango nuevo +1)
  // finiquito al terminar una vida, ×(rango+1)×√días — dimitir a tiempo es un arte
  quitBase: 40, firedBase: 15, jailBase: 5,
};

// ---------------------------------------------------------------- objetivos del día
// Generadores por rango. La descripción con gracia la pone flavor.js.
export const OBJECTIVE_TYPES = [
  { type: 'roturas', gen: () => ({ target: 1 }) },            // como mucho 1 rotura
  { type: 'surges',  gen: (r) => ({ target: 4 + r * 2 }) },   // N sobrecargas
  { type: 'sweet',   gen: (r) => ({ target: 6 + r * 2 }) },   // N clicks en banda buena
  { type: 'final',   gen: () => ({ target: 0.3 }) },          // acabar todas encendidas
];

// ---------------------------------------------------------------- logros
// Cada logro suma su `mult` (%) a la producción. test(state)
export const ACHIEVEMENTS = [
  { id: 'first',    name: 'Hágase la luz',        desc: 'Tu primer click.',                 mult: 1,  test: (s) => s.stats.clicks >= 1 },
  { id: 'click500', name: 'Dedo de obrero',       desc: '500 clicks.',                      mult: 2,  test: (s) => s.stats.clicks >= 500 },
  { id: 'click5k',  name: 'Callo digital',        desc: '5.000 clicks.',                    mult: 4,  test: (s) => s.stats.clicks >= 5000 },
  { id: 'surge1',   name: 'Chispazo',             desc: 'Tu primera sobrecarga.',           mult: 1,  test: (s) => s.stats.surges >= 1 },
  { id: 'surge200', name: 'Al límite',            desc: '200 sobrecargas.',                 mult: 3,  test: (s) => s.stats.surges >= 200 },
  { id: 'surge2k',  name: 'Yonqui del voltaje',   desc: '2.000 sobrecargas.',               mult: 6,  test: (s) => s.stats.surges >= 2000 },
  { id: 'stack3',   name: 'Triplete',             desc: 'Alcanza x3 de sobrecarga.',        mult: 2,  test: (s) => s.stats.maxStack >= 2 },
  { id: 'stack5',   name: 'Cuádruple mortal',     desc: 'Alcanza x5 de sobrecarga.',        mult: 5,  test: (s) => s.stats.maxStack >= 4 },
  { id: 'break1',   name: 'Cristales rotos',      desc: 'Rompe tu primera bombilla.',       mult: 1,  test: (s) => s.stats.breaks >= 1 },
  { id: 'break100', name: 'Manazas certificado',  desc: 'Rompe 100 bombillas.',             mult: 4,  test: (s) => s.stats.breaks >= 100 },
  { id: 'day1',     name: 'Primer día',           desc: 'Sobrevive a tu primer día.',       mult: 1,  test: (s) => s.stats.daysWorked >= 1 },
  { id: 'day15',    name: 'Currante',             desc: '15 días trabajados.',              mult: 3,  test: (s) => s.stats.daysWorked >= 15 },
  { id: 'day60',    name: 'El alma de la planta', desc: '60 días trabajados.',              mult: 6,  test: (s) => s.stats.daysWorked >= 60 },
  { id: 'quota5',   name: 'Cumplidor',            desc: 'Cumple la cuota 5 veces.',         mult: 2,  test: (s) => s.stats.quotasMet >= 5 },
  { id: 'quota30',  name: 'El favorito del jefe', desc: 'Cumple la cuota 30 veces.',        mult: 5,  test: (s) => s.stats.quotasMet >= 30 },
  { id: 'obj20',    name: 'Empleado del mes',     desc: 'Cumple 20 objetivos secundarios.', mult: 3,  test: (s) => s.stats.objectivesMet >= 20 },
  { id: 'promo1',   name: 'Ascendido',            desc: 'Tu primer ascenso.',               mult: 2,  test: (s) => s.stats.promotions >= 1 },
  { id: 'promo4',   name: 'Escalando',            desc: '4 ascensos.',                      mult: 5,  test: (s) => s.stats.promotions >= 4 },
  { id: 'top',      name: 'Despacho con ventana', desc: 'Llega a Dirección.',               mult: 10, test: (s) => s.rank >= 7 },
  { id: 'life2',    name: 'Segunda oportunidad',  desc: 'Empieza tu segunda vida laboral.', mult: 3,  test: (s) => s.stats.lives >= 2 },
  { id: 'jail1',    name: 'Fichado',              desc: 'Acaba en el calabozo por moroso.', mult: 2,  test: (s) => s.stats.calabozos >= 1 },
  { id: 'fired1',   name: 'RR.HH. te saluda',     desc: 'Que te despidan una vez.',         mult: 2,  test: (s) => s.stats.despidos >= 1 },
  { id: 'quit1',    name: 'Portazo digno',        desc: 'Dimite antes de que te echen.',    mult: 2,  test: (s) => s.stats.dimisiones >= 1 },
  { id: 'xp1k',     name: 'Veterano',             desc: 'Acumula 1.000 de experiencia.',    mult: 5,  test: (s) => s.stats.xpEarned >= 1000 },
  { id: 'tier9',    name: 'Forjador de soles',    desc: 'Instala una bombilla Estelar.',    mult: 8,  test: (s) => s.stats.maxTier >= 9 },
];
