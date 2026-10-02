// Simula Supabase y servicios externos. "falla" permite probar cortes de señal.
async function simularServidor(page, opciones = {}) {
  const estado = { guardados: [], errores: [], mails: 0, falla: !!opciones.falla };
  await page.route('**/*', async (route) => {
    const req = route.request(), url = req.url(), m = req.method();
    if (url.includes('supabase.co')) {
      if (url.includes('/rest/v1/errores_app')) { estado.errores.push(req.postData()); return route.fulfill({ status: 201, body: '' }); }
      if (m === 'POST' || m === 'PATCH') {
        if (estado.falla) return route.abort();
        estado.guardados.push(url.split('/rest/v1/')[1].split('?')[0]);
        return route.fulfill({ status: 201, contentType: 'application/json', body: '[{"id":"00000000-0000-0000-0000-000000000001"}]' });
      }
      if (url.includes('partidos?codigo')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: '1', codigo: 'PPTEST', grupo_codigo: 'G1', grupo_nombre: 'Primera', rival: 'River', fecha: '2026-09-28' }]) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.includes('formspree')) { estado.mails++; return route.fulfill({ status: 200, body: '{}' }); }
    if (url.includes('@supabase/supabase-js')) {
      // Librería de Supabase (la usa el panel para el login): copia local si existe
      const fs = require('fs'), path = require('path');
      const local = [path.join(__dirname, 'node_modules'), path.join(__dirname, '..', 'node_modules')].map((d) => path.join(d, '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js')).find((f) => fs.existsSync(f));
      if (local) return route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(local, 'utf8') });
      return route.continue();
    }
    if (opciones.sinGraficos && (url.includes('cdnjs') || url.includes('jsdelivr'))) return route.abort();
    if (url.includes('cdnjs') || url.includes('jsdelivr')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){return{destroy:function(){},update:function(){}}};' });
    if (url.startsWith('http://localhost')) return route.continue();
    return route.fulfill({ status: 200, body: '' });
  });
  return estado;
}
module.exports = { simularServidor };
