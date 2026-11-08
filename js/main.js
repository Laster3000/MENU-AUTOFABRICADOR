/* =====================================================================
   AUTOFABRICADOR · ARRANQUE
   Orden: mundo → navegación → motor → interfaz → encargos de ejemplo.
   ===================================================================== */
(function () {
  function arrancar() {
    AF.registro.preparar();          // agentes, dependencias, puestos y sitios de descanso
    AF.mundo.iniciar();
    // validación inicial de la escena: si la personalización guardada rompe rutas, se descarta
    const v = AF.nav.validar(AF.mundo.objetos);
    if (!v.ok) {
      console.warn('Escena guardada no válida, se restaura la original:', v.errores);
      AF.almacen.borrar('escena-personalizada');
      AF.mundo.iniciar();
    }
    AF.motor.iniciar(document.getElementById('escena'));
    AF.ui.iniciar();
    AF.FLUJO.encargosDemo.forEach(d => AF.sim.crearEncargo(d));
    AF.eventos.emitir({ type: 'APP_READY', status: 'SIMULATED', mensaje: 'Menú listo en modo DEMO' });
    AF.registro.avisos.forEach(a => AF.eventos.emitir({ type: 'REGISTRY_NOTICE', status: 'SIMULATED', mensaje: a }));
    AF.registro.errores.forEach(e => AF.eventos.emitir({ type: 'AGENT_INVALID', status: 'BLOCKED', actor: e.agente, mensaje: 'Agente ' + e.agente + ' fuera del flujo: ' + e.motivo }));
    if (AF.registro.errores.length) setTimeout(() => AF.ui.narrar('Atención: ' + AF.registro.errores.map(e => e.agente + ' ' + e.motivo).join(' · ') + '. Mira la pestaña Dependencias.', '#ff9a8a', 9), 1500);
    AF.motor.camX = AF.motor.camObjetivo = 0;
    AF.ui.refrescar();
    setTimeout(() => {
      const pip = AF.sim.robotFase(0);
      if (pip) AF.sim.decir(pip, '¡Bienvenido a la fábrica! Pulsa Ejecutar cuando quieras.', { ambiental: true, dur: 5 });
    }, 900);
  }
  // espera a que las fuentes pixel estén listas para que el texto salga nítido desde el principio
  const listo = () => { try { arrancar(); } catch (e) { console.error(e); document.body.insertAdjacentHTML('beforeend', '<pre class="fallo">Error al arrancar: ' + e.message + '</pre>'); } };
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('16px VT323'), document.fonts.load('16px Pixelify')]).then(listo, listo);
  } else window.addEventListener('load', listo);
})();
