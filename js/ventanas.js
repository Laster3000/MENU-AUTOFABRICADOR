/* =====================================================================
   AUTOFABRICADOR · VENTANAS
   ---------------------------------------------------------------------
   Sistema de ventanas desplazables, redimensionables y cerrables. Su
   posición se guarda por perfil (localStorage).
   Para añadir una ventana nueva:
     AF.ventanas.registrar('mi-id', {
       titulo: 'Mi ventana', icono: 'libro', ancho: 420, alto: 300,
       render(cuerpo) { cuerpo.innerHTML = '...'; },   // al abrir
       actualizar(cuerpo) { ... }                       // 4 veces/seg (opcional)
     });
   y enlázala desde una pestaña en config/menu.js.
   ===================================================================== */
window.AF = window.AF || {};

AF.ventanas = {
  defs: {}, abiertas: {}, z: 100, orden: [],
  posiciones: AF.almacen.cargar('ventanas', {}),

  registrar(id, def) { this.defs[id] = def; },
  estaAbierta(id) { return !!this.abiertas[id]; },
  alternar(id) { this.estaAbierta(id) ? this.cerrar(id) : this.abrir(id); },

  abrir(id, datos) {
    const def = this.defs[id];
    if (!def) { AF.ui.narrar('Esa ventana todavía no existe.'); return; }
    if (this.abiertas[id]) { this.alFrente(id); if (def.render && def.rehacerAlAbrir) def.render(this.abiertas[id].cuerpo, datos); return; }
    const capa = document.getElementById('capaVentanas');
    const v = document.createElement('div');
    v.className = 'ventana';
    const pos = this.posiciones[id] || this.posicionInicial(def);
    Object.assign(v.style, { left: pos.x + 'px', top: pos.y + 'px', width: (pos.w || def.ancho || 420) + 'px', height: (pos.h || def.alto || 320) + 'px' });
    v.innerHTML = `<div class="vTitulo">${def.icono ? `<img alt="" src="${AF.iconoURL(def.icono, 2)}">` : ''}<span>${AF.util.esc(def.titulo)}</span>
      <button class="vCerrar" title="Cerrar (Esc)">✕</button></div><div class="vCuerpo"></div>`;
    capa.appendChild(v);
    const cuerpo = v.querySelector('.vCuerpo');
    this.abiertas[id] = { el: v, cuerpo, def };
    v.addEventListener('mousedown', () => this.alFrente(id));
    v.querySelector('.vCerrar').onclick = () => { AF.sonido.clic(); this.cerrar(id); };
    this.arrastrable(id, v, v.querySelector('.vTitulo'));
    new ResizeObserver(() => this.guardarPos(id)).observe(v);
    this.alFrente(id);
    try { def.render(cuerpo, datos); } catch (e) { cuerpo.textContent = 'Error al construir la ventana: ' + e.message; console.error(e); }
    AF.ui.marcarPestanas();
  },

  posicionInicial(def) {
    const n = Object.keys(this.abiertas).length;
    const w = def.ancho || 420, h = def.alto || 320;
    return { x: Math.max(10, Math.round((window.innerWidth - w) / 2) + n * 26), y: Math.max(70, Math.round((window.innerHeight - h) / 2.6) + n * 26), w, h };
  },

  cerrar(id) {
    const a = this.abiertas[id]; if (!a) return;
    if (a.def.alCerrar) a.def.alCerrar();
    a.el.remove(); delete this.abiertas[id];
    this.orden = this.orden.filter(x => x !== id);
    AF.ui.marcarPestanas();
  },
  cerrarTodas() { Object.keys(this.abiertas).forEach(id => this.cerrar(id)); },
  cerrarUltima() { const id = this.orden[this.orden.length - 1]; if (id) this.cerrar(id); },
  alFrente(id) { const a = this.abiertas[id]; if (!a) return; a.el.style.zIndex = ++this.z; this.orden = this.orden.filter(x => x !== id).concat(id); },

  arrastrable(id, v, asa) {
    asa.addEventListener('mousedown', ev => {
      if (ev.target.closest('button')) return;
      const ox = ev.clientX - v.offsetLeft, oy = ev.clientY - v.offsetTop;
      const mover = e => {
        v.style.left = AF.util.limitar(e.clientX - ox, -v.offsetWidth + 80, window.innerWidth - 80) + 'px';
        v.style.top = AF.util.limitar(e.clientY - oy, 0, window.innerHeight - 40) + 'px';
      };
      const soltar = () => { window.removeEventListener('mousemove', mover); window.removeEventListener('mouseup', soltar); this.guardarPos(id); };
      window.addEventListener('mousemove', mover); window.addEventListener('mouseup', soltar);
    });
  },
  guardarPos(id) {
    const a = this.abiertas[id]; if (!a) return;
    const v = a.el;
    this.posiciones[id] = { x: v.offsetLeft, y: v.offsetTop, w: v.offsetWidth, h: v.offsetHeight };
    AF.almacen.guardar('ventanas', this.posiciones);
  },
  restablecerPosiciones() { this.posiciones = {}; AF.almacen.borrar('ventanas'); },

  actualizarAbiertas() {
    for (const id in this.abiertas) {
      const a = this.abiertas[id];
      if (a.def.actualizar) try { a.def.actualizar(a.cuerpo); } catch (e) { console.error(e); }
    }
  }
};

/* =====================================================================
   CONTENIDO DE LAS VENTANAS
   ===================================================================== */
(function () {
  const V = AF.ventanas, esc = AF.util.esc;
  const demo = '<p class="aviso demo">🛈 MODO DEMO · datos simulados, sin conexión con AUTOFABRICADOR.</p>';
  const noReal = (txt) => `<button class="btn" disabled title="Modo REAL no conectado: requiere el adaptador autorizado de solo lectura (ver LEEME).">${txt}</button>
     <small class="motivo">Desactivado: el modo REAL aún no está conectado.</small>`;
  const estadoChip = (e) => `<span class="chip ${({ SUCCEEDED: 'ok', RUNNING: 'cian', FAILED: 'mal', BLOCKED: 'mal', STOPPED: 'aviso', EN_COLA: 'neutro', CANCELADO: 'neutro' })[e] || 'neutro'}">${esc(e)}</span>`;
  const barra = (p) => p == null ? '<small>sin estimación</small>' : `<div class="barra" title="Progreso simulado"><i style="width:${Math.round(p * 100)}%"></i></div><small>${Math.round(p * 100)}% sim.</small>`;

  /* ---------------- NUEVO ENCARGO ---------------- */
  V.registrar('nuevo', {
    titulo: 'Nuevo encargo', icono: 'pergamino', ancho: 520, alto: 520,
    render(c) {
      const K = AF.FLUJO.contrato;
      c.innerHTML = demo + `
        <form class="formulario" onsubmit="return false">
          <label>Objetivo <input name="objetivo" maxlength="120" placeholder="Ej.: Calcula el triple de un número"></label>
          <label>Nombre de la función exportada <input name="exportName" maxlength="40" placeholder="calculateTriple"></label>
          <div class="fila">
            <label>Casos de aceptación <input name="casos" type="number" min="1" max="200" value="10"></label>
            <label>Prioridad <select name="prioridad"><option value="normal">Normal</option><option value="alta">Alta</option><option value="baja">Baja</option></select></label>
          </div>
          <label>Criterios de aceptación (opcional, uno por línea)<textarea name="criterios" rows="3" placeholder='{"args":[2],"expected":6}'></textarea></label>
          <label>Archivos de apoyo <input name="archivos" type="file" multiple><small>Solo se anotan los nombres; no se envían a ningún sitio.</small></label>
          <p class="nota">Contrato del motor real: lenguaje ${esc(K.lenguaje)}, entre ${K.minCasos} y ${K.maxCasos} pruebas del propietario. Sin pruebas, el encargo se bloquea antes de llamar a la IA.</p>
          <div class="acciones"><button class="btn" data-a="revisar">Revisar antes de enviar</button></div>
          <div class="revision"></div>
        </form>`;
      const f = c.querySelector('form');
      f.querySelector('[data-a=revisar]').onclick = () => {
        const d = { objetivo: f.objetivo.value.trim(), exportName: f.exportName.value.trim(), casos: +f.casos.value, prioridad: f.prioridad.value,
          archivos: Array.from(f.archivos.files || []).map(x => x.name) };
        const errores = [];
        if (d.objetivo.length < 4) errores.push('Escribe un objetivo.');
        if (!/^[A-Za-z_$][\w$]*$/.test(d.exportName)) errores.push('El nombre de función debe ser un identificador JavaScript válido.');
        if (d.casos < K.minCasos || d.casos > K.maxCasos) errores.push(`Hacen falta entre ${K.minCasos} y ${K.maxCasos} casos (tienes ${d.casos}).`);
        const rv = f.querySelector('.revision');
        rv.innerHTML = `<h4>Revisión</h4><table class="tabla"><tr><th>Objetivo</th><td>${esc(d.objetivo || '—')}</td></tr>
          <tr><th>Función</th><td><code>${esc(d.exportName || '—')}</code></td></tr><tr><th>Casos</th><td>${d.casos}</td></tr>
          <tr><th>Prioridad</th><td>${esc(d.prioridad)}</td></tr><tr><th>Archivos</th><td>${esc(d.archivos.join(', ') || 'ninguno')}</td></tr></table>
          ${errores.length ? `<ul class="errores">${errores.map(e => '<li>' + esc(e) + '</li>').join('')}</ul>` : '<p class="ok">✔ Cumple el contrato.</p>'}
          <div class="acciones"><button class="btn primario" data-a="enviar" ${errores.length ? 'disabled' : ''}>Enviar a la simulación</button> ${noReal('Enviar al motor real')}</div>`;
        const b = rv.querySelector('[data-a=enviar]');
        if (b) b.onclick = () => {
          const j = AF.sim.crearEncargo(d);
          AF.ui.narrar(`Encargo ${j.id} añadido a la cola.`);
          V.cerrar('nuevo'); V.abrir('encargos'); AF.ui.refrescar();
        };
      };
    }
  });

  /* ---------------- ENCARGOS ---------------- */
  V.registrar('encargos', {
    titulo: 'Encargos', icono: 'pergamino', ancho: 760, alto: 400,
    render(c) {
      c.innerHTML = demo + `<div class="acciones"><button class="btn primario" data-a="nuevo">+ Nuevo encargo</button>
        <span class="resumen"></span></div><div class="tablaCont"><table class="tabla"><thead><tr><th>ID</th><th>Objetivo</th><th>Prior.</th>
        <th>Estado</th><th>Fase</th><th>Progreso</th><th>Reint.</th><th></th></tr></thead><tbody></tbody></table></div>`;
      c.querySelector('[data-a=nuevo]').onclick = () => V.abrir('nuevo');
      c.querySelector('tbody').onclick = ev => {
        const b = ev.target.closest('button'); if (!b) return;
        const j = AF.sim.encargos.find(x => x.id === b.dataset.id); if (!j) return;
        if (b.dataset.a === 'subir') { j.prioridad = j.prioridad === 'baja' ? 'normal' : 'alta'; AF.eventos.emitir({ type: 'JOB_REPRIORITIZED', jobId: j.id, mensaje: 'Prioridad de ' + j.id + ': ' + j.prioridad }); }
        if (b.dataset.a === 'cancelar') { j.estado = 'CANCELADO'; AF.eventos.emitir({ type: 'JOB_CANCELLED', jobId: j.id, status: 'CANCELLED', mensaje: 'Encargo ' + j.id + ' retirado de la cola' }); }
        if (b.dataset.a === 'ver') { V.abrir('historial'); V.defs.historial.filtrarJob = j.id; }
        this._firma = null; AF.ui.refrescar();
      };
      this._firma = null; this.actualizar(c);
    },
    actualizar(c) {
      const L = AF.sim.encargos.slice().reverse();
      const firma = L.map(j => j.id + j.estado + j.faseIdx + j.prioridad + Math.round((j.progreso || 0) * 20)).join();
      if (firma === this._firma) return; this._firma = firma;
      c.querySelector('.resumen').textContent = `${AF.sim.enCola().length} en cola · ${L.filter(j => j.estado === 'SUCCEEDED').length} completados · ${L.filter(j => j.estado === 'BLOCKED').length} bloqueados`;
      c.querySelector('tbody').innerHTML = L.map(j => {
        const f = AF.FLUJO.fases[j.faseIdx];
        const reint = Object.values(j.reintentos).reduce((a, b) => a + b, 0);
        return `<tr><td><code>${esc(j.id.slice(0, 11))}…</code></td><td>${esc(j.objetivo)}<br><small><code>${esc(j.exportName)}</code> · ${j.casos} casos</small></td>
          <td>${esc(j.prioridad)}</td><td>${estadoChip(j.estado)}</td><td>${f && j.estado !== 'EN_COLA' ? esc(f.nombre) : '—'}</td>
          <td>${j.estado === 'RUNNING' ? barra(j.paso === 'trabajando' ? j.progreso : null) : j.estado === 'SUCCEEDED' ? '✔' : '—'}</td><td>${reint}</td>
          <td class="botones">${j.estado === 'EN_COLA' ? `<button class="mini" data-a="subir" data-id="${j.id}" title="Subir prioridad">▲</button><button class="mini" data-a="cancelar" data-id="${j.id}" title="Quitar de la cola">✕</button>` : ''}
          <button class="mini" data-a="ver" data-id="${j.id}" title="Ver eventos">☰</button></td></tr>`;
      }).join('') || '<tr><td colspan="8">No hay encargos.</td></tr>';
    }
  });

  /* ---------------- AGENTES ---------------- */
  V.registrar('agentes', {
    titulo: 'Agentes', icono: 'robot', ancho: 760, alto: 430,
    render(c) {
      c.innerHTML = `<p class="aviso">Estos robots son <b>personajes de la interfaz</b>, no modelos de IA ni agentes instalados. El motor real usa un solo modelo codificador (Qwen2.5-Coder 7B) y etapas deterministas.</p>
        <div class="tablaCont"><table class="tabla"><thead><tr><th>Robot</th><th>Rol visual</th><th>Etapa real</th><th>Estado</th><th>Tarea</th><th></th></tr></thead><tbody></tbody></table></div>`;
      c.querySelector('tbody').onclick = ev => {
        const b = ev.target.closest('button'); if (!b) return;
        const r = AF.mundo.robot(b.dataset.id);
        AF.estado.seleccion = r;
        if (b.dataset.a === 'seguir') AF.estado.siguiendo = r;
        else V.abrir('inspector');
      };
      this.actualizar(c);
    },
    actualizar(c) {
      c.querySelector('tbody').innerHTML = AF.mundo.robots.map(r => {
        const f = AF.FLUJO.fases.find(x => x.robot === r.id);
        const tarea = r.tarea ? (r.tarea.tipo === 'fase' ? r.tarea.fase.nombre + ' · ' + r.tarea.job.exportName : r.tarea.tipo === 'transporte' ? 'Transporte → ' + r.tarea.destino.nombre : 'Limpieza ' + r.tarea.residuo.id) : '—';
        return `<tr><td><b style="color:${r.cfg.voz}">${esc(r.nombre)}</b></td><td>${esc(r.cfg.rol)}</td><td><code>${f ? esc(f.rolReal) : (r.cfg.limpiador ? 'ambiental' : 'simbólico')}</code></td>
          <td>${esc(AF.textoEstado(r.estado))}${r.sub ? '<br><small>' + esc(r.sub) + '</small>' : ''}</td><td>${esc(tarea)}</td>
          <td class="botones"><button class="mini" data-a="seguir" data-id="${r.id}">Seguir</button><button class="mini" data-a="ver" data-id="${r.id}">Inspeccionar</button></td></tr>`;
      }).join('');
    }
  });

  /* ---------------- INSPECTOR ---------------- */
  V.registrar('inspector', {
    titulo: 'Inspector', icono: 'lapiz', ancho: 380, alto: 380,
    render(c) { this._ult = null; this.actualizar(c); },
    actualizar(c) {
      const s = AF.estado.seleccion;
      if (!s) { c.innerHTML = '<p>Usa MIRAR sobre un robot u objeto para inspeccionarlo.</p>'; return; }
      let h = '';
      if (s.tipo === 'robot') {
        const m = s.ultimoMensaje;
        h = `<h3 style="color:${s.cfg.voz}">${esc(s.nombre)} · ${esc(s.cfg.rol)}</h3>
          <table class="tabla"><tr><th>Estado</th><td>${esc(s.estado)} — ${esc(AF.textoEstado(s.estado))}</td></tr>
          <tr><th>Subestado</th><td>${esc(s.sub || '—')}</td></tr>
          <tr><th>Posición</th><td>x ${Math.round(s.x)} · y ${Math.round(s.y)} · ${esc(s.dir)}</td></tr>
          <tr><th>Ruta</th><td>${s.camino.length} pasos</td></tr>
          <tr><th>Carga</th><td>${s.carga ? esc(s.carga.tipo + ' ' + (s.carga.obj.id || '')) : '—'}</td></tr>
          <tr><th>Último aviso</th><td>${m ? esc(m.texto) + (m.evento ? `<br><small>Causa: <code>${esc(m.evento.eventId)}</code> ${esc(m.evento.type)} · ${esc(m.evento.status || '')} · ${m.evento.simulado ? 'simulado' : 'real'}</small>` : '') : '—'}</td></tr></table>
          <h4>Historial de estados</h4><ul class="mini-lista">${s.historial.slice(0, 10).map(e => `<li><code>${e.t}</code> ${esc(e.estado)}${e.sub ? ' · ' + esc(e.sub) : ''}</li>`).join('')}</ul>`;
      } else if (s.tipo === 'residuo') {
        h = `<h3>Residuo ${esc(s.id)}</h3><table class="tabla"><tr><th>Clase</th><td>${esc(s.clase)}</td></tr><tr><th>Estado</th><td>${esc(s.estado)}</td></tr>
          <tr><th>Transportista</th><td>${esc(s.transportista || '—')}</td></tr><tr><th>Origen</th><td>${s.ambiental ? 'ambientación' : 'usuario'}</td></tr></table>
          <h4>Registro</h4><ul class="mini-lista">${s.registro.map(e => `<li><code>${e.t}</code> ${esc(e.accion)}</li>`).join('')}</ul>`;
      } else {
        const r = s.reservadaPor ? AF.mundo.robot(s.reservadaPor) : null;
        h = `<h3>${esc(s.nombre || s.id)}</h3><p>${esc(s.descripcion || '')}</p><table class="tabla">
          <tr><th>id</th><td><code>${esc(s.id)}</code></td></tr><tr><th>Tipo</th><td>${esc(s.tipo)}</td></tr>
          ${s.asset ? `<tr><th>Asset</th><td><code>${esc(s.asset)}</code></td></tr>` : ''}
          ${s.x != null ? `<tr><th>Posición</th><td>x ${s.x} · y ${s.y}</td></tr>` : ''}
          ${s.tipo === 'estacion' ? `<tr><th>Actividad</th><td>${s.activa ? 'Trabajando (simulado)' : 'Inactiva'}</td></tr><tr><th>Reserva</th><td>${r ? esc(r.nombre) : 'libre'}</td></tr>` : ''}
          ${s.tipo === 'contenedor' ? `<tr><th>Carga</th><td>${s.carga || 0} / ${AF.ESCENA.limpieza.capacidad}</td></tr>` : ''}
          ${s.tipo === 'puerta' ? `<tr><th>Estado</th><td>${s.abierta ? 'Abierta' : 'Cerrada'}</td></tr>` : ''}</table>`;
        if (s.tipo !== 'puerta' && s.tipo !== 'caja') h += `<div class="acciones"><button class="btn" data-a="editar">Editar en el editor</button></div>`;
      }
      if (h !== this._ult) {
        this._ult = h; c.innerHTML = h;
        const b = c.querySelector('[data-a=editar]'); if (b) b.onclick = () => { AF.editor.seleccionado = s.id; V.abrir('editor'); V.defs.editor.render(V.abiertas.editor.cuerpo); };
      }
    }
  });

  /* ---------------- LABORATORIO ---------------- */
  V.registrar('laboratorio', {
    titulo: 'Laboratorio de pruebas', icono: 'matraz', ancho: 640, alto: 440,
    render(c) { this._f = null; c.innerHTML = demo + '<div class="lab"></div>'; this.actualizar(c); },
    actualizar(c) {
      const filas = [];
      AF.sim.encargos.forEach(j => j.resultados.forEach(r => filas.push({ j, r })));
      const firma = filas.length; if (firma === this._f) return; this._f = firma;
      c.querySelector('.lab').innerHTML = `
        <h4>Plan de verificación del motor real</h4>
        <ol class="plan"><li><b>A</b> Aceptación independiente: casos preparados antes de generar código.</li>
        <li><b>B</b> Compilación y estructura ESM.</li><li><b>C</b> Ejecución aislada WASI (sin red ni carpetas).</li>
        <li><b>D</b> Navegador Chrome offline.</li><li><b>E</b> Regresión y caja negra (STOP, UNKNOWN, límites).</li>
        <li><b>F</b> Integridad SHA y restauración.</li></ol>
        <h4>Resultados de la simulación</h4>
        <div class="tablaCont"><table class="tabla"><thead><tr><th>Hora</th><th>Encargo</th><th>Resultado</th><th>WASI</th><th>Chrome</th></tr></thead><tbody>
        ${filas.reverse().map(({ j, r }) => `<tr><td><code>${r.t}</code></td><td>${esc(j.exportName)}</td><td>${r.ok ? '<span class="chip ok">PASS</span>' : `<span class="chip mal">FAILED · ${r.fallos} errores</span>`}</td><td>${r.wasi}</td><td>${r.chrome}</td></tr>`).join('') || '<tr><td colspan="5">Todavía no hay pruebas. Inicia un encargo.</td></tr>'}
        </tbody></table></div><p class="nota">Cifras inventadas por la simulación: no acreditan nada del motor real.</p>`;
    }
  });

  /* ---------------- HISTORIAL ---------------- */
  V.registrar('historial', {
    titulo: 'Historial de eventos', icono: 'libro', ancho: 760, alto: 460, filtrarJob: null,
    render(c) {
      c.innerHTML = `<div class="acciones"><select data-a="filtro"><option value="">Todos</option><option value="op">Operativos</option><option value="limpieza">Limpieza</option><option value="control">Control y escena</option></select>
        <input data-a="buscar" placeholder="Buscar…"><button class="btn" data-a="exportar">Exportar JSON</button><span class="resumen"></span></div>
        <div class="tablaCont"><table class="tabla eventos"><thead><tr><th>Hora</th><th>eventId</th><th>Tipo</th><th>Estado</th><th>Encargo</th><th>Mensaje</th></tr></thead><tbody></tbody></table></div>`;
      c.querySelector('[data-a=exportar]').onclick = () => AF.editor.descargar('autofabricador-eventos-demo.json', JSON.stringify(AF.eventos.lista, null, 2));
      c.querySelector('[data-a=filtro]').onchange = () => { this._f = null; this.actualizar(c); };
      c.querySelector('[data-a=buscar]').oninput = () => { this.filtrarJob = null; this._f = null; this.actualizar(c); };
      this._f = null; this.actualizar(c);
    },
    actualizar(c) {
      const fil = c.querySelector('[data-a=filtro]').value, q = (this.filtrarJob || c.querySelector('[data-a=buscar]').value || '').toLowerCase();
      if (this.filtrarJob) c.querySelector('[data-a=buscar]').value = this.filtrarJob;
      const firma = AF.eventos.seq + fil + q; if (firma === this._f) return; this._f = firma;
      const grupo = e => /TRASH|BIN/.test(e.type) ? 'limpieza' : /RUN|PAUSE|RESUME|STOP|DOOR|LAYOUT|EDIT|IMPORT/.test(e.type) ? 'control' : 'op';
      const L = AF.eventos.lista.filter(e => (!fil || grupo(e) === fil) && (!q || JSON.stringify(e).toLowerCase().includes(q))).slice(-200).reverse();
      c.querySelector('.resumen').textContent = L.length + ' eventos · origen: ' + (AF.estado.modo === 'DEMO' ? 'demo (simulados)' : 'supervisor');
      c.querySelector('tbody').innerHTML = L.map(e => `<tr class="${/FAIL|BLOCK/.test(e.type + e.status) ? 'mal' : ''}"><td><code>${AF.util.horaSeg(new Date(e.timestamp))}</code></td><td><code>${e.eventId}</code></td>
        <td>${esc(e.type)}</td><td>${esc(e.status || '')}</td><td><code>${esc(e.jobId ? e.jobId.slice(0, 11) : '')}</code></td><td>${esc(e.mensaje)}</td></tr>`).join('');
    }
  });

  /* ---------------- MODELOS IA ---------------- */
  V.registrar('modelos', {
    titulo: 'Modelos IA', icono: 'robot', ancho: 520, alto: 330,
    render(c) {
      c.innerHTML = demo + `<table class="tabla"><thead><tr><th>Modelo</th><th>Proveedor</th><th>Recurso</th><th>Estado</th></tr></thead><tbody>
        <tr><td>Qwen2.5-Coder 7B</td><td>llama.cpp local</td><td>GPU CUDA</td><td><span class="chip neutro">sin lectura (DEMO)</span></td></tr>
        <tr><td>Aider</td><td>editor proponente</td><td>—</td><td><span class="chip neutro">apoyo</span></td></tr>
        <tr><td>Codex CLI / OpenCode</td><td>asesor textual</td><td>—</td><td><span class="chip neutro">apoyo</span></td></tr></tbody></table>
        <p class="nota">La disponibilidad, VRAM y uso real se mostrarán cuando exista el adaptador de solo lectura.</p>
        <div class="acciones">${noReal('Cambiar modelo')}</div>`;
    }
  });

  /* ---------------- CÓDIGO ---------------- */
  V.registrar('codigo', {
    titulo: 'Código propuesto', icono: 'lapiz', ancho: 600, alto: 420,
    render(c) {
      const j = AF.sim.activo || AF.sim.encargos.filter(x => x.estado === 'SUCCEEDED').slice(-1)[0];
      const fn = j ? j.exportName : 'calculateTriple';
      c.innerHTML = `<p class="aviso demo">🛈 Propuesta SIMULADA para ilustrar la pantalla. No es código generado por la IA.</p>
        <h4>src/${esc(fn)}.js</h4><pre>export function ${esc(fn)}(...args) {\n  // el motor real escribe aquí el código del LOCAL-CODER\n  throw new Error('demo');\n}</pre>
        <h4>src/index.js</h4><pre>export { ${esc(fn)} } from './${esc(fn)}.js';</pre>
        <div class="acciones">${noReal('Ver diff real')}</div>`;
    }
  });

  /* ---------------- ENTREGAS ---------------- */
  V.registrar('entregas', {
    titulo: 'Entregas', icono: 'caja', ancho: 620, alto: 360,
    render(c) { this._n = -1; c.innerHTML = demo + '<div class="tablaCont"><table class="tabla"><thead><tr><th>Hora</th><th>Paquete</th><th>Objetivo</th><th>SHA-256 (simulado)</th></tr></thead><tbody></tbody></table></div>'; this.actualizar(c); },
    actualizar(c) {
      if (AF.sim.entregas.length === this._n) return; this._n = AF.sim.entregas.length;
      c.querySelector('tbody').innerHTML = AF.sim.entregas.map(e => `<tr><td><code>${e.t}</code></td><td>${esc(e.nombre)}</td><td>${esc(e.objetivo)}</td><td><code title="${e.sha}">demo:${e.sha.slice(0, 16)}…</code></td></tr>`).join('') || '<tr><td colspan="4">Sin entregas todavía.</td></tr>';
    }
  });

  /* ---------------- AJUSTES ---------------- */
  V.registrar('ajustes', {
    titulo: 'Ajustes', icono: 'engranaje', ancho: 460, alto: 560,
    render(c) {
      const A = AF.estado.ajustes;
      const chk = (k, t) => `<label class="chk"><input type="checkbox" data-k="${k}" ${A[k] ? 'checked' : ''}> ${t}</label>`;
      c.innerHTML = `<form class="formulario" onsubmit="return false">
        <h4>Gráficos</h4>
        <label>Calidad <select data-k="calidad"><option value="alta">Alta (luces y partículas)</option><option value="media">Media (luces)</option><option value="baja">Baja (ahorra GPU para la IA)</option></select></label>
        ${chk('movimientoReducido', 'Movimiento reducido')}
        ${chk('verNavegacion', 'Mostrar rejilla de navegación y rutas')}
        <h4>Texto y sonido</h4>
        ${chk('subtitulos', 'Mostrar lo que dicen los robots')}
        <label>Tamaño del texto <input type="range" min="0.7" max="1.6" step="0.1" data-k="tamTexto" value="${A.tamTexto}"></label>
        ${chk('sonido', 'Pitidos 8-bit')}
        <label>Volumen <input type="range" min="0" max="1" step="0.1" data-k="volumen" value="${A.volumen}"></label>
        <h4>Simulación</h4>
        ${chk('charla', 'Charla ambiental (marcada con ~)')}
        ${chk('residuosAmbientales', 'Basura ambiental para LIMPIADOR')}
        <h4>Conexión</h4>
        <label>Modo <select disabled><option>DEMO (simulación)</option></select></label>
        <div class="acciones">${noReal('Conectar en modo REAL')}</div>
        <h4>Restablecer</h4>
        <div class="acciones"><button class="btn" data-a="pos">Recolocar ventanas</button><button class="btn" data-a="todo">Borrar personalización de la escena</button></div>
        <p class="nota">Rendimiento: <span class="fps"></span></p></form>`;
      c.querySelector('[data-k=calidad]').value = A.calidad;
      c.querySelectorAll('[data-k]').forEach(i => i.onchange = i.oninput = () => {
        const k = i.dataset.k;
        A[k] = i.type === 'checkbox' ? i.checked : i.type === 'range' ? +i.value : i.value;
        AF.guardarAjustes();
      });
      c.querySelector('[data-a=pos]').onclick = () => { V.restablecerPosiciones(); AF.ui.narrar('Las ventanas volverán a su sitio al abrirlas.'); };
      c.querySelector('[data-a=todo]').onclick = () => AF.editor.restaurarOriginal();
    },
    actualizar(c) { const f = c.querySelector('.fps'); if (f) f.textContent = AF.motor.fps + ' fps · escala ' + AF.motor.escala + 'x'; }
  });

  /* ---------------- AYUDA ---------------- */
  V.registrar('ayuda', {
    titulo: 'Ayuda', icono: 'libro', ancho: 640, alto: 520,
    render(c) {
      c.innerHTML = `<div class="ayuda">
        <h3>Cómo se juega</h3>
        <p>Elige un <b>verbo</b> abajo y haz clic en algo de la fábrica. Sin verbo, el clic usa el verbo <b>sugerido</b> (resaltado). <b>Clic derecho</b> = Mirar.</p>
        <table class="tabla"><tr><th>Mirar</th><td>Describe e inspecciona (robots, estaciones, residuos).</td></tr>
        <tr><th>Hablar</th><td>Conversación con un robot: qué hace, quién es, consejos.</td></tr>
        <tr><th>Usar</th><td>Abre la pantalla de una estación; en el contenedor, lo vacía.</td></tr>
        <tr><th>Abrir / Cerrar</th><td>La persiana del ala de verificación. Cerrada, bloquea rutas.</td></tr>
        <tr><th>Coger</th><td>Retira un residuo a mano (LIMPIADOR cancelará si iba a por él).</td></tr>
        <tr><th>Mover</th><td>Recoloca muebles y máquinas; se rechazan distribuciones sin ruta.</td></tr>
        <tr><th>Seguir</th><td>La cámara sigue a un robot. En el suelo: cámara libre.</td></tr>
        <tr><th>Tirar basura</th><td>Crea un residuo para probar a LIMPIADOR.</td></tr></table>
        <p><b>Cámara:</b> acerca el ratón a los bordes, rueda, flechas, Mayús+arrastrar o clic en el minimapa. <b>Espacio</b>: pausa. <b>Esc</b>: cancelar/cerrar. Atajos de verbos: la letra indicada en cada botón.</p>
        <p>Las frases con <b>~</b> son ambientación. Las demás nacen de un evento: MÍRALAS para ver su causa.</p>
        <h3>Cómo se modifica</h3>
        <table class="tabla"><tr><th>config/escena.js</th><td>Salas, máquinas, muebles, rótulos, puerta, limpieza.</td></tr>
        <tr><th>config/robots.js</th><td>Robots: nombre, colores, accesorio, base, velocidad.</td></tr>
        <tr><th>config/flujo.js</th><td>Fases del encargo, duraciones, fallos, encargos de ejemplo.</td></tr>
        <tr><th>config/dialogos.js</th><td>Todas las frases.</td></tr>
        <tr><th>config/menu.js</th><td>Pestañas, verbos, iconos.</td></tr>
        <tr><th>config/tema.js · css/estilo.css</th><td>Colores de la escena y de la interfaz.</td></tr>
        <tr><th>js/sprites.js</th><td>Dibujos de cada pieza (por asset).</td></tr></table>
        <p>O usa la pestaña <b>Editor</b> sin tocar archivos: exporta el resultado en JSON.</p></div>`;
    }
  });
})();
