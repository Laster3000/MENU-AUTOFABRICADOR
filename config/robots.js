/* =====================================================================
   AUTOFABRICADOR · AGENTES (personajes de la interfaz)
   ---------------------------------------------------------------------
   IMPORTANTE: son personajes visuales, NO modelos de IA ni agentes
   instalados. Cada uno representa una fase del motor real.

   AÑADIR UN AGENTE = añadir un bloque aquí. El menú crea solo su puesto,
   su cartel, su baldosa, su sitio en la zona de descanso, su fila en
   Agentes y su caja en el mapa de dependencias.

   Campos
     id          obligatorio · único, en minúsculas
     nombre      obligatorio · lo que se ve en carteles y paneles
     rol         obligatorio · texto del rol
     fase        fase del flujo que cubre (config/flujo.js); sin fase = apoyo
     depende     agentes que tienen que terminar antes, p. ej. ['validador']
     sala        sala donde va su puesto (config/escena.js); por defecto la última
     puesto      { tipo: 'escritorio' } mueble del puesto si hay que crearlo
     cuerpo / acento / visor / voz   colores (si faltan se eligen solos)
     accesorio   portapapeles | antena-doble | auriculares | gafas |
                 lupa | casco | gorra | escoba | ninguno
     ruedas      true = se mueve sobre ruedas en vez de piernas
     velocidad   píxeles de escena por segundo (por defecto 46)
     descripcion lo que dice MIRAR

   Ejemplo (descomenta para probar): un DOCUMENTADOR entre la validación
   y el empaquetado. Añade también 'documentador' al "depende" del
   EMPAQUETADOR para que espere a que termine.
     { id: 'documentador', nombre: 'DOCUMENTADOR', rol: 'Documentación', fase: 'docs',
       depende: ['validador'], sala: 'ala-ver', puesto: { tipo: 'escritorio' },
       descripcion: 'Escribe el manual del programa antes de empaquetarlo.' },
   ===================================================================== */
window.AF = window.AF || {};

AF.ROBOTS = [
  { id: 'recepcion',     nombre: 'RECEPCION',     rol: 'Recepción',     fase: 'intake', depende: [],
    cuerpo: '#e8e2d2', acento: '#3fa9f5', visor: '#58e0ff', voz: '#ffd75e',
    accesorio: 'portapapeles', velocidad: 46,
    descripcion: 'Recibe encargos y comprueba que traen entre 5 y 80 pruebas del propietario.' },

  { id: 'planificador',  nombre: 'PLANIFICADOR',  rol: 'Planificación', fase: 'plan', depende: ['recepcion'],
    cuerpo: '#d8dce8', acento: '#b070ff', visor: '#d090ff', voz: '#d8a8ff',
    accesorio: 'antena-doble', velocidad: 44,
    descripcion: 'Analiza el contrato y prepara el plan para el modelo local.' },

  { id: 'programador',   nombre: 'PROGRAMADOR',   rol: 'Programación',  fase: 'codigo', depende: ['planificador'],
    cuerpo: '#eeeeee', acento: '#38e070', visor: '#7cffa0', voz: '#7cffa0',
    accesorio: 'auriculares', velocidad: 46,
    descripcion: 'Representa la generación local de código (LOCAL-CODER).' },

  { id: 'cientifico',    nombre: 'CIENTIFICO',    rol: 'Laboratorio',   fase: 'pruebas', depende: ['programador'],
    cuerpo: '#f4f2ec', acento: '#e04aa8', visor: '#ff8ad0', voz: '#ff9ad8',
    accesorio: 'gafas', bata: true, velocidad: 44,
    descripcion: 'Ejecuta las pruebas WASI y Chrome offline (VERIFIER).' },

  { id: 'validador',     nombre: 'VALIDADOR',     rol: 'Validación',    fase: 'validacion', depende: ['cientifico'],
    cuerpo: '#e6e6de', acento: '#4ad06a', visor: '#9cff9c', voz: '#b8ff7a',
    accesorio: 'lupa', velocidad: 46,
    descripcion: 'Verifica manifiestos, fuentes y recibos (PROMOTER).' },

  { id: 'empaquetador',  nombre: 'EMPAQUETADOR',  rol: 'Empaquetado',   fase: 'entrega', depende: ['validador'],
    cuerpo: '#f0b030', acento: '#ffe080', visor: '#58e0ff', voz: '#ffc060',
    accesorio: 'casco', velocidad: 46,
    descripcion: 'Genera el ZIP y registra su SHA-256.' },

  { id: 'transportista', nombre: 'TRANSPORTISTA', rol: 'Logística',     fase: null, transportista: true,
    cuerpo: '#e89a30', acento: '#ffd060', visor: '#58e0ff', voz: '#ffb070',
    accesorio: 'gorra', velocidad: 56,
    descripcion: 'Traslada la caja del encargo entre puestos. Simboliza artefactos y dependencias.' },

  { id: 'limpiador',     nombre: 'LIMPIADOR',     rol: 'Limpieza',      fase: null, limpiador: true, puestoId: 'st-limpieza',
    cuerpo: '#f0c040', acento: '#58e0ff', visor: '#58e0ff', voz: '#9fe8ff',
    accesorio: 'escoba', ruedas: true, velocidad: 42,
    descripcion: 'Detecta residuos, los recoge uno a uno y los deposita en el contenedor. Solo en la simulación.' }
];
