/* ═══════════════════════════════════════════════════════════════
   SC360 · Monitoreo de errores (se incluye en todas las pantallas)
   • Registra en Supabase (tabla errores_app) los errores de JavaScript,
     los recursos que no cargan y los guardados que fallan.
   • Si el error es crítico (un guardado que falla, o un error en una
     pantalla de jugador), además manda un mail de aviso.
   • No guarda respuestas ni datos personales: solo qué falló y dónde.
   • Si este archivo no carga, la app funciona igual.
   ═══════════════════════════════════════════════════════════════ */
(function(){
  if(window.__SC360_MONITOR) return; window.__SC360_MONITOR=true;
  var SB='https://gltqhcnusblfovhxljcs.supabase.co';
  var K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsdHFoY251c2JsZm92aHhsamNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzM4NDQsImV4cCI6MjA5MTI0OTg0NH0.FrRzvRzz0k4b3jgHpGsxA10enM9AuSSXTPo7PAgVAXI';
  var MAIL='https://formspree.io/f/mvzvlaoo';
  var PAGINA=((location.pathname.split('/').pop()||'index').replace(/\.html$/,''))||'index';
  // Pantallas donde un error puede hacer perder respuestas de jugadores o del DT
  var CRITICAS={index:1,postpartido:1,dtpf:1,entreno:1,nutricion:1,jugador:1,gimnasio:1};
  var enviados=0, vistos={}, mails=0;
  var of=window.fetch;
  function registrar(tipo,mensaje,detalle,critico){
    try{
      mensaje=String(mensaje||'Error').slice(0,500);
      var clave=tipo+'|'+mensaje; if(vistos[clave]||enviados>=10) return; vistos[clave]=1; enviados++;
      var body={pagina:PAGINA,tipo:tipo,mensaje:mensaje,detalle:detalle?String(detalle).slice(0,2000):null,
        url:(location.pathname+location.search).slice(0,200),dispositivo:(navigator.userAgent||'').slice(0,250),critico:!!critico};
      of.call(window,SB+'/rest/v1/errores_app',{method:'POST',keepalive:true,
        headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(body)}).catch(function(){});
      if(critico&&mails<2){ mails++;
        of.call(window,MAIL,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',Accept:'application/json'},
          body:JSON.stringify({_subject:'⚠ SC360 · error en '+PAGINA,Pantalla:PAGINA,Tipo:tipo,Error:mensaje,Detalle:body.detalle||'',Dispositivo:body.dispositivo,Hora:new Date().toLocaleString('es-AR')})}).catch(function(){});
      }
    }catch(e){}
  }
  // Errores de JavaScript y recursos que no cargan (por ejemplo, una librería externa)
  window.addEventListener('error',function(e){
    var t=e&&e.target;
    if(t&&t!==window&&(t.src||t.href)){
      // Ignorar imágenes vacías (src="" se resuelve como la propia página y no es un error real)
      var attr=(t.getAttribute&&(t.getAttribute('src')||t.getAttribute('href')))||'';
      var u=t.src||t.href; if(!attr||u===location.href||u.split('#')[0]===location.href.split('#')[0]) return;
      registrar('recurso','No cargó: '+u,null,false); return;
    }
    registrar('js',e.message||'Error de JavaScript',(e.filename||'')+':'+(e.lineno||'')+':'+(e.colno||'')+(e.error&&e.error.stack?'\n'+e.error.stack:''),!!CRITICAS[PAGINA]);
  },true);
  window.addEventListener('unhandledrejection',function(e){
    var r=e&&e.reason; registrar('js','Promesa sin manejar: '+(r&&r.message||r),r&&r.stack,!!CRITICAS[PAGINA]);
  });
  // Guardados que fallan (cualquier escritura a la base que no devuelva OK)
  if(of){
    window.fetch=function(u,o){
      var p=of.apply(this,arguments);
      try{
        var url=String(u&&u.url||u), m=String(o&&o.method||(u&&u.method)||'GET').toUpperCase();
        // Lecturas mal armadas (error 400): por ejemplo, pedir una columna que no existe.
        // No pierden datos, pero hacen que una pantalla muestre "sin datos" sin motivo.
        if(url.indexOf('/rest/v1/')>=0&&m==='GET'){
          var tablaL=url.split('/rest/v1/')[1].split('?')[0];
          p.then(function(res){ if(res&&res.status===400){ res.clone().text().then(function(t){ registrar('consulta','Consulta con error en '+tablaL+' (400)',t,false); }).catch(function(){}); } }).catch(function(){});
        }
        if(url.indexOf('/rest/v1/')>=0&&url.indexOf('errores_app')<0&&m!=='GET'&&m!=='HEAD'&&m!=='OPTIONS'){
          var tabla=url.split('/rest/v1/')[1].split('?')[0];
          p.then(function(res){ if(res&&!res.ok){ var esLectura=tabla.indexOf('rpc/')===0&&res.status===404; res.clone().text().then(function(t){ registrar(esLectura?'consulta':'guardado',(esLectura?'Función no disponible: ':'Falló '+m+' en ')+tabla+' ('+res.status+')',t,!esLectura); }).catch(function(){}); } })
           .catch(function(err){ registrar('red','Sin conexión al guardar en '+tabla,String(err),false); });
        }
      }catch(e){}
      return p;
    };
  }
  window.SC360_reportar=registrar;
})();
