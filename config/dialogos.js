/* =====================================================================
   AUTOFABRICADOR · DIÁLOGOS
   ---------------------------------------------------------------------
   Frases que dicen los robots. Puedes cambiar o añadir líneas: si hay
   varias en una lista, se elige una al azar.
   Marcadores: {robot} {encargo} {n} {fase} {estacion}

   - "eventos": frases OPERATIVAS, siempre ligadas a un evento (se puede
     inspeccionar su causa con el verbo MIRAR sobre el robot).
   - "ambiente": frases de AMBIENTACIÓN. En pantalla llevan el prefijo ~
     y nunca cuentan como trabajo real.
   ===================================================================== */
window.AF = window.AF || {};

AF.DIALOGOS = {
  eventos: {
    JOB_ADMITTED:    ['Tenemos una misión nueva. La voy a registrar.', '¡Encargo recibido! Congelo sus {n} pruebas.'],
    PLAN_STARTED:    ['Analizo el contrato de {encargo}.', 'Preparo el plan para el modelo local.'],
    TASK_STARTED:    ['Me encargaron dos módulos. ¡Manos al teclado!', 'Código en marcha para {encargo}.'],
    TESTS_STARTED:   ['Ejecutando {n} casos en WASI y Chrome.', 'Pruebas en marcha. Nada de red, nada de trampas.'],
    TESTS_FAILED:    ['Hay {n} errores. Prepararé el informe.', 'Fallo detectado. Devuelvo el encargo a programación.'],
    TESTS_PASSED:    ['Las pruebas exigidas han terminado correctamente.'],
    VERIFY_STARTED:  ['Reviso manifiesto, fuentes y SHA-256.', 'Sin recibo no hay aprobación.'],
    VERIFY_PASSED:   ['¡Validación correcta! Pasando a empaquetado.'],
    PACKAGE_STARTED: ['Empaqueto el ZIP y grabo su SHA.'],
    JOB_SUCCEEDED:   ['El paquete está preparado y documentado.'],
    TASK_DONE:       ['Fase de {fase} terminada.', 'Listo. Aviso a TRANSPORTISTA.'],
    STATION_BUSY:    ['La estación está ocupada. Espero mi turno.'],
    DOOR_BLOCKED:    ['No puedo pasar: esta puerta está bloqueada.'],
    NO_PATH:         ['No encuentro ruta. Espero y vuelvo a calcular.'],
    CARGO_PICK:      ['Recojo la caja de {estacion}.'],
    CARGO_DROP:      ['Caja entregada en {estacion}.'],
    TRASH_SEEN:      ['Hay basura junto a {estacion}. Voy a recogerla.', 'Residuo detectado. ¡Allá voy!'],
    TRASH_GONE:      ['El residuo ya no está. Busco el siguiente.'],
    TRASH_DONE:      ['Residuo depositado. ¡Así mantenemos la fábrica en orden!'],
    BIN_FULL:        ['El contenedor está lleno. Solicito vaciado.'],
    STOP_REQUESTED:  ['Orden de parada recibida. Termino en una frontera segura.'],
    STOPPED:         ['Detenido en frontera segura.'],
    JOB_BLOCKED:     ['Sin pruebas del propietario no llamo a la IA. Bloqueado.'],
    PHASE_STARTED:   ['Empiezo con {fase} de {encargo}.'],
    ORDER_RECEIVED:  ['¡Pedido recibido! Lo pongo en la cola.', 'Pedido apuntado. En cuanto toque, empezamos.'],
    // coger y soltar robots (verbo COGER o arrastrar con el ratón)
    AGENT_GRABBED:   ['¡Eh! ¡Bájame!', '¡Que me mareo!', '¡Uy! ¿A dónde vamos?', '¡Mi trabajo se queda a medias!'],
    AGENT_RUSH:      ['¡Mi puesto! ¡Mi puesto!', '¡Voy, voy, voy!', '¡Que se me enfría el trabajo!'],
    AGENT_RESUMED:   ['Uf. Sigo donde lo dejé ({pct} %).', '¡Ya estoy! Continúo.'],
    AGENT_DIZZY:     ['Todo da vueltas... Vuelvo al descanso.', 'Qué viaje. Me voy al sofá.']
  },

  ambiente: {
    recepcion:   ['¿Quién ha dejado un pergamino aquí?', 'Los formularios en orden alfabético, por favor.'],
    planificador:   ['El núcleo está tibio. Buena señal.', 'Pienso, luego compilo.'],
    programador:  ['¿Punto y coma o no punto y coma?', 'Este teclado necesita aceite.'],
    cientifico:   ['Ese matraz burbujea más de la cuenta...', 'La ciencia es repetir hasta que salga igual.'],
    validador: ['Confía, pero verifica.', 'Este SHA me suena de algo.'],
    empaquetador:  ['Cinta engrasada y lista.', 'Me encantan las cajas. Las cajas me entienden.'],
    transportista: ['Brazos listos para la próxima caja.', 'Ruta despejada... de momento.'],
    limpiador:   ['Esta baldosa brilla como un doblón.', 'Barrer es casi una filosofía.']
  },

  // Respuestas al verbo HABLAR (opciones de diálogo estilo aventura)
  conversacion: {
    opciones: [
      { id: 'estado',  texto: '¿Qué estás haciendo?' },
      { id: 'quien',   texto: '¿Quién eres?' },
      { id: 'deps',    texto: '¿De quién dependes?' },
      { id: 'consejo', texto: '¿Algún consejo?' },
      { id: 'descansar', texto: 'Vete a descansar.' },
      { id: 'adios',   texto: 'Nada, sigue con lo tuyo.' }
    ],
    consejo: [
      'Un encargo sin pruebas no entra a la fábrica.',
      'Si algo sale UNKNOWN, se reconcilia. Nunca se repite a ciegas.',
      'Lo que ves aquí es una simulación. El motor real va por su cuenta.',
      'Puedes mover muebles con el verbo MOVER. Si bloqueas un pasillo, te avisaré.',
      'Si me coges mientras trabajo, saldré corriendo a mi puesto en cuanto me sueltes.'
    ],
    adios: ['¡Hasta luego!', 'De acuerdo, jefe.', 'Vuelvo al tajo.']
  },

  // Mensaje del asistente de bienvenida (panel superior izquierdo)
  bienvenida: '¡Buenos días! Tenemos {cola} encargos en cola. La fábrica está en modo DEMO y todos los agentes están listos. ¿Iniciamos el siguiente?'
};
