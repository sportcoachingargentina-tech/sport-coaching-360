const { test, expect } = require('@playwright/test');
const { simularServidor } = require('./ayudas');

async function completarTest(page) {
  await page.goto('/index.html');
  await page.fill('#f-nombre', 'Jugador'); await page.fill('#f-apellido', 'Prueba');
  await page.selectOption('#f-nac-d', '15'); await page.selectOption('#f-nac-m', '3'); await page.selectOption('#f-nac-a', '2008');
  for (const sel of ['#f-deporte', '#f-pos']) {
    const vals = await page.$eval(sel, (e) => [...e.options].map((o) => o.value).filter(Boolean));
    if (vals.length) await page.selectOption(sel, vals[0]);
  }
  await page.fill('#f-club', 'Club Prueba'); await page.fill('#f-cat', '2008');
  await page.evaluate(() => startTest());
  for (let i = 0; i < 200; i++) {
    if (await page.evaluate(() => document.querySelector('.screen.active')?.id === 's-results')) break;
    const opt = await page.$('.opt'); if (opt) await opt.click();
    const btn = page.locator('#btn-next');
    if (await btn.isDisabled()) throw new Error('El test quedó trabado en la pregunta ' + i);
    await btn.click();
  }
}

test('el test inicial se guarda y muestra el resultado', async ({ page }) => {
  const srv = await simularServidor(page);
  await completarTest(page);
  await expect(page.locator('#s-results')).toHaveClass(/active/);
  await expect.poll(() => srv.guardados.includes('resultados'), { timeout: 8000 }).toBeTruthy();
});

test('el test se guarda aunque no carguen los gráficos', async ({ page }) => {
  const srv = await simularServidor(page, { sinGraficos: true });
  await completarTest(page);
  await expect.poll(() => srv.guardados.includes('resultados'), { timeout: 8000 }).toBeTruthy();
});
