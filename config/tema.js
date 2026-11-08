/* =====================================================================
   AUTOFABRICADOR · TEMA VISUAL
   ---------------------------------------------------------------------
   Paleta de colores de la escena pixel-art. Cambia cualquier color aquí
   y se aplicará a todo el dibujo sin tocar el motor.
   Los colores de la interfaz HTML (paneles, botones) están al principio
   de css/estilo.css como variables --af-*.
   ===================================================================== */
window.AF = window.AF || {};

AF.TEMA = {
  // --- Generales -----------------------------------------------------
  negro:       '#0b0a12',
  contorno:    '#140e18',
  sombra:      'rgba(10,6,16,0.45)',

  // --- Cielo exterior (se ve por las ventanas, con paralaje) ---------
  cielo:       ['#0e1230', '#161c46', '#222c62', '#34407e', '#4a4e8e'],
  luna:        '#f4ecc8',
  lunaSombra:  '#d8cc9c',
  estrella:    '#fff6d0',
  isla:        '#0a0c22',
  islaBrillo:  '#1c2048',
  mar:         '#141a40',

  // --- Pared ------------------------------------------------------------
  ladrillo:    ['#5c3a2c', '#6c4434', '#4c2e24'],
  mortero:     '#33211b',
  zocalo:      ['#6a3e1e', '#83502a', '#4e2c14'],   // madera inferior
  viga:        ['#3e2412', '#5a3418', '#2a180c'],
  remache:     '#a87a48',

  // --- Suelo ------------------------------------------------------------
  suelo:       ['#4a4250', '#564d5c', '#3e3746'],
  sueloLinea:  '#2e2836',
  peligro:     ['#e8b830', '#1c1620'],

  // --- Madera y metal --------------------------------------------------
  madera:      ['#7a4a24', '#9a6232', '#5a3418', '#c08850'],
  metal:       ['#5e6a78', '#8796a6', '#3a424e', '#c4d0dc'],
  laton:       ['#b07820', '#e0a838', '#7a5010', '#f8d878'],

  // --- Acentos ----------------------------------------------------------
  cian:        ['#58e0ff', '#2a8ab0', '#bff4ff'],
  verde:       ['#2e6a3a', '#4a9a48', '#7cc860', '#c4f088'],
  rojo:        ['#c03838', '#e85a4a', '#7a1c20'],
  naranja:     ['#e87a28', '#f8a848'],
  morado:      ['#6a3aa8', '#9a5ad8', '#d090ff'],
  rosa:        ['#e04aa8', '#ff8ad0'],
  papel:       ['#f4f0e0', '#d8d0b8'],
  pantalla:    ['#0c2a1c', '#38e070', '#a8ffb8'],   // fósforo verde

  // --- Luz ambiental (conos de lámparas) --------------------------------
  luzLampara:  'rgba(255,214,140,0.10)',
  luzBrillo:   'rgba(255,236,190,0.9)',

  // --- Interfaz dentro de la escena ------------------------------------
  seleccion:   '#ffe066',
  ruta:        'rgba(88,224,255,0.55)',
  bloqueado:   'rgba(232,90,74,0.35)'
};
