/* Play it forward – webbplatsens beteende */
(function () {
  'use strict';
  var doc = document.documentElement;
  var page = document.body.dataset.page;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function escHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- theme ---------- */
  var themeBtn = document.getElementById('btn-theme');
  function isDark() { var t = doc.dataset.theme; if (t) return t === 'dark'; return matchMedia('(prefers-color-scheme: dark)').matches; }
  if (themeBtn) themeBtn.addEventListener('click', function () { var n = isDark() ? 'light' : 'dark'; doc.dataset.theme = n; store('pif-tema', n); });

  /* ---------- mobile menu ---------- */
  var menuBtn = document.getElementById('btn-menu'), menu = document.getElementById('menu');
  function setMenu(open) { if (!menu) return; menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.setAttribute('aria-label', open ? 'Stäng menyn' : 'Öppna menyn'); document.body.style.overflow = open ? 'hidden' : ''; }
  if (menuBtn) menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
  addEventListener('resize', function () { if (menu && !menu.hidden && innerWidth > 1180) setMenu(false); });

  /* ---------- chapters dropdown ---------- */
  var ddBtn = document.querySelector('.dd-btn'), dd = document.getElementById('dd-kapitel');
  if (ddBtn && dd) {
    var setDd = function (open) { dd.hidden = !open; ddBtn.setAttribute('aria-expanded', String(open)); };
    var li = ddBtn.parentNode, hoverT, hoverOpened = 0;
    ddBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!dd.hidden && Date.now() - hoverOpened < 600) return; // just opened by hovering: keep it open
      setDd(dd.hidden);
    });
    if (matchMedia('(hover: hover)').matches) {
      li.addEventListener('mouseenter', function () { clearTimeout(hoverT); if (dd.hidden) hoverOpened = Date.now(); setDd(true); });
      li.addEventListener('mouseleave', function () { hoverT = setTimeout(function () { setDd(false); }, 220); });
    }
    document.addEventListener('click', function (e) { if (!li.contains(e.target)) setDd(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !dd.hidden) { setDd(false); ddBtn.focus(); } });
  }

  /* ---------- search ---------- */
  var search = document.getElementById('search'), input = document.getElementById('search-input'), results = document.getElementById('search-results');
  var lastFocus = null;
  function openSearch() { setMenu(false); lastFocus = document.activeElement; search.hidden = false; document.body.style.overflow = 'hidden'; input.focus(); input.select(); runSearch(); }
  function closeSearch() { search.hidden = true; document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  document.getElementById('btn-search').addEventListener('click', openSearch);
  document.getElementById('search-close').addEventListener('click', closeSearch);
  search.addEventListener('click', function (e) { if (e.target === search) closeSearch(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (!search.hidden) closeSearch(); else if (menu && !menu.hidden) { setMenu(false); menuBtn.focus(); } }
    if (e.key === '/' && search.hidden && !/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); openSearch(); }
    if (!search.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      var links = [].slice.call(results.querySelectorAll('a')); if (!links.length) return;
      e.preventDefault();
      var i = links.indexOf(document.activeElement);
      i = e.key === 'ArrowDown' ? Math.min(links.length - 1, i + 1) : Math.max(-1, i - 1);
      if (i < 0) input.focus(); else links[i].focus();
    }
    if (!search.hidden && e.key === 'Tab') { // keep focus in the dialog
      var f = [input, document.getElementById('search-close')].concat([].slice.call(results.querySelectorAll('a')));
      var idx = f.indexOf(document.activeElement);
      if (e.shiftKey && idx <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && idx === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var timer;
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(runSearch, 120); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var a = results.querySelector('a'); if (a) a.click(); } });
  function runSearch() {
    var q = input.value.trim(), idx = window.SEARCH_INDEX || [];
    if (q.length < 2) { results.innerHTML = '<li class="search-empty">Skriv minst två bokstäver. Prova ”nyfikenhet”, ”hackathon”, ”framplockning” eller ett namn.</li>'; return; }
    var terms = norm(q).split(/\s+/).filter(Boolean), nq = norm(q), hits = [];
    idx.forEach(function (s) {
      var h = norm(s.h), t = norm(s.t), score = 0, ok = true;
      terms.forEach(function (w) { var inH = h.indexOf(w) >= 0, inT = t.indexOf(w); if (!inH && inT < 0) ok = false; score += (inH ? 10 : 0) + (inT >= 0 ? 1 + Math.min(5, t.split(w).length - 1) : 0); });
      if ((h + ' ' + t).indexOf(nq) >= 0) score += 8;
      if (ok) hits.push({ s: s, score: score });
    });
    hits.sort(function (a, b) { return b.score - a.score; });
    if (!hits.length) { results.innerHTML = '<li class="search-empty">Inga avsnitt matchar ”' + escHtml(q) + '”. Kontrollera stavningen eller prova ett kortare ord.</li>'; return; }
    results.innerHTML = hits.slice(0, 40).map(function (x) {
      var s = x.s, t = norm(s.t), pos = Math.max(0, t.indexOf(terms[0])), start = Math.max(0, pos - 70);
      var snip = (start > 0 ? '…' : '') + s.t.substr(start, 210) + (s.t.length > start + 210 ? '…' : '');
      var safe = escHtml(snip);
      terms.forEach(function (w) { safe = safe.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
      return '<li><a href="' + s.p + '#' + s.id + '" data-q="' + escHtml(q) + '"><div class="sr-c">' + escHtml(s.c) + '</div><div class="sr-h">' + escHtml(s.h) + '</div><div class="sr-t">' + safe + '</div></a></li>';
    }).join('');
  }
  results.addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return;
    try { sessionStorage.setItem('pif-hl', a.dataset.q); } catch (err) {}
    if (a.pathname.split('/').pop() === location.pathname.split('/').pop()) { search.hidden = true; document.body.style.overflow = ''; setTimeout(highlight, 60); }
  });
  function highlight() {
    var q; try { q = sessionStorage.getItem('pif-hl'); sessionStorage.removeItem('pif-hl'); } catch (e) {}
    if (!q || !location.hash) return;
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (!target) return;
    var scope = target.closest('section') || document.querySelector('.body') || target.parentNode;
    var terms = q.split(/\s+/).filter(function (w) { return w.length > 1; }); if (!terms.length) return;
    var re = new RegExp('(' + terms.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'ig');
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    var first = null;
    nodes.forEach(function (node) {
      re.lastIndex = 0;
      if (!re.test(node.nodeValue) || node.parentNode.closest('svg,script,textarea')) return;
      var span = document.createElement('span'); span.innerHTML = escHtml(node.nodeValue).replace(re, '<mark class="hit">$1</mark>');
      node.parentNode.replaceChild(span, node); if (!first) first = span.querySelector('mark');
    });
    if (first) first.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }
  highlight();

  /* ---------- reading progress and table of contents ---------- */
  var bar = document.querySelector('.progress span');
  var tocLinks = [].slice.call(document.querySelectorAll('.toc-list a'));
  var targets = tocLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var ticking = false;
  function onScroll() {
    ticking = false;
    var h = doc.scrollHeight - innerHeight, p = h > 0 ? Math.min(1, scrollY / h) : 0;
    if (bar) bar.style.width = (p * 100) + '%';
    if (!targets.length) return;
    var active = -1;
    for (var i = 0; i < targets.length; i++) { if (targets[i] && targets[i].getBoundingClientRect().top < 140) active = i; }
    tocLinks.forEach(function (a, i) { a.classList.toggle('active', i === active); if (i === active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    var al = tocLinks[active], box = document.querySelector('.toc');
    if (al && box && getComputedStyle(box).position === 'sticky') {
      var r = al.getBoundingClientRect(), br = box.getBoundingClientRect();
      if (r.top < br.top + 40 || r.bottom > br.bottom - 40) box.scrollTop += r.top - br.top - br.height / 2;
    }
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  // on narrow screens the page contents start folded
  var tocD = document.querySelector('.toc-d');
  if (tocD && innerWidth < 1240) tocD.open = false;
  tocLinks.forEach(function (a) { a.addEventListener('click', function () { if (tocD && innerWidth < 1240) tocD.open = false; }); });

  /* ---------- cover animation ---------- */
  var cover = document.querySelector('.cover');
  if (cover) {
    var start = function () {
      cover.classList.remove('idle', 'play'); void cover.offsetWidth;
      if (reduce) return;
      cover.classList.add('play');
      setTimeout(function () { cover.classList.remove('play'); cover.classList.add('idle'); }, 2400);
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
    var rp = cover.querySelector('.cover-replay'); if (rp) rp.addEventListener('click', start);
  }

  /* ---------- copy buttons ---------- */
  [].forEach.call(document.querySelectorAll('.copy-btn'), function (b) {
    var label = b.textContent;
    b.addEventListener('click', function () {
      var el = document.getElementById(b.dataset.copy), text = el.textContent.trim(), htmlText = el.innerHTML;
      function done(msg) { b.textContent = msg; setTimeout(function () { b.textContent = label; }, 1800); }
      function fallback() { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); try { document.execCommand('copy'); done('Kopierat'); } catch (e) { done('Markerat – tryck Ctrl/Cmd+C'); } }
      if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }), 'text/html': new Blob([htmlText], { type: 'text/html' }) })]).then(function () { done('Kopierat'); }, function () { navigator.clipboard.writeText(text).then(function () { done('Kopierat'); }, fallback); });
      } else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { done('Kopierat'); }, fallback);
      else fallback();
    });
  });

  /* ---------- playguides page: print ---------- */
  var pr = document.getElementById('pg-print'); if (pr) pr.addEventListener('click', function () { window.print(); });

  /* ---------- animated diagrams ---------- */
  var figs = [].slice.call(document.querySelectorAll('.fig'));
  figs.forEach(function (f) { var fn = window.FIGURER && window.FIGURER[f.dataset.fig]; if (fn) fn(f.querySelector('.fig-stage'), f); });
  function play(f) { f.classList.remove('play'); void f.offsetWidth; f.classList.remove('pending'); f.classList.add('play'); if (f._onPlay) f._onPlay(); }
  if ('IntersectionObserver' in window && !reduce) {
    figs.forEach(function (f) { f.classList.add('pending'); });
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && e.target.classList.contains('pending')) { play(e.target); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -15% 0px' });
    figs.forEach(function (f) { io.observe(f); });
  }
  figs.forEach(function (f) { var b = f.querySelector('.replay'); if (b) b.addEventListener('click', function () { play(f); }); });
})();
