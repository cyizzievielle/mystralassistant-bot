/**
 * deploy-commands.js — Mystral Assistant (FULL + ORDER FIX)
 * discord.js v14
 *
 * Run:
 *   node deploy-commands.js
 *
 * Env required:
 *   DISCORD_TOKEN=xxxxx
 *   CLIENT_ID=xxxxx
 *   GUILD_ID=xxxxx (optional, only needed when DEPLOY_SCOPE=guild)
 */

require("dotenv").config();
const {
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");

function need(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    console.error(`❌ Missing env: ${name}`);
    process.exit(1);
  }
  return String(v).trim();
}

const token = need("DISCORD_TOKEN");
const clientId = need("CLIENT_ID");
const deployScope = String(process.env.DEPLOY_SCOPE || "global").trim().toLowerCase();
const guildId = deployScope === "guild" ? need("GUILD_ID") : String(process.env.GUILD_ID || "").trim();

// reusable option: reason (optional)
const modReasonOpt = (o) =>
  o.setName("reason").setDescription("Alasan (opsional)").setRequired(false);

const { streakCommandBuilder } = require("./streak");

const commands = [
  new SlashCommandBuilder().setName("serverstats").setDescription("Lihat statistik server"),
  new SlashCommandBuilder().setName("voicecheck").setDescription("Lihat status voice channel aktif"),
  new SlashCommandBuilder()
    .setName("c")
    .setDescription("Kirim perintah teks ke asisten")
    .addStringOption(o => o.setName("query").setDescription("Perintah (contoh: add owner to cisa)").setRequired(true)),
  streakCommandBuilder,
  // ===== BASIC =====
  new SlashCommandBuilder().setName("ping").setDescription("Cek ping bot"),
  new SlashCommandBuilder().setName("botstatus").setDescription("Health check bot: DB, ping, uptime, command count"),
  new SlashCommandBuilder().setName("help").setDescription("Lihat daftar perintah bot"),
  new SlashCommandBuilder().setName("about").setDescription("Lihat info bot CYZA Assistant"),
  new SlashCommandBuilder().setName("halo").setDescription("Sapa bot CYZA"),

  new SlashCommandBuilder().setName("topactive").setDescription("Leaderboard aktivitas 7 hari terakhir"),

  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("lihat avatar user")
    .addUserOption((o) => o.setName("user").setDescription("pilih user").setRequired(false)),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("lihat info user (lebih lengkap)")
    .addUserOption((o) => o.setName("user").setDescription("pilih user").setRequired(false)),

  new SlashCommandBuilder().setName("serverinfo").setDescription("lihat info server (lebih lengkap)"),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("lihat profile Mystral: ID Card, Arcana, AFK, roles")
    .addUserOption((o) => o.setName("user").setDescription("pilih user").setRequired(false)),

  new SlashCommandBuilder()
    .setName("check")
    .setDescription("Cek profil dari platform lain")
    .addSubcommand((sc) =>
      sc
        .setName("github")
        .setDescription("Cek profil GitHub")
        .addStringOption((o) => o.setName("username").setDescription("Username GitHub").setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName("roblox")
        .setDescription("Cek profil Roblox")
        .addStringOption((o) => o.setName("username").setDescription("Username Roblox").setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName("steam")
        .setDescription("Cek profil Steam")
        .addStringOption((o) => o.setName("user").setDescription("SteamID64 atau vanity username").setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName("chess")
        .setDescription("Cek profil Chess.com")
        .addStringOption((o) => o.setName("username").setDescription("Username Chess.com").setRequired(true))
    ),

  new SlashCommandBuilder()
    .setName("tod")
    .setDescription("Truth or Dare interaktif")
    .addSubcommand((sc) => sc.setName("panel").setDescription("Kirim panel Truth or Dare"))
    .addSubcommand((sc) => sc.setName("truth").setDescription("Ambil pertanyaan Truth"))
    .addSubcommand((sc) => sc.setName("dare").setDescription("Ambil tantangan Dare"))
    .addSubcommand((sc) => sc.setName("random").setDescription("Ambil Truth/Dare acak"))
    .addSubcommand((sc) => sc.setName("daily").setDescription("Ambil TOD tema harian"))
    .addSubcommand((sc) => sc.setName("submit").setDescription("Submit pertanyaan anonim")),

  new SlashCommandBuilder()
    .setName("tod_add")
    .setDescription("Tambah pertanyaan TOD custom (staff/admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o
        .setName("type")
        .setDescription("Jenis pertanyaan")
        .setRequired(true)
        .addChoices({ name: "truth", value: "truth" }, { name: "dare", value: "dare" })
    )
    .addStringOption((o) => o.setName("category").setDescription("Kategori").setRequired(true))
    .addStringOption((o) => o.setName("rating").setDescription("PG / Funny / Deep / Spicy").setRequired(true))
    .addStringOption((o) => o.setName("question").setDescription("Isi pertanyaan").setRequired(true))
    .addStringOption((o) => o.setName("pack").setDescription("Nama custom pack (opsional)").setRequired(false)),

  new SlashCommandBuilder()
    .setName("tebakangka")
    .setDescription("Mulai game tebak angka 1-1000"),

  new SlashCommandBuilder()
    .setName("hint")
    .setDescription("Minta hint untuk game tebak angka yang sedang berjalan"),

  new SlashCommandBuilder()
    .setName("stopgame")
    .setDescription("Hentikan game tebak angka di channel ini"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Lihat leaderboard game / aktivitas / support")
    .addSubcommand((sc) =>
      sc.setName("tebakangka").setDescription("Leaderboard tebak angka")
    )
    .addSubcommand((sc) =>
      sc.setName("support")
        .setDescription("Lihat leaderboard support (Sponsor & Donatur)")
        .addChannelOption((o) =>
          o.setName("channel")
            .setDescription("Kirim embed ke channel ini (opsional, khusus staff/admin)")
            .setRequired(false)
        )
    )
    .addSubcommand((sc) =>
      sc.setName("recap")
        .setDescription("Monthly recap leaderboard top voice dan top chat")
        .addIntegerOption((o) =>
          o.setName("month")
            .setDescription("Bulan recap (1-12, default bulan ini)")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(12)
        )
        .addIntegerOption((o) =>
          o.setName("year")
            .setDescription("Tahun recap (default tahun ini)")
            .setRequired(false)
        )
        .addChannelOption((o) =>
          o.setName("channel")
            .setDescription("Kirim embed ke channel ini (opsional, khusus staff/admin)")
            .setRequired(false)
        )
    ),

  new SlashCommandBuilder()
    .setName("support_admin")
    .setDescription("Manage leaderboard support (Owner/Staff Only)")
    .addSubcommand((sc) =>
      sc.setName("add")
        .setDescription("Tambah/update kontribusi support")
        .addStringOption((o) =>
          o.setName("type")
            .setDescription("Tipe kontribusi")
            .setRequired(true)
            .addChoices({ name: "Sponsor", value: "sponsor" }, { name: "Donatur", value: "donatur" })
        )
        .addIntegerOption((o) => o.setName("amount").setDescription("Jumlah donasi (Rupiah, misal 100000)").setRequired(true))
        .addUserOption((o) => o.setName("user").setDescription("User Discord (opsional)").setRequired(false))
        .addStringOption((o) => o.setName("username").setDescription("Username teks biasa (jika tidak ada user Discord)").setRequired(false))
    )
    .addSubcommand((sc) =>
      sc.setName("remove")
        .setDescription("Hapus kontribusi support")
        .addStringOption((o) => o.setName("target").setDescription("User ID atau Username teks biasa").setRequired(true))
        .addStringOption((o) =>
          o.setName("type")
            .setDescription("Tipe kontribusi")
            .setRequired(true)
            .addChoices({ name: "Sponsor", value: "sponsor" }, { name: "Donatur", value: "donatur" })
        )
    )
    .addSubcommand((sc) =>
      sc.setName("list")
        .setDescription("Lihat list semua data kontribusi di database")
    ),

  new SlashCommandBuilder()
    .setName("giveaway_reroll")
    .setDescription("Reroll giveaway yang sudah berakhir")
    .addIntegerOption(o =>
      o.setName("id")
        .setDescription("ID giveaway")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("winners")
        .setDescription("Jumlah pemenang (opsional)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("giveaway_end")
    .setDescription("Akhiri giveaway lebih cepat")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption((o) => o.setName("id").setDescription("ID giveaway").setRequired(true)),

  new SlashCommandBuilder()
    .setName("giveaway_list")
    .setDescription("Lihat giveaway yang masih aktif")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName("giveaway_entries")
    .setDescription("Lihat siapa saja yang ikut giveaway")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption((o) => o.setName("id").setDescription("ID giveaway").setRequired(true)),

  new SlashCommandBuilder()
    .setName("giveaway_delete")
    .setDescription("Hapus giveaway")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption((o) => o.setName("id").setDescription("ID giveaway").setRequired(true)),

  new SlashCommandBuilder()
    .setName("ticket_setup")
    .setDescription("Setup panel ticket (1 button utama, opsional tambahan)")
    .addChannelOption(o =>
      o.setName("panel_channel")
        .setDescription("Channel panel ticket")
        .setRequired(true)
    )
    .addChannelOption(o =>
      o.setName("category")
        .setDescription("Category ticket")
        .setRequired(false)
    )
    .addRoleOption(o =>
      o.setName("staff_role")
        .setDescription("Role staff ticket")
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName("title")
        .setDescription("Judul embed")
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName("description")
        .setDescription("Deskripsi embed")
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName("color")
        .setDescription("Warna embed hex (#a78bfa)")
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName("main_button")
        .setDescription("Label tombol utama")
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName("afk")
    .setDescription("set status AFK")
    .addStringOption((o) => o.setName("reason").setDescription("alasan AFK (opsional)").setRequired(false)),

  new SlashCommandBuilder().setName("registry").setDescription("lihat daftar student yang sudah terdaftar ID Card"),

  new SlashCommandBuilder()
    .setName("myhouse")
    .setDescription("lihat hasil arcane sorting (punya kamu atau orang lain)")
    .addUserOption((o) => o.setName("user").setDescription("pilih user (opsional)").setRequired(false)),

  // ===== OWNER PANELS (lock di index.js) =====
  new SlashCommandBuilder().setName("menfesspanel").setDescription("kirim panel menfess (owner only)"),
  new SlashCommandBuilder()
    .setName("menfess")
    .setDescription("Kirim menfess anonim ke channel menfess")
    .addStringOption((o) => o.setName("pesan").setDescription("Isi pesan menfess").setRequired(true))
    .addStringOption((o) => o.setName("untuk").setDescription("Untuk siapa menfess ini (opsional)").setRequired(false))
    .addAttachmentOption((o) => o.setName("lampiran").setDescription("Lampirkan Gambar atau GIF (opsional, maks 50MB)").setRequired(false))
    .addStringOption((o) => o.setName("warna").setDescription("Warna hex embed, contoh: #ff0000 (opsional)").setRequired(false)),
  new SlashCommandBuilder()
    .setName("sticky")
    .setDescription("Sticky Message management commands")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set a sticky message for this channel")
        .addStringOption((o) => o.setName("content").setDescription("Content of the sticky message").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Edit the sticky message for this channel")
        .addStringOption((o) => o.setName("content").setDescription("New content of the sticky message").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove sticky message from this channel")
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("List all active sticky messages in the server")
    ),
  new SlashCommandBuilder()
    .setName("media")
    .setDescription("Universal Media Embed / Smart Preview settings")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName("enable")
        .setDescription("Enable the Universal Media Embed feature globally")
    )
    .addSubcommand((sub) =>
      sub
        .setName("disable")
        .setDescription("Disable the Universal Media Embed feature globally")
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Show the current Universal Media Embed settings status")
    )
    .addSubcommand((sub) =>
      sub
        .setName("delete-original")
        .setDescription("Toggle auto-deletion of original link messages")
        .addBooleanOption((o) => o.setName("value").setDescription("True to delete, false to keep").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("platform")
        .setDescription("Enable or disable a specific media platform")
        .addStringOption((o) =>
          o.setName("name")
            .setDescription("Platform name")
            .setRequired(true)
            .addChoices(
              { name: "TikTok", value: "tiktok" },
              { name: "Instagram", value: "instagram" },
              { name: "Twitter / X", value: "twitter" },
              { name: "Reddit", value: "reddit" },
              { name: "Threads", value: "threads" },
              { name: "YouTube", value: "youtube" },
              { name: "Facebook", value: "facebook" },
              { name: "Twitch", value: "twitch" },
              { name: "Kick", value: "kick" },
              { name: "Bilibili", value: "bilibili" },
              { name: "Pinterest", value: "pinterest" },
              { name: "Bluesky", value: "bluesky" },
              { name: "Imgur", value: "imgur" },
              { name: "Streamable", value: "streamable" },
              { name: "Vimeo", value: "vimeo" }
            )
        )
        .addBooleanOption((o) => o.setName("enabled").setDescription("True to enable, false to disable").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("quality")
        .setDescription("Set video quality preference")
        .addStringOption((o) =>
          o.setName("preference")
            .setDescription("Quality preference")
            .setRequired(true)
            .addChoices(
              { name: "Auto", value: "auto" },
              { name: "720p", value: "720p" },
              { name: "1080p", value: "1080p" }
            )
        )
    ),
  new SlashCommandBuilder().setName("sortingpanel").setDescription("kirim panel sorting (owner only)"),
  new SlashCommandBuilder().setName("idcard").setDescription("buka panel ID Card (owner only)"),
  new SlashCommandBuilder().setName("ticketpanel").setDescription("kirim panel ticket (owner only)"),
  new SlashCommandBuilder().setName("selfrolespanel").setDescription("kirim panel self-role (owner only)"),
  new SlashCommandBuilder().setName("idcard_export").setDescription("Export semua ID Card (OWNER ONLY)"),
  new SlashCommandBuilder().setName("backup_now").setDescription("Backup database manual (owner only)"),

  // ===== AFK tools =====
  new SlashCommandBuilder().setName("afk_list").setDescription("Melihat daftar user yang sedang AFK"),
  new SlashCommandBuilder()
    .setName("afk_clear")
    .setDescription("Hapus status AFK user tertentu (staff/admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("user").setDescription("User yang mau dihapus dari AFK").setRequired(true)),
  new SlashCommandBuilder()
    .setName("afk_reset_all")
    .setDescription("Reset semua data AFK di server (admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o
        .setName("confirm")
        .setDescription("Ketik RESET untuk konfirmasi")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("lastseen")
    .setDescription("Cek last seen user")
    .addUserOption((o) => o.setName("user").setDescription("Pilih user").setRequired(true)),

  // ===== REMINDER =====
  new SlashCommandBuilder()
    .setName("remind_in")
    .setDescription("Buat reminder dalam X menit")
    .addIntegerOption((o) => o.setName("minutes").setDescription("Dalam berapa menit").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("Pesan reminder").setRequired(true)),

  new SlashCommandBuilder()
    .setName("remind_at")
    .setDescription("Buat reminder di waktu tertentu (WIB)")
    .addStringOption((o) => o.setName("time_wib").setDescription("Format: YYYY-MM-DD HH:mm (WIB)").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("Pesan reminder").setRequired(true)),

  new SlashCommandBuilder().setName("remind_list").setDescription("Lihat reminder aktif kamu"),

  // ===== FAQ =====
  new SlashCommandBuilder()
    .setName("faq_add")
    .setDescription("Tambah FAQ (Admin/Staff)")
    .addStringOption((o) => o.setName("title").setDescription("Judul").setRequired(true))
    .addStringOption((o) => o.setName("content").setDescription("Isi / Jawaban").setRequired(true))
    .addStringOption((o) => o.setName("tags").setDescription("Tags (pisah koma, opsional)").setRequired(false)),

  new SlashCommandBuilder()
    .setName("faq_edit")
    .setDescription("Edit FAQ (Admin/Staff)")
    .addIntegerOption((o) => o.setName("id").setDescription("ID FAQ").setRequired(true))
    .addStringOption((o) => o.setName("title").setDescription("Judul (opsional)").setRequired(false))
    .addStringOption((o) => o.setName("content").setDescription("Isi (opsional)").setRequired(false))
    .addStringOption((o) => o.setName("tags").setDescription("Tags (opsional)").setRequired(false)),

  new SlashCommandBuilder()
    .setName("faq_delete")
    .setDescription("Hapus FAQ (Admin/Staff)")
    .addIntegerOption((o) => o.setName("id").setDescription("ID FAQ").setRequired(true)),

  new SlashCommandBuilder()
    .setName("faq_view")
    .setDescription("Baca FAQ")
    .addIntegerOption((o) => o.setName("id").setDescription("ID FAQ").setRequired(true)),

  new SlashCommandBuilder()
    .setName("faq_search")
    .setDescription("Cari FAQ")
    .addStringOption((o) => o.setName("query").setDescription("Kata kunci").setRequired(true)),

  new SlashCommandBuilder()
    .setName("faq_list")
    .setDescription("Lihat daftar FAQ terbaru (Admin/Staff)"),

  new SlashCommandBuilder()
    .setName("faq_panel")
    .setDescription("Kirim panel dropdown FAQ (Admin/Staff)")
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("Channel tujuan (opsional)")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    ),

  new SlashCommandBuilder()
    .setName("servers")
    .setDescription("Cek daftar server yang menggunakan bot & total user (Developer Only)"),

  // ===== DAILY TAROT =====
  new SlashCommandBuilder()
    .setName("tarot")
    .setDescription("Daily Arcane Tarot: ramal nasib harianmu")
    .addSubcommand((sc) => sc.setName("pull").setDescription("Ambil pembacaan tarot harian kamu"))
    .addSubcommand((sc) =>
      sc
        .setName("profile")
        .setDescription("Lihat profil tarot kamu atau member lain")
        .addUserOption((o) => o.setName("user").setDescription("Pilih user (opsional)").setRequired(false))
    )
    .addSubcommand((sc) => sc.setName("leaderboard").setDescription("Leaderboard pembacaan tarot teraktif"))
    .addSubcommand((sc) =>
      sc
        .setName("collection")
        .setDescription("Lihat kartu tarot yang telah dikumpulkan")
        .addUserOption((o) => o.setName("user").setDescription("Pilih user (opsional)").setRequired(false))
    )
    .addSubcommand((sc) => sc.setName("recover").setDescription("Pulihkan streak harian tarot kamu yang terputus")),

  // ===== MODERATION =====
  // FIX: required options dulu, baru reason optional
  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn user (tersimpan di DB)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("user").setDescription("Target user").setRequired(true))
    .addStringOption(modReasonOpt),

  new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Lihat list warning user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("user").setDescription("Target user").setRequired(true))
    .addIntegerOption((o) =>
      o.setName("limit").setDescription("Jumlah ditampilkan (default 10)").setRequired(false).setMinValue(1).setMaxValue(25)
    ),

  new SlashCommandBuilder()
    .setName("clearwarn")
    .setDescription("Hapus semua warning user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("user").setDescription("Target user").setRequired(true)),

  new SlashCommandBuilder()
    .setName("unwarn")
    .setDescription("Hapus 1 warning berdasarkan ID warning")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addIntegerOption((o) => o.setName("id").setDescription("ID warning").setRequired(true)),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("user").setDescription("Target user").setRequired(true))
    .addIntegerOption((o) => o.setName("minutes").setDescription("Durasi menit").setRequired(true).setMinValue(1).setMaxValue(10080))
    .addStringOption(modReasonOpt),

  new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Cabut timeout member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("user").setDescription("Target user").setRequired(true))
    .addStringOption(modReasonOpt),

  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mute member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("user").setDescription("Target user").setRequired(true))
    .addIntegerOption((o) => o.setName("minutes").setDescription("Durasi menit").setRequired(true).setMinValue(1).setMaxValue(10080))
    .addStringOption(modReasonOpt),

  new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Unmute member (cabut role mute / cabut timeout)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("user").setDescription("Target user").setRequired(true))
    .addStringOption(modReasonOpt),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick member")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) => o.setName("user").setDescription("Target user").setRequired(true))
    .addStringOption(modReasonOpt),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban member")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName("user").setDescription("Target user").setRequired(true))
    .addIntegerOption((o) =>
      o.setName("delete_days").setDescription("Hapus pesan terakhir berapa hari (0-7)").setRequired(false).setMinValue(0).setMaxValue(7)
    )
    .addStringOption(modReasonOpt),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban user (pakai User ID)")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((o) => o.setName("user_id").setDescription("User ID").setRequired(true))
    .addStringOption(modReasonOpt),

  // ===== CALC =====
  new SlashCommandBuilder()
    .setName("calc")
    .setDescription("Kalkulator aman (contoh: (10+2)*3/4)")
    .addStringOption((o) => o.setName("expr").setDescription("Ekspresi matematika").setRequired(true)),

  // ===== GIVEAWAY =====
  // FIX: required dulu (duration, prize), optional belakangan (winners, channel)
  new SlashCommandBuilder()
    .setName("giveaway_start")
    .setDescription("Mulai giveaway baru")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName("duration").setDescription("Durasi: 10m/2h/1d").setRequired(true))
    .addStringOption((o) => o.setName("prize").setDescription("Hadiah").setRequired(true))
    .addIntegerOption((o) => o.setName("winners").setDescription("Jumlah pemenang (default dari ENV/1)").setRequired(false).setMinValue(1).setMaxValue(20))
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("Channel tempat giveaway (optional)")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),

  // ===== SEND EMBED (OWNER ONLY — lock di index.js) =====
  // FIX: required dulu (title, description), optional belakangan
  new SlashCommandBuilder()
    .setName("sendembed")
    .setDescription("kirim embed custom ke channel (owner-only)")
    .addStringOption((o) => o.setName("title").setDescription("judul embed").setRequired(true))
    .addStringOption((o) => o.setName("description").setDescription("isi embed").setRequired(true))
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("channel tujuan (opsional)")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .addStringOption((o) => o.setName("color").setDescription("warna hex, contoh: #77d0d7 (opsional)").setRequired(false))
    .addStringOption((o) => o.setName("footer").setDescription("footer text (opsional)").setRequired(false))
    .addStringOption((o) => o.setName("image").setDescription("image URL (opsional)").setRequired(false))
    .addStringOption((o) => o.setName("thumbnail").setDescription("thumbnail URL (opsional)").setRequired(false))
    .addUserOption((o) => o.setName("mention_user").setDescription("Mention user di atas embed (opsional)").setRequired(false))
    .addRoleOption((o) => o.setName("mention_role").setDescription("Mention role di atas embed (opsional)").setRequired(false)),

  new SlashCommandBuilder()
    .setName("sendembedv2")
    .setDescription("kirim panel custom Components v2 ke channel (owner-only)")
    .addStringOption((o) => o.setName("title").setDescription("judul panel").setRequired(true))
    .addStringOption((o) => o.setName("description").setDescription("isi panel").setRequired(true))
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("channel tujuan (opsional)")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .addStringOption((o) => o.setName("color").setDescription("accent color hex, contoh: #77d0d7 (opsional)").setRequired(false))
    .addStringOption((o) => o.setName("footer").setDescription("footer text (opsional)").setRequired(false))
    .addUserOption((o) => o.setName("mention_user").setDescription("Mention user di atas panel (opsional)").setRequired(false))
    .addRoleOption((o) => o.setName("mention_role").setDescription("Mention role di atas panel (opsional)").setRequired(false)),
].map((c) => c.toJSON());

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    if (process.env.CLEAR_GUILD_COMMANDS === "1" && guildId) {
      console.log(`🧹 Clearing guild commands from guild ${guildId}...`);
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
      console.log("✅ Guild commands cleared.");
    }

    const route = deployScope === "guild"
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId);
    const targetLabel = deployScope === "guild"
      ? `guild ${guildId}`
      : "global application";

    console.log(`🚀 Deploying ${commands.length} commands to ${targetLabel}...`);
    await rest.put(route, { body: commands });
    console.log("✅ Done! Commands updated.");
  } catch (e) {
    console.error("❌ Deploy failed:", e);
    process.exit(1);
  }
})();

console.log("CLIENT_ID:", process.env.CLIENT_ID);
console.log("DEPLOY_SCOPE:", deployScope);
console.log("GUILD_ID:", process.env.GUILD_ID);
console.log("DEPLOY LIST:", commands.map((c) => c.name));
