
const fs = require('fs');
try {
  const content = fs.readFileSync('output_weighted.txt', 'utf16le');
  for (const line of content.split('\n')) {
    if (line.trim().startsWith('data: {"type":"result"')) {
      const r = JSON.parse(line.trim().substring(6)).data;
      console.log(`Weighted SGPA: ${r.sgpa}`);
      
      let wSum = 0;
      let cSum = 0;
      
      r.subjects.forEach((s, i) => {
         const cr = s.credits !== undefined ? s.credits : 'N/A';
         console.log(`${i+1}. ${s.subjectName.substring(0,25)}... | Gr:${s.grade} (${s.gradePoint}) | Cr:${cr}`);
         if (s.gradePoint !== null) {
            wSum += s.gradePoint * (s.credits || 2);
            cSum += (s.credits || 2);
         }
      });
      console.log(`Manual Check: ${wSum} / ${cSum} = ${cSum>0 ? (wSum/cSum).toFixed(2) : 0}`);
    }
  }
} catch (e) { console.error(e); }
