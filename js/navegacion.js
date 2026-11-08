/* =====================================================================
   AUTOFABRICADOR · NAVEGACIÓN
   ---------------------------------------------------------------------
   Rejilla transitable independiente del dibujo: el arte NO decide por
   dónde se pasa. Se construye a partir de las colisiones declaradas,
   el tabique y el estado de las puertas. Rutas con A* (8 direcciones).
   ===================================================================== */
window.AF = window.AF || {};

AF.nav = {
  cols: 0, filas: 0, celda: 8, y0: 120,
  bloq: null,      // 0 libre · 1 obstáculo · 2 puerta cerrada · 3 tabique · 4 fuera del suelo
  radio: 3,        // margen del robot alrededor de los obstáculos

  construir(opciones) {
    opciones = opciones || {};
    const M = AF.ESCENA.mundo;
    this.celda = M.celda;
    this.y0 = M.sueloY + 2;
    this.cols = Math.floor(M.ancho / this.celda);
    this.filas = Math.floor((M.sueloFin - this.y0) / this.celda);
    this.bloq = new Uint8Array(this.cols * this.filas);
    const objetos = opciones.objetos || AF.mundo.objetos;
    const puertaAbierta = opciones.puertasAbiertas || AF.mundo.puertaAbierta();

    for (let r = 0; r < this.filas; r++) for (let c = 0; c < this.cols; c++) {
      const p = this.centro(c, r);
      let v = 0;
      // tabique y puerta
      const tab = AF.ESCENA.tabique;
      const wx = tab.x + (p.y - M.sueloY) * tab.pendiente;
      if (p.x > wx - this.radio - 4 && p.x < wx + tab.grosor + this.radio + 2) {
        const enHueco = p.y > tab.hueco.y0 + 2 && p.y < tab.hueco.y1 - 2;
        v = enHueco ? (puertaAbierta ? 0 : 2) : 3;
      }
      // colisiones de objetos
      if (!v) for (const o of objetos) {
        if (!o.colision || o.visible === false) continue;
        const R = this.rectColision(o);
        if (p.x > R.x - this.radio && p.x < R.x + R.w + this.radio && p.y > R.y - this.radio && p.y < R.y + R.h + this.radio) { v = 1; break; }
      }
      if (p.x < 6 || p.x > M.ancho - 6) v = 4;
      this.bloq[r * this.cols + c] = v;
    }
    return this;
  },

  rectColision(o) {
    const k = o.colision;
    return { x: o.x - k.w / 2 + (k.dx || 0), y: o.y - k.h, w: k.w, h: k.h };
  },
  centro(c, r) { return { x: c * this.celda + this.celda / 2, y: this.y0 + r * this.celda + this.celda / 2 }; },
  celdaDe(x, y) {
    return { c: AF.util.limitar(Math.floor(x / this.celda), 0, this.cols - 1),
             r: AF.util.limitar(Math.floor((y - this.y0) / this.celda), 0, this.filas - 1) };
  },
  clave(c, r) { return r * this.cols + c; },
  libre(c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.filas && this.bloq[r * this.cols + c] === 0; },
  valor(c, r) { return (c >= 0 && r >= 0 && c < this.cols && r < this.filas) ? this.bloq[r * this.cols + c] : 4; },

  // celda libre más cercana a un punto (búsqueda en anillos)
  libreCercana(x, y, evitar) {
    const o = this.celdaDe(x, y);
    for (let rad = 0; rad < 12; rad++) {
      let mejor = null, md = 1e9;
      for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
        const c = o.c + dc, r = o.r + dr;
        if (!this.libre(c, r) || (evitar && evitar.has(this.clave(c, r)))) continue;
        const p = this.centro(c, r), d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < md) { md = d; mejor = { c, r }; }
      }
      if (mejor) return mejor;
    }
    return null;
  },

  /* A* — devuelve lista de celdas {c,r} o null.
     evitar: Set de claves ocupadas temporalmente (otros robots) */
  ruta(desde, hasta, evitar) {
    if (!desde || !hasta) return null;
    const N = this.cols * this.filas;
    const g = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), cerrado = new Uint8Array(N);
    const h = (c, r) => { const dx = Math.abs(c - hasta.c), dy = Math.abs(r - hasta.r); return dx + dy + (1.414 - 2) * Math.min(dx, dy); };
    const abierto = [];   // montículo binario simple
    const push = (k, f) => { abierto.push([f, k]); let i = abierto.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (abierto[p][0] <= abierto[i][0]) break; [abierto[p], abierto[i]] = [abierto[i], abierto[p]]; i = p; } };
    const pop = () => { const top = abierto[0], last = abierto.pop(); if (abierto.length) { abierto[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < abierto.length && abierto[l][0] < abierto[m][0]) m = l; if (r < abierto.length && abierto[r][0] < abierto[m][0]) m = r; if (m === i) break; [abierto[m], abierto[i]] = [abierto[i], abierto[m]]; i = m; } } return top; };
    const ini = this.clave(desde.c, desde.r), fin = this.clave(hasta.c, hasta.r);
    g[ini] = 0; push(ini, h(desde.c, desde.r));
    const pasable = (c, r) => {
      if (c < 0 || r < 0 || c >= this.cols || r >= this.filas) return false;
      const k = this.clave(c, r);
      if (k === fin || k === ini) return this.bloq[k] === 0 || k === ini;
      return this.bloq[k] === 0 && !(evitar && evitar.has(k));
    };
    let iter = 0;
    while (abierto.length && iter++ < 20000) {
      const [, k] = pop();
      if (cerrado[k]) continue;
      cerrado[k] = 1;
      if (k === fin) break;
      const c = k % this.cols, r = (k / this.cols) | 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = c + dc, nr = r + dr;
        if (!pasable(nc, nr)) continue;
        if (dr && dc && (!pasable(c + dc, r) || !pasable(c, r + dr))) continue;   // no cortar esquinas
        const nk = this.clave(nc, nr), coste = g[k] + (dr && dc ? 1.414 : 1);
        if (coste < g[nk]) { g[nk] = coste; prev[nk] = k; push(nk, coste + h(nc, nr)); }
      }
    }
    if (!cerrado[fin]) return null;
    const camino = [];
    for (let k = fin; k !== -1 && k !== ini; k = prev[k]) camino.push({ c: k % this.cols, r: (k / this.cols) | 0 });
    return camino.reverse();
  },

  /* Validación de distribución: todo punto de acceso debe ser alcanzable
     desde el punto central (con las puertas abiertas). */
  validar(objetos) {
    const errores = [];
    const backup = this.bloq;
    this.construir({ objetos, puertasAbiertas: true });
    const pc = AF.ESCENA.puntoCentral;
    const hub = this.libreCercana(pc.x, pc.y);
    if (!hub) errores.push('El punto central de la fábrica está bloqueado.');
    const comprobar = (nombre, x, y) => {
      const c = this.celdaDe(x, y);
      if (!this.libre(c.c, c.r)) { errores.push(nombre + ': su punto de acceso queda dentro de un obstáculo.'); return; }
      if (hub && !this.ruta(hub, c)) errores.push(nombre + ': no hay ruta hasta su punto de acceso.');
    };
    for (const o of objetos) {
      if (o.visible === false) continue;
      if (o.acceso) comprobar(o.nombre, o.x + o.acceso.dx, o.y + o.acceso.dy);
      if (o.deposito) comprobar(o.nombre + ' (depósito)', o.x + o.deposito.dx, o.y + o.deposito.dy + 8);
      if (o.y < AF.ESCENA.mundo.sueloY && o.capa !== 'pared') errores.push(o.nombre + ': no está apoyado en el suelo.');
    }
    ((AF.mundo && AF.mundo.robots.length) ? AF.mundo.robots.map(r => r.cfg) : AF.ROBOTS).forEach(rc => comprobar('Base de ' + rc.nombre, rc.base.x, rc.base.y));
    // reconstruye el estado real
    this.bloq = backup;
    this.construir();
    return { ok: errores.length === 0, errores };
  }
};
