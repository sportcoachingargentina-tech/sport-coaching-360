const { test, expect } = require('@playwright/test');
// "Guardar primero": si un guardado falla, queda en el dispositivo y se reenvía solo
test('un guardado sin señal queda pendiente y se envía al volver la conexión', async ({ page }) => {
  let falla = true; const enviados = [];
  await page.route('**/*', async (route) => {
    const u = route.request().url(), m = route.request().method();
    if (u.includes('supabase.co')) {
      if (u.includes('errores_app')) return route.fulfill({ status: 201, body: '' });
      if (m === 'POST') { if (falla) return route.abort(); enviados.push(u.split('/rest/v1/')[1]); return route.fulfill({ status: 201, body: '' }); }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (u.startsWith('http://localhost')) return route.continue();
    return route.fulfill({ status: 200, body: '' });
  });
  await page.goto('/nutricion.html');
  await page.evaluate(() => window.SC360_guardarPendiente('entreno_jugador', { jugador_nombre: 'Prueba' }));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sc360_pendientes') || '[]').length)).toBe(1);
  falla = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(() => enviados.includes('entreno_jugador'), { timeout: 8000 }).toBeTruthy();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('sc360_pendientes') || '[]').length)).toBe(0);
});
