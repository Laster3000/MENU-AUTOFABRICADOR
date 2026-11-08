/* =====================================================================
   AUTOFABRICADOR · VENTANAS DE LA v1
   ---------------------------------------------------------------------
   - dependencias : mapa de quién depende de quién
   - nuevo        : PEDIR ENCARGO (sustituye al formulario del prototipo)
   - agentes      : lista con puesto y dependencias
   - nuevoAgente  : añadir un agente sin tocar archivos (Editor)
   - aventura     : reservada para el menú de aventura (próximamente)
   ===================================================================== */
(function () {
  const V = AF.ventanas, esc = AF.util.esc, R = () => AF.registro;
  const demo = '<p class="aviso demo">🛈 MODO DEMO · datos simulados, sin conexión con AUTOFABRICADOR.</p>';
  const noReal = (txt) => `<button type="button" class="btn" disabled title="Modo REAL no conectado.">${txt}</button>`;
  const nombre = id => { const r = AF.mundo.robot(id); return r ? r.nombre : id; };

  /* ---------------- MAPA DE DEPENDENCIAS ---------------- */
  V.registrar('dependencias', {
    titulo: 'Mapa de dependencias', icono: 'red', ancho: 1240, alto: 540, sel: null,
    render(c) {
      const robots = AF.mundo.robots, F = AF.FLUJO.fases;
      const enFlujo = robots.filter(r => F.some(f => f.robot === r.id));
      const apoyo = robots.filter(r => !r.cfg.fase && !r.cfg.error);
      const malos = robots.filter(r => r.cfg.error);
      // nivel = camino más largo desde un agente sin dependencias
      const nivel = {};
      const calc = (id, pila) => {
        if (nivel[id] != null) return nivel[id];
        if (pila.includes(id)) return 0;
        const deps = R().dependeDe(id).filter(d => enFlujo.some(r => r.id === d));
        return (nivel[id] = deps.length ? 1 + Math.max(...deps.map(d => calc(d, pila.concat(id)))) : 0);
      };
      enFlujo.forEach(r => calc(r.id, []));
      const BW = 134, BH = 46, GX = 34, GY = 22, X0 = 24, Y0 = 44, pos = {};
      const filas = {};
      enFlujo.forEach(r => { const n = nivel[r.id]; filas[n] = (filas[n] || 0); pos[r.id] = { x: X0 + n * (BW + GX), y: Y0 + filas[n] * (BH + GY) }; filas[n]++; });
      const altoFlujo = Y0 + Math.max(1, ...Object.values(filas)) * (BH + GY) + 52;
      apoyo.forEach((r, i) => { pos[r.id] = { x: X0 + i * (BW + GX), y: altoFlujo + 26 }; });
      const yMal = altoFlujo + 26 + (apoyo.length ? BH + 50 : 0);
      malos.forEach((r, i) => { pos[r.id] = { x: X0 + i * (BW + GX), y: yMal + 26 }; });
      const W = Math.max(X0 * 2 + (Math.max(0, ...Object.values(nivel)) + 1) * (BW + GX), X0 * 2 + Math.max(apoyo.length, malos.length) * (BW + GX), 600);
      const H = (malos.length ? yMal + 26 + BH + 70 : apoyo.length ? altoFlujo + 26 + BH + 20 : altoFlujo);
      const flechas = [];
      enFlujo.forEach(r => R().dependeDe(r.id).forEach(d => {
        if (!pos[d] || !enFlujo.some(x => x.id === d)) return;
        const a = pos[d], b = pos[r.id];
        flechas.push(`<path class="dep" d="M${a.x + BW} ${a.y + BH / 2} C${a.x + BW + GX / 2} ${a.y + BH / 2} ${b.x - GX / 2} ${b.y + BH / 2} ${b.x} ${b.y + BH / 2}" marker-end="url(#fl)"/>`);
      }));
      F.filter(f => f.siFalla).forEach(f => {
        const destino = F.find(x => x.id === f.siFalla); if (!destino) return;
        const a = pos[f.robot], b = pos[destino.robot]; if (!a || !b) return;
        const yb = Math.max(a.y, b.y) + BH + 26;
        flechas.push(`<path class="reintento" d="M${a.x + BW / 2} ${a.y + BH} C${a.x + BW / 2} ${yb} ${b.x + BW / 2} ${yb} ${b.x + BW / 2} ${b.y + BH}" marker-end="url(#flr)"/>
          <text class="etq" x="${(a.x + b.x + BW) / 2}" y="${yb + 16}" text-anchor="middle">si fallan las pruebas (1 reintento)</text>`);
      });
      const caja = r => {
        const p = pos[r.id], cf = r.cfg, est = R().estacionDe(r.id);
        return `<g class="nodo ${cf.error ? 'mal' : ''} ${this.sel === r.id ? 'sel' : ''}" data-id="${r.id}" transform="translate(${p.x},${p.y})">
          <rect width="${BW}" height="${BH}" rx="4" style="stroke:${cf.error ? '#ff5a4a' : cf.acento}"/>
          <rect width="6" height="${BH}" rx="2" style="fill:${cf.acento}"/>
          <text x="14" y="19" class="n" style="fill:${cf.voz}">${esc(r.nombre)}</text>
          <text x="14" y="35" class="s">${esc(cf.error ? 'fuera del flujo' : cf.rol)}</text></g>`;
      };
      c.innerHTML = `<p class="nota">Flechas amarillas: <b>quién depende de quién</b> (de izquierda a derecha, en el orden del flujo). Discontinua: <b>reintento</b>. Clic en un agente: la cámara va a su puesto y se marcan sus dependencias en la fábrica.</p>
        <div class="mapaDeps"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
        <defs><marker id="fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ffd040"/></marker>
        <marker id="flr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ff9a8a"/></marker></defs>
        <text class="titulo" x="${X0}" y="26">FLUJO DE UN ENCARGO</text>
        ${flechas.join('')}${enFlujo.map(caja).join('')}
        ${apoyo.length ? `<text class="titulo" x="${X0}" y="${altoFlujo + 14}">APOYO (SIN FASE)</text>${apoyo.map(caja).join('')}` : ''}
        ${malos.length ? `<text class="titulo malT" x="${X0}" y="${yMal + 14}">FUERA DEL FLUJO</text>${malos.map(caja).join('')}
          ${malos.map(r => `<text class="motivo" x="${pos[r.id].x}" y="${pos[r.id].y + BH + 16}">${esc(r.cfg.error)}</text>`).join('')}` : ''}
        </svg></div>
        ${R().avisos.length ? `<ul class="avisosReg">${R().avisos.map(a => '<li>' + esc(a) + '</li>').join('')}</ul>` : ''}`;
      c.querySelector('svg').onclick = ev => {
        const g = ev.target.closest('.nodo'); if (!g) return;
        const r = AF.mundo.robot(g.dataset.id); if (!r) return;
        this.sel = r.id; AF.estado.seleccion = r; AF.ui.irAPuesto(r); AF.sonido.clic();
        this.render(c);
      };
    }
  });

  /* ---------------- PEDIR ENCARGO ---------------- */
  V.registrar('nuevo', {
    titulo: 'Pedir encargo', icono: 'pergamino', ancho: 560, alto: 600,
    render(c) {
      const K = AF.FLUJO.contrato;
      const pedidos = AF.almacen.cargar('pedidos', []);
      c.innerHTML = demo + `
        <form class="formulario" onsubmit="return false">
          <label>Qué necesitas <input name="objetivo" maxlength="160" placeholder="Ej.: Calcula la tarifa de aparcamiento con tope de 19 €"></label>
          <label>Nombre de la función <input name="exportName" maxlength="40" placeholder="parkingFee"></label>
          <div class="fila">
            <label>Casos de prueba (${K.minCasos}–${K.maxCasos}) <input name="casos" type="number" min="1" max="200" value="10"></label>
            <label>Prioridad <select name="prioridad"><option value="normal">Normal</option><option value="alta">Alta</option><option value="baja">Baja</option></select></label>
          </div>
          <label>Casos (opcional, uno por línea: entrada → resultado)<textarea name="lista" rows="3" placeholder="2 → 6&#10;0 → 0"></textarea></label>
          <p class="nota">Contrato del motor real: ${esc(K.lenguaje)}, entre ${K.minCasos} y ${K.maxCasos} casos. Si escribes casos en la lista, cuentan esos.</p>
          <div class="acciones"><button type="button" class="btn primario" data-a="enviar">Pedir a la fábrica</button>${noReal('Enviar al motor real')}</div>
          <p class="nota aviso">Se simulará. Se enviará a la fábrica cuando esté conectada.</p>
          <div class="revision"></div>
          <h4>Pedidos guardados (${pedidos.length})</h4>
          <div class="acciones"><button type="button" class="btn" data-a="exportar" ${pedidos.length ? '' : 'disabled'}>Exportar pedidos (JSON)</button>
          <button type="button" class="btn" data-a="borrar" ${pedidos.length ? '' : 'disabled'}>Vaciar lista</button></div>
          <ul class="mini-lista">${pedidos.slice(-5).reverse().map(p => `<li><code>${esc(p.exportName)}</code> · ${esc(p.objetivo)} <small>(${p.casos} casos, ${esc(p.fecha)})</small></li>`).join('')}</ul>
        </form>`;
      const f = c.querySelector('form');
      f.querySelector('[data-a=exportar]').onclick = () => AF.editor.descargar('autofabricador-pedidos.json',
        JSON.stringify({ schema: 1, tipo: 'autofabricador-pedidos', nota: 'Pedidos hechos en modo DEMO, listos para enviar cuando exista la conexión real.', pedidos: AF.almacen.cargar('pedidos', []) }, null, 2));
      f.querySelector('[data-a=borrar]').onclick = () => { AF.almacen.guardar('pedidos', []); this.render(c); };
      f.querySelector('[data-a=enviar]').onclick = () => {
        const lista = f.lista.value.split('\n').map(x => x.trim()).filter(Boolean);
        const d = { objetivo: f.objetivo.value.trim(), exportName: f.exportName.value.trim(), casos: lista.length || +f.casos.value, prioridad: f.prioridad.value, lista };
        const errores = [];
        if (d.objetivo.length < 4) errores.push('Escribe qué necesitas.');
        if (!/^[A-Za-z_$][\w$]*$/.test(d.exportName)) errores.push('El nombre de la función debe ser un identificador JavaScript (sin espacios ni tildes).');
        if (d.casos < K.minCasos || d.casos > K.maxCasos) errores.push(`Hacen falta entre ${K.minCasos} y ${K.maxCasos} casos de prueba (tienes ${d.casos}).`);
        const rv = f.querySelector('.revision');
        if (errores.length) { AF.sonido.error(); rv.innerHTML = `<ul class="errores">${errores.map(e => '<li>' + esc(e) + '</li>').join('')}</ul>`; return; }
        const j = AF.sim.crearEncargo(d);
        const ps = AF.almacen.cargar('pedidos', []);
        ps.push({ jobId: j.id, objetivo: d.objetivo, exportName: d.exportName, casos: d.casos, lista: d.lista, prioridad: d.prioridad, fecha: new Date().toLocaleString('es-ES'), estado: 'SIMULADO' });
        AF.almacen.guardar('pedidos', ps);
        AF.ui.recibirPedido(j);
        V.cerrar('nuevo'); AF.ui.refrescar();
      };
    }
  });

  /* ---------------- AGENTES ---------------- */
  V.registrar('agentes', {
    titulo: 'Agentes', icono: 'robot', ancho: 980, alto: 470,
    render(c) {
      c.innerHTML = `<p class="aviso">Estos robots son <b>personajes de la interfaz</b>, no modelos de IA ni agentes instalados. Para añadir uno: un bloque en <code>config/robots.js</code> o el botón de abajo.</p>
        <div class="tablaCont"><table class="tabla"><thead><tr><th>Agente</th><th>Rol</th><th>Puesto</th><th>Depende de</th><th>Entrega a</th><th>Estado</th><th></th></tr></thead><tbody></tbody></table></div>
        <div class="acciones"><button type="button" class="btn primario" data-a="nuevo">+ Añadir agente</button><button type="button" class="btn" data-a="mapa">Ver mapa de dependencias</button></div>`;
      c.querySelector('[data-a=nuevo]').onclick = () => V.abrir('nuevoAgente');
      c.querySelector('[data-a=mapa]').onclick = () => V.abrir('dependencias');
      c.querySelector('tbody').onclick = ev => {
        const b = ev.target.closest('button'); if (!b) return;
        const r = AF.mundo.robot(b.dataset.id); AF.estado.seleccion = r;
        if (b.dataset.a === 'ir') AF.ui.irAPuesto(r); else V.abrir('inspector');
      };
      this._f = null; this.actualizar(c);
    },
    actualizar(c) {
      const filas = AF.mundo.robots.map(r => {
        const est = R().estacionDe(r.id), de = R().dependeDe(r.id).map(nombre).join(', ') || '—', a = R().entregaA(r.id).map(nombre).join(', ') || '—';
        const estado = r.cfg.error ? `<span class="chip mal" title="${esc(r.cfg.error)}">Fuera del flujo</span>` : esc(AF.textoEstado(r.estado));
        return `<tr><td><b style="color:${r.cfg.voz}">${esc(r.nombre)}</b></td><td>${esc(r.cfg.rol)}</td><td>${esc(est ? est.nombre : r.cfg.transportista ? 'Plaza en descanso' : '—')}</td>
          <td>${esc(de)}</td><td>${esc(a)}</td><td>${estado}</td>
          <td class="botones"><button class="mini" data-a="ir" data-id="${r.id}">Ir a su puesto</button><button class="mini" data-a="ver" data-id="${r.id}">Inspeccionar</button></td></tr>`;
      }).join('');
      if (filas === this._f) return; this._f = filas;
      c.querySelector('tbody').innerHTML = filas;
    }
  });

  /* ---------------- AÑADIR AGENTE (sin tocar archivos) ---------------- */
  V.registrar('nuevoAgente', {
    titulo: 'Añadir agente', icono: 'robot', ancho: 600, alto: 640,
    render(c) {
      const extra = AF.almacen.cargar('agentes-extra', []);
      const salas = AF.ESCENA.salas.filter(s => !s.descanso);
      c.innerHTML = `<form class="formulario" onsubmit="return false">
        <div class="fila"><label>Nombre <input name="nombre" maxlength="16" placeholder="DOCUMENTADOR"></label>
        <label>Rol <input name="rol" maxlength="24" placeholder="Documentación"></label></div>
        <div class="fila"><label>Fase que cubre (vacío = apoyo) <input name="fase" maxlength="20" placeholder="docs"></label>
        <label>Duración (s) <input name="dur" type="number" min="1" max="30" value="4"></label></div>
        <label>Depende de (tiene que esperar a…)</label>
        <div class="checks">${AF.mundo.robots.map(r => `<label class="chk"><input type="checkbox" name="dep" value="${r.id}"> ${esc(r.nombre)}</label>`).join('')}</div>
        <label>Quién le espera a él (opcional)</label>
        <div class="checks">${AF.mundo.robots.map(r => `<label class="chk"><input type="checkbox" name="antes" value="${r.id}"> ${esc(r.nombre)}</label>`).join('')}</div>
        <div class="fila"><label>Sala <select name="sala">${salas.map(s => `<option value="${s.id}" ${s === salas[salas.length - 1] ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select></label>
        <label>Color <input name="color" type="color" value="#ff7a40"></label></div>
        <label>Descripción <input name="desc" maxlength="120" placeholder="Qué hace este agente"></label>
        <div class="acciones"><button type="button" class="btn primario" data-a="crear">Crear agente y reiniciar la fábrica</button></div>
        <div class="revision"></div>
        <h4>Agentes añadidos desde aquí (${extra.length})</h4>
        <ul class="mini-lista">${extra.map(a => `<li><b>${esc(a.nombre)}</b> · ${esc(a.rol)}${a.fase ? ' · fase ' + esc(a.fase) : ''}</li>`).join('') || '<li>Ninguno.</li>'}</ul>
        <div class="acciones"><button type="button" class="btn" data-a="copiar" ${extra.length ? '' : 'disabled'}>Ver bloque para config/robots.js</button>
        <button type="button" class="btn" data-a="quitar" ${extra.length ? '' : 'disabled'}>Quitar los añadidos</button></div>
        <textarea class="codigo" readonly hidden rows="6"></textarea>
        <p class="nota">Se guardan en este navegador. Para que sean permanentes, copia el bloque a <code>config/robots.js</code>.</p></form>`;
      const f = c.querySelector('form');
      f.querySelector('[data-a=crear]').onclick = () => {
        const nom = f.nombre.value.trim().toUpperCase(), id = nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const errores = [];
        if (!nom || !id) errores.push('Escribe un nombre.');
        if (AF.ROBOTS.some(a => a.id === id)) errores.push('Ya existe un agente con ese nombre.');
        if (!f.rol.value.trim()) errores.push('Escribe el rol.');
        const fase = f.fase.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (fase && AF.ROBOTS.some(a => a.fase === fase)) errores.push(`La fase «${fase}» ya la cubre otro agente.`);
        if (errores.length) { AF.sonido.error(); f.querySelector('.revision').innerHTML = `<ul class="errores">${errores.map(e => '<li>' + esc(e) + '</li>').join('')}</ul>`; return; }
        const col = f.color.value, P = AF.personajes;
        const nuevo = { id, nombre: nom, rol: f.rol.value.trim(), fase: fase || null, depende: Array.from(f.querySelectorAll('[name=dep]:checked')).map(i => i.value),
          sala: f.sala.value, puesto: { tipo: 'escritorio' }, duracionFase: +f.dur.value || 4, cuerpo: '#e8e4dc', acento: col, visor: P.aclarar(col, 1.3), voz: P.aclarar(col, 1.25),
          accesorio: 'ninguno', descripcion: f.desc.value.trim() || 'Agente añadido desde el Editor.' };
        const lista = AF.almacen.cargar('agentes-extra', []); lista.push(nuevo); AF.almacen.guardar('agentes-extra', lista);
        const dx = AF.almacen.cargar('depende-extra', {});
        Array.from(f.querySelectorAll('[name=antes]:checked')).forEach(i => { (dx[i.value] = dx[i.value] || []).push(id); });
        AF.almacen.guardar('depende-extra', dx);
        AF.almacen.borrar('escena-personalizada');
        location.reload();
      };
      f.querySelector('[data-a=quitar]').onclick = () => { AF.almacen.borrar('agentes-extra'); AF.almacen.borrar('depende-extra'); AF.almacen.borrar('escena-personalizada'); location.reload(); };
      f.querySelector('[data-a=copiar]').onclick = () => {
        const ta = f.querySelector('textarea.codigo'); ta.hidden = false;
        const dx = AF.almacen.cargar('depende-extra', {});
        ta.value = extra.map(a => '  ' + JSON.stringify(a).replace(/"(\w+)":/g, '$1: ').replace(/"/g, "'") + ',').join('\n') +
          (Object.keys(dx).length ? '\n\n// Añade también a "depende":\n' + Object.keys(dx).map(k => `//   ${k}: ${dx[k].map(x => "'" + x + "'").join(', ')}`).join('\n') : '');
        ta.select();
      };
    }
  });

  /* ---------------- AVENTURA (menú aparte, próximamente) ---------------- */
  V.registrar('aventura', {
    titulo: 'Aventura', icono: 'espada', ancho: 520, alto: 300,
    render(c) {
      c.innerHTML = `<div class="ayuda"><h3>Próximamente</h3>
        <p>Aquí irá el <b>menú de aventura gráfica</b>: un juego aparte, con sus propias escenas, que no toca la fábrica.</p>
        <p class="nota">Está reservado en esta versión para que la pestaña ya tenga su sitio. Todavía falta decidir si será un tutorial del programa o un juego independiente.</p></div>`;
    }
  });

  /* ---------------- AJUSTES: opción Encadenar encargos ---------------- */
  const ajustes = V.defs.ajustes, renderAjustes = ajustes.render;
  ajustes.render = function (c) {
    renderAjustes.call(this, c);
    const h = Array.from(c.querySelectorAll('h4')).find(x => x.textContent === 'Conexión');
    if (!h) return;
    h.insertAdjacentHTML('beforebegin', `<label class="chk"><input type="checkbox" data-enc ${AF.FLUJO.encadenar ? 'checked' : ''}> Encadenar encargos (empezar el siguiente de la cola al terminar uno)</label>`);
    c.querySelector('[data-enc]').onchange = ev => { AF.FLUJO.encadenar = ev.target.checked; };
  };

  /* ---------------- AYUDA ---------------- */
  const ayuda = V.defs.ayuda, renderAyuda = ayuda.render;
  ayuda.render = function (c) {
    renderAyuda.call(this, c);
    const d = c.querySelector('.ayuda');
    d.insertAdjacentHTML('afterbegin', `<h3>Novedades de la v1</h3>
      <table class="tabla"><tr><th>Moverse</th><td>Pincha y arrastra la escena (o usa las flechas, la rueda o el minimapa).</td></tr>
      <tr><th>Coger robots</th><td>Arrastra un robot, o usa COGER y haz clic donde soltarlo. Si estaba trabajando, corre a su puesto y sigue donde lo dejó.</td></tr>
      <tr><th>Puestos</th><td>Cada agente tiene cartel, baldosa de su color y un sitio en la zona de descanso.</td></tr>
      <tr><th>Dependencias</th><td>MIRAR a un robot marca de quién depende y a quién entrega. Pestaña <b>Dependencias</b>: el mapa completo.</td></tr>
      <tr><th>Pedir encargo</th><td>Botón de arriba a la derecha. En DEMO entra en la cola simulada; se puede exportar.</td></tr>
      <tr><th>Teclas</th><td>1 / 2 / 3: velocidad · Espacio: pausa · Esc: cancelar · F1: ayuda.</td></tr></table>`);
    d.innerHTML = d.innerHTML.replace('Mayús+arrastrar o clic en el minimapa', 'arrastrar con el ratón o clic en el minimapa')
      .replace('<tr><th>Coger</th><td>Retira un residuo a mano (LIMPIADOR cancelará si iba a por él).</td></tr>', '<tr><th>Coger</th><td>Retira un residuo a mano, o coge un robot para llevarlo a otro sitio.</td></tr>');
  };
})();

/* el RECEPCION recibe los pedidos en su mostrador */
AF.ui.recibirPedido = function (job) {
  const r = AF.sim.robotFase(0), est = AF.sim.estacionFase(0);
  AF.ui.narrar(`Pedido ${job.exportName} enviado a la cola (simulado).`);
  if (!r) return;
  if (r.tarea || r.cogido || !est) { AF.sim.eventoYFrase(r, 'ORDER_RECEIVED', { jobId: job.id, status: 'QUEUED' }); return; }
  AF.sim.irA(r, () => AF.mundo.punto(est, 'acceso'), () => {
    AF.sim.eventoYFrase(r, 'ORDER_RECEIVED', { jobId: job.id, status: 'QUEUED' });
    AF.sim.accion(r, 1.6, 'REPORTING', () => { if (!r.tarea) AF.sim.volverABase(r); });
  }, 'arriba');
  r.prisa = false;
};
