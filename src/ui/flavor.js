// El humor del juego vive aquí. El owner pidió «mucho humor» — pues mucho humor.
// Cada línea sabe QUIÉN la dice y CON QUÉ CARA, para que `characters.js` la pinte.
// Formato de diálogo: [quién, texto, humor].

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ------------------------------------------------- al fichar, por la mañana
export const JEFE_MANANA = [
  ['jefe', 'Las bombillas no se encienden solas. Bueno, sí, pero tú me entiendes.', 'neutral'],
  ['jefe', 'Mi abuela sobrecargaba mejor. Y en paz descanse: fue por una sobrecarga.', 'smug'],
  ['jefe', 'La cuota de hoy es un regalo. Mañana ya veremos.', 'smug'],
  ['jefe', 'Te veo. No siempre. Justo cuando paras.', 'angry'],
  ['jefe', 'El de antes que tú duró tres días. Sin presión.', 'neutral'],
  ['jefe', 'Hoy viene mi cuñado a ver la planta. Que brille TODO.', 'angry'],
  ['paco', 'Chaval, el truco es no mirar el reloj. Yo llevo así catorce años.', 'neutral'],
  ['paco', 'Si oyes un chasquido, no era nada. Nunca es nada.', 'smug'],
  ['paco', 'En mis tiempos las bombillas eran de verdad. Y los cafés, gratis.', 'worried'],
  ['vane', '¿Tú también has firmado el contrato sin leerlo? Qué fuerte, yo igual.', 'happy'],
  ['vane', 'Me han dicho que si cumples la cuota te dan bizcocho. Llevo dos semanas.', 'happy'],
  ['rrhh', 'Recuerda: aquí somos una gran familia. Una familia con cuotas.', 'happy'],
  ['rrhh', 'He puesto un cartel motivacional en el pasillo. De nada.', 'happy'],
];

// ------------------------------------------------- comentarios de la paga
export const PAGA_BIEN = [
  ['jefe', 'Bien. No lo repitas mucho, que luego me acostumbro.', 'happy'],
  ['jefe', 'Nómina completa. Enmárcala, que no siempre pasa.', 'smug'],
  ['paco', 'Ese es mi chaval. Hoy invito yo al café de máquina.', 'happy'],
  ['vane', '¡¿Cómo lo has hecho?! A mí se me apagan solo mirarlas.', 'happy'],
  ['rrhh', 'Te he apuntado como «empleado prometedor». En un post-it, pero cuenta.', 'happy'],
];
export const PAGA_REGULAR = [
  ['jefe', 'Ha mirado el parte. Luego a ti. Luego el parte. No ha dicho nada.', 'neutral'],
  ['jefe', 'No está mal. Y viniendo de mí, eso casi es un abrazo.', 'neutral'],
  ['paco', 'Tranquilo. Hay días que la luz no quiere. Pasa.', 'neutral'],
  ['rrhh', '«Margen de mejora» es como lo llamamos aquí. Suena mejor, ¿verdad?', 'happy'],
];
export const PAGA_MAL = [
  ['jefe', 'He suspirado tan fuerte que ha parpadeado la nave entera.', 'angry'],
  ['jefe', 'Hoy has producido menos que la expendedora. Y está desenchufada.', 'angry'],
  ['rrhh', '¿Cómo estás? No, en serio. Es una pregunta del protocolo.', 'worried'],
  ['paco', 'No te preocupes. Preocúpate mañana, que hoy ya está.', 'worried'],
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
  'Se ha oído desde administración.',
  'El cristal se barre. La vergüenza no.',
  'La has mirado demasiado fuerte.',
];

// ------------------------------------------------- momentos con guion
export const BECARIO_FIN = [
  ['jefe', 'Se acabó el periodo de prácticas. Te retiro la bombilla reforzada.<br>' +
           'A partir de hoy, lo que rompas <b>lo pagas tú</b>. Bienvenido a la empresa.', 'smug'],
];
export const BECARIO_SALVA = [
  ['paco', 'Tranqui, esa es la reforzada de prácticas. Aguanta hasta un martillo.', 'happy'],
  ['vane', '¡Yo he reventado tres! Bueno… reventaría, si no fuera la de becario.', 'happy'],
];
export const SOBRECARGA_NUEVA = [
  ['jefe', 'Firma aquí. Ya puedes forzar el voltaje.<br>Si revienta, tú verás. Yo no he dicho nada.', 'smug'],
];
export const PRIMERA_ROTURA = [
  ['jefe', '¡PUM! Ahí van seis euros de la empresa. Y de tu nómina, ya de paso.', 'angry'],
];
export const DEUDA = [
  ['casero', 'Que soy yo, Braulio. Del piso. Lo del alquiler… ¿lo hablamos hoy o lo hablamos <i>hoy</i>?', 'smug'],
  ['casero', 'Mira, yo soy muy comprensivo. Hasta que dejo de serlo.', 'angry'],
];

// ------------------------------------------------- finales de vida
export const CALABOZO_TXT = [
  ['casero', 'Yo te avisé. Dos veces. Bueno, una vez y un mensaje de voz muy largo.<br>' +
             'Ahora amaneces en el calabozo, con un compañero que ronca en morse. ' +
             'Al salir no te guardan el puesto… pero lo aprendido se viene contigo.', 'smug'],
];
export const DESPIDO_TXT = [
  ['rrhh', 'Siéntate. ¿Ves esa caja de cartón? Es para tus cosas.<br>' +
           '«La empresa evoluciona hacia otro perfil.» El perfil de alguien que cumpla la cuota.', 'happy'],
  ['jefe', 'No es por ti. Es por los números. Que son por ti, pero no lo digo.', 'angry'],
];
export const DIMISION_TXT = [
  ['tu', 'Dejas la carta encima de la mesa, giras sobre los talones y sales andando<br>' +
         'despacio, como en las películas. Nadie aplaude. Pero casi.', 'smug'],
  ['tu', '«Me voy a una empresa que valore mi talento.» No existe. Pero el portazo<br>' +
         'ha sonado de maravilla, y el finiquito mejor.', 'happy'],
];
export const ASCENSO_TXT = [
  ['jefe', 'Te doy la mano. Es la primera vez que me ves las dos cejas relajadas.', 'happy'],
  ['rrhh', '¡Ascenso! Hay bizcocho en la sala de descanso. Del Mercadona, pero bizcocho.', 'happy'],
  ['paco', 'Ascendido, ¿eh? Que no se te suba. Bueno, súbetelo un poco. Te lo has ganado.', 'happy'],
  ['vane', '¡Qué envidia sana! Sana del todo no, pero sana.', 'happy'],
];

// ------------------------------------------------- objetivos, con gracia
export const OBJETIVO_DESC = {
  roturas: (t) => `Rompe como mucho ${t} bombilla${t === 1 ? '' : 's'} — «esto no es un festival»`,
  surges: (t) => `Sobrecarga ${t} veces — «con arte, no a lo loco»`,
  sweet: (t) => `${t} clicks en banda buena — pulso de cirujano`,
  final: () => 'Ficha la salida con todas encendidas — que se vea desde la autovía',
};
export const OBJETIVO_CORTO = {
  roturas: (t) => `≤${t} roturas`,
  surges: (t) => `${t} sobrecargas`,
  sweet: (t) => `${t} banda buena`,
  final: () => 'todas encendidas',
};

export const FICHAR_BTN = ['A fichar', 'Al tajo', 'Vamos allá', 'Otro día más'];
export const CALABOZO_AVISO = 'El Sr. Braulio ha dejado de sonreír. Paga o calabozo.';
