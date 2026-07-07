# 🔮 Mystral Assistant Bot (formerly 404assistant)

**Mystral Assistant** adalah Discord Bot serbaguna berbasis **discord.js v14** dan basis data **SQLite** (menggunakan driver `better-sqlite3` / `sqlite3`). Bot ini dirancang untuk menghadirkan fitur-fitur premium yang interaktif, dekoratif (berbasis Canvas), moderasi otomatis, sistem tiket bantuan, serta manajemen komunitas secara terintegrasi.

---

## 🌟 Fitur Utama

### 1. 🔥 Mystral Flame Streak Subsystem
Sistem interaksi harian dua arah otomatis antar-member tanpa perlu pairing manual.
* **Masa Inisiasi:** Mengobrol di channel khusus selama 3 hari berturut-turut untuk membentuk *Streak Pair*.
* **Evaluasi Reset:** Mengevaluasi kegagalan interaksi setiap hari pukul **00:00 WIB** (Asia/Jakarta).
* **Pengingat Otomatis:** Bot mengirim pengingat via DM pada pukul **21:00 WIB** jika salah satu pasangan belum melengkapi interaksi harian.
* **Token Pemulihan (Recovery):** Dilengkapi kuota **5 token pemulihan per bulan** yang di-reset otomatis setiap tanggal 1.
* **Canvas Premium:** Kartu status perkembangan streak beresolusi tinggi dengan tingkatan evolusi api (*Flame Tiers*) dinamis yang berubah secara otomatis mengikuti lama hari streak yang dipertahankan.

### 2. 🎴 Tarot Readings
* Ambil kartu tarot harian Anda (`/tarot pull`) untuk memperoleh ramalan bermakna yang disajikan dengan detail tema, fokus, dan ilustrasi Canvas.
* Lacak papan peringkat pengguna teraktif (`/tarot leaderboard`) dan lihat galeri kartu yang sudah Anda kumpulkan (`/tarot collection`).

### 3. 🎓 Sorting Hat & House System (Light & Dark)
* Sistem pembagian faksi otomatis ke faksi **Light** atau **Dark** melalui tes kepribadian interaktif.
* Kartu identitas faksi kustom untuk setiap faksi.

### 4. 📇 Identity Card (ID Card)
* Member dapat meregistrasikan profil mereka (nama, gender, domisili, hobi, status, tema latar).
* Menghasilkan gambar kartu identitas premium bernuansa estetik secara dinamis melalui Canvas.

### 5. 🛡️ Anti-Toxic & Auto-Moderation
* Melacak dan menyaring kata-kata kasar otomatis dari daftar sensor di berkas konfigurasi.
* Memberikan akumulasi peringatan (*warning strike*), penghapusan pesan instan, dan melakukan *timeout/mute* otomatis ketika melampaui ambang batas pelanggaran.

### 6. 🎫 Ticket System (Tiket Bantuan)
* Pembuatan panel tiket untuk aduan, bantuan, atau kemitraan.
* Menyediakan log transkrip obrolan otomatis saat tiket ditutup oleh staf bantuan.

### 7. 🔗 FAQ Manager & Self-Roles Panel
* Menyajikan FAQ interaktif melalui menu select dinamis.
* Panel *self-roles* sekali klik dengan pilihan: Generasi (Age), Minat (Interest), Wilayah (Region), Status, dan Notifikasi (Ping).

### 8. ✉️ Menfess System
* Pengiriman pesan rahasia secara anonim ke channel menfess tujuan, lengkap dengan log peninjauan rahasia oleh admin/staf.

### 9. ⏰ Reminder System
* Sistem pengingat waktu otomatis yang mendukung format durasi menit (`/remind`) maupun format jam/tanggal spesifik (`/remind_at`).

### 10. 🎁 Giveaway Manager
* Pembuatan giveaway secara langsung lewat perintah slash dengan opsi durasi, nama hadiah, dan jumlah pemenang.

### 11. 💬 Quote Generator
* Membuat kutipan gambar estetik (Canvas) dari pesan member lain menggunakan aplikasi context menu klik-kanan atau prefix command.

---

## 🛠️ Persyaratan Sistem

* **Node.js:** Versi 18 ke atas (Direkomendasikan v20+)
* **Database:** SQLite3 / better-sqlite3

---

## 🚀 Langkah Instalasi & Menjalankan Bot

### 1. Kloning Repositori & Instalasi Dependensi
```bash
git clone https://github.com/cyizzievielle/mystralassistant-bot.git
cd mystralassistant-bot
npm install
```

### 2. Konfigurasi Environment (`.env`)
Salin file konfigurasi env atau buat file `.env` di direktori utama, lalu lengkapi isinya:

```env
DISCORD_TOKEN=TOKEN_BOT_DISCORD_ANDA
CLIENT_ID=APPLICATION_ID_BOT_ANDA
GUILD_ID=ID_SERVER_DISCORD_UTAMA
BOT_OWNER_ID=ID_USER_PEMILIK_BOT
PREFIX=c

# SQLite Database
SQLITE_PATH=./data/hovassistant_v2.db

# ID Channel Penting
GENERAL_CHANNEL_ID=ID_CHANNEL_UMUM
MENFESS_CHANNEL_ID=ID_CHANNEL_MENFESS
MENFESS_LOG_CHANNEL_ID=ID_CHANNEL_LOG_MENFESS
IDCARD_CHANNEL_ID=ID_CHANNEL_ID_CARD

# Konfigurasi Faksi (Sorting Hat)
SORTING_CHANNEL_ID=ID_CHANNEL_TEST_SORTING
HOUSECARD_CHANNEL_ID=ID_CHANNEL_HOUSE_CARD
LIGHT_ROLE_ID=ID_ROLE_LIGHT_FACCTION
DARK_ROLE_ID=ID_ROLE_DARK_FACTION

# Tiket Bantuan
TICKET_CATEGORY_ID=ID_KATEGORI_TIKET
TICKET_STAFF_ROLE_ID=ID_ROLE_STAF_TIKET
TICKET_LOG_CHANNEL_ID=ID_CHANNEL_LOG_TIKET

# Anti-Toxic
TOXIC_ENABLED=1
TOXIC_WORDS=anjing,babi,tolol,goblok,bangsat,...
TOXIC_ACTION=warn
TOXIC_STRIKE_LIMIT=3
TOXIC_LOG_CHANNEL_ID=ID_CHANNEL_LOG_TOXIC
```

### 3. Daftarkan Slash Commands
Daftarkan seluruh perintah global dan lokal ke Discord API agar bisa digunakan oleh member di server:
```bash
npm run deploy:commands
```

### 4. Jalankan Bot
* Jalankan secara normal:
  ```bash
  npm start
  ```
* Atau jalankan di lingkungan pengembangan:
  ```bash
  npm run dev
  ```

---

## 💬 Daftar Slash Commands Utama

| Perintah | Deskripsi |
| :--- | :--- |
| `/streak profile [user]` | Menampilkan Kartu Profil Streak (Canvas) |
| `/streak list` | Menampilkan seluruh pasangan streak Anda |
| `/streak leaderboard` | Papan peringkat interaksi streak teraktif |
| `/streak recover` | Memulihkan streak padam (Maksimal 5x per bulan) |
| `/streak break` | Memutuskan hubungan streak dengan pasangan |
| `/tarot pull` | Mengambil ramalan kartu tarot harian |
| `/tarot collection` | Melihat daftar koleksi kartu tarot Anda |
| `/idcard register` | Membuat/mendaftar data ID Card profil Anda |
| `/idcard view` | Menampilkan visual ID Card (Canvas) |
| `/remind [durasi] [pesan]`| Membuat pengingat berdasarkan durasi waktu (misal: 10m) |
| `/warn [user] [alasan]` | Memberi peringatan pelanggaran kepada member (Admin) |

---

## 📝 Kontribusi
Jika Anda menemukan *bug* atau ingin menambahkan fitur baru pada bot ini:
1. Lakukan *fork* repositori ini.
2. Buat *branch* fitur baru Anda (`git checkout -b feature/FiturKeren`).
3. Lakukan *commit* perubahan Anda (`git commit -m 'Add new feature'`).
4. *Push* ke *branch* tersebut (`git push origin feature/FiturKeren`).
5. Ajukan sebuah *Pull Request*.
