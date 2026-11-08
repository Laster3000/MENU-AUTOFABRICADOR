/* =====================================================================
   AUTOFABRICADOR · REGISTRO DE AGENTES Y DEPENDENCIAS
   ---------------------------------------------------------------------
   Se ejecuta al arrancar, ANTES de crear el mundo:
     1. Lee config/robots.js (y los agentes añadidos desde el Editor).
     2. Completa los campos que faltan (colores, velocidad, depende).
     3. Valida: ids únicos, dependencias que existen, sin ciclos y
        cada fase con su agente. Un agente con errores queda fuera del
        flujo, pero el menú arranca igual.
     4. Ordena las fases del flujo según "depende".
     5. Crea el puesto, el cartel y el sitio de descanso de cada agente.
        Si su sala no tiene hueco, alarga la nave.
   ===================================================================== */
window.AF = window.AF || {};

AF.registro = {
  errores: [],        // [{ agente, motivo }]
  avisos: [],         // textos generales
  puestoDe: {},       // robotId -> id de su estación
  generados: [],      // ids de objetos creados automáticamente

  PALETA: [
    ['#e8d8c8', '#ff7a40', '#ffb080', '#ffa070'], ['#d8e8f0', '#40c0d0', '#90f0ff', '#80e8f0'],
    ['#e0e0f0', '#7080ff', '#a0b0ff', '#a8b8ff'], ['#f0e8d0', '#c0a020', '#f0d860', '#f0d870'],
    ['#e8e0e8', '#d050d0', '#f090f0', '#f0a0f0'], ['#e0f0e0', '#20a080', '#70e0c0', '#80e8c8']
  ],

  preparar() {
    this.errores = []; this.avisos = []; this.puestoDe = {}; this.generados = [];
    const extra = AF.almacen.cargar('agentes-extra', []);
    const lista = AF.ROBOTS.concat(Array.isArray(extra) ? extra : []);
    // ---- 1. normalizar y comprobar campos obligatorios / duplicados ----
    const vistos = new Set(), agentes = [];
    lista.forEach((a, i) => {
      if (!a || !a.id || !a.nombre || !a.rol) { this.avisos.push('Un agente sin id, nombre o rol se ha ignorado.'); return; }
      if (vistos.has(a.id)) { this.avisos.push(`El id «${a.id}» está repetido: se ignora la segunda copia.`); return; }
      vistos.add(a.id);
      const p = this.PALETA[i % this.PALETA.length];
      agentes.push(Object.assign({ depende: [], velocidad: 46, cuerpo: p[0], acento: p[1], visor: p[2], voz: p[3], accesorio: 'ninguno',
        descripcion: 'Agente añadido a la fábrica.' }, a, { depende: Array.isArray(a.depende) ? a.depende.slice() : [] }));
    });
    AF.ROBOTS = agentes;
    // dependencias añadidas desde el Editor (p. ej. que el EMPAQUETADOR espere a un agente nuevo)
    const depExtra = AF.almacen.cargar('depende-extra', {});
    Object.keys(depExtra || {}).forEach(id => { const a = agentes.find(x => x.id === id); if (a) depExtra[id].forEach(d => { if (!a.depende.includes(d)) a.depende.push(d); }); });
    const porId = id => agentes.find(a => a.id === id);
    const marcar = (a, motivo) => { a.error = motivo; this.errores.push({ agente: a.id, motivo }); };

    // ---- 2. dependencias que no existen ----
    agentes.forEach(a => a.depende.forEach(d => { if (!porId(d)) marcar(a, `depende de «${d}», que no existe`); }));
    // ---- 3. ciclos ----
    const estado = {};
    const visitar = (a, pila) => {
      if (estado[a.id] === 2) return;
      if (estado[a.id] === 1) { pila.slice(pila.indexOf(a.id)).forEach(id => { const x = porId(id); if (!x.error) marcar(x, 'forma un ciclo de dependencias: ' + pila.slice(pila.indexOf(a.id)).concat(a.id).join(' → ')); }); return; }
      estado[a.id] = 1;
      a.depende.forEach(d => { const x = porId(d); if (x) visitar(x, pila.concat(a.id)); });
      estado[a.id] = 2;
    };
    agentes.forEach(a => visitar(a, []));

    // ---- 4. fases del flujo ----
    const F = AF.FLUJO;
    agentes.forEach(a => {
      if (!a.fase || a.error) return;
      if (!F.fases.find(f => f.id === a.fase)) {
        F.fases.push({ id: a.fase, nombre: a.rol, duracion: a.duracionFase || 4, rolReal: '—', evento: 'PHASE_STARTED', creada: true });
        if (!a.duracionFase) this.avisos.push(`La fase «${a.fase}» no estaba en config/flujo.js: se ha creado con 4 s de duración.`);
      }
    });
    F.fases = F.fases.filter(f => {
      const a = agentes.find(x => x.fase === f.id && !x.error);
      if (!a) { this.avisos.push(`La fase «${f.nombre}» no tiene agente válido y queda fuera del flujo.`); return false; }
      f.robot = a.id; return true;
    });
    // orden topológico por "depende" (empate: orden original)
    const idx = f => F.fases.indexOf(f), orden = [], hecho = new Set();
    const listas = () => F.fases.filter(f => !hecho.has(f.id) && porId(f.robot).depende.every(d => {
      const fd = F.fases.find(x => x.robot === d); return !fd || hecho.has(fd.id);
    })).sort((a, b) => idx(a) - idx(b));
    while (orden.length < F.fases.length) {
      const sig = listas()[0];
      if (!sig) { F.fases.filter(f => !hecho.has(f.id)).forEach(f => { orden.push(f); hecho.add(f.id); }); break; }
      orden.push(sig); hecho.add(sig.id);
    }
    F.fases = orden;
    F.fases.forEach(f => { if (f.siFalla && !F.fases.find(x => x.id === f.siFalla)) delete f.siFalla; });

    // ---- 5. puestos, carteles y sitios de descanso ----
    F.fases.forEach(f => {
      const a = porId(f.robot);
      let est = f.estacion && this.obj(f.estacion);
      if (!est) { est = this.generarPuesto(a); f.estacion = est.id; }
      this.puestoDe[a.id] = est.id;
      est.robotId = a.id;
      this.cartel(a, est, f);
    });
    agentes.forEach(a => {
      if (a.puestoId && this.obj(a.puestoId)) { this.puestoDe[a.id] = a.puestoId; this.obj(a.puestoId).robotId = a.id; }
      else if (a.fase && a.error && a.puesto) { /* sin puesto: está fuera del flujo */ }
    });
    this.repartirDescanso(agentes);
    return this;
  },

  obj(id) { return AF.ESCENA.objetos.find(o => o.id === id); },
  sala(id) { const S = AF.ESCENA.salas; return S.find(s => s.id === id) || S.filter(s => !s.descanso).slice(-1)[0]; },

  /* ---------- puesto automático para un agente nuevo ---------- */
  generarPuesto(a) {
    const sala = this.sala(a.sala), ANCHO = 120;
    let x = this.buscarHueco(sala, ANCHO);
    if (x == null) { this.alargar(sala, ANCHO + 30); x = this.buscarHueco(sala, ANCHO); }
    if (x == null) x = sala.x1 - ANCHO / 2 - 10;
    const tipo = (a.puesto && a.puesto.tipo) || 'escritorio';
    const est = { id: 'st-' + a.id, tipo: 'estacion', nombre: 'Puesto de ' + a.nombre, asset: AF.sprites.lista[tipo] ? tipo : 'escritorio',
      descripcion: 'Puesto creado automáticamente para ' + a.nombre + ' (' + a.rol + ').', x, y: 140, caja: { w: 100, h: 70 },
      colision: { w: 92, h: 18 }, acceso: { dx: 0, dy: 18 }, deposito: { dx: -30, dy: 14 }, mira: 'arriba', usar: 'ventana:agentes', movible: true, generado: true };
    AF.ESCENA.objetos.push(est);
    this.generados.push(est.id);
    return est;
  },

  // hueco libre junto a la pared del fondo dentro de una sala
  buscarHueco(sala, ancho) {
    const tab = AF.ESCENA.tabique, ocupado = [];
    AF.ESCENA.objetos.forEach(o => {
      if (o.capa === 'pared' || !o.colision || o.y > 170) return;
      ocupado.push([o.x - o.colision.w / 2 - 12, o.x + o.colision.w / 2 + 12]);
    });
    ocupado.push([tab.x - 30, tab.x + 40]);
    for (let x = sala.x0 + ancho / 2 + 16; x <= sala.x1 - ancho / 2 - 16; x += 8) {
      if (!ocupado.some(([a, b]) => x + ancho / 2 > a && x - ancho / 2 < b)) return x;
    }
    return null;
  },

  // inserta "ancho" píxeles al final de la sala y desplaza todo lo que va detrás
  alargar(sala, ancho) {
    const E = AF.ESCENA, X = sala.x1;
    E.objetos.forEach(o => { if (o.x >= X) o.x += ancho; });
    E.ventanas.forEach(v => { if (v.x >= X) v.x += ancho; });
    E.lamparas.forEach(l => { if (l.x >= X) l.x += ancho; });
    if (E.tabique.x >= X) E.tabique.x += ancho;
    E.salas.forEach(s => {
      if (s === sala) { s.x1 += ancho; s.fuga += ancho / 2; }
      else if (s.x0 >= X) { s.x0 += ancho; s.x1 += ancho; s.fuga += ancho; }
    });
    E.ventanas.push({ x: X + ancho / 2 - 42, y: 8, w: 84, h: 40 });
    E.lamparas.push({ x: X + ancho / 2, cable: 18 });
    E.mundo.ancho += ancho;
    this.avisos.push(`La sala «${sala.nombre}» se ha alargado ${ancho} px para el puesto nuevo.`);
  },

  // cartel colgado sobre el puesto con el nombre del agente
  cartel(a, est, fase) {
    let rot = AF.ESCENA.objetos.find(o => o.tipo === 'rotulo' && o.props && o.props.robot === a.id);
    if (!rot) {
      rot = { id: 'rot-' + a.id, tipo: 'rotulo', capa: 'pared', nombre: 'Cartel de ' + a.nombre, asset: 'rotulo', x: est.x, y: 70,
        caja: { w: 80, h: 20 }, props: { robot: a.id }, generado: true };
      AF.ESCENA.objetos.push(rot); this.generados.push(rot.id);
    }
    rot.nombre = 'Cartel de ' + a.nombre;
    rot.props.estacion = est.id;
    rot.props.texto = a.nombre;
    rot.props.sub = (fase ? fase.nombre : a.rol).toUpperCase();
  },

  // un sitio fijo para cada agente en la zona de descanso
  repartirDescanso(agentes) {
    const zona = AF.ESCENA.salas.find(s => s.descanso);
    if (!zona) { agentes.forEach(a => { if (!a.base) a.base = { x: 240, y: 190 }; }); return; }
    const sitios = [];
    [[172, 0], [202, 22], [188, 11]].forEach(([y, dx]) => { for (let x = zona.x0 + 30 + dx; x <= zona.x1 - 34; x += 44) sitios.push({ x, y }); });
    let i = 0;
    agentes.forEach(a => {
      if (a.base && a.baseFija) return;
      a.base = sitios[i % sitios.length] ? Object.assign({}, sitios[i % sitios.length]) : { x: zona.x0 + 40, y: 190 };
      i++;
    });
  },

  /* ---------- consultas ---------- */
  cfg(id) { return AF.ROBOTS.find(a => a.id === id); },
  dependeDe(id) { const a = this.cfg(id); return a ? a.depende.filter(d => this.cfg(d)) : []; },
  entregaA(id) { return AF.ROBOTS.filter(a => a.depende.includes(id)).map(a => a.id); },
  errorDe(id) { const a = this.cfg(id); return a && a.error; },
  estacionDe(id) { return this.puestoDe[id] ? AF.mundo.obj(this.puestoDe[id]) : null; }
};
