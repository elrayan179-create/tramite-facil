// Menú móvil + buscador (sin dependencias)
(function () {
  var btn = document.querySelector('.menu-btn'), menu = document.getElementById('menu');
  if (btn && menu) btn.addEventListener('click', function () {
    var open = menu.classList.toggle('open'); btn.setAttribute('aria-expanded', open);
  });

  var norm = function (s) { return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
  var index = null;
  function load() {
    if (index) return Promise.resolve(index);
    return fetch('/buscador.json').then(function (r) { return r.json(); }).then(function (d) {
      index = d.map(function (g) { return { g: g, t: norm(g.title), c: norm(g.cat), k: norm(g.kw), d: norm(g.desc), x: norm(g.text) }; });
      return index;
    });
  }
  function search(q) {
    var terms = norm(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return index.map(function (e) {
      var score = 0;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i], s = 0;
        if (e.t.indexOf(t) > -1) s += 5;
        if (e.k.indexOf(t) > -1) s += 4;
        if (e.c.indexOf(t) > -1) s += 3;
        if (e.d.indexOf(t) > -1) s += 2;
        if (e.x.indexOf(t) > -1) s += 1;
        if (!s) return null; // todas las palabras deben aparecer en algún sitio
        score += s;
      }
      return { g: e.g, s: score };
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s; });
  }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function render(box, q, inline) {
    box.textContent = '';
    if (!q.trim()) { if (!inline) box.appendChild(el('p', '', 'Escribe el nombre de un trámite, por ejemplo «vida laboral» o «Cl@ve».')); return; }
    var res = search(q);
    if (!res.length) {
      var e = el('div', 'empty'); e.appendChild(el('h2', '', 'No hemos encontrado resultados'));
      e.appendChild(el('p', '', 'Prueba con otras palabras o revisa la ortografía. También puedes explorar por categorías.'));
      var a = el('a', '', 'Ver todos los trámites'); a.href = '/tramites/'; e.appendChild(a); box.appendChild(e); return;
    }
    res.slice(0, inline ? 5 : 50).forEach(function (r) {
      var a = el('a', 'result'); a.href = r.g.url;
      a.appendChild(el('small', '', r.g.cat)); a.appendChild(el('strong', '', r.g.title)); a.appendChild(el('span', '', r.g.desc));
      box.appendChild(a);
    });
  }
  document.querySelectorAll('[data-search-form]').forEach(function (form) {
    var input = form.querySelector('[data-search-input]');
    var box = (form.parentNode).querySelector('[data-search-results]');
    var inline = form.hasAttribute('data-live');
    if (!input || !box) return;
    function run() { load().then(function () { render(box, input.value, inline); }).catch(function () { box.textContent = 'No se pudo cargar el buscador. Inténtalo de nuevo.'; }); }
    input.addEventListener('input', run);
    if (inline) form.addEventListener('submit', function (ev) { if (!input.value.trim()) ev.preventDefault(); });
    else {
      form.addEventListener('submit', function (ev) { ev.preventDefault(); history.replaceState(null, '', '?q=' + encodeURIComponent(input.value)); run(); });
      var q = new URLSearchParams(location.search).get('q'); if (q) input.value = q; run();
    }
  });
})();
