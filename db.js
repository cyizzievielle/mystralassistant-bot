require("dotenv").config();
const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;

async function connectMongo() {
  if (!uri || uri.includes("<password>")) {
    throw new Error("MONGODB_URI belum di-set dengan password yang benar di file .env");
  }
  try {
    await mongoose.connect(uri);
    console.log(" ├── [DB] MongoDB Atlas Connected Successfully! ✅");
  } catch (err) {
    console.error(" ❌ [DB] MongoDB Connection Error:", err.message);
    throw err;
  }
}

// ===================== SCHEMAS =====================

// Index / Core Schemas
const menfessPostSchema = new mongoose.Schema({
  id: Number,
  message_id: String,
  channel_id: String,
  created_at: Number,
}, { strict: false, collection: "menfess_posts" });

const menfessAnonMapSchema = new mongoose.Schema({
  user_id: { type: String, unique: true, required: true },
  anon_label: String,
}, { strict: false, collection: "menfess_anonmap" });

const sortingUserSchema = new mongoose.Schema({
  user_id: { type: String, unique: true, required: true },
  choice: String,
  at: Number,
}, { strict: false, collection: "sorting_users" });

const idCardUserSchema = new mongoose.Schema({
  user_id: { type: String, unique: true, required: true },
  number: String,
  name: String,
  gender: String,
  domisili: String,
  hobi: String,
  status: String,
  theme: String,
  created_at: Number,
  updated_at: Number,
}, { strict: false, collection: "idcard_users" });

const afkUserSchema = new mongoose.Schema({
  guild_id: String,
  user_id: { type: String, required: true },
  reason: String,
  since: Number,
}, { strict: false, collection: "afk_users" });

// Streak Subsystem Schemas
const streakSettingSchema = new mongoose.Schema({
  guild_id: { type: String, unique: true, required: true },
  chat_channel: String,
  card_channel: String,
  reset_hour: { type: Number, default: 0 },
  cooldown: { type: Number, default: 60 },
  minimum_message: { type: Number, default: 1 },
  minimum_length: { type: Number, default: 5 },
  thread_enable: { type: Number, default: 0 },
  recovery_limit: { type: Number, default: 5 },
  log_channel: String,
  enabled: { type: Number, default: 1 },
  last_daily_reset: String,
}, { strict: false, collection: "streak_settings" });

const streakPairSchema = new mongoose.Schema({
  id: { type: Number },
  guild_id: String,
  user_one: String,
  user_two: String,
  current_streak: { type: Number, default: 0 },
  highest_streak: { type: Number, default: 0 },
  recovery_left: { type: Number, default: 5 },
  status: { type: String, default: "active" },
  created_at: Number,
  last_active_at: Number,
  last_streak_increment_at: Number,
  progress_count: { type: Number, default: 0 },
  user_one_active_today: { type: Number, default: 0 },
  user_two_active_today: { type: Number, default: 0 },
}, { strict: false, collection: "streak_pairs" });
streakPairSchema.index({ guild_id: 1, user_one: 1, user_two: 1 }, { unique: true });

const streakDailyActivitySchema = new mongoose.Schema({
  pair_id: String,
  user_id: String,
  last_message_at: Number,
  message_hash: String,
}, { strict: false, collection: "streak_daily_activity" });

const streakLogSchema = new mongoose.Schema({
  guild_id: String,
  pair_id: String,
  user_id: String,
  action: String,
  timestamp: Number,
  details: String,
}, { strict: false, collection: "streak_logs" });

const streakAchievementSchema = new mongoose.Schema({
  user_id: String,
  achievement_key: String,
  unlocked_at: Number,
}, { strict: false, collection: "streak_achievements" });

const streakFreezeInventorySchema = new mongoose.Schema({
  user_id: { type: String, unique: true, required: true },
  count: { type: Number, default: 0 },
}, { strict: false, collection: "streak_freeze_inventory" });

const metaTextSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: mongoose.Schema.Types.Mixed,
}, { strict: false, collection: "meta_text" });

const tarotUserSchema = new mongoose.Schema({
  user_id: { type: String, unique: true, required: true },
  username: String,
  total_reading: { type: Number, default: 0 },
  last_reading_date: String,
  streak: { type: Number, default: 0 },
  favorite_category: { type: String, default: "—" },
  last_card: { type: String, default: "—" },
  rarest_card: { type: String, default: "—" },
  cards_collected: { type: String, default: "" },
  streak_recovery_left: { type: Number, default: 3 },
  last_streak_before_break: { type: Number, default: 0 },
}, { strict: false, collection: "tarot_users" });

const tarotCategoryStatSchema = new mongoose.Schema({
  user_id: String,
  category: String,
  count: { type: Number, default: 1 },
}, { strict: false, collection: "tarot_category_stats" });
tarotCategoryStatSchema.index({ user_id: 1, category: 1 }, { unique: true });

const modWarningSchema = new mongoose.Schema({
  id: Number,
  guild_id: String,
  user_id: String,
  moderator_id: String,
  reason: String,
  created_at: Number,
}, { strict: false, collection: "mod_warnings" });
modWarningSchema.index({ guild_id: 1, user_id: 1 });

// Generic Flexible Schemas for All Other Tables
const createFlexSchema = (collectionName) => new mongoose.Schema({}, { strict: false, collection: collectionName });

// ===================== MODELS =====================
const MenfessPost = mongoose.models.MenfessPost || mongoose.model("MenfessPost", menfessPostSchema);
const MenfessAnonMap = mongoose.models.MenfessAnonMap || mongoose.model("MenfessAnonMap", menfessAnonMapSchema);
const SortingUser = mongoose.models.SortingUser || mongoose.model("SortingUser", sortingUserSchema);
const IdCardUser = mongoose.models.IdCardUser || mongoose.model("IdCardUser", idCardUserSchema);
const AfkUser = mongoose.models.AfkUser || mongoose.model("AfkUser", afkUserSchema);
const MetaText = mongoose.models.MetaText || mongoose.model("MetaText", metaTextSchema);
const TarotUser = mongoose.models.TarotUser || mongoose.model("TarotUser", tarotUserSchema);
const TarotCategoryStat = mongoose.models.TarotCategoryStat || mongoose.model("TarotCategoryStat", tarotCategoryStatSchema);
const ModWarning = mongoose.models.ModWarning || mongoose.model("ModWarning", modWarningSchema);

const StreakSetting = mongoose.models.StreakSetting || mongoose.model("StreakSetting", streakSettingSchema);
const StreakPair = mongoose.models.StreakPair || mongoose.model("StreakPair", streakPairSchema);
const StreakDailyActivity = mongoose.models.StreakDailyActivity || mongoose.model("StreakDailyActivity", streakDailyActivitySchema);
const StreakLog = mongoose.models.StreakLog || mongoose.model("StreakLog", streakLogSchema);
const StreakAchievement = mongoose.models.StreakAchievement || mongoose.model("StreakAchievement", streakAchievementSchema);
const StreakFreezeInventory = mongoose.models.StreakFreezeInventory || mongoose.model("StreakFreezeInventory", streakFreezeInventorySchema);

// Additional Full Features Models
const FaqItem = mongoose.models.FaqItem || mongoose.model("FaqItem", createFlexSchema("faq_items"));
const KbItem = mongoose.models.KbItem || mongoose.model("KbItem", createFlexSchema("kb_items"));
const TodQuestion = mongoose.models.TodQuestion || mongoose.model("TodQuestion", createFlexSchema("tod_questions"));
const TodFavorite = mongoose.models.TodFavorite || mongoose.model("TodFavorite", createFlexSchema("tod_favorites"));
const TodReport = mongoose.models.TodReport || mongoose.model("TodReport", createFlexSchema("tod_reports"));
const TodSubmission = mongoose.models.TodSubmission || mongoose.model("TodSubmission", createFlexSchema("tod_submissions"));
const Giveaway = mongoose.models.Giveaway || mongoose.model("Giveaway", createFlexSchema("giveaways"));
const GiveawayEntry = mongoose.models.GiveawayEntry || mongoose.model("GiveawayEntry", createFlexSchema("giveaway_entries"));
const TicketCustom = mongoose.models.TicketCustom || mongoose.model("TicketCustom", createFlexSchema("tickets_custom"));
const TicketSetting = mongoose.models.TicketSetting || mongoose.model("TicketSetting", createFlexSchema("ticket_settings"));
const TicketSetup = mongoose.models.TicketSetup || mongoose.model("TicketSetup", createFlexSchema("ticket_setup"));
const TicketMeta = mongoose.models.TicketMeta || mongoose.model("TicketMeta", createFlexSchema("ticket_meta"));
const AttendanceSetting = mongoose.models.AttendanceSetting || mongoose.model("AttendanceSetting", createFlexSchema("attendance_settings"));
const AttendanceRecord = mongoose.models.AttendanceRecord || mongoose.model("AttendanceRecord", createFlexSchema("attendance_records"));
const Reminder = mongoose.models.Reminder || mongoose.model("Reminder", createFlexSchema("reminders"));
const HouseCard = mongoose.models.HouseCard || mongoose.model("HouseCard", createFlexSchema("house_cards"));
const GuessNumberScore = mongoose.models.GuessNumberScore || mongoose.model("GuessNumberScore", createFlexSchema("guess_number_scores"));
const SupportLeaderboard = mongoose.models.SupportLeaderboard || mongoose.model("SupportLeaderboard", createFlexSchema("support_leaderboard"));
const VoiceActivityDaily = mongoose.models.VoiceActivityDaily || mongoose.model("VoiceActivityDaily", createFlexSchema("voice_activity_daily"));
const UserActivity = mongoose.models.UserActivity || mongoose.model("UserActivity", createFlexSchema("user_activity"));
const ActivityDaily = mongoose.models.ActivityDaily || mongoose.model("ActivityDaily", createFlexSchema("activity_daily"));
const AutoResponse = mongoose.models.AutoResponse || mongoose.model("AutoResponse", createFlexSchema("autoresponses"));
const TimedRole = mongoose.models.TimedRole || mongoose.model("TimedRole", createFlexSchema("timed_roles"));
const ActiveVoiceSession = mongoose.models.ActiveVoiceSession || mongoose.model("ActiveVoiceSession", createFlexSchema("active_voice_sessions"));
const StickyMessage = mongoose.models.StickyMessage || mongoose.model("StickyMessage", createFlexSchema("sticky_messages"));
const MediaSetting = mongoose.models.MediaSetting || mongoose.model("MediaSetting", createFlexSchema("media_settings"));

module.exports = {
  mongoose,
  connectMongo,

  // Models
  MenfessPost,
  MenfessAnonMap,
  SortingUser,
  IdCardUser,
  AfkUser,
  MetaText,
  TarotUser,
  TarotCategoryStat,
  ModWarning,

  StreakSetting,
  StreakPair,
  StreakDailyActivity,
  StreakLog,
  StreakAchievement,
  StreakFreezeInventory,

  FaqItem,
  KbItem,
  TodQuestion,
  TodFavorite,
  TodReport,
  TodSubmission,
  Giveaway,
  GiveawayEntry,
  TicketCustom,
  TicketSetting,
  TicketSetup,
  TicketMeta,
  AttendanceSetting,
  AttendanceRecord,
  Reminder,
  HouseCard,
  GuessNumberScore,
  SupportLeaderboard,
  VoiceActivityDaily,
  UserActivity,
  ActivityDaily,
  AutoResponse,
  TimedRole,
  ActiveVoiceSession,
  StickyMessage,
  MediaSetting,
};
