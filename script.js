/* TTS Matematika: engine, data level, dan antarmuka game. */

/* ===== 1. Engine ===== */
/* Engine TTS Matematika: topologi grid, evaluasi persamaan, solver keunikan, generator level.
   Dipakai bersama oleh halaman game (browser) dan skrip uji (Node). */
(function (root) {
  'use strict';

  const OPS = ['+', '−', '×', '÷'];
  const KINDS = ['num', 'op', 'num', 'eq', 'num']; // pola tiap persamaan: A op B = C
  const key = (r, c) => r + ',' + c;

  function apply(a, op, b) {
    switch (op) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 && a % b === 0 ? a / b : NaN;
      default: return NaN;
    }
  }

  // vals = [A, op, B, '=', C]; null berarti kotak belum diisi
  function eqState(v) {
    if (v[0] == null || v[1] == null || v[2] == null || v[4] == null) return 'incomplete';
    return apply(v[0], v[1], v[2]) === v[4] ? 'ok' : 'bad';
  }

  /* ---------- Topologi: grid 13x13, 4 bingkai 5x5 + 4 penghubung ---------- */
  const FRAME_ORIGINS = [[0, 0], [0, 8], [8, 0], [8, 8]]; // KI, KA, KB, KBw
  const EQS = [];
  const line = (r, c, dr, dc) => Array.from({ length: 5 }, (_, i) => key(r + dr * i, c + dc * i));
  FRAME_ORIGINS.forEach(([r0, c0], f) => {
    EQS.push({ id: f + ':atas', cells: line(r0, c0, 0, 1) });
    EQS.push({ id: f + ':kiri', cells: line(r0, c0, 1, 0) });
    EQS.push({ id: f + ':kanan', cells: line(r0, c0 + 4, 1, 0) });
    EQS.push({ id: f + ':bawah', cells: line(r0 + 4, c0, 0, 1) });
  });
  EQS.push({ id: 'H1', cells: line(2, 4, 0, 1) });
  EQS.push({ id: 'V1', cells: line(4, 2, 1, 0) });
  EQS.push({ id: 'V2', cells: line(4, 10, 1, 0) });
  EQS.push({ id: 'H2', cells: line(10, 4, 0, 1) });

  const CELLS = new Map();
  EQS.forEach(eq => eq.cells.forEach((k, i) => {
    const cur = CELLS.get(k);
    if (!cur) {
      const [r, c] = k.split(',').map(Number);
      CELLS.set(k, { key: k, r, c, kind: KINDS[i] });
    } else if (cur.kind !== KINDS[i]) {
      throw new Error('Jenis kotak bentrok di ' + k);
    }
  }));

  // indeks variabel untuk solver (tanpa kotak '=')
  const VARS = [...CELLS.values()].filter(c => c.kind !== 'eq');
  const VAR_INDEX = new Map(VARS.map((c, i) => [c.key, i]));
  const SOLVER_EQS = EQS.map(eq => [0, 1, 2, 4].map(i => VAR_INDEX.get(eq.cells[i])));
  const VAR_EQS = VARS.map(() => []);
  SOLVER_EQS.forEach((e, ei) => e.forEach(v => VAR_EQS[v].push(ei)));

  function solutionFromRows(rows) {
    const sol = {};
    rows.forEach((row, ei) => row.forEach((v, i) => {
      const k = EQS[ei].cells[i];
      if (k in sol && sol[k] !== v) throw new Error('Nilai bentrok di ' + k + ': ' + sol[k] + ' vs ' + v);
      sol[k] = v;
    }));
    return sol;
  }

  /* ---------- Level 1: persis seperti gambar ---------- */
  const LEVEL1_ROWS = [
    [3, '+', 11, '=', 14], [3, '+', 1, '=', 4], [14, '+', 2, '=', 16], [4, '×', 4, '=', 16],   // KI
    [5, '+', 10, '=', 15], [5, '+', 4, '=', 9], [15, '×', 3, '=', 45], [9, '×', 5, '=', 45],   // KA
    [3, '×', 4, '=', 12], [3, '+', 17, '=', 20], [12, '−', 8, '=', 4], [20, '÷', 5, '=', 4],   // KB
    [6, '÷', 2, '=', 3], [6, '+', 9, '=', 15], [3, '×', 5, '=', 15], [15, '×', 1, '=', 15],    // KBw
    [2, '×', 2, '=', 4], [4, '×', 1, '=', 4], [5, '−', 3, '=', 2], [8, '+', 1, '=', 9]         // H1 V1 V2 H2
  ];
  const LEVEL1_HIDDEN = [
    [0, 2], [1, 0], [4, 0], [2, 4], [4, 4],
    [0, 12], [2, 8], [4, 8], [2, 12], [4, 10],
    [8, 2], [12, 0], [12, 2], [12, 4],
    [8, 10], [8, 12], [10, 8], [12, 8], [12, 10],
    [6, 2], [10, 6]
  ].map(([r, c]) => key(r, c));
  const LEVEL1 = { id: 1, solution: solutionFromRows(LEVEL1_ROWS), hidden: LEVEL1_HIDDEN };

  /* ---------- Generator ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const ri = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  function shuffle(rng, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // dari A yang sudah ada, cari op dan B sehingga hasil C bilangan bulat positif <= max
  function forward(rng, a, ops, max) {
    for (const op of shuffle(rng, ops)) {
      const opts = [];
      if (op === '+') { for (let b = 1; a + b <= max; b++) opts.push(b); }
      else if (op === '−') { for (let b = 1; b < a; b++) opts.push(b); }
      else if (op === '×') { for (let b = 2; a * b <= max; b++) opts.push(b); }
      else { for (let b = 2; b < a; b++) if (a % b === 0) opts.push(b); }
      if (opts.length) {
        const b = opts[Math.floor(rng() * opts.length)];
        return { op, b, c: apply(a, op, b) };
      }
    }
    return null;
  }

  // diketahui A=x dan C=y, cari op dan B (dipakai untuk sisi bawah bingkai dan penghubung)
  function between(rng, x, y, ops, max) {
    let c = [];
    for (const op of ops) {
      if (op === '+' && y > x && y - x <= max) c.push({ op, b: y - x });
      if (op === '−' && x > y && x - y <= max) c.push({ op, b: x - y });
      if (op === '×' && y % x === 0 && y / x <= max) c.push({ op, b: y / x });
      if (op === '÷' && x % y === 0 && x / y <= max) c.push({ op, b: x / y });
    }
    const nonTrivial = c.filter(o => o.b !== 1);
    if (nonTrivial.length) c = nonTrivial;
    return c.length ? c[Math.floor(rng() * c.length)] : null;
  }

  function genFrame(rng, cfg) {
    const { ops, max } = cfg;
    for (let t = 0; t < 400; t++) {
      const TL = ri(rng, 2, Math.max(3, Math.floor(max * 0.6)));
      const top = forward(rng, TL, ops, max); if (!top) continue;
      const left = forward(rng, TL, ops, max); if (!left) continue;
      const TR = top.c, BL = left.c;
      const right = forward(rng, TR, ops, max); if (!right) continue;
      const BR = right.c;
      const bot = between(rng, BL, BR, ops, max); if (!bot) continue;
      return {
        top: [TL, top.op, top.b, '=', TR],
        left: [TL, left.op, left.b, '=', BL],
        right: [TR, right.op, right.b, '=', BR],
        bottom: [BL, bot.op, bot.b, '=', BR]
      };
    }
    return null;
  }

  function genSolution(rng, cfg) {
    for (let t = 0; t < 300; t++) {
      const F = [];
      for (let i = 0; i < 4; i++) { const f = genFrame(rng, cfg); if (!f) break; F.push(f); }
      if (F.length < 4) continue;
      const links = [
        between(rng, F[0].right[2], F[1].left[2], cfg.ops, cfg.max),   // H1
        between(rng, F[0].bottom[2], F[2].top[2], cfg.ops, cfg.max),   // V1
        between(rng, F[1].bottom[2], F[3].top[2], cfg.ops, cfg.max),   // V2
        between(rng, F[2].right[2], F[3].left[2], cfg.ops, cfg.max)    // H2
      ];
      if (links.some(l => !l)) continue;
      const ends = [
        [F[0].right[2], F[1].left[2]], [F[0].bottom[2], F[2].top[2]],
        [F[1].bottom[2], F[3].top[2]], [F[2].right[2], F[3].left[2]]
      ];
      const rows = [];
      F.forEach(f => rows.push(f.top, f.left, f.right, f.bottom));
      links.forEach((l, i) => rows.push([ends[i][0], l.op, l.b, '=', ends[i][1]]));
      return solutionFromRows(rows);
    }
    return null;
  }

  /* ---------- Solver: propagasi + pencarian, menghitung solusi (maks 2) ---------- */
  function analyze(solution, hidden, R) {
    R = R || 99;
    const NE = SOLVER_EQS.length;
    const dom = VARS.map(c => {
      const open = hidden.has(c.key);
      if (c.kind === 'num') {
        const d = new Uint8Array(R + 1);
        if (open) d.fill(1, 1); else d[solution[c.key]] = 1;
        return d;
      }
      const d = new Uint8Array(4);
      if (open) d.fill(1); else d[OPS.indexOf(solution[c.key])] = 1;
      return d;
    });

    function revise(d, e) {
      const da = d[e[0]], dop = d[e[1]], db = d[e[2]], dc = d[e[3]];
      const A = [], B = [];
      for (let v = 1; v <= R; v++) { if (da[v]) A.push(v); if (db[v]) B.push(v); }
      const sa = new Uint8Array(R + 1), sb = new Uint8Array(R + 1), sc = new Uint8Array(R + 1), so = new Uint8Array(4);
      for (let o = 0; o < 4; o++) {
        if (!dop[o]) continue;
        for (let i = 0; i < A.length; i++) {
          const a = A[i];
          for (let j = 0; j < B.length; j++) {
            const b = B[j];
            let c;
            if (o === 0) c = a + b;
            else if (o === 1) c = a - b;
            else if (o === 2) c = a * b;
            else { if (a % b) continue; c = a / b; }
            if (c >= 1 && c <= R && dc[c]) { sa[a] = 1; sb[b] = 1; sc[c] = 1; so[o] = 1; }
          }
        }
      }
      let mask = 0, na = 0, nb = 0, nc = 0, no = 0;
      for (let v = 1; v <= R; v++) {
        if (da[v]) { if (!sa[v]) { da[v] = 0; mask |= 1; } else na++; }
        if (db[v]) { if (!sb[v]) { db[v] = 0; mask |= 4; } else nb++; }
        if (dc[v]) { if (!sc[v]) { dc[v] = 0; mask |= 8; } else nc++; }
      }
      for (let o = 0; o < 4; o++) if (dop[o]) { if (!so[o]) { dop[o] = 0; mask |= 2; } else no++; }
      if (!na || !nb || !nc || !no) return -1;
      return mask;
    }

    function propagate(d, queue) {
      const inq = new Uint8Array(NE);
      for (const q of queue) inq[q] = 1;
      while (queue.length) {
        const ei = queue.pop(); inq[ei] = 0;
        const e = SOLVER_EQS[ei];
        const m = revise(d, e);
        if (m < 0) return false;
        if (m) {
          for (let k = 0; k < 4; k++) {
            if (!(m & (1 << k))) continue;
            for (const ej of VAR_EQS[e[k]]) if (ej !== ei && !inq[ej]) { inq[ej] = 1; queue.push(ej); }
          }
        }
      }
      return true;
    }

    const size = a => { let n = 0; for (let i = 0; i < a.length; i++) n += a[i]; return n; };
    const allEq = Array.from({ length: NE }, (_, i) => i);
    if (!propagate(dom, allEq)) return { unique: false, count: 0, ambiguous: [], exceeded: false };

    const ambiguous = [];
    dom.forEach((d, i) => { const s = size(d); if (s > 1) ambiguous.push({ key: VARS[i].key, size: s }); });

    let nodes = 0, exceeded = false;
    const LIMIT = 4000;
    function solveRec(d) {
      if (++nodes > LIMIT) { exceeded = true; return 2; }
      let best = -1, bs = 1e9;
      for (let i = 0; i < d.length; i++) { const s = size(d[i]); if (s > 1 && s < bs) { bs = s; best = i; } }
      if (best < 0) return 1;
      let total = 0;
      for (let v = 0; v < d[best].length && total < 2; v++) {
        if (!d[best][v]) continue;
        const nd = d.map(x => x.slice());
        nd[best].fill(0); nd[best][v] = 1;
        if (propagate(nd, VAR_EQS[best].slice())) total += solveRec(nd);
      }
      return total;
    }
    const count = solveRec(dom.map(x => x.slice()));
    return { unique: count === 1 && !exceeded, count, ambiguous, exceeded, nodes };
  }

  // membuat satu teka-teki: solusi acak, sebagian kotak disembunyikan, lalu dipastikan solusinya tunggal
  function makePuzzle(seed, cfg) {
    const rng = mulberry32(seed);
    const solution = genSolution(rng, cfg);
    if (!solution) return null;
    const all = [...CELLS.values()];
    // kotak sudut dan titik sambung (dipakai dua persamaan) dikosongkan lebih dulu dan dibuka paling akhir
    const shared = new Set(all.filter(c => EQS.filter(e => e.cells.includes(c.key)).length > 1).map(c => c.key));
    const numKeys = all.filter(c => c.kind === 'num').map(c => c.key);
    const opKeys = all.filter(c => c.kind === 'op').map(c => c.key);
    const ordered = [
      ...shuffle(rng, numKeys.filter(k => shared.has(k))),
      ...shuffle(rng, numKeys.filter(k => !shared.has(k)))
    ];
    const hidden = new Set([
      ...ordered.slice(0, Math.round(numKeys.length * cfg.hideNum)),
      ...shuffle(rng, opKeys).slice(0, cfg.hideOps)
    ]);
    // urutan membuka kotak bila jawaban belum tunggal: angka biasa, lalu sudut/sambung, terakhir operator
    const rank = k => (T_OP(k) ? 2 : shared.has(k) ? 1 : 0);
    const T_OP = k => CELLS.get(k).kind === 'op';
    for (let iter = 0; iter < 150; iter++) {
      const r = analyze(solution, hidden, 99);
      if (r.unique) return { solution, hidden: [...hidden] };
      const amb = shuffle(rng, r.ambiguous.filter(a => hidden.has(a.key)))
        .sort((x, y) => (rank(x.key) - rank(y.key)) || (y.size - x.size));
      if (!amb.length) return null;
      amb.slice(0, amb.length > 8 ? 2 : 1).forEach(a => hidden.delete(a.key));
    }
    return null;
  }

  function makeLevel(id, cfg, seed) {
    for (let i = 0; i < 40; i++) {
      const p = makePuzzle(seed + i * 7919, cfg);
      if (p) return { id, solution: p.solution, hidden: p.hidden };
    }
    return null;
  }

  const CONFIGS = {
    2: { ops: ['+', '−', '×'], max: 30, hideNum: 0.4, hideOps: 2 },
    3: { ops: OPS, max: 50, hideNum: 0.5, hideOps: 3 },
    4: { ops: OPS, max: 80, hideNum: 0.6, hideOps: 5 },
    5: { ops: OPS, max: 99, hideNum: 0.65, hideOps: 8 }
  };

  const api = {
    OPS, KINDS, key, apply, eqState, EQS, CELLS, LEVEL1, CONFIGS,
    solutionFromRows, analyze, makePuzzle, makeLevel, mulberry32
  };
  root.TTS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ===== 2. Level 2-5 (dibuat oleh gen-levels.js) ===== */
window.TTS_LEVELS = [{"id":2,"solution":{"0,0":3,"0,1":"+","0,2":21,"0,3":"=","0,4":24,"1,0":"×","2,0":4,"3,0":"=","4,0":12,"1,4":"−","2,4":11,"3,4":"=","4,4":13,"4,1":"+","4,2":1,"4,3":"=","0,8":16,"0,9":"−","0,10":15,"0,11":"=","0,12":1,"1,8":"−","2,8":3,"3,8":"=","4,8":13,"1,12":"+","2,12":12,"3,12":"=","4,12":13,"4,9":"×","4,10":1,"4,11":"=","8,0":13,"8,1":"−","8,2":7,"8,3":"=","8,4":6,"9,0":"×","10,0":2,"11,0":"=","12,0":26,"9,4":"−","10,4":3,"11,4":"=","12,4":3,"12,1":"−","12,2":23,"12,3":"=","8,8":2,"8,9":"×","8,10":4,"8,11":"=","8,12":8,"9,8":"+","10,8":12,"11,8":"=","12,8":14,"9,12":"−","10,12":5,"11,12":"=","12,12":3,"12,9":"−","12,10":11,"12,11":"=","2,5":"−","2,6":8,"2,7":"=","5,2":"+","6,2":6,"7,2":"=","5,10":"+","6,10":3,"7,10":"=","10,5":"+","10,6":9,"10,7":"="},"hidden":["10,4","8,8","8,2","0,8","2,4","2,8","12,0","12,4","8,10","0,4","0,12","8,0","4,12","4,4","5,10"]},{"id":3,"solution":{"0,0":21,"0,1":"−","0,2":11,"0,3":"=","0,4":10,"1,0":"÷","2,0":7,"3,0":"=","4,0":3,"1,4":"÷","2,4":2,"3,4":"=","4,4":5,"4,1":"+","4,2":2,"4,3":"=","0,8":24,"0,9":"+","0,10":3,"0,11":"=","0,12":27,"1,8":"÷","2,8":12,"3,8":"=","4,8":2,"1,12":"+","2,12":5,"3,12":"=","4,12":32,"4,9":"×","4,10":16,"4,11":"=","8,0":21,"8,1":"÷","8,2":7,"8,3":"=","8,4":3,"9,0":"+","10,0":11,"11,0":"=","12,0":32,"9,4":"+","10,4":46,"11,4":"=","12,4":49,"12,1":"+","12,2":17,"12,3":"=","8,8":26,"8,9":"−","8,10":5,"8,11":"=","8,12":21,"9,8":"÷","10,8":13,"11,8":"=","12,8":2,"9,12":"×","10,12":2,"11,12":"=","12,12":42,"12,9":"+","12,10":40,"12,11":"=","2,5":"×","2,6":6,"2,7":"=","5,2":"+","6,2":5,"7,2":"=","5,10":"−","6,10":11,"7,10":"=","10,5":"−","10,6":33,"10,7":"="},"hidden":["4,8","2,8","4,2","8,4","12,4","0,0","8,10","4,10","12,12","0,12","8,8","12,8","10,4","0,8","8,12","0,4","4,12","10,8","5,10","12,1","1,12"]},{"id":4,"solution":{"0,0":46,"0,1":"+","0,2":16,"0,3":"=","0,4":62,"1,0":"÷","2,0":23,"3,0":"=","4,0":2,"1,4":"−","2,4":47,"3,4":"=","4,4":15,"4,1":"+","4,2":13,"4,3":"=","0,8":48,"0,9":"−","0,10":35,"0,11":"=","0,12":13,"1,8":"+","2,8":7,"3,8":"=","4,8":55,"1,12":"+","2,12":10,"3,12":"=","4,12":23,"4,9":"−","4,10":32,"4,11":"=","8,0":27,"8,1":"+","8,2":49,"8,3":"=","8,4":76,"9,0":"+","10,0":35,"11,0":"=","12,0":62,"9,4":"−","10,4":43,"11,4":"=","12,4":33,"12,1":"−","12,2":29,"12,3":"=","8,8":40,"8,9":"+","8,10":37,"8,11":"=","8,12":77,"9,8":"÷","10,8":20,"11,8":"=","12,8":2,"9,12":"÷","10,12":7,"11,12":"=","12,12":11,"12,9":"+","12,10":9,"12,11":"=","2,5":"−","2,6":40,"2,7":"=","5,2":"+","6,2":36,"7,2":"=","5,10":"+","6,10":5,"7,10":"=","10,5":"−","10,6":23,"10,7":"="},"hidden":["0,12","12,0","12,8","8,8","2,8","8,10","0,4","4,2","4,0","4,8","0,0","12,4","10,4","4,10","8,2","8,12","4,4","8,0","0,8","10,8","9,8","9,0","8,9","2,5","1,4"]},{"id":5,"solution":{"0,0":42,"0,1":"×","0,2":2,"0,3":"=","0,4":84,"1,0":"÷","2,0":7,"3,0":"=","4,0":6,"1,4":"+","2,4":12,"3,4":"=","4,4":96,"4,1":"×","4,2":16,"4,3":"=","0,8":20,"0,9":"×","0,10":3,"0,11":"=","0,12":60,"1,8":"+","2,8":72,"3,8":"=","4,8":92,"1,12":"+","2,12":4,"3,12":"=","4,12":64,"4,9":"−","4,10":28,"4,11":"=","8,0":4,"8,1":"+","8,2":26,"8,3":"=","8,4":30,"9,0":"÷","10,0":2,"11,0":"=","12,0":2,"9,4":"×","10,4":3,"11,4":"=","12,4":90,"12,1":"×","12,2":45,"12,3":"=","8,8":18,"8,9":"×","8,10":3,"8,11":"=","8,12":54,"9,8":"×","10,8":4,"11,8":"=","12,8":72,"9,12":"+","10,12":18,"11,12":"=","12,12":72,"12,9":"÷","12,10":1,"12,11":"=","2,5":"+","2,6":60,"2,7":"=","5,2":"+","6,2":10,"7,2":"=","5,10":"−","6,10":25,"7,10":"=","10,5":"+","10,6":1,"10,7":"="},"hidden":["8,12","8,8","4,0","2,4","4,2","4,8","10,4","2,8","10,8","8,0","4,12","8,4","0,4","8,2","4,10","12,0","12,4","0,0","8,10","12,8","0,8","1,4","1,0","1,12","10,5","4,1","2,5","12,1"]}];

/* ===== 3. Antarmuka ===== */
(function () {
  'use strict';
  var T = window.TTS;
  var $ = function (id) { return document.getElementById(id); };
  var LEVELS = [T.LEVEL1].concat(window.TTS_LEVELS || []);
  var STORE_KEY = 'ttsm:v2';
  var DIFF_LABEL = { '2': 'Mudah', '4': 'Sedang', '5': 'Sulit' };
  var OP_NAME = { '+': 'tambah', '−': 'kurang', '×': 'kali', '÷': 'bagi' };

  var store = { best: {}, progress: {} };
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) { var p = JSON.parse(raw); if (p && typeof p === 'object') store = { best: p.best || {}, progress: p.progress || {} }; }
  } catch (e) {}
  function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {} }

  var boardEl = $('board'), els = new Map(), S = null, zoom = 1, generating = false;

  /* ---------- timer ---------- */
  function elapsed() { return S.base + (S.running ? Date.now() - S.startTs : 0); }
  function resume() { if (S && !S.done && !S.running && !document.hidden) { S.running = true; S.startTs = Date.now(); } }
  function pause() { if (S && S.running) { S.base += Date.now() - S.startTs; S.running = false; } }
  function fmt(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  setInterval(function () { if (S) $('time').textContent = fmt(elapsed()); }, 500);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else resume(); });

  /* ---------- level ---------- */
  function startLevel(def, opts) {
    opts = opts || {};
    var hidden = new Set(def.hidden);
    S = {
      def: def, id: def.id, random: !!opts.random,
      label: opts.label || ('Level ' + def.id),
      solution: def.solution, hidden: hidden, fills: {}, locked: new Set(),
      hints: 0, base: 0, running: false, startTs: 0, done: false, sel: null, fresh: true, marks: {}
    };
    var saved = !S.random && !opts.fresh && store.progress[def.id];
    if (saved && saved.fills) {
      Object.keys(saved.fills).forEach(function (k) {
        if (!hidden.has(k)) return;
        var v = saved.fills[k], kind = T.CELLS.get(k).kind;
        if ((kind === 'num' && Number.isInteger(v) && v >= 1) || (kind === 'op' && T.OPS.indexOf(v) >= 0)) S.fills[k] = v;
      });
      (saved.locked || []).forEach(function (k) { if (hidden.has(k) && S.fills[k] === S.solution[k]) S.locked.add(k); });
      S.hints = saved.hints | 0; S.base = saved.elapsed | 0;
    }
    if (S.random) delete store.progress.acak;
    buildBoard();
    S.sel = orderedBlanks()[0].key;
    closeWin();
    resume();
    render(); renderLevels();
    $('lvlname').innerHTML = '';
    $('lvlname').textContent = S.label;
    var sp = document.createElement('span'); sp.textContent = hidden.size + ' kotak kosong'; $('lvlname').appendChild(sp);
    msg('');
  }

  function orderedBlanks() {
    return Array.from(S.hidden).map(function (k) { return T.CELLS.get(k); }).sort(function (a, b) { return a.r - b.r || a.c - b.c; });
  }

  function buildBoard() {
    boardEl.textContent = ''; els.clear();
    boardEl.classList.remove('done');
    Array.from(T.CELLS.values()).sort(function (a, b) { return a.r - b.r || a.c - b.c; }).forEach(function (c) {
      var blank = S.hidden.has(c.key);
      var el = document.createElement(blank ? 'button' : 'div');
      el.className = 'cell ' + c.kind + (blank ? ' blank' : ' given');
      el.style.gridRow = String(c.r + 1); el.style.gridColumn = String(c.c + 1);
      el.dataset.k = c.key;
      if (blank) el.type = 'button'; else el.textContent = S.solution[c.key];
      boardEl.appendChild(el); els.set(c.key, el);
    });
  }

  boardEl.addEventListener('click', function (e) {
    var el = e.target.closest('button.cell');
    if (el && S && !S.done) select(el.dataset.k);
  });

  /* ---------- tampilan ---------- */
  function relSet() {
    var rel = new Set();
    if (!S.sel) return rel;
    T.EQS.forEach(function (eq) { if (eq.cells.indexOf(S.sel) >= 0) eq.cells.forEach(function (k) { rel.add(k); }); });
    return rel;
  }

  function render() {
    var rel = relSet(), filled = 0;
    els.forEach(function (el, k) {
      var isRel = rel.has(k) && k !== S.sel;
      el.classList.toggle('rel', isRel);
      if (!S.hidden.has(k)) return;
      var v = S.fills[k];
      if (v != null) filled++;
      el.textContent = v == null ? '' : v;
      el.classList.toggle('sel', k === S.sel && !S.done);
      el.classList.toggle('hinted', S.locked.has(k));
      var m = S.marks[k];
      el.classList.toggle('ok', m === 'ok'); el.classList.toggle('bad', m === 'bad');
      var c = T.CELLS.get(k);
      el.setAttribute('aria-label', 'Baris ' + (c.r + 1) + ', kolom ' + (c.c + 1) +
        (c.kind === 'op' ? ', operator' : ', angka') + ', ' + (v == null ? 'kosong' : 'berisi ' + (OP_NAME[v] || v)) +
        (S.locked.has(k) ? ', dari petunjuk' : '') + (m === 'ok' ? ', benar' : m === 'bad' ? ', salah' : ''));
    });
    boardEl.classList.toggle('done', S.done);
    $('hints').textContent = S.hints;
    $('filled').textContent = filled + '/' + S.hidden.size;
    $('time').textContent = fmt(elapsed());
    var selKind = S.sel ? T.CELLS.get(S.sel).kind : null;
    document.querySelectorAll('.key').forEach(function (b) {
      var kind = b.dataset.kind;
      b.disabled = S.done || (kind !== 'del' && selKind && kind !== selKind);
    });
  }

  function renderLevels() {
    var box = $('levels'); box.textContent = '';
    LEVELS.forEach(function (lv) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip';
      b.setAttribute('aria-pressed', String(!S.random && S.id === lv.id));
      var best = store.best[lv.id], n = best ? best.stars : 0;
      b.setAttribute('aria-label', 'Level ' + lv.id + (best ? ', bintang terbaik ' + n : ''));
      var t = document.createElement('span'); t.textContent = lv.id;
      var st = document.createElement('span'); st.className = 'st'; st.textContent = '★'.repeat(n) + '☆'.repeat(3 - n);
      b.appendChild(t); b.appendChild(st);
      b.addEventListener('click', function () { if (S.random || S.id !== lv.id) startLevel(lv); });
      box.appendChild(b);
    });
    var r = document.createElement('button');
    r.type = 'button'; r.className = 'chip'; r.setAttribute('aria-pressed', String(S.random));
    r.setAttribute('aria-label', 'Teka-teki acak baru');
    var rt = document.createElement('span'); rt.textContent = 'Acak';
    var rs = document.createElement('span'); rs.className = 'st'; rs.textContent = 'BARU';
    r.appendChild(rt); r.appendChild(rs);
    r.addEventListener('click', startRandom);
    box.appendChild(r);
  }

  function msg(text, tone) { var m = $('msg'); m.textContent = text || ''; m.className = 'msg' + (tone ? ' ' + tone : ''); }

  /* ---------- masukan ---------- */
  function select(k) {
    if (!S || S.done) return;
    S.sel = k; S.fresh = true; render();
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
    if (zoom > 1) {
      var el = els.get(k);
      if (el) el.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }

  function changed() {
    S.marks = {}; msg('');
    if (!S.random) { store.progress[S.id] = { fills: S.fills, locked: Array.from(S.locked), hints: S.hints, elapsed: elapsed() }; persist(); }
    render(); checkWin();
  }

  function guard() {
    if (!S || S.done || !S.sel) return null;
    if (S.locked.has(S.sel)) { msg('Kotak ini sudah diisi petunjuk dan tidak bisa diubah.'); return null; }
    return T.CELLS.get(S.sel);
  }

  function inputDigit(d) {
    var c = guard(); if (!c || c.kind !== 'num') return;
    var cur = S.fills[S.sel];
    var s = (S.fresh || cur == null) ? '' : String(cur);
    if (s.length >= 3) s = '';
    s += d;
    if (Number(s) === 0) return;
    S.fills[S.sel] = Number(s); S.fresh = false; changed();
  }
  function inputOp(o) {
    var c = guard(); if (!c || c.kind !== 'op') return;
    S.fills[S.sel] = o; S.fresh = false; changed();
  }
  function inputDel() {
    var c = guard(); if (!c) return;
    var cur = S.fills[S.sel]; if (cur == null) return;
    if (c.kind === 'num') { var s = String(cur).slice(0, -1); S.fills[S.sel] = s ? Number(s) : null; }
    else S.fills[S.sel] = null;
    S.fresh = false; changed();
  }

  var KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '−', '×', '÷', 'del'];
  KEYS.forEach(function (k) {
    var b = document.createElement('button');
    b.type = 'button';
    var isOp = T.OPS.indexOf(k) >= 0;
    b.className = 'key' + (isOp ? ' op' : '') + (k === 'del' ? ' del' : '');
    b.dataset.kind = k === 'del' ? 'del' : isOp ? 'op' : 'num';
    b.textContent = k === 'del' ? '⌫' : k;
    b.setAttribute('aria-label', k === 'del' ? 'Hapus' : OP_NAME[k] || k);
    b.addEventListener('click', function () {
      if (navigator.vibrate) { try { navigator.vibrate(6); } catch (e) {} }
      if (k === 'del') inputDel(); else if (isOp) inputOp(k); else inputDigit(k);
    });
    $('keypad').appendChild(b);
  });

  function move(dr, dc) {
    var cur = T.CELLS.get(S.sel), best = null, bd = 1e9;
    S.hidden.forEach(function (k) {
      if (k === S.sel) return;
      var c = T.CELLS.get(k), along = (c.r - cur.r) * dr + (c.c - cur.c) * dc;
      if (along <= 0) return;
      var perp = Math.abs((c.r - cur.r) * dc) + Math.abs((c.c - cur.c) * dr);
      var d = along + 2 * perp;
      if (d < bd) { bd = d; best = k; }
    });
    if (best) select(best);
  }
  function nextBlank() {
    var ord = orderedBlanks().map(function (c) { return c.key; });
    var i = ord.indexOf(S.sel);
    var rot = ord.slice(i + 1).concat(ord.slice(0, i + 1));
    return rot.find(function (k) { return S.fills[k] == null; }) || rot[0];
  }

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape' && !$('win').hidden) { closeWin(); return; }
    if (!S || S.done || e.target.tagName === 'SELECT') return;
    var k = e.key;
    if (/^[0-9]$/.test(k)) { inputDigit(k); e.preventDefault(); }
    else if (k === 'Backspace' || k === 'Delete') { inputDel(); e.preventDefault(); }
    else if (k === '+') inputOp('+');
    else if (k === '-' || k === '−') inputOp('−');
    else if (k === '*' || k === 'x' || k === 'X' || k === '×') inputOp('×');
    else if (k === '/' || k === ':' || k === '÷') { inputOp('÷'); e.preventDefault(); }
    else if (e.target === document.body || e.target.closest('.board')) {
      if (k === 'ArrowUp') { move(-1, 0); e.preventDefault(); }
      else if (k === 'ArrowDown') { move(1, 0); e.preventDefault(); }
      else if (k === 'ArrowLeft') { move(0, -1); e.preventDefault(); }
      else if (k === 'ArrowRight') { move(0, 1); e.preventDefault(); }
      else if (k === 'Enter') { select(nextBlank()); e.preventDefault(); }
    }
  });

  /* ---------- pemeriksaan ---------- */
  function valuesOf(eq) {
    return eq.cells.map(function (k, i) {
      if (T.KINDS[i] === 'eq') return '=';
      return S.hidden.has(k) ? (S.fills[k] == null ? null : S.fills[k]) : S.solution[k];
    });
  }

  function checkWin() {
    if (S.done) return;
    for (var i = 0; i < T.EQS.length; i++) if (T.eqState(valuesOf(T.EQS[i])) !== 'ok') return;
    win();
  }

  function doCheck() {
    if (S.done) return;
    var ok = 0, bad = 0, inc = 0, marks = {};
    T.EQS.forEach(function (eq) {
      var st = T.eqState(valuesOf(eq));
      if (st === 'ok') ok++; else if (st === 'bad') bad++; else inc++;
      if (st === 'incomplete') return;
      eq.cells.forEach(function (k) {
        if (!S.hidden.has(k) || S.fills[k] == null) return;
        if (st === 'bad') marks[k] = 'bad'; else if (!marks[k]) marks[k] = 'ok';
      });
    });
    S.marks = marks;
    var text = ok + ' dari ' + T.EQS.length + ' persamaan benar';
    if (bad) text += ', ' + bad + ' salah';
    if (inc) text += ', ' + inc + ' belum lengkap';
    msg(text + '.', bad ? 'bad' : '');
    render();
  }

  function doHint() {
    if (S.done) return;
    var wrong = Array.from(S.hidden).filter(function (k) { return !S.locked.has(k) && S.fills[k] !== S.solution[k]; });
    if (!wrong.length) { msg('Semua kotak sudah sama dengan kunci.'); return; }
    var k = wrong.indexOf(S.sel) >= 0 ? S.sel : wrong[Math.floor(Math.random() * wrong.length)];
    S.fills[k] = S.solution[k]; S.locked.add(k); S.hints++; S.sel = k; S.fresh = true;
    changed();
    if (!S.done) msg('Satu kotak diisi petunjuk. Bintang akhir berkurang.');
  }

  function doReset() {
    if (!S.random) delete store.progress[S.id];
    persist();
    startLevel(S.def, { random: S.random, label: S.label, fresh: true });
  }

  /* ---------- menang ---------- */
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>';
  function win() {
    pause(); S.done = true; S.marks = {};
    var t = elapsed(), stars = S.hints === 0 ? 3 : S.hints <= 2 ? 2 : 1;
    if (!S.random) {
      var b = store.best[S.id];
      if (!b || stars > b.stars || (stars === b.stars && t < b.time)) store.best[S.id] = { stars: stars, time: t };
      delete store.progress[S.id]; persist();
    }
    render(); renderLevels();
    $('winStars').innerHTML = [1, 2, 3].map(function (i) { return STAR.replace('<svg', i <= stars ? '<svg class="on"' : '<svg'); }).join('');
    $('winStars').setAttribute('aria-label', stars + ' dari 3 bintang');
    $('winTime').textContent = fmt(t);
    $('winHints').textContent = S.hints;
    var idx = LEVELS.findIndex(function (l) { return l.id === S.id; });
    var next = $('winNext');
    if (!S.random && idx >= 0 && idx < LEVELS.length - 1) { next.textContent = 'Level berikutnya'; next.onclick = function () { startLevel(LEVELS[idx + 1]); }; }
    else { next.textContent = 'Teka-teki acak baru'; next.onclick = startRandom; }
    $('win').hidden = false; next.focus();
  }
  function closeWin() { $('win').hidden = true; }
  $('winAgain').addEventListener('click', doReset);

  /* ---------- acak ---------- */
  function startRandom() {
    if (generating) return;
    generating = true; closeWin(); msg('Menyusun teka-teki acak…');
    setTimeout(function () {
      var diff = $('diff').value, cfg = T.CONFIGS[diff], def = null;
      for (var i = 0; i < 10 && !def; i++) {
        var p = T.makePuzzle((Math.random() * 2147483647) | 0, cfg);
        if (p) def = { id: 'acak', solution: p.solution, hidden: p.hidden };
      }
      generating = false;
      if (def) startLevel(def, { random: true, label: 'Acak, ' + DIFF_LABEL[diff].toLowerCase() });
      else msg('Teka-teki belum berhasil disusun. Coba tekan Acak lagi.', 'bad');
    }, 40);
  }

  /* ---------- tombol aksi ---------- */
  $('checkBtn').addEventListener('click', doCheck);
  $('hintBtn').addEventListener('click', doHint);
  $('resetBtn').addEventListener('click', doReset);
  $('zoomBtn').addEventListener('click', function () {
    zoom = zoom === 1 ? 1.6 : 1;
    boardEl.style.setProperty('--zoom', zoom);
    var label = this.querySelector('span');
    if (label) label.textContent = zoom === 1 ? 'Perbesar' : 'Perkecil';
    else this.textContent = zoom === 1 ? 'Perbesar' : 'Perkecil';
    this.setAttribute('aria-pressed', String(zoom > 1));
    if (S && S.sel && zoom > 1) {
      var el = els.get(S.sel);
      if (el) el.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  });

  /* ---------- mode IFP & layar penuh ---------- */
  var ifpToggle = $('ifpToggle');
  var ifpActive = false;

  function updateIfpUI(active) {
    ifpActive = !!active;
    document.documentElement.classList.toggle('ifp-mode', ifpActive);
    if (ifpToggle) {
      ifpToggle.setAttribute('aria-pressed', String(ifpActive));
      var label = ifpToggle.querySelector('.tool-label');
      if (label) label.textContent = ifpActive ? 'Keluar IFP' : 'Mode IFP';
      ifpToggle.title = ifpActive ? 'Keluar dari Mode IFP' : 'Mode IFP / Layar Penuh untuk Papan Interaktif';
    }
  }

  function toggleIfp() {
    var willActivate = !ifpActive;
    updateIfpUI(willActivate);
    try {
      if (willActivate) {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(function () {});
        }
        msg('Mode IFP aktif: Tampilan dioptimalkan untuk papan sentuh interaktif.');
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(function () {});
        }
        msg('Kembali ke tampilan standar.');
      }
    } catch (e) {}
  }

  if (ifpToggle) {
    ifpToggle.addEventListener('click', toggleIfp);
  }

  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && ifpActive) {
      updateIfpUI(false);
    }
  });

  /* ---------- tema gelap / terang ---------- */
  var themeToggle = $('themeToggle');
  function applyTheme(theme) {
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem('ttsm:theme', theme); } catch (e) {}
    } else {
      document.documentElement.removeAttribute('data-theme');
      try { localStorage.removeItem('ttsm:theme'); } catch (e) {}
    }
    var isDark = theme === 'dark' || (!theme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var metaColor = $('themeColor');
    if (metaColor) metaColor.setAttribute('content', isDark ? '#171a1e' : '#e4dbc1');
    if (themeToggle) {
      themeToggle.setAttribute('aria-label', isDark ? 'Beralih ke tema terang' : 'Beralih ke tema gelap');
      themeToggle.title = isDark ? 'Beralih ke tema terang' : 'Beralih ke tema gelap';
      var sunIcon = themeToggle.querySelector('.theme-icon-sun');
      var moonIcon = themeToggle.querySelector('.theme-icon-moon');
      if (sunIcon) sunIcon.removeAttribute('hidden');
      if (moonIcon) moonIcon.removeAttribute('hidden');
    }
  }

  try {
    var savedTheme = localStorage.getItem('ttsm:theme');
    if (savedTheme) applyTheme(savedTheme);
  } catch (e) {}

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      if (!current) {
        var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        current = isDark ? 'dark' : 'light';
      }
      var next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }

  startLevel(LEVELS[0]);
})();
