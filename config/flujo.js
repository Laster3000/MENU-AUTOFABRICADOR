/* =====================================================================
   AUTOFABRICADOR · FLUJO DE TRABAJO (modo DEMO)
   ---------------------------------------------------------------------
   Fases que recorre cada encargo. El ORDEN y el AGENTE de cada fase
   salen de config/robots.js (campos fase y depende); aquí se ponen la
   duración, el puesto existente y los fallos. Una fase nueva sin
   'estacion' recibe un puesto creado automáticamente.
   Orden por defecto: Refleja el flujo real:
   INTAKE → (plan) → LOCAL-CODER → VERIFIER → PROMOTER → paquete ZIP.

   duracion   : segundos de trabajo simulado a velocidad x1
   probFallo  : probabilidad (0-1) de que la fase falle en DEMO
   siFalla    : fase a la que vuelve el encargo si falla
   maxReintentos : reintentos acotados (nunca bucles infinitos)
   evento     : tipo de evento sintético que se emite al empezar
   ===================================================================== */
window.AF = window.AF || {};

AF.FLUJO = {
  fases: [
    { id: 'intake',     nombre: 'Admisión',       estacion: 'st-intake',  robot: 'recepcion',   duracion: 4,
      rolReal: 'INTAKE',      evento: 'JOB_ADMITTED' },
    { id: 'plan',       nombre: 'Planificación',  estacion: 'st-ia',      robot: 'planificador',   duracion: 5,
      rolReal: 'SUPERVISOR',  evento: 'PLAN_STARTED' },
    { id: 'codigo',     nombre: 'Programación',   estacion: 'st-codigo',  robot: 'programador',  duracion: 8,
      rolReal: 'LOCAL-CODER', evento: 'TASK_STARTED' },
    { id: 'pruebas',    nombre: 'Pruebas',        estacion: 'st-lab',     robot: 'cientifico',   duracion: 6,
      rolReal: 'VERIFIER',    evento: 'TESTS_STARTED', probFallo: 0.35, siFalla: 'codigo', maxReintentos: 1 },
    { id: 'validacion', nombre: 'Validación',     estacion: 'st-val',     robot: 'validador', duracion: 4,
      rolReal: 'PROMOTER',    evento: 'VERIFY_STARTED' },
    { id: 'entrega',    nombre: 'Empaquetado',    estacion: 'st-entrega', robot: 'empaquetador',  duracion: 4,
      rolReal: 'PACKAGER',    evento: 'PACKAGE_STARTED' }
  ],

  // Encargos de ejemplo que aparecen en la cola al arrancar (solo DEMO)
  encargosDemo: [
    { objetivo: 'Calcula el triple de un número', exportName: 'calculateTriple', casos: 30, prioridad: 'normal' },
    { objetivo: 'Tarifa de aparcamiento con tope de 19 €', exportName: 'parkingFee', casos: 26, prioridad: 'alta' },
    { objetivo: 'Normaliza nombres de archivo', exportName: 'normalizeName', casos: 12, prioridad: 'normal' }
  ],

  // Reglas del contrato de entrada (iguales que el motor real)
  contrato: { minCasos: 5, maxCasos: 80, lenguaje: 'javascript' },

  // Ejecutar automáticamente el siguiente encargo de la cola al terminar uno
  encadenar: true
};
