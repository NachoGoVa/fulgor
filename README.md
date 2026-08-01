<div align="center">

# FULGOR

**Eres operario en una fábrica de luz.** Ficha, cumple la cuota, no rompas bombillas
(se descuentan de tu nómina) y paga el alquiler antes de que el Sr. Braulio llame a quien
tiene que llamar.

### ▶ [fulgor.ngv.digital](https://fulgor.ngv.digital)

*Sin dependencias · sin build · sin backend · funciona sin conexión*

</div>

---

## Cómo se juega

Cada día laboral es un turno de **2,5 minutos**. Las bombillas pierden carga y solo producen
encendidas; pulsas para reencenderlas, y **la banda en la que pulsas lo cambia todo**:

| Carga al pulsar | Qué pasa | Riesgo |
|---|---|---|
| < 62 % | Reencendido limpio | Ninguno |
| 62–85 % | Banda buena, ×1.5 | Desgaste ínfimo |
| **≥ 85 %** | **SOBRECARGA** — ×2 acumulable, ×3 al click | **Desgaste serio** |

Pero **lo que produces no es tuyo**: va a la cuenta de la empresa y se compara con la cuota
del día. Al fichar la salida cobras la nómina — sueldo según cumplimiento, primas por
objetivos, un pellizco del exceso… **menos las bombillas que hayas roto**. De tu banco salen
la comida, el alquiler y toda mejora que quieras.

Cumple la cuota varios días y **asciendes**: ocho rangos de Aprendiz a Dirección, cada uno
con más sueldo, más zócalos y derecho a maquinaria mejor. Deja de pagar y acabas en el
**calabozo**; rinde poco y te **despiden**; o dimite tú con un portazo digno y mejor
finiquito. Da igual cómo acabe la vida: la **experiencia** y las **habilidades** compradas
con ella **no se pierden jamás** — cada vida se empieza un poco mejor. Aquí el fracaso es
el prestigio.

Y sí: el jefe se llama Don Fulgencio y comenta tu nómina cada día.

## Correr en local

```bash
npm run dev      # http://localhost:5180
npm test         # 41 pruebas del motor
npm run smoke    # prueba de humo en Chrome headless
```

No hace falta `npm install`: **no hay ni una sola dependencia**. Node se usa únicamente como
servidor de ficheros estáticos, porque los módulos ES no cargan por `file://`.

## Cómo está hecho

Vanilla JS + SVG + CSS. Nada de frameworks, ni empaquetador, ni paso de compilación.

- **`src/engine/`** — la simulación, pura y sin DOM: el turno, la nómina, las facturas, la
  carrera y las vidas. Es lo que cubren los tests; una carrera entera se puede jugar desde Node
  (así se calibró el balance: con bots que juegan 40 días seguidos).
- **`src/ui/`** — todo lo que toca el DOM. La escena construye los nodos una vez y actualiza
  atributos sueltos por frame. `flavor.js` concentra el humor: nada de textos de sistema sosos.
- **`src/ui/art.js`** — los assets. Las 10 bombillas, los cristales rotos, los iconos y el
  logo son **SVG escrito a mano**; no hay imágenes ni librerías de iconos.

El motor no sabe que existe una pantalla: emite eventos y `main.js` los traduce a efectos.
Fuera del turno **no corre nada** — el juego está literalmente parado hasta que fichas.

La partida se guarda en `localStorage` y un service worker cachea el juego: arranca al
instante y se puede jugar sin conexión.

## Historia

La **v1** (tag [`v1`](../../releases/tag/v1)) era un clicker incremental clásico: dinero
directo al bolsillo, mejoras y prestigio. La **v2** lo replantea entero como gestión laboral
por rediseño del owner; el análisis y las decisiones están en
[`docs/rediseno-operario.md`](docs/rediseno-operario.md).

## Licencia

MIT — ver [LICENSE](LICENSE).

<div align="center"><sub>Parte del ecosistema <b>NGV</b> · Ignacio González Valero</sub></div>
