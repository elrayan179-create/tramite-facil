// Servidor local mínimo para ver la carpeta dist/ (solo para pruebas en tu ordenador)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.svg':'image/svg+xml', '.xml':'application/xml', '.txt':'text/plain' };
const port = process.env.PORT || 8080;
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join('dist', p);
  if (!file.startsWith('dist')) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404, {'Content-Type':'text/html; charset=utf-8'}); return res.end(fs.readFileSync('dist/404.html')); }
  res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Vista previa en http://localhost:${port}  (Ctrl+C para parar)`));
