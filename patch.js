const fs = require('fs');
let content = fs.readFileSync('index.js', 'utf8');

// 1. Rename guessNumberLeaderboardV2 to handleTebakAngkaLeaderboard
const lbRegex = /async function guessNumberLeaderboardV2\([\s\S]*?return container;\r?\n\}/;
const lbReplacement = `async function handleTebakAngkaLeaderboard(client, guildId, interactionOrMessage, authorId) {
  const isInteraction = !!interactionOrMessage.commandName;
  if (isInteraction && !interactionOrMessage.deferred && !interactionOrMessage.replied) {
    await safeDefer(interactionOrMessage).catch(() => { });
  }

  const rows = await safeAll(
    \`SELECT user_id, wins, best_attempts
     FROM guess_number_scores
     WHERE guild_id=?
     ORDER BY wins DESC, best_attempts ASC, updated_at ASC
     LIMIT 100\`,
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
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent("-# Mystral   Tebak Angka"));

    const payload = { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } };
    return isInteraction ? interactionOrMessage.editReply(payload) : interactionOrMessage.reply(payload);
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
      const medal = medals[globalIdx] || \`**\${globalIdx + 1}.**\`;
      const best = row.best_attempts ? \` • best **\${row.best_attempts}x**\` : "";
      
      let displayName = \`<@\${row.user_id}>\`;
      try {
        const user = await client.users.fetch(row.user_id);
        if (user) displayName = \`**\${user.username}**\`;
      } catch (e) {}

      lines.push(\`\${medal} \${displayName} — **\${row.wins} win**\${best}\`);
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\\n")));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1));
    
    if (totalPages > 1) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(\`-# Halaman \${page + 1} dari \${totalPages} • Mystral Tebak Angka\`));
    } else {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(\`-# Mystral   Tebak Angka\`));
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
  const msg = isInteraction 
    ? await interactionOrMessage.editReply(payload) 
    : await interactionOrMessage.reply(payload);

  if (totalPages > 1) {
    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.customId.startsWith("talb_") && i.user.id === authorId,
      time: 60000
    });

    collector.on("collect", async (i) => {
      if (i.customId === "talb_prev") currentPage = Math.max(0, currentPage - 1);
      if (i.customId === "talb_next") currentPage = Math.min(totalPages - 1, currentPage + 1);
      
      const newComps = await buildPage(currentPage);
      await i.update({ components: newComps }).catch(() => {});
    });

    collector.on("end", async () => {
      const disabledComps = await buildPage(currentPage);
      if (disabledComps.length > 1) {
        disabledComps[1].components.forEach(b => b.setDisabled(true));
      }
      msg.edit({ components: disabledComps }).catch(() => {});
    });
  }
}`;

content = content.replace(lbRegex, lbReplacement);

// 2. Update callers of guessNumberLeaderboardV2
content = content.replace(
  /const container = await guessNumberLeaderboardV2\(message\.guild\.id\);\s*return message\.reply\(\{[\s\S]*?\}\);/,
  "return handleTebakAngkaLeaderboard(client, message.guild.id, message, message.author.id);"
);

content = content.replace(
  /const container = await guessNumberLeaderboardV2\(interaction\.guild\.id\);\s*return safeReply\(interaction, \{[\s\S]*?\}\);/,
  "return handleTebakAngkaLeaderboard(interaction.client, interaction.guild.id, interaction, interaction.user.id);"
);

fs.writeFileSync('index.js', content, 'utf8');
console.log('Patched');
