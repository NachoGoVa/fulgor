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

**Lo que produces no es tuyo.** Cada día fichas y trabajas un turno de **2,5 minutos**: mantienes las
bombillas encendidas para producir para la empresa. Al sonar la sirena cobras la **nómina** según la
**cuota** y los **objetivos del día**; de tu **banco** salen las facturas (comida diaria, alquiler cada
5 días), la maquinaria y el economato.

El turno es el corazón de v1, intacto: cada bombilla tiene carga que decae, y la banda en la que pulsas
lo decide todo — por debajo del 62% reencendido limpio, 62–85% banda buena (×1.5), **≥85% SOBRECARGA**
(×2 acumulable, ×3 al click) que desgasta de verdad. Encadenar sobrecargas sin respiro **rompe la
bombilla**, y las roturas que no repongas antes de fichar la salida **se descuentan de la nómina**
(tope: 60% del bruto).

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
npm test         # 41 pruebas del motor (runner integrado de Node)
npm run smoke    # prueba de humo en Chrome headless (17 comprobaciones)
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
  save.js        localStorage, un solo blob con debounce de 5 s (clave v3)
src/ui/        ← todo lo que toca el DOM
  art.js         SVG a mano: 10 bombillas, rotura, zócalo vacío, iconos, logo
  flavor.js      EL HUMOR: Don Fulgencio, el Sr. Braulio, facturas con nombre
  scene.js       la sala: construye una vez y actualiza atributos por frame
  shop.js        panel: Mejoras · Bombillas · Economato · Carrera · Logros
  hud.js         banco, cuota, reloj del turno, XP
  fx.js          números flotantes, chispas, cristales, avisos
src/main.js    ← bucle rAF + flujo del día (fichar → turno → parte → vida siguiente)
test/          ← engine.test.js (41 unitarias) · smoke.mjs (navegador real)
docs/          ← rediseno-operario.md (el diseño de v2 y sus decisiones)
```

**El motor no sabe que existe el DOM** y **fuera del turno no corre nada**: sin fichar, el mundo está
parado (no hay sistema offline — todo se cuelga del día de juego, no del reloj de pared).

## Balance — calibrado por simulación

`test/` cubre la lógica; el *balance* se calibró simulando carreras enteras con tres bots (vago,
activo, agresivo) sobre el motor puro. Resultados que definen la experiencia:

| Perfil | 40 días simulados |
|---|---|
| Vago (no toca nada) | Despido cada 3 días, 14 vidas, ~626 XP por finiquitos — el bucle de fracaso alimenta el prestigio |
| Activo (banda buena) | Dirección en el día 37 (~95 min de juego), sin sobresaltos |
| Agresivo (sobrecarga con cabeza) | Igual de rápido, **pero solo si para cuando el desgaste va alto** |

Decisiones que salieron de la simulación: `wearBase` 0.075→**0.105** (con el valor viejo, un agresivo
acababa 40 días con CERO roturas — el riesgo no mordía) y `promoteDays` +1 en todos los rangos (la
carrera duraba 70 min; ahora ~95). La cuota del día 1 **no** se cumple mirando: hay que jugar (test
«BALANCE» lo fija).

## Estilo visual

Neón sobre taller a oscuras; las bombillas son la única luz de la pantalla (`--ambient` = suma de
cargas: si todo se apaga, el juego se queda negro). Paleta en `:root`; cada nivel aporta su terna
`--glow/--core/--rim`. Sin filtros SVG animados: halo = radial-gradient + `mix-blend-mode:screen`;
anillos = `stroke-dasharray`. **El humor es parte del estilo**: todo texto de sistema pasa por
`flavor.js` (el jefe comenta la nómina, las facturas tienen nombre, el calabozo tiene guion).

## Cache local (offline)

`sw.js`: stale-while-revalidate — abre al instante, funciona sin conexión, nunca se queda en una
versión vieja. `manifest.webmanifest` + `icon.svg` lo hacen instalable en el móvil.

> ⚠️ **Al desplegar cambios hay que subir `VERSION` en `sw.js`** (ahora `fulgor-v3`). Por eso
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
