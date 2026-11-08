/* =====================================================================
   AUTOFABRICADOR · ADAPTADOR DE EVENTOS (punto de integración futuro)
   ---------------------------------------------------------------------
   Hoy solo existe el modo DEMO (eventos sintéticos de js/simulacion.js).
   El modo REAL está DESACTIVADO a propósito: no hay ningún código que
   hable con el supervisor, ni que lance procesos o comandos.

   Cuando llegue el momento, el adaptador REAL debería:
     1. Conectarse SOLO en lectura a una API local (loopback) con
        autenticación, p. ej. un flujo SSE de journal y recibos.
     2. Convertir cada evento original al contrato schema 1
        { eventId, source:'supervisor', operationId, jobId, agentRole,
          type, status, timestamp, progress, receiptSha256 }
        y entregarlo con AF.eventos.emitir(...).
     3. Mover a los robots a partir de esos eventos (la escena nunca
        acredita trabajo por sí misma).
     4. Reconectar sin duplicar eventos (por eventId / secuencia).
   Ningún cambio visual, importación JSON o tema puede activar este modo.
   ===================================================================== */
window.AF = window.AF || {};

AF.adaptadores = {
  DEMO: {
    nombre: 'Simulación local',
    disponible: true,
    descripcion: 'Eventos sintéticos rotulados como simulación. 100 % desconectado del motor real.'
  },
  REAL: {
    nombre: 'AUTOFABRICADOR (solo lectura)',
    disponible: false,
    motivo: 'No conectado: requiere contrato explícito, autenticación y pruebas de integración aprobadas.',
    conectar() { throw new Error(this.motivo); }
  }
};
