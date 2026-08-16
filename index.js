/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║                                                                      ║
 * ║                  🔮  MYSTRAL ASSISTANT CORE ENGINE  🔮              ║
 * ║                           Version 2.5.0 - Ultimate                   ║
 * ║                                                                      ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  🚀 Stack     : Node.js v22+ | Discord.js v14 | Mongoose (Atlas)     ║
 * ║  🎨 Canvas    : @napi-rs/canvas (High Performance 2D Engine)         ║
 * ║  🔥 Modules   : Flame Streak | Cyber ID Card | Menfess | Ticket V2   ║
 * ║  🛡️ Host      : Pterodactyl Panel | Linux x64 | Railway | VPS        ║
 * ║  ✨ Design    : Premium Components V2 | Cyberpunk Aesthetics         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
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
  SectionBuilder,
  SeparatorBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  FileUploadBuilder,
  LabelBuilder,
  ChannelType,
  AuditLogEvent,
} = require("discord.js");

const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const { joinVoiceChannel, VoiceConnectionStatus, getVoiceConnection } = require("@discordjs/voice");

async function removeImageBackground(imageBuffer) {
  const { createCanvas, loadImage } = require("@napi-rs/canvas");
  const img = await loadImage(imageBuffer);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imgData.data;
  const W = img.width;
  const H = img.height;

  const samplePoints = [
    [0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1],
    [Math.floor(W / 2), 0], [Math.floor(W / 2), H - 1],
    [0, Math.floor(H / 2)], [W - 1, Math.floor(H / 2)]
  ];

  let bgR = 0, bgG = 0, bgB = 0;
  for (const [x, y] of samplePoints) {
    const idx = (y * W + x) * 4;
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  }
  bgR = Math.round(bgR / samplePoints.length);
  bgG = Math.round(bgG / samplePoints.length);
  bgB = Math.round(bgB / samplePoints.length);

  const tolerance = 48;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    if (dist < tolerance) {
      const alphaFactor = dist / tolerance;
      data[i + 3] = Math.floor(data[i + 3] * Math.pow(alphaFactor, 2.5));
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toBuffer("image/png");
}

// Apply linear gradient color to non-transparent pixels of a PNG buffer
async function applyGradientToTransparentImage(pngBuffer, color1Hex, color2Hex) {
  const { createCanvas, loadImage } = require("@napi-rs/canvas");
  const img = await loadImage(pngBuffer);
  const W = img.width;
  const H = img.height;

  // Parse hex colors to RGB
  const parseHex = (h) => {
    const hex = h.replace("#", "");
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  };

  const [r1, g1, b1] = parseHex(color1Hex);
  const [r2, g2, b2] = parseHex(color2Hex || color1Hex);

  // Read alpha mask from original image
  const maskCanvas = createCanvas(W, H);
  const maskCtx = maskCanvas.getContext("2d");
  maskCtx.drawImage(img, 0, 0);
  const maskData = maskCtx.getImageData(0, 0, W, H);

  // Draw gradient on a new canvas
  const gradCanvas = createCanvas(W, H);
  const gradCtx = gradCanvas.getContext("2d");
  const grad = gradCtx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, color1Hex.startsWith("#") ? color1Hex : `#${color1Hex}`);
  grad.addColorStop(1, (color2Hex || color1Hex).startsWith("#") ? (color2Hex || color1Hex) : `#${color2Hex || color1Hex}`);
  gradCtx.fillStyle = grad;
  gradCtx.fillRect(0, 0, W, H);
  const gradData = gradCtx.getImageData(0, 0, W, H);

  // Combine: use gradient color but original alpha mask
  const outCanvas = createCanvas(W, H);
  const outCtx = outCanvas.getContext("2d");
  const outData = outCtx.getImageData(0, 0, W, H);
  for (let i = 0; i < maskData.data.length; i += 4) {
    const alpha = maskData.data[i + 3];
    if (alpha > 0) {
      outData.data[i] = gradData.data[i];     // R from gradient
      outData.data[i + 1] = gradData.data[i + 1]; // G from gradient
      outData.data[i + 2] = gradData.data[i + 2]; // B from gradient
      outData.data[i + 3] = alpha;                // A from mask
    } else {
      outData.data[i + 3] = 0; // fully transparent
    }
  }
  outCtx.putImageData(outData, 0, 0);
  return outCanvas.toBuffer("image/png");
}

// ===================== CONFIG =====================
const BRAND_NAME = "Mystral Assistant";
const ID_CARD_TITLE = "MYSTRAL IDENTITY CARD";
const EMBED_COLOR = 0x000001;
const PREFIX = process.env.PREFIX || "c";

const BOT_OWNER_ID = String(process.env.BOT_OWNER_ID);

// ================== QUOTES SYSTEM CONFIG ==================
const QUOTES_CHANNEL_ID = process.env.QUOTES_CHANNEL_ID || "";
const WATERMARK_TEXT = process.env.WATERMARK_TEXT || "CYZA";
const QUOTES_THEME = (process.env.THEME || "dark").toLowerCase(); // "dark" / "light"
const QUOTES_TIMEZONE = process.env.TIMEZONE || "Asia/Jakarta";

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
    .setFooter({ text: "Mystral • Identity Registry" });

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
    .setFooter({ text: "Mystral • Social Affinity" });

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
    .setFooter({ text: "Mystral • Personal State" });

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
    .setFooter({ text: "Mystral • Region" });

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
    .setFooter({ text: "Mystral • Ping Opt-in" });

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

// ===================== DB BACKUP CONFIG =====================

// 6 jam

const OWNER_DM_BACKUP_TIMES = String(process.env.OWNER_DM_BACKUP_TIMES || "00:00,18:00")
  .split(",")
  .map((x) => x.trim())
  .filter((x) => /^([01]\d|2[0-3]):[0-5]\d$/.test(x));
const OWNER_DM_BACKUP_META_KEY = "owner_dm_db_backup_last_slot";

// ===================== MONGODB ATLAS CLOUD ENGINE =====================
let DB_ENGINE = "MongoDB Atlas Cloud (Mongoose)";

const {
  mongoose,
  connectMongo,
  MenfessPost,
  MenfessAnonMap,
  SortingUser,
  IdCardUser,
  AfkUser,
  MetaText,
  TarotUser,
  TarotCategoryStat,
  ModWarning,
  FaqItem,
  StreakSetting,
  StreakPair,
  StreakDailyActivity,
  StreakLog,
  StreakAchievement,
  StreakFreezeInventory,
  TimedRole,
  LeaderboardBlacklist,
  BoosterCustomRole,
  StaffTagConfig,
  StaffTagExempt,
  StaffTagSchedule,
} = require("./db");

let db = null;
let dbGet = mongoGet;
let dbAll = mongoAll;
let dbRun = mongoRun;
let dbExec = async () => true;
let dbTransaction = (fn) => async (...args) => await fn(...args);

function openDb() {
  DB_ENGINE = "MongoDB Atlas Cloud (Mongoose)";
  dbGet = mongoGet;
  dbAll = mongoAll;
  dbRun = mongoRun;
  dbExec = async () => true;
  dbTransaction = (fn) => async (...args) => await fn(...args);
}

// ===================== DYNAMIC MONGODB TRANSLATOR ENGINE =====================
const genericMongoModels = new Map();

function getMongoModel(tableName) {
  if (!tableName) return null;
  const cleanName = tableName.trim().toLowerCase();

  if (cleanName === "menfess_posts") return MenfessPost;
  if (cleanName === "menfess_anonmap") return MenfessAnonMap;
  if (cleanName === "sorting_users") return SortingUser;
  if (cleanName === "idcard_users") return IdCardUser;
  if (cleanName === "afk_users") return AfkUser;
  if (cleanName === "menfess_meta" || cleanName === "meta_text" || cleanName === "app_meta") return MetaText;
  if (cleanName === "streak_settings") return StreakSetting;
  if (cleanName === "streak_pairs") return StreakPair;
  if (cleanName === "streak_daily_activity") return StreakDailyActivity;
  if (cleanName === "streak_logs") return StreakLog;
  if (cleanName === "streak_achievements") return StreakAchievement;
  if (cleanName === "streak_freeze_inventory") return StreakFreezeInventory;
  if (cleanName === "tarot_users") return TarotUser;
  if (cleanName === "tarot_category_stats") return TarotCategoryStat;
  if (cleanName === "mod_warnings") return ModWarning;

  if (!genericMongoModels.has(cleanName)) {
    const modelName = "MongoTable_" + cleanName;
    const model = mongoose.models[modelName] || mongoose.model(modelName, new mongoose.Schema({}, { strict: false, collection: cleanName }));
    genericMongoModels.set(cleanName, model);
  }
  return genericMongoModels.get(cleanName);
}

function parseTableNameFromSql(sql) {
  if (!sql) return null;
  const match = sql.match(/(?:from|into|update|delete\s+from)\s+([`"]?[\w_]+[`"]?)/i);
  if (!match) return null;
  return match[1].replace(/[`"]/g, "").toLowerCase();
}

function parseQueryFromSql(sql, params = []) {
  const query = {};
  if (!sql || !params) return query;

  const whereMatch = sql.match(/where\s+([\s\S]+?)(?:order\s+by|limit|group\s+by|$)/i);
  if (!whereMatch) return query;

  const whereClause = whereMatch[1];
  const conds = whereClause.split(/\s+and\s+/i);
  let paramIdx = 0;

  for (let cond of conds) {
    cond = cond.trim();
    const eqParam = cond.match(/^([`"]?[\w_]+[`"]?)\s*=\s*\?/i);
    if (eqParam) {
      const field = eqParam[1].replace(/[`"]/g, "");
      if (paramIdx < params.length) {
        query[field] = params[paramIdx++];
      }
      continue;
    }
    const eqLit = cond.match(/^([`"]?[\w_]+[`"]?)\s*=\s*['"]?(.*?)['"]?$/i);
    if (eqLit) {
      const field = eqLit[1].replace(/[`"]/g, "");
      const val = eqLit[2];
      query[field] = /^\d+$/.test(val) ? Number(val) : val;
      continue;
    }
  }

  return query;
}

function parseOrderFromSql(sql) {
  if (!sql) return {};
  const orderMatch = sql.match(/order\s+by\s+([\w_]+)(?:\s+(asc|desc))?/i);
  if (!orderMatch) return {};
  const field = orderMatch[1].replace(/[`"]/g, "");
  const dir = orderMatch[2] && orderMatch[2].toLowerCase() === "desc" ? -1 : 1;
  return { [field]: dir };
}

function parseLimitFromSql(sql, params = []) {
  if (!sql) return 0;
  const limitMatch = sql.match(/limit\s+(\?|\d+)/i);
  if (!limitMatch) return 0;
  if (limitMatch[1] === "?") {
    const val = Number(params[params.length - 1]);
    return !isNaN(val) && val > 0 ? val : 0;
  }
  const val = Number(limitMatch[1]);
  return !isNaN(val) && val > 0 ? val : 0;
}

async function mongoGet(sql, params = []) {
  if (!sql) return null;
  const s = String(sql).toLowerCase();

  try {
    if (s.includes("count(*)")) {
      const tableName = parseTableNameFromSql(sql);
      if (tableName) {
        const Model = getMongoModel(tableName);
        if (Model) {
          const query = parseQueryFromSql(sql, params);
          const count = await Model.countDocuments(query);
          const aliasMatch = s.match(/count\(\*\)\s+as\s+([\w_]+)/i);
          const alias = aliasMatch ? aliasMatch[1] : "count";
          return { [alias]: count };
        }
      }
    }

    if (s.includes("idcard_users")) {
      const uId = params[0];
      const doc = await IdCardUser.findOne({ user_id: String(uId) });
      return doc ? doc.toObject() : null;
    }
    if (s.includes("afk_users")) {
      const uId = params[0];
      const doc = await AfkUser.findOne({ user_id: String(uId) });
      return doc ? doc.toObject() : null;
    }
    if (s.includes("sorting_users")) {
      const uId = params[0];
      const doc = await SortingUser.findOne({ user_id: String(uId) });
      return doc ? doc.toObject() : null;
    }
    if (s.includes("menfess_anonmap")) {
      const uId = params[0];
      const doc = await MenfessAnonMap.findOne({ user_id: String(uId) });
      return doc ? doc.toObject() : null;
    }
    if (s.includes("menfess_meta") || s.includes("meta_text")) {
      const key = s.includes("menfess_last_id") ? "menfess_last_id" : params[0];
      const doc = await MetaText.findOne({ key: String(key) });
      return doc ? { value: doc.value } : null;
    }
    if (s.includes("streak_settings")) {
      const gId = params[0];
      const doc = await StreakSetting.findOne({ guild_id: String(gId) });
      return doc ? doc.toObject() : null;
    }
    if (s.includes("streak_pairs")) {
      const gId = params[0] ? String(params[0]) : null;
      let query = {};
      if (gId) query.guild_id = gId;

      if (s.includes("where id = ?") || s.includes("where id=?")) {
        query.id = params[0];
      } else if (params.length >= 3 && String(params[1]) !== String(params[2])) {
        const u1 = String(params[1]);
        const u2 = String(params[2]);
        query.$or = [
          { user_one: u1, user_two: u2 },
          { user_one: u2, user_two: u1 },
        ];
      } else if (params.length >= 2) {
        const uId = String(params[1]);
        query.$or = [{ user_one: uId }, { user_two: uId }];
      }

      if (s.includes("status = 'active'") || s.includes("status='active'")) {
        query.status = "active";
      } else if (s.includes("status = 'broken'") || s.includes("status='broken'")) {
        query.status = "broken";
      } else if (s.includes("status = 'warning'") || s.includes("status='warning'")) {
        query.status = "warning";
      }

      const doc = await StreakPair.findOne(query).sort({ current_streak: -1 });
      return doc ? doc.toObject() : null;
    }
    if (s.includes("streak_freeze_inventory")) {
      const uId = params[0];
      const doc = await StreakFreezeInventory.findOne({ user_id: String(uId) });
      return doc ? doc.toObject() : null;
    }
    if (s.includes("tarot_users")) {
      const uId = params[0];
      const doc = await TarotUser.findOne({ user_id: String(uId) });
      return doc ? doc.toObject() : null;
    }
    if (s.includes("mod_warnings")) {
      const gId = params[0] ? String(params[0]) : null;
      const uId = params[1] ? String(params[1]) : null;
      let query = {};
      if (gId) query.guild_id = gId;
      if (uId) query.user_id = uId;
      const doc = await ModWarning.findOne(query).sort({ created_at: -1 });
      return doc ? doc.toObject() : null;
    }
    if (s.includes("faq_items")) {
      const gId = params[0] ? String(params[0]) : null;
      const id = params[1] !== undefined ? Number(params[1]) : null;
      let query = {};
      if (gId) query.guild_id = gId;
      if (id !== null && !isNaN(id)) query.id = id;
      const doc = await FaqItem.findOne(query).sort({ updated_at: -1 });
      return doc ? doc.toObject() : null;
    }

    // Dynamic Fallback Engine for any unhandled single table query
    const tableName = parseTableNameFromSql(sql);
    if (tableName) {
      const Model = getMongoModel(tableName);
      if (Model) {
        const query = parseQueryFromSql(sql, params);
        const order = parseOrderFromSql(sql);
        let q = Model.findOne(query);
        if (Object.keys(order).length > 0) q = q.sort(order);
        const doc = await q;
        if (doc) return doc.toObject();
      }
    }
  } catch (err) {
    console.error("[MONGO GET ERROR]", err);
  }
  return null;
}

async function mongoAll(sql, params = []) {
  if (!sql) return [];
  const s = String(sql).toLowerCase();

  try {
    if (s.includes("afk_users")) {
      const docs = await AfkUser.find().sort({ since: 1 });
      return docs.map((d) => d.toObject());
    }
    if (s.includes("sorting_users")) {
      const docs = await SortingUser.find().sort({ at: -1 });
      return docs.map((d) => d.toObject());
    }
    if (s.includes("menfess_posts")) {
      const docs = await MenfessPost.find().sort({ created_at: -1 });
      return docs.map((d) => d.toObject());
    }
    if (s.includes("tarot_users")) {
      let sort = { total_reading: -1 };
      if (s.includes("order by streak")) sort = { streak: -1 };
      const limitParam = params.length > 0 ? Number(params[params.length - 1]) : 0;
      const limit = !isNaN(limitParam) && limitParam > 0 ? limitParam : 10;
      const docs = await TarotUser.find().sort(sort).limit(limit);
      return docs.map((d) => d.toObject());
    }
    if (s.includes("tarot_category_stats")) {
      const uId = params[0];
      const docs = await TarotCategoryStat.find({ user_id: String(uId) }).sort({ count: -1, category: 1 });
      return docs.map((d) => d.toObject());
    }
    if (s.includes("mod_warnings")) {
      const gId = params[0] ? String(params[0]) : null;
      const uId = params[1] ? String(params[1]) : null;
      let query = {};
      if (gId) query.guild_id = gId;
      if (uId) query.user_id = uId;
      const limitParam = params.length > 2 ? Number(params[2]) : 0;
      const limit = !isNaN(limitParam) && limitParam > 0 ? limitParam : 15;
      const docs = await ModWarning.find(query).sort({ created_at: -1 }).limit(limit);
      return docs.map((d) => d.toObject());
    }
    if (s.includes("streak_pairs")) {
      const gId = params[0] ? String(params[0]) : null;
      let query = {};
      if (gId) query.guild_id = gId;

      if (s.includes("user_one = ?") || s.includes("user_two = ?") || s.includes("user_one=?") || s.includes("user_two=?")) {
        const uId = params[1] ? String(params[1]) : params[2] ? String(params[2]) : null;
        if (uId) {
          query.$or = [{ user_one: uId }, { user_two: uId }];
        }
      }

      if (s.includes("status = 'broken'") || s.includes("status='broken'")) {
        query.status = "broken";
      } else if (s.includes("status in ('active', 'warning')") || s.includes("status in ('active','warning')") || s.includes("status in ('active', 'warning')")) {
        query.status = { $in: ["active", "warning"] };
      } else if (s.includes("status = 'active'") || s.includes("status='active'")) {
        query.status = "active";
      }

      let sort = { current_streak: -1 };
      if (s.includes("order by highest_streak")) {
        sort = { highest_streak: -1 };
      }

      const docs = await StreakPair.find(query).sort(sort);
      return docs.map((d) => d.toObject());
    }
    if (s.includes("streak_logs")) {
      let query = {};
      if (s.includes("pair_id = ?") || s.includes("pair_id=?")) {
        query.pair_id = params[0];
      } else if (params[0]) {
        query.guild_id = String(params[0]);
      }
      const docs = await StreakLog.find(query).sort({ timestamp: -1 }).limit(50);
      return docs.map((d) => d.toObject());
    }
    if (s.includes("faq_items")) {
      const gId = params[0] ? String(params[0]) : null;
      let query = {};
      if (gId) query.guild_id = gId;
      const limitParam = params.length > 1 ? Number(params[params.length - 1]) : 0;
      const limit = !isNaN(limitParam) && limitParam > 0 ? limitParam : 25;
      let sort = { updated_at: -1 };
      if (s.includes("order by id")) sort = { id: 1 };
      else if (s.includes("order by updated_at desc")) sort = { updated_at: -1 };
      const docs = await FaqItem.find(query).sort(sort).limit(limit);
      return docs.map((d) => d.toObject());
    }
    if (s.includes("guess_number_scores")) {
      const gId = params[0] ? String(params[0]) : null;
      let query = {};
      if (gId) query.guild_id = gId;
      const limit = s.includes("limit") ? (Number(params[params.length - 1]) || 10) : 10;
      const GNS = getMongoModel("guess_number_scores");
      const docs = await GNS.find(query).sort({ wins: -1, best_attempts: 1, updated_at: 1 }).limit(limit);
      return docs.map((d) => d.toObject());
    }
    if (s.includes("giveaways") && !s.includes("giveaway_entries")) {
      const gId = params[0] ? String(params[0]) : null;
      let query = {};
      if (gId) query.guild_id = gId;
      if (s.includes("is_ended=0") || s.includes("is_ended = 0")) query.is_ended = 0;
      const GW = getMongoModel("giveaways");
      const docs = await GW.find(query).sort({ end_at: 1 });
      return docs.map((d) => d.toObject());
    }
    if (s.includes("giveaway_entries")) {
      const giveawayId = params[0] !== undefined ? Number(params[0]) : null;
      let query = {};
      if (giveawayId !== null) query.giveaway_id = giveawayId;
      const GE = getMongoModel("giveaway_entries");
      let sort = {};
      if (s.includes("order by joined_at")) sort = { joined_at: 1 };
      const docs = await GE.find(query).sort(sort);
      return docs.map((d) => d.toObject());
    }
    if (s.includes("timed_roles")) {
      const now = params[0] !== undefined ? Number(params[0]) : Date.now();
      const TR = getMongoModel("timed_roles");
      let query = {};
      if (s.includes("expire_at")) query.expire_at = { $lte: now };
      if (params[0] && !s.includes("expire_at")) query.guild_id = String(params[0]);
      const docs = await TR.find(query);
      return docs.map((d) => d.toObject());
    }

    if (s.includes("autoresponses")) {
      const gId = params[0] ? String(params[0]) : null;
      let query = {};
      if (gId) query.guild_id = gId;
      if (s.includes("is_enabled=1") || s.includes("is_enabled = 1")) {
        query.$or = [{ is_enabled: 1 }, { is_enabled: "1" }, { is_enabled: true }, { is_enabled: { $exists: false } }];
      } else if (s.includes("is_enabled=0") || s.includes("is_enabled = 0")) {
        query.$or = [{ is_enabled: 0 }, { is_enabled: "0" }, { is_enabled: false }];
      }
      const AR = getMongoModel("autoresponses");
      const docs = await AR.find(query);
      return docs.map((d) => d.toObject());
    }

    // NOTE: voice_activity_daily HARUS dicek SEBELUM activity_daily
    // karena string "voice_activity_daily" mengandung "activity_daily"
    // sehingga kalau urutannya terbalik, query voice akan salah masuk ke branch chat!
    if (s.includes("voice_activity_daily") && s.includes("group by")) {
      const datePattern = params[0] || "";
      const regexStr = "^" + String(datePattern).replace(/%/g, ".*");
      const model = getMongoModel("voice_activity_daily");
      if (model) {
        const docs = await model.aggregate([
          { $match: { day: { $regex: new RegExp(regexStr) } } },
          { $group: { _id: "$user_id", total: { $sum: "$duration" } } },
          { $sort: { total: -1 } },
          { $project: { _id: 0, user_id: "$_id", total: 1 } }
        ]);
        return docs;
      }
    }

    if (s.includes("activity_daily_channel") && s.includes("group by")) {
      const datePattern = params[0] || "";
      const regexStr = "^" + String(datePattern).replace(/%/g, ".*");
      const model = getMongoModel("activity_daily_channel");
      if (model) {
        const limitMatch = s.match(/limit\s+(\d+)/i);
        const limitVal = limitMatch ? parseInt(limitMatch[1], 10) : 50;

        const matchStage = { day: { $regex: new RegExp(regexStr) } };
        const chParams = params.slice(1).flat().filter(Boolean);
        if (chParams.length > 0) {
          matchStage.channel_id = { $in: chParams.map(String) };
        }

        const docs = await model.aggregate([
          { $match: matchStage },
          { $group: { _id: "$user_id", total: { $sum: "$msg_count" } } },
          { $sort: { total: -1 } },
          { $limit: limitVal },
          { $project: { _id: 0, user_id: "$_id", total: 1 } }
        ]);
        return docs;
      }
    }

    // PENTING: gunakan !s.includes("voice_activity_daily") untuk double-safety
    if (s.includes("activity_daily") && !s.includes("voice_activity_daily") && s.includes("group by")) {
      const datePattern = params[0] || "";
      const regexStr = "^" + String(datePattern).replace(/%/g, ".*");
      const model = getMongoModel("activity_daily");
      if (model) {
        const limitMatch = s.match(/limit\s+(\d+)/i);
        const limitVal = limitMatch ? parseInt(limitMatch[1], 10) : 50;

        const docs = await model.aggregate([
          { $match: { day: { $regex: new RegExp(regexStr) } } },
          { $group: { _id: "$user_id", total: { $sum: "$msg_count" } } },
          { $sort: { total: -1 } },
          { $limit: limitVal },
          { $project: { _id: 0, user_id: "$_id", total: 1 } }
        ]);
        return docs;
      }
    }

    // ── Dynamic Fallback Engine for any unhandled SELECT … FROM table ──
    const tableName = parseTableNameFromSql(sql);
    if (tableName) {
      const Model = getMongoModel(tableName);
      if (Model) {
        const query = parseQueryFromSql(sql, params);
        const order = parseOrderFromSql(sql);

        let limit = 0;
        let skip = 0;

        if (s.includes("limit ? offset ?")) {
          limit = Number(params[params.length - 2]) || 0;
          skip = Number(params[params.length - 1]) || 0;
        } else if (s.includes("limit ?")) {
          limit = Number(params[params.length - 1]) || 0;
        }

        let q = Model.find(query);
        if (Object.keys(order).length > 0) q = q.sort(order);
        if (skip > 0) q = q.skip(skip);
        if (limit > 0) q = q.limit(limit);

        const docs = await q;
        return docs.map((d) => d.toObject());
      }
    }
  } catch (err) {
    console.error("[MONGO ALL ERROR]", err);
  }
  return [];
}

async function mongoRun(sql, params = []) {
  if (!sql) return { changes: 0, lastID: Date.now() };
  try {
    await syncToMongo(sql, params);
    return { changes: 1, lastID: Date.now() };
  } catch (err) {
    console.error("[MONGO RUN ERROR]", err);
    return { changes: 0, lastID: Date.now() };
  }
}

async function safeGet(sql, params = []) {
  try { return await mongoGet(sql, params); } catch (e) { console.error(e); return null; }
}

async function safeAll(sql, params = []) {
  try { return await mongoAll(sql, params); } catch (e) { console.error(e); return []; }
}

async function safeRun(sql, params = []) {
  try {
    return await mongoRun(sql, params);
  } catch (e) {
    console.error("[SAFE RUN ERROR]", e);
    return { changes: 0, lastID: Date.now() };
  }
}

async function safeExec(sql) {
  return true;
}

async function syncToMongo(sql, params = []) {
  if (!sql || typeof sql !== "string") return;
  const s = sql.trim().toLowerCase();

  try {
    // 0. Activity & Voice Activity Daily
    // NOTE: voice_activity_daily HARUS dicek SEBELUM activity_daily
    // karena "voice_activity_daily" mengandung string "activity_daily"
    if (s.includes("voice_activity_daily")) {
      if (s.includes("insert") || s.includes("replace") || s.includes("update")) {
        const dayVal = params[0];
        const uId = params[1];
        const durationVal = Number(params[2] || 0);
        if (dayVal && uId) {
          const model = getMongoModel("voice_activity_daily");
          if (model) {
            await model.updateOne(
              { day: String(dayVal), user_id: String(uId) },
              { $inc: { duration: durationVal } },
              { upsert: true }
            );
          }
        }
      }
      return;
    }

    if (s.includes("activity_daily_channel")) {
      if (s.includes("insert") || s.includes("replace") || s.includes("update")) {
        const dayVal = params[0];
        const gId = params[1];
        const cId = params[2];
        const uId = params[3];
        if (dayVal && uId) {
          const model = getMongoModel("activity_daily_channel");
          if (model) {
            await model.updateOne(
              { day: String(dayVal), guild_id: String(gId), channel_id: String(cId), user_id: String(uId) },
              { $inc: { msg_count: 1 } },
              { upsert: true }
            );
          }
        }
      }
      return;
    }

    // PENTING: tambah !s.includes("voice_activity_daily") untuk double-safety
    if (s.includes("activity_daily") && !s.includes("voice_activity_daily")) {
      if (s.includes("insert") || s.includes("replace") || s.includes("update")) {
        const dayVal = params[0];
        const uId = params[1];
        if (dayVal && uId) {
          const model = getMongoModel("activity_daily");
          if (model) {
            await model.updateOne(
              { day: String(dayVal), user_id: String(uId) },
              { $inc: { msg_count: 1 } },
              { upsert: true }
            );
          }
        }
      }
      return;
    }

    // 1. Menfess Posts
    if (s.includes("menfess_posts")) {
      if (s.includes("insert") || s.includes("replace") || s.includes("update")) {
        const msgId = params[0];
        const chId = params[1];
        const createdAt = params[2] || Date.now();
        if (msgId) {
          await MenfessPost.updateOne(
            { message_id: String(msgId) },
            { $set: { channel_id: String(chId), created_at: Number(createdAt) } },
            { upsert: true }
          );
        }
      }
    }

    // 2. Menfess Anon Map
    if (s.includes("menfess_anonmap")) {
      if (s.includes("insert") || s.includes("replace") || s.includes("update")) {
        const uId = params[0];
        const label = params[1];
        if (uId) {
          await MenfessAnonMap.updateOne(
            { user_id: String(uId) },
            { $set: { anon_label: String(label) } },
            { upsert: true }
          );
        }
      }
    }

    // 3. Sorting Users
    if (s.includes("sorting_users")) {
      if (s.includes("insert") || s.includes("replace") || s.includes("update")) {
        const uId = params[0];
        const choice = params[1];
        const at = params[2] || Date.now();
        if (uId) {
          await SortingUser.updateOne(
            { user_id: String(uId) },
            { $set: { choice: String(choice), at: Number(at) } },
            { upsert: true }
          );
        }
      }
    }

    // 4. ID Card Users
    if (s.includes("idcard_users")) {
      if (s.includes("insert") || s.includes("replace") || s.includes("update")) {
        const uId = params[0];
        if (uId) {
          await IdCardUser.updateOne(
            { user_id: String(uId) },
            {
              $set: {
                number: String(params[1] || ""),
                name: String(params[2] || ""),
                gender: String(params[3] || ""),
                domisili: String(params[4] || ""),
                hobi: String(params[5] || ""),
                status: String(params[6] || ""),
                theme: String(params[7] || ""),
                created_at: Number(params[8] || Date.now()),
                updated_at: Number(params[9] || Date.now()),
              },
            },
            { upsert: true }
          );
        }
      }
    }

    // 5. AFK Users
    if (s.includes("afk_users")) {
      if (s.includes("delete")) {
        const uId = params[0];
        if (uId) await AfkUser.deleteOne({ user_id: String(uId) });
      } else if (s.includes("insert") || s.includes("replace") || s.includes("update")) {
        const uId = params[0];
        const reason = params[1];
        const since = params[2] || Date.now();
        if (uId) {
          await AfkUser.updateOne(
            { user_id: String(uId) },
            { $set: { reason: String(reason || ""), since: Number(since) } },
            { upsert: true }
          );
        }
      }
    }

    // 6. Meta Text & Menfess Meta
    if (s.includes("menfess_meta") || s.includes("meta_text")) {
      if (s.includes("insert") || s.includes("replace") || s.includes("update")) {
        const key = s.includes("menfess_last_id") ? "menfess_last_id" : params[0];
        const val = s.includes("menfess_last_id") ? params[0] : params[1];
        if (key) {
          await MetaText.updateOne(
            { key: String(key) },
            { $set: { value: val } },
            { upsert: true }
          );
        }
      }
    }

    // 7. Tarot Users & Stats
    if (s.includes("tarot_users")) {
      if (s.includes("insert")) {
        const uId = params[0];
        const username = params[1];
        if (uId) {
          await TarotUser.updateOne(
            { user_id: String(uId) },
            {
              $setOnInsert: {
                username: String(username || ""),
                total_reading: 0,
                last_reading_date: null,
                streak: 0,
                favorite_category: "—",
                last_card: "—",
                rarest_card: "—",
                cards_collected: "",
                streak_recovery_left: 3,
                last_streak_before_break: 0
              }
            },
            { upsert: true }
          );
        }
      } else if (s.includes("update")) {
        if (s.includes("favorite_category = ?")) {
          const fav = params[0];
          const uId = params[1];
          await TarotUser.updateOne({ user_id: String(uId) }, { $set: { favorite_category: String(fav) } });
        } else if (s.includes("total_reading = total_reading + 1")) {
          const [username, todayStr, newStreak, cardName, rarest, collectedStr, saveStreak, uId] = params;
          await TarotUser.updateOne(
            { user_id: String(uId) },
            {
              $set: {
                username: String(username),
                last_reading_date: String(todayStr),
                streak: Number(newStreak),
                last_card: String(cardName),
                rarest_card: String(rarest),
                cards_collected: String(collectedStr),
                last_streak_before_break: Number(saveStreak)
              },
              $inc: { total_reading: 1 }
            }
          );
        } else if (s.includes("streak = ?") && s.includes("streak_recovery_left = ?")) {
          const [newStreak, nextRec, uId] = params;
          await TarotUser.updateOne(
            { user_id: String(uId) },
            {
              $set: {
                streak: Number(newStreak),
                streak_recovery_left: Number(nextRec),
                last_streak_before_break: 0
              }
            }
          );
        }
      }
    }
    if (s.includes("tarot_category_stats")) {
      const uId = params[0];
      const category = params[1];
      if (uId && category) {
        await TarotCategoryStat.updateOne(
          { user_id: String(uId), category: String(category) },
          { $inc: { count: 1 } },
          { upsert: true }
        );
      }
    }
    if (s.includes("mod_warnings")) {
      if (s.includes("insert")) {
        const [gId, uId, modId, reason, createdAt] = params;
        const count = await ModWarning.countDocuments({ guild_id: String(gId) });
        await ModWarning.create({
          id: count + 1,
          guild_id: String(gId),
          user_id: String(uId),
          moderator_id: String(modId),
          reason: String(reason || ""),
          created_at: Number(createdAt || Date.now())
        });
      } else if (s.includes("delete")) {
        if (s.includes("id=?") || s.includes("id = ?")) {
          const [gId, warnId] = params;
          await ModWarning.deleteOne({ guild_id: String(gId), id: Number(warnId) });
        } else {
          const [gId, uId] = params;
          await ModWarning.deleteMany({ guild_id: String(gId), user_id: String(uId) });
        }
      }
    }

    // autoresponses CRUD
    if (s.includes("autoresponses")) {
      const AR = getMongoModel("autoresponses");
      if (s.includes("delete")) {
        // DELETE FROM autoresponses WHERE id=? AND guild_id=?
        const idParam = params[0];
        const gId = params[1];
        if (idParam && gId) {
          await AR.deleteOne({ id: Number(idParam), guild_id: String(gId) });
        } else if (gId) {
          await AR.deleteMany({ guild_id: String(gId) });
        }
      } else if (s.includes("update") && (s.includes("is_enabled=0") || s.includes("is_enabled = 0"))) {
        // UPDATE autoresponses SET is_enabled=0 WHERE id=? AND guild_id=?
        const [arId, gId] = params;
        if (arId && gId) await AR.updateOne({ id: Number(arId), guild_id: String(gId) }, { $set: { is_enabled: 0 } });
      } else if (s.includes("update") && (s.includes("is_enabled=1") || s.includes("is_enabled = 1"))) {
        // UPDATE autoresponses SET is_enabled=1 WHERE id=? AND guild_id=?
        const [arId, gId] = params;
        if (arId && gId) await AR.updateOne({ id: Number(arId), guild_id: String(gId) }, { $set: { is_enabled: 1 } });
      } else if (s.includes("insert")) {
        // INSERT INTO autoresponses (guild_id, trigger_text, response_text, ...) VALUES (...)
        const fieldsMatch = s.match(/\((.*?)\)\s*values/i);
        if (fieldsMatch) {
          const fields = fieldsMatch[1].split(",").map(f => f.trim().replace(/[`"]/g, ""));
          const docObj = {};
          fields.forEach((f, idx) => { if (idx < params.length) docObj[f] = params[idx]; });
          const count = await AR.countDocuments({ guild_id: String(docObj.guild_id || "") });
          docObj.id = count + 1;
          await AR.create(docObj);
        }
      }
    }

    // guess_number_scores CRUD (upsert with $inc wins, $min best_attempts)
    if (s.includes("guess_number_scores")) {
      if (s.includes("insert") || s.includes("update")) {
        const [gId, uId, wins, bestAttempts, updatedAt] = params;
        const GNS = getMongoModel("guess_number_scores");
        await GNS.updateOne(
          { guild_id: String(gId), user_id: String(uId) },
          {
            $inc: { wins: 1 },
            $min: { best_attempts: Number(bestAttempts) },
            $set: { updated_at: Number(updatedAt || Date.now()) },
            $setOnInsert: { guild_id: String(gId), user_id: String(uId) }
          },
          { upsert: true }
        );
      }
    }

    // faq_items CRUD
    if (s.includes("faq_items")) {
      if (s.includes("insert")) {
        // INSERT INTO faq_items (guild_id, title, content, tags, created_by, created_at, updated_at)
        const [gId, title, content, tags, createdBy, createdAt, updatedAt] = params;
        const count = await FaqItem.countDocuments({ guild_id: String(gId) });
        await FaqItem.create({
          id: count + 1,
          guild_id: String(gId),
          title: String(title || ""),
          content: String(content || ""),
          tags: String(tags || ""),
          created_by: createdBy ? String(createdBy) : null,
          created_at: Number(createdAt || Date.now()),
          updated_at: Number(updatedAt || Date.now())
        });
      } else if (s.includes("update")) {
        // UPDATE faq_items SET title=?, content=?, tags=?, updated_at=? WHERE guild_id=? AND id=?
        const [title, content, tags, updatedAt, gId, id] = params;
        await FaqItem.updateOne(
          { guild_id: String(gId), id: Number(id) },
          { $set: { title: String(title || ""), content: String(content || ""), tags: String(tags || ""), updated_at: Number(updatedAt || Date.now()) } }
        );
      } else if (s.includes("delete")) {
        // DELETE FROM faq_items WHERE guild_id=? AND id=?
        const [gId, id] = params;
        await FaqItem.deleteOne({ guild_id: String(gId), id: Number(id) });
      }
    }

    // Dynamic Fallback Engine for any unhandled write operation
    const tableName = parseTableNameFromSql(sql);
    if (tableName) {
      const Model = getMongoModel(tableName);
      if (Model) {
        const lower = sql.toLowerCase();
        if (lower.includes("insert")) {
          const fieldsMatch = sql.match(/\((.*?)\)\s*values/i);
          if (fieldsMatch) {
            const fields = fieldsMatch[1].split(",").map(f => f.trim().replace(/[`"]/g, ""));
            const docObj = {};
            fields.forEach((f, idx) => {
              if (idx < params.length) docObj[f] = params[idx];
            });
            const keyField = fields[0];
            if (keyField && docObj[keyField] !== undefined) {
              await Model.updateOne({ [keyField]: docObj[keyField] }, { $set: docObj }, { upsert: true });
            } else {
              await Model.create(docObj);
            }
          }
        } else if (lower.includes("update")) {
          const query = parseQueryFromSql(sql, params);
          if (Object.keys(query).length > 0) {
            await Model.updateMany(query, { $set: { updated_at: Date.now() } }).catch(() => { });
          }
        } else if (lower.includes("delete")) {
          const query = parseQueryFromSql(sql, params);
          if (Object.keys(query).length > 0) {
            await Model.deleteMany(query);
          }
        }
      }
    }
  } catch (err) {
    console.error("[MONGO SYNC ERROR]", err);
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
  // Backup DM disabled per user request
  return;
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
  // Backup DM schedule disabled per user request
  return;
}

// =======================
// MENFESS ID HELPER
// =======================
async function nextMenfessId() {
  try {
    let doc = await MetaText.findOne({ key: "menfess_last_id" });
    if (!doc) {
      const row = await safeGet(`SELECT value FROM menfess_meta WHERE key='menfess_last_id'`);
      doc = { value: Number(row?.value || 800) };
    }
    const current = Number(doc?.value || 800);
    const next = current + 1;
    await MetaText.updateOne(
      { key: "menfess_last_id" },
      { $set: { value: next } },
      { upsert: true }
    );
    await safeRun(`UPDATE menfess_meta SET value=? WHERE key='menfess_last_id'`, [next]).catch(() => { });
    return next;
  } catch {
    return 801;
  }
}

// ===================== DISCORD CLIENT =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
});

// Helper to check for expired/acknowledged interaction REST errors
function isIgnorableDiscordError(err) {
  if (!err) return false;
  const code = err.code || err.rawError?.code;
  const status = err.status || err.rawError?.status;
  return code === 10062 || code === 40060 || code === 10008 || code === 50027 || status === 404;
}

// anti-crash
process.on("unhandledRejection", (reason) => {
  if (isIgnorableDiscordError(reason)) return;
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  if (isIgnorableDiscordError(err)) return;
  console.error("[uncaughtException]", err);
});
client.on("error", (err) => {
  if (isIgnorableDiscordError(err)) return;
  console.error("[client error]", err);
});

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

   <a:open:1523182738054713424>  LIVE IN VOICE  (${active.length})
   ────────────────────
${activeText}


   <a:close:1523182754454306967>  STANDBY  (${idle.length})
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

    // Kalau sebelumnya ada, coba edit pesan yang sudah ada
    if (prevMsgId && prevChId === String(MUSIC_CONTROL_CHANNEL_ID)) {
      const msg = await ch.messages.fetch(prevMsgId).catch(() => null);
      if (msg) {
        const edited = await msg.edit({ components: [panel] }).catch(() => null);
        if (edited) return; // Berhasil edit pesan yang ada
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
    .setFooter({ text: "Mystral • Disciplinary System" })
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
  "anjing", "babi", "tolol", "goblok", "bangsat", "kontol", "memek", "asu", "bajingan", "tai", "dick", "pussy", "bastard", "retard", "kontl", "mmq", "ngntl", "bgsd", "bgsat", "ngentod", "goblok", "tolol", "meki", "mek", "jancok", "cuk", "cukimay", "bego", "begooo", "idiot", "tololll", "kimakkk", "jembut", "titit", "peler", "ngentot", "entot"
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
  const id = Date.now();
  const GW = getMongoModel("giveaways");
  await GW.create({
    id,
    guild_id: String(guildId),
    channel_id: String(channelId),
    prize: String(prize),
    winners: Number(winners),
    end_at: Number(endAt),
    host_id: String(hostId),
    is_ended: 0
  });
  return id;
}

async function getGiveaway(id) {
  const GW = getMongoModel("giveaways");
  const doc = await GW.findOne({ id: Number(id) });
  return doc ? doc.toObject() : null;
}

async function setGiveawayMessage(id, messageId) {
  const GW = getMongoModel("giveaways");
  await GW.updateOne({ id: Number(id) }, { $set: { message_id: String(messageId) } });
}

async function joinGiveaway(giveawayId, userId) {
  const GE = getMongoModel("giveaway_entries");
  await GE.updateOne(
    { giveaway_id: Number(giveawayId), user_id: String(userId) },
    { $setOnInsert: { giveaway_id: Number(giveawayId), user_id: String(userId), joined_at: Date.now() } },
    { upsert: true }
  );
}

async function leaveGiveaway(giveawayId, userId) {
  const GE = getMongoModel("giveaway_entries");
  await GE.deleteOne({ giveaway_id: Number(giveawayId), user_id: String(userId) });
}

async function countGiveawayEntries(giveawayId) {
  const GE = getMongoModel("giveaway_entries");
  return await GE.countDocuments({ giveaway_id: Number(giveawayId) });
}

async function listGiveawayEntries(giveawayId) {
  const GE = getMongoModel("giveaway_entries");
  const docs = await GE.find({ giveaway_id: Number(giveawayId) }).sort({ joined_at: 1 });
  return docs.map(d => d.toObject());
}

async function pickGiveawayWinners(giveawayId, winnersCount) {
  const GE = getMongoModel("giveaway_entries");
  const docs = await GE.find({ giveaway_id: Number(giveawayId) });
  if (!docs.length) return [];

  let pool = docs.map(r => r.user_id);
  const winners = [];
  const count = Math.min(pool.length, Number(winnersCount));

  for (let i = 0; i < count; i++) {
    const index = crypto.randomInt(0, pool.length);
    winners.push(pool[index]);
    pool.splice(index, 1);
  }

  return winners;
}

async function endGiveaway(giveawayId) {
  const GW = getMongoModel("giveaways");
  await GW.updateOne({ id: Number(giveawayId) }, { $set: { is_ended: 1, ended_at: Date.now() } });
}

async function listActiveGiveaways(guildId) {
  const GW = getMongoModel("giveaways");
  const docs = await GW.find({ guild_id: String(guildId), is_ended: 0 }).sort({ end_at: 1 });
  return docs.map(d => d.toObject());
}

async function deleteGiveaway(giveawayId) {
  const GE = getMongoModel("giveaway_entries");
  const GW = getMongoModel("giveaways");
  await GE.deleteMany({ giveaway_id: Number(giveawayId) });
  await GW.deleteOne({ id: Number(giveawayId) });
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

// ── Component v2 colour accents (hex string for Container accent)
const TOD_COLOR_PENDING = 0x5865f2; // blurple
const TOD_COLOR_DONE = 0x57f287; // green
const TOD_COLOR_FAIL = 0xed4245; // red
const TOD_COLOR_PANEL = 0x9b59b6; // purple

/**
 * Build a Component v2 Container for an active / resolved TOD question.
 * Returns { components, flags } ready to spread into channel.send() / interaction.update().
 */
function todCard(question, challengerId, targetId, status = "pending") {
  const isDare = question.type === "dare";
  const typeIcon = isDare ? "🎲" : "🕯️";
  const typeName = isDare ? "Dare" : "Truth";
  const isDuel = targetId && targetId !== challengerId && targetId !== "self";

  let accentColor, headerLine, resultLine = null;

  if (status === "pending") {
    accentColor = TOD_COLOR_PENDING;
    headerLine = `## ${typeIcon} ${typeName}`;
  } else if (status === "done") {
    accentColor = TOD_COLOR_DONE;
    headerLine = `## 🟢 TOD Selesai — ${typeName}`;
    resultLine = `✅ <@${targetId}> berhasil menyelesaikan tantangan ini!`;
  } else {
    accentColor = TOD_COLOR_FAIL;
    headerLine = `## 🔴 TOD Gagal — ${typeName}`;
    resultLine = `❌ <@${targetId}> menyerah/gagal menyelesaikan tantangan ini!`;
  }

  const container = new ContainerBuilder().setAccentColor(accentColor);

  // Header
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(headerLine)
  );

  // Separator
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(1)
  );

  // Question body
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`> ${question.question}`)
  );

  // Result line (done / pass only)
  if (resultLine) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(resultLine));
  }

  // Player info + meta (pending only)
  if (status === "pending") {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1));
    const meta = isDuel
      ? `👤 **Challenger:** <@${challengerId}>  •  🎯 **Target:** <@${targetId}>`
      : `👤 **Player:** <@${challengerId}>`;
    const info = `\`${String(question.type).toUpperCase()}\` • \`${question.rating}\` • \`${todDisplayCode(question)}\``;
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${meta}\n${info}`)
    );
  }

  // Footer
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# Mystral • Truth or Dare`)
  );

  return container;
}

/**
 * Build a Component v2 Container for the category-select panel.
 * Returns the ContainerBuilder (callers add buttons in ActionRow).
 */
function todPanelCard(challengerId, targetId) {
  const isDuel = targetId && targetId !== challengerId && targetId !== "self";

  const desc = isDuel
    ? `<@${challengerId}> menantang <@${targetId}> untuk bermain Truth or Dare!\nSilakan pilih kategori di bawah.`
    : `Silakan pilih kategori di bawah untuk memulai permainan Truth or Dare! 🎲🕯️`;

  const container = new ContainerBuilder().setAccentColor(TOD_COLOR_PANEL);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ⚔️ Truth or Dare`)
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(desc)
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# Mystral • Truth or Dare`)
  );
  return container;
}

/** Row of Truth / Dare / Random buttons */
function todRow(challengerId, targetId) {
  const target = targetId || "self";
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tod:truth:${challengerId}:${target}`).setLabel("Truth").setStyle(ButtonStyle.Secondary).setEmoji("🕯️"),
    new ButtonBuilder().setCustomId(`tod:dare:${challengerId}:${target}`).setLabel("Dare").setStyle(ButtonStyle.Secondary).setEmoji("🎲"),
    new ButtonBuilder().setCustomId(`tod:random:${challengerId}:${target}`).setLabel("Random").setStyle(ButtonStyle.Primary).setEmoji("✨")
  );
}

/** Row of Done / Pass buttons */
function todResponseRow(targetId, questionId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tod:done:${targetId}:${questionId}`).setLabel("Selesai (Done)").setStyle(ButtonStyle.Success).setEmoji("🟢"),
    new ButtonBuilder().setCustomId(`tod:pass:${targetId}:${questionId}`).setLabel("Menyerah (Pass)").setStyle(ButtonStyle.Danger).setEmoji("🔴")
  );
}

/** Helper: send a TOD question card (Component v2) */
async function sendTodQuestion(channel, question, challengerId, targetId) {
  const target = targetId || challengerId;
  return channel.send({
    components: [todCard(question, challengerId, target), todResponseRow(target, question.id)],
    flags: MessageFlags.IsComponentsV2,
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
  const afk = await getAfk(user.id, guild?.id).catch(() => null);

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
    ? `💤 **AFK:** ${afk.reason}\nSejak: <t:${Math.floor((Number(afk.since) || Date.now()) / 1000)}:R>`
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
    .setThumbnail((member ?? user).displayAvatarURL({ extension: "png", size: 256 }))
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
    if (interaction.deferred) {
      try {
        return await interaction.editReply(payload);
      } catch (e) {
        if (isIgnorableDiscordError(e)) {
          const ch = interaction.channel;
          if (ch?.isTextBased?.()) {
            const clone = { ...payload };
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

    if (interaction.replied) return await interaction.followUp(payload).catch(() => null);
    return await interaction.reply(payload);
  } catch (e) {
    if (isIgnorableDiscordError(e)) return;
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

const WELCOME_MESSAGES = [
  (m, g) => `**✨ Welcome to ${g}, ${m}!**\nSemoga betah ya! Cek <#1251131422908092572> & buat cewe jangan lupa verif di <#1529165450229977098> biar dapet role pink. 🌸`,
  (m, g) => `**🌸 Halo ${m}, welcome!**\nEnjoy your stay! Baca <#1251131422908092572> dulu yuk, & untuk cewe bisa verif di <#1529165450229977098> untuk dapet role pink. 🎀`,
  (m, g) => `**🤍 Welcome aboard, ${m}!**\nSenang kamu bergabung! Mampir ke <#1251131422908092572> & khusus cewe silakan verif di <#1529165450229977098> biar dapet role pink. 🎀`,
  (m, g) => `**✨ Hai ${m}, selamat datang!**\nSemoga nyaman di sini! Cek <#1251131422908092572> & bagi cewe jangan lupa verifikasi di <#1529165450229977098> biar dapet role pink. 🌸`,
  (m, g) => `**🌿 Welcome to ${g}, ${m}!**\nSemoga harimu seru! Cek <#1251131422908092572> ya, & khusus cewek bisa langsung verif di <#1529165450229977098> biar dapet role pink. 🤍`,
  (m, g) => `**🌸 Welcome, ${m}!**\nSelamat bergabung di Mystral! Pastikan baca <#1251131422908092572> & bagi cewe silakan verif di <#1529165450229977098> biar dapet role pink. 🎀`,
  (m, g) => `**✨ Hai ${m}, selamat datang di Mystral District!**\nMari berteman! Cek <#1251131422908092572> sebentar & buat cewe yuk verif di <#1529165450229977098> biar dapet role pink. 🌸`,
  (m, g) => `**🤍 Welcome to ${g}, ${m}!**\nSemoga nyaman di sini! Yuk baca <#1251131422908092572> & buat cewek jangan lupa verif di <#1529165450229977098> biar dapet role pink. 🎀`,
  (m, g) => `**✨ Halo ${m}, welcome!**\nNikmati waktumu di ${g}. Jangan lupa mampir ke <#1251131422908092572> & buat cewe silakan verif di <#1529165450229977098> biar dapet role pink. 🌸`,
  (m, g) => `**🌸 Selamat datang di ${g}, ${m}!**\nSemoga betah! Cek <#1251131422908092572> dulu yuk, & untuk cewe bisa verif di <#1529165450229977098> biar dapet role pink. 🤍`,
  (m, g) => `**🤍 Welcome to ${g}, ${m}!**\nMake yourself at home! Baca <#1251131422908092572> ya, & buat cewe silakan verif di <#1529165450229977098> biar dapet role pink. 🎀`,
  (m, g) => `**✨ Senang melihatmu bergabung, ${m}!**\nSelamat datang! Cek <#1251131422908092572> sebentar & bagi cewe jangan lupa verif di <#1529165450229977098> biar dapet role pink. 🌸`,
  (m, g) => `**🌸 Halo ${m}, welcome to ${g}!**\nSemoga harimu menyenangkan! Baca <#1251131422908092572> & khusus cewe verif di <#1529165450229977098> biar dapet role pink. 🎀`,
  (m, g) => `**✨ Selamat datang di ${g}, ${m}!**\nEnjoy the vibes! Mampir ke <#1251131422908092572> yuk, & buat cewe jangan lupa verif di <#1529165450229977098> biar dapet role pink. 🌸`,
  (m, g) => `**🌿 Welcome, ${m}!**\nTerima kasih sudah join! Cek <#1251131422908092572> dulu ya, & untuk cewek bisa langsung verif di <#1529165450229977098> biar dapet role pink. 🤍`,
  (m, g) => `**🤍 Halo ${m}, selamat datang!**\nSemoga betah di ${g}! Pastikan baca <#1251131422908092572> & bagi cewe silakan verif di <#1529165450229977098> biar dapet role pink. 🎀`,
  (m, g) => `**🌸 Welcome to Mystral District, ${m}!**\nSenang menyambutmu! Mari baca <#1251131422908092572> & buat cewe jangan lupa verif di <#1529165450229977098> biar dapet role pink. 🎀`,
  (m, g) => `**✨ Welcome to ${g}, ${m}!**\nSemoga dapat teman baru! Yuk baca <#1251131422908092572> & khusus cewe silakan verif di <#1529165450229977098> biar dapet role pink. 🌸`,
  (m, g) => `**🌸 Halo ${m}, senang bertemu denganmu!**\nNikmati obrolan di sini. Jangan lupa mampir ke <#1251131422908092572> & bagi cewe silakan verif di <#1529165450229977098> biar dapet role pink. 🎀`,
  (m, g) => `**✨ Selamat datang di ${g}, ${m}!**\nSemoga nyaman! Cek <#1251131422908092572> dulu yuk, & buat cewe jangan lupa verifikasi di <#1529165450229977098> biar dapet role pink. 🌸`
];

// // ===================== WELCOME =====================
// const WELCOME_MESSAGES = [
//   (m, g) => `**🌙 Welcome to ${g}, ${m}!**\nSemoga kamu betah di sini, menemukan teman baru, dan menikmati setiap momen bersama para Mystralians. 🤍`,
//   (m, g) => `**✨ Halo ${m}, selamat datang di ${g}!**\nTerima kasih sudah bergabung. Semoga District ini menjadi tempat yang nyaman untukmu. 🌿`,
//   (m, g) => `**🤍 Welcome aboard, ${m}!**\nKami senang kamu menjadi bagian dari Mystral District. Selamat menikmati komunitas ini bersama para Mystralians.`,
//   (m, g) => `**🌿 Welcome to ${g}, ${m}!**\nSemoga harimu lebih menyenangkan bersama komunitas yang hangat dan ramah di MYSTRAL.`,
//   (m, g) => `**🌌 Welcome to ${g}, ${m}!**\nJangan ragu untuk mengobrol, bergabung di voice, atau sekadar menikmati suasana komunitas. ✨`,
//   (m, g) => `**🌙 Hai ${m}, selamat datang di Mystral District!**\nSemoga kamu menemukan banyak cerita, teman baru, dan pengalaman seru di sini. 🤍`,
//   (m, g) => `**✨ Welcome, ${m}!**\nTerima kasih telah bergabung dengan ${g}. Semoga kamu merasa nyaman menjadi bagian dari para Mystralians.`,
//   (m, g) => `**🤝 Halo ${m}, welcome to ${g}!**\nNikmati setiap percakapan, event, dan momen yang akan kamu temukan di komunitas ini.`,
//   (m, g) => `**🌠 Selamat datang di ${g}, ${m}!**\nSemoga langkah pertamamu di MYSTRAL menjadi awal dari banyak kenangan yang menyenangkan.`,
//   (m, g) => `**📍 Welcome to ${g}, ${m}!**\nLuangkan waktumu sesukamu, berkenalan dengan member lain, dan nikmati setiap perjalananmu di sini.`,
//   (m, g) => `**🌙 Senang melihatmu bergabung, ${m}!**\nSemoga Mystral District menjadi tempat yang selalu membuatmu merasa diterima. 🤍`,
//   (m, g) => `**💫 Halo ${m}, welcome to ${g}!**\nSemoga kamu menemukan komunitas yang positif, hangat, dan penuh cerita baru.`,
//   (m, g) => `**✨ Selamat datang di ${g}, ${m}!**\nSemoga setiap hari yang kamu habiskan di MYSTRAL membawa pengalaman yang menyenangkan.`,
//   (m, g) => `**🌿 Welcome, ${m}!**\nTerima kasih telah menjadi bagian dari Mystralians. Semoga kamu betah dan menikmati komunitas ini.`,
//   (m, g) => `**🤍 Halo ${m}, selamat datang di ${g}!**\nSemoga kamu selalu menemukan hal-hal baik dan orang-orang hebat selama berada di MYSTRAL.`,
//   (m, g) => `**🌌 Welcome to Mystral District, ${m}!**\nKami senang menyambutmu di komunitas ini. Selamat menikmati perjalanan barumu bersama kami. ✨`,
//   (m, g) => `**🌙 Welcome, ${m}!**\nSemoga District ini menjadi tempat untuk berbagi cerita, membangun pertemanan, dan menciptakan banyak momen berharga.`,
//   (m, g) => `**✨ Halo ${m}, senang bertemu denganmu!**\nSemoga kamu menikmati setiap fitur dan aktivitas yang tersedia di ${g}.`,
//   (m, g) => `**🤝 Selamat datang di ${g}, ${m}!**\nTerima kasih telah bergabung. Semoga kamu merasa seperti di rumah bersama para Mystralians. 🤍`,
//   (m, g) => `**🌠 Welcome to ${g}, ${m}!**\nSemoga perjalananmu di MYSTRAL dipenuhi teman baru, pengalaman baru, dan banyak kenangan indah. 🌙`,
// ];

function pickWelcomeMessage(member) {
  const templates = WELCOME_MESSAGES.filter((fn) => typeof fn === "function");
  if (!templates.length) {
    return `Selamat datang di ${member.guild.name}, <@${member.id}>. Semoga betah dan menikmati perjalananmu bersama kami!`;
  }

  const template = templates[Math.floor(Math.random() * templates.length)];
  return template(`<@${member.id}>`, member.guild.name);
}

function buildWelcomeText(member, memberCount) {
  const rulesMention = resolveChannelMention(member.guild, "RULES_CHANNEL_ID", ["rules", "peraturan"], "rules");
  const selfRoleMention = resolveChannelMention(member.guild, "SELF_ROLE_CHANNEL_ID", ["self-role", "selfrole", "pilih-peran"], "self-role");
  const announceMention = resolveChannelMention(member.guild, "ANNOUNCEMENTS_CHANNEL_ID", ["announcements", "pengumuman"], "announcements");
  const idCardMention = resolveChannelMention(member.guild, "IDCARD_CHANNEL_ID", ["idcard", "id-card", "registrasi"], "idcard");
  const lobbyMention = resolveChannelMention(member.guild, "LOBBY_CHANNEL_ID", ["lobby", "lobby-chat", "berkenalan"], "lobby");

  return [
    `<:profile:1510055150486814853> **Welcome to Mystral District**`,
    ``,
    `╭・📖 **Peraturan** ${rulesMention}`,
    `├・🎭 **Pilih Role** ${selfRoleMention}`,
    `├・📢 **Pengumuman** ${announceMention}`,
    `├・<:pink_cards1:1510057886795956235> **Registrasi** ${idCardMention}`,
    `╰・💬 **Lobby** ${lobbyMention}`,
    ``,
    `Kamu adalah member ke-**${memberCount}!**. Semoga betah menjadi bagian dari **Mystralians**. 🤍`,
  ].join("\n");
}

function buildLobbyWelcomeText(member) {
  return pickWelcomeMessage(member);
}

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

    CREATE TABLE IF NOT EXISTS activity_daily_channel (
      day TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      msg_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, guild_id, channel_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_act_chan_day_g_c ON activity_daily_channel(day, guild_id, channel_id);

    CREATE TABLE IF NOT EXISTS leaderboard_lobby_channels (
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, channel_id)
    );

    CREATE TABLE IF NOT EXISTS monthly_recap_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      category TEXT NOT NULL,
      rank INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS autoresponses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      trigger_text TEXT NOT NULL,
      response_text TEXT NOT NULL,
      match_type TEXT NOT NULL,
      ignore_case INTEGER NOT NULL DEFAULT 1,
      cooldown INTEGER NOT NULL DEFAULT 0,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      reply_mode TEXT NOT NULL DEFAULT 'reply',
      mention_user INTEGER NOT NULL DEFAULT 0,
      embed_response INTEGER NOT NULL DEFAULT 0,
      random_responses TEXT,
      attachment_url TEXT,
      button_label TEXT,
      button_url TEXT,
      select_menu_options TEXT
    );

    CREATE TABLE IF NOT EXISTS timed_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      expire_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS active_voice_sessions (
      user_id TEXT PRIMARY KEY,
      join_timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sticky_messages (
      channel_id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      last_message_id TEXT
    );

    CREATE TABLE IF NOT EXISTS media_settings (
      guild_id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 1,
      delete_original INTEGER DEFAULT 0,
      nsfw_filter INTEGER DEFAULT 1,
      quality TEXT DEFAULT 'auto',
      platforms TEXT DEFAULT '{}'
    );
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

async function getOrInitMediaSettings(guildId) {
  const gid = String(guildId);
  if (mediaSettingsCache.has(gid)) {
    return mediaSettingsCache.get(gid);
  }

  let row = await safeGet("SELECT * FROM media_settings WHERE guild_id=?", [gid]);
  if (!row) {
    await safeRun(
      "INSERT OR IGNORE INTO media_settings (guild_id, enabled, delete_original, nsfw_filter, quality, platforms) VALUES (?, 1, 0, 1, 'auto', '{}')",
      [gid]
    );
    row = {
      guild_id: gid,
      enabled: 1,
      delete_original: 0,
      nsfw_filter: 1,
      quality: "auto",
      platforms: "{}"
    };
  }

  const settings = {
    enabled: Number(row.enabled),
    deleteOriginal: Number(row.delete_original),
    nsfwFilter: Number(row.nsfw_filter),
    quality: String(row.quality || "auto"),
    platforms: JSON.parse(row.platforms || "{}")
  };
  mediaSettingsCache.set(gid, settings);
  return settings;
}

async function saveMediaSettings(guildId, settings) {
  const gid = String(guildId);
  mediaSettingsCache.set(gid, settings);
  await safeRun(
    "INSERT INTO media_settings (guild_id, enabled, delete_original, nsfw_filter, quality, platforms) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET enabled=excluded.enabled, delete_original=excluded.delete_original, nsfw_filter=excluded.nsfw_filter, quality=excluded.quality, platforms=excluded.platforms",
    [
      gid,
      settings.enabled ? 1 : 0,
      settings.deleteOriginal ? 1 : 0,
      settings.nsfwFilter ? 1 : 0,
      settings.quality || "auto",
      JSON.stringify(settings.platforms || {})
    ]
  );
}

function getDownloadUrl(url) {
  if (!url) return "https://cobalt.tools";
  const decoded = decodeURIComponent(url);
  if (/tiktok\.com/i.test(decoded)) return `https://snaptik.app/?url=${encodeURIComponent(decoded)}`;
  if (/instagram\.com/i.test(decoded)) return `https://snapinsta.app/?url=${encodeURIComponent(decoded)}`;
  if (/(twitter|x)\.com/i.test(decoded)) return `https://savetwitter.net/?url=${encodeURIComponent(decoded)}`;
  if (/reddit\.com/i.test(decoded)) return `https://rapidsave.com/info?url=${encodeURIComponent(decoded)}`;
  if (/youtube\.com|youtu\.be/i.test(decoded)) return `https://y2mate.is/`;
  return `https://cobalt.tools/?u=${encodeURIComponent(decoded)}`;
}

function getPlatformEmoji(guild, platform) {
  if (!guild) return null;
  const nameQuery = platform.toLowerCase();
  const emoji = guild.emojis.cache.find(e => {
    const n = e.name.toLowerCase();
    return n === nameQuery || n.includes(nameQuery);
  });
  return emoji ? emoji.id : null;
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
  if (!user) {
    user = {
      user_id: String(userId),
      username: String(username),
      total_reading: 0,
      last_reading_date: null,
      streak: 0,
      favorite_category: '—',
      last_card: '—',
      rarest_card: '—',
      cards_collected: '',
      streak_recovery_left: 3,
      last_streak_before_break: 0
    };
  } else {
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
  let saveStreak = user.last_streak_before_break || 0;
  if (user.last_reading_date === todayStr) {
    newStreak = user.streak || 1;
  } else if (user.last_reading_date === yesterdayStr) {
    newStreak = (user.streak || 0) + 1;
  } else {
    if (user.streak > 0) {
      saveStreak = user.streak;
    }
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
       cards_collected = ?,
       last_streak_before_break = ?
     WHERE user_id = ?`,
    [username, todayStr, newStreak, card.name, newRarest, collectedStr, saveStreak, userId]
  );

  await incrementTarotCategory(userId, categorySelected);
  await updateFavoriteCategory(userId);

  return { streak: newStreak };
}

async function recoverTarotStreak(userId, username) {
  const user = await getOrInitTarotUser(userId, username);
  if (!user) {
    return { error: "User tidak ditemukan." };
  }
  if (user.last_streak_before_break <= 0) {
    return { error: "Kamu tidak memiliki streak tarot yang padam untuk dipulihkan!" };
  }
  if (user.streak_recovery_left <= 0) {
    return { error: "Batas token pemulihan (recovery token) kamu telah habis! (Maksimal 3)" };
  }

  const newStreak = user.last_streak_before_break;
  const nextRec = user.streak_recovery_left - 1;

  await safeRun(
    `UPDATE tarot_users SET
       streak = ?,
       streak_recovery_left = ?,
       last_streak_before_break = 0
     WHERE user_id = ?`,
    [newStreak, nextRec, userId]
  );

  return { success: true, newStreak, recoveryLeft: nextRec };
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
    .setFooter({ text: "Mystral • Daily Tarot" })
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

async function buildTarotProfileEmbed(targetUser, client, requester = null) {
  const tUser = await getOrInitTarotUser(targetUser.id, targetUser.username);
  const totalCards = TAROT_CARDS.length;
  const collectedList = tUser.cards_collected ? tUser.cards_collected.split(",").filter(Boolean) : [];
  const collectedCount = collectedList.length;
  const percent = totalCards > 0 ? Math.round((collectedCount / totalCards) * 100) : 0;
  const rank = getTarotRank(tUser.total_reading);

  const targetGuildId = process.env.GUILD_ID;
  const guild = targetGuildId ? client.guilds.cache.get(targetGuildId) : null;
  const targetMember = guild ? (guild.members.cache.get(targetUser.id) || await guild.members.fetch(targetUser.id).catch(() => null)) : null;

  const embed = new EmbedBuilder()
    .setTitle(`${TAROT_EMOJIS.crystall} Tarot Profile — ${targetUser.username}`)
    .setColor(EMBED_COLOR)
    .setThumbnail((targetMember ?? targetUser).displayAvatarURL({ extension: "png", size: 256 }))
    .setDescription(`**Mention:** <@${targetUser.id}>`)
    .addFields(
      { name: `${TAROT_EMOJIS.crystall} Rank`, value: `\`${rank}\``, inline: true },
      { name: `${TAROT_EMOJIS.streak} Current Streak`, value: `\`${tUser.streak || 0} Hari\``, inline: true },
      { name: `🩹 Recovery Token`, value: `\`${tUser.streak_recovery_left !== null ? tUser.streak_recovery_left : 3} / 3\``, inline: true },
      { name: `${TAROT_EMOJIS.collection} Collection Progress`, value: `\`${collectedCount} / ${totalCards} (${percent}%)\``, inline: true },
      { name: `${TAROT_EMOJIS.favcategory} Fav Category`, value: `\`${tUser.favorite_category || "—"}\``, inline: true },
      { name: `${TAROT_EMOJIS.card} Last Card Drawn`, value: `\`${tUser.last_card || "—"}\``, inline: true },
      { name: `${TAROT_EMOJIS.rarefix} Rarest Card Drawn`, value: `\`${tUser.rarest_card || "—"}\``, inline: true },
      { name: `${TAROT_EMOJIS.statistic} Total Readings`, value: `\`${tUser.total_reading || 0}\``, inline: true }
    )
    .setFooter({ text: requester ? `Mystral • Tarot Registry | Requested by ${requester.username}` : "Mystral • Tarot Registry" })
    .setTimestamp();

  return embed;
}

async function buildTarotLeaderboardEmbed(guild, requester = null) {
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
    .setFooter({ text: requester ? `Mystral • Tarot Leaderboard | Requested by ${requester.username}` : "Mystral • Tarot Leaderboard" })
    .setTimestamp();
}

function buildTarotAnnouncementEmbed() {
  return new EmbedBuilder()
    .setTitle(`${TAROT_EMOJIS.crystall} Daily Arcane Tarot — Mystral`)
    .setDescription([
      "Selamat datang di gerbang misteri takdir! Dek Tarot Akurasi Tinggi kini telah terintegrasi di Mystral.",
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
    .setFooter({ text: "Mystral • Daily Tarot System" })
    .setTimestamp();
}

async function buildTarotCollectionEmbed(targetUser, requester = null) {
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
    .setFooter({ text: requester ? `Mystral • Tarot Collection | Requested by ${requester.username}` : "Mystral • Tarot Collection" })
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
  const count = await FaqItem.countDocuments({ guild_id: String(guildId) });
  const id = count + 1;
  const now = Date.now();
  await FaqItem.create({
    id, guild_id: String(guildId), title: String(title || "").trim().slice(0, 100),
    content: String(content || "").replace(/\r\n/g, "\n").trim().slice(0, 4000),
    tags: normalizeTags(tags), created_by: String(createdBy || ""),
    created_at: now, updated_at: now
  });
  return id;
}

async function faqGet(guildId, id) {
  const doc = await FaqItem.findOne({ guild_id: String(guildId), id: Number(id) });
  return doc ? doc.toObject() : null;
}

async function faqEdit(guildId, id, title, content, tags) {
  const now = Date.now();
  await FaqItem.updateOne({ guild_id: String(guildId), id: Number(id) }, {
    $set: { title: String(title).trim().slice(0, 100), content: String(content).trim().slice(0, 4000), tags: normalizeTags(tags), updated_at: now }
  });
  return true;
}

async function faqSearch(guildId, query, limit = 10) {
  const q = String(query || "").trim();
  if (!q) return [];
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
  const docs = await FaqItem.find({
    guild_id: String(guildId),
    $or: [{ title: regex }, { content: regex }, { tags: regex }]
  }).sort({ updated_at: -1 }).limit(Number(limit));
  return docs.map(d => d.toObject());
}

async function faqListLatest(guildId, limit = 15) {
  const docs = await FaqItem.find({ guild_id: String(guildId) }).sort({ updated_at: -1 }).limit(Number(limit));
  return docs.map(d => d.toObject());
}

async function faqListForPanel(guildId, limit = 25) {
  const docs = await FaqItem.find({ guild_id: String(guildId) }).sort({ id: 1 }).limit(Number(limit));
  return docs.map(d => d.toObject());
}
async function faqUpdate(guildId, id, fields) {
  const cur = await faqGet(guildId, id);
  if (!cur) return false;

  const title = fields.title != null ? safeText(fields.title, 80) : cur.title;
  const content = fields.content != null ? String(fields.content || "").trim().slice(0, 4000) : cur.content;
  const tags = fields.tags != null ? normalizeTags(fields.tags) : (cur.tags || "");
  const now = Date.now();

  await FaqItem.updateOne({ guild_id: String(guildId), id: Number(id) }, {
    $set: { title: String(title).trim().slice(0, 100), content: String(content).trim().slice(0, 4000), tags: normalizeTags(tags), updated_at: now }
  });
  return true;
}

async function faqDelete(guildId, id) {
  await FaqItem.deleteOne({ guild_id: String(guildId), id: Number(id) });
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
      new TextDisplayBuilder().setContent(`${guild?.name || "Server"}  • FAQ Panel`)
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
  const doc = await MetaText.findOne({ key: String(key) });
  return doc?.value ?? null;
}

async function setMetaText(key, value) {
  await MetaText.updateOne({ key: String(key) }, { $set: { value: String(value) } }, { upsert: true });
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
    const row = await safeGet(`SELECT * FROM ticket_settings WHERE guild_id=?`, [guildId]);
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
  const rows = ticketPanelRows();
  const title = settings?.panel_title || "<a:G_moonfo:1523238023750352947> Mystral Support Desk";

  const description =
    settings?.panel_description ||
    [
      "Butuh bantuan atau ingin menghubungi Staff **Mystral**?",
      "",
      "Pilih salah satu kategori di bawah untuk membuat ticket privat.",
      "",
      "<:Administrator:1523387282248171560> **Support** — Bantuan umum, bot, role, atau kendala server.",
      "<a:lightred:1523182352702898258> **Report** — Melaporkan pelanggaran atau perilaku yang mengganggu.",
      "<a:blue_diamond:1523181238154956956> **Donasi** — Informasi dan konfirmasi donasi.",
      "🤝 **Partnership** — Kerja sama komunitas, sponsor, atau event.",
      "<a:VerifiedUser:1384396379102908416> **Verifikasi** — Pengajuan dan kendala role Verified.",
      "<:a1_heart:1510056894889463969> **Ask** — Pertanyaan, saran, maupun permintaan lainnya.",
      "",
      "> <:visitor:1523182956493930567> Semua ticket bersifat **rahasia** dan hanya dapat dilihat oleh kamu serta Tim Staff MYSTRAL.",
      "> 📝 Mohon jelaskan kronologi atau kebutuhanmu secara lengkap agar kami dapat membantu lebih cepat."
    ].join("\n");

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${title}`),
      new TextDisplayBuilder().setContent(description)
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(rows[0])
    .addActionRowComponents(rows[1])
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("Mystral • Speak freely, we will listen.")
    );

  return { components: [container] };
}

function buildFemaleVerificationPanel() {
  const container = new ContainerBuilder().setAccentColor(0xFFC0CB);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "## 🎀 Verifikasi Role Female\n\n" +
      "Halo! Untuk mendapatkan akses role, silakan lakukan verifikasi terlebih dahulu ya. ✨\n\n" +
      "> 🌸 **Langkah Verifikasi:**\n" +
      "> 1. Klik tombol **📩 Buka Tiket** di bawah.\n" +
      "> 2. Kirimkan **Voice Note (VN)** sesuai instruksi.\n" +
      "> 3. Tunggu staff kami mengecek tiketmu.\n\n" +
      "Jangan lupa siapkan dirimu untuk *record* VN langsung dari Discord ya! ☁️"
    )
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_open_verif")
      .setLabel("📩 Buka Tiket Verifikasi")
      .setStyle(ButtonStyle.Danger)
  );

  container.addActionRowComponents(row);
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent("-# Mystral • Role Verification Female")
  );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2
  };
}

// ====== TICKET: MODAL BUILDER (DYNAMIC) ======
function ticketTypeLabel(type) {
  const map = {
    complaint: "Keluhan",
    support: "Support",
    report: "Report",
    donate: "Donasi",
    donation: "Donasi",
    partnership: "Partnership",
    verification: "Verifikasi",
    ask: "Ask",
    custom: "Custom",
  };
  return map[String(type || "").toLowerCase()] || String(type || "Ticket");
}

function buildTicketModal(type) {
  const t = String(type || "custom").toLowerCase();
  const modal = new ModalBuilder()
    .setCustomId(`ticket:modal:${t}`)
    .setTitle(`🎫 ${ticketTypeLabel(t)} — Mystral`);

  const titleInput = new TextInputBuilder()
    .setCustomId("title")
    .setLabel("Judul Singkat")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(80)
    .setRequired(true);

  let contentInput;
  switch (t) {
    case "donate":
    case "donation":
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

  let row = await MetaText.findOne({ key: 'menfess_last_id' });
  let maxDoc = await MenfessPost.findOne().sort({ id: -1 });

  const maxId = maxDoc ? (maxDoc.id || 0) : 0;

  if (!row) {
    const startLastId = Math.max(MIN_LAST_ID, maxId);
    await MetaText.create({ key: 'menfess_last_id', value: startLastId });
    return;
  }

  const cur = Number(row.value || 0);
  const fixed = Math.max(cur, MIN_LAST_ID, maxId);
  if (fixed !== cur) {
    await MetaText.updateOne({ key: 'menfess_last_id' }, { $set: { value: fixed } });
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
  let doc = await MenfessAnonMap.findOne({ user_id: String(userId) });
  if (doc?.anon_label) return doc.anon_label;

  const count = await MenfessAnonMap.countDocuments();
  const n = count + 1;

  const label = `Anon #${String(n).padStart(3, "0")}`;

  await MenfessAnonMap.updateOne(
    { user_id: String(userId) },
    { $set: { anon_label: label } },
    { upsert: true }
  );

  return label;
}

async function insertMenfessPost({ id, messageId, channelId }) {
  await MenfessPost.create({
    id: Number(id),
    message_id: messageId || null,
    channel_id: channelId || null,
    created_at: Date.now()
  });
  return id;
}

async function updateMenfessPostLink(id, { messageId, channelId, threadId = null }) {
  const setObj = { message_id: messageId, channel_id: channelId };
  if (threadId) setObj.thread_id = threadId;
  await MenfessPost.updateOne({ id: Number(id) }, { $set: setObj });
}

async function getMenfessPostById(id) {
  const doc = await MenfessPost.findOne({ id: Number(id) });
  return doc ? doc.toObject() : null;
}

// ===================== MENFESS BUTTON CLEANUP =====================
async function handleMenfessButtonCleanup(client, sentMsg) {
  if (!sentMsg) return;
  try {
    const lastMsgRow = await MetaText.findOne({ key: 'menfess_last_msg_id' });
    const lastChRow = await MetaText.findOne({ key: 'menfess_last_channel_id' });

    if (lastMsgRow?.value && lastChRow?.value) {
      const oldCh = await client.channels.fetch(lastChRow.value).catch(() => null);
      if (oldCh) {
        const oldMsg = await oldCh.messages.fetch(lastMsgRow.value).catch(() => null);
        if (oldMsg && oldMsg.components?.length > 0) {
          await oldMsg.edit({ components: [] }).catch(() => null);
        }
      }
    }

    await MetaText.updateOne({ key: 'menfess_last_msg_id' }, { $set: { value: String(sentMsg.id) } }, { upsert: true });
    await MetaText.updateOne({ key: 'menfess_last_channel_id' }, { $set: { value: String(sentMsg.channelId) } }, { upsert: true });
  } catch (err) {
    console.error("❌ handleMenfessButtonCleanup Error:", err);
  }
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
  const logId = process.env.TICKET_LOG_CHANNEL_ID || "1459868526096420945";
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
      <div style="font-weight:800; font-size:16px">Mystral — Ticket Transcript</div>
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
// ===================== ID CARD (DB) =====================
async function getIdCard(userId) {
  try {
    const doc = await IdCardUser.findOne({ user_id: String(userId) });
    if (doc) return doc.toObject();
  } catch { }
  return (await safeGet(`SELECT * FROM idcard_users WHERE user_id=?`, [userId])) || null;
}

async function getAllIdCards() {
  try {
    const docs = await IdCardUser.find().sort({ created_at: 1 });
    if (docs.length) return docs.map(d => d.toObject());
  } catch { }
  return await safeAll(`
    SELECT *
    FROM idcard_users
    ORDER BY created_at ASC
  `);
}

async function getAllAfkUsers(guildId = null) {
  const gId = guildId ? String(guildId) : null;
  try {
    const filter = gId ? { guild_id: gId } : {};
    const docs = await AfkUser.find(filter).sort({ since: 1 });
    if (docs.length) return docs.map(d => d.toObject());
  } catch { }
  if (gId) {
    return (await safeAll(`
      SELECT *
      FROM afk_users
      WHERE guild_id=?
      ORDER BY since ASC
    `, [gId])) || [];
  }
  return (await safeAll(`
    SELECT *
    FROM afk_users
    ORDER BY since ASC
  `)) || [];
}

async function upsertIdCard(userId, data) {
  const existing = await getIdCard(userId);
  const createdAt = existing?.created_at ? Number(existing.created_at) : Date.now();
  const number = existing?.number || data.number || genCardNumber(userId);
  const updatedAt = Date.now();

  try {
    await IdCardUser.updateOne(
      { user_id: String(userId) },
      {
        $set: {
          number: String(number),
          name: String(data.name || ""),
          gender: String(data.gender || ""),
          domisili: String(data.domisili || ""),
          hobi: String(data.hobi || ""),
          status: String(data.status || ""),
          theme: String(data.theme || ""),
          created_at: createdAt,
          updated_at: updatedAt,
        },
      },
      { upsert: true }
    );
  } catch (e) {
    console.error("[ID CARD MONGO ERROR]", e);
  }

  await safeRun(
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
    [userId, number, data.name, data.gender, data.domisili, data.hobi, data.status, data.theme, createdAt, updatedAt]
  ).catch(() => { });

  return getIdCard(userId);
}

async function countRegistry() {
  try {
    const count = await IdCardUser.countDocuments();
    if (count > 0) return count;
  } catch { }
  const r = await safeGet(`SELECT COUNT(*) AS n FROM idcard_users`);
  return Number(r?.n || 0);
}

async function registryPage(offset, limit) {
  try {
    const docs = await IdCardUser.find().sort({ created_at: -1 }).skip(Number(offset)).limit(Number(limit));
    if (docs.length) return docs.map(d => ({ user_id: d.user_id, name: d.name, created_at: d.created_at }));
  } catch { }
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
    if (!member.manageable) return false;
    await member.setNickname(nickOrNull);
    return true;
  } catch (e) {
    console.warn("[AFK] setNickname failed:", e?.message || e);
    return false;
  }
}

// ===================== AFK =====================
async function setAfk(userId, reason, guildId = null) {
  const rText = safeText(reason || "AFK", 80);
  const since = Date.now();
  const gId = guildId ? String(guildId) : null;

  try {
    const filter = gId ? { user_id: String(userId), guild_id: gId } : { user_id: String(userId) };
    await AfkUser.updateOne(
      filter,
      { $set: { guild_id: gId, user_id: String(userId), reason: rText, since } },
      { upsert: true }
    );
  } catch (e) {
    console.error("[AFK MONGO ERROR]", e);
  }

  await safeRun(
    `INSERT INTO afk_users (user_id, reason, since, guild_id)
     VALUES (?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET reason=excluded.reason, since=excluded.since, guild_id=excluded.guild_id`,
    [userId, rText, since, gId]
  ).catch(() => {
    return safeRun(
      `INSERT INTO afk_users (user_id, reason, since)
       VALUES (?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET reason=excluded.reason, since=excluded.since`,
      [userId, rText, since]
    ).catch(() => { });
  });
}

async function clearAfk(userId, guildId = null) {
  let removed = false;
  const gId = guildId ? String(guildId) : null;

  try {
    const filter = gId ? { user_id: String(userId), guild_id: gId } : { user_id: String(userId) };
    const res = await AfkUser.deleteOne(filter);
    if (res.deletedCount > 0) removed = true;
  } catch { }

  try {
    if (gId) {
      const r = await safeRun(`DELETE FROM afk_users WHERE user_id=? AND (guild_id=? OR guild_id IS NULL)`, [userId, gId]);
      if ((r?.changes || 0) > 0) removed = true;
    } else {
      const r = await safeRun(`DELETE FROM afk_users WHERE user_id=?`, [userId]);
      if ((r?.changes || 0) > 0) removed = true;
    }
  } catch { }

  return removed;
}

async function clearAllAfkUsers(guildId = null) {
  const gId = guildId ? String(guildId) : null;
  try {
    const filter = gId ? { guild_id: gId } : {};
    await AfkUser.deleteMany(filter);
  } catch { }

  try {
    if (gId) {
      const r = await safeRun(`DELETE FROM afk_users WHERE guild_id=?`, [gId]);
      return r?.changes || 0;
    }
    const r = await safeRun(`DELETE FROM afk_users`);
    return r?.changes || 0;
  } catch {
    return 0;
  }
}

async function getAfk(userId, guildId = null) {
  const gId = guildId ? String(guildId) : null;
  try {
    const filter = gId ? { user_id: String(userId), guild_id: gId } : { user_id: String(userId) };
    const doc = await AfkUser.findOne(filter);
    if (doc) return { reason: doc.reason, since: doc.since, guild_id: doc.guild_id };
  } catch { }

  try {
    if (gId) {
      const row = await safeGet(`SELECT reason, since, guild_id FROM afk_users WHERE user_id=? AND (guild_id=? OR guild_id IS NULL)`, [userId, gId]);
      if (row) return row;
    }
    return (await safeGet(`SELECT reason, since FROM afk_users WHERE user_id=?`, [userId])) || null;
  } catch {
    return null;
  }
}

// ===================== SORTING (LOCK) =====================
async function getSortedUser(userId) {
  try {
    const doc = await SortingUser.findOne({ user_id: String(userId) });
    if (doc) return doc.toObject();
  } catch { }

  return (await safeGet(
    `SELECT user_id, choice, at FROM sorting_users WHERE user_id=?`,
    [userId]
  )) || null;
}

async function setSortedUser(userId, choice) {
  const at = Date.now();
  try {
    await SortingUser.updateOne(
      { user_id: String(userId) },
      { $set: { choice, at } },
      { upsert: true }
    );
  } catch (e) {
    console.error("[SORTING MONGO ERROR]", e);
  }

  await safeRun(
    `INSERT INTO sorting_users (user_id, choice, at)
     VALUES (?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET choice=excluded.choice, at=excluded.at`,
    [userId, choice, at]
  ).catch(() => { });
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
  ctx.fillText(`© Mystral • Powered by ${BRAND_NAME}`, lx, cardY + cardH - 36);

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
  ctx.fillText("Mystral", x + 34, y + 64);

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
  ctx.fillText("Mystral", 510, 68);
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
  ctx.fillText("Mystral", 510, 68);
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
    "Lingkaran arcane kembali aktif, memanggil setiap jiwa yang melangkah ke dalam wilayah Mystral.",
    "Dengan menyentuh segel di bawah, kau akan memasuki **Ritual Pemilahan Arcane** hukum kuno yang menentukan afiliasimu.",
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
    new ButtonBuilder().setCustomId("menfess:new").setLabel("Kirim Menfess").setStyle(ButtonStyle.Success).setEmoji("✉️"),
    new ButtonBuilder().setCustomId("menfess:reply_panel").setLabel("Balas Menfess").setStyle(ButtonStyle.Primary).setEmoji("🫧")
  );
}

const HELP_CATEGORIES = {
  streak: {
    emoji: "🔥",
    label: "Flame Streak System",
    description: "Daily streak tracking, streak profiles, cards, and recovery.",
    commands: [
      "`cs` / `cstreak` / `c fire` - Check daily streak status.",
      "`csl` / `cstreak list` / `/streak list` - View active & broken streak list.",
      "`csp` / `cstreak profile` / `/streak profile` - View interactive streak profile card.",
      "`csc` / `cstreak cards` / `/streak cards` - View interactive streak cards.",
      "`csi` / `cstreak info` / `/streak info` - Check streak status with a member.",
      "`csr` / `cstreak recover` / `/streak recover` - Recover a broken streak.",
      "`cstreak resetbg` / `removebg` - Hapus background custom kartu streak."
    ]
  },
  general: {
    emoji: "🧭",
    label: "General & Utilities",
    description: "General commands, status checks, latency ping, and calculator.",
    commands: [
      "`/help` / `chelp` - Display this help grimoire.",
      "`c leaderboard recap` / `/leaderboard recap` - Lihat peringkat keaktifan Member of the Month (Non-staff).",
      "`c leaderboard all` / `c lb all` / `/leaderboard all` - Lihat peringkat keaktifan keseluruhan server (Termasuk staff).",
      "`cremovebg` / `crembg` / `cnobg` - Hapus background gambar otomatis (PNG transparan).",
      "`/ping` / `cping` - Check bot connection & latency.",
      "`/botstatus` - Check memory usage and bot status.",
      "`/halo` / `chalo` - Warm greetings from the assistant.",
      "`/about` - Detailed information about Mystral Assistant.",
      "`/calc <expression>` / `ccalc` - Secure mathematical calculator.",
      "`/translate <text>` / `cts` - Translate text to another language.",
      "`/weather <location>` / `cweather` - Check weather conditions.",
      "`/qrcode <text>` / `cqrcode` - Generate a QR Code.",
      "`/shorturl <url>` / `csurl` - Shorten a URL using TinyURL."
    ]
  },
  profile: {
    emoji: "🪞",
    label: "Profile & Lookup",
    description: "User profiles, avatars, server details, and activity metrics.",
    commands: [
      "`/profile` - View your interactive academy profile or someone else's.",
      "`/avatar` - Retrieve a user's high-resolution avatar.",
      "`/userinfo` - Show detailed Discord account information.",
      "`/serverinfo` - Display server statistics and information.",
      "`/lastseen` - Track when a member was last active in chat.",
      "`/topactive` - View the most active members in the server.",
      "`/check <platform>` - Check game profile (Roblox, GitHub, Steam, Chess)."
    ]
  },
  academy: {
    emoji: "🪪",
    label: "Academy Identity",
    description: "Academy ID Cards and Arcane Sorting ritual.",
    commands: [
      "`/idcard` - Create, update, or design your Mystral Identity Card.",
      "`/registry` - Access the list of registered Mystral members.",
      "`/myhouse` - Show your hostel/affiliation from the sorting ritual."
    ]
  },
  social: {
    emoji: "🕯️",
    label: "Social & Chill",
    description: "AFK states, interactive reminders, and Truth or Dare.",
    commands: [
      "`/tod panel` - Open Truth or Dare with interactive buttons.",
      "`/tod truth` - Get a random Truth question.",
      "`/tod dare` - Get a random Dare challenge.",
      "`/tod random` - Get a random Truth or Dare.",
      "`/tod daily` - Get a special daily challenge.",
      "`/tod submit` - Submit your own custom Truth or Dare ideas.",
      "`/afk [reason]` / `c afk` - Enter AFK state (notifies when mentioned).",
      "`/afk_list` - View the list of currently AFK members.",
      "`/remind_in <duration> <message>` - Set a reminder alarm based on duration.",
      "`/remind_at <time> <message>` - Set a reminder alarm at a specific time (WIB).",
      "`/remind_list` - View or delete your active reminders."
    ]
  },
  games: {
    emoji: "🎉",
    label: "Games & Events",
    description: "Number guessing mini-games, Tarot, and giveaway system.",
    commands: [
      "`/tebakangka` / `cta` - Start an interactive number guessing game.",
      "`/hint` / `chint` - Get range hints for the active guessing game.",
      "`/stopgame` / `cstopgame` - Terminate the active guessing game.",
      "`/leaderboard tebakangka` / `clb angka` - View top guessers leaderboard.",
      "`/tarot` / `ctarot` - Open daily tarot card reading."
    ]
  },
  faq: {
    emoji: "📚",
    label: "Knowledge Base (FAQ)",
    description: "Frequently Asked Questions (FAQ) information center.",
    commands: [
      "`/faq_view <tag>` - View FAQ answers by key tag.",
      "`/faq_search <query>` - Search for relevant FAQ articles.",
      "`/faq_list` - Display the full list of registered FAQs."
    ]
  },
  myrole: {
    emoji: "🎨",
    label: "My Custom Role",
    description: "Kelola tampilan custom role milikmu sendiri — warna, icon, dan nama.",
    commands: [
      "`cmyrole` / `myrole` / `myr` — Buka panduan lengkap My Custom Role.",
      "`cmyrole color @RoleKamu #HEX` — Ganti warna role kamu.",
      "`cmyrole color @RoleKamu #HEX1 #HEX2` — Set 2 warna / gradien.",
      "`cmyrole icon @RoleKamu <url>` — Pasang icon gambar pada role (Boost Level 2).",
      "`cmyrole removeicon @RoleKamu` — Hapus icon dari role.",
      "`cmyrole rename @RoleKamu <nama baru>` — Ganti nama role.",
      "`cmyrole info @RoleKamu` — Lihat detail info role kamu.",
      "> ⚠️ Kamu hanya bisa mengelola role yang **kamu miliki sendiri**."
    ]
  },
  custom_roles: {
    emoji: "🎨",
    label: "Booster Custom Roles",
    description: "Fitur custom role eksklusif untuk Server Booster.",
    commands: [
      "`cmyrole claim <nama_role>` - Klaim/buat custom role khusus Server Booster.",
      "`cmyrole color #HEX` - Ganti warna custom role-mu.",
      "`cmyrole icon <url|gambar>` - Set gambar icon custom role (Server Boost Lv 2).",
      "`cmyrole removeicon` - Hapus gambar icon dari custom role.",
      "`cmyrole removebg [#HEX1] [#HEX2]` - Hapus background gambar icon & ubah warna/gradient.",
      "`cmyrole rename <nama_baru>` - Ganti nama custom role-mu.",
      "`cmyrole info` - Lihat statistik & detail custom role-mu."
    ]
  }
};

const ADMIN_HELP_CATEGORIES = {
  admin_staff_tagging: {
    emoji: "📌",
    label: "Staff Tagging & Duty System",
    description: "Rotasi & giliran tag member 2x sehari, profil staff, & directory panel.",
    commands: [
      "`ctag setup` — Wizard & status setup 1-baris.",
      "`ctag duty` / `status` — Lihat tugas tag hari ini.",
      "`ctag roster` / `minggu` — Lihat rotasi mingguan (Senin - Minggu).",
      "`ctag done` / `busy` / `takeover` — Selesai, berhalangan, atau ambil alih tugas.",
      "`ctag assign <1/2> @user` — Set petugas Slot 1 / Slot 2 manual.",
      "`ctag config role|channel|timeout|time` — Atur role, channel, reminder, & jam slot.",
      "`ctag exempt add/remove/list` — Kelola daftar pengecualian staff.",
      "`ctag random` — Acak ulang rotasi staff hari ini.",
      "`cstaffprofile [@user]` — Lihat kartu profil identitas & statistik aktivitas staff.",
      "`cstaff welcome @user` — Sambut & umumkan staff baru (New Staff Onboarding).",
      "`cstaff welcomesetup` — Setup channel & role mention welcome staff 1-baris.",
      "`cstaffpanel setup` — Deploy panel daftar staff & status online/offline real-time.",
      "`cstaffpanel addrole` / `exclude` — Kelola struktur divisi & pengecualian ID panel staff."
    ]
  },
  admin_booster: {
    emoji: "💖",
    label: "Booster Rewards & Custom Roles",
    description: "Pengumuman Server Boost & pengelolaan custom role booster.",
    commands: [
      "`cbooster setup` — Setup 1-baris (log channel, custom role channel, base role).",
      "`cbooster toggle|setmsg|settitle|setlog|setrolechannel` — Kelola kartu pengumuman.",
      "`cbooster config` / `test` — Cek status & pratinjau kartu booster.",
      "`cmyrole claim <nama>` — Klaim/buat custom role booster.",
      "`cmyrole color|icon|removebg|rename|info` — Edit warna, icon, bg, & detail role."
    ]
  },
  admin_roles: {
    emoji: "🎨",
    label: "Role Management System",
    description: "Kelola role masal, warna gradien, dan icon role.",
    commands: [
      "`ccr <nama> [#hex1] [#hex2] [icon]` — Buat role baru secara cepat.",
      "`crole color @role #hex1 [#hex2]` — Set warna role (dukung 2 warna gradien).",
      "`crole icon @role <url|lampiran>` / `removeicon` — Pasang/hapus icon role.",
      "`crole add @role <@user|all|human|bot>` — Tambahkan role masal.",
      "`crole remove @role <@user|all|human|bot>` — Hapus role masal.",
      "`crole addall` / `removeall` — Perintah cepat role masal.",
      "`crole info` / `members` / `rename` / `delete` — Informasi, daftar member, rename, & hapus role."
    ]
  },
  admin_moderation: {
    emoji: "🛡️",
    label: "Server Moderation Shield",
    description: "Moderasi member, warning, timeout, kick, ban, & security log.",
    commands: [
      "`cinvitelog` — Anti-invite link detector & whitelist log manager.",
      "`cstafflog` — Audit log otomatis (role, kick, ban, timeout) & staff notes.",
      "`cwarn` / `cwarnings` / `cclearwarn` / `cunwarn` — Sistem warning member.",
      "`ctimeout <user> <durasi>` / `cuntimeout` — Timeout & cabut timeout.",
      "`cpurge <jumlah>` / `cmute` / `ckick` / `cban` / `cunban` — Purge, mute, kick, & ban."
    ]
  },
  admin_automation: {
    emoji: "🤖",
    label: "Autoresponder & Sticky Messages",
    description: "Respon otomatis, pesan sticky, dan media embed.",
    commands: [
      "`cadd autoresponse <trigger> | <response>` — Tambah autoresponse.",
      "`cedit/cdelete/clist/cenable/cdisable autoresponse` — Kelola autoresponse.",
      "`c sticky set <content>` / `remove` — Atur/hapus pesan sticky channel.",
      "`c media enable/disable/status` — Universal Media Embed setting."
    ]
  },
  admin_voice: {
    emoji: "🔊",
    label: "Voice Channel Control",
    description: "Kontrol member di voice channel.",
    commands: [
      "`c move voice <user> <channel>` — Pindahkan member ke VC lain.",
      "`c disconnect voice <user>` — Putuskan member dari VC.",
      "`c mute voice <user>` / `deafen` — Server mute / deafen member."
    ]
  },
  admin_panels: {
    emoji: "📋",
    label: "Panel Setup & Deploy",
    description: "Pengiriman panel tiket, verifikasi, staff directory, sorting, & menfess.",
    commands: [
      "`cstaffpanel setup` — Deploy panel daftar staff & status kehadiran real-time.",
      "`c leaderboard send [#channel]` — Pasang panel Live Leaderboard.",
      "`c leaderboard lobby add/remove/list` — Kelola lobby channel leaderboard.",
      "`c leaderboard blacklist add/remove/list` — Kelola blacklist user leaderboard.",
      "`/ticketpanel` / `/setup-verif` / `/sortingpanel` — Deploy panel tiket, verif, & sorting.",
      "`/menfesspanel` / `/selfrolespanel` / `/faq_panel` — Deploy panel menfess, selfroles, & FAQ."
    ]
  },
  admin_tools: {
    emoji: "🔐",
    label: "Admin & Owner System Tools",
    description: "Backup database, export data, dan embed custom.",
    commands: [
      "`/backup_now` — Backup instant database MongoDB/SQLite.",
      "`/idcard_export` — Export database ID Card ke format JSON.",
      "`/tod_add` — Tambah pertanyaan Truth or Dare.",
      "`/sendembed` / `/sendembedv2` — Buat & kirim embed custom."
    ]
  }
};

function buildHelpUI(selectedCategory = "home", userId = null) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`help:menu:${userId || "any"}`)
    .setPlaceholder("📖 Choose a Feature Category...")
    .addOptions(
      {
        label: "Main Menu",
        value: "home",
        description: "Return to the front page of the grimoire.",
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

  const container = new ContainerBuilder();
  if (selectedCategory === "home" || !HELP_CATEGORIES[selectedCategory]) {
    const categoriesDesc = Object.entries(HELP_CATEGORIES)
      .map(([key, cat]) => `${cat.emoji} **${cat.label}**`)
      .join("\n");

    container
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# 📚 Mystral Assistant — Command Grimoire"),
        new TextDisplayBuilder().setContent(
          [
            "Welcome to the **Mystral** help center.",
            "Use slash commands `/...` for main features, or prefix `c...` for quick commands.",
            "",
            "> **Select a feature category below to view the full command list.**",
            "",
            categoriesDesc
          ].join("\n")
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(row)
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("Mystral Help • 🛡️ Khusus Admin/Mod: Ketik 'chelp mod' atau 'chelp admin'")
      );
  } else {
    const cat = HELP_CATEGORIES[selectedCategory];
    container
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${cat.emoji} Category: ${cat.label}`),
        new TextDisplayBuilder().setContent(
          [
            `*${cat.description}*`,
            "",
            cat.commands.join("\n")
          ].join("\n")
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(row)
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Mystral - Category: ${cat.label}   slash / prefix c`)
      );
  }

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] }
  };
}

function buildAdminHelpUI(selectedCategory = "home", userId = null) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`help:adminmenu:${userId || "any"}`)
    .setPlaceholder("🛠️ Choose an Admin/Mod Category...")
    .addOptions(
      {
        label: "Semua Perintah Admin (Full List)",
        value: "home",
        description: "Tampilkan seluruh panduan perintah admin & moderator.",
        emoji: "👑",
        default: selectedCategory === "home"
      },
      ...Object.entries(ADMIN_HELP_CATEGORIES).map(([key, cat]) => ({
        label: cat.label,
        value: key,
        description: cat.description.length > 50 ? cat.description.slice(0, 47) + "..." : cat.description,
        emoji: cat.emoji,
        default: selectedCategory === key
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const container = new ContainerBuilder();
  if (selectedCategory === "home" || !ADMIN_HELP_CATEGORIES[selectedCategory]) {
    const categoriesDesc = Object.entries(ADMIN_HELP_CATEGORIES)
      .map(([key, cat]) => `${cat.emoji} **${cat.label}**\n▸ *${cat.description}*`)
      .join("\n\n");

    container
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# 🛠️ Mystral Assistant — Admin & Moderator Grimoire"),
        new TextDisplayBuilder().setContent(
          [
            "Selamat datang di pusat bantuan **Admin & Moderator Server**.",
            "Gunakan panduan perintah di bawah untuk kelola role masal, moderasi, autoresponse, dan panel setup.",
            "",
            "> **Pilih kategori fitur pengelola pada menu dropdown di bawah untuk melihat rincian perintah.**",
            "",
            categoriesDesc
          ].join("\n")
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(row)
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("Mystral Admin Shield • Khusus Administrator & Moderator")
      );
  } else {
    const cat = ADMIN_HELP_CATEGORIES[selectedCategory];
    container
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${cat.emoji} Category: ${cat.label}`),
        new TextDisplayBuilder().setContent(
          [
            `*${cat.description}*`,
            "",
            cat.commands.join("\n")
          ].join("\n")
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(row)
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Mystral Admin • ${cat.label}`)
      );
  }

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] }
  };
}

function ticketPanelComponentsV2() {
  const rows = ticketPanelRows();

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("# <a:G_moonfo:1523238023750352947> Mystral Support Desk"),
      new TextDisplayBuilder().setContent(
        [
          "Butuh bantuan atau ingin menghubungi **Staff Mystral**?",
          "",
          "Pilih salah satu kategori di bawah untuk membuat **ticket privat** sesuai dengan kebutuhanmu.",
          "",
          "<:Administrator:1523387282248171560> **Support** — Bantuan umum, bot, role, atau kendala server.",
          "<a:lightred:1523182352702898258> **Report** — Melaporkan pelanggaran atau perilaku yang mengganggu.",
          "<a:blue_diamond:1523181238154956956> **Donasi** — Informasi, konfirmasi, atau dukungan untuk MYSTRAL.",
          "🤝 **Partnership** — Kerja sama komunitas, sponsor, maupun kolaborasi event.",
          "<a:VerifiedUser:1384396379102908416> **Verifikasi** — Pengajuan atau kendala role Verified dan Real Female.",
          "<:a1_heart:1510056894889463969> **Ask** — Pertanyaan, saran, atau kebutuhan lainnya.",
          "",
          "> <:visitor:1523182956493930567> Semua ticket bersifat **rahasia** dan hanya dapat diakses oleh kamu serta Tim Staff MYSTRAL.",
          "> 📝 Mohon jelaskan kronologi atau kebutuhanmu secara lengkap agar kami dapat membantu lebih cepat."
        ].join("\n")
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true)
    )
    .addActionRowComponents(rows[0])
    .addActionRowComponents(rows[1])
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "<a:G_moonfo:1523238023750352947> **Mystral District**  • *Your comfort is our priority.*"
      )
    );

  return [container];
}

function ticketPanelRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ticket:open:support").setLabel("Support").setStyle(ButtonStyle.Primary).setEmoji("1523387282248171560"),
      new ButtonBuilder().setCustomId("ticket:open:report").setLabel("Report").setStyle(ButtonStyle.Danger).setEmoji("1523182352702898258"),
      new ButtonBuilder().setCustomId("ticket:open:donation").setLabel("Donasi").setStyle(ButtonStyle.Success).setEmoji("1523181238154956956"),
      new ButtonBuilder().setCustomId("ticket:open:partnership").setLabel("Partnership").setStyle(ButtonStyle.Primary).setEmoji("🤝")
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ticket:open:verification").setLabel("Verifikasi").setStyle(ButtonStyle.Success).setEmoji("1384396379102908416"),
      new ButtonBuilder().setCustomId("ticket:open:ask").setLabel("Ask").setStyle(ButtonStyle.Secondary).setEmoji("1510056894889463969")
    )
  ];
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
    avatarUrl: (member ?? user).displayAvatarURL({ extension: "png", size: 256 }),
  });

  const filename = `house_card_${user.id}.png`;
  const file = new AttachmentBuilder(png, { name: filename });

  const embed = new EmbedBuilder()
    .setTitle("🪪 Mystral Card")
    .setColor(EMBED_COLOR)
    .setDescription(
      [
        `**Member:** <@${user.id}>`,
        `**Student:** ${choice === "dark" ? "<:dark:1459543141609771101> Dark Student" : "<:light:1459543076736336004> Light Student"}`,
      ].join("\n")
    )
    .setImage(`attachment://${filename}`)
    .setFooter({ text: "Mystral • Student Registry" })
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
          msg.embeds?.[0]?.title === "🪪 Mystral Card"
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
const pendingConfirmations = new Map();
const autoresponseCooldowns = new Map();

// Sticky Message System Cache
const stickyCache = new Map(); // channelId -> { content, lastMessageId }
const stickyLocks = new Set();  // channelId
const stickyDebounces = new Map(); // channelId -> Timeout

// Universal Media Embed Cache
const mediaSettingsCache = new Map(); // guildId -> settings object

function findRoleFuzzy(guild, roleQuery) {
  const query = roleQuery.toLowerCase().trim();
  let role = guild.roles.cache.find(r => r.name.toLowerCase() === query);
  if (!role) {
    role = guild.roles.cache.find(r => r.name.toLowerCase().includes(query));
  }
  return role;
}

async function findMemberFuzzy(guild, userQuery) {
  const query = userQuery.replace(/[<@!>]/g, "").trim();
  if (/^\d{17,20}$/.test(query)) {
    return await guild.members.fetch(query).catch(() => null);
  }
  await guild.members.fetch().catch(() => { });
  const lowQuery = query.toLowerCase();
  let member = guild.members.cache.find(m => m.user.username.toLowerCase() === lowQuery || m.displayName.toLowerCase() === lowQuery);
  if (!member) {
    member = guild.members.cache.find(m => m.user.username.toLowerCase().includes(lowQuery) || m.displayName.toLowerCase().includes(lowQuery));
  }
  return member;
}

async function safeCtxReply(ctx, payload) {
  try {
    const isInteraction = Boolean(ctx.isInteraction?.() || ctx.deferred !== undefined || ctx.replied !== undefined);
    if (isInteraction) {
      if (ctx.deferred || ctx.replied) {
        return await ctx.editReply(payload).catch(async () => {
          return await ctx.followUp(payload).catch(() => null);
        });
      }
      if (typeof payload === 'object') {
        payload.fetchReply = true;
      } else {
        payload = { content: payload, fetchReply: true };
      }
      return await ctx.reply(payload).catch(async () => {
        if (ctx.deferred || ctx.replied) {
          return await ctx.editReply(payload).catch(() => null);
        }
        return await ctx.followUp(payload).catch(() => null);
      });
    }
    return await ctx.reply(payload).catch(() => null);
  } catch (e) {
    console.error("[CTX REPLY ERROR]", e);
  }
}

function validateModAction(ctx, targetMember, requiredBotPerm, requiredUserPerm) {
  const guild = ctx.guild;
  const me = guild.members.me;
  const member = ctx.member;
  const authorId = ctx.author ? ctx.author.id : ctx.user.id;
  if (requiredUserPerm && !member.permissions.has(requiredUserPerm)) {
    return { ok: false, error: `❌ Anda tidak memiliki izin (\`${requiredUserPerm}\`) untuk melakukan tindakan ini.` };
  }
  if (requiredBotPerm && !me.permissions.has(requiredBotPerm)) {
    return { ok: false, error: `❌ Bot tidak memiliki izin (\`${requiredBotPerm}\`) di server ini.` };
  }
  if (targetMember) {
    if (targetMember.id === guild.ownerId) {
      return { ok: false, error: `❌ Tidak dapat melakukan tindakan pada Owner Server.` };
    }
    const botHighest = me.roles.highest.position;
    const userHighest = member.roles.highest.position;
    const targetHighest = targetMember.roles.highest.position;
    if (botHighest <= targetHighest) {
      return { ok: false, error: `❌ Peran bot tidak cukup tinggi untuk memodifikasi member ini.` };
    }
    if (userHighest <= targetHighest && authorId !== guild.ownerId) {
      return { ok: false, error: `❌ Peran Anda tidak cukup tinggi untuk memodifikasi member ini.` };
    }
  }
  return { ok: true };
}

function formatVoiceDuration(ms) {
  if (!ms || ms < 0) return "0m";
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) return `${hours}h ${String(mins).padStart(2, '0')}m`;
  return `${mins}m`;
}

function formatVoiceDurationIndo(ms) {
  if (!ms || ms < 0) return "0 menit";
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  let res = [];
  if (hours > 0) res.push(`${hours} jam`);
  if (mins > 0 || res.length === 0) res.push(`${mins} menit`);
  return res.join(" ");
}

function parseKeyValueArgs(text) {
  const args = {};
  const regex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const key = match[1].toLowerCase();
    const val = match[2] || match[3] || match[4];
    args[key] = val;
  }
  return args;
}

async function checkAutoresponses(message) {
  const guildId = message.guild.id;
  const responses = await safeAll(`SELECT * FROM autoresponses WHERE guild_id=? AND is_enabled=1`, [guildId]);
  const now = Date.now();
  for (const r of responses) {
    const cooldownKey = `${message.author.id}:${r.id}`;
    const lastUsed = autoresponseCooldowns.get(cooldownKey) || 0;
    if (r.cooldown && (now - lastUsed) < r.cooldown * 1000) continue;
    let isMatch = false;
    const trigger = r.trigger_text;
    const msgContent = r.ignore_case ? message.content.toLowerCase() : message.content;
    const compTrigger = r.ignore_case ? trigger.toLowerCase() : trigger;
    if (r.match_type === 'exact') {
      isMatch = (msgContent.trim() === compTrigger.trim());
    } else if (r.match_type === 'contains') {
      isMatch = msgContent.includes(compTrigger);
    } else if (r.match_type === 'regex') {
      try {
        const flags = r.ignore_case ? 'i' : '';
        const rx = new RegExp(trigger, flags);
        isMatch = rx.test(message.content);
      } catch {
        isMatch = false;
      }
    }
    if (isMatch) {
      autoresponseCooldowns.set(cooldownKey, now);
      let finalResponse = r.response_text;
      if (r.random_responses) {
        try {
          const opts = JSON.parse(r.random_responses);
          if (opts.length) finalResponse = opts[Math.floor(Math.random() * opts.length)];
        } catch { }
      }
      finalResponse = finalResponse
        .replace(/{mention}/g, `<@${message.author.id}>`)
        .replace(/{user}/g, `<@${message.author.id}>`)
        .replace(/{username}/g, message.author.username)
        .replace(/{displayName}/g, message.member ? message.member.displayName : message.author.username)
        .replace(/{channel}/g, `<#${message.channel.id}>`);

      const payload = {};
      const embeds = [];
      const components = [];
      if (r.embed_response) {
        const embed = new EmbedBuilder().setColor(EMBED_COLOR).setDescription(finalResponse);
        embeds.push(embed);
      } else {
        payload.content = finalResponse;
      }
      if (r.attachment_url) {
        const val = validateDirectImageUrl(r.attachment_url);
        if (!val) payload.files = [r.attachment_url];
      }
      if (r.button_label && r.button_url) {
        const button = new ButtonBuilder().setLabel(r.button_label).setURL(r.button_url).setStyle(ButtonStyle.Link);
        components.push(new ActionRowBuilder().addComponents(button));
      }
      if (r.select_menu_options) {
        try {
          const opts = JSON.parse(r.select_menu_options);
          if (opts.length) {
            const select = new StringSelectMenuBuilder().setCustomId(`ar_select_${r.id}`).setPlaceholder('Pilih opsi...').addOptions(opts.map(o => ({ label: o, value: o })));
            components.push(new ActionRowBuilder().addComponents(select));
          }
        } catch { }
      }
      if (embeds.length) payload.embeds = embeds;
      if (components.length) payload.components = components;
      if (r.reply_mode === 'reply') {
        payload.allowedMentions = { repliedUser: !!r.mention_user };
        await message.reply(payload).catch(() => null);
      } else {
        payload.allowedMentions = { parse: r.mention_user ? ['users'] : [] };
        await message.channel.send(payload).catch(() => null);
      }
      return true;
    }
  }
  return false;
}

async function handleVoiceCheck(ctx) {
  const guild = ctx.guild;
  const channels = guild.channels.cache.filter(c => c.type === 2);
  const activeChannels = [];
  for (const [id, ch] of channels) {
    if (ch.members.size > 0) activeChannels.push(ch);
  }
  if (activeChannels.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🎤 Voice Channel Inspector")
      .setColor(0xe74c3c)
      .setDescription("❌ Tidak ada voice channel aktif saat ini.")
      .setFooter({ text: BRAND_NAME })
      .setTimestamp();
    return safeCtxReply(ctx, { embeds: [embed] });
  }
  const embed = new EmbedBuilder()
    .setTitle("🎤 Voice Channel Inspector")
    .setColor(EMBED_COLOR)
    .setDescription(`Menampilkan **${activeChannels.length}** voice channel aktif saat ini.`)
    .setFooter({ text: BRAND_NAME })
    .setTimestamp();

  for (const ch of activeChannels) {
    let list = "";
    for (const [memberId, member] of ch.members) {
      const joinTime = voiceSessions.get(memberId);
      const duration = joinTime ? Date.now() - joinTime : 0;
      list += `• **${member.displayName}** — \`${formatVoiceDuration(duration)}\`\n`;
    }
    embed.addFields({
      name: `🔊 ${ch.name} (${ch.members.size} Member)`,
      value: list || "_Tidak ada member_",
      inline: false
    });
  }
  return safeCtxReply(ctx, { embeds: [embed] });
}

async function handleBotStatus(ctx) {
  const started = Date.now();
  let dbOk = false;
  try {
    const dbRow = await safeGet("SELECT 1 AS ok");
    dbOk = Boolean(dbRow);
  } catch { }
  const dbLatency = Date.now() - started;

  const guildId = ctx.guild?.id || null;
  const client = ctx.client || ctx.message?.client || ctx.channel?.client;
  const commandCount = await countRegisteredCommands(client, guildId).catch(() => null);

  const container = new ContainerBuilder().setAccentColor(dbOk ? 0x2ecc71 : 0xef4444);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## 🤖 Bot Health & Status\n` +
      `Sistem status dan performa engine **${BRAND_NAME}**\n\n` +
      `🟢 **Database:** \`${dbOk ? "Connected (OK)" : "Disconnected (FAIL)"}\` • \`${dbLatency}ms\`\n` +
      `📊 **Engine:** \`MongoDB (Mongoose Atlas)\`\n` +
      `💗 **WebSocket Ping:** \`${client?.ws?.ping || 0}ms\`\n` +
      `⏱️ **Uptime:** \`${client?.uptime ? formatDuration(client.uptime) : 'Online'}\`\n` +
      `⚡ **Commands:** \`${commandCount != null ? commandCount : "Active"}\` registered\n` +
      `💻 **Node.js:** \`${process.version}\`\n` +
      `🧠 **Memory Usage:** \`${formatBytes(process.memoryUsage().rss)}\``
    )
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`*${BRAND_NAME} • Health Check*`)
  );

  return safeCtxReply(ctx, {
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

async function handleSingleUserVoiceCheck(ctx, member) {
  const voiceState = member.voice;
  if (!voiceState?.channel) {
    const container = new ContainerBuilder().setAccentColor(0xe74c3c);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## 🎙️ Status Voice Member — ${member.displayName}\n\n**${member.displayName}** (<@${member.id}>) sedang **tidak berada** di voice channel.`)
    );
    await safeCtxReply(ctx, { components: [container], flags: MessageFlags.IsComponentsV2 });
    return true;
  }

  const vc = voiceState.channel;
  const joinTime = voiceSessions.get(member.id);
  const durationMs = joinTime ? Date.now() - joinTime : 0;
  const durationText = formatVoiceDurationIndo(durationMs);

  let startTimeStr = "";
  if (joinTime) {
    const dateObj = new Date(joinTime);
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const mins = String(dateObj.getMinutes()).padStart(2, '0');
    startTimeStr = `${hours}:${mins}`;
  }

  const allMembers = Array.from(vc.members.values());
  const pageSize = 5;
  const totalPages = Math.ceil(allMembers.length / pageSize) || 1;
  let currentPage = 0;

  async function buildPage(page) {
    const start = page * pageSize;
    const end = start + pageSize;
    const pageMembers = allMembers.slice(start, end);

    const container = new ContainerBuilder().setAccentColor(0x5865F2);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## 🔊 Voice Channel Activity`)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    const timeInfo = startTimeStr ? `${startTimeStr} WIB (${durationText})` : durationText;
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `👤 **User** : **${member.displayName}**\n` +
        `💳 **User ID** : \`${member.id}\`\n` +
        `⏰ **Join Time** : ${timeInfo}\n` +
        `📍 **Channel** : <#${vc.id}> \`[${vc.members.size}/${vc.userLimit || '∞'}]\``
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    const memberLines = pageMembers.map((m, idx) => {
      const globalIdx = start + idx + 1;
      const isTarget = m.id === member.id ? " ⭐ **(Target)**" : "";
      const isBot = m.user.bot ? " 🤖" : "";
      const usernameText = (m.user.username && m.user.username !== m.displayName) ? ` (@${m.user.username})` : "";
      return `\`${globalIdx}.\` <@${m.id}>${usernameText}${isTarget}${isBot}`;
    });

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### 👥 Members in Voice (${vc.members.size})\n\n` +
        memberLines.join("\n")
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    const authorTag = ctx.user?.username || ctx.author?.username || ctx.member?.user?.username || ctx.user?.tag || ctx.author?.tag || "User";
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`*Page ${page + 1} of ${totalPages} • Requested by ${authorTag}*`)
    );

    const joinUrl = `https://discord.com/channels/${ctx.guild.id}/${vc.id}`;
    const joinBtn = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Click to Join ↗")
      .setURL(joinUrl);

    const row1 = new ActionRowBuilder().addComponents(joinBtn);
    container.addActionRowComponents(row1);

    if (totalPages > 1) {
      const prevBtn = new ButtonBuilder()
        .setCustomId("vcp_prev")
        .setLabel("◀ Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0);

      const nextBtn = new ButtonBuilder()
        .setCustomId("vcp_next")
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages - 1);

      const row2 = new ActionRowBuilder().addComponents(prevBtn, nextBtn);
      container.addActionRowComponents(row2);
    }

    return container;
  }

  const firstContainer = await buildPage(0);
  const replyMsg = await safeCtxReply(ctx, {
    components: [firstContainer],
    flags: MessageFlags.IsComponentsV2
  });

  if (totalPages > 1 && replyMsg) {
    const runnerId = ctx.user?.id || ctx.author?.id || ctx.member?.id;
    const filter = (i) => i.user.id === runnerId && (i.customId === "vcp_prev" || i.customId === "vcp_next");
    const collector = replyMsg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on("collect", async (i) => {
      if (i.customId === "vcp_prev") {
        currentPage = Math.max(0, currentPage - 1);
      } else if (i.customId === "vcp_next") {
        currentPage = Math.min(totalPages - 1, currentPage + 1);
      }
      const nextContainer = await buildPage(currentPage);
      await i.update({ components: [nextContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
    });
  }

  return true;
}

async function handleVoiceCheck(ctx) {
  const guild = ctx.guild;
  if (!guild) return;

  await guild.members.fetch().catch(() => { });
  const activeVCs = guild.channels.cache
    .filter(c => c.type === 2 && c.members.size > 0)
    .sort((a, b) => b.members.size - a.members.size);

  const container = new ContainerBuilder().setAccentColor(0x5865F2);
  const authorTag = ctx.user?.username || ctx.author?.username || ctx.member?.user?.username || ctx.user?.tag || ctx.author?.tag || "User";

  if (activeVCs.size === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## 🔊 Active Voice Channels — ${guild.name}\n\n_Tidak ada member yang sedang berada di Voice Channel saat ini._`)
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## 🔊 Active Voice Channels — ${guild.name}`)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    let totalVoiceMembers = 0;
    const vcBlocks = [];

    activeVCs.forEach(vc => {
      totalVoiceMembers += vc.members.size;
      const memberList = vc.members.map(m => {
        const joinTime = voiceSessions.get(m.id);
        const durationMs = joinTime ? Date.now() - joinTime : 0;
        const durationStr = durationMs > 0 ? ` (${formatVoiceDurationIndo(durationMs)})` : "";
        const isBot = m.user.bot ? " 🤖" : "";
        return `- <@${m.id}>${durationStr}${isBot}`;
      }).join("\n");

      vcBlocks.push(
        `📍 <#${vc.id}> \`[${vc.members.size}/${vc.userLimit || '∞'} User]\`\n${memberList}`
      );
    });

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Total **${totalVoiceMembers}** member sedang aktif di **${activeVCs.size}** voice channel.\n\n` +
        vcBlocks.join("\n\n")
      )
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`*Requested by ${authorTag}*`)
  );

  return safeCtxReply(ctx, {
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

async function handleServerStats(ctx) {
  const guild = ctx.guild;
  await guild.members.fetch().catch(() => { });
  const total = guild.memberCount;
  const humans = guild.members.cache.filter(m => !m.user.bot).size;
  const bots = guild.members.cache.filter(m => m.user.bot).size;
  let online = 0, idle = 0, dnd = 0, offline = 0;
  guild.members.cache.forEach(m => {
    const status = m.presence?.status;
    if (status === "online") online++;
    else if (status === "idle") idle++;
    else if (status === "dnd") dnd++;
    else offline++;
  });
  const totalRoles = guild.roles.cache.size;
  const totalChannels = guild.channels.cache.size;
  const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
  const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
  const categories = guild.channels.cache.filter(c => c.type === 4).size;
  const emojis = guild.emojis.cache.size;
  const stickers = guild.stickers.cache.size;
  const boostLevel = guild.premiumTier;
  const totalBoost = guild.premiumSubscriptionCount || 0;
  const owner = await guild.fetchOwner().catch(() => null);
  const ownerText = owner ? `<@${owner.id}> (${owner.user.tag})` : "Unknown";
  const createdAt = guild.createdAt.toLocaleDateString("id-ID", {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const embed = new EmbedBuilder()
    .setTitle(`📊 Server Statistics — ${guild.name}`)
    .setColor(EMBED_COLOR)
    .setThumbnail(guild.iconURL({ extension: "png", size: 256 }))
    .addFields([
      { name: "👥 Members", value: `- Total: **${total}**\n- Human: **${humans}**\n- Bot: **${bots}**`, inline: true },
      { name: "🟢 Presences", value: `- Online: **${online}**\n- Idle: **${idle}**\n- DND: **${dnd}**\n- Offline: **${offline}**`, inline: true },
      { name: "💬 Channels", value: `- Total: **${totalChannels}**\n- Text: **${textChannels}**\n- Voice: **${voiceChannels}**\n- Category: **${categories}**`, inline: true },
      { name: "✨ Features", value: `- Roles: **${totalRoles}**\n- Emojis: **${emojis}**\n- Stickers: **${stickers}**`, inline: true },
      { name: "🚀 Boost Status", value: `- Level: **${boostLevel}**\n- Boosts: **${totalBoost}**`, inline: true },
      { name: "👑 Ownership & Creation", value: `- Owner: ${ownerText}\n- Created At: **${createdAt}**`, inline: false }
    ])
    .setFooter({ text: BRAND_NAME })
    .setTimestamp();
  return safeCtxReply(ctx, { embeds: [embed] });
}

function startTimedRolesLoop(client) {
  setInterval(async () => {
    try {
      const now = Date.now();
      const expired = await TimedRole.find({ expire_at: { $lte: now } });
      for (const row of expired) {
        const guild = client.guilds.cache.get(row.guild_id);
        if (guild) {
          const member = await guild.members.fetch(row.user_id).catch(() => null);
          const role = guild.roles.cache.get(row.role_id);
          if (member && role) await member.roles.remove(role).catch(() => null);
        }
        await TimedRole.deleteOne({ _id: row._id });
      }
    } catch (e) {
      console.error("[TIMED ROLES] Error checking expired roles:", e);
    }
  }, 60 * 1000);
}

// ===================== STAFF TAGGING SYSTEM HELPERS & LOOP =====================

function getStaffTagDateKey() {
  const d = new Date();
  const wibOffset = 7 * 60 * 60 * 1000;
  const wibDate = new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + wibOffset);
  const yyyy = wibDate.getFullYear();
  const mm = String(wibDate.getMonth() + 1).padStart(2, "0");
  const dd = String(wibDate.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getWibTimeHHMM() {
  const d = new Date();
  const wibOffset = 7 * 60 * 60 * 1000;
  const wibDate = new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + wibOffset);
  const hh = String(wibDate.getHours()).padStart(2, "0");
  const mm = String(wibDate.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const DAY_NAMES_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

async function getOrGenerateDailyStaffSchedule(guild, forceReshuffle = false, targetDateKey = null) {
  const config = await StaffTagConfig.findOne({ guild_id: guild.id }).catch(() => null);
  if (!config || !config.staff_role_id) return null;

  const dateKey = targetDateKey || getStaffTagDateKey();

  if (!forceReshuffle) {
    const existing = await StaffTagSchedule.find({ guild_id: guild.id, date_key: dateKey }).lean().catch(() => []);
    if (existing.length >= 2) {
      return existing.sort((a, b) => a.slot - b.slot);
    }
  }

  // Fetch staff role members
  const staffRole = guild.roles.cache.get(config.staff_role_id);
  if (!staffRole) return null;

  await guild.members.fetch().catch(() => null);
  const exemptDocs = await StaffTagExempt.find({ guild_id: guild.id }).lean().catch(() => []);
  const exemptSet = new Set(exemptDocs.map((e) => e.user_id));

  const eligibleMembers = Array.from(staffRole.members.values())
    .filter((m) => !m.user.bot && !exemptSet.has(m.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (!eligibleMembers.length) return null;

  const count = eligibleMembers.length;
  let currIndex = config.roster_index || 0;

  const slot1User = eligibleMembers[currIndex % count].id;
  const slot2User = eligibleMembers[(currIndex + 1) % count].id;

  // Advance roster index by 2 for next schedule creation
  const nextIndex = (currIndex + 2) % count;
  if (!targetDateKey || targetDateKey === getStaffTagDateKey()) {
    config.roster_index = nextIndex;
    await config.save().catch(() => null);
  }

  if (forceReshuffle) {
    await StaffTagSchedule.deleteMany({ guild_id: guild.id, date_key: dateKey }).catch(() => null);
  }

  const curWibTime = getWibTimeHHMM();
  const isToday = dateKey === getStaffTagDateKey();
  const slot1Time = config.slot1_time || "09:00";
  const slot2Time = config.slot2_time || "19:00";

  const isSlot1Past = forceReshuffle && isToday && (curWibTime > slot1Time);
  const isSlot2Past = forceReshuffle && isToday && (curWibTime > slot2Time);

  const schedule1 = await StaffTagSchedule.findOneAndUpdate(
    { guild_id: guild.id, date_key: dateKey, slot: 1 },
    {
      $set: {
        assigned_user_id: slot1User,
        original_user_id: slot1User,
        status: "pending",
        notified_at: isSlot1Past ? Date.now() : null,
        completed_at: null,
        reminder_sent: false,
      },
    },
    { upsert: true, returnDocument: 'after' }
  ).lean();

  const schedule2 = await StaffTagSchedule.findOneAndUpdate(
    { guild_id: guild.id, date_key: dateKey, slot: 2 },
    {
      $set: {
        assigned_user_id: slot2User,
        original_user_id: slot2User,
        status: "pending",
        notified_at: isSlot2Past ? Date.now() : null,
        completed_at: null,
        reminder_sent: false,
      },
    },
    { upsert: true, returnDocument: 'after' }
  ).lean();

  return [schedule1, schedule2];
}

async function getWeeklyStaffScheduleOverview(guild) {
  const config = await StaffTagConfig.findOne({ guild_id: guild.id }).catch(() => null);
  if (!config || !config.staff_role_id) return null;

  const staffRole = guild.roles.cache.get(config.staff_role_id);
  if (!staffRole) return null;

  await guild.members.fetch().catch(() => null);
  const exemptDocs = await StaffTagExempt.find({ guild_id: guild.id }).lean().catch(() => []);
  const exemptSet = new Set(exemptDocs.map((e) => e.user_id));

  const eligibleMembers = Array.from(staffRole.members.values())
    .filter((m) => !m.user.bot && !exemptSet.has(m.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (!eligibleMembers.length) return null;

  const count = eligibleMembers.length;

  const today = new Date();
  const wibOffset = 7 * 60 * 60 * 1000;
  const wibToday = new Date(today.getTime() + (today.getTimezoneOffset() * 60000) + wibOffset);

  // Find Monday of current week
  const dayOfWeek = wibToday.getDay(); // 0 is Sun, 1 is Mon...
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(wibToday.getTime() - distanceToMonday * 24 * 60 * 60 * 1000);

  const weeklyList = [];
  let runningIndex = config.roster_index || 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * 24 * 60 * 60 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const dayName = DAY_NAMES_ID[d.getDay()];

    let scheds = await StaffTagSchedule.find({ guild_id: guild.id, date_key: dateKey }).lean().catch(() => []);
    if (scheds.length < 2) {
      const slot1User = eligibleMembers[runningIndex % count].id;
      const slot2User = eligibleMembers[(runningIndex + 1) % count].id;
      runningIndex = (runningIndex + 2) % count;

      const schedule1 = await StaffTagSchedule.findOneAndUpdate(
        { guild_id: guild.id, date_key: dateKey, slot: 1 },
        {
          $set: {
            assigned_user_id: slot1User,
            original_user_id: slot1User,
            status: "pending",
            notified_at: null,
            completed_at: null,
            reminder_sent: false,
          },
        },
        { upsert: true, returnDocument: 'after' }
      ).lean();

      const schedule2 = await StaffTagSchedule.findOneAndUpdate(
        { guild_id: guild.id, date_key: dateKey, slot: 2 },
        {
          $set: {
            assigned_user_id: slot2User,
            original_user_id: slot2User,
            status: "pending",
            notified_at: null,
            completed_at: null,
            reminder_sent: false,
          },
        },
        { upsert: true, returnDocument: 'after' }
      ).lean();

      scheds = [schedule1, schedule2];
    }

    weeklyList.push({
      dayName,
      dateKey,
      schedules: scheds.sort((a, b) => a.slot - b.slot),
    });
  }

  // Update runningIndex back to config
  config.roster_index = runningIndex;
  await config.save().catch(() => null);

  return weeklyList;
}

async function reshuffleAndGenerateFullWeeklySchedule(guild) {
  const config = await StaffTagConfig.findOne({ guild_id: guild.id }).catch(() => null);
  if (!config || !config.staff_role_id) return null;

  const staffRole = guild.roles.cache.get(config.staff_role_id);
  if (!staffRole) return null;

  await guild.members.fetch().catch(() => null);
  const exemptDocs = await StaffTagExempt.find({ guild_id: guild.id }).lean().catch(() => []);
  const exemptSet = new Set(exemptDocs.map((e) => e.user_id));

  const eligibleMembers = Array.from(staffRole.members.values())
    .filter((m) => !m.user.bot && !exemptSet.has(m.id));

  if (!eligibleMembers.length) return null;

  // 1. Shuffle all eligible staff members randomly
  const shuffledStaff = [...eligibleMembers].sort(() => Math.random() - 0.5);
  const count = shuffledStaff.length;

  const today = new Date();
  const wibOffset = 7 * 60 * 60 * 1000;
  const wibToday = new Date(today.getTime() + (today.getTimezoneOffset() * 60000) + wibOffset);

  // Find Monday of current week
  const dayOfWeek = wibToday.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(wibToday.getTime() - distanceToMonday * 24 * 60 * 60 * 1000);

  const weeklyList = [];
  let runningIndex = 0;
  const curWibTime = getWibTimeHHMM();
  const todayKey = getStaffTagDateKey();
  const slot1Time = config.slot1_time || "09:00";
  const slot2Time = config.slot2_time || "19:00";

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * 24 * 60 * 60 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const dayName = DAY_NAMES_ID[d.getDay()];

    // Clear existing schedule to force complete re-assignment for all staff
    await StaffTagSchedule.deleteMany({ guild_id: guild.id, date_key: dateKey }).catch(() => null);

    const slot1User = shuffledStaff[runningIndex % count].id;
    const slot2User = count > 1 ? shuffledStaff[(runningIndex + 1) % count].id : shuffledStaff[runningIndex % count].id;
    runningIndex = (runningIndex + 2) % count;

    // If slot time has already passed today or is past date, mark notified_at so it won't send retroactive notification
    const isPastDate = dateKey < todayKey;
    const isToday = dateKey === todayKey;
    const isSlot1Past = isPastDate || (isToday && curWibTime > slot1Time);
    const isSlot2Past = isPastDate || (isToday && curWibTime > slot2Time);

    const schedule1 = await StaffTagSchedule.findOneAndUpdate(
      { guild_id: guild.id, date_key: dateKey, slot: 1 },
      {
        $set: {
          assigned_user_id: slot1User,
          original_user_id: slot1User,
          status: "pending",
          notified_at: isSlot1Past ? Date.now() : null,
          completed_at: null,
          reminder_sent: false,
        },
      },
      { upsert: true, returnDocument: 'after' }
    ).lean();

    const schedule2 = await StaffTagSchedule.findOneAndUpdate(
      { guild_id: guild.id, date_key: dateKey, slot: 2 },
      {
        $set: {
          assigned_user_id: slot2User,
          original_user_id: slot2User,
          status: "pending",
          notified_at: isSlot2Past ? Date.now() : null,
          completed_at: null,
          reminder_sent: false,
        },
      },
      { upsert: true, returnDocument: 'after' }
    ).lean();

    weeklyList.push({
      dayName,
      dateKey,
      schedules: [schedule1, schedule2],
    });
  }

  // Update roster_index in config
  config.roster_index = runningIndex;
  await config.save().catch(() => null);

  return { weeklyList, totalStaff: count };
}

function buildStaffTagActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ctag_btn_done")
      .setLabel("Selesai")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("ctag_btn_busy")
      .setLabel("Sibuk")
      .setEmoji("⚠️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ctag_btn_takeover")
      .setLabel("Takeover")
      .setEmoji("⚡")
      .setStyle(ButtonStyle.Primary)
  );
}

function buildStaffTagTestActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ctag_testbtn_done")
      .setLabel("Selesai")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("ctag_testbtn_busy")
      .setLabel("Sibuk")
      .setEmoji("⚠️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ctag_testbtn_takeover")
      .setLabel("Takeover")
      .setEmoji("⚡")
      .setStyle(ButtonStyle.Primary)
  );
}

function getStaffSlotName(slot, config) {
  const timeStr = slot === 1 ? (config?.slot1_time || "09:00") : (config?.slot2_time || "19:00");
  return `Slot ${slot} (${timeStr} WIB)`;
}


function buildStaffTagCompletedContainer(assignedUserId, slotName, completedTime, isTakeover = false, originalUserId = null) {
  const infoLines = [
    `▸ **Petugas Active:** <@${assignedUserId}>`,
  ];

  if (isTakeover && originalUserId && originalUserId !== assignedUserId) {
    infoLines.push(`▸ **Petugas Asli:** <@${originalUserId}> *(Berhalangan)*`);
  }

  infoLines.push(
    `▸ **Jadwal Duty:** ${slotName}`,
    `▸ **Status:** \`[ ✅ SELESAI / DONE ]\``,
    `▸ **Waktu Konfirmasi:** <t:${Math.floor(completedTime / 1000)}:F>`
  );

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## 📌 Laporan Penugasan Staff"),
      new TextDisplayBuilder().setContent("Tugas tag member telah diverifikasi dan ditandai selesai. ✨")
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(infoLines.join("\n"))
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("Mystral Assistant • System Logging • Status Completed")
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  };
}


function buildStaffTagBusyContainer(assignedUserId, slotName, isTest = false, staffRoleId = null) {
  const staffMention = staffRoleId ? `<@&${staffRoleId}>` : "Halo Staff";

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(isTest ? "## ⚠️ [TEST] Status Kendala Staff" : "## ⚠️ Status Kendala Staff"),
      new TextDisplayBuilder().setContent(`📢 ${staffMention}, petugas <@${assignedUserId}> sedang **berhalangan / sibuk**! 📌`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `▸ **Petugas Giliran:** <@${assignedUserId}>`,
          `▸ **Jadwal Duty:** ${slotName}`,
          `▸ **Status:** \`[ ⚠️ BERHALANGAN / BUSY ]\``,
          "",
          "⚡ **Permintaan Pengganti:** Mohon staff lain yang bersedia untuk menekan tombol **Takeover** di bawah untuk menggantikan giliran ini! 💪",
        ].join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(isTest ? buildStaffTagTestActionRow() : buildStaffTagActionRow())
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(isTest ? "Mystral Assistant • Staff Duty System Test • Open Takeover" : "Mystral Assistant • Staff Duty System • Open Takeover")
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: staffRoleId ? { roles: [staffRoleId] } : { parse: [] },
  };
}


function buildStaffTagTakeoverContainer(newUserId, prevUserId, slotName, isTest = false) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(isTest ? "## ⚡ [TEST] Konfirmasi Takeover Tugas" : "## ⚡ Konfirmasi Takeover Tugas"),
      new TextDisplayBuilder().setContent("Tugas tag member telah berhasil diambil alih oleh staff pengganti. 💪")
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `▸ **Petugas Baru:** <@${newUserId}>`,
          `▸ **Petugas Semula:** <@${prevUserId}>`,
          `▸ **Jadwal Duty:** ${slotName}`,
          `▸ **Status:** \`[ ⏳ BERJALAN / PENDING ]\``,
          "",
          "📌 *Silakan selesaikan tag member dan tekan tombol **Selesai** jika sudah selesai.*",
        ].join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(isTest ? buildStaffTagTestActionRow() : buildStaffTagActionRow())
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(isTest ? "Mystral Assistant • Staff Duty System Test • Active Takeover" : "Mystral Assistant • Staff Duty System • Active Takeover")
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  };
}




function startStaffTagLoop(client) {
  setInterval(async () => {
    try {
      const configs = await StaffTagConfig.find({}).lean().catch(() => []);
      const currentTime = getWibTimeHHMM();
      const dateKey = getStaffTagDateKey();

      for (const cfg of configs) {
        if (!cfg.tag_channel_id || !cfg.staff_role_id) continue;
        const guild = client.guilds.cache.get(cfg.guild_id);
        if (!guild) continue;

        const channel = guild.channels.cache.get(cfg.tag_channel_id);
        if (!channel) continue;

        const schedules = await getOrGenerateDailyStaffSchedule(guild);
        if (!schedules || schedules.length < 2) continue;

        const timeoutMs = (cfg.timeout_minutes || 60) * 60 * 1000;
        const slot1Time = cfg.slot1_time || "09:00";
        const slot2Time = cfg.slot2_time || "19:00";

        const now = Date.now();

        for (const sched of schedules) {
          const isSlot1 = sched.slot === 1;
          const slotTime = isSlot1 ? slot1Time : slot2Time;
          const slotName = getStaffSlotName(sched.slot, cfg);

          // Trigger notification at or after slot time if not notified yet
          if (!sched.notified_at && currentTime >= slotTime && sched.status === "pending") {
            const container = new ContainerBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 📣 Duty Tag Member — ${slotName}`),
                new TextDisplayBuilder().setContent(
                  [
                    `Halo <@${sched.assigned_user_id}>, sekarang giliranmu untuk melakukan **Tag Member**! 📌`,
                    "",
                    "Selesaikan tugas atau tandai status giliranmu melalui tombol di bawah ini:",
                  ].join("\n")
                )
              )
              .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
              .addActionRowComponents(buildStaffTagActionRow())
              .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`Mystral • Staff Tagging System • <t:${Math.floor(now / 1000)}:R>`)
              );

            const sentMsg = await channel.send({
              components: [container],
              flags: MessageFlags.IsComponentsV2,
              allowedMentions: { users: [sched.assigned_user_id] },
            }).catch(() => null);

            await StaffTagSchedule.updateOne(
              { _id: sched._id },
              { $set: { notified_at: now, message_id: sentMsg?.id || null } }
            ).catch(() => null);

          }

          // Timeout Reminder check
          if (
            sched.notified_at &&
            sched.status === "pending" &&
            !sched.reminder_sent &&
            now - sched.notified_at >= timeoutMs
          ) {
            const staffRoleId = cfg.staff_role_id;
            const staffMention = staffRoleId ? `<@&${staffRoleId}>` : "Halo Staff";

            const container = new ContainerBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ⚠️ Timeout Reminder — Tag Member ${slotName}`),
                new TextDisplayBuilder().setContent(
                  [
                    `📢 ${staffMention}, petugas <@${sched.assigned_user_id}> belum menyelesaikan tugas tag member setelah **${cfg.timeout_minutes || 60} menit**! ⏰`,
                    "",
                    "> ⚡ **Staff lain yang bersedia mohon menekan tombol Takeover di bawah untuk mengambil alih tugas!**",
                  ].join("\n")
                )
              )
              .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
              .addActionRowComponents(buildStaffTagActionRow())
              .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`Mystral • Staff Tagging System • <t:${Math.floor(now / 1000)}:R>`)
              );

            await channel.send({
              components: [container],
              flags: MessageFlags.IsComponentsV2,
              allowedMentions: staffRoleId ? { roles: [staffRoleId] } : { parse: [] },
            }).catch(() => null);


            await StaffTagSchedule.updateOne(
              { _id: sched._id },
              { $set: { reminder_sent: true } }
            ).catch(() => null);
          }
        }
      }
    } catch (err) {
      console.error("[STAFF TAG LOOP FAIL]", err);
    }
  }, 2 * 60 * 1000);
}

// ===================== NEW STAFF ONBOARDING / WELCOME SYSTEM =====================
async function buildStaffWelcomeOnboardingPayload(guild, newStaffUsers, manualDivision = "", customHeader = null, customThumbnail = null) {
  try {
    const welcomeChannelId = (await MetaText.findOne({ key: `staff_welcome_channel_${guild.id}` }).lean().catch(() => null))?.value;
    const welcomeRoleId = (await MetaText.findOne({ key: `staff_welcome_role_${guild.id}` }).lean().catch(() => null))?.value;
    const savedThumbnail = (await MetaText.findOne({ key: `staff_welcome_thumbnail_${guild.id}` }).lean().catch(() => null))?.value;
    const savedHeader = (await MetaText.findOne({ key: `staff_welcome_header_${guild.id}` }).lean().catch(() => null))?.value;

    const thumbnailUrl = customThumbnail || savedThumbnail || guild.iconURL({ dynamic: true, size: 512 }) || "https://cdn.discordapp.com/embed/avatars/0.png";
    const headerMsgText = customHeader || savedHeader || "A new chapter begins. Please extend a warm welcome to our newest team member(s)! 👑";

    const profileTextBlocks = [];

    for (let i = 0; i < newStaffUsers.length; i++) {
      const u = newStaffUsers[i];
      const member = guild.members.cache.get(u.id) || await guild.members.fetch(u.id).catch(() => null);

      let divisionName = manualDivision ? manualDivision.trim() : "";
      if (!divisionName && member) {
        // Auto detect division from highest staff role (excluding @everyone & managed roles)
        const staffRoles = member.roles.cache
          .filter(r => r.id !== guild.id && !r.managed)
          .sort((a, b) => b.position - a.position);

        const firstRole = staffRoles.first();
        if (firstRole) divisionName = firstRole.name;
      }
      if (!divisionName) divisionName = "Staff Personnel";

      const joinedServerTs = member?.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
      const joinedServerStr = joinedServerTs ? `<t:${joinedServerTs}:D> (<t:${joinedServerTs}:R>)` : "*Unknown*";
      const joinedStaffTs = Math.floor(Date.now() / 1000);
      const joinedStaffStr = `<t:${joinedStaffTs}:D> (<t:${joinedStaffTs}:R>)`;
      const displayName = member ? member.displayName : u.username;

      profileTextBlocks.push(
        `📌 | **PERSONNEL PROFILE #${i + 1}**`,
        `• **User:** <@${u.id}> (\`@${u.username}\`)`,
        `• **Name:** \`${displayName}\``,
        `• **Division / Jabatan:** \`${divisionName}\``,
        `• **Account ID:** \`${u.id}\``,
        `• **Joined Server:** ${joinedServerStr}`,
        `• **Joined Staff:** ${joinedStaffStr}`
      );

      if (i < newStaffUsers.length - 1) {
        profileTextBlocks.push("");
      }
    }

    const nowTs = Math.floor(Date.now() / 1000);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## ✨ NEW STAFF ONBOARDING ✨"),
        new TextDisplayBuilder().setContent(
          [
            "### 👑 | Welcome to the Team!",
            `${headerMsgText}`,
            "",
            "───────────────────────────",
            "",
            ...profileTextBlocks,
          ].join("\n")
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Mystral • New Staff Onboarding • <t:${nowTs}:R>`)
      );

    const outerPingText = `📢 ${welcomeRoleId ? `<@&${welcomeRoleId}>` : "**@Community Staff**"}, please welcome our new personnel! ${newStaffUsers.map(u => `<@${u.id}>`).join(", ")}`;

    return {
      container,
      outerPingText,
      welcomeChannelId,
      welcomeRoleId,
      fallbackEmbed: new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("✦ . NEW STAFF ONBOARDING")
        .setThumbnail(thumbnailUrl)
        .setDescription(
          [
            "👑 | **Welcome to the Team!**",
            headerMsgText,
            "",
            "───────────────────────────",
            "",
            ...profileTextBlocks,
          ].join("\n")
        )
        .setFooter({ text: "Mystral • New Staff Onboarding" })
        .setTimestamp(),
    };
  } catch (err) {
    console.error("[STAFF WELCOME BUILD FAIL]", err);
    return null;
  }
}

async function handleStaffWelcomeCommand(message, args) {
  try {
    const isAdminUser = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageGuild) || hasPerm(message.member, PermissionsBitField.Flags.ManageRoles);
    if (!isAdminUser) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Permission Denied").setDescription("Kamu membutuhkan izin `Manage Guild` / `Manage Roles` untuk menggunakan perintah welcome staff.")],
        allowedMentions: { repliedUser: false },
      });
    }

    const mentionedUsers = [...message.mentions.users.values()];
    if (!mentionedUsers.length) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("❌ Format Command Tidak Valid")
          .setDescription("Sebutkan minimal 1 mention user staff baru.\n\n**Contoh Penggunaan:**\n`cstaff welcome @User1` *(Auto detect divisi)*\n`cstaff welcome @User1 @User2 Sentinel Division` *(Custom divisi)*\n`cwelcomestaff @User1` *(Alias)*")
        ],
        allowedMentions: { repliedUser: false },
      });
    }

    // Extract non-mention string as manual division
    const manualDivision = args.filter(arg => !arg.startsWith("<@") && !arg.startsWith("<#") && !arg.startsWith("<&")).join(" ").trim();

    const payloadData = await buildStaffWelcomeOnboardingPayload(message.guild, mentionedUsers, manualDivision);
    if (!payloadData) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Gagal Membuat Kartu").setDescription("Terjadi kesalahan saat memuat kartu onboarding staff baru.")],
        allowedMentions: { repliedUser: false },
      });
    }

    // Determine target channel
    let targetChannel = message.channel;
    if (payloadData.welcomeChannelId) {
      const ch = message.guild.channels.cache.get(payloadData.welcomeChannelId) || await message.guild.channels.fetch(payloadData.welcomeChannelId).catch(() => null);
      if (ch && ch.isTextBased()) {
        targetChannel = ch;
      }
    }

    const allowedUserIds = mentionedUsers.map(u => u.id);
    const allowedRoleIds = payloadData.welcomeRoleId ? [payloadData.welcomeRoleId] : [];

    const sentMsg = await targetChannel.send({
      content: payloadData.outerPingText,
      components: [payloadData.container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: allowedUserIds, roles: allowedRoleIds },
    }).catch(() => null);

    if (!sentMsg) {
      await targetChannel.send({
        content: payloadData.outerPingText,
        embeds: [payloadData.fallbackEmbed],
        allowedMentions: { users: allowedUserIds, roles: allowedRoleIds },
      }).catch(err => console.error("[STAFF WELCOME SEND ERR]", err));
    }

    if (targetChannel.id !== message.channel.id) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Onboarding Staff Terkirim").setDescription(`Kartu onboarding untuk ${mentionedUsers.map(u => `<@${u.id}>`).join(", ")} telah dikirim ke channel <#${targetChannel.id}>.`)],
        allowedMentions: { parse: [] },
      });
    }
  } catch (err) {
    console.error("[STAFF WELCOME CMD FAIL]", err);
  }
}

async function handleStaffWelcomeSetupCommand(message, args) {
  try {
    const isAdminUser = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageGuild) || hasPerm(message.member, PermissionsBitField.Flags.ManageRoles);
    if (!isAdminUser) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Permission Denied").setDescription("Kamu membutuhkan izin `Manage Guild` / `Manage Roles` untuk mengatur konfigurasi welcome staff.")],
        allowedMentions: { repliedUser: false },
      });
    }

    const channel = message.mentions.channels.first();
    const role = message.mentions.roles.first();
    const urlArg = args.find(a => a.startsWith("http://") || a.startsWith("https://"));

    let updatedLines = [];

    if (channel) {
      await MetaText.updateOne({ key: `staff_welcome_channel_${message.guild.id}` }, { $set: { value: channel.id } }, { upsert: true }).catch(() => null);
      updatedLines.push(`• **Channel Onboarding:** <#${channel.id}>`);
    }

    if (role) {
      await MetaText.updateOne({ key: `staff_welcome_role_${message.guild.id}` }, { $set: { value: role.id } }, { upsert: true }).catch(() => null);
      updatedLines.push(`• **Role Staff Mention:** <@&${role.id}>`);
    }

    if (urlArg) {
      await MetaText.updateOne({ key: `staff_welcome_thumbnail_${message.guild.id}` }, { $set: { value: urlArg } }, { upsert: true }).catch(() => null);
      updatedLines.push(`• **Custom Thumbnail URL:** \`${urlArg}\``);
    }

    const savedChannelId = (await MetaText.findOne({ key: `staff_welcome_channel_${message.guild.id}` }).lean().catch(() => null))?.value;
    const savedRoleId = (await MetaText.findOne({ key: `staff_welcome_role_${message.guild.id}` }).lean().catch(() => null))?.value;
    const savedThumbnail = (await MetaText.findOne({ key: `staff_welcome_thumbnail_${message.guild.id}` }).lean().catch(() => null))?.value;

    const isConfigured = !!(savedChannelId && savedRoleId);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## 👑 Setup & Konfigurasi Welcome Staff Baru"),
        new TextDisplayBuilder().setContent(
          [
            ...(updatedLines.length ? ["**<a:Fm_check:1523182720493289666> Berhasil Diperbarui:**", updatedLines.join("\n"), ""] : []),
            "**📌 Status Konfigurasi Saat Ini:**",
            `▸ **Status Sistem:** ${isConfigured ? "<a:971828statusonline:1521081779455397888> **[ READY / SIAP ]**" : "<a:460240statusoffline:1521082558664806501> **[ UNCONFIGURED / BELUM LENGKAP ]**"}`,
            `▸ **Channel Onboarding:** ${savedChannelId ? `<#${savedChannelId}>` : "*Belum di-set (Fallback ke channel pengirim)*"}`,
            `▸ **Role Staff Mention:** ${savedRoleId ? `<@&${savedRoleId}>` : "*Belum di-set (Fallback ke @Community Staff)*"}`,
            `▸ **Thumbnail URL:** ${savedThumbnail ? `[Preview Image](${savedThumbnail})` : "*Default Server Icon*"}`,
            "",
            "**💡 Cara Setup 1-Baris Cepat:**",
            "`cstaff welcomesetup #channel-welcome @CommunityStaff [thumbnailUrl]`",
            "",
            "**Perintah Penggunaan:**",
            "• `cstaff welcome @User` — Sambut 1 staff baru (auto detect divisi)",
            "• `cstaff welcome @User1 @User2 Event Division` — Sambut beberapa staff baru dengan nama divisi kustom",
            "• `cwelcomestaff @User` — Alias perintah welcome staff",
          ].join("\n")
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Mystral • New Staff Onboarding Setup Wizard`)
      );

    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.error("[STAFF WELCOME SETUP FAIL]", err);
  }
}


async function handleDiscordManagementAssistant(ctx, cleanInput, cmd, args) {
  // Prefix sticky commands
  if (cmd === "sticky" || cmd === "stset" || cmd === "strem" || cmd === "stickyset" || cmd === "stickyremove" || cmd === "stedit" || cmd === "stickyedit" || cmd === "stlist" || cmd === "stickylist") {
    const member = ctx.member;
    if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      const embed = new EmbedBuilder().setTitle("❌ Permission Denied").setColor(0xe74c3c).setDescription("You need `Manage Messages` permission to use sticky commands.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    const sub = args[0]?.toLowerCase();
    if (cmd === "stset" || sub === "set") {
      const content = (cmd === "stset" ? args.join(" ") : args.slice(1).join(" ")).trim();
      if (!content) {
        const embed = new EmbedBuilder().setTitle("❌ Format Error").setColor(0xe74c3c).setDescription(`Usage: \`${PREFIX} sticky set <content>\` or \`${PREFIX} stset <content>\``).setTimestamp();
        await safeCtxReply(ctx, { embeds: [embed] });
        return true;
      }

      await safeRun(
        "INSERT INTO sticky_messages (channel_id, content, last_message_id) VALUES (?, ?, NULL) ON CONFLICT(channel_id) DO UPDATE SET content=excluded.content",
        [ctx.channel.id, content]
      );

      const cache = stickyCache.get(ctx.channel.id);
      if (cache?.lastMessageId) {
        const oldMsg = await ctx.channel.messages.fetch(cache.lastMessageId).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => null);
      }

      const sent = await ctx.channel.send({ content }).catch(() => null);
      const lastMessageId = sent ? sent.id : null;
      if (sent) {
        await safeRun("UPDATE sticky_messages SET last_message_id=? WHERE channel_id=?", [lastMessageId, ctx.channel.id]);
      }

      stickyCache.set(ctx.channel.id, { content, lastMessageId });

      const embed = new EmbedBuilder().setTitle("✅ Sticky Message Set").setColor(0x2ecc71).setDescription(`Successfully set sticky message for <#${ctx.channel.id}>.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    if (cmd === "stedit" || sub === "edit" || cmd === "stickyedit") {
      const content = (cmd === "stedit" ? args.join(" ") : args.slice(1).join(" ")).trim();
      if (!content) {
        const embed = new EmbedBuilder().setTitle("❌ Format Error").setColor(0xe74c3c).setDescription(`Usage: \`${PREFIX} sticky edit <content>\` or \`${PREFIX} stedit <content>\``).setTimestamp();
        await safeCtxReply(ctx, { embeds: [embed] });
        return true;
      }

      const exists = stickyCache.has(ctx.channel.id);
      if (!exists) {
        const embed = new EmbedBuilder().setTitle("❌ Error").setColor(0xe74c3c).setDescription(`No sticky message is currently set in this channel. Use \`${PREFIX} sticky set\` first.`).setTimestamp();
        await safeCtxReply(ctx, { embeds: [embed] });
        return true;
      }

      await safeRun(
        "UPDATE sticky_messages SET content=? WHERE channel_id=?",
        [content, ctx.channel.id]
      );

      const cache = stickyCache.get(ctx.channel.id);
      if (cache?.lastMessageId) {
        const oldMsg = await ctx.channel.messages.fetch(cache.lastMessageId).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => null);
      }

      const sent = await ctx.channel.send({ content }).catch(() => null);
      const lastMessageId = sent ? sent.id : null;
      if (sent) {
        await safeRun("UPDATE sticky_messages SET last_message_id=? WHERE channel_id=?", [lastMessageId, ctx.channel.id]);
      }

      stickyCache.set(ctx.channel.id, { content, lastMessageId });

      const embed = new EmbedBuilder().setTitle("✅ Sticky Message Edited").setColor(0x2ecc71).setDescription(`Successfully updated sticky message for <#${ctx.channel.id}>.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    if (cmd === "strem" || sub === "remove" || sub === "delete" || cmd === "stickyremove") {
      const cache = stickyCache.get(ctx.channel.id);
      if (cache?.lastMessageId) {
        const oldMsg = await ctx.channel.messages.fetch(cache.lastMessageId).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => null);
      }

      await safeRun("DELETE FROM sticky_messages WHERE channel_id=?", [ctx.channel.id]);
      stickyCache.delete(ctx.channel.id);

      const embed = new EmbedBuilder().setTitle("✅ Sticky Message Removed").setColor(0x2ecc71).setDescription(`Successfully removed sticky message from <#${ctx.channel.id}>.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    if (cmd === "stlist" || sub === "list" || cmd === "stickylist") {
      const stickies = await safeAll("SELECT * FROM sticky_messages").catch(() => []);
      const guildChannels = await ctx.guild.channels.fetch().catch(() => null);
      if (!guildChannels) {
        const embed = new EmbedBuilder().setTitle("❌ Error").setColor(0xe74c3c).setDescription("Failed to fetch channels list.").setTimestamp();
        await safeCtxReply(ctx, { embeds: [embed] });
        return true;
      }

      const activeInGuild = [];
      for (const row of stickies) {
        if (guildChannels.has(row.channel_id)) {
          const snippet = row.content.length > 50 ? row.content.slice(0, 50) + "..." : row.content;
          activeInGuild.push(`• <#${row.channel_id}>: \`${snippet}\``);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle("📌 Active Sticky Messages")
        .setColor(EMBED_COLOR)
        .setDescription(activeInGuild.length > 0 ? activeInGuild.join("\n") : "No active sticky messages in this server.")
        .setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    const embed = new EmbedBuilder().setTitle("❌ Format Error").setColor(0xe74c3c).setDescription(`Usage:\n• \`${PREFIX} sticky set <content>\`\n• \`${PREFIX} sticky edit <content>\`\n• \`${PREFIX} sticky remove\`\n• \`${PREFIX} sticky list\``).setTimestamp();
    await safeCtxReply(ctx, { embeds: [embed] });
    return true;
  }

  if (cmd === "media") {
    const member = ctx.member;
    if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      const embed = new EmbedBuilder().setTitle("❌ Permission Denied").setColor(0xe74c3c).setDescription("You need `Manage Messages` permission to use media settings.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    const sub = args[0]?.toLowerCase();
    const settings = await getOrInitMediaSettings(ctx.guild.id);

    if (sub === "enable") {
      const plat = args[1]?.toLowerCase();
      if (plat) {
        // Toggle specific platform (e.g. c media enable tiktok)
        if (!settings.platforms) settings.platforms = {};
        settings.platforms[plat] = true;
        await saveMediaSettings(ctx.guild.id, settings);
        const embed = new EmbedBuilder().setTitle("✅ Platform Enabled").setColor(0x2ecc71).setDescription(`Platform **${plat.toUpperCase()}** is now **enabled**.`).setTimestamp();
        await safeCtxReply(ctx, { embeds: [embed] });
        return true;
      }
      settings.enabled = 1;
      await saveMediaSettings(ctx.guild.id, settings);
      const embed = new EmbedBuilder().setTitle("✅ Media Embed Enabled").setColor(0x2ecc71).setDescription("Universal Media Embed features are now **enabled** globally in this server.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    if (sub === "disable") {
      const plat = args[1]?.toLowerCase();
      if (plat) {
        // Toggle specific platform (e.g. c media disable twitter)
        if (!settings.platforms) settings.platforms = {};
        settings.platforms[plat] = false;
        await saveMediaSettings(ctx.guild.id, settings);
        const embed = new EmbedBuilder().setTitle("✅ Platform Disabled").setColor(0xe74c3c).setDescription(`Platform **${plat.toUpperCase()}** is now **disabled**.`).setTimestamp();
        await safeCtxReply(ctx, { embeds: [embed] });
        return true;
      }
      settings.enabled = 0;
      await saveMediaSettings(ctx.guild.id, settings);
      const embed = new EmbedBuilder().setTitle("✅ Media Embed Disabled").setColor(0xe74c3c).setDescription("Universal Media Embed features are now **disabled** globally in this server.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    if (sub === "delete-original") {
      const valStr = args[1]?.toLowerCase();
      if (valStr !== "true" && valStr !== "false") {
        const embed = new EmbedBuilder().setTitle("❌ Format Error").setColor(0xe74c3c).setDescription(`Usage: \`${PREFIX} media delete-original <true/false>\``).setTimestamp();
        await safeCtxReply(ctx, { embeds: [embed] });
        return true;
      }
      const val = valStr === "true";
      settings.deleteOriginal = val ? 1 : 0;
      await saveMediaSettings(ctx.guild.id, settings);
      const embed = new EmbedBuilder()
        .setTitle("✅ Setting Updated")
        .setColor(0x2ecc71)
        .setDescription(`Auto-delete of original links is now set to **${val ? "enabled (true)" : "disabled (false)"}**.`)
        .setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    if (sub === "quality") {
      const pref = args[1]?.toLowerCase();
      if (pref !== "auto" && pref !== "720p" && pref !== "1080p") {
        const embed = new EmbedBuilder().setTitle("❌ Format Error").setColor(0xe74c3c).setDescription(`Usage: \`${PREFIX} media quality <auto/720p/1080p>\``).setTimestamp();
        await safeCtxReply(ctx, { embeds: [embed] });
        return true;
      }
      settings.quality = pref;
      await saveMediaSettings(ctx.guild.id, settings);
      const embed = new EmbedBuilder()
        .setTitle("✅ Quality Set")
        .setColor(0x2ecc71)
        .setDescription(`Video quality preference set to **${pref}**.`)
        .setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    if (sub === "status") {
      const platList = [
        "tiktok", "instagram", "twitter", "reddit", "threads",
        "youtube", "facebook", "twitch", "kick", "bilibili",
        "pinterest", "bluesky", "imgur", "streamable", "vimeo"
      ];
      const statuses = platList.map(p => {
        const isPlatEnabled = settings.platforms && settings.platforms[p] !== undefined ? settings.platforms[p] : true;
        return `• **${p.toUpperCase()}**: ${isPlatEnabled ? "🟢 Enabled" : "🔴 Disabled"}`;
      }).join("\n");

      const embed = new EmbedBuilder()
        .setTitle("⚙️ Universal Media Embed Settings")
        .setColor(EMBED_COLOR)
        .addFields(
          { name: "Global Status", value: settings.enabled ? "🟢 Enabled" : "🔴 Disabled", inline: true },
          { name: "Auto-Delete Original", value: settings.deleteOriginal ? "🟢 True" : "🔴 False", inline: true },
          { name: "Quality Preference", value: `\`${settings.quality}\``, inline: true },
          { name: "Supported Platforms Status", value: statuses }
        )
        .setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    const embed = new EmbedBuilder()
      .setTitle("❌ Format Error")
      .setColor(0xe74c3c)
      .setDescription(`Usage:\n• \`${PREFIX} media enable [platform]\`\n• \`${PREFIX} media disable [platform]\`\n• \`${PREFIX} media delete-original <true/false>\`\n• \`${PREFIX} media quality <auto/720p/1080p>\`\n• \`${PREFIX} media status\``)
      .setTimestamp();
    await safeCtxReply(ctx, { embeds: [embed] });
    return true;
  }

  let isAddRole = false;
  let isRemoveRole = false;
  let roleQuery = "";
  let userQuery = "";

  const authorId = ctx.author ? ctx.author.id : ctx.user.id;
  const authorTag = ctx.author ? ctx.author.tag : ctx.user.tag;

  let durationDays = null;
  const durationMatch = cleanInput.match(/(?:for\s+)?(\d+)\s*(?:days?|hari|h)$/i);
  let cleanInputWithoutDuration = cleanInput;
  if (durationMatch) {
    durationDays = parseInt(durationMatch[1]);
    cleanInputWithoutDuration = cleanInput.slice(0, durationMatch.index).trim();
  }

  let m = cleanInputWithoutDuration.match(/^add\s+(.+?)\s+to\s+(.+)$/i);
  if (m) { isAddRole = true; roleQuery = m[1]; userQuery = m[2]; }

  if (!isAddRole) {
    m = cleanInputWithoutDuration.match(/^kasih\s+role\s+(.+?)\s+ke\s+(.+)$/i);
    if (m) { isAddRole = true; roleQuery = m[1]; userQuery = m[2]; }
  }
  if (!isAddRole) {
    m = cleanInputWithoutDuration.match(/^give\s+(.+?)\s+role\s+to\s+(.+)$/i);
    if (m) { isAddRole = true; roleQuery = m[1]; userQuery = m[2]; }
  }
  if (!isAddRole) {
    m = cleanInputWithoutDuration.match(/^give\s+role\s+(.+?)\s+to\s+(.+)$/i);
    if (m) { isAddRole = true; roleQuery = m[1]; userQuery = m[2]; }
  }

  if (!isAddRole) {
    m = cleanInputWithoutDuration.match(/^remove\s+(.+?)\s+from\s+(.+)$/i);
    if (m) { isRemoveRole = true; roleQuery = m[1]; userQuery = m[2]; }
  }
  if (!isAddRole && !isRemoveRole) {
    m = cleanInputWithoutDuration.match(/^cabut\s+(.+?)\s+dari\s+(.+)$/i);
    if (m) { isRemoveRole = true; roleQuery = m[1]; userQuery = m[2]; }
  }
  if (!isAddRole && !isRemoveRole) {
    m = cleanInputWithoutDuration.match(/^delete\s+role\s+(.+?)\s+(.+)$/i);
    if (m) { isRemoveRole = true; roleQuery = m[1]; userQuery = m[2]; }
  }

  if (isAddRole || isRemoveRole) {
    const role = findRoleFuzzy(ctx.guild, roleQuery);
    if (!role) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Role **${roleQuery}** tidak ditemukan.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const isAll = /^(everyone|semua member|all users|all members|seluruh member|all user|semua)$/i.test(userQuery.trim());
    if (isAll) {
      await ctx.guild.members.fetch().catch(() => { });
      const targets = isAddRole
        ? ctx.guild.members.cache.filter(m => !m.roles.cache.has(role.id))
        : role.members;

      if (targets.size === 0) {
        const embed = new EmbedBuilder()
          .setTitle("✅ Informasi")
          .setColor(0x3498db)
          .setDescription(isAddRole
            ? `Seluruh member server sudah memiliki role **${role.name}**.`
            : `Tidak ada member server yang memiliki role **${role.name}**.`
          )
          .setTimestamp();
        await safeCtxReply(ctx, { embeds: [embed] });
        return true;
      }

      const actionText = isAddRole ? `memberikan role **${role.name}** kepada` : `menghapus role **${role.name}** dari`;
      const targetText = isAddRole ? `member yang belum memilikinya` : `member yang memilikinya`;

      const embedConfirm = new EmbedBuilder()
        .setTitle("⚠️ Konfirmasi Tindakan")
        .setColor(0xffaa00)
        .setDescription(`Anda akan ${actionText} **${targets.size}** ${targetText}.`)
        .addFields({ name: "Aksi Konfirmasi", value: "Ketik `confirm` untuk melanjutkan." })
        .setFooter({ text: "Expired dalam 60 detik" })
        .setTimestamp();

      const action = async () => {
        const statusEmbed = new EmbedBuilder()
          .setTitle("⚙️ Memproses Perubahan Role")
          .setColor(0x3498db)
          .setDescription(`Sedang memproses perubahan role **${role.name}** untuk seluruh target...`)
          .setTimestamp();
        const statusMsg = await safeCtxReply(ctx, { embeds: [statusEmbed] });
        let success = 0;
        let failed = 0;
        for (const [id, m] of targets) {
          try {
            if (isAddRole) await m.roles.add(role);
            else await m.roles.remove(role);
            success++;
          } catch { failed++; }
        }
        const embedResult = new EmbedBuilder()
          .setTitle("✅ Proses Selesai")
          .setColor(0x2ecc71)
          .setDescription(`Berhasil memproses **${success}** member.\nGagal/Lewat: **${failed}** member.`)
          .setTimestamp();
        await statusMsg.edit({ content: null, embeds: [embedResult] });
      };
      pendingConfirmations.set(authorId, { expires: Date.now() + 60000, action, message: { embeds: [embedConfirm] } });
      await safeCtxReply(ctx, { embeds: [embedConfirm] });
      return true;
    } else {
      const userQueries = userQuery.split(',').map(u => u.trim()).filter(Boolean);
      if (userQueries.length === 1) {
        const member = await findMemberFuzzy(ctx.guild, userQueries[0]);
        if (!member) {
          const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Member **${userQueries[0]}** tidak ditemukan.`).setTimestamp();
          await safeCtxReply(ctx, { embeds: [embed] });
          return true;
        }
        const permCheck = validateModAction(ctx, member, PermissionsBitField.Flags.ManageRoles, PermissionsBitField.Flags.ManageRoles);
        if (!permCheck.ok) {
          const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription(permCheck.error).setTimestamp();
          await safeCtxReply(ctx, { embeds: [embed] });
          return true;
        }
        if (isAddRole) {
          await member.roles.add(role);
          if (durationDays) {
            const expireAt = Date.now() + durationDays * 86400 * 1000;
            await TimedRole.updateOne(
              { guild_id: String(ctx.guild.id), user_id: String(member.id), role_id: String(role.id) },
              { $set: { expire_at: expireAt } },
              { upsert: true }
            );
            const embed = new EmbedBuilder()
              .setTitle("✅ Peran Ditambahkan")
              .setColor(0x2ecc71)
              .setDescription(`Berhasil menambahkan role **${role.name}** ke <@${member.id}> selama **${durationDays} hari**.`)
              .setTimestamp();
            await safeCtxReply(ctx, { embeds: [embed] });
          } else {
            const embed = new EmbedBuilder()
              .setTitle("✅ Peran Ditambahkan")
              .setColor(0x2ecc71)
              .setDescription(`Berhasil menambahkan role **${role.name}** ke <@${member.id}>.`)
              .setTimestamp();
            await safeCtxReply(ctx, { embeds: [embed] });
          }
        } else {
          await member.roles.remove(role);
          await TimedRole.deleteMany({ guild_id: String(ctx.guild.id), user_id: String(member.id), role_id: String(role.id) });
          const embed = new EmbedBuilder()
            .setTitle("✅ Peran Dihapus")
            .setColor(0x2ecc71)
            .setDescription(`Berhasil menghapus role **${role.name}** dari <@${member.id}>.`)
            .setTimestamp();
          await safeCtxReply(ctx, { embeds: [embed] });
        }
      } else {
        const statusEmbed = new EmbedBuilder()
          .setTitle("⚙️ Memproses Perubahan Role")
          .setColor(0x3498db)
          .setDescription(`Sedang memproses perubahan role untuk **${userQueries.length}** member...`)
          .setTimestamp();
        const statusMsg = await safeCtxReply(ctx, { embeds: [statusEmbed] });
        let success = [];
        let failed = [];

        for (const uQuery of userQueries) {
          const member = await findMemberFuzzy(ctx.guild, uQuery);
          if (!member) {
            failed.push(`\`${uQuery}\` (Tidak ditemukan)`);
            continue;
          }
          const permCheck = validateModAction(ctx, member, PermissionsBitField.Flags.ManageRoles, PermissionsBitField.Flags.ManageRoles);
          if (!permCheck.ok) {
            failed.push(`<@${member.id}> (Izin tidak cukup)`);
            continue;
          }
          try {
            if (isAddRole) {
              await member.roles.add(role);
              if (durationDays) {
                const expireAt = Date.now() + durationDays * 86400 * 1000;
                await TimedRole.updateOne(
                  { guild_id: String(ctx.guild.id), user_id: String(member.id), role_id: String(role.id) },
                  { $set: { expire_at: expireAt } },
                  { upsert: true }
                );
              }
            } else {
              await member.roles.remove(role);
              await TimedRole.deleteMany({ guild_id: String(ctx.guild.id), user_id: String(member.id), role_id: String(role.id) });
            }
            success.push(`<@${member.id}>`);
          } catch {
            failed.push(`<@${member.id}> (Gagal mengeksekusi)`);
          }
        }

        const embedResult = new EmbedBuilder()
          .setTitle("✅ Proses Selesai")
          .setColor(0x2ecc71)
          .setDescription([
            `**Peran:** **${role.name}**`,
            `**Aksi:** ${isAddRole ? 'Penambahan' : 'Penghapusan'}`,
            durationDays ? `**Durasi:** ${durationDays} hari` : null,
            "",
            success.length ? `🟢 **Berhasil (${success.length}):**\n${success.join(', ')}` : null,
            failed.length ? `🔴 **Gagal (${failed.length}):**\n${failed.join('\n')}` : null,
          ].filter(Boolean).join('\n'))
          .setTimestamp();
        await statusMsg.edit({ content: null, embeds: [embedResult] });
      }
      return true;
    }
  }

  let lookupRoleQuery = null;
  const lowerClean = cleanInput.toLowerCase();
  if (lowerClean.startsWith("siapa aja ")) lookupRoleQuery = cleanInput.slice(10).trim();
  else if (lowerClean.startsWith("who ")) lookupRoleQuery = cleanInput.slice(4).trim();
  else if (lowerClean.startsWith("list ") && !lowerClean.endsWith("autoresponse") && !lowerClean.endsWith("ar")) lookupRoleQuery = cleanInput.slice(5).trim();
  else if (lowerClean.startsWith("siapa yang punya role ")) lookupRoleQuery = cleanInput.slice(22).trim();
  else if (lowerClean.startsWith("member ")) lookupRoleQuery = cleanInput.slice(7).trim();
  else if (lowerClean.endsWith(" members")) lookupRoleQuery = cleanInput.slice(0, -8).trim();
  else if (lowerClean.startsWith("show ")) lookupRoleQuery = cleanInput.slice(5).trim();

  if (lookupRoleQuery) {
    const role = findRoleFuzzy(ctx.guild, lookupRoleQuery);
    if (role) {
      await ctx.guild.members.fetch().catch(() => { });
      const membersWithRole = role.members;
      if (membersWithRole.size === 0) {
        const embed = new EmbedBuilder().setTitle(`👤 Role Lookup: ${role.name}`).setColor(EMBED_COLOR).setDescription(`Tidak ada member yang memiliki role **${role.name}**.`).setTimestamp();
        await safeCtxReply(ctx, { embeds: [embed] });
        return true;
      }
      const lines = Array.from(membersWithRole.values()).map(m => {
        const joinedDate = m.joinedAt ? m.joinedAt.toLocaleDateString("id-ID") : "Unknown";
        return `- <@${m.id}> (\`${m.user.username}\`) - ID: \`${m.id}\` (Join: ${joinedDate})`;
      });
      const chunks = [];
      let currentChunk = "";
      for (const line of lines) {
        if ((currentChunk + line).length > 1900) {
          chunks.push(currentChunk);
          currentChunk = "";
        }
        currentChunk += line + "\n";
      }
      if (currentChunk) chunks.push(currentChunk);
      const buildEmbed = (index) => {
        return new EmbedBuilder()
          .setAuthor({ name: "👥 Role Member Directory", iconURL: ctx.guild.iconURL({ extension: "png" }) || undefined })
          .setTitle(role.name)
          .setDescription([
            `**Role Mention:** <@&${role.id}>`,
            `**Warna Hex:** \`${role.hexColor}\` • **Total:** **${membersWithRole.size}** member`,
            "",
            chunks[index]
          ].join("\n"))
          .setColor(role.color || 0x5865F2)
          .setFooter({ text: `Halaman ${index + 1}/${chunks.length} • Requested by ${authorTag}`, iconURL: ctx.member?.user?.displayAvatarURL({ extension: "png" }) || undefined })
          .setTimestamp();
      };

      if (chunks.length === 1) {
        await safeCtxReply(ctx, { embeds: [buildEmbed(0)] });
        return true;
      }

      const buildRow = (index, disabled = false) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("⬅")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || index <= 0),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("➡")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || index >= chunks.length - 1)
        );
      };

      const msg = await safeCtxReply(ctx, {
        embeds: [buildEmbed(0)],
        components: [buildRow(0)]
      });

      if (!msg) return true;

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === authorId,
        time: 120000
      });

      let currentPage = 0;
      collector.on("collect", async i => {
        if (i.customId === "prev") {
          currentPage--;
        } else if (i.customId === "next") {
          currentPage++;
        }
        await i.update({
          embeds: [buildEmbed(currentPage)],
          components: [buildRow(currentPage)]
        }).catch(() => { });
      });

      collector.on("end", () => {
        msg.edit({
          components: [buildRow(currentPage, true)]
        }).catch(() => { });
      });
      return true;
    }
  }

  if (/^(voice check|cek voice|siapa di voice|voice status|vc|vcc)$/i.test(cleanInput)) {
    await handleVoiceCheck(ctx);
    return true;
  }

  let userVoiceQuery = null;
  if (lowerClean.startsWith("vc ")) userVoiceQuery = cleanInput.slice(3).trim();
  else if (lowerClean.startsWith("cv ")) userVoiceQuery = cleanInput.slice(3).trim();
  else if (lowerClean.startsWith("room ")) userVoiceQuery = cleanInput.slice(5).trim();
  else if (lowerClean.startsWith("voice ")) userVoiceQuery = cleanInput.slice(6).trim();
  else if (lowerClean.startsWith("cek voice ")) userVoiceQuery = cleanInput.slice(10).trim();
  else if (["vc", "cv", "find", "voice", "cvc", "ccv", "cfind", "croom", "room"].includes(cmd) && args.length > 0) {
    userVoiceQuery = args.join(" ");
  }

  if (userVoiceQuery) {
    const member = await findMemberFuzzy(ctx.guild, userVoiceQuery);
    if (!member) {
      const container = new ContainerBuilder().setAccentColor(0xe74c3c);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## ❌ State Lookup\n\nMember **${userVoiceQuery}** tidak ditemukan di server ini.`)
      );
      await safeCtxReply(ctx, { components: [container], flags: MessageFlags.IsComponentsV2 });
      return true;
    }

    await handleSingleUserVoiceCheck(ctx, member);
    return true;
  }

  if (/^(server stats|statistik server|ss|stats)$/i.test(cleanInput)) {
    await handleServerStats(ctx);
    return true;
  }

  // Helper to extract ID argument from args (numeric, hex MongoDB ID, etc.)
  const getArIdArg = (argsList, parsedObj) => {
    if (parsedObj && parsedObj.id) return String(parsedObj.id).trim();
    const subCmds = new Set(["autoresponse", "ar", "add", "create", "edit", "delete", "del", "enable", "disable", "clean", "dedupe"]);
    const clean = argsList.filter(x => !subCmds.has(x.toLowerCase()) && !x.includes("="));
    if (!clean.length) return null;
    return clean[0].trim();
  };

  // Helper to find an autoresponse in guild by numeric ID, Mongo _id (or last 6 hex chars), or 1-based index
  const findAutoResponseDoc = async (guildId, targetId) => {
    if (!targetId) return null;
    const list = await safeAll(`SELECT * FROM autoresponses WHERE guild_id=?`, [guildId]);
    if (!list || !list.length) return null;
    const tid = String(targetId).trim().toLowerCase();

    return list.find((r, idx) => {
      if (r.id !== undefined && r.id !== null && String(r.id).toLowerCase() === tid) return true;
      if (r._id) {
        const fullHex = String(r._id).toLowerCase();
        if (fullHex === tid || fullHex.slice(-6) === tid) return true;
      }
      if (String(idx + 1) === tid) return true;
      return false;
    }) || null;
  };

  // Helper to delete an autoresponse doc
  const deleteAutoResponseDoc = async (guildId, arDoc) => {
    const AR = getMongoModel("autoresponses");
    if (AR && arDoc._id) {
      await AR.deleteOne({ _id: arDoc._id });
    } else if (arDoc.id !== undefined && arDoc.id !== null) {
      await safeRun(`DELETE FROM autoresponses WHERE id=? AND guild_id=?`, [arDoc.id, guildId]);
    }
  };

  // Helper to update autoresponse enabled status
  const setAutoResponseStatusDoc = async (guildId, arDoc, isEnabled) => {
    const AR = getMongoModel("autoresponses");
    if (AR && arDoc._id) {
      await AR.updateOne({ _id: arDoc._id }, { $set: { is_enabled: isEnabled ? 1 : 0 } });
    } else if (arDoc.id !== undefined && arDoc.id !== null) {
      await safeRun(`UPDATE autoresponses SET is_enabled=? WHERE id=? AND guild_id=?`, [isEnabled ? 1 : 0, arDoc.id, guildId]);
    }
  };

  if (cmd === "clean_autoresponse" || cmd === "cleanar" || cmd === "leanar" || cmd === "leanar" || cmd === "cdedupe" || cmd === "dedupe_autoresponse" || cmd === "dedupe" || ((cmd === "clean" || cmd === "dedupe" || cmd === "lean") && (args[0] === "autoresponse" || args[0] === "ar" || args[0] === "dup" || args[0] === "duplikat"))) {
    if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription("Anda tidak memiliki izin `ManageGuild`.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const list = await safeAll(`SELECT * FROM autoresponses WHERE guild_id=?`, [ctx.guild.id]);
    if (!list.length) {
      const embed = new EmbedBuilder().setTitle("ℹ️ Pembersihan Autoresponse").setColor(0x3498db).setDescription("Belum ada autoresponse di server ini.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    const seen = new Map();
    const duplicates = [];

    for (const item of list) {
      const key = String(item.trigger_text || "").trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, item);
      } else {
        duplicates.push(item);
      }
    }

    if (!duplicates.length) {
      const embed = new EmbedBuilder().setTitle("✅ Pembersihan Selesai").setColor(0x2ecc71).setDescription("Tidak ditemukan autoresponse duplikat di server ini. Semua trigger sudah unik.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    for (const dup of duplicates) {
      await deleteAutoResponseDoc(ctx.guild.id, dup);
    }

    const embedSuccess = new EmbedBuilder()
      .setTitle("🧹 Autoresponse Duplikat Dibersihkan")
      .setColor(0x2ecc71)
      .setDescription(`Berhasil menghapus **${duplicates.length}** autoresponse duplikat.\nSekarang tersisa **${seen.size}** autoresponse unik di server ini.`)
      .setTimestamp();
    await safeCtxReply(ctx, { embeds: [embedSuccess] });
    return true;
  }

  if (cmd === "seed_autoresponses" || cmd === "seedar" || cmd === "defaultar" || cmd === "seed" || ((cmd === "seed" || cmd === "default") && (args[0] === "autoresponse" || args[0] === "ar"))) {
    if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription("Anda tidak memiliki izin `ManageGuild`.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    const existingList = await safeAll(`SELECT * FROM autoresponses WHERE guild_id=?`, [ctx.guild.id]);
    const existingTriggers = new Set(existingList.map(r => String(r.trigger_text || "").trim().toLowerCase()));

    let addedCount = 0;
    for (const item of defaultList) {
      if (!existingTriggers.has(item.trigger.toLowerCase())) {
        await safeRun(
          `INSERT INTO autoresponses (guild_id, trigger_text, response_text, match_type, ignore_case, cooldown, reply_mode, mention_user, embed_response)
           VALUES (?, ?, ?, 'exact', 1, 0, 'reply', 0, 0)`,
          [ctx.guild.id, item.trigger, item.response]
        );
        addedCount++;
      }
    }

    const embedSuccess = new EmbedBuilder()
      .setTitle("🌱 Autoresponse Bawaan Berhasil Ditambahkan")
      .setColor(0x2ecc71)
      .setDescription(`Berhasil menambahkan **${addedCount}** autoresponse bawaan standar ke server ini.\n*(Autoresponse yang sudah ada dilewati agar tidak terjadi duplikasi)*`)
      .setTimestamp();
    await safeCtxReply(ctx, { embeds: [embedSuccess] });
    return true;
  }

  if (cmd === "add_autoresponse" || cmd === "create_autoresponse" || cmd === "ar" || cmd === "aar" || cmd === "arr" || cmd === "car" || cmd === "caar" || cmd === "carr" || cmd === "ccar" || ((cmd === "add" || cmd === "create") && (args[0] === "autoresponse" || args[0] === "ar"))) {
    if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription("Anda tidak memiliki izin `ManageGuild`.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const startIdx = (cmd === "add" || cmd === "create") ? 1 : 0;
    const text = args.slice(startIdx).join(" ");
    const parsed = parseKeyValueArgs(text);
    let trigger = parsed.trigger;
    let response = parsed.response;

    if (!trigger || !response) {
      const rawText = text.trim();
      if (rawText.includes("|")) {
        const parts = rawText.split("|");
        trigger = parts[0].trim();
        response = parts.slice(1).join("|").trim();
      } else {
        const quoteMatches = [...rawText.matchAll(/"([^"]+)"|'([^']+)'/g)];
        if (quoteMatches.length >= 2) {
          trigger = quoteMatches[0][1] || quoteMatches[0][2];
          response = quoteMatches[1][1] || quoteMatches[1][2];
        } else {
          const cleanTokens = args.slice(startIdx).filter(x => !x.includes("="));
          if (cleanTokens.length >= 2) {
            trigger = cleanTokens[0];
            response = cleanTokens.slice(1).join(" ");
          }
        }
      }
    }

    if (!trigger || !response) {
      const embed = new EmbedBuilder()
        .setTitle("💡 Cara Menambahkan Autoresponse")
        .setColor(EMBED_COLOR)
        .setDescription(
          `**Format yang Didukung:**\n` +
          `1. \`${PREFIX} car trigger="hai" response="Halo {mention}!"\`\n` +
          `2. \`${PREFIX} car hai | Halo {mention}!\` *(Menggunakan garis tegak ` | `)*\n` +
          `3. \`${PREFIX} car "hai" "Halo {mention}!"\`\n` +
          `4. \`${PREFIX} car hai Halo {mention}!\``
        )
        .addFields({
          name: "Opsi Tambahan (Key-Value)",
          value: "• `match=exact|contains|regex`\n• `ignore_case=1|0`\n• `cooldown=detik`\n• `embed=1|0`\n• `reply=1|0`\n• `mention=1|0`\n• `random=\"hai;halo\"`\n• `attachment=\"https://...\"`\n• `button=\"Label\" button_url=\"https://...\"`"
        })
        .setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    // Check duplicate trigger
    const existingList = await safeAll(`SELECT * FROM autoresponses WHERE guild_id=?`, [ctx.guild.id]);
    const existing = existingList.find(r => String(r.trigger_text || "").trim().toLowerCase() === trigger.trim().toLowerCase());
    if (existing) {
      const exId = existing.id !== undefined && existing.id !== null ? existing.id : (existing._id ? String(existing._id).slice(-6) : "?");
      const embed = new EmbedBuilder()
        .setTitle("⚠️ Trigger Sudah Terdaftar")
        .setColor(0xffaa00)
        .setDescription(`Autoresponse untuk trigger \`${trigger}\` sudah ada di server ini (ID \`${exId}\`).\nGunakan komando \`edit_autoresponse\` jika ingin memperbarui balasannya.`)
        .setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    const matchType = parsed.match || 'exact';
    const ignoreCase = parsed.ignore_case !== undefined ? parseInt(parsed.ignore_case) : 1;
    const cooldown = parsed.cooldown ? parseInt(parsed.cooldown) : 0;
    const embedVal = parsed.embed !== undefined ? parseInt(parsed.embed) : 0;
    const replyMode = (parsed.reply !== undefined && parseInt(parsed.reply) === 0) ? 'send' : 'reply';
    const mentionUser = parsed.mention !== undefined ? parseInt(parsed.mention) : 0;
    const randomResponses = parsed.random ? JSON.stringify(parsed.random.split(";")) : null;
    const attachmentUrl = parsed.attachment || null;
    const buttonLabel = parsed.button || null;
    const buttonUrl = parsed.button_url || null;
    const selectMenuOptions = parsed.select ? JSON.stringify(parsed.select.split(";")) : null;
    await safeRun(
      `INSERT INTO autoresponses (guild_id, trigger_text, response_text, match_type, ignore_case, cooldown, reply_mode, mention_user, embed_response, random_responses, attachment_url, button_label, button_url, select_menu_options)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ctx.guild.id, trigger, response, matchType, ignoreCase, cooldown, replyMode, mentionUser, embedVal, randomResponses, attachmentUrl, buttonLabel, buttonUrl, selectMenuOptions]
    );
    const embedSuccess = new EmbedBuilder()
      .setTitle("✅ Autoresponse Ditambahkan")
      .setColor(0x2ecc71)
      .setDescription(`Autoresponse untuk trigger \`${trigger}\` berhasil disimpan.`)
      .setTimestamp();
    await safeCtxReply(ctx, { embeds: [embedSuccess] });
    return true;
  }

  if (cmd === "edit_autoresponse" || cmd === "ear" || (cmd === "edit" && (args[0] === "autoresponse" || args[0] === "ar"))) {
    if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription("Anda tidak memiliki izin `ManageGuild`.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const startIdx = (cmd === "edit") ? 1 : 0;
    const text = args.slice(startIdx).join(" ");
    const parsed = parseKeyValueArgs(text);

    const idArg = getArIdArg(args, parsed);
    if (!idArg) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription("Sebutkan ID autoresponse yang ingin diedit.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    const ar = await findAutoResponseDoc(ctx.guild.id, idArg);
    if (!ar) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Autoresponse dengan ID \`${idArg}\` tidak ditemukan.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    const trigger = parsed.trigger !== undefined ? parsed.trigger : ar.trigger_text;
    const response = parsed.response !== undefined ? parsed.response : ar.response_text;
    const matchType = parsed.match !== undefined ? parsed.match : ar.match_type;
    const ignoreCase = parsed.ignore_case !== undefined ? parseInt(parsed.ignore_case) : ar.ignore_case;
    const cooldown = parsed.cooldown !== undefined ? parseInt(parsed.cooldown) : ar.cooldown;
    const embedVal = parsed.embed !== undefined ? parseInt(parsed.embed) : ar.embed_response;
    const replyMode = parsed.reply !== undefined ? (parseInt(parsed.reply) === 0 ? 'send' : 'reply') : ar.reply_mode;
    const mentionUser = parsed.mention !== undefined ? parseInt(parsed.mention) : ar.mention_user;
    const randomResponses = parsed.random !== undefined ? JSON.stringify(parsed.random.split(";")) : ar.random_responses;
    const attachmentUrl = parsed.attachment !== undefined ? parsed.attachment : ar.attachment_url;
    const buttonLabel = parsed.button !== undefined ? parsed.button : ar.button_label;
    const buttonUrl = parsed.button_url !== undefined ? parsed.button_url : ar.button_url;
    const selectMenuOptions = parsed.select !== undefined ? JSON.stringify(parsed.select.split(";")) : ar.select_menu_options;

    const AR = getMongoModel("autoresponses");
    if (AR && ar._id) {
      await AR.updateOne({ _id: ar._id }, {
        $set: {
          trigger_text: trigger,
          response_text: response,
          match_type: matchType,
          ignore_case: ignoreCase,
          cooldown: cooldown,
          reply_mode: replyMode,
          mention_user: mentionUser,
          embed_response: embedVal,
          random_responses: randomResponses,
          attachment_url: attachmentUrl,
          button_label: buttonLabel,
          button_url: buttonUrl,
          select_menu_options: selectMenuOptions
        }
      });
    } else {
      await safeRun(
        `UPDATE autoresponses SET trigger_text=?, response_text=?, match_type=?, ignore_case=?, cooldown=?, reply_mode=?, mention_user=?, embed_response=?, random_responses=?, attachment_url=?, button_label=?, button_url=?, select_menu_options=? WHERE id=? AND guild_id=?`,
        [trigger, response, matchType, ignoreCase, cooldown, replyMode, mentionUser, embedVal, randomResponses, attachmentUrl, buttonLabel, buttonUrl, selectMenuOptions, ar.id, ctx.guild.id]
      );
    }

    const displayId = ar.id !== undefined && ar.id !== null ? ar.id : (ar._id ? String(ar._id).slice(-6) : idArg);
    const embedSuccess = new EmbedBuilder()
      .setTitle("✅ Autoresponse Diperbarui")
      .setColor(0x2ecc71)
      .setDescription(`Autoresponse ID \`${displayId}\` berhasil diperbarui.`)
      .setTimestamp();
    await safeCtxReply(ctx, { embeds: [embedSuccess] });
    return true;
  }

  if (cmd === "delete_autoresponse" || cmd === "dar" || ((cmd === "delete" || cmd === "del") && (args[0] === "autoresponse" || args[0] === "ar"))) {
    if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription("Anda tidak memiliki izin `ManageGuild`.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const startIdx = (cmd === "delete" || cmd === "del") ? 1 : 0;
    const text = args.slice(startIdx).join(" ");
    const parsed = parseKeyValueArgs(text);

    const idArg = getArIdArg(args, parsed);
    if (!idArg) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription("Sebutkan ID autoresponse yang ingin dihapus.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    const ar = await findAutoResponseDoc(ctx.guild.id, idArg);
    if (!ar) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Autoresponse dengan ID \`${idArg}\` tidak ditemukan.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }

    const displayId = ar.id !== undefined && ar.id !== null ? ar.id : (ar._id ? String(ar._id).slice(-6) : idArg);
    const action = async () => {
      await deleteAutoResponseDoc(ctx.guild.id, ar);
      const embedSuccess = new EmbedBuilder().setTitle("✅ Autoresponse Dihapus").setColor(0x2ecc71).setDescription(`Autoresponse ID \`${displayId}\` berhasil dihapus.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embedSuccess] });
    };
    const embedConfirm = new EmbedBuilder()
      .setTitle("⚠️ Konfirmasi Hapus Autoresponse")
      .setColor(0xffaa00)
      .setDescription(`Anda akan menghapus autoresponse ID \`${displayId}\` (Trigger: \`${ar.trigger_text}\`).`)
      .addFields({ name: "Aksi Konfirmasi", value: "Ketik `confirm` untuk melanjutkan." })
      .setFooter({ text: "Expired dalam 60 detik" })
      .setTimestamp();
    pendingConfirmations.set(authorId, { expires: Date.now() + 60000, action, message: { embeds: [embedConfirm] } });
    await safeCtxReply(ctx, { embeds: [embedConfirm] });
    return true;
  }

  if (cmd === "list_autoresponse" || cmd === "lar" || cmd === "clar" || (cmd === "list" && (args[0] === "autoresponse" || args[0] === "ar"))) {
    const list = await safeAll(`SELECT * FROM autoresponses WHERE guild_id=?`, [ctx.guild.id]);
    if (!list.length) {
      const container = new ContainerBuilder().setAccentColor(0x3498db);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 📋 Daftar Autoresponse\n\n_Belum ada autoresponse di server ini._`)
      );
      await safeCtxReply(ctx, { components: [container], flags: MessageFlags.IsComponentsV2 });
      return true;
    }

    const triggerCounts = new Map();
    list.forEach(r => {
      const key = String(r.trigger_text || "").trim().toLowerCase();
      triggerCounts.set(key, (triggerCounts.get(key) || 0) + 1);
    });
    let dupTotal = 0;
    triggerCounts.forEach(count => { if (count > 1) dupTotal += (count - 1); });

    const lines = list.map((r, idx) => {
      const arId = r.id !== undefined && r.id !== null ? r.id : (r._id ? String(r._id).slice(-6) : (idx + 1));
      const statusText = r.is_enabled ? "Aktif" : "Nonaktif";
      const responseSnippet = String(r.response_text || "").replace(/\n/g, " ").slice(0, 45);
      return `\`[ID ${arId}]\` **${r.trigger_text}** ➔ \`${responseSnippet}\` (${statusText})`;
    });

    let contentStr = `## 📋 Daftar Autoresponse — ${ctx.guild.name}\n` +
      `Total **${list.length}** autoresponse terdaftar di server ini.`;

    if (dupTotal > 0) {
      contentStr += `\n⚠️ *Terdeteksi **${dupTotal}** autoresponse duplikat. Ketik \`${PREFIX} cleanar\` untuk membersihkannya secara otomatis.*`;
    }
    contentStr += `\n\n` + lines.join("\n");

    const container = new ContainerBuilder().setAccentColor(0x3498db);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(contentStr)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`*Requested by ${authorTag}*`)
    );

    await safeCtxReply(ctx, { components: [container], flags: MessageFlags.IsComponentsV2 });
    return true;
  }

  if (cmd === "enable_autoresponse" || cmd === "enar" || (cmd === "enable" && (args[0] === "autoresponse" || args[0] === "ar"))) {
    if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription("Anda tidak memiliki izin `ManageGuild`.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const idArg = getArIdArg(args, parseKeyValueArgs(args.join(" ")));
    if (!idArg) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription("Sebutkan ID autoresponse.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const ar = await findAutoResponseDoc(ctx.guild.id, idArg);
    if (!ar) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Autoresponse dengan ID \`${idArg}\` tidak ditemukan.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    await setAutoResponseStatusDoc(ctx.guild.id, ar, true);
    const displayId = ar.id !== undefined && ar.id !== null ? ar.id : (ar._id ? String(ar._id).slice(-6) : idArg);
    const embed = new EmbedBuilder().setTitle("✅ Autoresponse Diaktifkan").setColor(0x2ecc71).setDescription(`Autoresponse ID \`${displayId}\` berhasil diaktifkan.`).setTimestamp();
    await safeCtxReply(ctx, { embeds: [embed] });
    return true;
  }

  if (cmd === "disable_autoresponse" || cmd === "disar" || (cmd === "disable" && (args[0] === "autoresponse" || args[0] === "ar"))) {
    if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription("Anda tidak memiliki izin `ManageGuild`.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const idArg = getArIdArg(args, parseKeyValueArgs(args.join(" ")));
    if (!idArg) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription("Sebutkan ID autoresponse.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const ar = await findAutoResponseDoc(ctx.guild.id, idArg);
    if (!ar) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Autoresponse dengan ID \`${idArg}\` tidak ditemukan.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    await setAutoResponseStatusDoc(ctx.guild.id, ar, false);
    const displayId = ar.id !== undefined && ar.id !== null ? ar.id : (ar._id ? String(ar._id).slice(-6) : idArg);
    const embed = new EmbedBuilder().setTitle("✅ Autoresponse Dinonaktifkan").setColor(0x2ecc71).setDescription(`Autoresponse ID \`${displayId}\` berhasil dinonaktifkan.`).setTimestamp();
    await safeCtxReply(ctx, { embeds: [embed] });
    return true;
  }

  if (cmd === "timeout" || cmd === "to" || ((cmd === "timeout" || cmd === "to") && args[0] === "member")) {
    let roleQuery = null;
    let durationStr = null;
    let targetQuery = null;
    const startIdx = (cmd === "timeout" || cmd === "to") && args[0] === "member" ? 1 : 0;
    const cleanArgs = args.slice(startIdx);
    const fullText = cleanArgs.join(" ");
    if (fullText.toLowerCase().startsWith("all role ") || fullText.toLowerCase().startsWith("all member dengan role ")) {
      const parts = fullText.split(/\s+/);
      durationStr = parts.pop();
      let temp = fullText.slice(fullText.toLowerCase().startsWith("all role ") ? 9 : 23).trim();
      roleQuery = temp.slice(0, temp.lastIndexOf(durationStr)).trim();
    } else {
      const parts = fullText.split(/\s+/);
      durationStr = parts.pop();
      targetQuery = parts.join(" ");
    }
    const ms = parseDurationToMs(durationStr);
    if (!ms) {
      const embed = new EmbedBuilder().setTitle("❌ Format Durasi Salah").setColor(0xe74c3c).setDescription("Format durasi tidak valid (contoh: 10m, 2h, 1d).").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    if (roleQuery) {
      const role = findRoleFuzzy(ctx.guild, roleQuery);
      if (!role) {
        const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Role **${roleQuery}** tidak ditemukan.`).setTimestamp();
        await safeCtxReply(ctx, { embeds: [embed] });
        return true;
      }
      const action = async () => {
        await ctx.guild.members.fetch().catch(() => { });
        const members = role.members;
        let success = 0;
        let failed = 0;
        for (const [id, m] of members) {
          const permCheck = validateModAction(ctx, m, PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ModerateMembers);
          if (permCheck.ok) {
            try {
              await m.timeout(ms, `Bulk Timeout by ${authorTag}`);
              success++;
            } catch { failed++; }
          } else { failed++; }
        }
        const embedResult = new EmbedBuilder().setTitle("✅ Bulk Timeout Selesai").setColor(0x2ecc71).setDescription(`Berhasil: **${success}** member.\nGagal/Lewat: **${failed}** member.`).setTimestamp();
        await safeCtxReply(ctx, { embeds: [embedResult] });
      };
      const embedConfirm = new EmbedBuilder()
        .setTitle("⚠️ Konfirmasi Bulk Timeout")
        .setColor(0xffaa00)
        .setDescription(`Anda akan memberikan timeout kepada seluruh member dengan role **${role.name}** selama **${durationStr}**.`)
        .addFields({ name: "Aksi Konfirmasi", value: "Ketik `confirm` untuk melanjutkan." })
        .setFooter({ text: "Expired dalam 60 detik" })
        .setTimestamp();
      pendingConfirmations.set(authorId, { expires: Date.now() + 60000, action, message: { embeds: [embedConfirm] } });
      await safeCtxReply(ctx, { embeds: [embedConfirm] });
      return true;
    } else {
      const member = await findMemberFuzzy(ctx.guild, targetQuery);
      if (!member) {
        const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Member **${targetQuery}** tidak ditemukan.`).setTimestamp();
        await safeCtxReply(ctx, { embeds: [embed] });
        return true;
      }
      const permCheck = validateModAction(ctx, member, PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ModerateMembers);
      if (!permCheck.ok) {
        const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription(permCheck.error).setTimestamp();
        await safeCtxReply(ctx, { embeds: [embed] });
        return true;
      }
      await member.timeout(ms, `Timeout by ${authorTag}`);
      const embed = new EmbedBuilder().setTitle("✅ Timeout Berhasil").setColor(0x2ecc71).setDescription(`Berhasil memberikan timeout kepada <@${member.id}> selama **${durationStr}**.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
  }

  if (cmd === "untimeout" || cmd === "unto" || ((cmd === "remove" || cmd === "del" || cmd === "cabut") && (args[0] === "timeout" || args[0] === "to"))) {
    const startIdx = (cmd === "remove" || cmd === "del" || cmd === "cabut") ? 1 : 0;
    const targetQuery = args.slice(startIdx).join(" ");
    const member = await findMemberFuzzy(ctx.guild, targetQuery);
    if (!member) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Member **${targetQuery}** tidak ditemukan.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const permCheck = validateModAction(ctx, member, PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ModerateMembers);
    if (!permCheck.ok) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription(permCheck.error).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    await member.timeout(null, `Untimeout by ${authorTag}`);
    const embed = new EmbedBuilder().setTitle("✅ Timeout Dihapus").setColor(0x2ecc71).setDescription(`Berhasil menghapus timeout dari <@${member.id}>.`).setTimestamp();
    await safeCtxReply(ctx, { embeds: [embed] });
    return true;
  }

  if (cmd === "kick") {
    const targetQuery = args.join(" ");
    const member = await findMemberFuzzy(ctx.guild, targetQuery);
    if (!member) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Member **${targetQuery}** tidak ditemukan.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const permCheck = validateModAction(ctx, member, PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.KickMembers);
    if (!permCheck.ok) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription(permCheck.error).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    await member.kick(`Kicked by ${authorTag}`);
    const embed = new EmbedBuilder().setTitle("✅ Kick Berhasil").setColor(0x2ecc71).setDescription(`Berhasil me-kick <@${member.id}>.`).setTimestamp();
    await safeCtxReply(ctx, { embeds: [embed] });
    return true;
  }

  if (cmd === "ban") {
    const targetQuery = args.join(" ");
    if (targetQuery.toLowerCase() === "all") {
      const action = async () => {
        await ctx.guild.members.fetch().catch(() => { });
        let success = 0;
        let failed = 0;
        for (const [id, m] of ctx.guild.members.cache) {
          const permCheck = validateModAction(ctx, m, PermissionsBitField.Flags.BanMembers, PermissionsBitField.Flags.BanMembers);
          if (permCheck.ok) {
            try {
              await m.ban({ reason: `Ban All by ${authorTag}` });
              success++;
            } catch { failed++; }
          } else { failed++; }
        }
        const embedResult = new EmbedBuilder().setTitle("✅ Ban All Selesai").setColor(0x2ecc71).setDescription(`Berhasil mem-ban **${success}** member.\nGagal/Lewat: **${failed}** member.`).setTimestamp();
        await safeCtxReply(ctx, { embeds: [embedResult] });
      };
      const embedConfirm = new EmbedBuilder()
        .setTitle("⚠️ PERINGATAN BAHAYA: Ban All")
        .setColor(0xff0000)
        .setDescription(`Anda akan melakukan BAN kepada **SELURUH MEMBER** yang bisa di-ban.`)
        .addFields({ name: "Aksi Konfirmasi", value: "Ketik `confirm` untuk melanjutkan." })
        .setFooter({ text: "Expired dalam 60 detik" })
        .setTimestamp();
      pendingConfirmations.set(authorId, { expires: Date.now() + 60000, action, message: { embeds: [embedConfirm] } });
      await safeCtxReply(ctx, { embeds: [embedConfirm] });
      return true;
    }
    const member = await findMemberFuzzy(ctx.guild, targetQuery);
    if (!member) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Member **${targetQuery}** tidak ditemukan.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const permCheck = validateModAction(ctx, member, PermissionsBitField.Flags.BanMembers, PermissionsBitField.Flags.BanMembers);
    if (!permCheck.ok) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription(permCheck.error).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    await member.ban({ reason: `Banned by ${authorTag}` });
    const embed = new EmbedBuilder().setTitle("✅ Ban Berhasil").setColor(0x2ecc71).setDescription(`Berhasil mem-ban <@${member.id}>.`).setTimestamp();
    await safeCtxReply(ctx, { embeds: [embed] });
    return true;
  }

  if (cmd === "unban") {
    const targetQuery = args.join(" ");
    const bans = await ctx.guild.bans.fetch().catch(() => null);
    if (!bans) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription("Gagal mengambil daftar ban.").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    let banEntry = bans.find(b => b.user.id === targetQuery || b.user.username.toLowerCase() === targetQuery.toLowerCase());
    if (!banEntry) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`User **${targetQuery}** tidak ditemukan di daftar ban.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const permCheck = validateModAction(ctx, null, PermissionsBitField.Flags.BanMembers, PermissionsBitField.Flags.BanMembers);
    if (!permCheck.ok) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription(permCheck.error).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    await ctx.guild.bans.remove(banEntry.user.id, `Unbanned by ${authorTag}`);
    const embed = new EmbedBuilder().setTitle("✅ Unban Berhasil").setColor(0x2ecc71).setDescription(`Berhasil me-unban **${banEntry.user.tag}**.`).setTimestamp();
    await safeCtxReply(ctx, { embeds: [embed] });
    return true;
  }

  if (cmd === "nickname" || cmd === "nick") {
    const targetQuery = args[0];
    const newNick = args.slice(1).join(" ").replace(/^["']|["']$/g, "").trim();
    const member = await findMemberFuzzy(ctx.guild, targetQuery);
    if (!member) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Member **${targetQuery}** tidak ditemukan.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const permCheck = validateModAction(ctx, member, PermissionsBitField.Flags.ManageNicknames, PermissionsBitField.Flags.ManageNicknames);
    if (!permCheck.ok) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription(permCheck.error).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const finalNick = (newNick.toLowerCase() === "reset") ? null : newNick;
    await member.setNickname(finalNick, `Nickname changed by ${authorTag}`);
    const embed = new EmbedBuilder().setTitle("✅ Nickname Diubah").setColor(0x2ecc71).setDescription(`Berhasil mengubah nickname <@${member.id}> menjadi **${finalNick || 'Default'}**.`).setTimestamp();
    await safeCtxReply(ctx, { embeds: [embed] });
    return true;
  }

  if ((cmd === "move" || cmd === "mv") && (args[0] === "voice" || args[0] === "vc")) {
    const targetQuery = args[1];
    const channelQuery = args.slice(2).join(" ").trim();
    const member = await findMemberFuzzy(ctx.guild, targetQuery);
    if (!member) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Member **${targetQuery}** tidak ditemukan.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    if (!member.voice.channel) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Member <@${member.id}> tidak berada di voice channel.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const channels = ctx.guild.channels.cache.filter(c => c.type === 2);
    let targetCh = channels.find(c => c.name.toLowerCase() === channelQuery.toLowerCase());
    if (!targetCh) targetCh = channels.find(c => c.name.toLowerCase().includes(channelQuery.toLowerCase()));
    if (!targetCh) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Voice channel **${channelQuery}** tidak ditemukan.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const permCheck = validateModAction(ctx, member, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.MoveMembers);
    if (!permCheck.ok) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription(permCheck.error).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    await member.voice.setChannel(targetCh, `Moved by ${authorTag}`);
    const embed = new EmbedBuilder().setTitle("✅ Pemindahan Berhasil").setColor(0x2ecc71).setDescription(`Berhasil memindahkan <@${member.id}> ke voice channel **${targetCh.name}**.`).setTimestamp();
    await safeCtxReply(ctx, { embeds: [embed] });
    return true;
  }

  if ((cmd === "disconnect" || cmd === "dc") && (args[0] === "voice" || args[0] === "vc")) {
    const targetQuery = args.slice(1).join(" ");
    const member = await findMemberFuzzy(ctx.guild, targetQuery);
    if (!member) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Member **${targetQuery}** tidak ditemukan.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    if (!member.voice.channel) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Member <@${member.id}> tidak berada di voice channel.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const permCheck = validateModAction(ctx, member, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.MoveMembers);
    if (!permCheck.ok) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription(permCheck.error).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    await member.voice.setChannel(null, `Disconnected by ${authorTag}`);
    const embed = new EmbedBuilder().setTitle("✅ Disconnect Berhasil").setColor(0x2ecc71).setDescription(`Berhasil mengeluarkan <@${member.id}> dari voice channel.`).setTimestamp();
    await safeCtxReply(ctx, { embeds: [embed] });
    return true;
  }

  if ((cmd === "mute" || cmd === "mu") && (args[0] === "voice" || args[0] === "vc")) {
    const targetQuery = args.slice(1).join(" ");
    const member = await findMemberFuzzy(ctx.guild, targetQuery);
    if (!member) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Member **${targetQuery}** tidak ditemukan.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    if (!member.voice.channel) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Member <@${member.id}> tidak berada di voice channel.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const permCheck = validateModAction(ctx, member, PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.MuteMembers);
    if (!permCheck.ok) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription(permCheck.error).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    await member.voice.setMute(true, `Server Muted by ${authorTag}`);
    const embed = new EmbedBuilder().setTitle("✅ Mute Berhasil").setColor(0x2ecc71).setDescription(`Berhasil melakukan mute suara <@${member.id}>.`).setTimestamp();
    await safeCtxReply(ctx, { embeds: [embed] });
    return true;
  }

  if ((cmd === "deafen" || cmd === "df") && (args[0] === "voice" || args[0] === "vc")) {
    const targetQuery = args.slice(1).join(" ");
    const member = await findMemberFuzzy(ctx.guild, targetQuery);
    if (!member) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Member **${targetQuery}** tidak ditemukan.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    if (!member.voice.channel) {
      const embed = new EmbedBuilder().setTitle("❌ Tindakan Gagal").setColor(0xe74c3c).setDescription(`Member <@${member.id}> tidak berada di voice channel.`).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const permCheck = validateModAction(ctx, member, PermissionsBitField.Flags.DeafenMembers, PermissionsBitField.Flags.DeafenMembers);
    if (!permCheck.ok) {
      const embed = new EmbedBuilder().setTitle("❌ Izin Ditolak").setColor(0xe74c3c).setDescription(permCheck.error).setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    await member.voice.setDeafen(true, `Server Deafened by ${authorTag}`);
    const embed = new EmbedBuilder().setTitle("✅ Deafen Berhasil").setColor(0x2ecc71).setDescription(`Berhasil mematikan pendengaran <@${member.id}>.`).setTimestamp();
    await safeCtxReply(ctx, { embeds: [embed] });
    return true;
  }

  if (cmd === "purge" || cmd === "clear" || cmd === "pg" || cmd === "cl") {
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      const embed = new EmbedBuilder().setTitle("❌ Format Salah").setColor(0xe74c3c).setDescription("Contoh: `c purge 50` (maksimal 100 pesan).").setTimestamp();
      await safeCtxReply(ctx, { embeds: [embed] });
      return true;
    }
    const action = async () => {
      await ctx.channel.bulkDelete(amount, true).catch(() => null);
      const embedResult = new EmbedBuilder().setTitle("✅ Purge Selesai").setColor(0x2ecc71).setDescription(`Berhasil menghapus **${amount}** pesan.`).setTimestamp();
      const rep = await ctx.channel.send({ embeds: [embedResult] }).catch(() => null);
      if (rep) setTimeout(() => rep.delete().catch(() => { }), 5000);
    };
    const embedConfirm = new EmbedBuilder()
      .setTitle("⚠️ Konfirmasi Purge Pesan")
      .setColor(0xffaa00)
      .setDescription(`Anda akan menghapus **${amount}** pesan di channel ini.`)
      .addFields({ name: "Aksi Konfirmasi", value: "Ketik `confirm` untuk melanjutkan." })
      .setFooter({ text: "Expired dalam 60 detik" })
      .setTimestamp();
    pendingConfirmations.set(authorId, { expires: Date.now() + 60000, action, message: { embeds: [embedConfirm] } });
    await safeCtxReply(ctx, { embeds: [embedConfirm] });
    return true;
  }

  return false;
}

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

    // console.log(` ├── [VOICE 24/7] Attempting to connect to: ${channel.name} (${channel.id})`);
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfMute: true,
      selfDeaf: true,
    });

    connection.removeAllListeners('stateChange');
    connection.removeAllListeners('error');

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

async function initVoiceTracking(client) {
  try {
    const now = Date.now();
    let count = 0;

    const rows = await safeAll("SELECT * FROM active_voice_sessions").catch(() => []);
    const dbSessions = new Map(rows.map(r => [r.user_id, r.join_timestamp]));
    const activeUserIds = new Set();

    const processGuild = async (guild) => {
      for (const [memberId, vs] of guild.voiceStates.cache) {
        const member = vs.member;
        if (!member || member.user.bot) continue;
        const vc = vs.channel;
        if (vc && vc.id !== guild.afkChannelId) {
          activeUserIds.add(memberId);
          if (dbSessions.has(memberId)) {
            voiceSessions.set(memberId, dbSessions.get(memberId));
          } else {
            voiceSessions.set(memberId, now);
            await safeRun("INSERT OR REPLACE INTO active_voice_sessions (user_id, join_timestamp) VALUES (?, ?)", [memberId, now]).catch(() => null);
          }
          count++;
        }
      }
    };

    const targetGuildId = process.env.GUILD_ID;
    if (targetGuildId) {
      const guild = client.guilds.cache.get(targetGuildId);
      if (guild) {
        await processGuild(guild);
      }
    } else {
      for (const guild of client.guilds.cache.values()) {
        await processGuild(guild);
      }
    }

    for (const storedUserId of dbSessions.keys()) {
      if (!activeUserIds.has(storedUserId)) {
        await safeRun("DELETE FROM active_voice_sessions WHERE user_id = ?", [storedUserId]).catch(() => null);
      }
    }

    console.log(` ├── [VOICE] Tracking initialized: ${count} active users`);
  } catch (err) {
    console.error("[VOICE] Error initializing voice tracking:", err);
  }
}

function leaderboardPayload(components) {
  return {
    components,
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  };
}

function leaderboardEditPayload(components) {
  return {
    content: null,
    embeds: [],
    components,
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  };
}

function formatRankLine(rank, name, value, icon = "◆") {
  const rankText = String(rank).padStart(2, "0");
  return `**${rankText}** ${icon} ${name} — ${value}`;
}

async function isLeaderboardStaff(guild, userId) {
  if (!guild || !/^\d{17,20}$/.test(String(userId))) return false;

  const staffRoleIds = String(process.env.STAFF_ROLE_ID || process.env.TICKET_STAFF_ROLE_ID || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
  if (!member) return false;

  if (staffRoleIds.some((roleId) => member.roles.cache.has(roleId))) return true;

  return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions.has(PermissionsBitField.Flags.ManageGuild);
}

// ===================== LEADERBOARD BLACKLIST HELPERS =====================
async function getLbBlacklist() {
  const docs = await LeaderboardBlacklist.find({}, { user_id: 1 }).lean().catch(() => []);
  return new Set(docs.map(d => String(d.user_id)));
}

async function addLbBlacklist(userId, reason = "", addedBy = "") {
  await LeaderboardBlacklist.updateOne(
    { user_id: String(userId) },
    { $set: { reason, added_by: String(addedBy), added_at: Date.now() } },
    { upsert: true }
  ).catch(() => null);
}

async function removeLbBlacklist(userId) {
  await LeaderboardBlacklist.deleteOne({ user_id: String(userId) }).catch(() => null);
}

async function takeNonStaffRows(guild, rows, limit = 5) {
  // Hardcoded IDs to always exclude (bots, selfbots, system accounts)
  const HARDCODED_EXCLUDED = new Set(['832152158841208844', '836645359467102218', '1101959062352044143']);
  // Dynamic blacklist from DB
  const dbBlacklist = await getLbBlacklist();
  const out = [];
  for (const row of rows) {
    const uid = String(row.user_id);
    // Skip hardcoded & DB-blacklisted users
    if (HARDCODED_EXCLUDED.has(uid) || dbBlacklist.has(uid)) continue;
    if (await isLeaderboardStaff(guild, row.user_id)) continue;
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

// ===================== LEADERBOARD HELPERS =====================
// Fungsi baru untuk mendapatkan username tanpa di-tag
async function resolveUsernameNoTag(guild, userId, fallback) {
  const cleanId = String(userId || "").replace(/[<@!>]/g, "");
  const cleanFallback = String(fallback || "").replace(/[<@!>]/g, "");

  if (!/^\d{17,20}$/.test(cleanId)) return cleanFallback || cleanId;
  if (!guild) return cleanFallback || cleanId;
  try {
    const member = guild.members.cache.get(cleanId) || await guild.members.fetch(cleanId).catch(() => null);
    if (member) return member.user.username;

    if (guild.client) {
      const user = await guild.client.users.fetch(cleanId).catch(() => null);
      if (user) return user.username;
    }
  } catch { }
  return cleanFallback || cleanId;
}

async function buildSupportPayload(guild = null) {
  const sponsorRows = await safeAll(
    "SELECT * FROM support_leaderboard WHERE type = 'sponsor' ORDER BY amount DESC, updated_at ASC LIMIT 50"
  );
  const donaturRows = await safeAll(
    "SELECT * FROM support_leaderboard WHERE type = 'donatur' ORDER BY amount DESC, updated_at ASC LIMIT 50"
  );
  const sponsors = await takeNonStaffRows(guild, sponsorRows, 5);
  const donaturs = await takeNonStaffRows(guild, donaturRows, 5);

  const formatAmount = (amount) => `\`Rp ${Number(amount || 0).toLocaleString("id-ID")}\``;

  const formatSupportRows = async (rows, icon) => {
    if (!rows.length) return "_Belum ada data._";
    const lines = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = await resolveUsernameNoTag(guild, row.user_id, row.username);
      lines.push(formatRankLine(i + 1, name, formatAmount(row.amount), icon));
    }
    return lines.join("\n");
  };

  const totalSponsor = sponsors.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalDonatur = donaturs.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const sponsorText = await formatSupportRows(sponsors, "👑");
  const donaturText = await formatSupportRows(donaturs, "💎");

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("# <a:champions:1523182563332718767> The Nobles of Mystral"),
      new TextDisplayBuilder().setContent(
        [
          "Para pendukung non-staff yang menjaga Mystral tetap hidup, hangat, dan terus berkembang.",
          `Sponsor tercatat: **${sponsors.length}** • Donatur tercatat: **${donaturs.length}**`,
        ].join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "## <a:ja_1roll3yellow:1516080291209285672> Sponsor Circle",
          sponsorText,
          "",
          `Total sponsor top list: ${formatAmount(totalSponsor)}`,
        ].join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "## <a:blue_diamond:1523181238154956956> Donatur Circle",
          donaturText,
          "",
          `Total donatur top list: ${formatAmount(totalDonatur)}`,
        ].join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`Mystral • Support Leaderboard • <t:${Math.floor(Date.now() / 1000)}:R>`)
    );

  return leaderboardPayload([container]);
}

async function getLobbyChannelIds(guildId) {
  if (!guildId) return [];
  const rows = await safeAll(
    "SELECT channel_id FROM leaderboard_lobby_channels WHERE guild_id = ?",
    [guildId]
  ).catch(() => []);
  return rows.map(r => r.channel_id).filter(Boolean);
}

async function addLobbyChannelId(guildId, channelId) {
  if (!guildId || !channelId) return false;
  await safeRun(
    "INSERT OR REPLACE INTO leaderboard_lobby_channels (guild_id, channel_id, added_at) VALUES (?, ?, ?)",
    [guildId, channelId, Date.now()]
  ).catch(() => null);
  return true;
}

async function removeLobbyChannelId(guildId, channelId) {
  if (!guildId || !channelId) return false;
  await safeRun(
    "DELETE FROM leaderboard_lobby_channels WHERE guild_id = ? AND channel_id = ?",
    [guildId, channelId]
  ).catch(() => null);
  return true;
}

async function buildMonthlyRecapPayload(guild, month, year, filterStaff = true) {
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

  const lobbyChIds = await getLobbyChannelIds(guild?.id);

  // 1. Top Chat Lobby
  let topChatLobbyRaw = [];
  if (lobbyChIds.length > 0) {
    const placeholders = lobbyChIds.map(() => "?").join(",");
    topChatLobbyRaw = await safeAll(
      `SELECT user_id, SUM(msg_count) AS total
       FROM activity_daily_channel
       WHERE day LIKE ? AND channel_id IN (${placeholders})
       GROUP BY user_id
       ORDER BY total DESC
       LIMIT 50`,
      [datePattern, ...lobbyChIds]
    );
  }

  // 2. Top Chat All Channels
  const topChatAllRaw = await safeAll(
    `SELECT user_id, SUM(msg_count) AS total
     FROM activity_daily
     WHERE day LIKE ?
     GROUP BY user_id
     ORDER BY total DESC
     LIMIT 50`,
    [datePattern]
  );

  // 3. Top Voice
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
    for (const [userId, joinTime] of voiceSessions.entries()) {
      let inValidVc = false;
      if (guild) {
        const vs = guild.voiceStates.cache.get(userId);
        if (vs && vs.channel && vs.channel.id !== guild.afkChannelId) {
          inValidVc = true;
        }
      } else {
        for (const g of client.guilds.cache.values()) {
          const vs = g.voiceStates.cache.get(userId);
          if (vs && vs.channel && vs.channel.id !== g.afkChannelId) {
            inValidVc = true;
            break;
          }
        }
      }

      if (inValidVc) {
        const elapsedSec = Math.floor((now - joinTime) / 1000);
        if (elapsedSec > 0) {
          const currentTotal = voiceMap.get(userId) || 0;
          voiceMap.set(userId, currentTotal + elapsedSec);
        }
      }
    }
  }

  const topVoiceRaw = Array.from(voiceMap.entries())
    .map(([user_id, total]) => ({ user_id, total }))
    .sort((a, b) => b.total - a.total);

  // Filter staff if requested
  const topLobbyPublic = filterStaff ? await takeNonStaffRows(guild, topChatLobbyRaw, 10) : topChatLobbyRaw.slice(0, 10);
  const topAllPublic = filterStaff ? await takeNonStaffRows(guild, topChatAllRaw, 10) : topChatAllRaw.slice(0, 10);
  const topVoicePublic = filterStaff ? await takeNonStaffRows(guild, topVoiceRaw, 10) : topVoiceRaw.slice(0, 10);

  const formatVoiceDuration = (sec) => {
    const s = Number(sec || 0);
    if (s < 60) return "< 1 menit";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} menit`;
    const h = Math.floor(m / 60);
    const remMin = m % 60;
    return `${h} jam ${remMin} menit`;
  };

  // Format Lobby Chat Lines
  let lobbyChatText = "";
  if (!lobbyChIds.length) {
    lobbyChatText = "_Belum ada channel lobby yang di-set (`c leaderboard lobby add #channel`)._";
  } else {
    const lines = [];
    for (let i = 0; i < topLobbyPublic.length; i++) {
      const r = topLobbyPublic[i];
      const name = await resolveUsernameNoTag(guild, r.user_id, r.user_id);
      lines.push(formatRankLine(i + 1, name, `\`${Number(r.total).toLocaleString("id-ID")} pesan\``, "💬"));
    }
    lobbyChatText = lines.length ? lines.join("\n") : "_Belum ada aktivitas di channel lobby._";
  }

  // Format All Channels Chat Lines
  const allChatLines = [];
  for (let i = 0; i < topAllPublic.length; i++) {
    const r = topAllPublic[i];
    const name = await resolveUsernameNoTag(guild, r.user_id, r.user_id);
    allChatLines.push(formatRankLine(i + 1, name, `\`${Number(r.total).toLocaleString("id-ID")} pesan\``, "🌐"));
  }
  const allChatText = allChatLines.length ? allChatLines.join("\n") : "_Belum ada aktivitas chat server._";

  // Format Voice Lines
  const voiceLines = [];
  for (let i = 0; i < topVoicePublic.length; i++) {
    const r = topVoicePublic[i];
    const name = await resolveUsernameNoTag(guild, r.user_id, r.user_id);
    voiceLines.push(formatRankLine(i + 1, name, `\`${formatVoiceDuration(r.total)}\``, "🎙️"));
  }
  const voiceText = voiceLines.length ? voiceLines.join("\n") : "_Belum ada aktivitas voice server._";

  const totalLobbyChat = topLobbyPublic.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const totalAllChat = topAllPublic.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const totalVoice = topVoicePublic.reduce((sum, row) => sum + Number(row.total || 0), 0);

  const headerTitle = filterStaff
    ? "# <a:champions:1523182563332718767> Monthly Recap Mystral"
    : "# 🌐 Overall Server Leaderboard — " + (guild?.name || "Mystral");

  const headerDesc = filterStaff
    ? `Periode: **${monthLabel} ${targetYear}**\nPeringkat ini menampilkan aktivitas member non-staff untuk kualifikasi **Member of the Month**.`
    : `Periode: **${monthLabel} ${targetYear}**\nPeringkat keseluruhan server (termasuk staff & seluruh member).`;

  const footerText = filterStaff
    ? `Mystral • 🔴 Live Active • Updated <t:${Math.floor(Date.now() / 1000)}:R>`
    : `Mystral • Overall Server Stats • Everyone Included • <t:${Math.floor(Date.now() / 1000)}:R>`;

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(headerTitle),
      new TextDisplayBuilder().setContent(headerDesc)
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "## 💬 Top Chat Lobby",
          lobbyChatText,
          "",
          `Total lobby chat: \`${Number(totalLobbyChat).toLocaleString("id-ID")} pesan\``,
        ].join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "## 🌐 Top Chat All Channels",
          allChatText,
          "",
          `Total chat server: \`${Number(totalAllChat).toLocaleString("id-ID")} pesan\``,
        ].join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "## 🎙️ Top Voice",
          voiceText,
          "",
          `Total top voice: \`${formatVoiceDuration(totalVoice)}\``,
        ].join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(footerText)
    );

  return leaderboardPayload([container]);
}

async function flushActiveVoiceSessions(client) {
  try {
    const now = Date.now();

    for (const [userId, joinTime] of voiceSessions.entries()) {
      let inValidVc = false;
      for (const guild of client.guilds.cache.values()) {
        const vs = guild.voiceStates.cache.get(userId);
        if (vs && vs.channel && vs.channel.id !== guild.afkChannelId) {
          inValidVc = true;
          break;
        }
      }

      if (!inValidVc) {
        voiceSessions.delete(userId);
        await safeRun("DELETE FROM active_voice_sessions WHERE user_id = ?", [userId]).catch(() => null);
        continue;
      }

      const elapsedMs = now - joinTime;
      const elapsedSec = Math.floor(elapsedMs / 1000);
      if (elapsedSec >= 5) {
        await saveVoiceActivity(userId, elapsedSec);
        voiceSessions.set(userId, now);
        await safeRun("INSERT OR REPLACE INTO active_voice_sessions (user_id, join_timestamp) VALUES (?, ?)", [userId, now]).catch(() => null);
      }
    }
  } catch (err) {
    console.error("[VOICE FLUSH ERROR]", err);
  }
}

async function checkMonthlyRecapAutoSnapshot(client) {
  try {
    const now = Date.now();
    const wib = new Date(now + 7 * 60 * 60 * 1000);
    const dayOfMonth = wib.getUTCDate();
    const hour = wib.getUTCHours();

    // Check on 1st of month at 00:00 WIB
    if (dayOfMonth !== 1 || hour !== 0) return;

    let prevMonth = wib.getUTCMonth(); // 0-based index: 0 is Jan (so prev month was Dec of prev year)
    let prevYear = wib.getUTCFullYear();
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }

    const snapshotKey = `monthly_snapshot_${prevYear}_${prevMonth}`;
    const alreadySnapshotted = await getMetaText(snapshotKey);
    if (alreadySnapshotted) return;

    console.log(`[MONTHLY RECAP] Executing end-of-month snapshot for ${prevMonth}/${prevYear}...`);

    // Prioritize recap_log_channel_id, fallback to recap_live_channel_id
    const logChId = (await getMetaText("recap_log_channel_id")) || (await getMetaText("recap_live_channel_id"));

    for (const guild of client.guilds.cache.values()) {
      const payload = await buildMonthlyRecapPayload(guild, prevMonth, prevYear, true);

      await setMetaText(snapshotKey, JSON.stringify({
        timestamp: Date.now(),
        year: prevYear,
        month: prevMonth
      }));

      if (logChId) {
        const channel = await client.channels.fetch(logChId).catch(() => null);
        if (channel && channel.isTextBased()) {
          const monthsIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
          const monthLabel = monthsIndo[prevMonth - 1] || `Bulan ${prevMonth}`;

          await channel.send({
            content: `🏆 **REKAPITULASI RESMI MEMBER OF THE MONTH — ${monthLabel.toUpperCase()} ${prevYear}**\nBerikut adalah pengumuman resmi hasil akhir keaktifan member server bulan lalu!`,
            ...payload
          }).catch(() => null);
        }
      }
    }
  } catch (err) {
    console.error("[MONTHLY RECAP SNAPSHOT ERROR]", err);
  }
}

async function updateLiveLeaderboards(client) {
  try {
    await flushActiveVoiceSessions(client);
    await checkMonthlyRecapAutoSnapshot(client);
    const recapChId = await getMetaText("recap_live_channel_id");
    const recapMsgId = await getMetaText("recap_live_message_id");
    if (recapChId && recapMsgId) {
      const channel = await client.channels.fetch(recapChId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const message = await channel.messages.fetch(recapMsgId).catch(() => null);
        if (message) {
          const payload = await buildMonthlyRecapPayload(message.guild || channel.guild, null, null, true);
          await message.edit(leaderboardEditPayload(payload.components)).catch(() => null);
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
          const payload = await buildSupportPayload(message.guild || channel.guild);
          await message.edit(leaderboardEditPayload(payload.components)).catch(() => null);
        }
      }
    }
  } catch (err) {
    console.error("[LIVE LEADERBOARD] Error updating live leaderboards:", err);
  }
}

// ===================== READY =====================
client.once(Events.ClientReady, async (c) => {
  await initVoiceTracking(c);

  // Load sticky messages
  const stickies = await safeAll("SELECT * FROM sticky_messages").catch(() => []);
  for (const row of stickies) {
    stickyCache.set(row.channel_id, {
      content: row.content,
      lastMessageId: row.last_message_id
    });
  }

  // Load media settings
  const mediaSettings = await safeAll("SELECT * FROM media_settings").catch(() => []);
  for (const row of mediaSettings) {
    mediaSettingsCache.set(row.guild_id, {
      enabled: row.enabled,
      deleteOriginal: row.delete_original,
      nsfwFilter: row.nsfw_filter,
      quality: row.quality,
      platforms: JSON.parse(row.platforms || "{}")
    });
  }

  // Join target voice channel 24/7
  joinTargetVoice(c);
  setInterval(() => {
    joinTargetVoice(c);
  }, 5 * 60 * 1000);

  startGiveawayLoop(c); // ✅ sekarang pasti kebaca (global)
  startTimedRolesLoop(c);


  // ===================== AUTO BACKUP =====================
  startOwnerDmBackupSchedule(c);

  startReminderLoop(c); // ✅ reminder loop jalan
  startStaffTagLoop(c); // ✅ staff tag loop jalan

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
    "Managing Mystral District",
    "Assisting Mystralians",
    "Monitoring the community",
    "Keeping the District online",
    "Powering community features",
    "Serving Mystral District",
    "Need help? • /help",
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
  console.log(`│ 📁 DB Engine:  ${("MongoDB Atlas Cloud (Mongoose)").padEnd(40)} │`);
  console.log(`│ 📅 Started At: ${(wib + " WIB").padEnd(40)} │`);
  console.log("└────────────────────────────────────────────────────────┘");

  // interval update
  setInterval(() => {
    c.guilds.cache.forEach((g) => updateStatsChannels(g));
  }, (Number(process.env.STATS_UPDATE_MIN) || 5) * 60 * 1000);

  // live leaderboard auto-update loop (setiap 1 menit)
  setInterval(() => {
    updateLiveLeaderboards(c);
  }, 1 * 60 * 1000);
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
    .setFooter({ text: "Mystral • Giveaway" })
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
    .setFooter({ text: "Mystral • Giveaway" })
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

      const GW = getMongoModel("giveaways");
      const docs = await GW.find({ is_ended: 0, end_at: { $lte: now } }).sort({ end_at: 1 }).limit(5);
      const due = docs.map(d => d.toObject());

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

async function handleTebakAngkaLeaderboard(client, guildId, interactionOrMessage, authorId) {
  const isInteraction = !!interactionOrMessage.commandName;
  if (isInteraction && !interactionOrMessage.deferred && !interactionOrMessage.replied) {
    await safeDefer(interactionOrMessage).catch(() => { });
  }

  const rows = await safeAll(
    `SELECT user_id, wins, best_attempts
     FROM guess_number_scores
     WHERE guild_id=?
     ORDER BY wins DESC, best_attempts ASC, updated_at ASC
     LIMIT 100`,
    [guildId]
  );

  const medals = ["🥇", "🥈", "🥉"];
  const ACCENT = 0xffa500;

  if (!rows.length) {
    const container = new ContainerBuilder().setAccentColor(ACCENT);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent("## 🏆 Leaderboard Tebak Angka"));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent("Belum ada pemenang yang tercatat."));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent("-# Mystral - Tebak Angka"));

    try {
      const payload = { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } };
      return isInteraction ? await interactionOrMessage.editReply(payload) : await interactionOrMessage.reply(payload);
    } catch (e) {
      console.error("[TEBAK ANGKA LEADERBOARD NO WINNER ERROR]", e.message);
      return;
    }
  }

  const itemsPerPage = 10;
  const totalPages = Math.ceil(rows.length / itemsPerPage);
  let currentPage = 0;

  async function buildPage(page) {
    const startIdx = page * itemsPerPage;
    const pageRows = rows.slice(startIdx, startIdx + itemsPerPage);

    const container = new ContainerBuilder().setAccentColor(ACCENT);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent("## 🏆 Leaderboard Tebak Angka"));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1));

    let lines = [];
    for (let i = 0; i < pageRows.length; i++) {
      const row = pageRows[i];
      const globalIdx = startIdx + i;
      const medal = medals[globalIdx] || `**${globalIdx + 1}.**`;
      const best = row.best_attempts ? ` • best **${row.best_attempts}x**` : "";

      let displayName = `<@${row.user_id}>`;
      try {
        const user = await client.users.fetch(row.user_id);
        if (user) displayName = `**${user.username}**`;
      } catch (e) { }

      lines.push(`${medal} ${displayName} — **${row.wins} win**${best}`);
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1));

    if (totalPages > 1) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Halaman ${page + 1} dari ${totalPages} • Mystral Tebak Angka`));
    } else {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Mystral   Tebak Angka`));
    }

    const comps = [container];

    if (totalPages > 1) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("talb_prev")
          .setLabel("PREV")
          .setEmoji("◀")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId("talb_next")
          .setLabel("NEXT")
          .setEmoji("▶")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages - 1)
      );
      comps.push(row);
    }

    return comps;
  }

  const initialComps = await buildPage(currentPage);
  const payload = { components: initialComps, flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } };
  let msg;
  try {
    msg = isInteraction
      ? await interactionOrMessage.editReply(payload)
      : await interactionOrMessage.reply(payload);
  } catch (err) {
    console.error("[TEBAK ANGKA LEADERBOARD ERROR]", err.message);
    return;
  }

  if (totalPages > 1) {
    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.customId.startsWith("talb_") && i.user.id === authorId,
      time: 60000
    });

    collector.on("collect", async (i) => {
      if (i.customId === "talb_prev") currentPage = Math.max(0, currentPage - 1);
      if (i.customId === "talb_next") currentPage = Math.min(totalPages - 1, currentPage + 1);

      const newComps = await buildPage(currentPage);
      await i.update({ components: newComps }).catch(() => { });
    });

    collector.on("end", async () => {
      const disabledComps = await buildPage(currentPage);
      if (disabledComps.length > 1) {
        disabledComps[1].components.forEach(b => b.setDisabled(true));
      }
      msg.edit({ components: disabledComps }).catch(() => { });
    });
  }
}

async function handleGuessNumberAttempt(message) {
  if (!message || !message.guild || !message.channel || !message.author) return false;
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
    }).catch(() => null);
    return true;
  }

  if (guess < game.answer) {
    await message.reply({
      content: `📉 **${guess} terlalu kecil!** coba angka yang lebih besar.`,
      allowedMentions: { repliedUser: false },
    }).catch(() => null);
    return true;
  }

  await message.reply({
    content: `📈 **${guess} terlalu besar!** coba angka yang lebih kecil.`,
    allowedMentions: { repliedUser: false },
  }).catch(() => null);
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
    const welcomeChannel = await getTextChannelOrNull(member.guild, requireEnv("WELCOME_CHANNEL_ID") || requireEnv("GENERAL_CHANNEL_ID"));
    const lobbyChannel = await getTextChannelOrNull(member.guild, requireEnv("LOBBY_CHANNEL_ID"));
    if (!welcomeChannel && !lobbyChannel) return;

    const memberCount = member.guild.memberCount;

    const welcomeText = buildWelcomeText(member, memberCount);

    const avatarUrl = member.displayAvatarURL({ extension: "png", size: 256 });
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

    if (welcomeChannel) {
      await welcomeChannel.send({ content: `***Selamat datang, <@${member.id}>!***`, embeds: [embed], files }).catch((e) => {
        console.error("[Welcome] Failed sending welcome card message:", e?.message || e);
      });
    }

    if (lobbyChannel) {
      await lobbyChannel.send({
        content: buildLobbyWelcomeText(member),
        allowedMentions: { users: [member.id], roles: [], repliedUser: false },
      }).catch((e) => {
        console.error("[Welcome] Failed sending lobby welcome message:", e?.message || e);
      });
    }
  } catch (err) {
    console.error("[Welcome] Error handling GuildMemberAdd:", err);
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  updateStatsChannels(member.guild);
  handleBoosterLeave(member).catch(() => null);


  try {
    const channel = await getTextChannelOrNull(member.guild, requireEnv("LEAVE_CHANNEL_ID") || requireEnv("GENERAL_CHANNEL_ID"));
    if (!channel) return;

    const leaveText = [
      `👋 **A Student Has Departed**`,
      `**${member.displayName}** has left Mystral.`,
    ].join("\n");

    const avatarUrl = member.displayAvatarURL({ extension: "png", size: 256 });
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

// ===================== BOOSTER CUSTOM ROLE =====================
// Helper: get booster gift quota (1 boost = 3 gift slots, 2+ boosts = 5 gift slots)
async function getBoosterGiftQuota(member, guildId) {
  try {
    const doc = await BoosterCustomRole.findOne({ user_id: member.id, guild_id: guildId }).lean().catch(() => null);
    if (doc?.boost_count && typeof doc.boost_count === "number") {
      return doc.boost_count >= 2 ? 5 : 3;
    }

    const hasMultiBoostRole = member.roles.cache.some(r => {
      const name = r.name.toLowerCase();
      return name.includes("2x boost") || name.includes("multi boost") || name.includes("double boost") || name.includes("boost x2") || name.includes("2 boost");
    });

    if (hasMultiBoostRole) return 5;
    return 3; // Default 1 boost = 3 gifts
  } catch {
    return 3;
  }
}

// Helper: generate 2-color gradient PNG icon for role
function generateGradientRoleIcon(col1, col2) {
  try {
    let createCanvasFn;
    try { createCanvasFn = require("@napi-rs/canvas").createCanvas; } catch {
      try { createCanvasFn = require("canvas").createCanvas; } catch { }
    }
    if (!createCanvasFn) return null;

    const canvas = createCanvasFn(64, 64);
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 64, 64);
    grad.addColorStop(0, col1);
    grad.addColorStop(1, col2);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();

    return canvas.toBuffer("image/png");
  } catch (e) {
    console.error("[GRADIENT ICON GEN FAIL]", e);
    return null;
  }
}

function parseDurationMs(str) {
  if (!str) return 3600000;
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) {
    const num = parseInt(str);
    return isNaN(num) ? 3600000 : num * 3600000;
  }
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "s") return val * 1000;
  if (unit === "m") return val * 60000;
  if (unit === "h") return val * 3600000;
  if (unit === "d") return val * 86400000;
  return 3600000;
}

// ===================== ANTI-INVITE DETECTOR SYSTEM =====================
const inviteSpamTracker = new Map(); // Tracker Map for Spam Raid detection: key = `${guildId}_${userId}`, val = Array of timestamps

async function checkInviteLinkAlert(message) {
  try {
    if (!message || !message.guild || message.author.bot) return false;

    // Discord Invite Link regex (supports all custom invite codes and hyphen/underscore)
    const inviteRegex = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li|app)|discord\.com\/invite)\/([a-zA-Z0-9_-]+)/gi;
    const matches = [...message.content.matchAll(inviteRegex)];
    if (!matches.length) return false;

    const guild = message.guild;

    // Check if Anti-Invite Detector is enabled (default: on)
    const toggleDoc = await MetaText.findOne({ key: `invitelog_enabled_${guild.id}` }).lean().catch(() => null);
    if (toggleDoc?.value === "off") return false;

    // Check log channel (with fallback to stafflog_channel)
    let logChId = (await MetaText.findOne({ key: `invitelog_channel_${guild.id}` }).lean().catch(() => null))?.value;
    if (!logChId) {
      logChId = (await MetaText.findOne({ key: `stafflog_channel_${guild.id}` }).lean().catch(() => null))?.value;
    }
    if (!logChId) return false;

    const alertChannel = guild.channels.cache.get(logChId) || await guild.channels.fetch(logChId).catch(() => null);
    if (!alertChannel?.isTextBased()) return false;

    // Whitelist checks
    const member = message.member || await guild.members.fetch(message.author.id).catch(() => null);
    if (!member) return false;

    let isWhitelisted = false;
    let whitelistReason = "";

    // 1. Staff / Admin bypass (ManageMessages or Administrator or Bot Owner)
    if (isBotOwner(message.author.id) || hasPerm(member, PermissionsBitField.Flags.ManageMessages) || hasPerm(member, PermissionsBitField.Flags.Administrator)) {
      isWhitelisted = true;
      whitelistReason = "Staff / Admin";
    }

    // 2. Whitelisted Users
    const wlUsersDoc = await MetaText.findOne({ key: `invitelog_wl_users_${guild.id}` }).lean().catch(() => null);
    const wlUsers = Array.isArray(wlUsersDoc?.value) ? wlUsersDoc.value : [];
    if (wlUsers.includes(message.author.id)) {
      isWhitelisted = true;
      whitelistReason = "Whitelisted User";
    }

    // 3. Whitelisted Roles
    const wlRolesDoc = await MetaText.findOne({ key: `invitelog_wl_roles_${guild.id}` }).lean().catch(() => null);
    const wlRoles = Array.isArray(wlRolesDoc?.value) ? wlRolesDoc.value : [];
    if (member.roles.cache.some(r => wlRoles.includes(r.id))) {
      isWhitelisted = true;
      whitelistReason = "Whitelisted Role";
    }

    // 4. Whitelisted Channels
    const wlChannelsDoc = await MetaText.findOne({ key: `invitelog_wl_channels_${guild.id}` }).lean().catch(() => null);
    const wlChannels = Array.isArray(wlChannelsDoc?.value) ? wlChannelsDoc.value : [];
    if (wlChannels.includes(message.channel.id)) return false;

    // 4.5. Temporary Whitelists (User, Role, Channel, Link)
    const tempWlDoc = await MetaText.findOne({ key: `invitelog_wl_temp_${guild.id}` }).lean().catch(() => null);
    const tempWlList = Array.isArray(tempWlDoc?.value) ? tempWlDoc.value : [];
    const nowMs = Date.now();
    const activeTempWl = tempWlList.filter(item => item.expire_at > nowMs);
    if (activeTempWl.length !== tempWlList.length) {
      await MetaText.updateOne({ key: `invitelog_wl_temp_${guild.id}` }, { $set: { value: activeTempWl } }).catch(() => null);
    }

    for (const item of activeTempWl) {
      const remainingMin = Math.ceil((item.expire_at - nowMs) / 60000);
      if (item.type === "user" && item.target === message.author.id) {
        isWhitelisted = true;
        whitelistReason = `Temp Whitelisted User (${remainingMin}m)`;
      } else if (item.type === "role" && member.roles.cache.has(item.target)) {
        isWhitelisted = true;
        whitelistReason = `Temp Whitelisted Role (${remainingMin}m)`;
      } else if (item.type === "channel" && item.target === message.channel.id) {
        return false;
      }
    }

    // 5. Allowed Server Invites / Vanity URL
    const allowedLinksDoc = await MetaText.findOne({ key: `invitelog_allowed_links_${guild.id}` }).lean().catch(() => null);
    const allowedLinks = Array.isArray(allowedLinksDoc?.value) ? allowedLinksDoc.value.map(l => l.toLowerCase()) : [];
    const vanityCode = guild.vanityURLCode?.toLowerCase();

    let containsUnauthorizedInvite = false;
    let detectedInviteCode = "";

    for (const match of matches) {
      const code = (match[1] || "").toLowerCase();
      if (!code) continue;
      if (vanityCode && code === vanityCode) continue;
      if (allowedLinks.includes(code)) continue;
      if (activeTempWl.some(i => i.type === "link" && i.target.toLowerCase() === code)) continue;

      containsUnauthorizedInvite = true;
      detectedInviteCode = match[0];
      break;
    }

    if (!containsUnauthorizedInvite) return false;

    // Check auto delete setting (default: on)
    const autoDeleteDoc = await MetaText.findOne({ key: `invitelog_autodelete_${guild.id}` }).lean().catch(() => null);
    const shouldAutoDelete = !isWhitelisted && (autoDeleteDoc?.value !== "off");

    if (shouldAutoDelete) {
      await message.delete().catch(() => null);
    }

    // Spam Raid Tracker Check (3x invite links in 60s -> 1 Hour Timeout)
    let isSpamRaidTimeout = false;
    if (!isWhitelisted) {
      const trackerKey = `${guild.id}_${message.author.id}`;
      const now = Date.now();
      const userTimestamps = (inviteSpamTracker.get(trackerKey) || []).filter(ts => now - ts < 60000);
      userTimestamps.push(now);
      inviteSpamTracker.set(trackerKey, userTimestamps);

      if (userTimestamps.length >= 3) {
        isSpamRaidTimeout = true;
        inviteSpamTracker.delete(trackerKey);
        await member.timeout(3600000, "Anti-Invite Spam Raid Auto-Timeout (3x invites in 60s)").catch(() => null);
      }
    }

    // Status message label
    let statusMsgText = "";
    if (isWhitelisted) {
      statusMsgText = `🟢 *Pesan Dibiarkan (${whitelistReason})*`;
    } else if (isSpamRaidTimeout) {
      statusMsgText = "🚨 **Otomatis Dihapus & Member Di-Timeout 1 Jam (Spam Raid Detected)**";
    } else if (shouldAutoDelete) {
      statusMsgText = "🗑️ *Otomatis Dihapus (Auto-Deleted)*";
    } else {
      statusMsgText = "🚨 *Pesan Dibiarkan (Warning Only)*";
    }

    // Fetch invite details to get target server name & member count risk assessment
    let targetServerName = "Tidak dapat memuat info (Invite kadaluarsa / invalid)";
    let riskBadge = "🔴 **High Risk / Invalid Invite**";
    let memberDetails = "Invite kadaluarsa atau server tidak ditemukan";

    try {
      const cleanCodeMatch = detectedInviteCode.match(/(?:discord\.(?:gg|io|me|li|app)|discord\.com\/invite)\/([a-zA-Z0-9_-]+)/i);
      const rawCode = cleanCodeMatch ? cleanCodeMatch[1] : detectedInviteCode;
      if (rawCode) {
        const inv = await message.client.fetchInvite(rawCode).catch(() => null);
        if (inv && inv.guild) {
          targetServerName = `${inv.guild.name} (ID: ${inv.guild.id})`;
          const totalMembers = inv.memberCount || 0;
          const onlineMembers = inv.presenceCount || 0;
          const memStr = totalMembers > 0 ? `${totalMembers.toLocaleString()} Members (${onlineMembers.toLocaleString()} Online)` : "Tidak diketahui";

          if (inv.guild.verified || inv.guild.partnered || totalMembers >= 100) {
            riskBadge = "🟢 **Low Risk (Public Community)**";
          } else if (totalMembers >= 10) {
            riskBadge = "🟡 **Medium Risk (Small Community)**";
          } else {
            riskBadge = "🔴 **High Risk (Suspicious / Alt Server)**";
          }
          memberDetails = memStr;
        }
      }
    } catch { }

    // Send Alert Card to Invite Log Channel
    const nowTs = Math.floor(Date.now() / 1000);
    const snippet = message.content.length > 800 ? message.content.slice(0, 800) + "..." : message.content;

    const alertContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(isWhitelisted ? "# ✅ DETEKSI LINK INVITE (WHITELIST MEMBER)" : (isSpamRaidTimeout ? "# 🚨 SPAM RAID DETECTED — MEMBER DI-TIMEOUT 1 JAM" : "# 🚨 DETEKSI LINK INVITE SERVER LAIN")),
        new TextDisplayBuilder().setContent(
          [
            `▸ **Pengirim (User):** <@${message.author.id}> (\`@${message.author.username}\`)`,
            `▸ **User ID:** \`${message.author.id}\``,
            `▸ **Channel:** <#${message.channel.id}> (\`#${message.channel.name}\`)`,
            `▸ **Target Server:** \`${targetServerName}\``,
            `▸ **Risk Level & Size:** ${riskBadge} — \`${memberDetails}\``,
            `▸ **Link Dideteksi:** \`${detectedInviteCode}\``,
            `▸ **Status Pesan:** ${statusMsgText}`,
            "",
            "**Isi Pesan Snippet:**",
            `\`\`\`text\n${snippet}\n\`\`\``,
          ].join("\n")
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Mystral • Invite Link Security Log • <t:${nowTs}:R>`)
      );

    const sentV2 = await alertChannel.send({
      components: [alertContainer],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    }).catch(() => null);

    // Fallback if Components V2 payload fails
    if (!sentV2) {
      const fallbackEmbed = new EmbedBuilder()
        .setColor(isWhitelisted ? 0x2ecc71 : 0xe74c3c)
        .setTitle(isWhitelisted ? "✅ DETEKSI LINK INVITE (WHITELIST MEMBER)" : (isSpamRaidTimeout ? "🚨 SPAM RAID DETECTED — MEMBER DI-TIMEOUT 1 JAM" : "🚨 DETEKSI LINK INVITE SERVER LAIN"))
        .setDescription(
          [
            `▸ **Pengirim (User):** <@${message.author.id}> (\`@${message.author.username}\`)`,
            `▸ **User ID:** \`${message.author.id}\``,
            `▸ **Channel:** <#${message.channel.id}> (\`#${message.channel.name}\`)`,
            `▸ **Target Server:** \`${targetServerName}\``,
            `▸ **Risk Level & Size:** ${riskBadge} — \`${memberDetails}\``,
            `▸ **Link Dideteksi:** \`${detectedInviteCode}\``,
            `▸ **Status Pesan:** ${statusMsgText}`,
            "",
            "**Isi Pesan Snippet:**",
            `\`\`\`text\n${snippet}\n\`\`\``,
          ].join("\n")
        )
        .setFooter({ text: "Mystral • Invite Link Security Log" })
        .setTimestamp();

      await alertChannel.send({ embeds: [fallbackEmbed], allowedMentions: { parse: [] } }).catch(err => console.error("[INVITE LOG FALLBACK ERR]", err));
    }

    return true;
  } catch (err) {
    console.error("[INVITE LINK DETECT FAIL]", err);
    return false;
  }
}

// Helper: Check if staff action matches configured role filter
async function isActionAllowedByStaffLogRoleFilter(guild, executorUser = null, targetRoles = [], targetMember = null) {
  try {
    // 0. Ignore automated bot actions (Arcane, Carl-bot, Dyno, etc.)
    if (executorUser && executorUser.bot) return false;

    const filterDoc = await MetaText.findOne({ key: `stafflog_roles_${guild.id}` }).lean().catch(() => null);
    const filterRoleIds = Array.isArray(filterDoc?.value) ? filterDoc.value : [];
    if (!filterRoleIds.length) return true; // Default: allow all human staff if no filter configured

    if (executorUser) {
      const execMember = guild.members.cache.get(executorUser.id) || await guild.members.fetch(executorUser.id).catch(() => null);
      if (execMember) {
        if (filterRoleIds.some(rId => execMember.roles.cache.has(rId))) return true;
        if (isBotOwner(executorUser.id) || hasPerm(execMember, PermissionsBitField.Flags.Administrator) || hasPerm(execMember, PermissionsBitField.Flags.ManageRoles)) {
          return true;
        }
      }
    }

    if (targetRoles && targetRoles.length > 0) {
      if (targetRoles.some(rId => filterRoleIds.includes(typeof rId === "string" ? rId : rId.id))) {
        return true;
      }
    }

    if (targetMember) {
      if (filterRoleIds.some(rId => targetMember.roles.cache.has(rId))) {
        return true;
      }
    }

    // If executor is not resolved from audit log, log it by default
    if (!executorUser) return true;

    return false;
  } catch {
    return true;
  }
}

// ===================== STAFF ACTION & MODERATION LOG SYSTEM =====================
async function sendStaffLogEntry(guild, title, detailsArray) {
  try {
    if (!guild) return;

    const toggleDoc = await MetaText.findOne({ key: `stafflog_enabled_${guild.id}` }).lean().catch(() => null);
    if (toggleDoc?.value === "off") return;

    const chDoc = await MetaText.findOne({ key: `stafflog_channel_${guild.id}` }).lean().catch(() => null);
    if (!chDoc?.value) return;

    const logCh = guild.channels.cache.get(chDoc.value) || await guild.channels.fetch(chDoc.value).catch(() => null);
    if (!logCh?.isTextBased()) return;

    const nowTs = Math.floor(Date.now() / 1000);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## ${title}`),
        new TextDisplayBuilder().setContent(detailsArray.join("\n"))
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Mystral • Staff Action & Moderation Log • <t:${nowTs}:R>`)
      );

    const sentV2 = await logCh.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    }).catch(() => null);

    // Fallback if Components V2 payload fails
    if (!sentV2) {
      const fallbackEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(title)
        .setDescription(detailsArray.join("\n"))
        .setFooter({ text: "Staff Action & Moderation Log" })
        .setTimestamp();

      await logCh.send({ embeds: [fallbackEmbed], allowedMentions: { parse: [] } }).catch(err => console.error("[STAFF LOG FALLBACK ERR]", err));
    }
  } catch (err) {
    console.error("[STAFF LOG SEND FAIL]", err);
  }
}

// Helper: blend two HEX colors (50% mix) for Discord role color
function blendColors(hex1, hex2) {
  try {
    const c1 = parseInt(hex1.replace("#", ""), 16);
    const c2 = parseInt(hex2.replace("#", ""), 16);

    const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
    const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;

    const r = Math.round((r1 + r2) / 2);
    const g = Math.round((g1 + g2) / 2);
    const b = Math.round((b1 + b2) / 2);

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  } catch {
    return hex1;
  }
}

// Helper: get/set booster custom role position config
async function getBoosterRolePosition(guild) {
  const doc = await MetaText.findOne({ key: `booster_role_below_${guild.id}` }).lean().catch(() => null);
  return doc?.value || null; // role ID that booster roles go below
}

async function buildBoosterRewardEmbed(member) {
  const guild = member.guild;
  const boostCount = guild.premiumSubscriptionCount || 0;

  // Custom role channel if configured
  const customRoleChDoc = await MetaText.findOne({ key: `booster_custom_role_channel_${guild.id}` }).lean().catch(() => null);
  const customRoleChText = customRoleChDoc?.value ? `<#${customRoleChDoc.value}>` : "<#1459524453816860816>";

  // Custom Title
  const titleDoc = await MetaText.findOne({ key: `booster_announcement_title_${guild.id}` }).lean().catch(() => null);
  const titleText = titleDoc?.value || "✨ Booster Rewards";

  // Custom Message
  const msgDoc = await MetaText.findOne({ key: `booster_announcement_msg_${guild.id}` }).lean().catch(() => null);
  let defaultMsg = [
    `**${guild.name}** currently has **${boostCount}** boosts!`,
    "",
    `Terima kasih telah mendukung **${guild.name}** melalui Server Boost! <a:Nitro:1446372229683216576>`,
    `Kamu sekarang mendapatkan **Custom Role**, akses ke ${customRoleChText}, dan berbagai **Booster Perks**. Enjoy! <:a1_heart:1510056894889463969>`,
    "",
    `> 💡 Gunakan command \`cmyrole\` untuk mengubah warna, icon, dan nama role custom milikmu!`,
  ].join("\n");



  let descText = msgDoc?.value || defaultMsg;

  // Replace placeholders
  descText = descText
    .replace(/{user}/gi, `<@${member.id}>`)
    .replace(/{username}/gi, member.user.username)
    .replace(/{displayName}/gi, member.displayName)
    .replace(/{guild}/gi, guild.name)
    .replace(/{server}/gi, guild.name)
    .replace(/{boosts}/gi, String(boostCount))
    .replace(/{count}/gi, String(boostCount))
    .replace(/{rolechannel}/gi, customRoleChText);

  const avatarUrl = member.displayAvatarURL({ extension: "png", size: 512 });

  const embed = new EmbedBuilder()
    .setAuthor({
      name: member.user.username,
      iconURL: member.displayAvatarURL({ extension: "png", size: 128 }),
    })
    .setTitle(titleText)
    .setColor(0xF0B3FF)
    .setThumbnail(avatarUrl)
    .setDescription(descText)
    .setFooter({
      text: `${member.user.username} just dropped a Server Boost! 🚀`,
      iconURL: "https://cdn.discordapp.com/emojis/922572992372944946.gif",
    })
    .setTimestamp();

  return embed;
}

async function handleBoosterJoin(member) {
  try {
    const guild = member.guild;
    // Role is NOT created automatically here anymore.
    // Booster can manually claim their role using `cmyrole claim <nama_role>`.

    // Check if booster announcement is enabled
    const toggleDoc = await MetaText.findOne({ key: `booster_announcement_enabled_${guild.id}` }).lean().catch(() => null);
    const isEnabled = toggleDoc?.value !== "off";

    if (isEnabled) {
      // Log to booster log channel if configured (or system channel fallback)
      const logChId = await MetaText.findOne({ key: `booster_log_channel_${guild.id}` }).lean().catch(() => null);
      const logCh = (logChId?.value ? guild.channels.cache.get(logChId.value) : null) || guild.systemChannel;
      if (logCh?.isTextBased()) {
        const embed = await buildBoosterRewardEmbed(member);
        await logCh.send({
          content: `🎉 Terima kasih atas boost-nya, <@${member.id}>!`,
          embeds: [embed],
          allowedMentions: { users: [member.id] },
        }).catch(() => null);
      }
    }

    console.log(`[BOOSTER ROLE] Created role '${roleName}' for ${member.user.tag}`);
  } catch (err) {
    console.error("[BOOSTER ROLE JOIN ERROR]", err);
  }
}



async function handleBoosterLeave(member) {
  try {
    const guild = member.guild;
    const doc = await BoosterCustomRole.findOne({ user_id: member.id, guild_id: guild.id }).lean().catch(() => null);
    if (!doc) return;

    // Delete the role from Discord
    const role = guild.roles.cache.get(doc.role_id);
    if (role) {
      await role.delete(`Booster stopped: ${member.user.tag}`).catch(() => null);
    }

    // Remove from DB
    await BoosterCustomRole.deleteOne({ user_id: member.id, guild_id: guild.id }).catch(() => null);

    // Log
    const logChId = await MetaText.findOne({ key: `booster_log_channel_${guild.id}` }).lean().catch(() => null);
    if (logChId?.value) {
      const logCh = guild.channels.cache.get(logChId.value);
      if (logCh?.isTextBased()) {
        logCh.send({
          content: `🗑️ Custom role <@${member.id}> telah dihapus karena tidak lagi boost server.`,
          allowedMentions: { parse: [] },
        }).catch(() => null);
      }
    }

    console.log(`[BOOSTER ROLE] Deleted role for ${member.user.tag} (stopped boosting)`);
  } catch (err) {
    console.error("[BOOSTER ROLE LEAVE ERROR]", err);
  }
}

// ===================== STAFF PANEL & STAFF PROFILE SYSTEM =====================
async function buildStaffDirectoryContainer(guild, filterOption = "all") {
  const rolesDoc = await MetaText.findOne({ key: `staffpanel_roles_${guild.id}` }).lean().catch(() => null);
  let configuredRoles = Array.isArray(rolesDoc?.value) ? rolesDoc.value : [];

  if (!configuredRoles.length) {
    const staffTagCfg = await StaffTagConfig.findOne({ guild_id: guild.id }).lean().catch(() => null);
    if (staffTagCfg?.staff_role_id) {
      const rObj = guild.roles.cache.get(staffTagCfg.staff_role_id);
      if (rObj) configuredRoles.push({ role_id: rObj.id, label: rObj.name });
    }
    if (!configuredRoles.length) {
      const adminRoles = guild.roles.cache.filter(r =>
        !r.managed && r.id !== guild.id && (
          hasPerm(r, PermissionsBitField.Flags.Administrator) ||
          hasPerm(r, PermissionsBitField.Flags.ManageGuild) ||
          hasPerm(r, PermissionsBitField.Flags.ManageRoles) ||
          hasPerm(r, PermissionsBitField.Flags.ManageMessages) ||
          hasPerm(r, PermissionsBitField.Flags.ModerateMembers)
        )
      ).sort((a, b) => b.position - a.position);

      adminRoles.forEach(r => {
        configuredRoles.push({ role_id: r.id, label: r.name });
      });
    }
  }

  const excludedDoc = await MetaText.findOne({ key: `staffpanel_excluded_${guild.id}` }).lean().catch(() => null);
  const excludedIds = Array.isArray(excludedDoc?.value) ? excludedDoc.value : [];

  await guild.members.fetch({ withPresences: true }).catch(() => guild.members.fetch().catch(() => null));

  function getMemberPresenceStatus(m) {
    const p = m.presence || guild.presences.cache.get(m.id);
    return p?.status || "offline";
  }

  const uniqueStaffSet = new Set();
  let activeDivisionsCount = 0;
  const roleSections = [];

  const selectOptions = [
    { label: "🌐 Tampilkan Semua Divisi", value: "all", default: filterOption === "all" },
    { label: "🟢 Hanya Staff Online", value: "online_only", default: filterOption === "online_only" }
  ];

  for (const item of configuredRoles) {
    const roleId = typeof item === "string" ? item : item.role_id;
    const roleLabel = (typeof item === "object" && item.label) ? item.label : null;
    const role = guild.roles.cache.get(roleId);
    if (!role) continue;

    if (selectOptions.length < 25) {
      selectOptions.push({
        label: `📌 ${role.name}`,
        value: `role:${role.id}`,
        description: (roleLabel || role.name).slice(0, 50),
        default: filterOption === `role:${role.id}`
      });
    }

    if (filterOption.startsWith("role:") && filterOption !== `role:${role.id}`) {
      continue;
    }

    let members = role.members
      .filter(m => !m.user.bot && !excludedIds.includes(m.id))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    if (filterOption === "online_only") {
      members = members.filter(m => {
        const st = getMemberPresenceStatus(m);
        return st && st !== "offline";
      });
    }

    if (!members.size) continue;

    activeDivisionsCount++;
    const memberLines = [];
    members.forEach(m => {
      uniqueStaffSet.add(m.id);
      const pStatus = getMemberPresenceStatus(m);
      const isOnline = pStatus !== "offline";
      const statusEmoji = isOnline ? "<a:open:1523182738054713424>" : "<a:close:1523182754454306967>";
      const rawUser = m.user?.username;
      const usernameText = rawUser ? `@${rawUser}` : `@${m.displayName || "staff"}`;
      memberLines.push(`└─ ${statusEmoji} <@${m.id}> (\`${usernameText}\`)`);
    });

    const headerTitle = roleLabel ? `✧ . <@&${role.id}> - ${roleLabel}` : `✧ . <@&${role.id}>`;
    roleSections.push(`${headerTitle}\n${memberLines.join("\n")}`);
  }

  const totalStaffCount = uniqueStaffSet.size;
  const nowTs = Math.floor(Date.now() / 1000);

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("✦ . **MYSTRAL DIRECTORY**\n*Real-time monitoring of staff availability and server presence.*"),
      new TextDisplayBuilder().setContent(
        [
          `📊 . **METRICS**`,
          `└─ Staff: \`${totalStaffCount}\` . Divisions: \`${activeDivisionsCount}/${configuredRoles.length}\``,
          `------------------------------------`
        ].join("\n")
      )
    );

  if (roleSections.length > 0) {
    for (const section of roleSections) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(section.slice(0, 3990))
      );
    }
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("*Tidak ada staff terdeteksi untuk kriteria filter ini (`cstaffpanel addrole @Role [Label]`).*")
    );
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        "------------------------------------",
        "<a:open:1523182738054713424> **Online/Active** . <a:close:1523182754454306967> **Offline**"
      ].join("\n")
    )
  );

  const profileBtn = new ButtonBuilder()
    .setCustomId("staffpanel:myprofile")
    .setLabel("👤 My Staff Profile")
    .setStyle(ButtonStyle.Primary);

  const btnRow = new ActionRowBuilder().addComponents(profileBtn);

  const filterSelect = new StringSelectMenuBuilder()
    .setCustomId("staffpanel:filter_division")
    .setPlaceholder("🔍 Filter Tampilan Divisi Staff...")
    .addOptions(selectOptions);

  const selectRow = new ActionRowBuilder().addComponents(filterSelect);

  container
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(selectRow)
    .addActionRowComponents(btnRow)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`Mystral Staff Directory • Last Updated <t:${nowTs}:R>`)
    );

  return container;
}

async function updateStaffPanelMessage(guild) {
  try {
    const chDoc = await MetaText.findOne({ key: `staffpanel_channel_${guild.id}` }).lean().catch(() => null);
    const msgDoc = await MetaText.findOne({ key: `staffpanel_message_${guild.id}` }).lean().catch(() => null);
    if (chDoc?.value && msgDoc?.value) {
      const channel = guild.channels.cache.get(chDoc.value);
      if (channel) {
        const msg = await channel.messages.fetch(msgDoc.value).catch(() => null);
        if (msg) {
          const container = await buildStaffDirectoryContainer(guild);
          await msg.edit({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } }).catch(() => null);
        }
      }
    }
  } catch (err) {
    console.error("[UPDATE STAFF PANEL ERROR]", err);
  }
}

// Automatic real-time Staff Directory Panel refresh when staff presence changes
const presenceDebounceMap = new Map();

client.on(Events.PresenceUpdate, async (oldPresence, newPresence) => {
  try {
    if (!newPresence || !newPresence.guild) return;
    const guild = newPresence.guild;

    const rolesDoc = await MetaText.findOne({ key: `staffpanel_roles_${guild.id}` }).lean().catch(() => null);
    const configuredRoles = Array.isArray(rolesDoc?.value) ? rolesDoc.value : [];
    if (!configuredRoles.length) return;

    const member = newPresence.member || await guild.members.fetch(newPresence.userId).catch(() => null);
    if (!member) return;

    const isStaffMember = configuredRoles.some(item => {
      const rId = typeof item === "string" ? item : item.role_id;
      return member.roles.cache.has(rId);
    });

    if (!isStaffMember) return;

    if (presenceDebounceMap.has(guild.id)) {
      clearTimeout(presenceDebounceMap.get(guild.id));
    }

    const timer = setTimeout(() => {
      presenceDebounceMap.delete(guild.id);
      updateStaffPanelMessage(guild).catch(() => null);
    }, 5000);

    presenceDebounceMap.set(guild.id, timer);
  } catch (err) {
    console.error("[PRESENCE UPDATE STAFF PANEL ERROR]", err);
  }
});

async function buildStaffProfileContainer(member) {
  const guild = member.guild;
  const user = member.user;
  await guild.members.fetch(user.id).catch(() => null);

  const joinedTs = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
  const createdTs = Math.floor(user.createdTimestamp / 1000);

  const pStatus = member.presence?.status || "offline";
  let statusText = "⚪ Offline";
  if (pStatus === "online") statusText = "🟢 Online";
  else if (pStatus === "idle") statusText = "🌙 Idle (AFK)";
  else if (pStatus === "dnd") statusText = "🔴 Do Not Disturb";

  const rolesDoc = await MetaText.findOne({ key: `staffpanel_roles_${guild.id}` }).lean().catch(() => null);
  const configuredRoles = Array.isArray(rolesDoc?.value) ? rolesDoc.value : [];

  const memberDivisions = [];
  for (const item of configuredRoles) {
    const rId = typeof item === "string" ? item : item.role_id;
    const rLabel = (typeof item === "object" && item.label) ? item.label : null;
    if (member.roles.cache.has(rId)) {
      memberDivisions.push(rLabel ? `<@&${rId}> - **${rLabel}**` : `<@&${rId}>`);
    }
  }
  const divisionText = memberDivisions.length ? memberDivisions.join(" • ") : "*(Belum terdaftar di divisi)*";

  const staffRoles = member.roles.cache
    .filter(r => r.id !== guild.id && !r.managed)
    .sort((a, b) => b.position - a.position)
    .map(r => `<@&${r.id}>`);

  const notesDoc = await MetaText.findOne({ key: `staff_notes_${guild.id}_${user.id}` }).lean().catch(() => null);
  const notesCount = Array.isArray(notesDoc?.value) ? notesDoc.value.length : 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const dutyDoc = await StaffTagSchedule.findOne({ guild_id: guild.id, date_key: todayStr, assigned_user_id: user.id }).lean().catch(() => null);
  let dutyText = "⚪ Tidak Ada Tugas Hari Ini";
  if (dutyDoc) {
    const statusLabel = dutyDoc.status === "completed" ? "🟢 Selesai (Completed)" :
      dutyDoc.status === "busy" ? "🔴 Berhalangan (Busy)" :
        dutyDoc.status === "taken_over" ? "🔄 Diambil Alih" : "⏳ Menunggu Tugas";
    dutyText = `Slot ${dutyDoc.slot} — ${statusLabel}`;
  }

  const nowTs = Math.floor(Date.now() / 1000);
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## 👤 STAFF IDENTITY CARD — ${user.username}`),
      new TextDisplayBuilder().setContent(
        [
          `▸ **Pengguna:** <@${user.id}> (\`${user.tag}\`)`,
          `▸ **Server Nickname:** \`${member.displayName}\``,
          `▸ **User ID:** \`${user.id}\``,
          `▸ **Status Kehadiran:** ${statusText}`,
          `▸ **Divisi Staff:** ${divisionText}`,
          `▸ **Bergabung Server:** ${joinedTs ? `<t:${joinedTs}:F> (<t:${joinedTs}:R>)` : "*Tidak Diketahui*"}`,
          `▸ **Akun Dibuat:** <t:${createdTs}:F> (<t:${createdTs}:R>)`,
          "",
          "**Role Server Staff:**",
          staffRoles.length ? staffRoles.slice(0, 8).join(" • ") : "*(tidak ada role)*",
          "",
          "**Statistik Activity & Duty:**",
          `• **Status Tag Duty Hari Ini:** ${dutyText}`,
          `• **Total Catatan Staff (Notes):** \`${notesCount}\` Catatan`,
        ].join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`Mystral Staff Profile • Identity Card • <t:${nowTs}:R>`)
    );

  return container;
}

async function sendCommandLogToThread(client, user, commandText, channel, isSlash = false) {
  try {
    const threadId = "1538099675528306759";
    const thread = client.channels.cache.get(threadId) || await client.channels.fetch(threadId).catch(() => null);
    if (thread && thread.isTextBased()) {
      const typeLabel = isSlash ? "Slash Command" : "Prefix Command";
      const ts = Math.floor(Date.now() / 1000);
      const cleanCmd = (commandText || "").length > 200 ? commandText.slice(0, 197) + "..." : (commandText || "");
      const logLine = `📝 **${typeLabel} Log** • User <@${user.id}> (\`@${user.username}\`) menggunakan \`${cleanCmd}\` di channel <#${channel?.id || "unknown"}> (<t:${ts}:R>).`;
      await thread.send({ content: logLine, allowedMentions: { parse: [] } }).catch(() => null);
    }
  } catch (err) {
    console.error("[COMMAND THREAD LOG FAIL]", err);
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand?.() || interaction.isCommand?.()) {
      await sendCommandLogToThread(client, interaction.user, `/${interaction.commandName}`, interaction.channel, true);
    }

    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
    const customId = interaction.customId || "";

    if (customId === "staffpanel:filter_division") {
      await interaction.deferReply({ ephemeral: true }).catch(() => null);
      const selectedValue = interaction.values?.[0] || "all";
      const container = await buildStaffDirectoryContainer(interaction.guild, selectedValue);
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true, allowedMentions: { parse: [] } }).catch(() => null);
    } else if (customId === "staffpanel:myprofile") {
      const container = await buildStaffProfileContainer(interaction.member);
      await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true, allowedMentions: { parse: [] } }).catch(() => null);
    } else if (customId === "myrole:apply_palette") {
      await interaction.deferReply({ ephemeral: true }).catch(() => null);
      const selectedHex = interaction.values?.[0] || "3498DB";
      const member = interaction.member;
      const boostRoleDoc = await BoosterCustomRole.findOne({ guild_id: interaction.guild.id, user_id: member.id }).lean().catch(() => null);
      if (!boostRoleDoc?.role_id) {
        return interaction.editReply("❌ Kamu belum memiliki Custom Role Booster. Buat terlebih dahulu dengan `cmyrole create <NamaRole> #${selectedHex}`!").catch(() => null);
      }
      const role = interaction.guild.roles.cache.get(boostRoleDoc.role_id);
      if (!role) {
        return interaction.editReply("❌ Custom Role kamu tidak ditemukan di server.").catch(() => null);
      }
      await role.setColor(`#${selectedHex}`).catch(() => null);
      await BoosterCustomRole.updateOne({ guild_id: interaction.guild.id, user_id: member.id }, { $set: { hex_color: `#${selectedHex}` } }).catch(() => null);
      return interaction.editReply(`✅ Warna custom role **${role.name}** berhasil diubah ke \`#${selectedHex}\`! 🎨`).catch(() => null);
    }
  } catch (err) {
    console.error("[INTERACTION ERROR]", err);
  }
});

// Auto-Cron Presence Refresh (Every 5 minutes)
setInterval(async () => {
  try {
    if (!client.isReady()) return;
    for (const guild of client.guilds.cache.values()) {
      await updateStaffPanelMessage(guild).catch(() => null);
    }
  } catch (err) {
    console.error("[AUTO CRON STAFF PANEL ERROR]", err);
  }
}, 300000);

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  // Detect boost start/stop via premiumSince change
  const wasBooster = !!oldMember.premiumSince;
  const isBooster = !!newMember.premiumSince;

  if (!wasBooster && isBooster) {
    // Started boosting
    await handleBoosterJoin(newMember);
  } else if (wasBooster && !isBooster) {
    // Stopped boosting
    await handleBoosterLeave(newMember);
  }

  // ─── STAFF ACTION LOG (Role changes & Timeout) ───
  try {
    const guild = newMember.guild;

    // 1. Role Add / Remove
    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    if (addedRoles.size > 0 || removedRoles.size > 0) {
      let executor = null;
      let reason = null;
      try {
        const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 1 }).catch(() => null);
        const entry = logs?.entries?.first();
        if (entry && entry.target?.id === newMember.id && (Date.now() - entry.createdTimestamp < 30000)) {
          executor = entry.executor;
          reason = entry.reason;
        }
      } catch { }

      const targetRoleIds = [...addedRoles.keys(), ...removedRoles.keys()];
      const isAllowed = await isActionAllowedByStaffLogRoleFilter(guild, executor, targetRoleIds, newMember);

      if (isAllowed) {
        if (addedRoles.size > 0) {
          await sendStaffLogEntry(guild, "➕ Staff Action: Role Added", [
            `▸ **Staff (Executor):** ${executor ? `<@${executor.id}> (\`@${executor.username}\`)` : "*Direct / Bot*"}`,
            `▸ **Target User:** <@${newMember.id}> (\`@${newMember.user.username}\`)`,
            `▸ **Role Ditambahkan:** ${addedRoles.map(r => `<@&${r.id}>`).join(", ")}`,
          ]);
        }

        if (removedRoles.size > 0) {
          await sendStaffLogEntry(guild, "➖ Staff Action: Role Removed", [
            `▸ **Staff (Executor):** ${executor ? `<@${executor.id}> (\`@${executor.username}\`)` : "*Direct / Bot*"}`,
            `▸ **Target User:** <@${newMember.id}> (\`@${newMember.user.username}\`)`,
            `▸ **Role Ditarik:** ${removedRoles.map(r => `<@&${r.id}>`).join(", ")}`,
          ]);
        }
      }
    }

    // 2. Timeout (Communication Disabled)
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
    const newTimeout = newMember.communicationDisabledUntilTimestamp;

    if (!oldTimeout && newTimeout && newTimeout > Date.now()) {
      let executor = null;
      let reason = null;
      try {
        const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 1 }).catch(() => null);
        const entry = logs?.entries?.first();
        if (entry && entry.target?.id === newMember.id && (Date.now() - entry.createdTimestamp < 30000)) {
          executor = entry.executor;
          reason = entry.reason;
        }
      } catch { }

      const isAllowed = await isActionAllowedByStaffLogRoleFilter(guild, executor, [], newMember);
      if (isAllowed) {
        const untilTs = Math.floor(newTimeout / 1000);
        await sendStaffLogEntry(guild, "⏳ Staff Action: Member Timed Out", [
          `▸ **Staff (Executor):** ${executor ? `<@${executor.id}> (\`@${executor.username}\`)` : "*Direct / Bot*"}`,
          `▸ **Target User:** <@${newMember.id}> (\`@${newMember.user.username}\`)`,
          `▸ **Timeout Sampai:** <t:${untilTs}:F> (<t:${untilTs}:R>)`,
          `▸ **Alasan / Reason:** \`${reason || "Tidak ada alasan"}\``,
        ]);
      }
    } else if (oldTimeout && !newTimeout) {
      let executor = null;
      try {
        const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 1 }).catch(() => null);
        const entry = logs?.entries?.first();
        if (entry && entry.target?.id === newMember.id && (Date.now() - entry.createdTimestamp < 30000)) {
          executor = entry.executor;
        }
      } catch { }

      const isAllowed = await isActionAllowedByStaffLogRoleFilter(guild, executor, [], newMember);
      if (isAllowed) {
        await sendStaffLogEntry(guild, "🔓 Staff Action: Timeout Removed", [
          `▸ **Staff (Executor):** ${executor ? `<@${executor.id}> (\`@${executor.username}\`)` : "*Direct / Bot*"}`,
          `▸ **Target User:** <@${newMember.id}> (\`@${newMember.user.username}\`)`,
          `▸ **Status:** *Timeout telah dicabut / berakhir*`,
        ]);
      }
    }
  } catch (err) {
    console.error("[STAFF LOG MEMBER UPDATE FAIL]", err);
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  try {
    const guild = member.guild;
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 }).catch(() => null);
    const entry = logs?.entries?.first();

    if (entry && entry.target?.id === member.id && (Date.now() - entry.createdTimestamp < 30000)) {
      const isAllowed = await isActionAllowedByStaffLogRoleFilter(guild, entry.executor, [], member);
      if (isAllowed) {
        await sendStaffLogEntry(guild, "👢 Staff Action: Member Kicked", [
          `▸ **Staff (Executor):** <@${entry.executor.id}> (\`@${entry.executor.username}\`)`,
          `▸ **Target User:** <@${member.id}> (\`@${member.user.username}\`)`,
          `▸ **User ID:** \`${member.id}\``,
          `▸ **Alasan Kick:** \`${entry.reason || "Tidak ada alasan"}\``,
        ]);
      }
    }
  } catch (err) {
    console.error("[STAFF LOG KICK FAIL]", err);
  }
});

client.on(Events.GuildBanAdd, async (ban) => {
  try {
    const guild = ban.guild;
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }).catch(() => null);
    const entry = logs?.entries?.first();

    const executor = entry?.target?.id === ban.user.id ? entry.executor : null;
    const reason = ban.reason || entry?.reason || "Tidak ada alasan";

    const isAllowed = await isActionAllowedByStaffLogRoleFilter(guild, executor, []);
    if (isAllowed) {
      await sendStaffLogEntry(guild, "🔨 Staff Action: Member Banned", [
        `▸ **Staff (Executor):** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : "*Unknown Staff*"}`,
        `▸ **Target User:** <@${ban.user.id}> (\`${ban.user.tag}\`)`,
        `▸ **User ID:** \`${ban.user.id}\``,
        `▸ **Alasan Ban:** \`${reason}\``,
      ]);
    }
  } catch (err) {
    console.error("[STAFF LOG BAN FAIL]", err);
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
        await safeRun("DELETE FROM active_voice_sessions WHERE user_id = ?", [userId]).catch(() => null);
      }
      // Case 2: Joined VC or moved from AFK channel
      else if (!isOldValid && isNewValid) {
        voiceSessions.set(userId, now);
        await safeRun("INSERT OR REPLACE INTO active_voice_sessions (user_id, join_timestamp) VALUES (?, ?)", [userId, now]).catch(() => null);
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
        await safeRun("INSERT OR REPLACE INTO active_voice_sessions (user_id, join_timestamp) VALUES (?, ?)", [userId, now]).catch(() => null);
      }
    }
  } catch (err) {
    console.error("[VOICE] Error in VoiceStateUpdate tracking:", err);
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message || !message.guild || !message.channel || !message.author) return;

    // Sticky Message Trigger (placed BEFORE bot filter so sticky message re-posts after bot responses like Tarot reading embeds)
    const channelId = message.channel.id;
    if (stickyCache.has(channelId)) {
      const cache = stickyCache.get(channelId);
      // Ignore if this message IS the sticky message itself to avoid re-triggering loops
      const isStickyItself = cache && (
        (cache.lastMessageId && message.id === cache.lastMessageId) ||
        (message.author.id === client.user.id && message.content === cache.content)
      );

      if (!cache || isStickyItself) {
        // Do nothing
      } else {
        if (stickyDebounces.has(channelId)) {
          clearTimeout(stickyDebounces.get(channelId));
        }
        const timeoutId = setTimeout(async () => {
          // Wait for any active lock to release instead of returning and losing the update
          while (stickyLocks.has(channelId)) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          // If a newer debounce was scheduled in the meantime, abort this outdated one
          if (stickyDebounces.get(channelId) !== timeoutId) return;

          stickyDebounces.delete(channelId);
          stickyLocks.add(channelId);
          try {
            const currentCache = stickyCache.get(channelId);
            if (!currentCache) return;
            if (currentCache.lastMessageId) {
              const oldMsg = await message.channel.messages.fetch(currentCache.lastMessageId).catch(() => null);
              if (oldMsg) await oldMsg.delete().catch(() => null);
            }
            const sent = await message.channel.send({ content: currentCache.content }).catch(() => null);
            if (sent) {
              currentCache.lastMessageId = sent.id;
              await safeRun("UPDATE sticky_messages SET last_message_id=? WHERE channel_id=?", [sent.id, channelId]);
            }
          } finally {
            stickyLocks.delete(channelId);
          }
        }, 1200);
        stickyDebounces.set(channelId, timeoutId);
      }
    }

    if (message.author.bot) return;

    // Universal Media Embed Handler using local/global yt-dlp
    async function ensureYtDlp() {
      const isWin = process.platform === "win32";
      const binaryName = isWin ? "yt-dlp.exe" : "yt-dlp";
      const localPath = path.join(__dirname, binaryName);

      if (fs.existsSync(localPath)) {
        return localPath;
      }

      // Check if installed globally
      const { execSync } = require("child_process");
      try {
        execSync(isWin ? "where yt-dlp" : "which yt-dlp", { stdio: "ignore" });
        return "yt-dlp";
      } catch {
        // Auto-download binary appropriate for the hosting platform
        console.log(`[YT-DLP] Binary not found. Downloading for ${process.platform}...`);
        const url = isWin
          ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
          : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to download: ${res.statusText}`);
          const buffer = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(localPath, buffer);
          if (!isWin) {
            fs.chmodSync(localPath, "755"); // Set executable permissions on Linux/Pterodactyl
          }
          console.log(`[YT-DLP] Download complete: ${localPath}`);
          return localPath;
        } catch (err) {
          console.error("[YT-DLP DOWNLOAD ERROR]", err);
          return null;
        }
      }
    }

    async function downloadMedia(url) {
      // 1. Fast Tikwm API fallback for TikTok links
      if (url.includes("tiktok.com")) {
        try {
          const tikwmUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
          const tikRes = await fetch(tikwmUrl);
          if (tikRes.ok) {
            const tikData = await tikRes.json();
            const videoUrl = tikData?.data?.play || tikData?.data?.wmplay;
            if (videoUrl) {
              const vRes = await fetch(videoUrl);
              if (vRes.ok) {
                const arrayBuf = await vRes.arrayBuffer();
                return Buffer.from(arrayBuf);
              }
            }
          }
        } catch (tikErr) {
          console.error("[TIKTOK TIKWM DOWNLOAD ERROR]", tikErr);
        }
      }

      // 2. Local/Global yt-dlp binary
      const ytDlpPath = await ensureYtDlp();
      if (!ytDlpPath) return null;

      return new Promise((resolve) => {
        const { execFile } = require("child_process");
        const filename = `temp_media_${Date.now()}.mp4`;
        const outputPath = path.join(__dirname, filename);
        const formatArg = "b/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
        const ytArgs = ["--no-warnings", "--no-playlist", "-o", outputPath, "-f", formatArg, url];

        execFile(ytDlpPath, ytArgs, { maxBuffer: 50 * 1024 * 1024 }, (error) => {
          if (error) {
            console.error("[LOCAL YTDL DOWNLOAD ERROR]", error.message || error);
            if (fs.existsSync(outputPath)) {
              try { fs.unlinkSync(outputPath); } catch { }
            }
            resolve(null);
            return;
          }

          try {
            if (fs.existsSync(outputPath)) {
              const buffer = fs.readFileSync(outputPath);
              fs.unlinkSync(outputPath); // Delete temp file
              resolve(buffer);
            } else {
              resolve(null);
            }
          } catch (e) {
            console.error("[LOCAL YTDL READ/CLEANUP ERROR]", e);
            resolve(null);
          }
        });
      });
    }

    const mediaSettings = await getOrInitMediaSettings(message.guild.id);
    if (mediaSettings && mediaSettings.enabled) {
      const URL_REGEX = /(https?:\/\/[^\s]+)/gi;
      const urls = message.content.match(URL_REGEX);
      if (urls && urls.length > 0) {
        let hasConverted = false;
        let convertedText = message.content;
        const matchedPlatforms = new Set();
        let firstOriginalUrl = "";
        let firstPlatform = "";

        const fixedUrls = [];

        for (const rawUrl of urls) {
          let platform = "";
          let fixedUrl = rawUrl;

          // Check platforms
          if (/tiktok\.com/i.test(rawUrl)) {
            platform = "tiktok";
            const cleaned = rawUrl.split('?')[0];
            fixedUrl = cleaned.replace(/(?:www\.|vt\.|vm\.)?tiktok\.com/i, "d.tnktok.com");
          } else if (/instagram\.com\/(?:p|reel|tv|stories)/i.test(rawUrl)) {
            platform = "instagram";
            const cleaned = rawUrl.split('?')[0];
            fixedUrl = cleaned.replace(/(?:www\.)?instagram\.com/i, "ddinstagram.com");
          } else if (/(twitter|x)\.com\/[a-zA-Z0-9_]+\/status/i.test(rawUrl)) {
            platform = "twitter";
            const cleaned = rawUrl.split('?')[0];
            fixedUrl = cleaned.replace(/(?:www\.)?(?:twitter|x)\.com/i, "vxtwitter.com");
          } else if (/reddit\.com\/r\/[a-zA-Z0-9_]+\/comments/i.test(rawUrl)) {
            platform = "reddit";
            const cleaned = rawUrl.split('?')[0];
            fixedUrl = cleaned.replace(/(?:www\.|old\.)?reddit\.com/i, "rxddit.com");
          } else if (/threads\.net\/[@a-zA-Z0-9_.]+\/post/i.test(rawUrl)) {
            platform = "threads";
            const cleaned = rawUrl.split('?')[0];
            fixedUrl = cleaned.replace(/(?:www\.)?threads\.net/i, "fixthreads.net");
          } else if (/youtube\.com\/shorts/i.test(rawUrl)) {
            platform = "youtube";
            const cleaned = rawUrl.split('?')[0];
            fixedUrl = cleaned.replace(/(?:www\.)?youtube\.com/i, "ddyoutube.com");
          } else if (/youtube\.com\/watch/i.test(rawUrl) || /youtu\.be/i.test(rawUrl)) {
            platform = "youtube";
          } else if (/facebook\.com\/.*\/videos/i.test(rawUrl)) {
            platform = "facebook";
          } else if (/clips\.twitch\.tv/i.test(rawUrl) || /twitch\.tv\/.*\/clip/i.test(rawUrl)) {
            platform = "twitch";
          } else if (/kick\.com\/clip/i.test(rawUrl)) {
            platform = "kick";
          } else if (/bilibili\.com\/video/i.test(rawUrl)) {
            platform = "bilibili";
          } else if (/pinterest\.com\/pin/i.test(rawUrl)) {
            platform = "pinterest";
          } else if (/bsky\.app\/profile/i.test(rawUrl)) {
            platform = "bluesky";
          } else if (/imgur\.com/i.test(rawUrl)) {
            platform = "imgur";
          } else if (/streamable\.com/i.test(rawUrl)) {
            platform = "streamable";
          } else if (/vimeo\.com/i.test(rawUrl)) {
            platform = "vimeo";
          }

          if (platform) {
            const isPlatEnabled = mediaSettings.platforms && mediaSettings.platforms[platform] !== undefined ? mediaSettings.platforms[platform] : true;
            if (isPlatEnabled) {
              matchedPlatforms.add(platform);
              if (fixedUrl !== rawUrl) {
                convertedText = convertedText.replace(rawUrl, fixedUrl);
                hasConverted = true;
              }
              fixedUrls.push(fixedUrl);
              if (!firstOriginalUrl) {
                if (platform !== "youtube" || /shorts/i.test(rawUrl)) {
                  firstOriginalUrl = rawUrl.split('?')[0];
                } else {
                  firstOriginalUrl = rawUrl;
                }
                firstPlatform = platform;
              }
            } else {
              fixedUrls.push(rawUrl);
            }
          } else {
            fixedUrls.push(rawUrl);
          }
        }

        if (matchedPlatforms.size > 0) {
          const isNsfwChannel = message.channel.nsfw === true;
          const containsNsfwTerm = /nsfw|18\+|r18|porn/i.test(message.content);
          if (mediaSettings.nsfwFilter && !isNsfwChannel && containsNsfwTerm) {
            // Skip processing NSFW content in non-NSFW channel
          } else {
            const components = [];
            const buttons = [];

            if (firstOriginalUrl) {
              let platformLabel = "Open Original";
              if (firstPlatform === "tiktok") platformLabel = "Buka di TikTok";
              else if (firstPlatform === "instagram") platformLabel = "Buka di Instagram";
              else if (firstPlatform === "twitter") platformLabel = "Buka di X";
              else if (firstPlatform === "reddit") platformLabel = "Buka di Reddit";
              else if (firstPlatform === "threads") platformLabel = "Buka di Threads";
              else if (firstPlatform === "youtube") platformLabel = "Buka di YouTube";
              else if (firstPlatform === "facebook") platformLabel = "Buka di Facebook";
              else if (firstPlatform === "twitch") platformLabel = "Buka di Twitch";
              else if (firstPlatform === "kick") platformLabel = "Buka di Kick";
              else if (firstPlatform === "bilibili") platformLabel = "Buka di Bilibili";
              else if (firstPlatform === "pinterest") platformLabel = "Buka di Pinterest";
              else if (firstPlatform === "bluesky") platformLabel = "Buka di Bluesky";
              else if (firstPlatform === "imgur") platformLabel = "Buka di Imgur";
              else if (firstPlatform === "streamable") platformLabel = "Buka di Streamable";
              else if (firstPlatform === "vimeo") platformLabel = "Buka di Vimeo";

              const btn = new ButtonBuilder()
                .setLabel(platformLabel)
                .setStyle(ButtonStyle.Link)
                .setURL(firstOriginalUrl);

              const emojiId = getPlatformEmoji(message.guild, firstPlatform);
              if (emojiId) {
                btn.setEmoji(emojiId);
              } else {
                btn.setEmoji("🔗");
              }
              buttons.push(btn);
            }

            const dlUrl = getDownloadUrl(firstOriginalUrl);
            buttons.push(
              new ButtonBuilder()
                .setLabel("⬇ Download")
                .setStyle(ButtonStyle.Link)
                .setURL(dlUrl)
            );

            const row = new ActionRowBuilder().addComponents(buttons);

            const canDelete = message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages);

            // ── TRY DOWNLOADING VIA COBALT API FIRST ──
            let downloadedBuffer = null;
            if (firstOriginalUrl && (firstPlatform === "tiktok" || firstPlatform === "instagram" || firstPlatform === "twitter" || firstPlatform === "reddit" || firstPlatform === "youtube")) {
              downloadedBuffer = await downloadMedia(firstOriginalUrl);
            }

            if (downloadedBuffer) {
              const attachment = new AttachmentBuilder(downloadedBuffer, { name: `mystral_media_${Date.now()}.mp4` });

              if (mediaSettings.deleteOriginal && canDelete) {
                await message.delete().catch(() => null);
                // remove the link from the caption if we delete the original
                const captionOnly = message.content.replace(firstOriginalUrl, "").trim();
                const textPrefix = `Shared by ${message.author}`;
                const finalContent = captionOnly ? `${textPrefix}:\n${captionOnly}` : textPrefix;
                await message.channel.send({
                  content: finalContent,
                  files: [attachment],
                  components: [row],
                  allowedMentions: { parse: [] }
                });
              } else {
                await message.reply({
                  files: [attachment],
                  components: [row],
                  allowedMentions: { repliedUser: false }
                }).catch(() => null);
              }
            } else {
              // ── FALLBACK TO STANDARD LINK REDIRECTION (so embeds work) ──
              if (mediaSettings.deleteOriginal && canDelete) {
                await message.delete().catch(() => null);
                await message.channel.send({
                  content: `Shared by ${message.author}:\n\n${convertedText}`,
                  components: [row],
                  allowedMentions: { parse: [] }
                });
              } else {
                await message.reply({
                  content: fixedUrls.join("\n"),
                  components: [row],
                  allowedMentions: { repliedUser: false }
                }).catch(() => null);
              }
            }
          }
        }
      }
    }
    // Anti-Invite Link Alert Detector Check
    const isInviteHandled = await checkInviteLinkAlert(message);
    if (isInviteHandled) return;

    // ✅ ACTIVITY LOGGER (taruh di sini)
    const now = Date.now();
    const wib = new Date(now + 7 * 60 * 60 * 1000);
    const day = wib.toISOString().slice(0, 10); // YYYY-MM-DD (WIB)

    // AFK auto clear on any message
    const wasAfk = await getAfk(message.author.id, message.guild?.id);
    if (wasAfk) {
      await clearAfk(message.author.id, message.guild?.id);

      // balikin nickname (hapus prefix [AFK])
      const member = await message.guild.members.fetch(message.author.id).catch(() => null);
      if (member) {
        const current = member.nickname || message.author.username;
        const restored = stripAfkPrefix(current);
        // kalau restored kosong, reset nickname
        await trySetMemberNick(member, restored || null);
      }

      const welcomeBackMsg = await message
        .reply({
          content: `✅ welcome back <@${message.author.id}>! status AFK kamu sudah dihapus.`,
          allowedMentions: { repliedUser: false, parse: [] },
        })
        .catch(() => null);
      if (welcomeBackMsg) {
        setTimeout(() => welcomeBackMsg.delete().catch(() => { }), 15000);
      }
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

      // ===================== PREFIX: csetup-verif =====================
      if (cmd === "setup-verif" || cmd === "setupverif" || cmd === "verifpanel") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply("❌ Butuh Administrator.");
        }
        const panelCh = message.mentions.channels.find(c => c.type !== ChannelType.GuildCategory) || message.channel;
        const categoryCh = message.mentions.channels.find(c => c.type === ChannelType.GuildCategory);
        const staffRole = message.mentions.roles.first();

        if (categoryCh) {
          await MetaText.updateOne(
            { key: `verif_category_${message.guild.id}` },
            { $set: { value: String(categoryCh.id) } },
            { upsert: true }
          );
        }

        if (staffRole) {
          await MetaText.updateOne(
            { key: `verif_staff_role_${message.guild.id}` },
            { $set: { value: String(staffRole.id) } },
            { upsert: true }
          );
        }

        const payload = buildFemaleVerificationPanel();
        await panelCh.send(payload);
        const catInfo = categoryCh ? ` | Category: ${categoryCh.name}` : "";
        const roleInfo = staffRole ? ` | Staff: <@&${staffRole.id}>` : "";
        return message.reply(`✅ Panel verifikasi role cewe telah dikirim ke ${panelCh}${catInfo}${roleInfo}.`);
      }
    }


    // AFK notice on mentions
    if (message.mentions?.users?.size) {
      const lines = [];
      for (const [uid, user] of message.mentions.users) {
        if (user.bot) continue;
        const afk = await getAfk(uid, message.guild?.id);
        if (!afk) continue;

        const sinceUnix = Math.floor((Number(afk.since) || Date.now()) / 1000);
        lines.push(`• <@${uid}> sedang **AFK** — ${afk.reason} sejak <t:${sinceUnix}:R>`);
        if (lines.length >= 5) break;
      }
      if (lines.length) {
        await message
          .reply({
            content: `💤 **AFK Notice**\n${lines.join("\n")}`,
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

    await safeRun(
      `INSERT INTO activity_daily_channel (day, guild_id, channel_id, user_id, msg_count)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(day, guild_id, channel_id, user_id) DO UPDATE SET
         msg_count=activity_daily_channel.msg_count+1`,
      [day, message.guild?.id || "global", message.channel?.id || "global", message.author?.id || "unknown"]
    );

    if (await handleGuessNumberAttempt(message)) return;

    // ===================== ANTI-TOXIC =====================
    const ownerId = String(process.env.BOT_OWNER_ID || "");
    const ignoreRoleId = String(process.env.TOXIC_IGNORE_ROLE_ID || "").trim();
    const isToxicOwner = message.author.id === ownerId;
    const hasIgnoreRole = ignoreRoleId && message.member?.roles?.cache?.has(ignoreRoleId);

    if (!isToxicOwner && !hasIgnoreRole) {
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
              content: `⚠️ Kamu mendapatkan peringatan otomatis di server **${message.guild.name}** karena menggunakan kata terlarang: **${hit}**.\n*Pesan terdeteksi: "${safeText(message.content, 120)}"*`
            });
          } catch (e) {
            console.log(`[DM FAIL] Gagal mengirim DM ke ${message.author.tag}.`);
          }

          // 4. Kirim Reply di Channel (Hapus otomatis dalam 5 detik)
          const warnReply = message.channel ? await message.channel.send({
            content: `🛑 <@${message.author.id}>, pesan kamu telah dihapus dan peringatan otomatis telah dicatat karena menggunakan bahasa tidak pantas.`
          }).catch(() => null) : null;

          if (warnReply) setTimeout(() => warnReply.delete().catch(() => { }), 15000);
        }
      }
    }

    // Check autoresponses
    const handledByAR = await checkAutoresponses(message);
    if (handledByAR) return;

    // Check for pending confirmation
    const textClean = message.content.trim().toLowerCase();
    if (textClean === "confirm" || textClean === `${PREFIX} confirm` || textClean === `${PREFIX}confirm`) {
      const pending = pendingConfirmations.get(message.author.id);
      if (pending && Date.now() < pending.expires) {
        pendingConfirmations.delete(message.author.id);
        await pending.action();
        return;
      }
    }

    // Prefix check
    if (!message.content.startsWith(PREFIX)) return;

    // Log prefix command usage to thread
    await sendCommandLogToThread(client, message.author, message.content, message.channel, false);

    // Cukup deklarasikan variabel ini SATU KALI di sini
    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = args.shift()?.toLowerCase();
    const command = cmd; // alias biar blok bawah yang pakai "command" tetap jalan
    const isMod = message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers);

    const cleanInput = message.content.slice(PREFIX.length).trim();
    const handledByDMA = await handleDiscordManagementAssistant(message, cleanInput, cmd, args);
    if (handledByDMA) return;

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


    if (cmd === "welcometest") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("❌ Hanya Administrator yang dapat menggunakan perintah test ini.");
      }

      const member = message.member;
      const channel = message.channel;
      const memberCount = message.guild.memberCount;

      const welcomeText = buildWelcomeText(member, memberCount);

      const avatarUrl = member.displayAvatarURL({ extension: "png", size: 256 });
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
        `**${member.displayName}** has left Mystral.`,
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

    // ===================== LEADERBOARD SYSTEM (PREFIX) =====================
    if (cmd === "lb" || cmd === "leaderboard") {
      const sub = (args[0] || "").toLowerCase();

      if (sub === "angka" || sub === "tebakangka") {
        return handleTebakAngkaLeaderboard(client, message.guild.id, message, message.author.id);
      }

      if (sub === "lobby") {
        const action = (args[1] || "").toLowerCase();
        if (action === "add") {
          const isStaff = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageGuild);
          if (!isStaff) return message.reply("❌ Perintah ini khusus untuk Admin / Staff server.");

          const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]);
          if (!ch) return message.reply("Format: `c leaderboard lobby add #channel`");
          await addLobbyChannelId(message.guild.id, ch.id);
          return message.reply(`✅ Channel ${ch} berhasil ditambahkan ke daftar **Chat Lobby**.`);
        }
        if (action === "remove" || action === "delete" || action === "del") {
          const isStaff = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageGuild);
          if (!isStaff) return message.reply("❌ Perintah ini khusus untuk Admin / Staff server.");

          const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]);
          if (!ch) return message.reply("Format: `c leaderboard lobby remove #channel`");
          await removeLobbyChannelId(message.guild.id, ch.id);
          return message.reply(`🗑️ Channel ${ch} telah dihapus dari daftar **Chat Lobby**.`);
        }
        if (action === "list" || !action) {
          const ids = await getLobbyChannelIds(message.guild.id);
          if (!ids.length) return message.reply("📭 Belum ada channel yang terdaftar sebagai Chat Lobby (`c leaderboard lobby add #channel`).");
          const listStr = ids.map(id => `<#${id}>`).join("\n");
          return message.reply(`💬 **Daftar Channel Chat Lobby**:\n${listStr}`);
        }
      }

      // ── leaderboard blacklist ──
      if (sub === "blacklist" || sub === "bl") {
        const isStaff = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageGuild);
        if (!isStaff) return message.reply("❌ Perintah ini khusus untuk Admin / Staff server.");

        const action = (args[1] || "").toLowerCase();
        const target = message.mentions.users.first() || (args[2] && /^\d{15,20}$/.test(args[2]) ? { id: args[2], username: args[2] } : null);

        if (action === "add") {
          if (!target) return message.reply("Format: `c leaderboard blacklist add @user [alasan]`");
          const reason = args.slice(3).join(" ") || "Tidak ada alasan";
          await addLbBlacklist(target.id, reason, message.author.id);
          return message.reply(`🚫 **${target.username || target.id}** \`(${target.id})\` berhasil diblacklist dari leaderboard.\n> Alasan: ${reason}`);
        }

        if (action === "remove" || action === "del" || action === "delete") {
          if (!target) return message.reply("Format: `c leaderboard blacklist remove @user`");
          await removeLbBlacklist(target.id);
          return message.reply(`✅ **${target.username || target.id}** \`(${target.id})\` dihapus dari blacklist leaderboard.`);
        }

        if (action === "list" || !action) {
          const docs = await LeaderboardBlacklist.find({}).sort({ added_at: -1 }).lean().catch(() => []);
          if (!docs.length) return message.reply("📭 Belum ada user yang diblacklist dari leaderboard.");
          const lines = docs.map((d, i) => {
            const ts = d.added_at ? `<t:${Math.floor(d.added_at / 1000)}:d>` : "-";
            return `${i + 1}. \`${d.user_id}\` — ${d.reason || "-"} (oleh <@${d.added_by}> ${ts})`;
          });
          return message.reply(`🚫 **Leaderboard Blacklist** (${docs.length} user):\n${lines.join("\n")}`);
        }

        return message.reply("Sub-command tidak dikenal. Gunakan: `c leaderboard blacklist add/remove/list`");
      }

      if (sub === "send" || sub === "deploy") {
        const isStaff = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageGuild);
        if (!isStaff) return message.reply("❌ Perintah ini khusus untuk Admin / Owner server.");

        const destChannel = message.mentions.channels.first() || message.channel;
        const payload = await buildMonthlyRecapPayload(message.guild, null, null, true);
        const msg = await destChannel.send(payload);

        await setMetaText("recap_live_channel_id", destChannel.id);
        await setMetaText("recap_live_message_id", msg.id);

        return message.reply(`✅ Live Leaderboard (Member of the Month) berhasil dikirim ke ${destChannel} dan terdaftar untuk pembaruan otomatis.`);
      }

      if (sub === "setlog" || sub === "logchannel" || sub === "log") {
        const isStaff = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageGuild);
        if (!isStaff) return message.reply("❌ Perintah ini khusus untuk Admin / Staff server.");

        const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
        if (!ch) return message.reply("Format: `c leaderboard setlog #channel` (contoh: `c leaderboard setlog #announcements`)");

        await setMetaText("recap_log_channel_id", ch.id);
        return message.reply(`✅ Channel log pengumuman **Member of the Month** berhasil di-set ke ${ch}. Setiap akhir bulan (tgl 1 jam 00:00 WIB), bot akan otomatis mengirimkan hasil akhir juara ke channel ini.`);
      }

      if (sub === "all" || sub === "full" || sub === "everyone") {
        const payload = await buildMonthlyRecapPayload(message.guild, null, null, false);
        return message.reply(payload);
      }

      if (sub === "recap" || sub === "top" || sub === "member" || !sub) {
        const payload = await buildMonthlyRecapPayload(message.guild, null, null, true);
        return message.reply(payload);
      }
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
        return message.reply("❌ Gagal membanned user tersebut. Pastikan role bot lebih tinggi dan memiliki izin yang diperlukan.");
      }

      const reason = args.slice(1).join(" ") || "Ban";
      try {
        await message.guild.members.ban(targetUser.id, { reason });
        return message.reply(`🔨 <@${targetUser.id}> berhasil di-ban. Reason: ${reason}`);
      } catch (e) {
        console.error("[PREFIX BAN FAIL]", e?.message || e);
        return message.reply("❌ Gagal membanned user. Pastikan role bot lebih tinggi dan permission sudah sesuai.");
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
            content: `⚠️ **Peringatan Resmi dari Mystral**`,
            embeds: [emb] // Pakai embed yang sama dengan log agar simpel
          });
        } catch (e) { }

        return message.reply({ embeds: [emb], allowedMentions: { parse: ["users"] } });
      }

      if (command === "timeout" || command === "mute") {
        const duration = parseInt(args[1]);

        if (!target || isNaN(duration)) {
          return message.reply("❌ Format: `ctimeout @user <durasi> [alasan]`\nContoh: `ctimeout @user 10 Spam`");
        }

        await target.timeout(duration * 60 * 1000, reason);
        return message.reply(`🔇 **${target.user.tag}** telah di-timeout selama **${duration} menit**.`);
      }

      if (command === "kick") {
        if (!target) {
          return message.reply("❌ Mention user yang ingin di-kick.");
        }

        await target.kick(reason);
        return message.reply(`👢 **${target.user.tag}** berhasil di-kick dari server.`);
      }

      if (command === "ban") {
        if (!target) {
          return message.reply("❌ Mention user yang ingin di-ban.");
        }

        await target.ban({ reason });
        return message.reply(`🔨 **${target.user.tag}** berhasil di-ban dari server.`);
      }

      if (command === "unmute" || command === "untimeout") {
        if (!target) {
          return message.reply("❌ Mention user yang ingin di-untimeout.");
        }

        await target.timeout(null);
        return message.reply(`🔊 Timeout untuk **${target.user.tag}** berhasil dihapus.`);
      }
    }

    // ===================== IMAGE REMOVE BACKGROUND (CREMOVEBG / CRBG) =====================
    if (cmd === "removebg" || cmd === "rembg" || cmd === "nobg" || cmd === "cremovebg" || cmd === "crembg" || cmd === "cnobg" || cmd === "crbg" || cmd === "rbg") {
      let imageUrl = null;

      if (message.attachments.size > 0) {
        const att = message.attachments.first();
        if (att.contentType && att.contentType.startsWith("image/")) {
          imageUrl = att.url;
        } else if (att.url) {
          imageUrl = att.url;
        }
      }

      if (!imageUrl && args[0] && /^https?:\/\/.+/i.test(args[0])) {
        imageUrl = args[0];
      }

      if (!imageUrl && message.reference && message.reference.messageId) {
        const refMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (refMsg && refMsg.attachments.size > 0) {
          const att = refMsg.attachments.first();
          if (att.contentType && att.contentType.startsWith("image/")) {
            imageUrl = att.url;
          } else if (att.url) {
            imageUrl = att.url;
          }
        }
      }

      if (!imageUrl) {
        const embedHelp = new EmbedBuilder()
          .setTitle("🖼️ Hapus Background Gambar (`crbg` / `crembg`)")
          .setColor(0x3498db)
          .setDescription(
            `**Cara Penggunaan:**\n` +
            `1. Upload/Lampirkan gambar dengan ketik \`${PREFIX} crbg\`\n` +
            `2. Atau reply ke pesan yang berisi gambar lalu ketik \`${PREFIX} crbg\`\n` +
            `3. Atau masukkan URL gambar: \`${PREFIX} crbg https://.../gambar.png\``
          )
          .setTimestamp();
        return message.reply({ embeds: [embedHelp] });
      }

      const statusMsg = await message.reply("⏳ Sedang memproses & menghapus background gambar...");

      try {
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error("Gagal mengunduh gambar.");
        const arrayBuf = await res.arrayBuffer();
        const imgBuffer = Buffer.from(arrayBuf);

        const transparentBuffer = await removeImageBackground(imgBuffer);
        const attachment = new AttachmentBuilder(transparentBuffer, { name: "no_background.png" });

        const embedSuccess = new EmbedBuilder()
          .setTitle("✨ Background Gambar Berhasil Dihapus")
          .setColor(0x2ecc71)
          .setDescription("Berikut hasil gambar dengan background transparan (PNG format).")
          .setImage("attachment://no_background.png")
          .setTimestamp();

        await statusMsg.edit({ content: null, embeds: [embedSuccess], files: [attachment] });
      } catch (err) {
        console.error("[REMOVEBG FAIL]", err);
        await statusMsg.edit(`❌ Gagal menghapus background gambar: ${err.message}`);
      }
      return;
    }

    // ===================== QUICK CREATE ROLE (CCR / CREATEROLE) =====================
    if (cmd === "ccr" || cmd === "createrole" || cmd === "create_role") {
      const isAllowed = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageRoles);
      if (!isAllowed) {
        return message.reply("❌ Kamu tidak memiliki izin `ManageRoles` untuk membuat role baru.");
      }

      if (!args.length) {
        const embedHelp = new EmbedBuilder()
          .setTitle("✨ Perintah Buat Role Cepat (`ccr`)")
          .setColor(0x3498db)
          .setDescription(
            `**Format Penggunaan:**\n` +
            `\`${PREFIX} ccr <Nama Role> [#warna1] [#warna2] [icon_url|lampiran]\`\n\n` +
            `**Contoh:**\n` +
            `1. \`${PREFIX} ccr VIP\` *(Buat role tanpa warna)*\n` +
            `2. \`${PREFIX} ccr VIP #ff5733\` *(Buat role dengan warna)*\n` +
            `3. \`${PREFIX} ccr VIP #ff5733 #8b5cf6\` *(Buat role dengan 2 warna gradien)*\n` +
            `4. \`${PREFIX} ccr VIP #ff5733 https://.../icon.png\` *(Buat role + warna + icon)*`
          )
          .setTimestamp();
        return message.reply({ embeds: [embedHelp] });
      }

      const hexRegex = /^#?([0-9A-F]{6})$/i;
      const urlRegex = /^https?:\/\/.+/i;

      const hexMatches = args.filter(a => hexRegex.test(a));
      const urlMatches = args.filter(a => urlRegex.test(a));

      let iconUrl = urlMatches[0] || null;
      if (!iconUrl && message.attachments.size > 0) {
        iconUrl = message.attachments.first().url;
      }

      const nameParts = args.filter(a => !hexRegex.test(a) && !urlRegex.test(a));
      const roleName = nameParts.join(" ").trim();

      if (!roleName) {
        return message.reply("❌ Sebutkan nama role yang ingin dibuat. Contoh: `ccr VIP #ff5733`");
      }

      const color1 = hexMatches[0] ? (hexMatches[0].startsWith("#") ? hexMatches[0] : `#${hexMatches[0]}`) : "#99aab5";
      const color2 = hexMatches[1] ? (hexMatches[1].startsWith("#") ? hexMatches[1] : `#${hexMatches[1]}`) : null;

      try {
        const createOptions = {
          name: roleName,
          color: color1,
          reason: `Created by ${message.author.tag} via ccr`
        };

        const newRole = await message.guild.roles.create(createOptions);

        let iconApplied = false;
        let iconErrNote = "";
        if (iconUrl) {
          try {
            await newRole.setIcon(iconUrl);
            iconApplied = true;
          } catch (iconErr) {
            console.error("[CCR ICON FAIL]", iconErr);
            iconErrNote = " *(Gagal memasang icon: Server butuh Boost Level 2)*";
          }
        }

        if (color2) {
          const CustomRoles = getMongoModel("custom_roles");
          if (CustomRoles) {
            await CustomRoles.updateOne(
              { guild_id: message.guild.id, role_id: newRole.id },
              { $set: { primary_color: color1, secondary_color: color2, updated_at: Date.now() } },
              { upsert: true }
            );
          }
        }

        const embedSuccess = new EmbedBuilder()
          .setTitle("✨ Role Baru Berhasil Dibuat")
          .setColor(parseInt(color1.replace("#", ""), 16))
          .setDescription(
            `Role **${newRole.name}** (<@&${newRole.id}>) berhasil dibuat!\n\n` +
            `• **Role ID:** \`${newRole.id}\`\n` +
            `• **Warna Utama:** \`${color1}\`\n` +
            (color2 ? `• **Warna Gradien Kedua:** \`${color2}\`\n` : "") +
            (iconApplied ? `• **Icon:** Terpasang ✅\n` : (iconErrNote ? `• **Icon:** ${iconErrNote}\n` : ""))
          )
          .setTimestamp();

        if (iconApplied) {
          embedSuccess.setThumbnail(iconUrl);
        }

        return message.reply({ embeds: [embedSuccess] });
      } catch (err) {
        console.error("[CCR FAIL]", err);
        return message.reply(`❌ Gagal membuat role baru: ${err.message}`);
      }
    }

    // Helper function to find target role from arguments or mentions (mentioned or unmentioned)
    function findTargetRole(argsList) {
      if (!argsList || !argsList.length) return null;
      if (message.mentions.roles.size > 0) {
        return message.mentions.roles.first();
      }
      let filtered = [...argsList];
      if (filtered[0] && (filtered[0].toLowerCase() === "role" || filtered[0].toLowerCase() === "roles")) {
        filtered.shift();
      }
      if (!filtered.length) return null;

      for (const a of filtered) {
        if (!a) continue;
        const cleanId = a.replace(/[<@&>]/g, "");
        if (/^\d{17,20}$/.test(cleanId)) {
          const r = message.guild.roles.cache.get(cleanId);
          if (r) return r;
        }
      }

      const text = filtered.join(" ").toLowerCase().trim();
      if (text) {
        const byExact = message.guild.roles.cache.find(r => r.name.toLowerCase() === text);
        if (byExact) return byExact;

        const byPartial = message.guild.roles.cache.find(r => r.name.toLowerCase().includes(text));
        if (byPartial) return byPartial;
      }
      return null;
    }

    // ===================== CUSTOM ROLE & ROLE MANAGEMENT =====================
    const isExplicitRoleList = (cmd === "clistrole" || cmd === "listrole" || cmd === "crolelist" || cmd === "rolelist" || cmd === "whorole" || cmd === "cwhorole") ||
      ((cmd === "list" || cmd === "clist" || cmd === "who" || cmd === "cwho") && (args[0] === "role" || args[0] === "roles" || message.mentions.roles.size > 0 || findTargetRole(args)));

    if (cmd === "crole" || cmd === "customrole" || cmd === "role" || cmd === "roles" || isExplicitRoleList) {
      const isAllowed = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageRoles);
      if (!isAllowed) {
        return message.reply("❌ Kamu tidak memiliki izin `ManageRoles` untuk mengedit/mengelola role.");
      }

      let sub = args[0]?.toLowerCase();
      if (isExplicitRoleList) {
        sub = "members";
      }

      if (!sub || sub === "help") {
        const embedHelp = new EmbedBuilder()
          .setTitle("🎨 Perintah Manajemen & Custom Role (`crole` / `role`)")
          .setColor(0x3498db)
          .setDescription(
            `**Daftar Perintah Kelola Role:**\n\n` +
            `• \`${PREFIX} crole color @role #hex1 [#hex2]\` — Ubah warna role (Mendukung 2 warna gradien).\n` +
            `• \`${PREFIX} crole icon @role <url|lampiran>\` — Pasang icon/gambar pada role (Boost Level 2).\n` +
            `• \`${PREFIX} crole removeicon @role\` — Hapus icon pada role.\n` +
            `• \`${PREFIX} crole add @role <@user|all|human|bot>\` — Tambahkan role ke user, semua member, human (non-bot), atau bot.\n` +
            `• \`${PREFIX} crole remove @role <@user|all|human|bot>\` — Hapus role dari user, semua member, human (non-bot), atau bot.\n` +
            `• \`${PREFIX} crole addall @role\` / \`${PREFIX} crole addhuman @role\` / \`${PREFIX} crole addbot @role\` — Perintah cepat tambah role masal.\n` +
            `• \`${PREFIX} crole removeall @role\` / \`${PREFIX} crole removehuman @role\` / \`${PREFIX} crole removebot @role\` — Perintah cepat hapus role masal.\n` +
            `• \`${PREFIX} crole info @role\` — Lihat rincian statistik, warna, izin, dan jumlah member role.\n` +
            `• \`${PREFIX} crole members @role\` / \`${PREFIX} clist role @role\` — Lihat daftar member pemegang role tersebut.\n` +
            `• \`${PREFIX} crole rename @role <nama_baru>\` — Ubah nama role.\n` +
            `• \`${PREFIX} crole delete @role\` — Hapus role dari server.`
          )
          .setTimestamp();
        return message.reply({ embeds: [embedHelp] });
      }

      const roleTarget = findTargetRole(isExplicitRoleList ? args : args.slice(1));
      if (!roleTarget && sub !== "help") {
        return message.reply("❌ Sebutkan/mention role yang ingin diatur. Contoh: `crole color @Role #ff5733`, `clist role @Role` atau `clist role Nama Role`");
      }

      // Check hierarchy if roleTarget exists
      if (roleTarget && message.guild.members.me.roles.highest.position <= roleTarget.position) {
        return message.reply(`❌ Bot tidak dapat mengedit role **${roleTarget.name}** karena posisi role bot lebih rendah.`);
      }

      // Action 1: COLOR (Single / Gradient Dual Color)
      if (sub === "color" || sub === "setcolor" || sub === "gradient") {
        const hexRegex = /^#?([0-9A-F]{6})$/i;
        const colorArgs = args.slice(2).filter(a => hexRegex.test(a));

        if (!colorArgs.length) {
          return message.reply("❌ Sebutkan kode warna HEX yang valid. Contoh: `crole color @Role #ff5733` atau `crole color @Role #ff5733 #8b5cf6` (2 warna gradien)");
        }

        const color1 = colorArgs[0].startsWith("#") ? colorArgs[0] : `#${colorArgs[0]}`;
        const color2 = colorArgs[1] ? (colorArgs[1].startsWith("#") ? colorArgs[1] : `#${colorArgs[1]}`) : null;

        try {
          await roleTarget.setColor(color1);

          // Save gradient metadata to MongoDB custom_roles
          const CustomRoles = getMongoModel("custom_roles");
          if (CustomRoles) {
            await CustomRoles.updateOne(
              { guild_id: message.guild.id, role_id: roleTarget.id },
              { $set: { primary_color: color1, secondary_color: color2, updated_at: Date.now() } },
              { upsert: true }
            );
          }

          const embed = new EmbedBuilder()
            .setTitle("🎨 Warna Role Berhasil Diperbarui")
            .setColor(parseInt(color1.replace("#", ""), 16))
            .setDescription(
              `Warna utama role **${roleTarget.name}** diubah menjadi \`${color1}\`.` +
              (color2 ? `\n🌈 **Warna Gradien Kedua:** \`${color2}\` (Tersimpan sebagai tema gradien 2 warna).` : "")
            )
            .setTimestamp();
          return message.reply({ embeds: [embed] });
        } catch (err) {
          console.error("[CROLE COLOR FAIL]", err);
          return message.reply(`❌ Gagal mengubah warna role: ${err.message}`);
        }
      }

      // Action 2: ICON (Set Role Icon Image)
      if (sub === "icon" || sub === "seticon") {
        let iconUrl = args[2];
        if (message.attachments.size > 0) {
          iconUrl = message.attachments.first().url;
        }

        if (!iconUrl) {
          return message.reply("❌ Sertakan URL gambar atau lampirkan file gambar untuk dijadikan icon role.\nContoh: `crole icon @Role https://...` atau upload gambar langsung.");
        }

        try {
          await roleTarget.setIcon(iconUrl);
          const embed = new EmbedBuilder()
            .setTitle("🖼️ Icon Role Berhasil Diperbarui")
            .setColor(roleTarget.color || 0x2ecc71)
            .setDescription(`Icon gambar untuk role **${roleTarget.name}** telah dipasang.`)
            .setThumbnail(iconUrl)
            .setTimestamp();
          return message.reply({ embeds: [embed] });
        } catch (err) {
          console.error("[CROLE ICON FAIL]", err);
          let errDesc = err.message;
          if (err.code === 50013 || err.message.includes("boost") || err.message.includes("feature")) {
            errDesc = "Server ini belum mencapai Server Boost Level 2 (Fitur Role Icons membutuhkan Boost Level 2).";
          }
          return message.reply(`❌ Gagal memasang icon role: ${errDesc}`);
        }
      }

      // Action 3: REMOVE ICON
      if (sub === "removeicon" || sub === "delicon" || sub === "clearicon") {
        try {
          await roleTarget.setIcon(null);
          const embed = new EmbedBuilder()
            .setTitle("🗑️ Icon Role Dihapus")
            .setColor(roleTarget.color || 0xe74c3c)
            .setDescription(`Icon pada role **${roleTarget.name}** telah dihapus.`)
            .setTimestamp();
          return message.reply({ embeds: [embed] });
        } catch (err) {
          console.error("[CROLE DELICON FAIL]", err);
          return message.reply(`❌ Gagal menghapus icon role: ${err.message}`);
        }
      }

      // Action 4: ADD & REMOVE ROLES (Single Member or Bulk: All / Human / Bot)
      const addSubs = ["add", "give", "addall", "giveall", "addhuman", "givehuman", "addbot", "givebot"];
      const removeSubs = ["remove", "take", "removeall", "takeall", "removehuman", "takehuman", "removebot", "takebot"];

      if (addSubs.includes(sub) || removeSubs.includes(sub)) {
        const isAdd = addSubs.includes(sub);

        let targetScope = null; // "user", "all", "human", "bot"
        let singleMemberTarget = null;

        if (["addhuman", "givehuman", "removehuman", "takehuman"].includes(sub)) {
          targetScope = "human";
        } else if (["addbot", "givebot", "removebot", "takebot"].includes(sub)) {
          targetScope = "bot";
        } else if (["addall", "giveall", "removeall", "takeall"].includes(sub)) {
          const secondOpt = args[2]?.toLowerCase();
          if (secondOpt === "human" || secondOpt === "humans" || secondOpt === "user" || secondOpt === "users" || secondOpt === "manusia") {
            targetScope = "human";
          } else if (secondOpt === "bot" || secondOpt === "bots") {
            targetScope = "bot";
          } else {
            targetScope = "all";
          }
        } else {
          // sub === "add" || "give" || "remove" || "take"
          const mentionedUser = message.mentions.members.first();
          const targetArg = args.slice(1).find(a => {
            const clean = a.toLowerCase().replace(/[<@&>!]/g, "");
            return clean !== roleTarget.id;
          });
          const targetText = (targetArg || "").toLowerCase();

          if (mentionedUser && mentionedUser.id !== client.user.id) {
            targetScope = "user";
            singleMemberTarget = mentionedUser;
          } else if (targetText === "all" || targetText === "semua") {
            targetScope = "all";
          } else if (["human", "humans", "user", "users", "manusia"].includes(targetText)) {
            targetScope = "human";
          } else if (["bot", "bots"].includes(targetText)) {
            targetScope = "bot";
          } else if (targetText) {
            const fetched = await message.guild.members.fetch(targetText.replace(/[<@!>]/g, "")).catch(() => null);
            if (fetched) {
              targetScope = "user";
              singleMemberTarget = fetched;
            }
          }
        }

        if (!targetScope) {
          return message.reply(
            `❌ Format tidak valid. Contoh penggunaan:\n` +
            `• \`${PREFIX} crole ${isAdd ? "add" : "remove"} @Role @User\` *(Ke 1 member)*\n` +
            `• \`${PREFIX} crole ${isAdd ? "add" : "remove"} @Role all\` *(Ke semua member)*\n` +
            `• \`${PREFIX} crole ${isAdd ? "add" : "remove"} @Role human\` *(Ke member manusia)*\n` +
            `• \`${PREFIX} crole ${isAdd ? "add" : "remove"} @Role bot\` *(Ke bot)*`
          );
        }

        // Single member operation
        if (targetScope === "user" && singleMemberTarget) {
          try {
            if (isAdd) {
              if (singleMemberTarget.roles.cache.has(roleTarget.id)) {
                return message.reply(`ℹ️ **${singleMemberTarget.user.tag}** sudah memiliki role **${roleTarget.name}**.`);
              }
              await singleMemberTarget.roles.add(roleTarget.id, `Added by ${message.author.tag} via crole`);
              const embed = new EmbedBuilder()
                .setTitle("✅ Role Berhasil Ditambahkan")
                .setColor(roleTarget.color || 0x2ecc71)
                .setDescription(`Role **${roleTarget.name}** (<@&${roleTarget.id}>) telah diberikan kepada ${singleMemberTarget} (\`${singleMemberTarget.user.tag}\`).`)
                .setTimestamp();
              return message.reply({ embeds: [embed] });
            } else {
              if (!singleMemberTarget.roles.cache.has(roleTarget.id)) {
                return message.reply(`ℹ️ **${singleMemberTarget.user.tag}** tidak memiliki role **${roleTarget.name}**.`);
              }
              await singleMemberTarget.roles.remove(roleTarget.id, `Removed by ${message.author.tag} via crole`);
              const embed = new EmbedBuilder()
                .setTitle("✅ Role Berhasil Dihapus")
                .setColor(roleTarget.color || 0xe74c3c)
                .setDescription(`Role **${roleTarget.name}** (<@&${roleTarget.id}>) telah dicabut dari ${singleMemberTarget} (\`${singleMemberTarget.user.tag}\`).`)
                .setTimestamp();
              return message.reply({ embeds: [embed] });
            }
          } catch (err) {
            console.error("[CROLE SINGLE MEMBER FAIL]", err);
            return message.reply(`❌ Gagal mengubah role member: ${err.message}`);
          }
        }

        // Bulk member operation (all, human, bot)
        await message.guild.members.fetch().catch(() => null);
        let membersPool = Array.from(message.guild.members.cache.values());

        if (targetScope === "human") {
          membersPool = membersPool.filter(m => !m.user.bot);
        } else if (targetScope === "bot") {
          membersPool = membersPool.filter(m => m.user.bot);
        }

        let targetMembers = [];
        if (isAdd) {
          targetMembers = membersPool.filter(m => !m.roles.cache.has(roleTarget.id));
        } else {
          targetMembers = membersPool.filter(m => m.roles.cache.has(roleTarget.id));
        }

        const scopeLabel = targetScope === "human" ? "Human (Non-Bot)" : (targetScope === "bot" ? "Bot Only" : "Semua Member");
        if (!targetMembers.length) {
          return message.reply(`ℹ️ Tidak ada member kategori **${scopeLabel}** yang perlu di-${isAdd ? "tambahkan" : "hapus"} role **${roleTarget.name}**.`);
        }

        const actionText = isAdd ? "penambahan" : "penghapusan";
        const statusMsg = await message.reply(`⏳ Memproses ${actionText} role **${roleTarget.name}** untuk **${targetMembers.length}** member (${scopeLabel})...`);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < targetMembers.length; i++) {
          const m = targetMembers[i];
          try {
            if (isAdd) {
              await m.roles.add(roleTarget.id, `Bulk add by ${message.author.tag}`);
            } else {
              await m.roles.remove(roleTarget.id, `Bulk remove by ${message.author.tag}`);
            }
            successCount++;
          } catch (e) {
            failCount++;
          }

          if ((i + 1) % 5 === 0) {
            await new Promise(r => setTimeout(r, 150));
          }
        }

        const embedResult = new EmbedBuilder()
          .setTitle(isAdd ? "✅ Penambahan Role Masal Selesai" : "✅ Penghapusan Role Masal Selesai")
          .setColor(roleTarget.color || (isAdd ? 0x2ecc71 : 0xe74c3c))
          .setDescription(
            `Operasi role **${roleTarget.name}** (<@&${roleTarget.id}>) selesai.\n\n` +
            `• **Target Filter:** \`${scopeLabel}\`\n` +
            `• **Berhasil:** \`${successCount}\` member\n` +
            (failCount > 0 ? `• **Gagal:** \`${failCount}\` member\n` : "") +
            `• **Total Diproses:** \`${targetMembers.length}\` member`
          )
          .setTimestamp();

        return statusMsg.edit({ content: null, embeds: [embedResult] });
      }

      // Action 5: INFO (Role Details)
      if (sub === "info" || sub === "status" || sub === "view") {
        await message.guild.members.fetch().catch(() => null);
        const roleMembers = roleTarget.members;
        const totalCount = roleMembers.size;
        const humanCount = roleMembers.filter(m => !m.user.bot).size;
        const botCount = roleMembers.filter(m => m.user.bot).size;
        const hexColor = roleTarget.hexColor.toUpperCase();
        const createdUnix = Math.floor(roleTarget.createdTimestamp / 1000);

        const permNames = roleTarget.permissions.toArray();
        const keyPerms = permNames.slice(0, 8).map(p => `\`${p}\``).join(", ") || "None";
        const extraPerms = permNames.length > 8 ? `...dan ${permNames.length - 8} izin lainnya` : "";

        const embed = new EmbedBuilder()
          .setTitle(`ℹ️ Detail Role: ${roleTarget.name}`)
          .setColor(roleTarget.color || 0x3498db)
          .setThumbnail(roleTarget.iconURL() || null)
          .addFields(
            { name: "🆔 Role ID", value: `\`${roleTarget.id}\``, inline: true },
            { name: "🎨 Warna HEX", value: `\`${hexColor}\``, inline: true },
            { name: "Mention", value: `<@&${roleTarget.id}>`, inline: true },
            { name: "👥 Total Member", value: `**${totalCount}** member (\`${humanCount}\` Humans, \`${botCount}\` Bots)`, inline: false },
            { name: "⚙️ Pengaturan", value: `• Hoist (Terpisah): **${roleTarget.hoist ? "Ya" : "Tidak"}**\n• Mentionable: **${roleTarget.mentionable ? "Ya" : "Tidak"}**\n• Posisi: **#${roleTarget.position}**`, inline: true },
            { name: "📅 Dibuat Pada", value: `<t:${createdUnix}:F> (<t:${createdUnix}:R>)`, inline: true },
            { name: "🔐 Izin Kunci (Permissions)", value: `${keyPerms} ${extraPerms}`, inline: false }
          )
          .setTimestamp();

        return message.reply({ embeds: [embed] });
      }

      // Action 6: MEMBERS / WHO (List members with role)
      if (sub === "members" || sub === "who" || sub === "list") {
        await message.guild.members.fetch().catch(() => null);
        const membersArr = Array.from(roleTarget.members.values());
        const totalCount = membersArr.length;
        const humanCount = membersArr.filter(m => !m.user.bot).length;
        const botCount = membersArr.filter(m => m.user.bot).length;

        if (!totalCount) {
          return message.reply(`ℹ️ Belum ada member yang memiliki role **${roleTarget.name}**.`);
        }

        const shownMembers = membersArr.slice(0, 20).map((m, idx) => `${idx + 1}. ${m} (\`${m.user.tag}\`)`).join("\n");
        const remaining = totalCount > 20 ? `\n*...dan **${totalCount - 20}** member lainnya.*` : "";

        const embed = new EmbedBuilder()
          .setTitle(`👥 Member Pemegang Role: ${roleTarget.name}`)
          .setColor(roleTarget.color || 0x3498db)
          .setDescription(
            `**Total:** \`${totalCount}\` member (\`${humanCount}\` Humans, \`${botCount}\` Bots)\n\n` +
            `${shownMembers}${remaining}`
          )
          .setTimestamp();

        return message.reply({ embeds: [embed] });
      }

      // Action 7: RENAME ROLE
      if (sub === "rename") {
        const newName = args.slice(2).join(" ").trim();
        if (!newName) {
          return message.reply("❌ Sebutkan nama baru untuk role ini. Contoh: `crole rename @Role Admin Super`");
        }

        try {
          const oldName = roleTarget.name;
          await roleTarget.setName(newName, `Renamed by ${message.author.tag} via crole`);

          const embed = new EmbedBuilder()
            .setTitle("✏️ Nama Role Berhasil Diubah")
            .setColor(roleTarget.color || 0x2ecc71)
            .setDescription(`Nama role **${oldName}** telah diubah menjadi **${newName}** (<@&${roleTarget.id}>).`)
            .setTimestamp();
          return message.reply({ embeds: [embed] });
        } catch (err) {
          console.error("[CROLE RENAME FAIL]", err);
          return message.reply(`❌ Gagal mengubah nama role: ${err.message}`);
        }
      }

      // Action 8: DELETE ROLE
      if (sub === "delete" || sub === "del") {
        try {
          const roleName = roleTarget.name;
          await roleTarget.delete(`Deleted by ${message.author.tag} via crole`);

          const embed = new EmbedBuilder()
            .setTitle("🗑️ Role Berhasil Dihapus")
            .setColor(0xe74c3c)
            .setDescription(`Role **${roleName}** telah dihapus dari server.`)
            .setTimestamp();
          return message.reply({ embeds: [embed] });
        } catch (err) {
          console.error("[CROLE DELETE FAIL]", err);
          return message.reply(`❌ Gagal menghapus role: ${err.message}`);
        }
      }
    }

    // ===================== MY ROLE (SELF-MANAGE CUSTOM ROLE — BOOSTER ONLY) =====================
    if (cmd === "myrole" || cmd === "cmyrole" || cmd === "myr" || cmd === "roleku" || cmd === "myrolehelp" || cmd === "cbooster" || cmd === "booster") {
      const sub = (args[0] || "").toLowerCase();

      // ─── ACTION: palette / preset — Interactive HEX Color Palette Picker ───
      if (sub === "palette" || sub === "preset" || sub === "palet" || sub === "colors") {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## 🎨 AESTHETIC HEX COLOR PALETTES"),
            new TextDisplayBuilder().setContent(
              [
                "Pilih salah satu palet warna estetik di bawah untuk mengubah warna **Custom Role Booster** kamu secara instan!",
                "",
                "🌸 **1. Cherry Blossom Pastel** — `#FFB7B2`",
                "🌌 **2. Midnight Cyberpunk** — `#00F5FF`",
                "🌙 **3. Dark Aesthetic** — `#2B2D42`",
                "🌅 **4. Sunset Gold** — `#FFB703`",
                "💜 **5. Royal Violet** — `#9D4EDD`",
                "🌿 **6. Emerald Mint** — `#2EC4B6`",
                "",
                "💡 *Gunakan menu dropdown di bawah untuk menerapkan warna secara langsung.*"
              ].join("\n")
            )
          );

        const paletteSelect = new StringSelectMenuBuilder()
          .setCustomId("myrole:apply_palette")
          .setPlaceholder("🎨 Pilih Palet Warna Role...")
          .addOptions([
            { label: "🌸 Cherry Blossom Pastel", value: "FFB7B2", description: "Warna pastel merah muda lembut" },
            { label: "🌌 Midnight Cyberpunk", value: "00F5FF", description: "Warna neon cyan terang" },
            { label: "🌙 Dark Aesthetic", value: "2B2D42", description: "Warna abu-abu gelap elegan" },
            { label: "🌅 Sunset Gold", value: "FFB703", description: "Warna emas keoranyean hangat" },
            { label: "💜 Royal Violet", value: "9D4EDD", description: "Warna ungu mekar mewah" },
            { label: "🌿 Emerald Mint", value: "2EC4B6", description: "Warna hijau mint segar" }
          ]);

        const row = new ActionRowBuilder().addComponents(paletteSelect);
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addActionRowComponents(row)
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Mystral Booster • Custom Role Preset Picker")
          );

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      // ─── ACTION: test / testboost — Preview Booster Rewards embed ───
      if (sub === "test" || sub === "testboost" || sub === "cardtest" || sub === "preview" || cmd === "cbooster" && (!sub || sub === "test")) {
        const targetMember = message.mentions.members.first() || message.member;
        const embed = await buildBoosterRewardEmbed(targetMember);
        return message.reply({
          content: `🎉 **[TEST PREVIEW] Booster Rewards Card:**`,
          embeds: [embed],
          allowedMentions: { repliedUser: false },
        });
      }

      // ─── ACTION: setlog — Set Booster Log Channel ───
      if (sub === "setlog" || sub === "setlogchannel" || sub === "setchannel") {
        const isAdminUser = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageRoles);
        if (!isAdminUser) {
          return message.reply("❌ Kamu memerlukan izin Admin / Manage Roles untuk mengatur channel log booster.");
        }
        const targetCh = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
        if (!targetCh) {
          return message.reply("❌ Tag channel yang ingin dijadikan channel pengumuman booster (contoh: `cmyrole setlog #booster-announcement`).");
        }
        await MetaText.updateOne(
          { key: `booster_log_channel_${message.guild.id}` },
          { $set: { value: targetCh.id } },
          { upsert: true }
        ).catch(() => null);
        return message.reply(`✅ Channel pengumuman booster berhasil di-set ke <#${targetCh.id}>.`);
      }

      // ─── ACTION: setrolechannel — Set Custom Role Info Channel ───
      if (sub === "setrolechannel" || sub === "setcustomrolechannel") {
        const isAdminUser = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageRoles);
        if (!isAdminUser) {
          return message.reply("❌ Kamu memerlukan izin Admin / Manage Roles.");
        }
        const targetCh = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
        if (!targetCh) {
          return message.reply("❌ Tag channel custom role (contoh: `cmyrole setrolechannel #custom-role`).");
        }
        await MetaText.updateOne(
          { key: `booster_custom_role_channel_${message.guild.id}` },
          { $set: { value: targetCh.id } },
          { upsert: true }
        ).catch(() => null);
        return message.reply(`✅ Channel info custom role di-set ke <#${targetCh.id}>.`);
      }

      // ─── ACTION: toggle / on / off ───
      if (sub === "toggle" || sub === "on" || sub === "off") {
        const isAdminUser = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageRoles);
        if (!isAdminUser) {
          return message.reply("❌ Kamu memerlukan izin Admin / Manage Roles untuk mengatur fitur pengumuman booster.");
        }
        let newState = "on";
        if (sub === "off" || (sub === "toggle" && args[1]?.toLowerCase() === "off")) {
          newState = "off";
        } else if (sub === "on" || (sub === "toggle" && args[1]?.toLowerCase() === "on")) {
          newState = "on";
        } else if (sub === "toggle") {
          const cur = await MetaText.findOne({ key: `booster_announcement_enabled_${message.guild.id}` }).lean().catch(() => null);
          newState = (cur?.value === "off") ? "on" : "off";
        }
        await MetaText.updateOne(
          { key: `booster_announcement_enabled_${message.guild.id}` },
          { $set: { value: newState } },
          { upsert: true }
        ).catch(() => null);
        return message.reply(`✅ Fitur pengumuman Booster Rewards berhasil **${newState.toUpperCase() === "ON" ? "DIAKTIFKAN (ON) 🔔" : "DIMATIKAN (OFF) 🔕"}**.`);
      }

      // ─── ACTION: setmsg — Custom Announcement Text ───
      if (sub === "setmsg" || sub === "setmessage" || sub === "msg") {
        const isAdminUser = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageRoles);
        if (!isAdminUser) {
          return message.reply("❌ Kamu memerlukan izin Admin / Manage Roles.");
        }
        const newMsg = args.slice(1).join(" ");
        if (!newMsg) {
          return message.reply(
            "❌ Masukkan teks pesan yang baru!\n\n" +
            "**Placeholder yang bisa digunakan:**\n" +
            "• `{user}` : Tag user booster (<@id>)\n" +
            "• `{username}` : Nama user\n" +
            "• `{guild}` : Nama server\n" +
            "• `{boosts}` : Total boost server\n" +
            "• `{rolechannel}` : Channel info custom role\n\n" +
            "**Contoh:** `cbooster setmsg Terima kasih {user} telah boost {guild}! Total boost: {boosts}. Atur role-mu di {rolechannel}!`"
          );
        }
        await MetaText.updateOne(
          { key: `booster_announcement_msg_${message.guild.id}` },
          { $set: { value: newMsg } },
          { upsert: true }
        ).catch(() => null);
        return message.reply("✅ Teks pesan pengumuman booster berhasil diperbarui! Ketik `cbooster test` untuk melihat hasilnya.");
      }

      // ─── ACTION: settitle — Custom Embed Title ───
      if (sub === "settitle" || sub === "title") {
        const isAdminUser = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageRoles);
        if (!isAdminUser) return message.reply("❌ Akses ditolak.");
        const newTitle = args.slice(1).join(" ");
        if (!newTitle) return message.reply("❌ Masukkan judul baru! (Contoh: `cbooster settitle 🎉 Server Booster Celebration`)");
        await MetaText.updateOne(
          { key: `booster_announcement_title_${message.guild.id}` },
          { $set: { value: newTitle } },
          { upsert: true }
        ).catch(() => null);
        return message.reply(`✅ Judul pengumuman booster di-set ke: **${newTitle}**`);
      }

      // ─── ACTION: setbaserole — Set Base Role Position Anchor ───
      if (sub === "setbaserole" || sub === "setbase" || sub === "baserole" || sub === "setroleposition") {
        const isAdminUser = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageRoles);
        if (!isAdminUser) return message.reply("❌ Akses ditolak.");
        const targetRole = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        if (!targetRole) {
          return message.reply(
            "❌ Tag role yang ingin dijadikan **Base Role** (anchor posisi custom role).\n\n" +
            "**Contoh:** `cbooster setbaserole @BaseRole`\n" +
            "*Bot akan otomatis menempatkan custom role booster tepat di atas (above) role ini agar warna nama booster berubah!*"
          );
        }
        await MetaText.updateOne(
          { key: `booster_role_below_${message.guild.id}` },
          { $set: { value: targetRole.id } },
          { upsert: true }
        ).catch(() => null);
        return message.reply(
          `✅ **Base Role** berhasil di-set ke <@&${targetRole.id}>!\n` +
          `> Custom role yang diklaim booster akan otomatis dibuat tepat **di atas (above)** role ini, sehingga nama booster akan berwarna sesuai custom role-nya.`
        );
      }

      // ─── ACTION: setup — Quick Guided Setup for Booster System ───
      if (sub === "setup" || sub === "wizard") {
        const isAdminUser = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageRoles) || hasPerm(message.member, PermissionsBitField.Flags.ManageGuild);
        if (!isAdminUser) {
          return message.reply("❌ Kamu memerlukan izin Admin / Manage Roles untuk melakukan setup booster.");
        }

        const mentionedChannels = Array.from(message.mentions.channels.values());
        const mentionedRole = message.mentions.roles.first();

        let updatedMsg = [];
        if (mentionedChannels.length > 0) {
          const logCh = mentionedChannels[0];
          await MetaText.updateOne({ key: `booster_log_channel_${message.guild.id}` }, { $set: { value: logCh.id } }, { upsert: true }).catch(() => null);
          updatedMsg.push(`• Channel Pengumuman Log: <#${logCh.id}>`);

          if (mentionedChannels.length > 1) {
            const roleCh = mentionedChannels[1];
            await MetaText.updateOne({ key: `booster_custom_role_channel_${message.guild.id}` }, { $set: { value: roleCh.id } }, { upsert: true }).catch(() => null);
            updatedMsg.push(`• Channel Info Custom Role: <#${roleCh.id}>`);
          }
        }

        if (mentionedRole) {
          await MetaText.updateOne({ key: `booster_role_below_${message.guild.id}` }, { $set: { value: mentionedRole.id } }, { upsert: true }).catch(() => null);
          updatedMsg.push(`• Base Anchor Role: <@&${mentionedRole.id}>`);
        }

        const toggleDoc = await MetaText.findOne({ key: `booster_announcement_enabled_${message.guild.id}` }).lean().catch(() => null);
        const isEnabled = toggleDoc?.value !== "off";
        const logChId = await MetaText.findOne({ key: `booster_log_channel_${message.guild.id}` }).lean().catch(() => null);
        const roleChId = await MetaText.findOne({ key: `booster_custom_role_channel_${message.guild.id}` }).lean().catch(() => null);
        const baseRoleId = await getBoosterRolePosition(message.guild);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## ⚡ Setup & Konfigurasi System Booster"),
            new TextDisplayBuilder().setContent(
              [
                ...(updatedMsg.length ? ["**<a:Fm_check:1523182720493289666> Berhasil Diperbarui:**", updatedMsg.join("\n"), ""] : []),
                "**📌 Status Konfigurasi Saat Ini:**",
                `▸ **Status Fitur:** ${isEnabled ? "<a:971828statusonline:1521081779455397888> **[ ON / AKTIF ]**" : "<a:460240statusoffline:1521082558664806501> **[ OFF / NONAKTIF ]**"}`,
                `▸ **Channel Pengumuman:** ${logChId?.value ? `<#${logChId.value}>` : "*Belum di-set*"}`,
                `▸ **Channel Custom Role:** ${roleChId?.value ? `<#${roleChId.value}>` : "*Belum di-set*"}`,
                `▸ **Base Anchor Role:** ${baseRoleId ? `<@&${baseRoleId}>` : "*Belum di-set*"}`,
                "",
                "**💡 Cara Setup 1-Baris Cepat:**",
                "`cbooster setup #channel-log #channel-custom-role @BaseRole`",
                "",
                "**Perintah Pengaturan Individual:**",
                "• `cbooster setlog #channel` — Set channel pengumuman boost",
                "• `cbooster setrolechannel #channel` — Set tag channel custom role",
                "• `cbooster setbaserole @Role` — Set role batas posisi custom role",
                "• `cbooster toggle on|off` — Aktifkan/Matikan pengumuman booster",
                "• `cbooster test` — Test tampilan kartu pengumuman",
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Mystral • Booster System Setup Wizard`)
          );

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      // ─── ACTION: config / status — View Booster System Configuration ───
      if (sub === "config" || sub === "status" || sub === "setting" || sub === "settings") {
        const toggleDoc = await MetaText.findOne({ key: `booster_announcement_enabled_${message.guild.id}` }).lean().catch(() => null);
        const isEnabled = toggleDoc?.value !== "off";
        const logChId = await MetaText.findOne({ key: `booster_log_channel_${message.guild.id}` }).lean().catch(() => null);
        const roleChId = await MetaText.findOne({ key: `booster_custom_role_channel_${message.guild.id}` }).lean().catch(() => null);
        const baseRoleId = await getBoosterRolePosition(message.guild);
        const titleDoc = await MetaText.findOne({ key: `booster_announcement_title_${message.guild.id}` }).lean().catch(() => null);
        const msgDoc = await MetaText.findOne({ key: `booster_announcement_msg_${message.guild.id}` }).lean().catch(() => null);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## ⚙️ Pengaturan Booster System & Rewards"),
            new TextDisplayBuilder().setContent(
              [
                `▸ **Status Pengumuman:** ${isEnabled ? "\`[ 🟢 ON / AKTIF ]\`" : "\`[ 🔴 OFF / NONAKTIF ]\`"}`,
                `▸ **Channel Pengumuman:** ${logChId?.value ? `<#${logChId.value}>` : "*Default (System Channel)*"}`,
                `▸ **Channel Custom Role:** ${roleChId?.value ? `<#${roleChId.value}>` : "<#1459524453816860816>"}`,
                `▸ **Base Role (Anchor):** ${baseRoleId ? `<@&${baseRoleId}>` : "*Belum di-set (default bottom)*"}`,
                `▸ **Judul Embed:** \`${titleDoc?.value || "✨ Booster Rewards"}\``,
                "",
                "**Teks Pesan Saat Ini:**",
                `\`\`\`text\n${msgDoc?.value || "(Menggunakan Teks Default)"}\n\`\`\``,
                "",
                "**Perintah Pengaturan Admin:**",
                "• `cbooster toggle on|off` - Aktifkan/Matikan pengumuman",
                "• `cbooster setbaserole @Role` - Set Base Role posisi custom role (Above Base Role)",
                "• `cbooster setmsg <teks>` - Kustomisasi kata-kata pesan",
                "• `cbooster resetmsg` - Reset ke pesan default",
                "• `cbooster settitle <judul>` - Ubah judul embed",
                "• `cbooster setlog #channel` - Ubah channel pengumuman",
                "• `cbooster setrolechannel #channel` - Ubah tag channel custom role",
                "• `cbooster test` - Pratinjau tampilan kartu di Discord",
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Mystral • Booster System Configuration`)
          );

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      // ─── Helper: build beautiful Container V2 help panel ───

      function buildMyRoleHelpPanel() {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# 🎨 My Custom Role — Panduan Lengkap"),
            new TextDisplayBuilder().setContent(
              [
                "Custom role eksklusif untuk **Server Booster** 💖",
                "Boost server → klaim role → atur & bagikan ke teman!",
                "",
                "> ⚠️ Kamu dapat mengelola custom role-mu sendiri dan membagikannya ke teman.",
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "## 📦 Klaim Custom Role",
                "`cmyrole claim <nama role>`",
                "**Contoh:** `cmyrole claim Role VIP Keren`",
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "## 🎨 Ganti Warna Role",
                "`cmyrole color #HEX` — Ganti warna role-mu",
                "**Contoh:** `cmyrole color #ff5733`",
                "",
                "> 💡 *Ingin buat 2 warna gradien / request khusus? Tag **Admin / Staff** server untuk dibuatkan!*",
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "## 🎁 Gift Role ke Teman",
                "`cmyrole gift @User` — Berikan role-mu ke teman",
                "`cmyrole ungift @User` — Tarik role-mu dari teman",
                "",
                "> 📌 **Kuota Slot Gift:**",
                "> • **1 Boost** = Gift max **3 orang**",
                "> • **2 Boosts** = Gift max **5 orang**",
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "## 🖼️ Set & Hapus Background Icon",
                "`cmyrole icon` — Pasang icon *(Bisa reply gambar / attach / URL)*",
                "`cmyrole removeicon` — Hapus icon",
                "",
                "## ✏️ Rename & 🗑️ Delete",
                "`cmyrole rename <nama baru>` — Ganti nama role",
                "`cmyrole delete` — Hapus custom role-mu",
                "`cmyrole info` — Lihat detail & statistik custom role-mu",
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `Mystral • My Custom Role • Ketik \`cmyrole\` tanpa argumen untuk melihat panduan ini`
            )
          );

        return {
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        };
      }

      // ─── No subcommand / help → show panel ───
      if (!sub || sub === "help" || cmd === "myrolehelp") {
        return message.reply(buildMyRoleHelpPanel());
      }

      // ─── ACTION: claim — booster manually creates their custom role ───
      if (sub === "claim" || sub === "klaim" || sub === "create" || sub === "buat") {
        // Check if user is a booster
        const claimMember = message.guild.members.cache.get(message.author.id) ||
          await message.guild.members.fetch(message.author.id).catch(() => null);

        const isBooster = !!claimMember?.premiumSince;
        const isAdmin = isBotOwner(message.author.id) || hasPerm(claimMember, PermissionsBitField.Flags.ManageRoles);

        if (!isBooster && !isAdmin) {
          const c = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent("## ❌ Fitur Khusus Server Booster"),
              new TextDisplayBuilder().setContent(
                [
                  "Custom role hanya tersedia untuk **Server Booster** 💖",
                  "",
                  "> Boost server Mystral untuk mendapatkan custom role-mu sendiri!",
                  "> Setelah boost, ketik `cmyrole claim <nama role>` untuk membuat role-mu.",
                ].join("\n")
              )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`Mystral • My Custom Role • <t:${Math.floor(Date.now() / 1000)}:R>`)
            );
          return message.reply({
            components: [c],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] },
          });
        }

        // Check if already has a custom role
        const existingDoc = await BoosterCustomRole.findOne({
          user_id: message.author.id,
          guild_id: message.guild.id,
        }).lean().catch(() => null);

        if (existingDoc?.role_id) {
          const existingRole = message.guild.roles.cache.get(existingDoc.role_id);
          if (existingRole) {
            return message.reply({
              embeds: [new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle("⚠️ Custom Role Sudah Ada")
                .setDescription(`Kamu sudah punya custom role: <@&${existingRole.id}> (\`${existingRole.name}\`).`)
                .addFields({ name: "Apa yang bisa dilakukan?", value: "`cmyrole color` — ganti warna\n`cmyrole rename` — ganti nama\n`cmyrole gift @user` — gift ke teman\n`cmyrole info` — lihat detail" })
              ],
              allowedMentions: { parse: [] },
            });
          }
          // Role was deleted from Discord, allow re-claim
          await BoosterCustomRole.deleteOne({ user_id: message.author.id, guild_id: message.guild.id }).catch(() => null);
        }

        // Parse the role name from args
        const roleName = args.slice(1).join(" ").trim();
        if (!roleName || roleName.length < 1) {
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("❌ Nama Role Diperlukan")
              .setDescription("Sebutkan nama untuk custom role-mu.")
              .addFields({ name: "Contoh", value: "`cmyrole claim cyizzielovecas`\n`cmyrole claim rolevipku`" })
            ],
            allowedMentions: { repliedUser: false },
          });
        }
        if (roleName.length > 100) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Nama Terlalu Panjang").setDescription("Nama role maksimal **100 karakter**.")],
            allowedMentions: { repliedUser: false },
          });
        }

        // Get position config
        const belowRoleId = await getBoosterRolePosition(message.guild);
        let position = 1;
        if (belowRoleId) {
          const belowRole = message.guild.roles.cache.get(belowRoleId);
          if (belowRole) position = Math.max(1, belowRole.position + 1);
        }

        try {
          const newRole = await message.guild.roles.create({
            name: roleName,
            color: 0xf47fff,
            reason: `Custom role claimed by ${message.author.tag} via cmyrole claim`,
            position,
          });

          // Give role to the member
          await claimMember.roles.add(newRole.id, "Booster custom role claim").catch(() => null);

          // Save to DB
          await BoosterCustomRole.updateOne(
            { user_id: message.author.id, guild_id: message.guild.id },
            { $set: { role_id: newRole.id, created_at: Date.now() } },
            { upsert: true }
          ).catch(() => null);

          const c = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent("## 🎉 Custom Role Berhasil Diklaim!"),
              new TextDisplayBuilder().setContent(
                [
                  `**Role:** <@&${newRole.id}>`,
                  `**Nama:** \`${roleName}\``,
                  "",
                  "Sekarang kamu bisa mengatur role-mu:",
                  "• `cmyrole color #HEX1 [#HEX2]` — ganti warna & gradien",
                  "• `cmyrole gift @User` — gift ke teman (1 Boost = 2 org, 2 Boosts = 5 org)",
                  "• `cmyrole rename <nama>` — ganti nama",
                  "• `cmyrole icon <url>` — pasang icon (Boost Lvl 2)",
                  "• `cmyrole info` — lihat detail role-mu",
                ].join("\n")
              )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`Mystral • My Custom Role • <t:${Math.floor(Date.now() / 1000)}:R>`)
            );
          return message.reply({
            components: [c],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] },
          });
        } catch (err) {
          console.error("[MYROLE CLAIM FAIL]", err);
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Gagal Membuat Custom Role").setDescription(`\`${err.message}\``)],
            allowedMentions: { repliedUser: false },
          });
        }
      }

      // ─── Target role resolution ───
      const isBotOwnerUser = isBotOwner(message.author.id);
      const hasManage = message.member ? hasPerm(message.member, PermissionsBitField.Flags.ManageRoles) : false;

      let targetRole = null;
      let targetUser = message.author;

      if (isBotOwnerUser || hasManage) {
        const mentionedRole = message.mentions.roles.first();
        const mentionedMember = message.mentions.members.first();

        if (mentionedRole) {
          targetRole = mentionedRole;
        } else if (mentionedMember) {
          targetUser = mentionedMember.user;
          const targetDoc = await BoosterCustomRole.findOne({ user_id: mentionedMember.id, guild_id: message.guild.id }).lean().catch(() => null);
          if (targetDoc?.role_id) {
            targetRole = message.guild.roles.cache.get(targetDoc.role_id);
          }
        }
      }

      const boosterDoc = await BoosterCustomRole.findOne({
        user_id: targetUser.id,
        guild_id: message.guild.id,
      }).lean().catch(() => null);

      if (!targetRole && boosterDoc?.role_id) {
        targetRole = message.guild.roles.cache.get(boosterDoc.role_id);
      }

      if (!targetRole) {
        if (!boosterDoc) {
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle("💖 Belum Punya Custom Role")
              .setDescription("Custom role dibuat otomatis saat kamu **boost server** ini.")
              .addFields({ name: "Cara mendapatkannya", value: "1. Boost server ini\n2. Ketik `cmyrole claim <nama role>`\n3. Atur sesukamu dengan `cmyrole`!" })
            ],
            allowedMentions: { repliedUser: false },
          });
        }
        return message.reply({
          embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Custom Role Tidak Ditemukan").setDescription("Custom role kamu sepertinya sudah dihapus dari server. Hubungi admin atau claim ulang.")],
          allowedMentions: { repliedUser: false },
        });
      }

      // ─── Check bot hierarchy ───
      const botMember = message.guild.members.me;
      if (botMember.roles.highest.position <= targetRole.position) {
        return message.reply({
          embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Hierarki Bot Tidak Cukup").setDescription(`Bot tidak bisa mengedit role **${targetRole.name}** karena posisinya lebih tinggi dari role bot.`)],
          allowedMentions: { repliedUser: false },
        });
      }

      // ─── Helper: success container ───
      function successContainer(title, bodyLines) {
        const c = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ✅ ${title}`),
            new TextDisplayBuilder().setContent(bodyLines.join("\n"))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Mystral • My Custom Role • <t:${Math.floor(Date.now() / 1000)}:R>`)
          );
        return {
          components: [c],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        };
      }

      // ─── ACTION: color ───
      if (sub === "color" || sub === "warna" || sub === "setcolor") {
        const hexRegex = /^#?([0-9A-Fa-f]{6})$/;
        const colorArgs = args.slice(1).filter(a => hexRegex.test(a));

        if (!colorArgs.length) {
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("❌ Warna Tidak Valid")
              .setDescription("Sebutkan kode warna HEX yang valid.")
              .addFields({ name: "Contoh", value: "`cmyrole color #ff5733` atau `cmyrole color #ff5733 #8e44ad` (2-Color Gradient)" })
            ],
            allowedMentions: { repliedUser: false },
          });
        }

        const col1 = colorArgs[0].startsWith("#") ? colorArgs[0] : `#${colorArgs[0]}`;
        const col2 = colorArgs[1] ? (colorArgs[1].startsWith("#") ? colorArgs[1] : `#${colorArgs[1]}`) : null;

        const roleHexToApply = col2 ? blendColors(col1, col2) : col1;

        try {
          await targetRole.setColor(roleHexToApply);

          // If 2-color gradient is specified, attempt to auto-set a gradient role icon
          let iconNote = "";
          if (col2) {
            const iconBuffer = generateGradientRoleIcon(col1, col2);
            if (iconBuffer) {
              const iconSet = await targetRole.setIcon(iconBuffer).then(() => true).catch(() => false);
              if (iconSet) {
                iconNote = "\n🌈 *Icon role bergradien 2 warna juga telah dipasang secara otomatis!*";
              }
            }
          }

          // Save color metadata to BoosterCustomRole & custom_roles DB
          await BoosterCustomRole.updateOne(
            { role_id: targetRole.id, guild_id: message.guild.id },
            { $set: { color_hex1: col1, color_hex2: col2 } }
          ).catch(() => null);

          const CustomRoles = getMongoModel("custom_roles");
          if (CustomRoles) {
            await CustomRoles.updateOne(
              { guild_id: message.guild.id, role_id: targetRole.id },
              { $set: { primary_color: col1, secondary_color: col2, updated_at: Date.now() } },
              { upsert: true }
            ).catch(() => null);
          }

          const colorDesc = col2
            ? `\`${col1}\` ➔ \`${col2}\` *(Hasil Perpaduan Warna Role Discord: \`${roleHexToApply}\` 🌈)*`
            : `\`${col1}\` *(Solid)*`;

          return message.reply(successContainer("Warna Role Diperbarui", [
            `**Role:** <@&${targetRole.id}>`,
            `**Warna:** ${colorDesc}${iconNote}`,
            "",
            `> Warna role **${targetRole.name}** berhasil diubah!`,
          ]));
        } catch (err) {
          console.error("[MYROLE COLOR FAIL]", err);
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Gagal Mengubah Warna").setDescription(`\`${err.message}\``)],
            allowedMentions: { repliedUser: false },
          });
        }
      }

      // ─── ACTION: gift / ungift ───
      if (sub === "gift" || sub === "beri" || sub === "give") {
        const targetMember = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
        if (!targetMember) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Member Diperlukan").setDescription("Tag member yang ingin kamu beri custom role-mu!\n\n**Contoh:** `cmyrole gift @TemanKamu`")],
            allowedMentions: { repliedUser: false },
          });
        }

        const giftedUsers = boosterDoc?.gifted_users || [];
        const quota = await getBoosterGiftQuota(message.member, message.guild.id);

        if (giftedUsers.includes(targetMember.id)) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe67e22).setTitle("⚠️ Sudah Menerima Role").setDescription(`<@${targetMember.id}> sudah memiliki custom role-mu!`)],
            allowedMentions: { repliedUser: false },
          });
        }

        if (giftedUsers.length >= quota) {
          const boostInfo = quota === 5 ? "2 Boosts" : "1 Boost";
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("❌ Kuota Gift Role Penuh")
              .setDescription(
                `Dengan **${boostInfo}**, kamu memiliki **${quota} slot gift** (\`${giftedUsers.length}/${quota}\` terpakai).\n` +
                (quota === 3 ? "\n💡 *Boost server sekali lagi (total 2 boosts) untuk membuka **5 slot gift**!*" : "")
              )
            ],
            allowedMentions: { repliedUser: false },
          });
        }

        try {
          await targetMember.roles.add(targetRole.id, `Gifted by ${message.author.tag} via cmyrole gift`);
          await BoosterCustomRole.updateOne(
            { user_id: message.author.id, guild_id: message.guild.id },
            { $addToSet: { gifted_users: targetMember.id } }
          ).catch(() => null);

          return message.reply(successContainer("Role Berhasil Digift!", [
            `**Penerima:** <@${targetMember.id}>`,
            `**Custom Role:** <@&${targetRole.id}>`,
            `**Kuota Slot:** \`${giftedUsers.length + 1}/${quota}\` terpakai`,
            "",
            `> <@${targetMember.id}> sekarang memiliki custom role **${targetRole.name}**!`,
          ]));
        } catch (err) {
          console.error("[MYROLE GIFT FAIL]", err);
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Gagal Memberikan Role").setDescription(`\`${err.message}\``)],
            allowedMentions: { repliedUser: false },
          });
        }
      }

      if (sub === "ungift" || sub === "removegift" || sub === "tarik" || sub === "revokegift") {
        const targetMember = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
        if (!targetMember) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Member Diperlukan").setDescription("Tag member yang ingin ditarik role-nya!\n\n**Contoh:** `cmyrole ungift @TemanKamu`")],
            allowedMentions: { repliedUser: false },
          });
        }

        try {
          await targetMember.roles.remove(targetRole.id, `Ungifted by ${message.author.tag} via cmyrole ungift`).catch(() => null);
          await BoosterCustomRole.updateOne(
            { user_id: message.author.id, guild_id: message.guild.id },
            { $pull: { gifted_users: targetMember.id } }
          ).catch(() => null);

          return message.reply(successContainer("Role Berhasil Ditarik", [
            `**Penerima:** <@${targetMember.id}>`,
            `**Custom Role:** <@&${targetRole.id}>`,
            "",
            `> Custom role **${targetRole.name}** telah ditarik dari <@${targetMember.id}>.`,
          ]));
        } catch (err) {
          console.error("[MYROLE UNGIFT FAIL]", err);
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Gagal Menarik Role").setDescription(`\`${err.message}\``)],
            allowedMentions: { repliedUser: false },
          });
        }
      }

      // ─── ACTION: delete / del / hapus ───
      if (sub === "delete" || sub === "del" || sub === "hapus" || sub === "removerole") {
        try {
          const roleName = targetRole.name;
          await targetRole.delete(`Deleted by ${message.author.tag} via cmyrole delete`);
          await BoosterCustomRole.deleteOne({ user_id: message.author.id, guild_id: message.guild.id }).catch(() => null);

          const c = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent("## 🗑️ Custom Role Berhasil Dihapus"),
              new TextDisplayBuilder().setContent(
                [
                  `Role **${roleName}** telah dihapus dari server dan database.`,
                  "",
                  "> Apabila kamu masih status booster, kamu bisa membuat role baru lagi kapan saja dengan `cmyrole claim <nama_role>`.",
                ].join("\n")
              )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`Mystral • My Custom Role • <t:${Math.floor(Date.now() / 1000)}:R>`)
            );

          return message.reply({
            components: [c],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] },
          });
        } catch (err) {
          console.error("[MYROLE DELETE FAIL]", err);
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Gagal Menghapus Role").setDescription(`\`${err.message}\``)],
            allowedMentions: { repliedUser: false },
          });
        }
      }

      // ─── ACTION: icon ───
      if (sub === "icon" || sub === "seticon" || sub === "gambar") {
        let iconUrl = args[1];
        if (iconUrl && (iconUrl.startsWith("<@&") || iconUrl.startsWith("<@"))) iconUrl = args[2];
        if (message.attachments.size > 0) {
          iconUrl = message.attachments.first().url;
        } else if (message.reference) {
          try {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
            if (repliedMsg) {
              if (repliedMsg.attachments.size > 0) {
                iconUrl = repliedMsg.attachments.first().url;
              } else if (repliedMsg.embeds.length > 0) {
                const emb = repliedMsg.embeds[0];
                iconUrl = emb.image?.url || emb.thumbnail?.url || null;
              } else if (repliedMsg.content) {
                const urlMatch = repliedMsg.content.match(/https?:\/\/\S+/i);
                if (urlMatch) iconUrl = urlMatch[0];
              }
            }
          } catch (e) {
            console.error("[MYROLE REPLY FETCH FAIL]", e);
          }
        }

        if (!iconUrl) {
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("❌ URL / Gambar Diperlukan")
              .setDescription("Sertakan URL gambar, lampirkan gambar, atau **reply pesan** yang berisi gambar.")
              .addFields({ name: "Cara Penggunaan", value: "• `cmyrole icon https://i.imgur.com/abc.png`\n• Lampirkan gambar langsung di chat\n• Reply pesan yang berisi gambar dengan `cmyrole icon`" })
            ],
            allowedMentions: { repliedUser: false },
          });
        }

        try {
          await targetRole.setIcon(iconUrl);
          return message.reply(successContainer("Icon Role Dipasang", [
            `**Role:** <@&${targetRole.id}>`,
            `**Icon:** [Lihat gambar](${iconUrl})`,
            "",
            `> Icon untuk role **${targetRole.name}** berhasil dipasang!`,
          ]));
        } catch (err) {
          console.error("[MYROLE ICON FAIL]", err);
          let errMsg = err.message;
          if (err.code === 50013 || errMsg.includes("boost") || errMsg.includes("feature")) {
            errMsg = "Server ini belum mencapai **Boost Level 2**. Fitur icon role membutuhkan minimal Boost Level 2.";
          }
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Gagal Memasang Icon").setDescription(errMsg)],
            allowedMentions: { repliedUser: false },
          });
        }
      }

      // ─── ACTION: removeicon ───
      if (sub === "removeicon" || sub === "delicon" || sub === "clearicon" || sub === "hapusicon" || sub === "noicon") {
        try {
          await targetRole.setIcon(null);
          return message.reply(successContainer("Icon Role Dihapus", [
            `**Role:** <@&${targetRole.id}>`,
            "",
            `> Icon pada role **${targetRole.name}** berhasil dihapus.`,
          ]));
        } catch (err) {
          console.error("[MYROLE REMOVEICON FAIL]", err);
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Gagal Menghapus Icon").setDescription(`\`${err.message}\``)],
            allowedMentions: { repliedUser: false },
          });
        }
      }

      // ─── ACTION: rename ───
      if (sub === "rename" || sub === "namai" || sub === "setname") {
        let nameParts = args.slice(1);
        if (nameParts[0]?.startsWith("<@&")) nameParts = nameParts.slice(1);
        const newName = nameParts.join(" ").trim();

        if (!newName) {
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("❌ Nama Baru Diperlukan")
              .setDescription("Sebutkan nama baru untuk role-mu.")
              .addFields({ name: "Contoh", value: "`cmyrole rename Nama Baru Keren`" })
            ],
            allowedMentions: { repliedUser: false },
          });
        }
        if (newName.length > 100) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Nama Terlalu Panjang").setDescription("Nama role maksimal **100 karakter**.")],
            allowedMentions: { repliedUser: false },
          });
        }

        try {
          const oldName = targetRole.name;
          await targetRole.setName(newName, `Renamed by ${message.author.tag} via cmyrole`);
          return message.reply(successContainer("Nama Role Diubah", [
            `**Role:** <@&${targetRole.id}>`,
            `**Sebelumnya:** \`${oldName}\``,
            `**Nama Baru:** \`${newName}\``,
          ]));
        } catch (err) {
          console.error("[MYROLE RENAME FAIL]", err);
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Gagal Mengubah Nama").setDescription(`\`${err.message}\``)],
            allowedMentions: { repliedUser: false },
          });
        }
      }

      // ─── ACTION: info ───
      if (sub === "info" || sub === "cek" || sub === "lihat" || sub === "detail") {
        const hexCol1 = boosterDoc?.color_hex1 || targetRole.hexColor?.toUpperCase() || "#000000";
        const hexCol2 = boosterDoc?.color_hex2 || null;
        const colorText = hexCol2 ? `\`${hexCol1}\` → \`${hexCol2}\` *(Gradient 🌈)*` : `\`${hexCol1}\``;

        const giftedUsers = boosterDoc?.gifted_users || [];
        const quota = await getBoosterGiftQuota(message.member, message.guild.id);
        const giftedText = giftedUsers.length ? giftedUsers.map(id => `<@${id}>`).join(", ") : "*(belum ada)*";

        const createdTs = Math.floor(targetRole.createdTimestamp / 1000);
        const iconUrl = targetRole.iconURL({ size: 128 });

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 🎨 Custom Role Detail & Info`),
            new TextDisplayBuilder().setContent(
              [
                `▸ **Role:** <@&${targetRole.id}>`,
                `▸ **Nama:** \`${targetRole.name}\``,
                `▸ **ID:** \`${targetRole.id}\``,
                `▸ **Warna:** ${colorText}`,
                `▸ **Posisi:** \`#${targetRole.position}\``,
                `▸ **Pemilik:** <@${message.author.id}>`,
                `▸ **Dibuat:** <t:${createdTs}:D> (<t:${createdTs}:R>)`,
                ...(iconUrl ? [`▸ **Icon:** [Lihat gambar](${iconUrl})`] : ["▸ **Icon:** *(tidak ada)*"]),
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "### 🎁 Gift Role Status",
                `▸ **Kuota Slot:** \`${giftedUsers.length} / ${quota}\` Terpakai *(1 Boost = 2 Slots, 2+ Boosts = 5 Slots)*`,
                `▸ **Penerima Gift:** ${giftedText}`,
                "",
                "> Ketik `cmyrole gift @User` untuk membagikan role-mu ke teman!",
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Mystral • My Custom Role • <t:${Math.floor(Date.now() / 1000)}:R>`)
          );

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
      }

      // ─── Unknown subcommand → show help ───
      return message.reply(buildMyRoleHelpPanel());
    }

    // ===================== STAFF TAGGING SYSTEM (CTAG & CSTAFF) =====================
    if (cmd === "staff" || cmd === "cstaff" || cmd === "tag" || cmd === "ctag" || cmd === "ctagging" || cmd === "stafftag" || cmd === "ctaghelp" || cmd === "taghelp") {
      const sub = (args[0] || "").toLowerCase();

      // ─── Helper: build beautiful Container V2 help panel ───
      function buildStaffTagHelpPanel() {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# 📌 Staff Tagging System — Panduan"),
            new TextDisplayBuilder().setContent(
              [
                "Sistem otomatisasi **Tag Member 2x Sehari** untuk Staff 📋",
                "Jadwal diacak harian (Slot 1 Pagi/Siang & Slot 2 Sore/Malam).",
                "",
                "> ⏳ Timeout reminder akan aktif jika tugas belum di-`done` dalam batas waktu.",
                "> ⚡ Staff lain dapat melakukan `takeover` jika petugas berhalangan.",
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "## 📋 Perintah Staff",
                "`ctag duty` / `ctag status` — lihat jadwal & status tugas hari ini",
                "`ctag roster` / `ctag minggu` — lihat jadwal rotasi mingguan (Senin - Minggu)",
                "`ctag done` — tandai tugas tag member selesai",
                "`ctag busy` — tandai berhalangan (buka giliran untuk takeover)",
                "`ctag takeover` — ambil alih tugas tag member yang belum selesai",
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "## ⚙️ Perintah Admin",
                "`ctag setup` — wizard & status konfigurasi lengkap 1-baris",
                "`ctag test` / `ctag test 2` — uji pengumuman tag Slot 1 / Slot 2 di channel",
                "`ctag test timeout` — uji pengumuman reminder timeout di channel",
                "`ctag assign <1/2> @user` — atur petugas Slot 1 atau Slot 2 secara manual",
                "`ctag config role @RoleStaff` — set role staff",
                "`ctag config channel #channel` — set channel notifikasi tag",
                "`ctag config timeout <menit>` — set batas reminder (default 60)",
                "`ctag config time <HH:MM> <HH:MM>` — set jam Slot 1 & Slot 2",
                "`ctag exempt add/remove/list` — kelola pengecualian staff",
                "`ctag random` / `randomall` — acak ulang rotasi seluruh staff",
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Mystral • Staff Tagging • <t:${Math.floor(Date.now() / 1000)}:R>`)
          );

        return {
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        };
      }

      // Help / No Subcommand
      if (!sub || sub === "help") {
        return message.reply(buildStaffTagHelpPanel());
      }

      // ─── ACTION: welcome / onboarding / welcomesetup — New Staff Onboarding ───
      if (sub === "welcome" || sub === "onboarding" || sub === "sambut") {
        return handleStaffWelcomeCommand(message, args.slice(1));
      }

      if (sub === "welcomesetup" || sub === "welcomeconfig") {
        return handleStaffWelcomeSetupCommand(message, args.slice(1));
      }

      // ─── ACTION: duty / status — View Today's Schedule ───
      if (sub === "duty" || sub === "status" || sub === "jadwal" || sub === "cek") {
        const config = await StaffTagConfig.findOne({ guild_id: message.guild.id }).lean().catch(() => null);
        const schedules = await getOrGenerateDailyStaffSchedule(message.guild);

        if (!config || !config.staff_role_id) {
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle("⚠️ Role Staff Belum Dikonfigurasi")
              .setDescription("Admin perlu mengatur role staff terlebih dahulu.")
              .addFields({ name: "Pengaturan Admin", value: "`ctag config role @RoleStaff`" })
            ],
            allowedMentions: { repliedUser: false },
          });
        }

        if (!schedules || schedules.length < 2) {
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("❌ Tidak Ada Staff Yang Tersedia")
              .setDescription("Tidak ditemukan member staff yang eligible untuk diacak jadwalnya (semua staff terdaftar di daftar pengecualian atau bot).")
            ],
            allowedMentions: { repliedUser: false },
          });
        }

        const dateKey = getStaffTagDateKey();
        const formatStatus = (st) => {
          if (st === "completed") return "✅ **Selesai**";
          if (st === "busy") return "⚠️ **Berhalangan (Bisa Takeover)**";
          if (st === "taken_over") return "⚡ **Di-Takeover & Selesai**";
          return "⏳ **Pending**";
        };

        const s1 = schedules[0];
        const s2 = schedules[1];
        const chMention = config.tag_channel_id ? `<#${config.tag_channel_id}>` : "*(Belum di-set)*";

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 📅 Jadwal Tag Member Staff — \`${dateKey}\``),
            new TextDisplayBuilder().setContent(
              [
                `**Slot 1 (Pagi/Siang — Jam ${config.slot1_time || "09:00"} WIB):**`,
                `• Staff: <@${s1.assigned_user_id}>` + (s1.assigned_user_id !== s1.original_user_id ? ` *(di-takeover dari <@${s1.original_user_id}>)*` : ""),
                `• Status: ${formatStatus(s1.status)}`,
                "",
                `**Slot 2 (Sore/Malam — Jam ${config.slot2_time || "19:00"} WIB):**`,
                `• Staff: <@${s2.assigned_user_id}>` + (s2.assigned_user_id !== s2.original_user_id ? ` *(di-takeover dari <@${s2.original_user_id}>)*` : ""),
                `• Status: ${formatStatus(s2.status)}`,
                "",
                `**Channel Notifikasi:** ${chMention}`,
                `**Timeout Reminder:** \`${config.timeout_minutes || 60} menit\``,
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Mystral • Staff Tagging • <t:${Math.floor(Date.now() / 1000)}:R>`)
          );

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
      }

      // ─── ACTION: roster / weekly / minggu — View 7-Day Weekly Roster ───
      if (sub === "roster" || sub === "weekly" || sub === "minggu" || sub === "jadwalminggu") {
        const weekly = await getWeeklyStaffScheduleOverview(message.guild);
        if (!weekly || !weekly.length) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Belum Ada Roster Mingguan").setDescription("Pastikan role staff sudah di-set di `ctag config role @RoleStaff`.")],
            allowedMentions: { repliedUser: false },
          });
        }

        const lines = weekly.map((item) => {
          const s1 = item.schedules?.[0];
          const s2 = item.schedules?.[1];
          const u1 = s1 ? `<@${s1.assigned_user_id}>` : "*(kosong)*";
          const u2 = s2 ? `<@${s2.assigned_user_id}>` : "*(kosong)*";
          return `**${item.dayName}** (\`${item.dateKey}\`):\n• Slot 1: ${u1}\n• Slot 2: ${u2}`;
        });

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## 🗓️ Roster Tag Member Staff (Senin - Minggu)"),
            new TextDisplayBuilder().setContent(lines.join("\n\n"))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Mystral • Staff Tagging System • Rotasi Berulang Berkesinambungan`)
          );

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
      }

      // ─── ACTION: done / selesai — Mark duty as completed ───
      if (sub === "done" || sub === "selesai" || sub === "acc") {
        const schedules = await getOrGenerateDailyStaffSchedule(message.guild);
        if (!schedules) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Belum Ada Jadwal").setDescription("Sistem tag belum memiliki jadwal untuk hari ini.")],
            allowedMentions: { repliedUser: false },
          });
        }

        const targetSched = schedules.find((s) => s.assigned_user_id === message.author.id && s.status !== "completed");
        if (!targetSched) {
          const activeSched = schedules.find((s) => s.status !== "completed");
          if (!activeSched) {
            return message.reply({
              embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Semua Tugas Sudah Selesai").setDescription("Tidak ada tugas tag member yang pending untuk diselesaikan hari ini!")],
              allowedMentions: { repliedUser: false },
            });
          }
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Akses Ditolak").setDescription(`Kamu bukan petugas staff yang ditugaskan untuk giliran ini!\n\nHanya petugas giliran (<@${activeSched.assigned_user_id}>) yang dapat menandai tugas ini selesai.`)],
            allowedMentions: { parse: [] },
          });
        }

        const now = Date.now();
        const isTakeover = targetSched.assigned_user_id !== targetSched.original_user_id;

        await StaffTagSchedule.updateOne(
          { _id: targetSched._id },
          { $set: { status: "completed", completed_at: now } }
        ).catch(() => null);

        const config = await StaffTagConfig.findOne({ guild_id: message.guild.id }).lean().catch(() => null);
        const slotName = getStaffSlotName(targetSched.slot, config);
        const payload = buildStaffTagCompletedContainer(message.author.id, slotName, now, isTakeover, targetSched.original_user_id);

        const tagChannelId = config?.tag_channel_id || message.channel.id;
        const ch = message.guild.channels.cache.get(tagChannelId);
        if (ch && targetSched.message_id) {
          const annMsg = await ch.messages.fetch(targetSched.message_id).catch(() => null);
          if (annMsg) {
            await annMsg.edit(payload).catch(() => null);
            if (message.channel.id !== ch.id) {
              return message.reply({
                embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Status Diperbarui").setDescription(`Kartu duty di <#${ch.id}> telah diperbarui ke status **Selesai**.`)],
                allowedMentions: { parse: [] },
              });
            }
            return;
          }
        }

        return message.reply(payload);
      }

      // ─── ACTION: busy / skip / berhalangan — Mark duty as busy ───
      if (sub === "busy" || sub === "skip" || sub === "berhalangan" || sub === "gabisa") {
        const schedules = await getOrGenerateDailyStaffSchedule(message.guild);
        if (!schedules) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Belum Ada Jadwal").setDescription("Sistem tag belum memiliki jadwal untuk hari ini.")],
            allowedMentions: { repliedUser: false },
          });
        }

        const targetSched = schedules.find((s) => s.assigned_user_id === message.author.id && s.status === "pending");
        if (!targetSched) {
          const activeSched = schedules.find((s) => s.status === "pending");
          if (!activeSched) {
            return message.reply({
              embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Tidak Ada Giliran Aktif").setDescription("Tidak ada giliran tag member yang sedang pending hari ini.")],
              allowedMentions: { repliedUser: false },
            });
          }
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Akses Ditolak").setDescription(`Kamu bukan petugas staff yang ditugaskan untuk giliran ini!\n\nHanya petugas giliran (<@${activeSched.assigned_user_id}>) yang dapat menandai berhalangan.`)],
            allowedMentions: { parse: [] },
          });
        }

        await StaffTagSchedule.updateOne(
          { _id: targetSched._id },
          { $set: { status: "busy" } }
        ).catch(() => null);

        const config = await StaffTagConfig.findOne({ guild_id: message.guild.id }).lean().catch(() => null);
        const slotName = getStaffSlotName(targetSched.slot, config);
        const payload = buildStaffTagBusyContainer(message.author.id, slotName, false, config?.staff_role_id);


        const tagChannelId = config?.tag_channel_id || message.channel.id;
        const ch = message.guild.channels.cache.get(tagChannelId);
        if (ch && targetSched.message_id) {
          const annMsg = await ch.messages.fetch(targetSched.message_id).catch(() => null);
          if (annMsg) {
            await annMsg.edit(payload).catch(() => null);
            if (message.channel.id !== ch.id) {
              return message.reply({
                embeds: [new EmbedBuilder().setColor(0xe67e22).setTitle("⚠️ Status Diperbarui").setDescription(`Kartu duty di <#${ch.id}> telah diperbarui ke status **Berhalangan**.`)],
                allowedMentions: { parse: [] },
              });
            }
            return;
          }
        }

        return message.reply(payload);
      }

      // ─── ACTION: takeover / ambil — Take over pending/busy slot ───
      if (sub === "takeover" || sub === "ambil" || sub === "gantikan") {
        const config = await StaffTagConfig.findOne({ guild_id: message.guild.id }).lean().catch(() => null);
        const isStaff = config?.staff_role_id && message.member.roles.cache.has(config.staff_role_id);
        const isAdmin = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageRoles);

        if (!isStaff && !isAdmin) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Fitur Khusus Staff").setDescription("Hanya anggota staff yang dapat mengambil alih tugas tag member.")],
            allowedMentions: { repliedUser: false },
          });
        }

        const schedules = await getOrGenerateDailyStaffSchedule(message.guild);
        if (!schedules) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Belum Ada Jadwal").setDescription("Sistem tag belum memiliki jadwal untuk hari ini.")],
            allowedMentions: { repliedUser: false },
          });
        }

        // Find available slot (busy first, then pending)
        let targetSched = schedules.find((s) => s.status === "busy");
        if (!targetSched) {
          targetSched = schedules.find((s) => s.status === "pending" && s.assigned_user_id !== message.author.id);
        }

        if (!targetSched) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Tidak Ada Tugas Untuk Di-Takeover").setDescription("Semua tugas tag member hari ini sudah selesai atau sedang kamu pegang.")],
            allowedMentions: { repliedUser: false },
          });
        }

        const prevUser = targetSched.assigned_user_id;

        await StaffTagSchedule.updateOne(
          { _id: targetSched._id },
          {
            $set: {
              assigned_user_id: message.author.id,
              status: "pending",
              notified_at: Date.now(),
              reminder_sent: false,
            },
          }
        ).catch(() => null);

        const slotName = getStaffSlotName(targetSched.slot, config);
        const payload = buildStaffTagTakeoverContainer(message.author.id, prevUser, slotName);

        const tagChannelId = config?.tag_channel_id || message.channel.id;
        const ch = message.guild.channels.cache.get(tagChannelId);
        if (ch && targetSched.message_id) {
          const annMsg = await ch.messages.fetch(targetSched.message_id).catch(() => null);
          if (annMsg) {
            await annMsg.edit(payload).catch(() => null);
            if (message.channel.id !== ch.id) {
              return message.reply({
                embeds: [new EmbedBuilder().setColor(0x3498db).setTitle("⚡ Takeover Berhasil").setDescription(`Kartu duty di <#${ch.id}> telah diperbarui untuk petugas baru <@${message.author.id}>.`)],
                allowedMentions: { parse: [] },
              });
            }
            return;
          }
        }

        return message.reply(payload);
      }


      // ─── ADMIN ACTIONS ───
      const isAdminUser = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageGuild) || hasPerm(message.member, PermissionsBitField.Flags.ManageRoles);

      // ─── ACTION: assign / setduty / manual — Assign staff manually to slot 1 or 2 ───
      if (sub === "assign" || sub === "setduty" || sub === "setjadwal" || sub === "manual") {
        if (!isAdminUser) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Permission Denied").setDescription("Kamu membutuhkan izin admin untuk mengatur jadwal manual.")],
            allowedMentions: { repliedUser: false },
          });
        }

        const slotNum = parseInt(args[1]);
        const targetUser = message.mentions.users.first() || (args[2] ? await message.client.users.fetch(args[2]).catch(() => null) : null);

        if (isNaN(slotNum) || (slotNum !== 1 && slotNum !== 2) || !targetUser) {
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("❌ Format Command Tidak Valid")
              .setDescription("Sebutkan nomor slot (1 atau 2) dan mention user staff.\n\n**Contoh:**\n`ctag assign 1 @StaffA` (Set Slot 1)\n`ctag assign 2 @StaffB` (Set Slot 2)")
            ],
            allowedMentions: { repliedUser: false },
          });
        }

        const dateKey = getStaffTagDateKey();

        await StaffTagSchedule.findOneAndUpdate(
          { guild_id: message.guild.id, date_key: dateKey, slot: slotNum },
          {
            $set: {
              assigned_user_id: targetUser.id,
              original_user_id: targetUser.id,
              status: "pending",
              notified_at: null,
              completed_at: null,
              reminder_sent: false,
            },
          },
          { upsert: true, returnDocument: 'after' }
        ).catch(() => null);

        const slotName = slotNum === 1 ? "Slot 1 (Pagi/Siang)" : "Slot 2 (Sore/Malam)";

        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("✅ Jadwal Manual Berhasil Di-Set")
            .setDescription(`Staff <@${targetUser.id}> telah ditugaskan secara manual untuk **${slotName}** hari ini.`)
          ],
          allowedMentions: { parse: [] },
        });
      }

      // ─── ACTION: setup — Quick Guided Setup for Staff Tagging ───
      if (sub === "setup" || sub === "wizard") {
        if (!isAdminUser) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Permission Denied").setDescription("Kamu membutuhkan izin admin untuk mengkonfigurasi Staff Tagging.")],
            allowedMentions: { repliedUser: false },
          });
        }

        const role = message.mentions.roles.first();
        const channel = message.mentions.channels.first();
        const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
        const timeArgs = args.filter(a => timeRegex.test(a));
        const numberArgs = args.filter(a => /^\d{1,4}$/.test(a));

        let updatedLines = [];
        const updateData = { updated_at: Date.now() };

        if (role) {
          updateData.staff_role_id = role.id;
          updatedLines.push(`• Role Staff: <@&${role.id}>`);
        }
        if (channel) {
          updateData.tag_channel_id = channel.id;
          updatedLines.push(`• Channel Tag: <#${channel.id}>`);
        }
        if (timeArgs.length >= 2) {
          updateData.slot1_time = timeArgs[0];
          updateData.slot2_time = timeArgs[1];
          updatedLines.push(`• Jam Slot 1 & 2: \`${timeArgs[0]}\` & \`${timeArgs[1]}\` WIB`);
        } else if (timeArgs.length === 1) {
          updateData.slot1_time = timeArgs[0];
          updatedLines.push(`• Jam Slot 1: \`${timeArgs[0]}\` WIB`);
        }

        if (numberArgs.length > 0) {
          const timeoutMins = parseInt(numberArgs[0], 10);
          if (timeoutMins >= 5 && timeoutMins <= 1440) {
            updateData.timeout_minutes = timeoutMins;
            updatedLines.push(`• Timeout Reminder: \`${timeoutMins} menit\``);
          }
        }

        if (Object.keys(updateData).length > 1) {
          await StaffTagConfig.updateOne({ guild_id: message.guild.id }, { $set: updateData }, { upsert: true }).catch(() => null);
          if (role) {
            await getOrGenerateDailyStaffSchedule(message.guild, true);
          }
        }

        const config = await StaffTagConfig.findOne({ guild_id: message.guild.id }).lean().catch(() => null);
        const isReady = !!(config?.staff_role_id && config?.tag_channel_id);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## 📌 Setup & Konfigurasi Staff Tagging System"),
            new TextDisplayBuilder().setContent(
              [
                ...(updatedLines.length ? ["**<a:Fm_check:1523182720493289666> Berhasil Diperbarui:**", updatedLines.join("\n"), ""] : []),
                "**📌 Status Konfigurasi Saat Ini:**",
                `▸ **Status Sistem:** ${isReady ? "<a:971828statusonline:1521081779455397888> **[ READY / SIAP ]**" : "<a:460240statusoffline:1521082558664806501> **[ UNCONFIGURED / BELUM LENGKAP ]**"}`,
                `▸ **Role Staff:** ${config?.staff_role_id ? `<@&${config.staff_role_id}>` : "*Belum di-set (Wajib)*"}`,
                `▸ **Channel Tag:** ${config?.tag_channel_id ? `<#${config.tag_channel_id}>` : "*Belum di-set (Wajib)*"}`,
                `▸ **Jam Slot 1 (Pagi/Siang):** \`${config?.slot1_time || "09:00"}\` WIB`,
                `▸ **Jam Slot 2 (Sore/Malam):** \`${config?.slot2_time || "19:00"}\` WIB`,
                `▸ **Batas Waktu Timeout:** \`${config?.timeout_minutes || 60} menit\``,
                "",
                "**💡 Cara Setup 1-Baris Cepat:**",
                "`ctag setup @RoleStaff #channel-tag 09:00 19:00 60`",
                "",
                "**Perintah Pengaturan Individual:**",
                "• `ctag config role @RoleStaff` — Set role staff",
                "• `ctag config channel #channel` — Set channel pengumuman",
                "• `ctag config time 09:00 19:00` — Set jam slot 1 & 2",
                "• `ctag config timeout 60` — Set reminder timeout (menit)",
                "• `ctag exempt add/remove/list` — Set pengecualian staff",
                "• `ctag test` / `ctag test 2` / `ctag test timeout` — Uji coba pengumuman",
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Mystral • Staff Tagging Setup Wizard`)
          );

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      // ─── ACTION: config ───
      if (sub === "config" || sub === "set" || sub === "setting") {
        if (!isAdminUser) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Permission Denied").setDescription("Kamu membutuhkan izin `Manage Guild` / `Manage Roles` untuk mengubah konfigurasi.")],
            allowedMentions: { repliedUser: false },
          });
        }

        const cfgType = (args[1] || "").toLowerCase();

        // ctag config role @RoleStaff
        if (cfgType === "role") {
          const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
          if (!role) {
            return message.reply({
              embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Mention Role Staff").setDescription("Sebutkan/mention role staff.\n**Contoh:** `ctag config role @Staff`")],
              allowedMentions: { repliedUser: false },
            });
          }

          await StaffTagConfig.updateOne(
            { guild_id: message.guild.id },
            { $set: { staff_role_id: role.id, updated_at: Date.now() } },
            { upsert: true }
          ).catch(() => null);

          // Auto generate today's schedule from the staff role
          const newSched = await getOrGenerateDailyStaffSchedule(message.guild, true);
          const schedInfo = (newSched && newSched.length >= 2)
            ? `\n\n🎲 **Jadwal Hari Ini Langsung Terisi:**\n• **Slot 1 (Pagi/Siang):** <@${newSched[0].assigned_user_id}>\n• **Slot 2 (Sore/Malam):** <@${newSched[1].assigned_user_id}>`
            : "";

          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle("✅ Role Staff Berhasil Di-Set")
              .setDescription(`Role Staff untuk sistem tag di-set ke <@&${role.id}>.${schedInfo}`)
            ],
            allowedMentions: { parse: [] },
          });
        }

        // ctag config channel #Channel
        if (cfgType === "channel") {
          const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]);
          if (!ch) {
            return message.reply({
              embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Mention Channel Notifikasi").setDescription("Sebutkan/mention channel notifikasi tag.\n**Contoh:** `ctag config channel #staff-chat`")],
              allowedMentions: { repliedUser: false },
            });
          }

          await StaffTagConfig.updateOne(
            { guild_id: message.guild.id },
            { $set: { tag_channel_id: ch.id, updated_at: Date.now() } },
            { upsert: true }
          ).catch(() => null);

          return message.reply({
            embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Channel Notifikasi Berhasil Di-Set").setDescription(`Channel notifikasi tag di-set ke <#${ch.id}>.`)],
            allowedMentions: { parse: [] },
          });
        }

        // ctag config timeout <menit>
        if (cfgType === "timeout") {
          const mins = parseInt(args[2]);
          if (isNaN(mins) || mins < 5 || mins > 1440) {
            return message.reply({
              embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Durasi Timeout Tidak Valid").setDescription("Masukkan durasi dalam menit (antara 5 sampai 1440 menit).\n**Contoh:** `ctag config timeout 60`")],
              allowedMentions: { repliedUser: false },
            });
          }

          await StaffTagConfig.updateOne(
            { guild_id: message.guild.id },
            { $set: { timeout_minutes: mins, updated_at: Date.now() } },
            { upsert: true }
          ).catch(() => null);

          return message.reply({
            embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Timeout Reminder Berhasil Di-Set").setDescription(`Timeout reminder di-set ke **${mins} menit**.`)],
            allowedMentions: { parse: [] },
          });
        }

        // ctag config time <09:00> <19:00>
        if (cfgType === "time" || cfgType === "jam") {
          const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
          const t1 = args[2];
          const t2 = args[3];

          if (!t1 || !t2 || !timeRegex.test(t1) || !timeRegex.test(t2)) {
            return message.reply({
              embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Format Jam Tidak Valid").setDescription("Gunakan format HH:MM 24 jam.\n**Contoh:** `ctag config time 09:00 19:00`")],
              allowedMentions: { repliedUser: false },
            });
          }

          await StaffTagConfig.updateOne(
            { guild_id: message.guild.id },
            { $set: { slot1_time: t1, slot2_time: t2, updated_at: Date.now() } },
            { upsert: true }
          ).catch(() => null);

          return message.reply({
            embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Jam Slot Tag Berhasil Di-Set").setDescription(`Slot 1 di-set ke **${t1} WIB**, Slot 2 di-set ke **${t2} WIB**.`)],
            allowedMentions: { parse: [] },
          });
        }

        // Fallback config usage
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle("⚙️ Pengaturan Staff Tagging")
            .setDescription(
              [
                "**Opsi Pengaturan:**",
                "• `ctag config role @RoleStaff` — set role staff",
                "• `ctag config channel #channel` — set channel notifikasi",
                "• `ctag config timeout <menit>` — set reminder timeout",
                "• `ctag config time 09:00 19:00` — set jam slot 1 & 2",
              ].join("\n")
            )
          ],
          allowedMentions: { repliedUser: false },
        });
      }

      // ─── ACTION: exempt — Manage Staff Exemptions ───
      if (sub === "exempt" || sub === "kecualikan" || sub === "pengecualian" || sub === "skipstaff" || sub === "exemption") {
        if (!isAdminUser) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Permission Denied").setDescription("Kamu membutuhkan izin admin untuk mengelola pengecualian staff.")],
            allowedMentions: { repliedUser: false },
          });
        }

        const actionArg = (args[1] || "").toLowerCase();
        let action = actionArg;
        let targetUser = message.mentions.users.first();

        // If args[1] is a user mention directly (e.g. ctag exempt @user)
        if (actionArg.startsWith("<@") || (!["add", "tambah", "remove", "del", "hapus", "list", "daftar"].includes(actionArg) && actionArg.length > 0)) {
          action = "add";
          if (!targetUser && args[1]) {
            targetUser = await message.client.users.fetch(args[1]).catch(() => null);
          }
        } else if (action === "add" || action === "tambah" || action === "remove" || action === "del" || action === "hapus") {
          if (!targetUser && args[2]) {
            targetUser = await message.client.users.fetch(args[2]).catch(() => null);
          }
        }

        // ctag exempt add @user / ctag exempt @user
        if (action === "add" || action === "tambah") {
          if (!targetUser) {
            return message.reply({
              embeds: [new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle("❌ Mention User Staff")
                .setDescription("Sebutkan user staff yang ingin dikecualikan.\n\n**Contoh:**\n`ctag exempt add @user`\n`ctag kecualikan @user`\n`ctag exempt list` (Lihat daftar)")
              ],
              allowedMentions: { repliedUser: false },
            });
          }

          await StaffTagExempt.updateOne(
            { guild_id: message.guild.id, user_id: targetUser.id },
            { $set: { added_by: message.author.id, created_at: Date.now() } },
            { upsert: true }
          ).catch(() => null);

          // Reshuffle schedule to remove exempt staff
          await getOrGenerateDailyStaffSchedule(message.guild, true);

          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle("✅ Staff Dikecualikan")
              .setDescription(`User <@${targetUser.id}> (\`${targetUser.id}\`) berhasil ditambahkan ke daftar pengecualian tag member.\n\n🎲 *Jadwal hari ini otomatis diacak ulang tanpa menyertakan user ini.*`)
            ],
            allowedMentions: { parse: [] },
          });
        }

        // ctag exempt remove @user
        if (action === "remove" || action === "del" || action === "hapus") {
          if (!targetUser) {
            return message.reply({
              embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Mention User").setDescription("Sebutkan user staff yang ingin dihapus dari pengecualian.\n**Contoh:** `ctag exempt remove @user`")],
              allowedMentions: { repliedUser: false },
            });
          }

          await StaffTagExempt.deleteOne({ guild_id: message.guild.id, user_id: targetUser.id }).catch(() => null);

          // Reshuffle schedule
          await getOrGenerateDailyStaffSchedule(message.guild, true);

          return message.reply({
            embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Pengecualian Dihapus").setDescription(`User <@${targetUser.id}> dihapus dari daftar pengecualian dan dapat bertugas kembali.`)],
            allowedMentions: { parse: [] },
          });
        }

        // ctag exempt list / ctag exempt (tanpa argumen)
        const exemptDocs = await StaffTagExempt.find({ guild_id: message.guild.id }).lean().catch(() => []);
        if (!exemptDocs.length) {
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor(0x3498db)
              .setTitle("📋 Daftar Pengecualian Staff")
              .setDescription("Belum ada staff yang dikecualikan dari tugas tag member.\n\n**Cara Menambah:** `ctag exempt add @user` atau `ctag kecualikan @user`")
            ],
            allowedMentions: { parse: [] },
          });
        }

        const listLines = exemptDocs.map((e, idx) => `${idx + 1}. <@${e.user_id}> (\`${e.user_id}\`)`);
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`📋 Daftar Pengecualian Staff (${exemptDocs.length})`)
            .setDescription(listLines.join("\n") + "\n\n**Tambah:** `ctag exempt add @user`\n**Hapus:** `ctag exempt remove @user`")
          ],
          allowedMentions: { parse: [] },
        });
      }

      // ─── ACTION: random / reshuffle / randomall — Re-randomize & distribute ALL staff ───
      if (sub === "random" || sub === "reshuffle" || sub === "acak" || sub === "randomall" || sub === "acaksemua" || sub === "shuffleall") {
        if (!isAdminUser) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Permission Denied").setDescription("Kamu membutuhkan izin admin untuk mengacak ulang jadwal.")],
            allowedMentions: { repliedUser: false },
          });
        }

        const res = await reshuffleAndGenerateFullWeeklySchedule(message.guild);
        if (!res || !res.weeklyList) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Gagal Mengacak Jadwal").setDescription("Pastikan role staff sudah di-set dan ada cukup member staff yang eligible.")],
            allowedMentions: { repliedUser: false },
          });
        }

        const lines = res.weeklyList.map((item) => {
          const s1 = item.schedules?.[0];
          const s2 = item.schedules?.[1];
          const u1 = s1 ? `<@${s1.assigned_user_id}>` : "*(kosong)*";
          const u2 = s2 ? `<@${s2.assigned_user_id}>` : "*(kosong)*";
          return `**${item.dayName}** (\`${item.dateKey}\`):\n• Slot 1: ${u1}\n• Slot 2: ${u2}`;
        });

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 🎲 Jadwal Rotasi ${res.totalStaff} Staff Berhasil Diacak Ulang!`),
            new TextDisplayBuilder().setContent(
              [
                `Seluruh **${res.totalStaff} member staff** ber-role staff telah diacak secara acak dan dibagikan gilirannya secara merata ke seluruh hari minggu ini (Senin - Minggu):`,
                "",
                lines.join("\n\n")
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Mystral • Staff Tagging System • Pengacakan Rotasi Merata")
          );

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
      }

      // ─── ACTION: test / testannounce / testnotif — Test tagging notification announcement ───
      if (sub === "test" || sub === "testannounce" || sub === "testnotif" || sub === "tes") {
        if (!isAdminUser) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Permission Denied").setDescription("Kamu membutuhkan izin admin untuk menguji pengumuman tag.")],
            allowedMentions: { repliedUser: false },
          });
        }

        const config = await StaffTagConfig.findOne({ guild_id: message.guild.id }).lean().catch(() => null);
        const targetChannel = message.channel;


        const testType = (args[1] || "").toLowerCase();
        const schedules = await getOrGenerateDailyStaffSchedule(message.guild);

        const slotNum = (testType === "2" || testType === "slot2") ? 2 : 1;
        const assignedUserId = message.author.id;
        const slotName = getStaffSlotName(slotNum, config);

        const now = Date.now();

        if (testType === "timeout" || testType === "reminder") {
          const staffRoleId = config?.staff_role_id;
          const staffMention = staffRoleId ? `<@&${staffRoleId}>` : "Halo Staff";

          // Test Timeout Reminder card
          const container = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`## ⚠️ [TEST] Timeout Reminder — Tag Member ${slotName}`),
              new TextDisplayBuilder().setContent(
                [
                  `📢 ${staffMention}, *ini adalah pengujian pengumuman reminder timeout (Uji Coba System)*.`,
                  "",
                  `Staff bertugas <@${assignedUserId}> belum menyelesaikan tugas tag member setelah **${config?.timeout_minutes || 60} menit**! ⏰`,
                  "",
                  "> ⚡ **Staff lain yang bersedia mohon menekan tombol Takeover di bawah untuk mengambil alih tugas!**",
                ].join("\n")
              )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addActionRowComponents(buildStaffTagTestActionRow())
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`Mystral • Staff Tagging System Test • <t:${Math.floor(now / 1000)}:R>`)
            );

          let sendErr = null;
          await targetChannel.send({

            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: staffRoleId ? { roles: [staffRoleId] } : { parse: [] },
          }).catch((err) => { sendErr = err; });

          if (sendErr) {
            console.error("[CTAG TEST REMINDER FAIL]", sendErr);
            return message.reply({
              embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Gagal Mengirim Pengumuman").setDescription(`Terjadi kesalahan saat menguji pesan ke channel <#${targetChannel.id}>:\n\`\`\`${sendErr.message || sendErr}\`\`\``)],
              allowedMentions: { repliedUser: false },
            });
          }

          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle("✅ Simulasi Reminder Timeout Terkirim!")
              .setDescription(`Pengumuman uji coba **Timeout Reminder** berhasil dikirim ke channel <#${targetChannel.id}>.`)
            ],
            allowedMentions: { parse: [] },
          });
        }

        // Standard Announcement Card Test
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 📣 [TEST] Duty Tag Member — ${slotName}`),
            new TextDisplayBuilder().setContent(
              [
                `*Ini adalah pengujian pengumuman otomatis tag member (Uji Coba System)*.`,
                "",
                `Halo <@${assignedUserId}>, sekarang giliranmu untuk melakukan **Tag Member**! 📌`,
                "",
                "Selesaikan tugas atau tandai status giliranmu melalui tombol di bawah ini:",
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addActionRowComponents(buildStaffTagTestActionRow())
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Mystral • Staff Tagging System Test • <t:${Math.floor(now / 1000)}:R>`)
          );


        let sendErr = null;
        await targetChannel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { users: [assignedUserId] },
        }).catch((err) => { sendErr = err; });

        if (sendErr) {
          console.error("[CTAG TEST ANNOUNCE FAIL]", sendErr);
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Gagal Mengirim Pengumuman").setDescription(`Terjadi kesalahan saat menguji pesan ke channel <#${targetChannel.id}>:\n\`\`\`${sendErr.message || sendErr}\`\`\``)],
            allowedMentions: { repliedUser: false },
          });
        }

        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("✅ Simulasi Pengumuman Tag Terkirim!")
            .setDescription(`Pengumuman uji coba **${slotName}** untuk <@${assignedUserId}> berhasil dikirim ke channel <#${targetChannel.id}>.`)
          ],
          allowedMentions: { parse: [] },
        });
      }

      // ─── Unknown subcommand → show help ───
      return message.reply(buildStaffTagHelpPanel());
    }


    // ===================== ANTI-INVITE LINK SECURITY LOG COMMAND (CINVITELOG) =====================
    if (cmd === "invitelog" || cmd === "cinvitelog" || cmd === "cinvite" || cmd === "antiinvite") {
      const isAdminUser = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageGuild) || hasPerm(message.member, PermissionsBitField.Flags.Administrator);
      if (!isAdminUser) {
        return message.reply({
          embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Permission Denied").setDescription("Kamu membutuhkan izin `Manage Guild` / `Administrator` untuk mengkonfigurasi Anti-Invite Alert.")],
          allowedMentions: { repliedUser: false },
        });
      }

      const sub = (args[0] || "").toLowerCase();

      // cinvitelog setchannel #channel
      if (sub === "setchannel" || sub === "channel" || sub === "setlog") {
        const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
        if (!targetChannel || !targetChannel.isTextBased()) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Channel Tidak Valid").setDescription("Mention channel teks tempat peringatan invite link akan dikirim.\n\n**Contoh:** `cinvitelog setchannel #invite-logs`")],
            allowedMentions: { repliedUser: false },
          });
        }

        await MetaText.updateOne(
          { key: `invitelog_channel_${message.guild.id}` },
          { $set: { value: targetChannel.id } },
          { upsert: true }
        ).catch(() => null);

        return message.reply({
          embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Channel Alert Set").setDescription(`Channel alert invite link berhasil di-set ke <#${targetChannel.id}>.`)],
          allowedMentions: { parse: [] },
        });
      }

      // cinvitelog toggle on|off
      if (sub === "toggle" || sub === "statusset" || sub === "mode") {
        const mode = (args[1] || "").toLowerCase();
        const newState = mode === "off" || mode === "nonaktif" ? "off" : "on";

        await MetaText.updateOne(
          { key: `invitelog_enabled_${message.guild.id}` },
          { $set: { value: newState } },
          { upsert: true }
        ).catch(() => null);

        return message.reply({
          embeds: [new EmbedBuilder().setColor(newState === "on" ? 0x2ecc71 : 0xe74c3c).setTitle(`Status Anti-Invite Alert: ${newState === "on" ? "🟢 AKTIF" : "🔴 NONAKTIF"}`).setDescription(`Sistem deteksi invite link pihak ketiga sekarang **${newState === "on" ? "AKTIF" : "NONAKTIF"}**.`)],
          allowedMentions: { parse: [] },
        });
      }

      // cinvitelog autodelete on|off
      if (sub === "autodelete" || sub === "autodel" || sub === "hapus") {
        const mode = (args[1] || "").toLowerCase();
        const newState = mode === "off" ? "off" : "on";

        await MetaText.updateOne(
          { key: `invitelog_autodelete_${message.guild.id}` },
          { $set: { value: newState } },
          { upsert: true }
        ).catch(() => null);

        return message.reply({
          embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle(`Auto-Delete Invite Message: ${newState === "on" ? "🟢 ON" : "🔴 OFF"}`).setDescription(`Pesan yang berisi invite link pihak ketiga akan **${newState === "on" ? "otomatis dihapus" : "dibiarkan (hanya kirim alert log)"}**.`)],
          allowedMentions: { parse: [] },
        });
      }

      // cinvitelog allowlink <code_or_link>
      if (sub === "allowlink" || sub === "addlink" || sub === "linkkecuali") {
        const input = args[1] || "";
        const code = input.replace(/https?:\/\/(www\.)?discord\.(gg|com\/invite)\//gi, "").trim().toLowerCase();
        if (!code) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Invite Code Diperlukan").setDescription("Masukkan kode atau link invite server sendiri yang diperbolehkan.\n\n**Contoh:** `cinvitelog allowlink mystralserver`")],
            allowedMentions: { repliedUser: false },
          });
        }

        const allowedDoc = await MetaText.findOne({ key: `invitelog_allowed_links_${message.guild.id}` }).lean().catch(() => null);
        const currentList = Array.isArray(allowedDoc?.value) ? allowedDoc.value : [];
        if (!currentList.includes(code)) currentList.push(code);

        await MetaText.updateOne(
          { key: `invitelog_allowed_links_${message.guild.id}` },
          { $set: { value: currentList } },
          { upsert: true }
        ).catch(() => null);

        return message.reply({
          embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Link Diperbolehkan").setDescription(`Invite code \`${code}\` berhasil ditambahkan ke daftar allowed server links.`)],
          allowedMentions: { parse: [] },
        });
      }

      // cinvitelog removelink <code_or_link>
      if (sub === "removelink" || sub === "dellink" || sub === "hapuslink") {
        const input = args[1] || "";
        const code = input.replace(/https?:\/\/(www\.)?discord\.(gg|com\/invite)\//gi, "").trim().toLowerCase();
        const allowedDoc = await MetaText.findOne({ key: `invitelog_allowed_links_${message.guild.id}` }).lean().catch(() => null);
        let currentList = Array.isArray(allowedDoc?.value) ? allowedDoc.value : [];
        currentList = currentList.filter(c => c !== code);

        await MetaText.updateOne(
          { key: `invitelog_allowed_links_${message.guild.id}` },
          { $set: { value: currentList } },
          { upsert: true }
        ).catch(() => null);

        return message.reply({
          embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("🗑️ Link Dihapus").setDescription(`Invite code \`${code}\` telah dihapus dari allowed links.`)],
          allowedMentions: { parse: [] },
        });
      }

      // cinvitelog whitelist user/role/channel/temp
      if (sub === "whitelist" || sub === "wl" || sub === "kecualikan") {
        const targetType = (args[1] || "").toLowerCase();

        if (targetType === "temp" || targetType === "temporary" || targetType === "sementara") {
          const type = (args[2] || "").toLowerCase();
          const durationStr = args[4] || args[3] || "1h";
          const durationMs = parseDurationMs(durationStr);
          const expireAt = Date.now() + durationMs;

          const tempWlDoc = await MetaText.findOne({ key: `invitelog_wl_temp_${message.guild.id}` }).lean().catch(() => null);
          let tempWlList = Array.isArray(tempWlDoc?.value) ? tempWlDoc.value : [];

          let targetId = "";
          let labelStr = "";

          if (type === "user" || type === "member") {
            const user = message.mentions.users.first() || await message.client.users.fetch(args[3]).catch(() => null);
            if (!user) return message.reply("❌ Mention user yang ingin di-whitelist sementara.\n**Contoh:** `cinvitelog whitelist temp user @User 24h`");
            targetId = user.id;
            labelStr = `<@${user.id}> (\`@${user.username}\`)`;
          } else if (type === "role") {
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[3]);
            if (!role) return message.reply("❌ Mention role yang ingin di-whitelist sementara.\n**Contoh:** `cinvitelog whitelist temp role @Role 12h`");
            targetId = role.id;
            labelStr = `<@&${role.id}>`;
          } else if (type === "channel") {
            const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[3]);
            if (!ch) return message.reply("❌ Mention channel yang ingin di-whitelist sementara.\n**Contoh:** `cinvitelog whitelist temp channel #channel 6h`");
            targetId = ch.id;
            labelStr = `<#${ch.id}>`;
          } else if (type === "link" || type === "invite") {
            const code = (args[3] || "").replace(/https?:\/\/(www\.)?discord\.(gg|com\/invite)\//gi, "").trim().toLowerCase();
            if (!code) return message.reply("❌ Tuliskan invite link/code yang ingin di-whitelist sementara.\n**Contoh:** `cinvitelog whitelist temp link discord.gg/xxx 2h`");
            targetId = code;
            labelStr = `Link Invite \`${code}\``;
          } else {
            return message.reply("❌ Format: `cinvitelog whitelist temp <user|role|channel|link> <target> <durasi>` (contoh: `24h`, `12h`, `60m`).");
          }

          tempWlList.push({ type, target: targetId, expire_at: expireAt });
          await MetaText.updateOne({ key: `invitelog_wl_temp_${message.guild.id}` }, { $set: { value: tempWlList } }, { upsert: true }).catch(() => null);

          return message.reply(`⏳ **Temporary Whitelist Berhasil Di-set!**\nTarget ${labelStr} di-whitelist selama \`${durationStr}\` (Kadaluarsa: <t:${Math.floor(expireAt / 1000)}:R>).`);
        }

        if (targetType === "user" || targetType === "member") {
          const user = message.mentions.users.first() || await message.client.users.fetch(args[2]).catch(() => null);
          if (!user) return message.reply("❌ Mention user yang ingin di-whitelist.");

          const wlDoc = await MetaText.findOne({ key: `invitelog_wl_users_${message.guild.id}` }).lean().catch(() => null);
          const list = Array.isArray(wlDoc?.value) ? wlDoc.value : [];
          if (!list.includes(user.id)) list.push(user.id);

          await MetaText.updateOne({ key: `invitelog_wl_users_${message.guild.id}` }, { $set: { value: list } }, { upsert: true }).catch(() => null);
          return message.reply(`✅ User <@${user.id}> (\`${user.tag}\`) berhasil di-whitelist dari anti-invite!`);
        }

        if (targetType === "role") {
          const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
          if (!role) return message.reply("❌ Mention role yang ingin di-whitelist.");

          const wlDoc = await MetaText.findOne({ key: `invitelog_wl_roles_${message.guild.id}` }).lean().catch(() => null);
          const list = Array.isArray(wlDoc?.value) ? wlDoc.value : [];
          if (!list.includes(role.id)) list.push(role.id);

          await MetaText.updateOne({ key: `invitelog_wl_roles_${message.guild.id}` }, { $set: { value: list } }, { upsert: true }).catch(() => null);
          return message.reply(`✅ Role <@&${role.id}> berhasil di-whitelist dari anti-invite!`);
        }

        if (targetType === "channel") {
          const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]);
          if (!channel) return message.reply("❌ Mention channel yang ingin di-whitelist.");

          const wlDoc = await MetaText.findOne({ key: `invitelog_wl_channels_${message.guild.id}` }).lean().catch(() => null);
          const list = Array.isArray(wlDoc?.value) ? wlDoc.value : [];
          if (!list.includes(channel.id)) list.push(channel.id);

          await MetaText.updateOne({ key: `invitelog_wl_channels_${message.guild.id}` }, { $set: { value: list } }, { upsert: true }).catch(() => null);
          return message.reply(`✅ Channel <#${channel.id}> berhasil di-whitelist dari anti-invite!`);
        }

        return message.reply("❌ Jenis whitelist tidak valid. Pilih: `cinvitelog whitelist user @User`, `role @Role`, atau `channel #Channel`.");
      }

      // cinvitelog removewhitelist
      if (sub === "removewhitelist" || sub === "unwhitelist" || sub === "rmwl") {
        const targetType = (args[1] || "").toLowerCase();

        if (targetType === "user") {
          const user = message.mentions.users.first() || await message.client.users.fetch(args[2]).catch(() => null);
          if (!user) return message.reply("❌ Mention user.");
          const wlDoc = await MetaText.findOne({ key: `invitelog_wl_users_${message.guild.id}` }).lean().catch(() => null);
          let list = Array.isArray(wlDoc?.value) ? wlDoc.value : [];
          list = list.filter(id => id !== user.id);
          await MetaText.updateOne({ key: `invitelog_wl_users_${message.guild.id}` }, { $set: { value: list } }, { upsert: true }).catch(() => null);
          return message.reply(`🗑️ User <@${user.id}> dihapus dari whitelist.`);
        }

        if (targetType === "role") {
          const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
          if (!role) return message.reply("❌ Mention role.");
          const wlDoc = await MetaText.findOne({ key: `invitelog_wl_roles_${message.guild.id}` }).lean().catch(() => null);
          let list = Array.isArray(wlDoc?.value) ? wlDoc.value : [];
          list = list.filter(id => id !== role.id);
          await MetaText.updateOne({ key: `invitelog_wl_roles_${message.guild.id}` }, { $set: { value: list } }, { upsert: true }).catch(() => null);
          return message.reply(`🗑️ Role <@&${role.id}> dihapus dari whitelist.`);
        }

        if (targetType === "channel") {
          const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]);
          if (!channel) return message.reply("❌ Mention channel.");
          const wlDoc = await MetaText.findOne({ key: `invitelog_wl_channels_${message.guild.id}` }).lean().catch(() => null);
          let list = Array.isArray(wlDoc?.value) ? wlDoc.value : [];
          list = list.filter(id => id !== channel.id);
          await MetaText.updateOne({ key: `invitelog_wl_channels_${message.guild.id}` }, { $set: { value: list } }, { upsert: true }).catch(() => null);
          return message.reply(`🗑️ Channel <#${channel.id}> dihapus dari whitelist.`);
        }

        return message.reply("❌ Pilih: `cinvitelog removewhitelist user @User`, `role @Role`, atau `channel #Channel`.");
      }

      // Default Panel / Config / Status / Help
      const toggleDoc = await MetaText.findOne({ key: `invitelog_enabled_${message.guild.id}` }).lean().catch(() => null);
      const isEnabled = toggleDoc?.value !== "off";
      const logChDoc = await MetaText.findOne({ key: `invitelog_channel_${message.guild.id}` }).lean().catch(() => null);
      const autoDelDoc = await MetaText.findOne({ key: `invitelog_autodelete_${message.guild.id}` }).lean().catch(() => null);
      const autoDel = autoDelDoc?.value !== "off";

      const allowedDoc = await MetaText.findOne({ key: `invitelog_allowed_links_${message.guild.id}` }).lean().catch(() => null);
      const allowedLinks = Array.isArray(allowedDoc?.value) ? allowedDoc.value : [];
      const vanityCode = message.guild.vanityURLCode || "(tidak ada)";

      const wlUsersDoc = await MetaText.findOne({ key: `invitelog_wl_users_${message.guild.id}` }).lean().catch(() => null);
      const wlUsers = Array.isArray(wlUsersDoc?.value) ? wlUsersDoc.value : [];
      const wlRolesDoc = await MetaText.findOne({ key: `invitelog_wl_roles_${message.guild.id}` }).lean().catch(() => null);
      const wlRoles = Array.isArray(wlRolesDoc?.value) ? wlRolesDoc.value : [];
      const wlChannelsDoc = await MetaText.findOne({ key: `invitelog_wl_channels_${message.guild.id}` }).lean().catch(() => null);
      const wlChannels = Array.isArray(wlChannelsDoc?.value) ? wlChannelsDoc.value : [];

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("# 🚨 Anti-Invite Security & Alert Config"),
          new TextDisplayBuilder().setContent(
            [
              `▸ **Status Sistem:** ${isEnabled ? "<a:971828statusonline:1521081779455397888> **[ ON / AKTIF ]**" : "<a:460240statusoffline:1521082558664806501> **[ OFF / NONAKTIF ]**"}`,
              `▸ **Log Channel:** ${logChDoc?.value ? `<#${logChDoc.value}>` : "*Belum di-set (Ketik `cinvitelog setchannel #channel`)*"}`,
              `▸ **Auto Delete Message:** ${autoDel ? "<a:971828statusonline:1521081779455397888> **ON (Hapus Otomatis)**" : "<a:460240statusoffline:1521082558664806501> **OFF (Hanya Log)**"}`,
              `▸ **Server Vanity Code:** \`${vanityCode}\` *(Otomatis Dikecualikan)*`,
              `▸ **Allowed Custom Links:** ${allowedLinks.length ? allowedLinks.map(l => `\`${l}\``).join(", ") : "*(belum ada)*"}`,
              "",
              "**Whitelisted Members / Roles / Channels:**",
              `• **Users:** ${wlUsers.length ? wlUsers.map(u => `<@${u}>`).join(", ") : "*(kosong)*"}`,
              `• **Roles:** ${wlRoles.length ? wlRoles.map(r => `<@&${r}>`).join(", ") : "*(kosong)*"}`,
              `• **Channels:** ${wlChannels.length ? wlChannels.map(c => `<#${c}>`).join(", ") : "*(kosong)*"}`,
            ].join("\n")
          )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              "## 📌 Perintah Pengaturan:",
              "• `cinvitelog setchannel #channel` — Set channel alert log",
              "• `cinvitelog toggle on|off` — Aktifkan/matikan sistem",
              "• `cinvitelog autodelete on|off` — Toggle hapus otomatis pesan invite",
              "• `cinvitelog allowlink <code_or_link>` — Izinkan link/vanity tertentu",
              "• `cinvitelog whitelist user @user` — Pengecualian member",
              "• `cinvitelog whitelist role @role` — Pengecualian role",
              "• `cinvitelog whitelist channel #channel` — Pengecualian channel",
            ].join("\n")
          )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Mystral Security • Anti-Invite Security Log`)
        );

      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    // ===================== STAFF LOG & MODERATION ACTION COMMAND (CSTAFFLOG) =====================
    if (cmd === "stafflog" || cmd === "cstafflog" || cmd === "staffnotes" || cmd === "cstaffnotes") {
      const isAdminUser = isBotOwner(message.author.id) || hasPerm(message.member, PermissionsBitField.Flags.ManageGuild) || hasPerm(message.member, PermissionsBitField.Flags.Administrator);
      if (!isAdminUser) {
        return message.reply({
          embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Permission Denied").setDescription("Kamu membutuhkan izin `Manage Guild` / `Administrator` untuk mengkonfigurasi Staff Log.")],
          allowedMentions: { repliedUser: false },
        });
      }

      const sub = (args[0] || "").toLowerCase();

      // cstafflog setchannel #channel
      if (sub === "setchannel" || sub === "channel" || sub === "setlog") {
        const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
        if (!targetChannel || !targetChannel.isTextBased()) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Channel Tidak Valid").setDescription("Mention channel teks tempat log tindakan staff akan dikirim.\n\n**Contoh:** `cstafflog setchannel #staff-logs`")],
            allowedMentions: { repliedUser: false },
          });
        }

        await MetaText.updateOne(
          { key: `stafflog_channel_${message.guild.id}` },
          { $set: { value: targetChannel.id } },
          { upsert: true }
        ).catch(() => null);

        return message.reply({
          embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Channel Staff Log Set").setDescription(`Channel log aktivitas staff berhasil di-set ke <#${targetChannel.id}>.`)],
          allowedMentions: { parse: [] },
        });
      }

      // cstafflog toggle on|off
      if (sub === "toggle" || sub === "statusset" || sub === "mode") {
        const mode = (args[1] || "").toLowerCase();
        const newState = mode === "off" || mode === "nonaktif" ? "off" : "on";

        await MetaText.updateOne(
          { key: `stafflog_enabled_${message.guild.id}` },
          { $set: { value: newState } },
          { upsert: true }
        ).catch(() => null);

        return message.reply({
          embeds: [new EmbedBuilder().setColor(newState === "on" ? 0x2ecc71 : 0xe74c3c).setTitle(`Status Staff Log: ${newState === "on" ? "🟢 AKTIF" : "🔴 NONAKTIF"}`).setDescription(`Pencatatan aktivitas staff (role add/remove, ban, kick, timeout) sekarang **${newState === "on" ? "AKTIF" : "NONAKTIF"}**.`)],
          allowedMentions: { parse: [] },
        });
      }

      // cstafflog note @user <catatan>
      if (sub === "note" || sub === "catat" || sub === "addnote") {
        const targetUser = message.mentions.users.first() || await message.client.users.fetch(args[1]).catch(() => null);
        const noteText = args.slice(targetUser ? 2 : 1).join(" ").trim();

        if (!targetUser || !noteText) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Format Tidak Lengkap").setDescription("Mention member dan tuliskan catatan staff.\n\n**Contoh:** `cstafflog note @User Peringatan 1: Melanggar aturan chat`")],
            allowedMentions: { repliedUser: false },
          });
        }

        const notesDoc = await MetaText.findOne({ key: `staff_notes_${message.guild.id}_${targetUser.id}` }).lean().catch(() => null);
        const currentNotes = Array.isArray(notesDoc?.value) ? notesDoc.value : [];
        const newNoteObj = {
          staff_id: message.author.id,
          staff_tag: message.author.tag,
          note: noteText,
          timestamp: Date.now(),
        };
        currentNotes.push(newNoteObj);

        await MetaText.updateOne(
          { key: `staff_notes_${message.guild.id}_${targetUser.id}` },
          { $set: { value: currentNotes } },
          { upsert: true }
        ).catch(() => null);

        // Also send to staff log channel
        await sendStaffLogEntry(message.guild, "📝 Staff Action: Manual Note Added", [
          `▸ **Staff (Author):** <@${message.author.id}> (\`${message.author.tag}\`)`,
          `▸ **Target Member:** <@${targetUser.id}> (\`${targetUser.tag}\`)`,
          `▸ **User ID:** \`${targetUser.id}\``,
          `▸ **Isi Catatan:** \`${noteText}\``,
        ]);

        return message.reply({
          embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Catatan Staff Tersimpan").setDescription(`Catatan untuk <@${targetUser.id}> berhasil disimpan dan dicatat di staff log channel!`)],
          allowedMentions: { parse: [] },
        });
      }

      // cstafflog viewnotes @user
      if (sub === "viewnotes" || sub === "notes" || sub === "cekcatatan") {
        const targetUser = message.mentions.users.first() || await message.client.users.fetch(args[1]).catch(() => null) || message.author;
        const notesDoc = await MetaText.findOne({ key: `staff_notes_${message.guild.id}_${targetUser.id}` }).lean().catch(() => null);
        const currentNotes = Array.isArray(notesDoc?.value) ? notesDoc.value : [];

        if (!currentNotes.length) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0x3498db).setTitle(`📝 Catatan Staff — ${targetUser.username}`).setDescription(`Belum ada catatan staff yang tersimpan untuk <@${targetUser.id}>.`)],
            allowedMentions: { parse: [] },
          });
        }

        const formattedLines = currentNotes.map((n, idx) => {
          const ts = Math.floor(n.timestamp / 1000);
          return `**${idx + 1}.** Oleh <@${n.staff_id}> (<t:${ts}:R>):\n> \`${n.note}\``;
        });

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 📝 Daftar Catatan Staff — ${targetUser.username}`),
            new TextDisplayBuilder().setContent(formattedLines.join("\n\n"))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Mystral • Staff Notes Record • Member ID: ${targetUser.id}`)
          );

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      // cstafflog stats [@Staff]
      if (sub === "stats" || sub === "stat" || sub === "performa") {
        const targetStaff = message.mentions.users.first() || (args[1] ? await message.client.users.fetch(args[1]).catch(() => null) : message.author);

        const allNotesDocs = await MetaText.find({ key: { $regex: `^staff_notes_${message.guild.id}_` } }).lean().catch(() => []);
        let totalNotesAuthored = 0;
        allNotesDocs.forEach(doc => {
          if (Array.isArray(doc.value)) {
            totalNotesAuthored += doc.value.filter(n => n.staff_id === targetStaff.id).length;
          }
        });

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 📊 STAFF PERFORMANCE STATS — ${targetStaff.username}`),
            new TextDisplayBuilder().setContent(
              [
                `▸ **Staff Member:** <@${targetStaff.id}> (\`${targetStaff.tag}\`)`,
                `▸ **User ID:** \`${targetStaff.id}\``,
                "",
                "**Statistik Aktivitas & Tindakan:**",
                `• **Catatan Staff Ditulis:** \`${totalNotesAuthored}\` Catatan`,
                `• **Status Akses Log:** <a:971828statusonline:1521081779455397888> Active Moderator`,
                "",
                "💡 *Semua tindakan moderasi (role, kick, ban, timeout) tercatat secara otomatis di channel staff log.*"
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Mystral • Staff Performance Dashboard • <t:${Math.floor(Date.now() / 1000)}:R>`)
          );

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
      }

      // cstafflog addrole @role
      if (sub === "addrole" || sub === "roleadd") {
        const targetRole = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        if (!targetRole) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Role Tidak Valid").setDescription("Mention role yang ingin ditambahkan ke daftar filter staff log.\n\n**Contoh:** `cstafflog addrole @Moderator`")],
            allowedMentions: { repliedUser: false },
          });
        }

        const filterDoc = await MetaText.findOne({ key: `stafflog_roles_${message.guild.id}` }).lean().catch(() => null);
        const currentRoles = Array.isArray(filterDoc?.value) ? filterDoc.value : [];

        if (currentRoles.includes(targetRole.id)) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("⚠️ Role Sudah Ada").setDescription(`Role <@&${targetRole.id}> sudah ada di daftar filter staff log.`)],
            allowedMentions: { parse: [] },
          });
        }

        currentRoles.push(targetRole.id);
        await MetaText.updateOne(
          { key: `stafflog_roles_${message.guild.id}` },
          { $set: { value: currentRoles } },
          { upsert: true }
        ).catch(() => null);

        return message.reply({
          embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Filter Role Ditambahkan").setDescription(`Aktivitas staff log sekarang juga mencakup/terbatas untuk role <@&${targetRole.id}>.`)],
          allowedMentions: { parse: [] },
        });
      }

      // cstafflog removerole @role
      if (sub === "removerole" || sub === "roleremove" || sub === "delrole") {
        const targetRole = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        if (!targetRole) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Role Tidak Valid").setDescription("Mention role yang ingin dihapus dari filter staff log.\n\n**Contoh:** `cstafflog removerole @Moderator`")],
            allowedMentions: { repliedUser: false },
          });
        }

        const filterDoc = await MetaText.findOne({ key: `stafflog_roles_${message.guild.id}` }).lean().catch(() => null);
        let currentRoles = Array.isArray(filterDoc?.value) ? filterDoc.value : [];

        currentRoles = currentRoles.filter(id => id !== targetRole.id);
        await MetaText.updateOne(
          { key: `stafflog_roles_${message.guild.id}` },
          { $set: { value: currentRoles } },
          { upsert: true }
        ).catch(() => null);

        return message.reply({
          embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Filter Role Dihapus").setDescription(`Role <@&${targetRole.id}> telah dihapus dari filter staff log.`)],
          allowedMentions: { parse: [] },
        });
      }

      // cstafflog clearroles
      if (sub === "clearroles" || sub === "resetroles") {
        await MetaText.updateOne(
          { key: `stafflog_roles_${message.guild.id}` },
          { $set: { value: [] } },
          { upsert: true }
        ).catch(() => null);

        return message.reply({
          embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Filter Role Direset").setDescription("Filter role staff log telah di-reset. Sekarang semua role akan dicatat kembali (Default).")],
          allowedMentions: { parse: [] },
        });
      }

      // Default Panel / Config / Status / Help
      const toggleDoc = await MetaText.findOne({ key: `stafflog_enabled_${message.guild.id}` }).lean().catch(() => null);
      const isEnabled = toggleDoc?.value !== "off";
      const logChDoc = await MetaText.findOne({ key: `stafflog_channel_${message.guild.id}` }).lean().catch(() => null);
      const filterDoc = await MetaText.findOne({ key: `stafflog_roles_${message.guild.id}` }).lean().catch(() => null);
      const filterRoleIds = Array.isArray(filterDoc?.value) ? filterDoc.value : [];
      const filterRolesText = filterRoleIds.length ? filterRoleIds.map(id => `<@&${id}>`).join(", ") : "*Semua Role (Default)*";

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("# 🛡️ Staff Action & Moderation Log Config"),
          new TextDisplayBuilder().setContent(
            [
              `▸ **Status Logger:** ${isEnabled ? "<a:971828statusonline:1521081779455397888> **[ ON / AKTIF ]**" : "<a:460240statusoffline:1521082558664806501> **[ OFF / NONAKTIF ]**"}`,
              `▸ **Staff Log Channel:** ${logChDoc?.value ? `<#${logChDoc.value}>` : "*Belum di-set (Ketik `cstafflog setchannel #channel`)*"}`,
              `▸ **Filter Role Khusus:** ${filterRolesText}`,
              "",
              "**Aktivitas Yang Otomatis Dicatat:**",
              "• ➕ **Role Granted** (Penambahan role member oleh staff)",
              "• ➖ **Role Removed** (Penarikan role member oleh staff)",
              "• 👢 **Member Kicked** (Pengeluaran member)",
              "• 🔨 **Member Banned** (Pemblokiran member)",
              "• ⏳ **Member Timed Out / Un-timeout** (Penetapan & pencabutan timeout)",
              "• 📝 **Manual Staff Notes** (Catatan khusus staff untuk member)",
            ].join("\n")
          )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              "## 📌 Perintah Pengaturan:",
              "• `cstafflog setchannel #channel` — Set channel staff log",
              "• `cstafflog toggle on|off` — Aktifkan/matikan sistem log",
              "• `cstafflog addrole @role` — Tambah filter role khusus yang dicatat",
              "• `cstafflog removerole @role` — Hapus role dari filter log",
              "• `cstafflog clearroles` — Reset filter role (catat semua role)",
              "• `cstafflog note @user <catatan>` — Tambah catatan staff untuk member",
              "• `cstafflog viewnotes @user` — Lihat riwayat catatan staff member",
            ].join("\n")
          )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Mystral Moderation • Staff Action Log`)
        );

      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    // ===================== STAFF PANEL COMMAND ROUTER (CSTAFFPANEL) =====================
    if (cmd === "staffpanel" || cmd === "cstaffpanel" || cmd === "stafflist" || cmd === "cstafflist") {
      const isStaff = isBotOwner(message.author.id) ||
        hasPerm(message.member, PermissionsBitField.Flags.ManageRoles) ||
        hasPerm(message.member, PermissionsBitField.Flags.ManageMessages) ||
        hasPerm(message.member, PermissionsBitField.Flags.ModerateMembers) ||
        hasPerm(message.member, PermissionsBitField.Flags.Administrator);

      if (!isStaff) {
        return message.reply("❌ Perintah ini khusus untuk Admin & Moderator Server.");
      }

      const sub = (args[0] || "").toLowerCase();

      // cstaffpanel setup / help / guide / info (or no sub)
      if (!sub || sub === "setup" || sub === "help" || sub === "guide" || sub === "info") {
        const rolesDoc = await MetaText.findOne({ key: `staffpanel_roles_${message.guild.id}` }).lean().catch(() => null);
        const currentRoles = Array.isArray(rolesDoc?.value) ? rolesDoc.value : [];

        const roleLines = currentRoles.length
          ? currentRoles.map((r, idx) => {
            const rId = typeof r === "string" ? r : r.role_id;
            const rLabel = (typeof r === "object" && r.label) ? r.label : "Default Label";
            return `${idx + 1}. <@&${rId}> — **${rLabel}**`;
          }).join("\n")
          : "*(Belum ada role terdaftar)*";

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## 📌 Staff Directory Panel — Setup & Copy Commands"),
            new TextDisplayBuilder().setContent(
              [
                "Salin perintah 1-baris di bawah ini (klik untuk menyalin) untuk menambah role & mempublikasikan Staff Panel:",
                "",
                "**1️⃣ Tambah Role Staff Ke Panel (Langsung Copy):**",
                "```",
                "cstaffpanel addrole @Role Label Divisi",
                "```",
                "*(Contoh: `cstaffpanel addrole @Admin Administrator`)*",
                "",
                "**2️⃣ Deploy / Publikasikan Panel Ke Channel (Langsung Copy):**",
                "```",
                "cstaffpanel deploy #channel",
                "```",
                "",
                "**3️⃣ Hapus Role Dari Panel (Langsung Copy):**",
                "```",
                "cstaffpanel removerole @Role",
                "```",
                "",
                "**4️⃣ Blacklist User Dari Panel (Langsung Copy):**",
                "```",
                "cstaffpanel blacklist add @User",
                "```",
                "",
                "**📋 List Role Terdaftar Saat Ini:**",
                roleLines
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Mystral Staff Panel • Direct Copy 1/1 Commands")
          );

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      // cstaffpanel addrole @Role [Label]
      if (sub === "addrole" || sub === "roleadd" || sub === "role") {
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        if (!role) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent("## ❌ Sebutkan Role Staff"),
              new TextDisplayBuilder().setContent(
                [
                  "Gunakan perintah 1-baris siap copy di bawah ini:",
                  "```",
                  "cstaffpanel addrole @Role Label Divisi",
                  "```",
                  "**Contoh:** `cstaffpanel addrole @Admin Administrator`"
                ].join("\n")
              )
            );
          return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
        const label = args.slice(2).join(" ").trim() || role.name;

        const rolesDoc = await MetaText.findOne({ key: `staffpanel_roles_${message.guild.id}` }).lean().catch(() => null);
        let list = Array.isArray(rolesDoc?.value) ? rolesDoc.value : [];
        list = list.filter(r => (typeof r === "string" ? r : r.role_id) !== role.id);
        list.push({ role_id: role.id, label: label });

        await MetaText.updateOne(
          { key: `staffpanel_roles_${message.guild.id}` },
          { $set: { value: list } },
          { upsert: true }
        ).catch(() => null);

        await updateStaffPanelMessage(message.guild);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## ✅ Role Berhasil Ditambahkan Ke Staff Panel"),
            new TextDisplayBuilder().setContent(
              [
                `▸ **Role:** <@&${role.id}>`,
                `▸ **Label Divisi:** \`${label}\``,
                "",
                "**📌 Langkah Selanjutnya — Deploy Ke Channel (Langsung Copy):**",
                "```",
                "cstaffpanel deploy #channel",
                "```"
              ].join("\n")
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Mystral Staff Panel • Configured")
          );

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
      }

      // cstaffpanel removerole @Role
      if (sub === "removerole" || sub === "delrole") {
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        if (!role) {
          return message.reply("❌ Mention role yang ingin dihapus dari panel.\n\n**Contoh Copy:**\n```\ncstaffpanel removerole @Role\n```");
        }

        const rolesDoc = await MetaText.findOne({ key: `staffpanel_roles_${message.guild.id}` }).lean().catch(() => null);
        let list = Array.isArray(rolesDoc?.value) ? rolesDoc.value : [];
        list = list.filter(r => (typeof r === "string" ? r : r.role_id) !== role.id);

        await MetaText.updateOne(
          { key: `staffpanel_roles_${message.guild.id}` },
          { $set: { value: list } },
          { upsert: true }
        ).catch(() => null);

        await updateStaffPanelMessage(message.guild);
        return message.reply(`🗑️ Role <@&${role.id}> dihapus dari daftar Staff Panel.`);
      }

      // cstaffpanel blacklist add/remove/list @User OR cstaffpanel exclude add/remove/list @User
      if (sub === "blacklist" || sub === "exclude" || sub === "bl") {
        const action = (args[1] || "").toLowerCase();
        const targetUser = message.mentions.users.first() || (args[2] ? await message.client.users.fetch(args[2]).catch(() => null) : null);

        const excludedDoc = await MetaText.findOne({ key: `staffpanel_excluded_${message.guild.id}` }).lean().catch(() => null);
        let list = Array.isArray(excludedDoc?.value) ? excludedDoc.value : [];

        if (action === "add" || action === "tambah") {
          if (!targetUser) return message.reply("❌ Mention user atau tuliskan User ID yang ingin di-blacklist dari Staff Panel.\n\n**Contoh Copy:**\n```\ncstaffpanel blacklist add @User\n```");
          if (!list.includes(targetUser.id)) list.push(targetUser.id);
          await MetaText.updateOne({ key: `staffpanel_excluded_${message.guild.id}` }, { $set: { value: list } }, { upsert: true }).catch(() => null);

          await updateStaffPanelMessage(message.guild);
          return message.reply(`✅ User <@${targetUser.id}> (\`@${targetUser.username}\`) berhasil dimasukkan ke daftar **Blacklist / Pengecualian Staff Panel** (tidak akan muncul di directory).`);
        } else if (action === "remove" || action === "del" || action === "hapus") {
          if (!targetUser) return message.reply("❌ Mention user atau tuliskan User ID yang ingin dihapus dari blacklist.");
          list = list.filter(id => id !== targetUser.id);
          await MetaText.updateOne({ key: `staffpanel_excluded_${message.guild.id}` }, { $set: { value: list } }, { upsert: true }).catch(() => null);

          await updateStaffPanelMessage(message.guild);
          return message.reply(`🗑️ User <@${targetUser.id}> dihapus dari blacklist Staff Panel.`);
        } else if (action === "list" || !action) {
          if (!list.length) {
            return message.reply("ℹ️ Belum ada akun staff yang dimasukkan ke daftar Blacklist / Pengecualian Staff Panel.");
          }
          return message.reply(`📋 **Daftar User Blacklist Staff Panel:**\n${list.map((id, idx) => `${idx + 1}. <@${id}> (\`${id}\`)`).join("\n")}`);
        } else {
          return message.reply("❌ Format Copy:\n```\ncstaffpanel blacklist add @User\ncstaffpanel blacklist remove @User\ncstaffpanel blacklist list\n```");
        }
      }

      // cstaffpanel deploy #channel / cstaffpanel #channel
      if (sub === "deploy" || sub === "kirim" || sub === "publish" || message.mentions.channels.first() || (args[0] && message.guild.channels.cache.has(args[0]))) {
        const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.guild.channels.cache.get(args[1]) || message.channel;
        const container = await buildStaffDirectoryContainer(message.guild);

        const panelMsg = await targetChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } }).catch(() => null);
        if (panelMsg) {
          await MetaText.updateOne({ key: `staffpanel_channel_${message.guild.id}` }, { $set: { value: targetChannel.id } }, { upsert: true }).catch(() => null);
          await MetaText.updateOne({ key: `staffpanel_message_${message.guild.id}` }, { $set: { value: panelMsg.id } }, { upsert: true }).catch(() => null);
          return message.reply(`✅ Staff Directory Panel berhasil di-deploy di <#${targetChannel.id}>!`);
        } else {
          return message.reply("❌ Gagal mempublikasikan Staff Panel. Pastikan bot memiliki izin di channel tersebut.");
        }
      }
    }

    // ===================== NEW STAFF WELCOME / ONBOARDING ROUTERS =====================
    if (cmd === "welcomestaff" || cmd === "cwelcomestaff" || cmd === "staffwelcome" || cmd === "cstaffwelcome" || cmd === "welcomeonboarding" || cmd === "cwelcomeonboarding") {
      return handleStaffWelcomeCommand(message, args);
    }

    if (cmd === "welcomesetup" || cmd === "cwelcomesetup" || cmd === "welcomeconfig" || cmd === "cwelcomeconfig") {
      return handleStaffWelcomeSetupCommand(message, args);
    }

    // ===================== STAFF PROFILE COMMAND ROUTER (CSTAFFPROFILE) =====================
    if (cmd === "staffprofile" || cmd === "cstaffprofile" || cmd === "profile" || cmd === "cprofile") {
      const targetMember = message.mentions.members.first() ||
        (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null) ||
        message.member;

      const container = await buildStaffProfileContainer(targetMember);
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
    }

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
          content: `⚠️ **Peringatan Resmi dari Mystral**`,
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

    // cbotstatus / botstatus
    if (cmd === "botstatus" || cmd === "bs" || cmd === "statusbot") {
      await handleBotStatus(message);
      return;
    }
    // chelp mod / chelp admin / chelpmod / chelpadmin / cmodhelp / cadminhelp
    const isHelpAdminCmd = (cmd === "helpmod" || cmd === "helpadmin" || cmd === "modhelp" || cmd === "adminhelp" || cmd === "chelpmod" || cmd === "chelpadmin" || cmd === "cmodhelp" || cmd === "cadminhelp") ||
      ((cmd === "help" || cmd === "chelp") && (args[0]?.toLowerCase() === "mod" || args[0]?.toLowerCase() === "admin" || args[0]?.toLowerCase() === "staff"));

    if (isHelpAdminCmd) {
      const staffCfg = await StaffTagConfig.findOne({ guild_id: message.guild.id }).lean().catch(() => null);
      const isStaff = isBotOwner(message.author.id) ||
        hasPerm(message.member, PermissionsBitField.Flags.ManageRoles) ||
        hasPerm(message.member, PermissionsBitField.Flags.ManageMessages) ||
        hasPerm(message.member, PermissionsBitField.Flags.ModerateMembers) ||
        hasPerm(message.member, PermissionsBitField.Flags.Administrator) ||
        (staffCfg?.staff_role_id && message.member.roles.cache.has(staffCfg.staff_role_id)) ||
        message.member.roles.cache.has("1459465502320492679");

      if (!isStaff) {
        return message.reply("❌ Perintah ini khusus untuk Administrator dan Moderator server (`ManageRoles` / `ManageMessages` / `ModerateMembers`).");
      }

      let subCategory = "home";
      const rawArg = (cmd === "help" || cmd === "chelp") ? (args[1] || "").toLowerCase() : (args[0] || "").toLowerCase();
      if (rawArg.includes("tag") || rawArg.includes("staff")) subCategory = "admin_staff_tagging";
      else if (rawArg.includes("boost")) subCategory = "admin_booster";
      else if (rawArg.includes("role")) subCategory = "admin_roles";
      else if (rawArg.includes("mod") || rawArg.includes("warn") || rawArg.includes("invite") || rawArg.includes("log")) subCategory = "admin_moderation";
      else if (rawArg.includes("auto") || rawArg.includes("sticky")) subCategory = "admin_automation";
      else if (rawArg.includes("voice") || rawArg.includes("vc")) subCategory = "admin_voice";
      else if (rawArg.includes("panel")) subCategory = "admin_panels";
      else if (rawArg.includes("tool") || rawArg.includes("owner")) subCategory = "admin_tools";

      const ui = buildAdminHelpUI(subCategory, message.author.id);
      return message.reply({ ...ui, allowedMentions: { repliedUser: false, parse: [] } });
    }

    // chelp / help biasa
    if (cmd === "help" || cmd === "hai") {
      const ui = buildHelpUI("home", message.author.id);
      return message.reply({ ...ui, allowedMentions: { repliedUser: false, parse: [] } });
    }

    // halo (prefix)
    if (cmd === "halo") {
      const greetings = [
        `👋 Halo, <@${message.author.id}>! Selamat datang di **Mystral** ✨`,
        `🌸 Hai, <@${message.author.id}>! Semoga harimu menyenangkan 🤍`,
        `✨ Salam, <@${message.author.id}>. Gerbang **Mystral** menyambutmu. 🕯️`,
        `🌙 Selamat datang kembali, <@${message.author.id}>. Semoga petualanganmu menyenangkan!`,
        `💜 Halo, <@${message.author.id}>! Ada yang bisa Relovie bantu hari ini?`,
        `⭐ Hai, <@${message.author.id}>! Semoga keberuntungan selalu bersamamu.`,
        `🌷 Welcome back, <@${message.author.id}>! Senang melihatmu lagi.`,
        `☀️ Halo, <@${message.author.id}>! Semoga harimu penuh keberuntungan.`,
        `🪄 Selamat datang, <@${message.author.id}>! Mystral selalu terbuka untukmu.`,
        `🤍 Hai, <@${message.author.id}>! Semoga harimu dipenuhi hal-hal baik.`
      ];

      return message.reply(greetings[Math.floor(Math.random() * greetings.length)]);
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
    if (cmd === "shorturl" || cmd === "su" || cmd === "surl") {
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
        .setFooter({ text: "Mystral • Arcane Notice" })
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
    if (["avatar", "ava", "av", "pfp", "pp"].includes(cmd)) {
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
        .setTitle("🏛️ Mystral — Realm Dossier")
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
      await setAfk(message.author.id, reason, message.guild?.id);

      // set nickname jadi [AFK] ...
      const member = await message.guild.members.fetch(message.author.id).catch(() => null);
      if (member) {
        const base = member.nickname || message.author.username;
        await trySetMemberNick(member, withAfkPrefix(base));
      }

      return message.channel.send({
        content: `💤 <@${message.author.id}> **AFK** — ${safeText(reason, 100)}`,
        allowedMentions: { parse: [] }
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
        return `• **${guild.name}** (\`${guild.id}\`) — ${guild.memberCount.toLocaleString("id-ID")} member`;
      }).join("\n");

      const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
      const responseText = `📡 **Bot terhubung di ${client.guilds.cache.size} server (Total: ${totalUsers.toLocaleString("id-ID")} users):**\n\n${guildsList}`;
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
        if (tarotUser?.last_reading_date === todayStr) {
          return message.reply(
            "> 🔮 Kamu sudah menggunakan **Daily Tarot** hari ini. Coba lagi setelah reset pada **00:00 WIB**."
          );
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

        const emb = await buildTarotProfileEmbed(targetUser, client, message.author);
        return message.reply({ embeds: [emb] });
      }

      if (sub === "lb" || sub === "leaderboard") {
        const emb = await buildTarotLeaderboardEmbed(message.guild, message.author);
        return message.reply({ embeds: [emb] });
      }

      if (sub === "collection" || sub === "col") {
        const targetUser =
          message.mentions.users.first() ||
          (args[1] && /^\d{15,25}$/.test(args[1])
            ? (await message.client.users.fetch(args[1]).catch(() => null)) || message.author
            : message.author);

        const emb = await buildTarotCollectionEmbed(targetUser, message.author);
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

    if (["tarotprofile", "tp", "tprofile", "tarotp"].includes(cmd)) {
      const targetUser =
        message.mentions.users.first() ||
        (args[0] && /^\d{15,25}$/.test(args[0])
          ? (await message.client.users.fetch(args[0]).catch(() => null)) || message.author
          : message.author);

      const emb = await buildTarotProfileEmbed(targetUser, client, message.author);
      return message.reply({ embeds: [emb] });
    }

    if (cmd === "tarotlb") {
      const emb = await buildTarotLeaderboardEmbed(message.guild, message.author);
      return message.reply({ embeds: [emb] });
    }

    if (cmd === "tarotcollection") {
      const targetUser =
        message.mentions.users.first() ||
        (args[0] && /^\d{15,25}$/.test(args[0])
          ? (await message.client.users.fetch(args[0]).catch(() => null)) || message.author
          : message.author);

      const emb = await buildTarotCollectionEmbed(targetUser, message.author);
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
    if (cmd === "stealemoji" || cmd === "stemoji" || cmd === "se") {
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

    // ===================== STAFF TAGGING TEST BUTTON INTERACTIONS =====================
    if (interaction.isButton() && interaction.customId.startsWith("ctag_testbtn_")) {
      const btnType = interaction.customId.replace("ctag_testbtn_", "");
      const now = Date.now();
      const config = await StaffTagConfig.findOne({ guild_id: interaction.guild?.id }).lean().catch(() => null);
      const slotName = getStaffSlotName(1, config);

      if (btnType === "done") {
        const payload = buildStaffTagCompletedContainer(interaction.user.id, slotName, now, false, null);
        return interaction.update(payload);
      }

      if (btnType === "busy") {
        const payload = buildStaffTagBusyContainer(interaction.user.id, slotName, true, config?.staff_role_id);
        return interaction.update(payload);
      }

      if (btnType === "takeover") {
        const payload = buildStaffTagTakeoverContainer(interaction.user.id, "Staff_Prev", slotName, true);
        return interaction.update(payload);
      }
    }

    // ===================== STAFF TAGGING REAL BUTTON INTERACTIONS =====================
    if (interaction.isButton() && interaction.customId.startsWith("ctag_btn_")) {
      const btnType = interaction.customId.replace("ctag_btn_", "");
      const guild = interaction.guild;
      if (!guild) return;

      const config = await StaffTagConfig.findOne({ guild_id: guild.id }).lean().catch(() => null);
      const isStaff = config?.staff_role_id && interaction.member.roles.cache.has(config.staff_role_id);
      const isAdmin = isBotOwner(interaction.user.id) || hasPerm(interaction.member, PermissionsBitField.Flags.ManageRoles);

      const schedules = await getOrGenerateDailyStaffSchedule(guild);
      if (!schedules || schedules.length < 2) {
        return interaction.reply({ content: "❌ Tidak ada jadwal tag member yang aktif hari ini.", flags: MessageFlags.Ephemeral });
      }

      if (btnType === "done") {
        const targetSched = schedules.find((s) => s.assigned_user_id === interaction.user.id && s.status !== "completed");
        if (!targetSched) {
          const activeSched = schedules.find((s) => s.status !== "completed");
          if (!activeSched) {
            return interaction.reply({ content: "✅ Semua tugas tag member hari ini sudah selesai!", flags: MessageFlags.Ephemeral });
          }
          return interaction.reply({
            content: `❌ Kamu bukan petugas staff yang ditugaskan untuk giliran ini!\n\nHanya petugas giliran (<@${activeSched.assigned_user_id}>) yang dapat menandai tugas ini selesai.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const now = Date.now();
        const isTakeover = targetSched.assigned_user_id !== targetSched.original_user_id;
        await StaffTagSchedule.updateOne(
          { _id: targetSched._id },
          { $set: { status: "completed", completed_at: now } }
        ).catch(() => null);

        const slotName = getStaffSlotName(targetSched.slot, config);
        const payload = buildStaffTagCompletedContainer(interaction.user.id, slotName, now, isTakeover, targetSched.original_user_id);
        return interaction.update(payload);
      }

      if (btnType === "busy") {
        const targetSched = schedules.find((s) => s.assigned_user_id === interaction.user.id && s.status === "pending");
        if (!targetSched) {
          const activeSched = schedules.find((s) => s.status === "pending");
          if (!activeSched) {
            return interaction.reply({ content: "❌ Tidak ada giliran tag member yang sedang pending hari ini.", flags: MessageFlags.Ephemeral });
          }
          return interaction.reply({
            content: `❌ Kamu bukan petugas staff yang ditugaskan meletakkan berhalangan.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        await StaffTagSchedule.updateOne({ _id: targetSched._id }, { $set: { status: "busy" } }).catch(() => null);
        const slotName = getStaffSlotName(targetSched.slot, config);
        const payload = buildStaffTagBusyContainer(interaction.user.id, slotName, false, config?.staff_role_id);
        return interaction.update(payload);
      }


      if (btnType === "takeover") {
        if (!isStaff && !isAdmin) {
          return interaction.reply({ content: "❌ Hanya anggota staff yang dapat mengambil alih tugas tag member.", flags: MessageFlags.Ephemeral });
        }

        let targetSched = schedules.find((s) => s.status === "busy");
        if (!targetSched) {
          targetSched = schedules.find((s) => s.status === "pending" && s.assigned_user_id !== interaction.user.id);
        }

        if (!targetSched) {
          return interaction.reply({ content: "❌ Tidak ada tugas tag member yang tersedia untuk di-takeover saat ini.", flags: MessageFlags.Ephemeral });
        }

        const prevUser = targetSched.assigned_user_id;
        await StaffTagSchedule.updateOne(
          { _id: targetSched._id },
          { $set: { assigned_user_id: interaction.user.id, status: "pending", notified_at: Date.now(), reminder_sent: false } }
        ).catch(() => null);

        const slotName = getStaffSlotName(targetSched.slot, config);
        const payload = buildStaffTagTakeoverContainer(interaction.user.id, prevUser, slotName);
        return interaction.update(payload);
      }
    }




    // ===================== AUTORESPONSE STRING SELECT MENU =====================
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("ar_select_")) {
      const choice = interaction.values[0];
      await interaction.reply({ content: `Anda memilih: **${choice}**`, flags: MessageFlags.Ephemeral }).catch(() => null);
      return;
    }

    // ===================== INTERACTIVE HELP CATEGORY CHANGE =====================
    if (interaction.isStringSelectMenu() && (interaction.customId.startsWith("help:menu:") || interaction.customId.startsWith("help:adminmenu:"))) {
      const parts = interaction.customId.split(":");
      const isAdminMenu = parts[1] === "adminmenu";
      const commandCallerId = parts[2];

      // Security check: Only the caller can interact
      if (commandCallerId !== "any" && interaction.user.id !== commandCallerId) {
        return interaction.reply({
          content: "❌ Menu bantuan ini dipanggil oleh orang lain. Silakan ketik `/help` atau `chelp` untuk memanggil menu bantuanmu sendiri!",
          flags: MessageFlags.Ephemeral
        });
      }

      if (isAdminMenu) {
        const isStaff = isBotOwner(interaction.user.id) ||
          hasPerm(interaction.member, PermissionsBitField.Flags.ManageRoles) ||
          hasPerm(interaction.member, PermissionsBitField.Flags.ManageMessages) ||
          hasPerm(interaction.member, PermissionsBitField.Flags.ModerateMembers) ||
          hasPerm(interaction.member, PermissionsBitField.Flags.Administrator);

        if (!isStaff) {
          return interaction.reply({
            content: "❌ Menu bantuan ini khusus untuk Administrator dan Moderator server.",
            flags: MessageFlags.Ephemeral
          });
        }
      }

      const selectedCategory = interaction.values[0];
      const ui = isAdminMenu
        ? buildAdminHelpUI(selectedCategory, commandCallerId)
        : buildHelpUI(selectedCategory, commandCallerId);

      await interaction.update(ui).catch(() => { });
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
            `╭・${TAROT_EMOJIS.cooldown} **Daily Tarot**`,
            `├・Kamu sudah menggunakan **Daily Tarot** hari ini.`,
            `╰・🕒 Coba lagi setelah reset harian pada **00:00 WIB**.`
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
        .setFooter({ text: `Mystral • Daily Tarot | Requested by ${interaction.user.username}` })
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

    // ===================== MENFESS: BUTTON + MODAL HANDLERS (FIX) =====================

    // BUTTON: buka modal
    if (interaction.isButton()) {
      // 1) Kirim menfess
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
          .setPlaceholder("https://... direct link png/jpg/gif")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(300);

        const colorInput = new TextInputBuilder()
          .setCustomId("warna")
          .setLabel("Warna Embed Hex (opsional)")
          .setPlaceholder("misal: #ff0000 atau #ffffff")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(7);

        modal.addComponents(
          new ActionRowBuilder().addComponents(toInput),
          new ActionRowBuilder().addComponents(msgInput),
          new ActionRowBuilder().addComponents(imgInput),
          new ActionRowBuilder().addComponents(colorInput)
        );

        return interaction.showModal(modal).catch((err) => {
          console.error("[MENFESS SHOW NEW MODAL ERROR]", err);
        });
      }

      // 2) Balas dari panel utama
      if (interaction.customId === "menfess:reply_panel") {
        const modal = new ModalBuilder()
          .setCustomId("menfess:modal:reply_panel")
          .setTitle("💬 Balas Menfess");

        const idInput = new TextInputBuilder()
          .setCustomId("target_id")
          .setLabel("No Menfess / Message ID")
          .setPlaceholder("Contoh: 1023 atau 123456789012345678")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50);

        const msgInput = new TextInputBuilder()
          .setCustomId("msg")
          .setLabel("Isi balasan")
          .setPlaceholder("Tulis balasanmu di sini…")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(900);

        modal.addComponents(
          new ActionRowBuilder().addComponents(idInput),
          new ActionRowBuilder().addComponents(msgInput)
        );

        return interaction.showModal(modal).catch((err) => {
          console.error("[MENFESS SHOW REPLY PANEL MODAL ERROR]", err);
        });
      }

      // 3) Balas dari tombol di menfess/thread
      if (interaction.customId.startsWith("menfess:reply:")) {
        const targetId = interaction.customId.split(":")[2];

        const modal = new ModalBuilder()
          .setCustomId("menfess:modal:reply_panel")
          .setTitle("💬 Balas Menfess");

        const idInput = new TextInputBuilder()
          .setCustomId("target_id")
          .setLabel("No Menfess / Message ID")
          .setPlaceholder(`Contoh: ${targetId}`)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50)
          .setValue(String(targetId));

        const msgInput = new TextInputBuilder()
          .setCustomId("msg")
          .setLabel("Isi balasan")
          .setPlaceholder("Tulis balasanmu di sini…")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(900);

        modal.addComponents(
          new ActionRowBuilder().addComponents(idInput),
          new ActionRowBuilder().addComponents(msgInput)
        );

        return interaction.showModal(modal).catch((err) => {
          console.error("[MENFESS SHOW REPLY BUTTON MODAL ERROR]", err);
        });
      }
    }

    // MODAL SUBMIT
    if (interaction.isModalSubmit()) {
      const cdKey = `${interaction.guildId}:${interaction.user.id}`;
      const now = Date.now();
      const last = menfessCooldown.get(cdKey) || 0;
      const cooldownMs = Number(process.env.MENFESS_COOLDOWN_MS || 15_000);
      const passCooldown = now - last >= cooldownMs;

      // 4) Submit kirim menfess baru
      if (interaction.customId === "menfess:modal:new") {
        if (!interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => { });

        try {
          if (!passCooldown) {
            return interaction.editReply(
              `⏳ pelan dulu ya, coba lagi <t:${Math.floor((last + cooldownMs) / 1000)}:R>`
            );
          }

          menfessCooldown.set(cdKey, now);

          const ch = await getTextChannelOrNull(
            interaction.guild,
            requireEnv("MENFESS_CHANNEL_ID")
          );

          if (!ch) {
            return interaction.editReply("⚠️ MENFESS_CHANNEL_ID tidak ketemu / bot tidak punya akses.");
          }

          const to = (interaction.fields.getTextInputValue("to") || "").trim().slice(0, 60);
          const msg = (interaction.fields.getTextInputValue("msg") || "").trim().slice(0, 900);
          const image = (interaction.fields.getTextInputValue("image") || "").trim().slice(0, 300);
          const rawWarna = (interaction.fields.getTextInputValue("warna") || "").trim();

          if (!msg) {
            return interaction.editReply("⚠️ isi menfess tidak boleh kosong.");
          }

          if (to && isBadAlias(to)) {
            return interaction.editReply("⚠️ kolom `Untuk` tidak boleh mengandung mention/role/staff impersonation.");
          }

          if (image) {
            const directImageErr = validateDirectImageUrl(image);
            if (directImageErr) {
              return interaction.editReply(directImageErr);
            }
          }

          let embedColor = Math.floor(Math.random() * 0xFFFFFF);
          if (rawWarna) {
            const cleanWarna = rawWarna.replace("#", "");
            if (/^[0-9a-fA-F]{6}$/.test(cleanWarna)) {
              embedColor = parseInt(cleanWarna, 16);
            }
          }

          const anonLabel = await getAnonLabel(interaction.user.id);
          const id = await nextMenfessId();

          await insertMenfessPost({
            id,
            messageId: null,
            channelId: ch.id,
          }).catch(() => null);

          const embed = new EmbedBuilder()
            .setTitle(`<a:w_mail:1523235712168890390> MENFESS #${id}`)
            .setColor(embedColor)
            .setDescription(
              [
                to ? `**Untuk:** ${to}` : null,
                msg,
              ].filter(Boolean).join("\n\n")
            );

          if (image) embed.setImage(image);

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("menfess:new")
              .setLabel("Kirim Baru")
              .setStyle(ButtonStyle.Success)
              .setEmoji("✉️"),

            new ButtonBuilder()
              .setCustomId(`menfess:reply:${id}`)
              .setLabel("Balas Anonim")
              .setStyle(ButtonStyle.Primary)
              .setEmoji("🫧")
          );

          const sent = await ch.send({
            embeds: [embed],
            components: [row],
            allowedMentions: { parse: [] },
          }).catch(() => null);

          if (!sent?.id) {
            return interaction.editReply("⚠️ gagal mengirim menfess. Cek permission bot.");
          }

          await updateMenfessPostLink(id, {
            messageId: sent.id,
            channelId: ch.id,
          }).catch(() => null);

          await handleMenfessButtonCleanup(interaction.client, sent).catch(() => null);

          await sendMenfessLog(interaction.guild, {
            kind: "post",
            id,
            senderId: interaction.user.id,
            senderNick: interaction.member?.displayName || interaction.user.username,
            anonLabel,
            to,
            channelId: ch.id,
            messageId: sent.id,
            content: msg,
            image: image || null,
          }).catch(() => null);

          return interaction.editReply("✅ menfess terkirim.");
        } catch (err) {
          console.error("[MENFESS NEW ERROR]", err);
          return interaction.editReply("⚠️ terjadi error saat mengirim menfess. Coba lagi nanti.").catch(() => { });
        }
      }

      // 5) Submit balas menfess
      if (interaction.customId === "menfess:modal:reply_panel") {
        if (!interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => { });

        try {
          if (!passCooldown) {
            return interaction.editReply(
              `⏳ pelan dulu ya, coba lagi <t:${Math.floor((last + cooldownMs) / 1000)}:R>`
            );
          }

          menfessCooldown.set(cdKey, now);

          const targetIdInput = (interaction.fields.getTextInputValue("target_id") || "")
            .trim()
            .replace(/^#/, "");

          const msg = (interaction.fields.getTextInputValue("msg") || "")
            .trim()
            .slice(0, 900);

          if (!targetIdInput || !msg) {
            return interaction.editReply("⚠️ input tidak valid.");
          }

          let post = await getMenfessPostById(targetIdInput).catch(() => null);

          if (!post) {
            const doc = await MenfessPost.findOne({ message_id: String(targetIdInput) });
            post = doc ? doc.toObject() : null;
          }

          if (!post) {
            return interaction.editReply("⚠️ menfess tidak ditemukan. Cek nomor menfess / message ID.");
          }

          const targetId = Number(post.id);
          const chId = post.channel_id || requireEnv("MENFESS_CHANNEL_ID");
          const ch = await getTextChannelOrNull(interaction.guild, chId);

          if (!ch) {
            return interaction.editReply("⚠️ channel menfess tidak ditemukan.");
          }

          const anonLabel = await getAnonLabel(interaction.user.id);
          const replyId = await nextMenfessId();

          const embed = new EmbedBuilder()
            .setTitle(`🤫 Balasan Anonim #${replyId}`)
            .setColor(Math.floor(Math.random() * 0xFFFFFF))
            .setDescription(
              [
                msg,
                `Reply to menfess #${targetId}`,
              ].join("\n\n")
            );

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("menfess:new")
              .setLabel("Kirim Baru")
              .setStyle(ButtonStyle.Success)
              .setEmoji("✉️"),

            new ButtonBuilder()
              .setCustomId(`menfess:reply:${targetId}`)
              .setLabel("Balas Anonim")
              .setStyle(ButtonStyle.Primary)
              .setEmoji("🫧")
          );

          const msgId = post.message_id || post.messageId;

          let targetMsg = null;
          if (msgId) {
            targetMsg = await ch.messages.fetch(msgId).catch(() => null);
          }

          let replyThread = null;

          if (post.thread_id) {
            replyThread = await ch.threads.fetch(post.thread_id).catch(() => null);
          }

          if (!replyThread && targetMsg) {
            replyThread = await targetMsg.startThread({
              name: `menfess-${targetId}`,
              autoArchiveDuration: 1440,
              reason: `Thread balasan menfess #${targetId}`,
            }).catch(() => null);

            if (replyThread?.id) {
              await updateMenfessPostLink(targetId, {
                messageId: msgId,
                channelId: ch.id,
                threadId: replyThread.id,
              }).catch(() => null);
            }
          }

          let sentReply = null;

          if (replyThread) {
            sentReply = await replyThread.send({
              embeds: [embed],
              components: [row],
              allowedMentions: { parse: [] },
            }).catch(() => null);
          } else if (targetMsg) {
            sentReply = await targetMsg.reply({
              embeds: [embed],
              components: [row],
              allowedMentions: { parse: [] },
            }).catch(() => null);
          } else {
            sentReply = await ch.send({
              embeds: [embed],
              components: [row],
              allowedMentions: { parse: [] },
            }).catch(() => null);
          }

          if (!sentReply?.id) {
            return interaction.editReply("⚠️ gagal mengirim balasan. Cek permission bot.");
          }

          await sendMenfessLog(interaction.guild, {
            kind: "reply",
            id: replyId,
            replyTo: targetId,
            senderId: interaction.user.id,
            senderNick: interaction.member?.displayName || interaction.user.username,
            anonLabel,
            channelId: ch.id,
            messageId: sentReply.id,
            content: msg,
          }).catch(() => null);

          return interaction.editReply("✅ balasan anonim terkirim.");
        } catch (err) {
          console.error("[MENFESS REPLY ERROR]", err);
          return interaction.editReply("⚠️ terjadi error saat mengirim balasan. Coba lagi nanti.").catch(() => { });
        }
      }
    }
    // ===================== END MENFESS HANDLERS =====================

    if (interaction.isButton() && interaction.customId === "sorting:roll") {
      await safeDeferUpdate(interaction);

      if (!interaction.guild) {
        await interaction.followUp({ content: "Guild only.", flags: MessageFlags.Ephemeral }).catch(() => { });
        return;
      }

      const sortingChannelId = process.env.SORTING_CHANNEL_ID;
      if (sortingChannelId && interaction.channelId !== sortingChannelId) {
        await interaction.followUp({ content: `⚠️ ritual ini cuma bisa dilakukan di <#${sortingChannelId}> ya.`, flags: MessageFlags.Ephemeral }).catch(() => { });
        return;
      }

      const idcard = await getIdCard(interaction.user.id).catch(() => null);
      if (!idcard) {
        await interaction.followUp({
          content:
            "🪪 **Segel Takdir tidak merespons.**\n" +
            "Identitas Mystral-mu belum terdaftar.\n\n" +
            "Buat **Mystral ID Card** terlebih dahulu dengan `/idcard` untuk melanjutkan ritual.",
          flags: MessageFlags.Ephemeral,
        }).catch(() => { });
        return;
      }

      const already = await getSortedUser(interaction.user.id).catch(() => null);
      if (already?.choice) {
        const label = already.choice === "dark"
          ? "<:dark:1459543141609771101> Dark Arcane"
          : "<:light:1459543076736336004> Light Arcane";
        await interaction.followUp({ content: `Kamu telah menjalani ritual sekali. Hasil kamu: **${label}**`, flags: MessageFlags.Ephemeral }).catch(() => { });
        return;
      }

      const choice = await pickChoiceBagMoreNatural().catch(() => "light");
      const name = interaction.member?.displayName || interaction.user.username;

      const bars = ["░░░░░░░░░░", "▓░░░░░░░░░", "▓▓░░░░░░░░", "▓▓▓░░░░░░░", "▓▓▓▓░░░░░░", "▓▓▓▓▓░░░░░", "▓▓▓▓▓▓░░░░", "▓▓▓▓▓▓▓░░░", "▓▓▓▓▓▓▓▓░░", "▓▓▓▓▓▓▓▓▓░", "▓▓▓▓▓▓▓▓▓▓"];
      const mantras = [
        "🔮 Arcane Deck is awakening...",
        "🃏 Drawing your tarot card...",
        "✨ Reading your destiny...",
        "🌙 Aligning cosmic energy...",
        "📜 Interpreting the tarot...",
        "💫 Revealing today's fortune..."
      ];
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

      // progress tampil di panel message (public)
      const setPanel = (text) => interaction.message.edit({ content: text }).catch(() => { });

      await setPanel(
        `✨ **Arcane Process**\n` +
        `> ${pick(mantras)}\n\n` +
        `Synchronizing data for **${name}**...\n` +
        `Progress: \`${bars[1]}\``
      );
      const delays = [900, 950, 1050, 900, 1100, 900, 1050, 950, 1100];
      for (let i = 2; i <= 9; i++) {
        await new Promise((r) => setTimeout(r, delays[i - 2]));
        await setPanel(
          `✨ **Arcane Process**\n` +
          `> ${pick(mantras)}\n\n` +
          `Synchronizing data for **${name}**...\n` +
          `Progress: \`${bars[1]}\``
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
          flags: MessageFlags.Ephemeral,
        }).catch(() => { });
      } else {
        await interaction.followUp({ content: "✅ Ritual berhasil.", flags: MessageFlags.Ephemeral }).catch(() => { });
      }

      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("tod:")) {
      if (!interaction.channel?.isTextBased?.()) {
        return interaction.reply({ content: "❌ Channel tidak valid.", flags: MessageFlags.Ephemeral }).catch(() => { });
      }

      const parts = interaction.customId.split(":");
      const action = parts[1]; // truth, dare, random, done, pass

      // If action is done/pass (resolution)
      if (action === "done" || action === "pass") {
        const targetId = parts[2];
        const questionId = parts[3];

        if (interaction.user.id !== targetId) {
          return interaction.reply({
            content: `❌ Hanya <@${targetId}> yang bisa menyelesaikan/melewati tantangan ini!`,
            flags: MessageFlags.Ephemeral
          }).catch(() => { });
        }

        // Fetch question details to render the completed card
        const q = await safeGet("SELECT * FROM tod_questions WHERE id = ?", [questionId]).catch(() => null);
        let questionText = "Tantangan/Pertanyaan TOD";
        let questionType = "truth";
        let rating = "PG";
        if (q) {
          questionText = q.question;
          questionType = q.type;
          rating = q.rating;
        }
        // (No embed fallback — messages are now Components v2)

        const reconstructedQ = { id: questionId, question: questionText, type: questionType, rating };
        const status = action === "done" ? "done" : "pass";

        await interaction.update({
          components: [todCard(reconstructedQ, null, targetId, status)],
          flags: MessageFlags.IsComponentsV2,
        }).catch(() => { });

        // AUTOMATICALLY SEND A NEW PANEL CARD!
        // The player who just completed/passed the challenge (targetId) is now the new challenger.
        await interaction.channel.send({
          components: [todPanelCard(targetId, "self"), todRow(targetId, "self")],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] }
        }).catch(() => { });

        return;
      }

      // If action is choosing Truth/Dare/Random from panel
      const challengerId = parts[2] || interaction.user.id;
      const targetId = parts[3] || "self";

      const allowedUser = targetId === "self" ? challengerId : targetId;
      if (interaction.user.id !== allowedUser) {
        return interaction.reply({
          content: `❌ Hanya <@${allowedUser}> yang bisa memilih kategori!`,
          flags: MessageFlags.Ephemeral
        }).catch(() => { });
      }

      // Apply cooldown
      const cdKey = `${interaction.guildId}:${interaction.user.id}`;
      const now = Date.now();
      const last = todCooldown.get(cdKey) || 0;
      const cooldownMs = Number(process.env.TOD_COOLDOWN_MS || 5000);

      if (now - last < cooldownMs) {
        return interaction.reply({
          content: `⏳ Tunggu sebentar sebelum ambil TOD lagi.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => { });
      }
      todCooldown.set(cdKey, now);

      const q =
        action === "truth"
          ? await getRandomTodQuestion({ type: "truth" })
          : action === "dare"
            ? await getRandomTodQuestion({ type: "dare" })
            : await getRandomTodQuestion();

      if (!q) {
        return interaction.reply({
          content: "❌ Gagal mendapatkan pertanyaan.",
          flags: MessageFlags.Ephemeral
        }).catch(() => { });
      }

      // Edit message to show the question card (Component v2)
      await interaction.update({
        components: [todCard(q, challengerId, allowedUser), todResponseRow(allowedUser, q.id)],
        flags: MessageFlags.IsComponentsV2,
      }).catch(() => { });

      // Auto-create thread if text channel
      if (interaction.channel.type === ChannelType.GuildText) {
        const targetUser = await interaction.client.users.fetch(allowedUser).catch(() => null);
        const nameTag = targetUser ? `@${targetUser.username}` : allowedUser;

        const thread = await interaction.message.startThread({
          name: `💬 TOD - ${nameTag}`,
          autoArchiveDuration: 60,
          reason: `Truth or Dare discussion`
        }).catch(() => null);

        if (thread) {
          await thread.send(`Halo <@${allowedUser}>, silakan jawab pertanyaan/lakukan tantanganmu di thread ini!`).catch(() => { });
        }
      }
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
        .setPlaceholder("contoh: Sumatera")
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
        .setLabel("Status - Contoh: In Love | Light atau Dark")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(60)
        .setRequired(false)
        .setPlaceholder("Contoh: In Love | Light atau Dark")
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
          avatarUrl: (interaction.member ?? interaction.user).displayAvatarURL({ extension: "png", size: 256 }),
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
          .setFooter({ text: "Mystral • Verified in the arcane" })
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
        return interaction.reply({ content: "Admin only", flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

    if (interaction.isChatInputCommand() && (interaction.commandName === "setup-verif" || interaction.commandName === "setup_verif")) {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "❌ Khusus Admin.", flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const panelCh = interaction.options.getChannel("panel_channel") || interaction.channel;
      const category = interaction.options.getChannel("category");
      const staffRole = interaction.options.getRole("staff_role");

      if (category) {
        await MetaText.updateOne(
          { key: `verif_category_${interaction.guild.id}` },
          { $set: { value: String(category.id) } },
          { upsert: true }
        );
      }

      if (staffRole) {
        await MetaText.updateOne(
          { key: `verif_staff_role_${interaction.guild.id}` },
          { $set: { value: String(staffRole.id) } },
          { upsert: true }
        );
      }

      const payload = buildFemaleVerificationPanel();
      await panelCh.send(payload);

      const catInfo = category ? ` | Category: ${category.name}` : "";
      const roleInfo = staffRole ? ` | Staff: <@&${staffRole.id}>` : "";
      return interaction.editReply(`✅ Panel verifikasi role cewe telah dikirim ke ${panelCh}${catInfo}${roleInfo}.`);
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

      const allowedTypes = ["complaint", "support", "report", "donate", "donation", "partnership", "verification", "ask", "custom"];
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

    // ===================== FEMALE VERIFICATION TICKET: BUKA TIKET =====================
    if (interaction.isButton() && interaction.customId === "btn_open_verif") {
      if (!interaction.guild) {
        return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
      }

      try {
        const FEMALE_ROLE_ID = "1459417971125522538";

        // 1. Cek apakah member udah punya role female
        if (interaction.member?.roles?.cache?.has(FEMALE_ROLE_ID)) {
          return interaction.reply({
            content: "❌ Kamu sudah punya role ini!",
            flags: MessageFlags.Ephemeral
          });
        }

        // 2. Cek apakah member udah punya tiket verifikasi yang terbuka
        const existingCh = interaction.guild.channels.cache.find(
          ch => ch.name === `verif-${(interaction.user.username || "user").toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 12)}` ||
            (ch.topic && ch.topic.includes("[TICKET:verification]") && ch.topic.includes(`[OWNER:${interaction.user.id}]`))
        );

        if (existingCh) {
          return interaction.reply({
            content: `⚠️ Kamu sudah memiliki tiket verifikasi yang sedang terbuka: ${existingCh}`,
            flags: MessageFlags.Ephemeral
          });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => { });

        const metaCat = await MetaText.findOne({ key: `verif_category_${interaction.guild.id}` }).catch(() => null);
        const metaStaff = await MetaText.findOne({ key: `verif_staff_role_${interaction.guild.id}` }).catch(() => null);
        const settings = await getTicketSettings(interaction.guild.id).catch(() => null);
        const categoryId = metaCat?.value || settings?.category_id;
        const staffRoleId = metaStaff?.value || settings?.staff_role_id;

        const safeUser = (interaction.user.username || "user").toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 12) || "user";
        const chName = `verif-${safeUser}`;

        const permissionOverwrites = [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.SendVoiceMessages,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks,
              PermissionsBitField.Flags.ReadMessageHistory,
            ],
          },
        ];

        const hasStaffRole = staffRoleId && interaction.guild.roles.cache.has(staffRoleId);
        if (hasStaffRole) {
          permissionOverwrites.push({
            id: staffRoleId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageMessages,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks,
            ],
          });
        }

        const channelOptions = {
          name: chName,
          topic: ticketMeta("verification", interaction.user.id),
          permissionOverwrites,
        };

        if (categoryId) {
          const catObj = interaction.guild.channels.cache.get(String(categoryId)) || await interaction.guild.channels.fetch(String(categoryId)).catch(() => null);
          if (catObj && catObj.type === ChannelType.GuildCategory) {
            channelOptions.parent = catObj.id;
          }
        }

        const channel = await interaction.guild.channels.create(channelOptions);

        await safeRun(
          `INSERT INTO tickets_custom (guild_id, channel_id, owner_id, type, subject, created_at)
           VALUES (?,?,?,?,?,?)`,
          [String(interaction.guild.id), String(channel.id), String(interaction.user.id), "verification", "Verifikasi Role Cewe", Date.now()]
        ).catch(() => null);

        const now = new Date();
        const options = { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Jakarta" };
        const hariTanggal = now.toLocaleDateString("id-ID", options);

        const ticketContainer = new ContainerBuilder().setAccentColor(0xFFC0CB);
        ticketContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## 🌸 Tiket Verifikasi - ${interaction.user.username}\n\n` +
            `Halo <@${interaction.user.id}>! Silakan kirimkan Voice Note (VN) langsung dari fitur Discord untuk verifikasi.\n\n` +
            `Wajib sebutkan ini di VN:\n` +
            `> *"Halo, aku ${interaction.user.username}/(nama panggilan), hari ini ${hariTanggal}, mau verif role female."*\n\n` +
            `Staff akan segera mengecek tiketmu. Mohon bersabar ya!`
          )
        );

        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`btn_approve_verif:${interaction.user.id}`)
            .setLabel("✅ Approve")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("btn_close_ticket")
            .setLabel("🔒 Close Ticket")
            .setStyle(ButtonStyle.Danger)
        );

        ticketContainer.addActionRowComponents(actionRow);

        const mentionsPayload = hasStaffRole ? `<@${interaction.user.id}> <@&${staffRoleId}>` : `<@${interaction.user.id}>`;
        const allowedMentionsObj = hasStaffRole ? { users: [interaction.user.id], roles: [staffRoleId] } : { users: [interaction.user.id] };

        await channel.send({
          content: mentionsPayload,
          allowedMentions: allowedMentionsObj,
        });

        await channel.send({
          components: [ticketContainer],
          flags: MessageFlags.IsComponentsV2,
        });

        return interaction.editReply(`🌸 Tiket verifikasi berhasil dibuat: ${channel}`);
      } catch (err) {
        console.error("[BTN OPEN VERIF ERROR]", err);
        if (interaction.deferred || interaction.replied) {
          return interaction.editReply(`❌ Gagal membuat tiket verifikasi: ${err.message || err}`);
        } else {
          return interaction.reply({ content: `❌ Gagal membuat tiket verifikasi: ${err.message || err}`, flags: MessageFlags.Ephemeral });
        }
      }
    }

    // ===================== FEMALE VERIFICATION TICKET: APPROVE =====================
    if (interaction.isButton() && interaction.customId.startsWith("btn_approve_verif")) {
      if (!interaction.guild) {
        return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
      }

      const FEMALE_ROLE_ID = "1459417971125522538";
      const metaStaff = await MetaText.findOne({ key: `verif_staff_role_${interaction.guild.id}` }).catch(() => null);
      const settings = await getTicketSettings(interaction.guild.id).catch(() => null);
      const staffRoleId = metaStaff?.value || settings?.staff_role_id;

      const isStaff = (staffRoleId && interaction.member?.roles?.cache?.has(staffRoleId)) ||
        interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator) ||
        interaction.member?.permissions?.has(PermissionsBitField.Flags.ManageGuild);

      if (!isStaff) {
        return interaction.reply({
          content: "❌ Hanya Staff yang dapat menyetujui verifikasi ini!",
          flags: MessageFlags.Ephemeral
        });
      }

      const parts = interaction.customId.split(":");
      let targetUserId = parts[1];
      if (!targetUserId) {
        targetUserId = getTicketOwnerIdFromTopic(interaction.channel?.topic || "");
      }

      if (!targetUserId) {
        return interaction.reply({ content: "❌ Tidak dapat menemukan pembuat tiket.", flags: MessageFlags.Ephemeral });
      }

      const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
      if (!targetMember) {
        return interaction.reply({ content: "❌ Member sudah tidak ada di server.", flags: MessageFlags.Ephemeral });
      }

      let roleSuccess = true;
      let roleErrMessage = "";
      await targetMember.roles.add(FEMALE_ROLE_ID).catch((e) => {
        console.error("[VERIF APPROVE ROLE ERROR]", e);
        roleSuccess = false;
        roleErrMessage = e.message || String(e);
      });

      if (!roleSuccess) {
        return interaction.reply({
          content: `❌ Gagal memberikan role female: ${roleErrMessage}\nPastikan hirarki role Bot di Discord Server Settings lebih tinggi dari role Female.`,
          flags: MessageFlags.Ephemeral
        });
      }

      const UNVERIFIED_FEMALE_ROLE_ID = "1459518390661287987";
      if (targetMember.roles.cache.has(UNVERIFIED_FEMALE_ROLE_ID)) {
        await targetMember.roles.remove(UNVERIFIED_FEMALE_ROLE_ID).catch((e) => {
          console.error("[VERIF APPROVE REMOVE UNVERIF ROLE ERROR]", e);
        });
      }

      // Ambil teks instruksi lama agar tidak terhapus
      const now = new Date();
      const options = { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Jakarta" };
      const hariTanggal = now.toLocaleDateString("id-ID", options);

      const baseText =
        `## 🌸 Tiket Verifikasi - ${targetMember.user?.username || targetUserId}\n\n` +
        `Halo <@${targetUserId}>! Silakan kirimkan Voice Note (VN) langsung dari fitur Discord untuk verifikasi.\n\n` +
        `Wajib sebutkan ini di VN:\n` +
        `> *"Halo, aku ${targetMember.user?.username || targetUserId}/(nama panggilan), hari ini ${hariTanggal}, mau verif role female."*\n\n` +
        `Staff akan segera mengecek tiketmu. Mohon bersabar ya!`;

      const updatedContainer = new ContainerBuilder().setAccentColor(0x2ecc71);
      updatedContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${baseText}\n\n---\n### ✅ Verifikasi Berhasil!\nRole <@&${FEMALE_ROLE_ID}> telah ditambahkan ke <@${targetUserId}> oleh <@${interaction.user.id}>.`
        )
      );

      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("btn_approve_verif_done")
          .setLabel("✅ Approved")
          .setStyle(ButtonStyle.Success)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("btn_close_ticket")
          .setLabel("🔒 Close Ticket")
          .setStyle(ButtonStyle.Danger)
      );

      updatedContainer.addActionRowComponents(disabledRow);

      // Log ke channel verif log (background)
      (async () => {
        try {
          const VERIF_LOG_CHANNEL_ID = "1459868526096420945";
          const logChannel = interaction.guild.channels.cache.get(VERIF_LOG_CHANNEL_ID) || await interaction.guild.channels.fetch(VERIF_LOG_CHANNEL_ID).catch(() => null);
          if (logChannel && logChannel.isTextBased()) {
            const logEmbed = new EmbedBuilder()
              .setTitle("🌸 Verifikasi Role Cewe Disetujui")
              .setColor(0xFFC0CB)
              .setDescription(
                `📌 **Channel Tiket:** ${interaction.channel}\n` +
                `👤 **Member:** <@${targetUserId}> (${targetMember?.user?.tag || targetUserId})\n` +
                `🎀 **Role Diberikan:** <@&${FEMALE_ROLE_ID}>\n` +
                `🛠️ **Disetujui Oleh:** <@${interaction.user.id}>`
              )
              .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
          }
        } catch (e) {
          console.error("[VERIF LOG ERROR]", e);
        }
      })();

      // Update message yang berisi button secara langsung
      return interaction.update({
        components: [updatedContainer],
        flags: MessageFlags.IsComponentsV2
      }).catch(async () => {
        await interaction.message.edit({
          components: [updatedContainer],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => { });
        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({
            content: `<:emoji_31:1459573171916116124> Verifikasi Berhasil! Role <@&${FEMALE_ROLE_ID}> telah ditambahkan ke <@${targetUserId}>.`,
            flags: MessageFlags.Ephemeral
          }).catch(() => { });
        }
      });
    }

    // ===================== TICKET: CLAIM / CLOSE =====================
    if (interaction.isButton() && (interaction.customId === "ticket:claim" || interaction.customId === "ticket:close" || interaction.customId === "btn_close_ticket" || interaction.customId === "btn_confirm_close_ticket" || interaction.customId === "btn_cancel_close_ticket")) {
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
      if (interaction.customId === "ticket:close" || interaction.customId === "btn_close_ticket") {
        if (!isOwner && !isStaff) {
          return interaction.reply({ content: "❌ Kamu bukan owner ticket atau staff.", flags: MessageFlags.Ephemeral }).catch(() => { });
        }

        const confirmEmbed = new EmbedBuilder()
          .setTitle("⚠️ Confirm Closed")
          .setDescription("Apakah kamu yakin ingin menutup tiket ini? Transkrip percakapan akan disimpan dan channel ini akan dihapus.")
          .setColor(0xe74c3c);

        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("btn_confirm_close_ticket")
            .setLabel("✅ Ya, Tutup")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("btn_cancel_close_ticket")
            .setLabel("❌ Batal")
            .setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({
          embeds: [confirmEmbed],
          components: [confirmRow],
        });
      }

      if (interaction.customId === "btn_cancel_close_ticket") {
        await interaction.update({
          content: "❌ Penutupan tiket dibatalkan.",
          embeds: [],
          components: [],
        }).catch(() => { });
        return;
      }

      if (interaction.customId === "btn_confirm_close_ticket") {
        await interaction.update({
          content: "⏳ Sedang memproses penutupan tiket dan menyimpan transkrip...",
          embeds: [],
          components: [],
        }).catch(() => { });

        // ✅ update DB dulu biar user bisa bikin ticket baru
        await safeRun(
          `UPDATE tickets_custom SET closed_at=? WHERE guild_id=? AND channel_id=? AND closed_at IS NULL`,
          [Date.now(), String(interaction.guild.id), String(interaction.channel.id)]
        ).catch(() => null);

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

          const isVerifTicket = type === "verification" || interaction.channel.name.startsWith("verif-");
          const embedTitle = isVerifTicket ? "🌸 Log Tiket Verifikasi Cewe (Closed)" : "🧾 Ticket Closed";
          const embedColor = isVerifTicket ? 0xFFC0CB : EMBED_COLOR;

          const logEmbed = new EmbedBuilder()
            .setTitle(embedTitle)
            .setColor(embedColor)
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

              if (!fetched || fetched.size === 0) break;

              messages.push(...fetched.values());
              const lastMsg = fetched.last();
              if (!lastMsg) break;
              lastId = lastMsg.id;
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
        await interaction.channel?.send("✅ Ticket ditutup. Channel akan dihapus...").catch(() => { });
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
        if (!interaction.guild) return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
        if (!isfaqAdmin) return interaction.reply({ content: "❌ Admin/Staff Only.", flags: MessageFlags.Ephemeral });

        const title = interaction.options.getString("title", true);
        const content = interaction.options.getString("content", true);
        const tags = interaction.options.getString("tags", false);

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const id = await faqAdd(interaction.guild.id, title, content, tags, interaction.user.id);
        return interaction.editReply(`✅ Artikel faq Ditambahkan: **#${id}**`);
      }

      if (cmd === "faq_edit") {
        if (!interaction.guild) return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
        if (!isfaqAdmin) return interaction.reply({ content: "❌ Admin/Staff Only.", flags: MessageFlags.Ephemeral });

        const id = interaction.options.getInteger("id", true);
        const title = interaction.options.getString("title", false);
        const content = interaction.options.getString("content", false);
        const tags = interaction.options.getString("tags", false);

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const ok = await faqUpdate(interaction.guild.id, id, { title, content, tags });
        if (!ok) return interaction.editReply("❌ Artikel Tidak Ditemukan.");
        return interaction.editReply(`✅ Artikel faq **#${id}** Berhasil Diperbarui.`);
      }

      if (cmd === "faq_delete") {
        if (!interaction.guild) return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
        if (!isfaqAdmin) return interaction.reply({ content: "❌ Admin/Staff Only.", flags: MessageFlags.Ephemeral });

        const id = interaction.options.getInteger("id", true);
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const cur = await faqGet(interaction.guild.id, id);
        if (!cur) return interaction.editReply("❌ Artikel Tidak Ditemukan.");

        await faqDelete(interaction.guild.id, id);
        return interaction.editReply(`🗑️ Artikel faq **#${id}** Dihapus.`);
      }

      if (cmd === "faq_view") {
        const id = interaction.options.getInteger("id", true);
        const item = await faqGet(interaction.guildId, id);

        if (!item) {
          return interaction.reply({ content: "❌ FAQ Tidak Ditemukan.", flags: MessageFlags.Ephemeral });
        }

        const e = buildfaqItemEmbed(interaction.guild, item); // <-- PASTIIN INI
        return interaction.reply({ embeds: [e], ephemeral: false });
      }

      if (cmd === "faq_search") {
        if (!interaction.guild) return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
        const query = interaction.options.getString("query", true);

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
        if (!interaction.guild) return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
        if (!isfaqAdmin) return interaction.reply({ content: "❌ Admin/Staff Only.", flags: MessageFlags.Ephemeral });

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
        if (!interaction.guild) return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
        if (!isfaqAdmin) return interaction.reply({ content: "❌ Admin/Staff Only.", flags: MessageFlags.Ephemeral });

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
        return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
      }

      const isAllowed =
        isBotOwner(interaction.user.id) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.Administrator);

      if (!isAllowed) {
        return interaction.reply({ content: "❌ Tidak punya izin.", flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
        return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
      }

      const isAllowed =
        isBotOwner(interaction.user.id) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.Administrator);

      if (!isAllowed) {
        return interaction.reply({ content: "❌ Tidak punya izin.", flags: MessageFlags.Ephemeral });
      }

      const rows = await listActiveGiveaways(interaction.guild.id);
      if (!rows.length) {
        return interaction.reply({ content: "Belum ada giveaway yang aktif.", flags: MessageFlags.Ephemeral });
      }

      const desc = rows
        .map((g) => `**#${g.id}** — ${g.prize}\nEnds <t:${Math.floor(g.end_at / 1000)}:R> • <#${g.channel_id}>`)
        .join("\n\n");

      const embed = new EmbedBuilder()
        .setTitle("🎁 Active Giveaways")
        .setColor(0x8b5cf6)
        .setDescription(desc)
        .setFooter({ text: "Mystral • Giveaway" });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "giveaway_entries") {
      if (!interaction.guild) {
        return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
      }

      const isAllowed =
        isBotOwner(interaction.user.id) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.Administrator);

      if (!isAllowed) {
        return interaction.reply({ content: "❌ Tidak punya izin.", flags: MessageFlags.Ephemeral });
      }

      const gid = interaction.options.getInteger("id", true);
      const g = await getGiveaway(gid);
      if (!g || g.guild_id !== interaction.guild.id) {
        return interaction.reply({ content: "❌ Giveaway tidak ditemukan.", flags: MessageFlags.Ephemeral });
      }

      const rows = await listGiveawayEntries(gid);
      if (!rows.length) {
        return interaction.reply({ content: `Belum ada peserta di giveaway **#${gid}**.`, flags: MessageFlags.Ephemeral });
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

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "giveaway_delete") {
      if (!interaction.guild) {
        return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
      }

      const isAllowed =
        isBotOwner(interaction.user.id) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.Administrator);

      if (!isAllowed) {
        return interaction.reply({ content: "❌ Tidak punya izin.", flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
        return interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
      }

      const isAllowed =
        isBotOwner(interaction.user.id) ||
        hasPerm(interaction.member, PermissionsBitField.Flags.ManageGuild);

      if (!isAllowed) {
        return interaction.reply({ content: "❌ Tidak punya izin.", flags: MessageFlags.Ephemeral });
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


      if (name === "ping") return safeReply(interaction, { content: `🏓 pong! ${client.ws.ping}ms` });

      if (name === "serverstats") {
        await interaction.deferReply();
        await handleServerStats(interaction);
        return;
      }
      if (name === "voicecheck") {
        await interaction.deferReply();
        await handleVoiceCheck(interaction);
        return;
      }
      if (name === "c") {
        const query = interaction.options.getString("query", true);
        const args = query.trim().split(/\s+/);
        const cmd = args.shift()?.toLowerCase();
        await interaction.deferReply();
        await handleDiscordManagementAssistant(interaction, query, cmd, args);
        return;
      }

      if (name === "tarot") {
        const sub = interaction.options.getSubcommand();
        const username = interaction.user.username;
        const userId = interaction.user.id;

        if (sub === "pull") {
          const todayStr = wibDayKey();
          const tarotUser = await getOrInitTarotUser(userId, username);
          if (tarotUser?.last_reading_date === todayStr) {
            return safeReply(interaction, {
              content: [
                `╭・<:pink_cards1:1510057886795956235> **Daily Tarot**`,
                `├・Kamu sudah menarik kartu tarot hari ini.`,
                `├・Daily Tarot hanya dapat digunakan sekali setiap hari.`,
                `╰・🕒 Tersedia kembali setelah reset pada **00:00 WIB**.`
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
          const emb = await buildTarotProfileEmbed(targetUser, client, interaction.user);
          return interaction.editReply({ embeds: [emb] });
        }

        if (sub === "leaderboard") {
          await safeDefer(interaction, false);
          const emb = await buildTarotLeaderboardEmbed(interaction.guild, interaction.user);
          return interaction.editReply({ embeds: [emb] });
        }

        if (sub === "collection") {
          const targetUser = interaction.options.getUser("user") || interaction.user;
          await safeDefer(interaction, false);
          const emb = await buildTarotCollectionEmbed(targetUser, interaction.user);
          return interaction.editReply({ embeds: [emb] });
        }

        if (sub === "recover") {
          await safeDefer(interaction, false);
          const res = await recoverTarotStreak(userId, username);
          if (res.error) return interaction.editReply(`❌ ${res.error}`);
          return interaction.editReply(`🩹 **Streak Tarot berhasil dipulihkan!**\nStreak kamu telah kembali aktif menjadi **${res.newStreak} Hari**! 🔥\n*(Sisa token pemulihan: **${res.recoveryLeft} / 3**)*`);
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
        const result = { success: true, message: "Database is MongoDB, no manual SQLite backup needed." };
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
          .setFooter({ text: "Mystral • Backup System" })
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
        await handleBotStatus(interaction);
        return;
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
          return handleTebakAngkaLeaderboard(interaction.client, interaction.guild.id, interaction, interaction.user.id);
        }

        if (sub === "all") {
          await safeDefer(interaction, false);
          const payload = await buildMonthlyRecapPayload(interaction.guild, null, null, false);
          return interaction.editReply(payload);
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

          const payload = await buildSupportPayload(interaction.guild);
          const msg = await destChannel.send(payload);

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

          const payload = await buildMonthlyRecapPayload(interaction.guild, month, year);
          const msg = await destChannel.send(payload);

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
          const targetUsername = user ? user.username : usernameStr.replace(/[<@!>]/g, "");
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
              content: `⚠️ **Peringatan Resmi dari Mystral**`,
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
        return safeReply(interaction, { ...ui, allowedMentions: { parse: [] } });
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
          return interaction.reply({ content: "❌ Silakan masukkan URL yang valid (harus diawali http:// atau https://).", flags: MessageFlags.Ephemeral });
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
        embed.setFooter({ text: footerRaw?.trim() || "Mystral • Arcane Notice" });

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
          return safeReply(interaction, {
            content: "❌ Command ini khusus pembuat bot.",
            flags: MessageFlags.Ephemeral,
          });
        }

        await safeDefer(interaction, true);

        const title =
          safeText(interaction.options.getString("title"), 200) ||
          "Panel";

        const description = String(
          interaction.options.getString("description") || ""
        )
          .trim()
          .slice(0, 3800);

        const channel =
          interaction.options.getChannel("channel") ||
          interaction.channel;

        const colorRaw = interaction.options.getString("color");

        const footerRaw = String(
          interaction.options.getString("footer") || ""
        )
          .trim()
          .slice(0, 500);

        const mentionUser =
          interaction.options.getUser("mention_user");

        const mentionRole =
          interaction.options.getRole("mention_role");

        // Validasi channel
        if (!channel?.isTextBased?.() || !channel?.send) {
          return interaction.editReply({
            content: "⚠️ Channel tujuan harus berupa text channel.",
          });
        }

        // Validasi permission bot
        if (interaction.guild) {
          const botMember = interaction.guild.members.me;
          const permissions = channel.permissionsFor(botMember);

          if (
            !permissions?.has([
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ])
          ) {
            return interaction.editReply({
              content:
                "❌ Bot tidak memiliki izin untuk melihat atau mengirim pesan di channel tersebut.",
            });
          }
        }

        // Daftar mention
        const mentionParts = [];

        if (mentionRole) {
          mentionParts.push(`<@&${mentionRole.id}>`);
        }

        if (mentionUser) {
          mentionParts.push(`<@${mentionUser.id}>`);
        }

        // Membuat Components V2
        const panel = new ContainerBuilder();

        panel.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${title}`)
        );

        // Jangan menambahkan TextDisplay kosong
        if (description) {
          panel.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(description)
          );
        }

        // Accent color
        if (colorRaw) {
          panel.setAccentColor(
            parseHexColor(colorRaw, EMBED_COLOR)
          );
        }

        // Separator dan footer
        panel.addSeparatorComponents(
          new SeparatorBuilder().setDivider(true)
        );

        panel.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            footerRaw || "Mystral • Official Notice"
          )
        );

        const payload = {
          components: [panel],
          flags: MessageFlags.IsComponentsV2,
        };

        try {
          // Mention dikirim terpisah karena Components V2
          // tidak dapat digabung dengan content biasa.
          if (mentionParts.length > 0) {
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

          return interaction.editReply({
            content: `✅ Panel V2 berhasil dikirim ke ${channel}.`,
          });
        } catch (error) {
          console.error(
            "[sendembedv2] failed:",
            error?.rawError || error?.stack || error?.message || error
          );

          const errorMessage = safeText(
            error?.rawError?.message ||
            error?.message ||
            "Unknown error",
            180
          );

          return interaction.editReply({
            content: `❌ Gagal mengirim panel V2: ${errorMessage}`,
          });
        }
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

      if (name === "servers") {
        if (!isBotOwner(interaction.user.id)) {
          return safeReply(interaction, { content: "❌ Khusus Pembuat Bot.", flags: MessageFlags.Ephemeral });
        }
        const guilds = client.guilds.cache.map(g => `• **${g.name}** (\`${g.id}\`) — ${g.memberCount.toLocaleString("id-ID")} users`).join("\n");
        const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
        return safeReply(interaction, {
          content: `📊 **Bot Servers (${client.guilds.cache.size}):**\n${guilds}\n\n**Total Users:** ${totalUsers.toLocaleString("id-ID")}`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (name === "halo") {
        const serverName = interaction.guild?.name || "Mystral District";

        const replies = [
          `👋 Halo, **${interaction.user.username}**!\nSelamat datang di **${serverName}**. Semoga harimu menyenangkan!`,
          `🌙 Hai, **${interaction.user.username}**.\nSenang melihatmu hadir di **${serverName}**. Ada yang bisa kami bantu?`,
          `✨ Halo, **${interaction.user.username}**!\nTerima kasih sudah mampir ke **${serverName}**. Semoga betah di sini.`,
          `<a:SpinningPinkCrystalHeart:1444893614428786820> Selamat datang, **${interaction.user.username}**.\nNikmati waktu bersama komunitas **${serverName}**!`,
          `🪄 Halo, **${interaction.user.username}**.\nSemoga harimu menyenangkan dan pengalamanmu di **${serverName}** semakin seru.`,
          `🌌 Hai, **${interaction.user.username}**!\nTerima kasih telah menjadi bagian dari **${serverName}**.`,
          `☕ Halo, **${interaction.user.username}**.\nIstirahat sejenak, ngobrol santai, dan nikmati suasana **${serverName}**.`,
          `🚀 Halo, **${interaction.user.username}**!\nSemoga hari ini penuh ide, teman baru, dan pengalaman seru di **${serverName}**.`
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
          .setDescription("Asisten resmi **MYSTRAL District** yang siap membantu mengelola komunitas, memberikan informasi, serta menjaga pengalaman server tetap nyaman dan terorganisir.")
          .addFields(
            { name: "🏷️ Name", value: `${client.user.tag}`, inline: true },
            { name: "📡 Ping", value: `${client.ws.ping}ms`, inline: true },
            { name: "⏳ Uptime", value: `${hours}h ${mins}m ${secs}s`, inline: true },
            { name: "🧩 Version", value: "discord.js v14", inline: true },
            { name: "👨‍💻 Developer", value: `<@${776022128092774410}>`, inline: true }
          )
          .setThumbnail(client.user.displayAvatarURL({ extension: "png", size: 256 }))
          .setFooter({ text: "Developed with ❤️ for MYSTRAL District", })
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
        const targetUser = interaction.options.getUser("target");
        const challengerId = interaction.user.id;
        const targetId = targetUser ? targetUser.id : challengerId;

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

        // Mode: PANEL (Sends category buttons panel)
        if (mode === "panel") {
          await interaction.channel.send({
            components: [todPanelCard(challengerId, targetId), todRow(challengerId, targetId)],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] }
          });

          return safeReply(interaction, {
            content: "✅ Panel Truth or Dare terkirim.",
            flags: MessageFlags.Ephemeral,
          });
        }

        // Mode: TRUTH / DARE / RANDOM / DAILY (Immediately sends question)
        const q =
          mode === "truth"
            ? await getRandomTodQuestion({ type: "truth" })
            : mode === "dare"
              ? await getRandomTodQuestion({ type: "dare" })
              : mode === "daily"
                ? await getRandomTodQuestion({ category: todThemeForToday() })
                : await getRandomTodQuestion();

        if (!q) {
          return safeReply(interaction, {
            content: "❌ Gagal mendapatkan pertanyaan. Pastikan database sudah terisi.",
            flags: MessageFlags.Ephemeral
          });
        }

        // Send question with Selesai & Menyerah buttons (Component v2)
        const msg = await interaction.channel.send({
          components: [todCard(q, challengerId, targetId), todResponseRow(targetId, q.id)],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] }
        });

        // Auto-create thread if text channel
        if (interaction.channel.type === ChannelType.GuildText) {
          const nameTag = targetUser ? `@${targetUser.username}` : `@${interaction.user.username}`;
          const thread = await msg.startThread({
            name: `💬 TOD - ${nameTag}`,
            autoArchiveDuration: 60,
            reason: `Truth or Dare discussion`
          }).catch(() => null);

          if (thread) {
            const targetMention = targetUser ? `<@${targetId}>` : `<@${challengerId}>`;
            await thread.send(`Halo ${targetMention}, silakan jawab pertanyaan/lakukan tantanganmu di thread ini!`).catch(() => { });
          }
        }

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
          .setTitle("🏛️ Mystral — Realm Dossier")
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
        await setAfk(interaction.user.id, reason, interaction.guildId);

        // set nickname jadi [AFK] ...
        const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
        if (member) {
          const base = member.nickname || interaction.user.username;
          await trySetMemberNick(member, withAfkPrefix(base));
        }

        return safeReply(interaction, {
          content: `💤 <@${interaction.user.id}> **AFK** — ${safeText(reason, 100)}`,
          allowedMentions: { repliedUser: false, parse: [] },
        });
      }

      if (name === "afk_clear") {
        if (!hasPerm(interaction.member, PermissionsBitField.Flags.ModerateMembers) && !hasPerm(interaction.member, PermissionsBitField.Flags.Administrator)) {
          return safeReply(interaction, { content: "❌ Butuh izin `Moderate Members`.", flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getUser("user", true);
        const removed = await clearAfk(targetUser.id, interaction.guildId);
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
        const rows = await getAllAfkUsers(interaction.guildId);
        const removed = await clearAllAfkUsers(interaction.guildId);

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

      if (name === "sticky") {
        if (!interaction.guild) return;
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
          return safeReply(interaction, { content: "❌ You need `Manage Messages` permission to use this command.", flags: MessageFlags.Ephemeral });
        }

        const sub = interaction.options.getSubcommand();
        if (sub === "set") {
          const content = interaction.options.getString("content", true).trim();

          await safeRun(
            "INSERT INTO sticky_messages (channel_id, content, last_message_id) VALUES (?, ?, NULL) ON CONFLICT(channel_id) DO UPDATE SET content=excluded.content",
            [interaction.channelId, content]
          );

          // Delete old message if any
          const cache = stickyCache.get(interaction.channelId);
          if (cache?.lastMessageId) {
            const oldMsg = await interaction.channel.messages.fetch(cache.lastMessageId).catch(() => null);
            if (oldMsg) await oldMsg.delete().catch(() => null);
          }

          // Send first sticky message
          const sent = await interaction.channel.send({ content }).catch(() => null);
          const lastMessageId = sent ? sent.id : null;
          if (sent) {
            await safeRun("UPDATE sticky_messages SET last_message_id=? WHERE channel_id=?", [lastMessageId, interaction.channelId]);
          }

          stickyCache.set(interaction.channelId, { content, lastMessageId });

          const embed = new EmbedBuilder().setTitle("✅ Sticky Message Set").setColor(0x2ecc71).setDescription(`Successfully set sticky message for <#${interaction.channelId}>.`).setTimestamp();
          return safeReply(interaction, { embeds: [embed] });
        }

        if (sub === "edit") {
          const content = interaction.options.getString("content", true).trim();
          const exists = stickyCache.has(interaction.channelId);
          if (!exists) {
            const embed = new EmbedBuilder().setTitle("❌ Error").setColor(0xe74c3c).setDescription(`No sticky message is currently set in <#${interaction.channelId}>. Use \`/sticky set\` first.`).setTimestamp();
            return safeReply(interaction, { embeds: [embed], flags: MessageFlags.Ephemeral });
          }

          await safeRun(
            "UPDATE sticky_messages SET content=? WHERE channel_id=?",
            [content, interaction.channelId]
          );

          // Delete old message if any
          const cache = stickyCache.get(interaction.channelId);
          if (cache?.lastMessageId) {
            const oldMsg = await interaction.channel.messages.fetch(cache.lastMessageId).catch(() => null);
            if (oldMsg) await oldMsg.delete().catch(() => null);
          }

          // Send updated sticky message
          const sent = await interaction.channel.send({ content }).catch(() => null);
          const lastMessageId = sent ? sent.id : null;
          if (sent) {
            await safeRun("UPDATE sticky_messages SET last_message_id=? WHERE channel_id=?", [lastMessageId, interaction.channelId]);
          }

          stickyCache.set(interaction.channelId, { content, lastMessageId });

          const embed = new EmbedBuilder().setTitle("✅ Sticky Message Edited").setColor(0x2ecc71).setDescription(`Successfully updated sticky message for <#${interaction.channelId}>.`).setTimestamp();
          return safeReply(interaction, { embeds: [embed] });
        }

        if (sub === "remove") {
          const cache = stickyCache.get(interaction.channelId);
          if (cache?.lastMessageId) {
            const oldMsg = await interaction.channel.messages.fetch(cache.lastMessageId).catch(() => null);
            if (oldMsg) await oldMsg.delete().catch(() => null);
          }

          await safeRun("DELETE FROM sticky_messages WHERE channel_id=?", [interaction.channelId]);
          stickyCache.delete(interaction.channelId);

          const embed = new EmbedBuilder().setTitle("✅ Sticky Message Removed").setColor(0x2ecc71).setDescription(`Successfully removed sticky message from <#${interaction.channelId}>.`).setTimestamp();
          return safeReply(interaction, { embeds: [embed] });
        }

        if (sub === "list") {
          const stickies = await safeAll("SELECT * FROM sticky_messages").catch(() => []);
          const guildChannels = await interaction.guild.channels.fetch().catch(() => null);
          if (!guildChannels) {
            return safeReply(interaction, { content: "❌ Failed to fetch channels list.", flags: MessageFlags.Ephemeral });
          }

          const activeInGuild = [];
          for (const row of stickies) {
            if (guildChannels.has(row.channel_id)) {
              const snippet = row.content.length > 50 ? row.content.slice(0, 50) + "..." : row.content;
              activeInGuild.push(`• <#${row.channel_id}>: \`${snippet}\``);
            }
          }

          const embed = new EmbedBuilder()
            .setTitle("📌 Active Sticky Messages")
            .setColor(EMBED_COLOR)
            .setDescription(activeInGuild.length > 0 ? activeInGuild.join("\n") : "No active sticky messages in this server.")
            .setTimestamp();
          return safeReply(interaction, { embeds: [embed] });
        }
      }

      if (name === "media") {
        if (!interaction.guild) return;
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
          return safeReply(interaction, { content: "❌ You need `Manage Messages` permission to use this command.", flags: MessageFlags.Ephemeral });
        }

        const sub = interaction.options.getSubcommand();
        const settings = await getOrInitMediaSettings(interaction.guildId);

        if (sub === "enable") {
          settings.enabled = 1;
          await saveMediaSettings(interaction.guildId, settings);
          const embed = new EmbedBuilder().setTitle("✅ Media Embed Enabled").setColor(0x2ecc71).setDescription("Universal Media Embed features are now **enabled** globally in this server.").setTimestamp();
          return safeReply(interaction, { embeds: [embed] });
        }

        if (sub === "disable") {
          settings.enabled = 0;
          await saveMediaSettings(interaction.guildId, settings);
          const embed = new EmbedBuilder().setTitle("✅ Media Embed Disabled").setColor(0xe74c3c).setDescription("Universal Media Embed features are now **disabled** globally in this server.").setTimestamp();
          return safeReply(interaction, { embeds: [embed] });
        }

        if (sub === "delete-original") {
          const val = interaction.options.getBoolean("value", true);
          settings.deleteOriginal = val ? 1 : 0;
          await saveMediaSettings(interaction.guildId, settings);
          const embed = new EmbedBuilder()
            .setTitle("✅ Setting Updated")
            .setColor(0x2ecc71)
            .setDescription(`Auto-delete of original links is now set to **${val ? "enabled (true)" : "disabled (false)"}**.`)
            .setTimestamp();
          return safeReply(interaction, { embeds: [embed] });
        }

        if (sub === "quality") {
          const pref = interaction.options.getString("preference", true);
          settings.quality = pref;
          await saveMediaSettings(interaction.guildId, settings);
          const embed = new EmbedBuilder()
            .setTitle("✅ Quality Set")
            .setColor(0x2ecc71)
            .setDescription(`Video quality preference set to **${pref}**.`)
            .setTimestamp();
          return safeReply(interaction, { embeds: [embed] });
        }

        if (sub === "platform") {
          const plat = interaction.options.getString("name", true).toLowerCase();
          const platEnabled = interaction.options.getBoolean("enabled", true);
          if (!settings.platforms) settings.platforms = {};
          settings.platforms[plat] = platEnabled;
          await saveMediaSettings(interaction.guildId, settings);
          const embed = new EmbedBuilder()
            .setTitle("✅ Platform Updated")
            .setColor(0x2ecc71)
            .setDescription(`Platform **${plat.toUpperCase()}** is now **${platEnabled ? "enabled" : "disabled"}**.`)
            .setTimestamp();
          return safeReply(interaction, { embeds: [embed] });
        }

        if (sub === "status") {
          const platList = [
            "tiktok", "instagram", "twitter", "reddit", "threads",
            "youtube", "facebook", "twitch", "kick", "bilibili",
            "pinterest", "bluesky", "imgur", "streamable", "vimeo"
          ];
          const statuses = platList.map(p => {
            const isPlatEnabled = settings.platforms && settings.platforms[p] !== undefined ? settings.platforms[p] : true;
            return `• **${p.toUpperCase()}**: ${isPlatEnabled ? "🟢 Enabled" : "🔴 Disabled"}`;
          }).join("\n");

          const embed = new EmbedBuilder()
            .setTitle("⚙️ Universal Media Embed Settings")
            .setColor(EMBED_COLOR)
            .addFields(
              { name: "Global Status", value: settings.enabled ? "🟢 Enabled" : "🔴 Disabled", inline: true },
              { name: "Auto-Delete Original", value: settings.deleteOriginal ? "🟢 True" : "🔴/False", inline: true },
              { name: "Quality Preference", value: `\`${settings.quality}\``, inline: true },
              { name: "Supported Platforms Status", value: statuses }
            )
            .setTimestamp();
          return safeReply(interaction, { embeds: [embed] });
        }
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
        const rawWarna = interaction.options.getString("warna");

        if (attachment) {
          if (attachment.size > 50 * 1024 * 1024) {
            return safeReply(interaction, {
              content: "⚠️ Lampiran tidak boleh lebih dari 50MB!",
              flags: MessageFlags.Ephemeral,
            });
          }
        }

        let embedColor = EMBED_COLOR;
        if (rawWarna) {
          const cleanWarna = rawWarna.trim().replace("#", "");
          if (/^[0-9a-fA-F]{6}$/.test(cleanWarna)) {
            embedColor = parseInt(cleanWarna, 16);
          }
        }

        const anonLabel = await getAnonLabel(interaction.user.id);
        const id = await nextMenfessId();

        // simpan post dulu (message_id nanti di-update setelah send)
        await insertMenfessPost({ id, messageId: null, channelId: ch.id }).catch(() => null);

        const embed = new EmbedBuilder()
          .setTitle(`<a:w_mail:1523235712168890390> MENFESS #${id}`)
          .setColor(embedColor)
          .setDescription(
            [
              to ? `**Untuk:** ${to}` : null,
              msg,
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
          await MenfessPost.create({ message_id: String(sent.id), channel_id: String(ch.id), created_at: Date.now() }).catch(() => null);
          await updateMenfessPostLink(id, { messageId: sent.id, channelId: ch.id }).catch(() => null);
          await handleMenfessButtonCleanup(interaction.client, sent);
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
        await safeDefer(interaction).catch(() => { }); // public

        try {
          const rows = await getAllAfkUsers(interaction.guildId);
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
        const targetMember = interaction.options.getMember("user") || interaction.member;

        const sorted = await getSortedUser(targetUser.id);
        if (!sorted?.choice) {
          return safeReply(interaction, { content: `⚠️ ${targetUser.id === interaction.user.id ? "Kamu" : `<@${targetUser.id}>`} belum melakukan Arcane Sorting.`, allowedMentions: { parse: [] } });
        }

        const idData = await getIdCard(targetUser.id);
        if (!idData) {
          const idCh = requireEnv("IDCARD_CHANNEL_ID");
          const mention = idCh ? `<#${idCh}>` : "channel ID Card";
          return safeReply(interaction, { content: `⚠️ ${targetUser.id === interaction.user.id ? "Kamu" : `<@${targetUser.id}>`} belum punya **Mystral ID Card**.\nSilahkan buat dulu di ${mention} dengan command **/idcard**.`, allowedMentions: { parse: [] } });
        }

        await safeDefer(interaction, false);

        const png = await renderHouseCard({
          choice: sorted.choice,
          name: idData.name || targetUser.username,
          gender: idData.gender || "—",
          hovId: idData.number || "—",
          avatarUrl: (targetMember ?? targetUser).displayAvatarURL({ extension: "png", size: 256 }),
        });

        const filename = `house_${targetUser.id}.png`;
        const file = new AttachmentBuilder(png, { name: filename });

        const embed = new EmbedBuilder()
          .setTitle("🪪 Mystral Card")
          .setColor(EMBED_COLOR)
          .setDescription(
            [
              `**Member:** <@${targetUser.id}>`,
              `**Student:** ${sorted.choice === "dark" ? "<:dark:1459543141609771101> Dark Arcane" : "<:light:1459543076736336004> Light Arcane"}`,
            ].join("\n")
          )
          .setImage(`attachment://${filename}`)
          .setFooter({ text: "Mystral • Student Registry" })
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
          return interaction.reply({ content: "⚠️ Kamu masih punya ticket.", flags: MessageFlags.Ephemeral });
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

      // ================== QUOTES SYSTEM ==================
      if (interaction.isButton() && interaction.customId === "add_quote") {
        if (interaction.channelId !== QUOTES_CHANNEL_ID) {
          return interaction.reply({ content: "Ini cuma bisa dipakai di quotes channel.", flags: MessageFlags.Ephemeral });
        }

        const modal = new ModalBuilder().setCustomId("add_quote_modal").setTitle("Add a Quote");

        const quoteInput = new TextInputBuilder()
          .setCustomId("quote_text")
          .setLabel("Your quote")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(240);

        modal.addComponents(new ActionRowBuilder().addComponents(quoteInput));
        return interaction.showModal(modal);
      }

    } // close pending block

    if (interaction.isModalSubmit() && interaction.customId === "add_quote_modal") {
      if (interaction.channelId !== QUOTES_CHANNEL_ID) {
        return interaction.reply({ content: "Ini cuma bisa dipakai di quotes channel.", flags: MessageFlags.Ephemeral });
      }

      const quoteText = (interaction.fields.getTextInputValue("quote_text") || "").trim();
      if (!quoteText) return interaction.reply({ content: "Quote kosong.", flags: MessageFlags.Ephemeral });

      try {
        await safeDefer(interaction, true);

        // Fetch full GuildMember to get the server-specific avatar
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => interaction.member);
        const avatarURL = member?.displayAvatarURL?.({ extension: "png", size: 512 }) || interaction.user.displayAvatarURL({ extension: "png", size: 512 });

        const buffer = await renderQuoteImage({
          avatarURL,
          quote: quoteText.length > 240 ? quoteText.slice(0, 240) + "…" : quoteText,
          authorName: member?.displayName || interaction.user.username,
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
          components: [buildQuoteButtonRow()]
        });

        await interaction.deleteReply().catch(() => { });
      } catch (err) {
        console.error("[QUOTES] modal error:", err);
        if (interaction.deferred || interaction.replied) {
          return interaction.editReply(`Error bikin quote: ${err.message}`).catch(() => null);
        } else {
          return interaction.reply({ content: `Error bikin quote: ${err.message}`, flags: MessageFlags.Ephemeral }).catch(() => null);
        }
      }
    }

  } catch (err) {
    if (isIgnorableDiscordError(err)) return;
    console.error("[INTERACTION ERROR]", err);

    try {
      if (interaction.deferred && !interaction.replied) {
        return await interaction.editReply({ content: "⚠️ ada error di bot, coba lagi ya." }).catch(() => null);
      }

      if (!interaction.replied && !interaction.deferred) {
        return await interaction.reply({
          content: "⚠️ ada error di bot, coba lagi ya.",
          flags: MessageFlags.Ephemeral,
        }).catch(() => null);
      }
    } catch { }
  }
}); // end Events.InteractionCreate (main handler)

// ================== QUOTES SYSTEM ================== //
// NOTE: semua perubahan di bawah ini khusus untuk sistem Quotes (sesuai request).

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

function cleanName(name) {
  if (!name) return "";
  let result = "";
  for (const char of name) {
    const cp = char.codePointAt(0);
    if (cp >= 0x1D400 && cp <= 0x1D7FF) {
      if (cp >= 0x1D400 && cp <= 0x1D419) result += String.fromCharCode(cp - 0x1D400 + 0x41);
      else if (cp >= 0x1D41A && cp <= 0x1D433) result += String.fromCharCode(cp - 0x1D41A + 0x61);
      else if (cp >= 0x1D434 && cp <= 0x1D44D) result += String.fromCharCode(cp - 0x1D434 + 0x41);
      else if (cp >= 0x1D44E && cp <= 0x1D467) result += String.fromCharCode(cp - 0x1D44E + 0x61);
      else if (cp >= 0x1D468 && cp <= 0x1D481) result += String.fromCharCode(cp - 0x1D468 + 0x41);
      else if (cp >= 0x1D482 && cp <= 0x1D49B) result += String.fromCharCode(cp - 0x1D482 + 0x61);
      else if (cp >= 0x1D49C && cp <= 0x1D4B5) result += String.fromCharCode(cp - 0x1D49C + 0x41);
      else if (cp >= 0x1D4B6 && cp <= 0x1D4CF) result += String.fromCharCode(cp - 0x1D4B6 + 0x61);
      else if (cp >= 0x1D4D0 && cp <= 0x1D4E9) result += String.fromCharCode(cp - 0x1D4D0 + 0x41);
      else if (cp >= 0x1D4EA && cp <= 0x1D503) result += String.fromCharCode(cp - 0x1D4EA + 0x61);
      else if (cp >= 0x1D504 && cp <= 0x1D51D) result += String.fromCharCode(cp - 0x1D504 + 0x41);
      else if (cp >= 0x1D51E && cp <= 0x1D537) result += String.fromCharCode(cp - 0x1D51E + 0x61);
      else if (cp >= 0x1D538 && cp <= 0x1D551) result += String.fromCharCode(cp - 0x1D538 + 0x41);
      else if (cp >= 0x1D552 && cp <= 0x1D56B) result += String.fromCharCode(cp - 0x1D552 + 0x61);
      else if (cp >= 0x1D5A0 && cp <= 0x1D5B9) result += String.fromCharCode(cp - 0x1D5A0 + 0x41);
      else if (cp >= 0x1D5BA && cp <= 0x1D5D3) result += String.fromCharCode(cp - 0x1D5BA + 0x61);
      else if (cp >= 0x1D670 && cp <= 0x1D689) result += String.fromCharCode(cp - 0x1D670 + 0x41);
      else if (cp >= 0x1D68A && cp <= 0x1D6A3) result += String.fromCharCode(cp - 0x1D68A + 0x61);
      else if (cp >= 0x1D7CE && cp <= 0x1D7D7) result += String.fromCharCode(cp - 0x1D7CE + 0x30);
      else if (cp >= 0x1D7D8 && cp <= 0x1D7E1) result += String.fromCharCode(cp - 0x1D7D8 + 0x30);
      else if (cp >= 0x1D7E2 && cp <= 0x1D7EB) result += String.fromCharCode(cp - 0x1D7E2 + 0x30);
      else if (cp >= 0x1D7EC && cp <= 0x1D7F5) result += String.fromCharCode(cp - 0x1D7EC + 0x30);
      else if (cp >= 0x1D7F6 && cp <= 0x1D7FF) result += String.fromCharCode(cp - 0x1D7F6 + 0x30);
    } else {
      result += char;
    }
  }
  result = result.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return result.replace(/[^\x20-\x7E]/g, "").trim() || "User";
}

// ================== CANVAS RENDER ================== //
async function renderQuoteImage({ avatarURL, quote, authorName, authorTag, watermark, theme }) {
  authorName = cleanName(authorName);
  authorTag = cleanName(authorTag);
  watermark = cleanName(watermark);

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
  ctx.fillText(`Mystral • ${watermark}`, W - pad - 18, H - pad - 16);

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
      const avatarURL = message.member?.displayAvatarURL?.({ extension: "png", size: 512 }) || message.author.displayAvatarURL({ extension: "png", size: 512 });

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
    console.log("│              🔮 Mystral BOOTLOADER 🔮                  │");
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

    const { connectMongo } = require("./db");
    await connectMongo();

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

    console.log(` ├── [DB] Engine: MongoDB Atlas Cloud (Mongoose) ✅`);

    // Built-in Web Server for Terms of Service & Privacy Policy endpoints
    const http = require("http");
    const webPort = process.env.PORT || 3000;
    const webServer = http.createServer((req, res) => {
      const urlPath = req.url.split("?")[0];
      if (urlPath === "/terms" || urlPath === "/terms.html") {
        const termsPath = path.join(__dirname, "terms.html");
        if (fs.existsSync(termsPath)) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          return res.end(fs.readFileSync(termsPath));
        }
      }
      if (urlPath === "/privacy" || urlPath === "/privacy.html") {
        const privacyPath = path.join(__dirname, "privacy.html");
        if (fs.existsSync(privacyPath)) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          return res.end(fs.readFileSync(privacyPath));
        }
      }
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("CYZA - Mystral Assistant Bot Web Service Running OK");
    });
    webServer.listen(webPort, () => {
      console.log(` ├── [HTTP] Web server active on port ${webPort} (/terms, /privacy)`);
    }).on("error", () => { });

    console.log(" ├── [CLIENT] Connecting to Discord Gateway...");
    client.login(process.env.DISCORD_TOKEN);
  } catch (e) {
    console.error("❌ Boot failed:", e);
    process.exit(1);
  }
})();
// ===================== BACKUP ON EXIT =====================
process.on("SIGINT", async () => {
  process.exit(0);
});

process.on("SIGTERM", async () => {
  process.exit(0);
});

process.on("uncaughtException", async (err) => {
  if (isIgnorableDiscordError(err)) return;
  console.error("[CRASH]", err);
  process.exit(1);
});

process.on("unhandledRejection", async (err) => {
  if (isIgnorableDiscordError(err)) return;
  console.error("[REJECT]", err);
});
