/**
 * index.js — Mystral Academy (SQLite FINAL + PREFIX)
 * discord.js v14 + @napi-rs/canvas
 *
 * DB Engine:
 * - Prefer: better-sqlite3 (sync, fast)  -> optional
 * - Fallback: sqlite3 (async, stable)    -> recommended on many Pterodactyl images
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  Client,
  GatewayIntentBits,
  Events,
  PermissionsBitField,
  ActivityType,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  FileUploadBuilder,
  LabelBuilder,
} = require("discord.js");

const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const { joinVoiceChannel, VoiceConnectionStatus, getVoiceConnection } = require("@discordjs/voice");

// ===================== CONFIG =====================
const BRAND_NAME = "Mystral Assistant";
const ID_CARD_TITLE = "MYSTRAL IDENTITY CARD";
const EMBED_COLOR = 0x77d0d7;
const PREFIX = process.env.PREFIX || "c";

const BOT_OWNER_ID = String(process.env.BOT_OWNER_ID)

// ===================== SELF ROLES (ADD-ON) =====================
const SELFROLES = require("./selfroles.roles.js");
const { TAROT_CARDS, getTarotReading, drawTarotCard } = require("./tarot_cards.js");

const SELF_AGE_IDS_RAW = SELFROLES.age.map((x) => x.value);
const SELF_STATUS_IDS_RAW = SELFROLES.status.map((x) => x.value);
const SELF_REGION_IDS_RAW = (SELFROLES.region || []).map((x) => x.value);
const SELF_PING_IDS_RAW = (SELFROLES.ping || []).map((x) => x.value);


// mapping interest per menu (biar update 1 kategori gak ngehapus kategori lain)
const INTEREST_MENU_MAP = {
  "self:int_gaming": SELFROLES.interest.gaming || [],
  "self:int_ent": SELFROLES.interest.entertainment || [],
  "self:int_creative": SELFROLES.interest.creative || [],
};

const ALL_INTEREST_IDS = Object.values(INTEREST_MENU_MAP)
  .flat()
  .map((x) => x.value);

// === SAFETY: kalau ada role ID nyasar/duplikat lintas kategori, jangan sampai kehapus ===
const SET_AGE = new Set(SELF_AGE_IDS_RAW);
const SET_STATUS = new Set(SELF_STATUS_IDS_RAW);
const SET_INTEREST = new Set(ALL_INTEREST_IDS);
const SET_REGION = new Set(SELF_REGION_IDS_RAW);
const SET_PING = new Set(SELF_PING_IDS_RAW);
const SELF_STATUS_IDS = SELF_STATUS_IDS_RAW.filter(

  (id) => !SET_AGE.has(id) && !SET_INTEREST.has(id) && !SET_REGION.has(id) && !SET_PING.has(id)
);

const SELF_AGE_IDS = SELF_AGE_IDS_RAW.filter(
  (id) => !SET_STATUS.has(id) && !SET_INTEREST.has(id) && !SET_REGION.has(id) && !SET_PING.has(id)
);

// ✅ region remover (1 role only)
const SELF_REGION_IDS = SELF_REGION_IDS_RAW.filter(
  (id) => !SET_AGE.has(id) && !SET_STATUS.has(id) && !SET_INTEREST.has(id) && !SET_PING.has(id)
);

// ✅ ping remover (multi)
const SELF_PING_IDS = SELF_PING_IDS_RAW.filter(
  (id) => !SET_AGE.has(id) && !SET_STATUS.has(id) && !SET_INTEREST.has(id) && !SET_REGION.has(id)
);

function parseHexColor(input, fallback = EMBED_COLOR) {
  if (!input) return fallback;
  const s = String(input).trim().replace(/^0x/i, "#");
  const m = s.match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return fallback;
  return parseInt(m[1], 16);
}

function safeText(s, max = 32) {
  return String(s || "")
    .replace(/[\r\n\t]/g, " ")
    .trim()
    .slice(0, max);
}
function buildSelfSelect(customId, placeholder, options, maxValues) {
  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .addOptions(options.map((o) => ({ label: o.label, value: o.value })))
    .setMinValues(0) // allow empty to remove
    .setMaxValues(Math.min(Number(maxValues || 1), 25));
}

function selfrolesPanelEmbeds() {
  const e1 = new EmbedBuilder()
    .setTitle("🎓 AGE / GENERATION")
    .setColor(EMBED_COLOR)
    .setDescription(
      [
        "Setiap generasi memiliki cerita dan sudut pandangnya sendiri.",
        "",
        "Pilih **1 Age / Generation** yang paling menggambarkan dirimu.",
        "Pilihan ini dapat diperbarui kapan saja.",
      ].join("\n")
    )
    .setFooter({ text: "Mystral Academy • Identity Registry" });

  const e2 = new EmbedBuilder()
    .setTitle("🎯 INTEREST / HOBBY")
    .setColor(EMBED_COLOR)
    .setDescription(
      [
        "Minat membentuk cara kita berinteraksi dan berbagi cerita.",
        "",
        "Pilih bebas sesuai ketertarikanmu lewat dropdown di bawah.",
        "Kamu dapat memilih **lebih dari satu** interest (tiap dropdown bisa multi).",
        "",
        "📌 **Gaming** — game yang kamu mainkan / komunitas yang kamu ikuti.",
        "🎬 **Entertainment** — tontonan & musik yang kamu nikmati.",
        "🎨 **Creative** — karya, skill, dan gaya hidup yang kamu sukai.",
      ].join("\n")
    )
    .setFooter({ text: "Mystral Academy • Social Affinity" });

  const e3 = new EmbedBuilder()
    .setTitle("💖 STATUS")
    .setColor(EMBED_COLOR)
    .setDescription(
      [
        "Status mencerminkan keadaan yang ingin kamu tampilkan.",
        "",
        "Pilih **1 Status**, atau kosongkan untuk menghapus.",
      ].join("\n")
    )
    .setFooter({ text: "Mystral Academy • Personal State" });

  const eRegion = new EmbedBuilder()
    .setTitle("🗺️ REGION")
    .setColor(EMBED_COLOR)
    .setDescription(
      [
        "Setiap wilayah memiliki cerita, budaya, dan warna tersendiri.",
        "",
        "Pilih **1 Region** yang paling mewakili tempatmu",
        "atau kosongkan untuk menghapus pilihan.",
      ].join("\n")
    )
    .setFooter({ text: "Mystral Academy • Region" });

  const ePing = new EmbedBuilder()
    .setTitle("🔔 PING ROLES")
    .setColor(EMBED_COLOR)
    .setDescription(
      [
        "Tidak semua kabar perlu sampai ke semua orang.",
        "",
        "Pilih role ping untuk menerima notifikasi yang kamu inginkan.",
        "Kamu dapat memilih **lebih dari satu** role Ping.",
      ].join("\n")
    )
    .setFooter({ text: "Mystral Academy • Ping Opt-in" });

  // return semua embed sekaligus
  return [e1, e2, e3, eRegion, ePing];
}

//============== FONT (ULTRA FIX LINUX) =====================
const FONT_CANDIDATES = [
  {
    reg: path.join(__dirname, "assets", "fonts", "Inter-Regular.ttf"),
    bold: path.join(__dirname, "assets", "fonts", "Inter-Bold.ttf"),
    label: "__dirname/assets/fonts",
  },
  {
    reg: path.join(process.cwd(), "assets", "fonts", "Inter-Regular.ttf"),
    bold: path.join(process.cwd(), "assets", "fonts", "Inter-Bold.ttf"),
    label: "cwd/assets/fonts",
  },
  {
    reg: "/home/container/assets/fonts/Inter-Regular.ttf",
    bold: "/home/container/assets/fonts/Inter-Bold.ttf",
    label: "/home/container/assets/fonts",
  },
];

let FONT_FAMILY_REG = "DejaVu Sans";
let FONT_FAMILY_BOLD = "DejaVu Sans";

(function registerFontsSafe() {
  try {
    let picked = null;

    for (const c of FONT_CANDIDATES) {
      const regOk = fs.existsSync(c.reg);
      const boldOk = fs.existsSync(c.bold);
      if (regOk || boldOk) {
        picked = c;
        break;
      }
    }

    if (!picked) {
      return;
    }

    if (fs.existsSync(picked.reg)) {
      GlobalFonts.registerFromPath(picked.reg, "InterReg");
      FONT_FAMILY_REG = "InterReg";
    }
    if (fs.existsSync(picked.bold)) {
      GlobalFonts.registerFromPath(picked.bold, "InterBold");
      FONT_FAMILY_BOLD = "InterBold";
    }

    const cinzelRegPath = path.join(__dirname, "assets", "fonts", "Cinzel-Regular.ttf");
    const cinzelBoldPath = path.join(__dirname, "assets", "fonts", "Cinzel-Bold.ttf");
    const cinzelVarPath = path.join(__dirname, "assets", "fonts", "Cinzel-VariableFont_wght.ttf");

    if (fs.existsSync(cinzelRegPath)) {
      GlobalFonts.registerFromPath(cinzelRegPath, "Cinzel");
    }
    if (fs.existsSync(cinzelBoldPath)) {
      GlobalFonts.registerFromPath(cinzelBoldPath, "Cinzel");
    }
    if (!fs.existsSync(cinzelRegPath) && !fs.existsSync(cinzelBoldPath) && fs.existsSync(cinzelVarPath)) {
      GlobalFonts.registerFromPath(cinzelVarPath, "Cinzel");
    }

    const famNames = (GlobalFonts.families || [])
      .map((f) => (typeof f === "string" ? f : f?.family))
      .filter(Boolean);

    if (!famNames.includes("InterReg")) FONT_FAMILY_REG = "DejaVu Sans";
    if (!famNames.includes("InterBold")) FONT_FAMILY_BOLD = "DejaVu Sans";
  } catch (e) {
    // register failed
  }
})();

function setFont(ctx, weight, sizePx, family) {
  let fam = weight === "bold" ? FONT_FAMILY_BOLD : FONT_FAMILY_REG;
  if (family) fam = family;
  ctx.font = `${weight} ${sizePx}px "${fam}"`;
}

// ===================== ENV =====================
function requireEnv(name) {
  const v = process.env[name];
  return v && String(v).trim().length ? String(v).trim() : null;
}

function isBotOwner(userId) {
  return String(userId) === String(BOT_OWNER_ID);
}

// ===================== IMAGE URL VALIDATOR =====================
/**
 * Cek apakah URL adalah direct image link yang bisa ditampilkan Discord.
 * Return: null kalau valid, string pesan error kalau tidak valid.
 */
function validateDirectImageUrl(url) {
  // Harus mulai dengan https://
  if (!/^https:\/\//i.test(url)) {
    return [
      "❌ **Link gambar tidak valid.**",
      "Link harus dimulai dengan `https://` dan merupakan **direct link** ke file gambar.",
      "",
      "**✅ Contoh yang benar:**",
      "`https://i.imgur.com/abc123.png`",
      "`https://i.pinimg.com/736x/xx/yy/zz.jpg`",
      "`https://media.tenor.com/xxxxx/gif.gif`",
      "`https://cdn.discordapp.com/attachments/.../foto.jpg`",
      "",
      "**❌ Contoh yang salah:**",
      "`https://pin.it/abc123` — shortlink, bukan direct image",
      "`https://www.pinterest.com/pin/xxx` — halaman web",
      "`https://drive.google.com/file/xxx` — Google Drive",
      "`https://instagram.com/p/xxx` — halaman Instagram",
      "`http://...` — harus pakai **https**, bukan http",
      "",
      "💡 **Tips:** Klik kanan gambar → *Copy Image Address* untuk dapetin direct link-nya.",
      "ℹ️ Lihat contoh lengkap di sini: https://discord.com/channels/1251131422115106876/1456636290597523718/1520261042972790890",
    ].join("\n");
  }

  let parsed;
  try { parsed = new URL(url); } catch {
    return "❌ **Link gambar tidak valid** — format URL salah.";
  }

  const pathname = parsed.pathname.toLowerCase();

  // Cek ekstensi file gambar
  const hasImageExt = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/.test(pathname);

  // Domain CDN terpercaya yang boleh tanpa ekstensi
  const trustedDomains = [
    "i.imgur.com",
    "cdn.discordapp.com",
    "media.discordapp.net",
    "i.pinimg.com",
    "media.tenor.com",
    "c.tenor.com",
    "raw.githubusercontent.com",
    "pbs.twimg.com",         // Twitter/X image CDN
    "images.unsplash.com",
    "upload.wikimedia.org",
    "media.giphy.com",
    "i.giphy.com",
  ];
  const isTrustedCdn = trustedDomains.some(d => parsed.hostname === d || parsed.hostname.endsWith("." + d));

  if (!hasImageExt && !isTrustedCdn) {
    return [
      "❌ **Link gambar tidak valid.**",
      "Link harus berupa **direct link** ke file gambar (berakhiran `.jpg`, `.png`, `.gif`, `.webp`, dll.),",
      "atau berasal dari CDN gambar yang dikenal.",
      "",
      "**✅ Contoh yang benar:**",
      "`https://i.imgur.com/abc123.png`",
      "`https://i.pinimg.com/736x/xx/yy/zz.jpg`",
      "`https://media.tenor.com/xxxxx/gif.gif`",
      "`https://cdn.discordapp.com/attachments/.../foto.jpg`",
      "",
      "**❌ Contoh yang salah:**",
      "`https://pin.it/abc123` — shortlink Pinterest",
      "`https://www.pinterest.com/pin/xxx` — halaman web biasa",
      "`https://drive.google.com/file/xxx` — Google Drive",
      "`https://instagram.com/p/xxx` — halaman Instagram",
      "`https://linktr.ee/xxx` — halaman Linktree",
      "",
      "💡 **Tips:** Klik kanan gambar → *Copy Image Address* untuk dapetin direct link-nya.\nℹ️ Lihat contoh lengkap di sini: https://discord.com/channels/1251131422115106876/1456636290597523718/1520261042972790890",
    ].join("\n");
  }

  return null; // valid!
}

// ✅ SATU AJA (jangan dobel)
const SQLITE_PATH = requireEnv("SQLITE_PATH") || "./data/hovassistant_v2.db";
const dir = path.dirname(SQLITE_PATH);
if (dir && dir !== "." && dir !== "/") fs.mkdirSync(dir, { recursive: true });

// ===================== DB BACKUP CONFIG =====================
const BACKUP_DIR = path.join(path.dirname(SQLITE_PATH), "_backups");
const BACKUP_EVERY_MIN = Number(process.env.BACKUP_EVERY_MIN || 360); // 6 jam
const BACKUP_KEEP = Number(process.env.BACKUP_KEEP || 30);
const OWNER_DM_BACKUP_TIMES = String(process.env.OWNER_DM_BACKUP_TIMES || "00:00,18:00")
  .split(",")
  .map((x) => x.trim())
  .filter((x) => /^([01]\d|2[0-3]):[0-5]\d$/.test(x));
const OWNER_DM_BACKUP_META_KEY = "owner_dm_db_backup_last_slot";

// ===================== DB ENGINE AUTO =====================
let DB_ENGINE = null;

// Try better-sqlite3 first
let BetterSqlite = null;
try {
  BetterSqlite = require("better-sqlite3");
  DB_ENGINE = "better-sqlite3";
} catch { }

// fallback sqlite3
let sqlite3 = null;
if (!DB_ENGINE) {
  try {
    sqlite3 = require("sqlite3").verbose();
    DB_ENGINE = "sqlite3";
  } catch { }
}

if (!DB_ENGINE) {
  console.error("❌ Tidak ada DB engine terpasang. Install salah satu:");
  console.error("   yarn add sqlite3");
  console.error("   (optional) yarn add better-sqlite3");
  process.exit(1);
}

// Wrapper interface
let db = null;
let dbGet = null;
let dbAll = null;
let dbRun = null;
let dbExec = null;
let dbTransaction = null;

function openDb() {
  if (DB_ENGINE === "better-sqlite3") {
    db = new BetterSqlite(SQLITE_PATH);

    db.pragma("wal_checkpoint(TRUNCATE)");
    db.pragma("synchronous = NORMAL");
    db.pragma("foreign_keys = ON");

    dbGet = (sql, params = []) => db.prepare(sql).get(params);
    dbAll = (sql, params = []) => db.prepare(sql).all(params);
    dbRun = (sql, params = []) => db.prepare(sql).run(params);
    dbExec = (sql) => db.exec(sql);

    dbTransaction = (fn) => {
      const tx = db.transaction(fn);
      return (...args) => tx(...args);
    };

    return;
  }

  // sqlite3 (async)
  db = new sqlite3.Database(SQLITE_PATH);

  dbExec = (sql) =>
    new Promise((resolve, reject) => {
      db.exec(sql, (err) => (err ? reject(err) : resolve()));
    });

  dbRun = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes ?? 0, lastID: this.lastID });
      });
    });

  dbGet = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });

  dbAll = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });

  // transaction emulation
  dbTransaction = (fn) => {
    return async (...args) => {
      await dbRun("BEGIN IMMEDIATE");
      try {
        const res = await fn(...args);
        await dbRun("COMMIT");
        return res;
      } catch (e) {
        await dbRun("ROLLBACK").catch(() => { });
        throw e;
      }
    };
  };

}

// ===================== DB SAFE HELPERS (works for better-sqlite3 + sqlite3) =====================
// ===================== DB SAFE HELPERS (FIXED) =====================
async function safeGet(sql, params = []) {
  try { return await dbGet(sql, params); } catch (e) { console.error(e); return null; }
}

async function safeAll(sql, params = []) {
  try { return await dbAll(sql, params); } catch (e) { console.error(e); return []; }
}

async function safeRun(sql, params = []) {
  try {
    // Tambahkan return di sini agar objek { changes, lastID } bisa dipakai
    return await dbRun(sql, params);
  } catch (e) {
    console.error("[DB RUN ERROR]", e);
    return { changes: 0, lastID: null };
  }
}

async function safeExec(sql) {
  try { return await dbExec(sql); } catch (e) { console.error(e); return null; }
}
// ===================== DB BACKUP HELPER =====================
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function rotateBackups(dir, keep) {
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith(".db"))
    .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);

  files.slice(keep).forEach(x => {
    fs.unlinkSync(path.join(dir, x.f));
  });
}

async function backupDatabase(reason = "scheduled") {
  try {
    ensureDir(BACKUP_DIR);

    // paksa WAL masuk db utama (aman walau non-WAL)
    await safeRun("PRAGMA wal_checkpoint(FULL);").catch(() => null);

    const stamp = new Date(Date.now() + 7 * 60 * 60 * 1000)
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);

    const out = path.join(BACKUP_DIR, `backup_${stamp}_${reason}.db`);
    fs.copyFileSync(SQLITE_PATH, out);

    rotateBackups(BACKUP_DIR, BACKUP_KEEP);
    if (reason === "startup") {
      console.log(` ├── [BACKUP] Startup backup OK: ${path.basename(out)}`);
    } else {
      console.log(` ├── [BACKUP] OK: ${path.basename(out)} (${reason})`);
    }
    return { ok: true, path: out };
  } catch (e) {
    console.error("[BACKUP] FAIL:", e);
    return { ok: false, error: e };
  }
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!parts.length || seconds) parts.push(`${seconds}s`);
  return parts.join(" ");
}

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

async function countRegisteredCommands(discordClient, guildId = null) {
  try {
    const globalCommands = await discordClient.application.commands.fetch();
    let total = globalCommands.size;

    if (guildId) {
      const guildCommands = await discordClient.application.commands.fetch({ guildId });
      total += guildCommands.size;
    }

    return total;
  } catch (e) {
    console.error("[BOTSTATUS] command count failed:", e?.message || e);
    return null;
  }
}

async function sendDatabaseBackupToOwners(discordClient, reason = "scheduled", slotLabel = null) {
  try {
    if (!BOT_OWNER_IDS.length) {
      console.warn("[BACKUP DM] Skip: BOT_OWNER_ID belum diisi.");
      return;
    }

    const today = wibDayKey();
    const slotKey = slotLabel ? `${today} ${slotLabel}` : `${today} ${reason}`;
    const lastSentSlot = await getMetaText(OWNER_DM_BACKUP_META_KEY);
    if (lastSentSlot === slotKey) return;

    // Pastikan isi WAL sudah masuk ke file utama sebelum file .db dikirim.
    await safeRun("PRAGMA wal_checkpoint(FULL);").catch(() => null);

    const sqliteBackupFiles = [
      SQLITE_PATH,
      `${SQLITE_PATH}-shm`,
      `${SQLITE_PATH}-wal`,
    ].filter((filePath) => fs.existsSync(filePath));

    if (!sqliteBackupFiles.length) {
      console.warn("[BACKUP DM] Skip: file database tidak ditemukan:", SQLITE_PATH);
      return;
    }

    let delivered = 0;
    for (const ownerId of BOT_OWNER_IDS) {
      try {
        const owner = await discordClient.users.fetch(ownerId);
        await owner.send({
          content: `Backup database (${slotKey} WIB)`,
          files: sqliteBackupFiles.map((filePath) => ({
            attachment: filePath,
            name: path.basename(filePath),
          })),
        });
        delivered++;
      } catch (e) {
        console.error(`[BACKUP DM] Gagal kirim ke owner ${ownerId}:`, e?.message || e);
      }
    }

    if (delivered > 0) {
      await setMetaText(OWNER_DM_BACKUP_META_KEY, slotKey);
      console.log(
        `[BACKUP DM] OK: ${sqliteBackupFiles.map((filePath) => path.basename(filePath)).join(", ")} -> ${delivered} owner (${reason})`
      );
    }
  } catch (e) {
    console.error("[BACKUP DM] FAIL:", e);
  }
}

function nextOwnerDmBackupSlot(now = Date.now()) {
  const times = OWNER_DM_BACKUP_TIMES.length ? OWNER_DM_BACKUP_TIMES : ["00:00", "18:00"];
  const wibNow = new Date(now + 7 * 60 * 60 * 1000);
  const year = wibNow.getUTCFullYear();
  const month = wibNow.getUTCMonth();
  const day = wibNow.getUTCDate();

  const candidates = times.map((time) => {
    const [hour, minute] = time.split(":").map(Number);
    let utcMs = Date.UTC(year, month, day, hour - 7, minute, 0, 0);
    if (utcMs <= now) utcMs += 24 * 60 * 60 * 1000;
    return { time, utcMs };
  });

  return candidates.sort((a, b) => a.utcMs - b.utcMs)[0];
}

function startOwnerDmBackupSchedule(discordClient) {
  const scheduleNext = () => {
    const next = nextOwnerDmBackupSlot();
    const delay = Math.max(1_000, next.utcMs - Date.now());

    console.log(` └── [BACKUP DM] Next scheduled DM: ${next.time} WIB`);
    setTimeout(async () => {
      await sendDatabaseBackupToOwners(discordClient, `scheduled_${next.time.replace(":", "")}`, next.time);
      scheduleNext();
    }, delay);
  };

  scheduleNext();
}

// =======================
// MENFESS ID HELPER
// =======================
async function nextMenfessId() {
  const row = await safeGet(
    `SELECT value FROM menfess_meta WHERE key='menfess_last_id'`
  );

  const current = Number(row?.value || 0);
  const next = current + 1;

  await safeRun(
    `UPDATE menfess_meta SET value=? WHERE key='menfess_last_id'`,
    [next]
  );

  return next;
}

// ===================== DISCORD CLIENT =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

// anti-crash
process.on("unhandledRejection", (reason) => console.error("[unhandledRejection]", reason));
process.on("uncaughtException", (err) => console.error("[uncaughtException]", err));
client.on("error", (err) => console.error("[client error]", err));

// taruh di atas / utils
const BOT_OWNER_IDS = String(process.env.BOT_OWNER_ID || "")
  .split(",")
  .map(x => x.trim())
  .filter(Boolean);

function isBotOwner(userId) {
  return BOT_OWNER_IDS.includes(String(userId));
}

// ===================== UTILS =====================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ===================== MUSIC CONTROL CENTER (REAL-TIME) =====================
// ENV:
// - MUSIC_BOT_ROLE_ID=...   (role yang isinya bot-bot music)
// - MUSIC_CONTROL_CHANNEL_ID=... (channel text tempat dashboard)
// Catatan: membutuhkan intents GuildMembers + GuildVoiceStates
const MUSIC_BOT_ROLE_ID = process.env.MUSIC_BOT_ROLE_ID;
const MUSIC_CONTROL_CHANNEL_ID = process.env.MUSIC_CONTROL_CHANNEL_ID;

// Simpan message dashboard per guild (persist ke file biar gak bikin pesan baru terus)
const MUSIC_CC_STORE_PATH = path.join(__dirname, "data", "music_control_center.json");

function readMusicCcStore() {
  try {
    if (!fs.existsSync(MUSIC_CC_STORE_PATH)) return {};
    const raw = fs.readFileSync(MUSIC_CC_STORE_PATH, "utf8");
    const obj = JSON.parse(raw || "{}");
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function writeMusicCcStore(store) {
  try {
    const dir = path.dirname(MUSIC_CC_STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MUSIC_CC_STORE_PATH, JSON.stringify(store || {}, null, 2));
  } catch { }
}

let musicCcStore = readMusicCcStore(); // { [guildId]: { channelId, messageId } }
const musicCcDebounce = new Map(); // guildId -> timeout

async function buildMusicControlCenterBody(guild) {
  if (!MUSIC_BOT_ROLE_ID) return null;

  const role = await guild.roles.fetch(MUSIC_BOT_ROLE_ID).catch(() => null);
  if (!role) return null;

  // Pastikan cache member penuh supaya role.members lengkap (22/22)
  await guild.members.fetch().catch(() => { });

  const members = Array.from(role.members.values());

  const active = [];
  const idle = [];

  for (const m of members) {
    const vc = m.voice?.channel;
    if (vc) active.push({ name: m.user.username, vcId: vc.id });
    else idle.push({ name: m.user.username });
  }

  active.sort((a, b) => a.name.localeCompare(b.name));
  idle.sort((a, b) => a.name.localeCompare(b.name));

  const pad = (n) => String(n).padStart(2, "0");

  let index = 1;

  const activeText = active.length
    ? active
      .map((b) => {
        const line = `   ${pad(index)} | ${b.name}\n      ↳ <#${b.vcId}>`;
        index++;
        return line;
      })
      .join("\n\n")
    : "   — Tidak ada bot aktif";

  const idleText = idle.length
    ? idle
      .map((b) => {
        const line = `   ${pad(index)} | ${b.name}`;
        index++;
        return line;
      })
      .join("\n")
    : "   — Semua sedang aktif";

  // IMPORTANT:
  // Jangan pakai codeblock ``` karena mention <#id> gak akan ke-render.
  // Di embed description, mention channel akan clickable.
  const body =
    `╭── 🎧  Music Control Center ────────────╮

   ◉  LIVE IN VOICE  (${active.length})
   ────────────────────
${activeText}


   ○  STANDBY  (${idle.length})
   ────────────────────
${idleText}

╰──────────────────────────────────────╯`;

  return { body, total: members.length, activeCount: active.length, idleCount: idle.length };
}

async function upsertMusicControlCenter(guild) {
  try {
    if (!MUSIC_CONTROL_CHANNEL_ID) return;

    const ch = await guild.channels.fetch(MUSIC_CONTROL_CHANNEL_ID).catch(() => null);
    if (!ch || !ch.isTextBased?.()) return;

    const data = await buildMusicControlCenterBody(guild);
    if (!data?.body) return;

    const panel = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# 🎧 Music Control Center"),
        new TextDisplayBuilder().setContent(data.body)
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Total: ${data.total} • Live: ${data.activeCount} • Standby: ${data.idleCount}`
        )
      );

    const prev = musicCcStore[guild.id];
    const prevMsgId = prev?.messageId;
    const prevChId = prev?.channelId;

    // Kalau sebelumnya ada, coba edit
    if (prevMsgId && prevChId === String(MUSIC_CONTROL_CHANNEL_ID)) {
      const msg = await ch.messages.fetch(prevMsgId).catch(() => null);
      if (msg) {
        if (msg.flags?.has?.(MessageFlags.IsComponentsV2)) {
          await msg.edit({ components: [panel] }).catch(() => { });
          return;
        }
        await msg.delete().catch(() => { });
      }
    }

    // Kalau gak ada / kehapus, kirim baru
    const sent = await ch.send({ components: [panel], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
    if (sent) {
      musicCcStore[guild.id] = { channelId: String(MUSIC_CONTROL_CHANNEL_ID), messageId: String(sent.id) };
      writeMusicCcStore(musicCcStore);
    }
  } catch { }
}

function queueMusicControlCenterUpdate(guild, delayMs = 900) {
  try {
    const gid = guild?.id;
    if (!gid) return;

    if (musicCcDebounce.has(gid)) clearTimeout(musicCcDebounce.get(gid));
    musicCcDebounce.set(
      gid,
      setTimeout(() => {
        musicCcDebounce.delete(gid);
        upsertMusicControlCenter(guild).catch(() => { });
      }, delayMs)
    );
  } catch { }
}

// ===================== MOD LOG =====================
async function sendModLog(guild, embed) {
  const chId = requireEnv("MODLOG_CHANNEL_ID");
  if (!chId) return;
  const ch = await getTextChannelOrNull(guild, chId);
  if (!ch) return;
  await ch.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => { });
}

async function logMod(guild, title, color, fields, targetUser = null) {
  const embed = new EmbedBuilder()
    .setTitle(`🛡️ ${title}`)
    .setColor(color)
    .addFields(fields)
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/1022/1022300.png') // Icon peringatan
    .setFooter({ text: "Mystral Academy • Disciplinary System" })
    .setTimestamp();

  if (targetUser) {
    // Menambahkan foto profil user yang di-warn agar terlihat resmi
    embed.setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }));
  }

  await sendModLog(guild, embed);
  return embed;
}

function hasPerm(member, perm) {
  try { return member?.permissions?.has?.(perm); } catch { return false; }
}

// ===================== WARN SYSTEM =====================
async function addWarning(guildId, userId, moderatorId, reason = "") {
  await safeRun(
    `INSERT INTO mod_warnings (guild_id, user_id, moderator_id, reason, created_at)
     VALUES (?,?,?,?,?)`,
    [String(guildId), String(userId), String(moderatorId), safeText(reason, 180), Date.now()]
  );
}
async function listWarnings(guildId, userId, limit = 10) {
  return await safeAll(
    `SELECT id, moderator_id, reason, created_at
     FROM mod_warnings
     WHERE guild_id=? AND user_id=?
     ORDER BY created_at DESC
     LIMIT ?`,
    [String(guildId), String(userId), Number(limit)]
  );
}
async function clearWarnings(guildId, userId) {
  const r = await safeRun(`DELETE FROM mod_warnings WHERE guild_id=? AND user_id=?`, [String(guildId), String(userId)]);
  return r?.changes || 0;
}

async function removeWarningById(guildId, warnId) {
  const r = await safeRun(
    `DELETE FROM mod_warnings WHERE guild_id=? AND id=?`,
    [String(guildId), Number(warnId)]
  );
  return r?.changes || 0;
}

// ===================== TIMEOUT/MUTE =====================
async function applyTimeout(member, minutes, reason) {
  const ms = Math.max(1, Number(minutes)) * 60 * 1000;
  await member.timeout(ms, reason || "Moderation").catch(() => null);
}
async function removeTimeout(member, reason) {
  await member.timeout(null, reason || "Moderation").catch(() => null);
}

async function applyMute(member, minutes, reason) {
  const muteRoleId = requireEnv("MUTE_ROLE_ID");
  if (muteRoleId) {
    await member.roles.add(muteRoleId, reason || "Mute").catch(() => null);
    return { mode: "role" };
  }
  await applyTimeout(member, minutes, reason);
  return { mode: "timeout" };
}
async function removeMute(member, reason) {
  const muteRoleId = requireEnv("MUTE_ROLE_ID");
  if (muteRoleId && member.roles.cache.has(muteRoleId)) {
    await member.roles.remove(muteRoleId, reason || "Unmute").catch(() => null);
    return { mode: "role" };
  }
  await removeTimeout(member, reason);
  return { mode: "timeout" };
}

// ===================== CALCULATOR (SAFE+ / ADV MATH) =====================
function calcSafe(expr) {
  const s0 = String(expr || "").trim();
  if (!s0) return null;
  if (s0.length > 160) return null;

  // Normalisasi input user
  let s = s0
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/:/g, "/")
    .replace(/x/gi, "*")
    .replace(/\^/g, "**")              // pangkat: 2^3 -> 2**3
    .replace(/\bpi\b/gi, "PI")         // konstanta
    .replace(/\be\b/g, "E");           // konstanta e (case-sensitive biar gak ganggu kata lain)

  // Faktorial: 5! atau (3+2)!  -> fact(5) / fact((3+2))
  // Loop biar bisa menangani 5!! (jadi fact(fact(5))) (dibatasi)
  for (let k = 0; k < 6 && /!/.test(s); k++) {
    s = s.replace(/(\d+(\.\d+)?|\))\s*!/g, (m) => {
      // m contoh: "5!" atau ")!"
      const token = m.slice(0, -1).trim();
      if (token === ")") return "fact(__LAST__)"; // guard, akan ditangani di bawah
      return `fact(${token})`;
    });

    // ganti kasus ")!" yang barusan jadi placeholder: cari pola "__LAST__" dan bungkus ekspresi sebelum itu
    // contoh: "(3+2)fact(__LAST__)" tidak mungkin, jadi kita handle berbeda:
    s = s.replace(/fact\(__LAST__\)/g, ""); // fallback: kalau gagal parsing, biar invalid -> null
  }

  // Whitelist karakter & nama fungsi/konstanta
  // Izinkan: angka, operator, spasi, koma, titik, kurung, huruf untuk nama fungsi
  if (!/^[0-9+\-*/().,%\sA-Za-z_]+$/.test(s)) return null;

  // Block hal berbahaya
  if (/constructor|__proto__|prototype|globalThis|process|require|import|export|eval|Function|this|window|document/i.test(s)) {
    return null;
  }

  // Sandbox math: hanya expose yang boleh
  const M = {
    PI: Math.PI,
    E: Math.E,
    abs: Math.abs,
    sqrt: Math.sqrt,
    pow: Math.pow,
    min: Math.min,
    max: Math.max,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    ln: Math.log,
    log: (a, base) => (base === undefined ? Math.log10(a) : Math.log(a) / Math.log(base)),
    exp: Math.exp,

    // trig default: DERajat biar gampang
    sin: (deg) => Math.sin((deg * Math.PI) / 180),
    cos: (deg) => Math.cos((deg * Math.PI) / 180),
    tan: (deg) => Math.tan((deg * Math.PI) / 180),

    // trig radian explicit
    sinr: Math.sin,
    cosr: Math.cos,
    tanr: Math.tan,

    // factorial
    fact: (n) => {
      if (!Number.isFinite(n)) throw new Error("fact");
      if (n < 0) throw new Error("fact");
      if (Math.floor(n) !== n) throw new Error("fact");
      if (n > 170) throw new Error("fact"); // prevent Infinity
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    },
  };

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      "M",
      `"use strict";
       const {PI,E,abs,sqrt,pow,min,max,round,floor,ceil,ln,log,exp,sin,cos,tan,sinr,cosr,tanr,fact} = M;
       return (${s});
      `
    );

    const out = fn(M);
    if (typeof out !== "number" || !Number.isFinite(out)) return null;

    // rapihin floating kecil
    const cleaned = Object.is(out, -0) ? 0 : out;
    return Math.abs(cleaned) < 1e15 ? Number(cleaned.toPrecision(15)) : cleaned;
  } catch {
    return null;
  }
}

// ===================== ANTI-TOXIC =====================
const TOXIC_WORDS = [
  "anjing", "babi", "tolol", "goblok", "bangsat", "kontol", "memek", "ngentot", "asu", "bajingan", "tai"
].map(w => w.toLowerCase());

function containsToxic(text) {
  const t = String(text || "").toLowerCase();
  // deteksi kata “nyerempet” juga (goblokkk)
  return TOXIC_WORDS.some(w => t.includes(w));
}

async function toxicStrike(guildId, userId) {
  const row = await safeGet(`SELECT strikes, last_at FROM toxic_strikes WHERE guild_id=? AND user_id=?`, [String(guildId), String(userId)]);
  const strikes = Number(row?.strikes || 0) + 1;
  await safeRun(
    `INSERT INTO toxic_strikes (guild_id, user_id, strikes, last_at)
     VALUES (?,?,?,?)
     ON CONFLICT(guild_id, user_id) DO UPDATE SET strikes=excluded.strikes, last_at=excluded.last_at`,
    [String(guildId), String(userId), strikes, Date.now()]
  );
  return strikes;
}

// ===================== GIVEAWAY =====================
function parseDurationToMs(input) {
  // format: 10m, 2h, 1d
  const m = /^(\d+)\s*([smhd])$/i.exec(String(input || "").trim());
  if (!m) return null;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const mult = u === "s" ? 1000 : u === "m" ? 60_000 : u === "h" ? 3_600_000 : 86_400_000;
  return n * mult;
}

async function createGiveaway({ guildId, channelId, hostId, prize, winners, endAt }) {
  const r = await safeRun(
    `INSERT INTO giveaways (guild_id, channel_id, prize, winners, end_at, host_id, is_ended)
     VALUES (?,?,?,?,?,?,0)`,
    [String(guildId), String(channelId), safeText(prize, 140), Number(winners), Number(endAt), String(hostId)]
  );

  // ✅ sqlite3 => lastID, better-sqlite3 => lastInsertRowid
  return r?.lastID ?? r?.lastInsertRowid ?? null;
}


async function getGiveaway(id) {
  return await safeGet(`SELECT * FROM giveaways WHERE id=?`, [Number(id)]);
}
async function setGiveawayMessage(id, messageId) {
  await safeRun(`UPDATE giveaways SET message_id=? WHERE id=?`, [String(messageId), Number(id)]);
}
async function joinGiveaway(giveawayId, userId) {
  await safeRun(
    `INSERT INTO giveaway_entries (giveaway_id, user_id, joined_at)
     VALUES (?,?,?)
     ON CONFLICT(giveaway_id, user_id) DO NOTHING`,
    [Number(giveawayId), String(userId), Date.now()]
  );
}
async function leaveGiveaway(giveawayId, userId) {
  await safeRun(`DELETE FROM giveaway_entries WHERE giveaway_id=? AND user_id=?`, [Number(giveawayId), String(userId)]);
}
async function countGiveawayEntries(giveawayId) {
  const r = await safeGet(`SELECT COUNT(*) AS n FROM giveaway_entries WHERE giveaway_id=?`, [Number(giveawayId)]);
  return Number(r?.n || 0);
}
async function listGiveawayEntries(giveawayId) {
  return await safeAll(
    `SELECT user_id, joined_at
     FROM giveaway_entries
     WHERE giveaway_id=?
     ORDER BY joined_at ASC`,
    [Number(giveawayId)]
  );
}
async function pickGiveawayWinners(giveawayId, winnersCount) {
  const rows = await safeAll(`SELECT user_id FROM giveaway_entries WHERE giveaway_id=?`, [Number(giveawayId)]);
  if (!rows.length) return [];

  let pool = rows.map(r => r.user_id);
  const winners = [];

  // Ambil pemenang sebanyak winnersCount atau maksimal isi peserta yang ada
  const count = Math.min(pool.length, Number(winnersCount));

  for (let i = 0; i < count; i++) {
    const index = crypto.randomInt(0, pool.length);
    winners.push(pool[index]);
    pool.splice(index, 1); // Hapus agar tidak menang lagi di putaran ini
  }

  return winners;
}
async function endGiveaway(giveawayId) {
  await safeRun(`UPDATE giveaways SET is_ended=1, ended_at=? WHERE id=?`, [Date.now(), Number(giveawayId)]);
}
async function listActiveGiveaways(guildId) {
  return await safeAll(
    `SELECT * FROM giveaways
     WHERE guild_id=? AND is_ended=0
     ORDER BY end_at ASC`,
    [String(guildId)]
  );
}
async function deleteGiveaway(giveawayId) {
  await safeRun(`DELETE FROM giveaway_entries WHERE giveaway_id=?`, [Number(giveawayId)]);
  await safeRun(`DELETE FROM giveaways WHERE id=?`, [Number(giveawayId)]);
}
async function getHouseCardPost(userId) {
  return await safeGet(`SELECT * FROM house_cards WHERE user_id=?`, [String(userId)]);
}
async function setHouseCardPost({ userId, guildId, channelId, messageId }) {
  await safeRun(
    `INSERT INTO house_cards (user_id, guild_id, channel_id, message_id, updated_at)
     VALUES (?,?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET
       guild_id=excluded.guild_id,
       channel_id=excluded.channel_id,
       message_id=excluded.message_id,
       updated_at=excluded.updated_at`,
    [String(userId), String(guildId), String(channelId), String(messageId), Date.now()]
  );
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body };
}

async function getGitHubProfile(username) {
  return fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2026-03-10",
      "User-Agent": "mystralassistant",
    },
  });
}

async function getRobloxProfile(username) {
  const lookup = await fetchJson("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
  });

  const userId = lookup.body?.data?.[0]?.id;
  if (!lookup.ok || !userId) {
    return { ok: false, status: lookup.status, body: null };
  }

  return fetchJson(`https://users.roblox.com/v1/users/${userId}`);
}

async function getRobloxAvatarHeadshot(userId) {
  const qs = new URLSearchParams({
    userIds: String(userId),
    size: "420x420",
    format: "Png",
    isCircular: "false",
  });
  const result = await fetchJson(`https://thumbnails.roblox.com/v1/users/avatar-headshot?${qs.toString()}`);
  return result.ok ? result.body?.data?.[0]?.imageUrl || null : null;
}

async function getSteamProfile(steamId) {
  const key = String(process.env.STEAM_API_KEY || "").trim();
  if (!key) return { ok: false, status: 0, body: null, missingKey: true };

  const qs = new URLSearchParams({
    key,
    steamids: String(steamId),
  });
  return fetchJson(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?${qs.toString()}`);
}

async function resolveSteamVanityUrl(vanity) {
  const key = String(process.env.STEAM_API_KEY || "").trim();
  if (!key) return { ok: false, status: 0, body: null, missingKey: true };

  const qs = new URLSearchParams({
    key,
    vanityurl: String(vanity),
  });
  return fetchJson(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?${qs.toString()}`);
}

async function getChessProfile(username) {
  return fetchJson(`https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}`, {
    headers: {
      "User-Agent": "mystralassistant/1.0",
    },
  });
}

async function getChessStats(username) {
  return fetchJson(`https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/stats`, {
    headers: {
      "User-Agent": "mystralassistant/1.0",
    },
  });
}

const TOD_SEED_QUESTIONS = require("./tod.questions.js");

async function seedTodQuestionsIfNeeded() {
  const row = await safeGet(`SELECT COUNT(*) AS n FROM tod_questions`);
  if (Number(row?.n || 0) > 0) return;

  for (const [type, category, rating, question] of TOD_SEED_QUESTIONS) {
    await safeRun(
      `INSERT INTO tod_questions (type, category, rating, question, source, created_at)
       VALUES (?,?,?,?,?,?)`,
      [type, category, rating, question, "seed", Date.now()]
    );
  }
}

function todThemeForToday() {
  const themes = ["funny", "deep talk", "relationship", "chaos", "spicy ringan"];
  const jakartaDay = new Date(Date.now() + 7 * 60 * 60 * 1000).getUTCDate();
  return themes[(jakartaDay - 1) % themes.length];
}

async function getRandomTodQuestion({ type = null, category = null } = {}) {
  const where = ["is_active=1"];
  const params = [];
  if (type) {
    where.push("type=?");
    params.push(type);
  }
  if (category) {
    where.push("category=?");
    params.push(category);
  }
  const rows = await safeAll(
    `SELECT * FROM tod_questions WHERE ${where.join(" AND ")}`,
    params
  );
  if (!rows.length) {
    return {
      id: 0,
      type: type || (Math.random() < 0.5 ? "truth" : "dare"),
      category: category || "ai fallback",
      rating: "PG",
      question:
        type === "dare"
          ? "Buat satu pesan paling wholesome yang bisa kamu kirim ke chat sekarang."
          : "Apa satu hal kecil yang akhir-akhir ini diam-diam bikin kamu senang?",
      source: "ai_fallback",
    };
  }
  return rows[Math.floor(Math.random() * rows.length)];
}

function todDisplayCode(question) {
  const seed = String(question?.id || Date.now());
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `C-${hash.toString(36).toUpperCase().slice(-3).padStart(3, "0")}`;
}

function todCard(question, requestedBy) {
  return new EmbedBuilder()
    .setTitle(question.type === "dare" ? "🎲 Dare" : "🕯️ Truth")
    .setColor(0x1f1b24)
    .setDescription(`**${question.question}**`)
    .addFields(
      {
        name: "Info",
        value:
          `Requested by <@${requestedBy}>\n` +
          `\`${String(question.type).toUpperCase()}\` • \`${question.rating}\` • \`${todDisplayCode(question)}\``,
        inline: false,
      }
    )
    .setFooter({ text: "Mystral Academy • Truth or Dare" })
    .setTimestamp();
}

function todRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("tod:truth").setLabel("Truth").setStyle(ButtonStyle.Secondary).setEmoji("🕯️"),
    new ButtonBuilder().setCustomId("tod:dare").setLabel("Dare").setStyle(ButtonStyle.Secondary).setEmoji("🎲"),
    new ButtonBuilder().setCustomId("tod:random").setLabel("Random").setStyle(ButtonStyle.Primary).setEmoji("✨")
  );
}

async function sendTodQuestion(channel, question, requestedBy) {
  return channel.send({
    embeds: [todCard(question, requestedBy)],
    components: [todRow()],
    allowedMentions: { parse: [] },
  });
}

// ===================== VOICE STATS (FIX) =====================
async function updateStatsChannels(guild) {
  try {
    if (!guild) return;

    const categoryId = requireEnv("STATS_CATEGORY_ID");
    if (!categoryId) return;

    const category = await guild.channels.fetch(categoryId).catch(() => null);
    if (!category) return;

    // ✅ v14: ambil semua channel lalu filter yang parentId-nya categoryId
    const allChannels = await guild.channels.fetch().catch(() => null);
    if (!allChannels) return;

    const voiceInCategory = allChannels.filter(
      (ch) => ch?.isVoiceBased?.() && ch.parentId === categoryId
    );


    if (!voiceInCategory.size) return;

    // ✅ member counts (lebih hemat: pakai cache kalau ada, kalau nggak fetch sekali)
    let members;
    try {
      members = guild.members.cache?.size ? guild.members.cache : await guild.members.fetch();
    } catch {
      members = null;
    }
    if (!members) return;

    const total = guild.memberCount ?? members.size;
    const bots = members.filter((m) => m.user?.bot).size;
    const humans = total - bots;
    const boosts = guild.premiumSubscriptionCount || 0;

    // Nama final yang mau dipakai
    const names = {
      all: `🔊 All Members: ${total}`,
      members: `👤 Members: ${humans}`,
      bots: `🤖 Bots: ${bots}`,
      boosts: `💎 Boosts: ${boosts}`,
    };

    // ✅ Deteksi target channel berdasarkan AWAL nama (prefix), bukan includes
    //   Biar "All Members" nggak ketembak "members".
    const detectKey = (name) => {
      const n = String(name || "").toLowerCase().trim();

      // buang emoji & spasi depan
      const clean = n.replace(/^[^\w]+/g, "").trim(); // hapus emoji/simbol di awal
      // contoh clean: "all members: 341"

      if (clean.startsWith("all")) return "all";
      if (clean.startsWith("members")) return "members";
      if (clean.startsWith("bots")) return "bots";
      if (clean.startsWith("boosts")) return "boosts";

      // fallback tambahan (kalau kamu pakai label lain)
      if (clean.startsWith("all members")) return "all";
      return null;
    };

    for (const ch of voiceInCategory.values()) {
      const key = detectKey(ch.name);
      if (!key) continue;

      const newName = names[key];
      if (newName && ch.name !== newName) {
        await ch.setName(newName).catch(() => { });
      }
    }
  } catch (e) {
    console.error("[STATS] update failed:", e?.message || e);
  }
}

// ===================== PROFILE (EMBED + BUTTONS) =====================
async function buildProfileEmbed({ guild, user, member }) {
  // fetch full user untuk banner
  const userFull = await client.users.fetch(user.id, { force: true }).catch(() => null);
  const bannerUrl = userFull?.bannerURL?.({ extension: "png", size: 1024 }) || null;

  // DB data
  const idData = await getIdCard(user.id).catch(() => null);
  const sorted = await getSortedUser(user.id).catch(() => null);
  const afk = await getAfk(user.id).catch(() => null);

  // timeline
  const createdUnix = Math.floor((user.createdTimestamp || Date.now()) / 1000);
  const joinedUnix = member?.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;

  // roles
  const roleMentions = member
    ? member.roles.cache
      .filter((r) => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map((r) => r.toString())
    : [];

  const topRole =
    member?.roles.cache
      .filter((r) => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .first() || null;

  const displayName = member?.displayName || user.username;
  const nickname = member?.nickname || "—";

  const afkText = afk
    ? `🕯️ **AFK:** ${afk.reason}\nSejak: <t:${Math.floor((Number(afk.since) || Date.now()) / 1000)}:R>`
    : "—";

  const idText = idData
    ? [
      `**No ID:** \`${idData.number || "—"}\``,
      `**Nama:** ${idData.name || "—"}`,
      `**Gender:** ${idData.gender || "—"}`,
      `**Domisili:** ${idData.domisili || "—"}`,
      `**Hobi:** ${idData.hobi || "—"}`,
      `**Status:** ${idData.status || "—"}`,
      `**Theme:** ${(idData.theme || "light") === "dark" ? "dark" : "light"}`,
    ].join("\n")
    : "Belum punya ID Card.";

  const sortText = sorted?.choice
    ? `✅ **Student:** ${sorted.choice === "dark" ? "<:dark:1459543141609771101> Dark" : "<:light:1459543076736336004> Light"}\nSejak: <t:${Math.floor((Number(sorted.at) || Date.now()) / 1000)}:R>`
    : "Belum melakukan Sorting.";

  const embed = new EmbedBuilder()
    .setTitle(`🧿 Mystral Profile — ${displayName}`)
    .setColor(EMBED_COLOR)
    .setThumbnail(user.displayAvatarURL({ extension: "png", size: 256 }))
    .setDescription(`**Mention:** <@${user.id}>`)
    .addFields(
      {
        name: "🪪 Identity",
        value: [
          `**Tag:** ${user.tag}`,
          `**User ID:** \`${user.id}\``,
          `**Nickname:** ${nickname === "—" ? "—" : `\`${nickname}\``}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "🕰️ Timeline",
        value: [
          `**Akun Dibuat:** <t:${createdUnix}:F>`,
          `**Join Server:** ${joinedUnix ? `<t:${joinedUnix}:F>` : "—"}`,
          `**Relative:** <t:${createdUnix}:R>${joinedUnix ? ` • <t:${joinedUnix}:R>` : ""}`,
        ].join("\n"),
        inline: true,
      },
      { name: "🕯️ AFK", value: afkText, inline: false },
      { name: "🪪 ID Card", value: idText.length > 1024 ? idText.slice(0, 1020) + "…" : idText, inline: false },
      { name: "🔮 Student Sorting", value: sortText, inline: true },
      { name: "🏷️ Highest Role", value: topRole ? `${topRole} *(pos ${topRole.position})*` : "—", inline: true },
      { name: "🎭 Roles", value: rolesWithPrefix(roleMentions, 12), inline: false }
    )
    .setFooter({ text: `${BRAND_NAME} • Student Registry` })
    .setTimestamp();

  if (bannerUrl) embed.setImage(bannerUrl);

  return { embed, idData, sorted, afk };
}

function profileButtons({ hasIdCard, hasSorted, isAfk }) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("profile:view_idcard")
      .setLabel("Lihat ID Card")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!hasIdCard)
      .setEmoji("🪪"),

    new ButtonBuilder()
      .setCustomId("profile:view_house")
      .setLabel("Lihat House Card")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!hasIdCard || !hasSorted)
      .setEmoji("🏰"),

    new ButtonBuilder()
      .setCustomId(isAfk ? "profile:afk_clear" : "profile:afk_set")
      .setLabel(isAfk ? "Hapus AFK" : "Set AFK")
      .setStyle(isAfk ? ButtonStyle.Danger : ButtonStyle.Primary)
      .setEmoji(isAfk ? "🧹" : "🕯️")
  );
}

function rolesWithPrefix(roleMentions, max = 12) {
  // roleMentions: array string kayak "<@&id>"
  const shown = roleMentions.slice(0, max);
  const more = Math.max(0, roleMentions.length - shown.length);

  // prefix numbering kecil
  const nums = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮"];

  const lines = shown.map((r, i) => `${nums[i] || "•"} ${r}`);
  if (more) lines.push(`…dan **${more}** role lain.`);
  return lines.length ? lines.join("\n") : "—";
}

function buildProfileAfkModal(defaultReason = "") {
  const modal = new ModalBuilder().setCustomId("profile:afk_submit").setTitle("🕯️ Set / Update AFK");

  const reasonInput = new TextInputBuilder()
    .setCustomId("reason")
    .setLabel("Alasan AFK")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(80)
    .setRequired(true)
    .setValue(String(defaultReason || "").slice(0, 80));

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
  return modal;
}

function safeText(s, max = 32) {
  return String(s || "")
    .replace(/[\r\n\t]/g, " ")
    .trim()
    .slice(0, max);
}

async function safeReply(interaction, payload) {
  try {
    // kalau sudah pernah defer/reply, normalnya editReply / followUp
    if (interaction.deferred) {
      try {
        return await interaction.editReply(payload);
      } catch (e) {
        // ✅ FIX: kalau token interaction invalid, jangan loop editReply lagi
        if (e?.code === 50027) {
          console.error("[safeReply] Invalid Webhook Token (50027) — skip editReply");

          // optional fallback: kirim ke channel biar user tetap dapat output (tanpa “thinking” fix, tapi minimal output ada)
          const ch = interaction.channel;
          if (ch?.isTextBased?.()) {
            const clone = { ...payload };

            // payload edit/reply kadang punya flags/ephemeral — buang untuk channel.send
            delete clone.flags;
            delete clone.ephemeral;

            if (clone.content) clone.content = `${interaction.user} ${clone.content}`;
            await ch.send(clone).catch(() => { });
          }
          return;
        }
        throw e;
      }
    }

    if (interaction.replied) return await interaction.followUp(payload);
    return await interaction.reply(payload);
  } catch (e) {
    console.error("[safeReply] failed:", e?.message || e);
  }
}

async function safeDefer(interaction, ephemeral = true) {
  try {
    if (interaction.deferred || interaction.replied) return;

    // ✅ pakai flags (sesuai warning discord.js kamu)
    if (ephemeral) return await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    return await interaction.deferReply();
  } catch (e) {
    console.error("[safeDefer] failed:", e?.message || e);
  }
}


async function safeDeferUpdate(interaction) {
  try {
    if (interaction.deferred || interaction.replied) return;
    await interaction.deferUpdate();
  } catch (e) {
    console.error("[safeDeferUpdate] failed:", e?.message || e);
  }
}

async function getTextChannelOrNull(guild, id) {
  if (!guild || !id) return null;
  try {
    const ch = await guild.channels.fetch(id);
    if (!ch) return null;
    if (!ch.isTextBased?.()) return null;
    return ch;
  } catch {
    return null;
  }
}

async function getRoleOrNull(guild, roleId) {
  if (!guild || !roleId) return null;
  try {
    const role = await guild.roles.fetch(roleId);
    return role || null;
  } catch {
    return null;
  }
}

function genCardNumber(userId) {
  const raw = `${userId}${Date.now()}`.replace(/\D/g, "");
  return raw.slice(-16).padStart(16, "0");
}

function formatIdDate(ms) {
  try {
    return new Date(ms).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

// ===================== WELCOME =====================
const WELCOME_MESSAGES = [
  (m, g) => `✨ lonceng kristal berdentang lembut di menara akademi saat gerbang terbuka untukmu. ${m}, selamat datang di ${g}. di tempat ini, ilmu, percakapan, dan misteri dijaga bersama. jelajahi aula dengan rasa hormat, ikuti tatanan yang berlaku, dan biarkan perjalananmu berkembang dengan tenang. 🌙`,
  (m, g) => `🔮 tinta arcane kembali mengalir di buku induk akademi, menuliskan satu nama baru: ${m}. selamat datang di ${g}. luangkan waktu untuk memahami aturan yang menjaga keseimbangan kami, agar setiap langkahmu selaras dengan suasana dan kebijaksanaan tempat ini. ✨`,
  (m, g) => `🕯️ cahaya lilin menyala satu per satu di lorong batu tua saat kakimu melangkah masuk. ${m}, selamat datang di ${g}. semoga harimu hangat dan percakapanmu membawa kebaikan. ingatlah untuk menghormati sesama murid dan menaati tata tertib akademi. 🌿`,
  (m, g) => `🌌 angin senja berbisik dari menara observatorium: seorang murid baru telah tiba. ${m}, selamat datang di ${g}. sebelum memulai petualanganmu, luangkan sejenak membaca aturan agar setiap interaksi tetap aman, nyaman, dan bermakna. ✨`,
  (m, g) => `📜 arsip kuno kembali terbuka, menyambut satu nama yang kini tercatat di dalamnya. selamat datang ${m} di ${g}. akademi ini berdiri atas rasa saling menghormati, maka jagalah tutur kata dan patuhi ketentuan yang telah disepakati bersama. 🔮`,
  (m, g) => `🜂 nyala api di aula utama bergetar pelan, menandai kedatanganmu. ${m}, selamat datang di ${g}. belajarlah dengan bebas, berdiskusilah dengan bijak, dan jangan lupa mengikuti aturan agar keseimbangan akademi tetap terjaga. 🌙`,
  (m, g) => `🌙 bulan menggantung tenang di atas menara saat kau resmi diterima. ${m}, selamat datang di ${g}. kami mengundangmu untuk berpartisipasi dengan sopan, menghormati batasan, dan menaati tata tertib yang menjaga keharmonisan bersama. ✨`,
  (m, g) => `🔔 bel akademi berbunyi lirih, seolah menyapa langkah barumu. ${m}, selamat datang di ${g}. sebelum menjelajah lebih jauh, pastikan kau memahami aturan dasar agar setiap ruang tetap menjadi tempat yang aman dan menyenangkan. 🕯️`,
  (m, g) => `🕯️ cahaya hangat di ruang studi menyambut kehadiranmu. ${m}, kini kau bagian dari ${g}. gunakan ruang ini dengan bijaksana, hormati sesama, dan ikuti aturan yang ada agar semua dapat belajar dengan nyaman. 🌿`,
  (m, g) => `🌌 bintang-bintang menjadi saksi langkah pertamamu di akademi. ${m}, selamat datang di ${g}. kebebasan berekspresi dihargai di sini, selama tetap selaras dengan aturan dan rasa hormat terhadap yang lain. ✨`,
  (m, g) => `📖 sebuah halaman kosong terbuka di mejamu, menunggu kisah yang akan kau tulis. ${m}, selamat datang di ${g}. sebelum menorehkan ceritamu, luangkan waktu memahami tata tertib agar perjalananmu berjalan tanpa hambatan. 🔮`,
  (m, g) => `🜄 gemericik air di taman arcane mengiringi langkahmu masuk. ${m}, selamat datang di ${g}. jaga ketenangan, hargai perbedaan, dan patuhi aturan agar suasana akademi tetap seimbang dan damai. 🌙`,
  (m, g) => `✨ gema mantra penyambutan terdengar lembut di aula utama. ${m} kini resmi bergabung dengan ${g}. kami percaya setiap murid mampu menjaga sikap dan menaati aturan demi kenyamanan bersama. 🕯️`,
  (m, g) => `🔮 para penjaga arsip menatap tenang saat satu nama baru dicatat. ${m}, selamat datang di ${g}. ikutilah ketentuan yang telah ditetapkan, karena di sanalah kebijaksanaan akademi dijaga. 🌌`,
  (m, g) => `🌿 dedaunan di halaman dalam bergoyang pelan, menyambut kehadiranmu. ${m}, selamat datang di ${g}. nikmati perjalananmu, jalin percakapan yang baik, dan jangan lupa menaati aturan agar keharmonisan tetap terjaga. ✨`,
];

async function seedSupportLeaderboard() {
  try {
    // Clean up old string-based entries to re-seed with correct Discord IDs
    await safeRun("DELETE FROM support_leaderboard WHERE user_id IN ('kemasharfy', 'ayapaw', '24114012423426', 'victoriesberry', 'lovely_feyy')");

    const row = await safeGet("SELECT COUNT(*) AS count FROM support_leaderboard");
    if (row && row.count <= 1) {
      const now = Date.now();
      const initialData = [
        { user_id: "michelinea", type: "sponsor", username: "michelinea", amount: 800000 },
        { user_id: "837146352013017088", type: "donatur", username: "kemasharfy", amount: 300000 },
        { user_id: "1013039564409032817", type: "donatur", username: "ayapaw", amount: 150000 },
        { user_id: "1441473211391934615", type: "donatur", username: "L", amount: 100000 },
        { user_id: "1362417662738567180", type: "donatur", username: "victoriesberry", amount: 50000 },
        { user_id: "1460057271944872193", type: "donatur", username: "lovely_feyy", amount: 35000 },
        { user_id: "aethrayn", type: "donatur", username: "aethrayn", amount: 30000 }
      ];
      for (const item of initialData) {
        await safeRun(
          `INSERT INTO support_leaderboard (user_id, type, username, amount, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id, type) DO UPDATE SET amount = excluded.amount`,
          [item.user_id, item.type, item.username, item.amount, now]
        );
      }
      console.log("[DB] support_leaderboard seeded/updated successfully with Discord IDs.");
    }
  } catch (err) {
    console.error("[DB] Failed to seed support_leaderboard:", err);
  }
}

// ===================== INIT DB =====================
async function initDb() {
  await dbExec(`
    CREATE TABLE IF NOT EXISTS menfess_posts (
      id INTEGER PRIMARY KEY,
      message_id TEXT,
      channel_id TEXT,
      thread_id TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS ticket_meta (
      guild_id TEXT NOT NULL,
      channel_id TEXT PRIMARY KEY,
      opener_id TEXT,
      type TEXT,
      subject TEXT,
      created_at INTEGER,
      claimed_by TEXT,
      claimed_at INTEGER,
      closed_by TEXT,
      closed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS menfess_anonmap (
      user_id TEXT PRIMARY KEY,
      anon_label TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sorting_users (
      user_id TEXT PRIMARY KEY,
      choice TEXT NOT NULL,
      at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS house_cards (
      user_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS idcard_users (
      user_id TEXT PRIMARY KEY,
      number TEXT,
      name TEXT,
      gender TEXT,
      domisili TEXT,
      hobi TEXT,
      status TEXT,
      theme TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS afk_users (
      user_id TEXT PRIMARY KEY,
      reason TEXT,
      since INTEGER
    );

    CREATE TABLE IF NOT EXISTS menfess_meta (
      key TEXT PRIMARY KEY,
      value INTEGER
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS faq_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_faq_guild ON faq_items(guild_id);
     CREATE TABLE IF NOT EXISTS user_activity (
    user_id TEXT PRIMARY KEY,
    last_seen INTEGER NOT NULL DEFAULT 0,
    msg_total INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS activity_daily (
    day TEXT NOT NULL,
    user_id TEXT NOT NULL,
    msg_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, user_id)
  );
    CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message TEXT NOT NULL,
    due_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    is_done INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS mod_warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_modwarn_guild_user ON mod_warnings(guild_id, user_id);

    CREATE TABLE IF NOT EXISTS toxic_strikes (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      strikes INTEGER NOT NULL DEFAULT 0,
      last_at INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT,
      prize TEXT NOT NULL,
      winners INTEGER NOT NULL DEFAULT 1,
      end_at INTEGER NOT NULL,
      host_id TEXT NOT NULL,
      is_ended INTEGER NOT NULL DEFAULT 0,
      ended_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS giveaway_entries (
      giveaway_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (giveaway_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_give_entries_g ON giveaway_entries(giveaway_id);

    CREATE TABLE IF NOT EXISTS tickets_custom (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      closed_at INTEGER);
  CREATE TABLE IF NOT EXISTS ticket_settings (
      guild_id TEXT PRIMARY KEY,
      panel_channel_id TEXT,
      category_id TEXT,
      staff_role_id TEXT,

      panel_title TEXT,
      panel_description TEXT,
      panel_color INTEGER,
      main_button_label TEXT,
      extra_buttons TEXT,

      updated_at INTEGER NOT NULL
);

    CREATE TABLE IF NOT EXISTS tod_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      rating TEXT NOT NULL,
      question TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'seed',
      pack_name TEXT,
      created_by TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tod_favorites (
      question_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (question_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS tod_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tod_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      rating TEXT NOT NULL,
      question TEXT NOT NULL,
      created_by TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guess_number_scores (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      wins INTEGER NOT NULL DEFAULT 0,
      best_attempts INTEGER,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_guess_number_scores_guild
      ON guess_number_scores(guild_id, wins DESC, best_attempts ASC);

    CREATE TABLE IF NOT EXISTS tarot_users (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      total_reading INTEGER DEFAULT 0,
      last_reading_date TEXT,
      streak INTEGER DEFAULT 0,
      favorite_category TEXT DEFAULT '—',
      last_card TEXT DEFAULT '—',
      rarest_card TEXT DEFAULT '—',
      cards_collected TEXT DEFAULT '',
      streak_recovery_left INTEGER DEFAULT 3,
      last_streak_before_break INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tarot_category_stats (
      user_id TEXT,
      category TEXT,
      count INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, category)
    );

    CREATE TABLE IF NOT EXISTS support_leaderboard (
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      username TEXT,
      amount INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, type)
    );

    CREATE TABLE IF NOT EXISTS voice_activity_daily (
      day TEXT NOT NULL,
      user_id TEXT NOT NULL,
      duration INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_voice_act_day ON voice_activity_daily(day);
  `);

  try {
    await dbExec(`ALTER TABLE menfess_posts ADD COLUMN thread_id TEXT`);
  } catch { }
  try {
    await dbExec(`ALTER TABLE tarot_users ADD COLUMN streak_recovery_left INTEGER DEFAULT 3`);
  } catch { }
  try {
    await dbExec(`ALTER TABLE tarot_users ADD COLUMN last_streak_before_break INTEGER DEFAULT 0`);
  } catch { }

  await seedSupportLeaderboard().catch(() => null);
  await seedTodQuestionsIfNeeded().catch(() => null);

}

// ===================== TAROT SYSTEM HELPERS =====================
const TAROT_EMOJIS = {
  study: "<:study:1515952570428952626>",
  streak: "<:streak:1515952568814145646>",
  statistic: "<:statistic:1515952567132094574>",
  restricted: "<:restricted:1515952565408366663>",
  rarefix: "<:rarefix:1515952563462213722>",
  rare: "<:rare:1515952561146826913>",
  random: "<:random:1515952559414710423>",
  love: "<:love:1515952557485199512>",
  leaderboard: "<:leaderboard:1515952555249635378>",
  fortune: "<:fortune:1515952553039237240>",
  favcategory: "<:favcategory:1515952550912725132>",
  crystall: "<:crystall:1515952549008773140>",
  cooldown: "<:cooldown:1515952547108491436>",
  collection: "<:collection:1515952544512344114>",
  career: "<:career:1515952542725705798>",
  card: "<:card:1515952540724887643>"
};

function getRarityWeight(rarity) {
  switch (String(rarity).toLowerCase()) {
    case "legendary": return 5;
    case "epic": return 4;
    case "rare": return 3;
    case "uncommon": return 2;
    case "common": return 1;
    default: return 0;
  }
}

function getTarotRank(totalReading) {
  const r = Number(totalReading || 0);
  if (r >= 200) return "Grand Oracle";
  if (r >= 100) return "Clairvoyant";
  if (r >= 60) return "Mystic";
  if (r >= 30) return "Diviner";
  if (r >= 10) return "Interpreter";
  return "Novice";
}

function capitalizeWord(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function getOrInitTarotUser(userId, username) {
  let user = await safeGet("SELECT * FROM tarot_users WHERE user_id = ?", [userId]);
  if (!user) {
    await safeRun(
      `INSERT INTO tarot_users (user_id, username, total_reading, last_reading_date, streak, favorite_category, last_card, rarest_card, cards_collected, streak_recovery_left, last_streak_before_break)
       VALUES (?, ?, 0, NULL, 0, '—', '—', '—', '', 3, 0)`,
      [userId, username]
    );
    user = await safeGet("SELECT * FROM tarot_users WHERE user_id = ?", [userId]);
  }
  if (user) {
    if (user.streak_recovery_left === null || user.streak_recovery_left === undefined) {
      user.streak_recovery_left = 3;
    }
    if (user.last_streak_before_break === null || user.last_streak_before_break === undefined) {
      user.last_streak_before_break = 0;
    }
  }
  return user;
}

async function incrementTarotCategory(userId, category) {
  await safeRun(
    `INSERT INTO tarot_category_stats (user_id, category, count)
     VALUES (?, ?, 1)
     ON CONFLICT(user_id, category) DO UPDATE SET count = count + 1`,
    [userId, category]
  );
}

async function updateFavoriteCategory(userId) {
  const stats = await safeAll(
    `SELECT category, count FROM tarot_category_stats WHERE user_id = ? ORDER BY count DESC, category ASC`,
    [userId]
  );
  if (stats.length > 0) {
    const fav = capitalizeWord(stats[0].category);
    await safeRun("UPDATE tarot_users SET favorite_category = ? WHERE user_id = ?", [fav, userId]);
  }
}

async function addTarotReadingRecord(userId, username, card, categorySelected) {
  const todayStr = wibDayKey();
  const yesterdayStr = wibDayKey(Date.now() - 24 * 60 * 60 * 1000);
  const user = await getOrInitTarotUser(userId, username);

  let newStreak = 1;
  if (user.last_reading_date === todayStr) {
    newStreak = user.streak || 1;
  } else if (user.last_reading_date === yesterdayStr) {
    newStreak = (user.streak || 0) + 1;
  }

  let collected = user.cards_collected ? user.cards_collected.split(",").filter(Boolean) : [];
  if (!collected.includes(String(card.id))) {
    collected.push(String(card.id));
  }
  const collectedStr = collected.join(",");

  let newRarest = user.rarest_card || "—";
  if (newRarest === "—") {
    newRarest = card.name;
  } else {
    const currentRarestCard = TAROT_CARDS.find(c => c.name === newRarest);
    const currentWeight = currentRarestCard ? getRarityWeight(currentRarestCard.rarity) : 0;
    const newWeight = getRarityWeight(card.rarity);
    if (newWeight > currentWeight) {
      newRarest = card.name;
    }
  }

  await safeRun(
    `UPDATE tarot_users SET
       username = ?,
       total_reading = total_reading + 1,
       last_reading_date = ?,
       streak = ?,
       last_card = ?,
       rarest_card = ?,
       cards_collected = ?
     WHERE user_id = ?`,
    [username, todayStr, newStreak, card.name, newRarest, collectedStr, userId]
  );

  await incrementTarotCategory(userId, categorySelected);
  await updateFavoriteCategory(userId);

  return { streak: newStreak };
}

function buildTarotMainEmbed() {
  return new EmbedBuilder()
    .setTitle(`${TAROT_EMOJIS.crystall} Daily Arcane Tarot`)
    .setDescription([
      "Pilih jenis reading yang ingin kamu buka hari ini.",
      "",
      `${TAROT_EMOJIS.love} **Love**`,
      `${TAROT_EMOJIS.study} **Study**`,
      `${TAROT_EMOJIS.career} **Career**`,
      `${TAROT_EMOJIS.fortune} **Fortune**`,
      `${TAROT_EMOJIS.restricted} **Warning**`,
      `${TAROT_EMOJIS.random} **Random Arcane**`,
      "",
      "*Note:*",
      "Kamu hanya bisa membuka **1 reading per hari**."
    ].join("\n"))
    .setColor(EMBED_COLOR)
    .setFooter({ text: "Mystral Academy • Daily Tarot" })
    .setTimestamp();
}

function buildTarotMainButtons(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tarot:category:love:${userId}`).setLabel("Love").setStyle(ButtonStyle.Secondary).setEmoji(TAROT_EMOJIS.love),
    new ButtonBuilder().setCustomId(`tarot:category:study:${userId}`).setLabel("Study").setStyle(ButtonStyle.Secondary).setEmoji(TAROT_EMOJIS.study),
    new ButtonBuilder().setCustomId(`tarot:category:career:${userId}`).setLabel("Career").setStyle(ButtonStyle.Secondary).setEmoji(TAROT_EMOJIS.career),
    new ButtonBuilder().setCustomId(`tarot:category:fortune:${userId}`).setLabel("Fortune").setStyle(ButtonStyle.Secondary).setEmoji(TAROT_EMOJIS.fortune),
    new ButtonBuilder().setCustomId(`tarot:category:warning:${userId}`).setLabel("Warning").setStyle(ButtonStyle.Secondary).setEmoji(TAROT_EMOJIS.restricted)
  );
}

function buildTarotMainButtonsRow2(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tarot:category:random:${userId}`).setLabel("Random Arcane").setStyle(ButtonStyle.Primary).setEmoji(TAROT_EMOJIS.random)
  );
}

async function buildTarotProfileEmbed(targetUser, client) {
  const tUser = await getOrInitTarotUser(targetUser.id, targetUser.username);
  const totalCards = TAROT_CARDS.length;
  const collectedList = tUser.cards_collected ? tUser.cards_collected.split(",").filter(Boolean) : [];
  const collectedCount = collectedList.length;
  const percent = totalCards > 0 ? Math.round((collectedCount / totalCards) * 100) : 0;
  const rank = getTarotRank(tUser.total_reading);

  const embed = new EmbedBuilder()
    .setTitle(`${TAROT_EMOJIS.crystall} Tarot Profile — ${targetUser.username}`)
    .setColor(EMBED_COLOR)
    .setThumbnail(targetUser.displayAvatarURL({ extension: "png", size: 256 }))
    .setDescription(`**Mention:** <@${targetUser.id}>`)
    .addFields(
      { name: `${TAROT_EMOJIS.crystall} Rank`, value: `\`${rank}\``, inline: true },
      { name: `${TAROT_EMOJIS.streak} Current Streak`, value: `\`${tUser.streak || 0} Hari\``, inline: true },
      { name: `${TAROT_EMOJIS.collection} Collection Progress`, value: `\`${collectedCount} / ${totalCards} (${percent}%)\``, inline: true },
      { name: `${TAROT_EMOJIS.favcategory} Fav Category`, value: `\`${tUser.favorite_category || "—"}\``, inline: true },
      { name: `${TAROT_EMOJIS.card} Last Card Drawn`, value: `\`${tUser.last_card || "—"}\``, inline: true },
      { name: `${TAROT_EMOJIS.rarefix} Rarest Card Drawn`, value: `\`${tUser.rarest_card || "—"}\``, inline: true },
      { name: `${TAROT_EMOJIS.statistic} Total Readings`, value: `\`${tUser.total_reading || 0}\``, inline: true }
    )
    .setFooter({ text: "Mystral Academy • Tarot Registry" })
    .setTimestamp();

  return embed;
}

async function buildTarotLeaderboardEmbed(guild) {
  const rows = await safeAll(
    `SELECT user_id, username, total_reading, streak FROM tarot_users ORDER BY total_reading DESC LIMIT 10`
  );

  if (!rows.length) {
    return new EmbedBuilder()
      .setTitle(`${TAROT_EMOJIS.leaderboard} Tarot Leaderboard`)
      .setDescription("Belum ada data ramalan tarot.")
      .setColor(EMBED_COLOR);
  }

  const lines = rows.map((r, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `\`#${i + 1}\``;
    const rank = getTarotRank(r.total_reading);
    return `${medal} <@${r.user_id}> • **${r.total_reading}** readings (Streak: **${r.streak || 0}**d) [${rank}]`;
  });

  return new EmbedBuilder()
    .setTitle(`${TAROT_EMOJIS.leaderboard} Tarot Leaderboard — Readings`)
    .setDescription(lines.join("\n"))
    .setColor(EMBED_COLOR)
    .setFooter({ text: "Mystral Academy • Tarot Leaderboard" })
    .setTimestamp();
}

function buildTarotAnnouncementEmbed() {
  return new EmbedBuilder()
    .setTitle(`${TAROT_EMOJIS.crystall} Daily Arcane Tarot — Mystral Academy`)
    .setDescription([
      "Selamat datang di gerbang misteri takdir! Dek Tarot Akurasi Tinggi kini telah terintegrasi di Mystral Academy.",
      "Akses ramalan spiritual harianmu untuk mendapatkan panduan batin hari ini."
    ].join("\n"))
    .addFields(
      {
        name: `🔮 **Cara Memulai Ramalan**`,
        value: "Gunakan slash command `/tarot pull` atau prefix command `ctarot` untuk memanggil kartu harianmu."
      },
      {
        name: `✨ **6 Kategori Ramalan Batin**`,
        value: [
          `${TAROT_EMOJIS.love} **Love** — Getaran asmara & ikatan rasa`,
          `${TAROT_EMOJIS.study} **Study** — Pengetahuan, fokus & kabut pikiran`,
          `${TAROT_EMOJIS.career} **Career** — Persimpangan jalan, usaha & tanggung jawab`,
          `${TAROT_EMOJIS.fortune} **Fortune** — Energi kelimpahan materi & spiritual`,
          `${TAROT_EMOJIS.restricted} **Warning** — Cermin peringatan batin & ilusi ego`,
          `${TAROT_EMOJIS.random} **Random Arcane** — Pesan universal semesta`
        ].join("\n")
      },
      {
        name: `🏆 **Fitur Tambahan Tarot**`,
        value: [
          `• \`/tarot profile\` (atau \`ctarotprofile\`) — Cek rank tarot, streak harian, dan statistik spiritualmu.`,
          `• \`/tarot collection\` (atau \`ctarotcollection\`) — Lihat deck tarot yang telah terkumpul (Total 78 kartu unik).`,
          `• \`/tarot leaderboard\` (atau \`ctarotlb\`) — Peringkat member teraktif dalam pembacaan tarot.`
        ].join("\n")
      },
      {
        name: `🌟 **Sistem Rarity Kartu**`,
        value: "Kumpulkan kartu-kartu legendaris dari 5 tingkat Rarity:\n🌟 **Legendary** | 🔥 **Epic** | 💎 **Rare** | ✨ **Uncommon** | 📜 **Common**"
      },
      {
        name: `⚠️ **Catatan Penting**`,
        value: "Setiap murid hanya dapat menarik **1 kartu per hari** (Reset harian mengikuti zona waktu **WIB / UTC+7** pukul 00:00). Jaga streak harianmu untuk meraih gelar **Grand Oracle**!"
      }
    )
    .setColor(EMBED_COLOR)
    .setFooter({ text: "Mystral Academy • Daily Tarot System" })
    .setTimestamp();
}

async function buildTarotCollectionEmbed(targetUser) {
  const tUser = await getOrInitTarotUser(targetUser.id, targetUser.username);
  const collectedIds = tUser.cards_collected ? tUser.cards_collected.split(",").filter(Boolean).map(Number) : [];

  const legendary = TAROT_CARDS.filter(c => c.rarity === "Legendary");
  const epic = TAROT_CARDS.filter(c => c.rarity === "Epic");
  const rare = TAROT_CARDS.filter(c => c.rarity === "Rare");
  const uncommon = TAROT_CARDS.filter(c => c.rarity === "Uncommon");
  const common = TAROT_CARDS.filter(c => c.rarity === "Common");

  const colLegendary = legendary.filter(c => collectedIds.includes(c.id));
  const colEpic = epic.filter(c => collectedIds.includes(c.id));
  const colRare = rare.filter(c => collectedIds.includes(c.id));
  const colUncommon = uncommon.filter(c => collectedIds.includes(c.id));
  const colCommon = common.filter(c => collectedIds.includes(c.id));

  const embed = new EmbedBuilder()
    .setTitle(`${TAROT_EMOJIS.collection} Tarot Collection — ${targetUser.username}`)
    .setColor(EMBED_COLOR)
    .setDescription([
      `Total Terkumpul: **${collectedIds.length} / ${TAROT_CARDS.length}**`,
      "",
      `${TAROT_EMOJIS.rare} **Legendary** (${colLegendary.length}/${legendary.length}):`,
      colLegendary.length ? colLegendary.map(c => `• ${c.name}`).join("\n") : "_Belum ada_",
      "",
      `🔥 **Epic** (${colEpic.length}/${epic.length}):`,
      colEpic.length ? colEpic.map(c => `• ${c.name}`).join("\n") : "_Belum ada_",
      "",
      `💎 **Rare** (${colRare.length}/${rare.length}):`,
      colRare.length ? colRare.map(c => c.name).join(", ") : "_Belum ada_",
      "",
      `✨ **Uncommon** (${colUncommon.length}/${uncommon.length}):`,
      colUncommon.length ? `${colUncommon.length} kartu` : "_Belum ada_",
      "",
      `📜 **Common** (${colCommon.length}/${common.length}):`,
      colCommon.length ? `${colCommon.length} kartu` : "_Belum ada_"
    ].join("\n"))
    .setFooter({ text: "Mystral Academy • Tarot Collection" })
    .setTimestamp();

  return embed;
}

// ===================== KNOWLEDGE BASE (faq) =====================
// Simple server FAQ stored in SQLite.
// Commands:
// - /faq_add (admin) title, content, tags(optional)
// - /faq_edit (admin) id + optional fields
// - /faq_delete (admin) id
// - /faq_view id (everyone)
// - /faq_search query (everyone)
// - /faq_list (admin) list latest
// - /faq_panel (admin) post dropdown panel

function normalizeTags(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  // split by comma, normalize spaces, keep short
  const parts = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);
  return parts.join(", ");
}

async function faqAdd(guildId, title, content, tags, createdBy) {
  const now = Date.now();
  const t = safeText(title, 80);
  const c = String(content || "").replace(/\r\n/g, "\n").trim().slice(0, 4000);
  const tg = normalizeTags(tags);
  await dbRun(
    `INSERT INTO faq_items (guild_id, title, content, tags, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [guildId, t, c, tg, createdBy || null, now, now]
  );
  const row = await dbGet(`SELECT last_insert_rowid() AS id`);
  return Number(row?.id || 0);
}

async function faqGet(guildId, id) {
  return await dbGet(`SELECT * FROM faq_items WHERE guild_id=? AND id=?`, [guildId, Number(id)]);
}

async function faqSearch(guildId, query, limit = 10) {
  const q = String(query || "").trim();
  if (!q) return [];
  const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
  // Simple LIKE search over title/content/tags
  return await dbAll(
    `SELECT id, title, tags, created_at, updated_at
     FROM faq_items
     WHERE guild_id=?
       AND (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\')
     ORDER BY updated_at DESC
     LIMIT ?`,
    [guildId, like, like, like, Number(limit)]
  );
}

async function faqListLatest(guildId, limit = 15) {
  return await dbAll(
    `SELECT id, title, tags, updated_at
     FROM faq_items
     WHERE guild_id=?
     ORDER BY updated_at DESC
     LIMIT ?`,
    [guildId, Number(limit)]
  );
}

async function faqListForPanel(guildId, limit = 25) {
  return await dbAll(
    `SELECT id, title, tags, updated_at
     FROM faq_items
     WHERE guild_id=?
     ORDER BY id ASC
     LIMIT ?`,
    [guildId, Number(limit)]
  );
}
async function faqUpdate(guildId, id, fields) {
  const cur = await faqGet(guildId, id);
  if (!cur) return false;

  const title = fields.title != null ? safeText(fields.title, 80) : cur.title;
  const content = fields.content != null ? String(fields.content || "").trim().slice(0, 4000) : cur.content;
  const tags = fields.tags != null ? normalizeTags(fields.tags) : (cur.tags || "");
  const now = Date.now();

  await dbRun(
    `UPDATE faq_items SET title=?, content=?, tags=?, updated_at=? WHERE guild_id=? AND id=?`,
    [title, content, tags, now, guildId, Number(id)]
  );
  return true;
}

async function faqDelete(guildId, id) {
  await dbRun(`DELETE FROM faq_items WHERE guild_id=? AND id=?`, [guildId, Number(id)]);
  return true;
}

function formatFaqContent(raw) {
  let c = String(raw || "").trim();

  // Normalisasi newline (termasuk kalau tersimpan "\n" literal)
  c = c.replace(/\r\n/g, "\n").replace(/\\n/g, "\n");

  // Rapihin Q/A biar gak nempel
  c = c.replace(/^\s*\*\*?q\s*:\*\*?/i, "**Q:**");
  c = c.replace(/^\s*q\s*:\s*/i, "**Q:** ");
  c = c.replace(/\s+\*\*?a\s*:\*\*?\s*/i, "\n\n**A:** ");
  c = c.replace(/\s+a\s*:\s*/i, "\n\n**A:** ");

  // Pastikan ada jarak setelah Q: kalau user nulis "Q:xxx"
  c = c.replace(/\*\*Q:\*\*\s*/g, "**Q:** ");
  c = c.replace(/\*\*A:\*\*\s*/g, "**A:** ");

  // Ubah bullet "•" jadi format "-" (biar konsisten)
  c = c.replace(/^\s*•\s+/gm, "- ");

  // Kalau ada emoji item, pastikan jadi list "- <emoji> ..."
  // Tapi jangan nambah bullet kalau barisnya udah mulai dengan "-" atau "•"
  c = c.replace(
    /^(?!\s*-\s)(?!\s*•\s)\s*(🎨|🖼️|🌈|🎁)\s*/gm,
    "- $1 "
  );

  // Hapus baris bullet kosong: "-", "•", atau "- 🎨" doang tanpa teks
  c = c.replace(/^\s*-\s*$/gm, "");
  c = c.replace(/^\s*•\s*$/gm, "");
  c = c.replace(/^\s*-\s*(🎨|🖼️|🌈|🎁)\s*$/gm, "");

  // Rapihin newline berlebih
  c = c.replace(/\n{3,}/g, "\n\n").trim();

  return c;
}

function buildfaqItemEmbed(guild, item) {
  const content = formatFaqContent(item.content);

  const e = new EmbedBuilder()
    .setTitle(`📌 FAQ — ${item.title}`)
    .setColor(EMBED_COLOR)
    .setDescription(content.slice(0, 4096))
    .setFooter({ text: `${guild?.name || "Server"} • FAQ #${item.id}` });

  if (item.tags) e.addFields({ name: "Tags", value: item.tags.slice(0, 1024) });
  if (item.updated_at) e.setTimestamp(new Date(Number(item.updated_at)));
  return e;
}

function buildfaqPanelComponentsV2(guild, row) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("# 🚩 FAQ Server Guide"),
      new TextDisplayBuilder().setContent(
        [
          "Pilih topik dari menu di bawah untuk membaca jawaban yang tersedia.",
          "FAQ disusun berurutan agar lebih mudah dicari.",
          "",
          "Jika jawaban yang kamu butuhkan belum ada, silakan buka ticket atau hubungi staff.",
        ].join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(row)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${guild?.name || "Server"} ? FAQ Panel`)
    );

  return [container];
}
function buildfaqSelect(items, placeholder = "Pilih Topik") {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("faq:open")
    .setPlaceholder(placeholder)
    .setMinValues(1)
    .setMaxValues(1);

  const opts = items.slice(0, 25).map((it) => ({
    label: `#${it.id} • ${safeText(it.title, 80)}`,
    value: String(it.id),
    description: safeText(it.tags || "FAQ Server", 90),
  }));

  if (!opts.length) {
    menu.addOptions([{ label: "Belum Ada Artikel", value: "0", description: "Admin Belum Menambahkan faq" }]);
  } else {
    menu.addOptions(opts);
  }

  return new ActionRowBuilder().addComponents(menu);
}

// ===================== META (TEXT) =====================
async function getMetaText(key) {
  const r = await safeGet(`SELECT value FROM app_meta WHERE key=?`, [key]);
  return r?.value ?? null;
}

async function setMetaText(key, value) {
  await dbRun(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    [key, String(value)]
  );
}

// WIB date key (Asia/Jakarta) => YYYY-MM-DD
function wibDayKey(ts = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ts));
  const y = parts.find((p) => p.type === "year")?.value || "1970";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  const d = parts.find((p) => p.type === "day")?.value || "01";
  return `${y}-${m}-${d}`;
}

// Ticket settings are stored in table: ticket_settings
// NOTE: Ticket interactions call getTicketSettings()/upsertTicketSettings().
// If these helpers are missing, buttons (claim/close) will error with ReferenceError.

// ===================== TICKET SETTINGS HELPERS =====================
async function getTicketSettings(guildId) {
  if (!guildId) return null;

  try {
    // ✅ aman walau kolom beda-beda, karena SELECT * ga nembak kolom yang ga ada
    const row = await safeGet(`SELECT * FROM ticket_setup WHERE guild_id=?`, [guildId]);
    return row || null;
  } catch (e) {
    console.error("[TICKET] getTicketSettings error:", e?.message || e);
    return null;
  }
}

async function upsertTicketSettings(guildId, patch = {}) {
  if (!guildId) return null;
  const now = Date.now();

  // load existing to preserve fields not provided
  const current = (await getTicketSettings(guildId).catch(() => null)) || {};

  const merged = {
    guild_id: String(guildId),
    panel_channel_id: patch.panel_channel_id ?? current.panel_channel_id ?? null,
    category_id: patch.category_id ?? current.category_id ?? null,
    staff_role_id: patch.staff_role_id ?? current.staff_role_id ?? null,

    panel_title: patch.panel_title ?? current.panel_title ?? null,
    panel_description: patch.panel_description ?? current.panel_description ?? null,
    panel_color: patch.panel_color ?? current.panel_color ?? null,
    main_button_label: patch.main_button_label ?? current.main_button_label ?? null,
    extra_buttons: patch.extra_buttons ?? current.extra_buttons ?? null,
  };

  const extraButtonsJson =
    merged.extra_buttons == null
      ? null
      : typeof merged.extra_buttons === "string"
        ? merged.extra_buttons
        : JSON.stringify(merged.extra_buttons);

  await safeRun(
    `INSERT INTO ticket_settings (
        guild_id, panel_channel_id, category_id, staff_role_id,
        panel_title, panel_description, panel_color, main_button_label, extra_buttons,
        updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(guild_id) DO UPDATE SET
        panel_channel_id=excluded.panel_channel_id,
        category_id=excluded.category_id,
        staff_role_id=excluded.staff_role_id,
        panel_title=excluded.panel_title,
        panel_description=excluded.panel_description,
        panel_color=excluded.panel_color,
        main_button_label=excluded.main_button_label,
        extra_buttons=excluded.extra_buttons,
        updated_at=excluded.updated_at`,
    [
      merged.guild_id,
      merged.panel_channel_id,
      merged.category_id,
      merged.staff_role_id,
      merged.panel_title,
      merged.panel_description,
      merged.panel_color,
      merged.main_button_label,
      extraButtonsJson,
      now,
    ]
  );

  return await getTicketSettings(guildId);
}

async function userHasOpenTicket(guildId, userId) {
  const r = await safeGet(
    `SELECT 1 FROM tickets_custom WHERE guild_id=? AND owner_id=? AND closed_at IS NULL`,
    [String(guildId), String(userId)]
  );
  return !!r;
}

function buildTicketPanel(settings) {
  // Discord: max 5 buttons per row
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket:open:complaint").setLabel("Keluhan").setStyle(ButtonStyle.Primary).setEmoji("🕯"),
    new ButtonBuilder().setCustomId("ticket:open:report").setLabel("Report").setStyle(ButtonStyle.Danger).setEmoji("⚠"),
    new ButtonBuilder().setCustomId("ticket:open:donate").setLabel("Donate").setStyle(ButtonStyle.Success).setEmoji("💠"),
    new ButtonBuilder().setCustomId("ticket:open:partnership").setLabel("Partner").setStyle(ButtonStyle.Primary).setEmoji("🤝"),
    new ButtonBuilder().setCustomId("ticket:open:verification").setLabel("Verify").setStyle(ButtonStyle.Success).setEmoji("✅")
  );

  const title = settings?.panel_title || "🎫 Arcane Support Desk";
  const description =
    settings?.panel_description ||
    [
      "Jika kau mengalami gangguan, kebingungan, atau membutuhkan bantuan resmi dari akademi—",
      "buka ticket secara privat di sini.",
      "",
      "🕯️ **Keluhan** — pengalaman tidak nyaman / konflik / hal pribadi",
      "⚠️ **Report** — pelanggaran aturan / tindakan meresahkan",
      "💠 **Donasi** — dukungan untuk pengembangan akademi",
      "🤝 **Partnership** — kerja sama komunitas / event",
      "✅ **Verifikasi** — pengajuan atau kendala role verified",
      "",
      "🔐 Ticket bersifat **rahasia**: hanya kamu & staff yang dapat melihatnya.",
    ].join("\n");

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${title}`),
      new TextDisplayBuilder().setContent(description)
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(row)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("Mystral Academy • Speak freely, we will listen.")
    );

  return { components: [container] };
}

// ====== TICKET: MODAL BUILDER (DYNAMIC) ======
function ticketTypeLabel(type) {
  const map = {
    complaint: "Keluhan",
    report: "Report",
    donate: "Donate",
    partnership: "Partnership",
    verification: "Verification",
    custom: "Custom",
  };
  return map[String(type || "").toLowerCase()] || String(type || "Ticket");
}

function buildTicketModal(type) {
  const t = String(type || "custom").toLowerCase();
  const modal = new ModalBuilder()
    .setCustomId(`ticket:modal:${t}`)
    .setTitle(`🎫 ${ticketTypeLabel(t)} — Mystral Academy`);

  const titleInput = new TextInputBuilder()
    .setCustomId("title")
    .setLabel("Judul Singkat")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(80)
    .setRequired(true);

  let contentInput;
  switch (t) {
    case "donate":
      contentInput = new TextInputBuilder()
        .setCustomId("content")
        .setLabel("Informasi Donasi")
        .setPlaceholder("Nominal, metode pembayaran, atau pertanyaan terkait donasi")
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(600)
        .setRequired(true);
      break;
    case "partnership":
      contentInput = new TextInputBuilder()
        .setCustomId("content")
        .setLabel("Detail Partnership")
        .setPlaceholder("Nama komunitas, bentuk kerja sama, kontak")
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(700)
        .setRequired(true);
      break;
    case "verification":
      contentInput = new TextInputBuilder()
        .setCustomId("content")
        .setLabel("Data Verifikasi")
        .setPlaceholder("Kendala role verified / verif real female / bukti pendukung")
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(500)
        .setRequired(true);
      break;
    default:
      contentInput = new TextInputBuilder()
        .setCustomId("content")
        .setLabel("Detail / Kronologi")
        .setPlaceholder("Jelaskan masalahmu dengan jelas dan runtut")
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(800)
        .setRequired(true);
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(contentInput)
  );

  return modal;
}

// ===================== MENFESS COUNTER =====================
async function ensureMenfessCounterStart() {
  const MIN_LAST_ID = 675;

  let row = null;
  let maxRow = { m: 0 };

  try {
    row = await dbGet(`SELECT value FROM menfess_meta WHERE key='menfess_last_id'`);
  } catch {
    row = null;
  }

  try {
    maxRow = await dbGet(`SELECT COALESCE(MAX(id), 0) AS m FROM menfess_posts`);
  } catch {
    maxRow = { m: 0 };
  }

  const maxId = Number(maxRow?.m || 0);

  if (!row) {
    const startLastId = Math.max(MIN_LAST_ID, maxId);
    await dbRun(`INSERT INTO menfess_meta (key, value) VALUES ('menfess_last_id', ?)`, [startLastId]);
    return;
  }

  const cur = Number(row.value || 0);
  const fixed = Math.max(cur, MIN_LAST_ID, maxId);
  if (fixed !== cur) {
    await dbRun(`UPDATE menfess_meta SET value=? WHERE key='menfess_last_id'`, [fixed]);
  }
}


// ===================== MENFESS =====================
const menfessCooldown = new Map();
const todCooldown = new Map();

function isBadAlias(alias) {
  if (/[<@#>]/.test(alias)) return true;
  const low = alias.toLowerCase();
  const blocked = ["admin", "owner", "mod", "moderator", "staff"];
  return blocked.some((w) => low.includes(w));
}

async function getAnonLabel(userId) {
  const row = await safeGet("SELECT anon_label FROM menfess_anonmap WHERE user_id=?", [userId]);
  if (row?.anon_label) return row.anon_label;

  const c = await safeGet("SELECT COUNT(*) AS n FROM menfess_anonmap");
  const n = Number(c?.n || 0) + 1;

  const label = `Anon #${String(n).padStart(3, "0")}`;

  await safeRun(
    `INSERT INTO menfess_anonmap (user_id, anon_label)
     VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET anon_label=excluded.anon_label`,
    [userId, label]
  );

  return label;
}

async function insertMenfessPost({ id, messageId, channelId }) {
  await dbRun(
    `INSERT INTO menfess_posts (id, message_id, channel_id, created_at)
     VALUES (?,?,?,?)`,
    [id, messageId || null, channelId || null, Date.now()]
  );
  return id;
}

async function updateMenfessPostLink(id, { messageId, channelId, threadId = null }) {
  await dbRun(`UPDATE menfess_posts SET message_id=?, channel_id=?, thread_id=COALESCE(?, thread_id) WHERE id=?`, [messageId, channelId, threadId, Number(id)]);
}

async function getMenfessPostById(id) {
  return (await safeGet(
    `SELECT id, message_id, channel_id, thread_id, created_at FROM menfess_posts WHERE id=?`,
    [Number(id)]
  )) || null;
}

// ===================== MENFESS LOG (EMBED STYLE) =====================
async function sendMenfessLog(guild, data) {
  try {
    if (!guild) return;

    const logId = process.env.MENFESS_LOG_CHANNEL_ID;
    if (!logId) return;

    const ch = await guild.channels.fetch(logId).catch(() => null);
    if (!ch || !ch.isTextBased?.()) return;

    // data bisa string (legacy) atau object
    if (typeof data === "string") {
      const e = new EmbedBuilder()
        .setTitle("🧾 MENFESS LOG")
        .setColor(0xF1C40F)
        .setDescription(data)
        .setTimestamp();
      return ch.send({ embeds: [e], allowedMentions: { parse: [] } }).catch(() => null);
    }

    const {
      kind = "post",           // "post" | "reply"
      id,
      replyTo,
      senderId,
      senderNick,
      senderTag,
      anonLabel,
      to,
      channelId,
      messageId,
      content,
      image,
    } = data || {};

    const title =
      kind === "reply"
        ? `💬 MENFESS REPLY #${id ?? "?"}`
        : `🕯️ MENFESS LOG #${id ?? "?"}`;

    const e = new EmbedBuilder()
      .setTitle(title)
      .setColor(0xF1C40F)
      .addFields(
        {
          name: "Info",
          value: [
            `**Sender:** ${senderId ? `<@${senderId}>` : "—"}${anonLabel ? ` (${anonLabel})` : ""}`,
            `**Sender Nick:** ${senderNick || "—"}`,
            `**Sender ID:** ${senderId || "—"}`,
            kind === "reply"
              ? `💬 **Reply To:** MENFESS #${replyTo || "—"}`
              : `📩 **To:** ${to || "—"}`,
            `**Channel:** ${channelId ? `<#${channelId}>` : "—"}`,
            `**Message ID:** ${messageId || "—"}`,
            `**Content:** ${content ? String(content).slice(0, 300) : "—"}`,
            image ? `**Image URL:** ${image}` : null
          ].filter(Boolean).join("\n"),
          inline: false
        }
      )
      .setTimestamp();

    if (image && /^https?:\/\//i.test(image)) {
      e.setImage(image);
    }

    return ch.send({ embeds: [e], allowedMentions: { parse: [] } }).catch(() => null);
  } catch {
    return;
  }
}

// ===================== TICKET HELPERS =====================
function ticketIsStaff(member) {
  const staffRoleId = requireEnv("TICKET_STAFF_ROLE_ID");
  if (!staffRoleId) return false;
  return Boolean(member?.roles?.cache?.has?.(staffRoleId));
}

async function getTicketLogChannel(guild) {
  const logId = requireEnv("TICKET_LOG_CHANNEL_ID");
  if (!logId) return null;
  return await getTextChannelOrNull(guild, logId);
}

function ticketMeta(type, userId) {
  // simpan owner & type di topic biar persist
  return `[TICKET:${type}] [OWNER:${userId}]`;
}
function getTicketOwnerIdFromTopic(topic) {
  const m = String(topic || "").match(/\[OWNER:(\d{15,25})\]/);
  return m ? m[1] : null;
}
function getTicketTypeFromTopic(topic) {
  const m = String(topic || "").match(/\[TICKET:(complaint|report|donate|partnership|verification|custom)\]/);
  return m ? m[1] : null;
}
function getClaimedFromTopic(topic) {
  const m = String(topic || "").match(/\[CLAIMED:(\d{15,25})\]/);
  return m ? m[1] : null;
}
function setClaimedTopic(topic, staffId) {
  const clean = String(topic || "").replace(/\s*\[CLAIMED:\d{15,25}\]\s*/g, "").trim();
  return `${clean} [CLAIMED:${staffId}]`.trim();
}

async function buildTicketTranscript(channel) {
  const limit = Number(process.env.TICKET_TRANSCRIPT_LIMIT || 300);

  const all = [];
  let before = undefined;

  while (all.length < limit) {
    const batch = await channel.messages.fetch({ limit: Math.min(100, limit - all.length), before }).catch(() => null);
    if (!batch || batch.size === 0) break;

    const arr = [...batch.values()];
    all.push(...arr);
    before = arr[arr.length - 1].id;
  }

  all.sort((a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0));

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const txt = all
    .map((m) => {
      const time = new Date(m.createdTimestamp || Date.now()).toLocaleString("id-ID");
      const author = `${m.author?.tag || "Unknown"} (${m.author?.id || "—"})`;
      const content = m.content || "";
      const attach = m.attachments?.size ? ` [attachments: ${[...m.attachments.values()].map((x) => x.url).join(" ")}]` : "";
      return `[${time}] ${author}: ${content}${attach}`;
    })
    .join("\n");

  const htmlRows = all
    .map((m) => {
      const time = new Date(m.createdTimestamp || Date.now()).toLocaleString("id-ID");
      const author = `${m.author?.tag || "Unknown"} (${m.author?.id || "—"})`;
      const content = esc(m.content || "");
      const attach = m.attachments?.size
        ? `<div class="att">📎 ${[...m.attachments.values()]
          .map((x) => `<a href="${esc(x.url)}">${esc(x.name || "file")}</a>`)
          .join(" • ")}</div>`
        : "";
      return `<div class="msg">
  <div class="meta"><span class="time">${esc(time)}</span> • <span class="author">${esc(author)}</span></div>
  <div class="content">${content ? content.replace(/\n/g, "<br/>") : "<i>(no content)</i>"}</div>
  ${attach}
</div>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Ticket Transcript</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; background:#0b0716; color:#f4eeff; padding:24px;}
  .wrap{max-width:920px; margin:0 auto;}
  .head{padding:16px 18px; border:1px solid rgba(255,255,255,.12); border-radius:14px; background:rgba(20,16,42,.55); margin-bottom:14px;}
  .msg{padding:12px 14px; border:1px solid rgba(255,255,255,.10); border-radius:14px; background:rgba(10,8,22,.62); margin:10px 0;}
  .meta{opacity:.85; font-size:12px; margin-bottom:6px}
  .content{font-size:14px; line-height:1.45}
  .att{margin-top:8px; font-size:12px; opacity:.9}
  a{color:#a78bfa; text-decoration:none}
  a:hover{text-decoration:underline}
</style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <div style="font-weight:800; font-size:16px">Mystral Academy — Ticket Transcript</div>
      <div style="opacity:.85; font-size:12px">Channel: ${esc(channel.name)} • Exported: ${esc(new Date().toLocaleString("id-ID"))}</div>
    </div>
    ${htmlRows || "<i>(no messages)</i>"}
  </div>
</body>
</html>`;

  return {
    count: all.length,
    txtBuffer: Buffer.from(txt || "(no messages)", "utf8"),
    htmlBuffer: Buffer.from(html, "utf8"),
  };
}


// ===================== ID CARD (DB) =====================
async function getIdCard(userId) {
  return (await safeGet(`SELECT * FROM idcard_users WHERE user_id=?`, [userId])) || null;
}
async function getAllIdCards() {
  return await safeAll(`
    SELECT *
    FROM idcard_users
    ORDER BY created_at ASC
  `);
}
async function getAllAfkUsers() {
  return await safeAll(`
    SELECT *
    FROM afk_users
    ORDER BY since ASC
  `);
}


async function upsertIdCard(userId, data) {
  const existing = await getIdCard(userId);
  const createdAt = existing?.created_at ? Number(existing.created_at) : Date.now();
  const number = existing?.number || data.number || genCardNumber(userId);

  await dbRun(
    `INSERT INTO idcard_users (user_id, number, name, gender, domisili, hobi, status, theme, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET
       name=excluded.name,
       gender=excluded.gender,
       domisili=excluded.domisili,
       hobi=excluded.hobi,
       status=excluded.status,
       theme=excluded.theme,
       number=excluded.number,
       updated_at=excluded.updated_at`,
    [userId, number, data.name, data.gender, data.domisili, data.hobi, data.status, data.theme, createdAt, Date.now()]
  );

  return getIdCard(userId);
}

async function countRegistry() {
  const r = await safeGet(`SELECT COUNT(*) AS n FROM idcard_users`);
  return Number(r?.n || 0);
}

async function registryPage(offset, limit) {
  return (await safeAll(
    `SELECT user_id, name, created_at
     FROM idcard_users
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [Number(limit), Number(offset)]
  )) || [];
}

// ===== AFK Nick Helpers (prefix [AFK]) =====
function withAfkPrefix(nickOrName) {
  const base = String(nickOrName || "").trim() || "User";
  if (/^\[AFK\]\s*/i.test(base)) return base;
  const tagged = `[AFK] ${base}`;
  return tagged.length > 32 ? tagged.slice(0, 32) : tagged;
}

function stripAfkPrefix(nickOrName) {
  return String(nickOrName || "").replace(/^\[AFK\]\s*/i, "").trim();
}

async function trySetMemberNick(member, nickOrNull) {
  try {
    if (!member) return false;
    // manageable = bot punya izin & hierarchy aman (owner / role tinggi biasanya false)
    if (!member.manageable) return false;

    // null = reset nickname (balik ke username)
    await member.setNickname(nickOrNull);
    return true;
  } catch (e) {
    console.warn("[AFK] setNickname failed:", e?.message || e);
    return false;
  }
}

// ===================== AFK =====================
async function setAfk(userId, reason) {
  await dbRun(
    `INSERT INTO afk_users (user_id, reason, since)
     VALUES (?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET reason=excluded.reason, since=excluded.since`,
    [userId, safeText(reason || "AFK", 80), Date.now()]
  );
}

async function clearAfk(userId) {
  try {
    const r = await dbRun(`DELETE FROM afk_users WHERE user_id=?`, [userId]);
    return (r?.changes || 0) > 0;
  } catch {
    return false;
  }
}

async function clearAllAfkUsers() {
  try {
    const r = await dbRun(`DELETE FROM afk_users`);
    return r?.changes || 0;
  } catch {
    return 0;
  }
}

async function getAfk(userId) {
  try {
    return (await dbGet(`SELECT reason, since FROM afk_users WHERE user_id=?`, [userId])) || null;
  } catch {
    return null;
  }
}

// ===================== SORTING (LOCK) =====================
async function getSortedUser(userId) {
  return (await safeGet(
    `SELECT user_id, choice, at FROM sorting_users WHERE user_id=?`,
    [userId]
  )) || null;
}

async function setSortedUser(userId, choice) {
  await dbRun(
    `INSERT INTO sorting_users (user_id, choice, at)
     VALUES (?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET choice=excluded.choice, at=excluded.at`,
    [userId, choice, Date.now()]
  );
}

// ===================== SORTING BAG SYSTEM =====================
const SORT_BAG_SIZE = Number(process.env.SORT_BAG_SIZE || 20);
const SORT_BAG_KEY = "sorting_bag_json";
const SORT_BAG_IDX_KEY = "sorting_bag_idx";
const SORT_LAST_KEY = "sorting_last_choice";

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function loadOrCreateBag() {
  let bagJson = await getMetaText(SORT_BAG_KEY);
  let idxStr = await getMetaText(SORT_BAG_IDX_KEY);

  let bag = null;
  let idx = Number(idxStr || 0);

  if (bagJson) {
    try {
      bag = JSON.parse(bagJson);
      if (!Array.isArray(bag)) bag = null;
    } catch {
      bag = null;
    }
  }

  if (!bag || bag.length < 2 || idx >= bag.length) {
    const size = SORT_BAG_SIZE % 2 === 0 ? SORT_BAG_SIZE : SORT_BAG_SIZE + 1;
    const half = Math.floor(size / 2);
    bag = [];
    for (let i = 0; i < half; i++) bag.push("light");
    for (let i = 0; i < half; i++) bag.push("dark");

    shuffleInPlace(bag);

    idx = 0;
    await setMetaText(SORT_BAG_KEY, JSON.stringify(bag));
    await setMetaText(SORT_BAG_IDX_KEY, String(idx));
  }

  return { bag, idx };
}

async function pickChoiceFromBag() {
  const { bag, idx } = await loadOrCreateBag();
  const choice = bag[idx];

  await setMetaText(SORT_BAG_IDX_KEY, String(idx + 1));
  return choice === "dark" ? "dark" : "light";
}

async function pickChoiceBagMoreNatural() {
  const last = (await getMetaText(SORT_LAST_KEY)) || null;

  let choice = await pickChoiceFromBag();

  if (last && choice === last) {
    const { bag } = await loadOrCreateBag();
    const curIdx = Number((await getMetaText(SORT_BAG_IDX_KEY)) || 0);
    if (curIdx < bag.length) {
      const alt = bag[curIdx];
      await setMetaText(SORT_BAG_IDX_KEY, String(curIdx + 1));
      choice = alt === "dark" ? "dark" : "light";
    }
  }

  await setMetaText(SORT_LAST_KEY, choice);
  return choice;
}

// ===================== CANVAS HELPERS =====================
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawParticles(ctx, area, mode = "light") {
  const { x, y, w, h } = area;
  for (let i = 0; i < 28; i++) {
    const px = x + Math.random() * w;
    const py = y + Math.random() * h;
    const r = 1 + Math.random() * 3;
    ctx.globalAlpha = mode === "dark" ? 0.22 : 0.18;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = mode === "dark" ? "rgba(200,160,255,1)" : "rgba(255,240,180,1)";
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ===================== ID CARD RENDER =====================
async function renderIdCard({ theme, number, name, gender, domisili, hobi, status, avatarUrl, createdAtText, arcanaChoice }) {
  const w = 980;
  const h = 560;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  const isDark = theme === "dark";

  // --- PALETTE DEFINITION ---
  let bgGrad1, bgGrad2, bgGrad3, cardBg, ink, subInk, accent, glowColor1, glowColor2, glowColor3, borderGradColors;

  if (isDark) {
    bgGrad1 = "#02040a";
    bgGrad2 = "#081022";
    bgGrad3 = "#120a21";
    cardBg = "rgba(9, 13, 28, 0.85)";
    ink = "#ffffff";
    subInk = "rgba(148, 163, 184, 0.8)";

    // Always use the "darktestv2" palette (cyan accent) for dark theme
    accent = "#00f0ff";
    borderGradColors = ["#00f0ff", "#3b82f6", "#ffd700"];
    glowColor1 = "#0369a1";
    glowColor2 = "#4f46e5";
    glowColor3 = "#0f172a";
  } else {
    bgGrad1 = "#fafbfe";
    bgGrad2 = "#eff2fb";
    bgGrad3 = "#e0f2fe";
    cardBg = "rgba(255, 255, 255, 0.82)";
    ink = "#0f172a";
    subInk = "rgba(71, 85, 105, 0.85)";

    // Always use the "sunv2" palette (gold/orange accent) for light theme
    accent = "#b45309";
    borderGradColors = ["#d97706", "#f59e0b", "#f43f5e"];
    glowColor1 = "rgba(180, 83, 9, 0.12)";
    glowColor2 = "rgba(244, 63, 94, 0.08)";
    glowColor3 = "rgba(243, 244, 246, 0.8)";
  }

  // --- 1. RENDER BACKGROUND ---
  const gradBg = ctx.createLinearGradient(0, 0, w, h);
  gradBg.addColorStop(0, bgGrad1);
  gradBg.addColorStop(0.5, bgGrad2);
  gradBg.addColorStop(1, bgGrad3);
  ctx.fillStyle = gradBg;
  ctx.fillRect(0, 0, w, h);

  // Background Grid and Beams
  drawBackgroundGrid(ctx, w, h, accent, isDark ? 0.06 : 0.04);
  drawLightBeams(ctx, w, h, isDark ? "#ffffff" : accent, isDark ? 0.04 : 0.03);

  // Glow spots (Vibrant neon colors)
  ctx.save();
  ctx.globalAlpha = isDark ? 0.35 : 0.2;
  const glow = (gx, gy, gr, gColor) => {
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, gColor);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(gx, gy, gr, 0, Math.PI * 2);
    ctx.fill();
  };
  glow(800, 260, 260, glowColor1);
  glow(200, 150, 280, glowColor2);
  glow(500, 480, 250, glowColor3);
  ctx.restore();

  // Particle stardust
  drawV2Particles(ctx, { x: 0, y: 0, w, h }, [accent, "#ffffff", "#ffd700", "#90e0ef"], isDark ? 0.22 : 0.14);

  // --- 2. CONTAINER PANEL ---
  const cardX = 25;
  const cardY = 25;
  const cardW = w - 50;
  const cardH = h - 50;
  const r = 24;

  // Soft shadow & card background
  ctx.save();
  ctx.shadowColor = isDark ? "rgba(0, 0, 0, 0.65)" : "rgba(15, 23, 42, 0.1)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = cardBg;
  rr(ctx, cardX, cardY, cardW, cardH, r);
  ctx.fill();
  ctx.restore();

  // Double Gradient Border
  ctx.save();
  const gradBorder = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  gradBorder.addColorStop(0, borderGradColors[0]);
  gradBorder.addColorStop(0.5, borderGradColors[1]);
  gradBorder.addColorStop(1, borderGradColors[2]);
  ctx.strokeStyle = gradBorder;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.65;
  rr(ctx, cardX, cardY, cardW, cardH, r);
  ctx.stroke();
  ctx.restore();

  // Corner accents
  drawCornerAccents(ctx, cardX + 10, cardY + 10, cardW - 20, cardH - 20, 15, accent);

  const separatorX = cardX + cardW - 270;

  // --- 3. LEFT ZONE (HEADERS & GRID DETAILS) ---
  const lx = cardX + 45;

  // Header Title
  ctx.fillStyle = accent;
  setFont(ctx, "bold", 12, "Cinzel");
  ctx.fillText("ACADEMIA REGISTRY PASS", lx, cardY + 54);

  // Main Card Title
  ctx.fillStyle = ink;
  setFont(ctx, "bold", 36, "Cinzel");
  ctx.fillText("MYSTRAL IDENTITY CARD", lx, cardY + 95);

  // Horizontal separator under header
  ctx.save();
  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(lx, cardY + 112);
  ctx.lineTo(separatorX - 35, cardY + 112);
  ctx.stroke();
  ctx.restore();

  // Details Grid Layout (2 Columns x 3 Rows Dashboard Card slots)
  const gridStartX = lx;
  const gridStartY = cardY + 135;
  const boxW = 280;
  const boxH = 88;
  const gapX = 25;
  const gapY = 15;

  const details = [
    { label: "NAMA", value: name || "—", col: 0, row: 0 },
    { label: "REGISTRY NO", value: number || "—", col: 1, row: 0, isAccent: true },
    { label: "GENDER IDENTITY", value: gender || "—", col: 0, row: 1 },
    { label: "DOMISILI REALM", value: domisili || "—", col: 1, row: 1 },
    { label: "MINAT / HOBI", value: hobi || "—", col: 0, row: 2 },
    { label: "STATUS", value: status || "—", col: 1, row: 2 }
  ];

  details.forEach((item) => {
    const xBox = gridStartX + item.col * (boxW + gapX);
    const yBox = gridStartY + item.row * (boxH + gapY);

    // Draw Card Box Container
    ctx.save();
    ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)";
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)";
    ctx.lineWidth = 1.2;
    rr(ctx, xBox, yBox, boxW, boxH, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Draw left vertical accent line
    ctx.save();
    ctx.fillStyle = accent;
    rr(ctx, xBox + 8, yBox + 15, 4, boxH - 30, 2);
    ctx.fill();
    ctx.restore();

    // Draw Label
    ctx.fillStyle = subInk;
    setFont(ctx, "bold", 11);
    ctx.fillText(item.label, xBox + 22, yBox + 28);

    // Draw Value
    if (item.isAccent) {
      setFont(ctx, "bold", 20, "Cinzel");
      ctx.fillStyle = accent;
      ctx.fillText(item.value, xBox + 22, yBox + 58);
    } else {
      setFont(ctx, "bold", 16);
      ctx.fillStyle = ink;

      let valStr = String(item.value);
      const maxValWidth = boxW - 35;
      if (ctx.measureText(valStr).width > maxValWidth) {
        while (valStr.length > 0 && ctx.measureText(valStr + "…").width > maxValWidth) {
          valStr = valStr.slice(0, -1);
        }
        valStr += "…";
      }
      ctx.fillText(valStr, xBox + 22, yBox + 58);
    }
  });

  // --- 4. RIGHT ZONE PROFILE PANEL (AVATAR & DETAILS) ---
  const avCenterX = separatorX + (cardX + cardW - separatorX) / 2;
  const panelW = 210;
  const panelH = 294;
  const panelX = avCenterX - panelW / 2;
  const panelY = cardY + 135; // Exactly Y = 135 to align with left-side Registry No slot

  // Draw Panel Container (More opaque glassmorphism to look solid and non-empty)
  ctx.save();
  ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.035)" : "rgba(255, 255, 255, 0.65)";
  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.05)";
  ctx.lineWidth = 1.2;
  rr(ctx, panelX, panelY, panelW, panelH, 16);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const avSize = 170;
  const avX = avCenterX - avSize / 2;
  const avY = panelY + 15;
  const avR = 14;

  // Clip rounded square avatar
  ctx.save();
  rr(ctx, avX, avY, avSize, avSize, avR);
  ctx.clip();
  try {
    const img = await loadImage(avatarUrl);
    ctx.drawImage(img, avX, avY, avSize, avSize);
  } catch (err) {
    ctx.fillStyle = isDark ? "#120e24" : "#e2e8f0";
    rr(ctx, avX, avY, avSize, avSize, avR);
    ctx.fill();
    ctx.fillStyle = subInk;
    ctx.beginPath();
    ctx.arc(avCenterX, avY + avSize / 2 - 8, avSize * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(avCenterX, avY + avSize / 2 + 40, avSize * 0.32, Math.PI, 0, false);
    ctx.fill();
  }
  ctx.restore();

  // Double border for elegant framing
  // 1. Subtle inner border
  ctx.save();
  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
  ctx.lineWidth = 1.5;
  rr(ctx, avX, avY, avSize, avSize, avR);
  ctx.stroke();
  ctx.restore();

  // 2. Elegant accent outer border
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4;
  rr(ctx, avX - 4, avY - 4, avSize + 8, avSize + 8, avR + 2);
  ctx.stroke();
  ctx.restore();

  // Divider line inside panel
  ctx.save();
  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(panelX + 20, panelY + 195);
  ctx.lineTo(panelX + panelW - 20, panelY + 195);
  ctx.stroke();
  ctx.restore();

  // Small decorative vector ornament star (sparkle)
  ctx.save();
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  const scx = avCenterX;
  const scy = panelY + 210;
  const sr = 6;
  ctx.moveTo(scx, scy - sr);
  ctx.quadraticCurveTo(scx, scy, scx + sr, scy);
  ctx.quadraticCurveTo(scx, scy, scx, scy + sr);
  ctx.quadraticCurveTo(scx, scy, scx - sr, scy);
  ctx.quadraticCurveTo(scx, scy, scx, scy - sr);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Date issued stamp
  const dateStampY = panelY + 233;
  ctx.textAlign = "center";

  ctx.fillStyle = subInk;
  setFont(ctx, "bold", 9);
  ctx.fillText("DATE REGISTERED", avCenterX, dateStampY);

  ctx.fillStyle = ink;
  setFont(ctx, "bold", 13, "Cinzel");
  ctx.fillText(String(createdAtText || "—").toUpperCase(), avCenterX, dateStampY + 20);

  ctx.textAlign = "left";

  // --- 5. FOOTER ---
  // Copyright Text at the bottom left
  ctx.fillStyle = subInk;
  setFont(ctx, "normal", 12);
  ctx.fillText(`© Mystral Academy • Powered by ${BRAND_NAME}`, lx, cardY + cardH - 36);

  return canvas.toBuffer("image/png");
}

// ===================== HOUSE CARD RENDER =====================
async function renderHouseCard({ choice, name, gender, hovId, avatarUrl }) {
  const w = 980;
  const h = 360;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  const isDark = choice === "dark";

  const bgA = isDark ? "#0b0716" : "#ffffff";
  const bgB = isDark ? "#14102a" : "#cfefff";
  const bgC = isDark ? "#071a2f" : "#fff2b8";

  const ink = isDark ? "#f4eeff" : "#17131f";
  const subInk = isDark ? "rgba(220,200,255,.82)" : "rgba(35,32,44,.72)";
  const line = isDark ? "rgba(255,255,255,.10)" : "rgba(0,0,0,.10)";

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, bgA);
  grad.addColorStop(0.55, bgB);
  grad.addColorStop(1, bgC);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  drawParticles(ctx, { x: 0, y: 0, w, h }, isDark ? "dark" : "light");

  const pad = 26;
  const x = pad,
    y = pad,
    cw = w - pad * 2,
    ch = h - pad * 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.35)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = isDark ? "rgba(10,8,22,.72)" : "rgba(255,255,255,.78)";
  rr(ctx, x, y, cw, ch, 24);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  rr(ctx, x, y, cw, ch, 24);
  ctx.stroke();

  ctx.fillStyle = ink;
  setFont(ctx, "bold", 34);
  ctx.fillText("MYSTRAL ACADEMY", x + 34, y + 64);

  ctx.fillStyle = subInk;
  setFont(ctx, "bold", 20);
  ctx.fillText(isDark ? "DARK STUDENT" : "LIGHT STUDENT", x + 34, y + 98);

  const lx = x + 34;
  const top = y + 150;
  const gap = 44;

  const row = (label, value, idx) => {
    const yy = top + idx * gap;
    ctx.fillStyle = subInk;
    setFont(ctx, "bold", 18);
    ctx.fillText(label, lx, yy);

    ctx.fillStyle = ink;
    setFont(ctx, "bold", 22);
    ctx.fillText(value, lx + 160, yy);
  };

  row("Nama", safeText(name, 26), 0);
  row("Gender", safeText(gender, 10), 1);
  row("HOV ID", safeText(hovId, 24), 2);

  const avSize = 190;
  const avX = x + cw - avSize - 44;
  const avY = y + 96;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  try {
    const img = await loadImage(avatarUrl);
    ctx.drawImage(img, avX, avY, avSize, avSize);
  } catch {
    ctx.fillStyle = line;
    ctx.fillRect(avX, avY, avSize, avSize);
  }
  ctx.restore();

  ctx.fillStyle = subInk;
  setFont(ctx, "normal", 16);
  ctx.fillText(isDark ? "“Bearer of the Shadow”" : "“Bearer of the Light”", x + 34, y + ch - 28);

  return canvas.toBuffer("image/png");
}

// ===================== V2 CARD HELPER FUNCTIONS =====================
function pathTicket(ctx, x, y, w, h, r, cutoutR) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);

  // Right cutout
  ctx.lineTo(x + w, y + h / 2 - cutoutR);
  ctx.arc(x + w, y + h / 2, cutoutR, 1.5 * Math.PI, 0.5 * Math.PI, true);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);

  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);

  // Left cutout
  ctx.lineTo(x, y + h / 2 + cutoutR);
  ctx.arc(x, y + h / 2, cutoutR, 0.5 * Math.PI, 1.5 * Math.PI, true);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawBackgroundGrid(ctx, w, h, color, opacity = 0.05) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = opacity;
  ctx.lineWidth = 1;
  const gridSize = 25;

  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLightBeams(ctx, w, h, color, opacity = 0.03) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w * 0.35, 0);
  ctx.lineTo(w * 0.15, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(w * 0.45, 0);
  ctx.lineTo(w * 0.85, 0);
  ctx.lineTo(w * 0.6, h);
  ctx.lineTo(w * 0.2, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMagicSeal(ctx, cx, cy, radius, color, opacity = 0.18) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = opacity;
  ctx.lineWidth = 1.2;

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 14, 0, Math.PI * 2);
  ctx.stroke();

  // Middle dashed ring
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Hexagram Triangle 1
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
    const x = cx + Math.cos(angle) * (radius + 14);
    const y = cy + Math.sin(angle) * (radius + 14);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // Hexagram Triangle 2 (Opposite)
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3 + Math.PI / 6;
    const x = cx + Math.cos(angle) * (radius + 14);
    const y = cy + Math.sin(angle) * (radius + 14);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawCornerAccents(ctx, x, y, w, h, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4;

  // Top Left
  ctx.beginPath();
  ctx.moveTo(x + size, y);
  ctx.lineTo(x, y);
  ctx.lineTo(x, y + size);
  ctx.stroke();

  // Top Right
  ctx.beginPath();
  ctx.moveTo(x + w - size, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + size);
  ctx.stroke();

  // Bottom Left
  ctx.beginPath();
  ctx.moveTo(x + size, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + h - size);
  ctx.stroke();

  // Bottom Right
  ctx.beginPath();
  ctx.moveTo(x + w - size, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - size);
  ctx.stroke();

  ctx.restore();
}

function drawV2Particles(ctx, area, colors, opacity = 0.15) {
  const { x, y, w, h } = area;
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const px = x + Math.random() * w;
    const py = y + Math.random() * h;
    const r = 0.8 + Math.random() * 2.5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    ctx.globalAlpha = opacity * (0.3 + Math.random() * 0.7);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.restore();
}

// ===================== WELCOME CARD RENDER =====================
async function renderWelcomeCard({ username, avatarUrl, memberCount, guildName }) {
  const w = 720;
  const h = 280;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  // Base background gradient: BRIGHT VIBRANT CYAN BLUE
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#081d42"); // Deep navy
  grad.addColorStop(0.4, "#0d47a1"); // Royal blue
  grad.addColorStop(1, "#00b4d8"); // Bright vibrant cyan
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Background Grid and Diagonal Beams
  drawBackgroundGrid(ctx, w, h, "#00b4d8");
  drawLightBeams(ctx, w, h, "#90e0ef");

  // Glow spots (Vibrant neon cyan/sky blue/purple)
  ctx.globalAlpha = 0.4;
  const glow = (cx, cy, r, color) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  glow(600, 140, 180, "#00f0ff"); // Neon Cyan on the right (where avatar is)
  glow(150, 80, 200, "#0077b6");  // Sky blue on the left top
  glow(350, 200, 200, "#7209b7"); // Magic purple bottom center
  ctx.globalAlpha = 1;

  // Dense particles
  drawV2Particles(ctx, { x: 0, y: 0, w, h }, ["#00f0ff", "#90e0ef", "#ffd700", "#ffffff"]);

  // Ticket Container Coordinate Setup
  const cardX = 15;
  const cardY = 15;
  const cardW = w - 30;
  const cardH = h - 30;
  const separatorX = 540; // Swapped layout: Separator is on the right now!

  // Draw Ticket Shape
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = "rgba(10, 20, 52, 0.85)"; // Deep ocean slate card base
  pathTicket(ctx, cardX, cardY, cardW, cardH, 16, 18);
  ctx.fill();
  ctx.restore();

  // Draw Corner accents on ticket
  drawCornerAccents(ctx, cardX, cardY, cardW, cardH, 12, "#00f0ff");

  // Draw Neon Cyan-Gold Border Gradient
  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  borderGrad.addColorStop(0, "#00f0ff"); // electric cyan
  borderGrad.addColorStop(0.5, "#ffd700"); // bright gold
  borderGrad.addColorStop(1, "#90e0ef"); // light ice blue
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.65;
  pathTicket(ctx, cardX, cardY, cardW, cardH, 16, 18);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Dotted separating line (on the right)
  ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(separatorX, cardY + 2);
  ctx.lineTo(separatorX, cardY + cardH - 2);
  ctx.stroke();
  ctx.setLineDash([]); // Reset

  // --- RIGHT ZONE: AVATAR & MAGIC SEAL ---
  const avX = 622;
  const avY = 140;
  const avRadius = 55;

  // Inscribe Magic Seal behind Avatar
  drawMagicSeal(ctx, avX, avY, avRadius, "#00f0ff");

  // Avatar Outline
  ctx.strokeStyle = "#00d2ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avX, avY, avRadius + 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(avX, avY, avRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  try {
    const img = await loadImage(avatarUrl);
    ctx.drawImage(img, avX - avRadius, avY - avRadius, avRadius * 2, avRadius * 2);
  } catch {
    ctx.fillStyle = "#1e293b";
    ctx.fill();
  }
  ctx.restore();

  // --- LEFT ZONE: DIFFERENT WORDING & NEW LAYOUT ---
  // 1. Top Labels: Different Wording
  ctx.fillStyle = "rgba(144, 224, 239, 0.8)";
  setFont(ctx, "bold", 11);
  ctx.fillText("ENTRANCE PERMIT", 50, 68);

  ctx.save();
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffd700"; // Solid vibrant gold
  setFont(ctx, "bold", 12, "Cinzel");
  ctx.fillText("MYSTRAL ACADEMY", 510, 68);
  ctx.restore();

  // Status on the right ticket tag
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(144, 224, 239, 0.6)";
  setFont(ctx, "normal", 9);
  ctx.fillText("PASS TICKET", avX, 68);
  ctx.textAlign = "left";

  // 2. Greetings Title
  ctx.fillStyle = "#ffd700"; // Gold greeting
  setFont(ctx, "bold", 13);
  ctx.fillText("ARCANE GATE OPENED", 50, 94);

  // 3. User Name (Cinzel serif, dynamic truncation)
  ctx.fillStyle = "#ffffff";
  setFont(ctx, "bold", 28, "Cinzel");
  let displayName = username;
  const maxNameWidth = 450;
  if (ctx.measureText(displayName).width > maxNameWidth) {
    while (displayName.length > 0 && ctx.measureText(displayName + "...").width > maxNameWidth) {
      displayName = displayName.slice(0, -1);
    }
    displayName += "...";
  }
  ctx.fillText(displayName, 50, 126);

  // 4. New Welcome Message / Subtext
  ctx.fillStyle = "#e0f2fe";
  setFont(ctx, "normal", 15);
  ctx.fillText("The archives await your magical signature.", 50, 154);

  // Divider Line
  ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 184);
  ctx.lineTo(510, 184);
  ctx.stroke();

  // 5. Registry Info & Custom Status (V2 layout)
  ctx.fillStyle = "#00f0ff";
  setFont(ctx, "bold", 14);
  ctx.fillText(`Registry No: #${memberCount}`, 50, 216);

  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  setFont(ctx, "normal", 12);
  ctx.fillText("Rank: Academian Novice", 280, 216);

  // Footer label
  ctx.fillStyle = "rgba(144, 224, 239, 0.3)";
  setFont(ctx, "normal", 11);
  ctx.fillText("Verified by the Grand Magister Council", 50, 236);

  // Decorative Stars around the card
  drawStar(ctx, 480, 110, 4, 6, 2.5, "#ffd700");
  drawStar(ctx, 622, 215, 4, 4, 1.5, "#00f0ff");
  drawStar(ctx, 680, 100, 4, 3, 1.2, "#ffffff");

  return canvas.toBuffer("image/png");
}

// ===================== LEAVE CARD RENDER =====================
async function renderLeaveCard({ username, avatarUrl, guildName }) {
  const w = 720;
  const h = 280;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  // Base background gradient: DEEP DARK MIDNIGHT BLUE
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#020817"); // Dark space black
  grad.addColorStop(0.5, "#0a1128"); // Midnight dark navy
  grad.addColorStop(1, "#1b263b"); // Slate dark space blue
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Background Grid and Diagonal Beams
  drawBackgroundGrid(ctx, w, h, "#1d3557");
  drawLightBeams(ctx, w, h, "#457b9d");

  // Glow spots (deep mysterious blue/teal/indigo)
  ctx.globalAlpha = 0.35;
  const glow = (cx, cy, r, color) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  glow(622, 140, 180, "#1d4ed8"); // deep blue glow right (avatar)
  glow(150, 80, 200, "#0f172a");  // slate navy left top
  glow(350, 200, 200, "#006d77"); // dark teal bottom center
  ctx.globalAlpha = 1;

  // Stardust
  drawV2Particles(ctx, { x: 0, y: 0, w, h }, ["#3a86c8", "#1d4ed8", "#93c5fd", "#475569"]);

  // Ticket Container
  const cardX = 15;
  const cardY = 15;
  const cardW = w - 30;
  const cardH = h - 30;
  const separatorX = 540;

  // Draw Ticket Shape
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = "rgba(5, 11, 28, 0.88)"; // Ultra deep midnight card base
  pathTicket(ctx, cardX, cardY, cardW, cardH, 16, 18);
  ctx.fill();
  ctx.restore();

  // Draw Corner accents on ticket
  drawCornerAccents(ctx, cardX, cardY, cardW, cardH, 12, "#3b82f6");

  // Draw Deep Blue / Silver Border Gradient
  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  borderGrad.addColorStop(0, "#3b82f6"); // royal blue
  borderGrad.addColorStop(0.5, "#475569"); // silver slate
  borderGrad.addColorStop(1, "#1d4ed8"); // deep navy blue
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.55;
  pathTicket(ctx, cardX, cardY, cardW, cardH, 16, 18);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Dotted separating line (on the right)
  ctx.strokeStyle = "rgba(59, 130, 246, 0.2)";
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(separatorX, cardY + 2);
  ctx.lineTo(separatorX, cardY + cardH - 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- RIGHT ZONE: AVATAR & MAGIC SEAL (DEEP BLUE THEME) ---
  const avX = 622;
  const avY = 140;
  const avRadius = 55;

  drawMagicSeal(ctx, avX, avY, avRadius, "#3b82f6");

  // Avatar Outline
  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avX, avY, avRadius + 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(avX, avY, avRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  try {
    const img = await loadImage(avatarUrl);
    ctx.drawImage(img, avX - avRadius, avY - avRadius, avRadius * 2, avRadius * 2);
  } catch {
    ctx.fillStyle = "#020617";
    ctx.fill();
  }
  ctx.restore();

  // --- LEFT ZONE: DEEP BLUE WORDING & NEW LAYOUT ---
  // 1. Top Labels: Different Wording
  ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
  setFont(ctx, "bold", 11);
  ctx.fillText("DEPARTURE LOG", 50, 68);

  ctx.save();
  ctx.textAlign = "right";
  ctx.fillStyle = "#60a5fa"; // Solid bright slate/sky blue
  setFont(ctx, "bold", 12, "Cinzel");
  ctx.fillText("MYSTRAL ACADEMY", 510, 68);
  ctx.restore();

  // Status on the right ticket tag
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(148, 163, 184, 0.55)";
  setFont(ctx, "normal", 9);
  ctx.fillText("VOID TICKET", avX, 68);
  ctx.textAlign = "left";

  // 2. Greetings Title
  ctx.fillStyle = "#f43f5e"; // Red/Rose greeting
  setFont(ctx, "bold", 13);
  ctx.fillText("TICKET STATUS: TERMINATED", 50, 94);

  // 3. User Name (Cinzel serif, dynamic truncation)
  ctx.fillStyle = "#cbd5e1";
  setFont(ctx, "bold", 28, "Cinzel");
  let displayName = username;
  const maxNameWidth = 450;
  if (ctx.measureText(displayName).width > maxNameWidth) {
    while (displayName.length > 0 && ctx.measureText(displayName + "...").width > maxNameWidth) {
      displayName = displayName.slice(0, -1);
    }
    displayName += "...";
  }
  ctx.fillText(displayName, 50, 126);

  // 4. New Leave Message / Subtext
  ctx.fillStyle = "#94a3b8";
  setFont(ctx, "normal", 15);
  ctx.fillText("The archives will remember your magical footprint.", 50, 154);

  // Divider Line
  ctx.strokeStyle = "rgba(59, 130, 246, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 184);
  ctx.lineTo(510, 184);
  ctx.stroke();

  // 5. Red Farewell quote
  ctx.fillStyle = "#3b82f6";
  setFont(ctx, "bold", 14);
  ctx.fillText("May the stars guide your path.", 50, 216);

  // Footer label
  ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
  setFont(ctx, "normal", 11);
  ctx.fillText("Mystral Registry • Gate Logs System", 50, 236);

  // Decorative Stars
  drawStar(ctx, 480, 110, 4, 6, 2.5, "#3b82f6");
  drawStar(ctx, 622, 215, 4, 4, 1.5, "#1d4ed8");
  drawStar(ctx, 680, 100, 4, 3, 1.2, "#475569");

  return canvas.toBuffer("image/png");
}

// ===================== PANELS =====================
function sortingPanelComponentsV2() {
  const LIGHT = process.env.LIGHT_EMOJI || "<:light:1459543076736336004>";
  const DARK = process.env.DARK_EMOJI || "<:dark:1459543141609771101>";

  const body = [
    "When the veil thins, destiny answers.",
    "",
    "Lingkaran arcane kembali aktif, memanggil setiap jiwa yang melangkah ke dalam wilayah Mystral Academy.",
    "Dengan menyentuh segel di bawah, kau akan memasuki **Ritual Pemilahan Arcane**?hukum kuno yang menentukan afiliasimu.",
    "",
    "> Arcane akan membaca gema jiwamu dan menetapkan satu jalan:",
    `${LIGHT} **Light Student** : cahaya, tatanan, dan penjaga keseimbangan kerajaan`,
    `${DARK} **Dark Student** : bayangan, kehendak bebas, dan kekuatan tersembunyi`,
    "",
    ":scroll: **Prasyarat Ritual**",
    "Hanya mereka yang telah memiliki **Mystral ID Card**",
    "(dengan mantra **/idcard**) yang diizinkan memasuki lingkaran ini.",
    "",
    "<:segelsihir:1459542892816236747> **Segel Takdir**",
    "Ritual ini hanya dapat dijalankan **satu kali**.",
    "Setelah arcane memilih, hasilnya akan **terkunci selamanya**.",
    "",
    "<:hukum:1459542952907898881> **Hukum Academy Mystral**",
    "Seluruh peran lain yang telah kau miliki",
    "akan tetap utuh dan tidak terpengaruh oleh ritual ini.",
    "",
    "Kini, berdirilah di dalam lingkaran.",
    "**Takdir tidak menunggu mereka yang ragu.**",
  ].join("\n");

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("# <:witch:1459543006813229199> Student Sorting"),
      new TextDisplayBuilder().setContent(body)
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(sortingPanelRow())
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("Sentuh segel untuk memulai Ritual Pemilahan Student.")
    );

  return [container];
}
function sortingPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("sorting:roll").setLabel("Mulai Ritual").setStyle(ButtonStyle.Primary).setEmoji("<:witch:1459543006813229199>")
  );
}

function menfessPanelEmbed() {
  return new EmbedBuilder()
    .setTitle("🕯️ MENFESS")
    .setColor(EMBED_COLOR)
    .setDescription("Klik tombol untuk kirim menfess **anonim**.\nBalasan juga anonim.")
    .setFooter({ text: "No doxxing / hate / threat. Keep it safe." });
}

function menfessPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("menfess:new").setLabel("Kirim Menfess").setStyle(ButtonStyle.Success).setEmoji("✉️")
  );
}

const HELP_CATEGORIES = {
  general: {
    emoji: "🧭",
    label: "Umum & Utilitas",
    description: "Command umum, bot status, ping, dan kalkulator.",
    commands: [
      "`/help` - Menampilkan grimoire bantuan ini.",
      "`/ping` - Cek koneksi & latensi bot.",
      "`/botstatus` - Cek penggunaan memori dan status bot.",
      "`/halo` - Sapaan hangat dari asisten.",
      "`/about` - Informasi detail seputar Mystral Assistant.",
      "`/calc <ekspresi>` - Kalkulator aman berbasis matematika murni.",
      "`/translate <teks> [to] [from]` - Terjemahkan teks ke bahasa lain.",
      "`/weather <lokasi>` - Cek kondisi cuaca di lokasi tertentu.",
      "`/qrcode <teks>` - Buat QR Code dari teks atau link URL.",
      "`/shorturl <url>` - Singkat URL panjang menggunakan TinyURL."
    ]
  },
  profile: {
    emoji: "🪞",
    label: "Profil & Lookup",
    description: "Informasi profil user, avatar, server, dan keaktifan.",
    commands: [
      "`/profile` - Lihat profil akademi interaktif milikmu atau orang lain.",
      "`/avatar` - Mengambil foto profil user dengan resolusi tinggi.",
      "`/userinfo` - Menampilkan detail akun discord seorang user.",
      "`/serverinfo` - Menampilkan statistik & informasi server ini.",
      "`/lastseen` - Lacak kapan terakhir kali seorang member aktif di chat.",
      "`/topactive` - Lihat peringkat member teraktif di server.",
      "`/check <platform>` - Cek profil game (Roblox, Github, Steam, Chess)."
    ]
  },
  academy: {
    emoji: "🪪",
    label: "Academy Identity",
    description: "Pembuatan ID Card dan pemilahan ritual (Arcane Sorting).",
    commands: [
      "`/idcard` - Buat, update, atau rancang Mystral Identity Card milikmu.",
      "`/registry` - Akses daftar member yang terdaftar di Mystral Academy.",
      "`/myhouse` - Tampilkan info asrama/afiliasi hasil ritual pemilahanmu.",
      "`/sortingpanel` - Pasang panel ritual sorting *(Owner Only)*."
    ]
  },
  social: {
    emoji: "🕯️",
    label: "Sosial & Chill",
    description: "Status AFK, pengingat (reminders), dan Truth or Dare.",
    commands: [
      "`/tod panel` - Buka game Truth or Dare dengan tombol interaktif.",
      "`/tod truth` - Ambil pertanyaan Truth secara acak.",
      "`/tod dare` - Ambil tantangan Dare secara acak.",
      "`/tod random` - Ambil tantangan/pertanyaan secara random.",
      "`/tod daily` - Ambil tantangan harian khusus.",
      "`/tod submit` - Kirim ide Truth/Dare buatanmu sendiri.",
      "`/afk <alasan>` - Masuk ke mode AFK, bot akan me-mention alasanmu jika di-tag.",
      "`/afk_list` - Lihat daftar member yang sedang AFK saat ini.",
      "`/remind_in <durasi> <pesan>` - Buat alarm pengingat berdasarkan durasi waktu.",
      "`/remind_at <waktu> <pesan>` - Buat alarm pengingat di jam tertentu (WIB).",
      "`/remind_list` - Lihat atau hapus alarm pengingat aktif milikmu.",
      "`/menfesspanel` - Kirim panel kirim menfess anonim *(Owner Only)*."
    ]
  },
  games: {
    emoji: "🎉",
    label: "Games & Events",
    description: "Mini-games tebak angka dan sistem giveaway.",
    commands: [
      "`/tebakangka` - Mulai game tebak angka interaktif di channel.",
      "`/hint` - Ambil petunjuk batas angka dari game aktif.",
      "`/stopgame` - Hentikan permainan tebak angka yang sedang berjalan.",
      "`/leaderboard tebakangka` - Lihat peringkat penebak terjitu.",
      "`/giveaway_start` - Mulai event giveaway berhadiah.",
      "`/giveaway_end` - Selesaikan giveaway aktif dan pilih pemenang.",
      "`/giveaway_list` - Tampilkan semua daftar giveaway aktif.",
      "`/giveaway_entries` - Cek daftar peserta giveaway tertentu.",
      "`/giveaway_delete` - Batalkan/hapus giveaway tertentu.",
      "`/giveaway_reroll` - Undi ulang pemenang giveaway."
    ]
  },
  support: {
    emoji: "🎫",
    label: "Support Desk",
    description: "Manajemen tiket aduan, report, dan kerja sama.",
    commands: [
      "`/ticket_setup` - Inisialisasi kategori & setelan log ticket.",
      "`/ticketpanel` - Kirim panel private ticket ke channel *(Owner Only)*.",
      "**Operasional Tiket**:",
      "• `claim` - Klaim tiket oleh staff untuk mulai melayani.",
      "• `close` - Menutup tiket secara permanen & membuat log transkrip."
    ]
  },
  faq: {
    emoji: "📚",
    label: "Knowledge Base (FAQ)",
    description: "Pusat informasi akademi (Frequently Asked Questions).",
    commands: [
      "`/faq_view <tag>` - Lihat jawaban FAQ berdasarkan tag kunci.",
      "`/faq_search <query>` - Cari artikel FAQ yang relevan.",
      "`/faq_list` - Tampilkan daftar lengkap FAQ yang terdaftar.",
      "`/faq_add` - Tambah artikel FAQ baru *(Staff/Admin)*.",
      "`/faq_edit` - Ubah isi artikel FAQ yang ada *(Staff/Admin)*.",
      "`/faq_delete` - Hapus artikel FAQ *(Staff/Admin)*.",
      "`/faq_panel` - Kirim panel pencarian FAQ interaktif *(Staff/Admin)*."
    ]
  },
  moderation: {
    emoji: "🛡️",
    label: "Moderation Shield",
    description: "Fitur keamanan, sanksi, dan warning member.",
    commands: [
      "`/warn` - Berikan sanksi peringatan (warning) kepada member.",
      "`/warnings` - Periksa riwayat peringatan seorang member.",
      "`/clearwarn` - Bersihkan sanksi peringatan dari member.",
      "`/unwarn` - Tarik kembali warning terakhir seorang member.",
      "`/timeout` - Bisukan (timeout) member untuk durasi tertentu.",
      "`/untimeout` - Batalkan bisukan member sebelum durasinya habis.",
      "`/mute` / `/unmute` - Matikan/aktifkan suara member di voice channel.",
      "`/kick` - Mengeluarkan member dari server akademi.",
      "`/ban` / `/unban` - Cekal/batalkan cekal akun member dari server."
    ]
  },
  admin: {
    emoji: "🔐",
    label: "Admin & Owner Tools",
    description: "Sistem role panel, backup data, dan embed builder.",
    commands: [
      "`/selfrolespanel` - Kirim panel pengaturan role mandiri.",
      "`/idcard_export` - Ekspor database ID Card ke format JSON.",
      "`/backup_now` - Lakukan backup basis data SQLite secara instan.",
      "`/tod_add` - Tambah pertanyaan Truth/Dare ke database bawaan.",
      "`/sendembed` / `/sendembedv2` - Kirim pesan embed kustom."
    ]
  },
  prefix: {
    emoji: "⌨️",
    label: "Prefix Shortcuts",
    description: "Daftar command cepat dengan awalan prefix 'c'.",
    commands: [
      "`chelp` - Bantuan interaktif ini.",
      "`cping` - Ping latensi bot.",
      "`chalo` - Menyapa bot secara cepat.",
      "`ccalc <ekspresi>` - Hitung matematika cepat.",
      "`cta` - Mulai game tebak angka.",
      "`chint` - Petunjuk tebak angka.",
      "`cstopgame` - Berhentikan tebak angka.",
      "`clb angka` - Leaderboard tebak angka.",
      "`ctarot` - Buka tarot harian.",
      "`ctranslate` / `cts` - Terjemah cepat.",
      "`cweather <lokasi>` - Cek cuaca cepat.",
      "`cqrcode <teks>` - Generasi QR Code cepat.",
      "`cshorturl` / `csurl` - Singkat link URL cepat."
    ]
  }
};

function buildHelpUI(selectedCategory = "home", userId = null) {
  const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTimestamp();

  if (selectedCategory === "home" || !HELP_CATEGORIES[selectedCategory]) {
    embed
      .setTitle("📚 Mystral Assistant — Command Grimoire")
      .setDescription(
        [
          "Selamat datang di pusat komando **Mystral Academy**.",
          "Gunakan slash command `/...` untuk fitur utama, atau prefix `c...` untuk beberapa command cepat.",
          "",
          "🔮 **Pilih kategori fitur di bawah untuk melihat daftar command lengkap.**"
        ].join("\n")
      )
      .setFooter({ text: "Mystral Academy • Gunakan menu di bawah untuk bernavigasi" });

    // Show summary categories in fields
    for (const [key, cat] of Object.entries(HELP_CATEGORIES)) {
      embed.addFields({
        name: `${cat.emoji} ${cat.label}`,
        value: cat.description,
        inline: true
      });
    }
  } else {
    const cat = HELP_CATEGORIES[selectedCategory];
    embed
      .setTitle(`${cat.emoji} Kategori: ${cat.label}`)
      .setDescription(
        [
          `*${cat.description}*`,
          "",
          cat.commands.join("\n")
        ].join("\n")
      )
      .setFooter({ text: `Mystral Academy • Kategori: ${cat.label} • slash / prefix c` });
  }

  // Create Select Menu
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`help:menu:${userId || "any"}`)
    .setPlaceholder("📖 Pilih Kategori Fitur...")
    .addOptions(
      {
        label: "Menu Utama",
        value: "home",
        description: "Kembali ke halaman depan grimoire.",
        emoji: "🏠",
        default: selectedCategory === "home"
      },
      ...Object.entries(HELP_CATEGORIES).map(([key, cat]) => ({
        label: cat.label,
        value: key,
        description: cat.description.length > 50 ? cat.description.slice(0, 47) + "..." : cat.description,
        emoji: cat.emoji,
        default: selectedCategory === key
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);
  return { embeds: [embed], components: [row] };
}

function buildHelpEmbed() {
  const ui = buildHelpUI("home", null);
  return ui.embeds[0];
}

function ticketPanelComponentsV2() {
  const row = ticketPanelRow();
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("# 🎫 Arcane Support Desk — Mystral Academy"),
      new TextDisplayBuilder().setContent(
        [
          "Jika kau mengalami gangguan, kebingungan, atau membutuhkan bantuan resmi dari akademi buka ticket secara privat di sini.",
          "",
          "🕯️ **Keluhan** — pengalaman tidak nyaman / konflik / hal pribadi",
          "⚠️ **Report** — pelanggaran aturan / tindakan meresahkan",
          "💠 **Donasi** — dukungan untuk pengembangan akademi",
          "🤝 **Partnership** — kerja sama komunitas / event",
          "✅ **Verifikasi** — pengajuan atau kendala role Verified dan role Real Female",
          "",
          "🔐 Ticket bersifat **rahasia**: hanya kamu & staff yang dapat melihatnya.",
          "Tolong tulis kronologi atau kebutuhanmu dengan jelas agar cepat ditangani.",
        ].join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(row)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("Mystral Academy • Speak freely, we will listen.")
    );

  return [container];
}

function ticketPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket:open:complaint").setLabel("Keluhan").setStyle(ButtonStyle.Primary).setEmoji("🕯"),
    new ButtonBuilder().setCustomId("ticket:open:report").setLabel("Report").setStyle(ButtonStyle.Danger).setEmoji("⚠"),
    new ButtonBuilder().setCustomId("ticket:open:donate").setLabel("Donate").setStyle(ButtonStyle.Success).setEmoji("💠"),
    new ButtonBuilder().setCustomId("ticket:open:partnership").setLabel("Partnership").setStyle(ButtonStyle.Primary).setEmoji("🤝"),
    new ButtonBuilder().setCustomId("ticket:open:verification").setLabel("Verification").setStyle(ButtonStyle.Success).setEmoji("✅")
  );
}

// ===================== HOUSECARD POST =====================
async function postHouseCard(guild, user, choice) {
  const houseChId = requireEnv("HOUSECARD_CHANNEL_ID");
  const houseChannel = await getTextChannelOrNull(guild, houseChId);
  if (!houseChannel) return false;

  const idData = await getIdCard(user.id);
  if (!idData) return false;

  const png = await renderHouseCard({
    choice,
    name: idData.name || user.username,
    gender: idData.gender || "—",
    hovId: idData.number || "—",
    avatarUrl: user.displayAvatarURL({ extension: "png", size: 256 }),
  });

  const filename = `house_card_${user.id}.png`;
  const file = new AttachmentBuilder(png, { name: filename });

  const embed = new EmbedBuilder()
    .setTitle("🪪 Mystral Academy Card")
    .setColor(EMBED_COLOR)
    .setDescription(
      [
        `**Member:** <@${user.id}>`,
        `**Student:** ${choice === "dark" ? "<:dark:1459543141609771101> Dark Student" : "<:light:1459543076736336004> Light Student"}`,
      ].join("\n")
    )
    .setImage(`attachment://${filename}`)
    .setFooter({ text: "Mystral Academy • Student Registry" })
    .setTimestamp();

  const payload = {
    content: `📜 Takdir telah ditetapkan untuk <@${user.id}>.`,
    embeds: [embed],
    files: [file],
    allowedMentions: { parse: [] },
  };

  const saved = await getHouseCardPost(user.id).catch(() => null);
  let targetMessage = null;

  if (saved?.channel_id === houseChannel.id && saved?.message_id) {
    targetMessage = await houseChannel.messages.fetch(saved.message_id).catch(() => null);
  }

  if (!targetMessage) {
    const recent = await houseChannel.messages.fetch({ limit: 100 }).catch(() => null);
    const matching = recent
      ? [...recent.values()]
        .filter((msg) =>
          msg.author?.id === client.user?.id &&
          msg.content?.includes(`<@${user.id}>`) &&
          msg.embeds?.[0]?.title === "🪪 Mystral Academy Card"
        )
        .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
      : [];

    targetMessage = matching[0] || null;

    for (const duplicate of matching.slice(1)) {
      await duplicate.delete().catch(() => { });
    }
  }

  const sent = targetMessage
    ? await targetMessage.edit(payload).catch(() => null)
    : await houseChannel.send(payload).catch(() => null);

  if (sent) {
    await setHouseCardPost({
      userId: user.id,
      guildId: guild.id,
      channelId: houseChannel.id,
      messageId: sent.id,
    }).catch(() => null);
  }

  return Boolean(sent);
}

// ===================== REGISTRY UI =====================
function registryEmbed(pageIndex, totalPages, totalUsers, pageRows) {
  const desc =
    pageRows.length === 0
      ? "Belum ada student yang terdaftar ID Card."
      : pageRows
        .map((x, idx) => {
          const num = pageIndex * 10 + idx + 1;
          const dateUnix = x.created_at ? Math.floor(Number(x.created_at) / 1000) : null;
          const dateText = dateUnix ? `<t:${dateUnix}:D>` : "—";
          return `**${num}.** <@${x.user_id}> • **${safeText(x.name, 24) || "—"}** • ${dateText}`;
        })
        .join("\n");

  return new EmbedBuilder()
    .setTitle("🗂️ MYSTRAL Registry — Student Terdaftar")
    .setDescription(desc)
    .setColor(EMBED_COLOR)
    .setFooter({ text: `Page ${pageIndex + 1} / ${totalPages} • Total: ${totalUsers}` })
    .setTimestamp();
}

function registryRow(pageIndex, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`registry:prev:${pageIndex}`).setLabel("Prev").setStyle(ButtonStyle.Secondary).setDisabled(pageIndex <= 0),
    new ButtonBuilder().setCustomId(`registry:next:${pageIndex}`).setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(pageIndex >= totalPages - 1)
  );
}

// ===================== VOICE TRACKING SYSTEM =====================
const voiceSessions = new Map(); // userId -> joinTimestamp

async function saveVoiceActivity(userId, seconds) {
  try {
    const now = Date.now();
    const wib = new Date(now + 7 * 60 * 60 * 1000);
    const day = wib.toISOString().slice(0, 10); // YYYY-MM-DD (WIB)

    await safeRun(
      `INSERT INTO voice_activity_daily (day, user_id, duration)
       VALUES (?, ?, ?)
       ON CONFLICT(day, user_id) DO UPDATE SET
         duration = voice_activity_daily.duration + excluded.duration`,
      [day, userId, seconds]
    );
  } catch (err) {
    console.error("[VOICE] Error saving voice activity:", err);
  }
}

function joinTargetVoice(client) {
  const channelId = "1520138038309687416";
  try {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
      console.warn(`[VOICE 24/7] Target channel ${channelId} not found in cache. Bot might not be in the guild or channel doesn't exist.`);
      return;
    }

    const activeConnection = getVoiceConnection(channel.guild.id);
    if (activeConnection && activeConnection.state.status === VoiceConnectionStatus.Ready) {
      // Already connected and healthy
      return;
    }

    console.log(` ├── [VOICE 24/7] Attempting to connect to: ${channel.name} (${channel.id})`);
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfMute: true,
      selfDeaf: true,
    });

    connection.on('stateChange', (oldState, newState) => {
      if (newState.status === VoiceConnectionStatus.Ready) {
        console.log(` ├── [VOICE 24/7] Connected to: ${channel.name} (${channel.id})`);
      }
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        console.log("[VOICE 24/7] Disconnected. Reconnecting in 30 seconds...");
        setTimeout(() => {
          if (connection.state.status === VoiceConnectionStatus.Disconnected) {
            joinTargetVoice(client);
          }
        }, 30000);
      }
    });

    connection.on('error', (err) => {
      console.error("[VOICE 24/7] Connection error:", err);
      try {
        connection.destroy();
      } catch { }
      setTimeout(() => joinTargetVoice(client), 30000);
    });

  } catch (err) {
    console.error("[VOICE 24/7] Failed to join voice channel:", err);
  }
}

function initVoiceTracking(client) {
  try {
    const now = Date.now();
    let count = 0;
    const targetGuildId = process.env.GUILD_ID;
    if (targetGuildId) {
      const guild = client.guilds.cache.get(targetGuildId);
      if (guild) {
        guild.members.cache.forEach((member) => {
          if (member.user.bot) return;
          const vc = member.voice?.channel;
          if (vc && vc.id !== guild.afkChannelId) {
            voiceSessions.set(member.id, now);
            count++;
          }
        });
      }
    } else {
      client.guilds.cache.forEach((guild) => {
        guild.members.cache.forEach((member) => {
          if (member.user.bot) return;
          const vc = member.voice?.channel;
          if (vc && vc.id !== guild.afkChannelId) {
            voiceSessions.set(member.id, now);
            count++;
          }
        });
      });
    }
    console.log(` ├── [VOICE] Tracking initialized: ${count} active users`);
  } catch (err) {
    console.error("[VOICE] Error initializing voice tracking:", err);
  }
}

async function buildSupportEmbed() {
  const sponsors = await safeAll(
    "SELECT * FROM support_leaderboard WHERE type = 'sponsor' ORDER BY amount DESC, updated_at ASC LIMIT 5"
  );
  const donaturs = await safeAll(
    "SELECT * FROM support_leaderboard WHERE type = 'donatur' ORDER BY amount DESC, updated_at ASC LIMIT 5"
  );

  const formatUser = (row) => {
    const isSnowflake = /^\d{17,20}$/.test(row.user_id);
    return isSnowflake ? `<@${row.user_id}>` : row.user_id;
  };

  const formatRankEmoji = (rank, isSponsor) => {
    if (rank === 1) return isSponsor ? "👑" : "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    if (rank === 4) return "🎖️";
    return "🔹";
  };

  const sponsorList = sponsors.length
    ? sponsors.map((r, i) => `${formatRankEmoji(i + 1, true)} **#${i + 1}** ${formatUser(r)} — \`Rp ${Number(r.amount).toLocaleString("id-ID")}\``).join("\n")
    : "Belum ada sponsor.";

  const donaturList = donaturs.length
    ? donaturs.map((r, i) => `${formatRankEmoji(i + 1, false)} **#${i + 1}** ${formatUser(r)} — \`Rp ${Number(r.amount).toLocaleString("id-ID")}\``).join("\n")
    : "Belum ada donatur.";

  const desc = [
    "Terima kasih kepada para jiwa mulia yang mendukung perkembangan dan kelangsungan Mystral Academy. ✨",
    "",
    "⭐ **SPONSOR TOP 5**",
    sponsorList,
    "",
    "💎 **DONATUR TOP 5**",
    donaturList
  ].join("\n");

  return new EmbedBuilder()
    .setTitle("🏆 THE NOBLES OF MYSTRAL ACADEMY")
    .setColor(0xffd700)
    .setDescription(desc)
    .setFooter({ text: "Mystral Academy • Support Leaderboard" })
    .setTimestamp();
}

async function buildMonthlyRecapEmbed(month, year) {
  const now = Date.now();
  const wib = new Date(now + 7 * 60 * 60 * 1000);
  const currentMonth = wib.getMonth() + 1;
  const currentYear = wib.getFullYear();

  const targetMonth = month || currentMonth;
  const targetYear = year || currentYear;

  const monthsIndo = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const monthLabel = monthsIndo[targetMonth - 1] || `Bulan ${targetMonth}`;
  const datePattern = `${targetYear}-${String(targetMonth).padStart(2, "0")}-%`;

  const topChat = await safeAll(
    `SELECT user_id, SUM(msg_count) AS total
     FROM activity_daily
     WHERE day LIKE ?
     GROUP BY user_id
     ORDER BY total DESC
     LIMIT 5`,
    [datePattern]
  );

  const dbVoice = await safeAll(
    `SELECT user_id, SUM(duration) AS total
     FROM voice_activity_daily
     WHERE day LIKE ?
     GROUP BY user_id
     ORDER BY total DESC`,
    [datePattern]
  );

  const voiceMap = new Map();
  for (const row of dbVoice) {
    voiceMap.set(row.user_id, Number(row.total));
  }

  if (targetMonth === currentMonth && targetYear === currentYear) {
    const targetGuildId = process.env.GUILD_ID;
    const guild = targetGuildId ? client.guilds.cache.get(targetGuildId) : null;

    for (const [userId, joinTime] of voiceSessions.entries()) {
      if (guild) {
        const member = guild.members.cache.get(userId);
        const vc = member?.voice?.channel;
        if (!vc || vc.id === guild.afkChannelId) {
          continue;
        }
      }
      const elapsedSec = Math.floor((now - joinTime) / 1000);
      if (elapsedSec > 0) {
        const currentTotal = voiceMap.get(userId) || 0;
        voiceMap.set(userId, currentTotal + elapsedSec);
      }
    }
  }

  const topVoice = Array.from(voiceMap.entries())
    .map(([user_id, total]) => ({ user_id, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const formatRankEmoji = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    if (rank === 4) return "🎖️";
    return "🔹";
  };

  const formatVoiceDuration = (sec) => {
    const s = Number(sec || 0);
    if (s < 60) return "< 1 menit";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} menit`;
    const h = Math.floor(m / 60);
    const remMin = m % 60;
    return `${h} jam ${remMin} menit`;
  };

  const chatList = topChat.length
    ? topChat.map((r, i) => `${formatRankEmoji(i + 1)} **#${i + 1}** <@${r.user_id}> — \`${Number(r.total).toLocaleString("id-ID")} msg\``).join("\n")
    : "Belum ada aktivitas chat.";

  const voiceList = topVoice.length
    ? topVoice.map((r, i) => `${formatRankEmoji(i + 1)} **#${i + 1}** <@${r.user_id}> — \`${formatVoiceDuration(r.total)}\``).join("\n")
    : "Belum ada aktivitas voice.";

  const desc = [
    "**TOP CHAT BULAN INI**",
    "",
    chatList,
    "",
    "**TOP VOICE BULAN INI**",
    "",
    voiceList
  ].join("\n");

  return new EmbedBuilder()
    .setTitle("🏆 MONTHLY RECAP MYSTRAL ACADEMY")
    .setColor(0x77d0d7)
    .setDescription(desc)
    .setFooter({ text: `Mystral Academy • Monthly Recap • ${monthLabel} ${targetYear}` })
    .setTimestamp();
}

async function updateLiveLeaderboards(client) {
  try {
    const recapChId = await getMetaText("recap_live_channel_id");
    const recapMsgId = await getMetaText("recap_live_message_id");
    if (recapChId && recapMsgId) {
      const channel = await client.channels.fetch(recapChId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const message = await channel.messages.fetch(recapMsgId).catch(() => null);
        if (message) {
          const embed = await buildMonthlyRecapEmbed();
          await message.edit({ embeds: [embed] }).catch(() => null);
        }
      }
    }

    const supportChId = await getMetaText("support_live_channel_id");
    const supportMsgId = await getMetaText("support_live_message_id");
    if (supportChId && supportMsgId) {
      const channel = await client.channels.fetch(supportChId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const message = await channel.messages.fetch(supportMsgId).catch(() => null);
        if (message) {
          const embed = await buildSupportEmbed();
          await message.edit({ embeds: [embed] }).catch(() => null);
        }
      }
    }
  } catch (err) {
    console.error("[LIVE LEADERBOARD] Error updating live leaderboards:", err);
  }
}

// ===================== READY =====================
client.once(Events.ClientReady, async (c) => {
  initVoiceTracking(c);

  // Join target voice channel 24/7
  joinTargetVoice(c);
  setInterval(() => {
    joinTargetVoice(c);
  }, 5 * 60 * 1000);

  startGiveawayLoop(c); // ✅ sekarang pasti kebaca (global)


  // ===================== AUTO BACKUP =====================
  await backupDatabase("startup");
  setInterval(() => backupDatabase("scheduled"), BACKUP_EVERY_MIN * 60 * 1000);
  startOwnerDmBackupSchedule(c);

  startReminderLoop(c); // ✅ reminder loop jalan

  // ===================== MUSIC CONTROL CENTER (REAL-TIME) =====================
  if (MUSIC_BOT_ROLE_ID && MUSIC_CONTROL_CHANNEL_ID) {
    // update sekali saat ready
    queueMusicControlCenterUpdate(c.guilds.cache.first() || null);
    // update semua guild yang bot join (biar aman multi server)
    for (const g of c.guilds.cache.values()) queueMusicControlCenterUpdate(g, 1200);
  }

  if (!process.env.BOT_OWNER_ID || process.env.BOT_OWNER_ID === "ISI_USERID_KAMU") {
    console.warn("[WARN] BOT_OWNER_ID belum diisi bener. Owner-only lock bakal ngaco.");
  }

  const statuses = [
    "🌙 menjaga gerbang realm",
    "🔮 membisikkan mantra penyambutan",
    "🕯️ menjaga cahaya di Aula Academy Mystral",
    "✨ panggil aku dengan mantra /halo",
  ];
  let i = 0;
  const setStatus = () => {
    const text = statuses[i % statuses.length];
    c.user.setPresence({
      status: "online",
      activities: [{ name: text, type: ActivityType.Playing }],
    });
    i++;
  };

  setStatus();
  setInterval(setStatus, 30_000);

  // initial stats update
  c.guilds.cache.forEach((g) => updateStatsChannels(g));
  updateLiveLeaderboards(c);

  // Print aesthetic Ready box!
  const guildsCount = c.guilds.cache.size;
  let totalMembers = 0;
  c.guilds.cache.forEach(g => { totalMembers += g.memberCount; });
  const latency = c.ws.ping;

  let dbSizeFormatted = "0 B";
  try {
    if (fs.existsSync(SQLITE_PATH)) {
      const stats = fs.statSync(SQLITE_PATH);
      const bytes = stats.size;
      if (bytes < 1024) dbSizeFormatted = `${bytes} B`;
      else if (bytes < 1048576) dbSizeFormatted = `${(bytes / 1024).toFixed(1)} KB`;
      else dbSizeFormatted = `${(bytes / 1048576).toFixed(1)} MB`;
    }
  } catch { }

  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  console.log("┌────────────────────────────────────────────────────────┐");
  console.log(`│         ✨ MYSTRAL ASSISTANT IS NOW ONLINE! ✨         │`);
  console.log("├────────────────────────────────────────────────────────┤");
  console.log(`│ 👤 Client:     ${(c.user.tag + " (" + c.user.id + ")").padEnd(40)} │`);
  console.log(`│ 🌐 Servers:    ${(`${guildsCount} Guild(s) | ${totalMembers} Users`).padEnd(40)} │`);
  console.log(`│ 📶 Latency:    ${(`${latency} ms`).padEnd(40)} │`);
  console.log(`│ 📁 DB Size:    ${(`${dbSizeFormatted} (${DB_ENGINE})`).padEnd(40)} │`);
  console.log(`│ 📅 Started At: ${(wib + " WIB").padEnd(40)} │`);
  console.log("└────────────────────────────────────────────────────────┘");

  // interval update
  setInterval(() => {
    c.guilds.cache.forEach((g) => updateStatsChannels(g));
  }, (Number(process.env.STATS_UPDATE_MIN) || 5) * 60 * 1000);

  // live leaderboard auto-update loop
  setInterval(() => {
    updateLiveLeaderboards(c);
  }, 5 * 60 * 1000);
});

// ===================== REMINDER LOOP =====================
async function startReminderLoop(client) {
  setInterval(async () => {
    try {
      const now = Date.now();
      const due = await safeAll(
        `SELECT * FROM reminders
         WHERE is_done = 0 AND due_at <= ?
         ORDER BY due_at ASC
         LIMIT 10`,
        [now]
      );

      for (const r of due) {
        const ch = await client.channels.fetch(r.channel_id).catch(() => null);
        if (ch) {
          const when = `<t:${Math.floor(r.due_at / 1000)}:R>`;
          // NOTE: di DB schema kamu kolomnya "message"
          await ch.send(`⏰ <@${r.user_id}> reminder (${when}): **${r.message}**`);
        }
        await safeRun("UPDATE reminders SET is_done = 1 WHERE id = ?", [r.id]);
      }
    } catch (e) {
      console.error("[reminderLoop]", e);
    }
  }, 10_000);
}

// ===================== GIVEAWAY HELPERS =====================
function giveawayRow(giveawayId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`gw:join:${giveawayId}`)
      .setLabel("Join")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🎉"),
    new ButtonBuilder()
      .setCustomId(`gw:leave:${giveawayId}`)
      .setLabel("Leave")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🚪")
  );
}

function giveawayEmbed({ prize, winners, hostId, endAt, entries, ended }) {
  return new EmbedBuilder()
    .setTitle(ended ? "🎁 Giveaway Ended" : "🎁 Giveaway")
    .setColor(ended ? 0x9ca3af : EMBED_COLOR)
    .setDescription(
      [
        `## ${prize}`,
        "",
        `**Ends** <t:${Math.floor(endAt / 1000)}:R>`,
        `**Hosted by** <@${hostId}>`,
        "",
        `**Winners** \`${winners}\`  •  **Entries** \`${entries}\``,
        "",
        ended ? "This giveaway has ended." : "Press **Join** to enter the giveaway.",
      ].join("\n")
    )
    .setFooter({ text: "Mystral Academy • Giveaway" })
    .setTimestamp();
}

async function finalizeGiveaway(g, guild) {
  const ch = await getTextChannelOrNull(guild, g.channel_id);
  if (!ch) {
    await endGiveaway(g.id);
    return { entries: 0, winnersArr: [], channel: null };
  }

  const entries = await countGiveawayEntries(g.id);
  const winnersArr = entries > 0 ? await pickGiveawayWinners(g.id, g.winners) : [];
  await endGiveaway(g.id);

  if (g.message_id) {
    const msg = await ch.messages.fetch(g.message_id).catch(() => null);
    if (msg) {
      const endedEmb = giveawayEmbed({
        prize: g.prize,
        winners: g.winners,
        hostId: g.host_id,
        endAt: g.end_at,
        entries,
        ended: true,
      });
      await msg.edit({ embeds: [endedEmb], components: [] }).catch(() => { });
    }
  }

  const winnerText = winnersArr.length
    ? winnersArr.map((id) => `<@${id}>`).join(", ")
    : "Belum ada peserta yang valid.";

  const resultEmbed = new EmbedBuilder()
    .setTitle("🎉 Giveaway Result")
    .setColor(0xf59e0b)
    .setDescription(
      [
        `## ${g.prize}`,
        "",
        `**Winners** ${winnerText}`,
        `**Total entries** \`${entries}\``,
      ].join("\n")
    )
    .setFooter({ text: "Mystral Academy • Giveaway" })
    .setTimestamp();

  await ch.send({
    content: winnersArr.length ? `Congratulations ${winnerText}!` : "",
    embeds: [resultEmbed],
  });

  return { entries, winnersArr, channel: ch };
}

// ===================== GIVEAWAY LOOP (OPTIMIZED) =====================
function startGiveawayLoop(client) {
  setInterval(async () => {
    try {
      const now = Date.now();

      const due = await safeAll(
        `SELECT * FROM giveaways WHERE is_ended=0 AND end_at <= ? ORDER BY end_at ASC LIMIT 5`,
        [now]
      );

      for (const g of due) {
        const guild = client.guilds.cache.get(g.guild_id);
        if (!guild) {
          await endGiveaway(g.id);
          continue;
        }

        await finalizeGiveaway(g, guild);
      }
    } catch (e) {
      console.error("[giveawayLoop Error]", e);
    }
  }, 15_000);
}

// ===================== TEBAK ANGKA =====================
const guessNumberGames = new Map();

function guessGameKey(guildId, channelId) {
  return `${guildId}:${channelId}`;
}

function startGuessNumberGame(guildId, channelId, starterId) {
  const key = guessGameKey(guildId, channelId);
  const game = {
    answer: Math.floor(Math.random() * 1000) + 1,
    attempts: new Map(),
    hintsUsed: 0,
    starterId,
    startedAt: Date.now(),
  };
  guessNumberGames.set(key, game);
  return game;
}

function getGuessNumberGame(guildId, channelId) {
  return guessNumberGames.get(guessGameKey(guildId, channelId));
}

function stopGuessNumberGame(guildId, channelId) {
  return guessNumberGames.delete(guessGameKey(guildId, channelId));
}

function guessStartText() {
  return [
    "🎲 **tebak angka dimulai!**",
    "aku sudah memilih angka rahasia dari **1-1000**.",
    "tebak sampai benar.",
  ].join("\n");
}

function guessHintText(game) {
  const n = game.answer;
  game.hintsUsed++;

  const hints = [
    () => `🔮 hint: angkanya ${n > 500 ? "lebih dari" : "kurang dari atau sama dengan"} 500.`,
    () => `🔮 hint: angkanya ${n % 2 === 0 ? "genap" : "ganjil"}.`,
    () => {
      const low = Math.max(1, Math.floor((n - 1) / 100) * 100 + 1);
      const high = Math.min(1000, low + 99);
      return `🔮 hint: angkanya ada di range **${low}-${high}**.`;
    },
    () => `🔮 hint: angkanya ${n > 750 ? "di atas 750" : n > 250 ? "di antara 251-750" : "250 atau kurang"}.`,
  ];

  return hints[(game.hintsUsed - 1) % hints.length]();
}

async function addGuessNumberWin(guildId, userId, attempts) {
  await safeRun(
    `INSERT INTO guess_number_scores (guild_id, user_id, wins, best_attempts, updated_at)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(guild_id, user_id) DO UPDATE SET
       wins=guess_number_scores.wins+1,
       best_attempts=CASE
         WHEN guess_number_scores.best_attempts IS NULL THEN excluded.best_attempts
         WHEN excluded.best_attempts < guess_number_scores.best_attempts THEN excluded.best_attempts
         ELSE guess_number_scores.best_attempts
       END,
       updated_at=excluded.updated_at`,
    [guildId, userId, attempts, Date.now()]
  );
}

async function guessNumberLeaderboardText(guildId) {
  const rows = await safeAll(
    `SELECT user_id, wins, best_attempts
     FROM guess_number_scores
     WHERE guild_id=?
     ORDER BY wins DESC, best_attempts ASC, updated_at ASC
     LIMIT 10`,
    [guildId]
  );

  if (!rows.length) return "🏆 **leaderboard tebak angka**\nBelum ada pemenang.";

  return [
    "🏆 **leaderboard tebak angka**",
    ...rows.map((row, index) => {
      const best = row.best_attempts ? ` • best ${row.best_attempts} percobaan` : "";
      return `${index + 1}. <@${row.user_id}> — **${row.wins} win**${best}`;
    }),
  ].join("\n");
}

async function handleGuessNumberAttempt(message) {
  const game = getGuessNumberGame(message.guild.id, message.channel.id);
  if (!game) return false;

  const raw = message.content.trim();
  if (!/^\d{1,4}$/.test(raw)) return false;

  const guess = Number(raw);
  if (guess < 1 || guess > 1000) return false;

  const attempts = (game.attempts.get(message.author.id) || 0) + 1;
  game.attempts.set(message.author.id, attempts);

  if (guess === game.answer) {
    stopGuessNumberGame(message.guild.id, message.channel.id);
    await addGuessNumberWin(message.guild.id, message.author.id, attempts);
    await message.reply({
      content: `🎉 **${guess} benar!**\n<@${message.author.id}> menang dengan total **${attempts} percobaan**.\n+1 win masuk ke leaderboard.`,
      allowedMentions: { users: [message.author.id], repliedUser: false },
    });
    return true;
  }

  if (guess < game.answer) {
    await message.reply({
      content: `📉 **${guess} terlalu kecil!** coba angka yang lebih besar.`,
      allowedMentions: { repliedUser: false },
    });
    return true;
  }

  await message.reply({
    content: `📈 **${guess} terlalu besar!** coba angka yang lebih kecil.`,
    allowedMentions: { repliedUser: false },
  });
  return true;
}

// ===================== GIVEAWAY REROLL =====================
async function rerollGiveaway(giveawayId, winnersCount) {
  const g = await getGiveaway(giveawayId);
  if (!g) return null;

  const count = Number(winnersCount ?? g.winners ?? 1);
  const winners = await pickGiveawayWinners(giveawayId, count);
  return winners;
}

// ===================== AUTO WELCOME =====================
function resolveChannelMention(guild, envKey, searchKeywords, fallbackLabel) {
  const envId = requireEnv(envKey);
  if (envId) {
    const ch = guild.channels.cache.get(envId);
    if (ch) return `<#${ch.id}>`;
  }
  const found = guild.channels.cache.find((c) => {
    if (typeof c.isTextBased !== "function" || !c.isTextBased()) return false;
    const name = String(c.name || "").toLowerCase();
    return searchKeywords.some((k) => name.includes(k.toLowerCase()));
  });
  if (found) return `<#${found.id}>`;
  return `#${fallbackLabel}`;
}

function formatJoinDate(date) {
  try {
    const formatter = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const d = parts.find(p => p.type === "day").value;
    const m = parts.find(p => p.type === "month").value;
    const y = parts.find(p => p.type === "year").value;
    const hr = parts.find(p => p.type === "hour").value;
    const min = parts.find(p => p.type === "minute").value;
    return `${d}/${m}/${y} ${hr}:${min} WIB`;
  } catch {
    return "";
  }
}

client.on(Events.GuildMemberAdd, async (member) => {
  updateStatsChannels(member.guild);

  try {
    const channel = await getTextChannelOrNull(member.guild, requireEnv("WELCOME_CHANNEL_ID") || requireEnv("GENERAL_CHANNEL_ID"));
    if (!channel) return;

    const memberCount = member.guild.memberCount;

    // Resolve channel mentions dynamically
    const rulesMention = resolveChannelMention(member.guild, "RULES_CHANNEL_ID", ["rules", "peraturan"], "rules");
    const selfRoleMention = resolveChannelMention(member.guild, "SELF_ROLE_CHANNEL_ID", ["self-role", "selfrole", "pilih-peran"], "self-role");
    const announceMention = resolveChannelMention(member.guild, "ANNOUNCEMENTS_CHANNEL_ID", ["announcements", "pengumuman"], "announcements");
    const idCardMention = resolveChannelMention(member.guild, "IDCARD_CHANNEL_ID", ["idcard", "id-card", "registrasi"], "idcard");
    const lobbyMention = resolveChannelMention(member.guild, "LOBBY_CHANNEL_ID", ["lobby", "lobby-chat", "berkenalan"], "lobby");

    const welcomeText = [
      `<:profile:1510055150486814853> **A new student has arrived**`,
      ``,
      `╭・📖 **Peraturan** ${rulesMention}`,
      `├・🎭 **Pilih Role** ${selfRoleMention}`,
      `├・📢 **Pengumuman** ${announceMention}`,
      `├・<:pink_cards1:1510057886795956235> **Registrasi** ${idCardMention}`,
      `╰・💬 **Lobby** ${lobbyMention}`,
      ``, `🎓 Kamu adalah pelajar ke-**${memberCount}** di Mystral Academy.`,
      ``,
      `Semoga betah dan selamat menikmati perjalananmu bersama kami!`
    ].join("\n");

    const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
    const buffer = await renderWelcomeCard({
      username: member.displayName,
      avatarUrl,
      memberCount,
      guildName: member.guild.name,
    }).catch((err) => {
      console.error("[Welcome] renderWelcomeCard failed:", err);
      return null;
    });

    const embed = new EmbedBuilder()
      .setColor(0x0f0b1b)
      .setDescription(welcomeText)
      .setFooter({ text: `Bergabung pada ${formatJoinDate(new Date())}` });

    const files = [];
    if (buffer) {
      const attachment = new AttachmentBuilder(buffer, { name: "welcome.png" });
      embed.setImage("attachment://welcome.png");
      files.push(attachment);
    }

    await channel.send({ content: `***Selamat datang, <@${member.id}>!***`, embeds: [embed], files }).catch((e) => {
      console.error("[Welcome] Failed sending welcome message:", e?.message || e);
    });
  } catch (err) {
    console.error("[Welcome] Error handling GuildMemberAdd:", err);
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  updateStatsChannels(member.guild);

  try {
    const channel = await getTextChannelOrNull(member.guild, requireEnv("LEAVE_CHANNEL_ID") || requireEnv("GENERAL_CHANNEL_ID"));
    if (!channel) return;

    const leaveText = [
      `👋 **A Student Has Departed**`,
      `**${member.displayName}** has left Mystral Academy.`,
    ].join("\n");

    const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
    const buffer = await renderLeaveCard({
      username: member.displayName,
      avatarUrl,
      guildName: member.guild.name,
    }).catch((err) => {
      console.error("[Leave] renderLeaveCard failed:", err);
      return null;
    });

    const embed = new EmbedBuilder()
      .setColor(0xff5252) // Red border for leave
      .setDescription(leaveText)
      .setFooter({ text: `${formatJoinDate(new Date())}` });

    const files = [];
    if (buffer) {
      const attachment = new AttachmentBuilder(buffer, { name: "leave.png" });
      embed.setImage("attachment://leave.png");
      files.push(attachment);
    }

    await channel.send({ embeds: [embed], files }).catch((e) => {
      console.error("[Leave] Failed sending leave message:", e?.message || e);
    });
  } catch (err) {
    console.error("[Leave] Error handling GuildMemberRemove:", err);
  }
});

// ===================== PREFIX COMMANDS =====================

// ===================== MUSIC CONTROL CENTER REAL-TIME UPDATE =====================
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  // 1. Music Bot Control Center Update
  try {
    if (MUSIC_BOT_ROLE_ID && MUSIC_CONTROL_CHANNEL_ID) {
      const guild = newState?.guild;
      const member = newState?.member;
      if (guild && member && member.roles?.cache?.has?.(MUSIC_BOT_ROLE_ID)) {
        if (oldState?.channelId !== newState?.channelId) {
          queueMusicControlCenterUpdate(guild, 600);
        }
      }
    }
  } catch { }

  // 2. Voice Activity Logger
  try {
    const guild = newState.guild || oldState.guild;
    const targetGuildId = process.env.GUILD_ID;
    if (targetGuildId && guild && guild.id !== targetGuildId) {
      return;
    }

    const userId = newState.id || oldState.id;
    const member = newState.member || oldState.member;
    if (member && !member.user.bot) {
      const oldCh = oldState.channel;
      const newCh = newState.channel;
      const afkChId = newState.guild?.afkChannelId;

      const isOldValid = oldCh && oldCh.id !== afkChId;
      const isNewValid = newCh && newCh.id !== afkChId;

      const now = Date.now();

      // Case 1: Left VC or moved to AFK channel
      if (isOldValid && !isNewValid) {
        const joinTime = voiceSessions.get(userId);
        if (joinTime) {
          const elapsedMs = now - joinTime;
          const elapsedSec = Math.floor(elapsedMs / 1000);
          if (elapsedSec > 0) {
            await saveVoiceActivity(userId, elapsedSec);
          }
          voiceSessions.delete(userId);
        }
      }
      // Case 2: Joined VC or moved from AFK channel
      else if (!isOldValid && isNewValid) {
        voiceSessions.set(userId, now);
      }
      // Case 3: Switched between two valid VCs
      else if (isOldValid && isNewValid && oldCh.id !== newCh.id) {
        const joinTime = voiceSessions.get(userId);
        if (joinTime) {
          const elapsedMs = now - joinTime;
          const elapsedSec = Math.floor(elapsedMs / 1000);
          if (elapsedSec > 0) {
            await saveVoiceActivity(userId, elapsedSec);
          }
        }
        voiceSessions.set(userId, now);
      }
    }
  } catch (err) {
    console.error("[VOICE] Error in VoiceStateUpdate tracking:", err);
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild) return;
    if (message.author.bot) return;

    // ✅ ACTIVITY LOGGER (taruh di sini)
    const now = Date.now();
    const wib = new Date(now + 7 * 60 * 60 * 1000);
    const day = wib.toISOString().slice(0, 10); // YYYY-MM-DD (WIB)

    // AFK auto clear on any message
    const wasAfk = await getAfk(message.author.id);
    if (wasAfk) {
      await clearAfk(message.author.id);

      // balikin nickname (hapus prefix [AFK])
      const member = await message.guild.members.fetch(message.author.id).catch(() => null);
      if (member) {
        const current = member.nickname || message.author.username;
        const restored = stripAfkPrefix(current);
        // kalau restored kosong, reset nickname
        await trySetMemberNick(member, restored || null);
      }

      await message
        .reply({
          content: `✅ welcome back <@${message.author.id}>! status AFK kamu sudah dihapus.`,
          allowedMentions: { repliedUser: false, parse: [] },
        })
        .catch(() => { });
    }
    if (message.content.startsWith("cs")) {
      if (!message.guild || message.author.bot) return;

      const PREFIX = "cs"; // sesuaikan prefix kamu
      if (!message.content.startsWith(PREFIX)) return;

      const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
      const cmd = args.shift()?.toLowerCase();

      // ===================== PREFIX: csticket setup =====================
      if (cmd === "ticket" || cmd === "sticket") {
        const sub = args.shift()?.toLowerCase();

        if (sub !== "setup") {
          return message.reply(
            "Format: `csticket setup #channel [judul]`"
          );
        }

        // permission
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply("❌ Butuh Administrator.");
        }

        const panelCh = message.mentions.channels.first();
        if (!panelCh) {
          return message.reply("❌ Mention channel panel ticket.");
        }

        const title = args.join(" ") || "🎫 Ticket";

        // SIMPAN SETTING
        await upsertTicketSettings(message.guild.id, {
          panel_channel_id: panelCh.id,
          panel_title: title,
        });

        const settings = await getTicketSettings(message.guild.id);
        const { components } = buildTicketPanel(settings);

        await panelCh.send({ components, flags: MessageFlags.IsComponentsV2 });

        return message.reply("✅ Ticket panel berhasil dibuat (prefix).");
      }
    }


    // AFK notice on mentions
    if (message.mentions?.users?.size) {
      const lines = [];
      for (const [uid, user] of message.mentions.users) {
        if (user.bot) continue;
        const afk = await getAfk(uid);
        if (!afk) continue;

        const sinceUnix = Math.floor((Number(afk.since) || Date.now()) / 1000);
        lines.push(`• <@${uid}> sedang **AFK** — ${afk.reason} sejak <t:${sinceUnix}:R>`);
        if (lines.length >= 5) break;
      }
      if (lines.length) {
        await message
          .reply({
            content: `🕯️ **AFK Notice**\n${lines.join("\n")}`,
            allowedMentions: { repliedUser: false, parse: [] },
          })
          .catch(() => { });
      }
    }

    await safeRun(
      `INSERT INTO user_activity (user_id, last_seen, msg_total)
       VALUES (?, ?, 1)
       ON CONFLICT(user_id) DO UPDATE SET
         last_seen=excluded.last_seen,
         msg_total=user_activity.msg_total+1`,
      [message.author.id, now]
    );

    await safeRun(
      `INSERT INTO activity_daily (day, user_id, msg_count)
       VALUES (?, ?, 1)
       ON CONFLICT(day, user_id) DO UPDATE SET
         msg_count=activity_daily.msg_count+1`,
      [day, message.author.id]
    );

    if (await handleGuessNumberAttempt(message)) return;

    // ===================== ANTI-TOXIC =====================
    const toxicRaw =
      process.env.TOXIC_WORDS ||
      "anjing,babi,tolol,goblok,bangsat,ngentot,memek,kontol,jilmek,desah,pepek,kampang,memew,mmk,kntl,gblk,bengak,buyan,lolo,gelat";
    const toxicWords = toxicRaw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const toxicAction = (process.env.TOXIC_ACTION || "delete").toLowerCase(); // delete|warn|timeout
    const toxicTimeoutMin = Number(process.env.TOXIC_TIMEOUT_MIN || 10);

    const contentLow = String(message.content || "").toLowerCase();
    const hit = toxicWords.find((w) => w && contentLow.includes(w));

    if (hit) {
      // delete message if possible
      if (toxicAction === "delete" || toxicAction === "warn" || toxicAction === "timeout") {
        await message.delete().catch(() => { });
      }

      const embed = new EmbedBuilder()
        .setTitle("🛡️ Toxic Filter Triggered")
        .setColor(0xef4444)
        .setDescription(
          [
            `**User:** <@${message.author.id}> (${message.author.tag})`,
            `**Word:** \`${hit}\``,
            `**Channel:** <#${message.channelId}>`,
            "",
            `**Content (cut):** ${safeText(message.content, 180)}`,
          ].join("\n")
        )
        .setTimestamp();

      const logId = requireEnv("TOXIC_LOG_CHANNEL_ID");
      if (logId) {
        const logCh = await getTextChannelOrNull(message.guild, logId);
        if (logCh) await logCh.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => { });
      }

      // optional action: warn/timeout (kalau mau dipakai)
      if (toxicAction === "timeout") {
        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
        if (member?.moderatable) {
          await member.timeout(toxicTimeoutMin * 60 * 1000, `Toxic word: ${hit}`).catch(() => { });
        }
      } // ===================== AUTO WARN LOGIC (DM + REPLY) =====================
      if (toxicAction === "warn") {
        const reason = `Automated Warn: Penggunaan kata terlarang (${hit})`;

        // 1. Catat ke Database
        await addWarning(message.guild.id, message.author.id, client.user.id, reason);

        const fields = [
          { name: "👤 Student", value: `<@${message.author.id}>`, inline: true },
          { name: "🛡️ Moderator", value: `<@${client.user.id}> (Auto System)`, inline: true },
          { name: "📜 Alasan", value: `\`${reason}\`` }
        ];

        // 2. Kirim Log & Dapatkan Embed
        const emb = await logMod(message.guild, "AUTOMATED DISCIPLINARY NOTICE", 0xff5252, fields, message.author);

        // 3. Kirim DM ke Pengguna
        try {
          await message.author.send({
            content: `⚠️ **Peringatan Resmi dari Mystral Academy**`,
            embeds: [
              new EmbedBuilder()
                .setTitle("SURAT PERINGATAN SISTEM")
                .setColor(0xff5252)
                .setThumbnail(message.guild.iconURL())
                .setDescription(`Halo <@${message.author.id}>, kamu menerima peringatan otomatis di server **${message.guild.name}**.`)
                .addFields({ name: "Pesan yang Dilanggar", value: `\`${safeText(message.content, 120)}\`` })
                .setFooter({ text: "Harap gunakan bahasa yang sopan agar tidak terkena sanksi lebih lanjut." })
                .setTimestamp()
            ]
          });
        } catch (e) {
          console.log(`[DM FAIL] Gagal mengirim DM ke ${message.author.tag}.`);
        }

        // 4. Kirim Reply di Channel (Hapus otomatis dalam 5 detik)
        const warnReply = await message.channel.send({
          content: `🛑 <@${message.author.id}>, pesan kamu telah dihapus dan peringatan otomatis telah dicatat karena menggunakan bahasa tidak pantas.`
        }).catch(() => null);

        if (warnReply) setTimeout(() => warnReply.delete().catch(() => { }), 15000);
      }
    }

    // Prefix check
    if (!message.content.startsWith(PREFIX)) return;

    // Cukup deklarasikan variabel ini SATU KALI di sini
    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = args.shift()?.toLowerCase();
    const command = cmd; // alias biar blok bawah yang pakai "command" tetap jalan
    const isMod = message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers);

    // ===================== CHANNEL RESTRICTION (PREFIX) =====================
    // 1. Tarot commands (ctarot, ctarotprofile, ctarotlb, ctarotcollection) -> 1516259143994839050
    const tarotCmds = ["tarot", "tarotprofile", "tarotlb", "tarotcollection"];
    if (tarotCmds.includes(cmd)) {
      const targetCh = "1516259143994839050";
      if (message.channel.id !== targetCh) {
        const warnMsg = await message.reply({
          content: `❌ **Tarot** (\`${PREFIX}${cmd}\`) hanya dapat digunakan di channel <#${targetCh}>!`
        }).catch(() => null);

        setTimeout(async () => {
          await message.delete().catch(() => { });
          if (warnMsg) await warnMsg.delete().catch(() => { });
        }, 8000);
        return;
      }
    }

    // 2. AFK commands (cafk) -> 1466628064002707518
    if (cmd === "afk") {
      const targetCh = "1466628064002707518";
      if (message.channel.id !== targetCh) {
        const warnMsg = await message.reply({
          content: `❌ **AFK** (\`${PREFIX}${cmd}\`) hanya dapat digunakan di channel <#${targetCh}>!`
        }).catch(() => null);

        setTimeout(async () => {
          await message.delete().catch(() => { });
          if (warnMsg) await warnMsg.delete().catch(() => { });
        }, 8000);
        return;
      }
    }

    if (cmd === "welcometest") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("❌ Hanya Administrator yang dapat menggunakan perintah test ini.");
      }

      const member = message.member;
      const channel = message.channel;
      const memberCount = message.guild.memberCount;

      const rulesMention = resolveChannelMention(message.guild, "RULES_CHANNEL_ID", ["rules", "peraturan"], "rules");
      const selfRoleMention = resolveChannelMention(message.guild, "SELF_ROLE_CHANNEL_ID", ["self-role", "selfrole", "pilih-peran"], "self-role");
      const announceMention = resolveChannelMention(message.guild, "ANNOUNCEMENTS_CHANNEL_ID", ["announcements", "pengumuman"], "announcements");
      const idCardMention = resolveChannelMention(message.guild, "IDCARD_CHANNEL_ID", ["idcard", "id-card", "registrasi"], "idcard");
      const lobbyMention = resolveChannelMention(message.guild, "LOBBY_CHANNEL_ID", ["lobby", "lobby-chat", "berkenalan"], "lobby");

      const welcomeText = [
        `<:profile:1510055150486814853> **A new student has arrived**`,
        ``,
        `Gerbang Mystral Academy telah terbuka untukmu. Kamu adalah pelajar ke-**${memberCount}** yang bergabung bersama kami.`,
        ``,
        `🗺️ **Langkah Pertama**`,
        `📜 Baca peraturan server • ${rulesMention}`,
        `🎭 Tentukan Identitasmu • ${selfRoleMention}`,
        `📢 Pantau informasi terbaru • ${announceMention}`,
        `📝 Selesaikan Registrasi • ${idCardMention}`,
        `💬 Bergabung di Lobby • ${lobbyMention}`,
      ].join("\n");

      const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
      const buffer = await renderWelcomeCard({
        username: member.displayName,
        avatarUrl,
        memberCount,
        guildName: message.guild.name,
      }).catch((err) => {
        console.error("[Welcome Test] renderWelcomeCard failed:", err);
        return null;
      });

      const embed = new EmbedBuilder()
        .setColor(0x0f0b1b)
        .setDescription(welcomeText)
        .setFooter({ text: `Bergabung pada ${formatJoinDate(new Date())}` });

      const files = [];
      if (buffer) {
        const attachment = new AttachmentBuilder(buffer, { name: "welcome.png" });
        embed.setImage("attachment://welcome.png");
        files.push(attachment);
      }

      return channel.send({ content: `***Selamat datang, <@${member.id}>!***`, embeds: [embed], files }).catch((e) => {
        console.error("[Welcome Test] Failed sending welcome test message:", e?.message || e);
      });
    }

    if (cmd === "leavetest") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("❌ Hanya Administrator yang dapat menggunakan perintah test ini.");
      }

      const member = message.member;
      const channel = message.channel;

      const leaveText = [
        `👋 **A Student Has Departed (LEAVE TEST)**`,
        `**${member.displayName}** has left Mystral Academy.`,
      ].join("\n");

      const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
      const buffer = await renderLeaveCard({
        username: member.displayName,
        avatarUrl,
        guildName: message.guild.name,
      }).catch((err) => {
        console.error("[Leave Test] renderLeaveCard failed:", err);
        return null;
      });

      const embed = new EmbedBuilder()
        .setColor(0xff5252)
        .setDescription(leaveText)
        .setFooter({ text: `${formatJoinDate(new Date())}` });

      const files = [];
      if (buffer) {
        const attachment = new AttachmentBuilder(buffer, { name: "leave.png" });
        embed.setImage("attachment://leave.png");
        files.push(attachment);
      }

      return channel.send({ embeds: [embed], files }).catch((e) => {
        console.error("[Leave Test] Failed sending leave test message:", e?.message || e);
      });
    }

    if (cmd === "ta" || cmd === "tebakangka") {
      startGuessNumberGame(message.guild.id, message.channel.id, message.author.id);
      return message.reply({ content: guessStartText(), allowedMentions: { repliedUser: false } });
    }

    if (cmd === "hint") {
      const game = getGuessNumberGame(message.guild.id, message.channel.id);
      if (!game) return message.reply("Belum ada game tebak angka di channel ini. Mulai dengan `cta` atau `/tebakangka`.");
      return message.reply({ content: guessHintText(game), allowedMentions: { repliedUser: false } });
    }

    if (cmd === "stopgame") {
      const canStop =
        hasPerm(message.member, PermissionsBitField.Flags.ManageMessages) ||
        getGuessNumberGame(message.guild.id, message.channel.id)?.starterId === message.author.id;
      if (!canStop) return message.reply("Kamu hanya bisa stop game yang kamu mulai, atau butuh izin `Manage Messages`.");
      const stopped = stopGuessNumberGame(message.guild.id, message.channel.id);
      return message.reply(stopped ? "🛑 Game tebak angka dihentikan." : "Tidak ada game tebak angka yang sedang berjalan di channel ini.");
    }

    if ((cmd === "lb" && (args[0] || "").toLowerCase() === "angka") || (cmd === "leaderboard" && (args[0] || "").toLowerCase() === "tebakangka")) {
      return message.reply({
        content: await guessNumberLeaderboardText(message.guild.id),
        allowedMentions: { parse: [] },
      });
    }

    if (cmd === "ban") {
      if (!hasPerm(message.member, PermissionsBitField.Flags.BanMembers)) {
        return message.reply("❌ Kamu tidak punya izin `Ban Members`.");
      }
      if (!message.guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply("❌ Bot belum punya izin `Ban Members`.");
      }

      const targetUser =
        message.mentions.users.first() ||
        (args[0] && /^\d{15,25}$/.test(args[0])
          ? await message.client.users.fetch(args[0]).catch(() => null)
          : null);
      if (!targetUser) return message.reply("Format: `cban @user [alasan]` atau `cban USER_ID [alasan]`");

      const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
      if (targetMember && !targetMember.bannable) {
        return message.reply("❌ Saya tidak bisa ban user ini (role lebih tinggi/owner/permission bot kurang).");
      }

      const reason = args.slice(1).join(" ") || "Ban";
      try {
        await message.guild.members.ban(targetUser.id, { reason });
        return message.reply(`🔨 <@${targetUser.id}> berhasil di-ban. Reason: ${reason}`);
      } catch (e) {
        console.error("[PREFIX BAN FAIL]", e?.message || e);
        return message.reply("❌ Gagal ban user. Cek role bot dan permission.");
      }
    }

    if (cmd === "unban") {
      if (!hasPerm(message.member, PermissionsBitField.Flags.BanMembers)) {
        return message.reply("❌ Kamu tidak punya izin `Ban Members`.");
      }
      const userId = args[0];
      if (!userId || !/^\d{15,25}$/.test(userId)) return message.reply("Format: `cunban USER_ID [alasan]`");
      const reason = args.slice(1).join(" ") || "Unban";
      try {
        await message.guild.members.unban(userId, reason);
        return message.reply(`✅ Unbanned \`${userId}\`. Reason: ${reason}`);
      } catch (e) {
        console.error("[PREFIX UNBAN FAIL]", e?.message || e);
        return message.reply("❌ Gagal unban user. Pastikan User ID benar dan user memang sedang di-ban.");
      }
    }

    // ===================== KALKULATOR (SIMPLE) =====================
    if (command === "calc") {
      const expr = args.join("\n");
      const result = calcSafe(expr); // Gunakan calcSafe
      return message.reply(result !== null ? `🧮 Hasil: **${result}**` : "❌ Ekspresi salah.");
    }

    // ===================== MODERASI (SIMPLE) =====================
    if (isMod) {
      const target =
        message.mentions.members.first() || (await message.guild.members.fetch(args[0]).catch(() => null));
      const reason = args.slice(2).join(" ") || "Tanpa alasan";

      // Ganti baris logMod di dalam warn
      if (command === "warn") {
        if (!(await needPerm(PermissionsBitField.Flags.ModerateMembers))) return;
        const target = await pickTargetFromArgs();
        if (!target) return message.reply("Format: `cwarn @user alasan...`");
        const reason = args.slice(1).join(" ") || "No reason";

        await addWarning(message.guild.id, target.id, message.author.id, reason);

        const fields = [
          { name: "👤 Student", value: `<@${target.id}>`, inline: true },
          { name: "🛡️ Moderator", value: `<@${message.author.id}>`, inline: true },
          { name: "📜 Alasan", value: `\`${reason}\`` }
        ];

        const emb = await logMod(message.guild, "DISCIPLINARY NOTICE", 0xff5252, fields, target.user);

        // Kirim DM
        try {
          await target.send({
            content: `⚠️ **Peringatan Resmi dari Mystral Academy**`,
            embeds: [emb] // Pakai embed yang sama dengan log agar simpel
          });
        } catch (e) { }

        return message.reply({ embeds: [emb], allowedMentions: { parse: ["users"] } });
      }

      if (command === "timeout" || command === "mute") {
        const duration = parseInt(args[1]);
        if (!target || isNaN(duration)) return message.reply("Format: `ctimeout @user 10 alasan` (menit)");
        await target.timeout(duration * 60 * 1000, reason);
        message.reply(`🔇 **${target.user.tag}** di-timeout selama ${duration} menit.`);
      }

      if (command === "kick") {
        if (!target) return message.reply("Siapa yang mau di-kick?");
        await target.kick(reason);
        message.reply(`👢 **${target.user.tag}** berhasil di-kick.`);
      }

      if (command === "ban") {
        if (!target) return message.reply("Siapa yang mau di-ban?");
        await target.ban({ reason });
        message.reply(`🔨 **${target.user.tag}** telah diblokir permanen.`);
      }

      if (command === "unmute" || command === "untimeout") {
        if (!target) return message.reply("Siapa yang mau di-unmute?");
        await target.timeout(null);
        message.reply(`🔊 Timeout dihapus untuk **${target.user.tag}**.`);
      }
    }

    // OWNER ONLY prefix commands (panel/idcard)
    const ownerOnly = ["menfesspanel", "sortingpanel", "idcard"];
    if (ownerOnly.includes(cmd) && !isBotOwner(message.author.id)) {
      return message.reply({
        content: "❌ command ini cuma buat pembuat bot.",
        allowedMentions: { repliedUser: false },
      });
    }

    // ===================== MODERATION (PREFIX) =====================
    const modMember = await message.guild.members.fetch(message.author.id).catch(() => null);

    async function needPerm(perm) {
      if (
        !hasPerm(modMember, perm) &&
        !hasPerm(modMember, PermissionsBitField.Flags.Administrator)
      ) {
        await message
          .reply({
            content: "❌ Kamu tidak punya izin untuk command ini.",
            allowedMentions: { repliedUser: false },
          })
          .catch(() => { });
        return false;
      }
      return true;
    }

    function pickTargetFromArgs() {
      const mentioned = message.mentions.members.first();
      if (mentioned) return mentioned;
      const id = args[0];
      if (id && /^\d{15,25}$/.test(id)) return message.guild.members.fetch(id).catch(() => null);
      return null;
    }
    // ===================== WARN (FIXED) =====================
    if (cmd === "warn") {
      const modMember = await message.guild.members.fetch(message.author.id).catch(() => null);
      if (!hasPerm(modMember, PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply("❌ Kamu tidak punya izin `Moderate Members`.");
      }

      const targetMember = message.mentions.members.first() || (args[0] && await message.guild.members.fetch(args[0]).catch(() => null));
      if (!targetMember) return message.reply("Format: `cwarn @user [alasan]`");

      const reason = args.slice(1).join(" ") || "Tidak ada alasan spesifik.";

      // Simpan ke DB
      await addWarning(message.guild.id, targetMember.id, message.author.id, reason);

      const fields = [
        { name: "👤 Student", value: `<@${targetMember.id}>`, inline: true },
        { name: "🛡️ Moderator", value: `<@${message.author.id}>`, inline: true },
        { name: "📜 Alasan", value: `\`${reason}\`` }
      ];

      // Kirim Log & Tampilkan
      const emb = await logMod(message.guild, "DISCIPLINARY NOTICE", 0xff5252, fields, targetMember.user);

      // Kirim DM
      try {
        await targetMember.send({
          content: `⚠️ **Peringatan Resmi dari Mystral Academy**`,
          embeds: [emb]
        });
      } catch (e) {
        console.log("Gagal kirim DM (User tutup DM)");
      }

      return message.reply({ embeds: [emb], allowedMentions: { parse: [] } });
    }

    if (cmd === "clearwarn") {
      if (!(await needPerm(PermissionsBitField.Flags.ModerateMembers))) return;
      const target = await pickTargetFromArgs();
      if (!target) return message.reply("Format: `cclearwarn @user`");
      const n = await clearWarnings(message.guild.id, target.id);
      return message.reply(`🧹 Cleared **${n}** warnings untuk <@${target.id}>.`);
    }

    if (cmd === "timeout") {
      if (!(await needPerm(PermissionsBitField.Flags.ModerateMembers))) return;
      const target = await pickTargetFromArgs();
      if (!target) return message.reply("Format: `ctimeout @user 10 alasan...`");
      const minutes = Number(args[1] || 10);
      const reason = args.slice(2).join(" ") || "Timeout";
      await applyTimeout(target, minutes, reason);

      const emb = new EmbedBuilder()
        .setTitle("⏳ Timeout")
        .setColor(0x03a9f4)
        .setDescription(
          [
            `**User:** <@${target.id}>`,
            `**Minutes:** ${minutes}`,
            `**By:** <@${message.author.id}>`,
            `**Reason:** ${reason}`,
          ].join("\n")
        )
        .setTimestamp();

      await sendModLog(message.guild, emb);
      return message.reply({ embeds: [emb], allowedMentions: { parse: ["users"] } });
    }

    if (cmd === "untimeout") {
      if (!(await needPerm(PermissionsBitField.Flags.ModerateMembers))) return;
      const target = await pickTargetFromArgs();
      if (!target) return message.reply("Format: `cuntimeout @user alasan...`");
      const reason = args.slice(1).join(" ") || "Untimeout";
      await removeTimeout(target, reason);
      return message.reply(`✅ Timeout dihapus untuk <@${target.id}>.`);
    }

    if (cmd === "mute") {
      if (!(await needPerm(PermissionsBitField.Flags.ModerateMembers))) return;
      const target = await pickTargetFromArgs();
      if (!target) return message.reply("Format: `cmute @user 10 alasan...`");
      const minutes = Number(args[1] || 10);
      const reason = args.slice(2).join(" ") || "Mute";
      const mode = await applyMute(target, minutes, reason);
      return message.reply(`🔇 <@${target.id}> dimute via **${mode.mode}** selama **${minutes} menit**.`);
    }

    if (cmd === "unmute") {
      if (!(await needPerm(PermissionsBitField.Flags.ModerateMembers))) return;
      const target = await pickTargetFromArgs();
      if (!target) return message.reply("Format: `cunmute @user alasan...`");
      const reason = args.slice(1).join(" ") || "Unmute";
      const mode = await removeMute(target, reason);
      return message.reply(`🔊 <@${target.id}> unmute via **${mode.mode}**.`);
    }

    if (cmd === "kick") {
      if (!(await needPerm(PermissionsBitField.Flags.KickMembers))) return;
      const target = await pickTargetFromArgs();
      if (!target) return message.reply("Format: `ckick @user alasan...`");
      const reason = args.slice(1).join(" ") || "Kick";
      await target.kick(reason).catch(() => null);
      return message.reply(`👢 <@${target.id}> kicked. Reason: ${reason}`);
    }

    if (cmd === "ban") {
      if (!(await needPerm(PermissionsBitField.Flags.BanMembers))) return;
      const targetUser =
        message.mentions.users.first() ||
        (args[0] && /^\d{15,25}$/.test(args[0])
          ? await message.client.users.fetch(args[0]).catch(() => null)
          : null);
      if (!targetUser) return message.reply("Format: `cban @user alasan...`");
      const reason = args.slice(1).join(" ") || "Ban";
      await message.guild.members.ban(targetUser.id, { reason }).catch(() => null);
      return message.reply(`🔨 <@${targetUser.id}> banned. Reason: ${reason}`);
    }

    if (cmd === "unban") {
      if (!(await needPerm(PermissionsBitField.Flags.BanMembers))) return;
      const userId = args[0];
      if (!userId || !/^\d{15,25}$/.test(userId)) return message.reply("Format: `cunban USER_ID alasan...`");
      const reason = args.slice(1).join(" ") || "Unban";
      await message.guild.members.unban(userId, reason).catch(() => null);
      return message.reply(`✅ Unbanned \`${userId}\`. Reason: ${reason}`);
    }

    // ===================== CALC (PREFIX) =====================
    if (cmd === "calc" || cmd === "calculator" || cmd === "alcu" || cmd === "kalku" || cmd === "alculator") {
      const expr = args.join(" ");
      const out = calcSafe(expr);
      if (out === null) return message.reply("❌ Ekspresi tidak valid. Contoh: `ccalc (10+2)*3/4`");
      return message.reply(`🧮 \`${expr}\` = **${out}**`);
    }

    // ===================== PREFIX: REROLL GIVEAWAY =====================
    if (cmd === "gwreroll" || cmd === "cgreroll") {
      if (!isBotOwner(message.author.id) && !hasPerm(message.member, PermissionsBitField.Flags.ManageGuild)) {
        return message.reply("❌ Tidak punya izin.");
      }

      const gid = Number(args[0]);
      const winnersOpt = args[1] ? Number(args[1]) : null;

      if (!gid) return message.reply("Format: `cgwreroll <giveawayId> [jumlah]`");

      const g = await getGiveaway(gid);
      if (!g) return message.reply("❌ Giveaway tidak ditemukan.");
      if (!g.is_ended) return message.reply("⚠️ Giveaway belum berakhir.");

      const winners = await rerollGiveaway(gid, winnersOpt);
      if (!winners || !winners.length) {
        return message.reply("⚠️ Tidak ada peserta untuk direroll.");
      }

      const text = winners.map(id => `✨ <@${id}>`).join("\n");

      return message.channel.send(
        `✨ **GIVEAWAY REROLL** ✨

🎁 **Prize :** ${g.prize}
🌟 **Winners :${winners.length > 1 ? "s" : ""}** ${text}

Enjoy your reward ✨`
      );
    }

    // ===================== TICKET CUSTOM (PREFIX) =====================
    // format: cticket type|subject|detail  (type: complaint/report/custom)
    if (cmd === "ticket") {
      const raw = args.join(" ");
      const parts = raw.split("|").map((s) => s.trim());
      const type = (parts[0] || "custom").toLowerCase();
      const subject = parts[1] || "No subject";
      const detail = parts.slice(2).join("|").trim() || "No detail";

      // reuse logic dari modal ticket kamu (create channel + permission overwrites)
      const categoryId = requireEnv("TICKET_CATEGORY_ID");
      const staffRoleId = requireEnv("TICKET_STAFF_ROLE_ID");
      if (!categoryId || !staffRoleId)
        return message.reply("⚠️ Ticket belum dikonfigurasi (TICKET_CATEGORY_ID / TICKET_STAFF_ROLE_ID).");

      const safeUser =
        message.author.username.toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 12) || "user";
      const chName = `ticket-${type}-${safeUser}`.slice(0, 90);

      const allowedTypes = ["complaint", "report", "donate", "partnership", "verification", "custom"];
      const safeType = allowedTypes.includes(type) ? type : "custom";

      const channel = await message.guild.channels.create({
        name: chName,
        parent: categoryId,
        // simpan type asli (biar donate/partner/verify kebaca bener)
        topic: ticketMeta(safeType, message.author.id),
        permissionOverwrites: [
          { id: message.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          {
            id: message.author.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks,
            ],
          },
          {
            id: staffRoleId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageMessages,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks,
            ],
          },
        ],
      });

      await safeRun(
        `INSERT INTO tickets_custom (guild_id, channel_id, owner_id, type, subject, created_at)
         VALUES (?,?,?,?,?,?)`,
        [message.guild.id, channel.id, message.author.id, type, safeText(subject, 80), Date.now()]
      );

      const mainEmbed = new EmbedBuilder()
        .setTitle(`🎫 TICKET ${type.toUpperCase()}`)
        .setColor(type === "report" ? 0xff5252 : EMBED_COLOR)
        .setDescription(
          [`👤 **Pengirim:** <@${message.author.id}>`, `📌 **Judul:** ${subject}`, "", "📝 **Detail:**", detail].join("\n")
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket:claim").setLabel("Claim").setStyle(ButtonStyle.Primary).setEmoji("🧠"),
        new ButtonBuilder().setCustomId("ticket:close").setLabel("Close").setStyle(ButtonStyle.Secondary).setEmoji("🔒")
      );

      await channel.send({
        content: `<@&${staffRoleId}>`,
        embeds: [mainEmbed],
        components: [row],
        allowedMentions: { roles: [staffRoleId] },
      });

      // ===================== LOG TICKET: OPENED (ADD-ONLY) =====================
      (async () => {
        const emb = new EmbedBuilder()
          .setTitle("🎫 Ticket Dibuka")
          .setColor(EMBED_COLOR)
          .setDescription(
            [
              `📌 **Channel:** <#${channel.id}>`,
              `👤 **Dibuka oleh:** <@${interaction.user.id}>`,
              `🏷️ **Tipe:** ${ticketTypeLabel(safeType)}`,
              subject ? `📝 **Judul:** ${subject}` : "📝 **Judul:** —",
            ].join("\n")
          )
          .setTimestamp();
        await sendTicketLogEmbed(interaction.guild, emb);
      })();

      return message.reply(`✅ Ticket dibuat: ${channel}`);
    }

    // ===================== GIVEAWAY (PREFIX) =====================
    // cgstart 10m | 1 | Nitro Basic
    if (cmd === "gstart") {
      if (!(await needPerm(PermissionsBitField.Flags.ManageGuild))) return;

      const raw = args.join(" ");
      const parts = raw.split("|").map((s) => s.trim()).filter(Boolean);
      if (parts.length < 3) return message.reply("Format: `cgstart 10m | 1 | Hadiah` ");

      const dur = parts[0];
      const winners = Number(parts[1] || 1);
      const prize = parts[2];

      const ms = parseDurationToMs(dur);
      if (!ms) return message.reply("❌ Durasi salah (Contoh: 10m, 1h).");

      const endAt = Date.now() + ms;

      // 1. Simpan ke database dulu dan TANGGU hasilnya ke variabel 'dbResult'
      const dbResult = await safeRun(
        `INSERT INTO giveaways (guild_id, channel_id, prize, winners, end_at, host_id, is_ended)
         VALUES (?,?,?,?,?,?,0)`,
        [String(message.guild.id), String(message.channelId), safeText(prize, 140), winners, endAt, String(message.author.id)]
      );

      // 2. Ambil giveawayId dari database (Inilah yang membuat tidak #undefined lagi)
      const giveawayId = dbResult?.lastID ?? dbResult?.lastInsertRowid;

      if (!giveawayId) {
        return message.reply("❌ Gagal membuat giveaway di database.");
      }

      // 3. Masukkan giveawayId ke embed judul (#106, #107, dst)
      const emb = giveawayEmbed({
        id: giveawayId,
        prize,
        winners,
        hostId: message.author.id,
        endAt,
        entries: 0,
        ended: false
      });

      // 4. Masukkan giveawayId ke tombol agar tombol Join TAHU harus masuk ke giveaway mana
      const sent = await message.channel.send({
        embeds: [emb],
        components: [giveawayRow(giveawayId)]
      });

      // 5. Update message_id agar pengundian otomatis berfungsi
      await safeRun(`UPDATE giveaways SET message_id=? WHERE id=?`, [sent.id, giveawayId]);

      return message.reply(`✅ Giveaway dibuat: **#${giveawayId}**`);
    }

    if (cmd === "gend") {
      if (!(await needPerm(PermissionsBitField.Flags.ManageGuild))) return;
      const id = Number(args[0]);
      if (!id) return message.reply("Format: `cgend GIVEAWAY_ID`");

      const g = await getGiveaway(id);
      if (!g || g.is_ended) return message.reply("⚠️ Giveaway tidak ditemukan / sudah selesai.");

      // set end_at = now (biar diproses loop)
      await safeRun(`UPDATE giveaways SET end_at=? WHERE id=?`, [Date.now(), id]);
      return message.reply(`⏩ Giveaway #${id} dipercepat untuk selesai.`);
    }

    if (cmd === "greroll") {
      if (!(await needPerm(PermissionsBitField.Flags.ManageGuild))) return;
      const id = Number(args[0]);
      if (!id) return message.reply("Format: `creroll GIVEAWAY_ID`");

      const g = await getGiveaway(id);
      if (!g) return message.reply("⚠️ Giveaway tidak ditemukan.");

      const entries = await countGiveawayEntries(id);
      const winners = entries ? await pickGiveawayWinners(id, g.winners) : [];
      const winnerText = winners.length ? winners.map((uid) => `<@${uid}>`).join(", ") : "Tidak ada peserta 😭";

      const text = winners.map(id => `✨ <@${id}>`).join("\n");

      return message.channel.send(
        `✨ **GIVEAWAY REROLL** ✨

🎁 **Prize :** ${g.prize}
🌟 **Winners :${winners.length > 1 ? "s" : ""}** ${text}

Enjoy your reward ✨`
      );

    }

    // cping
    // cping
    if (cmd === "latency" || cmd === "ping") {
      const Latency = message.client.ws.ping;                 // ping websocket
      const botLatency = Date.now() - message.createdTimestamp;  // waktu respons bot (estimasi)

      const embed = new EmbedBuilder()
        .setTitle("🏓 Pong!")
        .setColor(EMBED_COLOR)
        .setDescription(
          [
            `💗 **Latency (Heartbeat):** \`${Latency}ms\``,
            `🤖 **Bot Latency (Respons):** \`${botLatency}ms\``,
          ].join("\n")
        )
        .setFooter({
          text: `Requested by ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }
    // chelp / chalp
    if (cmd === "help" || cmd === "hai") {
      const ui = buildHelpUI("home", message.author.id);
      return message.reply({ embeds: ui.embeds, components: ui.components, allowedMentions: { repliedUser: false, parse: [] } });
    }

    // chalo (prefix) tetap ada sebagai sapaan singkat
    if (cmd === "halo") {
      return message.reply(`✨ salam, <@${message.author.id}>. gerbang Mystral menyambutmu. 🕯️`);
    }

    // ctranslate
    if (cmd === "translate" || cmd === "trans" || cmd === "ts" || cmd === "tl") {
      const text = args.join(" ").trim();
      if (!text) {
        return message.reply("Format: `ctranslate [target_lang] <teks>` atau `ctranslate <teks>`");
      }

      // Check if first word is a valid 2-letter language code
      const firstWord = text.split(" ")[0].toLowerCase();
      const langCodes = new Set(["id", "en", "ja", "ko", "es", "fr", "de", "it", "ru", "zh", "ar", "pt", "tr", "vi", "th"]);

      let target = "id";
      let textToTranslate = text;

      if (langCodes.has(firstWord) && text.split(" ").length > 1) {
        target = firstWord;
        textToTranslate = text.slice(firstWord.length).trim();
      }

      await message.channel.sendTyping().catch(() => { });
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
        const res = await fetch(url).then(r => r.json());
        const translated = res[0].map(s => s[0]).join('');
        const detectedSrc = res[2] || "auto";

        const embed = new EmbedBuilder()
          .setTitle("🌐 Translation")
          .setColor(EMBED_COLOR)
          .addFields(
            { name: `Original (${detectedSrc.toUpperCase()})`, value: textToTranslate },
            { name: `Translated (${target.toUpperCase()})`, value: translated }
          )
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      } catch (err) {
        console.error("[TRANSLATE ERROR]", err);
        return message.reply("❌ Gagal menerjemahkan teks.");
      }
    }

    // cweather
    if (cmd === "weather" || cmd === "cuaca") {
      const location = args.join(" ").trim();
      if (!location) {
        return message.reply("Format: `cweather <kota/wilayah>`");
      }

      await message.channel.sendTyping().catch(() => { });
      try {
        const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
        const res = await fetch(url).then(r => r.json());

        const current = res.current_condition[0];
        const area = res.nearest_area[0];
        const areaName = area.areaName[0].value;
        const country = area.country[0].value;
        const tempC = current.temp_C;
        const feelsLikeC = current.FeelsLikeC;
        const humidity = current.humidity;
        const desc = current.weatherDesc[0].value;
        const windKmph = current.windspeedKmph;
        const windDir = current.winddir16Point;
        const uvIndex = current.uvIndex;
        const cloudcover = current.cloudcover;
        const precipMM = current.precipMM;
        const iconUrl = current.weatherIconUrl?.[0]?.value || "";

        const embed = new EmbedBuilder()
          .setTitle(`⛅ Cuaca di ${areaName}, ${country}`)
          .setColor(EMBED_COLOR)
          .setDescription(`**Kondisi:** ${desc}`)
          .addFields(
            { name: "🌡️ Temperatur", value: `${tempC}°C (Terasa ${feelsLikeC}°C)`, inline: true },
            { name: "💧 Kelembaban", value: `${humidity}%`, inline: true },
            { name: "💨 Angin", value: `${windKmph} km/h (${windDir})`, inline: true },
            { name: "☀️ Indeks UV", value: `${uvIndex}`, inline: true },
            { name: "☁️ Awan", value: `${cloudcover}%`, inline: true },
            { name: "🌧️ Curah Hujan", value: `${precipMM} mm`, inline: true }
          )
          .setTimestamp();

        if (iconUrl) embed.setThumbnail(iconUrl);
        return message.reply({ embeds: [embed] });
      } catch (err) {
        console.error("[WEATHER ERROR]", err);
        return message.reply("❌ Gagal mengambil data cuaca untuk lokasi tersebut.");
      }
    }

    // cqrcode
    if (cmd === "qrcode" || cmd === "qr") {
      const text = args.join(" ").trim();
      if (!text) {
        return message.reply("Format: `cqrcode <teks atau link>`");
      }

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(text)}`;
      const embed = new EmbedBuilder()
        .setTitle("📷 QR Code Generator")
        .setColor(EMBED_COLOR)
        .setDescription(`**Data:** \`${text.length > 60 ? text.slice(0, 57) + "..." : text}\``)
        .setImage(qrUrl)
        .setFooter({ text: "Scan QR Code di atas menggunakan kamera perangkat Anda." })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // cshorturl
    if (cmd === "shorturl" || cmd === "short" || cmd === "surl") {
      const longUrl = args.join(" ").trim();
      if (!longUrl) {
        return message.reply("Format: `cshorturl <link URL>`");
      }

      try {
        new URL(longUrl);
      } catch {
        return message.reply("❌ Silakan masukkan URL yang valid (harus diawali http:// atau https://).");
      }

      await message.channel.sendTyping().catch(() => { });
      try {
        const sUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`;
        const res = await fetch(sUrl);
        if (!res.ok) throw new Error();
        const short = await res.text();

        const embed = new EmbedBuilder()
          .setTitle("🔗 URL Shortener")
          .setColor(EMBED_COLOR)
          .addFields(
            { name: "Original URL", value: `[Link Asli](${longUrl})` },
            { name: "Shortened URL", value: short }
          )
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      } catch (err) {
        console.error("[SHORTURL ERROR]", err);
        return message.reply("❌ Gagal menyingkat URL.");
      }
    }

    // cembed
    if (cmd === "embed") {
      if (!isBotOwner(message.author.id)) {
        return message.reply({ content: "❌ command ini cuma buat pembuat bot.", allowedMentions: { repliedUser: false } });
      }

      const raw = args.join(" ");
      const parts = raw.split("|").map((s) => s.trim()).filter(Boolean);

      if (parts.length < 2) {
        return message.reply({
          content: "Format: `cembed Judul | Deskripsi` (opsional warna: `| #77d0d7`)",
          allowedMentions: { repliedUser: false },
        });
      }

      const title = parts[0];
      let description = parts[1];
      let color = EMBED_COLOR;

      // kalau ada argumen 3 dan bentuknya hex, anggap warna
      if (parts[2] && /^#?[0-9a-fA-F]{6}$/.test(parts[2])) {
        color = parseInt(parts[2].replace("#", ""), 16);
      } else if (parts.length > 2) {
        // kalau bukan warna, gabungkan ke deskripsi biar nggak hilang
        description = parts.slice(1).join("\n");
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setFooter({ text: "Mystral Academy • Arcane Notice" })
        .setTimestamp();

      await message.channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => null);
      return message.reply({ content: "✅ embed terkirim.", allowedMentions: { repliedUser: false } });
    }

    // cticketpanel
    if (cmd === "ticketpanel") {
      if (!isBotOwner(message.author.id)) {
        return message.reply({ content: "❌ command ini cuma buat pembuat bot.", allowedMentions: { repliedUser: false } });
      }
      await message.channel.send({
        components: ticketPanelComponentsV2(),
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
      return message.reply({ content: "✅ panel ticket terkirim.", allowedMentions: { repliedUser: false } });
    }

    // cavatar
    if (cmd === "avatar") {
      const mentioned = message.mentions.users.first();
      let user = mentioned || message.author;

      if (!mentioned && args[0] && /^\d{15,25}$/.test(args[0])) {
        const fetched = await message.client.users.fetch(args[0]).catch(() => null);
        if (fetched) user = fetched;
      }

      const embed = new EmbedBuilder()
        .setTitle("🖼️ Avatar")
        .setColor(EMBED_COLOR)
        .setDescription(`Avatar milik <@${user.id}>`)
        .setImage(user.displayAvatarURL({ extension: "png", size: 1024 }))
        .setFooter({ text: BRAND_NAME })
        .setTimestamp();

      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    // cuserinfo (PREFIX)
    if (cmd === "userinfo") {
      const mentioned = message.mentions.users.first();
      let user = mentioned || message.author;

      // allow by ID
      if (!mentioned && args[0] && /^\d{15,25}$/.test(args[0])) {
        const fetched = await message.client.users.fetch(args[0]).catch(() => null);
        if (fetched) user = fetched;
      }

      const guild = message.guild;
      const member = await guild.members.fetch(user.id).catch(() => null);

      // ===== Dates =====
      const createdUnix = Math.floor((user.createdTimestamp || Date.now()) / 1000);
      const joinedUnix = member?.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;

      // ===== Roles (HIGHEST -> LOWEST) =====
      const roleList = member
        ? member.roles.cache
          .filter((r) => r.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .map((r) => r.toString())
        : [];

      const maxRolesShown = 15;
      const rolesShown = roleList.slice(0, maxRolesShown);
      const rolesMore = Math.max(0, roleList.length - rolesShown.length);

      // ===== Highest Role =====
      const topRole =
        member?.roles.cache
          .filter((r) => r.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .first() || null;

      // ===== Nick / Display =====
      const nickname = member?.nickname || "—";
      const displayName = member?.displayName || user.username;

      // ===== Banner (needs user full fetch) =====
      const userFull = await message.client.users.fetch(user.id, { force: true }).catch(() => null);
      const bannerUrl = userFull?.bannerURL?.({ extension: "png", size: 1024 }) || null;

      const embed = new EmbedBuilder()
        .setTitle(`Mystral Profile — ${displayName}`)
        .setColor(EMBED_COLOR)
        .setThumbnail(user.displayAvatarURL({ extension: "png", size: 256 }))
        .setDescription(`**Mention:** <@${user.id}>`)
        .addFields(
          {
            name: "🪪 Identity",
            value: [
              `**Tag:** ${user.tag}`,
              `**User ID:** \`${user.id}\``,
              `**Nickname:** ${nickname === "—" ? "—" : `\`${nickname}\``}`,
            ].join("\n"),
            inline: true,
          },
          {
            name: "🕰️ Timeline",
            value: [
              `**Akun Dibuat:** <t:${createdUnix}:F>`,
              `**Join Server:** ${joinedUnix ? `<t:${joinedUnix}:F>` : "—"}`,
              `**Relative:** <t:${createdUnix}:R>${joinedUnix ? ` • <t:${joinedUnix}:R>` : ""}`,
            ].join("\n"),
            inline: true,
          },
          {
            name: "🎭 Roles",
            value: roleList.length
              ? `${rolesShown.join(" ")}${rolesMore ? `\n…dan **${rolesMore}** role lain.` : ""}`
              : "—",
            inline: false,
          },
          {
            name: "🏷️ Highest Role",
            value: topRole ? `${topRole} *(pos ${topRole.position})*` : "—",
            inline: true,
          },
          {
            name: "🧩 Server",
            value: `**${guild.name}**\nID: \`${guild.id}\``,
            inline: true,
          }
        )
        .setFooter({ text: `${BRAND_NAME} • Student Registry` })
        .setTimestamp();

      if (bannerUrl) embed.setImage(bannerUrl);

      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false, parse: [] } });
    }

    // cprofile (PREFIX)
    if (cmd === "profile") {
      const mentioned = message.mentions.users.first();
      let user = mentioned || message.author;

      if (!mentioned && args[0] && /^\d{15,25}$/.test(args[0])) {
        const fetched = await message.client.users.fetch(args[0]).catch(() => null);
        if (fetched) user = fetched;
      }

      const guild = message.guild;
      const member = await guild.members.fetch(user.id).catch(() => null);

      const { embed, idData, sorted, afk } = await buildProfileEmbed({ guild, user, member });

      const row = profileButtons({
        hasIdCard: Boolean(idData),
        hasSorted: Boolean(sorted?.choice),
        isAfk: Boolean(afk),
      });

      return message.reply({
        embeds: [embed],
        components: [row],
        allowedMentions: { repliedUser: false, parse: [] },
      });
    }

    // cserverinfo
    if (cmd === "serverinfo") {
      const g = message.guild;
      if (!g) return;

      // fetch data
      const owner = await g.fetchOwner().catch(() => null);
      const channels = await g.channels.fetch().catch(() => null);

      // counts
      const totalMembers = g.memberCount ?? 0;

      const channelCount = channels ? channels.size : 0;
      const textCount = channels ? channels.filter((c) => c?.type === 0).size : 0;
      const voiceCount = channels ? channels.filter((c) => c?.type === 2).size : 0;
      const categoryCount = channels ? channels.filter((c) => c?.type === 4).size : 0;
      const forumCount = channels ? channels.filter((c) => c?.type === 15).size : 0;
      const stageCount = channels ? channels.filter((c) => c?.type === 13).size : 0;
      const threadCount = channels ? channels.filter((c) => [11, 12].includes(c?.type)).size : 0;

      const roleCount = g.roles?.cache?.size ? Math.max(0, g.roles.cache.size - 1) : 0;

      // boosts
      const boostTier = g.premiumTier ?? 0;
      const boostCount = g.premiumSubscriptionCount ?? 0;

      // verification
      const verMap = {
        0: "🔓 None",
        1: "🪶 Low",
        2: "🛡️ Medium",
        3: "🔒 High",
        4: "👑 Very High",
      };
      const verLabel = verMap[g.verificationLevel] || `Level ${g.verificationLevel ?? "—"}`;

      // created
      const createdUnix = Math.floor((g.createdTimestamp || Date.now()) / 1000);

      // visuals
      const icon = g.iconURL({ extension: "png", size: 512 });
      const banner = g.bannerURL?.({ extension: "png", size: 1024 }) || null;

      const embed = new EmbedBuilder()
        .setTitle("🏛️ Mystral Academy — Realm Dossier")
        .setColor(EMBED_COLOR)
        .setThumbnail(icon)
        .setDescription(
          [
            `**Realm:** **${g.name}**`,
            `**Realm ID:** \`${g.id}\``,
            owner ? `**Sovereign:** <@${owner.id}>` : `**Sovereign:** —`,
          ].join("\n")
        )
        .addFields(
          {
            name: "🧭 Population",
            value: [
              `**Members:** **${totalMembers.toLocaleString("id-ID")}**`,
              `**Boosts:** **${boostCount.toLocaleString("id-ID")}**`,
              `**Boost Tier:** **${boostTier}**`,
            ].join("\n"),
            inline: true,
          },
          {
            name: "🗺️ Channels",
            value: channels
              ? [
                `**Total:** **${channelCount}**`,
                `💬 Text: ${textCount}`,
                `🔊 Voice: ${voiceCount}`,
                `🗂️ Category: ${categoryCount}`,
                `🧵 Threads: ${threadCount}`,
                `🧷 Forum: ${forumCount}`,
                `🎙️ Stage: ${stageCount}`,
              ].join("\n")
              : "⚠️ tidak bisa fetch channel.",
            inline: true,
          },
          {
            name: "🎭 Structure",
            value: [
              `**Roles:** **${roleCount}**`,
              `**Verification:** ${verLabel}`,
              `**Created:** <t:${createdUnix}:F>`,
              `**Age:** <t:${createdUnix}:R>`,
            ].join("\n"),
            inline: false,
          }
        )
        .setFooter({ text: `${BRAND_NAME} • Server Info` })
        .setTimestamp();

      // 🔥 banner only if exists
      if (banner) embed.setImage(banner);

      return message.reply({
        embeds: [embed],
        allowedMentions: { repliedUser: false, parse: [] },
      });
    }

    // cafk
    if (cmd === "afk") {
      const reason = args.join(" ") || "AFK";
      await setAfk(message.author.id, reason);

      // set nickname jadi [AFK] ...
      const member = await message.guild.members.fetch(message.author.id).catch(() => null);
      if (member) {
        const base = member.nickname || message.author.username;
        await trySetMemberNick(member, withAfkPrefix(base));
      }

      return message.reply({
        content: `🕯️ <@${message.author.id}> kini berstatus **AFK** — ${safeText(reason, 80)}`,
        allowedMentions: { repliedUser: false },
      });
    }

    // Owner-only: cmenfesspanel
    if (cmd === "menfesspanel") {
      const ch = await getTextChannelOrNull(message.guild, requireEnv("MENFESS_CHANNEL_ID"));
      if (!ch) return message.reply("⚠️ MENFESS_CHANNEL_ID tidak ketemu / bot tidak punya akses / bukan text channel.");

      await ch.send({ embeds: [menfessPanelEmbed()], components: [menfessPanelRow()], allowedMentions: { parse: [] } });
      return message.reply({ content: "✅ panel menfess terkirim.", allowedMentions: { repliedUser: false } });
    }

    // Owner-only: csortingpanel
    if (cmd === "sortingpanel") {
      const targetChannelId = requireEnv("SORTING_CHANNEL_ID") || message.channelId;
      const ch = await getTextChannelOrNull(message.guild, targetChannelId);
      if (!ch) return message.reply("⚠️ SORTING_CHANNEL_ID tidak valid / bot tidak punya akses / bukan text channel.");

      await ch.send({ components: sortingPanelComponentsV2(), flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
      return message.reply({ content: "✅ panel sorting terkirim.", allowedMentions: { repliedUser: false } });
    }

    // Owner-only: cidcard (arahin ke slash)
    if (cmd === "idcard") {
      return message.reply("🪪 pakai slash **/idcard** ya (fiturnya terkunci khusus owner).");
    }

    // Owner-only: cservers (lihat daftar server bot)
    if (cmd === "servers") {
      if (!isBotOwner(message.author.id)) {
        return message.reply("❌ Perintah ini khusus untuk pembuat bot.");
      }

      const guildsList = client.guilds.cache.map(guild => {
        return `• **${guild.name}** (\`${guild.id}\`) — ${guild.memberCount} member`;
      }).join("\n");

      const responseText = `📡 **Bot terhubung di ${client.guilds.cache.size} server:**\n\n${guildsList}`;
      return message.reply({
        content: responseText.slice(0, 2000),
        allowedMentions: { repliedUser: false }
      });
    }

    // ===================== DAILY TAROT PREFIX COMMANDS =====================
    if (cmd === "tarot") {
      const sub = (args[0] || "").toLowerCase();
      const userId = message.author.id;
      const username = message.author.username;

      if (sub === "" || sub === "pull") {
        const todayStr = wibDayKey();
        const tarotUser = await getOrInitTarotUser(userId, username);
        if (tarotUser.last_reading_date === todayStr) {
          return message.reply([
            `╭・<:pink_cards1:1510057886795956235> **Daily Tarot — Sudah Terbuka**`,
            `├・Energi spiritualmu hari ini telah terbaca sepenuhnya.`,
            `├・*Arcane Deck* baru bisa kamu panggil kembali esok hari.`,
            `╰・🕒 *Penyelarasan kartu disetel ulang setiap pukul 00:00 WIB*`
          ].join("\n"));
        }

        return message.reply({
          embeds: [buildTarotMainEmbed()],
          components: [
            buildTarotMainButtons(userId),
            buildTarotMainButtonsRow2(userId)
          ]
        });
      }

      if (sub === "profile") {
        const targetUser =
          message.mentions.users.first() ||
          (args[1] && /^\d{15,25}$/.test(args[1])
            ? (await message.client.users.fetch(args[1]).catch(() => null)) || message.author
            : message.author);

        const emb = await buildTarotProfileEmbed(targetUser, client);
        return message.reply({ embeds: [emb] });
      }

      if (sub === "lb" || sub === "leaderboard") {
        const emb = await buildTarotLeaderboardEmbed(message.guild);
        return message.reply({ embeds: [emb] });
      }

      if (sub === "collection" || sub === "col") {
        const targetUser =
          message.mentions.users.first() ||
          (args[1] && /^\d{15,25}$/.test(args[1])
            ? (await message.client.users.fetch(args[1]).catch(() => null)) || message.author
            : message.author);

        const emb = await buildTarotCollectionEmbed(targetUser);
        return message.reply({ embeds: [emb] });
      }

      if (sub === "announce") {
        if (!isBotOwner(message.author.id) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply("❌ Perintah ini khusus untuk Administrator.");
        }

        const targetChannel =
          message.mentions.channels.first() ||
          (args[1] && /^\d{15,25}$/.test(args[1])
            ? await message.guild.channels.fetch(args[1]).catch(() => null)
            : message.channel);

        if (!targetChannel || !targetChannel.isTextBased()) {
          return message.reply("⚠️ Channel tidak valid atau bukan text channel.");
        }

        const embed = buildTarotAnnouncementEmbed();
        await targetChannel.send({ embeds: [embed] });
        return message.reply(`✅ Pengumuman tarot terkirim ke ${targetChannel}.`);
      }
    }

    if (cmd === "tarotprofile") {
      const targetUser =
        message.mentions.users.first() ||
        (args[0] && /^\d{15,25}$/.test(args[0])
          ? (await message.client.users.fetch(args[0]).catch(() => null)) || message.author
          : message.author);

      const emb = await buildTarotProfileEmbed(targetUser, client);
      return message.reply({ embeds: [emb] });
    }

    if (cmd === "tarotlb") {
      const emb = await buildTarotLeaderboardEmbed(message.guild);
      return message.reply({ embeds: [emb] });
    }

    if (cmd === "tarotcollection") {
      const targetUser =
        message.mentions.users.first() ||
        (args[0] && /^\d{15,25}$/.test(args[0])
          ? (await message.client.users.fetch(args[0]).catch(() => null)) || message.author
          : message.author);

      const emb = await buildTarotCollectionEmbed(targetUser);
      return message.reply({ embeds: [emb] });
    }

    if (cmd === "tarotannounce") {
      if (!isBotOwner(message.author.id) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("❌ Perintah ini khusus untuk Administrator.");
      }

      const targetChannel =
        message.mentions.channels.first() ||
        (args[0] && /^\d{15,25}$/.test(args[0])
          ? await message.guild.channels.fetch(args[0]).catch(() => null)
          : message.channel);

      if (!targetChannel || !targetChannel.isTextBased()) {
        return message.reply("⚠️ Channel tidak valid atau bukan text channel.");
      }

      const embed = buildTarotAnnouncementEmbed();
      await targetChannel.send({ embeds: [embed] });
      return message.reply(`✅ Pengumuman tarot terkirim ke ${targetChannel}.`);
    }

    // ===================== PREFIX: cstealemoji =====================
    if (cmd === "stealemoji" || cmd === "stemoji" || cmd === "stlemoji") {
      if (!message.guild) return message.reply("🧸 **Gak bisa di sini...**\n> Command ini cuma bisa dipake di dalam server yaa! `(｡•́︿•̀｡)`");

      // Permission check
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions) &&
        !isBotOwner(message.author.id)
      ) {
        return message.reply(
          "🌸 **Huhu, butuh izin dulu...**\n" +
          "> Kamu perlu permission **Manage Emojis / Expressions** untuk pakai command ini yaa! `(｡>﹏<｡)`"
        );
      }

      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) {
        return message.reply(
          "🧸 **Aduh, bot-nya belum dikasih izin...**\n" +
          "> Tolong berikan bot permission **Manage Emojis / Expressions** di server ini dulu yaa! `(⑅˘꒳˘)`"
        );
      }

      // Parse emoji dari args: <:name:id> atau <a:name:id>
      const rawInput = args.join(" ");
      const EMOJI_REGEX = /<(a?):([a-zA-Z0-9_]{2,32}):(\d{15,25})>/g;
      const matches = [...rawInput.matchAll(EMOJI_REGEX)];

      if (!matches.length) {
        return message.reply(
          "Tidak ada emoji custom yang terdeteksi.\n" +
          "**Format:** `cstealemoji <:nama:id> [emoji lainnya...]`"
        );
      }

      // Nama custom hanya berlaku kalau 1 emoji
      const customName = matches.length === 1 && args.length > 0
        ? args[args.length - 1].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32) || null
        : null;

      const statusMsg = await message.reply(
        "Menyalin emoji... Mohon tunggu sebentar."
      );

      const results = [];
      for (const match of matches) {
        const [, animated, emojiName, emojiId] = match;
        const ext = animated === "a" ? "gif" : "png";
        const cdnUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}`;
        const finalName = (customName && matches.length === 1)
          ? customName
          : emojiName;

        try {
          // Fetch dari CDN
          const resp = await fetch(cdnUrl);
          if (!resp.ok) throw new Error(`CDN returned ${resp.status}`);
          const buf = Buffer.from(await resp.arrayBuffer());
          const b64 = `data:image/${ext === "gif" ? "gif" : "png"};base64,${buf.toString("base64")}`;

          const created = await message.guild.emojis.create({
            attachment: b64,
            name: finalName,
          });

          results.push(`${created} \`:${created.name}:\` berhasil disalin!`);
        } catch (err) {
          const reason = err?.rawError?.message || err?.message || "Unknown error";
          results.push(`\`:${finalName}:\` gagal disalin. Kendala: ${reason}`);
        }
      }

      const resultText = results.join("\n");
      const successCount = results.filter(r => r.includes("berhasil disalin")).length;
      
      const responseText = 
        `**Proses salin emoji selesai!**\n` +
        `Berhasil menyalin **${successCount}** dari **${matches.length}** emoji.\n\n` +
        `${resultText}`;

      return statusMsg.edit(responseText).catch(() => message.channel.send(responseText));
    }
  } catch (e) {
    console.error("[PREFIX CMD ERROR]", e);
  }
});


// ===================== INTERACTIONS =====================
client.on(Events.InteractionCreate, async (interaction) => {

  // ==== ANTI DOUBLE HANDLE (WAJIB) ====
  if (interaction.__handled) return;
  interaction.__handled = true;

  // kalau sudah ada yang ack, jangan lanjut
  if (interaction.deferred || interaction.replied) return;

  try {

    // ===================== INTERACTIVE HELP CATEGORY CHANGE =====================
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("help:menu:")) {
      const [, , commandCallerId] = interaction.customId.split(":");

      // Security check: Only the caller can interact
      if (commandCallerId !== "any" && interaction.user.id !== commandCallerId) {
        return interaction.reply({
          content: "❌ Menu bantuan ini dipanggil oleh orang lain. Silakan ketik `/help` atau `chelp` untuk memanggil menu bantuanmu sendiri!",
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedCategory = interaction.values[0];
      const ui = buildHelpUI(selectedCategory, commandCallerId);

      await interaction.update({
        embeds: ui.embeds,
        components: ui.components
      }).catch(() => { });
      return;
    }

    // ===================== DAILY TAROT: CATEGORY BUTTON CLICK =====================
    if (interaction.isButton() && interaction.customId.startsWith("tarot:category:")) {
      const [, , category, targetUserId] = interaction.customId.split(":");

      // Thread Lock Check
      if (interaction.user.id !== targetUserId) {
        return interaction.reply({
          content: `${TAROT_EMOJIS.restricted} Menu tarot ini bukan milikmu. Gunakan \`/tarot\` atau \`ctarot\` sendiri!`,
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferUpdate().catch(() => { });

      // Cooldown double check
      const todayStr = wibDayKey();
      const username = interaction.user.username;
      const tarotUser = await getOrInitTarotUser(targetUserId, username);
      if (tarotUser.last_reading_date === todayStr) {
        return interaction.followUp({
          content: [
            `╭・${TAROT_EMOJIS.cooldown} **Daily Tarot — Sudah Terbuka**`,
            `├・Energi spiritualmu hari ini telah terbaca sepenuhnya.`,
            `├・*Arcane Deck* baru bisa kamu panggil kembali esok hari.`,
            `╰・🕒 *Penyelarasan kartu disetel ulang setiap pukul 00:00 WIB*`
          ].join("\n"),
          flags: MessageFlags.Ephemeral
        });
      }

      // Roll 1 card using weighted rarity rates
      const card = drawTarotCard();

      // Get reading
      const readingData = getTarotReading(card.id, category);

      // Record reading in DB
      const { streak } = await addTarotReadingRecord(targetUserId, username, card, category);

      // Category labels
      const categoryLabelMap = {
        love: `${TAROT_EMOJIS.love} Love Reading`,
        study: `${TAROT_EMOJIS.study} Study Reading`,
        career: `${TAROT_EMOJIS.career} Career Reading`,
        fortune: `${TAROT_EMOJIS.fortune} Fortune Reading`,
        warning: `${TAROT_EMOJIS.restricted} Warning Reading`,
        random: `${TAROT_EMOJIS.random} Random Arcane Reading`
      };

      const categoryLabel = categoryLabelMap[category.toLowerCase()] || `${TAROT_EMOJIS.crystall} Tarot Reading`;

      const embed = new EmbedBuilder()
        .setTitle(categoryLabel)
        .setDescription([
          `${TAROT_EMOJIS.card} **Card:** ${card.name}`,
          `${TAROT_EMOJIS.rarefix} **Rarity:** ${card.rarity}`,
          `${TAROT_EMOJIS.streak} **Streak:** \`${streak} Hari\``,
          "",
          "**Reading:**",
          readingData.reading,
          "",
          "**Arcane Advice:**",
          `*${readingData.advice}*`
        ].join("\n"))
        .setColor(EMBED_COLOR)
        .setFooter({ text: "Mystral Academy • Daily Tarot" })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        components: []
      }).catch(() => { });
      return;
    }

    // ===================== AFK LIST BUTTON (EMBED) =====================
    if (interaction.isButton() && interaction.customId.startsWith("afk:list:")) {
      await interaction.deferUpdate().catch(() => { });

      const rows = await getAllAfkUsers();
      if (!rows.length) {
        return interaction.editReply("✅ Tidak ada user yang sedang AFK.");
      }

      const perPage = 10;
      const page = Number(interaction.customId.split(":")[2]) || 0;
      const maxPage = Math.ceil(rows.length / perPage);

      const buildEmbed = (pageIndex) => {
        const start = pageIndex * perPage;
        const slice = rows.slice(start, start + perPage);

        const desc = slice.map((u, i) => {
          const since = `<t:${Math.floor(u.since / 1000)}:R>`;
          return `**${start + i + 1}.** <@${u.user_id}> — ${u.reason || "_tanpa alasan_"} (${since})`;
        }).join("\n");

        return new EmbedBuilder()
          .setTitle("😴 Daftar Member AFK")
          .setColor(EMBED_COLOR)
          .setDescription(desc)
          .setFooter({
            text: `Total AFK: ${rows.length} • Page ${pageIndex + 1}/${maxPage}`,
          })
          .setTimestamp();
      };

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`afk:list:${page - 1}`)
          .setLabel("⬅")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page <= 0),

        new ButtonBuilder()
          .setCustomId(`afk:list:${page + 1}`)
          .setLabel("➡")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= maxPage - 1)
      );

      return interaction.editReply({
        embeds: [buildEmbed(page)],
        components: [row],
      });
    }

    // ===================== MENFESS: BUTTON + MODAL HANDLERS (FINAL FIX) =====================
    if (interaction.isButton()) {
      // 1) Kirim menfess (dari panel / dari tombol di post)
      if (interaction.customId === "menfess:new") {
        const modal = new ModalBuilder()
          .setCustomId("menfess:modal:new")
          .setTitle("✉️ Kirim Menfess (Anonim)");

        const toInput = new TextInputBuilder()
          .setCustomId("to")
          .setLabel("Untuk (opsional)")
          .setPlaceholder("misal: anak kelas A / seseorang / everyone")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(60);

        const msgInput = new TextInputBuilder()
          .setCustomId("msg")
          .setLabel("Isi menfess")
          .setPlaceholder("tulis pesan kamu di sini…")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(900);

        const imgInput = new TextInputBuilder()
          .setCustomId("image")
          .setLabel("Link Gambar/GIF (opsional)")
          .setPlaceholder("https://... (Direct Link png/jpg/gif)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(300);

        modal.addComponents(
          new ActionRowBuilder().addComponents(toInput),
          new ActionRowBuilder().addComponents(msgInput),
          new ActionRowBuilder().addComponents(imgInput)
        );

        return interaction.showModal(modal).catch((err) => {
          console.error("❌ MODAL SHOW ERROR:", err);
        });
      }

      // 2) Balas anonim ke menfess tertentu
      if (interaction.customId.startsWith("menfess:reply:")) {
        const targetId = interaction.customId.split(":")[2];

        const modal = new ModalBuilder()
          .setCustomId(`menfess:modal:reply:${targetId}`)
          .setTitle("💬 Balas Menfess (Anonim)");

        const msgInput = new TextInputBuilder()
          .setCustomId("msg")
          .setLabel("Balasan kamu")
          .setPlaceholder("tulis balasan anonim…")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(900);

        modal.addComponents(new ActionRowBuilder().addComponents(msgInput));
        return interaction.showModal(modal).catch(() => { });
      }
    }

    if (interaction.isModalSubmit()) {
      // anti spam sederhana
      const cdKey = `${interaction.guildId}:${interaction.user.id}`;
      const now = Date.now();
      const last = menfessCooldown.get(cdKey) || 0;
      const cooldownMs = Number(process.env.MENFESS_COOLDOWN_MS || 15_000);
      const passCooldown = now - last >= cooldownMs;

      // 3) SUBMIT: kirim menfess baru
      if (interaction.customId === "menfess:modal:new") {
        if (!interaction.guild) return;

        if (!passCooldown) {
          return interaction.reply({
            content: `⏳ pelan dulu ya, coba lagi <t:${Math.floor((last + cooldownMs) / 1000)}:R>`,
            flags: MessageFlags.Ephemeral,
          }).catch(() => { });
        }
        menfessCooldown.set(cdKey, now);

        const ch = await getTextChannelOrNull(interaction.guild, requireEnv("MENFESS_CHANNEL_ID"));
        if (!ch) {
          return interaction.reply({
            content: "⚠️ MENFESS_CHANNEL_ID tidak ketemu / bot tidak punya akses / bukan text channel.",
            flags: MessageFlags.Ephemeral,
          }).catch(() => { });
        }

        const to = (interaction.fields.getTextInputValue("to") || "").trim().slice(0, 60);
        const msg = (interaction.fields.getTextInputValue("msg") || "").trim().slice(0, 900);
        const image = (interaction.fields.getTextInputValue("image") || "").trim();
        if (!msg) {
          return interaction.reply({ content: "⚠️ isi menfess nya kosong.", flags: MessageFlags.Ephemeral }).catch(() => { });
        }

        const anonLabel = await getAnonLabel(interaction.user.id);
        const id = await nextMenfessId();

        // simpan post dulu (message_id nanti di-update setelah send)
        await insertMenfessPost({ id, messageId: null, channelId: ch.id }).catch(() => null);

        const embed = new EmbedBuilder()
          .setTitle(`🕯️ MENFESS #${id}`)
          .setColor(EMBED_COLOR)
          .setDescription(
            [
              to ? `**Untuk:** ${to}` : null,
              msg,
              `Menfess • <t:${Math.floor(Date.now() / 1000)}:f>`,
            ].filter(Boolean).join("\n\n")
          );

        // Validasi: hanya terima direct image link
        if (image) {
          const directImageErr = validateDirectImageUrl(image);
          if (directImageErr) {
            return interaction.reply({
              content: directImageErr,
              flags: MessageFlags.Ephemeral,
            }).catch(() => { });
          }
          embed.setImage(image);
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("menfess:new").setLabel("Kirim Baru").setStyle(ButtonStyle.Success).setEmoji("✉️"),
          new ButtonBuilder().setCustomId(`menfess:reply:${id}`).setLabel("Balas Anonim").setStyle(ButtonStyle.Primary).setEmoji("🫧")
        );

        const sent = await ch.send({ embeds: [embed], components: [row], allowedMentions: { parse: [] } }).catch(() => null);
        if (sent?.id) {
          await updateMenfessPostLink(id, { messageId: sent.id, channelId: ch.id }).catch(() => null);
        }

        await sendMenfessLog(interaction.guild, {
          kind: "post",
          id,
          senderId: interaction.user.id,
          senderNick: interaction.member?.displayName || interaction.user.username,
          anonLabel,
          to,
          channelId: ch.id,
          messageId: sent?.id || null,
          content: msg,
          image: image || null,
        }).catch(() => null);


        return interaction.reply({ content: "✅ menfess terkirim.", flags: MessageFlags.Ephemeral }).catch(() => { });
      }

      // 4) SUBMIT: balas menfess (REPLY ke menfess aslinya)
      if (interaction.customId.startsWith("menfess:modal:reply:")) {
        if (!interaction.guild) return;

        const targetId = interaction.customId.split(":")[3];
        const msg = (interaction.fields.getTextInputValue("msg") || "").trim().slice(0, 900);
        if (!msg) {
          return interaction.reply({ content: "⚠️ balasan kosong.", flags: MessageFlags.Ephemeral }).catch(() => { });
        }

        const post = await getMenfessPostById(targetId).catch(() => null);
        const chId = post?.channel_id || requireEnv("MENFESS_CHANNEL_ID");
        const ch = await getTextChannelOrNull(interaction.guild, chId);
        if (!ch) {
          return interaction.reply({ content: "⚠️ channel menfess tidak ditemukan.", flags: MessageFlags.Ephemeral }).catch(() => { });
        }

        const anonLabel = await getAnonLabel(interaction.user.id);
        const replyId = await nextMenfessId();

        const embed = new EmbedBuilder()
          .setTitle(`🤫 Balasan Anonim #${replyId}`)
          .setColor(EMBED_COLOR)
          .setDescription(
            [
              msg,
              `Reply to menfess #${targetId} • <t:${Math.floor(Date.now() / 1000)}:f>`,
            ].join("\n\n")
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("menfess:new").setLabel("Kirim Baru").setStyle(ButtonStyle.Success).setEmoji("✉️"),
          new ButtonBuilder().setCustomId(`menfess:reply:${targetId}`).setLabel("Balas Anonim").setStyle(ButtonStyle.Primary).setEmoji("🫧")
        );

        const msgId = post?.message_id || post?.messageId;

        let targetMsg = null;
        if (msgId) {
          targetMsg = await ch.messages.fetch(msgId).catch(() => null);
        }

        let replyThread = post?.thread_id
          ? await ch.threads.fetch(post.thread_id).catch(() => null)
          : null;

        if (!replyThread && targetMsg) {
          replyThread = await targetMsg.startThread({
            name: `menfess-${targetId}`,
            autoArchiveDuration: 1440,
            reason: `Thread balasan menfess #${targetId}`,
          }).catch(() => null);

          if (replyThread?.id) {
            await updateMenfessPostLink(targetId, {
              messageId: post.message_id,
              channelId: post.channel_id,
              threadId: replyThread.id,
            }).catch(() => null);
          }
        }

        if (replyThread) {
          await replyThread.send({ embeds: [embed], components: [row], allowedMentions: { parse: [] } }).catch(() => null);
        } else if (targetMsg) {
          await targetMsg.reply({ embeds: [embed], components: [row], allowedMentions: { parse: [] } }).catch(() => null);
        } else {
          await ch.send({ embeds: [embed], components: [row], allowedMentions: { parse: [] } }).catch(() => null);
        }

        await sendMenfessLog(interaction.guild, {
          kind: "reply",
          id: `#${replyId}`,
          replyTo: targetId,
          senderId: interaction.user.id,
          senderNick: interaction.member?.displayName || interaction.user.username,
          anonLabel,
          channelId: ch.id,
          messageId: null,
          content: msg,
        }).catch(() => null);

        return interaction.reply({ content: "✅ balasan terkirim.", flags: MessageFlags.Ephemeral }).catch(() => { });
      }
    }
    // ===================== END MENFESS HANDLERS =====================
    if (interaction.isButton() && interaction.customId === "sorting:roll") {
      await safeDeferUpdate(interaction);

      if (!interaction.guild) {
        await interaction.followUp({ content: "Guild only.", ephemeral: true }).catch(() => { });
        return;
      }

      const sortingChannelId = process.env.SORTING_CHANNEL_ID;
      if (sortingChannelId && interaction.channelId !== sortingChannelId) {
        await interaction.followUp({ content: `⚠️ ritual ini cuma bisa dilakukan di <#${sortingChannelId}> ya.`, ephemeral: true }).catch(() => { });
        return;
      }

      const idcard = await getIdCard(interaction.user.id).catch(() => null);
      if (!idcard) {
        await interaction.followUp({
          content:
            "🪪 **Segel Takdir tidak merespons.**\n" +
            "Identitas Mystral-mu belum terdaftar.\n\n" +
            "Buat **Mystral ID Card** terlebih dahulu dengan `/idcard` untuk melanjutkan ritual.",
          ephemeral: true,
        }).catch(() => { });
        return;
      }

      const already = await getSortedUser(interaction.user.id).catch(() => null);
      if (already?.choice) {
        const label = already.choice === "dark"
          ? "<:dark:1459543141609771101> Dark Arcane"
          : "<:light:1459543076736336004> Light Arcane";
        await interaction.followUp({ content: `Kamu telah menjalani ritual sekali. Hasil kamu: **${label}**`, ephemeral: true }).catch(() => { });
        return;
      }

      const choice = await pickChoiceBagMoreNatural().catch(() => "light");
      const name = interaction.member?.displayName || interaction.user.username;

      const bars = ["░░░░░░░░░░", "▓░░░░░░░░░", "▓▓░░░░░░░░", "▓▓▓░░░░░░░", "▓▓▓▓░░░░░░", "▓▓▓▓▓░░░░░", "▓▓▓▓▓▓░░░░", "▓▓▓▓▓▓▓░░░", "▓▓▓▓▓▓▓▓░░", "▓▓▓▓▓▓▓▓▓░", "▓▓▓▓▓▓▓▓▓▓"];
      const mantras = [
        "🕯️ lilin takdir menyala…",
        "🌫️ kabut tipis menutup lingkaran…",
        "🔮 gema jiwa dipanggil satu per satu…",
        "📜 huruf kuno bergerak sendiri…",
        "✨ cahaya & bayangan saling menimbang…",
        "🜁 segel bergetar—menjawab namamu…",
      ];
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

      // progress tampil di panel message (public)
      const setPanel = (text) => interaction.message.edit({ content: text }).catch(() => { });

      await setPanel(
        `🜂 **Ritual Dimulai**\n` +
        `> ${pick(mantras)}\n\n` +
        `**${name}** berdiri di dalam lingkaran…\n` +
        `Progress: \`${bars[1]}\``
      );

      const delays = [900, 950, 1050, 900, 1100, 900, 1050, 950, 1100];
      for (let i = 2; i <= 9; i++) {
        await new Promise((r) => setTimeout(r, delays[i - 2]));
        await setPanel(
          `🜂 **Ritual Dimulai**\n` +
          `> ${pick(mantras)}\n\n` +
          `**${name}** …\n` +
          `Progress: \`${bars[i]}\``
        );
      }

      await new Promise((r) => setTimeout(r, 1200));

      // assign role
      const lightRoleId = process.env.LIGHT_ROLE_ID || process.env.SORTING_LIGHT_ROLE_ID || process.env.LIGHT_ARCANE_ROLE_ID;
      const darkRoleId = process.env.DARK_ROLE_ID || process.env.SORTING_DARK_ROLE_ID || process.env.DARK_ARCANE_ROLE_ID;

      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

      let roleOk = true;
      if (member && (lightRoleId || darkRoleId)) {
        const addId = choice === "dark" ? darkRoleId : lightRoleId;
        const removeId = choice === "dark" ? lightRoleId : darkRoleId;

        if (removeId) await member.roles.remove(removeId).catch(() => { });
        if (addId) {
          const ok = await member.roles.add(addId).then(() => true).catch(() => false);
          if (!ok) roleOk = false;
        }
      }

      // baru lock 1x kalau role sukses (biar gak ke-lock tanpa role)
      if (roleOk) {
        await setSortedUser(interaction.user.id, choice).catch(() => null);
      }

      await postHouseCard(interaction.guild, interaction.user, choice).catch(() => false);

      const resultLine =
        choice === "dark"
          ? "<:dark:1459543141609771101> **Dark Student** — bayangan, kehendak bebas, kekuatan tersembunyi."
          : "<:light:1459543076736336004> **Light Student** — cahaya, tatanan, penjaga keseimbangan.";

      await setPanel(
        `🧿 **Takdir Menjawab…**\n\n` +
        `**${name}**, segel kuno telah mengunci pilihanmu.\n` +
        `${resultLine}\n\n` +
        `📜 **Catatan Takdir:** peranmu telah diukir, dan House Card-mu telah tercatat dalam arsip Mystral.`
      );

      // notif pribadi (kalau role gagal, kasih tau)
      if (!roleOk) {
        await interaction.followUp({
          content: "⚠️ Ritual selesai, tapi bot gagal memberi role (cek permission / role hierarchy). Staff tolong fix posisi role bot.",
          ephemeral: true,
        }).catch(() => { });
      } else {
        await interaction.followUp({ content: "✅ Ritual berhasil.", ephemeral: true }).catch(() => { });
      }

      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("tod:")) {
      if (!interaction.channel?.isTextBased?.()) {
        return interaction.reply({ content: "❌ Channel tidak valid.", flags: MessageFlags.Ephemeral }).catch(() => { });
      }

      const cdKey = `${interaction.guildId}:${interaction.user.id}`;
      const now = Date.now();
      const last = todCooldown.get(cdKey) || 0;
      const cooldownMs = Number(process.env.TOD_COOLDOWN_MS || 5000);

      const parts = interaction.customId.split(":");
      const action = parts[1];
      if (now - last < cooldownMs) {
        return interaction.reply({
          content: `⏳ Tunggu sebentar sebelum ambil TOD lagi.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => { });
      }

      todCooldown.set(cdKey, now);
      await interaction.deferUpdate().catch(() => { });

      const q =
        action === "truth"
          ? await getRandomTodQuestion({ type: "truth" })
          : action === "dare"
            ? await getRandomTodQuestion({ type: "dare" })
            : await getRandomTodQuestion();

      await interaction.message.edit({ components: [] }).catch(() => { });
      await sendTodQuestion(interaction.channel, q, interaction.user.id);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === "tod:submit") {
      const type = safeText(interaction.fields.getTextInputValue("type"), 20).trim().toLowerCase();
      const category = safeText(interaction.fields.getTextInputValue("category"), 40).trim().toLowerCase();
      const rating = safeText(interaction.fields.getTextInputValue("rating"), 20).trim();
      const question = safeText(interaction.fields.getTextInputValue("question"), 300).trim();

      if (!["truth", "dare"].includes(type) || !question) {
        return interaction.reply({ content: "❌ Format submit tidak valid.", flags: MessageFlags.Ephemeral });
      }

      await safeRun(
        `INSERT INTO tod_submissions (type, category, rating, question, created_by, is_anonymous, status, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
        [type, category || "general", rating || "PG", question, interaction.user.id, 1, "pending", Date.now()]
      );

      return interaction.reply({
        content: "✅ Pertanyaan anonim berhasil dikirim untuk direview staff.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // ===================== IDCARD: OPEN MODAL (BUTTON) =====================
    if (interaction.isButton() && interaction.customId === "idcard:open") {
      const existingIdCard = await getIdCard(interaction.user.id).catch(() => null);
      // Modal boleh ephemeral (ini cuma buka form)
      // Tidak perlu reply, cukup showModal
      const modal = new ModalBuilder()
        .setCustomId("idcard:modal")
        .setTitle("🪪 Buat / Update Identity Card");

      const iName = new TextInputBuilder()
        .setCustomId("name")
        .setLabel("Nama")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(32)
        .setRequired(true)
        .setPlaceholder("contoh: cyizzielle")
        .setValue(existingIdCard?.name || "");

      const iGender = new TextInputBuilder()
        .setCustomId("gender")
        .setLabel("Gender")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(16)
        .setRequired(true)
        .setPlaceholder("Cowok / Cewek")
        .setValue(existingIdCard?.gender || "");

      const iDom = new TextInputBuilder()
        .setCustomId("domicile")
        .setLabel("Domisili")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(32)
        .setRequired(true)
        .setPlaceholder("contoh: Palembang")
        .setValue(existingIdCard?.domisili || "");

      const iHobby = new TextInputBuilder()
        .setCustomId("hobby")
        .setLabel("Hobi")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(40)
        .setRequired(true)
        .setPlaceholder("contoh: Listening Music")
        .setValue(existingIdCard?.hobi || "");

      const iStatus = new TextInputBuilder()
        .setCustomId("status")
        .setLabel("Status (opsional: In Love | dark / | light)")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(60)
        .setRequired(false)
        .setPlaceholder("contoh: Single | dark")
        .setValue(
          existingIdCard?.status
            ? `${existingIdCard.status}${existingIdCard.theme ? ` | ${existingIdCard.theme}` : ""}`
            : ""
        );

      modal.addComponents(
        new ActionRowBuilder().addComponents(iName),
        new ActionRowBuilder().addComponents(iGender),
        new ActionRowBuilder().addComponents(iDom),
        new ActionRowBuilder().addComponents(iHobby),
        new ActionRowBuilder().addComponents(iStatus)
      );

      return interaction.showModal(modal).catch(async () => {
        // fallback kalau showModal gagal
        return safeReply(interaction, { content: "⚠️ Gagal membuka form, coba lagi ya.", flags: MessageFlags.Ephemeral });
      });
    }

    // ===================== IDCARD: MODAL SUBMIT =====================
    if (interaction.isModalSubmit() && interaction.customId === "idcard:modal") {
      try {
        if (!interaction.guild) {
          return safeReply(interaction, { content: "Guild only.", flags: MessageFlags.Ephemeral });
        }

        // ACK cepat tapi ephemeral; hasil akhir nanti dikirim sebagai pesan channel biasa.
        await safeDefer(interaction, true);

        // Optional: kasih indikator proses (biar user yakin jalan)
        await safeReply(interaction, { content: "🪪 ID Card kamu sedang dibuat..." });

        const name = (interaction.fields.getTextInputValue("name") || "").trim().slice(0, 32);
        const gender = (interaction.fields.getTextInputValue("gender") || "").trim().slice(0, 16);
        const domisili = (interaction.fields.getTextInputValue("domicile") || "").trim().slice(0, 32);
        const hobi = (interaction.fields.getTextInputValue("hobby") || "").trim().slice(0, 40);
        const statusRaw = (interaction.fields.getTextInputValue("status") || "").trim().slice(0, 60);

        // theme parsing: "single | dark"
        let theme = "light";
        let status = statusRaw;
        if (statusRaw.includes("|")) {
          const parts = statusRaw.split("|").map((s) => s.trim()).filter(Boolean);
          const last = (parts[parts.length - 1] || "").toLowerCase();
          if (last === "light" || last === "dark") {
            theme = last;
            status = parts.slice(0, -1).join(" | ").trim();
          }
        }

        const saved = await upsertIdCard(interaction.user.id, {
          name: name || interaction.user.username,
          gender: gender || "—",
          domisili: domisili || "—",
          hobi: hobi || "—",
          status: status || "—",
          theme,
        });

        const createdAtText = saved?.created_at
          ? new Date(Number(saved.created_at)).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
          : "—";

        const sorted = await getSortedUser(interaction.user.id).catch(() => null);

        const png = await renderIdCard({
          theme: saved?.theme || "light",
          number: saved?.number || "—",
          name: saved?.name || interaction.user.username,
          gender: saved?.gender || "—",
          domisili: saved?.domisili || "—",
          hobi: saved?.hobi || "—",
          status: saved?.status || "—",
          avatarUrl: interaction.user.displayAvatarURL({ extension: "png", size: 256 }),
          createdAtText,
          arcanaChoice: sorted?.choice || null,
        });

        const filename = `idcard_${interaction.user.id}.png`;
        const file = new AttachmentBuilder(png, { name: filename });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("idcard:open")
            .setLabel("Buat / Update ID")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🪪")
        );

        const embed = new EmbedBuilder()
          .setTitle(`🪪 ${ID_CARD_TITLE}`)
          .setColor(EMBED_COLOR)
          .setDescription(`<@${interaction.user.id}>, berikut **${ID_CARD_TITLE}** kamu:`)
          .setImage(`attachment://${filename}`)
          .setFooter({ text: "Mystral Academy • Verified in the arcane" })
          .setTimestamp();

        await interaction.channel.send({
          embeds: [embed],
          files: [file],
          components: [row],
          allowedMentions: { parse: ["users"] },
        });

        // Hapus indikator proses supaya yang terlihat publik hanya pesan ID Card biasa,
        // bukan reply/response ke chat sebelumnya.
        await interaction.deleteReply().catch(() => { });
        return;
      } catch (err) {
        console.error("[IDCARD MODAL SUBMIT ERROR]", err);

        // Ini yang bikin gak stuck "thinking"
        return safeReply(interaction, {
          content: "❌ Gagal bikin ID Card (cek permission Attach Files / error render). Coba lagi ya.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "ticket_setup") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "Admin only", ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const panelCh = interaction.options.getChannel("panel_channel", true);
      const category = interaction.options.getChannel("category");
      const staffRole = interaction.options.getRole("staff_role");

      await upsertTicketSettings(interaction.guild.id, {
        panel_channel_id: panelCh.id,
        category_id: category?.id,
        staff_role_id: staffRole?.id,
        panel_title: interaction.options.getString("title"),
        panel_description: interaction.options.getString("description"),
        main_button_label: interaction.options.getString("main_button"),
      });

      const settings = await getTicketSettings(interaction.guild.id);
      const { components } = buildTicketPanel(settings);

      await panelCh.send({ components, flags: MessageFlags.IsComponentsV2 });
      return interaction.editReply("✅ Ticket panel dibuat.");
    }

    // ===================== /warnings =====================
    if (interaction.isChatInputCommand() && interaction.commandName === "warnings") {
      if (!interaction.guild) return safeReply(interaction, { content: "Guild only.", flags: MessageFlags.Ephemeral });

      const target = interaction.options.getUser("user", true);
      await safeDefer(interaction, true);

      const rows = await listWarnings(interaction.guild.id, target.id);
      if (!rows.length) return interaction.editReply(`✅ Tidak ada warning untuk <@${target.id}>.`);

      const lines = rows.slice(0, 15).map((w) => {
        const ts = Math.floor((Number(w.created_at || Date.now())) / 1000);
        const reason = safeText(w.reason || "—", 80);
        return `• **#${w.id}** — <t:${ts}:R> — ${reason} *(by <@${w.moderator_id}>)*`;
      });

      const emb = new EmbedBuilder()
        .setTitle("⚠️ Warning List")
        .setColor(0xff5252)
        .setDescription([`Target: <@${target.id}>`, "", ...lines, rows.length > 15 ? `\n…dan ${rows.length - 15} lainnya.` : ""].join("\n"))
        .setTimestamp();

      return interaction.editReply({ embeds: [emb], allowedMentions: { parse: [] } });
    }

    // ===================== /unwarn =====================
    if (interaction.isChatInputCommand() && interaction.commandName === "unwarn") {
      if (!interaction.guild) return safeReply(interaction, { content: "Guild only.", flags: MessageFlags.Ephemeral });

      const isMod =
        hasPerm(interaction.member, PermissionsBitField.Flags.ModerateMembers) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.Administrator);

      if (!isMod) return safeReply(interaction, { content: "❌ Butuh izin Moderate Members.", flags: MessageFlags.Ephemeral });

      const warnId = interaction.options.getInteger("id", true);
      await safeDefer(interaction, true);

      const changed = await removeWarningById(interaction.guild.id, warnId);
      if (!changed) return interaction.editReply("❌ Warning ID tidak ditemukan.");

      return interaction.editReply(`✅ Warning **#${warnId}** berhasil dihapus.`);
    }

    // ===================== TICKET: PANEL BUTTON -> OPEN MODAL

    // ===================== TICKET: PANEL BUTTON -> OPEN MODAL =====================
    if (interaction.isButton() && interaction.customId.startsWith("ticket:open:")) {
      if (!interaction.guild) {
        return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
      }
      const type = interaction.customId.split(":")[2] || "custom";
      return interaction.showModal(buildTicketModal(type));
    }

    // ===================== TICKET: MODAL SUBMIT -> CREATE CHANNEL =====================
    if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket:modal")) {
      if (!interaction.guild) {
        return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
      }

      const parts = interaction.customId.split(":");
      const type = parts[2] || "custom"; // supports both "ticket:modal" and "ticket:modal:<type>"
      const subject = (interaction.fields.getTextInputValue("title") || "").trim().slice(0, 80);
      const detail = (interaction.fields.getTextInputValue("content") || "").trim().slice(0, 800);

      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => { });

      // settings dari DB (ticket_setup)
      const settings = await getTicketSettings(interaction.guild.id).catch(() => null);
      const categoryId = settings?.category_id || requireEnv("TICKET_CATEGORY_ID");
      const staffRoleId = settings?.staff_role_id || requireEnv("TICKET_STAFF_ROLE_ID");

      if (!categoryId || !staffRoleId) {
        return interaction.editReply(
          "⚠️ Ticket belum dikonfigurasi. Jalankan /ticket_setup dan isi category + staff role (atau set TICKET_CATEGORY_ID & TICKET_STAFF_ROLE_ID)."
        );
      }

      // ✅ FIX: kalau user pernah delete manual, clean stale open tickets (channel sudah tidak ada)
      const openRow = await safeGet(
        `SELECT channel_id FROM tickets_custom WHERE guild_id=? AND owner_id=? AND closed_at IS NULL ORDER BY created_at DESC LIMIT 1`,
        [String(interaction.guild.id), String(interaction.user.id)]
      ).catch(() => null);
      if (openRow?.channel_id) {
        const ch = await interaction.guild.channels.fetch(String(openRow.channel_id)).catch(() => null);
        if (!ch) {
          await safeRun(
            `UPDATE tickets_custom SET closed_at=? WHERE guild_id=? AND channel_id=? AND closed_at IS NULL`,
            [Date.now(), String(interaction.guild.id), String(openRow.channel_id)]
          ).catch(() => null);
        }
      }

      const has = await userHasOpenTicket(interaction.guild.id, interaction.user.id);
      if (has) {
        return interaction.editReply("⚠️ Kamu masih punya ticket yang belum ditutup. Tutup dulu ya sebelum bikin ticket baru.");
      }

      const safeUser =
        (interaction.user.username || "user").toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 12) || "user";
      const chName = `ticket-${type}-${safeUser}`.slice(0, 90);

      const allowedTypes = ["complaint", "report", "donate", "partnership", "verification", "custom"];
      const safeType = allowedTypes.includes(type) ? type : "custom";

      const channel = await interaction.guild.channels.create({
        name: chName,
        parent: categoryId,
        topic: ticketMeta(safeType, interaction.user.id),
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks,
            ],
          },
          {
            id: staffRoleId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageMessages,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks,
            ],
          },
        ],
      });

      await safeRun(
        `INSERT INTO tickets_custom (guild_id, channel_id, owner_id, type, subject, created_at)
         VALUES (?,?,?,?,?,?)`,
        [String(interaction.guild.id), String(channel.id), String(interaction.user.id), safeType, safeText(subject, 80), Date.now()]
      ).catch(() => null);

      const mainEmbed = new EmbedBuilder()
        .setTitle(`🎫 TICKET ${ticketTypeLabel(safeType).toUpperCase()}`)
        .setColor(safeType === "report" ? 0xff5252 : EMBED_COLOR)
        .setDescription(
          [
            `👤 **Pengirim:** <@${interaction.user.id}>`,
            `🏷️ **Kategori:** ${ticketTypeLabel(safeType)}`,
            `📌 **Judul:** ${subject || "—"}`,
            "",
            "📝 **Detail:**",
            detail || "—",
          ].join("\n")
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket:claim").setLabel("Claim").setStyle(ButtonStyle.Primary).setEmoji("🧠"),
        new ButtonBuilder().setCustomId("ticket:close").setLabel("Close").setStyle(ButtonStyle.Secondary).setEmoji("🔒")
      );

      await channel.send({
        content: `<@&${staffRoleId}>`,
        embeds: [mainEmbed],
        components: [row],
        allowedMentions: { roles: [staffRoleId] },
      });

      return interaction.editReply(`✅ Ticket dibuat: ${channel}`);
    }

    // ===================== TICKET: CLAIM / CLOSE =====================
    // ===================== TICKET: CLAIM / CLOSE =====================
    if (interaction.isButton() && (interaction.customId === "ticket:claim" || interaction.customId === "ticket:close")) {
      if (!interaction.guild || !interaction.channel) {
        return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
      }

      const topic = interaction.channel.topic || "";
      if (!topic.includes("[TICKET:") || !topic.includes("[OWNER:")) {
        return interaction.reply({ content: "⚠️ Tombol ini hanya untuk channel ticket.", flags: MessageFlags.Ephemeral });
      }

      const settings = await getTicketSettings(interaction.guild.id).catch(() => null);
      const staffRoleId = settings?.staff_role_id || requireEnv("TICKET_STAFF_ROLE_ID");

      const isStaff = Boolean(staffRoleId && interaction.member?.roles?.cache?.has?.(staffRoleId));
      const ownerId = getTicketOwnerIdFromTopic(topic);
      const isOwner =
        ownerId &&
        ownerId.split(",").map(x => x.trim()).includes(interaction.user.id);


      // CLAIM (staff only)
      if (interaction.customId === "ticket:claim") {
        await interaction.deferUpdate().catch(() => { });
        if (!isStaff) {
          return interaction.followUp({ content: "❌ Khusus staff.", flags: MessageFlags.Ephemeral }).catch(() => { });
        }

        const already = getClaimedFromTopic(topic);
        if (already) {
          return interaction.followUp({ content: `⚠️ Ticket ini sudah di-claim oleh <@${already}>.`, flags: MessageFlags.Ephemeral }).catch(() => { });
        }

        await interaction.channel.setTopic(setClaimedTopic(topic, interaction.user.id)).catch(() => { });

        const newRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("ticket:claim").setLabel("Claimed").setStyle(ButtonStyle.Secondary).setEmoji("🧠").setDisabled(true),
          new ButtonBuilder().setCustomId("ticket:close").setLabel("Close").setStyle(ButtonStyle.Secondary).setEmoji("🔒")
        );

        await interaction.message.edit({ components: [newRow] }).catch(() => { });
        await interaction.channel.send(`🧠 Ticket di-claim oleh <@${interaction.user.id}>.`).catch(() => { });

        // ===================== LOG TICKET: CLAIMED (ADD-ONLY) =====================
        (async () => {
          try {
            const topicNow = String(interaction.channel.topic || "");
            const ownerId2 = getTicketOwnerIdFromTopic(topicNow);
            const type2 = getTicketTypeFromTopic(topicNow);
            const emb = new EmbedBuilder()
              .setTitle("🧠 Ticket Di-Claim")
              .setColor(EMBED_COLOR)
              .setDescription(
                [
                  `📌 **Channel:** <#${interaction.channel.id}>`,
                  ownerId2 ? `👤 **Owner:** <@${ownerId2}>` : "👤 **Owner:** —",
                  type2 ? `🏷️ **Tipe:** ${ticketTypeLabel(type2)}` : "🏷️ **Tipe:** —",
                  `🧠 **Di-claim oleh:** <@${interaction.user.id}>`,
                ].join("\n")
              )
              .setTimestamp();
            await sendTicketLogEmbed(interaction.guild, emb);
          } catch { }
        })();

        return;
      }

      // CLOSE (owner OR staff)
      if (interaction.customId === "ticket:close") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => { });

        if (!isOwner && !isStaff) {
          return interaction.editReply("❌ Kamu bukan owner ticket atau staff.").catch(() => { });
        }

        // ✅ update DB dulu biar user bisa bikin ticket baru
        await safeRun(
          `UPDATE tickets_custom SET closed_at=? WHERE guild_id=? AND channel_id=? AND closed_at IS NULL`,
          [Date.now(), String(interaction.guild.id), String(interaction.channel.id)]
        ).catch(() => null);

        // optional transcript ke log channel
        // optional transcript ke log channel
        const logCh = await getTicketLogChannel(interaction.guild).catch(() => null);
        if (logCh) {
          const t = await buildTicketTranscript(interaction.channel).catch(() => null);

          // t bisa: string / Buffer / { attachment, name } / AttachmentBuilder
          let filePayload = null;

          if (typeof t === "string") {
            filePayload = { attachment: Buffer.from(t, "utf8"), name: `ticket-${interaction.channel.id}.html` };
          } else if (Buffer.isBuffer(t)) {
            filePayload = { attachment: t, name: `ticket-${interaction.channel.id}.html` };
          } else if (t && typeof t === "object" && (t.attachment || t.data)) {
            // { attachment, name } style
            filePayload = t.attachment
              ? { attachment: t.attachment, name: t.name || `ticket-${interaction.channel.id}.html` }
              : { attachment: t.data, name: t.name || `ticket-${interaction.channel.id}.html` };
          } else if (t) {
            // fallback biar gak error
            filePayload = { attachment: Buffer.from(JSON.stringify(t, null, 2), "utf8"), name: `ticket-${interaction.channel.id}.json` };
          }


          // ===================== TRANSCRIPT PREFER TXT (ADD-ONLY) =====================
          // buildTicketTranscript() ngembaliin { txtBuffer, htmlBuffer, count }
          if (t && typeof t === "object" && Buffer.isBuffer(t.txtBuffer)) {
            filePayload = { attachment: t.txtBuffer, name: `ticket-${interaction.channel.id}.txt` };
          } else if (t && typeof t === "object" && Buffer.isBuffer(t.htmlBuffer)) {
            // fallback html kalau txt gak ada
            filePayload = { attachment: t.htmlBuffer, name: `ticket-${interaction.channel.id}.html` };
          }
          // ambil info dari channel.topic (tanpa DB, tanpa ubah alur lain)
          // meta dari topic
          const meta = (() => {
            try { return JSON.parse(interaction.channel.topic || "{}"); }
            catch { return {}; }
          })();
          // ===================== LOG TICKET META BACKFILL (ADD-ONLY) =====================
          try {
            const topicRaw = String(interaction.channel.topic || "");
            const ownerFromTopic = getTicketOwnerIdFromTopic(topicRaw);
            const typeFromTopic = getTicketTypeFromTopic(topicRaw);
            const claimedFromTopic = getClaimedFromTopic(topicRaw);

            if (!meta.opener && ownerFromTopic) meta.opener = ownerFromTopic;
            if (!meta.type && typeFromTopic) meta.type = typeFromTopic;
            if (!meta.claimed_by && claimedFromTopic) meta.claimed_by = claimedFromTopic;

            // Ambil subject/created dari DB (karena topic lama cuma simpan OWNER/TYPE)
            const dbTicket = await safeGet(
              `SELECT owner_id, type, subject, created_at
             FROM tickets_custom
             WHERE guild_id=? AND channel_id=?
             ORDER BY created_at DESC
             LIMIT 1`,
              [String(interaction.guild.id), String(interaction.channel.id)]
            ).catch(() => null);

            if (dbTicket) {
              if (!meta.opener && dbTicket.owner_id) meta.opener = String(dbTicket.owner_id);
              if (!meta.type && dbTicket.type) meta.type = String(dbTicket.type);
              if (!meta.subject && dbTicket.subject) meta.subject = String(dbTicket.subject);
              if (!meta.created_at && dbTicket.created_at) meta.created_at = Number(dbTicket.created_at);
            }
          } catch { }


          const ownerId = meta.opener || meta.opener_id || null;
          const type = meta.type || "—";
          const subject = meta.subject || "—";
          const claimedBy = meta.claimed_by || null;

          const exportedCount =
            (t && typeof t === "object" && typeof t.count === "number") ? t.count : "—";

          const createdAt = meta.created_at || null;
          const closedAt = Date.now();

          const fmt = (ms) => ms ? `<t:${Math.floor(ms / 1000)}:F>` : "—";

          const logEmbed = new EmbedBuilder()
            .setTitle("🧾 Ticket Closed")
            .setColor(EMBED_COLOR)
            .addFields(
              { name: "Channel", value: `#${interaction.channel.name}\n(${interaction.channel.id})`, inline: true },
              { name: "Type", value: String(type), inline: true },
              { name: "Owner", value: ownerId ? `<@${ownerId}>` : "—", inline: true },
              { name: "Subject", value: String(subject), inline: false },
              { name: "Claimed by", value: claimedBy ? `<@${claimedBy}>` : "—", inline: true },
              { name: "Closed by", value: `<@${interaction.user.id}>`, inline: true },
              { name: "Messages exported", value: String(exportedCount), inline: true },
              { name: "Timeline", value: `Created: ${fmt(createdAt)}\nClosed: ${fmt(closedAt)}`, inline: false }
            )
            .setTimestamp();

          // ===================== TXT TRANSCRIPT (SIMPLE) =====================
          let transcriptTxt = "";
          let messageCount = 0;

          try {
            let lastId;
            const messages = [];

            while (true) {
              const fetched = await interaction.channel.messages.fetch({
                limit: 100,
                before: lastId,
              });

              if (fetched.size === 0) break;

              messages.push(...fetched.values());
              lastId = fetched.last().id;
              if (messages.length >= 1000) break; // safety
            }

            messages.reverse();

            for (const m of messages) {
              const time = new Date(m.createdTimestamp).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
              const author = `${m.author.tag}`;
              const content = m.content || "[attachment/embed]";
              transcriptTxt += `[${time}] ${author}: ${content}\n`;
              messageCount++;
            }
          } catch (e) {
            transcriptTxt = "Gagal mengambil transcript.";
          }

          filePayload = {
            attachment: Buffer.from(transcriptTxt, "utf8"),
            name: `ticket-${interaction.channel.id}.txt`,
          };

          await logCh.send({
            embeds: [logEmbed],
            files: filePayload ? [filePayload] : [],
            allowedMentions: { parse: [] },
          }).catch(() => null);

        }
        await interaction.editReply("✅ Ticket ditutup. Channel akan dihapus.").catch(() => { });
        setTimeout(() => interaction.channel?.delete("Ticket closed").catch(() => { }), 1500);
        return;
      }
    }

    // ===================== faq (Knowledge Base) =====================
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.commandName;

      // Admin-only helpers
      const isfaqAdmin =
        !!interaction.member &&
        (isBotOwner(interaction.user.id) ||
          hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild) ||
          hasPerm(interaction.member, PermissionsBitField.Flags.Administrator));

      if (cmd === "faq_add" || cmd === "faq_add") {
        if (!interaction.guild) return interaction.reply({ content: "Guild only.", ephemeral: true });
        if (!isfaqAdmin) return interaction.reply({ content: "❌ Admin/Staff Only.", ephemeral: true });

        const title = interaction.options.getString("title", true);
        const content = interaction.options.getString("content", true);
        const tags = interaction.options.getString("tags", false);

        await interaction.deferReply({ ephemeral: true });
        const id = await faqAdd(interaction.guild.id, title, content, tags, interaction.user.id);
        return interaction.editReply(`✅ Artikel faq Ditambahkan: **#${id}**`);
      }

      if (cmd === "faq_edit") {
        if (!interaction.guild) return interaction.reply({ content: "Guild only.", ephemeral: true });
        if (!isfaqAdmin) return interaction.reply({ content: "❌ Admin/Staff Only.", ephemeral: true });

        const id = interaction.options.getInteger("id", true);
        const title = interaction.options.getString("title", false);
        const content = interaction.options.getString("content", false);
        const tags = interaction.options.getString("tags", false);

        await interaction.deferReply({ ephemeral: true });
        const ok = await faqUpdate(interaction.guild.id, id, { title, content, tags });
        if (!ok) return interaction.editReply("❌ Artikel Tidak Ditemukan.");
        return interaction.editReply(`✅ Artikel faq **#${id}** Berhasil Diperbarui.`);
      }

      if (cmd === "faq_delete") {
        if (!interaction.guild) return interaction.reply({ content: "Guild only.", ephemeral: true });
        if (!isfaqAdmin) return interaction.reply({ content: "❌ Admin/Staff Only.", ephemeral: true });

        const id = interaction.options.getInteger("id", true);
        await interaction.deferReply({ ephemeral: true });

        const cur = await faqGet(interaction.guild.id, id);
        if (!cur) return interaction.editReply("❌ Artikel Tidak Ditemukan.");

        await faqDelete(interaction.guild.id, id);
        return interaction.editReply(`🗑️ Artikel faq **#${id}** Dihapus.`);
      }

      if (cmd === "faq_view") {
        const id = interaction.options.getInteger("id", true);
        const item = await faqGet(interaction.guildId, id);

        if (!item) {
          return interaction.reply({ content: "❌ FAQ Tidak Ditemukan.", ephemeral: true });
        }

        const e = buildfaqItemEmbed(interaction.guild, item); // <-- PASTIIN INI
        return interaction.reply({ embeds: [e], ephemeral: false });
      }

      if (cmd === "faq_search") {
        if (!interaction.guild) return interaction.reply({ content: "Guild only.", ephemeral: true });
        const query = interaction.options.getString("query", true);

        await interaction.deferReply({ ephemeral: true });
        const results = await faqSearch(interaction.guild.id, query, 15);

        if (!results.length) {
          return interaction.editReply("🔎 Tidak Ada Hasil. Coba Kata Kunci Lain.");
        }

        const row = buildfaqSelect(results, "Pilih Hasil Pencarian");
        const e = new EmbedBuilder()
          .setTitle("🔎 Hasil Pencarian faq")
          .setColor(EMBED_COLOR)
          .setDescription(
            results
              .slice(0, 10)
              .map((r) => `• **#${r.id}** — ${r.title}${r.tags ? `  _( ${r.tags} )_` : ""}`)
              .join("\n")
          )
          .setFooter({ text: `${interaction.guild.name} • Knowledge Base` });

        return interaction.editReply({ embeds: [e], components: [row] });
      }

      if (cmd === "faq_list") {
        if (!interaction.guild) return interaction.reply({ content: "Guild only.", ephemeral: true });
        if (!isfaqAdmin) return interaction.reply({ content: "❌ Admin/Staff Only.", ephemeral: true });

        await interaction.deferReply({ ephemeral: true });
        const items = await faqListLatest(interaction.guild.id, 20);
        if (!items.length) return interaction.editReply("📚 Belum Ada Artikel faq.");

        const e = new EmbedBuilder()
          .setTitle("📚 Daftar faq (Terbaru)")
          .setColor(EMBED_COLOR)
          .setDescription(items.map((it) => `• **#${it.id}** — ${it.title}${it.tags ? `  _( ${it.tags} )_` : ""}`).join("\n"))
          .setFooter({ text: `${interaction.guild.name} • Knowledge Base` });

        return interaction.editReply({ embeds: [e] });
      }

      if (cmd === "faq_panel") {
        if (!interaction.guild) return interaction.reply({ content: "Guild only.", ephemeral: true });
        if (!isfaqAdmin) return interaction.reply({ content: "❌ Admin/Staff Only.", ephemeral: true });

        await interaction.deferReply({ ephemeral: true });

        const targetCh =
          interaction.options.getChannel("channel", false) || interaction.channel;

        const items = await faqListForPanel(interaction.guild.id, 25);
        const row = buildfaqSelect(items, "Pilih Topik");

        await targetCh.send({
          components: buildfaqPanelComponentsV2(interaction.guild, row),
          flags: MessageFlags.IsComponentsV2,
        });
        return interaction.editReply("✅ Panel Knowledge Base Berhasil Dikirim.");
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (!interaction.guild) return;
      if (interaction.customId === "faq:open") {
        const id = Number(interaction.values?.[0] || 0);
        if (!id) {
          return interaction.reply({ content: "📚 Belum Ada Artikel faq.", flags: MessageFlags.Ephemeral });
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => { });
        const item = await faqGet(interaction.guild.id, id);
        if (!item) return interaction.editReply("❌ Artikel Tidak Ditemukan.");
        const e = buildfaqItemEmbed(interaction.guild, item);
        return interaction.editReply({ embeds: [e] });
      }
    }


    // ===================== /giveaway_reroll =====================
    if (interaction.isChatInputCommand() && interaction.commandName === "giveaway_end") {
      if (!interaction.guild) {
        return interaction.reply({ content: "Guild only.", ephemeral: true });
      }

      const isAllowed =
        isBotOwner(interaction.user.id) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.Administrator);

      if (!isAllowed) {
        return interaction.reply({ content: "❌ Tidak punya izin.", ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const gid = interaction.options.getInteger("id", true);
      const g = await getGiveaway(gid);
      if (!g || g.guild_id !== interaction.guild.id) {
        return interaction.editReply("❌ Giveaway tidak ditemukan.");
      }
      if (g.is_ended) {
        return interaction.editReply("⚠️ Giveaway ini sudah berakhir.");
      }

      await finalizeGiveaway(g, interaction.guild);
      return interaction.editReply(`✅ Giveaway **#${gid}** berhasil diakhiri.`);
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "giveaway_list") {
      if (!interaction.guild) {
        return interaction.reply({ content: "Guild only.", ephemeral: true });
      }

      const isAllowed =
        isBotOwner(interaction.user.id) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.Administrator);

      if (!isAllowed) {
        return interaction.reply({ content: "❌ Tidak punya izin.", ephemeral: true });
      }

      const rows = await listActiveGiveaways(interaction.guild.id);
      if (!rows.length) {
        return interaction.reply({ content: "Belum ada giveaway yang aktif.", ephemeral: true });
      }

      const desc = rows
        .map((g) => `**#${g.id}** — ${g.prize}\nEnds <t:${Math.floor(g.end_at / 1000)}:R> • <#${g.channel_id}>`)
        .join("\n\n");

      const embed = new EmbedBuilder()
        .setTitle("🎁 Active Giveaways")
        .setColor(0x8b5cf6)
        .setDescription(desc)
        .setFooter({ text: "Mystral Academy • Giveaway" });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "giveaway_entries") {
      if (!interaction.guild) {
        return interaction.reply({ content: "Guild only.", ephemeral: true });
      }

      const isAllowed =
        isBotOwner(interaction.user.id) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.Administrator);

      if (!isAllowed) {
        return interaction.reply({ content: "❌ Tidak punya izin.", ephemeral: true });
      }

      const gid = interaction.options.getInteger("id", true);
      const g = await getGiveaway(gid);
      if (!g || g.guild_id !== interaction.guild.id) {
        return interaction.reply({ content: "❌ Giveaway tidak ditemukan.", ephemeral: true });
      }

      const rows = await listGiveawayEntries(gid);
      if (!rows.length) {
        return interaction.reply({ content: `Belum ada peserta di giveaway **#${gid}**.`, ephemeral: true });
      }

      const shown = rows.slice(0, 50);
      const desc = shown
        .map((row, index) => `${index + 1}. <@${row.user_id}>`)
        .join("\n");
      const extra = rows.length > shown.length ? `\n\n…dan ${rows.length - shown.length} peserta lainnya.` : "";

      const embed = new EmbedBuilder()
        .setTitle(`🎟️ Giveaway Entries #${gid}`)
        .setColor(EMBED_COLOR)
        .setDescription(`${desc}${extra}`)
        .setFooter({ text: `Total peserta: ${rows.length}` });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "giveaway_delete") {
      if (!interaction.guild) {
        return interaction.reply({ content: "Guild only.", ephemeral: true });
      }

      const isAllowed =
        isBotOwner(interaction.user.id) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.Administrator);

      if (!isAllowed) {
        return interaction.reply({ content: "❌ Tidak punya izin.", ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const gid = interaction.options.getInteger("id", true);
      const g = await getGiveaway(gid);
      if (!g || g.guild_id !== interaction.guild.id) {
        return interaction.editReply("❌ Giveaway tidak ditemukan.");
      }

      const ch = await getTextChannelOrNull(interaction.guild, g.channel_id);
      if (ch && g.message_id) {
        const msg = await ch.messages.fetch(g.message_id).catch(() => null);
        if (msg) await msg.delete().catch(() => { });
      }

      await deleteGiveaway(gid);
      return interaction.editReply(`🗑️ Giveaway **#${gid}** berhasil dihapus.`);
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "giveaway_reroll") {
      if (!interaction.guild) {
        return interaction.reply({ content: "Guild only.", ephemeral: true });
      }

      const isAllowed =
        isBotOwner(interaction.user.id) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild);

      if (!isAllowed) {
        return interaction.reply({ content: "❌ Tidak punya izin.", ephemeral: true });
      }

      await interaction.deferReply();

      const gid = interaction.options.getInteger("id", true);
      const winnersOpt = interaction.options.getInteger("winners", false);

      const g = await getGiveaway(gid);
      if (!g) return interaction.editReply("❌ Giveaway tidak ditemukan.");
      if (g.guild_id !== interaction.guild.id) return interaction.editReply("❌ Giveaway tidak ditemukan di server ini.");
      if (!g.is_ended) return interaction.editReply("⚠️ Giveaway belum berakhir.");

      const winners = await rerollGiveaway(gid, winnersOpt);
      if (!winners || !winners.length) {
        return interaction.editReply("⚠️ Tidak ada peserta untuk direroll.");
      }

      const text = winners.map(id => `<@${id}>`).join(", ");

      await interaction.editReply({
        content: `🔄 **REROLL GIVEAWAY**\n🎁 **${g.prize}**\n🏆 **Pemenang baru:** ${text}`,
      });
    }

    if (interaction.isStringSelectMenu()) {
      const { customId, values, guild, member } = interaction;

      if (!guild || !member) {
        return safeReply(interaction, {
          content: "⚠️ Interaction ini hanya bisa dipakai di server.",
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        // ===== AGE (1 role only) =====
        if (customId === "self:age") {
          const toRemove = member.roles.cache.filter((r) => SELF_AGE_IDS.includes(r.id));
          if (toRemove.size) await member.roles.remove(toRemove);

          if (values.length) await member.roles.add(values[0]);

          return safeReply(interaction, {
            content: "✅ **Age role** berhasil diperbarui.",
            flags: MessageFlags.Ephemeral,
          });
        }

        // ===== STATUS (1 role only) =====
        if (customId === "self:status") {
          const toRemove = member.roles.cache.filter((r) => SELF_STATUS_IDS.includes(r.id));
          if (toRemove.size) await member.roles.remove(toRemove);

          if (values.length) {
            await member.roles.add(values[0]);
            return safeReply(interaction, {
              content: "💖 **Status role** diperbarui.",
              flags: MessageFlags.Ephemeral,
            });
          }

          return safeReply(interaction, {
            content: "🧹 **Status role** dihapus.",
            flags: MessageFlags.Ephemeral,
          });
        }

        // ===== REGION (1 role only) =====
        if (customId === "self:region") {
          const toRemove = member.roles.cache.filter((r) => SELF_REGION_IDS.includes(r.id));
          if (toRemove.size) await member.roles.remove(toRemove);

          if (values.length) {
            await member.roles.add(values[0]);
            return safeReply(interaction, {
              content: "🗺️ **Region role** diperbarui.",
              flags: MessageFlags.Ephemeral,
            });
          }

          return safeReply(interaction, {
            content: "🧹 **Region role** dihapus.",
            flags: MessageFlags.Ephemeral,
          });
        }

        // ===== PING (MULTI) =====
        if (customId === "self:ping") {
          const toRemove = member.roles.cache.filter((r) => SELF_PING_IDS.includes(r.id));
          if (toRemove.size) await member.roles.remove(toRemove);

          if (values.length) await member.roles.add(values);

          return safeReply(interaction, {
            content: "🔔 **Ping roles** diperbarui.",
            flags: MessageFlags.Ephemeral,
          });
        }

        // ===== INTEREST (MULTI, per kategori) =====
        if (customId.startsWith("self:int_")) {
          const optionsForThisMenu = INTEREST_MENU_MAP[customId] || [];
          const idsForThisMenu = optionsForThisMenu.map((x) => x.value);

          const toRemove = member.roles.cache.filter((r) => idsForThisMenu.includes(r.id));
          if (toRemove.size) await member.roles.remove(toRemove);

          if (values.length) await member.roles.add(values);

          return safeReply(interaction, {
            content: "🎯 **Interest roles** diperbarui.",
            flags: MessageFlags.Ephemeral,
          });
        }

        return safeReply(interaction, {
          content: "⚠️ Select menu tidak dikenali.",
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        console.error("[SELF ROLE ERROR]", err);
        return safeReply(interaction, {
          content: "❌ Gagal mengubah role. Cek permission bot.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // ===================== SLASH =====================
    if (interaction.isChatInputCommand()) {
      const name = interaction.commandName;

      // ===================== CHANNEL RESTRICTION (SLASH) =====================
      // 1. Tarot commands lock -> 1516259143994839050
      if (name === "tarot") {
        const targetCh = "1516259143994839050";
        if (interaction.channelId !== targetCh) {
          return safeReply(interaction, {
            content: `❌ **/tarot** hanya dapat digunakan di channel <#${targetCh}>!`,
            flags: MessageFlags.Ephemeral
          });
        }
      }

      // 2. AFK commands lock -> 1466628064002707518
      if (name === "afk") {
        const targetCh = "1466628064002707518";
        if (interaction.channelId !== targetCh) {
          return safeReply(interaction, {
            content: `❌ **/afk** hanya dapat digunakan di channel <#${targetCh}>!`,
            flags: MessageFlags.Ephemeral
          });
        }
      }


      if (name === "ping") return safeReply(interaction, { content: `🏓 pong! ${client.ws.ping}ms` });

      if (name === "tarot") {
        const sub = interaction.options.getSubcommand();
        const username = interaction.user.username;
        const userId = interaction.user.id;

        if (sub === "pull") {
          const todayStr = wibDayKey();
          const tarotUser = await getOrInitTarotUser(userId, username);
          if (tarotUser.last_reading_date === todayStr) {
            return safeReply(interaction, {
              content: [
                `╭・<:pink_cards1:1510057886795956235> **Daily Tarot — Sudah Terbuka**`,
                `├・Energi spiritualmu hari ini telah terbaca sepenuhnya.`,
                `├・*Arcane Deck* baru bisa kamu panggil kembali esok hari.`,
                `╰・🕒 *Penyelarasan kartu disetel ulang setiap pukul 00:00 WIB*`
              ].join("\n"),
              flags: MessageFlags.Ephemeral
            });
          }

          return safeReply(interaction, {
            embeds: [buildTarotMainEmbed()],
            components: [
              buildTarotMainButtons(userId),
              buildTarotMainButtonsRow2(userId)
            ]
          });
        }

        if (sub === "profile") {
          const targetUser = interaction.options.getUser("user") || interaction.user;
          await safeDefer(interaction, false);
          const emb = await buildTarotProfileEmbed(targetUser, client);
          return interaction.editReply({ embeds: [emb] });
        }

        if (sub === "leaderboard") {
          await safeDefer(interaction, false);
          const emb = await buildTarotLeaderboardEmbed(interaction.guild);
          return interaction.editReply({ embeds: [emb] });
        }

        if (sub === "collection") {
          const targetUser = interaction.options.getUser("user") || interaction.user;
          await safeDefer(interaction, false);
          const emb = await buildTarotCollectionEmbed(targetUser);
          return interaction.editReply({ embeds: [emb] });
        }
      }
      if (name === "backup_now") {
        if (!isBotOwner(interaction.user.id)) {
          return safeReply(interaction, {
            content: "Command ini khusus bot owner.",
            flags: MessageFlags.Ephemeral,
          });
        }

        await safeDefer(interaction, true);
        const result = await backupDatabase(`manual_${interaction.user.id}`);
        if (!result?.ok) {
          return interaction.editReply("Backup gagal. Cek console log untuk detail error.");
        }

        const fileName = path.basename(result.path);
        const size = fs.existsSync(result.path) ? formatBytes(fs.statSync(result.path).size) : "unknown";

        const dmEmbed = new EmbedBuilder()
          .setTitle("💾 Database Backup Successful")
          .setAuthor({ name: "Requested by Cyizzie", iconURL: interaction.user.displayAvatarURL({ extension: "png" }) })
          .setDescription([
            "Backup database bot kamu telah berhasil dibuat dan disimpan di server.",
            "",
            `📁 **File Name:** \`${fileName}\``,
            `⚖️ **File Size:** \`${size}\``,
            `📅 **Timestamp:** \`${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB\``
          ].join("\n"))
          .setColor(0x2f3136)
          .setFooter({ text: "Mystral Academy • Backup System" })
          .setTimestamp();

        const file = new AttachmentBuilder(result.path, { name: fileName });

        let dmSent = false;
        try {
          await interaction.user.send({ embeds: [dmEmbed], files: [file] });
          dmSent = true;
        } catch (dmErr) {
          console.error("[BACKUP DM FAILED]", dmErr);
        }

        if (dmSent) {
          return interaction.editReply(`✅ Backup database berhasil dibuat dan telah dikirim ke DM kamu: \`${fileName}\` (${size}).`);
        } else {
          return interaction.editReply(`⚠️ Backup database berhasil dibuat di server: \`${fileName}\` (${size}), tetapi gagal mengirim ke DM kamu (pastikan DM kamu terbuka).`);
        }
      }

      if (name === "botstatus") {
        await safeDefer(interaction, true);

        const started = Date.now();
        const dbRow = await safeGet("SELECT 1 AS ok");
        const dbOk = dbRow?.ok === 1;
        const dbLatency = Date.now() - started;
        const commandCount = await countRegisteredCommands(client, interaction.guildId);
        const dbSize = fs.existsSync(SQLITE_PATH) ? formatBytes(fs.statSync(SQLITE_PATH).size) : "not found";

        const embed = new EmbedBuilder()
          .setTitle("Bot Status")
          .setColor(dbOk ? EMBED_COLOR : 0xef4444)
          .addFields(
            { name: "Database", value: `${dbOk ? "OK" : "FAIL"} (${dbLatency}ms)\nEngine: \`${DB_ENGINE}\`\nSize: \`${dbSize}\``, inline: true },
            { name: "Ping", value: `WS: \`${client.ws.ping}ms\``, inline: true },
            { name: "Uptime", value: `\`${formatDuration(client.uptime)}\``, inline: true },
            { name: "Commands", value: commandCount == null ? "`unknown`" : `\`${commandCount}\` registered`, inline: true },
            { name: "Process", value: `Node: \`${process.version}\`\nMemory: \`${formatBytes(process.memoryUsage().rss)}\``, inline: true }
          )
          .setFooter({ text: `${BRAND_NAME} • health check` })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (name === "lastseen") {
        const user = interaction.options.getUser("user", true);

        const row = await safeGet(
          "SELECT last_seen, msg_total FROM user_activity WHERE user_id = ?",
          [user.id]
        );

        if (!row || !row.last_seen) {
          return safeReply(interaction, { content: `Belum ada data aktivitas untuk <@${user.id}>.`, flags: MessageFlags.Ephemeral });
        }

        const ts = Math.floor(row.last_seen / 1000);
        return safeReply(interaction, {
          content: `🕒 **Last seen** <@${user.id}>: <t:${ts}:R>\n💬 Total pesan tercatat: **${row.msg_total}**`,
          flags: MessageFlags.Ephemeral,
        });
      }
      if (name === "calc") {
        const expr = interaction.options.getString("expr", true);
        const out = calcSafe(expr);
        if (out === null) {
          return safeReply(interaction, { content: "❌ Ekspresi tidak valid. Contoh: `(10+2)*3/4`", flags: MessageFlags.Ephemeral });
        }
        return safeReply(interaction, { content: `🧮 \`${expr}\` = **${out}**` });
      }

      if (name === "tebakangka") {
        startGuessNumberGame(interaction.guild.id, interaction.channel.id, interaction.user.id);
        return safeReply(interaction, { content: guessStartText() });
      }

      if (name === "hint") {
        const game = getGuessNumberGame(interaction.guild.id, interaction.channel.id);
        if (!game) {
          return safeReply(interaction, {
            content: "Belum ada game tebak angka di channel ini. Mulai dengan `/tebakangka` atau `cta`.",
            flags: MessageFlags.Ephemeral,
          });
        }
        return safeReply(interaction, { content: guessHintText(game) });
      }

      if (name === "stopgame") {
        const game = getGuessNumberGame(interaction.guild.id, interaction.channel.id);
        const canStop =
          hasPerm(interaction.member, PermissionsBitField.Flags.ManageMessages) ||
          game?.starterId === interaction.user.id;
        if (!canStop) {
          return safeReply(interaction, {
            content: "Kamu hanya bisa stop game yang kamu mulai, atau butuh izin `Manage Messages`.",
            flags: MessageFlags.Ephemeral,
          });
        }
        const stopped = stopGuessNumberGame(interaction.guild.id, interaction.channel.id);
        return safeReply(interaction, {
          content: stopped ? "🛑 Game tebak angka dihentikan." : "Tidak ada game tebak angka yang sedang berjalan di channel ini.",
          flags: stopped ? undefined : MessageFlags.Ephemeral,
        });
      }

      // ===================== LEADERBOARD COMMANDS =====================
      if (name === "leaderboard") {
        const sub = interaction.options.getSubcommand();

        if (sub === "tebakangka") {
          return safeReply(interaction, {
            content: await guessNumberLeaderboardText(interaction.guild.id),
            allowedMentions: { parse: [] },
          });
        }

        if (sub === "support") {
          const isAllowed = isBotOwner(interaction.user.id) || hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild);
          if (!isAllowed) {
            return safeReply(interaction, {
              content: "❌ Kamu tidak memiliki izin untuk mengirim leaderboard.",
              flags: MessageFlags.Ephemeral
            });
          }

          const targetChannel = interaction.options.getChannel("channel");
          const destChannel = targetChannel || interaction.channel;
          if (!destChannel.isTextBased()) {
            return safeReply(interaction, {
              content: "❌ Channel target harus berupa text-channel.",
              flags: MessageFlags.Ephemeral
            });
          }

          await safeDefer(interaction, true);

          const embed = await buildSupportEmbed();
          const msg = await destChannel.send({ embeds: [embed] });

          await setMetaText("support_live_channel_id", destChannel.id);
          await setMetaText("support_live_message_id", msg.id);

          return interaction.editReply({
            content: `✅ Leaderboard support berhasil dikirim ke <#${destChannel.id}>.`
          });
        }

        if (sub === "recap") {
          const isAllowed = isBotOwner(interaction.user.id) || hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild);
          if (!isAllowed) {
            return safeReply(interaction, {
              content: "❌ Kamu tidak memiliki izin untuk mengirim leaderboard.",
              flags: MessageFlags.Ephemeral
            });
          }

          const targetChannel = interaction.options.getChannel("channel");
          const destChannel = targetChannel || interaction.channel;
          if (!destChannel.isTextBased()) {
            return safeReply(interaction, {
              content: "❌ Channel target harus berupa text-channel.",
              flags: MessageFlags.Ephemeral
            });
          }

          await safeDefer(interaction, true);

          const now = Date.now();
          const wib = new Date(now + 7 * 60 * 60 * 1000);
          const currentMonth = wib.getMonth() + 1;
          const currentYear = wib.getFullYear();

          const month = interaction.options.getInteger("month") || currentMonth;
          const year = interaction.options.getInteger("year") || currentYear;

          const monthsIndo = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
          ];
          const monthLabel = monthsIndo[month - 1] || `Bulan ${month}`;

          const embed = await buildMonthlyRecapEmbed(month, year);
          const msg = await destChannel.send({ embeds: [embed] });

          if (month === currentMonth && year === currentYear) {
            await setMetaText("recap_live_channel_id", destChannel.id);
            await setMetaText("recap_live_message_id", msg.id);
          }

          return interaction.editReply({
            content: `✅ Leaderboard recap untuk **${monthLabel} ${year}** berhasil dikirim ke <#${destChannel.id}>.`
          });
        }
      }

      // ===================== SUPPORT ADMIN COMMANDS =====================
      if (name === "support_admin") {
        const isAllowed = isBotOwner(interaction.user.id) || hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild);
        if (!isAllowed) {
          return safeReply(interaction, {
            content: "❌ Hanya Owner / Admin yang dapat menjalankan perintah ini.",
            flags: MessageFlags.Ephemeral
          });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === "add") {
          const user = interaction.options.getUser("user");
          const usernameStr = interaction.options.getString("username");
          const type = interaction.options.getString("type", true);
          const amount = interaction.options.getInteger("amount", true);

          if (!user && !usernameStr) {
            return safeReply(interaction, {
              content: "❌ Kamu harus mengisi opsi `user` atau `username`.",
              flags: MessageFlags.Ephemeral
            });
          }

          const targetUserId = user ? user.id : usernameStr.toLowerCase().replace(/[^a-z0-9_]/g, "");
          const targetUsername = user ? user.username : usernameStr;
          const now = Date.now();

          await safeDefer(interaction, true);

          await safeRun(
            `INSERT INTO support_leaderboard (user_id, type, username, amount, updated_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(user_id, type) DO UPDATE SET
               username = excluded.username,
               amount = excluded.amount,
               updated_at = excluded.updated_at`,
            [targetUserId, type, targetUsername, amount, now]
          );

          return interaction.editReply({
            content: `✅ Kontribusi berhasil ditambahkan/diperbarui untuk **${targetUsername}** (${type}) senilai **Rp ${amount.toLocaleString("id-ID")}**.`
          });
        }

        if (sub === "remove") {
          const target = interaction.options.getString("target", true);
          const type = interaction.options.getString("type", true);

          await safeDefer(interaction, true);

          const res = await safeRun(
            "DELETE FROM support_leaderboard WHERE (user_id = ? OR username = ?) AND type = ?",
            [target, target, type]
          );

          if (res?.changes > 0) {
            return interaction.editReply({
              content: `✅ Kontribusi (${type}) untuk target **${target}** berhasil dihapus.`
            });
          } else {
            return interaction.editReply({
              content: `⚠️ Data kontribusi (${type}) untuk target **${target}** tidak ditemukan.`
            });
          }
        }

        if (sub === "list") {
          await safeDefer(interaction, true);

          const list = await safeAll("SELECT * FROM support_leaderboard ORDER BY type DESC, amount DESC");
          if (!list.length) {
            return interaction.editReply({ content: "📭 Database support_leaderboard kosong." });
          }

          let text = "📋 **List Kontributor Support (Raw Database):**\n\n";
          const sponsors = list.filter(x => x.type === "sponsor");
          const donaturs = list.filter(x => x.type === "donatur");

          text += "**⭐ SPONSORS:**\n";
          if (sponsors.length) {
            text += sponsors.map(r => `- ID: \`${r.user_id}\` | Username: \`${r.username}\` | Amount: \`Rp ${r.amount.toLocaleString("id-ID")}\``).join("\n") + "\n\n";
          } else {
            text += "None\n\n";
          }

          text += "**💎 DONATURS:**\n";
          if (donaturs.length) {
            text += donaturs.map(r => `- ID: \`${r.user_id}\` | Username: \`${r.username}\` | Amount: \`Rp ${r.amount.toLocaleString("id-ID")}\``).join("\n");
          } else {
            text += "None";
          }

          return interaction.editReply({ content: text.slice(0, 2000) });
        }
      }

      // --- 🛡️ MODERATION ---
      if (["warn", "timeout", "untimeout", "mute", "unmute", "kick", "ban", "clearwarn"].includes(name)) {
        // Ambil variabel dari interaction
        const { guild, member, options, user } = interaction;

        const requiredPerm =
          name === "ban"
            ? PermissionsBitField.Flags.BanMembers
            : name === "kick"
              ? PermissionsBitField.Flags.KickMembers
              : PermissionsBitField.Flags.ModerateMembers;

        if (!hasPerm(member, requiredPerm)) {
          return safeReply(interaction, { content: "❌ Izin tidak cukup.", flags: MessageFlags.Ephemeral });
        }

        const targetUser = options.getUser("user");
        const reason = options.getString("reason") || "No reason";
        const target = await guild.members.fetch(targetUser.id).catch(() => null);

        if (name === "warn") {
          const { guild, user, options } = interaction;
          const targetUser = options.getUser("user");
          const reason = options.getString("reason") || "Tidak ada alasan spesifik.";

          await addWarning(guild.id, targetUser.id, user.id, reason);

          const fields = [
            { name: "👤 Student", value: `<@${targetUser.id}>`, inline: true },
            { name: "🛡️ Moderator", value: `<@${user.id}>`, inline: true },
            { name: "📜 Alasan", value: `\`${reason}\`` }
          ];

          // Kirim Log ke Channel Moderasi & dapatkan Embed-nya
          const emb = await logMod(guild, "DISCIPLINARY NOTICE", 0xff5252, fields, targetUser);

          // --- LOGIKA KIRIM DM ---
          try {
            await targetUser.send({
              content: `⚠️ **Peringatan Resmi dari Mystral Academy**`,
              embeds: [
                new EmbedBuilder()
                  .setTitle("SURAT PERINGATAN (DM)")
                  .setColor(0xff5252)
                  .setDescription(`Halo <@${targetUser.id}>, kamu menerima peringatan resmi di server **${guild.name}**.`)
                  .addFields({ name: "Alasan Pelanggaran", value: `\`${reason}\`` })
                  .setFooter({ text: "Tolong patuhi tata tertib agar tidak terkena sanksi lebih lanjut." })
                  .setTimestamp()
              ]
            });
          } catch (e) {
            console.log(`[DM FAIL] Tidak bisa kirim DM ke ${targetUser.tag}, mungkin DM-nya tertutup.`);
          }

          // Reply di channel agar moderator tahu perintah berhasil
          return safeReply(interaction, { embeds: [emb] });
        }

        if (name === "clearwarn") {
          const n = await clearWarnings(guild.id, targetUser.id);
          return safeReply(interaction, { content: `🧹 Cleared **${n}** warnings untuk <@${targetUser.id}>.` });
        }

        // Tambahkan pengecekan kickable/moderatable
        if (name !== "ban" && !target?.moderatable) return safeReply(interaction, { content: "❌ Saya tidak bisa menindak user ini (Role lebih tinggi/Owner).", flags: MessageFlags.Ephemeral });

        if (name === "timeout") {
          const mins = options.getInteger("minutes", true);
          await target.timeout(mins * 60 * 1000, reason);
          return safeReply(interaction, { content: `⏳ <@${targetUser.id}> di-timeout selama ${mins} menit.` });
        }

        if (name === "untimeout") {
          await removeTimeout(target, reason);
          return safeReply(interaction, { content: `✅ Timeout dihapus untuk <@${targetUser.id}>.` });
        }

        if (name === "mute") {
          const mins = options.getInteger("minutes", true);
          const mode = await applyMute(target, mins, reason);
          return safeReply(interaction, { content: `🔇 <@${targetUser.id}> dimute via **${mode.mode}** selama **${mins} menit**.` });
        }

        if (name === "unmute") {
          const mode = await removeMute(target, reason);
          return safeReply(interaction, { content: `🔊 <@${targetUser.id}> unmute via **${mode.mode}**.` });
        }

        if (name === "kick") {
          await target.kick(reason);
          return safeReply(interaction, { content: `👢 <@${targetUser.id}> telah dikeluarkan.` });
        }

        if (name === "ban") {
          const deleteDays = options.getInteger("delete_days") || 0;
          if (target && !target.bannable) {
            return safeReply(interaction, { content: "❌ Saya tidak bisa ban user ini (role lebih tinggi/owner/permission bot kurang).", flags: MessageFlags.Ephemeral });
          }
          await guild.members.ban(targetUser.id, {
            reason,
            deleteMessageSeconds: deleteDays * 24 * 60 * 60,
          });
          return safeReply(interaction, { content: `🔨 <@${targetUser.id}> berhasil di-ban. Reason: ${reason}` });
        }
      }

      if (name === "unban") {
        if (!hasPerm(interaction.member, PermissionsBitField.Flags.BanMembers)) {
          return safeReply(interaction, { content: "❌ Izin tidak cukup.", flags: MessageFlags.Ephemeral });
        }
        const userId = interaction.options.getString("user_id", true);
        const reason = interaction.options.getString("reason") || "Unban";
        if (!/^\d{15,25}$/.test(userId)) {
          return safeReply(interaction, { content: "User ID tidak valid.", flags: MessageFlags.Ephemeral });
        }
        await interaction.guild.members.unban(userId, reason);
        return safeReply(interaction, { content: `✅ Unbanned \`${userId}\`. Reason: ${reason}` });
      }

      if (name === "giveaway_start") {
        if (!hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild) && !hasPerm(interaction.member, PermissionsBitField.Flags.Administrator)) {
          return safeReply(interaction, { content: "❌ Kamu tidak punya izin.", flags: MessageFlags.Ephemeral });
        }
        const duration = interaction.options.getString("duration", true); // 10m
        const winners = interaction.options.getInteger("winners") || Number(process.env.GIVEAWAY_DEFAULT_WINNERS || 1);
        const prize = interaction.options.getString("prize", true);
        const channel = interaction.options.getChannel("channel") || interaction.channel;

        const ms = parseDurationToMs(duration);
        if (!ms) return safeReply(interaction, { content: "❌ Durasi invalid. Pakai 10m/2h/1d", flags: MessageFlags.Ephemeral });
        if (!channel?.isTextBased?.()) return safeReply(interaction, { content: "❌ Channel harus text channel.", flags: MessageFlags.Ephemeral });

        const endAt = Date.now() + ms;
        const gid = await createGiveaway({ guildId: interaction.guild.id, channelId: channel.id, hostId: interaction.user.id, prize, winners, endAt });
        const entries = 0;

        const emb = giveawayEmbed({ id: gid, prize, winners, hostId: interaction.user.id, endAt, entries, ended: false });
        const sent = await channel.send({ embeds: [emb], components: [giveawayRow(gid)] });
        await setGiveawayMessage(gid, sent.id);

        return safeReply(interaction, { content: `✅ Giveaway dibuat: **#${gid}**`, flags: MessageFlags.Ephemeral });
      }

      if (name === "topactive") {
        await safeDefer(interaction, true);

        // last 7 WIB days (inclusive)
        const now = Date.now();
        const wib = new Date(now + 7 * 60 * 60 * 1000);
        const end = wib.toISOString().slice(0, 10);

        // ambil 7 hari terakhir via JS (simpel & aman)
        const days = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date((now + 7 * 60 * 60 * 1000) - i * 86400000);
          days.push(d.toISOString().slice(0, 10));
        }

        const placeholders = days.map(() => "?").join(",");
        const rows = await safeAll(
          `SELECT user_id, SUM(msg_count) AS total
     FROM activity_daily
     WHERE day IN (${placeholders})
     GROUP BY user_id
     ORDER BY total DESC
     LIMIT 10`,
          days
        );

        if (!rows.length) return interaction.editReply("Belum ada data activity 7 hari terakhir.");

        const text =
          `🏆 **Top Active (7 hari terakhir, WIB)**\n` +
          rows.map((r, i) => `**${i + 1}.** <@${r.user_id}> — **${r.total}** msg`).join("\n");

        return interaction.editReply(text);
      }

      // ===================== ID CARD EXPORT (OWNER ONLY) =====================
      if (name === "idcard_export") {
        if (!isBotOwner(interaction.user.id)) {
          return safeReply(interaction, {
            content: "❌ command ini khusus owner.",
            flags: MessageFlags.Ephemeral,
          });
        }

        await safeDefer(interaction, true);

        const rows = await getAllIdCards();

        if (!rows.length) {
          return interaction.editReply("📭 Tidak ada data ID Card.");
        }

        const payload = rows.map((r, i) => ({
          no: i + 1,
          user_id: r.user_id,
          number: r.number,
          name: r.name,
          gender: r.gender,
          domisili: r.domisili,
          hobi: r.hobi,
          status: r.status,
          theme: r.theme,
          created_at: r.created_at,
          updated_at: r.updated_at,
        }));

        const json = Buffer.from(JSON.stringify(payload, null, 2));
        const file = new AttachmentBuilder(json, { name: "idcard_export.json" });

        return interaction.editReply({
          content: `✅ **Export selesai**\nTotal ID Card: **${rows.length}**`,
          files: [file],
        });
      }

      if (name === "help") {
        const ui = buildHelpUI("home", interaction.user.id);
        return safeReply(interaction, {
          embeds: ui.embeds,
          components: ui.components,
          allowedMentions: { parse: [] },
        });
      }

      // translate (slash)
      if (name === "translate") {
        const text = interaction.options.getString("text");
        const to = interaction.options.getString("to") || "id";
        const from = interaction.options.getString("from") || "auto";

        await interaction.deferReply().catch(() => { });
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
          const res = await fetch(url).then(r => r.json());
          const translated = res[0].map(s => s[0]).join('');
          const detectedSrc = res[2] || from;

          const embed = new EmbedBuilder()
            .setTitle("🌐 Translation")
            .setColor(EMBED_COLOR)
            .addFields(
              { name: `Original (${detectedSrc.toUpperCase()})`, value: text },
              { name: `Translated (${to.toUpperCase()})`, value: translated }
            )
            .setTimestamp();
          return interaction.editReply({ embeds: [embed] });
        } catch (err) {
          console.error("[TRANSLATE ERROR]", err);
          return interaction.editReply("❌ Gagal menerjemahkan teks.");
        }
      }

      // weather (slash)
      if (name === "weather") {
        const location = interaction.options.getString("location");
        await interaction.deferReply().catch(() => { });
        try {
          const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
          const res = await fetch(url).then(r => r.json());

          const current = res.current_condition[0];
          const area = res.nearest_area[0];
          const areaName = area.areaName[0].value;
          const country = area.country[0].value;
          const tempC = current.temp_C;
          const feelsLikeC = current.FeelsLikeC;
          const humidity = current.humidity;
          const desc = current.weatherDesc[0].value;
          const windKmph = current.windspeedKmph;
          const windDir = current.winddir16Point;
          const uvIndex = current.uvIndex;
          const cloudcover = current.cloudcover;
          const precipMM = current.precipMM;
          const iconUrl = current.weatherIconUrl?.[0]?.value || "";

          const embed = new EmbedBuilder()
            .setTitle(`⛅ Cuaca di ${areaName}, ${country}`)
            .setColor(EMBED_COLOR)
            .setDescription(`**Kondisi:** ${desc}`)
            .addFields(
              { name: "🌡️ Temperatur", value: `${tempC}°C (Terasa ${feelsLikeC}°C)`, inline: true },
              { name: "💧 Kelembaban", value: `${humidity}%`, inline: true },
              { name: "💨 Angin", value: `${windKmph} km/h (${windDir})`, inline: true },
              { name: "☀️ Indeks UV", value: `${uvIndex}`, inline: true },
              { name: "☁️ Awan", value: `${cloudcover}%`, inline: true },
              { name: "🌧️ Curah Hujan", value: `${precipMM} mm`, inline: true }
            )
            .setTimestamp();

          if (iconUrl) embed.setThumbnail(iconUrl);
          return interaction.editReply({ embeds: [embed] });
        } catch (err) {
          console.error("[WEATHER ERROR]", err);
          return interaction.editReply("❌ Gagal mengambil data cuaca untuk lokasi tersebut.");
        }
      }

      // qrcode (slash)
      if (name === "qrcode") {
        const text = interaction.options.getString("text");
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(text)}`;
        const embed = new EmbedBuilder()
          .setTitle("📷 QR Code Generator")
          .setColor(EMBED_COLOR)
          .setDescription(`**Data:** \`${text.length > 60 ? text.slice(0, 57) + "..." : text}\``)
          .setImage(qrUrl)
          .setFooter({ text: "Scan QR Code di atas menggunakan kamera perangkat Anda." })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // shorturl (slash)
      if (name === "shorturl") {
        const longUrl = interaction.options.getString("url");
        try {
          new URL(longUrl);
        } catch {
          return interaction.reply({ content: "❌ Silakan masukkan URL yang valid (harus diawali http:// atau https://).", ephemeral: true });
        }

        await interaction.deferReply().catch(() => { });
        try {
          const sUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`;
          const res = await fetch(sUrl);
          if (!res.ok) throw new Error();
          const short = await res.text();

          const embed = new EmbedBuilder()
            .setTitle("🔗 URL Shortener")
            .setColor(EMBED_COLOR)
            .addFields(
              { name: "Original URL", value: `[Link Asli](${longUrl})` },
              { name: "Shortened URL", value: short }
            )
            .setTimestamp();
          return interaction.editReply({ embeds: [embed] });
        } catch (err) {
          console.error("[SHORTURL ERROR]", err);
          return interaction.editReply("❌ Gagal menyingkat URL.");
        }
      }
      // ===================== SELF ROLES PANEL (OWNER-ONLY) =====================
      if (name === "selfrolespanel") {
        if (!isBotOwner(interaction.user.id)) {
          return safeReply(interaction, { content: "❌ khusus pembuat bot.", flags: MessageFlags.Ephemeral });
        }

        const [eAge, eInt, eStatus, eRegion, ePing] = selfrolesPanelEmbeds();

        const rowAge = new ActionRowBuilder().addComponents(
          buildSelfSelect("self:age", "Pilih Age (1)", SELFROLES.age, 1)
        );

        const rowGame = new ActionRowBuilder().addComponents(
          buildSelfSelect("self:int_gaming", "Gaming (pilih bebas)", SELFROLES.interest.gaming, Math.min(SELFROLES.interest.gaming.length, 25))
        );

        const rowEnt = new ActionRowBuilder().addComponents(
          buildSelfSelect("self:int_ent", "Entertainment (pilih bebas)", SELFROLES.interest.entertainment, Math.min(SELFROLES.interest.entertainment.length, 25))
        );

        const rowCre = new ActionRowBuilder().addComponents(
          buildSelfSelect("self:int_creative", "Creative (pilih bebas)", SELFROLES.interest.creative, Math.min(SELFROLES.interest.creative.length, 25))
        );

        const rowStatus = new ActionRowBuilder().addComponents(
          buildSelfSelect("self:status", "Pilih Status (opsional, 1)", SELFROLES.status, 1)
        );
        const rowRegion = new ActionRowBuilder().addComponents(
          buildSelfSelect("self:region", "Pilih Region (1)", SELFROLES.region || [], 1)
        );

        const rowPing = new ActionRowBuilder().addComponents(
          buildSelfSelect("self:ping", "Pilih Ping Roles (multi)", SELFROLES.ping || [], Math.min((SELFROLES.ping || []).length, 25))
        );

        await safeReply(interaction, { content: "✅ Panel self-role dikirim.", flags: MessageFlags.Ephemeral });
        await interaction.channel.send({ embeds: [eAge], components: [rowAge] });
        await interaction.channel.send({ embeds: [eInt], components: [rowGame, rowEnt, rowCre] });
        await interaction.channel.send({ embeds: [eStatus], components: [rowStatus] });
        await interaction.channel.send({ embeds: [eRegion], components: [rowRegion] });
        await interaction.channel.send({ embeds: [ePing], components: [rowPing] });

        return;
      }
      // ===================== END SELF ROLES PANEL =====================

      function parseHexColor(input, fallback = EMBED_COLOR) {
        if (!input) return fallback;
        const s = String(input).trim().replace(/^0x/i, "#");
        const m = s.match(/^#?([0-9a-fA-F]{6})$/);
        if (!m) return fallback;
        return parseInt(m[1], 16);
      }

      function isValidUrl(u) {
        try {
          const url = new URL(u);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      }

      // ... di dalam interaction.isChatInputCommand()
      if (name === "sendembed") {
        if (!isBotOwner(interaction.user.id)) {
          return safeReply(interaction, { content: "❌ khusus pembuat bot.", flags: MessageFlags.Ephemeral });
        }

        const title = safeText(interaction.options.getString("title"), 200) || "Panel";
        const description = String(interaction.options.getString("description") || "").trim().slice(0, 3800);
        const channel = interaction.options.getChannel("channel") || interaction.channel;

        const colorRaw = interaction.options.getString("color");
        const footerRaw = interaction.options.getString("footer");
        const img = interaction.options.getString("image");
        const thumb = interaction.options.getString("thumbnail");
        const mentionUser = interaction.options.getUser("mention_user");
        const mentionRole = interaction.options.getRole("mention_role");

        // safety: pastikan channel text-based
        if (!channel?.isTextBased?.()) {
          return safeReply(interaction, { content: "⚠️ channel tujuan harus text channel.", flags: MessageFlags.Ephemeral });
        }

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor(parseHexColor(colorRaw, EMBED_COLOR))
          .setTimestamp();

        // lore footer default
        embed.setFooter({ text: footerRaw?.trim() || "Mystral Academy • Arcane Notice" });

        if (thumb && isValidUrl(thumb)) embed.setThumbnail(thumb);
        if (img && isValidUrl(img)) embed.setImage(img);

        const mentionParts = [];
        if (mentionRole) mentionParts.push(`<@&${mentionRole.id}>`);
        if (mentionUser) mentionParts.push(`<@${mentionUser.id}>`);
        const contentStr = mentionParts.length ? mentionParts.join(" ") : undefined;

        await channel.send({
          content: contentStr,
          embeds: [embed],
          allowedMentions: {
            users: mentionUser ? [mentionUser.id] : [],
            roles: mentionRole ? [mentionRole.id] : [],
            parse: []
          }
        }).catch(() => null);

        return safeReply(interaction, { content: "✅ embed terkirim.", flags: MessageFlags.Ephemeral });
      }

      if (name === "sendembedv2") {
        if (!isBotOwner(interaction.user.id)) {
          return safeReply(interaction, { content: "❌ khusus pembuat bot.", flags: MessageFlags.Ephemeral });
        }

        await safeDefer(interaction, true);

        const title = safeText(interaction.options.getString("title"), 200) || "Panel";
        const description = String(interaction.options.getString("description") || "").trim().slice(0, 3800);
        const channel = interaction.options.getChannel("channel") || interaction.channel;
        const colorRaw = interaction.options.getString("color");
        const footerRaw = String(interaction.options.getString("footer") || "").trim().slice(0, 500);
        const mentionUser = interaction.options.getUser("mention_user");
        const mentionRole = interaction.options.getRole("mention_role");

        if (!channel?.isTextBased?.()) {
          return safeReply(interaction, { content: "⚠️ channel tujuan harus text channel.", flags: MessageFlags.Ephemeral });
        }

        const mentionParts = [];
        if (mentionRole) mentionParts.push(`<@&${mentionRole.id}>`);
        if (mentionUser) mentionParts.push(`<@${mentionUser.id}>`);

        const panel = new ContainerBuilder();

        panel.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${title}`),
          new TextDisplayBuilder().setContent(description || " ")
        );

        if (colorRaw) {
          panel.setAccentColor(parseHexColor(colorRaw, EMBED_COLOR));
        }

        panel
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(footerRaw?.trim() || "Mystral Academy • Arcane Notice")
          );

        const payload = {
          components: [panel],
          flags: MessageFlags.IsComponentsV2,
        };

        try {
          if (mentionParts.length) {
            await channel.send({
              content: mentionParts.join(" "),
              allowedMentions: {
                users: mentionUser ? [mentionUser.id] : [],
                roles: mentionRole ? [mentionRole.id] : [],
                parse: [],
              },
            });
          }
          await channel.send(payload);
        } catch (e) {
          console.error("[sendembedv2] failed:", e?.rawError || e?.message || e);
          return safeReply(interaction, {
            content: `❌ gagal kirim panel v2: ${safeText(e?.rawError?.message || e?.message || "unknown error", 180)}`,
            flags: MessageFlags.Ephemeral,
          });
        }

        return safeReply(interaction, { content: "✅ panel v2 terkirim.", flags: MessageFlags.Ephemeral });
      }


      //ticketpanel
      if (name === "ticketpanel") {
        if (!isBotOwner(interaction.user.id)) {
          return safeReply(interaction, { content: "❌ khusus pembuat bot.", flags: MessageFlags.Ephemeral });
        }
        await interaction.channel.send({
          components: ticketPanelComponentsV2(),
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
        return safeReply(interaction, { content: "✅ panel ticket terkirim.", flags: MessageFlags.Ephemeral });
      }

      if (name === "halo") {
        const serverName = interaction.guild?.name || "realm ini";
        const replies = [
          `✨ salam, **${interaction.user.username}**.\nsebuah jiwa baru menyapa di **${serverName}**.`,
          `🌙 gerbang berpendar pelan saat **${interaction.user.username}** berbicara.\nselamat datang di **${serverName}**.`,
          `🔮 suaramu menggema di dalam **${serverName}**, **${interaction.user.username}**.\nsemoga langkahmu di sini menyenangkan.`,
          `🕯️ salam hangat, **${interaction.user.username}**.\n**${serverName}** menyambut kehadiranmu.`,
        ];
        return safeReply(interaction, { content: replies[Math.floor(Math.random() * replies.length)] });
      }

      if (name === "about") {
        const uptime = Math.floor(process.uptime());
        const hours = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        const secs = uptime % 60;

        const DEVELOPER_ID = "123456789012345678"; // ganti dengan User ID kamu

        const embed = new EmbedBuilder()
          .setTitle("🤖 About Bot")
          .setColor(EMBED_COLOR)
          .setDescription("Aku penjaga gerbang realm yang menyambut jiwa-jiwa baru ✨")
          .addFields(
            { name: "🏷️ Name", value: `${client.user.tag}`, inline: true },
            { name: "📡 Ping", value: `${client.ws.ping}ms`, inline: true },
            { name: "⏳ Uptime", value: `${hours}h ${mins}m ${secs}s`, inline: true },
            { name: "🧩 Version", value: "discord.js v14", inline: true },
            { name: "👨‍💻 Developer", value: `<@${776022128092774410}>`, inline: true }
          )
          .setThumbnail(client.user.displayAvatarURL({ extension: "png", size: 256 }))
          .setFooter({ text: `ID: ${client.user.id}` })
          .setTimestamp();

        return safeReply(interaction, { embeds: [embed] });
      }

      if (name === "avatar") {
        const user = interaction.options.getUser("user") || interaction.user;

        const embed = new EmbedBuilder()
          .setTitle("🖼️ Avatar")
          .setColor(EMBED_COLOR)
          .setDescription(`Avatar milik <@${user.id}>`)
          .setImage(user.displayAvatarURL({ extension: "png", size: 1024 }))
          .setFooter({ text: BRAND_NAME })
          .setTimestamp();

        return safeReply(interaction, { embeds: [embed], allowedMentions: { parse: [] } });
      }

      //userinfo
      if (name === "userinfo") {
        const user = interaction.options.getUser("user") || interaction.user;
        await safeDefer(interaction, false);

        const guild = interaction.guild;
        const member = await guild?.members.fetch(user.id).catch(() => null);

        // ===== Dates =====
        const createdUnix = Math.floor((user.createdTimestamp || Date.now()) / 1000);
        const joinedUnix = member?.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;

        // ===== Roles (HIGHEST -> LOWEST) =====
        const roleList = member
          ? member.roles.cache
            .filter((r) => r.id !== guild.id) // buang @everyone
            .sort((a, b) => b.position - a.position)
            .map((r) => r.toString())
          : [];

        const maxRolesShown = 15;
        const rolesShown = roleList.slice(0, maxRolesShown);
        const rolesMore = Math.max(0, roleList.length - rolesShown.length);

        // ===== Highest Role =====
        const topRole =
          member?.roles.cache
            .filter((r) => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .first() || null;

        // ===== Nick / Display =====
        const nickname = member?.nickname || "—";
        const displayName = member?.displayName || user.username;

        // ===== Banner (needs fetch user full) =====
        const userFull = await client.users.fetch(user.id, { force: true }).catch(() => null);
        const bannerUrl = userFull?.bannerURL?.({ extension: "png", size: 1024 }) || null;

        const embed = new EmbedBuilder()
          .setTitle(`Mystral Profile — ${displayName}`)
          .setColor(EMBED_COLOR)
          .setThumbnail(user.displayAvatarURL({ extension: "png", size: 256 }))
          .setDescription(`**Mention:** <@${user.id}>`)
          .addFields(
            {
              name: "🪪 Identity",
              value: [
                `**Tag:** ${user.tag}`,
                `**User ID:** \`${user.id}\``,
                `**Nickname:** ${nickname === "—" ? "—" : `\`${nickname}\``}`,
              ].join("\n"),
              inline: true,
            },
            {
              name: "🕰️ Timeline",
              value: [
                `**Akun Dibuat:** <t:${createdUnix}:F>`,
                `**Join Server:** ${joinedUnix ? `<t:${joinedUnix}:F>` : "—"}`,
                `**Relative:** <t:${createdUnix}:R>${joinedUnix ? ` • <t:${joinedUnix}:R>` : ""}`,
              ].join("\n"),
              inline: true,
            },
            {
              name: "🎭 Roles",
              value: roleList.length
                ? `${rolesShown.join(" ")}${rolesMore ? `\n…dan **${rolesMore}** role lain.` : ""}`
                : "—",
              inline: false,
            },
            {
              name: "🏷️ Highest Role",
              value: topRole ? `${topRole} *(pos ${topRole.position})*` : "—",
              inline: true,
            },
            {
              name: "🧩 Server",
              value: guild ? `**${guild.name}**\nID: \`${guild.id}\`` : "—",
              inline: true,
            }
          )
          .setFooter({ text: `${BRAND_NAME} • Student Registry` })
          .setTimestamp();

        if (bannerUrl) embed.setImage(bannerUrl);

        return safeReply(interaction, { embeds: [embed], allowedMentions: { parse: [] } });
      }

      if (name === "check") {
        const platform = interaction.options.getSubcommand();
        const rawValue =
          interaction.options.getString("username", false) ||
          interaction.options.getString("steamid", false) ||
          interaction.options.getString("user", false) ||
          "";
        const value = safeText(rawValue, 64).trim();

        if (!value) {
          return safeReply(interaction, {
            content: "❌ Input tidak valid.",
            flags: MessageFlags.Ephemeral,
          });
        }

        await safeDefer(interaction, false);

        if (platform === "github") {
          const result = await getGitHubProfile(value).catch(() => null);
          const gh = result?.body;

          if (!result?.ok || !gh?.login) {
            await interaction.deleteReply().catch(() => { });
            return interaction.followUp({
              content: "❌ Profil GitHub tidak ditemukan.",
              flags: MessageFlags.Ephemeral,
            });
          }

          const createdUnix = gh.created_at ? Math.floor(new Date(gh.created_at).getTime() / 1000) : null;
          const embed = new EmbedBuilder()
            .setTitle(`🐙 GitHub — ${gh.login}`)
            .setColor(EMBED_COLOR)
            .setURL(gh.html_url)
            .setThumbnail(gh.avatar_url)
            .setDescription(gh.bio || "Tidak ada bio.")
            .addFields(
              {
                name: "Profile",
                value: [
                  `**Name:** ${gh.name || "—"}`,
                  `**Type:** ${gh.type || "User"}`,
                  `**Location:** ${gh.location || "—"}`,
                ].join("\n"),
                inline: true,
              },
              {
                name: "Stats",
                value: [
                  `**Repos:** \`${gh.public_repos ?? 0}\``,
                  `**Followers:** \`${gh.followers ?? 0}\``,
                  `**Following:** \`${gh.following ?? 0}\``,
                ].join("\n"),
                inline: true,
              },
              {
                name: "Joined",
                value: createdUnix ? `<t:${createdUnix}:D>\n<t:${createdUnix}:R>` : "—",
                inline: true,
              }
            )
            .setFooter({ text: `GitHub ID: ${gh.id}` });

          return safeReply(interaction, { embeds: [embed] });
        }

        if (platform === "roblox") {
          const result = await getRobloxProfile(value).catch(() => null);
          const rb = result?.body;

          if (!result?.ok || !rb?.id) {
            await interaction.deleteReply().catch(() => { });
            return interaction.followUp({
              content: "❌ Profil Roblox tidak ditemukan.",
              flags: MessageFlags.Ephemeral,
            });
          }

          const createdUnix = rb.created ? Math.floor(new Date(rb.created).getTime() / 1000) : null;
          const avatarUrl = await getRobloxAvatarHeadshot(rb.id).catch(() => null);
          const embed = new EmbedBuilder()
            .setTitle(`🎮 Roblox — ${rb.name}`)
            .setColor(EMBED_COLOR)
            .setDescription(rb.description || "Tidak ada deskripsi.")
            .addFields(
              {
                name: "Profile",
                value: [
                  `**Username:** ${rb.name || "—"}`,
                  `**Display Name:** ${rb.displayName || "—"}`,
                  `**User ID:** \`${rb.id}\``,
                ].join("\n"),
                inline: true,
              },
              {
                name: "Status",
                value: [
                  `**Banned:** ${rb.isBanned ? "Yes" : "No"}`,
                  `**Verified Badge:** ${rb.hasVerifiedBadge ? "Yes" : "No"}`,
                ].join("\n"),
                inline: true,
              },
              {
                name: "Joined",
                value: createdUnix ? `<t:${createdUnix}:D>\n<t:${createdUnix}:R>` : "—",
                inline: true,
              }
            )
            .setFooter({ text: "Roblox public profile" });

          if (avatarUrl) embed.setThumbnail(avatarUrl);

          return safeReply(interaction, { embeds: [embed] });
        }

        if (platform === "steam") {
          let steamId = value;

          if (!/^\d{17}$/.test(value)) {
            const resolved = await resolveSteamVanityUrl(value).catch(() => null);
            if (resolved?.missingKey) {
              await interaction.deleteReply().catch(() => { });
              return interaction.followUp({
                content: "⚠️ `STEAM_API_KEY` belum diisi di `.env`.",
                flags: MessageFlags.Ephemeral,
              });
            }

            steamId = resolved?.body?.response?.steamid || null;
            if (!resolved?.ok || !steamId) {
              await interaction.deleteReply().catch(() => { });
              return interaction.followUp({
                content: "❌ Vanity username Steam tidak ditemukan.",
                flags: MessageFlags.Ephemeral,
              });
            }
          }

          const result = await getSteamProfile(steamId).catch(() => null);
          if (result?.missingKey) {
            await interaction.deleteReply().catch(() => { });
            return interaction.followUp({
              content: "⚠️ `STEAM_API_KEY` belum diisi di `.env`.",
              flags: MessageFlags.Ephemeral,
            });
          }

          const steam = result?.body?.response?.players?.[0];
          if (!result?.ok || !steam?.steamid) {
            await interaction.deleteReply().catch(() => { });
            return interaction.followUp({
              content: "❌ Profil Steam tidak ditemukan.",
              flags: MessageFlags.Ephemeral,
            });
          }

          const statusMap = {
            0: "Offline",
            1: "Online",
            2: "Busy",
            3: "Away",
            4: "Snooze",
            5: "Looking to trade",
            6: "Looking to play",
          };
          const lastLogoffUnix = steam.lastlogoff || null;
          const embed = new EmbedBuilder()
            .setTitle(`🎮 Steam — ${steam.personaname}`)
            .setColor(EMBED_COLOR)
            .setURL(steam.profileurl)
            .addFields(
              {
                name: "Profile",
                value: [
                  `**SteamID64:** \`${steam.steamid}\``,
                  `**Status:** ${statusMap[steam.personastate] || "Unknown"}`,
                  `**Visibility:** ${steam.communityvisibilitystate === 3 ? "Public" : "Private / Limited"}`,
                ].join("\n"),
                inline: true,
              },
              {
                name: "Last Seen",
                value: lastLogoffUnix ? `<t:${lastLogoffUnix}:D>\n<t:${lastLogoffUnix}:R>` : "—",
                inline: true,
              }
            )
            .setFooter({ text: "Steam public profile" });

          const steamAvatar = steam.avatarfull || steam.avatarmedium || steam.avatar || null;
          if (steamAvatar) embed.setThumbnail(steamAvatar);

          return safeReply(interaction, { embeds: [embed] });
        }

        if (platform === "chess") {
          const [profileResult, statsResult] = await Promise.all([
            getChessProfile(value).catch(() => null),
            getChessStats(value).catch(() => null),
          ]);

          const chess = profileResult?.body;
          const stats = statsResult?.body || {};
          if (!profileResult?.ok || !chess?.username) {
            await interaction.deleteReply().catch(() => { });
            return interaction.followUp({
              content: "❌ Profil Chess.com tidak ditemukan.",
              flags: MessageFlags.Ephemeral,
            });
          }

          const joinedUnix = chess.joined || null;
          const rapid = stats.chess_rapid?.last?.rating ?? "—";
          const blitz = stats.chess_blitz?.last?.rating ?? "—";
          const bullet = stats.chess_bullet?.last?.rating ?? "—";
          const embed = new EmbedBuilder()
            .setTitle(`♟️ Chess.com — ${chess.username}`)
            .setColor(EMBED_COLOR)
            .setURL(chess.url)
            .addFields(
              {
                name: "Profile",
                value: [
                  `**Name:** ${chess.name || "—"}`,
                  `**Status:** ${chess.status || "—"}`,
                  `**Followers:** \`${chess.followers ?? 0}\``,
                ].join("\n"),
                inline: true,
              },
              {
                name: "Ratings",
                value: [
                  `**Rapid:** \`${rapid}\``,
                  `**Blitz:** \`${blitz}\``,
                  `**Bullet:** \`${bullet}\``,
                ].join("\n"),
                inline: true,
              },
              {
                name: "Joined",
                value: joinedUnix ? `<t:${joinedUnix}:D>\n<t:${joinedUnix}:R>` : "—",
                inline: true,
              }
            )
            .setFooter({ text: "Chess.com public profile" });

          if (chess.avatar) embed.setThumbnail(chess.avatar);

          return safeReply(interaction, { embeds: [embed] });
        }
      }

      if (name === "tod") {
        if (!interaction.channel?.isTextBased?.()) {
          return safeReply(interaction, {
            content: "❌ Channel tidak valid untuk Truth or Dare.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const mode = interaction.options.getSubcommand();
        if (mode === "submit") {
          const modal = new ModalBuilder()
            .setCustomId("tod:submit")
            .setTitle("Submit TOD Question");

          const type = new TextInputBuilder()
            .setCustomId("type")
            .setLabel("Type: truth / dare")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
          const category = new TextInputBuilder()
            .setCustomId("category")
            .setLabel("Category")
            .setPlaceholder("funny / deep talk / relationship / chaos / spicy ringan")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
          const rating = new TextInputBuilder()
            .setCustomId("rating")
            .setLabel("Rating")
            .setPlaceholder("PG / Funny / Deep / Spicy")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
          const question = new TextInputBuilder()
            .setCustomId("question")
            .setLabel("Question")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(300);

          modal.addComponents(
            new ActionRowBuilder().addComponents(type),
            new ActionRowBuilder().addComponents(category),
            new ActionRowBuilder().addComponents(rating),
            new ActionRowBuilder().addComponents(question)
          );
          return interaction.showModal(modal);
        }

        if (mode === "panel") {
          const q = await getRandomTodQuestion();
          await sendTodQuestion(interaction.channel, q, interaction.user.id);
          return safeReply(interaction, {
            content: "✅ Panel Truth or Dare terkirim.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const q =
          mode === "truth"
            ? await getRandomTodQuestion({ type: "truth" })
            : mode === "dare"
              ? await getRandomTodQuestion({ type: "dare" })
              : mode === "daily"
                ? await getRandomTodQuestion({ category: todThemeForToday() })
                : await getRandomTodQuestion();

        await sendTodQuestion(interaction.channel, q, interaction.user.id);
        return safeReply(interaction, {
          content: mode === "daily" ? `✅ Tema hari ini: **${todThemeForToday()}**` : "✅ Truth or Dare terkirim.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (name === "tod_add") {
        const isAllowed =
          isBotOwner(interaction.user.id) ||
          hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild) ||
          hasPerm(interaction.member, PermissionsBitField.Flags.Administrator);
        if (!isAllowed) {
          return safeReply(interaction, {
            content: "❌ Tidak punya izin.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const type = interaction.options.getString("type", true);
        const category = safeText(interaction.options.getString("category", true), 40).trim().toLowerCase();
        const rating = safeText(interaction.options.getString("rating", true), 20).trim();
        const question = safeText(interaction.options.getString("question", true), 300).trim();
        const pack = safeText(interaction.options.getString("pack", false) || "", 40).trim() || null;

        await safeRun(
          `INSERT INTO tod_questions (type, category, rating, question, source, pack_name, created_by, created_at)
           VALUES (?,?,?,?,?,?,?,?)`,
          [type, category, rating, question, "custom", pack, interaction.user.id, Date.now()]
        );

        return safeReply(interaction, {
          content: `✅ Pertanyaan TOD custom ditambahkan${pack ? ` ke pack **${pack}**` : ""}.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (name === "profile") {
        const user = interaction.options.getUser("user") || interaction.user;
        await safeDefer(interaction, false);

        const guild = interaction.guild;
        if (!guild) return safeReply(interaction, { content: "Command ini cuma bisa dipakai di server ya." });

        const member = await guild.members.fetch(user.id).catch(() => null);

        const { embed, idData, sorted, afk } = await buildProfileEmbed({ guild, user, member });

        const row = profileButtons({
          hasIdCard: Boolean(idData),
          hasSorted: Boolean(sorted?.choice),
          isAfk: Boolean(afk),
        });

        return safeReply(interaction, { embeds: [embed], components: [row], allowedMentions: { parse: [] } });
      }

      //serverinfo
      if (name === "serverinfo") {
        await safeDefer(interaction, false); // <- bukan ephemeral

        const g = interaction.guild;
        if (!g) return safeReply(interaction, { content: "Command ini cuma bisa dipakai di server ya.", flags: MessageFlags.Ephemeral });

        // fetch data
        const owner = await g.fetchOwner().catch(() => null);
        const channels = await g.channels.fetch().catch(() => null);

        // counts
        const totalMembers = g.memberCount ?? 0;

        const channelCount = channels ? channels.size : 0;
        const textCount = channels ? channels.filter((c) => c?.type === 0).size : 0; // GuildText
        const voiceCount = channels ? channels.filter((c) => c?.type === 2).size : 0; // GuildVoice
        const categoryCount = channels ? channels.filter((c) => c?.type === 4).size : 0; // GuildCategory
        const forumCount = channels ? channels.filter((c) => c?.type === 15).size : 0; // GuildForum
        const stageCount = channels ? channels.filter((c) => c?.type === 13).size : 0; // GuildStageVoice
        const threadCount = channels ? channels.filter((c) => [11, 12].includes(c?.type)).size : 0; // Public/Private thread (may not appear depending fetch)

        const roleCount = g.roles?.cache?.size ? Math.max(0, g.roles.cache.size - 1) : 0; // minus @everyone

        // boosts
        const boostTier = g.premiumTier ?? 0;
        const boostCount = g.premiumSubscriptionCount ?? 0;

        // verification level label (Discord enum)
        const verMap = {
          0: "🔓 None",
          1: "🪶 Low",
          2: "🛡️ Medium",
          3: "🔒 High",
          4: "👑 Very High",
        };
        const verLabel = verMap[g.verificationLevel] || `Level ${g.verificationLevel ?? "—"}`;

        // created
        const createdUnix = Math.floor((g.createdTimestamp || Date.now()) / 1000);

        // aesthetics
        const icon = g.iconURL({ extension: "png", size: 512 });
        const banner = g.bannerURL?.({ extension: "png", size: 1024 }) || null;

        const embed = new EmbedBuilder()
          .setTitle("🏛️ Mystral Academy — Realm Dossier")
          .setColor(EMBED_COLOR)
          .setThumbnail(icon)
          .setDescription(
            [
              `**Realm:** **${g.name}**`,
              `**Realm ID:** \`${g.id}\``,
              owner ? `**Ownership:** <@${owner.id}>` : `**Sovereign:** —`,
            ].join("\n")
          )
          .addFields(
            {
              name: "🧭 Population",
              value: [
                `**Members:** **${totalMembers.toLocaleString("id-ID")}**`,
                `**Boosts:** **${boostCount.toLocaleString("id-ID")}**`,
                `**Boost Tier:** **${boostTier}**`,
              ].join("\n"),
              inline: true,
            },
            {
              name: "🗺️ Channels",
              value: channels
                ? [
                  `**Total:** **${channelCount}**`,
                  `💬 Text: ${textCount}`,
                  `🔊 Voice: ${voiceCount}`,
                  `🗂️ Category: ${categoryCount}`,
                  `🧵 Threads: ${threadCount}`,
                  `🧷 Forum: ${forumCount}`,
                  `🎙️ Stage: ${stageCount}`,
                ].join("\n")
                : "⚠️ tidak bisa fetch channel (izin kurang / error).",
              inline: true,
            },
            {
              name: "🎭 Structure",
              value: [
                `**Roles:** **${roleCount}**`,
                `**Verification:** ${verLabel}`,
                `**Created:** <t:${createdUnix}:F>`,
                `**Age:** <t:${createdUnix}:R>`,
              ].join("\n"),
              inline: false,
            }
          )
          .setFooter({ text: `${BRAND_NAME} • Server Info` })
          .setTimestamp();

        if (banner) embed.setImage(banner);

        return safeReply(interaction, { embeds: [embed], allowedMentions: { parse: [] } });
      }
      //remind
      if (name === "remind_in") {
        const minutes = interaction.options.getInteger("minutes", true);
        const msg = interaction.options.getString("message", true);

        const due = Date.now() + minutes * 60 * 1000;

        await safeRun(
          `INSERT INTO reminders (user_id, channel_id, message, due_at, created_at)
          VALUES (?, ?, ?, ?, ?)`,
          [interaction.user.id, interaction.channelId, msg, due, Date.now()]
        );

        return safeReply(interaction, {
          content: `✅ Reminder diset untuk <t:${Math.floor(due / 1000)}:R>`,
          flags: MessageFlags.Ephemeral,
        });
      }

      function parseWibToUtcMs(s) {
        // s: "2026-01-18 19:30" (WIB)
        const m = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/.exec(s.trim());
        if (!m) return null;
        const [_, Y, Mo, D, H, Mi] = m;
        // buat sebagai UTC lalu kurangi 7 jam (karena input adalah WIB)
        const utcMs = Date.UTC(+Y, +Mo - 1, +D, +H, +Mi);
        return utcMs - 7 * 60 * 60 * 1000;
      }

      if (name === "remind_at") {
        const at = interaction.options.getString("time_wib", true);
        const msg = interaction.options.getString("message", true);

        const due = parseWibToUtcMs(at);
        if (!due) {
          return safeReply(interaction, {
            content: "❌ Format salah. Pakai: `YYYY-MM-DD HH:mm` (WIB). Contoh: `2026-01-18 19:30`",
            flags: MessageFlags.Ephemeral,
          });
        }

        await safeRun(
          `INSERT INTO reminders (user_id, channel_id, message, due_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
          [interaction.user.id, interaction.channelId, msg, due, Date.now()]
        );

        return safeReply(interaction, {
          content: `✅ Reminder diset untuk <t:${Math.floor(due / 1000)}:F>`,
          flags: MessageFlags.Ephemeral,
        });
      }
      if (name === "remind_list") {
        await safeDefer(interaction, true);

        const rows = await safeAll(
          `SELECT id, message, due_at
     FROM reminders
     WHERE user_id = ? AND is_done = 0
     ORDER BY due_at ASC
     LIMIT 20`,
          [interaction.user.id]
        );

        if (!rows.length) return interaction.editReply("Kamu belum punya reminder aktif.");

        const text =
          `🗓️ **Reminder kamu**\n\n` +
          rows.map(r => `• \`#${r.id}\` <t:${Math.floor(r.due_at / 1000)}:F> — ${r.message}`).join("\n");

        return interaction.editReply(text);
      }
      //afk
      if (name === "afk") {
        const reason = interaction.options.getString("reason") || "AFK";
        await setAfk(interaction.user.id, reason);

        // set nickname jadi [AFK] ...
        const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
        if (member) {
          const base = member.nickname || interaction.user.username;
          await trySetMemberNick(member, withAfkPrefix(base));
        }

        return safeReply(interaction, {
          content: `🕯️ <@${interaction.user.id}> kini berstatus **AFK** — ${safeText(reason, 80)}`,
          allowedMentions: { repliedUser: false, parse: [] },
        });
      }

      if (name === "afk_clear") {
        if (!hasPerm(interaction.member, PermissionsBitField.Flags.ModerateMembers) && !hasPerm(interaction.member, PermissionsBitField.Flags.Administrator)) {
          return safeReply(interaction, { content: "❌ Butuh izin `Moderate Members`.", flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getUser("user", true);
        const removed = await clearAfk(targetUser.id);
        const member = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
        if (member) {
          const restored = stripAfkPrefix(member.nickname || member.user.username);
          await trySetMemberNick(member, restored || null);
        }

        return safeReply(interaction, {
          content: removed
            ? `✅ Status AFK <@${targetUser.id}> sudah dihapus.`
            : `ℹ️ <@${targetUser.id}> tidak sedang AFK di database.`,
          allowedMentions: { parse: [] },
          flags: MessageFlags.Ephemeral,
        });
      }

      if (name === "afk_reset_all") {
        if (!hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild) && !hasPerm(interaction.member, PermissionsBitField.Flags.Administrator)) {
          return safeReply(interaction, { content: "❌ Butuh izin `Manage Server`.", flags: MessageFlags.Ephemeral });
        }

        const confirm = interaction.options.getString("confirm", true);
        if (confirm !== "RESET") {
          return safeReply(interaction, { content: "Ketik `RESET` di opsi confirm untuk reset semua AFK.", flags: MessageFlags.Ephemeral });
        }

        await safeDefer(interaction, true);
        const rows = await getAllAfkUsers();
        const removed = await clearAllAfkUsers();

        let nickRestored = 0;
        for (const row of rows) {
          const member = await interaction.guild?.members.fetch(row.user_id).catch(() => null);
          if (!member) continue;
          const current = member.nickname || member.user.username;
          if (!/^\[AFK\]\s*/i.test(current)) continue;
          const restored = stripAfkPrefix(current);
          if (await trySetMemberNick(member, restored || null)) nickRestored++;
        }

        return interaction.editReply(`✅ Reset AFK selesai. Terhapus: **${removed}** data. Nickname dipulihkan: **${nickRestored}** member.`);
      }

      //registry
      if (name === "registry") {
        if (!interaction.guild) return safeReply(interaction, { content: "Command ini cuma bisa dipakai di server ya.", flags: MessageFlags.Ephemeral });

        const total = await countRegistry();
        const pageSize = 10;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const pageIndex = 0;

        const rows = await registryPage(pageIndex * pageSize, pageSize);
        const embed = registryEmbed(pageIndex, totalPages, total, rows);
        const row = registryRow(pageIndex, totalPages);

        return safeReply(interaction, { embeds: [embed], components: [row], allowedMentions: { parse: [] } });
      }

      // OWNER ONLY
      if (name === "menfesspanel") {
        if (!isBotOwner(interaction.user.id)) {
          return safeReply(interaction, { content: "❌ command ini cuma buat pembuat bot.", flags: MessageFlags.Ephemeral });
        }

        const ch = await getTextChannelOrNull(interaction.guild, requireEnv("MENFESS_CHANNEL_ID"));
        if (!ch) {
          return safeReply(interaction, { content: "⚠️ MENFESS_CHANNEL_ID tidak ketemu / bot tidak punya akses / bukan text channel.", flags: MessageFlags.Ephemeral });
        }

        await ch.send({ embeds: [menfessPanelEmbed()], components: [menfessPanelRow()], allowedMentions: { parse: [] } });
        return safeReply(interaction, { content: "✅ panel menfess terkirim ke channel menfess.", flags: MessageFlags.Ephemeral });
      }

      if (name === "menfess") {
        if (!interaction.guild) return;

        // Anti spam
        const cdKey = `${interaction.guildId}:${interaction.user.id}`;
        const now = Date.now();
        const last = menfessCooldown.get(cdKey) || 0;
        const cooldownMs = Number(process.env.MENFESS_COOLDOWN_MS || 15_000);
        const passCooldown = now - last >= cooldownMs;

        if (!passCooldown) {
          return safeReply(interaction, {
            content: `⏳ pelan dulu ya, coba lagi <t:${Math.floor((last + cooldownMs) / 1000)}:R>`,
            flags: MessageFlags.Ephemeral,
          });
        }
        menfessCooldown.set(cdKey, now);

        const ch = await getTextChannelOrNull(interaction.guild, requireEnv("MENFESS_CHANNEL_ID"));
        if (!ch) {
          return safeReply(interaction, {
            content: "⚠️ MENFESS_CHANNEL_ID tidak ketemu / bot tidak punya akses / bukan text channel.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const msg = interaction.options.getString("pesan").trim().slice(0, 900);
        const to = (interaction.options.getString("untuk") || "").trim().slice(0, 60);
        const attachment = interaction.options.getAttachment("lampiran");

        if (attachment) {
          if (attachment.size > 50 * 1024 * 1024) {
            return safeReply(interaction, {
              content: "⚠️ Lampiran tidak boleh lebih dari 50MB!",
              flags: MessageFlags.Ephemeral,
            });
          }
        }

        const anonLabel = await getAnonLabel(interaction.user.id);
        const id = await nextMenfessId();

        // simpan post dulu (message_id nanti di-update setelah send)
        await insertMenfessPost({ id, messageId: null, channelId: ch.id }).catch(() => null);

        const embed = new EmbedBuilder()
          .setTitle(`🕯️ MENFESS #${id}`)
          .setColor(EMBED_COLOR)
          .setDescription(
            [
              to ? `**Untuk:** ${to}` : null,
              msg,
              `Menfess • <t:${Math.floor(Date.now() / 1000)}:f>`,
            ].filter(Boolean).join("\n\n")
          );

        const files = [];
        let logImageUrl = null;

        if (attachment) {
          const isImage = attachment.contentType?.startsWith("image/") ||
            /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.name);

          if (isImage) {
            embed.setImage(attachment.url);
            logImageUrl = attachment.url;
          } else {
            files.push(new AttachmentBuilder(attachment.url, { name: attachment.name }));
          }
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("menfess:new").setLabel("Kirim Baru").setStyle(ButtonStyle.Success).setEmoji("✉️"),
          new ButtonBuilder().setCustomId(`menfess:reply:${id}`).setLabel("Balas Anonim").setStyle(ButtonStyle.Primary).setEmoji("🫧")
        );

        const sendOptions = { embeds: [embed], components: [row], allowedMentions: { parse: [] } };
        if (files.length > 0) {
          sendOptions.files = files;
        }

        const sent = await ch.send(sendOptions).catch(() => null);
        if (sent?.id) {
          await updateMenfessPostLink(id, { messageId: sent.id, channelId: ch.id }).catch(() => null);
        }

        await sendMenfessLog(interaction.guild, {
          kind: "post",
          id,
          senderId: interaction.user.id,
          senderNick: interaction.member?.displayName || interaction.user.username,
          anonLabel,
          to,
          channelId: ch.id,
          messageId: sent?.id || null,
          content: msg,
          image: logImageUrl,
        }).catch(() => null);

        return safeReply(interaction, { content: "✅ menfess terkirim.", flags: MessageFlags.Ephemeral });
      }

      // OWNER ONLY
      if (name === "sortingpanel") {
        if (!isBotOwner(interaction.user.id)) {
          return safeReply(interaction, { content: "❌ command ini cuma buat pembuat bot.", flags: MessageFlags.Ephemeral });
        }

        const targetChannelId = requireEnv("SORTING_CHANNEL_ID") || interaction.channelId;
        const ch = await getTextChannelOrNull(interaction.guild, targetChannelId);
        if (!ch) {
          return safeReply(interaction, { content: "⚠️ SORTING_CHANNEL_ID tidak valid / bot tidak punya akses / bukan text channel.", flags: MessageFlags.Ephemeral });
        }

        await ch.send({ components: sortingPanelComponentsV2(), flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
        return safeReply(interaction, { content: "✅ panel sorting terkirim.", flags: MessageFlags.Ephemeral });
      }

      // ===================== AFK LIST =====================
      // ===================== AFK LIST (EMBED + PAGINATION) =====================
      if (name === "afk_list") {
        await interaction.deferReply(); // public

        try {
          const rows = await getAllAfkUsers();
          if (!rows.length) {
            return interaction.editReply("✅ Tidak ada user yang sedang AFK.");
          }

          const perPage = 10;
          const page = 0;
          const maxPage = Math.ceil(rows.length / perPage);

          const buildEmbed = (pageIndex) => {
            const start = pageIndex * perPage;
            const slice = rows.slice(start, start + perPage);

            const desc = slice
              .map((u, i) => {
                const since = `<t:${Math.floor((Number(u.since) || Date.now()) / 1000)}:R>`;
                return `**${start + i + 1}.** <@${u.user_id}> — ${u.reason || "_tanpa alasan_"} (${since})`;
              })
              .join("\n");

            return new EmbedBuilder()
              .setTitle("😴 Daftar Member AFK")
              .setColor(EMBED_COLOR)
              .setDescription(desc)
              .setFooter({
                text: `Total AFK: ${rows.length} • Page ${pageIndex + 1}/${maxPage}`,
              })
              .setTimestamp();
          };

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`afk:list:${page - 1}`)
              .setLabel("⬅ Prev")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),

            new ButtonBuilder()
              .setCustomId(`afk:list:${page + 1}`)
              .setLabel("Next ➡")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(maxPage <= 1)
          );

          return interaction.editReply({
            embeds: [buildEmbed(page)],
            components: [row],
          });
        } catch (err) {
          console.error("[AFK_LIST ERROR]", err);
          // penting: nutup defer
          return interaction.editReply("❌ Gagal ambil AFK list. Coba lagi ya.");
        }
      }

      // OWNER ONLY
      if (name === "idcard") {
        if (!isBotOwner(interaction.user.id)) {
          return safeReply(interaction, { content: "❌ fitur ID Card ini dikunci (khusus pembuat bot).", flags: MessageFlags.Ephemeral });
        }

        const embed = new EmbedBuilder()
          .setTitle(`🪪 ${ID_CARD_TITLE}`)
          .setColor(EMBED_COLOR)
          .setDescription("Klik tombol untuk membuat / update **MYSTRAL IDENTITY CARD** kamu.")
          .setFooter({ text: "Theme: isi Status pakai `| dark` atau `| light` (contoh: single | dark)" });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("idcard:open").setLabel("Buat / Update ID").setStyle(ButtonStyle.Primary).setEmoji("🪪")
        );

        return safeReply(interaction, { embeds: [embed], components: [row] });
      }

      if (name === "myhouse") {
        if (!interaction.guild) return safeReply(interaction, { content: "Command ini cuma bisa dipakai di server ya.", flags: 0 });

        const targetUser = interaction.options.getUser("user") || interaction.user;

        const sorted = await getSortedUser(targetUser.id);
        if (!sorted?.choice) {
          return safeReply(interaction, { content: `⚠️ ${targetUser.id === interaction.user.id ? "Kamu" : `<@${targetUser.id}>`} belum melakukan Arcane Sorting.`, allowedMentions: { parse: [] } });
        }

        const idData = await getIdCard(targetUser.id);
        if (!idData) {
          const idCh = requireEnv("IDCARD_CHANNEL_ID");
          const mention = idCh ? `<#${idCh}>` : "channel ID Card";
          return safeReply(interaction, { content: `⚠️ ${targetUser.id === interaction.user.id ? "Kamu" : `<@${targetUser.id}>`} belum punya **Mystral Academy ID Card**.\nSilahkan buat dulu di ${mention} dengan command **/idcard**.`, allowedMentions: { parse: [] } });
        }

        await safeDefer(interaction, false);

        const png = await renderHouseCard({
          choice: sorted.choice,
          name: idData.name || targetUser.username,
          gender: idData.gender || "—",
          hovId: idData.number || "—",
          avatarUrl: targetUser.displayAvatarURL({ extension: "png", size: 256 }),
        });

        const filename = `house_${targetUser.id}.png`;
        const file = new AttachmentBuilder(png, { name: filename });

        const embed = new EmbedBuilder()
          .setTitle("🪪 Mystral Academy Card")
          .setColor(EMBED_COLOR)
          .setDescription(
            [
              `**Member:** <@${targetUser.id}>`,
              `**Student:** ${sorted.choice === "dark" ? "<:dark:1459543141609771101> Dark Arcane" : "<:light:1459543076736336004> Light Arcane"}`,
            ].join("\n")
          )
          .setImage(`attachment://${filename}`)
          .setFooter({ text: "Mystral Academy • Student Registry" })
          .setTimestamp();

        return safeReply(interaction, { embeds: [embed], files: [file], allowedMentions: { parse: [] } });
      }

      // ===================== SLASH: /stealemoji =====================
      if (name === "stealemoji") {
        if (!interaction.guild) {
          return safeReply(interaction, { content: "❌ Command ini hanya bisa dipakai di server.", flags: MessageFlags.Ephemeral });
        }

        // Permission check (sudah di defaultMemberPermissions, tapi double-check)
        if (
          !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions) &&
          !isBotOwner(interaction.user.id)
        ) {
          return safeReply(interaction, { content: "❌ Kamu butuh permission **Manage Emojis** untuk pakai command ini.", flags: MessageFlags.Ephemeral });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) {
          return safeReply(interaction, { content: "❌ Bot tidak punya permission **Manage Emojis** di server ini.", flags: MessageFlags.Ephemeral });
        }

        const rawInput = interaction.options.getString("emoji", true);
        const customName = interaction.options.getString("nama", false);

        // Parse semua emoji dari input: <:name:id> atau <a:name:id>
        const EMOJI_REGEX = /<(a?):([a-zA-Z0-9_]{2,32}):(\d{15,25})>/g;
        const matches = [...rawInput.matchAll(EMOJI_REGEX)];

        if (!matches.length) {
          return safeReply(interaction, {
            content: [
              "❌ Tidak ada emoji custom yang terdeteksi!",
              "",
              "**Cara pakai:**",
              "1. Ketik `\\` lalu emoji kamu di chat manapun untuk dapat format mentionnya",
              "2. Copy format seperti `<:namaemoji:123456789>` atau `<a:animated:987654321>`",
              "3. Paste ke field `emoji` command ini",
              "",
              "Emoji dari server lain (tanpa bot masuk ke sana) juga bisa! 🎉"
            ].join("\n"),
            flags: MessageFlags.Ephemeral
          });
        }

        await safeDefer(interaction, false);

        const results = [];
        for (const match of matches) {
          const [, animated, emojiName, emojiId] = match;
          const ext = animated === "a" ? "gif" : "png";
          const cdnUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}`;

          // Gunakan nama custom hanya jika ada 1 emoji dan nama diberikan
          const finalName = (customName && matches.length === 1)
            ? customName.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32) || emojiName
            : emojiName;

          try {
            const resp = await fetch(cdnUrl);
            if (!resp.ok) throw new Error(`CDN returned ${resp.status} — emoji mungkin tidak valid atau sudah dihapus`);
            const buf = Buffer.from(await resp.arrayBuffer());
            const b64 = `data:image/${ext === "gif" ? "gif" : "png"};base64,${buf.toString("base64")}`;

            const created = await interaction.guild.emojis.create({
              attachment: b64,
              name: finalName,
              reason: `Stolen by ${interaction.user.tag} via /stealemoji`,
            });

            results.push({
              ok: true,
              text: `✅ ${created} \`${created.name}\` — berhasil ditambahkan!`,
            });
          } catch (err) {
            const reason = err?.rawError?.message || err?.message || "Unknown error";
            results.push({
              ok: false,
              text: `❌ \`${finalName}\` (\`${emojiId}\`) — gagal: ${reason}`,
            });
          }
        }

        const successCount = results.filter(r => r.ok).length;
        const failCount = results.length - successCount;

        const embed = new EmbedBuilder()
          .setTitle(`🎉 Steal Emoji — ${successCount}/${matches.length} Berhasil`)
          .setColor(successCount === matches.length ? 0x57f287 : failCount === matches.length ? 0xed4245 : 0xfee75c)
          .setDescription(results.map(r => r.text).join("\n") || "Tidak ada hasil.")
          .setFooter({ text: `Diminta oleh ${interaction.user.tag} • ${BRAND_NAME}` })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }
    }

    // ===================== BUTTONS =====================
    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id.startsWith("registry:")) {
        await safeDeferUpdate(interaction);

        const [, action, currentStr] = id.split(":");
        const current = Number(currentStr || 0);

        const total = await countRegistry();
        const pageSize = 10;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));

        let nextPage = current;
        if (action === "prev") nextPage = Math.max(0, current - 1);
        if (action === "next") nextPage = Math.min(totalPages - 1, current + 1);

        const rows = await registryPage(nextPage * pageSize, pageSize);
        const embed = registryEmbed(nextPage, totalPages, total, rows);
        const row = registryRow(nextPage, totalPages);

        return interaction.message.edit({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
      }

      // ===================== GIVEAWAY BUTTONS =====================
      if (id.startsWith("gw:join:") || id.startsWith("gw:leave:")) {
        if (!interaction.guild) return safeReply(interaction, { content: "Guild only.", flags: MessageFlags.Ephemeral });

        const [_, action, idStr] = id.split(":");
        const giveawayId = Number(idStr);
        if (!giveawayId) return safeReply(interaction, { content: "⚠️ Giveaway ID tidak valid.", flags: MessageFlags.Ephemeral });

        // Update message (no new reply spam)
        await safeDeferUpdate(interaction);

        const g = await getGiveaway(giveawayId);
        if (!g) {
          return interaction.followUp({ content: "❌ Giveaway tidak ditemukan.", flags: MessageFlags.Ephemeral }).catch(() => { });
        }

        // ended?
        if (g.is_ended) {
          return interaction.followUp({ content: "⚠️ Giveaway sudah berakhir.", flags: MessageFlags.Ephemeral }).catch(() => { });
        }

        if (action === "join") await joinGiveaway(giveawayId, interaction.user.id);
        if (action === "leave") await leaveGiveaway(giveawayId, interaction.user.id);

        const entries = await countGiveawayEntries(giveawayId);

        // rebuild embed (keep same style)
        const newEmbed = giveawayEmbed({
          id: giveawayId,
          prize: g.prize,
          winners: g.winners,
          hostId: g.host_id,
          endAt: g.end_at,
          entries,
          ended: Boolean(g.is_ended),
        });

        await interaction.message.edit({ embeds: [newEmbed], components: [giveawayRow(giveawayId)] }).catch(() => { });
        return;
      }

      // ===================== IDCARD BUTTON =====================
      if (id === "idcard:open") {
        if (!interaction.guild) return safeReply(interaction, { content: "Guild only.", flags: MessageFlags.Ephemeral });

        // IMPORTANT: showModal must be the FIRST response (no defer/reply before)
        const modal = new ModalBuilder().setCustomId("idcard:modal").setTitle("Mystral Identity Card");
        const existingIdCard = await getIdCard(interaction.user.id).catch(() => null);

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("name").setLabel("Nama").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32).setValue(existingIdCard?.name || "")
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("gender").setLabel("Gender (Cowok/Cewek)").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(16).setValue(existingIdCard?.gender || "")
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("domicile").setLabel("Domisili").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32).setValue(existingIdCard?.domisili || "")
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("hobby").setLabel("Hobi").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(40).setValue(existingIdCard?.hobi || "")
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("status").setLabel("Status (opsional)").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(24).setValue(existingIdCard?.status || "")
          )
        );

        return interaction.showModal(modal);
      }

      if (interaction.isButton() && interaction.customId === "ticket:create") {
        const has = await userHasOpenTicket(interaction.guild.id, interaction.user.id);
        if (has) {
          return interaction.reply({ content: "⚠️ Kamu masih punya ticket.", ephemeral: true });
        }

        const modal = new ModalBuilder()
          .setCustomId("ticket:modal")
          .setTitle("Buat Ticket");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("title")
              .setLabel("Judul Ticket")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }


    } // close pending block

  } catch (err) {
    console.error("[INTERACTION ERROR]", err);

    try {
      if (interaction.deferred && !interaction.replied) {
        return await interaction.editReply({ content: "⚠️ ada error di bot, coba lagi ya." });
      }

      if (!interaction.replied && !interaction.deferred) {
        return await interaction.reply({
          content: "⚠️ ada error di bot, coba lagi ya.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch { }
  }
}); // end Events.InteractionCreate (main handler)

// ================== QUOTES SYSTEM ================== //
// NOTE: semua perubahan di bawah ini khusus untuk sistem Quotes (sesuai request).
const QUOTES_CHANNEL_ID = process.env.QUOTES_CHANNEL_ID || "";
const WATERMARK_TEXT = process.env.WATERMARK_TEXT || "Prophetia";
const QUOTES_THEME = (process.env.THEME || "dark").toLowerCase(); // "dark" / "light"
const QUOTES_TIMEZONE = process.env.TIMEZONE || "Asia/Jakarta";

function formatQuoteTime(d) {
  const dt = new Date(d);
  return dt.toLocaleString("id-ID", {
    timeZone: QUOTES_TIMEZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildQuoteButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("add_quote").setLabel("Add Quote").setStyle(ButtonStyle.Secondary).setEmoji("➕")
  );
}

// ================== FONT STACK (NO FILES) ================== //
function quoteFontFamily() {
  return `"Georgia","Times New Roman","Garamond","Palatino Linotype",serif`;
}
function uiFontFamily() {
  return `"Segoe UI","Inter","Helvetica Neue",Arial,sans-serif`;
}

// ================== CANVAS RENDER ================== //
async function renderQuoteImage({ avatarURL, quote, authorName, authorTag, watermark, theme }) {
  const W = 1024;
  const H = 512;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const avatar = await loadImage(avatarURL);

  const isDark = (theme || "dark") !== "light";
  const bgOverlay = isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.55)";
  const panel = isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.40)";
  const textMain = isDark ? "rgba(255,255,255,0.95)" : "rgba(20,20,20,0.92)";
  const textSub = isDark ? "rgba(255,255,255,0.65)" : "rgba(20,20,20,0.60)";
  const stroke = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";

  // background blur dari avatar
  const bgScale = 1.25;
  const bgW = W * bgScale;
  const bgH = H * bgScale;
  const bgX = (W - bgW) / 2;
  const bgY = (H - bgH) / 2;

  ctx.save();
  ctx.filter = "blur(18px)";
  ctx.drawImage(avatar, bgX, bgY, bgW, bgH);
  ctx.restore();

  ctx.fillStyle = bgOverlay;
  ctx.fillRect(0, 0, W, H);

  drawVignette(ctx, W, H, isDark);

  const radius = 26;
  const pad = 26;

  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, radius);
  ctx.fillStyle = panel;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  // avatar panel
  const avaSize = 360;
  const avaX = pad + 24;
  const avaY = Math.floor((H - avaSize) / 2);
  const avaRadius = 28;

  ctx.save();
  roundRect(ctx, avaX, avaY, avaSize, avaSize, avaRadius);
  ctx.clip();
  ctx.drawImage(avatar, avaX, avaY, avaSize, avaSize);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.22;
  roundRect(ctx, avaX, avaY, avaSize, avaSize, avaRadius);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.restore();

  // text area
  const textAreaX = avaX + avaSize + 44;
  const textAreaY = pad + 44;
  const textAreaW = W - textAreaX - (pad + 44);
  const textAreaH = H - (pad + 44) * 2;

  const qFont = quoteFontFamily();

  // Tambah tanda petik aesthetic
  const quoteText = `“${quote}”`;

  let fontSize = 60;
  let lines = [];

  while (fontSize >= 26) {
    ctx.font = `${fontSize}px ${qFont}`;
    lines = wrapQuoteText(ctx, quoteText, textAreaW);

    const lineHeight = Math.floor(fontSize * 1.18);
    const totalH = lines.length * lineHeight;

    // batas nyaman: max 5 baris
    if (totalH <= textAreaH - 90 && lines.length <= 5) break;
    fontSize -= 2;
  }

  const lineHeight = Math.floor(fontSize * 1.18);
  const textBlockH = lines.length * lineHeight;
  const startY = textAreaY + Math.floor((textAreaH - textBlockH) * 0.40);

  ctx.fillStyle = textMain;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const centerX = textAreaX + Math.floor(textAreaW / 2);

  // Quote text (serif)
  ctx.font = `${fontSize}px ${qFont}`;
  for (let i = 0; i < lines.length; i++) {
    drawSoftText(ctx, lines[i], centerX, startY + i * lineHeight, isDark);
  }

  // Author (modern UI font)
  const authorY = startY + textBlockH + 18;
  ctx.fillStyle = textSub;
  ctx.font = `italic 22px ${uiFontFamily()}`;
  ctx.textAlign = "center";
  ctx.fillText(`- ${authorName}`, centerX, authorY);

  ctx.font = `18px ${uiFontFamily()}`;
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.45)" : "rgba(20,20,20,0.40)";
  ctx.fillText(authorTag || "", centerX, authorY + 26);

  // Watermark (modern UI font)
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.font = `16px ${uiFontFamily()}`;
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.25)" : "rgba(20,20,20,0.25)";
  ctx.fillText(`Mystral Academy • ${watermark}`, W - pad - 18, H - pad - 16);

  addNoise(ctx, W, H, isDark ? 0.06 : 0.04);

  return canvas.toBuffer("image/png");
}

// ================== TEXT HELPERS ================== //
function wrapQuoteText(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = ctx.measureText(test).width;
    if (width <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);

  if (lines.length === 1 && ctx.measureText(lines[0]).width > maxWidth) {
    return hardBreak(ctx, lines[0], maxWidth);
  }
  return lines;
}

function hardBreak(ctx, text, maxWidth) {
  const out = [];
  let cur = "";
  for (const ch of text) {
    const test = cur + ch;
    if (ctx.measureText(test).width <= maxWidth) cur = test;
    else {
      if (cur) out.push(cur);
      cur = ch;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// ================== DRAW HELPERS ================== //
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawVignette(ctx, W, H, isDark) {
  const grd = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.15, W / 2, H / 2, Math.min(W, H) * 0.75);
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, isDark ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.35)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
}

function addNoise(ctx, W, H, alpha) {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;

  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255;
    d[i] = clamp(d[i] + n * alpha);
    d[i + 1] = clamp(d[i + 1] + n * alpha);
    d[i + 2] = clamp(d[i + 2] + n * alpha);
  }
  ctx.putImageData(img, 0, 0);
}

function clamp(v) {
  return Math.max(0, Math.min(255, v));
}

function drawSoftText(ctx, text, x, y, isDark) {
  ctx.save();
  ctx.shadowColor = isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.35)";
  ctx.shadowBlur = 10;
  ctx.fillText(text, x, y);
  ctx.restore();
}

if (QUOTES_CHANNEL_ID) {
  // ================== AUTO QUOTE (MESSAGE -> IMAGE) ================== //
  client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || message.author.bot) return;
    if (message.channelId !== QUOTES_CHANNEL_ID) return;

    try {
      const raw = (message.content || "").trim();
      if (!raw) return;

      const text = raw.length > 240 ? raw.slice(0, 240) + "…" : raw;
      const avatarURL = message.author.displayAvatarURL({ extension: "png", size: 512 });

      const buffer = await renderQuoteImage({
        avatarURL,
        quote: text,
        authorName: message.member?.displayName || message.author.username,
        authorTag: `@${message.author.username}`,
        watermark: WATERMARK_TEXT,
        theme: QUOTES_THEME,
      });

      const fileName = `quote-${message.id}.png`;
      const attachment = new AttachmentBuilder(buffer, { name: fileName });

      const embed = new EmbedBuilder()
        .setColor(0x111111)
        .setTitle("**📩 𝐐𝐮𝐨𝐭𝐞𝐬**")
        .setDescription(`Made by ${message.author}`)
        .setImage(`attachment://${fileName}`)
        .setFooter({ text: `Generated • ${formatQuoteTime(Date.now())}` });

      await message.delete().catch(() => null);

      await message.channel.send({
        embeds: [embed],
        files: [attachment],
        components: [buildQuoteButtonRow()],
      });
    } catch (err) {
      console.error("[QUOTES] message error:", err);
    }
  });

  // ================== INTERACTIONS ================== //
  client.on(Events.InteractionCreate, async (interaction) => {
    // Button -> Modal
    if (interaction.isButton() && interaction.customId === "add_quote") {
      if (interaction.channelId !== QUOTES_CHANNEL_ID) {
        return interaction.reply({ content: "Ini cuma bisa dipakai di quotes channel.", ephemeral: true });
      }

      const modal = new ModalBuilder().setCustomId("add_quote_modal").setTitle("Add a Quote");

      const quoteInput = new TextInputBuilder()
        .setCustomId("quote_text")
        .setLabel("Your quote")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(240);

      modal.addComponents(new ActionRowBuilder().addComponents(quoteInput));
      await interaction.showModal(modal);
      return;
    }

    // Modal submit -> generate
    if (interaction.isModalSubmit() && interaction.customId === "add_quote_modal") {
      if (interaction.channelId !== QUOTES_CHANNEL_ID) {
        return interaction.reply({ content: "Ini cuma bisa dipakai di quotes channel.", ephemeral: true });
      }

      const quoteText = (interaction.fields.getTextInputValue("quote_text") || "").trim();
      if (!quoteText) return interaction.reply({ content: "Quote kosong.", ephemeral: true });

      await interaction.deferReply({ ephemeral: true });

      try {
        const avatarURL = interaction.user.displayAvatarURL({ extension: "png", size: 512 });

        const buffer = await renderQuoteImage({
          avatarURL,
          quote: quoteText.length > 240 ? quoteText.slice(0, 240) + "…" : quoteText,
          authorName: interaction.member?.displayName || interaction.user.username,
          authorTag: `@${interaction.user.username}`,
          watermark: WATERMARK_TEXT,
          theme: QUOTES_THEME,
        });

        const fileName = `quote-${interaction.id}.png`;
        const attachment = new AttachmentBuilder(buffer, { name: fileName });

        const embed = new EmbedBuilder()
          .setColor(0x111111)
          .setTitle("**📩 𝐐𝐮𝐨𝐭𝐞𝐬**")
          .setDescription(`Made by ${interaction.user}`)
          .setImage(`attachment://${fileName}`)
          .setFooter({ text: `Generated • ${formatQuoteTime(Date.now())}` });

        await interaction.channel.send({
          embeds: [embed],
          files: [attachment],
          components: [buildQuoteButtonRow()],
        });

        await interaction.editReply("Done.");
      } catch (err) {
        console.error("[QUOTES] modal error:", err);
        await interaction.editReply("Error bikin quote.");
      }
      return;
    }
  });
}

// ===================== TICKET: CLEANUP ON MANUAL DELETE =====================
// Kalau channel ticket dihapus manual, tandai closed di DB agar user bisa bikin ticket baru.
client.on("channelDelete", async (channel) => {
  try {
    if (!channel?.guild?.id) return;
    const topic = String(channel.topic || "");
    if (!topic.includes("[TICKET:") || !topic.includes("[OWNER:")) return;

    await safeRun(
      `UPDATE tickets_custom SET closed_at=? WHERE guild_id=? AND channel_id=? AND closed_at IS NULL`,
      [Date.now(), String(channel.guild.id), String(channel.id)]
    ).catch(() => null);
  } catch (e) {
    console.error("[ticket][channelDelete cleanup]", e);
  }
});




// ===================== LOG TICKET HELPERS (ADD-ONLY) =====================
function stripHtmlToText(input) {
  try {
    const html = String(input ?? "");
    return html
      .replace(/\r\n/g, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li>/gi, "• ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  } catch {
    return String(input ?? "");
  }
}

async function sendTicketLogEmbed(guild, embed) {
  try {
    const logCh = await getTicketLogChannel(guild).catch(() => null);
    if (!logCh) return false;
    await logCh.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => null);
    return true;
  } catch {
    return false;
  }
}

async function sendTicketLogTranscriptTxt(guild, channel, filenameBase) {
  try {
    const logCh = await getTicketLogChannel(guild).catch(() => null);
    if (!logCh) return false;

    const t = await buildTicketTranscript(channel).catch(() => null);

    let raw = "";
    if (typeof t === "string") raw = t;
    else if (Buffer.isBuffer(t)) raw = t.toString("utf8");
    else if (t && typeof t === "object" && (typeof t.attachment === "string" || Buffer.isBuffer(t.attachment))) {
      raw = Buffer.isBuffer(t.attachment) ? t.attachment.toString("utf8") : String(t.attachment);
    } else if (t && typeof t === "object" && (typeof t.data === "string" || Buffer.isBuffer(t.data))) {
      raw = Buffer.isBuffer(t.data) ? t.data.toString("utf8") : String(t.data);
    } else if (t) raw = JSON.stringify(t, null, 2);

    const txt = stripHtmlToText(raw);
    const buf = Buffer.from(txt || "—", "utf8");

    await logCh
      .send({
        files: [{ attachment: buf, name: `${filenameBase}.txt` }],
        allowedMentions: { parse: [] },
      })
      .catch(() => null);

    return true;
  } catch {
    return false;
  }
}

// ===================== BOOT =====================
(async function boot() {
  try {
    if (!process.env.DISCORD_TOKEN) {
      console.error("❌ DISCORD_TOKEN belum diisi di .env");
      process.exit(1);
    }

    const nodeVer = process.version;
    const platform = `${process.platform}-${process.arch}`;
    const memoryUsage = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`;

    console.log("┌────────────────────────────────────────────────────────┐");
    console.log("│             🔮 MYSTRAL ACADEMY BOOTLOADER 🔮           │");
    console.log("└────────────────────────────────────────────────────────┘");
    console.log(` ├── [SYSTEM] Node: ${nodeVer} | Platform: ${platform} | Heap: ${memoryUsage}`);

    // Check critical envs
    const requiredEnvs = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID", "MENFESS_CHANNEL_ID", "TICKET_LOG_CHANNEL_ID"];
    const verifiedEnvs = requiredEnvs.map(e => {
      const ok = !!process.env[e] && String(process.env[e]).trim().length > 0;
      return `${e.replace("_CHANNEL_ID", "").replace("_ID", "")}: ${ok ? "✅" : "❌"}`;
    }).join(" | ");
    console.log(` ├── [CONFIG] Envs: ${verifiedEnvs}`);

    // Print font status
    const famNames = (GlobalFonts.families || [])
      .map((f) => (typeof f === "string" ? f : f?.family))
      .filter(Boolean);
    const hasInter = famNames.includes("InterReg") && famNames.includes("InterBold");
    const hasCinzel = famNames.includes("Cinzel");
    console.log(` ├── [FONT] Inter: ${hasInter ? "✅ Loaded" : "❌ Fallback"} | Cinzel: ${hasCinzel ? "✅ Loaded" : "❌ Missing"}`);

    openDb();
    await initDb();
    await ensureMenfessCounterStart();

    // Init Mystral Flame Streak Subsystem
    const streakSubsystem = require("./streak");
    await streakSubsystem.init(client, { dbGet, dbAll, dbRun, dbExec });

    // Check SQLite DB size
    let dbSizeFormatted = "0 B";
    try {
      if (fs.existsSync(SQLITE_PATH)) {
        const stats = fs.statSync(SQLITE_PATH);
        const bytes = stats.size;
        if (bytes < 1024) dbSizeFormatted = `${bytes} B`;
        else if (bytes < 1048576) dbSizeFormatted = `${(bytes / 1024).toFixed(1)} KB`;
        else dbSizeFormatted = `${(bytes / 1048576).toFixed(1)} MB`;
      }
    } catch { }

    console.log(` ├── [DB] Engine: ${DB_ENGINE} | Path: ${SQLITE_PATH} (${dbSizeFormatted})`);
    console.log(" ├── [CLIENT] Connecting to Discord Gateway...");
    client.login(process.env.DISCORD_TOKEN);
  } catch (e) {
    console.error("❌ Boot failed:", e);
    process.exit(1);
  }
})();
// ===================== BACKUP ON EXIT =====================
process.on("SIGINT", async () => {
  await backupDatabase("sigint");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await backupDatabase("sigterm");
  process.exit(0);
});

process.on("uncaughtException", async (err) => {
  console.error("[CRASH]", err);
  await backupDatabase("crash");
  process.exit(1);
});

process.on("unhandledRejection", async (err) => {
  console.error("[REJECT]", err);
  await backupDatabase("reject");
});

