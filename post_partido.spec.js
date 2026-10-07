const { test, expect } = require('@playwright/test');
const { simularServidor } = require('./ayudas');

async function completarPP(page) {
  await page.goto('/postpartido.html?partido=PPTEST');
  await page.fill('#f-nombre', 'Jugador Prueba'); await page.selectOption('#f-pos', 'Defensor'); await page.fill('#f-minutos', '90');
  await page.evaluate(() => startForm());
  for (let i = 0; i < 40; i++) {
    const escala = page.locator('.scale-btn').nth(6);
    if (await escala.count()) await escala.click();
    const btn = page.locator('#btn-next'); const texto = await btn.innerText();
    await btn.click();
    if (texto.includes('ENVIAR')) break;
  }
}

test('el Post Partido se guarda y muestra "Gracias"', async ({ page }) => {
  const srv = await simularServidor(page);
  await completarPP(page);
  await expect(page.locator('#s-thanks')).toHaveClass(/active/);
  expect(srv.guardados).toContain('postpartido_jugador');
});

test('si se corta la señal, el Post Partido queda guardado y se envía al volver', async ({ page }) => {
  const srv = await simularServidor(page, { falla: true });
  page.on('dialog', (d) => d.accept());
  await completarPP(page);
  // Esperar a que termine el intento fallido (antes se chequeaba demasiado rápido y la prueba fallaba a veces)
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem('sc360_pp_pendiente')), { timeout: 8000 }).toBeTruthy();
  await expect(page.locator('#s-form')).toHaveClass(/active/);
  srv.falla = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.locator('#s-thanks')).toHaveClass(/active/);
  expect(srv.guardados).toContain('postpartido_jugador');
});

test('el jugador elige su nombre de la lista del grupo', async ({ page }) => {
  const srv = await simularServidor(page);
  await page.route('**/rest/v1/rpc/jugadores_de_grupo', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ nombre: 'Pablo Coronel' }, { nombre: 'Javi Paz' }]) }));
  await page.goto('/postpartido.html?partido=PPTEST');
  await expect(page.locator('#f-nombre-sel')).toBeVisible();
  await page.selectOption('#f-nombre-sel', 'Javi Paz');
  await expect(page.locator('#f-nombre')).toHaveValue('Javi Paz');
  await page.selectOption('#f-nombre-sel', '__otro');
  await expect(page.locator('#f-nombre')).toBeVisible();
});

test('el jugador marca situaciones del partido y se guardan', async ({ page }) => {
  const srv = await simularServidor(page);
  let cuerpo = null;
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/rest/v1/postpartido_jugador')) cuerpo = r.postData(); });
  await page.goto('/postpartido.html?partido=PPTEST');
  await page.fill('#f-nombre', 'Jugador Prueba'); await page.selectOption('#f-pos', 'Defensor'); await page.fill('#f-minutos', '90');
  await page.evaluate(() => startForm());
  for (let i = 0; i < 40; i++) {
    const escala = page.locator('.scale-btn').nth(6);
    if (await escala.count()) await escala.click();
    const chip = page.locator('.sit-chip[data-k="gol_recibido"]');
    if (await chip.count()) { await chip.click(); await page.fill('#como-respondi', 'Respiré y pedí la pelota'); }
    const btn = page.locator('#btn-next'); const texto = await btn.innerText();
    await btn.click();
    if (texto.includes('ENVIAR')) break;
  }
  await expect(page.locator('#s-thanks')).toHaveClass(/active/);
  expect(cuerpo).toContain('gol_recibido');
  expect(cuerpo).toContain('Respiré y pedí la pelota');
});
