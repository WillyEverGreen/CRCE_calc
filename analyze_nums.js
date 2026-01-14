
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
        
        console.log(`Max Marks: ${result.subjects.map(s => s.totalMax).join(', ')}`);
        console.log(`Total Scrapped Max: ${result.maxMarksAll}`);
        
        let sum = 0;
        result.subjects.forEach(s => sum += s.totalMax);
        console.log(`Calculated Sum: ${sum}`);
        
        if (result.subjects.length > 10) console.log("WARNING: More than 10 subjects!");

      } catch (e) {
        console.error("Err", e);
      }
    }
  }
} catch (e) {
  console.error("ErrFs", e);
}
