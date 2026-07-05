/**
 * tarot_cards.js
 * 
 * Mystral Academy Daily Tarot Deck (300 Cards)
 * Standard Tarot Names & Mystical Wording
 */

const crypto = require("crypto");

const TAROT_CARDS = [
  { id: 1, name: "The Eternal Oracle", rarity: "Legendary", element: "Light" },
  { id: 2, name: "The Eclipse Dragon", rarity: "Legendary", element: "Shadow" },
  { id: 3, name: "The Celestial Arch", rarity: "Legendary", element: "Aether" },
  { id: 4, name: "The Burning Crown", rarity: "Legendary", element: "Fire" },
  { id: 5, name: "The Infinite Spiral", rarity: "Legendary", element: "Void" },
  { id: 51, name: "The Fool", rarity: "Legendary", element: "Void" },
  { id: 52, name: "The Magician", rarity: "Legendary", element: "Aether" },
  { id: 53, name: "The Empress", rarity: "Legendary", element: "Earth" },
  { id: 54, name: "The Emperor", rarity: "Legendary", element: "Fire" },
  { id: 6, name: "The Shadow Weaver", rarity: "Epic", element: "Shadow" },
  { id: 7, name: "The Crimson Alchemist", rarity: "Epic", element: "Fire" },
  { id: 8, name: "The Astral Mirror", rarity: "Epic", element: "Aether" },
  { id: 9, name: "The Crystalline Heart", rarity: "Epic", element: "Light" },
  { id: 10, name: "The Obsidian Dagger", rarity: "Epic", element: "Shadow" },
  { id: 11, name: "The Loom of Fate", rarity: "Epic", element: "Aether" },
  { id: 12, name: "The Lost Grimoire", rarity: "Epic", element: "Void" },
  { id: 13, name: "The Silent Reaper", rarity: "Epic", element: "Shadow" },
  { id: 14, name: "The Oracle's Eye", rarity: "Epic", element: "Light" },
  { id: 15, name: "The Cosmic Forge", rarity: "Epic", element: "Fire" },
  { id: 55, name: "The Lovers", rarity: "Epic", element: "Light" },
  { id: 56, name: "The Chariot", rarity: "Epic", element: "Metal" },
  { id: 57, name: "Strength", rarity: "Epic", element: "Earth" },
  { id: 58, name: "The Hermit", rarity: "Epic", element: "Time" },
  { id: 59, name: "The Wheel of Fortune", rarity: "Epic", element: "Time" },
  { id: 60, name: "Justice", rarity: "Epic", element: "Metal" },
  { id: 61, name: "The Hanged Man", rarity: "Epic", element: "Water" },
  { id: 62, name: "Death", rarity: "Epic", element: "Shadow" },
  { id: 63, name: "Temperance", rarity: "Epic", element: "Water" },
  { id: 64, name: "The Devil", rarity: "Epic", element: "Shadow" },
  { id: 65, name: "The Tower", rarity: "Epic", element: "Fire" },
  { id: 79, name: "The Astral Gate", rarity: "Epic", element: "Aether" },
  { id: 80, name: "The Serpent of Wisdom", rarity: "Epic", element: "Earth" },
  { id: 81, name: "The Phoenix Quill", rarity: "Epic", element: "Fire" },
  { id: 82, name: "The Abyss Mirror", rarity: "Epic", element: "Shadow" },
  { id: 101, name: "The Nebula Scepter", rarity: "Epic", element: "Aether" },
  { id: 102, name: "The Obsidian Ring", rarity: "Epic", element: "Shadow" },
  { id: 103, name: "The Phoenix Aegis", rarity: "Epic", element: "Fire" },
  { id: 104, name: "The Void Engine", rarity: "Epic", element: "Void" },
  { id: 105, name: "The Gilded Crown", rarity: "Epic", element: "Light" },
  { id: 106, name: "The Lunar Shield", rarity: "Epic", element: "Water" },
  { id: 107, name: "The Earth Core", rarity: "Epic", element: "Earth" },
  { id: 108, name: "The Chronos Pendulum", rarity: "Epic", element: "Time" },
  { id: 109, name: "The Tempest Ring", rarity: "Epic", element: "Air" },
  { id: 110, name: "The Steel Sentinel", rarity: "Epic", element: "Metal" },
  { id: 111, name: "The Ethereal Flame", rarity: "Epic", element: "Light" },
  { id: 112, name: "The Nether Veil", rarity: "Epic", element: "Shadow" },
  { id: 113, name: "The Mirage Mirror", rarity: "Epic", element: "Air" },
  { id: 114, name: "The Sunken Anchor", rarity: "Epic", element: "Water" },
  { id: 115, name: "The Emerald Seed", rarity: "Epic", element: "Earth" },
  { id: 116, name: "The Astral Orb", rarity: "Epic", element: "Aether" },
  { id: 117, name: "The Silent Watcher", rarity: "Epic", element: "Void" },
  { id: 118, name: "The Iron Maiden", rarity: "Epic", element: "Metal" },
  { id: 119, name: "The Lightning Spear", rarity: "Epic", element: "Air" },
  { id: 120, name: "The Frozen Crest", rarity: "Epic", element: "Water" },
  { id: 121, name: "The Solar Flame", rarity: "Epic", element: "Fire" },
  { id: 122, name: "The Shadow Lotus", rarity: "Epic", element: "Shadow" },
  { id: 123, name: "The Sacred Pillar", rarity: "Epic", element: "Earth" },
  { id: 124, name: "The Time Spinner", rarity: "Epic", element: "Time" },
  { id: 125, name: "The Celestial Spark", rarity: "Epic", element: "Aether" },
  { id: 16, name: "The Moonlit Gate", rarity: "Rare", element: "Water" },
  { id: 17, name: "The High Priestess", rarity: "Rare", element: "Aether" },
  { id: 18, name: "The Chronos Hourglass", rarity: "Rare", element: "Time" },
  { id: 19, name: "The Void Wanderer", rarity: "Rare", element: "Void" },
  { id: 20, name: "The Silent Sphinx", rarity: "Rare", element: "Earth" },
  { id: 21, name: "The Tempest Staff", rarity: "Rare", element: "Air" },
  { id: 22, name: "The Frost Monarch", rarity: "Rare", element: "Water" },
  { id: 23, name: "The Emerald Chalice", rarity: "Rare", element: "Water" },
  { id: 24, name: "The Clockwork Heart", rarity: "Rare", element: "Time" },
  { id: 25, name: "The Sacred Oasis", rarity: "Rare", element: "Earth" },
  { id: 26, name: "The Sunken Castle", rarity: "Rare", element: "Water" },
  { id: 27, name: "The Mirage Oasis", rarity: "Rare", element: "Air" },
  { id: 66, name: "The Star", rarity: "Rare", element: "Light" },
  { id: 67, name: "The Moon", rarity: "Rare", element: "Water" },
  { id: 68, name: "The Sun", rarity: "Rare", element: "Light" },
  { id: 69, name: "Judgement", rarity: "Rare", element: "Aether" },
  { id: 70, name: "The World", rarity: "Rare", element: "Aether" },
  { id: 83, name: "The Echoing Conch", rarity: "Rare", element: "Water" },
  { id: 84, name: "The Sunken Obelisk", rarity: "Rare", element: "Earth" },
  { id: 85, name: "The Nebula Anchor", rarity: "Rare", element: "Aether" },
  { id: 86, name: "The Aurora Cloak", rarity: "Rare", element: "Light" },
  { id: 87, name: "The Frozen Hourglass", rarity: "Rare", element: "Water" },
  { id: 88, name: "The Tempest Drum", rarity: "Rare", element: "Air" },
  { id: 126, name: "The Whispering Breeze", rarity: "Rare", element: "Air" },
  { id: 127, name: "The Moonlit Lily", rarity: "Rare", element: "Water" },
  { id: 128, name: "The Amber Shard", rarity: "Rare", element: "Earth" },
  { id: 129, name: "The Silver Dagger", rarity: "Rare", element: "Metal" },
  { id: 130, name: "The Prism Crystal", rarity: "Rare", element: "Light" },
  { id: 131, name: "The Shadow Lantern", rarity: "Rare", element: "Shadow" },
  { id: 132, name: "The Coral Goblet", rarity: "Rare", element: "Water" },
  { id: 133, name: "The Bronze Hourglass", rarity: "Rare", element: "Time" },
  { id: 134, name: "The Spark Quill", rarity: "Rare", element: "Fire" },
  { id: 135, name: "The Sky Sail", rarity: "Rare", element: "Air" },
  { id: 136, name: "The Granite Shield", rarity: "Rare", element: "Earth" },
  { id: 137, name: "The Void Mask", rarity: "Rare", element: "Void" },
  { id: 138, name: "The Brass Key", rarity: "Rare", element: "Metal" },
  { id: 139, name: "The Echoing Shell", rarity: "Rare", element: "Water" },
  { id: 140, name: "The Star Compass", rarity: "Rare", element: "Aether" },
  { id: 141, name: "The Gilded Feather", rarity: "Rare", element: "Light" },
  { id: 142, name: "The Eclipse Pendant", rarity: "Rare", element: "Shadow" },
  { id: 143, name: "The Lava Stone", rarity: "Rare", element: "Fire" },
  { id: 144, name: "The Wind Whistle", rarity: "Rare", element: "Air" },
  { id: 145, name: "The Crystal Rune", rarity: "Rare", element: "Aether" },
  { id: 146, name: "The Fossil Bone", rarity: "Rare", element: "Earth" },
  { id: 147, name: "The Iron Chain", rarity: "Rare", element: "Metal" },
  { id: 148, name: "The Misty Veil", rarity: "Rare", element: "Water" },
  { id: 149, name: "The Obsidian Mirror", rarity: "Rare", element: "Shadow" },
  { id: 150, name: "The Solar Crest", rarity: "Rare", element: "Light" },
  { id: 28, name: "The Starry Voyager", rarity: "Uncommon", element: "Air" },
  { id: 29, name: "The Gilded Compass", rarity: "Uncommon", element: "Metal" },
  { id: 30, name: "The Dream Catcher", rarity: "Uncommon", element: "Air" },
  { id: 31, name: "The Golden Scales", rarity: "Uncommon", element: "Metal" },
  { id: 32, name: "The Nebula Fountain", rarity: "Uncommon", element: "Aether" },
  { id: 33, name: "The Phantom Mask", rarity: "Uncommon", element: "Shadow" },
  { id: 34, name: "The Prism Glass", rarity: "Uncommon", element: "Light" },
  { id: 35, name: "The Whispering Wind", rarity: "Uncommon", element: "Air" },
  { id: 36, name: "The Lunar Crescent", rarity: "Uncommon", element: "Water" },
  { id: 37, name: "The Solar Flare", rarity: "Uncommon", element: "Fire" },
  { id: 38, name: "The Comet Rider", rarity: "Uncommon", element: "Air" },
  { id: 71, name: "Ace of Cups", rarity: "Uncommon", element: "Water" },
  { id: 72, name: "Ace of Swords", rarity: "Uncommon", element: "Air" },
  { id: 73, name: "Ace of Wands", rarity: "Uncommon", element: "Fire" },
  { id: 74, name: "Ace of Pentacles", rarity: "Uncommon", element: "Earth" },
  { id: 89, name: "The Shadow Lantern", rarity: "Uncommon", element: "Shadow" },
  { id: 90, name: "The Crystal Shard", rarity: "Uncommon", element: "Light" },
  { id: 91, name: "The Silver Feather", rarity: "Uncommon", element: "Air" },
  { id: 92, name: "The Wind Chaser", rarity: "Uncommon", element: "Air" },
  { id: 93, name: "The Lava Core", rarity: "Uncommon", element: "Fire" },
  { id: 94, name: "The Brass Gear", rarity: "Uncommon", element: "Metal" },
  { id: 151, name: "The Copper Coin", rarity: "Uncommon", element: "Earth" },
  { id: 152, name: "The Oak Staff", rarity: "Uncommon", element: "Earth" },
  { id: 153, name: "The Linen Scroll", rarity: "Uncommon", element: "Earth" },
  { id: 154, name: "The Clay Pot", rarity: "Uncommon", element: "Earth" },
  { id: 155, name: "The Tin Ring", rarity: "Uncommon", element: "Metal" },
  { id: 156, name: "The Leather Boot", rarity: "Uncommon", element: "Earth" },
  { id: 157, name: "The Bone Needle", rarity: "Uncommon", element: "Earth" },
  { id: 158, name: "The Shell Necklace", rarity: "Uncommon", element: "Water" },
  { id: 159, name: "The Flint Stone", rarity: "Uncommon", element: "Fire" },
  { id: 160, name: "The Rope Knot", rarity: "Uncommon", element: "Earth" },
  { id: 161, name: "The Glass Jar", rarity: "Uncommon", element: "Light" },
  { id: 162, name: "The Feathery Fan", rarity: "Uncommon", element: "Air" },
  { id: 163, name: "The Wooden Box", rarity: "Uncommon", element: "Earth" },
  { id: 164, name: "The Iron Nail", rarity: "Uncommon", element: "Metal" },
  { id: 165, name: "The Woolen Scarf", rarity: "Uncommon", element: "Air" },
  { id: 166, name: "The Clay Brick", rarity: "Uncommon", element: "Earth" },
  { id: 167, name: "The Lead Bullet", rarity: "Uncommon", element: "Metal" },
  { id: 168, name: "The Wax Candle", rarity: "Uncommon", element: "Fire" },
  { id: 169, name: "The Paper Fan", rarity: "Uncommon", element: "Air" },
  { id: 170, name: "The Straw Hat", rarity: "Uncommon", element: "Air" },
  { id: 171, name: "The Horn Flute", rarity: "Uncommon", element: "Air" },
  { id: 172, name: "The Sand Hourglass", rarity: "Uncommon", element: "Time" },
  { id: 173, name: "The Salt Crystal", rarity: "Uncommon", element: "Earth" },
  { id: 174, name: "The Coal Shard", rarity: "Uncommon", element: "Fire" },
  { id: 175, name: "The Ink Well", rarity: "Uncommon", element: "Water" },
  { id: 39, name: "The Rune Adept", rarity: "Common", element: "Earth" },
  { id: 40, name: "The Whispering Willow", rarity: "Common", element: "Earth" },
  { id: 41, name: "The Silver Key", rarity: "Common", element: "Metal" },
  { id: 42, name: "The Iron Sentinel", rarity: "Common", element: "Metal" },
  { id: 43, name: "The Whispering Scroll", rarity: "Common", element: "Earth" },
  { id: 44, name: "The Hermit of Mists", rarity: "Common", element: "Air" },
  { id: 45, name: "The Amber Amulet", rarity: "Common", element: "Earth" },
  { id: 46, name: "The Arcane Scholar", rarity: "Common", element: "Aether" },
  { id: 47, name: "The Luminous Blossom", rarity: "Common", element: "Light" },
  { id: 48, name: "The Chained Gargoyle", rarity: "Common", element: "Earth" },
  { id: 49, name: "The Wandering Bard", rarity: "Common", element: "Air" },
  { id: 50, name: "The Shadow Panther", rarity: "Common", element: "Shadow" },
  { id: 75, name: "Three of Swords", rarity: "Common", element: "Air" },
  { id: 76, name: "Five of Wands", rarity: "Common", element: "Fire" },
  { id: 77, name: "Eight of Swords", rarity: "Common", element: "Air" },
  { id: 78, name: "Six of Swords", rarity: "Common", element: "Water" },
  { id: 95, name: "The Bronze Coin", rarity: "Common", element: "Earth" },
  { id: 96, name: "The Wooden Staff", rarity: "Common", element: "Earth" },
  { id: 97, name: "The Clay Jar", rarity: "Common", element: "Earth" },
  { id: 98, name: "The Rusty Key", rarity: "Common", element: "Metal" },
  { id: 99, name: "The Iron Shield", rarity: "Common", element: "Metal" },
  { id: 100, name: "The Stone Tablet", rarity: "Common", element: "Earth" },
  { id: 176, name: "The Dry Leaf", rarity: "Common", element: "Earth" },
  { id: 177, name: "The Small Pebble", rarity: "Common", element: "Earth" },
  { id: 180, name: "The River Stone", rarity: "Common", element: "Water" },
  { id: 181, name: "The Ash Powder", rarity: "Common", element: "Fire" },
  { id: 182, name: "The Drift Wood", rarity: "Common", element: "Water" },
  { id: 183, name: "The Wild Flower", rarity: "Common", element: "Earth" },
  { id: 184, name: "The Copper Wire", rarity: "Common", element: "Metal" },
  { id: 185, name: "The Old Rag", rarity: "Common", element: "Earth" },
  { id: 186, name: "The Thread Spool", rarity: "Common", element: "Metal" },
  { id: 187, name: "The Broken Glass", rarity: "Common", element: "Light" },
  { id: 188, name: "The Feather Plume", rarity: "Common", element: "Air" },
  { id: 189, name: "The Acorn Nut", rarity: "Common", element: "Earth" },
  { id: 190, name: "The Sea Shell", rarity: "Common", element: "Water" },
  { id: 191, name: "The Clay Bead", rarity: "Common", element: "Earth" },
  { id: 192, name: "The Charcoal Bit", rarity: "Common", element: "Fire" },
  { id: 193, name: "The Hemp String", rarity: "Common", element: "Earth" },
  { id: 194, name: "The Rusty Screw", rarity: "Common", element: "Metal" },
  { id: 195, name: "The Dried Root", rarity: "Common", element: "Earth" },
  { id: 196, name: "The Snail Shell", rarity: "Common", element: "Water" },
  { id: 197, name: "The Bird Nest", rarity: "Common", element: "Air" },
  { id: 198, name: "The Mud Clod", rarity: "Common", element: "Earth" },
  { id: 199, name: "The Flaked Flint", rarity: "Common", element: "Fire" },
  { id: 200, name: "The Moss Patch", rarity: "Common", element: "Earth" },
  { id: 178, name: "The Bent Nail", rarity: "Common", element: "Metal" },
  { id: 179, name: "The Pine Cone", rarity: "Common", element: "Earth" },
  { id: 201, name: "The Cosmic Nexus", rarity: "Epic", element: "Aether" },
  { id: 202, name: "The Obsidian Citadel", rarity: "Epic", element: "Shadow" },
  { id: 203, name: "The Astral Serpent", rarity: "Epic", element: "Aether" },
  { id: 204, name: "The Firestorm Crest", rarity: "Epic", element: "Fire" },
  { id: 205, name: "The Void Whisperer", rarity: "Epic", element: "Void" },
  { id: 206, name: "The Temporal Gateway", rarity: "Epic", element: "Time" },
  { id: 207, name: "The Solar Vanguard", rarity: "Epic", element: "Light" },
  { id: 208, name: "The Abyssal Harvester", rarity: "Epic", element: "Shadow" },
  { id: 209, name: "The Crystalline Spire", rarity: "Epic", element: "Light" },
  { id: 210, name: "The Chrono Sentry", rarity: "Epic", element: "Time" },
  { id: 211, name: "The Gilded Oracle", rarity: "Epic", element: "Light" },
  { id: 212, name: "The Nether Forge", rarity: "Epic", element: "Shadow" },
  { id: 213, name: "The Phoenix Pyre", rarity: "Epic", element: "Fire" },
  { id: 214, name: "The Aeon Weaver", rarity: "Epic", element: "Time" },
  { id: 215, name: "The Celestial Compass", rarity: "Epic", element: "Aether" },
  { id: 216, name: "The Ocean Core", rarity: "Epic", element: "Water" },
  { id: 217, name: "The Earth Sentinel", rarity: "Epic", element: "Earth" },
  { id: 218, name: "The Iron Sovereign", rarity: "Epic", element: "Metal" },
  { id: 219, name: "The Sky Monarch", rarity: "Epic", element: "Air" },
  { id: 220, name: "The Starry Dynamo", rarity: "Epic", element: "Aether" },
  { id: 221, name: "The Mirage Weaver", rarity: "Epic", element: "Air" },
  { id: 222, name: "The Shadow Sentinel", rarity: "Epic", element: "Shadow" },
  { id: 223, name: "The Frost Sentinel", rarity: "Epic", element: "Water" },
  { id: 224, name: "The Flame Sovereign", rarity: "Epic", element: "Fire" },
  { id: 225, name: "The Eternal Watcher", rarity: "Epic", element: "Void" },
  { id: 226, name: "The Moonlit Sentinel", rarity: "Rare", element: "Water" },
  { id: 227, name: "The Astral Wanderer", rarity: "Rare", element: "Aether" },
  { id: 228, name: "The Chronos Gate", rarity: "Rare", element: "Time" },
  { id: 229, name: "The Void Sigil", rarity: "Rare", element: "Void" },
  { id: 230, name: "The Amber Citadel", rarity: "Rare", element: "Earth" },
  { id: 231, name: "The Tempest Crest", rarity: "Rare", element: "Air" },
  { id: 232, name: "The Frozen Grail", rarity: "Rare", element: "Water" },
  { id: 233, name: "The Obsidian Mirror", rarity: "Rare", element: "Shadow" },
  { id: 234, name: "The Gilded Scale", rarity: "Rare", element: "Metal" },
  { id: 235, name: "The Solar Chariot", rarity: "Rare", element: "Light" },
  { id: 236, name: "The Lunar Oasis", rarity: "Rare", element: "Water" },
  { id: 237, name: "The Echoing Void", rarity: "Rare", element: "Void" },
  { id: 238, name: "The Silent Obelisk", rarity: "Rare", element: "Earth" },
  { id: 239, name: "The Silver Spear", rarity: "Rare", element: "Metal" },
  { id: 240, name: "The Phoenix Feather", rarity: "Rare", element: "Fire" },
  { id: 241, name: "The Mirage Spire", rarity: "Rare", element: "Air" },
  { id: 242, name: "The Astral Catalyst", rarity: "Rare", element: "Aether" },
  { id: 243, name: "The Abyssal Anchor", rarity: "Rare", element: "Shadow" },
  { id: 244, name: "The Sunken Scepter", rarity: "Rare", element: "Water" },
  { id: 245, name: "The Granite Pillar", rarity: "Rare", element: "Earth" },
  { id: 246, name: "The Chrono Hourglass", rarity: "Rare", element: "Time" },
  { id: 247, name: "The Lightning Rune", rarity: "Rare", element: "Air" },
  { id: 248, name: "The Crystalline Shield", rarity: "Rare", element: "Light" },
  { id: 249, name: "The Brass Astrolabe", rarity: "Rare", element: "Metal" },
  { id: 250, name: "The Twilight Lantern", rarity: "Rare", element: "Shadow" },
  { id: 251, name: "The Copper Astrolabe", rarity: "Uncommon", element: "Metal" },
  { id: 252, name: "The Birch Wand", rarity: "Uncommon", element: "Earth" },
  { id: 253, name: "The Silk Scroll", rarity: "Uncommon", element: "Air" },
  { id: 254, name: "The Glazed Urn", rarity: "Uncommon", element: "Water" },
  { id: 255, name: "The Bronze Ring", rarity: "Uncommon", element: "Metal" },
  { id: 256, name: "The Leather Satchel", rarity: "Uncommon", element: "Earth" },
  { id: 257, name: "The Horn Needle", rarity: "Uncommon", element: "Earth" },
  { id: 258, name: "The Pearl Conch", rarity: "Uncommon", element: "Water" },
  { id: 259, name: "The Pyrite Shard", rarity: "Uncommon", element: "Fire" },
  { id: 260, name: "The Hemp Cord", rarity: "Uncommon", element: "Earth" },
  { id: 261, name: "The Prism Flask", rarity: "Uncommon", element: "Light" },
  { id: 262, name: "The Feathered Quill", rarity: "Uncommon", element: "Air" },
  { id: 263, name: "The Oak Chest", rarity: "Uncommon", element: "Earth" },
  { id: 264, name: "The Steel Spike", rarity: "Uncommon", element: "Metal" },
  { id: 265, name: "The Velvet Hood", rarity: "Uncommon", element: "Air" },
  { id: 266, name: "The Brick Kiln", rarity: "Uncommon", element: "Fire" },
  { id: 267, name: "The Lead Sink", rarity: "Uncommon", element: "Metal" },
  { id: 268, name: "The Tallow Candle", rarity: "Uncommon", element: "Fire" },
  { id: 269, name: "The Bamboo Fan", rarity: "Uncommon", element: "Air" },
  { id: 270, name: "The Wool Cloak", rarity: "Uncommon", element: "Air" },
  { id: 271, name: "The Bone Flute", rarity: "Uncommon", element: "Air" },
  { id: 272, name: "The Glass Hourglass", rarity: "Uncommon", element: "Time" },
  { id: 273, name: "The Alum Stone", rarity: "Uncommon", element: "Earth" },
  { id: 274, name: "The Peat Brick", rarity: "Uncommon", element: "Fire" },
  { id: 275, name: "The Ash Goblet", rarity: "Uncommon", element: "Water" },
  { id: 276, name: "The Withered Vine", rarity: "Common", element: "Earth" },
  { id: 277, name: "The Flat Slate", rarity: "Common", element: "Earth" },
  { id: 278, name: "The Sea Pebble", rarity: "Common", element: "Water" },
  { id: 279, name: "The Charcoal Dust", rarity: "Common", element: "Fire" },
  { id: 280, name: "The Pine Branch", rarity: "Common", element: "Earth" },
  { id: 281, name: "The Wild Root", rarity: "Common", element: "Earth" },
  { id: 282, name: "The Copper Link", rarity: "Common", element: "Metal" },
  { id: 283, name: "The Patchwork Cloth", rarity: "Common", element: "Earth" },
  { id: 284, name: "The Linen Thread", rarity: "Common", element: "Metal" },
  { id: 285, name: "The Cracked Vial", rarity: "Common", element: "Light" },
  { id: 286, name: "The Eagle Plume", rarity: "Common", element: "Air" },
  { id: 287, name: "The Hazel Nut", rarity: "Common", element: "Earth" },
  { id: 288, name: "The Spiral Shell", rarity: "Common", element: "Water" },
  { id: 289, name: "The Clay Token", rarity: "Common", element: "Earth" },
  { id: 290, name: "The Coal Lump", rarity: "Common", element: "Fire" },
  { id: 291, name: "The Jute String", rarity: "Common", element: "Earth" },
  { id: 292, name: "The Bent Pin", rarity: "Common", element: "Metal" },
  { id: 293, name: "The Oak Leaf", rarity: "Common", element: "Earth" },
  { id: 294, name: "The Sand Grain", rarity: "Common", element: "Earth" },
  { id: 295, name: "The Birch Bark", rarity: "Common", element: "Earth" },
  { id: 296, name: "The River Silt", rarity: "Common", element: "Water" },
  { id: 297, name: "The Iron Scrap", rarity: "Common", element: "Metal" },
  { id: 298, name: "The Wild Berry", rarity: "Common", element: "Earth" },
  { id: 299, name: "The Feather Down", rarity: "Common", element: "Air" },
  { id: 300, name: "The Lichen Crust", rarity: "Common", element: "Earth" }
];

// Card concepts mapped to traditional tarot batin & takdir
const CONCEPTS = {
  1: { theme: "kebijaksanaan agung & restu semesta", focus: "kemantapan jiwa" },
  2: { theme: "transmutasi batin & gerbang pembersihan diri", focus: "transformasi batin" },
  3: { theme: "koneksi spiritual & bimbingan gaib", focus: "keheningan rasa" },
  4: { theme: "keteguhan prinsip & otoritas kepemimpinan batin", focus: "ketegasan langkah" },
  5: { theme: "kebebasan mutlak & misteri tak berujung", focus: "keberanian melangkah" },
  6: { theme: "jalinan rahasia takdir & intrik tersembunyi", focus: "kewaspadaan rasa" },
  7: { theme: "transmutasi energi kehidupan & daya cipta", focus: "kreativitas jiwa" },
  8: { theme: "refleksi batin & penyingkapan kejujuran", focus: "kemurnian niat" },
  9: { theme: "kemurnian rasa & keterikatan cinta sejati", focus: "tulusnya hati" },
  10: { theme: "pemutusan belenggu & penaklukan ketakutan", focus: "keberanian tegas" },
  11: { theme: "rajutan benang takdir & sinkronisitas waktu", focus: "kepekaan tanda" },
  12: { theme: "rahasia batin kuno & memori spiritual", focus: "kebijaksanaan sunyi" },
  13: { theme: "akhir dari siklus usang & pelepasan ikatan", focus: "keikhlasan rasa" },
  14: { theme: "mata intuisi & penglihatan spiritual", focus: "firasat batin" },
  15: { theme: "tempaan jiwa & ujian ketabahan", focus: "ketahanan mental" },
  16: { theme: "gerbang rembulan & penjelajahan alam rasa", focus: "kepekaan intuisi" },
  17: { theme: "rahasia batin yang hening & meditasi rasa", focus: "kejernihan hati" },
  18: { theme: "putaran waktu & kesempatan emas kedua", focus: "kesabaran batin" },
  19: { theme: "pengembaraan sunyi mencari arah kebenaran", focus: "kemandirian langkah" },
  20: { theme: "teka-teki takdir & keharusan mencerna tanda", focus: "kedalaman berpikir" },
  21: { theme: "badai emosi & perubahan angin takdir", focus: "kelenturan batin" },
  22: { theme: "pembekuan rasa & introspeksi diri", focus: "pengendalian emosi" },
  23: { theme: "kelimpahan perasaan & kebahagiaan batin", focus: "syukur mendalam" },
  24: { theme: "keteraturan batin & denyut logika rasional", focus: "disiplin pikiran" },
  25: { theme: "pemulihan luka batin & oasis ketenangan", focus: "penyembuhan jiwa" },
  26: { theme: "pondasi rapuh & keharusan menata ulang", focus: "evaluasi diri" },
  27: { theme: "ilusi yang memikat & bayangan semu", focus: "kewaspadaan batin" },
  28: { theme: "perjalanan baru meniti arah bintang", focus: "langkah awal" },
  29: { theme: "kompas moral & arah tujuan yang mantap", focus: "ketepatan sikap" },
  30: { theme: "pesan bawah sadar melalui mimpi malam", focus: "keyakinan batin" },
  31: { theme: "timbangan karma & keadilan mutlak", focus: "kejujuran sikap" },
  32: { theme: "aliran inspirasi & kemurnian ide baru", focus: "daya khayal positif" },
  33: { theme: "topeng pelindung diri & rahasia terpendam", focus: "menjaga privasi" },
  34: { theme: "perspektif luas & penglihatan multi-arah", focus: "keterbukaan pikiran" },
  35: { theme: "bisikan angin malam yang membawa petunjuk", focus: "kepekaan mendengar" },
  36: { theme: "pasang surut perasaan & pasang surut intuisi", focus: "kelembutan rasa" },
  37: { theme: "gairah membara & kobaran tekad spontan", focus: "semangat berkobar" },
  38: { theme: "kecepatan gerak & momentum keberhasilan", focus: "fokus sasaran" },
  39: { theme: "ketekunan bertahap merajut kemampuan", focus: "kesabaran proses" },
  40: { theme: "perlindungan kokoh & perlindungan akar bumi", focus: "kesetiaan hati" },
  41: { theme: "kunci pembuka solusi dari kebuntuan", focus: "kemudahan jalan" },
  42: { theme: "pertahanan batin & keteguhan prinsip diri", focus: "kekuatan mental" },
  43: { theme: "wejangan kuno & petunjuk batin terstruktur", focus: "penyerapan ilmu" },
  44: { theme: "heningnya kabut & menjauh dari keramaian", focus: "ketenangan batin" },
  45: { theme: "nilai diri yang luhur & warisan leluhur", focus: "penghargaan diri" },
  46: { theme: "analisis mendalam & ketelitian membaca situasi", focus: "fokus detail" },
  47: { theme: "kuncup harapan yang mekar membawa keceriaan", focus: "aura positif" },
  48: { theme: "keterikatan masa lalu yang membebani langkah", focus: "pelepasan emosi" },
  49: { theme: "senandung harmoni & ekspresi keindahan rasa", focus: "ekspresi tulus" },
  50: { theme: "pergerakan sunyi menanti saat yang tepat", focus: "kesabaran taktis" },
  51: { theme: "keberanian melangkah tanpa takut & awal baru", focus: "kepercayaan diri" },
  52: { theme: "potensi manifestasi & kekuatan kehendak", focus: "fokus tindakan" },
  53: { theme: "kelimpahan kasih sayang & kesuburan ide", focus: "perawatan batin" },
  54: { theme: "struktur kokoh & otoritas diri yang stabil", focus: "disiplin diri" },
  55: { theme: "penyelarasan hati & pilihan krusial", focus: "keharmonisan rasa" },
  56: { theme: "tekad bulat & kemenangan atas konflik", focus: "pengendalian emosi" },
  57: { theme: "ketabahan batin & kelembutan yang menaklukkan", focus: "kesabaran batin" },
  58: { theme: "pencarian jawaban di dalam kesunyian", focus: "introspeksi diri" },
  59: { theme: "perubahan nasib & siklus hidup yang berputar", focus: "penerimaan takdir" },
  60: { theme: "kebenaran objektif & hukum sebab akibat", focus: "kejujuran batin" },
  61: { theme: "pelepasan sudut pandang lama & penyerahan diri", focus: "keikhlasan rasa" },
  62: { theme: "akhir dari siklus usang & kebangkitan baru", focus: "transformasi batin" },
  63: { theme: "keselarasan aliran emosi & moderasi", focus: "keseimbangan batin" },
  64: { theme: "keterikatan materi & bayang-bayang ketakutan", focus: "pembebasan diri" },
  65: { theme: "kejutan drastis & runtuhnya ilusi palsu", focus: "rekonstruksi batin" },
  66: { theme: "harapan murni & bimbingan cahaya malam", focus: "keyakinan masa depan" },
  67: { theme: "kegelapan intuisi & menembus kabut ilusi", focus: "kewaspadaan rasa" },
  68: { theme: "kejayaan lahir batin & vitalitas hangat", focus: "antusiasme hidup" },
  69: { theme: "panggilan jiwa & evaluasi perjalanan hidup", focus: "kebangkitan kesadaran" },
  70: { theme: "pencapaian paripurna & penyatuan harmoni semesta", focus: "kepuasan batin" },
  71: { theme: "aliran perasaan baru & cinta yang meluap", focus: "keterbukaan batin" },
  72: { theme: "terobosan pikiran & kejelasan logika", focus: "ketegasan keputusan" },
  73: { theme: "percikan inspirasi & gairah berkarya", focus: "semangat awal" },
  74: { theme: "benih kemakmuran & peluang nyata", focus: "konsistensi langkah" },
  75: { theme: "kekecewaan rasa & luka yang mendewasakan", focus: "pemulihan hati" },
  76: { theme: "persaingan energi & perbedaan pendapat", focus: "toleransi batin" },
  77: { theme: "keraguan pikiran & rasa terbelenggu oleh ilusi", focus: "keberanian melangkah" },
  78: { theme: "perjalanan meninggalkan masa lalu menuju ketenangan", focus: "keikhlasan melangkah" },
  79: { theme: "gerbang dimensi tinggi & sinkronisasi kosmis", focus: "kesadaran luas" },
  80: { theme: "kebijaksanaan tersembunyi & rahasia bumi", focus: "ketajaman batin" },
  81: { theme: "harapan membara & kebangkitan dari keterpurukan", focus: "semangat baru" },
  82: { theme: "refleksi kegelapan & penaklukan bayangan diri", focus: "kejujuran mutlak" },
  83: { theme: "gema samudra & petunjuk rasa yang mengalir", focus: "ketenang emosi" },
  84: { theme: "rahasia kuno yang terpendam dalam waktu", focus: "kesabaran berproses" },
  85: { theme: "tambatan jangkar kosmis di tengah ketidakpastian", focus: "kemantapan arah" },
  86: { theme: "perlindungan ilahi & pancaran pesona positif", focus: "aura kemurnian" },
  87: { theme: "waktu yang membeku & jeda untuk merenung", focus: "kesabaran hening" },
  88: { theme: "tabuhan genderang perubahan & dinamisasi takdir", focus: "keberanian adaptasi" },
  89: { theme: "lentera penuntun di jalan yang remang", focus: "kewaspadaan batin" },
  90: { theme: "kejernihan ide & pemurnian fokus pikiran", focus: "ketajaman logika" },
  91: { theme: "kebebasan jiwa & ringannya beban beban hati", focus: "keikhlasan rasa" },
  92: { theme: "pengejaran mimpi & kecepatan menangkap peluang", focus: "fokus sasaran" },
  93: { theme: "energi vitalitas bumi & kekuatan tekad terpendam", focus: "keteguhan prinsip" },
  94: { theme: "keteraturan proses & sinkronisasi rencana", focus: "disiplin tindakan" },
  95: { theme: "peluang materi kecil yang bernilai di masa depan", focus: "konsistensi langkah" },
  96: { theme: "tumpuan langkah kokoh di awal perjalanan", focus: "kesederhanaan sikap" },
  97: { theme: "wadah penampung emosi & kesiapan menerima rasa", focus: "keterbukaan batin" },
  98: { theme: "kunci lama yang masih bisa membuka pintu baru", focus: "kejelian solusi" },
  99: { theme: "perlindungan pertahanan batin dari pengaruh luar", focus: "ketegasan batasan" },
  100: { theme: "catatan takdir sederhana yang kokoh tak tergoyahkan", focus: "keyakinan teguh" },
  101: { theme: "harmonisasi bintang & frekuensi langit", focus: "kedamaian batin" },
  102: { theme: "wibawa bayangan & dominasi tersembunyi", focus: "keteguhan sikap" },
  103: { theme: "perlindungan abadi & perlindungan dari atas", focus: "rasa aman batin" },
  104: { theme: "turbulensi kehampaan & energi murni kosmis", focus: "keberanian mengambil peluang" },
  105: { theme: "kemilau kemahsyuran & kehormatan diri", focus: "kepercayaan diri luhur" },
  106: { theme: "tuntunan cahaya malam & aliran rasa tenang", focus: "ketenangan batin" },
  107: { theme: "kekuatan dasar bumi & kekokohan jiwa", focus: "ketahanan mental" },
  108: { theme: "ritme putaran waktu & siklus takdir berulang", focus: "kesabaran berproses" },
  109: { theme: "dinamika perubahan arah & kelenturan langkah", focus: "adaptasi cepat" },
  110: { theme: "kekuatan logam baja & pertahanan tak tertembus", focus: "keteguhan prinsip" },
  111: { theme: "api kesadaran & pencerahan spiritual", focus: "kejernihan visi" },
  112: { theme: "selubung kabut malam & misteri rahasia", focus: "kewaspadaan batin" },
  113: { theme: "ilusi bayangan semu & cermin refleksi diri", focus: "kejujuran mutlak" },
  114: { theme: "tambatan jangkar batin di kedalaman samudera", focus: "kemantapan jiwa" },
  115: { theme: "benih pertumbuhan & potensi terpendam", focus: "kesabaran memupuk usaha" },
  116: { theme: "fokus kosmis & pemusatan kekuatan pikiran", focus: "konsentrasi penuh" },
  117: { theme: "keheningan penjaga sunyi & pengamatan netral", focus: "ketajaman analisa" },
  118: { theme: "tempaan besi keras & ujian ketangguhan batin", focus: "ketabahan mental" },
  119: { theme: "kilatan intuisi cepat & aksi spontan terarah", focus: "kecepatan mengambil keputusan" },
  120: { theme: "pembekuan emosi sementara & ketenangan sedingin es", focus: "pengendalian emosi" },
  121: { theme: "semangat membara & vitalitas tanpa batas", focus: "gairah berkarya" },
  122: { theme: "kemurnian di tengah kegelapan & pertumbuhan spiritual", focus: "tulusnya niat" },
  123: { theme: "pondasi kokoh pendirian & tiang penyangga jiwa", focus: "konsistensi langkah" },
  124: { theme: "keselarasan aliran waktu & ketepatan momentum", focus: "kepekaan peluang" },
  125: { theme: "percikan inspirasi ilahi & kreativitas murni", focus: "semangat awal" },
  126: { theme: "embusan angin segar & kebebasan berekspresi", focus: "keterbukaan batin" },
  127: { theme: "keindahan sunyi rembulan & kelembutan rasa", focus: "kepekaan kasih" },
  128: { theme: "simpanan energi alam & kristalisasi waktu", focus: "ketabahan batin" },
  129: { theme: "ketajaman aksi & pemotongan keraguan batin", focus: "keberanian bersikap" },
  130: { theme: "pembiasan cahaya & pemahaman multi-perspektif", focus: "keterbukaan pikiran" },
  131: { theme: "lentera penuntun jalan di tengah kegelapan", focus: "kejelasan arah" },
  132: { theme: "wadah rasa yang kokoh namun luwes mengalir", focus: "keseimbangan rasa" },
  133: { theme: "pengingat siklus hidup & fana-nya rintangan", focus: "keikhlasan hati" },
  134: { theme: "percikan ide cemerlang & inisiasi awal", focus: "semangat berkarya" },
  135: { theme: "perjalanan bebas mengikuti arah angin takdir", focus: "keberanian melangkah" },
  136: { theme: "perlindungan fisik & ketahanan terhadap tekanan luar", focus: "kekuatan pendirian" },
  137: { theme: "pelepasan identitas ego & kedalaman hening", focus: "introspeksi diri" },
  138: { theme: "kunci pembuka wawasan & solusi tak terduga", focus: "kejelian berpikir" },
  139: { theme: "resonansi pesan alam & suara gaib samudra", focus: "peka firasat" },
  140: { theme: "petunjuk arah kompas & tuntunan bintang utara", focus: "kemantapan tujuan" },
  141: { theme: "ringannya langkah kaki & pembebasan beban batin", focus: "keikhlasan melangkah" },
  142: { theme: "penyeimbangan dualitas terang & bayang-bayang", focus: "keseimbangan batin" },
  143: { theme: "panasnya tekad batin & fondasi energi dinamis", focus: "semangat tekad" },
  144: { theme: "suara tiupan angin & penyebaran pesan takdir", focus: "kepekaan mendengar" },
  145: { theme: "tanda perlindungan batin & tulisan kuno gaib", focus: "keyakinan teguh" },
  146: { theme: "koneksi dengan akar leluhur & kestabilan kuno", focus: "ketahanan batin" },
  147: { theme: "ikatan komitmen rasa & tanggung jawab moral", focus: "disiplin diri" },
  148: { theme: "selubung misteri & perlunya kesabaran mengungkap", focus: "kewaspadaan batin" },
  149: { theme: "pantulan bayangan terdalam & penyingkapan kejujuran", focus: "kemurnian niat" },
  150: { theme: "kejayaan lahiriah & aura pancaran kemuliaan", focus: "apresiasi diri" },
  151: { theme: "benih kemakmuran bernilai kecil yang berharga", focus: "konsistensi langkah" },
  152: { theme: "penopang kekuatan sederhana dalam melangkah", focus: "kesederhanaan sikap" },
  153: { theme: "lembaran rencana awal & penyerapan petunjuk", focus: "penyerapan ilmu" },
  154: { theme: "wadah penampung kesiapan menerima aliran rasa", focus: "keterbukaan batin" },
  155: { theme: "ikatan janji sederhana yang tulus dipelihara", focus: "kesetiaan hati" },
  156: { theme: "kesiapan melangkah menempuh perjalanan baru", focus: "kepercayaan diri" },
  157: { theme: "ketelitian merajut detail & kesabaran kecil", focus: "kesabaran proses" },
  158: { theme: "aliran rasa riang & harmoni dengan lingkungan", focus: "ekspresi tulus" },
  159: { theme: "percikan tekad spontan untuk memulai sesuatu", focus: "fokus tindakan" },
  160: { theme: "jalinan ikatan persahabatan & saling mendukung", focus: "keharmonisan rasa" },
  161: { theme: "keterbukaan transparansi & kejujuran sikap", focus: "kejujuran batin" },
  162: { theme: "keluwesan bersikap & menyebarkan aura segar", focus: "kelenturan batin" },
  163: { theme: "penyimpanan rahasia kecil yang terjaga aman", focus: "menjaga privasi" },
  164: { theme: "kekuatan penahan kecil yang kokoh menyatukan", focus: "kekuatan mental" },
  165: { theme: "kehangatan perlindungan rasa dari dinginnya luar", focus: "perawatan batin" },
  166: { theme: "penyusunan fondasi kokoh secara bertahap", focus: "evaluasi diri" },
  167: { theme: "fokus energi terarah ke satu titik tujuan", focus: "fokus sasaran" },
  168: { theme: "penerangan batin sederhana di tengah kesunyian", focus: "introspeksi diri" },
  169: { theme: "kelembutan sikap meredakan ketegangan sekitar", focus: "pengendalian emosi" },
  170: { theme: "perlindungan pikiran dari teriknya ego luar", focus: "kejernihan hati" },
  171: { theme: "keselarasan ucapan & melodi komunikasi baik", focus: "kelembutan rasa" },
  172: { theme: "perjalanan waktu konstan & keharusan sabar", focus: "kesabaran batin" },
  173: { theme: "kemurnian niat & bumbu penyedap relasi batin", focus: "syukur mendalam" },
  174: { theme: "potensi energi terpendam yang siap dinyalakan", focus: "semangat berkobar" },
  175: { theme: "wadah penumpung ide & kesiapan menuang karya", focus: "daya khayal positif" },
  176: { theme: "pelepasan siklus alami & keikhlasan melepas", focus: "keikhlasan rasa" },
  177: { theme: "landasan kecil pijakan langkah agar stabil", focus: "kemantapan jiwa" },
  178: { theme: "hambatan kecil yang mengganggu konsentrasi batin", focus: "kewaspadaan rasa" },
  179: { theme: "potensi benih ide yang menunggu musim tepat", focus: "kesabaran taktis" },
  180: { theme: "aliran rasa yang mengikis kerasnya hati", focus: "kepekaan intuisi" },
  181: { theme: "sisa pembakaran ego & perlunya pembersihan diri", focus: "transformasi batin" },
  182: { theme: "ketahanan mengapung melewati arus cobaan air", focus: "ketahanan mental" },
  183: { theme: "keindahan alami sederhana yang menghibur batin", focus: "aura positif" },
  184: { theme: "koneksi jalinan rasa yang fleksibel terhubung", focus: "tulusnya hati" },
  185: { theme: "pelepasan gengsi & penerimaan kesederhanaan", focus: "kemurnian niat" },
  186: { theme: "kerapihan menata hubungan & benang takdir", focus: "kepekaan tanda" },
  187: { theme: "keretakan sudut pandang & perlunya kehati-hatian", focus: "firasat batin" },
  188: { theme: "kelembutan sentuhan & ketenangan melayang bebas", focus: "kebijaksanaan sunyi" },
  189: { theme: "kekuatan potensi besar di dalam wujud kecil", focus: "kebangkitan kesadaran" },
  190: { theme: "suara bisikan hening dari kedalaman rasa", focus: "kejernihan batin" },
  191: { theme: "kejujuran murni dalam bentuk paling sederhana", focus: "kemurnian rasa" },
  192: { theme: "sisa tekad kecil yang tidak boleh padam", focus: "ketegasan batin" },
  193: { theme: "jalinan ikatan komitmen sederhana yang tulus", focus: "keharmonisan rasa" },
  194: { theme: "masalah lama kecil yang belum tuntas diselesaikan", focus: "kewaspadaan batin" },
  195: { theme: "koneksi mendalam dengan akar spiritual terdalam", focus: "kejernihan hati" },
  196: { theme: "pelindung diri lambat yang sabar berproses", focus: "kesabaran batin" },
  197: { theme: "tempat perlindungan rasa hangat untuk beristirahat", focus: "rasa damai batin" },
  198: { theme: "kekeruhan emosi sementara yang perlu diendapkan", focus: "pengendalian emosi" },
  199: { theme: "alat pemantik tekad & inisiasi awal tindakan", focus: "keberanian melangkah" },
  200: { theme: "kelembutan yang tumbuh subur menutupi luka", focus: "penyembuhan jiwa" },
  201: { theme: "penyatuan kosmis & harmoni semesta raya", focus: "keseimbangan batin" },
  202: { theme: "keteguhan benteng jiwa & kekuatan prinsip", focus: "kekuatan mental" },
  203: { theme: "aliran energi tak berwujud & fleksibilitas jiwa", focus: "kelenturan batin" },
  204: { theme: "kobaran semangat membara & keberanian mutlak", focus: "semangat berkobar" },
  205: { theme: "bisikan hening kehampaan & kebenaran gaib", focus: "firasat batin" },
  206: { theme: "gerbang waktu & pergeseran dimensi takdir", focus: "kesabaran taktis" },
  207: { theme: "cahaya kepemimpinan & otoritas moral diri", focus: "ketegasan langkah" },
  208: { theme: "panen spiritual & pelepasan ikatan buruk", focus: "keikhlasan rasa" },
  209: { theme: "kejernihan visi & pancaran keindahan rohani", focus: "kemurnian niat" },
  210: { theme: "ritme waktu kosmis & ketepatan bertindak", focus: "kepekaan peluang" },
  211: { theme: "petunjuk ilahi & intuisi tingkat tinggi", focus: "kejernihan hati" },
  212: { theme: "proses pemurnian jiwa melalui ujian berat", focus: "ketabahan mental" },
  213: { theme: "kebangkitan agung dari abu kegagalan", focus: "semangat baru" },
  214: { theme: "rajutan tenang benang takdir masa depan", focus: "kemantapan jiwa" },
  215: { theme: "arah tujuan hidup yang dibimbing bintang", focus: "kemantapan arah" },
  216: { theme: "aliran energi mendalam & samudera kasih", focus: "kelembutan rasa" },
  217: { theme: "kestabilan bumi & fondasi kokoh batin", focus: "konsistensi langkah" },
  218: { theme: "kekuatan mutlak besi & kepemimpinan berwibawa", focus: "keteguhan prinsip" },
  219: { theme: "kebebasan terbang & wawasan berpikir luas", focus: "keterbukaan pikiran" },
  220: { theme: "dinamo energi kreatif & dorongan berkarya", focus: "daya cipta" },
  221: { theme: "penyingkapan fatamorgana & melihat realita", focus: "kewaspadaan batin" },
  222: { theme: "perlindungan bayangan & kejelian membaca situasi", focus: "pengamatan netral" },
  223: { theme: "pembekuan konflik & ketenangan kepala dingin", focus: "pengendalian emosi" },
  224: { theme: "kedaulatan tekad & kekuasaan atas ego", focus: "disiplin diri" },
  225: { theme: "pengawasan spiritual & kewaspadaan batin", focus: "kejernihan visi" },
  226: { theme: "cahaya penuntun malam & ketenangan emosi", focus: "kedamaian batin" },
  227: { theme: "pengembaraan spiritual mencari makna hidup", focus: "kemandirian langkah" },
  228: { theme: "gerbang kesempatan baru yang mulai terbuka", focus: "keberanian mengambil peluang" },
  229: { theme: "tanda perlindungan gaib dari energi negatif", focus: "rasa aman batin" },
  230: { theme: "kemakmuran stabil & kelimpahan rezeki", focus: "syukur mendalam" },
  231: { theme: "dinamika perubahan cepat & badai ide", focus: "adaptasi cepat" },
  232: { theme: "wadah kemurnian perasaan & ketulusan hati", focus: "tulusnya hati" },
  233: { theme: "refleksi kejujuran batin & cermin diri", focus: "kejujuran mutlak" },
  234: { theme: "keseimbangan karma & keadilan bersikap", focus: "ketepatan sikap" },
  235: { theme: "gairah kemakmuran & energi vitalitas", focus: "antusiasme hidup" },
  236: { theme: "oasis ketenangan di tengah hiruk pikuk", focus: "penyembuhan jiwa" },
  237: { theme: "resonansi kesunyian & kedalaman meditasi", focus: "introspeksi diri" },
  238: { theme: "monumen keteguhan & ingatan masa lalu", focus: "kesabaran berproses" },
  239: { theme: "ketajaman fokus & aksi tanpa ragu", focus: "fokus sasaran" },
  240: { theme: "percikan inspirasi kreatif & harapan baru", focus: "semangat awal" },
  241: { theme: "pencapaian cita-cita tinggi yang murni", focus: "keyakinan masa depan" },
  242: { theme: "pemicu perubahan positif dalam hidup", focus: "transformasi batin" },
  243: { theme: "tambatan batin yang kuat menghadapi ujian", focus: "kemantapan rasa" },
  244: { theme: "wibawa kepemimpinan & kebijaksanaan hening", focus: "kebijaksanaan sunyi" },
  245: { theme: "kekokohan pendirian & tiang pertahanan", focus: "ketegasan batasan" },
  246: { theme: "pengingat siklus hidup yang terus berputar", focus: "penerimaan takdir" },
  247: { theme: "kilatan petunjuk batin yang datang tiba-tiba", focus: "kepekaan tanda" },
  248: { theme: "perlindungan batin & perisai energi positif", focus: "aura kemurnian" },
  249: { theme: "perencanaan matang & keteraturan hidup", focus: "disiplin tindakan" },
  250: { theme: "lentera penjelajah malam & penuntun arah", focus: "kejelasan arah" },
  251: { theme: "keteraturan langkah & navigasi hidup", focus: "ketepatan sikap" },
  252: { theme: "pertumbuhan bakat baru & kesabaran memupuk", focus: "kesabaran proses" },
  253: { theme: "penyerapan ilmu & pemahaman pesan tertulis", focus: "penyerapan ilmu" },
  254: { theme: "wadah penyimpanan emosi yang sehat", focus: "keterbukaan batin" },
  255: { theme: "komitmen persahabatan sederhana & tulus", focus: "kesetiaan hati" },
  256: { theme: "bekal perjalanan & kesiapan melangkah", focus: "kepercayaan diri" },
  257: { theme: "ketelitian merajut detail kecil kehidupan", focus: "kesabaran hening" },
  258: { theme: "resonansi kedamaian & gema batin tenang", focus: "ketenangan emosi" },
  259: { theme: "percikan ide cemerlang & inisiasi awal", focus: "semangat berkarya" },
  260: { theme: "jalinan ikatan persaudaraan yang erat", focus: "keharmonisan rasa" },
  261: { theme: "transparansi kejujuran & keterbukaan hati", focus: "kejujuran batin" },
  262: { theme: "keluwesan berekspresi & menuangkan ide", focus: "kelenturan batin" },
  263: { theme: "penyimpanan memori indah yang berharga", focus: "menjaga privasi" },
  264: { theme: "kekuatan penahan dari goncangan luar", focus: "kekuatan mental" },
  265: { theme: "kehangatan perlindungan dari dinginnya luar", focus: "perawatan batin" },
  266: { theme: "proses pematangan tekad & ujian api", focus: "evaluasi diri" },
  267: { theme: "fokus pikiran terarah ke titik sasaran", focus: "fokus sasaran" },
  268: { theme: "penerangan batin di kala sepi & sunyi", focus: "introspeksi diri" },
  269: { theme: "kelembutan sikap mendinginkan ketegangan", focus: "pengendalian emosi" },
  270: { theme: "perlindungan rasa aman & kehangatan batin", focus: "kejernihan hati" },
  271: { theme: "keselarasan komunikasi & melodi ucapan", focus: "kelembutan rasa" },
  272: { theme: "perjalanan waktu konstan & keharusan sabar", focus: "kesabaran batin" },
  273: { theme: "pemurnian niat & bumbu harmoni relasi", focus: "syukur mendalam" },
  274: { theme: "potensi energi terpendam yang siap bangkit", focus: "semangat berkobar" },
  275: { theme: "wadah penampung inspirasi & curahan rasa", focus: "daya khayal positif" },
  276: { theme: "pelepasan siklus alami & keikhlasan melepas", focus: "keikhlasan rasa" },
  277: { theme: "landasan pijakan sederhana untuk melangkah", focus: "kemantapan jiwa" },
  278: { theme: "hambatan kecil yang menguji kesabaran rasa", focus: "kewaspadaan rasa" },
  279: { theme: "potensi tersembunyi menanti saat yang tepat", focus: "kesabaran taktis" },
  280: { theme: "aliran kelembutan mengikis kerasnya hati", focus: "kepekaan intuisi" },
  281: { theme: "sisa ego & perlunya pembersihan diri batin", focus: "transformasi batin" },
  282: { theme: "ketahanan melewati arus cobaan hidup", focus: "ketahanan mental" },
  283: { theme: "keindahan sederhana yang menghibur jiwa", focus: "aura positif" },
  284: { theme: "koneksi jalinan rasa yang tulus terhubung", focus: "tulusnya hati" },
  285: { theme: "pelepasan ego & penerimaan kesederhanaan", focus: "kemurnian niat" },
  286: { theme: "kerapihan menata rencana & benang takdir", focus: "kepekaan tanda" },
  287: { theme: "keretakan sudut pandang & kehati-hatian", focus: "firasat batin" },
  288: { theme: "kelembutan rasa & ketenangan melayang bebas", focus: "kebijaksanaan sunyi" },
  289: { theme: "potensi besar tersembunyi di wujud kecil", focus: "kebangkitan kesadaran" },
  290: { theme: "bisikan hening dari kedalaman lubuk rasa", focus: "kejernihan batin" },
  291: { theme: "kejujuran murni dalam bentuk sederhana", focus: "kemurnian rasa" },
  292: { theme: "sisa tekad kecil yang harus terus dijaga", focus: "ketegasan batin" },
  293: { theme: "jalinan komitmen sederhana yang tulus", focus: "keharmonisan rasa" },
  294: { theme: "masalah kecil lama yang belum tuntas dibahas", focus: "kewaspadaan batin" },
  295: { theme: "koneksi mendalam dengan akar spiritual", focus: "kejernihan hati" },
  296: { theme: "pelindung diri lambat yang sabar berproses", focus: "kesabaran batin" },
  297: { theme: "tempat perlindungan rasa hangat beristirahat", focus: "rasa damai batin" },
  298: { theme: "kekeruhan emosi sementara yang diendapkan", focus: "pengendalian emosi" },
  299: { theme: "pemantik tekad & inisiasi awal tindakan", focus: "keberanian melangkah" },
  300: { theme: "kelembutan tumbuh subur membalut luka", focus: "penyembuhan jiwa" }
};

// Generates rich, mystical traditional tarot readings
function getTarotReading(cardId, category) {
  const card = TAROT_CARDS.find(c => c.id === cardId) || TAROT_CARDS[0];
  const concept = CONCEPTS[card.id] || { theme: "getaran energi gaib", focus: "intuisi batin" };

  let text = "";
  let advice = "";

  const idx = Math.abs(card.id + category.length) % 5;

  switch (category.toLowerCase()) {
    case "love":
      if (idx === 0) {
        text = `Di ranah asmara, kartu ${card.name} mengisyaratkan getaran halus mengenai ${concept.theme}. Hubungan atau ketertarikanmu saat ini membutuhkan ${concept.focus} agar tidak goyah oleh keraguan.`;
        advice = `Dengarkan kata hatimu dan prioritaskan ${concept.focus}. Kadang, jawaban terbaik tersimpan dalam kesabaran batin.`;
      } else if (idx === 1) {
        text = `Pesan cinta dari ${card.name} menunjukkan adanya aliran energi tentang ${concept.theme}. Semesta menyarankan agar kamu menyelaraskan hubunganmu dengan ${concept.focus} demi kebahagiaan bersama.`;
        advice = `Sambutlah getaran rasa ini dengan menerapkan ${concept.focus}. Bersikaplah jujur pada diri sendiri dan pasanganmu.`;
      } else if (idx === 2) {
        text = `Melihat tanda-tanda asmara melalui kartu ${card.name}, batinmu sedang menangkap resonansi dari ${concept.theme}. Saat ini adalah waktu yang tepat untuk memperkuat ${concept.focus} dalam interaksi hatimu.`;
        advice = `Jadikan ${concept.focus} sebagai landasan tindakanmu. Hindari terburu-buru mengambil langkah sebelum batinmu tenang.`;
      } else if (idx === 3) {
        text = `Melalui bisikan kartu ${card.name}, jalinan rasa yang sedang tumbuh membawa tanda tentang ${concept.theme}. Kehangatan asmaramu menuntut kejujuran dan ${concept.focus} agar bersemi dengan indah.`;
        advice = `Hargai perasaan itu dan utamakan ${concept.focus}. Jangan takut membuka hati terhadap perubahan yang positif.`;
      } else {
        text = `Takdir cinta hari ini berkorelasi dengan kartu ${card.name} yang membawa pancaran ${concept.theme}. Jangan ragu untuk meletakkan ${concept.focus} sebagai landasan komunikasi hatimu.`;
        advice = `Latihlah ${concept.focus} saat berinteraksi dengan orang terkasih. Kelembutan rasa akan mencairkan segala kekakuan.`;
      }
      break;
    case "study":
      if (idx === 0) {
        text = `Dalam perjalanan menuntut ilmu, kartu ${card.name} membawa pencerahan tentang ${concept.theme}. Pikiranmu saat ini sangat memerlukan ${concept.focus} untuk mengurai kerumitan materi yang sedang kamu pelajari.`;
        advice = `Fokuskan energimu pada ${concept.focus}. Belajarlah dengan tenang dan jangan ragu untuk beristirahat saat pikiran mulai jenuh.`;
      } else if (idx === 1) {
        text = `Kartu ${card.name} mengindikasikan bahwa proses belajarmu sedang dipengaruhi oleh ${concept.theme}. Untuk mencapai pemahaman mendalam, kamu diminta memperkuat ${concept.focus} dalam keseharianmu.`;
        advice = `Arahkan perhatianmu ke ${concept.focus}. Ingatlah bahwa setiap pengetahuan membutuhkan waktu untuk mengendap di dalam jiwa.`;
      } else if (idx === 2) {
        text = `Resonansi intelektual dari kartu ${card.name} menyiratkan pentingnya ${concept.theme}. Ada kabut kebingungan yang hanya bisa dipecahkan jika kamu melatih ${concept.focus}.`;
        advice = `Gunakan ${concept.focus} sebagai panduan utamamu dalam belajar. Jangan memaksakan diri menyerap semuanya sekaligus.`;
      } else if (idx === 3) {
        text = `Penyerapan ilmumu hari ini dibimbing oleh kartu ${card.name} yang memicu getaran ${concept.theme}. Keberhasilan akademismu bergantung pada seberapa jauh kamu memelihara ${concept.focus}.`;
        advice = `Pertahankan ${concept.focus} saat menghadapi materi sulit. Ketekunan kecil yang konsisten akan membawa pemahaman besar.`;
      } else {
        text = `Dari sudut pandang logika dan pengetahuan, hadirnya kartu ${card.name} menuntut ${concept.theme}. Segera selaraskan pikiranmu dengan ${concept.focus} agar wawasan baru terbuka lebar.`;
        advice = `Jadikan ${concept.focus} sebagai landasan logikamu hari ini. Jangan ragu berdiskusi untuk memperdalam pemahaman.`;
      }
      break;
    case "career":
      if (idx === 0) {
        text = `Terkait karir dan pekerjaan, hadirnya kartu ${card.name} menandakan getaran ${concept.theme}. Situasi kerjamu saat ini menuntut ${concept.focus} agar kamu bisa melewati tantangan profesional dengan sukses.`;
        advice = `Jadikan ${concept.focus} sebagai kompas kerjamu hari ini. Tetaplah profesional dan hindari konflik yang tidak perlu.`;
      } else if (idx === 1) {
        text = `Kartu ${card.name} memperlihatkan peluang karir atau tanggung jawab baru yang berpusat pada ${concept.theme}. Semesta mengingatkanmu untuk melangkah dengan berbekal ${concept.focus}.`;
        advice = `Gunakan ${concept.focus} saat mengambil keputusan profesional. Jangan biarkan opini luar mengaburkan visi karirmu.`;
      } else if (idx === 2) {
        text = `Langkah kerjamu hari ini diselimuti oleh aura kartu ${card.name} yang membawa pesan tentang ${concept.theme}. Keberhasilan usahamu sangat bergantung pada penerapan ${concept.focus}.`;
        advice = `Terapkan ${concept.focus} secara konsisten. Setiap usaha keras yang didasari ketenangan batin akan membuahkan hasil manis.`;
      } else if (idx === 3) {
        text = `Dinamika pekerjaanmu saat ini dipandu oleh energi kartu ${card.name} yang merefleksikan ${concept.theme}. Untuk memperlancar negosiasi dan produktivitas, terapkanlah ${concept.focus}.`;
        advice = `Fokuskan energimu pada ${concept.focus} dan jalin komunikasi profesional yang sehat dengan rekan kerja.`;
      } else {
        text = `Visi karir jangka panjangmu hari ini selaras dengan makna kartu ${card.name} tentang ${concept.theme}. Latihlah ${concept.focus} agar setiap keputusan kerjamu mendatangkan kepuasan batin.`;
        advice = `Jadikan ${concept.focus} sebagai motivasi kerjamu. Setiap langkah terencana dengan baik akan menghasilkan kemajuan nyata.`;
      }
      break;
    case "fortune":
      if (idx === 0) {
        text = `Aliran energi rezeki melalui kartu ${card.name} mencerminkan hadirnya ${concept.theme}. Keberuntungan materi maupun spiritual akan mendekat seiring kesiapanmu menyelaraskan diri dengan ${concept.focus}.`;
        advice = `Sambut kelimpahan ini dengan ${concept.focus}. Jangan lupa untuk berbagi dengan sesama agar energi positif terus berputar.`;
      } else if (idx === 1) {
        text = `Kartu ${card.name} membawa getaran kemakmuran yang terhubung dengan ${concept.theme}. Semesta mengingatkan bahwa keberuntungan sejati lahir dari ${concept.focus} yang kamu pelihara.`;
        advice = `Kelola keuangan dan peluangmu dengan mengutamakan ${concept.focus}. Hindari keputusan impulsif yang merugikan.`;
      } else if (idx === 2) {
        text = `Melalui kartu ${card.name}, aliran keberuntungan materiil hari ini membawa pesan tentang ${concept.theme}. Kunci dari kelancaran rezekimu saat ini ada pada ${concept.focus}.`;
        advice = `Fokuslah menjaga ${concept.focus}. Bersyukur atas apa yang ada akan membuka pintu-pintu kelimpahan baru.`;
      } else if (idx === 3) {
        text = `Rezeki tak terduga sedang mengalir di sekitarmu, ditunjukkan oleh kartu ${card.name} yang beresonansi dengan ${concept.theme}. Sambutlah kelimpahan ini dengan menerapkan ${concept.focus}.`;
        advice = `Terimalah peluang finansial dengan kebijaksanaan batin dan landaskan pada ${concept.focus}.`;
      } else {
        text = `Peta keberuntungan finansial dan spiritualmu hari ini dipengaruhi oleh kartu ${card.name} yang membawa getaran ${concept.theme}. Jagalah aliran positif ini dengan memprioritaskan ${concept.focus}.`;
        advice = `Pertahankan ${concept.focus} dalam pengelolaan tokomu atau usahamu agar kelancaran rezeki tetap stabil.`;
      }
      break;
    case "warning":
      if (idx === 0) {
        text = `Kartu ${card.name} hadir sebagai cermin peringatan tentang ${concept.theme}. Ada risiko di mana kamu mengabaikan ${concept.focus}, atau terjebak dalam ilusi serta kebiasaan lama yang menahan perkembangan dirimu.`;
        advice = `Waspadai hal-hal yang dapat mengaburkan ${concept.focus}. Tarik napas dalam-dalam saat rintangan datang, dan tetap tenang.`;
      } else if (idx === 1) {
        text = `Peringatan keras dari kartu ${card.name} menunjukkan adanya potensi konflik atau hambatan terkait ${concept.theme}. Kamu diminta untuk sangat berhati-hati dan mengandalkan ${concept.focus} hari ini.`;
        advice = `Jangan abaikan tanda bahaya ini, fokuslah pada ${concept.focus}. Hindari mengambil risiko besar yang belum matang di batin.`;
      } else if (idx === 2) {
        text = `Kartu ${card.name} mengungkap bahwa egomu mungkin sedang terikat oleh ${concept.theme}, membuatmu rentan melakukan kesalahan. Ketiadaan ${concept.focus} bisa memperburuk keadaan.`;
        advice = `Segera sadari dan kembalikan fokusmu pada ${concept.focus}. Lepaskan keterikatan negatif sebelum masalah berkembang.`;
      } else if (idx === 3) {
        text = `Ada energi ketidakseimbangan yang membayangi langkahmu hari ini, tercermin dari kartu ${card.name} tentang ${concept.theme}. Cegah kerugian dengan tetap berpegang pada ${concept.focus}.`;
        advice = `Perhatikan baik-baik setiap keputusan krusial dan andalkan ${concept.focus} untuk menghindari kerugian materiil.`;
      } else {
        text = `Kartu ${card.name} mengingatkanmu untuk waspada terhadap pengaruh luar yang memicu ${concept.theme}. Kembalikan kendali dirimu dengan memusatkan perhatian pada ${concept.focus}.`;
        advice = `Jangan biarkan amarah atau keputusasaan menguasaimu. Jadikan ${concept.focus} perisai pelindung jiwamu.`;
      }
      break;
    default: // random / general arcane
      if (idx === 0) {
        text = `Pesan universal semesta hari ini melalui kartu ${card.name} membawa getaran ${concept.theme}. Batinmu sedang dipersiapkan untuk memahami esensi dari ${concept.focus} demi keseimbangan langkah hidupmu.`;
        advice = `Jadikan ${concept.focus} sebagai jangkar batinmu hari ini. Amati tanda-tanda kecil yang ditunjukkan semesta.`;
      } else if (idx === 1) {
        text = `Kartu ${card.name} memancarkan energi kosmis tentang ${concept.theme} ke dalam harimu. Jiwamu saat ini membutuhkan penyelarasan dengan ${concept.focus} agar tetap selaras dengan takdir.`;
        advice = `Renungkan makna ${concept.focus} dalam keheningan. Biarkan bimbingan gaib menuntun setiap keputusanmu.`;
      } else if (idx === 2) {
        text = `Hari ini, aura kartu ${card.name} mengajakmu merenungkan getaran ${concept.theme}. Semesta mengingatkan bahwa kedamaian batin akan tercipta ketika kamu menerapkan ${concept.focus}.`;
        advice = `Pelihara ${concept.focus} di sepanjang aktivitasmu. Percayalah bahwa segala sesuatu berjalan sesuai dengan alur waktu ilahi.`;
      } else if (idx === 3) {
        text = `Langkah hidupmu hari ini disinari oleh getaran kartu ${card.name} yang mencerminkan ${concept.theme}. Resapi keindahan momen ini dengan mengedepankan ${concept.focus}.`;
        advice = `Jalani hari dengan tenang dan tanamkan ${concept.focus} di setiap interaksi sosialmu.`;
      } else {
        text = `Petunjuk spiritual harianmu menyarankan untuk memperhatikan pesan kartu ${card.name} mengenai ${concept.theme}. Kunci keselarasan hidupmu hari ini terletak pada kekuatan ${concept.focus}.`;
        advice = `Gunakan ${concept.focus} untuk menimbang setiap alternatif tindakan. Percayalah bahwa bimbingan batin tidak pernah salah.`;
      }
      break;
  }

  // Special handwritten overrides for premium tarot detail
  const cat = category.toLowerCase();
  if (cardId === 1 && cat === "love") {
    text = "The Eternal Oracle membisikkan bahwa takdir cinta sejati sedang bergerak mendekat. Kebijaksanaan batinmu hari ini adalah kunci untuk membaca isyarat halus dari seseorang yang bernilai bagi masa depanmu.";
    advice = "Buka hatimu dengan ketenangan. Oracle menyarankan agar kamu tidak memaksakan perasaan, melainkan membiarkan semesta merajutnya secara alami.";
  } else if (cardId === 16 && cat === "love") {
    text = "Ada rasa di balik The Moonlit Gate yang belum sepenuhnya hilang, tapi hari ini kamu diminta lebih tenang dalam membaca sikap seseorang.";
    advice = "Jangan memaksa jawaban dari hati yang belum siap bicara.";
  } else if (cardId === 51 && (cat === "warning" || cat === "random")) {
    text = "The Fool membisikkan bahwa langkah nekatmu hari ini dipenuhi perlindungan tak terlihat, namun tetaplah melihat jurang di depanmu agar tidak tergelincir.";
    advice = "Melangkahlah dengan iman, namun tetap buka matamu lebar-lebar.";
  } else if (cardId === 62 && cat === "warning") {
    text = "Kartu Death mengingatkanmu bahwa menolak melepaskan apa yang sudah mati hanya akan memperpanjang penderitaan batinmu. Sesuatu harus berakhir agar awal yang baru bisa lahir.";
    advice = "Ikhlaskan yang telah usai dan bersiaplah untuk transformasi batin yang agung.";
  } else if (cardId === 65 && cat === "warning") {
    text = "Menara yang runtuh (The Tower) memperingatkanmu bahwa pondasi ego yang kamu bangun di atas kepalsuan atau kebohongan akan segera diguncang oleh kebenaran semesta.";
    advice = "Biarkan yang rapuh runtuh, agar kamu bisa membangun kembali pondasi batin yang jauh lebih kokoh dan jujur.";
  } else if (cardId === 52 && (cat === "study" || cat === "career")) {
    text = "The Magician melambangkan penguasaan elemen batin dan kekuatan kehendak mutlak. Hari ini, pikiranmu berada pada puncak kemampuan untuk memanifestasikan ide menjadi kenyataan nyata.";
    advice = "Fokuskan niatmu dan gunakan seluruh pengetahuanmu untuk bertindak segera. Jangan tunda rencana besar.";
  } else if (cardId === 53 && (cat === "fortune" || cat === "love")) {
    text = "The Empress mengalirkan energi kesuburan alam semesta dan kelimpahan tanpa batas. Ada panen raya perasaan atau pintu rezeki yang siap mengetuk kehidupanmu.";
    advice = "Sambutlah kelimpahan ini dengan rasa syukur dan bukalah hatimu untuk merawat hubungan di sekitarmu.";
  } else if (cardId === 54 && cat === "career") {
    text = "The Emperor berdiri kokoh membawa aura disiplin, otoritas, dan stabilitas struktural. Karirmu saat ini sangat membutuhkan ketegasan sikap kepemimpinan.";
    advice = "Ambil kendali atas situasi kerjamu dengan wibawa dan buat keputusan objektif tanpa ragu.";
  } else if (cardId === 55 && cat === "love") {
    text = "The Lovers menghadirkan keharmonisan magnetik dan pilihan penting dari lubuk jiwa. Ada ketertarikan mendalam yang sedang diuji untuk diselaraskan.";
    advice = "Pilihlah berdasarkan ketulusan hati, bukan sekadar ketertarikan sementara. Jaga keselarasan dengan pasanganmu.";
  } else if (cardId === 56 && (cat === "career" || cat === "study")) {
    text = "The Chariot memacu roda tekadmu untuk menembus segala rintangan. Kemenangan profesional atau akademik sudah sangat dekat, asalkan kamu mampu mengendalikan konflik batin.";
    advice = "Tetaplah fokus pada tujuan akhir dan pegang erat kendali emosimu dengan ketegasan penuh.";
  } else if (cardId === 58 && (cat === "study" || cat === "random")) {
    text = "The Hermit berjalan dalam kesunyian malam membawa lentera penuntun yang menyinari satu langkah di depannya. Ini waktu untuk berkontemplasi mencari kebenaran ke dalam diri.";
    advice = "Jauhi keramaian sejenak. Pelajari situasi secara mendalam sebelum melangkah keluar ke dunia luar.";
  } else if (cardId === 59 && cat === "fortune") {
    text = "The Wheel of Fortune sedang berputar di titik krusial. Takdir sedang bergeser membawa perubahan nasib yang tidak terduga ke dalam hidupmu.";
    advice = "Terimalah pasang surut ini dengan lapang dada. Tidak ada keadaan yang abadi, persiapkan diri menangkap peluang baru.";
  } else if (cardId === 64 && cat === "warning") {
    text = "The Devil memperingatkan adanya keterikatan tidak sehat, kecanduan mental, atau ilusi kenyamanan palsu yang membelenggu kebebasan jiwamu.";
    advice = "Sadarilah belenggu yang kamu ciptakan sendiri dan mulailah mengambil langkah tegas untuk melepaskan diri.";
  } else if (cardId === 66 && (cat === "love" || cat === "fortune")) {
    text = "The Star memancarkan cahaya harapan abadi dan pemulihan jiwa setelah badai besar berlalu. Jiwamu sedang dibasuh oleh ketenangan ilahi.";
    advice = "Percayalah pada proses pemulihan ini. Masa depanmu dipenuhi bimbingan cahaya yang terang.";
  } else if (cardId === 67 && cat === "warning") {
    text = "The Moon menyingkap kabut ilusi, ketakutan bawah sadar, dan hal-hal yang tersembunyi di kegelapan malam. Ada kecemasan yang sedang mengaburkan logikamu.";
    advice = "Jangan mengambil keputusan penting saat batinmu masih diselimuti kabut. Percayalah pada intuisimu.";
  } else if (cardId === 68 && (cat === "fortune" || cat === "study")) {
    text = "The Sun menyinari harimu dengan vitalitas hangat, kejayaan murni, dan kebahagiaan lahir batin. Semua usaha dan kerja kerasmu akan terlihat bersinar terang.";
    advice = "Pancarkan energi positifmu ke sekeliling. Hari ini adalah hari keberhasilan dan ekspresi diri penuh kegembiraan.";
  } else if (cardId === 69 && (cat === "warning" || cat === "random")) {
    text = "Judgement meniup terompet kesadaran, memanggil jiwamu untuk bangkit dan melepaskan masa lalu yang telah usai. Ada panggilan takdir baru untuk mengevaluasi hidupmu.";
    advice = "Tinggalkan penyesalan masa lalu. Berdirilah tegak menyongsong kelahiran kembali jiwamu dengan kejujuran mutlak.";
  } else if (cardId === 70 && (cat === "fortune" || cat === "career")) {
    text = "The World menandakan pencapaian siklus sempurna dan penyatuan harmoni semesta. Kamu telah menyelesaikan babak penting dan siap merayakan keberhasilanmu.";
    advice = "Rayakan pencapaianmu dan nikmati kedamaian batin. Persiapkan lembaran baru dengan penuh rasa syukur.";
  } else if (cardId === 3 && (cat === "love" || cat === "random")) {
    text = "The Celestial Arch membukakan gerbang aetherial, menghubungkan jiwamu dengan frekuensi cinta kosmis yang murni. Ada restu spiritual atas hubungan yang sedang kamu jalani.";
    advice = "Jaga kesucian rasa tersebut dan biarkan bimbingan gaib menuntun langkah interaksi hatimu.";
  } else if (cardId === 2 && (cat === "warning" || cat === "career")) {
    text = "The Eclipse Dragon merayap dalam bayangan, reminding adanya pergeseran kekuasaan yang drastis atau ujian tersembunyi dalam pekerjaanmu.";
    advice = "Tetaplah waspada dan kendalikan emosi egomu. Jangan biarkan ambisi buta menjatuhkan posisimu.";
  } else if (cardId === 4 && (cat === "career" || cat === "fortune")) {
    text = "The Burning Crown memberikan otoritas membara dan tanggung jawab kepemimpinan yang besar hari ini. Tekad dan keberanianmu sedang diuji di bawah sorotan.";
    advice = "Pimpinlah dengan keadilan dan ketegasan, namun hindari keangkuhan yang dapat membakar kerjasamamu.";
  } else if (cardId === 5 && (cat === "random" || cat === "study")) {
    text = "The Infinite Spiral mengajak jiwamu menjelajahi misteri tak berujung dan pemahaman di luar logika biasa. Pikiranmu sedang terhubung dengan void kreativitas murni.";
    advice = "Jangan batasi daya imajinasimu. Eksplorasi setiap ide unik tanpa takut dibilang aneh.";
  }

  return {
    cardId: card.id,
    name: card.name,
    rarity: card.rarity,
    element: card.element,
    reading: text,
    advice: advice
  };
}

// Draws a card using weighted probabilities:
// - Legendary: 2%
// - Epic: 8%
// - Rare: 20%
// - Uncommon: 30%
// - Common: 40%
function drawTarotCard() {
  const roll = crypto.randomInt(0, 100); // 0 to 99
  let rarity = "Common";
  if (roll < 2) {
    rarity = "Legendary";
  } else if (roll < 10) {
    rarity = "Epic";
  } else if (roll < 30) {
    rarity = "Rare";
  } else if (roll < 60) {
    rarity = "Uncommon";
  }

  const pool = TAROT_CARDS.filter(c => c.rarity === rarity);
  if (pool.length > 0) {
    const idx = crypto.randomInt(0, pool.length);
    return pool[idx];
  }

  // Fallback to random card from full deck
  const idx = crypto.randomInt(0, TAROT_CARDS.length);
  return TAROT_CARDS[idx];
}

module.exports = {
  TAROT_CARDS,
  getTarotReading,
  drawTarotCard
};
