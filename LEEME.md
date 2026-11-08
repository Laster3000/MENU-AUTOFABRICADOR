# AUTOFABRICADOR · Menú v1 (DEMO)

Versión 1 según la especificación «AUTOFABRICADOR · Especificación del menú (v1)». Novedades respecto al prototipo:

| Novedad | Dónde |
|---|---|
| Agentes con nombre de oficio: RECEPCION, PLANIFICADOR, PROGRAMADOR, CIENTIFICO, VALIDADOR, EMPAQUETADOR, TRANSPORTISTA, LIMPIADOR | `config/robots.js` |
| Moverse por la nave arrastrando con el ratón (con inercia); flechas, rueda y minimapa siguen funcionando | `js/motor.js` |
| Zona de descanso entre el taller y el ala de verificación; cada agente tiene su sitio fijo (cojín de su color) | `config/escena.js`, `js/registro.js` |
| Cada puesto con cartel del agente en su color (se enciende al trabajar) y baldosa de acceso | `js/sprites.js`, `js/motor.js` |
| Coger y soltar robots: arrastrándolos o con COGER. Si trabajaban, corren a su puesto y siguen donde lo dejaron | `js/agarre.js` |
| Dependencias entre agentes (`depende`), validadas al arrancar; el flujo se ordena solo | `js/registro.js` |
| Mirar a un robot dibuja en la escena de quién depende y a quién entrega; pestaña **Dependencias** con el mapa | `js/dependencias.js` |
| Añadir un agente: un bloque en `config/robots.js` o el botón **+ Añadir agente** (Editor / Agentes). Si no cabe, la nave se alarga | `js/registro.js` |
| Botón **Pedir encargo** (simulado; los pedidos se pueden exportar a JSON) | `js/dependencias.js` |
| Pestaña **Aventura** reservada (próximamente) | `config/menu.js` |
| Teclas 1 / 2 / 3 para la velocidad | `js/ui.js` |

Añadir un agente desde código (ejemplo):

```js
{ id: 'documentador', nombre: 'DOCUMENTADOR', rol: 'Documentación', fase: 'docs',
  depende: ['validador'], sala: 'ala-ver', puesto: { tipo: 'escritorio' },
  descripcion: 'Escribe el manual del programa antes de empaquetarlo.' },
```

y añade `'documentador'` al `depende` del EMPAQUETADOR. Si la fase `docs` no está en `config/flujo.js` se crea con 4 s. Si un `depende` apunta a un agente que no existe o hay un ciclo, ese agente queda fuera del flujo, sale en rojo en el mapa y el resto funciona.

---

## Prototipo original (sigue vigente)

Menú visual con estética de aventura gráfica clásica (verbos, pixel-art, textos de colores sobre los personajes) para AUTOFABRICADOR.
**Está totalmente separado del motor real**: no ejecuta comandos, no lee ni escribe en `C:\AUTOFABRICADOR` y todo lo que muestra es simulación rotulada como tal.

## Cómo probarlo

1. Descomprime la carpeta donde quieras (por ejemplo `D:\AUTOFABRICADOR-MENU\`), **fuera** de `C:\AUTOFABRICADOR`.
2. Abre `index.html` con doble clic (Chrome o Edge). No necesita instalar nada ni conexión a internet.
3. Pulsa **Ejecutar** (abajo a la izquierda) o **Iniciar** en el bocadillo de RECEPCION.

Resolución principal 1920×1080; se adapta a 1366×768 y 2560×1440.

## Controles

| Acción | Cómo |
|---|---|
| Usar un verbo | Clic en el verbo y luego en algo de la escena |
| Verbo sugerido | Clic izquierdo sin verbo elegido (el sugerido se resalta en amarillo) |
| Mirar / inspeccionar | Clic derecho |
| Mover la cámara | Ratón en los bordes, rueda, flechas, Mayús + arrastrar o clic en el minimapa |
| Pausa | Espacio |
| Cancelar / cerrar ventana | Esc |
| Atajos de verbos | M H U A C G V S T |
| Ayuda | F1 o pestaña `?` |

Verbos: **Mirar**, **Hablar** (diálogo con opciones), **Usar** (abre la pantalla de cada estación; vacía el contenedor), **Abrir/Cerrar** (persiana entre salas: cerrada bloquea rutas), **Coger** (retira basura a mano), **Mover** (recoloca muebles y máquinas con validación de rutas), **Seguir** (cámara), **Tirar basura** (para probar a LIMPIADOR).

Las frases con `~` son ambientación. Las demás nacen de un evento: al MIRAR a un robot se ve el `eventId` que causó su último aviso.

## Cómo se modifica (sin tocar el motor)

| Quiero cambiar… | Archivo |
|---|---|
| Colores de la escena | `config/tema.js` |
| Colores de paneles y botones | variables `--af-*` al principio de `css/estilo.css` |
| Máquinas, muebles, rótulos, ventanales, lámparas, puerta, basura | `config/escena.js` |
| Robots: nombre, colores, accesorio, ruedas, base, velocidad | `config/robots.js` |
| Fases de un encargo, duraciones, probabilidad de fallo, encargos de ejemplo | `config/flujo.js` |
| Todas las frases | `config/dialogos.js` |
| Pestañas, verbos e iconos pixel | `config/menu.js` |
| Dibujo de una pieza | `js/sprites.js` (cada pieza es una función registrada por su `asset`) |
| Dibujo de los robots | `js/personajes.js` |
| Una ventana nueva | `js/ventanas.js` → `AF.ventanas.registrar('id', {...})` y una pestaña en `config/menu.js` |

También puedes usar la pestaña **Editor** dentro del programa: cambia nombres, posiciones, dibujos (asset), colores, rótulos y visibilidad, con deshacer/rehacer, restaurar original y exportar/importar JSON. Los cambios se guardan en el navegador.

Ejemplos rápidos:

- **Añadir una planta**: copia un bloque `planta-maceta` en `config/escena.js`, cambia `id`, `x`, `y`.
- **Cambiar el texto de un rótulo**: `props: { texto: '1. RECEPCIÓN', sub: 'ENCARGOS' }`.
- **Añadir un robot**: copia un bloque en `config/robots.js` con `id` nuevo; si no tiene `fase`, solo pasea y charla.
- **Nuevo dibujo para una máquina**: en `js/sprites.js` añade `S.registrar('mi-maquina', (g, o, t) => { ... })` y pon `asset: 'mi-maquina'` al objeto.

## Qué cumple de la especificación

- Capas: cielo con paralaje → pared/suelo → objetos de pared → objetos y robots ordenados por profundidad → luces → textos.
- Navegación por rejilla independiente del dibujo, rutas A*, colisiones con muebles, paredes y puerta; esperas acotadas y recálculo cuando algo cambia; bloqueos comunicados con su causa.
- Máquina de estados de los robots (`IDLE → ASSIGNED → ROUTING → WALKING → ARRIVED → WORKING → REPORTING → DONE → RETURNING`, más `WAITING_PATH`, `BLOCKED`, parada en frontera segura).
- LIMPIADOR completo: detectar, priorizar, ruta, recoger, transportar, contenedor lleno = bloqueo y aviso, depositar; el residuo solo desaparece al depositarse.
- Ningún trabajo empieza sin que el robot llegue a su puesto y la caja del encargo esté allí (la lleva TRANSPORTISTA).
- STOP cooperativo: termina la fase en curso y se detiene; Ejecutar reanuda desde esa frontera.
- Todos los eventos usan el contrato `schema 1` (`eventId`, `type`, `status`, `jobId`…) con `source: "demo"`.
- Botones del modo REAL desactivados con explicación; la importación JSON solo acepta campos visuales y rechaza acciones no permitidas.

## Integración futura

`js/adaptador.js` describe el punto de conexión. El modo REAL está desactivado: para conectarlo habrá que escribir un adaptador de **solo lectura** que convierta los eventos del supervisor al contrato `schema 1` y los entregue con `AF.eventos.emitir(...)`.

## Limitaciones conocidas del prototipo

- Es HTML + JavaScript sin compilación (no React/PixiJS/Vite como propone la especificación) para que se pueda abrir con doble clic y modificar con un editor de texto. Migrarlo más adelante es viable porque la configuración ya está separada en datos.
- El esquivado entre robots es sencillo (esperan y recalculan); en pasillos muy estrechos con muchos robots puede haber pequeñas esperas.
- El arte está dibujado por código (pixel-art procedural), no con sprites de ilustrador; cada pieza se puede sustituir por separado.

Fuentes pixel: Pixelify Sans y VT323 (licencia SIL Open Font License), incrustadas para funcionar sin conexión.
