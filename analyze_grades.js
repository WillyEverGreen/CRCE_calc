
const fs = require('fs');

const gradeToPoint = {
  O: 10, A: 9, B: 8, C: 7, D: 6, E: 5, P: 4, F: 0, NA: 0
};

try {
  const content = fs.readFileSync('output.txt', 'utf16le');
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.trim().startsWith('data: {"type":"result"')) {
      const jsonStr = line.trim().substring(6);
      try {
        const data = JSON.parse(jsonStr);
        const result = data.data;
        
        console.log(`Reported SGPA: ${result.sgpa}`);
        let sumPoints = 0;
        let count = 0;
        
        result.subjects.forEach((s, i) => {
            console.log(`${i+1}. ${s.subjectName.substring(0, 30)}... | ${s.percentage}% | Grade: ${s.grade} | Pt: ${s.gradePoint}`);
            if (s.gradePoint !== null) {
                sumPoints += s.gradePoint;
                count++;
            }
        });
        
        const calcSGPA = count > 0 ? sumPoints / count : 0;
        console.log(`Calculated SGPA (Mean): ${calcSGPA.toFixed(2)}`);
        
      } catch (e) {
        console.error("Err", e);
      }
    }
  }
} catch (e) {
  console.error("ErrFs", e);
}
