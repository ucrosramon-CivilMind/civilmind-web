import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const run = env => spawnSync(process.execPath, ['scripts/preparar-despiece.mjs'], {
  env: { ...process.env, ...env }, encoding: 'utf8',
});
for (const input of ['', 'http://servidor.example', 'https://servidor.example/ruta', 'https://usuario:clave@servidor.example']) {
  const r = run({ DESPIECE_APP_URL: input, CIVILMIND_LOCAL_QA: '' });
  assert.notEqual(r.status, 0, `Debe rechazarse ${input}`);
}
// Prueba positiva contra el servicio local autorizado para QA.
const origen = process.env.DESPIECE_QA_ORIGIN;
if (!origen) throw Error('Define DESPIECE_QA_ORIGIN con el servidor local de prueba');
const valido = run({ DESPIECE_APP_URL: origen, CIVILMIND_LOCAL_QA: '1' });
assert.equal(valido.status, 0, valido.stderr);
const catalogo = fs.readFileSync('dist-site/calculadoras.html', 'utf8');
assert.equal((catalogo.match(/class="calc-card(?: placeholder)?"/g) ?? []).length, 7);
const pagina = fs.readFileSync('dist-site/despiece-concreto.html', 'utf8');
assert.ok(pagina.includes(`${origen}/?embed=true#despiece-estructural`));
assert.ok(!pagina.includes('__DESPIECE_APP_URL__'));
assert.ok(!fs.existsSync('dist-site/.env.example'));
assert.ok(!fs.existsSync('dist-site/scripts'));
console.log('OK: URL ausente/insegura inválida, publicación condicionada a health, siete tarjetas, iframe configurado y fuentes no publicadas.');
