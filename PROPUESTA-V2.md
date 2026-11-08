# Propuesta V2: experiencia visual moderna y navegación rápida

Esta rama es una evolución **aislada** de la V1 original, que permanece en `main`.

## Qué cambia

- Estética revisada mediante `design/experiencia-v2.css`, sin sustituir el escenario real por una imagen estática.
- Barra de acceso rápido a Recepción, IA central, Programación, Laboratorio, Validación y Entregas.
- Navegación de cámara a la estación seleccionada.
- Controles probados para mostrar las rutas, reducir movimiento y abrir la ayuda.
- Mensajes de actividad solo desde eventos de demostración identificados como simulados.
- Mejor legibilidad y adaptación a ventanas de menor tamaño.
- Se conserva el código previo de robots, A*, editor, limpieza y dependencias.

## Límites

**El arte gráfico del escenario y los personajes sigue siendo el de la V1.** Es una revisión de interfaz y usabilidad, no el acabado artístico tipo aventura gráfica pintada de alta calidad. Tampoco sustituye una superprueba funcional de todas las colisiones, ocupaciones y puertas.

No tiene conexión con AUTOFABRICADOR real. `js/adaptador.js` continúa desactivando el modo REAL.

## Ejecución y personalización

Abrir `index.html` después de descargar la rama entera. Para cambiar colores y marcos, editar `design/experiencia-v2.css`; para cambiar los accesos a puestos, editar `design/experiencia-v2.js`; para cambiar sprites, robots o reglas, utilizar los módulos originales (`config/*`, `js/sprites.js`, `js/personajes.js`).

## Verificación

La demostración V2 se ha probado de manera aislada en Chromium: seis accesos, enfoque de cámara, rutas, movimiento reducido y ayuda; sin errores JavaScript ni peticiones externas en esa prueba.

## Próximos pasos

1. Ilustraciones originales por objeto y animaciones de los robots por estado.
2. Ensayos adversariales de rutas (puertas cerradas, esquinas, pasillos ocupados).
3. Acciones físicas con puntos de contacto para cada máquina y herramienta.
4. Diálogos vinculados a eventos, sin atribuir inferencia real a actividades decorativas.
5. Integración opcional de solo lectura con el supervisor, en un proyecto separado y tras pruebas de seguridad.
