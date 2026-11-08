/* =====================================================================
   AUTOFABRICADOR · BIBLIOTECA DE SPRITES
   ---------------------------------------------------------------------
   Cada pieza de la escena es una función de dibujo registrada con un id
   ("asset"). Para cambiar el aspecto de algo:
     1) Modifica su función aquí, o
     2) Registra una nueva con AF.sprites.registrar('mi-asset', fn)
        y cambia el "asset" del objeto en config/escena.js.
   Firma:  fn(g, o, t)
     g = pincel (AF.Pincel)   o = objeto (x, y = punto de apoyo)
     t = tiempo en segundos   o.activa = la estación está trabajando
   ===================================================================== */
window.AF = window.AF || {};

AF.sprites = {
  lista: {},
  registrar(id, fn) { this.lista[id] = fn; },
  dibujar(g, o, t) {
    const fn = this.lista[o.asset];
    if (fn) fn(g, o, t);
    else { // pieza sin dibujo: marcador visible para no perderla
      g.caja(o.x - 8, o.y - 16, 16, 16, '#ff00ff');
      g.texto('?', o.x, o.y - 12, '#000', { centro: true });
    }
  }
};

(function () {
  const T = AF.TEMA;
  const S = AF.sprites;
  const lento = () => AF.estado.ajustes.movimientoReducido;

  /* ------------------------------------------------------------------
     RÓTULO de madera colgado con cadenas
     ------------------------------------------------------------------ */
  S.registrar('rotulo', (g, o, t) => {
    const p = o.props || {};
    if (p.robot && AF.mundo.robot) {         // cartel de un agente: su nombre en su color
      const r = AF.mundo.robot(p.robot);
      if (r) return S.lista['rotulo-agente'](g, o, t, r);
    }
    const w = Math.max(AF.anchoTexto(p.texto || '') , AF.anchoTexto(p.sub || '')) + 14;
    const h = p.sub ? 21 : 13;
    const x0 = Math.round(o.x - w / 2), y0 = o.y - h;
    // cadenas
    for (let j = y0 - 8; j < y0; j += 2) { g.px(x0 + 5, j, T.metal[2]); g.px(x0 + w - 6, j, T.metal[2]); g.px(x0 + 5, j + 1, T.metal[0]); g.px(x0 + w - 6, j + 1, T.metal[0]); }
    // placa
    g.caja(x0, y0, w, h, T.madera[2]);
    g.rect(x0 + 1, y0 + 1, w - 2, 1, T.laton[1]);
    g.rect(x0 + 1, y0 + h - 2, w - 2, 1, T.laton[2]);
    g.rect(x0 + 1, y0 + 1, 1, h - 2, T.laton[1]);
    g.rect(x0 + w - 2, y0 + 1, 1, h - 2, T.laton[2]);
    g.rect(x0 + 2, y0 + 2, w - 4, h - 4, '#3a2010');
    g.trama(x0 + 2, y0 + 2, w - 4, h - 4, '#442614');
    g.px(x0 + 3, y0 + 3, T.laton[3]); g.px(x0 + w - 4, y0 + 3, T.laton[3]);
    g.texto(p.texto || '', o.x, y0 + 3, T.laton[3], { centro: true, sombra: '#1a0c04' });
    if (p.sub) g.texto(p.sub, o.x, y0 + 12, T.papel[1], { centro: true, sombra: '#1a0c04' });
  });

  /* ------------------------------------------------------------------
     1 · MOSTRADOR DE RECEPCIÓN (Intake)
     ------------------------------------------------------------------ */
  S.registrar('mostrador-recepcion', (g, o, t) => {
    const x0 = o.x - 50, y = o.y;
    // casillero de encargos en la pared
    g.caja(x0 + 6, y - 70, 52, 36, T.madera[2]);
    g.rect(x0 + 6, y - 70, 52, 2, T.madera[1]);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const cx = x0 + 8 + c * 12.5, cy = y - 67 + r * 11;
      g.rect(cx, cy, 11, 9, '#22140a');
      if ((r * 4 + c) % 3 !== 1) { g.rect(cx + 1, cy + 3, 9, 6, T.papel[1]); g.rect(cx + 2, cy + 2, 7, 2, T.papel[0]); }
      if ((r * 4 + c) % 5 === 0) g.rect(cx + 6, cy + 1, 3, 7, T.rojo[1]);
    }
    // tubo neumático de latón (a la derecha del mostrador)
    const tx = x0 + 106;
    g.rect(tx - 3, 0, 7, y - 52, T.contorno);
    g.rect(tx - 2, 0, 5, y - 52, T.laton[0]); g.rect(tx - 1, 0, 1, y - 52, T.laton[3]);
    for (let j = 8; j < y - 54; j += 14) { g.rect(tx - 3, j, 7, 2, T.laton[2]); }
    // receptor del tubo
    g.caja(tx - 9, y - 54, 19, 16, T.laton[2]);
    g.rect(tx - 7, y - 52, 15, 11, '#1a2a30');
    g.rect(tx - 6, y - 51, 2, 9, 'rgba(255,255,255,0.25)');
    const tubo = o.tubo || 0;      // animación de cápsula entrante (0..1)
    if (tubo > 0) {
      const cy = (y - 50) - (1 - tubo) * 30;
      g.redondo(tx - 3, cy, 7, 6, T.laton[3]);
      g.rect(tx - 2, cy + 2, 5, 1, T.rojo[1]);
    }
    g.px(tx + 7, y - 44, (Math.floor(t * 2) % 2 && o.activa) ? T.verde[3] : T.verde[0]);
    // mostrador
    g.caja(x0, y - 26, 100, 26, T.madera[1]);
    g.rect(x0 - 2, y - 31, 104, 6, T.contorno);
    g.rect(x0 - 1, y - 30, 102, 4, T.madera[3]);
    g.rect(x0 - 1, y - 30, 102, 1, '#e0b070');
    for (let i = 0; i < 3; i++) {
      const px = x0 + 5 + i * 32;
      g.rect(px, y - 22, 28, 17, T.madera[2]);
      g.rect(px + 1, y - 21, 26, 15, T.madera[0]);
      g.rect(px + 1, y - 21, 26, 1, T.madera[2]);
    }
    g.rect(x0, y - 3, 100, 3, T.madera[2]);
    // placa de latón
    g.rect(x0 + 40, y - 18, 20, 7, T.laton[2]); g.rect(x0 + 41, y - 17, 18, 5, T.laton[1]);
    g.rect(x0 + 43, y - 15, 14, 1, T.laton[2]);
    // objetos sobre el mostrador
    for (let k = 0; k < 4; k++) g.rect(x0 + 8 + (k % 2), y - 33 - k * 2, 14, 2, k % 2 ? T.papel[1] : T.papel[0]);
    g.caja(x0 + 26, y - 35, 16, 4, T.metal[0]);                    // bandeja
    g.rect(x0 + 28, y - 37, 12, 2, T.papel[0]);
    // lámpara de banquero
    g.rect(x0 + 52, y - 40, 2, 9, T.laton[0]);
    g.rect(x0 + 48, y - 34, 10, 2, T.laton[2]);
    g.caja(x0 + 46, y - 44, 14, 4, T.verde[0]);
    g.rect(x0 + 47, y - 44, 12, 1, T.verde[2]);
    g.alfa(0.25, () => g.rect(x0 + 44, y - 40, 18, 9, '#fff2b0'));
    // monitor pequeño
    g.caja(x0 + 68, y - 48, 22, 16, '#d8ccb0');
    g.rect(x0 + 70, y - 46, 18, 11, '#0a1e24');
    for (let l = 0; l < 4; l++) {
      const lw = 4 + ((l * 7 + Math.floor(t * (o.activa ? 3 : 0.5))) % 11);
      g.rect(x0 + 72, y - 44 + l * 2.5, lw, 1, T.cian[0]);
    }
    g.rect(x0 + 75, y - 32, 8, 2, '#b0a488');
  });

  /* ------------------------------------------------------------------
     2 · TANQUE DE IA CENTRAL con cerebro brillante
     ------------------------------------------------------------------ */
  S.registrar('tanque-ia', (g, o, t) => {
    const x = o.x, y = o.y;
    const pulso = lento() ? 0.5 : (Math.sin(t * (o.activa ? 5 : 2)) + 1) / 2;
    // tuberías al techo
    const tuboY = 26;   // las tuberías salen por detrás del rótulo
    [-16, 16].forEach(dx => {
      g.rect(x + dx - 3, tuboY, 6, y - 104 - tuboY, T.contorno);
      g.rect(x + dx - 2, tuboY, 4, y - 104 - tuboY, T.metal[0]);
      g.rect(x + dx - 1, tuboY, 1, y - 104 - tuboY, T.metal[1]);
    });
    // brillo en el suelo y la pared
    g.alfa(0.10 + pulso * 0.12, () => { g.elipse(x, y - 56, 46, 50, T.cian[0]); });
    // tapa superior
    g.caja(x - 30, y - 104, 60, 10, T.metal[0]);
    g.rect(x - 30, y - 104, 60, 2, T.metal[1]);
    g.rect(x - 26, y - 98, 52, 2, T.metal[2]);
    for (let i = -24; i <= 24; i += 8) g.px(x + i, y - 101, T.remache);
    // cilindro de cristal
    g.rect(x - 26, y - 94, 52, 70, T.contorno);
    g.rect(x - 25, y - 94, 50, 70, '#0a2a3a');
    g.trama(x - 25, y - 94, 50, 70, '#0e3448');
    g.alfa(0.25 + pulso * 0.2, () => g.elipse(x, y - 60, 22, 24, T.cian[1]));
    // burbujas
    if (!lento()) for (let b = 0; b < 7; b++) {
      const by = y - 26 - ((t * 14 + b * 11) % 66);
      const bx = x - 18 + ((b * 13) % 36) + Math.round(Math.sin(t * 3 + b));
      g.px(bx, by, T.cian[2]);
    }
    // cerebro
    const bx = x, by = y - 62;
    g.elipse(bx, by, 17, 12, T.contorno);
    g.elipse(bx, by, 16, 11, T.cian[1]);
    g.elipse(bx - 1, by - 2, 13, 8, T.cian[0]);
    g.alfa(0.6 + pulso * 0.4, () => g.elipse(bx - 3, by - 4, 7, 4, T.cian[2]));
    g.rect(bx, by - 10, 1, 21, T.cian[1]);   // hemisferios
    const giros = [[-12, -3, 5], [-9, 2, 6], [-13, 4, 3], [3, -5, 6], [5, 1, 7], [9, -1, 4], [-6, -7, 4], [4, 6, 5], [-5, 7, 4]];
    giros.forEach(([dx, dy, w]) => { g.rect(bx + dx, by + dy, w, 1, '#1a7090'); g.px(bx + dx + w, by + dy - 1, '#1a7090'); });
    g.rect(bx - 2, by + 11, 4, 8, T.cian[1]);  // tallo
    // reflejos del cristal
    g.rect(x - 21, y - 92, 2, 66, 'rgba(200,250,255,0.35)');
    g.rect(x - 17, y - 92, 1, 66, 'rgba(200,250,255,0.18)');
    g.rect(x + 18, y - 92, 1, 66, 'rgba(200,250,255,0.15)');
    // aros de latón
    [y - 94, y - 60, y - 26].forEach(ay => { g.rect(x - 27, ay, 54, 2, T.laton[2]); g.rect(x - 27, ay, 54, 1, T.laton[1]); });
    // pedestal
    g.caja(x - 36, y - 24, 72, 24, T.metal[2]);
    g.rect(x - 36, y - 24, 72, 3, T.metal[0]);
    g.rect(x - 34, y - 19, 68, 10, '#20262e');
    for (let i = 0; i < 8; i++) {
      const on = o.activa ? (Math.floor(t * 6 + i) % 3 !== 0) : (i % 3 === 0);
      g.rect(x - 30 + i * 8, y - 16, 4, 3, on ? [T.cian[0], T.verde[2], T.naranja[1]][i % 3] : '#2c343e');
    }
    g.rect(x - 36, y - 6, 72, 2, T.metal[0]);
    g.rect(x - 34, y - 3, 6, 3, T.contorno); g.rect(x + 28, y - 3, 6, 3, T.contorno);
    // monitores laterales
    [[-46, 'onda'], [46, 'barras']].forEach(([dx, tipo]) => {
      const mx = x + dx;
      g.rect(mx - 1, y - 40, 3, 16, T.metal[2]);
      g.caja(mx - 9, y - 58, 19, 16, T.metal[0]);
      g.rect(mx - 7, y - 56, 15, 12, '#06202a');
      if (tipo === 'onda') {
        for (let i = 0; i < 15; i++) g.px(mx - 7 + i, y - 50 + Math.round(Math.sin(i * 0.9 + t * 4) * 3), T.verde[2]);
      } else {
        for (let i = 0; i < 4; i++) {
          const h = 2 + Math.round((Math.sin(t * 2 + i * 1.7) + 1) * 4 * (o.activa ? 1 : 0.4));
          g.rect(mx - 6 + i * 4, y - 45 - h, 3, h, T.cian[0]);
        }
      }
    });
  });

  /* ------------------------------------------------------------------
     3 · TERMINALES DE PROGRAMACIÓN
     ------------------------------------------------------------------ */
  S.registrar('terminales-codigo', (g, o, t) => {
    const x0 = o.x - 52, y = o.y;
    // armario de servidores a la derecha
    g.caja(x0 + 90, y - 66, 16, 66, '#2a2e36');
    g.rect(x0 + 90, y - 66, 16, 2, T.metal[0]);
    for (let i = 0; i < 9; i++) {
      g.rect(x0 + 92, y - 61 + i * 6, 12, 4, '#1a1e24');
      g.px(x0 + 93, y - 60 + i * 6, (Math.floor(t * 4 + i * 3) % 4) ? T.verde[2] : '#204020');
      g.px(x0 + 95, y - 60 + i * 6, (Math.floor(t * 3 + i) % 5) === 0 ? T.naranja[1] : '#402810');
    }
    // mesa
    g.caja(x0, y - 24, 88, 4, T.madera[1]);
    g.rect(x0, y - 24, 88, 1, T.madera[3]);
    g.rect(x0 + 3, y - 20, 4, 20, T.madera[2]);
    g.rect(x0 + 81, y - 20, 4, 20, T.madera[2]);
    g.rect(x0 + 3, y - 8, 82, 2, T.madera[2]);
    // torre bajo la mesa
    g.caja(x0 + 60, y - 18, 14, 18, '#cfc4a6');
    g.rect(x0 + 62, y - 15, 10, 2, '#9a9078');
    g.px(x0 + 63, y - 11, o.activa && Math.floor(t * 8) % 2 ? T.rojo[1] : T.verde[1]);
    // dos monitores CRT
    [6, 44].forEach((dx, n) => {
      const mx = x0 + dx;
      g.caja(mx, y - 54, 34, 28, '#d8ccae');
      g.rect(mx, y - 54, 34, 2, '#ece2c8');
      g.rect(mx + 2, y - 28, 30, 2, '#b8ac90');
      g.caja(mx + 12, y - 26, 10, 2, '#a89c80');
      g.rect(mx + 3, y - 51, 28, 21, T.pantalla[0]);
      // glow
      g.alfa(0.18, () => g.rect(mx - 4, y - 56, 42, 34, T.pantalla[1]));
      // líneas de código que avanzan
      const vel = o.activa ? 6 : 0.4;
      for (let l = 0; l < 6; l++) {
        const sem = (l + Math.floor(t * vel) + n * 3);
        const ind = (sem % 4) * 2, lw = 4 + (sem * 7 % 15);
        g.rect(mx + 5 + ind, y - 49 + l * 3, Math.min(lw, 24 - ind), 1, l % 3 === 0 ? T.pantalla[2] : T.pantalla[1]);
      }
      if (Math.floor(t * 2) % 2) g.rect(mx + 5, y - 49 + 18, 3, 1, T.pantalla[2]);
      g.rect(mx + 4, y - 50, 1, 19, 'rgba(255,255,255,0.10)');
    });
    // teclados
    g.caja(x0 + 10, y - 27, 24, 2, '#bfb498');
    g.caja(x0 + 48, y - 27, 24, 2, '#bfb498');
    // taza y post-its
    g.rect(x0 + 37, y - 30, 4, 5, T.papel[0]); g.px(x0 + 41, y - 29, T.papel[0]);
    g.rect(x0 + 8, y - 53, 4, 4, '#f8e060'); g.rect(x0 + 72, y - 50, 4, 4, '#f8a0c0');
  });

  /* ------------------------------------------------------------------
     4 · LABORATORIO DE PRUEBAS
     ------------------------------------------------------------------ */
  S.registrar('laboratorio-quimico', (g, o, t) => {
    const x0 = o.x - 52, y = o.y;
    // estante de pared con frascos
    g.caja(x0 + 4, y - 58, 60, 3, T.madera[1]);
    g.rect(x0 + 8, y - 55, 2, 5, T.madera[2]); g.rect(x0 + 58, y - 55, 2, 5, T.madera[2]);
    const frascos = [T.morado[1], T.verde[2], T.rosa[0], T.cian[0], T.naranja[1], T.morado[2]];
    frascos.forEach((c, i) => {
      const fx = x0 + 8 + i * 9;
      g.caja(fx, y - 67, 6, 8, '#9ab0b8');
      g.rect(fx, y - 63, 6, 4, c);
      g.rect(fx + 1, y - 69, 4, 2, T.madera[2]);
    });
    // bobina tesla
    const tx = x0 + 96;
    g.caja(tx - 4, y - 46, 8, 46, T.metal[2]);
    for (let j = y - 44; j < y - 8; j += 3) g.rect(tx - 3, j, 6, 1, T.laton[1]);
    g.elipse(tx, y - 50, 6, 4, T.contorno); g.elipse(tx, y - 50, 5, 3, T.metal[1]);
    if (o.activa && !lento() && Math.floor(t * 10) % 3 === 0) {
      let lx = tx, ly = y - 52;
      for (let k = 0; k < 6; k++) { const nx = lx + AF.util.entero(-4, 4), ny = ly - 3; g.linea(lx, ly, nx, ny, T.morado[2]); lx = nx; ly = ny; }
    }
    // mesa
    g.caja(x0, y - 22, 86, 4, T.metal[0]);
    g.rect(x0, y - 22, 86, 1, T.metal[3]);
    g.rect(x0 + 3, y - 18, 3, 18, T.metal[2]); g.rect(x0 + 80, y - 18, 3, 18, T.metal[2]);
    g.rect(x0 + 3, y - 6, 80, 2, T.metal[2]);
    // armario bajo mesa
    g.caja(x0 + 10, y - 17, 26, 13, T.madera[1]);
    g.rect(x0 + 22, y - 12, 2, 2, T.laton[1]);
    // matraces burbujeantes
    const liquidos = [[x0 + 10, T.rosa[0], 10], [x0 + 26, T.morado[1], 8], [x0 + 40, T.verde[2], 12]];
    liquidos.forEach(([mx, c, h], i) => {
      g.rect(mx + 3, y - 23 - h - 6, 4, 6, '#b8d0d8');
      g.elipse(mx + 5, y - 23 - h / 2, 6, h / 2, T.contorno);
      g.elipse(mx + 5, y - 23 - h / 2, 5, h / 2 - 1, '#c8e0e8');
      g.elipse(mx + 5, y - 24 - h / 4 + 1, 5, Math.max(1, h / 4), c);
      g.px(mx + 2, y - 23 - h + 2, '#ffffff');
      g.alfa(0.25, () => g.elipse(mx + 5, y - 24 - h / 4, 8, 6, c));
      if (!lento() && (o.activa || i === 0)) for (let b = 0; b < 3; b++) {
        const by = y - 30 - h - ((t * 10 + b * 5 + i * 3) % 14);
        g.px(mx + 4 + ((b + i) % 3), by, c);
      }
    });
    // monitor con resultado
    const mx = x0 + 54;
    g.caja(mx, y - 46, 26, 20, '#3a424e');
    g.rect(mx + 2, y - 44, 22, 15, '#101820');
    const r = o.resultado;   // 'ok' | 'fallo' | null
    if (o.activa) {
      for (let i = 0; i < 5; i++) g.rect(mx + 4, y - 42 + i * 3, ((Math.floor(t * 5) + i * 3) % 18) + 1, 1, T.cian[0]);
    } else if (r === 'ok') {
      g.linea(mx + 7, y - 37, mx + 11, y - 33, T.verde[2]); g.linea(mx + 11, y - 33, mx + 19, y - 41, T.verde[2]);
      g.linea(mx + 7, y - 36, mx + 11, y - 32, T.verde[2]); g.linea(mx + 11, y - 32, mx + 19, y - 40, T.verde[2]);
    } else if (r === 'fallo') {
      g.linea(mx + 8, y - 41, mx + 18, y - 32, T.rojo[1]); g.linea(mx + 18, y - 41, mx + 8, y - 32, T.rojo[1]);
    } else {
      g.texto('WASI', mx + 13, y - 40, T.cian[1], { centro: true });
    }
    g.rect(mx + 11, y - 26, 4, 4, '#3a424e');
  });

  /* ------------------------------------------------------------------
     5 · CONSOLA DE VALIDACIÓN
     ------------------------------------------------------------------ */
  S.registrar('consola-validacion', (g, o, t) => {
    const x0 = o.x - 48, y = o.y;
    // gran monitor
    g.alfa(0.14, () => g.rect(x0 + 6, y - 74, 64, 52, T.verde[2]));
    g.caja(x0 + 10, y - 70, 56, 42, '#2c3a30');
    g.rect(x0 + 10, y - 70, 56, 2, '#44584a');
    g.rect(x0 + 13, y - 67, 50, 34, '#06200e');
    g.trama(x0 + 13, y - 67, 50, 34, '#0a2a14', Math.floor(t * 4) % 2);
    const r = o.resultado;
    if (o.activa) {
      const sy = y - 66 + ((t * 20) % 32);
      g.rect(x0 + 14, sy, 48, 1, T.verde[3]);
      g.texto('SHA', x0 + 38, y - 62, T.verde[2], { centro: true });
      for (let i = 0; i < 3; i++) g.rect(x0 + 18, y - 52 + i * 5, 6 + ((Math.floor(t * 4) + i * 5) % 30), 2, T.verde[1]);
    } else if (r === 'ok' || r == null) {
      const c = r === 'ok' ? T.verde[3] : T.verde[1];
      for (let k = 0; k < 3; k++) { g.linea(x0 + 24, y - 51 + k, x0 + 33, y - 42 + k, c); g.linea(x0 + 33, y - 42 + k, x0 + 52, y - 61 + k, c); }
    }
    g.rect(x0 + 15, y - 66, 1, 32, 'rgba(255,255,255,0.12)');
    g.rect(x0 + 34, y - 28, 8, 6, '#2c3a30');
    // escritorio
    g.caja(x0, y - 22, 80, 4, '#3a4a40');
    g.rect(x0, y - 22, 80, 1, '#5a7060');
    g.rect(x0 + 2, y - 18, 30, 18, '#2c3a30');
    for (let i = 0; i < 3; i++) g.rect(x0 + 4, y - 16 + i * 6, 26, 4, '#34463a');
    g.rect(x0 + 74, y - 18, 4, 18, '#2c3a30');
    // impresora de recibos
    g.caja(x0 + 62, y - 30, 14, 8, '#cfc4a6');
    const papel = o.activa ? 4 + Math.floor((t * 4) % 8) : 3;
    g.rect(x0 + 65, y - 30 - papel, 8, papel, T.papel[0]);
    for (let i = 0; i < papel; i += 2) g.rect(x0 + 66, y - 29 - papel + i, 5, 1, '#a0a0a0');
    // sello
    g.rect(x0 + 50, y - 28, 6, 4, T.madera[1]); g.rect(x0 + 49, y - 25, 8, 2, T.rojo[0]);
    // teclado
    g.caja(x0 + 22, y - 25, 24, 2, '#8a9a8a');
  });

  /* ------------------------------------------------------------------
     6 · CINTA DE EMPAQUETADO con brazo robótico
     ------------------------------------------------------------------ */
  S.registrar('cinta-entrega', (g, o, t) => {
    const x = o.x, y = o.y, x0 = x - 72;
    // trampilla de salida en la pared
    g.caja(x + 50, y - 50, 22, 30, '#1a1210');
    for (let i = 0; i < 5; i++) g.rect(x + 51, y - 49 + i * 6, 20, 4, i % 2 ? '#3a2a20' : '#2e2018');
    g.rect(x + 49, y - 53, 24, 3, T.peligro[0]);
    for (let i = 0; i < 24; i += 4) g.rect(x + 49 + i, y - 53, 2, 3, T.peligro[1]);
    g.texto('ZIP', x + 61, y - 62, T.laton[3], { centro: true, sombra: '#000' });
    // estructura de la cinta
    g.caja(x0, y - 24, 136, 8, '#2a2a30');
    const fase = lento() ? 0 : Math.floor(t * (o.activa ? 16 : 0)) % 6;
    for (let i = 0; i < 136; i += 6) g.rect(x0 + i + (5 - fase), y - 23, 2, 6, '#45454e');
    g.rect(x0, y - 24, 136, 1, T.metal[1]);
    for (let i = 4; i < 136; i += 16) { g.rect(x0 + i, y - 16, 3, 16, T.metal[2]); g.px(x0 + i + 1, y - 15, T.metal[1]); }
    g.rect(x0, y - 4, 136, 2, T.metal[2]);
    // paquetes en la cinta (anim)
    const desp = lento() ? 0 : (o.activa ? (t * 12) % 40 : 0);
    [10, 50, 90].forEach(px => {
      const bx = x0 + ((px + desp) % 126);
      g.caja(bx, y - 32, 10, 8, T.madera[1]);
      g.rect(bx, y - 32, 10, 1, T.madera[3]);
      g.rect(bx + 4, y - 32, 2, 8, T.laton[1]);
    });
    // brazo robótico amarillo
    const bx = x + 36, ang = o.activa && !lento() ? Math.sin(t * 3) * 0.6 : 0.2;
    g.caja(bx - 7, y - 30, 14, 6, '#e0a020');
    g.rect(bx - 7, y - 30, 14, 1, '#ffd060');
    const ex = bx + Math.sin(ang) * 18, ey = y - 30 - Math.cos(ang) * 18;
    for (let k = 0; k <= 6; k++) { const ix = bx + (ex - bx) * k / 6, iy = y - 30 + (ey - y + 30) * k / 6; g.rect(ix - 2, iy - 2, 5, 5, T.contorno); }
    for (let k = 0; k <= 6; k++) { const ix = bx + (ex - bx) * k / 6, iy = y - 30 + (ey - y + 30) * k / 6; g.rect(ix - 1, iy - 1, 3, 3, '#f0b030'); }
    g.elipse(ex, ey, 3, 3, T.contorno); g.elipse(ex, ey, 2, 2, T.metal[1]);
    const hx = ex - 12, hy = ey + 4;
    for (let k = 0; k <= 6; k++) { const ix = ex + (hx - ex) * k / 6, iy = ey + (hy - ey) * k / 6; g.rect(ix - 1, iy - 1, 3, 3, '#f0b030'); }
    g.rect(hx - 3, hy, 2, 4, T.metal[2]); g.rect(hx + 1, hy, 2, 4, T.metal[2]);
    g.px(bx, y - 28, Math.floor(t * 2) % 2 ? T.rojo[1] : T.rojo[2]);
    // pila de paquetes terminados
    g.caja(x0 - 2, y - 38, 12, 10, T.madera[1]); g.rect(x0 + 3, y - 38, 2, 10, T.laton[1]);
    g.caja(x0 + 4, y - 48, 10, 9, T.madera[0]); g.rect(x0 + 8, y - 48, 2, 9, T.laton[1]);
  });

  /* ------------------------------------------------------------------
     PARED: reloj, cartel, tablón, estantería, hiedra
     ------------------------------------------------------------------ */
  S.registrar('reloj-pared', (g, o) => {
    const cx = o.x, cy = o.y - 9;
    g.elipse(cx, cy, 9, 9, T.contorno); g.elipse(cx, cy, 8, 8, T.laton[2]); g.elipse(cx, cy, 6, 6, T.papel[0]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.px(cx + Math.round(Math.sin(a) * 5), cy - Math.round(Math.cos(a) * 5), '#806040'); }
    const d = new Date(), h = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * Math.PI * 2, m = d.getMinutes() / 60 * Math.PI * 2;
    g.linea(cx, cy, cx + Math.sin(h) * 3, cy - Math.cos(h) * 3, T.contorno);
    g.linea(cx, cy, cx + Math.sin(m) * 5, cy - Math.cos(m) * 5, T.rojo[0]);
  });

  S.registrar('cartel', (g, o) => {
    const lineas = (o.props && o.props.lineas) || [];
    const w = Math.max(20, ...lineas.map(l => AF.anchoTexto(l))) + 8, h = lineas.length * 9 + 6;
    const x0 = Math.round(o.x - w / 2), y0 = o.y - h;
    g.caja(x0, y0, w, h, T.papel[0]);
    g.rect(x0 + w - 4, y0 + h - 4, 4, 4, T.papel[1]);
    g.px(x0 + w / 2, y0 + 1, T.rojo[0]);
    lineas.forEach((l, i) => g.texto(l, o.x, y0 + 4 + i * 9, i === 0 ? T.rojo[0] : '#3a2a20', { centro: true }));
  });

  S.registrar('tablon', (g, o) => {
    const x0 = o.x - 17, y0 = o.y - 26;
    g.caja(x0, y0, 34, 26, T.madera[2]);
    g.rect(x0 + 2, y0 + 2, 30, 22, '#b08050'); g.trama(x0 + 2, y0 + 2, 30, 22, '#a07040');
    [[4, 4, '#f4f0e0'], [16, 3, '#f8e060'], [7, 13, '#a0d8f0'], [20, 12, '#f4f0e0'], [26, 5, '#f8a0c0']].forEach(([dx, dy, c]) => {
      g.rect(x0 + dx, y0 + dy, 8, 8, c); g.rect(x0 + dx + 1, y0 + dy + 3, 6, 1, '#807060'); g.rect(x0 + dx + 1, y0 + dy + 5, 4, 1, '#807060');
      g.px(x0 + dx + 4, y0 + dy + 1, T.rojo[1]);
    });
  });

  S.registrar('estanteria', (g, o) => {
    const x0 = o.x - 15, y0 = o.y - 50;
    g.caja(x0, y0, 30, 50, T.madera[2]);
    const lomos = [T.rojo[0], T.verde[1], T.laton[1], T.morado[0], '#3060a0', T.naranja[0], T.papel[1], T.rojo[2]];
    for (let s = 0; s < 3; s++) {
      const sy = y0 + 3 + s * 16;
      g.rect(x0 + 2, sy, 26, 13, '#2a160a');
      let bx = x0 + 3;
      for (let b = 0; b < 7 && bx < x0 + 26; b++) {
        const bw = 2 + ((b + s) % 3), bh = 9 + ((b * 3 + s) % 4);
        g.rect(bx, sy + 13 - bh, bw, bh, lomos[(b + s * 3) % lomos.length]);
        g.px(bx, sy + 13 - bh + 2, 'rgba(255,255,255,0.3)');
        bx += bw + 1;
      }
      g.rect(x0 + 1, sy + 13, 28, 2, T.madera[1]);
    }
  });

  S.registrar('planta-colgante', (g, o, t) => {
    const x = o.x, y = o.y;
    g.rect(x, y, 1, 6, T.metal[2]);
    g.caja(x - 5, y + 6, 11, 6, '#b05a30'); g.rect(x - 5, y + 6, 11, 1, '#d07a48');
    const sw = lento() ? 0 : Math.sin(t * 0.8 + x) * 1.2;
    [[-5, 22], [-2, 30], [1, 18], [4, 26], [6, 14]].forEach(([dx, len], i) => {
      for (let j = 0; j < len; j += 2) {
        const vx = x + dx + Math.round(Math.sin(j * 0.25 + i) * 1.5 + sw * j / len);
        g.px(vx, y + 12 + j, j % 4 ? T.verde[1] : T.verde[2]);
        if (j % 6 === 0) { g.px(vx - 1, y + 12 + j, T.verde[2]); g.px(vx + 1, y + 13 + j, T.verde[0]); }
      }
    });
  });


  /* ------------------------------------------------------------------
     CARTEL DE AGENTE: placa con el nombre del agente en su color.
     Se enciende mientras trabaja y parpadea si lo has cogido.
     ------------------------------------------------------------------ */
  S.registrar('rotulo-agente', (g, o, t, r) => {
    const p = o.props || {}, c = r.cfg, est = p.estacion ? AF.mundo.obj(p.estacion) : null;
    const activo = est && est.activa, espera = r.cogido || (est && est.enEspera);
    const texto = r.nombre, sub = p.sub || c.rol.toUpperCase();
    const w = Math.max(AF.anchoTexto(texto), AF.anchoTexto(sub)) + 14, h = 23;
    const x0 = Math.round(o.x - w / 2), y0 = o.y - h;
    for (let j = y0 - 8; j < y0; j += 2) { g.px(x0 + 5, j, T.metal[2]); g.px(x0 + w - 6, j, T.metal[2]); g.px(x0 + 5, j + 1, T.metal[0]); g.px(x0 + w - 6, j + 1, T.metal[0]); }
    const parpadeo = espera && Math.floor(t * 4) % 2;
    const borde = parpadeo ? T.rojo[1] : c.acento;
    g.caja(x0, y0, w, h, T.contorno);
    g.rect(x0 + 1, y0 + 1, w - 2, h - 2, borde);
    g.rect(x0 + 2, y0 + 2, w - 4, h - 4, activo ? AF.personajes.oscurecer(c.acento, 0.45) : '#1a1420');
    if (activo && AF.estado.ajustes.calidad !== 'baja') g.alfa(0.22, () => g.elipse(o.x, y0 + h / 2, w / 2 + 8, h / 2 + 6, c.acento));
    g.texto(texto, o.x, y0 + 3, activo ? '#ffffff' : c.voz, { centro: true, sombra: '#000' });
    g.texto(espera ? 'EN ESPERA' : sub, o.x, y0 + 12, activo ? AF.personajes.aclarar(c.acento, 1.4) : '#9a90a8', { centro: true, sombra: '#000' });
  });

  /* ------------------------------------------------------------------
     ZONA DE DESCANSO: máquina de café y armario de limpieza
     ------------------------------------------------------------------ */
  S.registrar('maquina-cafe', (g, o, t) => {
    const x = o.x, y = o.y;
    g.caja(x - 9, y - 36, 18, 36, '#3a3e4a');
    g.rect(x - 9, y - 36, 18, 2, '#5a6070');
    g.rect(x - 6, y - 32, 12, 8, '#1a1c24'); g.texto('CAFÉ', x, y - 31, '#f0a040', { centro: true });
    g.rect(x - 5, y - 20, 10, 9, '#14161c');
    g.caja(x - 2, y - 15, 5, 4, T.papel[0]);
    g.px(x + 6, y - 22, Math.floor(t * 2) % 2 ? '#40ff60' : '#1a4020');
    if (!AF.estado.ajustes.movimientoReducido) for (let i = 0; i < 2; i++) g.alfa(0.5, () => g.px(x + Math.round(Math.sin(t * 3 + i) * 1), y - 17 - ((t * 5 + i * 3) % 6), '#e8e8e8'));
    g.rect(x - 9, y - 2, 18, 2, T.contorno);
  });

  S.registrar('armario-limpieza', (g, o, t) => {
    const x = o.x, y = o.y;
    g.caja(x - 12, y - 44, 24, 44, '#5a7088');
    g.rect(x - 12, y - 44, 24, 2, '#7a90a8');
    g.rect(x, y - 42, 1, 40, '#2a3848');
    g.px(x - 3, y - 22, T.laton[2]); g.px(x + 3, y - 22, T.laton[2]);
    g.rect(x - 8, y - 38, 6, 4, T.laton[1]); g.texto('L', x - 5, y - 38, '#2a3848', { centro: true });
    // escoba asomando
    g.rect(x + 13, y - 34, 1, 32, T.madera[1]); g.caja(x + 11, y - 6, 5, 4, T.laton[1]);
    g.caja(x - 18, y - 9, 7, 9, '#4080c0'); g.rect(x - 18, y - 9, 7, 1, '#80c0f0');   // cubo
    if (o.activa && Math.floor(t * 4) % 2) g.px(x - 15, y - 12, '#a8e8ff');
  });

  /* ------------------------------------------------------------------
     ESCRITORIO GENÉRICO: puesto de los agentes que se añaden
     ------------------------------------------------------------------ */
  S.registrar('escritorio', (g, o, t) => {
    const x = o.x, y = o.y, r = o.robotId && AF.mundo.robot ? AF.mundo.robot(o.robotId) : null;
    const acento = r ? r.cfg.acento : '#58e0ff';
    g.caja(x - 44, y - 22, 88, 6, T.madera[1]); g.rect(x - 44, y - 22, 88, 1, T.madera[3]);
    g.caja(x - 42, y - 16, 6, 16, T.madera[2]); g.caja(x + 36, y - 16, 6, 16, T.madera[2]);
    g.caja(x + 14, y - 16, 20, 12, T.madera[2]); g.rect(x + 16, y - 12, 16, 1, T.madera[1]);
    // monitor
    g.caja(x - 16, y - 46, 32, 22, '#2a2e38'); g.rect(x - 14, y - 44, 28, 18, '#0c1018');
    for (let i = 0; i < 5; i++) {
      const w = o.activa ? 6 + ((i * 7 + Math.floor(t * 6)) % 18) : 8 + (i * 5) % 12;
      g.rect(x - 12, y - 42 + i * 3, w, 1, o.activa ? acento : AF.personajes.oscurecer(acento, 0.5));
    }
    g.rect(x - 3, y - 24, 6, 2, '#2a2e38');
    // papeles y lámpara
    g.caja(x - 36, y - 25, 12, 3, T.papel[0]); g.caja(x - 34, y - 27, 10, 2, T.papel[1]);
    g.rect(x + 30, y - 36, 1, 14, T.metal[2]); g.caja(x + 26, y - 38, 9, 3, acento);
  });

  /* ------------------------------------------------------------------
     SUELO: sofá, mesita, plantas, cajas, contenedor
     ------------------------------------------------------------------ */
  S.registrar('sofa', (g, o) => {
    const x0 = o.x - 28, y = o.y;
    const c0 = '#8a3a1c', c1 = '#a8502a', c2 = '#5c2410', c3 = '#c87040';
    g.caja(x0, y - 28, 56, 14, c0);             // respaldo
    g.rect(x0 + 1, y - 27, 54, 2, c3);
    g.caja(x0 - 3, y - 20, 9, 18, c1);           // brazos
    g.caja(x0 + 50, y - 20, 9, 18, c1);
    g.rect(x0 - 2, y - 20, 7, 2, c3); g.rect(x0 + 51, y - 20, 7, 2, c3);
    g.caja(x0 + 6, y - 15, 21, 8, c1); g.caja(x0 + 29, y - 15, 21, 8, c1);   // cojines
    g.rect(x0 + 7, y - 15, 19, 1, c3); g.rect(x0 + 30, y - 15, 19, 1, c3);
    g.rect(x0 - 2, y - 6, 60, 4, c2);
    g.rect(x0, y - 2, 3, 2, T.contorno); g.rect(x0 + 53, y - 2, 3, 2, T.contorno);
    [x0 + 14, x0 + 40].forEach(bx => { g.px(bx, y - 22, c2); g.px(bx - 6, y - 22, c2); g.px(bx + 6, y - 22, c2); });
  });

  S.registrar('mesa-cafe', (g, o, t) => {
    const x = o.x, y = o.y;
    g.elipse(x, y - 12, 12, 3, T.contorno); g.elipse(x, y - 12, 11, 2, T.madera[1]);
    g.rect(x - 1, y - 10, 3, 10, T.madera[2]); g.rect(x - 5, y - 1, 11, 1, T.madera[2]);
    g.caja(x - 8, y - 16, 8, 2, T.rojo[0]); g.caja(x - 7, y - 18, 7, 2, '#3060a0');   // libros
    g.caja(x + 2, y - 19, 5, 5, T.papel[0]); g.px(x + 8, y - 17, T.papel[0]); g.px(x + 8, y - 16, T.papel[0]);
    g.px(x + 4, y - 17, '#3070c0');
    if (!lento()) for (let i = 0; i < 3; i++) {
      const sy = y - 22 - ((t * 6 + i * 3) % 9);
      g.alfa(0.5, () => g.px(x + 3 + Math.round(Math.sin(t * 2 + i) * 1.5), sy, '#e8e8e8'));
    }
  });

  S.registrar('planta-maceta', (g, o, t) => {
    const s = (o.props && o.props.tam) || 1, x = o.x, y = o.y;
    const pw = Math.round(12 * s), ph = Math.round(10 * s);
    g.caja(x - pw / 2, y - ph, pw, ph, '#b05a30');
    g.rect(x - pw / 2 - 1, y - ph - 2, pw + 2, 3, '#d07a48'); g.rect(x - pw / 2 - 1, y - ph - 2, pw + 2, 1, '#e8a070');
    g.rect(x - pw / 2 + 1, y - ph + 2, 2, ph - 3, '#c06a3c');
    const sw = lento() ? 0 : Math.sin(t * 0.9 + x * 0.1) * 0.8;
    const hojas = [[-7, -16, 6, 4], [7, -18, 6, 4], [-3, -24, 5, 4], [4, -26, 5, 4], [0, -18, 5, 5], [-9, -24, 4, 3], [9, -24, 4, 3]];
    hojas.forEach(([dx, dy, rx, ry], i) => {
      const hx = x + dx * s + sw * (dy / -26), hy = y - ph + 2 + (dy + 10) * s;
      g.linea(x, y - ph, hx, hy, T.verde[0]);
      g.elipse(hx, hy, Math.round(rx * s), Math.round(ry * s), T.contorno);
      g.elipse(hx, hy, Math.round(rx * s) - 1, Math.max(1, Math.round(ry * s) - 1), i % 2 ? T.verde[1] : T.verde[2]);
      g.linea(hx - rx * s + 2, hy, hx + rx * s - 2, hy, T.verde[0]);
    });
  });

  S.registrar('cajas', (g, o) => {
    const x = o.x, y = o.y;
    const caja = (bx, by, w, h) => {
      g.caja(bx, by, w, h, T.madera[1]);
      g.rect(bx, by, w, 1, T.madera[3]);
      g.rect(bx, by + Math.floor(h / 2), w, 1, T.madera[2]);
      g.linea(bx, by, bx + w - 1, by + h - 1, T.madera[2]);
      g.rect(bx, by, 1, h, T.madera[2]); g.rect(bx + w - 1, by, 1, h, T.madera[2]);
    };
    caja(x - 13, y - 12, 13, 12); caja(x + 1, y - 12, 13, 12); caja(x - 6, y - 24, 13, 12);
    g.texto('A', x - 6, y - 9, T.madera[2]);
  });

  S.registrar('contenedor-reciclaje', (g, o, t) => {
    const x = o.x, y = o.y;
    const cap = AF.ESCENA.limpieza.capacidad, n = o.carga || 0, lleno = n >= cap;
    g.caja(x - 10, y - 20, 20, 20, T.verde[0]);
    g.rect(x - 10, y - 20, 20, 2, T.verde[1]);
    for (let i = 0; i < 3; i++) g.rect(x - 7 + i * 6, y - 16, 2, 13, '#235230');
    g.caja(x - 11, y - 25, 22, 4, T.verde[1]);        // tapa
    g.rect(x - 11, y - 25, 22, 1, T.verde[2]);
    g.rect(x - 3, y - 27, 6, 2, T.verde[0]);
    // símbolo de reciclaje simplificado
    g.rect(x - 3, y - 13, 6, 1, '#e8f8e0'); g.px(x - 3, y - 12, '#e8f8e0'); g.px(x + 2, y - 12, '#e8f8e0');
    g.rect(x - 4, y - 10, 2, 1, '#e8f8e0'); g.rect(x + 2, y - 10, 2, 1, '#e8f8e0'); g.rect(x - 2, y - 8, 4, 1, '#e8f8e0');
    // indicador de llenado
    for (let i = 0; i < cap; i++) g.px(x + 8, y - 4 - i * 2, i < n ? (lleno ? T.rojo[1] : T.laton[1]) : '#163a20');
    if (lleno && Math.floor(t * 3) % 2) g.rect(x - 1, y - 30, 3, 2, T.rojo[1]);
    if (n > 0) g.rect(x - 8, y - 27, 4, 2, T.papel[0]);
  });

  /* ------------------------------------------------------------------
     ENTIDADES: caja de encargo y residuos
     ------------------------------------------------------------------ */
  S.registrar('caja-encargo', (g, o) => {
    const x = o.x, y = o.y;
    g.alfa(0.5, () => g.elipse(x, y, 6, 1, T.contorno));
    g.caja(x - 5, y - 9, 10, 9, T.madera[1]);
    g.rect(x - 5, y - 9, 10, 1, T.madera[3]);
    g.rect(x - 1, y - 9, 2, 9, T.laton[1]);
    g.rect(x - 4, y - 6, 3, 3, o.color || T.papel[0]);
  });

  S.registrar('residuo', (g, o, t) => {
    const x = o.x, y = o.y;
    if (o.clase === 'lata') {
      g.caja(x - 3, y - 3, 6, 3, '#c0c8d0'); g.rect(x - 1, y - 3, 2, 3, T.rojo[0]);
    } else if (o.clase === 'platano') {
      g.rect(x - 3, y - 2, 6, 2, T.contorno); g.rect(x - 2, y - 2, 4, 1, '#f0d040'); g.px(x - 3, y - 1, '#f0d040'); g.px(x + 2, y - 1, '#d0b020'); g.px(x, y - 3, '#806020');
    } else if (o.clase === 'tornillo') {
      g.rect(x - 2, y - 2, 4, 2, T.metal[1]); g.px(x - 2, y - 3, T.metal[3]);
    } else {
      g.elipse(x, y - 2, 3, 2, T.contorno); g.elipse(x, y - 2, 2, 1, T.papel[0]); g.px(x - 1, y - 3, T.papel[1]); g.px(x + 1, y - 1, T.papel[1]);
    }
  });
})();
