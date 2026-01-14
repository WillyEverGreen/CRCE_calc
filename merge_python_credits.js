const fs = require('fs');

const currentTs = fs.readFileSync('src/lib/creditMap.ts', 'utf8');
const scraped = JSON.parse(fs.readFileSync('final_credits_all.json', 'utf8'));

// Find insertion point (before pattern credits)
const closingBraceIndex = currentTs.lastIndexOf('};');

if (closingBraceIndex === -1) {
    console.error("Could not find closing brace!");
    process.exit(1);
}

let newEntries = "\n  // ========== HONORS & MINORS (PYTHON SCRAPED) ==========\n";
let count = 0;

for (const [code, data] of Object.entries(scraped)) {
    // Check if key already exists to avoid dupes (simple check)
    if (currentTs.includes(`"${code}":`)) {
        console.log(`Skipping existing: ${code}`);
        continue;
    }
    
    const credit = data.credit;
    const name = data.name.replace(/\s+/g, ' ').trim();
    newEntries += `  "${code}": ${credit}, // ${name}\n`;
    count++;
}

if (count > 0) {
    const updatedTs = currentTs.slice(0, closingBraceIndex) + newEntries + currentTs.slice(closingBraceIndex);
    fs.writeFileSync('src/lib/creditMap.ts', updatedTs);
    console.log(`Added ${count} new subjects.`);
} else {
    console.log("No new subjects to add.");
}
