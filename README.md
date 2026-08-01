<div align="center">

# FULGOR

**Juego idle / incremental de bombillas.** Las mantienes encendidas, las sobrecargas al límite
y rezas para que no revienten.

### ▶ [fulgor.ngv.digital](https://fulgor.ngv.digital)

*Sin dependencias · sin build · sin backend · funciona sin conexión*

</div>

---

## Cómo se juega

Cada bombilla tiene **carga**, que baja sola. Cuanta más carga, más dinero produce.
**Apagada no produce nada**: si las dejas morir, dejas de cobrar.

Pulsas para reencenderla — y **la banda en la que pulsas lo cambia todo**:

| Carga al pulsar | Qué pasa | Riesgo |
|---|---|---|
| < 62 % | Reencendido limpio | Ninguno |
| 62–85 % | Reencendido bueno, ×1.5 al click | Desgaste ínfimo |
| **≥ 85 %** | **SOBRECARGA** — ×2 acumulable, ×3 al click | **Desgaste serio** |

Encadenar sobrecargas dispara la producción, pero el desgaste **crece con cada stack**.
Pasado el límite la bombilla revienta y toca reponerla. El desgaste se enfría solo si la dejas
respirar. Ese pulso entre codicia y rotura es el juego entero.

Alrededor hay lo que se le pide a un incremental: una escalera de **10 niveles de bombilla**,
hasta 12 zócalos, mejoras permanentes, automatismos, consumibles, **prestigio**, 26 logros y
ganancias mientras no juegas.

## Correr en local

```bash
npm run dev      # http://localhost:5180
npm test         # 48 pruebas del motor
npm run smoke    # prueba de humo en Chrome headless
```

No hace falta `npm install`: **no hay ni una sola dependencia**. Node se usa únicamente como
servidor de ficheros estáticos, porque los módulos ES no cargan por `file://`.

## Cómo está hecho

Vanilla JS + SVG + CSS. Nada de frameworks, ni empaquetador, ni paso de compilación.

- **`src/engine/`** — la simulación, pura y sin DOM. Es lo que cubren los tests: se puede jugar
  una partida entera desde Node.
- **`src/ui/`** — todo lo que toca el DOM. La escena construye los nodos una vez y luego
  actualiza atributos sueltos por frame; a 60 fps la reconciliación de un framework sobra.
- **`src/ui/art.js`** — los assets. Las 10 bombillas, los cristales rotos, los 23 iconos y el
  logo son **SVG escrito a mano**; no hay imágenes ni librerías de iconos.

El motor no sabe que existe una pantalla: emite eventos (`click`, `break`, `achievement`…) y
`main.js` es el único sitio que los traduce a efectos visuales.

La partida se guarda en `localStorage` y un service worker cachea el juego, así que arranca al
instante y se puede jugar sin conexión.

## Estilo

Neón sobre un taller a oscuras. El detalle del que estoy más contento: **las bombillas son la
única fuente de luz de la pantalla**. Hay una variable CSS con la suma de las cargas, de modo
que si dejas que se apaguen todas, el juego se queda literalmente negro.

## Licencia

MIT — ver [LICENSE](LICENSE).

<div align="center"><sub>Parte del ecosistema <b>NGV</b> · Ignacio González Valero</sub></div>
