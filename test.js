/* Uji otomatis engine TTS Matematika. Jalankan: node --test test.js */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadEngine, loadLevels } = require('./gen-levels.js');

const T = loadEngine();
const LEVELS = [T.LEVEL1].concat(loadLevels());

function checkLevel(lv) {
  // kunci jawaban lengkap dan setiap persamaan benar
  T.CELLS.forEach((c, k) => {
    const v = lv.solution[k];
    if (c.kind === 'eq') assert.equal(v, '=', k);
    else if (c.kind === 'op') assert.ok(T.OPS.includes(v), 'operator tidak sah di ' + k);
    else assert.ok(Number.isInteger(v) && v >= 1 && v <= 99, 'angka tidak sah di ' + k + ': ' + v);
  });
  T.EQS.forEach(eq => {
    assert.equal(T.eqState(eq.cells.map(k => lv.solution[k])), 'ok', 'persamaan ' + eq.id + ' salah');
  });
  // kotak kosong sah dan jawaban tunggal
  assert.ok(lv.hidden.length > 0);
  assert.equal(new Set(lv.hidden).size, lv.hidden.length, 'kotak kosong ganda');
  lv.hidden.forEach(k => {
    assert.ok(T.CELLS.has(k), 'kotak tidak dikenal ' + k);
    assert.notEqual(T.CELLS.get(k).kind, 'eq', 'kotak "=" tidak boleh kosong');
  });
  const r = T.analyze(lv.solution, new Set(lv.hidden), 99);
  assert.ok(r.unique, 'jawaban tidak tunggal (count=' + r.count + ', exceeded=' + r.exceeded + ')');
}

test('topologi: 20 persamaan di grid 13x13', () => {
  assert.equal(T.EQS.length, 20);
  T.CELLS.forEach(c => assert.ok(c.r >= 0 && c.r < 13 && c.c >= 0 && c.c < 13));
});

test('apply dan eqState', () => {
  assert.equal(T.apply(7, '÷', 2), NaN);
  assert.equal(T.apply(8, '÷', 2), 4);
  assert.equal(T.eqState([3, '+', null, '=', 5]), 'incomplete');
  assert.equal(T.eqState([3, '+', 2, '=', 5]), 'ok');
  assert.equal(T.eqState([3, '×', 2, '=', 5]), 'bad');
});

LEVELS.forEach(lv => {
  test('Level ' + lv.id + ' valid dan jawabannya tunggal', () => checkLevel(lv));
});

test('solver mendeteksi jawaban ganda', () => {
  // semua kotak non-"=" dikosongkan: pasti banyak solusi
  const all = [...T.CELLS.values()].filter(c => c.kind !== 'eq').map(c => c.key);
  assert.equal(T.analyze(T.LEVEL1.solution, new Set(all), 99).unique, false);
});

Object.keys(T.CONFIGS).forEach(d => {
  test('generator acak tingkat ' + d + ' menghasilkan teka-teki sah', () => {
    let made = 0;
    for (let seed = 1; seed <= 5; seed++) {
      const p = T.makePuzzle(seed * 104729 + Number(d), T.CONFIGS[d]);
      if (!p) continue;
      made++;
      checkLevel({ id: 'acak', solution: p.solution, hidden: p.hidden });
      const max = T.CONFIGS[d].max;
      T.CELLS.forEach((c, k) => { if (c.kind === 'num') assert.ok(p.solution[k] <= max, k + ' melebihi ' + max); });
    }
    assert.ok(made >= 3, 'hanya ' + made + '/5 seed berhasil');
  });
});
