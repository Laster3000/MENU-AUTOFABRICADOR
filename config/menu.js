/* =====================================================================
   AUTOFABRICADOR · MENÚ
   ---------------------------------------------------------------------
   Pestañas superiores, verbos de aventura y controles inferiores.
   - Para añadir una pestaña: añade { id, texto, icono, ventana }.
     La ventana se registra en js/ventanas.js con AF.ventanas.registrar().
   - Iconos disponibles: ver AF.ICONOS más abajo (dibujos de 12×12).
   ===================================================================== */
window.AF = window.AF || {};

AF.MENU = {
  titulo: 'AUTOFABRICADOR',
  subtitulo: 'FÁBRICA AUTÓNOMA DE SOFTWARE',

  pestanas: [
    { id: 'fabrica',     texto: 'Fábrica',     icono: 'casa',      ventana: null },        // cierra ventanas
    { id: 'encargos',    texto: 'Encargos',    icono: 'pergamino', ventana: 'encargos' },
    { id: 'agentes',     texto: 'Agentes',     icono: 'robot',     ventana: 'agentes' },
    { id: 'dependencias', texto: 'Dependencias', icono: 'red',     ventana: 'dependencias' },
    { id: 'laboratorio', texto: 'Laboratorio', icono: 'matraz',    ventana: 'laboratorio' },
    { id: 'historial',   texto: 'Historial',   icono: 'libro',     ventana: 'historial' },
    { id: 'editor',      texto: 'Editor',      icono: 'lapiz',     ventana: 'editor' },
    { id: 'ajustes',     texto: 'Ajustes',     icono: 'engranaje', ventana: 'ajustes' },
    { id: 'aventura',    texto: 'Aventura',    icono: 'espada',    ventana: 'aventura' },
    { id: 'ayuda',       texto: '?',           icono: null,        ventana: 'ayuda' }
  ],

  /* Verbos estilo aventura gráfica (rejilla 3×3).
     tecla: atajo de teclado.  Clic derecho = MIRAR siempre. */
  verbos: [
    { id: 'mirar',  texto: 'Mirar',  tecla: 'm' },
    { id: 'hablar', texto: 'Hablar', tecla: 'h' },
    { id: 'usar',   texto: 'Usar',   tecla: 'u' },
    { id: 'abrir',  texto: 'Abrir',  tecla: 'a' },
    { id: 'cerrar', texto: 'Cerrar', tecla: 'c' },
    { id: 'coger',  texto: 'Coger',  tecla: 'g' },
    { id: 'mover',  texto: 'Mover',  tecla: 'v' },
    { id: 'seguir', texto: 'Seguir', tecla: 's' },
    { id: 'tirar',  texto: 'Tirar basura', tecla: 't' }
  ],
  verboPorDefecto: 'mirar',

  velocidades: [1, 2, 3],

  // Botones del panel de bienvenida
  bienvenida: { botonA: 'Iniciar', botonB: 'Ver cola' }
};

/* Iconos pixel 12×12. Cada letra es un color de la paleta de abajo; '.' = transparente.
   Puedes dibujar los tuyos con el mismo formato. */
AF.ICONOS_PALETA = { k: '#1a1018', w: '#f4ecd8', y: '#f0c040', o: '#b07820', r: '#e85a4a', g: '#4ad06a',
                     b: '#58b8f0', c: '#58e0ff', p: '#d090ff', s: '#8796a6', d: '#5a3418', m: '#9a6232' };
AF.ICONOS = {
  red:       ['............','.kkk....kkk.','.kbk....kgk.','.kkkk..kkkk.','...k.kk.k...','....kyyk....',
              '....kyyk....','...k.kk.k...','.kkkk..kkkk.','.kpk....krk.','.kkk....kkk.','............'],
  espada:    ['..........kk','.........kwk','........kwk.','.......kwk..','......kwk...','..k..kwk....',
              '..kkkwk.....','...kok......','..kokkk.....','.kok..k.....','kok.........','kk..........'],
  casa:      ['.....kk.....','....kyyk....','...kyyyyk...','..kyyyyyyk..','.kyyyyyyyyk.','kkkkkkkkkkkk',
              '.kmmmmmmmmk.','.kmkkmmwwmk.','.kmkkmmwwmk.','.kmkkmmmmmk.','.kmkkmmmmmk.','.kkkkkkkkkk.'],
  pergamino: ['..kkkkkkkk..','.kwwwwwwwwk.','kowwwwwwwwok','.kwkkkkkkwk.','.kwwwwwwwwk.','.kwkkkkkwwk.',
              '.kwwwwwwwwk.','.kwkkkkkkwk.','.kwwwwwwwwk.','kowwwwwwwwok','.kkkkkkkkkk.','............'],
  robot:     ['.....kk.....','.....rk.....','..kkkkkkkk..','.kwwwwwwwwk.','.kwkkkkkkwk.','.kwkckkckwk.',
              '.kwkkkkkkwk.','.kwwwwwwwwk.','..kkkkkkkk..','.kswwwwwwsk.','.kswbbbbwsk.','..kkkkkkkk..'],
  matraz:    ['....kkkk....','....kwwk....','....kwwk....','....kwwk....','...kwwwwk...','..kwwwwwwk..',
              '.kwppppppwk.','.kppwpppppk.','kpppppwpppk.','kppppppppppk','.kkkkkkkkkk.','............'],
  libro:     ['.kkkkkkkkkk.','krrrrrrrrrwk','krryyyyrrrwk','krrrrrrrrrwk','krrrrrrrrrwk','krryyyyyrrwk',
              'krrrrrrrrrwk','krrrrrrrrrwk','krrrrrrrrrwk','kkkkkkkkkkwk','.kwwwwwwwwwk','..kkkkkkkkk.'],
  engranaje: ['....kkkk....','..k.kssk.k..','.kskssssksk.','..kssssssk..','kkssskkssskk','kssskwwksssk',
              'kssskwwksssk','kkssskkssskk','..kssssssk..','.kskssssksk.','..k.kssk.k..','....kkkk....'],
  lapiz:     ['.........kk.','........krrk','.......kyrk.','......kyyk..','.....kyyk...','....kyyk....',
              '...kyyk.....','..kyyk......','.kwyk.......','.kwk........','kkk.........','............'],
  play:      ['..k.........','..kk........','..kgk.......','..kggk......','..kgggk.....','..kggggk....',
              '..kggggk....','..kgggk.....','..kggk......','..kgk.......','..kk........','..k.........'],
  pausa:     ['............','.kkkk..kkkk.','.kyyk..kyyk.','.kyyk..kyyk.','.kyyk..kyyk.','.kyyk..kyyk.',
              '.kyyk..kyyk.','.kyyk..kyyk.','.kyyk..kyyk.','.kyyk..kyyk.','.kkkk..kkkk.','............'],
  stop:      ['............','.kkkkkkkkkk.','.krrrrrrrrk.','.krrrrrrrrk.','.krrrrrrrrk.','.krrrrrrrrk.',
              '.krrrrrrrrk.','.krrrrrrrrk.','.krrrrrrrrk.','.krrrrrrrrk.','.kkkkkkkkkk.','............'],
  reloj:     ['...kkkkkk...','..kwwwwwwk..','.kwwwwkwwwk.','kwwwwwkwwwwk','kwwwwwkwwwwk','kwwwwwkkkwwk',
              'kwwwwwwwwwwk','kwwwwwwwwwwk','.kwwwwwwwwk.','..kwwwwwwk..','...kkkkkk...','............'],
  caja:      ['............','..kkkkkkkk..','.kmmmmmmmmk.','kkkkkkkkkkkk','kmmmmyymmmmk','kmmmmyymmmmk',
              'kddddddddddk','kmmmmmmmmmmk','kmmmmmmmmmmk','kddddddddddk','kkkkkkkkkkkk','............']
};
