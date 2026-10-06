/* Play it forward – bokens modeller ritade som handritade, animerade SVG-diagram.
   Etiketterna är bokens egna ord. Där texten är lång hämtas den från sidan (stycket under diagrammet),
   så att den bara finns på ett ställe. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var COL = { yellow: '#FFE600', cyan: '#1DB2E8', magenta: '#EC1F8E', lime: '#BEE380', cream: '#FFF8DC', pink: '#F7B6C8' };
  var INK_ON_COLOUR = '#17160F';

  function rng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function svg(w, h, label) { var s = el('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'group', 'aria-label': label }); return s; }

  /* hand-drawn primitives: slightly irregular, overshooting strokes */
  function circlePath(cx, cy, r, R) {
    var pts = [], n = 28, a0 = R() * Math.PI * 2, over = 0.12 + R() * 0.12;
    for (var i = 0; i <= n; i++) {
      var a = a0 + (Math.PI * 2 + over) * i / n, rr = r * (1 + (R() - 0.5) * 0.045);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return smooth(pts);
  }
  function linePath(x1, y1, x2, y2, R) {
    var mx = (x1 + x2) / 2 + (R() - 0.5) * 6, my = (y1 + y2) / 2 + (R() - 0.5) * 6;
    return 'M' + (x1 + (R() - .5) * 2).toFixed(1) + ' ' + (y1 + (R() - .5) * 2).toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1);
  }
  function rectPath(x, y, w, h, R) {
    var j = function () { return (R() - 0.5) * 4; };
    return 'M' + (x + j()) + ' ' + (y + j()) + ' L' + (x + w + j()) + ' ' + (y + j()) + ' L' + (x + w + j()) + ' ' + (y + h + j()) + ' L' + (x + j()) + ' ' + (y + h + j()) + ' Z';
  }
  function smooth(p) {
    var d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (var i = 1; i < p.length - 1; i++) {
      var mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
      d += ' Q' + p[i][0].toFixed(1) + ' ' + p[i][1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
    }
    return d;
  }
  function stroke(parent, d, delay, extraClass) {
    var p = el('path', { d: d, 'class': 'hand draw' + (extraClass ? ' ' + extraClass : '') }, parent);
    p.style.setProperty('--d', (delay || 0) + 's');
    return p;
  }
  function arrowHead(parent, x, y, ang, delay) {
    var a1 = ang + 2.6, a2 = ang - 2.6, L = 12;
    return stroke(parent, 'M' + (x + Math.cos(a1) * L).toFixed(1) + ' ' + (y + Math.sin(a1) * L).toFixed(1) + ' L' + x.toFixed(1) + ' ' + y.toFixed(1) + ' L' + (x + Math.cos(a2) * L).toFixed(1) + ' ' + (y + Math.sin(a2) * L).toFixed(1), delay);
  }
  function text(parent, x, y, lines, opts) {
    opts = opts || {};
    var t = el('text', { x: x, y: y, 'text-anchor': opts.anchor || 'middle', 'class': (opts.cls || 'lbl') + (opts.pop === false ? '' : ' pop'), 'font-size': opts.size || 19 }, parent);
    if (opts.fill) t.setAttribute('style', 'fill:' + opts.fill);
    if (opts.delay != null) t.style.setProperty('--d', opts.delay + 's');
    [].concat(lines).forEach(function (l, i) { var s = el('tspan', { x: x, dy: i ? (opts.lh || 1.12) + 'em' : (-(([].concat(lines).length - 1) * (opts.lh || 1.12)) / 2 + 0.35) + 'em' }, t); s.textContent = l; });
    return t;
  }
  function fillShape(parent, d, color, delay) {
    var f = el('path', { d: d, 'class': 'pop shape-fill', fill: color, 'fill-opacity': '.9' }, parent);
    f.style.setProperty('--d', (delay || 0) + 's');
    return f;
  }
  function finish(stage, s) {
    stage.appendChild(s);
    [].forEach.call(s.querySelectorAll('.draw'), function (p) { try { p.style.setProperty('--len', Math.ceil(p.getTotalLength() + 4)); } catch (e) {} });
  }
  /* selectable parts and the panel that shows the book's words */
  function selectable(fig, s, parts, onSelect, hint) {
    var info = document.createElement('div'); info.className = 'fig-info'; info.setAttribute('aria-live', 'polite');
    var h = document.createElement('p'); h.className = 'fig-hint'; h.textContent = hint || 'Välj en del av diagrammet för att läsa bokens text.';
    fig.insertBefore(info, fig.querySelector('figcaption') || fig.querySelector('.replay'));
    fig.insertBefore(h, info);
    info.innerHTML = '';
    function pick(i) {
      parts.forEach(function (p, k) { p.g.classList.toggle('on', k === i); p.g.setAttribute('aria-pressed', String(k === i)); });
      var p = parts[i];
      info.innerHTML = '<b></b><span></span>'; info.querySelector('b').textContent = p.title; info.querySelector('span').textContent = p.body || '';
      if (onSelect) onSelect(i);
    }
    parts.forEach(function (p, i) {
      p.g.classList.add('hit'); p.g.setAttribute('tabindex', '0'); p.g.setAttribute('role', 'button'); p.g.setAttribute('aria-pressed', 'false');
      p.g.setAttribute('aria-label', p.title);
      p.g.addEventListener('click', function () { pick(i); });
      p.g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); } });
    });
    return pick;
  }
  /* text of the elements following the figure in the page (single source for long passages) */
  function following(fig, selector, n) {
    var out = [], e = fig.nextElementSibling;
    while (e && out.length < n) { if (e.matches(selector)) out.push(e); e = e.nextElementSibling; }
    return out;
  }

  var F = {};

  /* 1. Playbookens fyra drivkrafter (kapitel 5) */
  F.drivkrafter = function (stage, fig) {
    var R = rng(5), s = svg(720, 450, 'De fyra drivkrafterna: nyfikenhet, inre motivation, psykologisk trygghet och framplockning');
    var C = [360, 225];
    var items = [
      { t: 'Nyfikenhet', l: ['Nyfikenhet'], b: 'väcker intresse och riktning mot det okända', x: 360, y: 75, c: COL.yellow, a: -Math.PI / 2 },
      { t: 'Inre motivation', l: ['Inre', 'motivation'], b: 'ger energi att fortsätta lära utan yttre krav', x: 520, y: 225, c: COL.cyan, a: 0 },
      { t: 'Psykologisk trygghet', l: ['Psykologisk', 'trygghet'], b: 'gör det möjligt att tänka högt, göra fel och växa', x: 360, y: 375, c: COL.lime, a: Math.PI / 2 },
      { t: 'Framplockning', l: ['Framplockning'], b: 'fördjupar förståelse genom att aktivera minnet och frigör utrymme för att koda in ny kunskap', x: 200, y: 225, c: COL.magenta, a: Math.PI }
    ];
    stroke(s, circlePath(C[0], C[1], 172, R), 0);
    stroke(s, circlePath(C[0], C[1], 168, R), 0.15);
    for (var k = 0; k < 16; k++) { var a = k * Math.PI / 8, r1 = k % 4 ? 160 : 150; stroke(s, linePath(C[0] + Math.cos(a) * r1, C[1] + Math.sin(a) * r1, C[0] + Math.cos(a) * 172, C[1] + Math.sin(a) * 172, R), 0.3 + k * 0.02); }
    var parts = items.map(function (it, i) {
      var g = el('g', {}, s);
      fillShape(g, circlePath(it.x, it.y, 66, R), it.c, 0.5 + i * 0.15);
      stroke(g, circlePath(it.x, it.y, 66, R), 0.4 + i * 0.15, 'shape');
      text(g, it.x, it.y, it.l, { size: it.l.length > 1 ? 19 : 17, fill: INK_ON_COLOUR, delay: 0.7 + i * 0.15 });
      return { g: g, title: it.t, body: it.b };
    });
    var needle = el('g', { 'class': 'needle' }, s);
    needle.style.transition = 'transform .7s cubic-bezier(.3,1.5,.5,1)'; needle.style.transformOrigin = C[0] + 'px ' + C[1] + 'px';
    var np = el('path', { d: 'M' + C[0] + ' ' + (C[1] - 40) + ' L' + (C[0] + 10) + ' ' + C[1] + ' L' + C[0] + ' ' + (C[1] + 40) + ' L' + (C[0] - 10) + ' ' + C[1] + ' Z', 'class': 'pop' }, needle);
    np.setAttribute('style', 'fill:var(--magenta);stroke:var(--ink);stroke-width:2;--d:1.2s');
    el('circle', { cx: C[0], cy: C[1], r: 5, 'class': 'ink pop' }, needle);
    text(s, C[0], C[1] + 60, ['kompass för all', 'lärandedesign'], { cls: 'sm', size: 13, delay: 1.3 });
    finish(stage, s);
    selectable(fig, s, parts, function (i) { needle.style.transform = 'rotate(' + (items[i].a + Math.PI / 2) + 'rad)'; }, 'Välj en drivkraft – kompassnålen pekar dit.');
  };

  /* 2. En väv av drivkrafter (kapitel 14) */
  F.vav = function (stage, fig) {
    var R = rng(14), s = svg(720, 470, 'En väv av drivkrafter: fyra cirklar som samspelar');
    var C = [360, 235], o = 78, r = 120;
    var items = [
      { t: 'Nyfikenhet', b: 'väcks när det nya känns meningsfullt och gripbart', x: C[0] - o, y: C[1] - o, c: COL.yellow, lx: C[0] - o - 52, ly: C[1] - o - 40 },
      { t: 'Inre motivation', b: 'hålls vid liv när människor får autonomi, bekräftelse och verklig mening', x: C[0] + o, y: C[1] - o, c: COL.cyan, lx: C[0] + o + 52, ly: C[1] - o - 40 },
      { t: 'Tryggheten', b: 'gör det möjligt att dela, misslyckas och börja om', x: C[0] - o, y: C[1] + o, c: COL.lime, lx: C[0] - o - 52, ly: C[1] + o + 44 },
      { t: 'Framplockning', b: 'gör lärandet hållbart över tid', x: C[0] + o, y: C[1] + o, c: COL.magenta, lx: C[0] + o + 52, ly: C[1] + o + 44 }
    ];
    var fills = el('g', { style: 'mix-blend-mode:multiply' }, s);
    var parts = items.map(function (it, i) {
      var g = el('g', {}, s);
      var f = fillShape(fills, circlePath(it.x, it.y, r, R), it.c, 0.3 + i * 0.2); f.setAttribute('fill-opacity', '.55');
      stroke(g, circlePath(it.x, it.y, r, R), i * 0.2, 'shape');
      var hitArea = el('circle', { cx: it.x, cy: it.y, r: r, fill: 'transparent' }, g);
      text(g, it.lx, it.ly, it.t, { size: 21, delay: 0.9 + i * 0.12 });
      return { g: g, title: it.t, body: it.b, fill: f };
    });
    var mid = el('g', {}, s);
    text(mid, C[0], C[1], ['samspelar'], { cls: 'lbl halo', size: 18, delay: 1.5 });
    finish(stage, s);
    selectable(fig, s, parts, function (i) { parts.forEach(function (p, k) { p.fill.setAttribute('fill-opacity', k === i ? '.95' : '.3'); }); }, 'Välj en cirkel.');
  };

  /* 3. Reflektionsbrunnen (kapitel 7) */
  F.brunnen = function (stage, fig) {
    var R = rng(7), s = svg(720, 470, 'Reflektionsbrunnen: från ytliga observationer till handlingsmöjligheter');
    var levels = ['ytliga observationer', 'känslor', 'tolkningar', 'betydelser', 'handlingsmöjligheter'];
    var X0 = 390, X1 = 590, Y0 = 70, H = 72;
    var shades = ['#CFEFFC', '#9EDDF7', '#6CCEF4', '#3BB7EA', '#1C8FC4'];
    var parts = levels.map(function (lv, i) {
      var g = el('g', {}, s), y = Y0 + i * H;
      fillShape(g, rectPath(X0, y, X1 - X0, H, R), shades[i], 0.4 + i * 0.12).setAttribute('fill-opacity', '.95');
      stroke(g, rectPath(X0, y, X1 - X0, H, R), 0.2 + i * 0.12, 'shape');
      stroke(g, linePath(X0 - 130, y + H / 2, X0 - 8, y + H / 2, R), 0.8 + i * 0.1);
      text(g, X0 - 138, y + H / 2, lv, { anchor: 'end', size: 19, delay: 0.9 + i * 0.1 });
      return { g: g, title: lv.charAt(0).toUpperCase() + lv.slice(1), body: 'Tänk dig en brunn med olika nivåer: från ytliga observationer i det översta skiktet, till känslor, tolkningar, betydelser och handlingsmöjligheter längre ner.' };
    });
    // well walls and rim
    stroke(s, linePath(X0 - 14, Y0 - 30, X0 - 14, Y0 + 5 * H + 10, R), 0);
    stroke(s, linePath(X1 + 14, Y0 - 30, X1 + 14, Y0 + 5 * H + 10, R), 0.1);
    stroke(s, linePath(X0 - 14, Y0 + 5 * H + 10, X1 + 14, Y0 + 5 * H + 10, R), 0.2);
    stroke(s, rectPath(X0 - 34, Y0 - 44, X1 - X0 + 68, 20, R), 0.3);
    // winch and bucket
    stroke(s, linePath(X0 - 24, Y0 - 44, X0 - 24, 10, R), 0.4); stroke(s, linePath(X1 + 24, Y0 - 44, X1 + 24, 10, R), 0.45);
    stroke(s, linePath(X0 - 34, 12, X1 + 34, 12, R), 0.5);
    var bucket = el('g', {}, s);
    bucket.style.transition = 'transform 1.1s cubic-bezier(.4,0,.2,1)';
    var rope = el('line', { x1: 490, y1: 12, x2: 490, y2: 40, stroke: 'currentColor', 'stroke-width': 2, style: 'stroke:var(--ink)' }, s);
    rope.style.transition = 'all 1.1s cubic-bezier(.4,0,.2,1)';
    el('path', { d: 'M472 40 L508 40 L503 66 L477 66 Z', style: 'fill:var(--paper);stroke:var(--ink);stroke-width:2.4;stroke-linejoin:round', 'class': 'pop' }, bucket).style.setProperty('--d', '1s');
    finish(stage, s);
    selectable(fig, s, parts, function (i) { var dy = Y0 + i * H + 4 - 40; bucket.style.transform = 'translateY(' + dy + 'px)'; rope.setAttribute('y2', 40 + dy); }, 'Välj en nivå – hinken går ner i brunnen.');
  };

  /* cycle helper for Gibbs and Kolb */
  function cycle(stage, fig, opt) {
    var R = rng(opt.seed), s = svg(720, opt.h, opt.label);
    var C = [360, opt.h / 2], n = opt.items.length, rad = opt.r;
    var pos = opt.items.map(function (it, i) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [C[0] + Math.cos(a) * rad * 1.25, C[1] + Math.sin(a) * rad, a]; });
    // arrows between the steps
    for (var i = 0; i < n; i++) {
      var a1 = pos[i][2] + 0.32, a2 = pos[(i + 1) % n][2] - 0.32, pts = [], st = 10;
      if (a2 < a1) a2 += Math.PI * 2;
      for (var k = 0; k <= st; k++) { var a = a1 + (a2 - a1) * k / st; pts.push([C[0] + Math.cos(a) * rad * 1.25 * 0.92, C[1] + Math.sin(a) * rad * 0.92]); }
      stroke(s, smooth(pts), 0.6 + i * 0.12);
      var e = pts[pts.length - 1], b = pts[pts.length - 2];
      arrowHead(s, e[0], e[1], Math.atan2(e[1] - b[1], e[0] - b[0]), 0.9 + i * 0.12);
    }
    var parts = opt.items.map(function (it, i) {
      var g = el('g', {}, s), w = opt.w, h = opt.bh, x = pos[i][0] - w / 2, y = pos[i][1] - h / 2;
      fillShape(g, rectPath(x, y, w, h, R), opt.colors[i % opt.colors.length], 0.2 + i * 0.12);
      stroke(g, rectPath(x, y, w, h, R), 0.1 + i * 0.12, 'shape');
      text(g, pos[i][0], pos[i][1], it.l, { size: opt.size || 18, fill: INK_ON_COLOUR, delay: 0.4 + i * 0.12 });
      return { g: g, title: it.t, body: it.b };
    });
    if (opt.center) text(s, C[0], C[1], opt.center, { cls: 'sm', size: 15, delay: 1.4 });
    finish(stage, s);
    selectable(fig, s, parts, null, opt.hint);
  }
  /* 4. Gibbs reflektionscykel (1988) */
  F.gibbs = function (stage, fig) {
    cycle(stage, fig, {
      seed: 88, h: 500, r: 178, w: 176, bh: 82, size: 16, label: 'Gibbs reflektionscykel i sex steg',
      colors: [COL.yellow, COL.cyan, COL.pink, COL.lime, COL.yellow, COL.cyan],
      items: [
        { t: 'Beskrivning – Vad hände?', l: ['Beskrivning', 'Vad hände?'] },
        { t: 'Känslor – Vad kände jag?', l: ['Känslor', 'Vad kände jag?'] },
        { t: 'Utvärdering – Vad var bra/dåligt?', l: ['Utvärdering', 'Vad var bra/dåligt?'] },
        { t: 'Analys – Varför blev det som det blev?', l: ['Analys', 'Varför blev det', 'som det blev?'] },
        { t: 'Slutsatser – Vad kan jag dra för lärdom?', l: ['Slutsatser', 'Vad kan jag dra', 'för lärdom?'] },
        { t: 'Handlingsplan – Vad gör jag nästa gång?', l: ['Handlingsplan', 'Vad gör jag', 'nästa gång?'] }
      ],
      hint: 'Välj ett steg i cykeln.'
    });
  };
  /* 5. Kolbs experientiella lärande (1984) */
  F.kolb = function (stage, fig) {
    cycle(stage, fig, {
      seed: 84, h: 430, r: 150, w: 200, bh: 58, size: 19, label: 'Kolbs lärcykel i fyra steg',
      colors: [COL.yellow, COL.cyan, COL.magenta, COL.lime],
      items: [
        { t: 'Konkreta erfarenheter', l: ['Konkreta', 'erfarenheter'] },
        { t: 'Reflekterande observation', l: ['Reflekterande', 'observation'] },
        { t: 'Abstrakt konceptualisering', l: ['Abstrakt', 'konceptualisering'] },
        { t: 'Aktivt experimenterande', l: ['Aktivt', 'experimenterande'] }
      ],
      center: ['reflektion som en brygga', 'mellan upplevelse', 'och handling'],
      hint: 'Välj ett steg i cykeln.'
    });
  };

  /* 6. Brookfield's Four Lenses (1995) */
  F.brookfield = function (stage, fig) {
    var R = rng(95), s = svg(720, 420, 'Brookfields fyra linser');
    var items = [
      { t: 'Vår egen upplevelse', l: ['Vår egen', 'upplevelse'], x: 170, y: 120, c: COL.yellow },
      { t: 'Andras röster (studenter, deltagare, kollegor)', l: ['Andras röster'], sub: '(studenter, deltagare, kollegor)', x: 550, y: 120, c: COL.cyan },
      { t: 'Kollegial feedback', l: ['Kollegial', 'feedback'], x: 170, y: 300, c: COL.magenta },
      { t: 'Teoretisk litteratur', l: ['Teoretisk', 'litteratur'], x: 550, y: 300, c: COL.lime }
    ];
    var C = [360, 210];
    stroke(s, circlePath(C[0], C[1], 16, R), 1.3);
    var parts = items.map(function (it, i) {
      var g = el('g', {}, s), dx = C[0] - it.x, dy = C[1] - it.y, d = Math.sqrt(dx * dx + dy * dy), ux = dx / d, uy = dy / d;
      // a magnifying glass looking at the centre
      var hx = it.x + ux * 70, hy = it.y + uy * 70;
      stroke(g, linePath(hx, hy, hx + ux * 70, hy + uy * 70, R), 1 + i * 0.1);
      var f = fillShape(g, circlePath(it.x, it.y, 66, R), it.c, 0.3 + i * 0.15); f.setAttribute('fill-opacity', '.6');
      stroke(g, circlePath(it.x, it.y, 66, R), 0.1 + i * 0.15, 'shape');
      stroke(g, circlePath(it.x, it.y, 58, R), 0.25 + i * 0.15);
      text(g, it.x, it.y, it.l, { size: 19, fill: INK_ON_COLOUR, delay: 0.6 + i * 0.12 });
      if (it.sub) text(g, it.x, it.y + 92, it.sub, { cls: 'sm', size: 13, delay: 0.8 });
      return { g: g, title: it.t, body: 'Den belyser att självreflektion inte sker i vakuum – utan i relation till andra och till omvärlden.' };
    });
    finish(stage, s);
    selectable(fig, s, parts, null, 'Välj en lins.');
  };

  /* 7. Hackathonets process (kapitel 11) – the step texts are the paragraphs under the diagram */
  F.hackathon = function (stage, fig) {
    var R = rng(11), s = svg(720, 300, 'Hackathonets fem delar');
    var heads = following(fig, 'h4', 5);
    var names = heads.length === 5 ? heads.map(function (h) { return h.textContent.trim(); }) :
      ['Öppning och gemensam inramning', 'Grupprundor och kreativa övningar', 'Idégenerering och prototyper', 'Presentation och delande', 'Samling av insikter'];
    var bodies = heads.map(function (h) { var p = h.nextElementSibling; while (p && p.tagName !== 'P') p = p.nextElementSibling; return p ? p.textContent.trim() : ''; });
    var xs = [80, 220, 360, 500, 640], ys = [110, 190, 110, 190, 110];
    var pts = xs.map(function (x, i) { return [x, ys[i]]; });
    stroke(s, smooth([[20, 150]].concat(pts).concat([[700, 150]])), 0);
    var colors = [COL.yellow, COL.cyan, COL.magenta, COL.lime, COL.yellow];
    var parts = names.map(function (n, i) {
      var g = el('g', {}, s);
      fillShape(g, circlePath(xs[i], ys[i], 36, R), colors[i], 0.3 + i * 0.18);
      stroke(g, circlePath(xs[i], ys[i], 36, R), 0.25 + i * 0.18, 'shape');
      text(g, xs[i], ys[i], String(i + 1), { size: 30, fill: INK_ON_COLOUR, delay: 0.5 + i * 0.18 });
      var words = n.split(' '), half = Math.ceil(words.length / 2), lines = [words.slice(0, half).join(' '), words.slice(half).join(' ')].filter(Boolean);
      text(g, xs[i], ys[i] + (i % 2 ? 66 : -66), lines, { cls: 'lbl', size: 15, delay: 0.7 + i * 0.18 });
      return { g: g, title: n, body: bodies[i] || '' };
    });
    finish(stage, s);
    selectable(fig, s, parts, null, 'Välj en del av hackathonet.');
  };

  /* 8. Fyra pelare som bär bron till tech (kapitel 12) – pillar texts are the four paragraphs under the diagram */
  F.bron = function (stage, fig) {
    var R = rng(12), s = svg(720, 330, 'Fyra pelare som bär bron till tech');
    var ps = following(fig, 'p', 4).map(function (p) { return p.textContent.trim(); });
    var names = ['Förebilder', 'Nätverk', 'Kompetens', 'Entreprenörskap'];
    // water and banks
    stroke(s, linePath(10, 280, 710, 284, R), 0);
    for (var w = 0; w < 6; w++) stroke(s, 'M' + (60 + w * 110) + ' 300 q 12 -8 24 0 t 24 0', 0.2 + w * 0.05);
    stroke(s, 'M10 120 L70 120 L95 280', 0.1); stroke(s, 'M710 120 L650 120 L625 280', 0.15);
    // deck and arch
    stroke(s, linePath(60, 118, 660, 118, R), 0.3); stroke(s, linePath(60, 132, 660, 132, R), 0.35);
    stroke(s, 'M95 280 Q360 40 625 280', 0.25);
    var xs = [170, 290, 430, 550];
    var parts = names.map(function (n, i) {
      var g = el('g', {}, s), x = xs[i];
      fillShape(g, rectPath(x - 20, 134, 40, 146, R), [COL.yellow, COL.cyan, COL.magenta, COL.lime][i], 0.5 + i * 0.15);
      stroke(g, rectPath(x - 20, 134, 40, 146, R), 0.45 + i * 0.15, 'shape');
      var rot = el('g', { transform: 'rotate(-90 ' + x + ' 207)' }, g); text(rot, x, 207, n, { size: 16, fill: INK_ON_COLOUR, delay: 0.9 + i * 0.12 });
      return { g: g, title: (i + 1) + '. ' + n, body: (ps[i] || '').replace(/^\d\.\s*[^:]+:\s*/, '') };
    });
    // a walker crossing the bridge
    var walker = el('g', { 'class': 'walker' }, s);
    el('circle', { cx: 0, cy: -34, r: 7, style: 'fill:var(--paper);stroke:var(--ink);stroke-width:2.4' }, walker);
    el('path', { d: 'M0 -27 L0 -10 M0 -10 L-7 2 M0 -10 L7 2 M-8 -20 L8 -20', 'class': 'hand' }, walker);
    walker.style.transform = 'translate(70px,116px)';
    fig._onPlay = function () {
      if (walker.animate) walker.animate([{ transform: 'translate(70px,116px)' }, { transform: 'translate(650px,116px)' }], { duration: 4200, delay: 1200, easing: 'ease-in-out', fill: 'forwards' });
    };
    finish(stage, s);
    selectable(fig, s, parts, null, 'Välj en pelare.');
  };

  window.FIGURER = F;
})();
