// streak.js
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits, ChannelType, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const crypto = require("crypto");
const path = require("path");

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

function isSameCalendarDayJakarta(ts1, ts2) {
  const date1 = new Date(ts1);
  const date2 = new Date(ts2);

  const options = { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" };
  const d1Str = new Intl.DateTimeFormat("en-US", options).format(date1);
  const d2Str = new Intl.DateTimeFormat("en-US", options).format(date2);

  return d1Str === d2Str;
}

// ===================== DATABASE STATE & HELPERS =====================
const {
  StreakSetting,
  StreakPair,
  StreakDailyActivity,
  StreakLog,
  StreakAchievement,
  StreakFreezeInventory
} = require("./db");


async function getSettings(guildId) {
  let settings = await StreakSetting.findOne({ guild_id: String(guildId) }).lean();
  if (!settings) {
    await StreakSetting.create({ guild_id: String(guildId), enabled: 1 });
    settings = await StreakSetting.findOne({ guild_id: String(guildId) }).lean();
  }
  return settings;
}

async function updateSettings(guildId, key, value) {
  const allowedKeys = [
    "chat_channel", "card_channel", "reset_hour", "cooldown",
    "minimum_message", "minimum_length", "thread_enable",
    "recovery_limit", "log_channel", "enabled"
  ];
  if (!allowedKeys.includes(key)) {
    throw new Error(`Invalid setting key: ${key}`);
  }
  await StreakSetting.updateOne({ guild_id: String(guildId) }, { $set: { [key]: value } });
}

async function getPair(guildId, userA, userB) {
  const [u1, u2] = [userA, userB].sort();
  const doc = await StreakPair.findOne({ guild_id: String(guildId), user_one: String(u1), user_two: String(u2) }); return doc ? doc.toObject() : null;
}

function getPairId(pair) {
  if (pair === null || pair === undefined) return null;
  if (typeof pair === "object") return String(pair._id || pair.id || "");
  return String(pair);
}

function buildPairQuery(id) {
  if (id === null || id === undefined) return { _id: null };
  if (typeof id === "object") {
    const realId = id._id || id.id;
    if (realId) return buildPairQuery(realId);
  }
  const strId = String(id);
  if (/^[0-9a-fA-F]{24}$/.test(strId)) {
    return { _id: strId };
  }
  const numId = Number(id);
  if (!isNaN(numId)) {
    return { id: numId };
  }
  return { id: strId };
}

async function getPairById(id) {
  const doc = await StreakPair.findOne(buildPairQuery(id)); return doc ? doc.toObject() : null;
}

async function getActivePairForUser(guildId, userId) {
  const doc = await StreakPair.findOne({ guild_id: String(guildId), $or: [{ user_one: String(userId) }, { user_two: String(userId) }], status: { $in: ["active", "warning"] } }).sort({ current_streak: -1 });
  return doc ? doc.toObject() : null;
}

async function getBrokenPairForUser(guildId, userId) {
  const doc = await StreakPair.findOne({ guild_id: String(guildId), $or: [{ user_one: String(userId) }, { user_two: String(userId) }], status: "broken" }).sort({ current_streak: -1 });
  return doc ? doc.toObject() : null;
}

async function getAllActivePairsForUser(guildId, userId) {
  const docs = await StreakPair.find({
    guild_id: String(guildId),
    $or: [{ user_one: String(userId) }, { user_two: String(userId) }],
    status: { $in: ["active", "warning"] }
  }).sort({ current_streak: -1 });
  return docs.map(d => d.toObject());
}

async function getActivePairCountForUser(guildId, userId) {
  const count = await StreakPair.countDocuments({
    guild_id: String(guildId),
    $or: [{ user_one: String(userId) }, { user_two: String(userId) }],
    status: { $in: ["active", "warning", "forming"] }
  });
  return count;
}

async function createPair(guildId, userA, userB) {
  const [u1, u2] = [userA, userB].sort();
  const now = Date.now();
  const maxDoc = await StreakPair.findOne().sort({ id: -1 });
  const newId = maxDoc ? (maxDoc.id || 0) + 1 : 1;
  await StreakPair.create({
    id: newId,
    guild_id: String(guildId),
    user_one: String(u1),
    user_two: String(u2),
    current_streak: 0,
    highest_streak: 0,
    recovery_left: 5,
    status: 'forming',
    created_at: now,
    last_active_at: now,
    progress_count: 1
  });
  return await getPair(guildId, u1, u2);
}

async function updatePair(id, updates) {
  await StreakPair.updateOne(buildPairQuery(id), { $set: updates });
}

async function deletePair(id) {
  await StreakPair.deleteOne(buildPairQuery(id));
}

async function resetAllGuildStreaks(guildId) {
  const pairs = await StreakPair.find({ guild_id: String(guildId) }); const pairIds = pairs.map(p => getPairId(p)); await StreakDailyActivity.deleteMany({ pair_id: { $in: pairIds } });
  await StreakLog.deleteMany({ guild_id: String(guildId) });
  await StreakPair.deleteMany({ guild_id: String(guildId) });
}

async function resetUserGuildStreaks(guildId, userId) {
  const pairs = await StreakPair.find({
    guild_id: String(guildId),
    $or: [{ user_one: String(userId) }, { user_two: String(userId) }]
  }).lean();
  const pairIds = pairs.map(p => getPairId(p));
  await StreakDailyActivity.deleteMany({ pair_id: { $in: pairIds } });
  await StreakLog.deleteMany({ pair_id: { $in: pairIds } });
  await StreakPair.deleteMany({
    guild_id: String(guildId),
    $or: [{ user_one: String(userId) }, { user_two: String(userId) }]
  });
}

async function getLastActivity(pairId, userId) {
  const doc = await StreakDailyActivity.findOne({ pair_id: getPairId(pairId), user_id: String(userId) }).sort({ last_message_at: -1 });
  return doc ? doc.toObject() : null;
}

async function addActivity(pairId, userId, timestamp, hash) {
  await StreakDailyActivity.create({ pair_id: getPairId(pairId), user_id: String(userId), last_message_at: timestamp, message_hash: String(hash) });
}

async function clearActivity(pairId) {
  await StreakDailyActivity.deleteMany({ pair_id: getPairId(pairId) });
}

async function addLog(guildId, pairId, userId, action, details) {
  const now = Date.now();
  await StreakLog.create({ guild_id: String(guildId), pair_id: getPairId(pairId), user_id: String(userId), action: String(action), timestamp: now, details: String(details) });
}

async function getLogsForPair(pairId, limit = 5) {
  const docs = await StreakLog.find({ pair_id: getPairId(pairId) }).sort({ timestamp: -1 }).limit(Number(limit)); return docs.map(d => d.toObject());
}

async function getLeaderboard(guildId, type, limit = 10) {
  switch (type) {
    case "top_pair":
      const docs1 = await StreakPair.find({ guild_id: String(guildId), status: "active" }).sort({ current_streak: -1 }).limit(Number(limit)); return docs1.map(d => d.toObject());
    case "top_longest":
      const docs2 = await StreakPair.find({ guild_id: String(guildId) }).sort({ highest_streak: -1 }).limit(Number(limit)); return docs2.map(d => d.toObject());
    case "top_active":
      const docs3 = await StreakPair.find({ guild_id: String(guildId), status: "active" }).sort({ last_active_at: -1 }).limit(Number(limit));
      return docs3.map(d => d.toObject());
    case "top_recovery":
      const docs4 = await StreakPair.find({ guild_id: String(guildId) }).sort({ recovery_left: 1 }).limit(Number(limit));
      return docs4.map(d => d.toObject());
    default:
      return [];
  }
}

function buildStreakInfoContainerV2(settings) {
  const container = new ContainerBuilder().setAccentColor(0xff7700);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent("## 🔥 Panduan Mystral Flame Streak")
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "Sistem streak api kebersamaan otomatis tanpa pairing manual! Saling berkirim pesan di channel khusus setiap hari untuk menjaga api tetap menyala.\n\n" +
      "ℹ️ **Daftar Perintah (Shorthand / Slash):**\n" +
      "- **Profile:** `csp` / `/streak profile` — Menampilkan profil & kartu streak aktif.\n" +
      "- **List:** `csl` / `/streak list` — Menampilkan semua daftar streak.\n" +
      "- **Recover:** `csrec` / `/streak recover` — Memulihkan streak yang padam dengan token.\n" +
      "- **Break:** `cstreak break` / `/streak break` — Memutuskan/membubarkan streak.\n" +
      "- **Leaderboard:** `cstreak leaderboard` / `/streak leaderboard` — Peringkat streak terpanjang.\n" +
      "- **History:** `cstreak history` / `/streak history` — Riwayat logs aktivitas streak.\n\n" +
      "⚠️ **Aturan Penting:**\n" +
      `- **Channel:** Kirim pesan di channel <#${settings.chat_channel || "belum di-set"}>.\n` +
      "- **Interaksi:** Harus dua arah (saling membalas/tag/mention).\n" +
      "- **Syarat Awal:** Saling mengobrol **3 hari berturut-turut** untuk membentuk streak.\n" +
      "- **Karakter:** Minimal pesan **5 karakter** dengan cooldown validasi **60 detik**.\n" +
      "- **Limit:** Maksimal **25 pasangan aktif** per user.\n" +
      "- **Reset:** Evaluasi harian dilakukan otomatis pukul **00:00 WIB**."
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("view_milestones")
      .setLabel("Lihat Tingkatan Flame")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔥")
  );
  container.addActionRowComponents(row);

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent("-# Mystral Assistant • Flame Streak System")
  );

  return container;
}

function buildMilestonesContainerV2() {
  const container = new ContainerBuilder().setAccentColor(0xff7700);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent("## 🔥 Tingkatan Milestone Flame Streak")
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "Berikut adalah tingkatan Flame Streak berdasarkan jumlah hari interaksi berturut-turut:\n\n" +
      "• `3 Hari` — <:3haritiktokorangeflame:1523332105319485562> **Orange Flame**\n" +
      "• `7 Hari` — <:7haribrightorangeflame:1523332107533811744> **Bright Orange Flame**\n" +
      "• `30 Hari` — <:30100hari_flamepurpleroyal:1523332110067306656> **Golden Orange Flame**\n" +
      "• `100 Hari` — <:30100hari_flamepurpleroyal:1523332110067306656> **Royal Flame**\n" +
      "• `200 Hari` — <:200haricrystalflamegrey:1523332112030371940> **Crystal Flame**\n" +
      "• `300 Hari` — <:300hariemeralflame:1523332114819579944> **Emerald Flame**\n" +
      "• `400 Hari` — <:400harirubyredflame:1523332117193293966> **Ruby Flame**\n" +
      "• `500 Hari` — <:500600_blueroyalfame:1523332118917152779> **Diamond Flame (Blue)**\n" +
      "• `600 Hari` — <:500600_blueroyalfame:1523332118917152779> **Celestial Flame**\n" +
      "• `700 Hari` — <:700haridiamondflame:1523332121333334016> **Diamond Flame (Cyan)**\n" +
      "• `800 Hari` — <:800900hariauroraflame:1523332124667805746> **Aurora Flame**\n" +
      "• `900 Hari` — <:800900hariauroraflame:1523332124667805746> **Cosmic Aurora Flame**\n" +
      "• `1000 Hari` — <:1000haridanseterusnyalegendaryeternalflame:1523332127176003805> **Legendary Eternal Flame**\n\n" +
      "*Jaga keaktifan setiap hari agar apimu tidak padam!*"
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent("-# Mystral Assistant • Milestone Tiers")
  );

  return container;
}

// ===================== CANVAS HELPER =====================
const MILESTONES = [3, 7, 30, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

function getMilestoneEmoji(streak) {
  if (streak >= 1000) return "<:1000haridanseterusnyalegendaryeternalflame:1523332127176003805>";
  if (streak >= 800) return "<:800900hariauroraflame:1523332124667805746>";
  if (streak >= 700) return "<:700haridiamondflame:1523332121333334016>";
  if (streak >= 500) return "<:500600_blueroyalfame:1523332118917152779>";
  if (streak >= 400) return "<:400harirubyredflame:1523332117193293966>";
  if (streak >= 300) return "<:300hariemeralflame:1523332114819579944>";
  if (streak >= 200) return "<:200haricrystalflamegrey:1523332112030371940>";
  if (streak >= 30) return "<:30100hari_flamepurpleroyal:1523332110067306656>";
  if (streak >= 7) return "<:7haribrightorangeflame:1523332107533811744>";
  return "<:3haritiktokorangeflame:1523332105319485562>";
}

function getFlameImageName(streak) {
  if (streak >= 1000) return "1000hari dan seterusnya-legendaryeternalflame.png";
  if (streak >= 800) return "800-900hari-auroraflame.png";
  if (streak >= 700) return "700hari-diamondflame.png";
  if (streak >= 400) return "400hari-rubyredflame.png";
  if (streak >= 300) return "300hari-emeralflame.png";
  if (streak >= 200) return "200hari-crystalflamegrey.png";
  if (streak >= 30) return "30-100hari_flamepurpleroyal.png";
  if (streak >= 7) return "7hari-brightorangeflame.png";
  return "3haritiktokorangeflame.png";
}

function getMilestoneInfo(streak) {
  if (streak >= 1000) return { name: "Legendary Eternal Flame", color: "#ffd700", outer: ["#f5af19", "#ffd700", "#ffffff"], inner: ["#ffffff", "#ffffff"], particles: 25, crown: true, glow: 35 };
  if (streak >= 900) return { name: "Cosmic Aurora Flame", color: "#00e5ff", outer: ["#00e5ff", "#e040fb", "#ffff00"], inner: ["#ffffff", "#ffffff"], particles: 20, glow: 30 };
  if (streak >= 800) return { name: "Aurora Flame", color: "#e040fb", outer: ["#ff007f", "#00e5ff", "#a8ff78"], inner: ["#ffffff", "#ffffff"], particles: 18, glow: 28 };
  if (streak >= 700) return { name: "Diamond Flame", color: "#70e1ff", outer: ["#00e5ff", "#0072ff", "#ffffff"], inner: ["#ffffff", "#ffffff"], particles: 16, glow: 26 };
  if (streak >= 600) return { name: "Celestial Flame", color: "#928dab", outer: ["#1f1c2c", "#928dab", "#c3bef7"], inner: ["#e2dbff", "#ffffff"], particles: 14, glow: 24 };
  if (streak >= 500) return { name: "Diamond Flame", color: "#0072ff", outer: ["#00c6ff", "#0072ff", "#00f2fe"], inner: ["#c2f0fc", "#ffffff"], particles: 12, glow: 22 };
  if (streak >= 400) return { name: "Ruby Flame", color: "#ef473a", outer: ["#cb2d3e", "#ef473a", "#ff7e79"], inner: ["#ffc1c1", "#ffffff"], particles: 10, glow: 20 };
  if (streak >= 300) return { name: "Emerald Flame", color: "#38ef7d", outer: ["#11998e", "#38ef7d", "#a8ff78"], inner: ["#c1ffc1", "#ffffff"], particles: 8, glow: 18 };
  if (streak >= 200) return { name: "Crystal Flame", color: "#e2ebf0", outer: ["#cfd9df", "#e2ebf0", "#ffffff"], inner: ["#ffffff", "#ffffff"], particles: 6, glow: 16 };
  if (streak >= 100) return { name: "Royal Flame", color: "#7f00ff", outer: ["#b92b27", "#7f00ff", "#d9a7c7"], inner: ["#f5d6ff", "#ffffff"], particles: 4, glow: 14 };
  if (streak >= 30) return { name: "Golden Orange Flame", color: "#ffcc00", outer: ["#ff9100", "#ffea00", "#ffff00"], inner: ["#ffffc0", "#ffffff"], particles: 2, glow: 12 };
  if (streak >= 7) return { name: "Bright Orange Flame", color: "#ffdd00", outer: ["#ff3d00", "#ff9100", "#ffea00"], inner: ["#ffe57f", "#ffffff"], particles: 0, glow: 10 };
  return { name: "Orange Flame", color: "#ffea00", outer: ["#ff3d00", "#ff9100", "#ffea00"], inner: ["#ffe57f", "#ffffff"], particles: 0, glow: 8 };
}

function getNextMilestone(streak) {
  for (const m of MILESTONES) {
    if (m > streak) return m;
  }
  return Math.ceil((streak + 1) / 100) * 100;
}

function _hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawFlame(ctx, cx, cy, w, h, glowIntensity, outerColors = ["#ff3d00", "#ff9100", "#ffea00"], innerColors = ["#ffe57f", "#ffffff"]) {
  ctx.save();

  // Shorthand helpers (rx = relative x multiplied by half-width, ry = relative y multiplied by height)
  const x = (rx) => cx + w * rx;
  const y = (ry) => cy + h * ry;

  // ── Soft outer glow ──
  const aura = ctx.createRadialGradient(cx, y(0.72), 0, cx, y(0.72), h * 0.95);
  aura.addColorStop(0, _hexToRgba(outerColors[1] || "#ff9100", 0.2));
  aura.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.ellipse(cx, y(0.72), w * 1.8, h * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = outerColors[0] || "#ff3d00";
  ctx.shadowBlur = glowIntensity * 2.5;

  // ── OUTER FLAME ──
  // Clean symmetric 5-tipped shape using pure Bezier curves (no straight lines)
  // for a smooth, organic flow matching the reference image.
  ctx.beginPath();
  ctx.moveTo(x(0.08), y(0.02)); // Top tip leaning slightly right

  // Right side:
  ctx.bezierCurveTo(x(0.12), y(0.22), x(0.32), y(0.28), x(0.46), y(0.32)); // Upper Right Tip
  ctx.bezierCurveTo(x(0.34), y(0.45), x(0.22), y(0.48), x(0.24), y(0.56)); // Mid Right Indent
  ctx.bezierCurveTo(x(0.38), y(0.60), x(0.52), y(0.65), x(0.50), y(0.72)); // Lower Right Tip
  ctx.bezierCurveTo(x(0.45), y(0.85), x(0.25), y(1.0), x(0), y(1.0));  // Bottom center

  // Left side:
  ctx.bezierCurveTo(x(-0.25), y(1.0), x(-0.45), y(0.85), x(-0.50), y(0.72)); // Lower Left Tip
  ctx.bezierCurveTo(x(-0.52), y(0.65), x(-0.38), y(0.60), x(-0.24), y(0.56)); // Mid Left Indent
  ctx.bezierCurveTo(x(-0.22), y(0.48), x(-0.34), y(0.45), x(-0.46), y(0.32)); // Upper Left Tip
  ctx.bezierCurveTo(x(-0.32), y(0.28), x(-0.12), y(0.22), x(0.08), y(0.02)); // Back to Top tip
  ctx.closePath();

  const outerGrad = ctx.createLinearGradient(cx, y(0), cx, y(1));
  outerGrad.addColorStop(0, outerColors[0]);
  outerGrad.addColorStop(0.4, outerColors[1]);
  outerGrad.addColorStop(1, outerColors[2]);
  ctx.fillStyle = outerGrad;
  ctx.fill();

  ctx.shadowBlur = 0;

  // ── INNER FLAME ── (same organic shape, scaled ~65%, starts 15% below tip)
  ctx.beginPath();
  ctx.moveTo(x(0.06), y(0.18)); // Inner top tip

  // Inner Right side:
  ctx.bezierCurveTo(x(0.09), y(0.32), x(0.24), y(0.36), x(0.32), y(0.42)); // Upper Inner Right Tip
  ctx.bezierCurveTo(x(0.24), y(0.50), x(0.15), y(0.52), x(0.16), y(0.60)); // Mid Inner Right Indent
  ctx.bezierCurveTo(x(0.26), y(0.64), x(0.36), y(0.68), x(0.34), y(0.74)); // Lower Inner Right Tip
  ctx.bezierCurveTo(x(0.30), y(0.82), x(0.16), y(0.94), x(0), y(0.94)); // Bottom center

  // Inner Left side:
  ctx.bezierCurveTo(x(-0.16), y(0.94), x(-0.30), y(0.82), x(-0.34), y(0.74)); // Lower Inner Left Tip
  ctx.bezierCurveTo(x(-0.36), y(0.68), x(-0.26), y(0.64), x(-0.16), y(0.60)); // Mid Inner Left Indent
  ctx.bezierCurveTo(x(-0.15), y(0.52), x(-0.24), y(0.50), x(-0.32), y(0.42)); // Upper Inner Left Tip
  ctx.bezierCurveTo(x(-0.24), y(0.36), x(-0.09), y(0.32), x(0.06), y(0.18)); // Back to top inner tip
  ctx.closePath();

  const innerGrad = ctx.createLinearGradient(cx, y(0.15), cx, y(0.97));
  innerGrad.addColorStop(0, innerColors[0]);
  innerGrad.addColorStop(1, innerColors[1]);
  ctx.fillStyle = innerGrad;
  ctx.fill();

  // ── WHITE HOTSPOT at the base ──
  const hotspot = ctx.createRadialGradient(cx, y(0.82), 0, cx, y(0.82), w * 0.38);
  hotspot.addColorStop(0, "rgba(255,255,255,1.0)");
  hotspot.addColorStop(0.28, "rgba(255,255,220,0.9)");
  hotspot.addColorStop(0.6, "rgba(255,220,120,0.4)");
  hotspot.addColorStop(1, "rgba(255,200,50,0)");
  ctx.beginPath();
  ctx.ellipse(cx, y(0.82), w * 0.28, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fillStyle = hotspot;
  ctx.fill();

  ctx.restore();
}

function drawRecoveryIcon(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  // Circular arc with a gap
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0.18 * Math.PI, 1.65 * Math.PI);
  ctx.stroke();

  // Arrow head
  const arrowAngle = 1.65 * Math.PI;
  const ax = cx + Math.cos(arrowAngle) * r;
  const ay = cy + Math.sin(arrowAngle) * r;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax - 7, ay + 1);
  ctx.lineTo(ax + 1, ay - 7);
  ctx.closePath();
  ctx.fill();

  // Tiny heart in the center
  drawProceduralHeart(ctx, cx, cy - 3, 5, color);
  ctx.restore();
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function drawStreakCard({
  userOneName,
  userTwoName,
  userOneAvatarUrl,
  userTwoAvatarUrl,
  userOneActive,
  userTwoActive,
  currentStreak,
  recoveryLeft,
  nextMilestone,
  cardType = "Daily Progress",
  userOneHandle = "",
  userTwoHandle = "",
  lastActiveOne = null,
  lastActiveTwo = null,
}) {
  userOneName = cleanName(userOneName);
  userTwoName = cleanName(userTwoName);
  userOneHandle = cleanName(userOneHandle);
  userTwoHandle = cleanName(userTwoHandle);

  const W = 860;
  const H = 320;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const mInfo = getMilestoneInfo(currentStreak);

  // Load milestone flame PNG asset from assets/streak
  const flameFile = getFlameImageName(currentStreak);
  const flamePath = path.join(__dirname, "assets", "streak", flameFile);
  let flameImg;
  try {
    flameImg = await loadImage(flamePath);
  } catch (err) {
    console.error("Failed to load flame image:", flamePath, err);
    flameImg = null;
  }

  // ── BACKGROUND GRADIENT ──
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#070514");
  bg.addColorStop(0.5, "#0d0922");
  bg.addColorStop(1, "#070514");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle futuristic background grid dots
  ctx.save();
  for (let gx = 25; gx < W; gx += 25) {
    for (let gy = 25; gy < H; gy += 25) {
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.beginPath();
      ctx.arc(gx, gy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Premium ambient corner glow (Neon Cyan & Purple)
  ctx.save();
  const cyanGlow = ctx.createRadialGradient(0, 0, 50, 0, 0, 300);
  cyanGlow.addColorStop(0, "rgba(0, 229, 255, 0.08)");
  cyanGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = cyanGlow;
  ctx.fillRect(0, 0, W, H);

  const purpleGlow = ctx.createRadialGradient(W, H, 50, W, H, 300);
  purpleGlow.addColorStop(0, "rgba(224, 64, 251, 0.08)");
  purpleGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = purpleGlow;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // ── BACKGROUND FLOATING FLAMES (Scales with streak count) ──
  if (flameImg) {
    let seed = currentStreak + userOneName.length + userTwoName.length;
    const seededRandom = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    const bgFlameCount = Math.min(5 + Math.floor(currentStreak / 3), 28);
    for (let i = 0; i < bgFlameCount; i++) {
      const rx = 40 + seededRandom() * (W - 80);
      const ry = 40 + seededRandom() * (H - 80);
      const rSize = 20 + seededRandom() * 20; // 20px to 40px
      const rOpacity = 0.015 + seededRandom() * 0.035; // very faint (1.5% to 5% opacity)
      const rAngle = (seededRandom() - 0.5) * 0.5; // rotation

      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(rAngle);
      ctx.globalAlpha = rOpacity;
      ctx.drawImage(flameImg, -rSize / 2, -rSize / 2, rSize, rSize);
      ctx.restore();
    }
  }

  // ── MAIN GLASS CONTAINER ──
  ctx.save();
  _roundRect(ctx, 20, 20, W - 40, H - 40, 20);
  ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // ── HEADER SECTION ──
  // Small logo flame
  if (flameImg) {
    ctx.drawImage(flameImg, 26, 33, 32, 38);
  } else {
    drawFlame(ctx, 42, 33, 16, 38, 4, ["#ff6d00", "#ffa000", "#ffca28"], ["#ffec80", "#ffffff"]);
  }

  ctx.save();
  ctx.font = "bold 15px Arial Black, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const mystralWidth = ctx.measureText("MYSTRAL ").width;
  ctx.fillText("MYSTRAL", 66, 52);

  ctx.fillStyle = mInfo.color;
  ctx.fillText("FLAME STREAK", 66 + mystralWidth, 52);
  ctx.restore();

  // Daily Progress sub-badge text (on top right, no border box)
  ctx.save();
  ctx.font = "bold 10px Arial Black, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(cardType.toUpperCase(), W - 40, 52);
  ctx.restore();

  // ── LEFT: USER PROFILE HUB & TODAY'S ACTIVITY ──
  const avCenterY = 110;
  const avRadius = 38;
  const avAX = 105;
  const avBX = 165; // Overlapping avatar style

  // Avatar A
  let imgA;
  try { imgA = await loadImage(userOneAvatarUrl); } catch { imgA = null; }
  ctx.save();
  ctx.beginPath();
  ctx.arc(avAX, avCenterY, avRadius, 0, Math.PI * 2);
  ctx.clip();
  if (imgA) {
    ctx.drawImage(imgA, avAX - avRadius, avCenterY - avRadius, avRadius * 2, avRadius * 2);
  } else {
    ctx.fillStyle = "#2a2d36";
    ctx.fillRect(avAX - avRadius, avCenterY - avRadius, avRadius * 2, avRadius * 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(userOneName.charAt(0).toUpperCase(), avAX, avCenterY);
  }
  ctx.restore();

  // Ring A
  ctx.save();
  ctx.strokeStyle = userOneActive ? mInfo.color : "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avAX, avCenterY, avRadius + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Avatar B
  let imgB;
  try { imgB = await loadImage(userTwoAvatarUrl); } catch { imgB = null; }
  ctx.save();
  ctx.beginPath();
  ctx.arc(avBX, avCenterY, avRadius, 0, Math.PI * 2);
  ctx.clip();
  if (imgB) {
    ctx.drawImage(imgB, avBX - avRadius, avCenterY - avRadius, avRadius * 2, avRadius * 2);
  } else {
    ctx.fillStyle = "#1e2027";
    ctx.fillRect(avBX - avRadius, avCenterY - avRadius, avRadius * 2, avRadius * 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(userTwoName.charAt(0).toUpperCase(), avBX, avCenterY);
  }
  ctx.restore();

  // Ring B
  ctx.save();
  ctx.strokeStyle = userTwoActive ? mInfo.color : "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avBX, avCenterY, avRadius + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Connected name labels (centered under the avatar pair at X = 135)
  ctx.save();
  ctx.font = "bold 18px Arial Black, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`${userOneName} & ${userTwoName}`, 135, 162);

  ctx.font = "11px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.fillText(`${userOneHandle || `@${userOneName.toLowerCase()}`} • ${userTwoHandle || `@${userTwoName.toLowerCase()}`}`, 135, 186);
  ctx.restore();

  // Today's Activity Indicators (compact layout directly below profiles, centered around X=135)
  ctx.save();
  ctx.font = "bold 9px Arial Black, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("TODAY'S ACTIVITY", 135, 216);

  // Status Pill A (centered at X=135, Y=232)
  const pillY1 = 232, pillH = 22, pillW = 200, pillX = 135 - pillW / 2;
  _roundRect(ctx, pillX, pillY1, pillW, pillH, 5);
  ctx.fillStyle = userOneActive ? _hexToRgba(mInfo.color, 0.08) : "rgba(255, 255, 255, 0.02)";
  ctx.fill();
  ctx.strokeStyle = userOneActive ? _hexToRgba(mInfo.color, 0.25) : "rgba(255, 255, 255, 0.05)";
  ctx.stroke();

  if (userOneActive) {
    drawCheckmark(ctx, pillX + 14, pillY1 + 11, mInfo.color);
  } else {
    drawCross(ctx, pillX + 14, pillY1 + 11, "rgba(255, 255, 255, 0.35)");
  }
  ctx.font = "bold 9px Arial Black, sans-serif";
  ctx.fillStyle = userOneActive ? mInfo.color : "rgba(255, 255, 255, 0.4)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(userOneActive ? "ACTIVE" : "BELUM", pillX + 24, pillY1 + 11);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "9px sans-serif";
  ctx.fillText(userOneName, pillX + 68, pillY1 + 11);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textAlign = "right";
  ctx.fillText(lastActiveOne ? new Date(lastActiveOne).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB" : "--:-- WIB", pillX + pillW - 10, pillY1 + 11);

  // Status Pill B (centered at X=135, Y=258)
  const pillY2 = 258;
  _roundRect(ctx, pillX, pillY2, pillW, pillH, 5);
  ctx.fillStyle = userTwoActive ? _hexToRgba(mInfo.color, 0.08) : "rgba(255, 255, 255, 0.02)";
  ctx.fill();
  ctx.strokeStyle = userTwoActive ? _hexToRgba(mInfo.color, 0.25) : "rgba(255, 255, 255, 0.05)";
  ctx.stroke();

  if (userTwoActive) {
    drawCheckmark(ctx, pillX + 14, pillY2 + 11, mInfo.color);
  } else {
    drawCross(ctx, pillX + 14, pillY2 + 11, "rgba(255, 255, 255, 0.35)");
  }
  ctx.font = "bold 9px Arial Black, sans-serif";
  ctx.fillStyle = userTwoActive ? mInfo.color : "rgba(255, 255, 255, 0.4)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(userTwoActive ? "ACTIVE" : "BELUM", pillX + 24, pillY2 + 11);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "9px sans-serif";
  ctx.fillText(userTwoName, pillX + 68, pillY2 + 11);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textAlign = "right";
  ctx.fillText(lastActiveTwo ? new Date(lastActiveTwo).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB" : "--:-- WIB", pillX + pillW - 10, pillY2 + 11);
  ctx.restore();

  // ── CENTER: THE GIANT MYSTRAL FLAME ──
  const flameCX = 430;
  const flameH = 160;
  const flameW = 156;
  const flameTopY = 74;

  // Circular shadow pedestal behind flame
  ctx.save();
  ctx.beginPath();
  ctx.arc(flameCX, flameTopY + flameH / 2, 82, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  if (flameImg) {
    ctx.save();
    ctx.shadowColor = mInfo.outer[0] || "#ff3d00";
    ctx.shadowBlur = mInfo.glow * 1.5;
    ctx.drawImage(flameImg, flameCX - flameW / 2, flameTopY, flameW, flameH);
    ctx.restore();
  } else {
    drawFlame(ctx, flameCX, flameTopY, flameW, flameH, mInfo.glow, mInfo.outer, mInfo.inner);
  }
  if (mInfo.particles > 0) {
    drawParticles(ctx, flameCX, flameTopY + flameH / 2, flameW, flameH, mInfo.particles);
  }

  // Giant streak number inside the flame
  ctx.save();
  const numGrad = ctx.createLinearGradient(flameCX, flameTopY + flameH * 0.4, flameCX, flameTopY + flameH * 0.9);
  numGrad.addColorStop(0, "#ffffff");
  numGrad.addColorStop(1, "#ffe082");
  ctx.fillStyle = numGrad;
  ctx.font = "bold 52px Arial Black, Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 10;
  ctx.fillText(String(currentStreak), flameCX, flameTopY + flameH * 0.65);
  ctx.restore();

  // Milestone Rank Text (No background box/pill)
  ctx.save();
  ctx.font = "bold 12px Arial Black, sans-serif";
  ctx.fillStyle = mInfo.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = mInfo.color;
  ctx.shadowBlur = 8;
  ctx.fillText(mInfo.name.toUpperCase(), flameCX, 252);
  ctx.restore();

  // ── RIGHT: DASHBOARD STACKED CARDS ──
  const RX = 590, RY = 82, RW = 230, RH = 70;

  // 1. Next Milestone card
  ctx.save();
  _roundRect(ctx, RX, RY, RW, RH, 12);
  ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.stroke();

  ctx.font = "bold 9px Arial Black, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("NEXT MILESTONE", RX + 16, RY + 12);

  ctx.font = "bold 9px Arial Black, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.textAlign = "right";
  ctx.fillText(`${currentStreak}/${nextMilestone}`, RX + RW - 16, RY + 12);

  ctx.font = "bold 15px Arial Black, sans-serif";
  ctx.fillStyle = mInfo.color;
  ctx.textAlign = "left";
  ctx.fillText(`${nextMilestone} DAYS`, RX + 16, RY + 26);
  ctx.restore();

  // Milestone Progress Bar inside card
  const mBarX = RX + 16, mBarY = RY + 48, mBarW = RW - 32, mBarH = 5;
  const mProgress = Math.min(currentStreak / nextMilestone, 1);
  ctx.save();
  _roundRect(ctx, mBarX, mBarY, mBarW, mBarH, 2.5);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  _roundRect(ctx, mBarX, mBarY, mBarW * mProgress, mBarH, 2.5);
  const mBarGrad = ctx.createLinearGradient(mBarX, 0, mBarX + mBarW * mProgress, 0);
  mBarGrad.addColorStop(0, mInfo.outer[0]);
  mBarGrad.addColorStop(1, mInfo.outer[2]);
  ctx.fillStyle = mBarGrad;
  ctx.fill();
  ctx.restore();

  // 2. Recovery System card
  const RY2 = RY + RH + 14;
  ctx.save();
  _roundRect(ctx, RX, RY2, RW, RH, 12);
  ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.stroke();

  ctx.font = "bold 9px Arial Black, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("RECOVERY COOLDOWN", RX + 16, RY2 + 12);

  ctx.font = "bold 15px Arial Black, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${recoveryLeft} / 5 REMAINING`, RX + 16, RY2 + 26);
  ctx.restore();

  // Draw 5 mini recovery hearts
  for (let i = 0; i < 5; i++) {
    const heartX = RX + 20 + i * 20;
    const heartY = RY2 + 48;
    const isActive = i < recoveryLeft;
    drawProceduralHeart(ctx, heartX, heartY, 5, isActive ? "#ff4081" : "rgba(255,255,255,0.15)");
  }

  // ── CENTER FOOTER ──
  ctx.save();
  ctx.fillStyle = mInfo.color;
  ctx.globalAlpha = 0.4;
  ctx.font = "bold 9px Arial Black, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("THE LONGER YOU STAY, THE BRIGHTER YOUR FLAME", W / 2, H - 14);
  ctx.restore();

  return canvas.toBuffer("image/png");
}

function drawCrown(ctx, x, y, w, h) {
  ctx.save();
  ctx.shadowColor = "rgba(255, 215, 0, 0.6)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#ffd700";

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - w * 0.3, y - h * 0.6);
  ctx.lineTo(x - w * 0.1, y - h * 0.3);
  ctx.lineTo(x, y - h * 0.8);
  ctx.lineTo(x + w * 0.1, y - h * 0.3);
  ctx.lineTo(x + w * 0.3, y - h * 0.6);
  ctx.lineTo(x + w * 0.4, y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ff3d00";
  ctx.beginPath();
  ctx.arc(x - w * 0.3, y - h * 0.6, 4, 0, Math.PI * 2);
  ctx.arc(x, y - h * 0.8, 4, 0, Math.PI * 2);
  ctx.arc(x + w * 0.3, y - h * 0.6, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawParticles(ctx, x, y, w, h, count) {
  ctx.save();
  ctx.fillStyle = "rgba(255, 165, 0, 0.6)";
  for (let i = 0; i < count; i++) {
    const px = x + (Math.random() - 0.5) * w * 1.5;
    const py = y + (Math.random() - 0.5) * h * 1.5;
    const radius = 2 + Math.random() * 4;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCheckmark(ctx, x, y, color = "#43b581") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.lineTo(x - 2, y + 4);
  ctx.lineTo(x + 6, y - 5);
  ctx.stroke();
  ctx.restore();
}

function drawCross(ctx, x, y, color = "#f04747") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 5);
  ctx.lineTo(x + 5, y + 5);
  ctx.moveTo(x + 5, y - 5);
  ctx.lineTo(x - 5, y + 5);
  ctx.stroke();
  ctx.restore();
}

function drawProceduralHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.35);
  ctx.bezierCurveTo(x, y, x - size * 0.6, y, x - size * 0.6, y + size * 0.35);
  ctx.bezierCurveTo(x - size * 0.6, y + size * 0.75, x, y + size * 1.0, x, y + size * 1.2);
  ctx.bezierCurveTo(x, y + size * 1.0, x + size * 0.6, y + size * 0.75, x + size * 0.6, y + size * 0.35);
  ctx.bezierCurveTo(x + size * 0.6, y, x, y, x, y + size * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}


// ===================== CORE LOGIC & SERVICES =====================
function getWibDateString(timestamp = Date.now()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(timestamp));
}

function getWibYesterdayString(timestamp = Date.now()) {
  return getWibDateString(timestamp - 24 * 60 * 60 * 1000);
}

function isValidContent(message, settings) {
  const content = message.content ? message.content.trim() : "";
  if (content.length < settings.minimum_length) return false;
  if (message.author.bot) return false;
  if (content.startsWith(process.env.PREFIX || "c") || content.startsWith("/")) return false;
  if (message.stickers && message.stickers.size > 0) return false;
  return true;
}

async function logToGuild(client, guildId, messageText) {
  try {
    const settings = await getSettings(guildId);
    if (!settings || !settings.log_channel) return;
    const channel = await client.channels.fetch(settings.log_channel).catch(() => null);
    if (channel && channel.isTextBased()) {
      const embed = new EmbedBuilder()
        .setDescription(messageText)
        .setColor(0x77d0d7)
        .setTimestamp();
      await channel.send({ embeds: [embed] });
    }
  } catch (e) {
    console.error("[STREAK LOG ERROR]", e);
  }
}

async function handleMessageActivity(client, message) {
  if (!message.guild) return;

  const guildId = message.guild.id;
  const settings = await getSettings(guildId);

  if (!settings || !settings.enabled) return;
  if (settings.chat_channel && message.channel.id !== settings.chat_channel) return;
  if (!isValidContent(message, settings)) return;

  const userA = message.author.id;
  const now = Date.now();

  let userB = null;
  if (message.reference && message.reference.messageId) {
    const repliedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
    if (repliedMsg && repliedMsg.author.id !== userA && !repliedMsg.author.bot) {
      userB = repliedMsg.author.id;
    }
  }

  if (!userB && message.mentions.users.size > 0) {
    const mentioned = message.mentions.users.filter(u => u.id !== userA && !u.bot).first();
    if (mentioned) {
      userB = mentioned.id;
    }
  }

  if (!userB) return;

  const [u1, u2] = [userA, userB].sort();



  let pair = await getPair(guildId, u1, u2);
  if (!pair) {
    const countA = await getActivePairCountForUser(guildId, userA);
    const countB = await getActivePairCountForUser(guildId, userB);
    if (countA >= 25 || countB >= 25) {
      return; // Limit 25 pasangan aktif
    }
    pair = await createPair(guildId, u1, u2);
    await addLog(guildId, getPairId(pair), userA, "create_forming_pair", `Forming pair created between ${userA} and ${userB}`);
  }

  const hash = crypto.createHash("md5").update(message.content.trim().toLowerCase()).digest("hex");
  const lastAct = await getLastActivity(getPairId(pair), userA);

  if (lastAct) {
    if (now - lastAct.last_message_at < settings.cooldown * 1000) return;
    if (lastAct.message_hash === hash) return;
  }

  await addActivity(getPairId(pair), userA, now, hash);

  const updateData = {};
  if (pair.user_one === userA && !pair.user_one_active_today) {
    updateData.user_one_active_today = 1;
  } else if (pair.user_two === userA && !pair.user_two_active_today) {
    updateData.user_two_active_today = 1;
  }

  let isCompletingMessage = false;
  if (Object.keys(updateData).length > 0) {
    await updatePair(getPairId(pair), updateData);
    const reloadedPair = await getPairById(getPairId(pair));
    if (reloadedPair && reloadedPair.user_one_active_today === 1 && reloadedPair.user_two_active_today === 1) {
      isCompletingMessage = true;
    }
    if (reloadedPair) pair = reloadedPair;
    // await logToGuild(client, guildId, `<@${userA}> melakukan interaksi hari ini untuk streak dengan <@${userB}>.`);
  }

  if (isCompletingMessage) {
    await message.react("1523182445875302463").catch(() => { });

    if (pair.status === "active" || pair.status === "warning") {
      const newStreak = pair.current_streak + 1;
      const highest = Math.max(pair.highest_streak, newStreak);
      const isMilestone = MILESTONES.includes(newStreak) || (newStreak > 1000 && newStreak % 100 === 0);

      await updatePair(getPairId(pair), {
        current_streak: newStreak,
        highest_streak: highest,
        status: "active",
        last_streak_increment_at: now
      });

      await addLog(guildId, getPairId(pair), null, "daily_increment", `Streak incremented to ${newStreak} in real-time`);
      await logToGuild(client, guildId, `🔥 **Streak Berlanjut!** Streak <@${pair.user_one}> & <@${pair.user_two}> naik menjadi **${newStreak} Hari**!`);

      // Card hanya muncul mulai hari ke-3
      if (newStreak >= 3) {
        if (isMilestone) {
          await sendStreakCardNotification(client, guildId, getPairId(pair), "Milestone");
        } else {
          await sendStreakCardNotification(client, guildId, getPairId(pair), "Daily Progress");
        }
      }
    } else if (pair.status === "forming") {
      await updatePair(getPairId(pair), {
        status: "active",
        current_streak: 1,
        highest_streak: Math.max(pair.highest_streak, 1),
        created_at: now,
        last_active_at: now,
        last_streak_increment_at: now,
        progress_count: 1
      });

      await addLog(guildId, getPairId(pair), null, "streak_formed", `Active streak pair formed between ${u1} and ${u2}`);
      // Hari ke-1: tidak ada card, hanya log internal
      await logToGuild(client, guildId, `🔥 **Streak Dimulai!** <@${u1}> & <@${u2}> sudah saling berinteraksi hari ini. Ayo jaga terus selama 3 hari untuk mendapat kartu pertama!`);
    }
  }
}

async function sendStreakCardNotification(client, guildId, pairId, cardType) {
  try {
    const settings = await getSettings(guildId);
    if (!settings || !settings.card_channel) return;

    const channel = await client.channels.fetch(settings.card_channel).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const pair = await getPairById(pairId);
    if (!pair) return;

    const guild = client.guilds.cache.get(guildId);
    let memberOne = null;
    let memberTwo = null;
    if (guild) {
      memberOne = await guild.members.fetch(pair.user_one).catch(() => null);
      memberTwo = await guild.members.fetch(pair.user_two).catch(() => null);
    }

    const userOne = await client.users.fetch(pair.user_one).catch(() => null);
    const userTwo = await client.users.fetch(pair.user_two).catch(() => null);

    const nameOne = memberOne ? memberOne.displayName : (userOne ? userOne.displayName : "User One");
    const nameTwo = memberTwo ? memberTwo.displayName : (userTwo ? userTwo.displayName : "User Two");
    const handleOne = userOne ? `@${userOne.username}` : "@userone";
    const handleTwo = userTwo ? `@${userTwo.username}` : "@usertwo";

    const avatarOne = userOne ? userOne.displayAvatarURL({ extension: "png", size: 128 }) : "";
    const avatarTwo = userTwo ? userTwo.displayAvatarURL({ extension: "png", size: 128 }) : "";

    const actOne = await getLastActivity(pair.id, pair.user_one);
    const actTwo = await getLastActivity(pair.id, pair.user_two);
    const lastActiveOne = actOne ? actOne.last_message_at : null;
    const lastActiveTwo = actTwo ? actTwo.last_message_at : null;

    let attachment = null;
    if (cardType !== "Warning") {
      const cardBuffer = await drawStreakCard({
        userOneName: nameOne,
        userTwoName: nameTwo,
        userOneHandle: handleOne,
        userTwoHandle: handleTwo,
        userOneAvatarUrl: avatarOne,
        userTwoAvatarUrl: avatarTwo,
        userOneActive: pair.user_one_active_today,
        userTwoActive: pair.user_two_active_today,
        currentStreak: pair.current_streak,
        recoveryLeft: pair.recovery_left,
        nextMilestone: getNextMilestone(pair.current_streak),
        cardType,
        lastActiveOne,
        lastActiveTwo
      });

      attachment = new AttachmentBuilder(cardBuffer, { name: "streak_card.png" });
    }

    const emoji = getMilestoneEmoji(pair.current_streak);
    const streak = pair.current_streak;

    // Helper: Teks berjenjang dengan gaya elegan, premium, dan estetik
    function getTieredText() {
      // Fungsi kecil untuk memilih kata-kata secara acak
      const getRandomBody = (bodies) => bodies[Math.floor(Math.random() * bodies.length)];

      if (streak >= 1000) {
        return {
          title: `${emoji} Legendary Eternal Flame!`,
          body: getRandomBody([
            `Pencapaian yang sungguh berkesan. Selamat <@${pair.user_one}> & <@${pair.user_two}> atas dedikasi luar biasa mempertahankan api abadi ini hingga **${streak} hari**.`,
            `Sebuah jejak waktu yang istimewa. <@${pair.user_one}> & <@${pair.user_two}> telah merangkai kisah **${streak} hari** bersama kilau agung Legendary Eternal Flame.`,
            `Keabadian yang nyata. Apresiasi tertinggi untuk <@${pair.user_one}> & <@${pair.user_two}> yang telah menjaga nyala Legendary Eternal Flame menembus **${streak} hari**.`
          ])
        };
      } else if (streak >= 900) {
        return {
          title: `${emoji} Cosmic Aurora Flame!`,
          body: getRandomBody([
            `Sangat memesona. Selamat <@${pair.user_one}> & <@${pair.user_two}> atas perjalanan indah **${streak} hari** di bawah naungan Cosmic Aurora Flame.`,
            `Konsistensi yang mengagumkan. <@${pair.user_one}> & <@${pair.user_two}> berhasil membawa pesonanya hingga ke angka **${streak} hari** bersama Cosmic Aurora Flame.`,
            `Pencapaian yang melampaui ekspektasi. Langkah <@${pair.user_one}> & <@${pair.user_two}> kini bersinar anggun di angka **${streak} hari** dengan Cosmic Aurora Flame.`
          ])
        };
      } else if (streak >= 800) {
        return {
          title: `${emoji} Aurora Flame!`,
          body: getRandomBody([
            `Harmoni yang indah. Selamat kepada <@${pair.user_one}> & <@${pair.user_two}> karena telah merawat kehangatan Aurora Flame hingga **${streak} hari**.`,
            `Dedikasi yang patut dirayakan. <@${pair.user_one}> & <@${pair.user_two}> sukses mempertahankan pesona Aurora Flame selama **${streak} hari** penuh.`,
            `Sebuah pencapaian yang elegan. Kebersamaan <@${pair.user_one}> & <@${pair.user_two}> kini telah mengukir **${streak} hari** bersama kilau Aurora Flame.`
          ])
        };
      } else if (streak >= 700) {
        return {
          title: `${emoji} Diamond Flame!`,
          body: getRandomBody([
            `Berkilau dan tak lekang oleh waktu. Selamat <@${pair.user_one}> & <@${pair.user_two}> atas pencapaian berharga **${streak} hari** dengan Diamond Flame.`,
            `Kualitas yang sesungguhnya. <@${pair.user_one}> & <@${pair.user_two}> berhasil merawat keindahan Diamond Flame hingga genap **${streak} hari**.`,
            `Semakin bersinar terang. Perjalanan <@${pair.user_one}> & <@${pair.user_two}> kini bersanding dengan keanggunan Diamond Flame di usia **${streak} hari**.`
          ])
        };
      } else if (streak >= 600) {
        return {
          title: `${emoji} Celestial Flame!`,
          body: getRandomBody([
            `Keindahan yang luar biasa. Selamat <@${pair.user_one}> & <@${pair.user_two}> telah merawat pesona surgawi Celestial Flame hingga **${streak} hari**.`,
            `Melangkah semakin tinggi. <@${pair.user_one}> & <@${pair.user_two}> berhasil mempertahankan keanggunan Celestial Flame selama **${streak} hari**.`,
            `Harmoni yang sempurna. Apresiasi untuk <@${pair.user_one}> & <@${pair.user_two}> yang senantiasa menjaga Celestial Flame tetap benderang di angka **${streak} hari**.`
          ])
        };
      } else if (streak >= 500) {
        return {
          title: `${emoji} Diamond Flame!`,
          body: getRandomBody([
            `Setengah ribu langkah yang berkesan. Selamat <@${pair.user_one}> & <@${pair.user_two}> atas **${streak} hari** perjalanan anggun bersama Diamond Flame.`,
            `Sebuah milestone emas. <@${pair.user_one}> & <@${pair.user_two}> sukses merayakan **${streak} hari** yang penuh kemilau dengan Diamond Flame.`,
            `Pesona yang tak tertandingi. Selamat kepada <@${pair.user_one}> & <@${pair.user_two}> karena konsisten menjaga Diamond Flame hingga **${streak} hari**.`
          ])
        };
      } else if (streak >= 400) {
        return {
          title: `${emoji} Ruby Flame!`,
          body: getRandomBody([
            `Merona dengan kehangatan. Selamat <@${pair.user_one}> & <@${pair.user_two}>, perjalanan kalian terasa semakin bermakna di angka **${streak} hari** dengan Ruby Flame.`,
            `Elegan dan memikat. <@${pair.user_one}> & <@${pair.user_two}> berhasil mempertahankan keindahan Ruby Flame selama **${streak} hari**.`,
            `Konsistensi yang manis. Kebersamaan <@${pair.user_one}> & <@${pair.user_two}> resmi menyentuh **${streak} hari** diiringi pesona Ruby Flame.`
          ])
        };
      } else if (streak >= 300) {
        return {
          title: `${emoji} Emerald Flame!`,
          body: getRandomBody([
            `Ketenangan yang memikat. Selamat <@${pair.user_one}> & <@${pair.user_two}> atas harmoni menjaga Emerald Flame hingga **${streak} hari**.`,
            `Semakin dalam dan berkesan. <@${pair.user_one}> & <@${pair.user_two}> sukses merawat cantiknya Emerald Flame hingga genap **${streak} hari**.`,
            `Prestasi yang elegan. Perjalanan <@${pair.user_one}> & <@${pair.user_two}> kini bersinar tenang di angka **${streak} hari** bersama Emerald Flame.`
          ])
        };
      } else if (streak >= 200) {
        return {
          title: `${emoji} Crystal Flame!`,
          body: getRandomBody([
            `Bening dan penuh makna. Apresiasi untuk <@${pair.user_one}> & <@${pair.user_two}> atas keberhasilan mencapai **${streak} hari** bersama Crystal Flame.`,
            `Keindahan yang murni. <@${pair.user_one}> & <@${pair.user_two}> sukses mempertahankan kilau jernih Crystal Flame hingga **${streak} hari**.`,
            `Teruslah bersinar. Selamat <@${pair.user_one}> & <@${pair.user_two}> atas perayaan anggun **${streak} hari** dengan pesona Crystal Flame.`
          ])
        };
      } else if (streak >= 100) {
        return {
          title: `${emoji} Royal Flame!`,
          body: getRandomBody([
            `Memasuki babak baru yang megah. Selamat <@${pair.user_one}> & <@${pair.user_two}> telah mengukir **${streak} hari** bersama keanggunan Royal Flame.`,
            `Pencapaian yang berkelas. <@${pair.user_one}> & <@${pair.user_two}> berhasil menembus tiga digit, merawat Royal Flame hingga **${streak} hari**.`,
            `Sebuah apresiasi untuk harmoni kalian. Selamat <@${pair.user_one}> & <@${pair.user_two}> atas perjalanan **${streak} hari** yang menawan bersama Royal Flame.`
          ])
        };
      } else if (streak >= 30) {
        return {
          title: `${emoji} Golden Orange Flame!`,
          body: getRandomBody([
            `Hangat dan menyenangkan. Pasangan <@${pair.user_one}> & <@${pair.user_two}> berhasil mempertahankan nyala Golden Orange Flame hingga **${streak} hari**.`,
            `Sebulan yang penuh warna. <@${pair.user_one}> & <@${pair.user_two}> sukses merawat pesona Golden Orange Flame genap selama **${streak} hari**.`,
            `Terus bersinar dengan lembut. Selamat <@${pair.user_one}> & <@${pair.user_two}> atas rutinitas manis **${streak} hari** bersama Golden Orange Flame.`
          ])
        };
      } else if (streak >= 7) {
        return {
          title: `${emoji} Bright Orange Flame!`,
          body: getRandomBody([
            `Awal perjalanan yang memukau. Selamat <@${pair.user_one}> & <@${pair.user_two}> telah menjaga Bright Orange Flame selama **${streak} hari**.`,
            `Kehangatan yang perlahan benderang. <@${pair.user_one}> & <@${pair.user_two}> sukses menyalakan Bright Orange Flame hingga **${streak} hari**.`,
            `Minggu pertama yang manis. Cerita <@${pair.user_one}> & <@${pair.user_two}> kini semakin bersinar di usia **${streak} hari** bersama Bright Orange Flame.`
          ])
        };
      } else {
        return {
          title: `${emoji} Orange Flame!`,
          body: getRandomBody([
            `Sebuah permulaan yang indah. <@${pair.user_one}> & <@${pair.user_two}> resmi merajut kisah **${streak} hari** pertama bersama Orange Flame.`,
            `Langkah pertama selalu bermakna. Selamat <@${pair.user_one}> & <@${pair.user_two}> atas kehangatan **${streak} hari** bersama Orange Flame.`,
            `Merawat nyala kecil dengan anggun. <@${pair.user_one}> & <@${pair.user_two}> menyalakan Orange Flame dengan manis di usia **${streak} hari**.`
          ])
        };
      }
    }

    let embedTitle = "";
    let content = "";

    if (cardType === "Warning") {
      embedTitle = "<a:22593alert:1523238009393123409> Streak Hampir Padam!";
      content = `<@${pair.user_one}> & <@${pair.user_two}>, salah satu dari kalian belum aktif hari ini. Segera berinteraksi sebelum reset pukul 00:00 WIB!`;
    } else if (cardType === "Broken") {
      embedTitle = "💔 Streak Padam...";
      content = `Sayang sekali streak <@${pair.user_one}> & <@${pair.user_two}> terputus. Gunakan \`/streak recover\` jika ingin memulihkannya.`;
    } else if (cardType === "Milestone") {
      embedTitle = `${emoji} Milestone Terlampaui!`;
      content = `Selamat kepada <@${pair.user_one}> & <@${pair.user_two}> yang telah mencapai **${streak} Hari**! Pencapaian luar biasa!`;
    } else {
      // Daily Progress — tiered
      const tiered = getTieredText();
      embedTitle = tiered.title;
      content = tiered.body;
    }

    const mInfo = getMilestoneInfo(pair.current_streak);
    const embedColor = cardType === "Broken" ? 0x4f545c : parseInt(mInfo.color.replace("#", ""), 16);
    const embed = new EmbedBuilder()
      .setTitle(embedTitle)
      .setColor(embedColor)
      .setTimestamp();

    if (cardType !== "Warning") {
      embed.setImage("attachment://streak_card.png");
    }

    const payload = { content: content, embeds: [embed] };
    if (attachment) {
      payload.files = [attachment];
    }

    await channel.send(payload);
  } catch (e) {
    console.error("[STREAK CARD NOTIFICATION ERROR]", e);
  }
}

async function runDailyEvaluation(client) {
  const guilds = client.guilds.cache;

  for (const [guildId] of guilds) {
    try {
      const settings = await getSettings(guildId);
      if (!settings || !settings.enabled) continue;

      const pairs = await getLeaderboard(guildId, "top_active", 500);

      for (const pair of pairs) {
        if (pair.status === "forming" || pair.status === "broken") continue;

        const pId = getPairId(pair);
        const u1Active = pair.user_one_active_today;
        const u2Active = pair.user_two_active_today;

        if (u1Active && u2Active) {
          await updatePair(pId, {
            user_one_active_today: 0,
            user_two_active_today: 0
          });
          await clearActivity(pId);
        } else {
          if (pair.status === "active" || pair.status === "warning") {
            if (pair.recovery_left <= 0) {
              await deletePair(pId);
              await addLog(guildId, pId, null, "streak_dissolved", "Streak dissolved automatically because recovery tokens ran out");
              await logToGuild(client, guildId, `💔 **Streak Dihapus!** Streak antara <@${pair.user_one}> & <@${pair.user_two}> telah **dihapus sepenuhnya** karena padam dan tidak memiliki sisa token pemulihan.`);
            } else {
              await updatePair(pId, {
                status: "broken",
                user_one_active_today: 0,
                user_two_active_today: 0,
                broken_at: Date.now()
              });
              await addLog(guildId, pId, null, "broken_status", "Streak set to broken status immediately");
              await sendStreakCardNotification(client, guildId, pId, "Broken");
            }
          }
        }
      }

      // Clean up broken pairs that haven't been recovered in 3 days
      const brokenPairs = await StreakPair.find({ guild_id: String(guildId), status: "broken" }).lean();
      for (const brokenPair of brokenPairs) {
        const brokenAt = brokenPair.broken_at || brokenPair.last_active_at || brokenPair.created_at || Date.now();
        const diffMs = Date.now() - brokenAt;
        const diffDays = diffMs / (24 * 60 * 60 * 1000);
        if (diffDays >= 3) {
          const bpId = getPairId(brokenPair);
          await deletePair(bpId);
          await addLog(guildId, bpId, null, "streak_dissolved_timeout", "Streak dissolved automatically because recovery window expired (3 days)");
          await logToGuild(client, guildId, `💔 **Streak Dihapus!** Streak antara <@${brokenPair.user_one}> & <@${brokenPair.user_two}> telah **dihapus sepenuhnya** karena sudah padam lebih dari 3 hari dan tidak di-recovery.`);
        }
      }

      await StreakPair.updateMany(
        { guild_id: String(guildId), status: 'forming' },
        { $set: { user_one_active_today: 0, user_two_active_today: 0 } }
      );
    } catch (err) {
      console.error(`[STREAK EVAL ERROR] Guild ${guildId}:`, err);
    }
  }
}

async function sendDmReminders(client) {
  console.log("[STREAK] Running 22:00 WIB DM Reminders...");
  try {
    const pairs = await StreakPair.find({ status: { $in: ["active", "warning"] } }).lean();
    for (const pair of pairs) {
      const u1Active = pair.user_one_active_today;
      const u2Active = pair.user_two_active_today;

      if (u1Active && u2Active) continue;

      const settings = await getSettings(pair.guild_id);
      const chatChannelId = settings?.chat_channel;
      const chatChannelLink = chatChannelId
        ? `https://discord.com/channels/${pair.guild_id}/${chatChannelId}`
        : null;

      const u1User = await client.users.fetch(pair.user_one).catch(() => null);
      const u2User = await client.users.fetch(pair.user_two).catch(() => null);

      if (!u1Active && u1User) {
        const embed = new EmbedBuilder()
          .setTitle("⏰ Pengingat Streak Hampir Padam!")
          .setDescription(
            `Halo <@${pair.user_one}>, hubungan streak-mu dengan <@${pair.user_two}> hari ini belum lengkap!\n\n` +
            `Segera balas chat atau mention <@${pair.user_two}> di channel <#${chatChannelId}> sebelum reset pukul **00:00 WIB** agar streak kalian yang mencapai **${pair.current_streak} Hari** tidak padam! 🕯️\n\n` +
            (chatChannelLink ? `🔗 **Link Obrolan:** [Buka Channel Chat](${chatChannelLink})` : "")
          )
          .setColor(0xffaa00)
          .setTimestamp();
        await u1User.send({ content: `<@${pair.user_one}>`, embeds: [embed] }).catch(() => {
          console.log(`[STREAK DM] Failed to DM ${pair.user_one} (probably closed DMs)`);
        });
      }

      if (!u2Active && u2User) {
        const embed = new EmbedBuilder()
          .setTitle("⏰ Pengingat Streak Hampir Padam!")
          .setDescription(
            `Halo <@${pair.user_two}>, hubungan streak-mu dengan <@${pair.user_one}> hari ini belum lengkap!\n\n` +
            `Segera balas chat atau mention <@${pair.user_one}> di channel <#${chatChannelId}> sebelum reset pukul **00:00 WIB** agar streak kalian yang mencapai **${pair.current_streak} Hari** tidak padam! 🕯️\n\n` +
            (chatChannelLink ? `🔗 **Link Obrolan:** [Buka Channel Chat](${chatChannelLink})` : "")
          )
          .setColor(0xffaa00)
          .setTimestamp();
        await u2User.send({ content: `<@${pair.user_two}>`, embeds: [embed] }).catch(() => {
          console.log(`[STREAK DM] Failed to DM ${pair.user_two} (probably closed DMs)`);
        });
      }
    }
  } catch (e) {
    console.error("[STREAK DM REMINDER ERROR]", e);
  }
}

async function sendPublicWarningReminders(client) {
  try {
    const pairs = await StreakPair.find({ status: { $in: ["active", "warning"] } }).lean();
    for (const pair of pairs) {
      if (pair.user_one_active_today && pair.user_two_active_today) continue;

      const settings = await getSettings(pair.guild_id);
      if (!settings || !settings.enabled) continue;

      const chatChannelId = settings.chat_channel;
      if (!chatChannelId) continue;

      const guild = client.guilds.cache.get(pair.guild_id) || await client.guilds.fetch(pair.guild_id).catch(() => null);
      if (!guild) continue;

      const channel = await guild.channels.fetch(chatChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) continue;

      const embed = new EmbedBuilder()
        .setTitle("<a:22593alert:1523238009393123409> Streak Hampir Padam!")
        .setDescription(`<@${pair.user_one}> & <@${pair.user_two}>, salah satu dari kalian belum aktif hari ini. Segera berinteraksi sebelum reset pukul 00:00 WIB!`)
        .setColor(0xff5252)
        .setTimestamp();

      await channel.send({
        content: `<@${pair.user_one}> & <@${pair.user_two}>`,
        embeds: [embed]
      }).catch(err => console.error("[PUBLIC WARNING SEND ERROR]", err));
    }
  } catch (e) {
    console.error("[STREAK PUBLIC WARNING REMINDER ERROR]", e);
  }
}

async function recoverStreak(guildId, userId, targetUserId = null) {
  let pair;

  if (targetUserId) {
    pair = await getPair(guildId, userId, targetUserId);
    if (!pair) {
      return { error: `Tidak ditemukan hubungan streak antara kamu dengan <@${targetUserId}>.` };
    }
    if (pair.status !== "broken") {
      if (pair.status === "active" || pair.status === "warning") {
        return { error: `Streak kamu dengan <@${targetUserId}> saat ini sudah **aktif**! 🔥` };
      }
      return { error: `Streak kamu dengan <@${targetUserId}> belum dalam status padam (broken).` };
    }
  } else {
    const brokenPairs = await StreakPair.find({
      guild_id: String(guildId),
      $or: [{ user_one: String(userId) }, { user_two: String(userId) }],
      status: "broken"
    }).sort({ current_streak: -1 }).lean();

    if (brokenPairs.length === 0) {
      const activePair = await getActivePairForUser(guildId, userId);
      if (activePair) {
        const partnerId = activePair.user_one === userId ? activePair.user_two : activePair.user_one;
        return { error: `Streak kamu dengan <@${partnerId}> saat ini sudah **aktif**! 🔥` };
      }
      return { error: "Kamu tidak memiliki pasangan streak yang padam (broken) saat ini." };
    }

    if (brokenPairs.length > 1) {
      const partnerMentions = brokenPairs.map(p => {
        const pId = p.user_one === userId ? p.user_two : p.user_one;
        return `<@${pId}>`;
      }).join(", ");
      return { error: `Kamu memiliki **${brokenPairs.length}** streak yang padam (${partnerMentions}).\nSilakan sebutkan pasangannya: \`cstreak recover @user\` atau \`/streak recover user: @user\`` };
    }

    pair = brokenPairs[0];
  }

  if (pair.recovery_left <= 0) {
    return { error: "Batas pemulihan (recovery) bulan ini untuk pasanganmu telah habis! (Maksimal 5/bulan)" };
  }

  const now = Date.now();

  const nextRec = pair.recovery_left - 1;

  const pId = getPairId(pair);

  await updatePair(pId, {
    status: "active",
    recovery_left: nextRec,
    last_active_at: now,
    user_one_active_today: 1,
    user_two_active_today: 1
  });

  await addLog(guildId, pId, userId, "streak_recovered", `Streak recovered. Remaining: ${nextRec}`);

  return { success: true, partner: pair.user_one === userId ? pair.user_two : pair.user_one, newStreak: pair.current_streak, recoveryLeft: nextRec };
}

async function breakStreak(guildId, userId, targetUserId = null) {
  let pair;

  if (targetUserId) {
    pair = await getPair(guildId, userId, targetUserId);
    if (!pair) {
      return { error: `Kamu tidak sedang berada dalam hubungan streak dengan <@${targetUserId}>!` };
    }
  } else {
    const allPairs = await StreakPair.find({
      guild_id: String(guildId),
      $or: [{ user_one: String(userId) }, { user_two: String(userId) }]
    }).sort({ current_streak: -1 }).lean();

    if (allPairs.length === 0) {
      return { error: "Kamu tidak sedang berada dalam hubungan streak aktif atau padam!" };
    }

    if (allPairs.length > 1) {
      const partnerMentions = allPairs.map(p => {
        const pId = p.user_one === userId ? p.user_two : p.user_one;
        return `<@${pId}>`;
      }).join(", ");
      return { error: `Kamu memiliki **${allPairs.length}** hubungan streak (${partnerMentions}).\nSilakan sebutkan pasangannya: \`cstreak break @user\` atau \`/streak break user: @user\`` };
    }

    pair = allPairs[0];
  }

  const pId = getPairId(pair);

  await deletePair(pId);
  await addLog(guildId, pId, userId, "streak_dissolved", `Streak pair ${pId} dissolved manually by user`);

  return { success: true, partner: pair.user_one === userId ? pair.user_two : pair.user_one };
}

async function resetMonthlyRecoveryTokens(client) {
  console.log("[STREAK] Running Monthly Recovery Tokens Reset...");
  try {
    // Reset default ke 5 untuk seluruh pasangan
    await StreakPair.updateMany({}, { $set: { recovery_left: 5 } });

    // Sesuaikan dengan pengaturan spesifik guild jika ada
    const settingsList = await StreakSetting.find({}, { guild_id: 1, recovery_limit: 1, _id: 0 }).lean();
    for (const setting of settingsList) {
      const limit = setting.recovery_limit !== null ? setting.recovery_limit : 5;
      await StreakPair.updateMany(
        { guild_id: String(setting.guild_id) },
        { $set: { recovery_left: Number(limit) } }
      );
      await logToGuild(
        client,
        setting.guild_id,
        `📅 **Reset Bulanan:** Kuota pemulihan (*recovery*) seluruh pasangan streak telah di-reset kembali menjadi **${limit}** untuk bulan baru.`
      );
    }
    console.log("[STREAK] Monthly recovery tokens successfully reset!");
  } catch (err) {
    console.error("[STREAK MONTHLY RESET ERROR]", err);
  }
}

let cronInterval = null;
const initializedClients = new WeakSet();
let lastCronExecutedKey = "";
function startScheduler(client) {
  if (cronInterval) clearInterval(cronInterval);
  cronInterval = setInterval(async () => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        hour: "numeric",
        minute: "numeric",
        hourCycle: "h23"
      });
      const parts = formatter.formatToParts(now);
      const hourPart = parts.find(p => p.type === "hour");
      const minutePart = parts.find(p => p.type === "minute");

      if (hourPart && minutePart) {
        const hh = parseInt(hourPart.value, 10);
        const mm = parseInt(minutePart.value, 10);
        const key = `${hh}:${mm}:${now.getDate()}`;

        if ((hh === 0 || hh === 24) && mm === 0) {
          if (lastCronExecutedKey === key) return;
          lastCronExecutedKey = key;
          console.log("[STREAK] Running 00:00 WIB Reset Evaluation...");
          await runDailyEvaluation(client);

          // Reset token recovery setiap tanggal 1
          const dayFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Jakarta",
            day: "numeric"
          });
          const dayOfMonth = parseInt(dayFormatter.format(now), 10);
          if (dayOfMonth === 1) {
            await resetMonthlyRecoveryTokens(client);
          }
        }

        if (hh === 21 && mm === 0) {
          console.log("[STREAK] Running 21:00 WIB Public Warning Reminders...");
          await sendPublicWarningReminders(client);
        }

        if (hh === 22 && mm === 0) {
          console.log("[STREAK] Running 22:00 WIB DM Reminders...");
          await sendDmReminders(client);
        }
      }
    } catch (e) {
      console.error("[STREAK CRON ERROR]", e);
    }
  }, 60000);
}

// ===================== SLASH COMMAND HANDLERS =====================
const streakCommandBuilder = new SlashCommandBuilder()
  .setName("streak")
  .setDescription("Sistem interaksi harian Mystral Flame Streak")
  .addSubcommand(sc =>
    sc.setName("profile")
      .setDescription("Lihat profil & kartu streak kamu atau member lain")
      .addUserOption(o => o.setName("user").setDescription("Pilih member").setRequired(false))
  )
  .addSubcommand(sc =>
    sc.setName("list")
      .setDescription("Lihat daftar seluruh pasangan streak kamu")
      .addUserOption(o => o.setName("user").setDescription("Pilih member (opsional)").setRequired(false))
  )
  .addSubcommand(sc =>
    sc.setName("leaderboard")
      .setDescription("Peringkat pasangan streak teraktif")
      .addStringOption(o =>
        o.setName("tipe")
          .setDescription("Tipe peringkat")
          .setRequired(false)
          .addChoices(
            { name: "Top Streak Aktif", value: "top_pair" },
            { name: "Top Rekor Terpanjang", value: "top_longest" },
            { name: "Top Baru Aktif", value: "top_active" },
            { name: "Top Sering Recovery", value: "top_recovery" }
          )
      )
  )
  .addSubcommand(sc =>
    sc.setName("history")
      .setDescription("Lihat riwayat aktivitas & logs streak pasanganmu")
  )
  .addSubcommand(sc =>
    sc.setName("recover")
      .setDescription("Pulihkan kembali streak yang padam menggunakan token")
      .addUserOption(o => o.setName("user").setDescription("Pilih partner yang ingin dipulihkan (opsional)").setRequired(false))
  )
  .addSubcommand(sc =>
    sc.setName("break")
      .setDescription("Bubarkan hubungan streak dengan pasanganmu")
      .addUserOption(o => o.setName("user").setDescription("Pilih partner yang ingin dibubarkan (opsional)").setRequired(false))
  )
  .addSubcommand(sc =>
    sc.setName("reset")
      .setDescription("Reset data streak (Khusus Admin)")
      .addStringOption(o =>
        o.setName("tipe")
          .setDescription("Reset semua user atau per user tertentu")
          .setRequired(true)
          .addChoices(
            { name: "Semua User (All)", value: "all" },
            { name: "Per User (User)", value: "user" }
          )
      )
      .addUserOption(o => o.setName("member").setDescription("Pilih member yang ingin di-reset (jika tipe = user)").setRequired(false))
  )
  .addSubcommand(sc =>
    sc.setName("info")
      .setDescription("Informasi cara kerja dan daftar milestone tier Mystral Flame Streak")
  )
  .addSubcommand(sc =>
    sc.setName("settings")
      .setDescription("Pengaturan admin untuk fitur Mystral Flame Streak (Khusus Admin)")
      .addChannelOption(o => o.setName("chat_channel").setDescription("Channel khusus aktifkan streak").addChannelTypes(ChannelType.GuildText))
      .addChannelOption(o => o.setName("card_channel").setDescription("Channel log pengiriman kartu streak").addChannelTypes(ChannelType.GuildText))
      .addChannelOption(o => o.setName("log_channel").setDescription("Channel audit log admin").addChannelTypes(ChannelType.GuildText))
      .addIntegerOption(o => o.setName("cooldown").setDescription("Cooldown antar pesan valid (detik)"))
      .addIntegerOption(o => o.setName("minimum_length").setDescription("Panjang karakter minimal pesan"))
      .addBooleanOption(o => o.setName("enable").setDescription("Aktifkan atau nonaktifkan sistem streak"))
  );

async function handlePrefixCommand(message, client) {
  const prefix = process.env.PREFIX || "c";
  const contentLower = message.content.trim().toLowerCase();
  let subcommand, args;

  if (contentLower.startsWith(prefix + "sp")) {
    subcommand = "profile";
    args = message.content.slice((prefix + "sp").length).trim().split(/\s+/);
  } else if (contentLower.startsWith(prefix + "sl")) {
    subcommand = "list";
    args = message.content.slice((prefix + "sl").length).trim().split(/\s+/);
  } else if (contentLower.startsWith(prefix + "srec")) {
    subcommand = "recover";
    args = message.content.slice((prefix + "srec").length).trim().split(/\s+/);
  } else if (contentLower.startsWith(prefix + "si")) {
    subcommand = "info";
    args = message.content.slice((prefix + "si").length).trim().split(/\s+/);
  } else {
    const commandPrefix = prefix + "streak";
    args = message.content.slice(commandPrefix.length).trim().split(/\s+/);
    subcommand = args.shift()?.toLowerCase();
  }

  const guildId = message.guild.id;
  const runnerId = message.author.id;

  const settings = await getSettings(guildId);
  if (subcommand !== "settings" && (!settings || !settings.enabled)) {
    return message.reply("❌ Sistem **Mystral Flame Streak** belum diaktifkan di server ini oleh Administrator.");
  }

  // Subcommand: SET / GRANT (Owner Only)
  if (subcommand === "set" || subcommand === "grant") {
    const isOwner = message.author.id === process.env.BOT_OWNER_ID;
    if (!isOwner) {
      return message.reply("❌ Perintah ini hanya dapat dijalankan oleh Bot Owner.");
    }

    const userMatches = [...message.content.matchAll(/<@!?(\d{15,25})>/g)];
    const userIds = userMatches.map(m => m[1]);

    for (const arg of args) {
      if (/^\d{15,25}$/.test(arg) && !userIds.includes(arg)) {
        userIds.push(arg);
      }
    }

    if (userIds.length < 2) {
      return message.reply("❌ **Format Salah!** Harap mention 2 user atau berikan 2 ID user.\nContoh: `cstreak set @UserA @UserB 30`");
    }

    const dayArg = args.find(arg => /^\d+$/.test(arg) && !userIds.includes(arg));
    if (!dayArg) {
      return message.reply("❌ **Format Salah!** Harap tentukan jumlah hari (angka).\nContoh: `cstreak set @UserA @UserB 30`");
    }

    const days = parseInt(dayArg, 10);
    const [u1, u2] = [userIds[0], userIds[1]].sort();

    let pair = await getPair(guildId, u1, u2);
    if (!pair) {
      pair = await createPair(guildId, u1, u2);
    }

    await updatePair(pair.id, {
      current_streak: days,
      highest_streak: Math.max(pair.highest_streak, days),
      status: "active",
      user_one_active_today: 1,
      user_two_active_today: 1
    });

    await addLog(guildId, pair.id, message.author.id, "streak_set", `Owner set streak to ${days} days`);
    await logToGuild(client, guildId, `⚙️ **Streak Set:** Owner <@${message.author.id}> mengatur streak antara <@${u1}> & <@${u2}> menjadi **${days} Hari**.`);

    return message.reply(`✅ **Berhasil!** Streak antara <@${u1}> dan <@${u2}> telah diatur menjadi **${days} Hari** (Status: ACTIVE).`);
  }

  // Subcommand: PROFILE (Default)
  if (!subcommand || subcommand === "profile") {
    let targetUser = message.mentions.users.first();
    if (!targetUser && args[0]) {
      const cleanedId = args[0].replace(/[<@!>]/g, "");
      targetUser = await client.users.fetch(cleanedId).catch(() => null);
    }
    if (!targetUser) targetUser = message.author;

    const docs = await StreakPair.find({
      guild_id: String(guildId),
      $or: [{ user_one: String(targetUser.id) }, { user_two: String(targetUser.id) }],
      status: { $ne: 'forming' }
    }).sort({ current_streak: -1 });
    const allPairs = docs.map(d => d.toObject());

    if (!allPairs.length) {
      return message.reply(`❌ **${targetUser.username}** belum memiliki pasangan streak.\nAjak temanmu mengobrol di channel khusus <#${settings.chat_channel || "belum di-set"}> untuk mulai membentuk streak harian! ✨`);
    }

    const loadingMsg = await message.reply("⏳ Sedang memproses kartu profil streak...");
    let currentIndex = 0;

    async function buildProfilePage(index) {
      const pair = allPairs[index];
      const uOne = await client.users.fetch(pair.user_one).catch(() => null);
      const uTwo = await client.users.fetch(pair.user_two).catch(() => null);

      const nameOne = uOne ? uOne.username : "User One";
      const nameTwo = uTwo ? uTwo.username : "User Two";
      const avatarOne = uOne ? uOne.displayAvatarURL({ extension: "png", size: 128 }) : "";
      const avatarTwo = uTwo ? uTwo.displayAvatarURL({ extension: "png", size: 128 }) : "";

      const cardBuffer = await drawStreakCard({
        userOneName: nameOne,
        userTwoName: nameTwo,
        userOneAvatarUrl: avatarOne,
        userTwoAvatarUrl: avatarTwo,
        userOneActive: pair.user_one_active_today,
        userTwoActive: pair.user_two_active_today,
        currentStreak: pair.current_streak,
        recoveryLeft: pair.recovery_left,
        nextMilestone: getNextMilestone(pair.current_streak),
        cardType: pair.status === "broken" ? "Broken" : "Daily Progress"
      });

      let descNote = `Berikut adalah kartu perkembangan streak untuk **${nameOne} & ${nameTwo}**.\nStatus saat ini: **${pair.status.toUpperCase()}**`;
      if (allPairs.length > 1) {
        descNote += `\n\n💡 **${targetUser.username}** memiliki **${allPairs.length}** pasangan streak aktif saat ini.`;
      }

      const attachment = new AttachmentBuilder(cardBuffer, { name: `streak_card_${pair.id}.png` });
      const embed = new EmbedBuilder()
        .setTitle(`🔥 Mystral Flame Streak — Profile`)
        .setDescription(descNote)
        .setColor(pair.status === "broken" ? 0x4f545c : 0xff7700)
        .setImage(`attachment://streak_card_${pair.id}.png`)
        .setFooter({ text: `Pasangan ${index + 1} dari ${allPairs.length} | Jaga terus api kebersamaan kalian!` });

      return { embeds: [embed], files: [attachment] };
    }

    function buildProfileButtons(index) {
      const row = new ActionRowBuilder();
      const prevBtn = new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("◀ Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === 0);

      const nextBtn = new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === allPairs.length - 1);

      row.addComponents(prevBtn, nextBtn);
      return row;
    }

    try {
      const payload = await buildProfilePage(0);
      const components = allPairs.length > 1 ? [buildProfileButtons(0)] : [];
      const replyMsg = await loadingMsg.edit({ content: null, ...payload, components });

      if (allPairs.length > 1) {
        const filter = (i) => i.user.id === runnerId;
        const collector = replyMsg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on("collect", async (i) => {
          if (i.customId === "prev") {
            currentIndex = Math.max(0, currentIndex - 1);
          } else if (i.customId === "next") {
            currentIndex = Math.min(allPairs.length - 1, currentIndex + 1);
          }
          await i.deferUpdate();
          const nextPayload = await buildProfilePage(currentIndex);
          await replyMsg.edit({ ...nextPayload, components: [buildProfileButtons(currentIndex)] });
        });
      }
    } catch (e) {
      console.error(e);
      await loadingMsg.edit("❌ Terjadi kesalahan saat membuat kartu profil streak.");
    }
    return;
  }

  // Subcommand: LIST
  if (subcommand === "list") {
    let targetUser = message.mentions.users.first();
    if (!targetUser && args[0]) {
      const cleanedId = args[0].replace(/[<@!>]/g, "");
      targetUser = await client.users.fetch(cleanedId).catch(() => null);
    }
    if (!targetUser) targetUser = message.author;

    const docsActive = await StreakPair.find({
      guild_id: String(guildId),
      $or: [{ user_one: String(targetUser.id) }, { user_two: String(targetUser.id) }],
      status: { $in: ["active", "warning"] }
    }).sort({ current_streak: -1 });
    const allActive = docsActive.map(d => d.toObject());

    const docsBroken = await StreakPair.find({
      guild_id: String(guildId),
      $or: [{ user_one: String(targetUser.id) }, { user_two: String(targetUser.id) }],
      status: 'broken'
    }).sort({ current_streak: -1 });
    const allBroken = docsBroken.map(d => d.toObject());

    if (!allActive.length && !allBroken.length) {
      return message.reply(`❌ **${targetUser.username}** belum memiliki pasangan streak aktif maupun padam.`);
    }

    const activeItems = allActive.map(pair => ({ type: "active", pair }));
    const brokenItems = allBroken.map(pair => ({ type: "broken", pair }));
    const totalItems = [...activeItems, ...brokenItems];

    const totalPages = Math.ceil(totalItems.length / 10);
    let currentPage = 0;

    async function buildPage(page) {
      const start = page * 10;
      const end = start + 10;
      const pageItems = totalItems.slice(start, end);

      const container = new ContainerBuilder().setAccentColor(0xff7700);

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 📜 Daftar Streak — ${targetUser.username}`)
      );
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

      const activeLines = [];
      const pageActive = pageItems.filter(item => item.type === "active");
      if (pageActive.length > 0) {
        activeLines.push("🔥 **STREAK AKTIF:**");
        const renderedActive = await Promise.all(
          pageActive.map(async ({ pair }, index) => {
            const displayIndex = start + index + 1;
            const partnerId = pair.user_one === targetUser.id ? pair.user_two : pair.user_one;
            const partner = client.users.cache.get(partnerId) || await client.users.fetch(partnerId).catch(() => null);
            const name = partner ? partner.username : partnerId;
            const emoji = getMilestoneEmoji(pair.current_streak);
            const isTodayDone = pair.user_one === targetUser.id ? pair.user_one_active_today : pair.user_two_active_today;
            const partnerTodayDone = pair.user_one === targetUser.id ? pair.user_two_active_today : pair.user_one_active_today;
            const statusIndicator =
              isTodayDone && partnerTodayDone
                ? "Active <a:Fm_check:1523182720493289666>"
                : "Waiting <a:loadmystral:1525210969876205578>";
            return `**#${displayIndex}** ${emoji} **${name}** — \`${pair.current_streak} Hari\` • ${statusIndicator}`;
          })
        );
        activeLines.push(...renderedActive);
      }

      if (activeLines.length > 0) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(activeLines.join("\n"))
        );
      }

      const pageBroken = pageItems.filter(item => item.type === "broken");
      if (pageBroken.length > 0) {
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        const brokenLines = ["🕯️ **STREAK PADAM (BROKEN):**"];
        const renderedBroken = await Promise.all(
          pageBroken.map(async ({ pair }) => {
            const partnerId = pair.user_one === targetUser.id ? pair.user_two : pair.user_one;
            const partner = client.users.cache.get(partnerId) || await client.users.fetch(partnerId).catch(() => null);
            const name = partner ? partner.username : partnerId;
            return `- **${name}** — \`${pair.current_streak} Hari\` (Gunakan \`cstreak recover @${name}\` atau \`/streak recover user: @${name}\`)`;
          })
        );
        brokenLines.push(...renderedBroken);

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(brokenLines.join("\n"))
        );
      }

      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`*Halaman ${page + 1} dari ${totalPages} (Total ${totalItems.length} pasangan)*`)
      );

      if (totalPages > 1) {
        const prevBtn = new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("◀ Prev")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0);

        const nextBtn = new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next ▶")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1);

        const buttonRow = new ActionRowBuilder().addComponents(prevBtn, nextBtn);
        container.addActionRowComponents(buttonRow);
      }

      return container;
    }

    const container = await buildPage(0);
    const replyMsg = await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

    if (totalPages > 1) {
      const filter = (i) => i.user.id === runnerId;
      const collector = replyMsg.createMessageComponentCollector({ filter, time: 60000 });

      collector.on("collect", async (i) => {
        if (i.customId === "prev") {
          currentPage = Math.max(0, currentPage - 1);
        } else if (i.customId === "next") {
          currentPage = Math.min(totalPages - 1, currentPage + 1);
        }
        const nextContainer = await buildPage(currentPage);
        await i.update({ components: [nextContainer], flags: MessageFlags.IsComponentsV2 });
      });

      collector.on("end", () => {
        buildPage(currentPage).then(finalContainer => {
          replyMsg.edit({ components: [finalContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
        }).catch(() => { });
      });
    }
    return;
  }

  // Subcommand: EVAL (Manual Run Evaluasi Harian)
  if (subcommand === "eval" || subcommand === "evaluate") {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply("❌ Perintah ini khusus Administrator.");
    }
    await message.reply("⚙️ Menjalankan evaluasi harian streak...");
    await runDailyEvaluation(client);
    return message.channel.send("✅ Evaluasi harian streak selesai dijalankan!");
  }

  // Subcommand: RESET
  if (subcommand === "reset") {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply("❌ Kamu tidak memiliki izin (Administrator) untuk menjalankan perintah ini.");
    }

    const typeArg = args[0]?.toLowerCase();
    if (typeArg === "all") {
      await resetAllGuildStreaks(guildId);
      await logToGuild(client, guildId, `⚙️ **Reset All:** Admin <@${runnerId}> melakukan reset total seluruh data streak di server ini.`);
      return message.reply("✅ **Reset Total Berhasil!** Seluruh data streak dan log di server ini telah dihapus.");
    }

    // If target is a user
    let targetUser = message.mentions.users.first();
    if (!targetUser && args[0]) {
      const cleanedId = (args[0] === "user" ? args[1] : args[0])?.replace(/[<@!>]/g, "");
      if (cleanedId) {
        targetUser = await client.users.fetch(cleanedId).catch(() => null);
      }
    }

    if (!targetUser) {
      return message.reply("❌ **Format Salah!** Gunakan:\n• `cstreak reset all` untuk me-reset semua user.\n• `cstreak reset @User` untuk me-reset user tertentu.");
    }

    await resetUserGuildStreaks(guildId, targetUser.id);
    await logToGuild(client, guildId, `⚙️ **Reset User:** Admin <@${runnerId}> melakukan reset seluruh data streak milik <@${targetUser.id}>.`);
    return message.reply(`✅ **Reset User Berhasil!** Seluruh hubungan streak milik **${targetUser.username}** telah dihapus.`);
  }

  // Subcommand: LEADERBOARD
  if (subcommand === "leaderboard") {
    let type = args[0]?.toLowerCase() || "top_pair";
    if (type === "active") type = "top_active";
    if (type === "longest" || type === "record") type = "top_longest";
    if (type === "recovery" || type === "token") type = "top_recovery";

    if (!["top_pair", "top_longest", "top_active", "top_recovery"].includes(type)) {
      type = "top_pair";
    }

    const board = await getLeaderboard(guildId, type, 10);
    if (!board.length) {
      return message.reply("❌ Belum ada data peringkat streak di server ini.");
    }

    const typeLabels = {
      top_pair: "Top Streak Aktif",
      top_longest: "Top Rekor Terpanjang",
      top_active: "Top Baru Aktif",
      top_recovery: "Top Sering Recovery"
    };

    const embed = new EmbedBuilder()
      .setTitle(`<a:champions:1523182563332718767> Leaderboard Mystral Flame Streak`)
      .setColor(0xff7700)
      .setTimestamp();

    const lines = [];
    for (let i = 0; i < board.length; i++) {
      const p = board[i];
      const u1Name = (await client.users.fetch(p.user_one).catch(() => null))?.username || p.user_one;
      const u2Name = (await client.users.fetch(p.user_two).catch(() => null))?.username || p.user_two;
      const streakVal = type === "top_longest" ? p.highest_streak : p.current_streak;

      lines.push(`${i + 1}. **${u1Name} × ${u2Name}** — \`${streakVal} Hari\` 🔥 (Status: *${p.status.toUpperCase()}*)`);
    }

    embed.setDescription(`Kategori: **${typeLabels[type]}**\n\n${lines.join("\n")}`);
    return message.reply({ embeds: [embed] });
  }

  // Subcommand: HISTORY
  if (subcommand === "history") {
    const activePair = await getActivePairForUser(guildId, runnerId);
    const brokenPair = await getBrokenPairForUser(guildId, runnerId);
    const pair = activePair || brokenPair;

    if (!pair) {
      return message.reply("❌ Kamu tidak memiliki pasangan streak aktif untuk melihat riwayat.");
    }

    const logs = await getLogsForPair(pair.id, 8);
    if (!logs.length) {
      return message.reply("❌ Belum ada riwayat tercatat untuk pasangan streak kamu.");
    }

    const embed = new EmbedBuilder()
      .setTitle(`📜 Riwayat Aktivitas Streak`)
      .setColor(0x77d0d7)
      .setTimestamp();

    const logLines = logs.map(l => {
      const timeStr = `<t:${Math.round(l.timestamp / 1000)}:R>`;
      const actionLabels = {
        create_forming_pair: "Inisiasi Streak ◌",
        streak_formed: "Streak Terbentuk 🔥",
        daily_increment: "Streak Naik +1 Hari 📈",
        warning_status: "Peringatan Padam ⚠️",
        broken_status: "Streak Padam 🕯️",
        streak_recovered: "Streak Dipulihkan 🩹",
        streak_dissolved: "Streak Dibubarkan 💔"
      };
      const label = actionLabels[l.action] || l.action;
      return `${timeStr} — **${label}**\n> *Detail:* ${l.details}`;
    });

    embed.setDescription(`Daftar log aktivitas terbaru untuk pasanganmu:\n\n${logLines.join("\n\n")}`);
    return message.reply({ embeds: [embed] });
  }

  // Subcommand: RECOVER
  if (subcommand === "recover") {
    const targetUser = message.mentions.users.first();
    const res = await recoverStreak(guildId, runnerId, targetUser?.id);

    if (res.error) {
      return message.reply(`⚠️ ${res.error}`);
    }

    const partnerUser = await client.users.fetch(res.partner).catch(() => null);
    const partnerName = partnerUser ? partnerUser.username : "Partner";

    const container = new ContainerBuilder().setAccentColor(0xff7700);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent("## <a:vssparkly:1523181259323473990> Yash! Streak berhasil dipulihkan!"));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`Streak kamu dengan **${partnerName}** telah kembali aktif menjadi **${res.newStreak} Hari**! 🔥`));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Sisa token pemulihan pasangan: **${res.recoveryLeft} / 5**`));

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    const pair = await getPair(guildId, runnerId, res.partner);
    if (pair) {
      await sendStreakCardNotification(client, guildId, pair.id, "Daily Progress");
    }
    return;
  }

  // Subcommand: BREAK
  if (subcommand === "break") {
    const targetUser = message.mentions.users.first();
    const res = await breakStreak(guildId, runnerId, targetUser?.id);

    if (res.error) {
      return message.reply(`⚠️ ${res.error}`);
    }

    const partnerUser = await client.users.fetch(res.partner).catch(() => null);
    const partnerName = partnerUser ? partnerUser.username : "Partner";

    const container = new ContainerBuilder().setAccentColor(0xef4444);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## 💔 Hubungan Streak Dibubarkan")
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Kamu telah memutuskan hubungan streak dengan **${partnerName}** (<@${res.partner}>).\n\n` +
        `Rekor kalian telah dihapus dan kalian sekarang bebas membentuk streak dengan partner baru.`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("-# Mystral • Flame Streak System")
    );

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }

  // Subcommand: INFO
  if (subcommand === "info") {
    const container = buildStreakInfoContainerV2(settings);

    const replyMsg = await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    const filter = (i) => i.customId === "view_milestones";
    const collector = replyMsg.createMessageComponentCollector({ filter, time: 300000 });

    collector.on("collect", async (i) => {
      const milestoneContainer = buildMilestonesContainerV2();
      await i.reply({
        components: [milestoneContainer],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      }).catch(() => { });
    });
    return;
  }

  // Subcommand: SETTINGS (redirect to slash)
  if (subcommand === "settings") {
    return message.reply("❌ Pengaturan konfigurasi streak hanya dapat diubah melalui slash command `/streak settings` untuk menjamin keamanan izin admin.");
  }
}

async function handleInteraction(interaction, client) {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const runnerId = interaction.user.id;

  const settings = await getSettings(guildId);
  if (subcommand !== "settings" && (!settings || !settings.enabled)) {
    return interaction.reply({ content: "❌ Sistem **Mystral Flame Streak** belum diaktifkan di server ini oleh Administrator.", flags: MessageFlags.Ephemeral });
  }

  if (subcommand === "profile") {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser("user") || interaction.user;

    const docs = await StreakPair.find({
      guild_id: String(guildId),
      $or: [{ user_one: String(targetUser.id) }, { user_two: String(targetUser.id) }],
      status: { $ne: 'forming' }
    }).sort({ current_streak: -1 });
    const allPairs = docs.map(d => d.toObject());

    if (!allPairs.length) {
      return interaction.editReply({
        content: `❌ **${targetUser.username}** belum memiliki pasangan streak.\nAjak temanmu mengobrol di channel khusus <#${settings.chat_channel || "belum di-set"}> untuk mulai membentuk streak harian! ✨`
      });
    }

    let currentIndex = 0;

    async function buildProfilePage(index) {
      const pair = allPairs[index];
      const uOne = await client.users.fetch(pair.user_one).catch(() => null);
      const uTwo = await client.users.fetch(pair.user_two).catch(() => null);

      const nameOne = uOne ? uOne.username : "User One";
      const nameTwo = uTwo ? uTwo.username : "User Two";
      const avatarOne = uOne ? uOne.displayAvatarURL({ extension: "png", size: 128 }) : "";
      const avatarTwo = uTwo ? uTwo.displayAvatarURL({ extension: "png", size: 128 }) : "";

      const cardBuffer = await drawStreakCard({
        userOneName: nameOne,
        userTwoName: nameTwo,
        userOneAvatarUrl: avatarOne,
        userTwoAvatarUrl: avatarTwo,
        userOneActive: pair.user_one_active_today,
        userTwoActive: pair.user_two_active_today,
        currentStreak: pair.current_streak,
        recoveryLeft: pair.recovery_left,
        nextMilestone: getNextMilestone(pair.current_streak),
        cardType: pair.status === "broken" ? "Broken" : "Daily Progress"
      });

      let descNote = `Berikut adalah kartu perkembangan streak untuk **${nameOne} & ${nameTwo}**.\nStatus saat ini: **${pair.status.toUpperCase()}**`;
      if (allPairs.length > 1) {
        descNote += `\n\n💡 **${targetUser.username}** memiliki **${allPairs.length}** pasangan streak aktif saat ini.`;
      }

      const attachment = new AttachmentBuilder(cardBuffer, { name: `streak_card_${pair.id}.png` });
      const embed = new EmbedBuilder()
        .setTitle(`🔥 Mystral Flame Streak — Profile`)
        .setDescription(descNote)
        .setColor(pair.status === "broken" ? 0x4f545c : 0xff7700)
        .setImage(`attachment://streak_card_${pair.id}.png`)
        .setFooter({ text: `Pasangan ${index + 1} dari ${allPairs.length} | Jaga terus api kebersamaan kalian!` });

      return { embeds: [embed], files: [attachment] };
    }

    function buildProfileButtons(index) {
      const row = new ActionRowBuilder();
      const prevBtn = new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("◀ Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === 0);

      const nextBtn = new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === allPairs.length - 1);

      row.addComponents(prevBtn, nextBtn);
      return row;
    }

    try {
      const payload = await buildProfilePage(0);
      const components = allPairs.length > 1 ? [buildProfileButtons(0)] : [];
      const replyMsg = await interaction.editReply({ ...payload, components });

      if (allPairs.length > 1) {
        const filter = (i) => i.user.id === interaction.user.id;
        const collector = replyMsg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on("collect", async (i) => {
          if (i.customId === "prev") {
            currentIndex = Math.max(0, currentIndex - 1);
          } else if (i.customId === "next") {
            currentIndex = Math.min(allPairs.length - 1, currentIndex + 1);
          }
          await i.deferUpdate();
          const nextPayload = await buildProfilePage(currentIndex);
          await interaction.editReply({ ...nextPayload, components: [buildProfileButtons(currentIndex)] });
        });
      }
    } catch (e) {
      console.error(e);
      await interaction.editReply({ content: "❌ Terjadi kesalahan saat membuat kartu profil streak." });
    }
  }

  if (subcommand === "list") {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser("user") || interaction.user;

    const docsActive = await StreakPair.find({
      guild_id: String(guildId),
      $or: [{ user_one: String(targetUser.id) }, { user_two: String(targetUser.id) }],
      status: { $in: ["active", "warning"] }
    }).sort({ current_streak: -1 });
    const allActive = docsActive.map(d => d.toObject());

    const docsBroken = await StreakPair.find({
      guild_id: String(guildId),
      $or: [{ user_one: String(targetUser.id) }, { user_two: String(targetUser.id) }],
      status: 'broken'
    }).sort({ current_streak: -1 });
    const allBroken = docsBroken.map(d => d.toObject());

    if (!allActive.length && !allBroken.length) {
      return interaction.editReply(`❌ **${targetUser.username}** belum memiliki pasangan streak aktif maupun padam.`);
    }

    const activeItems = allActive.map(pair => ({ type: "active", pair }));
    const brokenItems = allBroken.map(pair => ({ type: "broken", pair }));
    const totalItems = [...activeItems, ...brokenItems];

    const totalPages = Math.ceil(totalItems.length / 10);
    let currentPage = 0;

    async function buildPage(page) {
      const start = page * 10;
      const end = start + 10;
      const pageItems = totalItems.slice(start, end);

      const container = new ContainerBuilder().setAccentColor(0xff7700);

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 📜 Daftar Streak — ${targetUser.username}`)
      );
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

      const activeLines = [];
      const pageActive = pageItems.filter(item => item.type === "active");
      if (pageActive.length > 0) {
        activeLines.push("🔥 **STREAK AKTIF:**");
        const renderedActive = await Promise.all(
          pageActive.map(async ({ pair }, index) => {
            const displayIndex = start + index + 1;
            const partnerId = pair.user_one === targetUser.id ? pair.user_two : pair.user_one;
            const partner = client.users.cache.get(partnerId) || await client.users.fetch(partnerId).catch(() => null);
            const name = partner ? partner.username : partnerId;
            const emoji = getMilestoneEmoji(pair.current_streak);
            const isTodayDone = pair.user_one === targetUser.id ? pair.user_one_active_today : pair.user_two_active_today;
            const partnerTodayDone = pair.user_one === targetUser.id ? pair.user_two_active_today : pair.user_one_active_today;
            const statusIndicator =
              isTodayDone && partnerTodayDone
                ? "<a:Fm_check:1523182720493289666> Active"
                : "<a:loadmystral:1525210969876205578> Waiting";
            return `**#${displayIndex}** ${emoji} **${name}** — \`${pair.current_streak} Hari\` • ${statusIndicator}`;
          })
        );
        activeLines.push(...renderedActive);
      }

      if (activeLines.length > 0) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(activeLines.join("\n"))
        );
      }

      const pageBroken = pageItems.filter(item => item.type === "broken");
      if (pageBroken.length > 0) {
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        const brokenLines = ["🕯️ **STREAK PADAM (BROKEN):**"];
        const renderedBroken = await Promise.all(
          pageBroken.map(async ({ pair }) => {
            const partnerId = pair.user_one === targetUser.id ? pair.user_two : pair.user_one;
            const partner = client.users.cache.get(partnerId) || await client.users.fetch(partnerId).catch(() => null);
            const name = partner ? partner.username : partnerId;
            return `- **${name}** — \`${pair.current_streak} Hari\` (Gunakan \`/streak recover\`)`;
          })
        );
        brokenLines.push(...renderedBroken);

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(brokenLines.join("\n"))
        );
      }

      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`*Halaman ${page + 1} dari ${totalPages} (Total ${totalItems.length} pasangan)*`)
      );

      if (totalPages > 1) {
        const prevBtn = new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("◀ Prev")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0);

        const nextBtn = new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next ▶")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1);

        const buttonRow = new ActionRowBuilder().addComponents(prevBtn, nextBtn);
        container.addActionRowComponents(buttonRow);
      }

      return container;
    }

    const container = await buildPage(0);
    const replyMsg = await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });

    if (totalPages > 1) {
      const filter = (i) => i.user.id === interaction.user.id;
      const collector = replyMsg.createMessageComponentCollector({ filter, time: 60000 });

      collector.on("collect", async (i) => {
        if (i.customId === "prev") {
          currentPage = Math.max(0, currentPage - 1);
        } else if (i.customId === "next") {
          currentPage = Math.min(totalPages - 1, currentPage + 1);
        }
        const nextContainer = await buildPage(currentPage);
        await i.update({ components: [nextContainer], flags: MessageFlags.IsComponentsV2 });
      });

      collector.on("end", () => {
        buildPage(currentPage).then(finalContainer => {
          interaction.editReply({ components: [finalContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
        }).catch(() => { });
      });
    }
  }

  // Subcommand: EVAL (Manual Run Evaluasi Harian)
  if (subcommand === "eval" || subcommand === "evaluate") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ Perintah ini khusus Administrator.", flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await runDailyEvaluation(interaction.client);
    return interaction.editReply("✅ Evaluasi harian streak selesai dijalankan!");
  }

  if (subcommand === "reset") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.editReply({ content: "❌ Kamu tidak memiliki izin (Administrator) untuk menjalankan perintah ini." });
    }

    const type = interaction.options.getString("tipe");

    if (type === "all") {
      await resetAllGuildStreaks(guildId);
      await logToGuild(client, guildId, `⚙️ **Reset All:** Admin <@${runnerId}> melakukan reset total seluruh data streak di server ini.`);
      return interaction.editReply({ content: "✅ **Reset Total Berhasil!** Seluruh data streak dan log di server ini telah dihapus." });
    }

    if (type === "user") {
      const targetUser = interaction.options.getUser("member");
      if (!targetUser) {
        return interaction.editReply({ content: "❌ **Error:** Harap pilih member yang ingin di-reset pada opsi input!" });
      }

      await resetUserGuildStreaks(guildId, targetUser.id);
      await logToGuild(client, guildId, `⚙️ **Reset User:** Admin <@${runnerId}> melakukan reset seluruh data streak milik <@${targetUser.id}>.`);
      return interaction.editReply({ content: `✅ **Reset User Berhasil!** Seluruh hubungan streak milik **${targetUser.username}** telah dihapus.` });
    }
  }

  if (subcommand === "leaderboard") {
    await interaction.deferReply();
    const type = interaction.options.getString("tipe") || "top_pair";

    const board = await getLeaderboard(guildId, type, 10);
    if (!board.length) {
      return interaction.editReply("❌ Belum ada data peringkat streak di server ini.");
    }

    const typeLabels = {
      top_pair: "Top Streak Aktif",
      top_longest: "Top Rekor Terpanjang",
      top_active: "Top Baru Aktif",
      top_recovery: "Top Sering Recovery"
    };

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Leaderboard Mystral Flame Streak`)
      .setDescription(`Kategori: **${typeLabels[type]}**`)
      .setColor(0xff7700)
      .setTimestamp();

    const lines = [];
    for (let i = 0; i < board.length; i++) {
      const p = board[i];
      const u1Name = (await client.users.fetch(p.user_one).catch(() => null))?.username || p.user_one;
      const u2Name = (await client.users.fetch(p.user_two).catch(() => null))?.username || p.user_two;
      const streakVal = type === "top_longest" ? p.highest_streak : p.current_streak;

      lines.push(`${i + 1}. **${u1Name} × ${u2Name}** — \`${streakVal} Hari\` 🔥 (Status: *${p.status.toUpperCase()}*)`);
    }

    embed.setDescription(`Kategori: **${typeLabels[type]}**\n\n${lines.join("\n")}`);
    await interaction.editReply({ embeds: [embed] });
  }

  if (subcommand === "history") {
    await interaction.deferReply();
    const activePair = await getActivePairForUser(guildId, runnerId);
    const brokenPair = await getBrokenPairForUser(guildId, runnerId);
    const pair = activePair || brokenPair;

    if (!pair) {
      return interaction.editReply("❌ Kamu tidak memiliki pasangan streak aktif untuk melihat riwayat.");
    }

    const logs = await getLogsForPair(pair.id, 8);
    if (!logs.length) {
      return interaction.editReply("❌ Belum ada riwayat tercatat untuk pasangan streak kamu.");
    }

    const embed = new EmbedBuilder()
      .setTitle(`📜 Riwayat Aktivitas Streak`)
      .setDescription(`Daftar log aktivitas terbaru untuk pasanganmu:`)
      .setColor(0x77d0d7)
      .setTimestamp();

    const logLines = logs.map(l => {
      const timeStr = `<t:${Math.round(l.timestamp / 1000)}:R>`;
      const actionLabels = {
        create_forming_pair: "Inisiasi Streak ◌",
        streak_formed: "Streak Terbentuk 🔥",
        daily_increment: "Streak Naik +1 Hari 📈",
        warning_status: "Peringatan Padam ⚠️",
        broken_status: "Streak Padam 🕯️",
        streak_recovered: "Streak Dipulihkan 🩹",
        streak_dissolved: "Streak Dibubarkan 💔"
      };
      const label = actionLabels[l.action] || l.action;
      return `${timeStr} — **${label}**\n> *Detail:* ${l.details}`;
    });

    embed.setDescription(logLines.join("\n\n"));
    await interaction.editReply({ embeds: [embed] });
  }

  if (subcommand === "recover") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const targetUser = interaction.options.getUser("user");
    const res = await recoverStreak(guildId, runnerId, targetUser?.id);

    if (res.error) {
      return interaction.editReply({ content: `⚠️ ${res.error}` });
    }

    const partnerUser = await client.users.fetch(res.partner).catch(() => null);
    const partnerName = partnerUser ? partnerUser.username : "Partner";

    const container = new ContainerBuilder().setAccentColor(0xff7700);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent("## <a:vssparkly:1523181259323473990> Yash! Streak berhasil dipulihkan!"));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`Streak kamu dengan **${partnerName}** telah kembali aktif menjadi **${res.newStreak} Hari**! 🔥`));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Sisa token pemulihan pasangan: **${res.recoveryLeft} / 5**`));

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });

    const pair = await getPair(guildId, runnerId, res.partner);
    if (pair) {
      await sendStreakCardNotification(client, guildId, pair.id, "Daily Progress");
    }
  }

  if (subcommand === "break") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const targetUser = interaction.options.getUser("user");
    const res = await breakStreak(guildId, runnerId, targetUser?.id);

    if (res.error) {
      return interaction.editReply({ content: `⚠️ ${res.error}` });
    }

    const partnerUser = await client.users.fetch(res.partner).catch(() => null);
    const partnerName = partnerUser ? partnerUser.username : "Partner";

    const container = new ContainerBuilder().setAccentColor(0xef4444);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## 💔 Hubungan Streak Dibubarkan")
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Kamu telah memutuskan hubungan streak dengan **${partnerName}** (<@${res.partner}>).\n\n` +
        `Rekor kalian telah dihapus dan kalian sekarang bebas membentuk streak dengan partner baru.`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("-# Mystral • Flame Streak System")
    );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
  }

  if (subcommand === "info") {
    const container = buildStreakInfoContainerV2(settings);

    const replyMsg = await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      fetchReply: true
    });

    const filter = (i) => i.customId === "view_milestones";
    const collector = replyMsg.createMessageComponentCollector({ filter, time: 300000 });

    collector.on("collect", async (i) => {
      const milestoneContainer = buildMilestonesContainerV2();
      await i.reply({
        components: [milestoneContainer],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      }).catch(() => { });
    });
  }

  if (subcommand === "settings") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: "❌ Kamu memerlukan izin **Manage Server** untuk mengubah pengaturan streak.", flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();
    const chatCh = interaction.options.getChannel("chat_channel");
    const cardCh = interaction.options.getChannel("card_channel");
    const logCh = interaction.options.getChannel("log_channel");
    const cd = interaction.options.getInteger("cooldown");
    const minLen = interaction.options.getInteger("minimum_length");
    const enable = interaction.options.getBoolean("enable");

    if (chatCh) await updateSettings(guildId, "chat_channel", chatCh.id);
    if (cardCh) await updateSettings(guildId, "card_channel", cardCh.id);
    if (logCh) await updateSettings(guildId, "log_channel", logCh.id);
    if (cd !== null) await updateSettings(guildId, "cooldown", cd);
    if (minLen !== null) await updateSettings(guildId, "minimum_length", minLen);
    if (enable !== null) await updateSettings(guildId, "enabled", enable ? 1 : 0);

    const updated = await getSettings(guildId);
    const embed = new EmbedBuilder()
      .setTitle("⚙️ Pengaturan Mystral Flame Streak Berhasil Diperbarui")
      .setDescription([
        `• **Sistem Enabled:** ${updated.enabled ? "✅ Aktif" : "❌ Nonaktif"}`,
        `• **Streak Chat Channel:** <#${updated.chat_channel || "Belum di-set"}>`,
        `• **Streak Card Channel:** <#${updated.card_channel || "Belum di-set"}>`,
        `• **Audit Log Channel:** <#${updated.log_channel || "Belum di-set"}>`,
        `• **Validation Cooldown:** \`${updated.cooldown} detik\``,
        `• **Min Message Length:** \`${updated.minimum_length} karakter\``,
        `• **Timezone Reset:** \`00:00 WIB (Asia/Jakarta)\``
      ].join("\n"))
      .setColor(0x77d0d7);

    await interaction.editReply({ embeds: [embed] });
  }
}

// ===================== EVENT LISTENERS =====================
function setupListeners(client) {
  client.on(Events.MessageCreate, async (message) => {
    try {
      if (!message.guild || message.author.bot) return;

      const prefix = process.env.PREFIX || "c";
      const commandPrefix = (prefix + "streak").toLowerCase();
      const contentLower = message.content.trim().toLowerCase();

      const isStreakCmd = contentLower.startsWith(commandPrefix);
      const isCsp = contentLower === prefix + "sp" || contentLower.startsWith(prefix + "sp ");
      const isCsl = contentLower === prefix + "sl" || contentLower.startsWith(prefix + "sl ");
      const isCsrec = contentLower === prefix + "srec" || contentLower.startsWith(prefix + "srec ");
      const isCsi = contentLower === prefix + "si" || contentLower.startsWith(prefix + "si ");

      if (isStreakCmd || isCsp || isCsl || isCsrec || isCsi) {
        await handlePrefixCommand(message, client);
        return;
      }

      await handleMessageActivity(client, message);
    } catch (err) {
      console.error("[STREAK EVENT MESSAGE_CREATE ERROR]", err);
    }
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    try {
      const guildId = member.guild.id;
      const userId = member.id;

      const activePair = await getActivePairForUser(guildId, userId);
      const brokenPair = await getBrokenPairForUser(guildId, userId);
      const pair = activePair || brokenPair;

      if (pair) {
        await deletePair(pair.id);
        await addLog(guildId, pair.id, userId, "streak_dissolved", `Streak dissolved because member left the guild: ${userId}`);
        await logToGuild(client, guildId, `💔 Streak antara <@${pair.user_one}> & <@${pair.user_two}> dibubarkan karena salah satu member meninggalkan server.`);
      }
    } catch (err) {
      console.error("[STREAK EVENT MEMBER_REMOVE ERROR]", err);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === "streak") {
        await handleInteraction(interaction, client);
      }
    } catch (err) {
      console.error("[STREAK EVENT INTERACTION_CREATE ERROR]", err);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: "❌ Terjadi kesalahan dalam memproses perintah ini.", flags: MessageFlags.Ephemeral }).catch(() => { });
      } else {
        await interaction.reply({ content: "❌ Terjadi kesalahan dalam memproses perintah ini.", flags: MessageFlags.Ephemeral }).catch(() => { });
      }
    }
  });
}

// ===================== EXPORTS & INITIALIZATION =====================
async function init(client, dbWrappers) {
  try {
    if (initializedClients.has(client)) {
      console.log("[STREAK] Init skipped: subsystem already initialized for this client.");
      return;
    }

    console.log("[STREAK] Initializing Mystral Flame Streak Subsystem (Single-file)...");

    setupListeners(client);
    startScheduler(client);
    initializedClients.add(client);
    console.log("[STREAK] Subsystem successfully initialized! 🔥");
  } catch (err) {
    console.error("❌ [STREAK] Initialization failed:", err);
  }
}

module.exports = {
  init,
  streakCommandBuilder,
  drawStreakCard
};
