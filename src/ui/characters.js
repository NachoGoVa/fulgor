// La plantilla de Lumínicas Paquita e Hijos, S.L. — retratos SVG dibujados a mano.
// Todos comparten lienzo 100x100 y la misma gramática: cabeza + pelo + rasgos,
// y las CEJAS y la BOCA cambian según el humor. Así cinco personajes × cuatro
// estados salen de una sola geometría por cara.

const SKIN = { pale: '#F0C9A8', tan: '#D9A579', ruddy: '#E8B48C' };

// --- rasgos que cambian con el humor (compartidos por todos) ---
const BROWS = {
  neutral: 'M30,38 h13 M57,38 h13',
  happy:   'M30,37 q6.5,-4 13,0 M57,37 q6.5,-4 13,0',
  angry:   'M30,34 l13,6 M70,34 l-13,6',
  worried: 'M30,40 l13,-5 M70,40 l-13,-5',
  smug:    'M30,39 h13 M57,33 l13,5',
};
const MOUTHS = {
  neutral: 'M38,72 h24',
  happy:   'M36,68 q14,13 28,0',
  angry:   'M37,76 q13,-11 26,0',
  worried: 'M38,75 q12,-7 24,0 M38,75 q12,7 24,0',
  smug:    'M37,71 q14,7 26,-4',
};

const face = (skin, extra, mood, opts = {}) => `
  <svg class="face" viewBox="0 0 100 100" aria-hidden="true">
    ${extra.behind || ''}
    <ellipse class="head" cx="50" cy="56" rx="32" ry="35" fill="${skin}"/>
    ${extra.front || ''}
    <path class="brow" d="${BROWS[mood] || BROWS.neutral}"/>
    <circle class="eye" cx="37" cy="50" r="${opts.eye || 4}"/>
    <circle class="eye" cx="63" cy="50" r="${opts.eye || 4}"/>
    <path class="mouth" d="${MOUTHS[mood] || MOUTHS.neutral}"/>
    ${extra.over || ''}
  </svg>`;

// ------------------------------------------------------------- la plantilla
export const CAST = {
  // Don Fulgencio — el jefe. Calvo, bigotón, cuello apretado por la corbata.
  jefe: {
    name: 'Don Fulgencio', role: 'Jefe de planta', color: '#FF7A45',
    draw: (mood) => face(SKIN.ruddy, {
      behind: `<path d="M18,52 q0,-30 32,-30 q32,0 32,30 q-6,-14 -32,-14 q-26,0 -32,14z" fill="#8A8F99" opacity=".25"/>`,
      front: `<path class="hair" d="M20,44 q4,-9 11,-11 M80,44 q-4,-9 -11,-11" />`,
      over: `<path class="stache" d="M36,78 q14,9 28,0 q-14,4 -28,0z" fill="#5A5148"/>
             <path class="tie" d="M50,90 l-7,4 3,7 h8 l3,-7z" fill="#B4252A"/>
             <path class="collar" d="M34,88 l16,6 16,-6" fill="none" stroke="#E8EEFF" stroke-width="3"/>`,
    }, mood),
  },
  // Charo — RR.HH. Moño, gafas, sonrisa de manual y acreditación colgada.
  rrhh: {
    name: 'Charo', role: 'Recursos Humanos', color: '#C7B8FF',
    draw: (mood) => face(SKIN.pale, {
      behind: `<circle cx="50" cy="18" r="11" fill="#6B4A3A"/>`,
      front: `<path class="hair" d="M16,54 q2,-34 34,-34 q32,0 34,34 q-8,-24 -34,-24 q-26,0 -34,24z" fill="#6B4A3A"/>`,
      over: `<g class="glasses" fill="none" stroke="#2E3F66" stroke-width="2.5">
               <circle cx="37" cy="50" r="10"/><circle cx="63" cy="50" r="10"/>
               <path d="M47,50 h6 M27,48 l-6,-3 M73,48 l6,-3"/>
             </g>
             <path d="M38,88 l12,10 12,-10" fill="none" stroke="#3DF5FF" stroke-width="2.5"/>
             <rect x="44" y="94" width="12" height="9" rx="1.5" fill="#3DF5FF"/>`,
    }, mood),
  },
  // Paco — el veterano. Gorra, barba de tres días, mirada de haberlo visto todo.
  paco: {
    name: 'Paco', role: 'Veterano de la nave B', color: '#4ADE9B',
    draw: (mood) => face(SKIN.tan, {
      front: `<path class="cap" d="M15,42 q3,-24 35,-24 q32,0 35,24 z" fill="#2F5D46"/>
              <path class="cap" d="M13,42 q37,-7 74,0 q2,6 -3,7 q-34,-6 -68,0 q-5,-1 -3,-7z" fill="#244836"/>`,
      over: `<path d="M32,66 q18,22 36,0 q-6,20 -18,21 q-12,-1 -18,-21z" fill="#4A4038" opacity=".45"/>
             <path d="M78,70 l12,-3" stroke="#E8EEFF" stroke-width="3" stroke-linecap="round"/>
             <circle cx="91" cy="66.5" r="2.5" fill="#FF7A45"/>`,
    }, mood),
  },
  // Vane — la otra becaria. Coleta alta, cascos, ojos como platos.
  vane: {
    name: 'Vane', role: 'Becaria, como tú', color: '#FF5FA8',
    draw: (mood) => face(SKIN.pale, {
      behind: `<path d="M74,26 q16,-10 14,-22 q8,16 -6,28z" fill="#3A2E4A"/>`,
      front: `<path class="hair" d="M17,52 q1,-32 33,-32 q32,0 33,32 q-9,-22 -33,-22 q-24,0 -33,22z" fill="#3A2E4A"/>`,
      over: `<g stroke="#FF5FA8" stroke-width="3.5" fill="none">
               <path d="M17,52 q-5,-24 33,-24 q38,0 33,24"/>
             </g>
             <rect x="10" y="48" width="9" height="15" rx="4.5" fill="#FF5FA8"/>
             <rect x="81" y="48" width="9" height="15" rx="4.5" fill="#FF5FA8"/>`,
    }, mood, { eye: 5 }),
  },
  // Sr. Braulio — el casero. Peinado imposible, sonrisa de cobrador.
  casero: {
    name: 'Sr. Braulio', role: 'Tu casero', color: '#FFC94A',
    draw: (mood) => face(SKIN.pale, {
      front: `<path class="hair" d="M18,42 q6,-16 32,-16 q10,0 16,4 q-22,-1 -30,6 q10,-2 22,1 q-26,2 -40,5z" fill="#9A9186"/>`,
      over: `<path d="M40,84 q10,6 20,0" fill="none" stroke="#7A6A55" stroke-width="2"/>
             <rect x="47" y="66" width="4" height="5" fill="#FFC94A"/>`,
    }, mood, { eye: 3.5 }),
  },
  // Tú. Casco de obra, sin cara definida: eres quien lo lleve puesto.
  tu: {
    name: 'Tú', role: 'Operario', color: '#3DF5FF',
    draw: (mood) => face(SKIN.tan, {
      front: `<path class="helmet" d="M15,46 q2,-28 35,-28 q33,0 35,28 z" fill="#FFC94A"/>
              <path d="M12,46 q38,-8 76,0 q1,6 -4,6 q-34,-6 -68,0 q-5,0 -4,-6z" fill="#E0A81F"/>
              <path d="M50,18 v28" stroke="#E0A81F" stroke-width="3"/>`,
    }, mood),
  },
};

/** Retrato listo para pegar. `mood`: neutral · happy · angry · worried · smug */
export function portrait(who, mood = 'neutral') {
  const c = CAST[who] || CAST.jefe;
  return `<div class="portrait" style="--who:${c.color}" data-who="${who}">
    ${c.draw(mood)}
  </div>`;
}

/** Bocadillo de diálogo completo: retrato + nombre + réplica. */
export function speech(who, text, mood = 'neutral') {
  const c = CAST[who] || CAST.jefe;
  return `<div class="speech" style="--who:${c.color}">
    ${portrait(who, mood)}
    <div class="bubble">
      <b>${c.name}</b><small>${c.role}</small>
      <p>${text}</p>
    </div>
  </div>`;
}
