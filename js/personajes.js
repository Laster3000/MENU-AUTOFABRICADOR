/* =====================================================================
   AUTOFABRICADOR · DIBUJO DE PERSONAJES (robots)
   ---------------------------------------------------------------------
   Un único dibujo parametrizado: colores, accesorio, ruedas y bata se
   leen de config/robots.js. Para un robot con dibujo totalmente propio,
   registra AF.personajes.especiales['id-del-robot'] = fn(g, r, t).
   Direcciones: abajo (de frente), arriba (de espaldas), izq, der.
   ===================================================================== */
window.AF = window.AF || {};

AF.personajes = {
  especiales: {},

  dibujar(g, r, t) {
    if (this.especiales[r.id]) return this.especiales[r.id](g, r, t);
    const T = AF.TEMA, c = r.cfg;
    const x = Math.round(r.x), y = Math.round(r.y);
    const dir = r.dir || 'abajo';
    const andando = r.andando && !AF.estado.ajustes.movimientoReducido;
    const trabajando = r.estado === 'WORKING' || r.estado === 'RECOGER' || r.estado === 'DEPOSITAR';
    const fr = andando ? Math.floor(r.anim * 8) % 4 : 0;
    const bote = andando && (fr === 1 || fr === 3) ? -1 : 0;
    const osc = c.cuerpo, sombraC = this.oscurecer(c.cuerpo, 0.72), luzC = this.aclarar(c.cuerpo, 1.12);
    const lado = dir === 'izq' ? -1 : dir === 'der' ? 1 : 0;
    const Y = y + bote;

    // sombra en el suelo
    g.alfa(0.45, () => g.elipse(x, y, 8, 2, T.contorno));

    // carga detrás si mira hacia arriba
    if (r.carga && dir === 'arriba') this.dibujarCarga(g, r, x, Y - 16);

    // ---- piernas o ruedas ----
    if (c.ruedas) {
      g.caja(x - 7, Y - 8, 14, 4, T.metal[0]);
      g.rect(x - 7, Y - 8, 14, 1, T.metal[1]);
      [-5, 5].forEach(dx => {
        g.elipse(x + dx, y - 2, 3, 2, T.contorno);
        g.rect(x + dx - 1, y - 3, 2, 2, (fr % 2) ? T.metal[1] : T.metal[2]);
      });
    } else {
      const piernas = lado === 0
        ? [[-4, fr === 1 ? -1 : 0], [1, fr === 3 ? -1 : 0]]
        : [[-2 + (fr === 1 ? 2 * lado : fr === 3 ? -2 * lado : 0), 0], [-1 + (fr === 1 ? -2 * lado : fr === 3 ? 2 * lado : 0), 0]];
      piernas.forEach(([dx, dy]) => {
        g.caja(x + dx, y - 7 + dy, 3, 5, T.metal[2]);
        g.rect(x + dx, y - 7 + dy, 1, 5, T.metal[0]);
        g.caja(x + dx - (lado === 0 ? (dx < 0 ? 1 : 0) : (lado < 0 ? 1 : 0)), y - 2 + dy, 4, 2, T.metal[2]);
      });
    }

    // ---- brazos (detrás del cuerpo en vista lateral) ----
    const brazoOsc = andando ? (fr === 1 ? 1 : fr === 3 ? -1 : 0) : 0;
    const teclear = trabajando ? (Math.floor(t * 10) % 2 ? -1 : 1) : 0;
    const brazo = (bx, dy) => { g.caja(bx, Y - 14 + dy, 2, 6, sombraC); g.px(bx, Y - 8 + dy, T.metal[1]); };

    // ---- cuerpo ----
    const subeBrazos = !!r.carga && dir !== 'arriba';
    if (lado !== 0) brazo(x - lado * 4, brazoOsc);
    g.caja(x - 5, Y - 15, 10, 9, osc);
    g.rect(x - 5, Y - 15, 10, 1, luzC);
    g.rect(x - 5, Y - 8, 10, 1, sombraC);
    if (c.bata) {           // bata de laboratorio
      g.rect(x - 6, Y - 14, 2, 9, '#ffffff'); g.rect(x + 4, Y - 14, 2, 9, '#ffffff');
      g.rect(x - 6, Y - 6, 2, 1, '#c8c8c8'); g.rect(x + 4, Y - 6, 2, 1, '#c8c8c8');
    }
    if (dir !== 'arriba') {
      g.rect(x - 2, Y - 13, 4, 3, '#20262e');
      g.px(x - 1, Y - 12, (Math.floor(t * 2 + r.semilla) % 3) ? c.acento : this.oscurecer(c.acento, 0.5));
      g.px(x + 1, Y - 12, c.acento);
    } else {
      g.rect(x - 3, Y - 13, 6, 1, sombraC); g.rect(x - 3, Y - 11, 6, 1, sombraC);
    }
    if (lado === 0) {
      if (subeBrazos) { g.caja(x - 7, Y - 18, 2, 5, sombraC); g.caja(x + 5, Y - 18, 2, 5, sombraC); }
      else { brazo(x - 7, (dir === 'arriba' ? teclear : brazoOsc)); brazo(x + 5, (dir === 'arriba' ? -teclear : -brazoOsc)); }
    } else {
      if (subeBrazos) g.caja(x + lado * 4 - 1, Y - 16, 3, 3, sombraC); else brazo(x + lado * 3, -brazoOsc + teclear);
    }
    g.rect(x - 1, Y - 16, 2, 1, T.metal[2]);   // cuello

    // ---- cabeza ----
    const hx = x - 6, hy = Y - 25;
    g.redondo(hx, hy, 12, 9, osc);
    g.rect(hx + 1, hy, 10, 1, luzC);
    g.rect(hx + 1, hy + 8, 10, 1, sombraC);
    if (dir === 'arriba') {
      g.rect(hx + 3, hy + 3, 6, 1, sombraC); g.rect(hx + 3, hy + 5, 6, 1, sombraC);
    } else {
      const parpadeo = ((t + r.semilla * 1.7) % 4.2) < 0.13;
      const vx = lado === 0 ? hx + 2 : (lado > 0 ? hx + 4 : hx + 1);
      g.rect(vx, hy + 2, lado === 0 ? 8 : 7, 5, '#141a26');
      const ojos = lado === 0 ? [vx + 1 + (r.mirada || 0), vx + 5 + (r.mirada || 0)] : [vx + (lado > 0 ? 4 : 1)];
      ojos.forEach(ex => {
        if (parpadeo) g.rect(ex, hy + 4, 2, 1, c.visor);
        else { g.rect(ex, hy + 3, 2, 2, c.visor); g.px(ex, hy + 3, '#ffffff'); }
      });
      if (lado === 0 && r.estado === 'BLOCKED') { g.px(vx + 1, hy + 2, c.visor); g.px(vx + 6, hy + 2, c.visor); }
    }
    // antena
    if (c.accesorio !== 'casco' && c.accesorio !== 'gorra') {
      const ants = c.accesorio === 'antena-doble' ? [-3, 3] : [0];
      ants.forEach(ax => {
        g.rect(x + ax, hy - 3, 1, 3, T.metal[2]);
        const enc = Math.floor(t * 2 + r.semilla) % 2 || r.estado === 'WORKING';
        g.rect(x + ax - (ants.length > 1 ? 0 : 0), hy - 5, 2, 2, enc ? c.acento : this.oscurecer(c.acento, 0.5));
      });
    }

    // ---- accesorios ----
    switch (c.accesorio) {
      case 'auriculares':
        g.rect(hx, hy - 2, 12, 1, T.contorno);
        g.rect(hx - 1, hy - 1, 1, 2, T.contorno); g.rect(hx + 12, hy - 1, 1, 2, T.contorno);
        if (lado >= 0) g.caja(hx - 2, hy + 2, 2, 4, c.acento);
        if (lado <= 0) g.caja(hx + 12, hy + 2, 2, 4, c.acento);
        break;
      case 'gafas':
        g.rect(hx, hy + 1, 12, 1, T.contorno);
        if (dir !== 'arriba') { g.caja(hx + 2, hy - 1, 3, 2, '#f0a030'); g.caja(hx + 7, hy - 1, 3, 2, '#f0a030'); }
        break;
      case 'casco':
        g.redondo(hx - 1, hy - 3, 14, 4, '#f0c020');
        g.rect(hx - 2 + (lado > 0 ? 2 : 0), hy, 15 - (lado !== 0 ? 1 : 0), 1, '#c89810');
        g.rect(hx + 5, hy - 3, 2, 3, '#ffe060');
        break;
      case 'gorra':
        g.redondo(hx, hy - 3, 12, 4, T.rojo[0]);
        if (lado === 0) g.rect(hx + 2, hy, 8, 1, T.rojo[2]); else g.rect(lado > 0 ? hx + 8 : hx - 2, hy, 6, 1, T.rojo[2]);
        g.px(x, hy - 3, '#ffffff');
        break;
      case 'portapapeles':
        if (dir !== 'arriba' && !r.carga) {
          const px0 = lado > 0 ? x + 4 : x - 11;
          g.caja(px0, Y - 15, 6, 8, T.madera[1]); g.rect(px0 + 1, Y - 14, 4, 6, T.papel[0]);
          g.rect(px0 + 1, Y - 12, 3, 1, '#808080'); g.rect(px0 + 1, Y - 10, 4, 1, '#808080'); g.rect(px0 + 2, Y - 16, 2, 1, T.metal[1]);
        }
        break;
      case 'lupa':
        if (dir !== 'arriba' && !r.carga) {
          const lx = lado < 0 ? x - 10 : x + 9;
          g.linea(lx - (lado < 0 ? -2 : 2), Y - 8, lx, Y - 11, T.madera[2]);
          g.elipse(lx, Y - 14, 3, 3, T.laton[2]); g.elipse(lx, Y - 14, 2, 2, '#a8e8ff'); g.px(lx - 1, Y - 15, '#ffffff');
        }
        break;
      case 'escoba': {
        const bx = lado < 0 ? x - 8 : x + 8, barr = trabajando || (andando ? 0 : Math.sin(t * 2) > 0.7) ? (Math.floor(t * 8) % 2) : 0;
        g.linea(bx - (lado < 0 ? -1 : 1), Y - 16, bx + (lado < 0 ? -3 : 3) + barr, y - 2, T.madera[1]);
        g.caja(bx + (lado < 0 ? -6 : 1) + barr, y - 4, 5, 3, T.laton[1]);
        g.rect(bx + (lado < 0 ? -6 : 1) + barr, y - 2, 5, 1, T.laton[2]);
        break;
      }
    }

    // carga delante
    if (r.carga && dir !== 'arriba') this.dibujarCarga(g, r, x + lado * 3, Y - 19);

    // aviso sobre la cabeza: le toca trabajar (!) o va corriendo a su puesto (!! y sudor)
    const vaATrabajar = r.tarea && r.tarea.tipo === 'fase' && /ASSIGNED|ROUTING|WALKING/.test(r.estado);
    if (r.prisa || vaATrabajar || r.cogido) {
      const b = Math.floor(t * 6) % 2, col = r.prisa || r.cogido ? T.rojo[1] : c.acento;
      const marcas = r.prisa || r.cogido ? [-2, 2] : [0];
      marcas.forEach(dx => { g.rect(x + dx - 1, hy - 13 - b, 2, 5, T.contorno); g.rect(x + dx - 1, hy - 13 - b, 1, 4, col); g.px(x + dx - 1, hy - 7 - b, col); });
    }
    if (r.prisa && andando) {   // gotas de sudor
      const k = Math.floor(t * 8) % 3;
      g.px(x - 8 - k, hy + 1 + k, '#a8e8ff'); g.px(x + 8 + k, hy + 2 + k, '#a8e8ff');
    }
    if (r.estado === 'ATURDIDO') {   // estrellitas
      for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; g.px(Math.round(x + Math.cos(a) * 7), Math.round(hy - 3 + Math.sin(a) * 2), T.laton[3]); }
    }

    // marcador de selección / seguimiento
    if ((AF.estado.seleccion === r || AF.estado.siguiendo === r) && !r.cogido) {
      const f = Math.floor(t * 3) % 2;
      g.rect(x - 2, hy - 10 + f, 5, 1, T.seleccion); g.rect(x - 1, hy - 9 + f, 3, 1, T.seleccion); g.px(x, hy - 8 + f, T.seleccion);
    }
  },

  dibujarCarga(g, r, x, y) {
    if (r.carga.tipo === 'caja') {
      AF.sprites.dibujar(g, { asset: 'caja-encargo', x, y: y + 9, color: r.carga.obj.color }, 0);
    } else if (r.carga.tipo === 'residuo') {
      AF.sprites.dibujar(g, { asset: 'residuo', x: x + (r.dir === 'izq' ? -6 : 6), y: y + 10, clase: r.carga.obj.clase }, 0);
    }
  },

  // utilidades de color
  oscurecer(hex, f) { return this.ajustar(hex, f); },
  aclarar(hex, f) { return this.ajustar(hex, f); },
  ajustar(hex, f) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return hex;
    const c = [1, 2, 3].map(i => Math.max(0, Math.min(255, Math.round(parseInt(m[i], 16) * f))));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }
};
