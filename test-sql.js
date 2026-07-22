const sql = `SELECT user_id, wins, best_attempts FROM guess_number_scores WHERE guild_id=? ORDER BY wins DESC, best_attempts ASC, updated_at ASC LIMIT 100`;
function parseOrderFromSql(sql) {
  const match = sql.match(/order\s+by\s+(.*?)(?:\s+limit|$)/i);
  if (!match) return {};
  const orderObj = {};
  match[1].split(",").forEach(p => {
    const parts = p.trim().split(/\s+/);
    if (parts.length >= 1) {
      const col = parts[0].replace(/[`\"']/g, "");
      const dir = (parts[1] && parts[1].toLowerCase() === "desc") ? -1 : 1;
      orderObj[col] = dir;
    }
  });
  return orderObj;
}
console.log(parseOrderFromSql(sql));
