// FULGOR — todo el balance del juego vive aquí. Un solo sitio que tocar para tunear.

// ---------------------------------------------------------------- bombillas
// LA ESCALERA. Se sube peldaño a peldaño: un zócalo sólo puede mejorar al nivel
// siguiente, nunca saltar. Cada peldaño da más dinero Y aguanta más encendido,
// que es lo que hace que apetezca subir.
//   base  = €/s a carga 100% sin multiplicadores
//   decay = carga perdida por segundo (1/decay = segundos que aguanta encendida)
//   cost  = lo que cuesta instalar ese nivel en un zócalo
export const TIERS = [
  { id: 'incandescente', name: 'Incandescente', base: 1,     decay: 0.167, cost: 0,       glow: '#FFB347', core: '#FFF0C2', rim: '#FF8A2B' },
  { id: 'halogena',      name: 'Halógena',      base: 4.5,   decay: 0.147, cost: 90,      glow: '#FFD98A', core: '#FFFBE8', rim: '#FFA92E' },
  { id: 'fluorescente',  name: 'Fluorescente',  base: 22,    decay: 0.130, cost: 650,     glow: '#9FF5D8', core: '#EAFFF8', rim: '#2FD6A5' },
  { id: 'led',           name: 'LED',           base: 110,   decay: 0.114, cost: 4800,    glow: '#7FD4FF', core: '#E9F8FF', rim: '#2A9BE8' },
  { id: 'xenon',         name: 'Xenón',         base: 600,   decay: 0.100, cost: 38000,   glow: '#C7B8FF', core: '#F3EFFF', rim: '#7A5CF0' },
  { id: 'neon',          name: 'Neón',          base: 3400,  decay: 0.088, cost: 310000,  glow: '#FF5FA8', core: '#FFE6F2', rim: '#E01E76' },
  { id: 'plasma',        name: 'Plasma',        base: 20000, decay: 0.077, cost: 2.6e6,   glow: '#FF7A45', core: '#FFEDE2', rim: '#E23C0B' },
  { id: 'fotonica',      name: 'Fotónica',      base: 1.3e5, decay: 0.068, cost: 2.3e7,   glow: '#3DF5FF', core: '#E2FEFF', rim: '#00B4C6' },
  { id: 'cuantica',      name: 'Cuántica',      base: 9e5,   decay: 0.060, cost: 2.0e8,   glow: '#6BFF9E', core: '#E9FFF1', rim: '#12C25C' },
  { id: 'estelar',       name: 'Estelar',       base: 7e6,   decay: 0.053, cost: 1.8e9,   glow: '#FFF3C4', core: '#FFFFFF', rim: '#FFC94A' },
];

// ---------------------------------------------------------------- núcleo
export const CORE = {
  surgeLo: 0.85,       // carga >= esto  -> SOBRECARGA (riesgo)
  sweetLo: 0.62,       // carga >= esto  -> recarga buena (sin riesgo, bonus pequeño)
  surgeTime: 4.5,      // segundos que dura la sobrecarga
  surgeCap: 2,         // stacks máximos base (x2 y x3). Avaricia lo sube con chispas
  wearBase: 0.075,     // desgaste del primer stack
  wearExp: 1.25,       // el desgaste escala stack^wearExp -> encadenar quema
  coolRate: 0.05,      // desgaste recuperado por segundo cuando no estás sobrecargado
  coolDelay: 1.2,      // segundos tras un click antes de empezar a enfriar
  sweetWear: 0.012,    // desgaste minúsculo de la banda "buena"
  clickRatio: 1.5,     // valor de click = base del tier * esto
  sweetBonus: 1.5,     // multiplicador del click en banda buena
  surgeBonus: 3,       // multiplicador del click al sobrecargar
  // Apagada NO produce. Es la regla que sostiene todo el juego: si dejas que se
  // apaguen, dejas de cobrar. (Antes había un suelo del 15% que pagaba solo.)
  dimFloor: 0,
  maxSockets: 12,
  offlineCapH: 8,      // horas máximas de acumulación offline
  offlineRate: 0.4,    // eficiencia bruta del offline antes de mejoras
  prestigeAt: 1e6,     // € totales en la partida para desbloquear Apagón
  // Forzado: compromiso permanente por zócalo. Más dinero, pero se apaga antes
  // y se desgasta más rápido. Es la decisión que se repite toda la partida.
  forzadoOut: 1.5,
  forzadoDecay: 1.12,
  forzadoWear: 1.1,
  forzadoMax: 8,
};

export const socketCost = (owned) => 45 * Math.pow(5.5, owned - 1);

// El forzado se paga en función de lo que produce ese zócalo, no en absoluto.
export const forzadoCost = (tier, level) =>
  Math.max(50, TIERS[tier].base * 90) * Math.pow(2.4, level);

// ---------------------------------------------------------------- mejoras €
// effect() devuelve el valor derivado del nivel; se consume en engine.stats()
export const UPGRADES = [
  { id: 'voltaje',    name: 'Voltaje',     desc: '+12% a todo el dinero por segundo.',            base: 25,   growth: 1.17, icon: 'bolt' },
  { id: 'filamento',  name: 'Filamento',   desc: '-3% de velocidad de apagado.',                  base: 40,   growth: 1.21, icon: 'wave' },
  { id: 'pulso',      name: 'Pulso',       desc: '+25% al dinero instantáneo de cada click.',     base: 20,   growth: 1.16, icon: 'tap' },
  { id: 'aislamiento',name: 'Aislamiento', desc: '-4% de desgaste al sobrecargar.',               base: 120,  growth: 1.25, icon: 'shield' },
  { id: 'disipador',  name: 'Disipador',   desc: '+8% de velocidad de enfriado del desgaste.',    base: 90,   growth: 1.22, icon: 'fan' },
  { id: 'reactor',    name: 'Reactor',     desc: '+0.35 s de duración de la sobrecarga.',         base: 300,  growth: 1.30, icon: 'core' },
  { id: 'cristal',    name: 'Cristal',     desc: '+6% de resistencia antes de romperse.',         base: 200,  growth: 1.26, icon: 'gem' },
  { id: 'espejo',     name: 'Espejo',      desc: '+3% de ganancias mientras no juegas (máx 100%).',base: 1500, growth: 1.40, icon: 'mirror' },
];

// ---------------------------------------------------------------- automatismos €
export const AUTOMATION = [
  {
    id: 'chispa', name: 'Chispa', max: 12, base: 500, growth: 2.3, icon: 'spark',
    desc: 'Reenciende sola la bombilla más apagada. Nunca sobrecarga: es segura.',
    detail: (l) => l ? `Cada ${(5 / (1 + 0.45 * l)).toFixed(2)} s` : 'Inactiva',
  },
  {
    id: 'tecnico', name: 'Técnico', max: 5, base: 5000, growth: 6, icon: 'wrench',
    desc: 'Repone automáticamente las bombillas rotas (si te llega el dinero).',
    detail: (l) => l ? `Repone en ${(12 / l).toFixed(1)} s` : 'Inactivo',
  },
  {
    id: 'condensador', name: 'Condensador', max: 3, base: 2e6, growth: 25, icon: 'stack',
    desc: 'Permite que la Chispa se atreva a sobrecargar, hasta cierto nivel de stacks.',
    detail: (l) => l ? `Sobrecarga hasta x${l + 1}` : 'Inactivo',
  },
];

// ---------------------------------------------------------------- consumibles €
// El precio escala con la mejor bombilla que tengas (mult ≈ segundos de producción),
// así siguen siendo relevantes en todo el juego.
export const CONSUMABLES = [
  { id: 'fusible',      name: 'Fusible',       mult: 8,  icon: 'fuse',   stack: true,
    desc: 'Evita la siguiente rotura. Se gasta al salvarte.' },
  { id: 'repuesto',     name: 'Repuesto',      mult: 6,  icon: 'bulb',   stack: true,
    desc: 'Bombilla de recambio. Se coloca sola y gratis cuando una se rompe.' },
  { id: 'refrigerante', name: 'Refrigerante',  mult: 4,  icon: 'snow',   instant: 'cool',
    desc: 'Pone a cero el desgaste de todas las bombillas.' },
  { id: 'bateria',      name: 'Batería',       mult: 3,  icon: 'battery',instant: 'charge',
    desc: 'Carga todas las bombillas al 100% al instante.' },
  { id: 'sobretension', name: 'Sobretensión',  mult: 20, icon: 'surge',  buff: { mult: 3, time: 30 },
    desc: 'x3 a todo el dinero durante 30 s.' },
  { id: 'estabilizador',name: 'Estabilizador', mult: 25, icon: 'lock',   buff: { noWear: true, time: 60 },
    desc: 'Sin desgaste durante 60 s. Sobrecarga sin miedo.' },
];

// ---------------------------------------------------------------- prestigio ⚡
export const sparksFor = (runEarned) =>
  runEarned < CORE.prestigeAt ? 0 : Math.floor(10 * Math.pow(runEarned / CORE.prestigeAt, 0.55));

export const PRESTIGE = [
  { id: 'nucleo',   name: 'Núcleo',   icon: 'core',   max: 999, base: 4, growth: 1.55,
    desc: '+25% de dinero global, para siempre.' },
  { id: 'genesis',  name: 'Génesis',  icon: 'grid',   costs: [8, 30, 120, 480, 2000],
    desc: 'Empiezas cada partida con un zócalo extra.' },
  { id: 'herencia', name: 'Herencia', icon: 'bulb',   costs: [15, 90, 500, 3000, 18000],
    desc: 'Empiezas con bombillas de un nivel superior.' },
  { id: 'memoria',  name: 'Memoria',  icon: 'coin',   max: 999, base: 6, growth: 2.2,
    desc: 'Empiezas con dinero en el bolsillo.' },
  { id: 'reflejo',  name: 'Reflejo',  icon: 'spark',  costs: [12, 60, 300, 1500],
    desc: 'Empiezas con la Chispa ya instalada.' },
  { id: 'temple',   name: 'Temple',   icon: 'shield', max: 999, base: 10, growth: 1.7,
    desc: '-8% de desgaste global.' },
  { id: 'avaricia', name: 'Avaricia', icon: 'stack',  costs: [25, 200, 1600, 12000],
    desc: '+1 al máximo de stacks de sobrecarga.' },
  { id: 'eco',      name: 'Eco',      icon: 'mirror', max: 5, base: 20, growth: 2.4,
    desc: '+20% de ganancias offline de partida.' },
];

// ---------------------------------------------------------------- logros
// Cada logro suma su `mult` (en %) al multiplicador global. test(state, stats)
export const ACHIEVEMENTS = [
  { id: 'first',    name: 'Hágase la luz',    desc: 'Enciende tu primera bombilla.',      mult: 1,  test: (s) => s.stats.clicks >= 1 },
  { id: 'click100', name: 'Dedo inquieto',    desc: '100 clicks.',                        mult: 1,  test: (s) => s.stats.clicks >= 100 },
  { id: 'click1k',  name: 'Tendinitis',       desc: '1.000 clicks.',                      mult: 2,  test: (s) => s.stats.clicks >= 1000 },
  { id: 'click10k', name: 'Máquina',          desc: '10.000 clicks.',                     mult: 4,  test: (s) => s.stats.clicks >= 10000 },
  { id: 'surge1',   name: 'Chispazo',         desc: 'Tu primera sobrecarga.',             mult: 1,  test: (s) => s.stats.surges >= 1 },
  { id: 'surge100', name: 'Al límite',        desc: '100 sobrecargas.',                   mult: 2,  test: (s) => s.stats.surges >= 100 },
  { id: 'surge2k',  name: 'Adicto al voltaje',desc: '2.000 sobrecargas.',                 mult: 5,  test: (s) => s.stats.surges >= 2000 },
  { id: 'stack3',   name: 'Triplete',         desc: 'Alcanza x3 de sobrecarga.',          mult: 2,  test: (s) => s.stats.maxStack >= 2 },
  { id: 'stack5',   name: 'Quíntuple',        desc: 'Alcanza x5 de sobrecarga.',          mult: 4,  test: (s) => s.stats.maxStack >= 4 },
  { id: 'stack7',   name: 'Fuera de escala',  desc: 'Alcanza x7 de sobrecarga.',          mult: 8,  test: (s) => s.stats.maxStack >= 6 },
  { id: 'break1',   name: 'Cristales rotos',  desc: 'Rompe tu primera bombilla.',         mult: 1,  test: (s) => s.stats.breaks >= 1 },
  { id: 'break50',  name: 'Manazas',          desc: 'Rompe 50 bombillas.',                mult: 3,  test: (s) => s.stats.breaks >= 50 },
  { id: 'break500', name: 'Vidriero',         desc: 'Rompe 500 bombillas.',               mult: 6,  test: (s) => s.stats.breaks >= 500 },
  { id: 'sock4',    name: 'Instalación',      desc: 'Ten 4 zócalos.',                     mult: 2,  test: (s) => s.sockets.length >= 4 },
  { id: 'sock8',    name: 'Nave industrial',  desc: 'Ten 8 zócalos.',                     mult: 4,  test: (s) => s.sockets.length >= 8 },
  { id: 'sock12',   name: 'Ciudad entera',    desc: 'Ten los 12 zócalos.',                mult: 8,  test: (s) => s.sockets.length >= 12 },
  { id: 'tier3',    name: 'Modernízate',      desc: 'Consigue una bombilla LED.',         mult: 2,  test: (s) => s.stats.maxTier >= 3 },
  { id: 'tier5',    name: 'Rótulo de neón',   desc: 'Consigue una bombilla de Neón.',     mult: 4,  test: (s) => s.stats.maxTier >= 5 },
  { id: 'tier7',    name: 'Física aplicada',  desc: 'Consigue una bombilla Fotónica.',    mult: 6,  test: (s) => s.stats.maxTier >= 7 },
  { id: 'tier9',    name: 'Forjador de soles',desc: 'Consigue una bombilla Estelar.',     mult: 12, test: (s) => s.stats.maxTier >= 9 },
  { id: 'earn1m',   name: 'Primer millón',    desc: 'Gana 1 M€ en total.',                mult: 2,  test: (s) => s.stats.lifeEarned >= 1e6 },
  { id: 'earn1b',   name: 'Magnate',          desc: 'Gana 1.000 M€ en total.',            mult: 5,  test: (s) => s.stats.lifeEarned >= 1e9 },
  { id: 'earn1t',   name: 'Fuera de mercado', desc: 'Gana 1 billón € en total.',          mult: 10, test: (s) => s.stats.lifeEarned >= 1e12 },
  { id: 'pres1',    name: 'Apagón',           desc: 'Reinicia por primera vez.',          mult: 3,  test: (s) => s.stats.prestiges >= 1 },
  { id: 'pres5',    name: 'Ciclo eterno',     desc: 'Reinicia 5 veces.',                  mult: 6,  test: (s) => s.stats.prestiges >= 5 },
  { id: 'pres25',   name: 'Eterno retorno',   desc: 'Reinicia 25 veces.',                 mult: 15, test: (s) => s.stats.prestiges >= 25 },
];
