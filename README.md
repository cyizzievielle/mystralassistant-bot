# 🔮 Mystral Assistant Bot (V2)

**Mystral Assistant** adalah Discord Bot serbaguna generasi modern berbasis **Discord.js v14**, **MongoDB Atlas (Mongoose)**, dan rendering grafis mutakhir menggunakan **@napi-rs/canvas**. Bot ini dirancang dengan arsitektur berkecepatan tinggi (In-Memory RAM Caching), moderasi otomatis, sistem gamifikasi, tiket bantuan, serta manajemen staf dan komunitas secara menyeluruh.

---

## 🌟 Fitur Unggulan

### 1. 🛡️ Anti-Toxic & Auto-Moderation
* **Penyaringan Kata Kasar & Slurs:** Mendeteksi dan menindak otomatis kata-kata kotor/kasar pada pesan teks.
* **Dynamic Toggle On/Off:**
  * **Perintah Chat Instan:** Admin/Moderator dapat mengaktifkan atau menonaktifkan filter langsung dari Discord tanpa restart:
    * `ctoxic off` — Menonaktifkan filter anti-toxic.
    * `ctoxic on` — Mengaktifkan kembali filter anti-toxic.
    * `ctoxic status` — Mengecek status saat ini (Aktif/Nonaktif).
  * **Default Environment (.env):** Konfigurasi awal dapat diatur melalui `TOXIC_ENABLED=0` (mati) atau `TOXIC_ENABLED=1` (aktif).
* **Audit & Moderasi Lengkap:** `cwarn`, `cwarnings`, `ctimeout`, `ckick`, `cban`, `cpurge`, dan log moderasi otomatis.

### 2. ⚡ High-Performance Architecture (Ultra-Low Latency)
* **In-Memory RAM Caching:**
  * **Autoresponse Cache:** Respons otomatis disimpan di memori RAM sehingga tidak membebani database pada setiap obrolan.
  * **Bot Security Cache:** Pengecekan whitelist & blacklist bot berjalan tanpa latency query berulang.
  * **AFK User Cache:** Pengecekan status AFK cepat tanpa query blocking MongoDB.
  * **Sticky Message Cache:** Pengiriman pesan tempel per-channel instan.
* **Instant `cping`:** Pengukuran latensi WebSocket dan round-trip bot sekali tembak tanpa double-edit message delay.

### 3. 🔥 Mystral Flame Streak & Tarot Subsystem
* **Interaksi Dua Arah Otomatis:** Pasangan streak terbentuk setelah interaksi 3 hari berturut-turut di channel khusus.
* **Evaluasi Reset:** Pengecekan harian pada pukul **00:00 WIB**.
* **Pengingat Otomatis:** Pengingat via DM pada pukul **21:00 WIB** jika pasangan belum melengkapi interaksi harian.
* **Token Pemulihan (Recovery):** Kuota pemulihan bulanan yang di-reset otomatis setiap tanggal 1.
* **Kartu Status Estetik (Canvas):** Tingkatan evolusi api (*Flame Tiers*) dinamis dengan grafis beresolusi tinggi.
* **🎴 Tarot Readings:** Ramalan tarot harian (`/tarot pull`), galeri koleksi kartu (`/tarot collection`), dan leaderboard tarot.

### 4. 📌 Staff Duty & Tagging System
* **Jadwal Rotasi Otomatis:** Pembagian tugas giliran tag member 2x sehari (Slot 1 & Slot 2).
* **Perintah Roster & Takeover:**
  * `ctag duty` / `status` — Lihat giliran tugas hari ini.
  * `ctag done` / `busy` / `takeover` — Lapor selesai, berhalangan, atau ambil alih giliran staff lain.
  * `cprofilestaff` — Kartu profil identitas & statistik keaktifan staff.
  * `cstaff lb` — Papan peringkat keaktifan tugas staff.

### 5. 💖 Booster Management & Custom Roles
* **Setup Otomatis:** Saluran klaim role booster, base role anchor, dan log pengumuman.
* **Perintah Booster:**
  * `cbooster setup` — Konfigurasi cepat sistem booster.
  * `cbooster roles` — Direktori daftar role custom booster aktif.
  * `cmyrole` — Izin custom role mandiri untuk role khusus server non-booster.

### 6. 🤖 Autoresponse & Sticky Messages
* `car <trigger> | <respon>` — Menambah autoresponse teks baru.
* `car <trigger>` + lampiran foto — Menambah autoresponse berupa gambar.
* `clar` / `cdar <id>` / `cear <id>` — Daftar, hapus, atau edit autoresponse.
* `c sticky set <pesan>` / `remove` — Menempelkan pesan tetap di channel chat.

### 7. 🎓 Sorting Hat, Identity Card, & Menfess
* **Sorting Hat:** Penentuan faksi (Light / Dark) melalui kuis interaktif dengan kartu faksi Canvas.
* **Identity Card (ID Card):** Registrasi profil member (`/idcard register`) dan pratinjau kartu grafis estetik (`/idcard view`).
* **Menfess Anonim:** Pengiriman pesan rahasia dengan validasi moderasi dan tombol balasan interaktif.

### 8. 🎫 Ticket Support & FAQ Panels
* **Sistem Tiket Bantuan:** Pembuatan kategori tiket privat (Support, Report, Donasi, Kemitraan, Verifikasi) dengan log transkrip obrolan otomatis saat tiket ditutup.
* **FAQ Interaktif:** Menu bantuan informatif berbasis dropdown components.

---

## 📖 Panduan Bantuan & Prefix Commands

Prefix bot adalah **`c`** (atau slash commands `/`).

| Perintah | Deskripsi |
| :--- | :--- |
| `chelp` | Membuka Pusat Bantuan & Direktori Panduan Perintah Umum |
| `chelpmod` *(atau `chelp mod`)* | Membuka Grimoire Bantuan Khusus Admin / Moderator |
| `chelpmod toxic` | Langsung membuka panduan moderasi & pengaturan anti-toxic |
| `cping` | Mengecek kecepatan respon dan latensi bot secara instan |
| `cbrat <teks>` | Membuat stiker teks meme gaya album Charli XCX (Brat Generator) |
| `ctoxic on` / `off` / `status` | Mengaktifkan, mematikan, atau cek status filter anti-toxic |
| `cbotstatus` | Menampilkan statistik RAM, CPU, Uptime, dan latensi bot |

---

## 🛠️ Persyaratan Sistem

* **Node.js:** Versi 18.0.0 atau lebih tinggi (Direkomendasikan **Node.js v20 LTS**)
* **Basis Data:** 
  * **MongoDB Atlas** (Direkomendasikan - URI Mongoose)
  * SQLite3 (Kompatibilitas fallback lokal)
* **Kompiler C++:** Node-gyp runtime standar untuk instalasi modul `@napi-rs/canvas`

---

## 🚀 Instalasi & Konfigurasi

### 1. Kloning Repositori
```bash
git clone https://github.com/cyizzievielle/mystralassistant-bot.git
cd mystralassistant-bot
npm install
```

### 2. Konfigurasi File `.env`
Salin template atau buat file `.env` di root direktori project:

```env
# Bot Credentials
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_application_client_id
GUILD_ID=your_primary_server_id
BOT_OWNER_ID=your_discord_user_id
PREFIX=c

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/mystral
SQLITE_PATH=./data/hovassistant_v2.db

# Anti-Toxic Filter (0 = Nonaktif, 1 = Aktif)
TOXIC_ENABLED=0
TOXIC_ACTION=warn
TOXIC_STRIKE_LIMIT=3
TOXIC_LOG_CHANNEL_ID=

# Saluran Penting
GENERAL_CHANNEL_ID=
MENFESS_CHANNEL_ID=
MENFESS_LOG_CHANNEL_ID=
IDCARD_CHANNEL_ID=
QUOTES_CHANNEL_ID=

# Tiket & Moderasi
TICKET_CATEGORY_ID=
TICKET_STAFF_ROLE_ID=
TICKET_LOG_CHANNEL_ID=
```

### 3. Deploy Slash Commands
Daftarkan seluruh interaksi slash command ke Discord API:
```bash
npm run deploy:commands
```

### 4. Menjalankan Bot
```bash
# Menjalankan langsung
npm start

# Atau dengan nodemon untuk mode pengembangan
npm run dev
```

---

## 📂 Struktur Direktori Utama

```
CyzaMyst-V2/
├── commands/             # Handler slash commands modular
├── data/                 # Penyimpanan database lokal SQLite & aset statis
├── events/               # Handler Discord client events
├── utils/                # Utility canvas rendering, database helpers, & formatter
├── db.js                 # Inisialisasi koneksi MongoDB & SQLite
├── streak.js             # Logika subsystem flame streak & daily evaluator
├── deploy-commands.js    # Script registrasi slash commands ke Discord REST API
├── index.js              # Entry point utama bot, event bus, in-memory cache, & prefix commands
├── package.json          # Metadata dependensi project
└── README.md             # Dokumentasi lengkap bot
```

---

## 🤝 Lisensi & Kontribusi
Dikembangkan dengan ❤️ untuk komunitas **Mystral**.
Segala bentuk kontribusi, perbaikan bug, atau saran fitur dapat diajukan melalui Pull Request atau Issue di repositori GitHub.
