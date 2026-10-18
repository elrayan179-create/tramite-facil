// Generador estático de Trámite Fácil. Lee content/ y escribe la web completa en dist/.
import { marked } from 'marked';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'dist');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const site = JSON.parse(read('content/site.json'));
const BASE = (process.env.URL || site.url || '').replace(/\/$/, '');
const fail = (msg) => { console.error('\nERROR: ' + msg + '\n'); process.exit(1); };

/* ---------- utilidades ---------- */
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const fmtDate = (iso) => new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const isDate = (s) => /^\d{4}-\d{2}-\d{2}/.test(String(s || ''));

function val(s) {
  s = s.trim();
  if (s.startsWith('[') && s.endsWith(']')) return s.slice(1, -1).split(',').map(val).filter((x) => x !== '');
  if (s.length > 1 && s[0] === '"' && s.at(-1) === '"') return s.slice(1, -1).replace(/\\"/g, '"');
  if (s.length > 1 && s[0] === "'" && s.at(-1) === "'") return s.slice(1, -1).replace(/''/g, "'");
  if (s === 'true') return true;
  if (s === 'false') return false;
  return s;
}
// Lector mínimo de YAML (claves simples, listas con guiones, textos largos en varias líneas)
function parseYaml(src) {
  const items = {}; let key = null;
  for (const line of src.split('\n')) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const m = line.match(/^([\w-]+):(?:\s+(.*))?$/);
    if (m) { key = m[1]; const r = m[2] ?? ''; items[key] = { raw: /^[>|][+-]?$/.test(r) ? '' : r, list: null }; continue; }
    if (!key) continue;
    const li = line.match(/^\s*-\s+(.*)$/);
    if (li) { (items[key].list ??= []).push(li[1]); continue; }
    items[key].raw += (items[key].raw ? ' ' : '') + line.trim();
  }
  const o = {};
  for (const [k, { raw, list }] of Object.entries(items)) o[k] = list ? list.map(val) : val(raw);
  return o;
}
function parseFM(text, file) {
  const m = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) fail(`El archivo ${file} no empieza con el bloque de datos entre líneas "---".`);
  return { data: parseYaml(m[1]), body: m[2].trim() };
}
const plain = (md) => md.replace(/```[\s\S]*?```/g, ' ').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*_`>|]/g, ' ').replace(/^\s*(?:[-+]|\d+\.)\s+/gm, ' ').replace(/\s+/g, ' ').trim();

function addIds(html) {
  const toc = []; const used = new Set();
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (m, l, inner) => {
    const text = inner.replace(/<[^>]+>/g, '');
    let id = slugify(text) || 'seccion', n = 2; const base = id;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id); toc.push({ l: +l, id, text });
    return `<h${l} id="${id}">${inner}</h${l}>`;
  });
  html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" rel="noopener" target="_blank"');
  return { html, toc };
}
function extractFaq(md) {
  const sec = md.split(/^## /m).find((s) => /^preguntas frecuentes/i.test(s));
  if (!sec) return [];
  return sec.split(/^### /m).slice(1).map((b) => {
    const [q, ...r] = b.split('\n');
    return { q: q.trim(), a: r.join(' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim() };
  }).filter((f) => f.q && f.a);
}

/* ---------- iconos (trazo, 24x24) ---------- */
const ICONS = {
  identidad: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-2.2 5.4-2.2 6 0M14 10h4M14 14h4"/>',
  certificado: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  personas: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 3-6 6-6s6 2 6 6"/><circle cx="17" cy="9" r="2"/><path d="M16 14c3 0 5 2 5 5"/>',
  hacienda: '<path d="M3 9l9-5 9 5M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  casa: '<path d="M3 11l9-7 9 7M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  corazon: '<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z"/>',
  maletin: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 13h18"/>',
  pantalla: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>'
};
const icon = (name, size = 24) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
const LOGO = `<svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="7" fill="#0b2a4a"/><path d="M9 6h9l5 5v15H9z" fill="#fff"/><path d="M18 6v5h5" fill="#cfe6f7"/><path d="M12.5 19l2.8 2.8 5-5.6" fill="none" stroke="#0e8f8c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const catSvg = (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b2a4a"/><stop offset="1" stop-color="#1d5a8f"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="520" cy="60" r="150" fill="#fff" opacity=".05"/><circle cx="90" cy="330" r="120" fill="#14b8b4" opacity=".12"/><g transform="translate(320 180) scale(6) translate(-12 -12)" fill="none" stroke="#bfe9e8" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.icono] || ''}</g></svg>`;

/* ---------- datos ---------- */
const cats = Object.fromEntries(site.categorias.map((c) => [c.slug, c]));
const readDir = (dir) => (fs.existsSync(path.join(ROOT, dir)) ? fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.md')) : []);

const guides = [];
for (const f of readDir('content/guias')) {
  const { data, body } = parseFM(read('content/guias/' + f), f);
  if (data.borrador === true) continue;
  const slug = slugify(data.slug || f.replace(/\.md$/, ''));
  for (const k of ['title', 'descripcion', 'categoria']) if (!data[k]) fail(`La guía ${f} no tiene el campo "${k}".`);
  if (!cats[data.categoria]) fail(`La guía ${f} usa la categoría "${data.categoria}", que no existe. Categorías válidas: ${Object.keys(cats).join(', ')}.`);
  for (const k of ['fecha_publicacion', 'fecha_revision']) if (!isDate(data[k])) fail(`La guía ${f} necesita "${k}" con formato AAAA-MM-DD.`);
  const { html, toc } = addIds(marked.parse(body));
  const text = plain(body);
  const img = data.imagen || `/img/cat-${data.categoria}.svg`;
  guides.push({
    slug, url: `/guias/${slug}/`, title: data.title, desc: data.descripcion, cat: cats[data.categoria],
    pub: String(data.fecha_publicacion).slice(0, 10), rev: String(data.fecha_revision).slice(0, 10),
    min: Number(data.tiempo_lectura) || Math.max(1, Math.ceil(text.split(' ').length / 200)),
    img, alt: data.imagen_alt || (data.imagen ? data.title : `Ilustración de la categoría ${cats[data.categoria].nombre}`),
    keywords: Array.isArray(data.palabras_clave) ? data.palabras_clave : data.palabras_clave ? [data.palabras_clave] : [],
    featured: data.destacada === true, html, toc, faq: extractFaq(body), text
  });
}
const slugs = guides.map((g) => g.slug);
const dup = slugs.find((s, i) => slugs.indexOf(s) !== i);
if (dup) fail(`Hay dos guías con la misma dirección (slug): ${dup}`);
guides.sort((a, b) => b.pub.localeCompare(a.pub) || a.title.localeCompare(b.title, 'es'));

const pages = [];
for (const f of readDir('content/paginas')) {
  const { data, body } = parseFM(read('content/paginas/' + f), f);
  pages.push({ slug: slugify(data.slug || f.replace(/\.md$/, '')), title: data.title, desc: data.descripcion || '', html: marked.parse(body) });
}
const pageBySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));

/* ---------- plantillas ---------- */
const NAV = [['/', 'Inicio'], ['/tramites/', 'Trámites'], ['/guias/', 'Guías'], ['/sobre-nosotros/', 'Sobre nosotros'], ['/contacto/', 'Contacto']];
const FOOT = [['/sobre-nosotros/', 'Sobre nosotros'], ['/contacto/', 'Contacto'], ['/privacidad/', 'Política de privacidad'], ['/cookies/', 'Política de cookies'], ['/aviso-legal/', 'Aviso legal'], ['/fuentes-oficiales/', 'Fuentes oficiales']];

function layout({ title, desc, url, main, home = false, ld = [], noindex = false }) {
  const full = home ? `${site.nombre}: ${site.eslogan}` : `${title} | ${site.nombre}`;
  const nav = NAV.map(([h, t]) => {
    const cur = h === '/' ? url === '/' : url.startsWith(h) || (h === '/tramites/' && url.startsWith('/categorias/'));
    return `<li><a href="${h}"${cur ? ' aria-current="page"' : ''}>${t}</a></li>`;
  }).join('');
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<link rel="canonical" href="${BASE}${url}">
<meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="${home ? 'website' : 'article'}"><meta property="og:locale" content="es_ES"><meta property="og:url" content="${BASE}${url}">
<meta name="theme-color" content="#0b2a4a">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/style.css">
${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head><body>
<a class="skip" href="#contenido">Saltar al contenido</a>
<header class="site-header"><div class="container bar">
<a class="logo" href="/" aria-label="${site.nombre}, ir al inicio">${LOGO}<span>Trámite <b>Fácil</b></span></a>
<button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu"><span class="sr">Menú</span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
<nav id="menu" class="menu" aria-label="Navegación principal"><ul>${nav}</ul>
<a class="search-link" href="/buscar/">${icon('buscar', 18)} Buscar</a></nav>
</div></header>
${main}
<footer class="site-footer"><div class="container">
<div class="foot-top"><a class="logo light" href="/">${LOGO}<span>Trámite <b>Fácil</b></span></a><p>${site.eslogan}.</p></div>
<ul class="foot-links">${FOOT.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul>
<p class="foot-note">Portal informativo independiente. No somos un organismo público ni gestionamos trámites en tu nombre.</p>
</div></footer>
<script src="/js/app.js" defer></script>
</body></html>`;
}

const searchForm = (live = '') => `<form class="search" role="search" action="/buscar/" method="get" data-search-form ${live}>
<label class="sr" for="q-${live ? 'hero' : 'page'}">¿Qué trámite necesitas hacer?</label>
<input id="q-${live ? 'hero' : 'page'}" name="q" type="search" placeholder="¿Qué trámite necesitas hacer?" autocomplete="off" data-search-input>
<button type="submit">Buscar</button></form>`;

const card = (g) => `<article class="card guide-card"><a class="thumb" href="${g.url}" tabindex="-1" aria-hidden="true"><img src="${g.img}" alt="" width="640" height="360" loading="lazy"></a>
<div class="card-body"><a class="tag" href="/categorias/${g.cat.slug}/">${esc(g.cat.nombre)}</a>
<h3><a href="${g.url}">${esc(g.title)}</a></h3><p>${esc(g.desc)}</p>
<p class="meta">Actualizado el ${fmtDate(g.rev)} · ${g.min} min de lectura</p>
<a class="more" href="${g.url}">Leer guía ${icon('flecha', 16)}<span class="sr">: ${esc(g.title)}</span></a></div></article>`;

const grid = (list) => list.length ? `<div class="grid">${list.map(card).join('')}</div>` : '';
const crumbs = (items) => `<nav class="crumbs" aria-label="Migas de pan"><ol>${items.map(([h, t], i) => `<li>${h && i < items.length - 1 ? `<a href="${h}">${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`}</li>`).join('')}</ol></nav>`;
const crumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([h, t], i) => ({ '@type': 'ListItem', position: i + 1, name: t, item: BASE + (h || '') })) });

/* ---------- escritura ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'static'), OUT, { recursive: true });
fs.rmSync(path.join(OUT, 'img', '.gitkeep'), { force: true });
const urls = [];
function write(url, html, index = true) {
  const file = url.endsWith('.html') ? path.join(OUT, url) : path.join(OUT, url, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (index) urls.push(url);
}
for (const c of site.categorias) fs.writeFileSync(path.join(OUT, 'img', `cat-${c.slug}.svg`), catSvg(c));

// Portada
const featured = guides.filter((g) => g.featured).slice(0, 3);
const featList = featured.length ? featured : guides.slice(0, 3);
write('/', layout({
  home: true, url: '/', desc: 'Guías claras y en lenguaje sencillo para hacer trámites administrativos en España: certificado digital, Cl@ve, vida laboral, DNI y más.',
  ld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: site.nombre, url: BASE + '/', inLanguage: 'es', potentialAction: { '@type': 'SearchAction', target: `${BASE}/buscar/?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }],
  main: `<main id="contenido">
<section class="hero"><div class="container">
<p class="eyebrow">${site.eslogan}</p><h1>Haz tus trámites sin complicaciones</h1>
<p class="hero-text">Guías paso a paso, en lenguaje sencillo y con enlaces a las fuentes oficiales, para que no te pierdas entre páginas de la administración.</p>
${searchForm('data-live="inline"')}
<div class="live" data-search-results aria-live="polite"></div>
${featList.length ? `<p class="quick-title">Trámites más consultados</p><ul class="chips">${featList.map((g) => `<li><a href="${g.url}">${esc(g.title)}</a></li>`).join('')}</ul>` : ''}
</div></section>
<section class="section"><div class="container"><h2>Elige una categoría</h2>
<div class="cats">${site.categorias.map((c) => `<a class="cat" href="/categorias/${c.slug}/"><span class="cat-ico">${icon(c.icono, 28)}</span><span><strong>${esc(c.nombre)}</strong><small>${esc(c.descripcion)}</small></span></a>`).join('')}</div></div></section>
${featList.length ? `<section class="section alt"><div class="container"><h2>Guías destacadas</h2>${grid(featList)}</div></section>` : ''}
<section class="section"><div class="container"><div class="head-row"><h2>Últimos artículos</h2><a class="more" href="/guias/">Ver todas las guías ${icon('flecha', 16)}</a></div>${grid(guides.slice(0, 6))}</div></section>
<section class="section trust"><div class="container"><div class="trust-box">${icon('certificado', 36)}<div><h2>Información práctica, gestión oficial</h2>
<p>En Trámite Fácil explicamos cómo funcionan los trámites con ejemplos y lenguaje claro. Las gestiones oficiales se realizan siempre en los organismos competentes, y requisitos, plazos y procedimientos pueden cambiar: cada guía enlaza a las fuentes oficiales para que lo compruebes.</p>
<p><a class="more" href="/fuentes-oficiales/">Ver fuentes oficiales ${icon('flecha', 16)}</a></p></div></div></div></section>
</main>`
}));

// Trámites (categorías) y categorías
write('/tramites/', layout({
  title: 'Trámites por categoría', url: '/tramites/', desc: 'Encuentra la guía que necesitas: identidad, certificados digitales, Seguridad Social, Hacienda, empadronamiento, ayudas, empleo y trámites online.',
  main: `<main id="contenido" class="container page">${crumbs([['/', 'Inicio'], ['/tramites/', 'Trámites']])}<h1>Trámites por categoría</h1><p class="lead">Elige el tema de tu gestión.</p>
<div class="cats">${site.categorias.map((c) => { const n = guides.filter((g) => g.cat.slug === c.slug).length; return `<a class="cat" href="/categorias/${c.slug}/"><span class="cat-ico">${icon(c.icono, 28)}</span><span><strong>${esc(c.nombre)}</strong><small>${esc(c.descripcion)} · ${n} ${n === 1 ? 'guía' : 'guías'}</small></span></a>`; }).join('')}</div></main>`
}));
for (const c of site.categorias) {
  const list = guides.filter((g) => g.cat.slug === c.slug);
  const bc = [['/', 'Inicio'], ['/tramites/', 'Trámites'], [`/categorias/${c.slug}/`, c.nombre]];
  write(`/categorias/${c.slug}/`, layout({
    title: c.nombre, url: `/categorias/${c.slug}/`, desc: c.descripcion, ld: [crumbLd(bc)],
    main: `<main id="contenido" class="container page">${crumbs(bc)}<h1>${esc(c.nombre)}</h1><p class="lead">${esc(c.descripcion)}</p>
${list.length ? grid(list) : `<div class="empty"><h2>Todavía no hay guías en esta categoría</h2><p>Estamos preparando más contenido. Mientras tanto, prueba el <a href="/buscar/">buscador</a> o consulta <a href="/guias/">todas las guías</a>.</p></div>`}</main>`
  }));
}

// Listado de guías y buscador
write('/guias/', layout({
  title: 'Guías de trámites', url: '/guias/', desc: 'Todas las guías de Trámite Fácil, ordenadas de la más reciente a la más antigua.',
  main: `<main id="contenido" class="container page">${crumbs([['/', 'Inicio'], ['/guias/', 'Guías']])}<h1>Guías de trámites</h1><p class="lead">Todas nuestras guías, de la más reciente a la más antigua.</p>${grid(guides)}</main>`
}));
write('/buscar/', layout({
  title: 'Buscar trámites', url: '/buscar/', desc: 'Busca guías por título, categoría o palabras clave.', noindex: true,
  main: `<main id="contenido" class="container page"><h1>Buscar trámites</h1>${searchForm()}<div class="results" data-search-results aria-live="polite"></div><noscript><p>El buscador necesita JavaScript. Puedes ver <a href="/guias/">todas las guías</a>.</p></noscript></main>`
}), false);

// Guías
for (const g of guides) {
  const related = [...guides.filter((x) => x !== g && x.cat === g.cat), ...guides.filter((x) => x !== g && x.cat !== g.cat)].slice(0, 3);
  const bc = [['/', 'Inicio'], ['/guias/', 'Guías'], [`/categorias/${g.cat.slug}/`, g.cat.nombre], [g.url, g.title]];
  const ld = [crumbLd(bc), { '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.desc, inLanguage: 'es', datePublished: g.pub, dateModified: g.rev, mainEntityOfPage: BASE + g.url, image: BASE + g.img, author: { '@type': 'Organization', name: site.nombre }, publisher: { '@type': 'Organization', name: site.nombre } }];
  if (g.faq.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: g.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  write(g.url, layout({
    title: g.title, desc: g.desc, url: g.url, ld,
    main: `<main id="contenido" class="container guide">${crumbs(bc)}
<header class="guide-head"><a class="tag" href="/categorias/${g.cat.slug}/">${esc(g.cat.nombre)}</a><h1>${esc(g.title)}</h1><p class="lead">${esc(g.desc)}</p>
<p class="meta">${icon('reloj', 16)} Revisado el ${fmtDate(g.rev)} · Publicado el ${fmtDate(g.pub)} · ${g.min} min de lectura</p></header>
<img class="hero-img" src="${g.img}" alt="${esc(g.alt)}" width="640" height="360">
<div class="guide-layout">
<aside class="toc" aria-label="Índice de contenidos"><details open><summary>Índice de contenidos</summary><ol>${g.toc.map((t) => `<li class="l${t.l}"><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol></details></aside>
<article class="prose">${g.html}
<div class="notice" role="note"><strong>Aviso importante:</strong> esta información es orientativa y puede cambiar. Comprueba siempre los requisitos vigentes en las fuentes oficiales enlazadas antes de iniciar el trámite. Trámite Fácil no es un organismo público ni tramita gestiones en tu nombre.</div></article>
</div>
${related.length ? `<section class="related"><h2>Guías relacionadas</h2>${grid(related)}</section>` : ''}</main>`
  }));
}

// Páginas informativas y legales
for (const p of pages) {
  const bc = [['/', 'Inicio'], [`/${p.slug}/`, p.title]];
  write(`/${p.slug}/`, layout({ title: p.title, desc: p.desc || p.title, url: `/${p.slug}/`, ld: [crumbLd(bc)], main: `<main id="contenido" class="container page narrow">${crumbs(bc)}<article class="prose"><h1>${esc(p.title)}</h1>${p.html}</article></main>` }));
}
for (const need of ['sobre-nosotros', 'contacto', 'privacidad', 'cookies', 'aviso-legal', 'fuentes-oficiales']) if (!pageBySlug[need]) fail(`Falta content/paginas/${need}.md (el enlace del menú o del pie llevaría a una página que no existe).`);

// 404, índice del buscador, sitemap, robots
write('/404.html', layout({ title: 'Página no encontrada', url: '/404.html', desc: 'La página que buscas no existe.', noindex: true, main: `<main id="contenido" class="container page"><div class="empty"><h1>No encontramos esa página</h1><p>Puede que la dirección haya cambiado. Prueba el <a href="/buscar/">buscador</a> o vuelve al <a href="/">inicio</a>.</p></div></main>` }), false);
fs.writeFileSync(path.join(OUT, 'buscador.json'), JSON.stringify(guides.map((g) => ({ title: g.title, url: g.url, desc: g.desc, cat: g.cat.nombre, kw: g.keywords.join(' '), text: g.text.slice(0, 4000) }))));
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${BASE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n${BASE ? `Sitemap: ${BASE}/sitemap.xml\n` : ''}`);

console.log(`OK: ${guides.length} guías, ${pages.length} páginas, ${urls.length} URLs en el sitemap → dist/`);
if (!BASE) console.log('Aviso: no hay URL pública definida (en Netlify se rellena sola). El sitemap usará rutas sin dominio.');
