// Pruebas automáticas de SC360: simulan a un jugador real (celular) completando
// el test y el Post Partido, con la base de datos simulada (no toca datos reales).
// Los archivos de prueba (*.spec.js) están en la raíz del repositorio.
const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  testIgnore: ['node_modules/**'],
  timeout: 90000,
  retries: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:8080', ...devices['Pixel 7'], launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {} },
  webServer: { command: 'npx http-server . -p 8080 -s -c-1', port: 8080, reuseExistingServer: true },
});
