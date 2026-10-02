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
  await expect(page.locator('#s-form')).toHaveClass(/active/);
  expect(await page.evaluate(() => !!localStorage.getItem('sc360_pp_pendiente'))).toBeTruthy();
  srv.falla = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.locator('#s-thanks')).toHaveClass(/active/);
  expect(srv.guardados).toContain('postpartido_jugador');
});
