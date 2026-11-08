/* =====================================================================
   AUTOFABRICADOR · MUNDO Y SIMULACIÓN (modo DEMO)
   ---------------------------------------------------------------------
   - AF.mundo : objetos, robots, cajas, residuos, puerta.
   - AF.sim   : máquina de estados de robots, supervisor DEMO de
                encargos, transportes de TRANSPORTISTA y limpieza de LIMPIADOR.
   Todo lo que ocurre aquí es SIMULADO y se etiqueta como tal.
   Nada de este archivo se comunica con el AUTOFABRICADOR real.
   ===================================================================== */
window.AF = window.AF || {};

const ESTADOS_TXT = {
  IDLE: 'En descanso', ASSIGNED: 'Asignado', ROUTING: 'Calculando ruta', WALKING: 'Caminando',
  ARRIVED: 'En el puesto', WORKING: 'Trabajando', REPORTING: 'Informando', DONE: 'Hecho',
  RETURNING: 'Volviendo a base', WAITING_PATH: 'Esperando paso', BLOCKED: 'Bloqueado', ERROR: 'Error',
  STOP_REQUESTED: 'Parada solicitada', STOPPED_SAFE_BOUNDARY: 'Detenido (frontera segura)',
  RECOGER: 'Recogiendo', DEPOSITAR: 'Depositando',
  COGIDO: 'En el aire (cogido)', ATURDIDO: 'Aturdido'
};
AF.textoEstado = (e) => ESTADOS_TXT[e] || e;

/* =====================================================================
   MUNDO
   ===================================================================== */
AF.mundo = {
  objetos: [], robots: [], cajas: [], residuos: [], puerta: null,

  iniciar() {
    const guardado = AF.almacen.cargar('escena-personalizada', null);
    const base = AF.util.clonar(AF.ESCENA.objetos);
    // la personalización guardada solo cambia piezas que existen; las piezas nuevas (agentes nuevos) se añaden
    const g = {}, gr = {};
    if (guardado && guardado.schema === 1 && Array.isArray(guardado.objetos)) guardado.objetos.forEach(o => { g[o.id] = o; });
    if (guardado && Array.isArray(guardado.robots)) guardado.robots.forEach(c => { gr[c.id] = c; });
    this.objetos = base.map(o => {
      if (!g[o.id]) return o;
      const m = Object.assign({}, g[o.id], { robotId: o.robotId, generado: o.generado });
      if (o.tipo === 'rotulo' && o.props && o.props.robot) m.props = Object.assign({}, o.props);
      return m;
    });
    const VISUAL = ['nombre', 'cuerpo', 'acento', 'visor', 'voz', 'accesorio', 'bata', 'ruedas', 'velocidad', 'descripcion'];
    const robotsCfg = AF.util.clonar(AF.ROBOTS).map(c => { const s = gr[c.id]; if (s) VISUAL.forEach(k => { if (s[k] !== undefined) c[k] = s[k]; }); return c; });
    this.robots = robotsCfg.map((cfg, i) => this.crearRobot(cfg, i));
    const p = AF.ESCENA.puertas[0];
    this.puerta = { id: p.id, nombre: p.nombre, descripcion: p.descripcion, abierta: p.abierta, apertura: p.abierta ? 1 : 0, tipo: 'puerta' };
    this.objetos.forEach(o => { o.activa = false; o.reservadaPor = null; if (o.tipo === 'contenedor') o.carga = o.carga || 0; });
    AF.nav.construir();
  },

  crearRobot(cfg, i) {
    return {
      id: cfg.id, cfg, tipo: 'robot', nombre: cfg.nombre,
      x: cfg.base.x, y: cfg.base.y, dir: 'abajo', estado: 'IDLE', sub: null,
      camino: [], objetivo: null, alLlegar: null, mira: null, espera: 0, reintento: 0,
      accion: null, tarea: null, carga: null, habla: null, ultimoMensaje: null,
      anim: Math.random(), semilla: i * 1.37, andando: false, historial: [], ultimoBloqueo: null, ultimoBloqueoT: -99
    };
  },

  obj(id) { return this.objetos.find(o => o.id === id); },
  robot(id) { return this.robots.find(r => r.id === id); },
  puertaAbierta() { return !this.puerta || this.puerta.abierta; },
  contenedor() { return this.obj(AF.ESCENA.limpieza.contenedor); },

  punto(o, cual) {        // punto absoluto de acceso / depósito
    const k = o[cual] || { dx: 0, dy: 12 };
    return { x: o.x + k.dx, y: o.y + k.dy };
  },

  estacionMasCercana(x) {
    let m = null, d = 1e9;
    this.objetos.forEach(o => { if (o.tipo === 'estacion' && Math.abs(o.x - x) < d) { d = Math.abs(o.x - x); m = o; } });
    return m;
  },

  guardarPersonalizacion() {
    const limpio = this.objetos.map(o => { const c = Object.assign({}, o); delete c.activa; delete c.reservadaPor; delete c.tubo; delete c.resultado; return c; });
    AF.almacen.guardar('escena-personalizada', { schema: 1, objetos: limpio, robots: this.robots.map(r => r.cfg) });
  },

  // tras mover objetos o cerrar puertas: nueva rejilla y rutas recalculadas
  recalcular() {
    AF.nav.construir();
    this.robots.forEach(r => {
      if (r.estado === 'WALKING' || r.estado === 'WAITING_PATH' || r.estado === 'BLOCKED') { r.estado = 'ROUTING'; r.reintento = 0; }
    });
  }
};

/* =====================================================================
   SIMULACIÓN
   ===================================================================== */
AF.sim = {
  encargos: [], activo: null, transportes: [], entregas: [],
  relojCharla: 12, relojResiduo: 20, seqCaja: 0, seqResiduo: 0,

  /* ---------------- habla ---------------- */
  decir(r, texto, op) {
    op = op || {};
    const dur = op.dur || Math.min(7, 2.2 + texto.length * 0.06);
    r.habla = { texto, hasta: performance.now() / 1000 + dur, evento: op.evento || null, ambiental: !!op.ambiental };
    if (!op.ambiental) r.ultimoMensaje = r.habla;
    AF.sonido.habla();
  },
  // frase operativa: SIEMPRE nace de un evento
  eventoYFrase(r, tipo, datos, valores) {
    const plantillas = AF.DIALOGOS.eventos[tipo] || ['…'];
    const texto = AF.util.plantilla(AF.util.elegir(plantillas), valores || {});
    const ev = AF.eventos.emitir(Object.assign({ type: tipo, agentRole: r ? r.cfg.rol : null, actor: r ? r.id : null, mensaje: texto }, datos || {}));
    if (r) this.decir(r, texto, { evento: ev });
    return ev;
  },

  cambiarEstado(r, e, sub) {
    if (r.estado !== e) {
      r.historial.unshift({ t: AF.util.horaSeg(), estado: e, sub: sub || null });
      if (r.historial.length > 30) r.historial.pop();
    }
    r.estado = e;
    if (sub !== undefined) r.sub = sub;
  },

  /* ---------------- movimiento ---------------- */
  irA(r, objetivoFn, alLlegar, mira, sub) {
    r.objetivo = objetivoFn; r.alLlegar = alLlegar; r.mira = mira || null;
    r.camino = []; r.espera = 0; r.reintento = 0; r.volviendo = false;
    this.cambiarEstado(r, 'ROUTING', sub);
  },

  ocupadas(excepto) {
    const s = new Set();
    AF.mundo.robots.forEach(o => {
      if (o === excepto || o.cogido) return;
      const c = AF.nav.celdaDe(o.x, o.y); s.add(AF.nav.clave(c.c, c.r));
      if (o.camino && o.camino[0] && o.estado === 'WALKING') s.add(AF.nav.clave(o.camino[0].c, o.camino[0].r));
    });
    return s;
  },

  calcularRuta(r) {
    const N = AF.nav, dest = r.objetivo();
    let ini = N.celdaDe(r.x, r.y);
    if (!N.libre(ini.c, ini.r)) ini = N.libreCercana(r.x, r.y) || ini;
    let meta = N.celdaDe(dest.x, dest.y);
    if (!N.libre(meta.c, meta.r)) meta = N.libreCercana(dest.x, dest.y);
    if (!meta) return this.bloquear(r, 'NO_PATH');
    const ocup = this.ocupadas(r);
    const camino = N.ruta(ini, meta, ocup) || N.ruta(ini, meta);
    if (!camino) {
      // ¿la causa es la puerta?
      if (!AF.mundo.puertaAbierta()) {
        const guard = N.bloq; N.construir({ puertasAbiertas: true });
        const conPuerta = N.ruta(ini, meta); N.bloq = guard;
        if (conPuerta) return this.bloquear(r, 'DOOR_BLOCKED');
      }
      return this.bloquear(r, 'NO_PATH');
    }
    r.camino = camino;
    r.meta = N.libre(N.celdaDe(dest.x, dest.y).c, N.celdaDe(dest.x, dest.y).r) ? dest : N.centro(meta.c, meta.r);
    this.cambiarEstado(r, r.volviendo ? 'RETURNING' : 'WALKING');
  },

  bloquear(r, motivo) {
    this.cambiarEstado(r, motivo === 'DOOR_BLOCKED' ? 'BLOCKED' : 'WAITING_PATH');
    r.reintento = 2;
    const ahora = AF.estado.tiempo;
    if (r.ultimoBloqueo !== motivo || ahora - r.ultimoBloqueoT > 12) {
      r.ultimoBloqueo = motivo; r.ultimoBloqueoT = ahora;
      this.eventoYFrase(r, motivo, { status: 'BLOCKED', jobId: r.tarea && r.tarea.job ? r.tarea.job.id : null });
    }
  },

  pasoMovimiento(r, dt) {
    const N = AF.nav;
    if (r.estado === 'ROUTING') { this.calcularRuta(r); return; }
    if (r.estado === 'WAITING_PATH' || r.estado === 'BLOCKED') {
      r.reintento -= dt;
      if (r.reintento <= 0) this.calcularRuta(r);
      return;
    }
    if (r.estado !== 'WALKING' && r.estado !== 'RETURNING') { r.andando = false; return; }
    if (r.estado === 'RETURNING' && !r.camino.length && !r.meta) { r.andando = false; return; }

    let objetivo;
    if (r.camino.length) {
      const sig = r.camino[0];
      if (N.valor(sig.c, sig.r) !== 0) { this.cambiarEstado(r, 'ROUTING'); return; }   // cambió la rejilla
      // ¿otro robot en la celda siguiente?
      const ocup = this.ocupadas(r);
      if (ocup.has(N.clave(sig.c, sig.r))) {
        r.espera += dt; r.andando = false;
        if (r.espera > 1.2) { r.espera = 0; this.cambiarEstado(r, 'ROUTING'); }
        return;
      }
      objetivo = N.centro(sig.c, sig.r);
    } else objetivo = r.meta;

    const dx = objetivo.x - r.x, dy = objetivo.y - r.y, d = Math.hypot(dx, dy);
    const v = r.cfg.velocidad * (r.prisa ? 2 : 1) * dt;
    r.andando = true; r.espera = 0;
    r.anim += dt * (r.cfg.velocidad / 40);
    if (Math.abs(dx) > Math.abs(dy) * 1.2) r.dir = dx > 0 ? 'der' : 'izq';
    else if (Math.abs(dy) > 0.3) r.dir = dy > 0 ? 'abajo' : 'arriba';
    if (d <= v) {
      r.x = objetivo.x; r.y = objetivo.y;
      if (r.camino.length) r.camino.shift();
      else this.llegar(r);
    } else { r.x += dx / d * v; r.y += dy / d * v; }
  },

  llegar(r) {
    r.andando = false; r.meta = null; r.camino = []; r.prisa = false;
    if (r.mira) r.dir = r.mira;
    const fn = r.alLlegar; r.alLlegar = null;
    if (r.volviendo || (!fn && !r.tarea)) { r.volviendo = false; this.cambiarEstado(r, 'IDLE', null); r.dir = 'abajo'; }
    else this.cambiarEstado(r, 'ARRIVED');
    if (fn) fn(r);
  },

  volverABase(r) {
    r.tarea = null;
    this.irA(r, () => r.cfg.base, null, 'abajo', r.cfg.limpiador ? 'VOLVER_A_BASE' : null);
    r.volviendo = true;
  },

  accion(r, segundos, estado, fin, sub) {
    this.cambiarEstado(r, estado, sub);
    r.accion = { t: segundos, fin };
  },

  /* ---------------- encargos (supervisor DEMO) ---------------- */
  crearEncargo(d) {
    const colores = ['#f8e060', '#a0d8f0', '#f8a0c0', '#b8f0a0', '#e0b0ff', '#ffc080'];
    const job = {
      id: 'OJ-' + AF.util.hex(16), objetivo: d.objetivo, exportName: d.exportName || 'main',
      casos: d.casos | 0, prioridad: d.prioridad || 'normal', estado: 'EN_COLA', faseIdx: -1,
      reintentos: {}, creado: new Date(), terminado: null, paso: null, progreso: null,
      color: colores[this.encargos.length % colores.length], resultados: [], simulado: true
    };
    this.encargos.push(job);
    AF.eventos.emitir({ type: 'JOB_QUEUED', jobId: job.id, status: 'QUEUED', mensaje: 'Encargo en cola: ' + job.objetivo });
    return job;
  },

  enCola() {
    const peso = { alta: 0, normal: 1, baja: 2 };
    return this.encargos.filter(j => j.estado === 'EN_COLA').sort((a, b) => (peso[a.prioridad] - peso[b.prioridad]) || (a.creado - b.creado));
  },

  fase(job) { return AF.FLUJO.fases[job.faseIdx]; },
  robotFase(i) { const f = AF.FLUJO.fases[i < 0 ? AF.FLUJO.fases.length + i : i]; return f ? AF.mundo.robot(f.robot) : AF.mundo.robots[0]; },
  estacionFase(i) { const f = AF.FLUJO.fases[i < 0 ? AF.FLUJO.fases.length + i : i]; return f ? AF.mundo.obj(f.estacion) : null; },

  iniciarEncargo(job) {
    this.activo = job;
    job.estado = 'RUNNING';
    const est = AF.mundo.obj(AF.FLUJO.fases[0].estacion);
    const pd = AF.mundo.punto(est, 'deposito');
    job.caja = { id: 'caja-' + (++this.seqCaja), tipo: 'caja', asset: 'caja-encargo', jobId: job.id, x: pd.x, y: pd.y, estacion: est.id, portador: null, color: job.color, visible: false };
    AF.mundo.cajas.push(job.caja);
    est.tubo = 1;
    AF.eventos.emitir({ type: 'JOB_STARTED', jobId: job.id, status: 'RUNNING', mensaje: 'Inicia ' + job.id });
    // contrato del propietario: 5 a 80 casos o se bloquea ANTES de la IA
    const k = AF.FLUJO.contrato;
    if (job.casos < k.minCasos || job.casos > k.maxCasos) {
      job.estado = 'BLOCKED'; this.activo = null; AF.estado.errores++;
      this.eventoYFrase(this.robotFase(0), 'JOB_BLOCKED', { jobId: job.id, status: 'BLOCKED' });
      job.caja.visible = true;
      setTimeout(() => this.quitarCaja(job.caja), 4000);
      return;
    }
    this.irAFase(job, 0);
  },

  irAFase(job, idx) {
    job.faseIdx = idx;
    const fase = this.fase(job), est = AF.mundo.obj(fase.estacion);
    if (job.caja.estacion !== est.id && !job.caja.portador) this.transportes.push({ caja: job.caja, destino: est.id });
    job.paso = 'preparando'; job.robotEnPuesto = false; job.t = 0; job.progreso = null;
    const r = AF.mundo.robot(fase.robot);
    r.tarea = { tipo: 'fase', job, fase };
    this.cambiarEstado(r, 'ASSIGNED');
    AF.eventos.emitir({ type: 'TASK_ASSIGNED', jobId: job.id, agentRole: r.cfg.rol, actor: r.id, status: 'ASSIGNED', mensaje: r.nombre + ' asignado a ' + fase.nombre });
    if (est.reservadaPor && est.reservadaPor !== r.id) this.eventoYFrase(r, 'STATION_BUSY', { jobId: job.id });
    est.reservadaPor = r.id;
    this.irA(r, () => AF.mundo.punto(est, 'acceso'), () => { job.robotEnPuesto = true; }, est.mira || 'arriba');
  },

  avanzarEncargo(job, dt) {
    const fase = this.fase(job), est = AF.mundo.obj(fase.estacion), r = AF.mundo.robot(fase.robot);
    if (job.paso === 'preparando') {
      if (AF.estado.ejecucion === 'parando') return this.detenerEnFrontera(job);
      const cajaLista = job.caja.estacion === est.id && !job.caja.portador;
      if (job.robotEnPuesto && cajaLista && r.estado === 'ARRIVED') {
        job.paso = 'trabajando'; job.t = 0;
        est.activa = true; est.resultado = null;
        this.cambiarEstado(r, 'WORKING');
        r.dir = est.mira || 'arriba';
        this.eventoYFrase(r, fase.evento, { jobId: job.id, status: 'RUNNING', progress: 0 }, { encargo: job.exportName, n: job.casos, fase: fase.nombre.toLowerCase() });
      }
    } else if (job.paso === 'trabajando') {
      est.enEspera = r.estado !== 'WORKING';
      if (est.enEspera) return;             // cogido o corriendo de vuelta: el trabajo se congela
      job.t += dt;
      job.progreso = Math.min(1, job.t / fase.duracion);
      if (job.t >= fase.duracion) this.terminarFase(job, fase, est, r);
    }
  },

  terminarFase(job, fase, est, r) {
    est.activa = false; est.enEspera = false;
    let siguiente = job.faseIdx + 1;
    const usados = job.reintentos[fase.id] || 0;
    const falla = fase.probFallo && usados < (fase.maxReintentos || 0) && Math.random() < fase.probFallo;
    let ev;
    if (falla) {
      const n = AF.util.entero(1, 4);
      job.reintentos[fase.id] = usados + 1;
      est.resultado = 'fallo'; AF.estado.errores++;
      job.resultados.push({ fase: fase.nombre, ok: false, fallos: n, wasi: (job.casos - n) + '/' + job.casos, chrome: '—', t: AF.util.horaSeg() });
      ev = this.eventoYFrase(r, 'TESTS_FAILED', { jobId: job.id, status: 'FAILED' }, { n });
      siguiente = AF.FLUJO.fases.findIndex(f => f.id === fase.siFalla);
    } else {
      if (fase.id === 'pruebas') {
        est.resultado = 'ok';
        job.resultados.push({ fase: fase.nombre, ok: true, fallos: 0, wasi: job.casos + '/' + job.casos, chrome: job.casos + '/' + job.casos, t: AF.util.horaSeg() });
        ev = this.eventoYFrase(r, 'TESTS_PASSED', { jobId: job.id, status: 'SUCCEEDED' });
      } else if (fase.id === 'validacion') {
        est.resultado = 'ok';
        ev = this.eventoYFrase(r, 'VERIFY_PASSED', { jobId: job.id, status: 'SUCCEEDED' });
      } else ev = this.eventoYFrase(r, 'TASK_DONE', { jobId: job.id, status: 'SUCCEEDED' }, { fase: fase.nombre });
    }
    est.reservadaPor = null;
    this.accion(r, 1.6, 'REPORTING', () => { this.cambiarEstado(r, 'DONE'); this.volverABase(r); });
    if (siguiente >= AF.FLUJO.fases.length) return this.finalizarEncargo(job, est);
    if (AF.estado.ejecucion === 'parando') { job.faseIdx = siguiente; return this.detenerEnFrontera(job); }
    this.irAFase(job, siguiente);
  },

  finalizarEncargo(job, est) {
    job.estado = 'SUCCEEDED'; job.terminado = new Date(); job.paso = null; job.progreso = 1;
    job.shaDemo = AF.util.hex(64);
    job.caja.enCinta = true; job.caja.estacion = null;
    est.activa = true; setTimeout(() => { est.activa = false; }, 3500);
    this.entregas.unshift({ jobId: job.id, nombre: job.exportName + '.zip', sha: job.shaDemo, t: AF.util.horaSeg(), objetivo: job.objetivo });
    AF.estado.completadosHoy++;
    this.eventoYFrase(AF.mundo.robot(this.fase(job).robot), 'JOB_SUCCEEDED', { jobId: job.id, status: 'SUCCEEDED', mensaje: 'Paquete DEMO ' + job.exportName + '.zip (SHA simulado)' });
    this.activo = null;
    if (AF.estado.ejecucion === 'parando') this.cerrarParada();
    else if (!AF.FLUJO.encadenar) AF.estado.ejecucion = 'detenida';
  },

  quitarCaja(c) { AF.mundo.cajas = AF.mundo.cajas.filter(x => x !== c); },

  /* ---------------- controles ---------------- */
  ejecutar() {
    if (AF.estado.ejecucion === 'pausada' || AF.estado.ejecucion === 'detenida') {
      if (!this.activo && !this.enCola().length) {
        AF.ui.narrar('No hay encargos en cola. Crea uno nuevo en ENCARGOS.');
        return false;
      }
      AF.estado.ejecucion = 'operativa';
      AF.eventos.emitir({ type: 'RUN', status: 'RUNNING', mensaje: 'Fábrica en marcha (DEMO)' });
      if (this.activo && this.activo.estado === 'STOPPED') {
        this.activo.estado = 'RUNNING';
        AF.mundo.robots.forEach(r => { if (r.estado === 'STOPPED_SAFE_BOUNDARY') this.cambiarEstado(r, 'IDLE'); });
        this.irAFase(this.activo, this.activo.faseIdx);
      }
      return true;
    }
    return false;
  },
  pausar() {
    if (AF.estado.ejecucion === 'operativa') { AF.estado.ejecucion = 'pausada'; AF.eventos.emitir({ type: 'PAUSE', status: 'PAUSED', mensaje: 'Simulación en pausa' }); }
    else if (AF.estado.ejecucion === 'pausada') { AF.estado.ejecucion = 'operativa'; AF.eventos.emitir({ type: 'RESUME', status: 'RUNNING', mensaje: 'Simulación reanudada' }); }
  },
  detener() {
    if (AF.estado.ejecucion !== 'operativa' && AF.estado.ejecucion !== 'pausada') return;
    AF.estado.ejecucion = 'parando';
    const r = this.activo ? AF.mundo.robot(this.fase(this.activo).robot) : this.robotFase(0);
    this.eventoYFrase(r, 'STOP_REQUESTED', { status: 'STOP_REQUESTED', jobId: this.activo ? this.activo.id : null });
    if (!this.activo) this.cerrarParada();
  },
  detenerEnFrontera(job) {
    job.estado = 'STOPPED'; job.paso = 'detenido';
    const fase = this.fase(job), r = AF.mundo.robot(fase.robot), est = AF.mundo.obj(fase.estacion);
    est.reservadaPor = null;
    if (r.tarea && r.tarea.job === job) { r.tarea = null; this.volverABase(r); }
    this.cerrarParada();
  },
  cerrarParada() {
    AF.estado.ejecucion = 'detenida';
    const r = this.activo ? AF.mundo.robot(this.fase(this.activo).robot) : this.robotFase(0);
    this.eventoYFrase(r, 'STOPPED', { status: 'STOPPED_SAFE_BOUNDARY', jobId: this.activo ? this.activo.id : null });
  },

  /* ---------------- TRANSPORTISTA: transportes ---------------- */
  pasoCargo(r) {
    if (!this.transportes.length || r.tarea || !(r.estado === 'IDLE' || r.estado === 'RETURNING')) return;
    if (AF.estado.ejecucion === 'pausada') return;
    const tr = this.transportes.shift(), caja = tr.caja, dest = AF.mundo.obj(tr.destino);
    const origen = AF.mundo.obj(caja.estacion);
    r.tarea = { tipo: 'transporte', caja, destino: dest };
    this.cambiarEstado(r, 'ASSIGNED');
    this.irA(r, () => ({ x: caja.x, y: caja.y + 8 }), () => {
      this.accion(r, 0.6, 'WORKING', () => {
        caja.portador = r.id; caja.estacion = null; r.carga = { tipo: 'caja', obj: caja };
        this.eventoYFrase(r, 'CARGO_PICK', { jobId: caja.jobId, status: 'RUNNING' }, { estacion: origen ? origen.nombre : 'la estación' });
        this.irA(r, () => { const p = AF.mundo.punto(dest, 'deposito'); return { x: p.x, y: p.y + 8 }; }, () => {
          this.accion(r, 0.5, 'WORKING', () => {
            const p = AF.mundo.punto(dest, 'deposito');
            caja.x = p.x; caja.y = p.y; caja.portador = null; caja.estacion = dest.id; r.carga = null;
            this.eventoYFrase(r, 'CARGO_DROP', { jobId: caja.jobId, status: 'SUCCEEDED' }, { estacion: dest.nombre });
            r.tarea = null;
            if (!this.transportes.length) this.volverABase(r); else this.cambiarEstado(r, 'IDLE');
          });
        }, 'arriba');
      });
    }, 'arriba');
  },

  /* ---------------- LIMPIADOR: limpieza verificable ----------------
     DETECTAR → PRIORIZAR → CALCULAR_RUTA → CAMINAR → LLEGAR → RECOGER →
     TRANSPORTAR → CONTENEDOR → DEPOSITAR → CONFIRMAR_RETIRADA → VOLVER_A_BASE */
  crearResiduo(x, y, ambiental) {
    const c = AF.nav.celdaDe(x, y);
    if (!AF.nav.libre(c.c, c.r)) return null;
    const res = { id: 'res-' + AF.util.pad(++this.seqResiduo, 4), tipo: 'residuo', asset: 'residuo', x: Math.round(x), y: Math.round(y),
      clase: AF.util.elegir(['papel', 'papel', 'lata', 'platano', 'tornillo']), estado: 'SUELO', transportista: null,
      ambiental: !!ambiental, registro: [{ t: AF.util.horaSeg(), accion: 'CREADO' + (ambiental ? ' (ambiental)' : ' (usuario)') }] };
    AF.mundo.residuos.push(res);
    AF.eventos.emitir({ type: 'TRASH_CREATED', status: 'SIMULATED', mensaje: 'Residuo ' + res.id + (ambiental ? ' (ambientación)' : ' (creado por el usuario)'), objeto: res.id });
    return res;
  },

  pasoMop(r) {
    if (r.tarea || r.estado !== 'IDLE') return;
    const enSuelo = AF.mundo.residuos.filter(z => z.estado === 'SUELO');
    if (!enSuelo.length) return;
    // DETECTAR + PRIORIZAR: el más cercano
    r.sub = 'DETECTAR';
    enSuelo.sort((a, b) => Math.hypot(a.x - r.x, a.y - r.y) - Math.hypot(b.x - r.x, b.y - r.y));
    const res = enSuelo[0];
    r.sub = 'PRIORIZAR';
    res.estado = 'ASIGNADO'; res.transportista = r.id; res.registro.push({ t: AF.util.horaSeg(), accion: 'ASIGNADO a ' + r.nombre });
    r.tarea = { tipo: 'limpieza', residuo: res };
    const cerca = AF.mundo.estacionMasCercana(res.x);
    this.eventoYFrase(r, 'TRASH_SEEN', { status: 'RUNNING', objeto: res.id }, { estacion: cerca ? cerca.nombre.toLowerCase() : 'la entrada' });
    this.irA(r, () => ({ x: res.x, y: res.y }), () => this.mopLlega(r, res), null, 'CALCULAR_RUTA');
  },

  mopLlega(r, res) {
    r.sub = 'LLEGAR';
    if (!AF.mundo.residuos.includes(res) || res.estado !== 'ASIGNADO') {
      this.eventoYFrase(r, 'TRASH_GONE', { status: 'CANCELLED', objeto: res.id });
      r.tarea = null; this.cambiarEstado(r, 'IDLE', null);
      return;
    }
    this.accion(r, 0.9, 'RECOGER', () => {
      res.estado = 'TRANSPORTADO'; res.registro.push({ t: AF.util.horaSeg(), accion: 'RECOGIDO por ' + r.nombre });
      r.carga = { tipo: 'residuo', obj: res };
      AF.eventos.emitir({ type: 'TRASH_PICKED', status: 'RUNNING', actor: r.id, agentRole: r.cfg.rol, objeto: res.id, mensaje: r.nombre + ' recoge ' + res.id });
      this.mopAlContenedor(r, res);
    }, 'RECOGER');
  },

  mopAlContenedor(r, res) {
    const bin = AF.mundo.contenedor();
    this.irA(r, () => AF.mundo.punto(bin, 'acceso'), () => {
      r.sub = 'CONTENEDOR';
      const intentar = () => {
        if ((bin.carga || 0) >= AF.ESCENA.limpieza.capacidad) {
          if (r.estado !== 'BLOCKED') { this.cambiarEstado(r, 'BLOCKED', 'CONTENEDOR'); this.eventoYFrase(r, 'BIN_FULL', { status: 'BLOCKED', objeto: bin.id }); }
          r.accion = { t: 1, fin: intentar, bloqueado: true };
          return;
        }
        this.accion(r, 0.7, 'DEPOSITAR', () => {
          bin.carga = (bin.carga || 0) + 1;
          r.carga = null;
          res.estado = 'DEPOSITADO'; res.registro.push({ t: AF.util.horaSeg(), accion: 'DEPOSITADO en ' + bin.id });
          r.sub = 'CONFIRMAR_RETIRADA';
          AF.mundo.residuos = AF.mundo.residuos.filter(z => z !== res);   // solo ahora desaparece
          this.eventoYFrase(r, 'TRASH_DONE', { status: 'SUCCEEDED', objeto: res.id });
          r.tarea = null;
          this.volverABase(r);
        }, 'DEPOSITAR');
      };
      intentar();
    }, 'der', 'TRANSPORTAR');
  },

  vaciarContenedor() {
    const bin = AF.mundo.contenedor();
    const n = bin.carga || 0;
    bin.carga = 0;
    AF.eventos.emitir({ type: 'BIN_EMPTIED', status: 'SUCCEEDED', objeto: bin.id, mensaje: 'Contenedor vaciado (' + n + ' residuos simulados)' });
    return n;
  },

  /* ---------------- bucle principal ---------------- */
  paso(dtReal) {
    const E = AF.estado;
    const corriendo = E.ejecucion !== 'pausada';
    const dt = corriendo ? Math.min(0.1, dtReal) * E.velocidad : 0;
    E.tiempo += dt;

    // puerta (animación)
    const p = AF.mundo.puerta;
    p.apertura = AF.util.limitar(p.apertura + (p.abierta ? 1 : -1) * dtReal * 1.6, 0, 1);

    // tubo neumático y cajas en cinta
    AF.mundo.objetos.forEach(o => { if (o.tubo > 0) { o.tubo = Math.max(0, o.tubo - dtReal * 0.8); if (o.tubo === 0) { const j = this.activo; if (j && j.caja) j.caja.visible = true; } } });
    AF.mundo.cajas.forEach(c => {
      if (c.enCinta) {
        const fin = this.estacionFase(-1);
        if (!fin || fin.asset !== 'cinta-entrega') { c.t = (c.t || 0) + dtReal; if (c.t > 3) c.fuera = true; return; }
        c.x += dt * 16; c.y = Math.min(c.y, fin.y - 16); if (c.x > fin.x + 58) c.fuera = true;
      }
    });
    AF.mundo.cajas = AF.mundo.cajas.filter(c => !c.fuera);
    const ini = this.estacionFase(0);
    if (this.activo && this.activo.caja && !this.activo.caja.visible && !(ini && ini.tubo)) this.activo.caja.visible = true;

    if (!dt) return;

    // supervisor
    if (E.ejecucion === 'operativa' || E.ejecucion === 'parando') {
      if (!this.activo && E.ejecucion === 'operativa') {
        const sig = this.enCola()[0];
        if (sig) this.iniciarEncargo(sig);
      } else if (this.activo && this.activo.estado === 'RUNNING') this.avanzarEncargo(this.activo, dt);
    }

    // robots
    AF.mundo.robots.forEach(r => {
      if (r.cogido) return;
      if (r.accion) {
        r.accion.t -= dt;
        if (r.accion.t <= 0) { const fn = r.accion.fin; r.accion = null; fn && fn(); }
        r.andando = false;
        return;
      }
      this.pasoMovimiento(r, dt);
      if (r.cfg.transportista) this.pasoCargo(r);
      if (r.cfg.limpiador) this.pasoMop(r);
    });

    // residuos ambientales
    const L = AF.ESCENA.limpieza;
    if (E.ajustes.residuosAmbientales && L.residuosAmbientales) {
      this.relojResiduo -= dt;
      if (this.relojResiduo <= 0) {
        this.relojResiduo = AF.util.azar(L.intervalo[0], L.intervalo[1]);
        if (AF.mundo.residuos.filter(z => z.estado === 'SUELO').length < L.maxEnSuelo) {
          for (let i = 0; i < 10; i++) {
            const x = AF.util.azar(30, AF.ESCENA.mundo.ancho - 30), y = AF.util.azar(150, 210);
            if (this.crearResiduo(x, y, true)) break;
          }
        }
      }
    }

    // charla ambiental (etiquetada)
    if (E.ajustes.charla) {
      this.relojCharla -= dt;
      if (this.relojCharla <= 0) {
        this.relojCharla = AF.util.azar(14, 26);
        const libres = AF.mundo.robots.filter(r => (r.estado === 'IDLE') && !r.habla);
        if (libres.length) {
          const r = AF.util.elegir(libres), frases = AF.DIALOGOS.ambiente[r.id];
          if (frases) this.decir(r, AF.util.elegir(frases), { ambiental: true });
        }
      }
    }
    // los robots en espera miran a su alrededor
    AF.mundo.robots.forEach(r => { if (r.estado === 'IDLE' && Math.random() < dt * 0.15) r.mirada = AF.util.entero(-1, 1); });
  }
};
