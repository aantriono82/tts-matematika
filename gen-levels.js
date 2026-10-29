/* Generator Level 2-5 untuk TTS Matematika.
   Mengambil bagian Engine dari script.js, membuat teka-teki dengan seed tetap,
   lalu (dengan --write) menulis ulang bagian "Level 2-5" di script.js.

   Pemakaian:
     node gen-levels.js            tampilkan ringkasan level baru, tanpa mengubah berkas
     node gen-levels.js --write    tulis level baru ke script.js
     node gen-levels.js --seed=N   pakai seed dasar lain (bawaan 2026) */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SCRIPT = path.join(__dirname, 'script.js');
const ENGINE_MARK = '/* ===== 1. Engine ===== */';
const LEVELS_MARK = '/* ===== 2. Level 2-5';
const UI_MARK = '/* ===== 3. Antarmuka ===== */';

// menjalankan bagian Engine dari script.js di sandbox dan mengembalikan objek TTS
function loadEngine(file) {
  const src = fs.readFileSync(file || SCRIPT, 'utf8');
  const a = src.indexOf(ENGINE_MARK), b = src.indexOf(LEVELS_MARK);
  if (a < 0 || b < 0 || b < a) throw new Error('Penanda bagian Engine tidak ditemukan di script.js');
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.runInNewContext(src.slice(a, b), sandbox, { filename: 'script.js#engine' });
  return sandbox.TTS;
}

// membaca data Level 2-5 yang tertanam di script.js
function loadLevels(file) {
  const src = fs.readFileSync(file || SCRIPT, 'utf8');
  const m = src.match(/window\.TTS_LEVELS = (\[.*\]);/);
  if (!m) throw new Error('Data window.TTS_LEVELS tidak ditemukan di script.js');
  return JSON.parse(m[1]);
}

function generate(T, baseSeed) {
  return [2, 3, 4, 5].map(id => {
    const lv = T.makeLevel(id, T.CONFIGS[id], baseSeed * 100 + id);
    if (!lv) throw new Error('Gagal membuat Level ' + id + '. Coba seed lain.');
    return lv;
  });
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const seedArg = args.find(a => a.startsWith('--seed='));
  const baseSeed = seedArg ? Number(seedArg.slice(7)) : 2026;
  if (!Number.isInteger(baseSeed)) throw new Error('Nilai --seed harus bilangan bulat');

  const T = loadEngine();
  const levels = generate(T, baseSeed);
  levels.forEach(lv => {
    const ops = lv.hidden.filter(k => T.CELLS.get(k).kind === 'op').length;
    console.log('Level ' + lv.id + ': ' + lv.hidden.length + ' kotak kosong (' + ops + ' operator)');
  });

  if (!write) {
    console.log('\nBelum ada berkas yang diubah. Jalankan dengan --write untuk menyimpan ke script.js.');
    return;
  }
  const src = fs.readFileSync(SCRIPT, 'utf8');
  const a = src.indexOf(LEVELS_MARK), b = src.indexOf(UI_MARK);
  if (a < 0 || b < 0 || b < a) throw new Error('Penanda bagian Level/Antarmuka tidak ditemukan di script.js');
  const block = '/* ===== 2. Level 2-5 (dibuat oleh gen-levels.js) ===== */\n' +
    'window.TTS_LEVELS = ' + JSON.stringify(levels) + ';\n\n';
  fs.writeFileSync(SCRIPT, src.slice(0, a) + block + src.slice(b));
  console.log('\nscript.js diperbarui. Progres tersimpan pemain untuk Level 2-5 sebaiknya diulang.');
}

module.exports = { loadEngine, loadLevels, generate };
if (require.main === module) {
  try { main(); } catch (e) { console.error(e.message); process.exit(1); }
}
