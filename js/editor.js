/* =====================================================================
   AUTOFABRICADOR · EDITOR DE FÁBRICA
   ---------------------------------------------------------------------
   Cambia piezas y robots sin tocar archivos: nombre, posición, dibujo
   (asset), colores, textos, visibilidad. Cada cambio físico se valida
   (rutas a todas las estaciones). Deshacer / rehacer / restaurar /
   exportar / importar JSON.
   La importación SOLO acepta campos visuales y de simulación conocidos:
   nunca ejecuta nada ni activa el modo REAL.
   ===================================================================== */
window.AF = window.AF || {};

AF.editor = {
  deshacer: [], rehacer: [], seleccionado: null,

  instantanea() { return { objetos: AF.util.clonar(AF.mundo.objetos.map(o => this.limpio(o))), robots: AF.util.clonar(AF.mundo.robots.map(r => r.cfg)) }; },
  limpio(o) { const c = Object.assign({}, o); ['activa', 'reservadaPor', 'tubo', 'resultado'].forEach(k => delete c[k]); return c; },
  guardarDeshacer() { this.deshacer.push(this.instantanea()); if (this.deshacer.length > 50) this.deshacer.shift(); this.rehacer = []; },

  aplicar(inst) {
    // conserva el estado vivo de las estaciones
    const vivo = {}; AF.mundo.objetos.forEach(o => vivo[o.id] = { activa: o.activa, reservadaPor: o.reservadaPor, carga: o.carga });
    AF.mundo.objetos = inst.objetos.map(o => Object.assign(o, vivo[o.id] ? { activa: vivo[o.id].activa, reservadaPor: vivo[o.id].reservadaPor, carga: o.tipo === 'contenedor' ? vivo[o.id].carga : o.carga } : {}));
    inst.robots.forEach(cfg => { const r = AF.mundo.robot(cfg.id); if (r) { r.cfg = cfg; r.nombre = cfg.nombre; } });
    AF.mundo.recalcular();
    AF.mundo.guardarPersonalizacion();
    AF.ui.construirLateral();
    AF.ui.refrescar();
  },
  hacerDeshacer() { if (!this.deshacer.length) return AF.ui.narrar('Nada que deshacer.'); this.rehacer.push(this.instantanea()); this.aplicar(this.deshacer.pop()); this.refrescarVentana(); },
  hacerRehacer() { if (!this.rehacer.length) return AF.ui.narrar('Nada que rehacer.'); this.deshacer.push(this.instantanea()); this.aplicar(this.rehacer.pop()); this.refrescarVentana(); },
  restaurarOriginal() {
    this.guardarDeshacer();
    AF.almacen.borrar('escena-personalizada');
    this.aplicar({ objetos: AF.util.clonar(AF.ESCENA.objetos), robots: AF.util.clonar(AF.ROBOTS) });
    AF.eventos.emitir({ type: 'EDIT_RESTORED', status: 'SIMULATED', mensaje: 'Escena restaurada a la configuración original' });
    AF.ui.narrar('Escena restaurada a los valores originales (se puede deshacer).');
    this.refrescarVentana();
  },

  descargar(nombre, texto) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  exportar() {
    const datos = Object.assign({ schema: 1, tipo: 'autofabricador-escena', version: AF.ESCENA.version, exportado: new Date().toISOString() }, this.instantanea());
    this.descargar('autofabricador-escena.json', JSON.stringify(datos, null, 2));
  },

  // lista blanca de campos admitidos al importar
  CAMPOS_OBJ: ['id', 'tipo', 'capa', 'nombre', 'descripcion', 'asset', 'x', 'y', 'caja', 'colision', 'acceso', 'deposito', 'mira', 'usar', 'movible', 'visible', 'props'],
  CAMPOS_ROBOT: ['id', 'nombre', 'rol', 'fase', 'cuerpo', 'acento', 'visor', 'voz', 'accesorio', 'bata', 'ruedas', 'base', 'velocidad', 'descripcion', 'transportista', 'limpiador', 'depende', 'sala', 'puesto'],
  importar(texto) {
    let d;
    try { d = JSON.parse(texto); } catch (e) { return { ok: false, errores: ['No es un JSON válido.'] }; }
    if (!d || d.schema !== 1 || !Array.isArray(d.objetos)) return { ok: false, errores: ['Falta "schema": 1 o la lista "objetos".'] };
    const filtra = (o, campos) => { const r = {}; campos.forEach(k => { if (o[k] !== undefined) r[k] = o[k]; }); return r; };
    const objetos = d.objetos.map(o => filtra(o, this.CAMPOS_OBJ));
    const errores = [];
    objetos.forEach((o, i) => {
      if (!o.id || typeof o.x !== 'number' || typeof o.y !== 'number') errores.push(`Objeto ${i}: falta id o coordenadas numéricas.`);
      if (o.usar && !/^(ventana:[\w-]+|vaciar)$/.test(o.usar)) { errores.push(`${o.id}: acción "usar" no permitida (${o.usar}).`); }
    });
    const ids = new Set(objetos.map(o => o.id)); if (ids.size !== objetos.length) errores.push('Hay ids repetidos.');
    const estaciones = AF.FLUJO.fases.map(f => f.estacion).filter(id => !ids.has(id));
    if (estaciones.length) errores.push('Faltan estaciones del flujo: ' + estaciones.join(', '));
    if (!ids.has(AF.ESCENA.limpieza.contenedor)) errores.push('Falta el contenedor de limpieza.');
    let robots = AF.mundo.robots.map(r => r.cfg);
    if (Array.isArray(d.robots)) {
      robots = AF.mundo.robots.map(r => { const n = d.robots.find(x => x.id === r.id); return n ? Object.assign({}, r.cfg, filtra(n, this.CAMPOS_ROBOT), { id: r.id }) : r.cfg; });
    }
    if (errores.length) return { ok: false, errores };
    const v = AF.nav.validar(objetos);
    if (!v.ok) return { ok: false, errores: v.errores };
    this.guardarDeshacer();
    this.aplicar({ objetos, robots });
    AF.eventos.emitir({ type: 'IMPORT_SCENE', status: 'SIMULATED', mensaje: 'Escena importada (' + objetos.length + ' objetos)' });
    return { ok: true, errores: [] };
  },

  refrescarVentana() { const a = AF.ventanas.abiertas.editor; if (a) AF.ventanas.defs.editor.render(a.cuerpo); }
};

/* ---------------- VENTANA DEL EDITOR ---------------- */
AF.ventanas.registrar('editor', {
  titulo: 'Editor de fábrica', icono: 'lapiz', ancho: 760, alto: 520,
  render(c) {
    const E = AF.editor, esc = AF.util.esc;
    const grupos = {};
    AF.mundo.objetos.forEach(o => { (grupos[o.tipo] = grupos[o.tipo] || []).push(o); });
    const nombresGrupo = { estacion: 'Estaciones', mueble: 'Mobiliario', decoracion: 'Decoración', contenedor: 'Contenedor', rotulo: 'Rótulos', pared: 'Pared' };
    c.innerHTML = `<div class="editor">
      <div class="edLista">
        <div class="grupo">Robots</div>${AF.mundo.robots.map(r => `<button data-sel="r:${r.id}" class="${E.seleccionado === 'r:' + r.id ? 'sel' : ''}">${esc(r.nombre)}</button>`).join('')}
        ${Object.keys(grupos).map(g => `<div class="grupo">${nombresGrupo[g] || g}</div>` + grupos[g].map(o => `<button data-sel="${o.id}" class="${E.seleccionado === o.id ? 'sel' : ''} ${o.visible === false ? 'oculto' : ''}">${esc(o.nombre || o.id)}</button>`).join('')).join('')}
      </div>
      <div class="edProps"></div></div>
      <div class="acciones edBarra"><button class="btn primario" data-a="agente">+ Añadir agente</button><button class="btn" data-a="deshacer">↶ Deshacer</button><button class="btn" data-a="rehacer">↷ Rehacer</button>
      <button class="btn" data-a="exportar">Exportar JSON</button><label class="btn">Importar JSON<input type="file" accept=".json,application/json" hidden data-a="importar"></label>
      <button class="btn" data-a="restaurar">Restaurar original</button>
      <label class="chk"><input type="checkbox" data-a="nav" ${AF.estado.ajustes.verNavegacion ? 'checked' : ''}> Ver navegación</label></div>`;
    c.querySelector('.edLista').onclick = ev => { const b = ev.target.closest('[data-sel]'); if (b) { E.seleccionado = b.dataset.sel; this.render(c); } };
    c.querySelector('[data-a=agente]').onclick = () => AF.ventanas.abrir('nuevoAgente');
    c.querySelector('[data-a=deshacer]').onclick = () => E.hacerDeshacer();
    c.querySelector('[data-a=rehacer]').onclick = () => E.hacerRehacer();
    c.querySelector('[data-a=exportar]').onclick = () => E.exportar();
    c.querySelector('[data-a=restaurar]').onclick = () => E.restaurarOriginal();
    c.querySelector('[data-a=nav]').onchange = ev => { AF.estado.ajustes.verNavegacion = ev.target.checked; AF.guardarAjustes(); };
    c.querySelector('[data-a=importar]').onchange = ev => {
      const f = ev.target.files[0]; if (!f) return;
      f.text().then(t => { const r = E.importar(t); AF.ui.narrar(r.ok ? 'Escena importada y validada.' : 'Importación rechazada: ' + r.errores[0], r.ok ? null : '#ff9a8a'); if (r.ok) E.refrescarVentana(); });
    };
    this.props(c.querySelector('.edProps'));
  },

  props(p) {
    const E = AF.editor, esc = AF.util.esc, sel = E.seleccionado;
    if (!sel) { p.innerHTML = '<p>Elige una pieza de la lista. Los cambios de dibujo se aplican al momento; los de posición se validan antes.</p>'; return; }
    const campo = (k, t, v, tipo, extra) => `<label>${t}<input data-k="${k}" type="${tipo || 'text'}" value="${esc(v == null ? '' : v)}" ${extra || ''}></label>`;
    if (sel.startsWith('r:')) {
      const r = AF.mundo.robot(sel.slice(2)); if (!r) return;
      const c = r.cfg;
      const acc = ['portapapeles', 'antena-doble', 'auriculares', 'gafas', 'lupa', 'casco', 'gorra', 'escoba', 'ninguno'];
      p.innerHTML = `<h4>Robot ${esc(c.nombre)}</h4><form class="formulario" onsubmit="return false">
        ${campo('nombre', 'Nombre', c.nombre)}${campo('rol', 'Rol visual', c.rol)}
        <div class="fila">${campo('cuerpo', 'Cuerpo', c.cuerpo, 'color')}${campo('acento', 'Acento', c.acento, 'color')}${campo('visor', 'Ojos', c.visor, 'color')}${campo('voz', 'Texto', c.voz, 'color')}</div>
        <div class="fila"><label>Accesorio<select data-k="accesorio">${acc.map(a => `<option ${a === c.accesorio ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
        <label class="chk"><input type="checkbox" data-k="ruedas" ${c.ruedas ? 'checked' : ''}> Ruedas</label><label class="chk"><input type="checkbox" data-k="bata" ${c.bata ? 'checked' : ''}> Bata</label></div>
        <div class="fila">${campo('velocidad', 'Velocidad', c.velocidad, 'number', 'min="10" max="90"')}${campo('bx', 'Base x', c.base.x, 'number')}${campo('by', 'Base y', c.base.y, 'number')}</div>
        <label>Descripción<textarea data-k="descripcion" rows="2">${esc(c.descripcion || '')}</textarea></label>
        <div class="acciones"><button class="btn primario" data-a="aplicar">Aplicar</button></div><div class="res"></div></form>`;
      p.querySelector('[data-a=aplicar]').onclick = () => {
        const f = k => p.querySelector(`[data-k=${k}]`);
        const nuevo = Object.assign({}, c, { nombre: f('nombre').value.trim() || c.nombre, rol: f('rol').value, cuerpo: f('cuerpo').value, acento: f('acento').value, visor: f('visor').value, voz: f('voz').value,
          accesorio: f('accesorio').value, ruedas: f('ruedas').checked, bata: f('bata').checked, velocidad: AF.util.limitar(+f('velocidad').value || 30, 10, 90), descripcion: f('descripcion').value,
          base: { x: +f('bx').value, y: +f('by').value } });
        const cel = AF.nav.celdaDe(nuevo.base.x, nuevo.base.y);
        if (!AF.nav.libre(cel.c, cel.r)) { p.querySelector('.res').innerHTML = '<p class="errores">La base queda dentro de un obstáculo o fuera del suelo.</p>'; return; }
        E.guardarDeshacer();
        r.cfg = nuevo; r.nombre = nuevo.nombre;
        AF.mundo.guardarPersonalizacion(); AF.ui.construirLateral(); AF.ui.refrescar();
        AF.eventos.emitir({ type: 'EDIT_ROBOT', status: 'SIMULATED', mensaje: 'Robot ' + nuevo.nombre + ' modificado' });
        AF.editor.refrescarVentana();
      };
      return;
    }
    const o = AF.mundo.obj(sel); if (!o) return;
    const assets = Object.keys(AF.sprites.lista).filter(a => a !== 'caja-encargo' && a !== 'residuo');
    const pr = o.props || {};
    p.innerHTML = `<h4>${esc(o.nombre || o.id)} <small><code>${esc(o.id)}</code></small></h4><form class="formulario" onsubmit="return false">
      ${campo('nombre', 'Nombre', o.nombre)}
      <div class="fila"><label>Dibujo (asset)<select data-k="asset">${assets.map(a => `<option ${a === o.asset ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
      <label class="chk"><input type="checkbox" data-k="visible" ${o.visible !== false ? 'checked' : ''}> Visible</label></div>
      <div class="fila">${campo('x', 'x', o.x, 'number')}${campo('y', 'y', o.y, 'number')}</div>
      ${o.tipo === 'rotulo' ? campo('texto', 'Texto del rótulo', pr.texto) + campo('sub', 'Subtítulo', pr.sub) : ''}
      ${o.asset === 'cartel' ? campo('lineas', 'Líneas (separadas por |)', (pr.lineas || []).join('|')) : ''}
      ${o.asset === 'planta-maceta' ? campo('tam', 'Tamaño', pr.tam || 1, 'number', 'step="0.1" min="0.5" max="2"') : ''}
      <label>Descripción<textarea data-k="descripcion" rows="3">${esc(o.descripcion || '')}</textarea></label>
      <p class="nota">${o.colision ? 'Bloquea el paso: mover o cambiar visibilidad recalcula y valida rutas.' : 'No bloquea el paso.'}</p>
      <div class="acciones"><button class="btn primario" data-a="aplicar">Aplicar</button></div><div class="res"></div></form>`;
    p.querySelector('[data-a=aplicar]').onclick = () => {
      const f = k => p.querySelector(`[data-k=${k}]`);
      const n = Object.assign({}, o, { nombre: f('nombre').value, asset: f('asset').value, visible: f('visible').checked, x: Math.round(+f('x').value), y: Math.round(+f('y').value), descripcion: f('descripcion').value });
      n.props = Object.assign({}, o.props || {});
      if (f('texto')) { n.props.texto = f('texto').value.toUpperCase(); n.props.sub = f('sub').value.toUpperCase(); }
      if (f('lineas')) n.props.lineas = f('lineas').value.toUpperCase().split('|').map(s => s.trim()).filter(Boolean);
      if (f('tam')) n.props.tam = AF.util.limitar(+f('tam').value || 1, 0.5, 2);
      const fisico = n.x !== o.x || n.y !== o.y || n.visible !== (o.visible !== false);
      if (fisico) {
        const v = AF.nav.validar(AF.mundo.objetos.map(x => x === o ? n : x));
        if (!v.ok) { p.querySelector('.res').innerHTML = '<ul class="errores">' + v.errores.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul>'; AF.sonido.error(); return; }
      }
      E.guardarDeshacer();
      Object.assign(o, n);
      if (fisico) AF.mundo.recalcular();
      AF.mundo.guardarPersonalizacion();
      AF.eventos.emitir({ type: 'EDIT_OBJECT', status: 'SIMULATED', objeto: o.id, mensaje: (o.nombre || o.id) + ' modificado' + (fisico ? ' (rutas validadas)' : '') });
      AF.editor.refrescarVentana();
    };
  }
});
