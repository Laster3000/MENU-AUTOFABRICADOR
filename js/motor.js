/* =====================================================================
   AUTOFABRICADOR · MOTOR DE ESCENA
   ---------------------------------------------------------------------
   Capas (de atrás hacia delante):
     01 ambiente (cielo con paralaje) · 02-03 fondo cacheado (pared, suelo)
     04 objetos de pared · 05 objetos + robots ordenados por profundidad
     06 luces · 07 interfaz (textos de robots, narrador, selección)
   El arte se dibuja a baja resolución y se amplía sin suavizado.
   ===================================================================== */
window.AF = window.AF || {};

AF.motor = {
  lienzo: null, ctx: null,           // lienzo visible (pantalla)
  bajo: null, bctx: null, g: null,   // lienzo de baja resolución
  fondo: null,                       // fondo cacheado del mundo completo
  escala: 3, camX: 0, camObjetivo: 0,
  raton: { x: -1, y: -1, dentro: false, mx: 0, my: 0 },
  narrador: null, fantasma: null, destello: null,
  arrastre: null, pulsado: null, inercia: 0, ultimo: 0, fps: 0, _fpsAcc: 0, _fpsN: 0,

  iniciar(lienzo) {
    const V = AF.ESCENA.vista;
    this.lienzo = lienzo; this.ctx = lienzo.getContext('2d');
    this.bajo = document.createElement('canvas'); this.bajo.width = V.ancho; this.bajo.height = V.alto;
    this.bctx = this.bajo.getContext('2d');
    this.g = new AF.Pincel(this.bctx);
    this.construirFondo();
    this.redimensionar();
    window.addEventListener('resize', () => this.redimensionar());
    this.instalarRaton();
    requestAnimationFrame(t => this.bucle(t));
  },

  redimensionar() {
    // la altura de la escena es fija (220 px de arte); el ancho visible se adapta a la pantalla
    const V = AF.ESCENA.vista, M = AF.ESCENA.mundo, cont = this.lienzo.parentElement;
    const aw = cont.clientWidth - 8, ah = cont.clientHeight - 8;
    let s = ah / V.alto;
    s = s >= 2 ? Math.floor(s * 2) / 2 : Math.max(1, s);     // escalas enteras o medias: píxeles nítidos
    let ancho = Math.floor(aw / s);
    if (ancho < 320) { s = Math.max(1, Math.floor(aw / 320 * 2) / 2); ancho = Math.floor(aw / s); }
    V.ancho = Math.min(M.ancho, ancho);
    this.escala = s;
    this.bajo.width = V.ancho; this.bajo.height = V.alto;
    this.bctx.imageSmoothingEnabled = false;
    this.lienzo.width = Math.round(V.ancho * s); this.lienzo.height = Math.round(V.alto * s);
    this.ctx.imageSmoothingEnabled = false;
    this.camObjetivo = AF.util.limitar(this.camObjetivo, 0, M.ancho - V.ancho);
  },

  /* ---------------- FONDO (se dibuja una sola vez) ---------------- */
  construirFondo() {
    const M = AF.ESCENA.mundo, T = AF.TEMA;
    this.fondo = document.createElement('canvas');
    this.fondo.width = M.ancho; this.fondo.height = M.alto;
    const c = this.fondo.getContext('2d'), g = new AF.Pincel(c);
    const sy = M.sueloY;

    // ---- pared de ladrillo ----
    g.rect(0, 0, M.ancho, sy, T.mortero);
    for (let fila = 0; fila * 6 < sy; fila++) {
      const off = (fila % 2) * 7;
      for (let x = -off; x < M.ancho; x += 14) {
        const h = (Math.sin(x * 12.9898 + fila * 78.233) * 43758.5453) % 1;
        const col = T.ladrillo[Math.abs(Math.floor(h * 3)) % 3];
        g.rect(x + 1, fila * 6 + 1, 12, 5, col);
        g.rect(x + 1, fila * 6 + 1, 12, 1, 'rgba(255,220,180,0.06)');
      }
    }
    // oscurecido superior con tramado
    g.trama(0, 0, M.ancho, 14, 'rgba(10,6,16,0.5)');
    g.trama(0, 14, M.ancho, 16, 'rgba(10,6,16,0.35)', 1);
    // zócalo de madera
    const zy = 84;
    g.rect(0, zy, M.ancho, sy - zy, T.zocalo[0]);
    g.rect(0, zy, M.ancho, 3, T.zocalo[2]); g.rect(0, zy + 3, M.ancho, 1, T.zocalo[1]);
    for (let x = 4; x < M.ancho; x += 40) {
      g.rect(x, zy + 8, 34, sy - zy - 14, T.zocalo[2]);
      g.rect(x + 1, zy + 9, 32, sy - zy - 16, T.zocalo[0]);
      g.rect(x + 1, zy + 9, 32, 1, T.zocalo[1]);
      g.trama(x + 2, zy + 11, 30, sy - zy - 19, 'rgba(255,200,140,0.04)');
    }
    g.rect(0, sy - 3, M.ancho, 3, T.zocalo[2]);
    // viga del techo
    g.rect(0, 0, M.ancho, 7, T.viga[2]); g.rect(0, 1, M.ancho, 5, T.viga[0]); g.rect(0, 1, M.ancho, 1, T.viga[1]);
    for (let x = 6; x < M.ancho; x += 20) { g.px(x, 3, T.remache); g.px(x, 4, T.viga[2]); }
    // pilares de madera en los extremos
    [0, M.ancho - 8].forEach(px => { g.rect(px, 0, 8, sy, T.viga[0]); g.rect(px + 1, 0, 2, sy, T.viga[1]); g.rect(px + 7, 0, 1, sy, T.viga[2]); });
    // tuberías horizontales
    g.rect(0, 76, M.ancho, 4, T.contorno); g.rect(0, 77, M.ancho, 2, T.metal[0]); g.rect(0, 77, M.ancho, 1, T.metal[1]);
    for (let x = 30; x < M.ancho; x += 60) { g.rect(x, 75, 3, 6, T.metal[2]); g.px(x + 1, 76, T.metal[3]); }

    // ---- ventanales (se recortan para que se vea el cielo) ----
    AF.ESCENA.ventanas.forEach(v => {
      const arco = Math.round(v.w / 4);
      const forma = (ctx, ex) => {
        ctx.beginPath();
        ctx.ellipse(v.x + v.w / 2, v.y + arco, v.w / 2 + ex, arco + ex, 0, Math.PI, 0);
        ctx.rect(v.x - ex, v.y + arco, v.w + ex * 2, v.h - arco + ex);
      };
      c.fillStyle = T.contorno; forma(c, 4); c.fill();
      c.fillStyle = T.madera[2]; forma(c, 3); c.fill();
      c.fillStyle = T.madera[0]; forma(c, 2); c.fill();
      c.save(); c.globalCompositeOperation = 'destination-out'; forma(c, 0); c.fill(); c.restore();
      // parteluces
      g.rect(v.x + v.w / 2 - 1, v.y, 2, v.h, T.madera[2]);
      g.rect(v.x, v.y + arco, v.w, 2, T.madera[2]);
      g.rect(v.x, v.y + arco + Math.round((v.h - arco) / 2), v.w, 1, T.madera[2]);
      for (let i = 1; i < 4; i++) g.rect(v.x + Math.round(v.w * i / 4), v.y + arco, 1, v.h - arco, T.madera[2]);
      // alféizar
      g.rect(v.x - 5, v.y + v.h + 2, v.w + 10, 3, T.madera[1]); g.rect(v.x - 5, v.y + v.h + 2, v.w + 10, 1, T.madera[3]);
    });

    // ---- suelo con perspectiva ----
    g.rect(0, sy, M.ancho, M.alto - sy, T.suelo[0]);
    AF.ESCENA.salas.forEach(sala => {
      c.save(); c.beginPath(); c.rect(sala.x0, sy, sala.x1 - sala.x0, M.alto - sy); c.clip();
      if (sala.suelo) g.rect(sala.x0, sy, sala.x1 - sala.x0, M.alto - sy, sala.suelo);
      // filas de baldosas (cada vez más separadas hacia el frente)
      const filas = []; for (let k = 0, y = sy; y < M.alto; k++) { filas.push(y); y = sy + 5 * (k + 1) + 0.5 * (k + 1) * (k + 1); }
      filas.forEach((y, i) => {
        const y2 = filas[i + 1] || M.alto;
        if (i % 2) g.trama(sala.x0, y, sala.x1 - sala.x0, y2 - y, sala.sueloTrama || T.suelo[1]);
        g.rect(sala.x0, Math.round(y), sala.x1 - sala.x0, 1, T.sueloLinea);
      });
      // juntas que convergen hacia el punto de fuga
      for (let i = -14; i <= 14; i++) {
        const xb = sala.fuga + i * 34, xt = sala.fuga + i * 34 * 0.42;
        g.linea(xt, sy, xb, M.alto, T.sueloLinea);
      }
      c.restore();
    });
    // reflejos bajo las lámparas
    AF.ESCENA.lamparas.forEach(l => { c.save(); c.globalAlpha = 0.10; g.elipse(l.x, 176, 46, 20, '#ffe8b0'); c.globalAlpha = 0.08; g.elipse(l.x, 176, 26, 10, '#fff4d0'); c.restore(); });
    // línea amarilla de paso
    for (let x = 12; x < M.ancho - 12; x += 14) g.rect(x, 192, 8, 1, 'rgba(232,184,48,0.55)');
    // franja de peligro al frente
    g.rect(0, M.alto - 5, M.ancho, 5, T.peligro[1]);
    for (let x = -4; x < M.ancho; x += 8) for (let j = 0; j < 4; j++) g.rect(x + j, M.alto - 4 + j, 4, 1, T.peligro[0]);
    // rodapié
    g.rect(0, sy, M.ancho, 2, '#1e1820');
    g.rect(0, sy + 2, M.ancho, 1, 'rgba(0,0,0,0.25)');
  },

  /* ---------------- CIELO (capa 01, con paralaje) ---------------- */
  dibujarCielo(t) {
    const g = this.g, T = AF.TEMA, V = AF.ESCENA.vista;
    const par = this.camX * 0.25;
    const bandas = T.cielo;
    for (let i = 0; i < bandas.length; i++) g.c.fillStyle = bandas[i], g.c.fillRect(0, i * 10, V.ancho, 12);
    for (let i = 0; i < bandas.length - 1; i++) { const p = new AF.Pincel(g.c); p.trama(0, i * 10 + 8, V.ancho, 3, bandas[i + 1], 0); }
    // estrellas
    for (let i = 0; i < 70; i++) {
      const sx = ((i * 97.3) % 600) - par % 600, sy = (i * 31.7) % 48;
      const x = ((sx % 600) + 600) % 600;
      const brillo = AF.estado.ajustes.movimientoReducido ? 1 : (Math.sin(t * 2 + i) > -0.6 ? 1 : 0);
      if (brillo && x < V.ancho) g.c.fillStyle = T.estrella, g.c.fillRect(Math.round(x), Math.round(sy), 1, 1);
    }
    // luna
    const lx = 140 - par * 0.5;
    const p = new AF.Pincel(g.c);
    p.alfa(0.25, () => p.elipse(lx, 18, 12, 12, T.luna));
    p.elipse(lx, 18, 8, 8, T.luna); p.elipse(lx + 2, 16, 2, 2, T.lunaSombra); p.elipse(lx - 3, 21, 1, 1, T.lunaSombra);
    // isla lejana con faro (guiño de aventura)
    const ix = 420 - par;
    p.rect(0, 40, V.ancho, 10, T.mar);
    for (let k = 0; k < 2; k++) {
      const bx = ((ix + k * 520) % 1040 + 1040) % 1040 - 280;
      p.elipse(bx, 42, 60, 7, T.isla);
      p.elipse(bx - 18, 38, 18, 6, T.isla);
      p.rect(bx + 20, 28, 3, 12, T.islaBrillo);
      if (Math.floor(t * 1.5) % 2) p.rect(bx + 20, 27, 3, 2, '#ffe890');
    }
    for (let x = 0; x < V.ancho; x += 7) p.px(x + Math.round(t * 3) % 7, 44 + (x % 3), '#2a3470');
  },

  /* ---------------- TABIQUE Y PUERTA (piezas ordenables) ---------------- */
  // Pared que separa las salas, vista en perspectiva: techo plano, base sobre la línea del suelo.
  // Se dibuja por filas de profundidad para poder intercalar robots delante y detrás.
  tabX(yy) { const tab = AF.ESCENA.tabique; return tab.x + (yy - AF.ESCENA.mundo.sueloY) * tab.pendiente; },
  dibujarTabique(g, yDesde, yHasta, t) {
    const tab = AF.ESCENA.tabique, T = AF.TEMA, H = tab.hueco, top = tab.techo || 0, hp = tab.altoPuerta || 42;
    const cursos = 18;
    for (let yy = yDesde; yy <= yHasta; yy++) {
      const wx = Math.round(this.tabX(yy)), alto = yy - top;
      const enHueco = yy > H.y0 && yy < H.y1;
      const fin = enHueco ? yy - hp : yy;
      const luz = (yy - AF.ESCENA.mundo.sueloY) / 98;          // la cara delantera recibe más luz
      g.rect(wx, top, tab.grosor, fin - top, luz > 0.5 ? T.ladrillo[1] : T.ladrillo[0]);
      for (let j = 1; j < cursos; j++) {
        const yj = Math.round(yy - j / cursos * alto);
        if (yj < fin) g.rect(wx, yj, tab.grosor, 1, T.mortero);
        if (((yy >> 2) + j) % 3 === 0 && yj < fin) g.px(wx + 2, yj + 1, T.ladrillo[2]);
      }
      // zócalo de madera a la misma altura proporcional que en la pared del fondo
      const zb = Math.round(yy - alto * 0.29);
      if (!enHueco) {
        g.rect(wx, zb, tab.grosor, yy - zb, T.zocalo[0]);
        g.rect(wx, zb, tab.grosor, 1, T.zocalo[1]);
        g.rect(wx, Math.round(yy - alto * 0.025), tab.grosor, 2, T.zocalo[2]);
      }
      // dintel de madera sobre la puerta
      if (enHueco) {
        g.rect(wx, fin - 7, tab.grosor, 4, T.metal[2]); g.rect(wx, fin - 7, tab.grosor, 1, T.metal[1]);   // cajón de la persiana
        g.rect(wx, fin - 3, tab.grosor, 3, T.viga[0]); g.rect(wx, fin - 1, tab.grosor, 1, T.contorno);
        g.rect(wx, fin, 1, hp, 'rgba(10,6,16,0.35)');                                                  // sombra interior de la jamba
      }
      // jambas
      if (yy === H.y0 || yy === H.y1) { g.rect(wx, yy - hp - 4, tab.grosor, hp + 4, T.viga[0]); g.rect(wx, yy - hp - 4, 1, hp + 4, T.viga[1]); }
      g.rect(wx, top, tab.grosor, 2, T.viga[2]);
    }
    // arista delantera iluminada y arista trasera en sombra
    if (yHasta >= AF.ESCENA.mundo.sueloFin) { const fx = Math.round(this.tabX(yHasta)) + tab.grosor - 1; g.rect(fx, top, 1, yHasta - top, T.viga[1]); }
    if (yDesde <= AF.ESCENA.mundo.sueloY) { const bx = Math.round(this.tabX(yDesde)); g.rect(bx, top, 1, yDesde - top, T.contorno); }
  },

  dibujarPuerta(g, t) {
    const tab = AF.ESCENA.tabique, T = AF.TEMA, H = tab.hueco, hp = tab.altoPuerta || 42;
    const ap = AF.mundo.puerta.apertura;
    for (let yy = H.y0 + 1; yy < H.y1; yy++) {
      const wx = Math.round(this.tabX(yy));
      const alto = Math.round((hp - 4) * (1 - ap));
      if (alto <= 0) continue;
      const top = yy - hp;
      g.rect(wx, top, tab.grosor, alto, T.metal[0]);
      for (let k = top + 2; k < top + alto; k += 3) g.rect(wx, k, tab.grosor, 1, T.metal[2]);
      if (alto > 5) g.rect(wx, top + alto - 3, tab.grosor, 3, T.peligro[(yy >> 1) % 2]);
    }
    // luz de estado sobre el dintel
    const lx = Math.round(this.tabX((H.y0 + H.y1) / 2)) + 1, ly = (H.y0 + H.y1) / 2 - hp - 9;
    g.caja(lx, ly, 4, 3, AF.mundo.puerta.abierta ? T.verde[2] : T.rojo[1]);
    if (AF.estado.ajustes.calidad !== 'baja') g.alfa(0.25, () => g.elipse(lx + 2, ly + 1, 6, 4, AF.mundo.puerta.abierta ? T.verde[2] : T.rojo[1]));
  },

  /* ---------------- LÁMPARAS Y LUCES ---------------- */
  dibujarLamparas(g, t) {
    const T = AF.TEMA;
    AF.ESCENA.lamparas.forEach(l => {
      const y1 = 6 + l.cable;
      g.rect(l.x, 6, 1, l.cable, T.contorno);
      g.rect(l.x - 6, y1, 13, 2, T.contorno);
      g.rect(l.x - 5, y1 - 1, 11, 2, '#2e5a3a'); g.rect(l.x - 7, y1 + 1, 15, 3, '#2e5a3a'); g.rect(l.x - 7, y1 + 1, 15, 1, '#4a8a58');
      g.rect(l.x - 2, y1 + 4, 5, 2, T.luzBrillo);
    });
  },
  dibujarLuces(g, t) {
    if (AF.estado.ajustes.calidad === 'baja') return;
    const c = g.c;
    c.save();
    c.globalCompositeOperation = 'lighter';
    AF.ESCENA.lamparas.forEach((l, i) => {
      const y1 = 6 + l.cable + 5, parp = AF.estado.ajustes.movimientoReducido ? 1 : (0.92 + Math.sin(t * 7 + i * 3) * 0.04 + (Math.random() < 0.004 ? -0.4 : 0));
      const x = l.x - this.camX;
      const grad = c.createLinearGradient(0, y1, 0, 190);
      grad.addColorStop(0, 'rgba(255,214,140,' + (0.22 * parp) + ')');
      grad.addColorStop(1, 'rgba(255,214,140,0)');
      c.fillStyle = grad;
      c.beginPath(); c.moveTo(x - 4, y1); c.lineTo(x + 5, y1); c.lineTo(x + 52, 196); c.lineTo(x - 51, 196); c.closePath(); c.fill();
    });
    if (AF.estado.ajustes.calidad === 'alta') {
      // motas de polvo flotando en la luz
      AF.ESCENA.lamparas.forEach((l, i) => {
        for (let k = 0; k < 6; k++) {
          const px = l.x - this.camX + Math.sin(t * 0.4 + k * 2 + i) * 22, py = 60 + ((t * 4 + k * 23 + i * 7) % 110);
          c.fillStyle = 'rgba(255,240,200,0.35)'; c.fillRect(Math.round(px), Math.round(py), 1, 1);
        }
      });
    }
    c.restore();
  },

  /* ---------------- PUESTOS: baldosa de cada agente y su sitio de descanso ---------------- */
  dibujarPuestos(g, t) {
    AF.mundo.robots.forEach(r => {
      const c = r.cfg, est = AF.registro.estacionDe(r.id);
      const baldosa = (x, y, w, fuerte) => {
        x = Math.round(x); y = Math.round(y);
        g.rect(x - w / 2 - 1, y - 3, w + 2, 6, AF.TEMA.contorno);
        g.rect(x - w / 2, y - 2, w, 4, AF.personajes.oscurecer(c.acento, fuerte ? 0.9 : 0.55));
        g.rect(x - w / 2, y - 2, w, 1, AF.personajes.aclarar(c.acento, fuerte ? 1.3 : 0.8));
      };
      if (est && est.visible !== false) {
        const p = AF.mundo.punto(est, 'acceso'), activo = est.activa && Math.floor(t * 3) % 2;
        baldosa(p.x, p.y, 16, activo);
      }
      // sitio fijo en la zona de descanso (un cojín de su color)
      const b = c.base;
      if (b) { g.alfa(0.75, () => g.rect(Math.round(b.x) - 5, Math.round(b.y) - 1, 10, 3, AF.personajes.oscurecer(c.acento, 0.6))); g.px(Math.round(b.x), Math.round(b.y), c.acento); }
    });
  },

  /* ---------------- DEPENDENCIAS DE UN ROBOT (al MIRARLO) ---------------- */
  dibujarDependencias(g, t) {
    const M = AF.estado.marcaDeps;
    if (!M || performance.now() / 1000 > M.hasta) return;
    const c = this.bctx, cam = Math.round(this.camX);
    const punto = id => { const r = AF.mundo.robot(id), e = AF.registro.estacionDe(id); return e ? AF.mundo.punto(e, 'acceso') : r ? { x: r.cfg.base.x, y: r.cfg.base.y } : null; };
    const flecha = (a, b, col, txt) => {
      if (!a || !b) return;
      const mx = (a.x + b.x) / 2, alto = Math.min(70, 26 + Math.abs(b.x - a.x) * 0.12), my = Math.min(a.y, b.y) - alto;
      c.save(); c.strokeStyle = '#000'; c.lineWidth = 3; c.setLineDash([]);
      c.beginPath(); c.moveTo(a.x - cam, a.y - 4); c.quadraticCurveTo(mx - cam, my, b.x - cam, b.y - 4); c.stroke();
      c.strokeStyle = col; c.lineWidth = 1; c.setLineDash([4, 3]); c.lineDashOffset = -Math.floor(t * 12);
      c.beginPath(); c.moveTo(a.x - cam, a.y - 4); c.quadraticCurveTo(mx - cam, my, b.x - cam, b.y - 4); c.stroke();
      c.setLineDash([]);
      const ang = Math.atan2(b.y - 4 - my, b.x - mx);
      c.fillStyle = col; c.beginPath(); c.moveTo(b.x - cam, b.y - 4);
      c.lineTo(b.x - cam - 6 * Math.cos(ang - 0.5), b.y - 4 - 6 * Math.sin(ang - 0.5));
      c.lineTo(b.x - cam - 6 * Math.cos(ang + 0.5), b.y - 4 - 6 * Math.sin(ang + 0.5)); c.fill();
      c.restore();
      const w = AF.anchoTexto(txt) + 4;
      g.rect(mx - w / 2, my + alto / 2 - 14, w, 9, 'rgba(10,6,16,0.8)');
      g.texto(txt, mx, my + alto / 2 - 13, col, { centro: true });
    };
    const yo = punto(M.id);
    AF.registro.dependeDe(M.id).forEach(d => flecha(punto(d), yo, '#ffd040', 'DEPENDE'));
    AF.registro.entregaA(M.id).forEach(d => flecha(yo, punto(d), '#60e0ff', 'ENTREGA'));
  },

  /* ---------------- LISTA DE DIBUJO ORDENADA ---------------- */
  listaDibujo() {
    const L = [];
    const H = AF.ESCENA.tabique.hueco, sy = AF.ESCENA.mundo.sueloY;
    AF.mundo.objetos.forEach(o => { if (o.visible !== false && o.capa !== 'pared') L.push({ y: o.y, tipo: 'obj', o }); });
    AF.mundo.robots.forEach(r => L.push({ y: r.cogido ? 1e6 : r.y + 0.5, tipo: 'robot', o: r }));
    AF.mundo.cajas.forEach(c => { if (!c.portador && c.visible !== false) L.push({ y: c.y, tipo: 'obj', o: c }); });
    AF.mundo.residuos.forEach(z => { if (z.estado === 'SUELO' || z.estado === 'ASIGNADO') L.push({ y: z.y - 2, tipo: 'obj', o: z }); });
    L.push({ y: H.y0, tipo: 'tabique', a: sy, b: H.y0 });
    L.push({ y: H.y1 - 1, tipo: 'hueco', a: H.y0 + 1, b: H.y1 - 1 });
    L.push({ y: AF.ESCENA.mundo.sueloFin, tipo: 'tabique', a: H.y1, b: AF.ESCENA.mundo.sueloFin });
    if (this.fantasma) L.push({ y: this.fantasma.y, tipo: 'fantasma', o: this.fantasma });
    return L.sort((a, b) => a.y - b.y);
  },

  /* ---------------- FOTOGRAMA ---------------- */
  bucle(ms) {
    const t = ms / 1000, dt = this.ultimo ? Math.min(0.1, t - this.ultimo) : 0.016;
    this.ultimo = t;
    this._fpsAcc += dt; this._fpsN++;
    if (this._fpsAcc > 1) { this.fps = Math.round(this._fpsN / this._fpsAcc); this._fpsAcc = 0; this._fpsN = 0; }
    try {
      AF.sim.paso(dt);
      this.actualizarCamara(dt);
      if (AF.agarre.robot) { AF.agarre.mover({ x: this.raton.x + this.camX, y: this.raton.y }); AF.agarre.paso(dt); }
      this.dibujar(t);
      if (AF.ui && AF.ui.porFotograma) AF.ui.porFotograma(t, dt);
    } catch (e) { console.error(e); }
    // en segundo plano el navegador ya reduce la frecuencia; aquí bajamos a ~20 fps si la calidad es baja
    if (AF.estado.ajustes.calidad === 'baja') setTimeout(() => requestAnimationFrame(x => this.bucle(x)), 33);
    else requestAnimationFrame(x => this.bucle(x));
  },

  actualizarCamara(dt) {
    const M = AF.ESCENA.mundo, V = AF.ESCENA.vista, R = this.raton;
    if (AF.estado.siguiendo) this.camObjetivo = AF.estado.siguiendo.x - V.ancho / 2;
    else if (R.dentro && !this.arrastre) {
      const borde = 18;
      if (R.x < borde) this.camObjetivo -= 240 * dt;
      if (R.x > V.ancho - borde) this.camObjetivo += 240 * dt;
    }
    if (!this.arrastre && Math.abs(this.inercia) > 4) { this.camObjetivo += this.inercia * dt; this.inercia *= Math.exp(-5 * dt); }
    else if (!this.arrastre) this.inercia = 0;
    this.camObjetivo = AF.util.limitar(this.camObjetivo, 0, M.ancho - V.ancho);
    const k = AF.estado.ajustes.movimientoReducido ? 1 : Math.min(1, dt * 8);
    this.camX += (this.camObjetivo - this.camX) * k;
    if (Math.abs(this.camObjetivo - this.camX) < 0.3) this.camX = this.camObjetivo;
  },

  dibujar(t) {
    const g = this.g, V = AF.ESCENA.vista, cam = Math.round(this.camX);
    g.ox = cam; g.oy = 0;
    this.dibujarCielo(t);
    this.bctx.drawImage(this.fondo, cam, 0, V.ancho, V.alto, 0, 0, V.ancho, V.alto);
    this.dibujarLamparas(g, t);
    // capa de pared
    AF.mundo.objetos.forEach(o => { if (o.capa === 'pared' && o.visible !== false) AF.sprites.dibujar(g, o, t); });
    this.dibujarPuestos(g, t);
    // entidades ordenadas
    this.listaDibujo().forEach(d => {
      if (d.tipo === 'robot') AF.personajes.dibujar(g, d.o, t);
      else if (d.tipo === 'tabique') this.dibujarTabique(g, d.a, d.b, t);
      else if (d.tipo === 'hueco') { this.dibujarTabique(g, d.a, d.b, t); this.dibujarPuerta(g, t); }
      else if (d.tipo === 'fantasma') {
        g.alfa(0.6, () => AF.sprites.dibujar(g, d.o, t));
        const o = d.o; if (o.colision) { const R = AF.nav.rectColision(o); g.alfa(0.5, () => g.rect(R.x, R.y, R.w, R.h, o.valido ? AF.TEMA.verde[2] : AF.TEMA.rojo[1])); }
      }
      else AF.sprites.dibujar(g, d.o, t);
    });
    this.dibujarDependencias(g, t);
    this.dibujarLuces(g, t);
    if (AF.estado.ajustes.verNavegacion) this.dibujarNavegacion(g);
    if (this.destello && performance.now() / 1000 < this.destello.hasta) {
      const D = this.destello; g.alfa(0.35, () => g.rect(D.x, D.y, D.w, D.h, AF.TEMA.rojo[1]));
    }
    // viñeta suave en los bordes
    if (AF.estado.ajustes.calidad !== 'baja') {
      const c = this.bctx, grd = c.createRadialGradient(V.ancho / 2, V.alto / 2, V.alto * 0.45, V.ancho / 2, V.alto / 2, V.ancho * 0.62);
      grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(8,4,16,0.45)');
      c.fillStyle = grd; c.fillRect(0, 0, V.ancho, V.alto);
    }
    // ampliar a pantalla
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.bajo, 0, 0, this.lienzo.width, this.lienzo.height);
    this.dibujarTextos(t);
  },

  dibujarNavegacion(g) {
    const N = AF.nav;
    for (let r = 0; r < N.filas; r++) for (let c = 0; c < N.cols; c++) {
      const v = N.bloq[r * N.cols + c], p = N.centro(c, r);
      if (v) g.rect(p.x - 4, p.y - 4, 8, 8, v === 2 ? 'rgba(255,60,60,0.45)' : AF.TEMA.bloqueado);
      else g.px(p.x, p.y, 'rgba(88,224,255,0.5)');
    }
    AF.mundo.robots.forEach(r => {
      let px = r.x, py = r.y;
      (r.camino || []).forEach(cl => { const p = N.centro(cl.c, cl.r); g.linea(px, py, p.x, p.y, AF.TEMA.ruta); px = p.x; py = p.y; });
    });
  },

  /* ---------------- TEXTOS (capa 07, a resolución de pantalla) ---------------- */
  dibujarTextos(t) {
    const ctx = this.ctx, s = this.escala, A = AF.estado.ajustes;
    const ahora = performance.now() / 1000;
    const tam = Math.max(14, Math.round(8.5 * s * A.tamTexto));
    ctx.font = tam + 'px VT323, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const cajas = [];
    const W = this.lienzo.width;
    if (A.subtitulos) AF.mundo.robots.forEach(r => {
      if (!r.habla) return;
      if (ahora > r.habla.hasta) { r.habla = null; return; }
      const rx = r.x - this.camX;
      if (rx < -6 || rx > AF.ESCENA.vista.ancho + 6) return;      // fuera de cámara: no se muestra
      const txt = (r.habla.ambiental ? '~ ' : '') + r.habla.texto;
      const lineas = this.partir(ctx, txt, Math.min(W * 0.42, tam * 16));
      const ancho = Math.max(...lineas.map(l => ctx.measureText(l).width));
      let cx = (r.x - this.camX) * s, by = (r.y - 33) * s;
      cx = AF.util.limitar(cx, ancho / 2 + 6, W - ancho / 2 - 6);
      let caja = { x: cx - ancho / 2, y: by - lineas.length * tam, w: ancho, h: lineas.length * tam };
      // evitar solapes con otros textos
      for (let k = 0; k < 6; k++) {
        const choque = cajas.find(b => caja.x < b.x + b.w && caja.x + caja.w > b.x && caja.y < b.y + b.h && caja.y + caja.h > b.y);
        if (!choque) break;
        caja.y = choque.y - caja.h - 2; by = caja.y + caja.h;
      }
      if (caja.y < 2) { by += 2 - caja.y; caja.y = 2; }
      cajas.push(caja);
      const color = r.cfg.voz;
      ctx.globalAlpha = r.habla.ambiental ? 0.82 : 1;
      lineas.forEach((l, i) => this.textoContorno(ctx, l, cx, by - (lineas.length - 1 - i) * tam, color, Math.max(2, s * 0.7)));
      ctx.globalAlpha = 1;
    });
    // narrador (resultado de MIRAR y avisos)
    if (this.narrador && ahora < this.narrador.hasta) {
      const lineas = this.partir(ctx, this.narrador.texto, W * 0.8);
      lineas.forEach((l, i) => this.textoContorno(ctx, l, W / 2, tam * (i + 1) + 6, this.narrador.color || '#ffffff', Math.max(2, s * 0.7)));
    }
    // insignia DEMO
    ctx.font = Math.round(tam * 0.75) + 'px VT323, monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    this.textoContorno(ctx, 'SIMULACIÓN DEMO · sin conexión con el motor real', W - 8, this.lienzo.height - 6 * s / 2, 'rgba(255,224,120,0.85)', 2);
    ctx.textAlign = 'center';
  },

  textoContorno(ctx, txt, x, y, color, grosor) {
    ctx.fillStyle = '#000';
    const o = Math.round(grosor);
    for (let dx = -o; dx <= o; dx += o) for (let dy = -o; dy <= o; dy += o) if (dx || dy) ctx.fillText(txt, x + dx, y + dy);
    ctx.fillStyle = color; ctx.fillText(txt, x, y);
  },
  partir(ctx, txt, max) {
    const pal = String(txt).split(' '), out = []; let l = '';
    pal.forEach(p => { const prueba = l ? l + ' ' + p : p; if (ctx.measureText(prueba).width > max && l) { out.push(l); l = p; } else l = prueba; });
    if (l) out.push(l);
    return out;
  },

  narrar(texto, color, segundos) {
    this.narrador = { texto, color, hasta: performance.now() / 1000 + (segundos || Math.min(8, 2.5 + texto.length * 0.05)) };
  },
  avisoZona(x, y, w, h) { this.destello = { x, y, w, h, hasta: performance.now() / 1000 + 0.8 }; },

  /* ---------------- RATÓN Y SELECCIÓN ---------------- */
  aMundo(ev) {
    const r = this.lienzo.getBoundingClientRect();
    const sx = (ev.clientX - r.left) / r.width * AF.ESCENA.vista.ancho, sy = (ev.clientY - r.top) / r.height * AF.ESCENA.vista.alto;
    return { sx, sy, x: sx + this.camX, y: sy };
  },

  instalarRaton() {
    const L = this.lienzo;
    window.addEventListener('mousemove', ev => {
      if (!this.pulsado && !this.arrastre && !AF.agarre.robot) return;
      const p = this.aMundo(ev);
      Object.assign(this.raton, { x: p.sx, y: p.sy, mx: p.x, my: p.y });
      const P = this.pulsado;
      if (P && !P.movido && Math.hypot(ev.clientX - P.cx, ev.clientY - P.cy) > 6) {
        P.movido = true;
        if (P.el && P.el.tipo === 'robot' && !AF.ui.moviendo && !AF.ui.dialogo) AF.agarre.empezar(P.el, 'arrastre');
        else this.arrastre = { x: P.sx, cam: this.camX, ult: p.sx, t: performance.now() };
      }
      if (this.arrastre) {
        this.camObjetivo = this.arrastre.cam - (p.sx - this.arrastre.x);
        const ahora = performance.now(), dtm = Math.max(1, ahora - this.arrastre.t) / 1000;
        this.inercia = AF.util.limitar(-(p.sx - this.arrastre.ult) / dtm, -900, 900);
        this.arrastre.ult = p.sx; this.arrastre.t = ahora;
        AF.estado.siguiendo = null;
      }
    });
    L.addEventListener('mousemove', ev => {
      const p = this.aMundo(ev);
      Object.assign(this.raton, { x: p.sx, y: p.sy, mx: p.x, my: p.y, dentro: true });
      AF.estado.hover = this.elementoEn(p.x, p.y);
      if (AF.ui) AF.ui.alMoverRaton(p);
    });
    L.addEventListener('mouseleave', () => { this.raton.dentro = false; AF.estado.hover = null; if (AF.ui) AF.ui.actualizarFrase(); });
    L.addEventListener('mousedown', ev => {
      const p = this.aMundo(ev);
      if (ev.button === 1 || (ev.button === 0 && ev.shiftKey)) { ev.preventDefault(); this.arrastre = { x: p.sx, cam: this.camX, ult: p.sx, t: performance.now() }; this.pulsado = { cx: ev.clientX, cy: ev.clientY, sx: p.sx, movido: true }; return; }
      if (ev.button === 0) { ev.preventDefault(); this.pulsado = { cx: ev.clientX, cy: ev.clientY, sx: p.sx, el: this.elementoEn(p.x, p.y), movido: false }; this.inercia = 0; }
    });
    window.addEventListener('mouseup', () => {
      if (AF.agarre.robot && AF.agarre.modo === 'arrastre') AF.agarre.soltar();
      if (this.arrastre && performance.now() - this.arrastre.t > 90) this.inercia = 0;   // soltado quieto: sin inercia
      this.arrastre = null;
      this._sinClic = this.pulsado && this.pulsado.movido;
      this.pulsado = null;
    });
    L.addEventListener('click', ev => {
      if (this._sinClic) { this._sinClic = false; return; }      // fue un arrastre, no un clic
      const p = this.aMundo(ev);
      if (AF.agarre.robot && AF.agarre.modo === 'clic') { AF.agarre.mover(p); AF.agarre.soltar(); AF.ui.refrescar(); return; }
      AF.ui.alHacerClic(this.elementoEn(p.x, p.y), p, ev);
    });
    L.addEventListener('contextmenu', ev => { ev.preventDefault(); const p = this.aMundo(ev); AF.ui.alHacerClic(this.elementoEn(p.x, p.y), p, ev, 'mirar'); });
    L.addEventListener('wheel', ev => { ev.preventDefault(); AF.estado.siguiendo = null; this.camObjetivo += (ev.deltaY + ev.deltaX) * 0.4; }, { passive: false });
  },

  // elemento bajo el cursor: de delante hacia atrás
  elementoEn(x, y) {
    const lista = this.listaDibujo().reverse();
    for (const d of lista) {
      if (d.tipo === 'robot') { const r = d.o; if (r.cogido) continue; if (x > r.x - 8 && x < r.x + 8 && y > r.y - 30 && y < r.y + 2) return r; }
      else if (d.tipo === 'hueco') {
        const tab = AF.ESCENA.tabique, H = tab.hueco, hp = tab.altoPuerta || 42;
        for (let yy = H.y0; yy <= H.y1; yy += 2) {
          const wx = this.tabX(yy);
          if (x > wx - 3 && x < wx + tab.grosor + 3 && y > yy - hp - 6 && y < yy + 1) return AF.mundo.puerta;
        }
      } else if (d.tipo === 'obj') {
        const o = d.o;
        if (o.tipo === 'residuo') { if (Math.abs(x - o.x) < 6 && y > o.y - 8 && y < o.y + 3) return o; continue; }
        if (o.tipo === 'caja') { if (Math.abs(x - o.x) < 7 && y > o.y - 11 && y < o.y + 2) return o; continue; }
        if (this.dentroCaja(o, x, y)) return o;
      }
    }
    for (const o of AF.mundo.objetos) if (o.capa === 'pared' && o.visible !== false && o.caja && o.caja.h > 2 && this.dentroCaja(o, x, y)) return o;
    return null;
  },
  dentroCaja(o, x, y) { const c = o.caja; return c && x > o.x - c.w / 2 && x < o.x + c.w / 2 && y > o.y - c.h && y < o.y + 2; }
};
