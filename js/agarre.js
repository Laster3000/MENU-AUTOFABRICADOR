/* =====================================================================
   AUTOFABRICADOR · COGER Y SOLTAR ROBOTS
   ---------------------------------------------------------------------
   - Se coge un robot arrastrándolo con el ratón, o con el verbo COGER
     (el siguiente clic lo suelta).
   - Mientras está cogido deja de trabajar: su progreso se congela.
   - Al soltarlo: si tenía trabajo, corre como loco a su puesto (doble de
     velocidad) y sigue donde lo dejó; si no, se queda aturdido un momento
     y vuelve andando a la zona de descanso.
   Todo es visual y queda en DEMO.
   ===================================================================== */
window.AF = window.AF || {};

AF.agarre = {
  robot: null, modo: null,

  empezar(r, modo) {
    if (this.robot || !r || AF.ui.dialogo || AF.ui.moviendo) return false;
    this.robot = r; this.modo = modo;
    r.previo = { estado: r.estado, accion: r.accion, sub: r.sub };
    r.accion = null; r.camino = []; r.meta = null; r.prisa = false;
    if (r.tarea && r.tarea.tipo === 'fase') r.tarea.job.robotEnPuesto = false;
    r.cogido = true;
    AF.sim.cambiarEstado(r, 'COGIDO');
    if (AF.estado.siguiendo === r) AF.estado.siguiendo = null;
    AF.estado.seleccion = r;
    const trabajaba = r.previo.estado === 'WORKING' && r.tarea && r.tarea.tipo === 'fase';
    AF.sim.eventoYFrase(r, 'AGENT_GRABBED', { status: 'SIMULATED', jobId: r.tarea && r.tarea.job ? r.tarea.job.id : null,
      mensaje: r.nombre + ' cogido por el usuario' + (trabajaba ? ' (su trabajo se congela)' : '') });
    AF.sonido.clic();
    return true;
  },

  // el robot cuelga del cursor (p = posición del ratón en el mundo)
  mover(p) {
    const r = this.robot; if (!r) return;
    r.x = AF.util.limitar(p.x, 8, AF.ESCENA.mundo.ancho - 8);
    r.y = Math.min(p.y + 30, AF.ESCENA.mundo.sueloFin);
  },
  paso(dt) { const r = this.robot; if (r) { r.andando = true; r.anim += dt * 3; } },

  soltar() {
    const r = this.robot; if (!r) return;
    this.robot = null; this.modo = null;
    const N = AF.nav, M = AF.ESCENA.mundo;
    const yy = AF.util.limitar(r.y, N.y0 + 4, M.sueloFin - 4);
    const c = N.libreCercana(r.x, yy, AF.sim.ocupadas(r)) || N.libreCercana(r.x, yy);
    if (c) { const p = N.centro(c.c, c.r); r.x = p.x; r.y = p.y; } else r.y = yy;
    r.cogido = false; r.andando = false; r.dir = 'abajo';
    const prev = r.previo || { estado: 'IDLE' }; r.previo = null;
    const t = r.tarea;
    AF.eventos.emitir({ type: 'AGENT_DROPPED', status: 'SIMULATED', actor: r.id, agentRole: r.cfg.rol, jobId: t && t.job ? t.job.id : null,
      mensaje: r.nombre + ' soltado en x ' + Math.round(r.x) });

    // 1) estaba informando o haciendo una acción corta: la termina ahí mismo
    if (prev.accion) { r.accion = prev.accion; AF.sim.cambiarEstado(r, prev.estado, prev.sub); return; }
    // 2) tiene una fase de un encargo: corre a su puesto y sigue donde lo dejó
    if (t && t.tipo === 'fase' && t.job.estado === 'RUNNING' && AF.sim.fase(t.job) === t.fase) {
      const job = t.job, est = AF.mundo.obj(t.fase.estacion), mira = est.mira || 'arriba';
      r.prisa = true;
      AF.sim.eventoYFrase(r, 'AGENT_RUSH', { jobId: job.id, status: 'RUNNING' });
      AF.sim.irA(r, () => AF.mundo.punto(est, 'acceso'), () => {
        job.robotEnPuesto = true;
        if (job.paso === 'trabajando') {
          AF.sim.cambiarEstado(r, 'WORKING'); r.dir = mira;
          AF.sim.eventoYFrase(r, 'AGENT_RESUMED', { jobId: job.id, status: 'RUNNING', progress: job.progreso },
            { pct: Math.round((job.progreso || 0) * 100) });
        }
      }, mira);
      return;
    }
    // 3) iba de camino a algo (transporte, limpieza, volver): retoma la ruta
    if (r.objetivo && r.alLlegar && /ROUTING|WALKING|WAITING_PATH|BLOCKED|ASSIGNED/.test(prev.estado)) {
      r.prisa = !!t; AF.sim.cambiarEstado(r, 'ROUTING'); return;
    }
    // 4) estaba libre: se queda aturdido y vuelve a descansar
    AF.sim.eventoYFrase(r, 'AGENT_DIZZY', { status: 'SIMULATED' });
    AF.sim.accion(r, 1.4, 'ATURDIDO', () => AF.sim.volverABase(r));
  }
};
