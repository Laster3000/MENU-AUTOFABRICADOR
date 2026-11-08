/* =====================================================================
   AUTOFABRICADOR · NÚCLEO
   Utilidades, estado global, bus de eventos, guardado local,
   pincel de píxeles (AF.Pincel) y fuente bitmap 5×7 para rótulos.
   ===================================================================== */
window.AF = window.AF || {};

/* ---------- Utilidades ---------- */
AF.util = {
  azar: (a, b) => a + Math.random() * (b - a),
  entero: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  elegir: (lista) => lista[Math.floor(Math.random() * lista.length)],
  clonar: (o) => JSON.parse(JSON.stringify(o)),
  limitar: (v, a, b) => Math.max(a, Math.min(b, v)),
  hex: (n) => { let s = ''; for (let i = 0; i < n; i++) s += '0123456789abcdef'[Math.floor(Math.random() * 16)]; return s; },
  pad: (n, l) => String(n).padStart(l, '0'),
  hora: (d) => { d = d || new Date(); return AF.util.pad(d.getHours(), 2) + ':' + AF.util.pad(d.getMinutes(), 2); },
  horaSeg: (d) => { d = d || new Date(); return AF.util.hora(d) + ':' + AF.util.pad(d.getSeconds(), 2); },
  plantilla: (txt, datos) => String(txt).replace(/\{(\w+)\}/g, (m, k) => (datos && datos[k] != null) ? datos[k] : m),
  esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
};

/* ---------- Guardado local (no falla si el navegador lo bloquea) ---------- */
AF.almacen = {
  prefijo: 'autofabricador.menu.v1.',
  cargar(clave, porDefecto) {
    try { const v = localStorage.getItem(this.prefijo + clave); return v == null ? porDefecto : JSON.parse(v); }
    catch (e) { return porDefecto; }
  },
  guardar(clave, valor) {
    try { localStorage.setItem(this.prefijo + clave, JSON.stringify(valor)); return true; } catch (e) { return false; }
  },
  borrar(clave) { try { localStorage.removeItem(this.prefijo + clave); } catch (e) { } }
};

/* ---------- Estado global ---------- */
AF.estado = {
  modo: 'DEMO',                // DEMO | REAL (REAL no disponible en este prototipo)
  ejecucion: 'detenida',       // detenida | operativa | pausada | parando
  velocidad: 1,
  tiempo: 0,                   // segundos simulados
  verbo: null,
  hover: null,
  seleccion: null,
  siguiendo: null,
  completadosHoy: 0,
  errores: 0,
  ajustes: Object.assign({
    calidad: 'alta',            // baja | media | alta
    movimientoReducido: false,
    subtitulos: true,
    tamTexto: 1,                // multiplicador del texto de los robots
    sonido: false,
    volumen: 0.3,
    verNavegacion: false,
    residuosAmbientales: true,
    charla: true
  }, AF.almacen.cargar('ajustes', {}))
};
AF.guardarAjustes = () => AF.almacen.guardar('ajustes', AF.estado.ajustes);

/* ---------- Bus de eventos ----------
   Mismo formato que el contrato de integración (schema 1).
   En DEMO todos llevan source:'demo' y simulado:true. */
AF.eventos = {
  lista: [], oyentes: [], seq: 0, max: 600,
  emitir(datos) {
    this.seq++;
    const ev = Object.assign({
      schema: 1,
      eventId: 'evt-' + AF.util.pad(this.seq, 6),
      source: AF.estado.modo === 'DEMO' ? 'demo' : 'supervisor',
      operationId: null, jobId: null, agentRole: null,
      type: 'INFO', status: null,
      timestamp: new Date().toISOString(),
      progress: null, receiptSha256: null,
      simulado: AF.estado.modo === 'DEMO',
      mensaje: ''
    }, datos);
    this.lista.push(ev);
    if (this.lista.length > this.max) this.lista.shift();
    this.oyentes.forEach(fn => { try { fn(ev); } catch (e) { console.error(e); } });
    return ev;
  },
  escuchar(fn) { this.oyentes.push(fn); }
};

/* ---------- Sonido (pitidos 8-bit opcionales) ---------- */
AF.sonido = {
  ctx: null,
  pitido(freq, dur, tipo) {
    if (!AF.estado.ajustes.sonido) return;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = tipo || 'square'; o.frequency.value = freq || 440;
      g.gain.value = 0.04 * AF.estado.ajustes.volumen;
      o.connect(g); g.connect(this.ctx.destination);
      o.start(); o.stop(this.ctx.currentTime + (dur || 0.05));
    } catch (e) { }
  },
  clic() { this.pitido(660, 0.03); },
  habla() { this.pitido(AF.util.entero(300, 500), 0.025, 'triangle'); },
  error() { this.pitido(140, 0.15, 'sawtooth'); }
};

/* ---------- Fuente bitmap 5×7 (para rótulos dentro de la escena) ---------- */
AF.FUENTE = (function () {
  const d = {
    A: '0E1111 1F111111', B: '1E11111E11111E', C: '0E111010 10110E', D: '1E111111 11111E', E: '1F10101E10101F',
    F: '1F10101E101010', G: '0E111017 11110F', H: '1111111F111111', I: '0E04040404040E', J: '07020202 02120C',
    K: '11121418141211', L: '1010101010101F', M: '111B1515111111', N: '11111915131111', O: '0E111111 11110E',
    P: '1E11111E101010', Q: '0E111111 15120D', R: '1E11111E141211', S: '0F10100E01011E', T: '1F040404040404',
    U: '1111111111110E', V: '1111111111 0A04', W: '11111115 15150A', X: '11110A040A1111', Y: '11110A04040404',
    Z: '1F01020408101F', '0': '0E111315 19110E', '1': '040C040404040E', '2': '0E110102 04081F', '3': '1F020402 01110E',
    '4': '02060A12 1F0202', '5': '1F101E01 01110E', '6': '0608101E 11110E', '7': '1F010204 080808', '8': '0E11110E 11110E',
    '9': '0E11110F 01020C', '.': '000000000 00C0C', ',': '00000000 0C0408', ':': '000C0C000C0C00', '-': '0000001F000000',
    '!': '04040404040004', '?': '0E110102040004', '¡': '04000404040404', '¿': '0400040810110E', '/': '01010204081010',
    '(': '02040808080402', ')': '08040202020408', "'": '04040800000000', '%': '18190204081303', '+': '0004041F040400',
    '=': '00001F001F0000', '·': '00000004000000', '€': '07081E081E0807', '#': '0A0A1F0A1F0A0A', '*': '00150E1F0E1500',
    '>': '08040201020408', '<': '02040810080402', '_': '0000000000001F', '"': '0A0A0000000000',
    'Á': '02040E111F1111', 'É': '02041F101E101F', 'Í': '02040E0404040E', 'Ó': '02040E1111110E', 'Ú': '02041111 11110E',
    'Ñ': '0D161119151311', 'Ü': '0A001111 11110E'
  };
  const g = {};
  for (const k in d) {
    const s = d[k].replace(/ /g, '');
    const filas = [];
    for (let i = 0; i < 7; i++) filas.push(parseInt(s.substr(i * 2, 2), 16) || 0);
    let min = 5, max = -1;
    filas.forEach(f => { for (let c = 0; c < 5; c++) if (f & (1 << (4 - c))) { min = Math.min(min, c); max = Math.max(max, c); } });
    g[k] = { filas, min: max < 0 ? 0 : min, ancho: max < 0 ? 3 : (max - min + 1) };
  }
  g[' '] = { filas: [0, 0, 0, 0, 0, 0, 0], min: 0, ancho: 2 };
  return g;
})();

AF.anchoTexto = function (txt) {
  let w = 0;
  for (const ch of String(txt).toUpperCase()) { const gl = AF.FUENTE[ch] || AF.FUENTE['?']; w += gl.ancho + 1; }
  return Math.max(0, w - 1);
};

/* ---------- Pincel de píxeles ----------
   Dibuja en coordenadas del MUNDO; resta la cámara automáticamente. */
AF.Pincel = function (ctx) { this.c = ctx; this.ox = 0; this.oy = 0; };
AF.Pincel.prototype = {
  r(v) { return Math.round(v); },
  rect(x, y, w, h, col) {
    if (w <= 0 || h <= 0) return;
    this.c.fillStyle = col;
    this.c.fillRect(Math.round(x - this.ox), Math.round(y - this.oy), Math.round(w), Math.round(h));
  },
  px(x, y, col) { this.rect(x, y, 1, 1, col); },
  // rectángulo con contorno de 1 px
  caja(x, y, w, h, relleno, borde) {
    this.rect(x - 1, y - 1, w + 2, h + 2, borde || AF.TEMA.contorno);
    this.rect(x, y, w, h, relleno);
  },
  // rectángulo con esquinas recortadas y contorno
  redondo(x, y, w, h, relleno, borde) {
    const b = borde || AF.TEMA.contorno;
    this.rect(x, y - 1, w, h + 2, b); this.rect(x - 1, y, w + 2, h, b);
    this.rect(x + 1, y, w - 2, h, relleno); this.rect(x, y + 1, w, h - 2, relleno);
  },
  // tramado (dithering) en damero
  trama(x, y, w, h, col, fase) {
    this.c.fillStyle = col;
    const f = fase || 0;
    for (let j = 0; j < h; j++) for (let i = (j + f) % 2; i < w; i += 2)
      this.c.fillRect(Math.round(x - this.ox) + i, Math.round(y - this.oy) + j, 1, 1);
  },
  elipse(cx, cy, rx, ry, col) {
    this.c.fillStyle = col;
    const X = Math.round(cx - this.ox), Y = Math.round(cy - this.oy);
    for (let j = -ry; j <= ry; j++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry + 0.01))));
      if (w > 0) this.c.fillRect(X - w, Y + j, w * 2, 1);
    }
  },
  linea(x0, y0, x1, y1, col) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    while (n++ < 2000) {
      this.px(x0, y0, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  },
  alfa(a, fn) { const p = this.c.globalAlpha; this.c.globalAlpha = p * a; fn(); this.c.globalAlpha = p; },
  // texto bitmap. op: { centro:true, sombra:color }
  texto(txt, x, y, col, op) {
    op = op || {};
    txt = String(txt).toUpperCase();
    let cx = op.centro ? Math.round(x - AF.anchoTexto(txt) / 2) : Math.round(x);
    if (op.sombra) { const o = Object.assign({}, op, { sombra: null, centro: false }); this.texto(txt, cx + 1, y + 1, op.sombra, o); }
    for (const ch of txt) {
      const gl = AF.FUENTE[ch] || AF.FUENTE['?'];
      for (let f = 0; f < 7; f++) {
        const fila = gl.filas[f];
        if (!fila) continue;
        for (let c = 0; c < 5; c++) if (fila & (1 << (4 - c))) this.px(cx + c - gl.min, y + f, col);
      }
      cx += gl.ancho + 1;
    }
  }
};

/* ---------- Icono pixel → imagen (para la interfaz HTML) ---------- */
AF.iconoURL = (function () {
  const cache = {};
  return function (nombre, escala) {
    escala = escala || 2;
    const k = nombre + '@' + escala;
    if (cache[k]) return cache[k];
    const mapa = AF.ICONOS && AF.ICONOS[nombre];
    if (!mapa) return '';
    const cv = document.createElement('canvas');
    cv.width = 12 * escala; cv.height = 12 * escala;
    const c = cv.getContext('2d');
    mapa.forEach((fila, j) => {
      for (let i = 0; i < fila.length; i++) {
        const col = AF.ICONOS_PALETA[fila[i]];
        if (col) { c.fillStyle = col; c.fillRect(i * escala, j * escala, escala, escala); }
      }
    });
    return (cache[k] = cv.toDataURL());
  };
})();
