// El humor del juego vive aquí. El owner pidió «mucho humor» — pues mucho humor.
// Lumínicas Paquita e Hijos, S.L.: Don Fulgencio (el jefe), el Sr. Braulio (el
// casero) y tú, que solo querías llegar a fin de mes.

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ------------------------------------------------- el jefe, por la mañana
export const JEFE_MANANA = [
  '«Las bombillas no se encienden solas. Bueno, sí, pero tú me entiendes.» — Don Fulgencio',
  '«Mi abuela sobrecargaba mejor, y en paz descanse: fue por una sobrecarga.» — Don Fulgencio',
  '«La cuota de hoy es un regalo. Mañana ya veremos.» — Don Fulgencio',
  '«Te veo. No siempre, pero justo cuando paras.» — Don Fulgencio',
  '«El de antes que tú duró tres días. Sin presión.» — Don Fulgencio',
  '«¿Cansado? La luz tampoco descansa. Piénsalo.» — Don Fulgencio',
  '«Cada bombilla rota me duele a mí. En tu nómina, pero a mí.» — Don Fulgencio',
  '«Hoy viene mi cuñado a ver la planta. Que brille TODO.» — Don Fulgencio',
];

// ------------------------------------------------- comentarios de la paga
export const PAGA_BIEN = [
  'Don Fulgencio ha sonreído. Los presentes lo describen como «inquietante».',
  'Nómina completa. Enmárcala, que no siempre pasa.',
  'Hoy hasta la máquina de café te ha funcionado a la primera.',
  '«Sigue así y llegarás lejos. A la nave B, pero lejos.»',
];
export const PAGA_REGULAR = [
  'Don Fulgencio ha mirado el parte, luego a ti, luego el parte. No ha dicho nada.',
  'Nómina recortada. El bar de abajo acepta fiado, dicen.',
  '«No está mal» — y viniendo de él, eso casi es un abrazo.',
];
export const PAGA_MAL = [
  'Don Fulgencio ha suspirado tan fuerte que ha parpadeado la nave entera.',
  'RR.HH. ha preguntado «cómo estás». Nunca preguntan cómo estás.',
  'Hoy has producido menos que la máquina expendedora. Y está desenchufada.',
];

// ------------------------------------------------- facturas con nombre
export const COMIDA = [
  'Menú del día: fabada de gasolinera',
  'Tupper heredado de tu madre',
  'Bocadillo de algo que fue chorizo',
  'Menú «sorpresa» del bar de Mari',
  'Sopa de sobre, sabor a sobre',
  'Arroz de ayer, técnica ancestral',
];
export const ALQUILER = [
  'Alquiler del zulo — Sr. Braulio',
  'Renta del piso «con encanto» (gotera incluida)',
  'Alquiler: el Sr. Braulio ha llamado dos veces',
];

// ------------------------------------------------- roturas
export const ROTURA = [
  'Eso va a la nómina, campeón.',
  'Don Fulgencio lo ha oído desde su despacho.',
  '«¿Otra? ¿OTRA?» — se oye desde administración.',
  'El cristal se barre, la vergüenza no.',
  'La has mirado demasiado fuerte.',
];

// ------------------------------------------------- objetivos, con gracia
export const OBJETIVO_DESC = {
  roturas: (t) => `Rompe como mucho ${t} bombilla${t === 1 ? '' : 's'} — «esto no es un festival» (D.F.)`,
  surges: (t) => `Sobrecarga ${t} veces — «con arte, no a lo loco» (D.F.)`,
  sweet: (t) => `${t} clicks en banda buena — pulso de cirujano`,
  final: () => 'Ficha la salida con todas encendidas — que se vea desde la autovía',
};
export const OBJETIVO_CORTO = {
  roturas: (t) => `≤${t} roturas`,
  surges: (t) => `${t} sobrecargas`,
  sweet: (t) => `${t} banda buena`,
  final: () => 'todas encendidas',
};

// ------------------------------------------------- finales de vida
export const CALABOZO_TXT = [
  'El Sr. Braulio ha llamado a quien tenía que llamar. Amaneces en el calabozo con ' +
  'un compañero de celda que ronca en morse. Al salir, nadie te guarda el puesto… ' +
  'pero la experiencia se viene contigo.',
  'Impago, juicio exprés y calabozo. En el calabozo la luz es fluorescente y parpadea: ' +
  'tortura personalizada. Sales con lo puesto y con todo lo aprendido.',
];
export const DESPIDO_TXT = [
  'Don Fulgencio te cita en el despacho. Hay una caja de cartón encima de la mesa. ' +
  'Ya sabes cómo acaba esto: la caja es para tus cosas, la experiencia va aparte.',
  'RR.HH. te dedica una sonrisa de manual y una palmadita. «La empresa evoluciona ' +
  'hacia otro perfil.» El perfil de alguien que cumpla la cuota, se entiende.',
];
export const DIMISION_TXT = [
  'Dejas la carta encima de la mesa de Don Fulgencio, giras sobre los talones y ' +
  'sales andando despacio, como en las películas. Nadie aplaude, pero casi.',
  '«Me voy a una empresa que valore mi talento.» No existe tal empresa, pero el ' +
  'portazo ha sonado de maravilla — y el finiquito, mejor.',
];
export const ASCENSO_TXT = [
  '¡Ascenso! Don Fulgencio te da la mano. Es la primera vez que le ves las dos cejas relajadas.',
  '¡Ascenso! Hay bizcocho en la sala de descanso. Del Mercadona, pero bizcocho.',
  '¡Ascenso! Tu madre ya se lo ha contado a todo el bloque.',
];

// ------------------------------------------------- varios
export const FICHAR_BTN = ['A fichar', 'Al tajo', 'Vamos allá', 'Otro día más'];
export const CALABOZO_AVISO = 'El Sr. Braulio ha dejado de sonreír. Paga o calabozo.';
