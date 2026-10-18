import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist-site');
const raw = process.env.DESPIECE_APP_URL;
if (!raw) throw Error('Falta DESPIECE_APP_URL. Configura el origen HTTPS real de Render antes de publicar la tarjeta.');
const url = new URL(raw);
const local = process.env.CIVILMIND_LOCAL_QA === '1' && ['localhost', '127.0.0.1'].includes(url.hostname);
if ((!local && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash ||
    url.pathname !== '/' || url.origin !== raw.replace(/\/$/, '')) {
  throw Error('DESPIECE_APP_URL debe ser un origen HTTPS, sin ruta, credenciales ni parámetros.');
}
const health = await fetch(`${url.origin}/api/health`, { signal: AbortSignal.timeout(60000) });
if (!health.ok || (await health.json()).service !== 'civilmind-despiece') {
  throw Error('El destino no respondió como civilmind-despiece. No se publicará una tarjeta rota.');
}
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const file of fs.readdirSync(root)) {
  if (file.endsWith('.html')) {
    let html = fs.readFileSync(path.join(root, file), 'utf8');
    if (file === 'despiece-concreto.html') html = html.replaceAll('__DESPIECE_APP_URL__', url.origin);
    if (html.includes('__DESPIECE_APP_URL__')) throw Error(`Marcador sin resolver en ${file}`);
    fs.writeFileSync(path.join(out, file), html);
  }
}
for (const asset of ['assets', 'robots.txt', 'sitemap.xml', '_headers', '_redirects']) {
  if (fs.existsSync(path.join(root, asset))) fs.cpSync(path.join(root, asset), path.join(out, asset), { recursive: true });
}
const catalogo = fs.readFileSync(path.join(out, 'calculadoras.html'), 'utf8');
for (const link of ['calculadora.html', 'evaluacion-post-sismo.html', 'redes-hidrosanitarias.html',
  'memorias-nsr10.html', 'despiece-concreto.html']) {
  if (!catalogo.includes(`href="${link}"`) || !fs.existsSync(path.join(out, link))) throw Error(`Falta la calculadora ${link}`);
}
console.log('Sitio preparado: calculadoras existentes conservadas y origen del despiece validado.');
