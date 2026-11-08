/* =====================================================================
   AUTOFABRICADOR · ESCENA (definición declarativa)
   ---------------------------------------------------------------------
   Todo lo que aparece en la fábrica se define aquí como datos.
   - Para CAMBIAR EL DIBUJO de una pieza: cambia su "asset" (ver js/sprites.js).
   - Para MOVERLA: cambia x / y (punto de apoyo en el suelo, centro-abajo).
   - Para AÑADIR una pieza: copia un bloque y dale un "id" nuevo.
   - Los cambios de colisión / posición recalculan las rutas al arrancar
     y el editor rechaza distribuciones imposibles.

   Coordenadas del mundo (en píxeles de la escena, no de la pantalla):
     ancho 1200 × alto 220 (crece sola si hace falta sitio para un puesto nuevo). El suelo va de y=118 (fondo) a y=216 (frente).
   ===================================================================== */
window.AF = window.AF || {};

AF.ESCENA = {
  schema: 1,
  version: '1.0.0',

  mundo: { ancho: 1200, alto: 220, sueloY: 118, sueloFin: 216, celda: 8 },
  vista: { ancho: 480, alto: 220 },          // tamaño visible (se escala a pantalla)
  puntoCentral: { x: 240, y: 184 },          // punto desde el que se valida que todo sea accesible

  // --- Salas: zonas de la fábrica (el punto de fuga dibuja la perspectiva del suelo)
  salas: [
    { id: 'taller',   nombre: 'Taller principal',      x0: 0,   x1: 482,  fuga: 240 },
    { id: 'descanso', nombre: 'Zona de descanso',      x0: 482, x1: 722,  fuga: 602, descanso: true, suelo: '#5a2a3a', sueloTrama: '#6a3446' },
    { id: 'ala-ver',  nombre: 'Ala de verificación',   x0: 722, x1: 1200, fuga: 960 }
  ],

  // --- Ventanales del fondo (muestran el cielo nocturno con paralaje)
  ventanas: [
    { x: 14,  y: 8, w: 84, h: 40 },
    { x: 296, y: 8, w: 84, h: 40 },
    { x: 560, y: 8, w: 84, h: 40 },
    { x: 796, y: 8, w: 84, h: 40 },
    { x: 1020, y: 8, w: 84, h: 40 }
  ],

  // --- Lámparas colgantes (x en el mundo; largo del cable en px)
  lamparas: [
    { x: 150, cable: 22 }, { x: 445, cable: 16 }, { x: 640, cable: 20 }, { x: 900, cable: 22 }, { x: 1140, cable: 18 }
  ],

  // --- Tabique con puerta entre las dos salas -------------------------
  tabique: {
    id: 'tabique-01',
    x: 722,            // x donde toca la pared del fondo
    pendiente: 0.55,   // desplazamiento en x por cada px de profundidad (perspectiva)
    techo: 0,          // la pared llega hasta el techo (y de su borde superior)
    altoPuerta: 42,    // altura del hueco de la puerta
    grosor: 6,
    hueco: { y0: 150, y1: 184 }   // tramo del suelo donde está la puerta
  },
  puertas: [
    { id: 'puerta-01', nombre: 'Persiana del ala de verificación', abierta: true,
      descripcion: 'Persiana metálica entre el taller y el ala de verificación.' }
  ],

  // --- Limpieza ----------------------------------------------------------
  limpieza: {
    contenedor: 'contenedor-01',
    capacidad: 6,
    residuosAmbientales: true,      // en DEMO aparece basura de vez en cuando
    intervalo: [28, 50],            // segundos entre residuos ambientales
    maxEnSuelo: 4
  },

  /* -------------------------------------------------------------------
     OBJETOS
     tipo:     estacion | mueble | decoracion | contenedor | rotulo | pared
     capa:     'pared' = pegado a la pared (siempre detrás de los robots)
               'normal' = se ordena por profundidad con los robots
     caja:     zona clicable { w, h } desde el punto de apoyo hacia arriba
     colision: zona que bloquea el paso { w, h, dx? } (null = no bloquea)
     acceso:   dónde se coloca el robot que trabaja (relativo a x, y)
     deposito: dónde se deja la caja del encargo (relativo a x, y)
     usar:     qué abre el verbo USAR (ventana:<id>)
     ------------------------------------------------------------------- */
  objetos: [
    // ===== ESTACIONES =====================================================
    { id: 'st-intake', tipo: 'estacion', nombre: 'Mostrador de encargos',
      descripcion: 'Aquí llegan los encargos por el tubo neumático. RECEPCION los registra y congela sus pruebas.',
      asset: 'mostrador-recepcion', x: 78, y: 140, caja: { w: 112, h: 92 },
      colision: { w: 100, h: 18 }, acceso: { dx: 6, dy: 18 }, deposito: { dx: -34, dy: 14 },
      mira: 'arriba', usar: 'ventana:nuevo', movible: true },

    { id: 'st-ia', tipo: 'estacion', nombre: 'Núcleo de IA Central',
      descripcion: 'Tanque con el modelo local (Qwen2.5-Coder 7B en GPU). PLANIFICADOR prepara aquí el plan del encargo.',
      asset: 'tanque-ia', x: 222, y: 140, caja: { w: 92, h: 112 },
      colision: { w: 78, h: 20 }, acceso: { dx: -6, dy: 18 }, deposito: { dx: 36, dy: 14 },
      mira: 'arriba', usar: 'ventana:modelos', movible: true },

    { id: 'st-codigo', tipo: 'estacion', nombre: 'Terminales de programación',
      descripcion: 'Dos terminales de fósforo verde. PROGRAMADOR escribe los módulos JavaScript ESM.',
      asset: 'terminales-codigo', x: 392, y: 140, caja: { w: 112, h: 74 },
      colision: { w: 104, h: 18 }, acceso: { dx: -22, dy: 18 }, deposito: { dx: 30, dy: 14 },
      mira: 'arriba', usar: 'ventana:codigo', movible: true },

    { id: 'st-lab', tipo: 'estacion', nombre: 'Banco de pruebas',
      descripcion: 'Matraces, cables y un invitado WASI aislado. CIENTIFICO ejecuta aquí las pruebas del propietario.',
      asset: 'laboratorio-quimico', x: 844, y: 140, caja: { w: 112, h: 80 },
      colision: { w: 104, h: 18 }, acceso: { dx: 0, dy: 18 }, deposito: { dx: -36, dy: 14 },
      mira: 'arriba', usar: 'ventana:laboratorio', movible: true },

    { id: 'st-val', tipo: 'estacion', nombre: 'Consola de validación',
      descripcion: 'Comprueba manifiestos, SHA-256 y recibos. VALIDADOR no deja pasar nada sin evidencia.',
      asset: 'consola-validacion', x: 966, y: 140, caja: { w: 104, h: 80 },
      colision: { w: 96, h: 18 }, acceso: { dx: 10, dy: 18 }, deposito: { dx: -32, dy: 14 },
      mira: 'arriba', usar: 'ventana:historial', movible: true },

    { id: 'st-entrega', tipo: 'estacion', nombre: 'Cinta de empaquetado',
      descripcion: 'El paquete ZIP sale por esta cinta con su SHA-256 grabado. EMPAQUETADOR lo prepara y documenta.',
      asset: 'cinta-entrega', x: 1112, y: 140, caja: { w: 150, h: 84 },
      colision: { w: 140, h: 18 }, acceso: { dx: -10, dy: 18 }, deposito: { dx: -54, dy: 14 },
      mira: 'arriba', usar: 'ventana:entregas', movible: true },

    // ===== RÓTULOS (texto editable) =====================================
    { id: 'rot-1', tipo: 'rotulo', capa: 'pared', nombre: 'Rótulo 1', asset: 'rotulo', x: 78,  y: 66,
      caja: { w: 76, h: 20 }, props: { robot: 'recepcion' } },
    { id: 'rot-2', tipo: 'rotulo', capa: 'pared', nombre: 'Rótulo 2', asset: 'rotulo', x: 222, y: 26,
      caja: { w: 76, h: 20 }, props: { robot: 'planificador' } },
    { id: 'rot-3', tipo: 'rotulo', capa: 'pared', nombre: 'Rótulo 3', asset: 'rotulo', x: 392, y: 74,
      caja: { w: 86, h: 20 }, props: { robot: 'programador' } },
    { id: 'rot-4', tipo: 'rotulo', capa: 'pared', nombre: 'Rótulo 4', asset: 'rotulo', x: 844, y: 74,
      caja: { w: 80, h: 20 }, props: { robot: 'cientifico' } },
    { id: 'rot-5', tipo: 'rotulo', capa: 'pared', nombre: 'Rótulo 5', asset: 'rotulo', x: 966, y: 66,
      caja: { w: 80, h: 20 }, props: { robot: 'validador' } },
    { id: 'rot-6', tipo: 'rotulo', capa: 'pared', nombre: 'Rótulo 6', asset: 'rotulo', x: 1112, y: 66,
      caja: { w: 76, h: 20 }, props: { robot: 'empaquetador' } },

    // ===== PARED: detalles colgados =====================================
    { id: 'reloj-01', tipo: 'pared', capa: 'pared', nombre: 'Reloj de pared', asset: 'reloj-pared', x: 160, y: 60,
      caja: { w: 18, h: 18 }, descripcion: 'Marca la hora real de tu equipo.' },
    { id: 'cartel-01', tipo: 'pared', capa: 'pared', nombre: 'Cartel de normas', asset: 'cartel', x: 312, y: 104,
      caja: { w: 48, h: 44 }, props: { lineas: ['SIN', 'PRUEBAS', 'NO HAY', 'ENTREGA'] },
      descripcion: 'Regla de oro: sin pruebas del propietario, el encargo se bloquea antes de llamar a la IA.' },
    { id: 'tablon-01', tipo: 'pared', capa: 'pared', nombre: 'Tablón de avisos', asset: 'tablon', x: 920, y: 102,
      caja: { w: 34, h: 26 }, usar: 'ventana:historial', descripcion: 'Notas clavadas con chinchetas. Usar para ver el historial.' },
    { id: 'estante-01', tipo: 'pared', capa: 'pared', nombre: 'Estantería de manuales', asset: 'estanteria', x: 22, y: 112,
      caja: { w: 30, h: 50 }, usar: 'ventana:ayuda', descripcion: 'Manuales de la fábrica. Usar para abrir la ayuda.' },
    { id: 'hiedra-01', tipo: 'decoracion', capa: 'pared', nombre: 'Hiedra', asset: 'planta-colgante', x: 282, y: 4, caja: { w: 16, h: 1 } },
    { id: 'hiedra-02', tipo: 'decoracion', capa: 'pared', nombre: 'Hiedra', asset: 'planta-colgante', x: 466, y: 4, caja: { w: 16, h: 1 } },
    { id: 'hiedra-03', tipo: 'decoracion', capa: 'pared', nombre: 'Hiedra', asset: 'planta-colgante', x: 852, y: 4, caja: { w: 16, h: 1 } },
    { id: 'hiedra-04', tipo: 'decoracion', capa: 'pared', nombre: 'Hiedra', asset: 'planta-colgante', x: 1180, y: 4, caja: { w: 16, h: 1 } },

    // ===== MOBILIARIO Y DECORACIÓN EN EL SUELO ===========================
    { id: 'sofa-01', tipo: 'mueble', nombre: 'Sofá de descanso', asset: 'sofa', x: 540, y: 152,
      caja: { w: 58, h: 30 }, colision: { w: 56, h: 12 }, movible: true,
      descripcion: 'Un sofá de cuero gastado en la zona de descanso. Aquí esperan los robots sin trabajo.' },
    { id: 'mesa-01', tipo: 'mueble', nombre: 'Mesita con café', asset: 'mesa-cafe', x: 592, y: 152,
      caja: { w: 26, h: 20 }, colision: { w: 22, h: 8 }, movible: true,
      descripcion: 'Una taza de café humeante con el engranaje de AUTOFABRICADOR.' },
    { id: 'planta-01', tipo: 'decoracion', nombre: 'Monstera', asset: 'planta-maceta', x: 296, y: 212,
      caja: { w: 26, h: 38 }, colision: { w: 14, h: 8 }, movible: true, props: { tam: 1.2 } },
    { id: 'planta-02', tipo: 'decoracion', nombre: 'Planta', asset: 'planta-maceta', x: 150, y: 142,
      caja: { w: 18, h: 28 }, colision: { w: 10, h: 6 }, movible: true, props: { tam: 0.8 } },
    { id: 'planta-03', tipo: 'decoracion', nombre: 'Planta', asset: 'planta-maceta', x: 908, y: 142,
      caja: { w: 18, h: 28 }, colision: { w: 10, h: 6 }, movible: true, props: { tam: 0.8 } },
    { id: 'planta-04', tipo: 'decoracion', nombre: 'Helecho', asset: 'planta-maceta', x: 1184, y: 212,
      caja: { w: 26, h: 38 }, colision: { w: 14, h: 8 }, movible: true, props: { tam: 1.1 } },
    { id: 'cajas-01', tipo: 'decoracion', nombre: 'Cajas de madera', asset: 'cajas', x: 1176, y: 150,
      caja: { w: 28, h: 30 }, colision: { w: 24, h: 10 }, movible: true },
    { id: 'cajas-02', tipo: 'decoracion', nombre: 'Cajas de repuestos', asset: 'cajas', x: 880, y: 214,
      caja: { w: 28, h: 30 }, colision: { w: 22, h: 10 }, movible: true },


    // ===== ZONA DE DESCANSO =============================================
    { id: 'cafetera-01', tipo: 'mueble', nombre: 'Máquina de café', asset: 'maquina-cafe', x: 636, y: 142,
      caja: { w: 22, h: 40 }, colision: { w: 20, h: 10 }, movible: true,
      descripcion: 'Café para robots: aceite caliente con espuma. Huele a tostado y a lubricante.' },
    { id: 'st-limpieza', tipo: 'estacion', nombre: 'Armario de limpieza', asset: 'armario-limpieza', x: 690, y: 142,
      caja: { w: 26, h: 46 }, colision: { w: 24, h: 12 }, acceso: { dx: -18, dy: 16 }, mira: 'arriba', movible: true,
      descripcion: 'Escobas, cubos y bayetas del LIMPIADOR. Es su puesto.' },
    { id: 'planta-05', tipo: 'decoracion', nombre: 'Palmera', asset: 'planta-maceta', x: 708, y: 214,
      caja: { w: 26, h: 38 }, colision: { w: 14, h: 8 }, movible: true, props: { tam: 1.1 } },
    { id: 'cartel-descanso', tipo: 'pared', capa: 'pared', nombre: 'Cartel de descanso', asset: 'rotulo', x: 602, y: 66,
      caja: { w: 80, h: 20 }, props: { texto: 'ZONA DE DESCANSO', sub: 'SIN TRABAJO' } },

    // ===== CONTENEDOR (lo usa LIMPIADOR) ======================================
    { id: 'contenedor-01', tipo: 'contenedor', nombre: 'Contenedor de reciclaje', asset: 'contenedor-reciclaje',
      x: 452, y: 210, caja: { w: 24, h: 28 }, colision: { w: 20, h: 8 }, acceso: { dx: -18, dy: 0 },
      movible: true, usar: 'vaciar',
      descripcion: 'Contenedor de residuos de la simulación. Usar para vaciarlo.' }
  ]
};
