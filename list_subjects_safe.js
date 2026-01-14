
const fs = require('fs');
try {
  const content = fs.readFileSync('output.txt', 'utf16le');
  for (const line of content.split('\n')) {
    if (line.trim().startsWith('data: {"type":"result"')) {
      const r = JSON.parse(line.trim().substring(6)).data;
      
      console.log("SUBJECTS:");
      r.subjects.forEach((s, i) => {
         // Log each one separately to avoid buffer truncation if possible, 
         // though console.log is usually fine.
         // Let's print just the name line by line
         console.log(`${i+1}: ${s.subjectName.replace(/\n/g, ' ')}`);
      });
    }
  }
} catch (e) { console.error(e); }
