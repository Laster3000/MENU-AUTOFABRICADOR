/* V2: navegación legible y controles de presentación. No conecta APIs, no altera tareas. */
(function () {
 'use strict';
 const cfg = {
   puntos:[
     {id:'st-intake',texto:'Recepción'}, {id:'st-ia',texto:'IA central'},
     {id:'st-codigo',texto:'Programación'}, {id:'st-lab',texto:'Laboratorio'},
     {id:'st-val',texto:'Validación'}, {id:'st-entrega',texto:'Entregas'}
   ],
   anuncioInicial:'Vista ilustrada • Actividad simulada, sin conexión al motor real.'
 };
 let iniciado=false;
 function arranque(){
   if(iniciado) return;
   if(!window.AF || !AF.motor || !AF.ESCENA || !AF.estado) return;
   const box=document.getElementById('experienciaV2'); if(!box)return;
   iniciado=true;
   const target=box.querySelector('.af-v2-jump');
   const msg=document.getElementById('af-v2-msg');
   const settings=document.getElementById('af-v2-settings');
   const mensaje=t=>{msg.textContent=t;};
   mensaje(cfg.anuncioInicial);
   for(const punto of cfg.puntos){
     const button=document.createElement('button');button.type='button';button.textContent=punto.texto;
     button.dataset.stationId=punto.id;button.setAttribute('aria-label','Enfocar '+punto.texto);
     button.addEventListener('click',()=>{
       const objeto=AF.mundo && AF.mundo.objetos && AF.mundo.objetos.find(o=>o.id===punto.id);
       if(!objeto){mensaje('Puesto no disponible: '+punto.texto);return;}
       AF.estado.siguiendo=null;AF.motor.inercia=0;
       const half=AF.ESCENA.vista.ancho/2;
       AF.motor.camObjetivo=AF.util.limitar(objeto.x-half,0,AF.ESCENA.mundo.ancho-AF.ESCENA.vista.ancho);
       target.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
       mensaje('Enfocando '+punto.texto+' · '+(objeto.descripcion||'Puesto de trabajo'));
     });
     button.setAttribute('aria-pressed','false');target.appendChild(button);
   }
   const rutas=document.createElement('button');rutas.type='button';rutas.textContent='Ver rutas';
   const updateRutas=()=>rutas.setAttribute('aria-pressed',String(!!AF.estado.ajustes.verNavegacion));
   updateRutas();rutas.onclick=()=>{AF.estado.ajustes.verNavegacion=!AF.estado.ajustes.verNavegacion;AF.guardarAjustes();updateRutas();mensaje(AF.estado.ajustes.verNavegacion?'Rutas y obstáculos visibles.':'Rutas ocultas.');};
   settings.appendChild(rutas);
   const motion=document.createElement('button');motion.type='button';motion.textContent='Reducir movimiento';
   const updateMotion=()=>motion.setAttribute('aria-pressed',String(!!AF.estado.ajustes.movimientoReducido));
   updateMotion();motion.onclick=()=>{AF.estado.ajustes.movimientoReducido=!AF.estado.ajustes.movimientoReducido;AF.guardarAjustes();updateMotion();mensaje(AF.estado.ajustes.movimientoReducido?'Movimiento ambiental reducido.':'Movimiento ambiental normal.');};
   settings.appendChild(motion);
   const ayuda=document.createElement('button');ayuda.type='button';ayuda.textContent='¿Cómo funciona?';
   ayuda.onclick=()=>{if(AF.ventanas&&AF.ventanas.abrir)AF.ventanas.abrir('ayuda');mensaje('Abierta la ayuda original del menú.');};
   settings.appendChild(ayuda);
   if(AF.eventos&&AF.eventos.escuchar){
     AF.eventos.escuchar(ev=>{
       if(ev.source!=='demo'||!ev.mensaje) return;
       if(['APP_READY','TASK_STARTED','TASK_FAILED','JOB_FINISHED','AGENT_INVALID'].includes(ev.type))
         mensaje('[SIMULACIÓN] '+ev.mensaje);
     });
   }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arranque,{once:true}); else arranque();
})();