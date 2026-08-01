# CLAUDE.md — FULGOR

> **📍 Ecosistema NGV** — La infraestructura común, credenciales, **herramientas y nivel de autonomía**
> (AWS · Supabase · GitHub · GCP · Google Play), reglas transversales e incidencias viven en el
> **CLAUDE.md maestro**, en la raíz del ecosistema: **`NGV/CLAUDE.md`**. Empieza por ahí para todo lo
> que no sea específico de este proyecto.

Juego **idle / incremental** de bombillas. Experimento, no productivo. Nació de analizar el prototipo
vecino `experimentos/lightkeeper` y rehacer la idea entera con las carencias corregidas.

## Cómo se juega

Mantienes bombillas encendidas para ganar dinero. Cada bombilla tiene **carga**, que baja sola; cuanta
más carga, más produce. **Apagada no produce nada** — ésa es la regla que sostiene todo: si las dejas
morir, dejas de cobrar. Pulsas para reencenderla, y **la banda en la que pulsas lo cambia todo**:

| Carga al pulsar | Qué pasa | Riesgo |
|---|---|---|
| < 62% | Reencendido limpio | Ninguno |
| 62–85% | Reencendido bueno, x1.5 al click | Desgaste ínfimo |
| **≥ 85%** | **SOBRECARGA**: x2 acumulable, x3 al click | **Desgaste serio** |

Encadenar sobrecargas multiplica la producción (x2 → x3, y hasta x7 con chispas), pero **el desgaste
crece con el stack** (`stack^1.25`). Al llegar al tope, la bombilla **revienta**. El desgaste se enfría
solo si la dejas en paz. Ese tira y afloja —codicia contra rotura— es el juego.

## La escalera de bombillas

**El nivel es del zócalo, no de la bombilla.** Cada zócalo sube **de uno en uno**, nunca salta, y al
subir la bombilla da más dinero **y aguanta más encendida** (6 s en el nivel 1 → 19 s en el 10). Si
revienta, repones una igual pagando lo que vale *ese* nivel: no pierdes el peldaño ganado.

Un zócalo nuevo llega **vacío y en el nivel 1**, aunque el resto de tu instalación sea Estelar. La
pestaña *Bombillas* dibuja la escalera entera con tu posición marcada, y hay un «Mejorar todas un nivel».

> Antes esto era un desastre: al pulsar un zócalo vacío se compraba *la mejor bombilla que pudieras
> pagar* (saltos aleatorios a Xenón/Neón/LED, sin jerarquía visible), y al romperse una te la reponía a
> tu **mejor nivel histórico** — o sea que romper una bombilla barata te regalaba la mejor que hubieras
> tenido nunca. De ahí vienen `sk.tier`, `repairSocket()` y `upgradeSocket()`.

## Cómo se arranca

```bash
npm run dev      # servidor estático en http://localhost:5180
npm test         # 48 pruebas del motor (runner integrado de Node)
npm run smoke    # prueba de humo en Chrome headless (se omite si no hay navegador)
./deploy.sh      # publica en https://fulgor.ngv.digital
```

**Sin dependencias y sin build.** Node sólo hace de servidor estático porque los módulos ES no cargan
por `file://`. `npm install` no hace falta y `node_modules` no existe.

## Por qué vanilla y no React

El resto de experimentos son exports de Hostinger Horizons (React 18 + Vite + Tailwind + 27 paquetes de
Radix). Aquí no, a propósito:

- Es un juego a 60 fps: se actualizan atributos SVG concretos por frame. La reconciliación de React
  sobra, y en lightkeeper es justo lo que hace que tiemble (contexto plano, cero memoización, todos los
  consumidores redibujando 10 veces por segundo).
- Cero dependencias = cero `npm install`, cero cadena de suministro, cero deriva de versiones.
- El resultado es una carpeta estática: si algún día se promociona, se despliega tal cual con el patrón
  NGV (S3 + CloudFront) **sin build**.

## Estructura

```
src/engine/    ← simulación pura, sin DOM. Es lo que prueban los tests.
  config.js      todo el balance: niveles, mejoras, consumibles, prestigio, logros
  engine.js      step() · click() · compras · prestigio · logros · offline
  format.js      formateo de números grandes (K/M/B/T… → notación científica)
  save.js        localStorage, un solo blob con debounce de 5 s
src/ui/        ← todo lo que toca el DOM
  art.js         SVG a mano: 10 bombillas, rotura, zócalo vacío, 23 iconos, logo
  scene.js       la sala: construye una vez y actualiza atributos por frame
  shop.js        panel de 5 pestañas
  hud.js         barra superior
  fx.js          números flotantes, chispas, cristales, avisos
src/main.js    ← arranque, bucle rAF y puente eventos-del-motor → efectos
test/          ← engine.test.js (unitario) · smoke.mjs (navegador real)
```

**El motor no sabe que existe el DOM.** Emite eventos (`click`, `break`, `saved`, `achievement`…) en
`state.events`; `main.js` es el único sitio que los traduce a efectos visuales. Por eso el juego entero
se puede simular en Node.

## Sistemas

- **Zócalos** (hasta 12) · **10 niveles de bombilla**, de Incandescente a Estelar, cada uno con su SVG
  (ver *La escalera* arriba).
- **Forzado**: por zócalo, x1.5 producción a cambio de x1.12 apagado y x1.10 desgaste. Acumulable.
  Es la decisión recurrente de toda la partida.
- **8 mejoras** de dinero (voltaje, filamento, pulso, aislamiento, disipador, reactor, cristal, espejo),
  con compra x1 / x10 / Máx.
- **3 automatismos**: Chispa (auto-click seguro), Técnico (repone rotas), Condensador (deja que la
  Chispa se atreva a sobrecargar).
- **6 consumibles**, con precio indexado a tu mejor bombilla para que no se queden obsoletos.
- **Prestigio "Apagón"**: a 1 M€ por partida, reinicias y cobras `10·(€/1M)^0.55` **chispas**,
  que compran 8 mejoras permanentes.
- **26 logros**, cada uno con bonus permanente al dinero.
- **Ganancias offline**, topadas a 8 h y **bloqueadas hasta comprar Espejo o Eco** (es un sumidero
  deliberado, no un regalo).

## Qué se corrigió de lightkeeper

Su prototipo tenía problemas de diseño concretos; se listan porque explican decisiones de aquí:

| lightkeeper | FULGOR |
|---|---|
| Sin progreso offline (fatal en un idle) | `applyOffline()` al cargar, con su diálogo |
| Essence: moneda que sube y **no se gasta en nada** | Dos monedas, ambas con sumidero |
| La sobrecarga está **desactivada** a nivel 0 y no paga dinero | Es el núcleo del juego desde el primer click |
| Prestigio con raíz cúbica → se estanca enseguida | Exponente 0.55 (x1000 de dinero ≈ x35 chispas) |
| 15 escrituras a localStorage **por tick** (150/s) | Un blob, debounce de 5 s |
| Sin memoización: todo redibuja a 10 Hz | DOM construido una vez, atributos por frame |
| Sin sufijos numéricos (`1.23e6`) | K/M/B/T/Qa… y científica al pasarse |
| Cero feedback táctil | Números flotantes, chispas, cristales, sacudida, grietas |

## Estilo visual

Neón sobre taller a oscuras. **Las bombillas son la única luz de la pantalla**: `#scene` lleva una
variable `--ambient` con la suma de las cargas, así que si dejas que se apaguen todas, el juego se
queda literalmente negro. Es el mejor recordatorio de que hay trabajo pendiente.

Paleta en `:root` (`styles.css`): fondo `#05070E`, oro `#FFC94A`, sobrecarga `#FF4D9D`, frío `#3DF5FF`,
peligro `#FF5470`. Cada nivel de bombilla aporta su terna `--glow/--core/--rim`, que heredan tanto el
SVG como el halo, así una sola forma sirve para todos.

**Sin filtros SVG animados** (son caros): el fulgor es un `radial-gradient` en un div con `mix-blend-mode:
screen` y opacidad por frame. Los anillos son `stroke-dasharray` sobre círculos.

## Balance del arranque

Ajustado tras jugarlo el owner: se quejaba de que las bombillas duraban demasiado, de tener dinero y
multiplicador «de salida», y de que las bombillas nuevas salían en niveles aleatorios. Medido con una
simulación de 2 minutos sobre el motor puro, antes y después:

| | Antes | Ahora |
|---|---|---|
| Vida de la bombilla de nivel 1 | 11,6 s | **6,0 s** |
| Sin tocar nada, 2 min | 23 € | **3 €** |
| Jugando bien, 2 min | 112 € (13 clicks) | 116 € (**26 clicks**) |
| Machacando el click, 2 min | 97 € | **61 € y una rotura** |

Las tres palancas: `dimFloor` pasó de 0.15 a **0** (una bombilla apagada ya no paga sola — era el
«boost» invisible del arranque), los `decay` de todos los niveles casi se doblaron, y `surgeCap` bajó de
4 a **2** para que el x5 haya que ganárselo con chispas (Avaricia). Además el HUD **oculta Chispas y
Multiplicador mientras valen cero**, que era lo que daba sensación de empezar con bonificaciones.

## Trampas conocidas (pisadas ya)

- **`.spark` chocaba** entre la partícula de efectos y el marcador de Chispas del HUD, y lo colapsaba a
  5 px. La partícula se llama `.fx-spark` por eso; no volver a usar nombres genéricos en `#fx`.
- **`repeat(auto-fit, min(...))`** daba pistas absurdas (una a 365 px y tres a 0 px). La rejilla la
  calcula `scene.layout()` en píxeles y se recalcula al redimensionar.
- **Los iconos son trazo**: `.ic { fill:none; stroke:currentColor }`. Sin esa regla salen manchas.
- **`dt` grande** (pestaña en segundo plano): `step()` reparte el intervalo entre sobrecarga y enfriado,
  y `main.js` lo capa a 1 s. El tiempo real perdido se cobra como offline.
- Para **sembrar una partida** desde fuera hay que hacerlo en una página en blanco del mismo origen:
  con el juego cargado, su `flush()` en `pagehide` machaca lo que escribas al recargar.
- La clave de guardado lleva versión (`fulgor.save.v2`). Si cambia la forma del estado, **súbela** en vez
  de migrar: son partidas de experimento, no hay nada que conservar.

## Cache local (offline)

`sw.js` es un service worker con estrategia **stale-while-revalidate**: responde al instante desde la
caché y en paralelo pide la versión nueva para la carga siguiente. Así el juego abre inmediato, se puede
jugar **sin conexión** (la partida ya vivía en `localStorage`) y nunca se queda atascado en una versión
vieja. Con `manifest.webmanifest` + `icon.svg` es además instalable en el móvil, a pantalla completa.

> ⚠️ **Al desplegar cambios hay que subir `VERSION` en `sw.js`.** Es lo que borra la caché anterior.
> Por eso `index.html`, `sw.js` y `manifest.webmanifest` se suben con `max-age=0, must-revalidate`
> mientras el resto va con caché de un día: si esos tres se cachean, nadie ve nunca una versión nueva.

## Publicado

| | |
|---|---|
| **URL** | https://fulgor.ngv.digital |
| Bucket | `fulgor-prod-web` (privado, cifrado, sin acceso público) |
| CloudFront | `E1XQE2XM9YRDY8` · `d2u68v2cdzgq91.cloudfront.net` · PriceClass_100 · OAC `EEOL37NTP265D` |
| Cert | wildcard `*.ngv.digital` (us-east-1) |
| DNS | A + AAAA ALIAS en `ngv.digital` (`Z07325723OA1ZCMJ8UTR`) |
| Repo | `NachoGoVa/fulgor` (**público**) |

Desplegar: **`./deploy.sh`** — sincroniza, arregla los `Cache-Control` de los tres ficheros críticos e
invalida CloudFront. No hay paso de build.

Pendiente si se quiere `www.fulgor.ngv.digital`: el cert multi-SAN de la distribución de redirección
(`E1759TUPOIJ085`) no admite añadir SAN a posteriori — hay que **reemitirlo** con los 10 actuales más el
nuevo, revalidar y actualizar la distro. No se ha hecho: el resto de apps sí lo tienen, así que si se
quiere coherencia conviene hacerlo en una sola pasada para todas.
