const { test, expect } = require('@playwright/test');
const { simularServidor } = require('./ayudas');
// Cada pantalla tiene que abrir sin errores de JavaScript
for (const p of ['index.html', 'postpartido.html?partido=PPTEST', 'jugador.html?token=x', 'dtpf.html?partido=PPTEST', 'nutricion.html', 'panel.html']) {
  test('abre sin errores: ' + p, async ({ page }) => {
    await simularServidor(page);
    const errores = []; page.on('pageerror', (e) => errores.push(e.message));
    await page.goto('/' + p); await page.waitForTimeout(1500);
    expect(errores, errores.join(' | ')).toEqual([]);
  });
}
