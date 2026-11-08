/* =====================================================================
   AUTOFABRICADOR · INTERFAZ (estilo aventura gráfica)
   Pestañas, verbos, línea de frase, "inventario" de encargos, panel
   lateral, minimapa, controles inferiores y acciones de cada verbo.
   ===================================================================== */
window.AF = window.AF || {};

AF.ui = {
  $: (s, el) => (el || document).querySelector(s),
  $$: (s, el) => Array.from((el || document).querySelectorAll(s)),
  dialogo: null, moviendo: null, _t: 0,

  iniciar() {
    this.construirCabecera();
    this.construirVerbos();
    this.construirControles();
    this.construirLateral();
    this.instalarTeclado();
    this.instalarCursor();
    AF.eventos.escuchar(ev => this.alEvento(ev));
    this.actualizarFrase();
    this.refrescar();
  },

  /* ---------------- CABECERA Y PESTAÑAS ---------------- */
  construirCabecera() {
    const M = AF.MENU;
    this.$('#logoTitulo').textContent = M.titulo;
    this.$('#logoSub').textContent = M.subtitulo;
    const nav = this.$('#pestanas');
    nav.innerHTML = '';
    M.pestanas.forEach(p => {
      const b = document.createElement('button');
      b.className = 'pestana' + (p.id === 'fabrica' ? ' activa' : '') + (p.icono ? '' : ' corta');
      b.dataset.id = p.id;
      b.title = p.texto === '?' ? 'Ayuda' : p.texto;
      b.innerHTML = (p.icono ? `<img alt="" src="${AF.iconoURL(p.icono, 2)}">` : '') + `<span>${AF.util.esc(p.texto)}</span>`;
      b.onclick = () => {
        AF.sonido.clic();
        if (!p.ventana) { AF.ventanas.cerrarTodas(); }
        else AF.ventanas.alternar(p.ventana);
        this.marcarPestanas();
      };
      nav.appendChild(b);
    });
    this.$('#btnPedir').onclick = () => { AF.sonido.clic(); AF.ventanas.abrir('nuevo'); };
    this.$('#btnPedir img').src = AF.iconoURL('pergamino', 2);
    this.$('#btnCompleta').onclick = () => {
      try { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); } catch (e) { }
    };
    this.dibujarEngranaje();
  },
  marcarPestanas() {
    this.$$('.pestana').forEach(b => {
      const p = AF.MENU.pestanas.find(x => x.id === b.dataset.id);
      const activa = p.ventana ? AF.ventanas.estaAbierta(p.ventana) : !Object.keys(AF.ventanas.abiertas).length;
      b.classList.toggle('activa', activa);
    });
  },
  dibujarEngranaje() {
    const cv = this.$('#logoEngranaje'), c = cv.getContext('2d'), g = new AF.Pincel(c);
    const dib = (t) => {
      c.clearRect(0, 0, 24, 24);
      const cx = 12, cy = 12, a0 = t * 0.6;
      for (let i = 0; i < 8; i++) {
        const a = a0 + i * Math.PI / 4;
        g.caja(cx + Math.cos(a) * 9 - 2, cy + Math.sin(a) * 9 - 2, 4, 4, '#4aa0e0', '#0c1830');
      }
      g.elipse(cx, cy, 9, 9, '#0c1830'); g.elipse(cx, cy, 8, 8, '#3a8ad0'); g.elipse(cx - 1, cy - 1, 6, 6, '#6ac0f8');
      g.elipse(cx, cy, 3, 3, '#0c1830'); g.elipse(cx, cy, 2, 2, '#f0c040');
    };
    this._engranaje = dib; dib(0);
  },

  /* ---------------- VERBOS ---------------- */
  construirVerbos() {
    const cont = this.$('#verbos');
    cont.innerHTML = '';
    AF.MENU.verbos.forEach(v => {
      const b = document.createElement('button');
      b.className = 'verbo'; b.dataset.id = v.id;
      b.innerHTML = AF.util.esc(v.texto);
      b.title = v.texto + ' (tecla ' + v.tecla.toUpperCase() + ')';
      b.onclick = () => this.elegirVerbo(v.id);
      cont.appendChild(b);
    });
  },
  elegirVerbo(id) {
    AF.sonido.clic();
    if (this.moviendo && id !== 'mover') this.cancelarMover();
    AF.estado.verbo = AF.estado.verbo === id ? null : id;
    this.$$('.verbo').forEach(b => b.classList.toggle('activo', b.dataset.id === AF.estado.verbo));
    this.actualizarFrase();
  },
  verboTexto(id) { const v = AF.MENU.verbos.find(x => x.id === id); return v ? v.texto : id; },

  verboSugerido(el) {
    if (!el) return null;
    if (el.tipo === 'robot') return 'hablar';
    if (el.tipo === 'puerta') return el.abierta ? 'cerrar' : 'abrir';
    if (el.tipo === 'residuo') return 'coger';
    if (el.usar) return 'usar';
    if (el.tipo === 'estacion') return 'usar';
    return 'mirar';
  },

  nombreDe(el) {
    if (!el) return '';
    if (el.tipo === 'robot') return el.nombre;
    if (el.tipo === 'residuo') return { papel: 'papel arrugado', lata: 'lata vacía', platano: 'piel de plátano', tornillo: 'tornillo suelto' }[el.clase] || 'residuo';
    if (el.tipo === 'caja') { const j = AF.sim.encargos.find(x => x.id === el.jobId); return 'caja de ' + (j ? j.exportName : 'encargo'); }
    return el.nombre || el.id;
  },

  actualizarFrase() {
    const f = this.$('#frase'), E = AF.estado, el = E.hover;
    if (this.dialogo) { f.innerHTML = `<span class="v">Hablar con</span> ${AF.util.esc(this.dialogo.robot.nombre)}`; return; }
    if (AF.agarre.robot) { f.innerHTML = `<span class="v">Soltar</span> ${AF.util.esc(AF.agarre.robot.nombre)} <span class="v">aquí</span> <small>(${AF.agarre.modo === 'clic' ? 'clic para soltar' : 'suelta el botón'})</small>`; return; }
    if (this.moviendo) { f.innerHTML = `<span class="v">Mover</span> ${AF.util.esc(this.moviendo.obj.nombre)} <span class="v">a</span> …  <small>(clic para colocar · Esc para cancelar)</small>`; return; }
    const sug = E.verbo ? null : this.verboSugerido(el);
    const verbo = E.verbo || sug || (el ? 'mirar' : null);
    let txt = verbo ? `<span class="v">${AF.util.esc(this.verboTexto(verbo))}</span>` : '<span class="v tenue">Elige un verbo o haz clic en algo</span>';
    if (E.verbo === 'tirar') txt += el ? '' : ' aquí';
    if (el) txt += ' ' + AF.util.esc(this.nombreDe(el));
    if (el && el.tipo === 'robot' && !E.verbo) txt += ' <small>(o arrástralo para cogerlo)</small>';
    f.innerHTML = txt;
    this.$$('.verbo').forEach(b => b.classList.toggle('sugerido', !E.verbo && b.dataset.id === sug));
  },

  alMoverRaton(p) {
    if (this.moviendo) this.moverFantasma(p);
    this.actualizarFrase();
    this.$('#escena').classList.toggle('sobreObjeto', !!AF.estado.hover);
  },

  /* ---------------- ACCIONES DE LOS VERBOS ---------------- */
  alHacerClic(el, p, ev, forzado) {
    if (this.dialogo) return;
    if (this.moviendo) { if (forzado === 'mirar') return this.cancelarMover(); return this.colocarMovido(p); }
    let verbo = forzado || AF.estado.verbo || this.verboSugerido(el) || null;
    if (!verbo) { AF.estado.seleccion = null; return; }
    if (!el && verbo !== 'tirar' && verbo !== 'seguir') { if (AF.estado.verbo) this.narrar('Ahí no hay nada.'); return; }
    AF.sonido.clic();
    const h = this.acciones[verbo];
    if (h) h.call(this, el, p);
    if (verbo !== 'tirar' && verbo !== 'mover') this.elegirVerboSilencioso(null);
    this.actualizarFrase();
    this.refrescar();
  },
  elegirVerboSilencioso(id) { AF.estado.verbo = id; this.$$('.verbo').forEach(b => b.classList.toggle('activo', b.dataset.id === id)); },
  narrar(txt, color) { AF.motor.narrar(txt, color); },

  acciones: {
    mirar(el) {
      AF.estado.seleccion = el;
      let t = '';
      if (el.tipo === 'robot') {
        t = `${el.nombre} · ${el.cfg.rol}. ${el.cfg.descripcion} Ahora: ${AF.textoEstado(el.estado)}${el.sub ? ' (' + el.sub + ')' : ''}.`;
        const nom = ids => ids.map(i => AF.mundo.robot(i) ? AF.mundo.robot(i).nombre : i).join(', ');
        const de = AF.registro.dependeDe(el.id), a = AF.registro.entregaA(el.id);
        t += ` Depende de: ${de.length ? nom(de) : 'nadie'}. Entrega a: ${a.length ? nom(a) : 'nadie'}.`;
        if (el.cfg.error) t += ` ¡Ojo! Fuera del flujo: ${el.cfg.error}.`;
        AF.estado.marcaDeps = { id: el.id, hasta: performance.now() / 1000 + 10 };
        if (el.ultimoMensaje && el.ultimoMensaje.evento) t += ` Su último aviso viene del evento ${el.ultimoMensaje.evento.eventId} (${el.ultimoMensaje.evento.type}).`;
        AF.ventanas.abrir('inspector');
      } else if (el.tipo === 'puerta') {
        t = el.descripcion + ' Está ' + (el.abierta ? 'abierta.' : 'cerrada.');
      } else if (el.tipo === 'residuo') {
        t = { papel: 'Un papel arrugado.', lata: 'Una lata vacía de refresco de grog.', platano: 'Una piel de plátano. Alguien podría resbalar.', tornillo: 'Un tornillo suelto.' }[el.clase] +
          ` Residuo ${el.id}, ${el.ambiental ? 'de ambientación' : 'creado por ti'}. Estado: ${el.estado.toLowerCase()}.`;
        AF.ventanas.abrir('inspector');
      } else if (el.tipo === 'caja') {
        const j = AF.sim.encargos.find(x => x.id === el.jobId);
        t = j ? `Caja del encargo ${j.id}: «${j.objetivo}». Fase: ${AF.sim.fase(j) ? AF.sim.fase(j).nombre : '—'}.` : 'Una caja de encargo.';
      } else {
        t = (el.descripcion || ('Es ' + (el.nombre || 'algo') + '.'));
        if (el.tipo === 'estacion') {
          const r = el.reservadaPor ? AF.mundo.robot(el.reservadaPor) : null;
          t += el.activa ? ` Ahora mismo está trabajando${r ? ' ' + r.nombre : ''}.` : r ? ` Reservada por ${r.nombre}.` : ' Está libre.';
          AF.ventanas.abrir('inspector');
        }
        if (el.tipo === 'contenedor') t += ` Contiene ${el.carga || 0} de ${AF.ESCENA.limpieza.capacidad}.`;
        if (el.id === 'reloj-01') t = 'Son las ' + AF.util.hora() + '. ' + t;
      }
      this.narrar(t);
    },
    hablar(el) {
      if (el.tipo !== 'robot') return this.narrar(el.tipo === 'puerta' ? 'La persiana no tiene mucha conversación.' : 'No creo que me conteste.');
      this.abrirDialogo(el);
    },
    usar(el) {
      if (el.tipo === 'robot') return this.narrar(`No puedes usar a ${el.nombre}. Prueba a HABLAR con él.`);
      if (el.tipo === 'puerta') return this.alternarPuerta(!el.abierta);
      if (el.tipo === 'residuo') return this.narrar('Mejor que se ocupe LIMPIADOR. O cógelo tú con COGER.');
      if (el.tipo === 'caja') return AF.ventanas.abrir('encargos');
      if (el.usar === 'vaciar') {
        const n = AF.sim.vaciarContenedor();
        return this.narrar(n ? `Vacías el contenedor: ${n} residuos simulados fuera.` : 'El contenedor ya está vacío.');
      }
      if (el.usar && el.usar.startsWith('ventana:')) return AF.ventanas.abrir(el.usar.slice(8));
      this.narrar('No se me ocurre cómo usar eso.');
    },
    abrir(el) {
      if (el.tipo === 'puerta') return this.alternarPuerta(true);
      this.narrar('Eso no se puede abrir.');
    },
    cerrar(el) {
      if (el.tipo === 'puerta') return this.alternarPuerta(false);
      if (el.tipo === 'robot' || el.tipo === 'estacion') return this.narrar('No hay nada que cerrar ahí. Para parar la fábrica usa DETENER.');
      this.narrar('Eso no se puede cerrar.');
    },
    coger(el) {
      if (el.tipo === 'residuo') {
        if (el.estado === 'TRANSPORTADO') return this.narrar('LIMPIADOR ya lo lleva.');
        el.registro.push({ t: AF.util.horaSeg(), accion: 'RETIRADO por el usuario' });
        el.estado = 'RETIRADO';
        AF.mundo.residuos = AF.mundo.residuos.filter(z => z !== el);
        AF.eventos.emitir({ type: 'TRASH_REMOVED_BY_USER', status: 'SIMULATED', objeto: el.id, mensaje: 'Has retirado ' + el.id + ' a mano' });
        return this.narrar('Lo recoges y lo guardas en el bolsillo. Qué limpio.');
      }
      if (el.tipo === 'caja') return this.narrar('Las cajas de los encargos las mueve TRANSPORTISTA. Así queda registro.');
      if (el.tipo === 'robot') {
        if (AF.agarre.empezar(el, 'clic')) return this.narrar(`Tienes a ${el.nombre} en la mano. Haz clic donde quieras soltarlo.`);
        return;
      }
      if (el.movible) return this.narrar('Es demasiado grande para cogerlo. Usa MOVER.');
      this.narrar('No puedo coger eso.');
    },
    mover(el) {
      if (!el) return;
      if (el.tipo === 'robot') return this.narrar('Para llevar a un robot a otro sitio, cógelo: arrástralo con el ratón o usa COGER.');
      if (!el.movible) return this.narrar('Eso está fijo. Se puede cambiar desde el EDITOR.');
      this.empezarMover(el);
    },
    seguir(el) {
      if (el && el.tipo === 'robot') { AF.estado.siguiendo = el; AF.estado.seleccion = el; this.narrar('La cámara sigue a ' + el.nombre + '. Usa SEGUIR en el suelo para soltar.'); }
      else { AF.estado.siguiendo = null; this.narrar(el ? 'Solo puedo seguir robots.' : 'Cámara libre.'); }
    },
    tirar(el, p) {
      const r = AF.sim.crearResiduo(p.x, p.y, false);
      if (!r) { this.narrar('Ahí no cabe basura (zona no transitable).'); AF.sonido.error(); }
    }
  },

  alternarPuerta(abrir) {
    const P = AF.mundo.puerta;
    if (P.abierta === abrir) return this.narrar(abrir ? 'Ya está abierta.' : 'Ya está cerrada.');
    if (!abrir) {
      // nadie puede quedar atrapado en el hueco
      const H = AF.ESCENA.tabique.hueco, tab = AF.ESCENA.tabique;
      const dentro = AF.mundo.robots.find(r => r.y > H.y0 - 2 && r.y < H.y1 + 2 && Math.abs(r.x - (AF.motor.tabX(r.y) + tab.grosor / 2)) < 12);
      if (dentro) { AF.sonido.error(); return this.narrar(`No puedo cerrar: ${dentro.nombre} está en la puerta.`); }
    }
    P.abierta = abrir;
    AF.mundo.recalcular();
    AF.eventos.emitir({ type: abrir ? 'DOOR_OPENED' : 'DOOR_CLOSED', status: 'SIMULATED', objeto: P.id, mensaje: P.nombre + (abrir ? ' abierta' : ' cerrada') });
    this.narrar(abrir ? 'La persiana sube con un chirrido.' : 'La persiana baja con estruendo. El ala de verificación queda aislada.');
  },

  /* ---------------- MOVER (con validación de rutas) ---------------- */
  empezarMover(o) {
    this.moviendo = { obj: o, x0: o.x, y0: o.y };
    AF.motor.fantasma = Object.assign({}, o, { valido: true });
    o.visible = false;
    AF.nav.construir();
    this.elegirVerboSilencioso('mover');
    this.narrar('Elige dónde colocar ' + o.nombre + '.');
  },
  moverFantasma(p) {
    const f = AF.motor.fantasma, o = this.moviendo.obj;
    f.x = Math.round(p.x);
    f.y = o.capa === 'pared' ? Math.round(p.y) : AF.util.limitar(Math.round(p.y), AF.ESCENA.mundo.sueloY + 4, AF.ESCENA.mundo.sueloFin);
    if (o.tipo === 'estacion') f.y = AF.util.limitar(f.y, 132, 150);
    // validación rápida: la colisión no puede pisar a un robot ni salir del suelo
    let ok = true;
    if (f.colision) {
      const R = AF.nav.rectColision(f);
      if (R.x < 8 || R.x + R.w > AF.ESCENA.mundo.ancho - 8) ok = false;
      AF.mundo.robots.forEach(r => { if (r.x > R.x - 4 && r.x < R.x + R.w + 4 && r.y > R.y - 4 && r.y < R.y + R.h + 4) ok = false; });
    }
    f.valido = ok;
  },
  colocarMovido(p) {
    const m = this.moviendo, o = m.obj, f = AF.motor.fantasma;
    if (!f.valido) { AF.sonido.error(); return this.narrar('Ahí no cabe: pisaría a un robot o se sale de la fábrica.'); }
    const prueba = AF.mundo.objetos.map(x => x === o ? Object.assign({}, o, { x: f.x, y: f.y, visible: true }) : x);
    const v = AF.nav.validar(prueba);
    if (!v.ok) {
      AF.sonido.error();
      if (f.colision) { const R = AF.nav.rectColision(f); AF.motor.avisoZona(R.x, R.y, R.w, R.h); }
      return this.narrar('Distribución rechazada: ' + v.errores[0], '#ff9a8a');
    }
    AF.editor.guardarDeshacer();
    o.x = f.x; o.y = f.y; o.visible = true;
    this.terminarMover();
    AF.mundo.recalcular();
    AF.mundo.guardarPersonalizacion();
    AF.eventos.emitir({ type: 'LAYOUT_CHANGED', status: 'SIMULATED', objeto: o.id, mensaje: o.nombre + ' recolocado; rutas recalculadas' });
    this.narrar(o.nombre + ' recolocado. Rutas recalculadas.');
  },
  cancelarMover() {
    if (!this.moviendo) return;
    this.moviendo.obj.visible = true;
    this.terminarMover();
    AF.nav.construir();
  },
  terminarMover() { this.moviendo = null; AF.motor.fantasma = null; this.elegirVerboSilencioso(null); this.actualizarFrase(); },

  // centra la cámara en el puesto de un agente (o en el propio robot si no tiene puesto)
  irAPuesto(r) {
    const est = AF.registro.estacionDe(r.id), x = est ? est.x : r.x;
    AF.estado.siguiendo = null; AF.motor.inercia = 0;
    AF.motor.camObjetivo = x - AF.ESCENA.vista.ancho / 2;
    AF.estado.marcaDeps = { id: r.id, hasta: performance.now() / 1000 + 8 };
  },

  /* ---------------- DIÁLOGOS (opciones de respuesta) ---------------- */
  abrirDialogo(r) {
    this.dialogo = { robot: r };
    AF.estado.seleccion = r;
    const cont = this.$('#opcionesDialogo');
    cont.innerHTML = '';
    AF.DIALOGOS.conversacion.opciones.forEach(op => {
      const b = document.createElement('button');
      b.className = 'opcion'; b.textContent = op.texto;
      b.onclick = () => this.responder(r, op.id);
      cont.appendChild(b);
    });
    this.$('#aventura').classList.add('enDialogo');
    this.actualizarFrase();
  },
  responder(r, id) {
    AF.sonido.clic();
    const C = AF.DIALOGOS.conversacion;
    if (id === 'estado') {
      let t;
      if (r.tarea && r.tarea.tipo === 'fase') t = `Estoy con ${r.tarea.fase.nombre.toLowerCase()} del encargo ${r.tarea.job.exportName}. Estado: ${AF.textoEstado(r.estado).toLowerCase()}.`;
      else if (r.tarea && r.tarea.tipo === 'transporte') t = `Llevo una caja a ${r.tarea.destino.nombre.toLowerCase()}.`;
      else if (r.tarea && r.tarea.tipo === 'limpieza') t = `Voy a por el residuo ${r.tarea.residuo.id}. Paso: ${r.sub || '—'}.`;
      else t = `Ahora mismo: ${AF.textoEstado(r.estado).toLowerCase()}. Esperando trabajo de verdad.`;
      AF.sim.decir(r, t);
    } else if (id === 'quien') AF.sim.decir(r, `Soy ${r.nombre}, de ${r.cfg.rol.toLowerCase()}. ${r.cfg.descripcion}`);
    else if (id === 'consejo') AF.sim.decir(r, AF.util.elegir(C.consejo));
    else if (id === 'deps') {
      const R = AF.registro, nom = ids => ids.map(i => AF.mundo.robot(i) ? AF.mundo.robot(i).nombre : i).join(' y ');
      const de = R.dependeDe(r.id), a = R.entregaA(r.id);
      AF.sim.decir(r, (de.length ? `Dependo de ${nom(de)}.` : 'No dependo de nadie: empiezo yo.') + ' ' + (a.length ? `Cuando termino, entrego a ${nom(a)}.` : 'Nadie espera por mí.'));
      AF.estado.marcaDeps = { id: r.id, hasta: performance.now() / 1000 + 10 };
    }
    else if (id === 'descansar') {
      if (r.tarea) AF.sim.decir(r, 'Ahora no puedo: tengo trabajo a medias.');
      else { AF.sim.decir(r, 'Vale, me voy al sofá.'); this.cerrarDialogo(); AF.sim.volverABase(r); }
    }
    else { AF.sim.decir(r, AF.util.elegir(C.adios)); this.cerrarDialogo(); }
  },
  cerrarDialogo() {
    this.dialogo = null;
    this.$('#aventura').classList.remove('enDialogo');
    this.actualizarFrase();
  },

  /* ---------------- INVENTARIO (encargos en cola) ---------------- */
  refrescarInventario() {
    const cont = this.$('#inventario');
    const cola = AF.sim.encargos.filter(j => j.estado === 'EN_COLA' || j.estado === 'RUNNING' || j.estado === 'STOPPED').slice(0, 7);
    const firma = cola.map(j => j.id + j.estado).join('|');
    if (firma === this._firmaInv) return;
    this._firmaInv = firma;
    cont.innerHTML = '';
    cola.forEach(j => {
      const b = document.createElement('button');
      b.className = 'item' + (j.estado === 'RUNNING' ? ' enCurso' : '');
      b.innerHTML = `<img alt="" src="${AF.iconoURL(j.estado === 'RUNNING' ? 'caja' : 'pergamino', 3)}"><span>${AF.util.esc(j.exportName)}</span>`;
      b.title = j.objetivo + ' · ' + j.estado;
      b.onclick = () => this.usarItem(j);
      cont.appendChild(b);
    });
    const nuevo = document.createElement('button');
    nuevo.className = 'item nuevo';
    nuevo.innerHTML = '<b>+</b><span>Nuevo</span>';
    nuevo.title = 'Nuevo encargo';
    nuevo.onclick = () => AF.ventanas.abrir('nuevo');
    cont.appendChild(nuevo);
  },
  usarItem(j) {
    const v = AF.estado.verbo || 'mirar';
    AF.sonido.clic();
    if (v === 'mirar') this.narrar(`Encargo ${j.id}: «${j.objetivo}». ${j.casos} pruebas del propietario. Prioridad ${j.prioridad}. Estado: ${j.estado}.`);
    else if (v === 'usar') AF.ventanas.abrir('encargos');
    else this.narrar(`No puedo ${this.verboTexto(v).toLowerCase()} un encargo.`);
    this.elegirVerboSilencioso(null);
  },

  /* ---------------- CONTROLES INFERIORES ---------------- */
  construirControles() {
    this.$('#btnEjecutar').onclick = () => { AF.sonido.clic(); AF.sim.ejecutar(); this.refrescar(); };
    this.$('#btnPausar').onclick = () => { AF.sonido.clic(); AF.sim.pausar(); this.refrescar(); };
    this.$('#btnDetener').onclick = () => { AF.sonido.clic(); AF.sim.detener(); this.refrescar(); };
    this.$('#btnEjecutar img').src = AF.iconoURL('play', 2);
    this.$('#btnPausar img').src = AF.iconoURL('pausa', 2);
    this.$('#btnDetener img').src = AF.iconoURL('stop', 2);
    this.$('#icoReloj').src = AF.iconoURL('reloj', 2);
    this.$('#icoRegistro').src = AF.iconoURL('libro', 2);
    const vel = this.$('#velocidades');
    AF.MENU.velocidades.forEach(v => {
      const b = document.createElement('button');
      b.className = 'vel'; b.textContent = 'x' + v; b.dataset.v = v;
      b.onclick = () => { AF.sonido.clic(); AF.estado.velocidad = v; this.refrescar(); };
      vel.appendChild(b);
    });
    this.$('#registro').onclick = () => AF.ventanas.abrir('historial');
  },

  /* ---------------- PANEL LATERAL ---------------- */
  construirLateral() {
    // bienvenida
    this.$('#btnBienA').textContent = AF.MENU.bienvenida.botonA;
    this.$('#btnBienB').textContent = AF.MENU.bienvenida.botonB;
    this.$('#btnBienA').onclick = () => { AF.sonido.clic(); if (AF.sim.ejecutar()) this.$('#bienvenida').classList.add('plegado'); this.refrescar(); };
    this.$('#btnBienB').onclick = () => AF.ventanas.abrir('encargos');
    this.$('#btnPlegarBien').onclick = () => this.$('#bienvenida').classList.toggle('plegado');
    // lista de agentes
    const lista = this.$('#listaAgentes');
    lista.innerHTML = '';
    AF.mundo.robots.forEach(r => {
      const li = document.createElement('li');
      li.dataset.id = r.id;
      li.innerHTML = `<canvas width="16" height="16"></canvas><i class="punto"></i><b></b><span class="rol"></span><span class="est"></span>`;
      li.onclick = () => { AF.estado.seleccion = r; AF.ui.irAPuesto(r); AF.ventanas.abrir('inspector'); };
      li.title = 'Clic: ir a su puesto e inspeccionar';
      lista.appendChild(li);
    });
    this.$('#tituloAgentes').textContent = `Agentes (${AF.mundo.robots.length})`;
    // minimapa
    const mm = this.$('#minimapa');
    if (this._mmListo) return;
    this._mmListo = true;
    const mover = ev => {
      const r = mm.getBoundingClientRect();
      AF.estado.siguiendo = null;
      AF.motor.camObjetivo = (ev.clientX - r.left) / r.width * AF.ESCENA.mundo.ancho - AF.ESCENA.vista.ancho / 2;
    };
    mm.addEventListener('mousedown', ev => { mover(ev); this._mmArr = true; });
    window.addEventListener('mousemove', ev => { if (this._mmArr) mover(ev); });
    window.addEventListener('mouseup', () => { this._mmArr = false; });
  },

  retratos() {
    this.$$('#listaAgentes li').forEach(li => {
      const r = AF.mundo.robot(li.dataset.id); if (!r) return;
      const cv = li.querySelector('canvas'), c = cv.getContext('2d');
      c.clearRect(0, 0, 16, 16);
      const g = new AF.Pincel(c); g.ox = r.x - 8; g.oy = r.y - 31;
      const copia = Object.assign({}, r, { dir: 'abajo', andando: false, carga: null });
      const sel = AF.estado.seleccion; AF.estado.seleccion = null;
      AF.personajes.dibujar(g, copia, performance.now() / 1000);
      AF.estado.seleccion = sel;
    });
    // retrato grande de bienvenida
    const cv = this.$('#retrato'); if (!cv) return;
    const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height);
    const r = AF.sim.robotFase(0); if (!r) return;
    const g = new AF.Pincel(c); g.ox = r.x - 12; g.oy = r.y - 31;
    AF.personajes.dibujar(g, Object.assign({}, r, { dir: 'abajo', andando: false, carga: null, mirada: 0 }), performance.now() / 1000);
  },

  dibujarMinimapa() {
    const cv = this.$('#minimapa'), c = cv.getContext('2d'), W = cv.width, H = cv.height;
    const M = AF.ESCENA.mundo, sx = W / M.ancho, sy0 = M.sueloY;
    const sy = H / (M.sueloFin - sy0 + 10);
    const verde = '#3cff6a', tenue = 'rgba(60,255,106,0.25)';
    c.fillStyle = '#04140a'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(60,255,106,0.08)';
    for (let x = 0; x < W; x += 8) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H); c.stroke(); }
    for (let y = 0; y < H; y += 8) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(W, y + 0.5); c.stroke(); }
    const mx = x => x * sx, my = y => (y - sy0 + 5) * sy;
    c.strokeStyle = verde; c.lineWidth = 1;
    c.strokeRect(1.5, 1.5, W - 3, H - 3);
    // salas
    AF.ESCENA.salas.forEach(s => { c.fillStyle = s.descanso ? 'rgba(255,120,160,0.12)' : 'rgba(60,255,106,0.06)'; c.fillRect(mx(s.x0) + 2, 2, mx(s.x1 - s.x0) - 4, H - 4); });
    // obstáculos
    AF.mundo.objetos.forEach(o => {
      if (!o.colision || o.visible === false) return;
      const R = AF.nav.rectColision(o);
      c.fillStyle = o.tipo === 'estacion' ? (o.activa ? '#c8ff60' : verde) : tenue;
      c.fillRect(Math.round(mx(R.x)), Math.round(my(R.y)), Math.max(2, Math.round(R.w * sx)), Math.max(2, Math.round(R.h * sy)));
    });
    // tabique y puerta
    const tab = AF.ESCENA.tabique;
    c.fillStyle = verde; c.fillRect(Math.round(mx(tab.x)), 2, 2, Math.round(my(tab.hueco.y0)));
    c.fillRect(Math.round(mx(tab.x + (tab.hueco.y1 - sy0) * tab.pendiente)), Math.round(my(tab.hueco.y1)), 2, H);
    if (!AF.mundo.puertaAbierta()) { c.fillStyle = '#ff5a4a'; c.fillRect(Math.round(mx(AF.motor.tabX(tab.hueco.y0))), Math.round(my(tab.hueco.y0)), 3, Math.round((tab.hueco.y1 - tab.hueco.y0) * sy)); }
    // residuos y robots
    AF.mundo.residuos.forEach(z => { c.fillStyle = '#ffd040'; c.fillRect(Math.round(mx(z.x)) - 1, Math.round(my(z.y)) - 1, 2, 2); });
    AF.mundo.robots.forEach(r => {
      c.fillStyle = r.estado === 'BLOCKED' ? '#ff5a4a' : r.cfg.acento;
      c.fillRect(Math.round(mx(r.x)) - 2, Math.round(my(r.y)) - 2, 4, 4);
    });
    // vista actual
    c.strokeStyle = '#ffffff'; c.setLineDash([3, 2]);
    c.strokeRect(Math.round(mx(AF.motor.camX)) + 0.5, 1.5, Math.round(AF.ESCENA.vista.ancho * sx) - 1, H - 3);
    c.setLineDash([]);
  },

  /* ---------------- REFRESCO PERIÓDICO ---------------- */
  porFotograma(t, dt) {
    this._t += dt;
    if (this._engranaje && AF.estado.ejecucion === 'operativa' && !AF.estado.ajustes.movimientoReducido) this._engranaje(t * AF.estado.velocidad);
    this.dibujarMinimapa();
    if (this._t > 0.25) { this._t = 0; this.refrescar(); AF.ventanas.actualizarAbiertas(); }
  },

  refrescar() {
    const E = AF.estado, S = AF.sim;
    // estado de la fábrica
    const est = { operativa: ['Operativa', 'ok'], pausada: ['En pausa', 'aviso'], detenida: ['Detenida', 'neutro'], parando: ['Parando…', 'aviso'] }[E.ejecucion];
    const el = this.$('#estadoTexto'); el.textContent = est[0]; el.className = 'estadoTxt ' + est[1];
    this.$('#icoEstado').className = 'ico ' + est[1];
    this.$('#vEnCurso').textContent = S.activo ? 1 : 0;
    this.$('#vCola').textContent = S.enCola().length;
    this.$('#vCompletados').textContent = E.completadosHoy;
    this.$('#vErrores').textContent = E.errores;
    // agentes
    this.$$('#listaAgentes li').forEach(li => {
      const r = AF.mundo.robot(li.dataset.id); if (!r) return;
      li.querySelector('b').textContent = r.nombre;
      li.querySelector('.rol').textContent = r.cfg.rol;
      li.querySelector('.est').textContent = r.cfg.error ? 'Fuera del flujo' : AF.textoEstado(r.estado);
      li.classList.toggle('conError', !!r.cfg.error);
      const p = li.querySelector('.punto');
      p.className = 'punto ' + (r.estado === 'BLOCKED' || r.estado === 'ERROR' ? 'rojo' : r.estado === 'WAITING_PATH' ? 'ambar' : r.estado === 'IDLE' ? 'verde' : 'cian');
      li.classList.toggle('sel', AF.estado.seleccion === r);
    });
    this.retratos();
    // botones de control
    this.$('#btnEjecutar').classList.toggle('activo', E.ejecucion === 'operativa');
    this.$('#btnPausar').classList.toggle('activo', E.ejecucion === 'pausada');
    this.$('#btnDetener').classList.toggle('activo', E.ejecucion === 'parando' || E.ejecucion === 'detenida');
    this.$('#btnPausar').disabled = !(E.ejecucion === 'operativa' || E.ejecucion === 'pausada');
    this.$('#btnPausar').title = this.$('#btnPausar').disabled ? 'Solo se puede pausar con la fábrica en marcha' : 'Pausar / reanudar (Espacio)';
    this.$('#btnDetener').disabled = !(E.ejecucion === 'operativa' || E.ejecucion === 'pausada');
    this.$('#btnDetener').title = this.$('#btnDetener').disabled ? 'La fábrica ya está detenida' : 'STOP cooperativo: termina en una frontera segura';
    this.$$('.vel').forEach(b => b.classList.toggle('activo', +b.dataset.v === E.velocidad));
    this.$('#reloj').textContent = AF.util.hora();
    // bienvenida
    this.$('#textoBien').textContent = AF.util.plantilla(AF.DIALOGOS.bienvenida, { cola: S.enCola().length });
    this.refrescarInventario();
    this.marcarPestanas();
  },

  alEvento(ev) {
    const reg = this.$('#registroTexto');
    const ult = AF.eventos.lista.slice(-2).map(e => `<span class="${/FAIL|BLOCK/.test(e.type + e.status) ? 'mal' : ''}">[${AF.util.hora(new Date(e.timestamp))}] ${AF.util.esc(e.mensaje || e.type)}</span>`);
    reg.innerHTML = ult.join('');
  },

  /* ---------------- TECLADO Y CURSOR ---------------- */
  instalarTeclado() {
    window.addEventListener('keydown', ev => {
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      const k = ev.key.toLowerCase();
      if (k === 'escape') {
        if (this.moviendo) return this.cancelarMover();
        if (this.dialogo) return this.cerrarDialogo();
        if (AF.estado.verbo) return this.elegirVerbo(AF.estado.verbo);
        return AF.ventanas.cerrarUltima();
      }
      if (k === ' ') { ev.preventDefault(); AF.sim.pausar(); this.refrescar(); return; }
      if (k === 'arrowleft') { AF.estado.siguiendo = null; AF.motor.camObjetivo -= 60; return; }
      if (k === 'arrowright') { AF.estado.siguiendo = null; AF.motor.camObjetivo += 60; return; }
      if (k === 'f1') { ev.preventDefault(); AF.ventanas.abrir('ayuda'); return; }
      if (!this.dialogo && /^[1-3]$/.test(k) && AF.MENU.velocidades.includes(+k)) { AF.estado.velocidad = +k; this.refrescar(); return; }
      const v = AF.MENU.verbos.find(x => x.tecla === k);
      if (v && !this.dialogo) this.elegirVerbo(v.id);
      if (this.dialogo && /^[1-9]$/.test(k)) { const op = AF.DIALOGOS.conversacion.opciones[+k - 1]; if (op) this.responder(this.dialogo.robot, op.id); }
    });
  },
  instalarCursor() {
    const hacer = (col) => {
      const cv = document.createElement('canvas'); cv.width = 23; cv.height = 23;
      const c = cv.getContext('2d');
      const r = (x, y, w, h, cc) => { c.fillStyle = cc; c.fillRect(x, y, w, h); };
      [[10, 0, 3, 8], [10, 15, 3, 8], [0, 10, 8, 3], [15, 10, 8, 3]].forEach(([x, y, w, h]) => r(x, y, w, h, '#000'));
      [[11, 1, 1, 6], [11, 16, 1, 6], [1, 11, 6, 1], [16, 11, 6, 1]].forEach(([x, y, w, h]) => r(x, y, w, h, col));
      return `url(${cv.toDataURL()}) 11 11, crosshair`;
    };
    const st = document.createElement('style');
    st.textContent = `#escena{cursor:${hacer('#ffffff')}} #escena.sobreObjeto{cursor:${hacer('#ffe066')}}`;
    document.head.appendChild(st);
  }
};
