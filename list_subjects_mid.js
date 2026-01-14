
const fs = require('fs');
try {
  const content = fs.readFileSync('output.txt', 'utf16le');
  for (const line of content.split('\n')) {
    if (line.trim().startsWith('data: {"type":"result"')) {
      const r = JSON.parse(line.trim().substring(6)).data;
      
      console.log("SUBJECTS 2-9:");
      r.subjects.slice(1, 9).forEach((s, i) => {
         console.log(`${i+2}: ${s.subjectName}`);
      });
    }
  }
} catch (e) { console.error(e); }
