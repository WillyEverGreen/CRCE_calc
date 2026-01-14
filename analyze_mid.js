
const fs = require('fs');

try {
  const content = fs.readFileSync('output.txt', 'utf16le');
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.trim().startsWith('data: {"type":"result"')) {
      const jsonStr = line.trim().substring(6);
      try {
        const data = JSON.parse(jsonStr);
        const result = data.data;
        
        result.subjects.slice(1, 9).forEach((s, i) => {
            console.log(`${i+2}.${s.subjectName}:${s.totalMax}`);
        });
      } catch (e) {
        console.error("Err", e);
      }
    }
  }
} catch (e) {
  console.error("ErrFs", e);
}
