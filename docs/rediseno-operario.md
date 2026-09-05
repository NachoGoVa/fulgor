# FULGOR v2 — «El operario» · diseño

> **Estado:** vigente · **Verificado:** sin verificar · última edición 2026-08-01

> Estado: **implementado** (Fase 1 + carrera + vidas + XP; ver §12 con las decisiones finales).
> Origen: idea del owner (1-ago-2026) — replantear el juego como un trabajador de una
> fábrica de luz, con días laborales, nómina por objetivos, roturas que se descuentan
> del sueldo, cuenta bancaria y gastos de hogar/vida.

## 0 · Decisiones del owner (1-ago-2026) — lo que cambió sobre la propuesta

1. **Turno de 2,5 min** (no 6-8): «más dinámico». → `CORE.shift = 150`.
2. **Deuda con interés Y sistema de vidas**: impago desbocado = calabozo, bajo rendimiento
   sostenido = despido, y dimisión voluntaria. Cada final reinicia la vida conservando la
   **experiencia (XP)**, canjeable por habilidades permanentes. *Esto convirtió el fracaso
   en el prestigio del juego* — mejor que el diseño original.
3. **Días encadenables sin límite**: sí.
4. **Reemplazo total** del juego v1 (taggeado `v1` en git).
5. **Mucho humor** → `src/ui/flavor.js` (Don Fulgencio, el Sr. Braulio, facturas con nombre).

Cambios de balance tras simular carreras de 40 días (bots vago/activo/agresivo):
`wearBase` 0.075→0.105 (el agresivo acababa con 0 roturas: el riesgo no mordía) y
`promoteDays` +1 en todos los rangos (la carrera completa pasó de ~70 a ~95 min).

---

## 1 · Diagnóstico del juego actual

Antes de valorar el cambio, dónde está el juego hoy, por horizonte temporal:

| Horizonte | Estado | Detalle |
|---|---|---|
| Momento a momento | ✅ fuerte | Las tres bandas de click y la sobrecarga acumulable dan una decisión real cada 2-3 segundos. Es la parte buena del juego y no hay que tocarla. |
| Media partida (minutos) | ⚠️ flojo | Entre compra y compra no hay nada que decidir: esperas a que el contador llegue al precio. Es el defecto clásico del género. |
| Larga partida (días) | ⚠️ flojo | El prestigio existe pero la motivación es fina: no hay razón concreta para *volver mañana*. El contenido es finito (12 zócalos × 10 niveles) y los multiplicadores crecen sin que crezca el juego. |
| Economía | ❌ el agujero | El dinero **solo sube**. No hay sumideros obligatorios, así que no hay tensión: toda compra es cuestión de esperar. Y el fallo grave: en cuanto tu producción crece, **reponer una bombilla rota cuesta calderilla** comparado con lo que ingresas → la sobrecarga, la mecánica central, pierde los dientes a los 20 minutos. El riesgo deja de ser riesgo. |

Nota de identidad: desde el ajuste de balance (`dimFloor = 0`, apagada no produce),
FULGOR **ya no es un idle puro** — es un arcade activo con capa incremental. La propuesta
del operario no traiciona el juego: asume del todo lo que ya es.

## 2 · Valoración de la propuesta

**Sí, y por una razón concreta: arregla de raíz el mayor defecto del juego actual.**

Si las roturas se descuentan de la nómina, la sobrecarga vuelve a doler *siempre*, a
cualquier nivel de progresión — porque el descuento escala con tu maquinaria pero tu
nómina está acotada. La mecánica central recupera los dientes de forma permanente, sin
parches de balance.

Además:

1. **El día laboral da estructura de sesión.** Objetivos del día = metas a corto plazo;
   nómina al fichar = cierre con dopamina y un punto natural para dejarlo. Y una razón
   concreta para volver mañana. Es lo que le faltaba a la media y larga partida.
2. **Facturas = el sumidero que no había.** Con gastos obligatorios el dinero por fin
   *sale*, y aparece la decisión que da título al encargo: ¿mejora laboral o alquiler?
   Escasez real en la primera semana, gestión después.
3. **La nómina acota la inflación.** Hoy el dinero te entra directo del click y explota;
   con sueldo, la tasa de ingreso la controla el diseño, no el spam. Balancear se vuelve
   mucho más fácil.
4. **Tema redondo.** Fábrica de luz, fichar, cuota, nómina, casero. Todo lo que ya existe
   encaja sin forzar: la escalera de bombillas es tu maquinaria, la tienda es el economato,
   la Chispa es un ayudante.

**El peligro** (uno serio): convertir un juego cómodo en un simulador de agobios. Un
incremental vive de que *siempre* vas a más; un bucle de supervivencia con facturas puede
producir espirales de derrota y frustración. Todo el diseño de abajo está pensado para
que la presión exista pero **la ruina sea imposible por construcción** (§8).

## 3 · Los tres bucles

```
TURNO (segundos)      el juego actual: cargas, bandas, sobrecarga, desgaste
   └─► DÍA (6-8 min)  cuota + objetivos → nómina → facturas → saldo
          └─► CARRERA (semanas)  ascensos → zona nueva de la fábrica → …
                                 … → comprar la fábrica (prestigio)
```

El bucle de turno **no se toca**: es lo que funciona.

## 4 · El día laboral

- Un día = un turno de **6-8 minutos reales** con reloj visible (se ficha al entrar).
- El día se puede **encadenar**: acabas uno, empiezas el siguiente. «Sesión = día» es la
  intención de diseño, no una imposición — si sales a mitad de turno, se guarda y el día
  continúa al volver. Nunca se castiga cerrar el juego.
- Entre día y día, la **pantalla de cierre**: producción vs cuota, nómina desglosada,
  facturas cobradas, saldo. Es el «guardado mental» del jugador.
- La noche no es tiempo real: **el sistema offline actual (Espejo/Eco) desaparece**. Todo
  se cuelga del día de juego, no del reloj de pared. (Simplificación grande: fuera las
  fórmulas de ausencia.)

## 5 · Economía de dos bolsillos

El cambio estructural: **lo que produces no es tuyo**.

```
PRODUCCIÓN (del turno)  →  cuenta de LA EMPRESA  →  se compara con la CUOTA
                                                        │
NÓMINA (al fichar)  ◄───────────────────────────────────┘
   │
   ▼
BANCO (tuyo)  →  facturas · mejoras laborales · estilo de vida · ahorro
```

**Nómina del día:**

```
nómina = sueldo_base × min(1, producción/cuota)      ← cumplir la cuota = 100%
       + primas por objetivos secundarios            ← el «bonus»
       + 10% del exceso sobre la cuota               ← producir de más sigue pagando
       − coste de las bombillas rotas                ← la sobrecarga duele SIEMPRE
```

Ese 10% del exceso es la válvula incremental: el jugador ambicioso sigue teniendo razón
para sobrecargar y producir el triple — pero a tasa reducida, así el sueldo domina y la
economía no explota.

**Objetivos del día** (2-3, generados según tu rango):
- Cuota de producción (siempre) — «produce 400 € para la empresa».
- De calidad — «máximo 1 rotura», «mantén las 4 bombillas por encima del 50% durante 2 min».
- De pericia — «encadena x3 cinco veces», «10 clicks en banda buena seguidos».

Los de calidad y pericia son la cura del «esperar entre compras»: siempre hay algo que
*hacer bien*, no solo algo que comprar.

## 6 · Gastos: facturas y estilo de vida

- **Fijos** (se cobran al fichar): comida diaria; alquiler cada 5 días (la «semana», con
  su día de paga y resumen semanal).
- **Estilo de vida** (opcionales, la parte interesante): compras que dan ventaja de juego
  a cambio de subir tu gasto diario. El sumidero se convierte en decisión:

| Compra | Ventaja | A cambio |
|---|---|---|
| Piso mejor | +1 uso de fusible gratis al día («duermes bien») | Alquiler +40% |
| Moto | El turno dura +45 s («llegas antes») | Gasolina diaria |
| Cafetera | La primera sobrecarga de cada día no desgasta | Café diario |

- **Mejoras laborales** = las 8 mejoras y automatismos actuales, pero pagadas de tu banco.
  La pregunta constante que pedía el owner: ¿invierto en producir más o guardo para el alquiler?

## 7 · Progresión: la carrera

El crecimiento exponencial del incremental ya no vive en el dinero — vive en el **rango**:

```
Aprendiz → Oficial → Técnico → Encargado → Jefe de turno → Jefe de planta → Dirección
```

Cada ascenso: zona nueva de la fábrica (más zócalos a la vista), acceso a bombillas de
nivel superior, sueldo base y cuota multiplicados (~×2.2). El examen de ascenso es un
**día especial** con objetivos duros — un jefe mirando por encima del hombro.

**Final del arco:** con ahorros suficientes, **compras la fábrica**. Ese es el prestigio
con sentido narrativo: vendes, te mudas de ciudad y montas tu propia planta — el
«currículum» (las chispas ⚡ de hoy, renombradas a **reputación**) se lleva a la partida
siguiente y compra las mejoras permanentes actuales. El Apagón de hoy se congela y su
árbol se recicla aquí: Génesis/Herencia/Memoria ya significan «empiezas mejor», encajan tal cual.

## 8 · Salvaguardas — la ruina imposible por construcción

Las reglas anti-espiral, innegociables en el diseño:

1. **Nunca hay despido ni game over.** El suelo es blando, no un muro.
2. Si el banco no llega para las facturas → **deuda con interés diario suave y tope**.
   Mientras debas, no puedes comprar mejoras (presión real), pero el juego sigue y tu
   maquinaria no se toca.
3. La cuota diaria se calcula sobre **tu capacidad real** (producción de los últimos
   días), no sobre una curva teórica: un mal día baja la exigencia del siguiente. El
   juego persigue, no entierra.
4. Las roturas se descuentan **hasta un máximo del 60% de la nómina del día**: un día
   catastrófico paga poco, nunca negativo.
5. El primer incumplimiento de cada tipo es un **aviso**, no un castigo.

## 9 · Qué se conserva y qué cambia (impacto en código)

| Pieza | Destino |
|---|---|
| Motor de turno: carga, bandas, sobrecarga, desgaste, roturas | **Intacto** — es el corazón |
| Escalera de 10 niveles, forzado, zócalos | Intacta (tu maquinaria; los zócalos pasan a abrirse por rango) |
| 8 mejoras + 3 automatismos + 6 consumibles | Intactos, pagados desde el banco |
| Logros | Intactos, se suman los laborales («una semana sin romper nada») |
| Flujo del dinero | **Cambia**: producción (empresa) ≠ banco (jugador) |
| Nuevo | Reloj de día, objetivos, nómina, facturas, estilo de vida, rangos, deuda |
| Offline (Espejo/Eco) | **Se elimina** — todo va por días de juego |
| Apagón | Congelado; su árbol se recicla como «reputación» en la Fase 3 |
| Guardado | `fulgor.save.v3` (los saves v2 se descartan, como siempre) |

El motor puro sigue siendo simulable en Node, así que el balance de nómina/facturas se
ajusta igual que el del arranque: simulando días completos por script antes de tocar la UI.

## 10 · Fases

- **Fase 1 — MVP del día laboral.** Reloj de turno, producción vs cuota, nómina con
  descuento de roturas, banco, comida+alquiler, pantalla de cierre del día. Sin rangos
  (la cuota crece día a día), sin estilo de vida. *Con esto ya se sabe si el bucle es divertido.*
- **Fase 2 — La carrera.** Rangos y exámenes de ascenso, tienda de estilo de vida con
  gasto diario, semana y resumen semanal, deuda.
- **Fase 3 — El mundo.** Eventos (apagón de zona, inspección, pedido urgente con prima),
  comprar la fábrica, prestigio-reputación.

Estimación honesta: XL. La Fase 1 sola ya es una sesión larga de trabajo (motor + UI +
rebalance + tests).

## 11 · Preguntas abiertas para el owner

1. **Duración del turno**: ¿6, 8 o 10 minutos? (Recomiendo 6-8: en móvil, 10 se hace largo.)
2. **Impago**: ¿deuda con interés (recomendado) o embargo de mejoras? La deuda presiona
   sin destruir; el embargo se siente injusto.
3. **¿Días encadenables sin límite** en una misma sesión? (Recomiendo sí — que el jugador
   decida cuánto juega.)
4. **El juego actual**: ¿se reemplaza del todo, o se conserva accesible como «modo libre»?
   (Recomiendo reemplazar y no mantener dos juegos; el repo guarda la versión actual en
   la historia de git y siempre se puede taggear `v1`.)
5. **Tono**: ¿humor (jefe cascarrabias, casero pesado, notas en la taquilla) o sobrio?
   El humor amortigua la dureza del tema facturas — yo iría por ahí.
