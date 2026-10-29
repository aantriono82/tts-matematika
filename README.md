# 🧮 TTS Matematika

Game teka-teki silang matematika berbasis web untuk melatih kemampuan berhitung dan logika. Pemain mengisi kotak-kotak kosong hingga seluruh 20 persamaan matematika (mendatar dan menurun) bernilai benar.

Dibuat menggunakan **HTML, CSS, dan JavaScript murni** (*zero dependency*). Berjalan langsung di peramban tanpa instalasi server maupun proses *build*.

---

## ✨ Fitur

- **5 Level + Mode Acak**: Level 1 hingga 5 dengan tingkat kesulitan bertahap, serta mode **Acak** (*Mudah, Sedang, Sulit*) untuk membuat teka-teki baru secara instan.
- **Pasti Ada Solusi Tunggal**: Setiap teka-teki diverifikasi secara otomatis agar hanya memiliki satu kunci jawaban unik.
- **Responsif 4 Mode**:
  - 🖥️ **Mode IFP (Interactive Flat Panel)**: Layar penuh (*fullscreen*), target sentuh ekstra besar (66px+), garis kontras tinggi, dan teks terbaca jelas untuk papan tulis interaktif kelas (55"–86"+).
  - 💻 **Mode Desktop**: Tata letak dua kolom seimbang tanpa perlu *scroll* vertikal di layar laptop standar, didukung navigasi *keyboard* penuh.
  - 📱 **Mode Tablet**: Adaptasi otomatis potret dan lanskap dengan ukuran tombol sentuh yang nyaman (min. 48px).
  - 📲 **Mode Mobile**: Keypad *sticky* di bawah layar ramah jempol, pemilihan level geser horizontal, tombol zoom papan, dan penyesuaian khusus mode lanskap ponsel.
- **Input Fleksibel & Haptik**: Mendukung keyboard fisik, keypad virtual layar, serta respon getar (*haptic feedback*) halus di perangkat sentuh.
- **Simpan Otomatis**: Progres yang belum selesai, bintang, dan waktu tercepat tersimpan otomatis di perangkat (`localStorage`).
- **Tema Gelap & Terang**: Mendukung peralihan manual tema gelap/terang serta sinkronisasi otomatis dengan tema sistem (`prefers-color-scheme`).

---

## 🎮 Cara Bermain

1. Klik atau ketuk kotak kosong yang ingin diisi.
2. Masukkan angka atau operator (`+`, `−`, `×`, `÷`) melalui keyboard atau keypad layar.
3. Tekan **Periksa** untuk mengecek jawaban:
   - Hijau (✓) = persamaan benar.
   - Merah (✗) = persamaan salah.
4. Permainan selesai saat seluruh 20 persamaan bernilai benar.

### Tombol Permainan
- **Mode IFP**: Mengaktifkan mode layar penuh dengan tombol ekstra besar untuk papan sentuh interaktif / smart board di kelas.
- **Tema (Matahari/Bulan)**: Beralih cepat antara tampilan terang dan gelap.
- **Periksa**: Mengecek persamaan yang sudah lengkap.
- **Petunjuk**: Membuka satu kotak jawaban yang benar (mengurangi perolehan bintang).
- **Ulangi**: Mengosongkan papan dan mengulang level dari awal.
- **Perbesar**: Memperbesar tampilan papan agar lebih mudah ditekan di layar HP.

### Pintasan Keyboard

| Tombol | Fungsi |
| :--- | :--- |
| `0`–`9` | Mengisi angka |
| `+`, `-`, `*` / `x`, `/` / `:` | Mengisi operator (`+`, `−`, `×`, `÷`) |
| `Backspace` / `Delete` | Menghapus isi kotak |
| `Panah (↑, ↓, ←, →)` | Pindah ke kotak kosong terdekat |
| `Enter` | Loncat ke kotak kosong berikutnya |
| `Esc` | Menutup dialog kemenangan |

---

## 🚀 Cara Menjalankan

### 1. Jalankan di Komputer Lokal
Cukup unduh berkas repositori ini, lalu klik ganda berkas `index.html`. Permainan dapat langsung dimainkan secara *offline*.

### 2. Pasang di GitHub Pages
1. Unggah seluruh berkas ke repositori GitHub Anda.
2. Buka menu **Settings** → **Pages**.
3. Di bagian **Build and deployment**, pilih branch `main` (atau `master`) dan folder `/ (root)`.
4. Klik **Save**. Game dapat diakses melalui `https://<username>.github.io/<nama-repo>/`.

### 3. Pengembangan (opsional, butuh Node.js 18+)
Game tidak membutuhkan Node.js. Node hanya dipakai untuk alat bantu pengembang:

```bash
node --test test.js            # menjalankan uji otomatis
node gen-levels.js             # pratinjau Level 2–5 baru tanpa mengubah berkas
node gen-levels.js --write     # menulis Level 2–5 baru ke script.js
node gen-levels.js --seed=7    # memakai seed lain
```

Kedua skrip membaca bagian **Engine** langsung dari `script.js`, jadi penanda `/* ===== 1. Engine`, `/* ===== 2. Level 2-5`, dan `/* ===== 3. Antarmuka` jangan dihapus.

---

## 📁 Struktur Berkas

Semua berkas berada dalam satu folder:

| Berkas | Keterangan |
| :--- | :--- |
| `index.html` | Struktur antarmuka, metadata SEO/PWA, dan elemen game |
| `style.css` | Tampilan visual, sistem desain responsif 4 mode, dan tema |
| `script.js` | Logika permainan, generator soal, solver, dan penanganan layar |
| `gen-levels.js` | Skrip Node untuk membuat ulang data Level 2–5 di `script.js` |
| `test.js` | Uji otomatis engine: validitas level, keunikan jawaban, dan generator |
| `LICENSE` | Lisensi open-source (MIT License) |
| `.gitignore` | Konfigurasi pengabaian berkas sistem dan editor |

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi [MIT License](LICENSE). Bebas digunakan, dimodifikasi, dan didistribusikan untuk keperluan edukasi maupun komersial.

---

## 👨‍💻 Pembuat

Dibuat oleh **[Aan Triono](https://github.com/aantriono82)**.
