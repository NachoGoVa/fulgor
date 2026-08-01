# CLAUDE.md — FULGOR

> **📍 Ecosistema NGV** — La infraestructura común, credenciales, **herramientas y nivel de autonomía**
> (AWS · Supabase · GitHub · GCP · Google Play), reglas transversales e incidencias viven en el
> **CLAUDE.md maestro**, en la raíz del ecosistema: **`NGV/CLAUDE.md`**. Empieza por ahí para todo lo
> que no sea específico de este proyecto.

Juego **incremental de gestión laboral**: eres operario de **Lumínicas Paquita e Hijos, S.L.**, una
fábrica de luz. Experimento, no productivo. Nació como clicker puro (v1, analizando el prototipo
`experimentos/lightkeeper`); en la v2 el owner lo replanteó entero como «El operario»: días laborales,
nómina, facturas y vidas. El diseño completo y sus porqués están en `docs/rediseno-operario.md`.

## Cómo se juega (v2 «El operario»)

**Lo que produces no es tuyo.** Cada día fichas y trabajas un turno de **30 segundos** (ampliable con
la mejora **Jornada**, que escala sueldo y cuota en proporción — trabajar más horas paga más y exige
más): mantienes las bombillas encendidas para producir para la empresa. Al sonar la sirena cobras la
**nómina** según la **cuota** y los **objetivos del día**, y si superas la cuota hay **propina** (10%
del sueldo del día, ampliable con el **Bote**, directa al banco y sin pasar por deducciones — anclada
al sueldo y no a la cuota para que no explote en rangos altos; la simulación la deja en ~12% del
ingreso total). De tu **banco** salen las facturas (comida diaria, alquiler cada 5 días), la maquinaria
y el economato.

El turno es el corazón de v1: cada bombilla tiene carga que decae, y la banda en la que pulsas lo
decide todo — por debajo del 62% reencendido limpio, 62–85% banda buena (×1.5), **≥85% SOBRECARGA**
(×2 acumulable, ×3 al click) que desgasta de verdad. Encadenar sobrecargas sin respiro **rompe la
bombilla**, y las roturas que no repongas antes de fichar la salida **se descuentan de la nómina**
(tope: 60% del bruto).

**La curva de aprendizaje está escalonada a propósito:**
1. **Días 1-5, periodo de prácticas.** La empresa te presta una bombilla reforzada que **no revienta**
   (`isBecario`). Aprendes el ritmo sin castigo; el día 6, Don Fulgencio te la retira con su gracia.
2. **La sobrecarga está BLOQUEADA de salida.** Es una mejora (`sobrecarga`, `minRank: 1`) que hay que
   comprar y que exige ser Peón. Sin ella, pulsar en la banda roja devuelve la banda `early`: recarga
   sin bonus ni desgaste — «has pulsado pronto». El anillo rojo se atenúa (`.socket.nosurge`) para no
   invitar a pulsar en balde. Así el juego enseña primero el pulso y luego el riesgo.

```
nómina = sueldo × min(1, producción/cuota) + primas de objetivos (20% c/u)
       + 10% del exceso (tope 1 sueldo) − roturas sin resolver (tope 60%)
```

**La carrera:** 8 rangos (Aprendiz → Dirección). Cumplir la cuota N días asciende: más sueldo, más
zócalos, derecho a maquinaria mejor (el rango capa el nivel de bombilla). La cuota sube 6% por día
cumplido y baja 12% tras fallar (suelo 60%): persigue, no entierra.

**Las vidas:** deuda desbocada (>2 alquileres) = **calabozo**; 3 días bajo el 50% de la cuota =
**despido**; o puedes **dimitir** tú (mejor finiquito). Cualquier final reinicia la vida — pero la
**experiencia (XP)**, las **habilidades** y los **logros no se pierden jamás**. El fracaso ES el
prestigio: cada vida se empieza mejor (Enchufe = rango inicial, Colchón = ahorros, etc.).

## Cómo se arranca

```bash
npm run dev      # servidor estático en http://localhost:5180
npm test         # 48 pruebas del motor (runner integrado de Node)
npm run smoke    # humo en Chrome headless (21 comprobaciones, ciclo de 2 días incluido)
./deploy.sh      # publica en https://fulgor.ngv.digital
```

**Sin dependencias y sin build.** Node sólo hace de servidor estático porque los módulos ES no cargan
por `file://`. `npm install` no hace falta y `node_modules` no existe.

## Por qué vanilla y no React

- Es un juego a 60 fps: se actualizan atributos SVG concretos por frame. La reconciliación de React
  sobra (y en lightkeeper es justo lo que hacía tirones).
- Cero dependencias = cero `npm install`, cero cadena de suministro, cero deriva de versiones.
- El resultado es una carpeta estática desplegable tal cual (S3 + CloudFront) **sin build**.

## Estructura

```
src/engine/    ← simulación pura, sin DOM. Es lo que prueban los tests.
  config.js      TODO el balance: niveles, rangos, mejoras, habilidades, XP, logros
  engine.js      step() · click() · startDay()/endDay() · resetLife() · compras
  format.js      formateo de números grandes (K/M/B/T…)
  save.js        localStorage, un solo blob con debounce de 3 s (clave v4)
src/ui/        ← todo lo que toca el DOM
  art.js         SVG a mano: 10 bombillas, rotura, zócalo vacío, iconos, logo
  characters.js  LOS RETRATOS: 6 caras SVG (jefe, RR.HH., veterano, becaria,
                 casero, tú) × 5 humores. Una sola geometría por cara; cejas y
                 boca son lo único que cambia con el humor
  flavor.js      EL GUION: cada réplica es [quién, texto, humor], así que el
                 diálogo sabe qué cara ponerle
  scene.js       la sala: construye una vez y actualiza atributos por frame
  shop.js        panel: Mejoras · Bombillas · Economato · Carrera · Logros
  hud.js         banco, cuota, reloj del turno, XP
  fx.js          números flotantes, chispas, cristales, avisos
src/main.js    ← bucle rAF + flujo del día (fichar → turno → parte → vida siguiente).
                 El flujo se deriva del ESTADO (shift.closed), no de eventos: un
                 vigilante por segundo repara cualquier pantalla huérfana, y el
                 bucle lleva try/catch — un frame roto jamás congela el juego
                 (pasó: se quedaba clavado con el reloj a 0:01)
test/          ← engine.test.js (48 unitarias) · smoke.mjs (navegador real)
docs/          ← rediseno-operario.md (el diseño de v2 y sus decisiones)
```

**El motor no sabe que existe el DOM** y **fuera del turno no corre nada**: sin fichar, el mundo está
parado (no hay sistema offline — todo se cuelga del día de juego, no del reloj de pared).

## Balance — calibrado por simulación

`test/` cubre la lógica; el *balance* se calibró simulando carreras enteras con tres bots (vago,
activo, agresivo) sobre el motor puro. Resultados que definen la experiencia:

| Perfil | Resultado |
|---|---|
| Vago (no toca nada) | Despido cada 3 días — el bucle de fracaso alimenta el prestigio vía finiquitos |
| Casual (reencender sin criterio) | **No llega a la cuota**: hay que jugar la banda, no sólo pulsar |
| Bueno (banda buena) | Cumple con margen sano (~1.2× la cuota) |
| Agresivo (sobrecarga con cabeza) | Más rápido, **pero solo si para cuando el desgaste va alto** |

Decisiones que salieron de la simulación: `wearBase` 0.075→**0.105** (con el valor viejo, un agresivo
acababa 40 días con CERO roturas — el riesgo no mordía), `promoteDays` +1 por rango, y el rebalanceo
del arranque tras el segundo informe de juego: las cuotas de todos los rangos **×1.75** y las primeras
mejoras más caras, porque jugando casual se superaba la cuota un 38% y el día 1 dejaba 40 € (dos
mejoras) en el bolsillo.

Dos tests fijan el arranque para que no se vuelva a escapar: **«la cuota del día 1 exige jugar»**
(idle <20%, casual <100%, bueno ≥100% y <220%) y **«el día 1 no deja el bolsillo lleno»** (tras el
primer día no debe alcanzar para dos mejoras).

## Estilo visual

Neón sobre taller a oscuras; las bombillas son la única luz de la pantalla (`--ambient` = suma de
cargas: si todo se apaga, el juego se queda negro). Paleta en `:root`; cada nivel aporta su terna
`--glow/--core/--rim`. Sin filtros SVG animados: halo = radial-gradient + `mix-blend-mode:screen`;
anillos = `stroke-dasharray`. **El humor es parte del estilo**: todo texto de sistema pasa por
`flavor.js`, y sale por boca de un personaje con su retrato (`characters.js`): Don Fulgencio comenta
la nómina cada día, Paco te da consejos de veterano, Vane sufre contigo, Charo de RR.HH. sonríe
mientras te despide y el Sr. Braulio llama por el alquiler.

**Restyling v3 (nave industrial):** chapa (`--plate`: degradado + brillo superior), viga con remaches
sobre la escena, cinta de peligro (`--hazard`) en los ascensos, botones con relieve que se hunden al
pulsar, y objetivos táctiles de 44 px. La hoja es **mobile-first**: se diseña para el pulgar y se
ensancha en `560px` (más aire), `940px` (panel lateral) y `1500px`; hay además un caso para móvil
apaisado (`max-height:520px`).

## Cache local (offline)

`sw.js`: stale-while-revalidate — abre al instante, funciona sin conexión, nunca se queda en una
versión vieja. `manifest.webmanifest` + `icon.svg` lo hacen instalable en el móvil.

> ⚠️ **Al desplegar cambios hay que subir `VERSION` en `sw.js`** (ahora `fulgor-v4`). Por eso
> `index.html`, `sw.js` y el manifest se suben con `max-age=0, must-revalidate` y el resto con caché
> de un día: si esos tres se cachean, nadie ve nunca una versión nueva.

## Publicado

| | |
|---|---|
| **URL** | https://fulgor.ngv.digital |
| Bucket | `fulgor-prod-web` (privado, cifrado, sin acceso público) |
| CloudFront | `E1XQE2XM9YRDY8` · `d2u68v2cdzgq91.cloudfront.net` · PriceClass_100 · OAC `EEOL37NTP265D` |
| Cert | wildcard `*.ngv.digital` (us-east-1) |
| DNS | A + AAAA ALIAS en `ngv.digital` (`Z07325723OA1ZCMJ8UTR`) |
| Repo | `NachoGoVa/fulgor` (**público**) · el clicker original está taggeado como `v1` |

Desplegar: **`./deploy.sh`**. Pendiente `www.fulgor` (exige reemitir el cert multi-SAN de la distro
de redirección; hacerlo en lote con la próxima app).

## Trampas conocidas (pisadas ya)

- **`.spark` chocaba** con el HUD; la partícula se llama `.fx-spark`. No usar nombres genéricos en `#fx`.
- **`repeat(auto-fit, min(...))`** daba pistas absurdas; la rejilla la calcula `scene.layout()` en px.
- **Los iconos son trazo**: `.ic { fill:none; stroke:currentColor }`.
- **`dt` grande**: `step()` reparte el intervalo y recorta al reloj del turno; `main.js` capa a 1 s.
- **El smoke debe limpiar el service worker**, no solo localStorage: si no, prueba la versión cacheada
  del juego anterior (pasó: el smoke de v2 «veía» el juego v1 servido por el SW viejo).
- Para **sembrar una partida** desde fuera: hacerlo en una página en blanco del mismo origen (el
  `flush()` de `pagehide` machaca lo que escribas con el juego cargado).
- La clave de guardado lleva versión (`fulgor.save.v3`). Si cambia la forma del estado, **súbela**.
- `startDay()` usa `Math.random()` para los objetivos: los tests deterministas los sobreescriben a mano.

## Pendiente (fases 2-3 del diseño)

Estilo de vida (compras con ventaja + gasto diario: piso, moto, cafetera), eventos (inspección,
apagón de zona, pedido urgente), y el final «comprar la fábrica». Ver `docs/rediseno-operario.md`.
