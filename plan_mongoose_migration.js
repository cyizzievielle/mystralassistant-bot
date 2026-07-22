const fs = require('fs');

const files = ['index.js', 'streak.js'];
let queries = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/db(Get|Run|All)\s*\(/)) {
      queries.push(`${file}:${i+1}: ${line.trim()}`);
    }
  }
}

fs.writeFileSync('queries_to_migrate.txt', queries.join('\n'));
console.log('Saved to queries_to_migrate.txt');
