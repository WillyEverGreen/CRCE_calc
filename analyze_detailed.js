
const fs = require('fs');

try {
  const content = fs.readFileSync('output.txt', 'utf16le');
  const lines = content.split('\n');
  
  let found = false;
  for (const line of lines) {
    if (line.trim().startsWith('data: {"type":"result"')) {
      found = true;
      const jsonStr = line.trim().substring(6);
      try {
        const data = JSON.parse(jsonStr);
        const result = data.data;
        
        console.log(`Total Obtained: ${result.totalMarksAll}`);
        console.log(`Total Max: ${result.maxMarksAll}`);
        console.log("Subjects:");
        result.subjects.forEach((s, i) => {
            console.log(`${i+1}. [${s.subjectName}] Obt:${s.totalObt}/${s.totalMax} Grade:${s.grade}`);
        });
      } catch (e) {
        console.error("JSON Error", e);
      }
    }
  }
  if (!found) console.log("No result data found in output.txt");
} catch (e) {
  console.error("File Error", e);
}
