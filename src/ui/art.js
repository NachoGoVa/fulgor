// Assets SVG dibujados a mano. Sin librerías, sin imágenes externas.
// Todas las bombillas comparten el lienzo 120x170: casquillo arriba, cristal abajo.
// Los colores salen de variables CSS (--glow/--core/--rim) que pone el zócalo,
// así una misma forma sirve para los 10 niveles.

// ------------------------------------------------------------ el cuelgue
// Cable + casquillo de rosca, común a todas.
const CAP = `
  <path class="wire" d="M60,0 L60,44" />
  <path class="cap" d="M50,44 h20 a3,3 0 0 1 0,6 h-20 a3,3 0 0 1 0,-6 z" />
  <path class="cap" d="M50,51 h20 a3,3 0 0 1 0,6 h-20 a3,3 0 0 1 0,-6 z" />
  <path class="cap-neck" d="M52,57 h16 v5 h-16 z" />`;

// Cada entrada: silueta del cristal + el "alma" que brilla con la carga.
const SHAPES = [
  { // 0 · Incandescente — la pera de toda la vida
    glass: 'M48,62 v6 c0,6 -16,12 -16,32 c0,18 13,31 28,31 c15,0 28,-13 28,-31 c0,-20 -16,-26 -16,-32 v-6 z',
    core: `<path class="core-stroke thin" d="M50,74 v12 M70,74 v12" />
           <path class="core-stroke" d="M50,85 l3.3,11 l3.3,-13 l3.3,13 l3.3,-13 l3.3,13 l3.3,-11" />`,
  },
  { // 1 · Halógena — cápsula dentro de un reflector
    glass: 'M46,62 v8 L30,124 a4,4 0 0 0 4,5 h52 a4,4 0 0 0 4,-5 L74,70 v-8 z',
    core: `<rect class="core-fill" x="53" y="84" width="14" height="26" rx="7" />
           <path class="core-stroke" d="M60,90 v14" />`,
  },
  { // 2 · Fluorescente — el tubo enroscado de bajo consumo
    glass: '',
    core: `<path class="core-tube" d="M40,64 v46 a10,10 0 0 0 20,0 v-38 a10,10 0 0 1 20,0 v46" />`,
    tube: true,
  },
  { // 3 · LED — disipador con aletas y difusor mate
    glass: 'M36,92 a24,24 0 0 0 48,0 z',
    core: `<path class="core-fill" d="M50,86 h20 v8 h-20 z" />
           <path class="core-stroke" d="M46,100 h28 M50,108 h20" />`,
    pre: `<path class="heatsink" d="M44,62 h32 l8,30 h-48 z" />
          <path class="fins" d="M46,70 h28 M45,78 h30 M44,86 h32" />`,
  },
  { // 4 · Xenón — tubo de cuarzo con arco entre electrodos
    glass: 'M44,64 h32 a8,8 0 0 1 8,8 v48 a8,8 0 0 1 -8,8 h-32 a8,8 0 0 1 -8,-8 v-48 a8,8 0 0 1 8,-8 z',
    core: `<path class="core-fill" d="M54,72 h12 l-4,16 h-4 z M54,120 h12 l-4,-16 h-4 z" />
           <ellipse class="core-fill arc" cx="60" cy="96" rx="9" ry="12" />`,
  },
  { // 5 · Neón — tubo de vidrio doblado a mano
    glass: '',
    core: `<path class="core-tube" d="M44,66 C22,84 24,118 46,126 C70,134 90,114 84,96 C79,82 60,80 56,94 C53,104 64,112 71,105" />`,
    tube: true,
  },
  { // 6 · Plasma — globo con filamentos eléctricos
    glass: 'M60,64 a32,32 0 1 0 0.01,0 z',
    core: `<circle class="core-fill" cx="60" cy="96" r="7" />
           <path class="core-stroke tendril" d="M60,96 l-14,-18 l-6,8 M60,96 l18,-14 l2,9
             M60,96 l-20,10 l-5,-6 M60,96 l14,18 l7,-6 M60,96 l-6,22 l-8,-3" />`,
  },
  { // 7 · Fotónica — prisma hexagonal que proyecta el haz
    glass: 'M60,62 L88,78 L88,112 L60,128 L32,112 L32,78 z',
    core: `<path class="core-fill" d="M60,76 L76,86 L76,106 L60,116 L44,106 L44,86 z" />
           <path class="core-stroke" d="M60,62 v14 M88,78 L76,86 M88,112 L76,106
             M60,128 v-12 M32,112 L44,106 M32,78 L44,86" />`,
  },
  { // 8 · Cuántica — toroide con una partícula en órbita
    glass: 'M60,64 a32,32 0 1 0 0.01,0 z M60,82 a14,14 0 1 1 -0.01,0 z',
    core: `<ellipse class="core-stroke orbit" cx="60" cy="96" rx="30" ry="11" />
           <ellipse class="core-stroke orbit" cx="60" cy="96" rx="11" ry="30" />
           <circle class="core-fill spin" cx="60" cy="66" r="5" />`,
  },
  { // 9 · Estelar — ya no es una bombilla, es una estrella
    glass: 'M60,60 L69,86 L96,96 L69,106 L60,132 L51,106 L24,96 L51,86 z',
    core: `<circle class="core-fill" cx="60" cy="96" r="13" />
           <path class="core-stroke ray" d="M60,72 v-10 M60,120 v10 M36,96 h-10 M84,96 h10
             M43,79 l-7,-7 M77,113 l7,7 M77,79 l7,-7 M43,113 l-7,7" />`,
  },
];

// Grietas que van apareciendo con el desgaste. Tres tramos, se revelan por fases.
const CRACKS = [
  'M60,74 l-7,14 l6,5 l-9,13',
  'M76,86 l-11,9 l7,8 l-13,10',
  'M42,96 l12,6 l-6,9 l11,7',
];

/** SVG completo de una bombilla del nivel `tier`. */
export function bulbSvg(tier) {
  const sh = SHAPES[tier] || SHAPES[0];
  return `<svg class="bulb-svg" viewBox="0 0 120 170" aria-hidden="true">
    ${CAP}
    ${sh.pre || ''}
    ${sh.glass ? `<path class="glass" d="${sh.glass}" />` : ''}
    <g class="core">${sh.core}</g>
    ${sh.glass ? `<path class="glass-shine" d="${sh.glass}" />` : ''}
    <g class="cracks">
      ${CRACKS.map((d, i) => `<path class="crack crack-${i}" d="${d}" />`).join('')}
    </g>
  </svg>`;
}

/** Cristales rotos: lo que queda en el zócalo cuando la fuerzas de más. */
export function brokenSvg() {
  return `<svg class="bulb-svg broken" viewBox="0 0 120 170" aria-hidden="true">
    ${CAP}
    <path class="shard" d="M48,62 v6 c0,5 -9,8 -13,17 l10,4 l-4,10 l9,2" />
    <path class="shard" d="M72,62 v6 c0,5 9,8 13,17 l-11,3 l5,9 l-8,3" />
    <path class="shard" d="M55,70 l4,12 l-6,6 l8,4" />
    <path class="dust" d="M40,124 l5,-6 M80,122 l-6,-5 M50,134 l7,-4 M74,133 l-5,-6" />
    <path class="plus" d="M60,104 v20 M50,114 h20" />
  </svg>`;
}

/** Zócalo vacío, a la espera de que compres bombilla. */
export function emptySvg() {
  return `<svg class="bulb-svg empty" viewBox="0 0 120 170" aria-hidden="true">
    ${CAP}
    <path class="socket-hole" d="M48,62 h24 v10 a12,12 0 0 1 -24,0 z" />
    <path class="plus" d="M60,88 v22 M49,99 h22" />
  </svg>`;
}

// ------------------------------------------------------------- iconos
// Trazo de 24x24, todos con el mismo peso para que la interfaz sea coherente.
const I = {
  bolt:    'M13 2 L4 14h6l-1 8 9-12h-6z',
  wave:    'M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0',
  tap:     'M9 3v9M9 12l-3 3 5 6 7-3-1-7-3-1-2-2z',
  shield:  'M12 2l8 4v6c0 5-4 8-8 10-4-2-8-5-8-10V6z',
  fan:     'M12 12c0-5 8-5 8 0M12 12c4 3 0 9-4 6M12 12c-4-3 0-9 4-6M12 12c0 5-8 5-8 0',
  core:    'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8z',
  gem:     'M6 3h12l4 6-10 12L2 9z M6 3l4 6M18 3l-4 6M2 9h20',
  mirror:  'M12 2v20M12 5L5 12l7 7M12 5l7 7-7 7',
  spark:   'M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5L19 19M19 5l-3.5 3.5M8.5 15.5L5 19',
  wrench:  'M15 3a5 5 0 00-4 8L3 19l2 2 8-8a5 5 0 004-10l-3 3-2-2z',
  stack:   'M12 3l9 5-9 5-9-5z M3 13l9 5 9-5 M3 17l9 5 9-5',
  fuse:    'M4 12h4l2-5 4 10 2-5h4 M7 8v8M17 8v8',
  bulb:    'M12 2a6 6 0 00-4 10.5V16h8v-3.5A6 6 0 0012 2z M9 19h6M10 22h4',
  snow:    'M12 2v20M3 7l18 10M21 7L3 17 M12 6l-3-3M12 6l3-3M12 18l-3 3M12 18l3 3',
  battery: 'M3 8h14v8H3z M17 11h3v2h-3z M6 10v4M9 10v4M12 10v4',
  surge:   'M2 18l5-9 4 5 3-8 4 12 4-6',
  lock:    'M6 11V8a6 6 0 1112 0v3 M4 11h16v10H4z M12 15v3',
  grid:    'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  coin:    'M12 3a9 5 0 100 10 9 5 0 000-10z M3 8v8c0 2.8 4 5 9 5s9-2.2 9-5V8',
  trophy:  'M7 4h10v6a5 5 0 01-10 0z M7 6H4v2a3 3 0 003 3 M17 6h3v2a3 3 0 01-3 3 M10 15h4v5h-4z M8 20h8',
  power:   'M12 3v9 M6.5 6.5a8 8 0 1011 0',
  clock:   'M12 3a9 9 0 100 18 9 9 0 000-18z M12 7v5l4 2',
};

export function icon(name, cls = '') {
  const d = I[name] || I.bolt;
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${
    d.split(' M').map((seg, i) => `<path d="${i ? 'M' + seg : seg}" />`).join('')
  }</svg>`;
}

/** Logotipo del juego para la cabecera. */
export function logoSvg() {
  return `<svg class="logo" viewBox="0 0 34 34" aria-hidden="true">
    <defs>
      <radialGradient id="lg" cx="50%" cy="42%" r="55%">
        <stop offset="0%" stop-color="#FFF3C4" />
        <stop offset="55%" stop-color="#FFC94A" />
        <stop offset="100%" stop-color="#FF7A2B" stop-opacity="0" />
      </radialGradient>
    </defs>
    <circle cx="17" cy="15" r="14" fill="url(#lg)" />
    <path d="M11,10 c0,-5 12,-5 12,0 c0,4 -4,5 -4,9 h-4 c0,-4 -4,-5 -4,-9 z"
          fill="none" stroke="#FFF3C4" stroke-width="2" stroke-linejoin="round" />
    <path d="M14,24 h6 M15,28 h4" fill="none" stroke="#FFC94A"
          stroke-width="2" stroke-linecap="round" />
  </svg>`;
}
