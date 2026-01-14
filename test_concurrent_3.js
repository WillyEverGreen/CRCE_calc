import fetch from 'node-fetch';

const credentials = [
  { prn: 'MU0341120240233054', dob: '10-03-2006' },
  { prn: 'MU0341120240233075', dob: '22-10-2006' },
  { prn: 'MU0341120240233082', dob: '20-03-2006' }
];

async function testConcurrent() {
  console.log('🚀 Starting 3 concurrent requests...\n');
  const startTime = Date.now();

  const promises = credentials.map(async (cred, index) => {
    const reqStart = Date.now();
    console.log(`[Request ${index + 1}] Starting: ${cred.prn}`);

    try {
      const response = await fetch('http://localhost:3000/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred)
      });

      const reader = response.body;
      let result = null;

      for await (const chunk of reader) {
        const text = chunk.toString();
        const lines = text.split('\n').filter(line => line.startsWith('data: '));
        
        for (const line of lines) {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'progress') {
            console.log(`[Request ${index + 1}] ${data.message}`);
          } else if (data.type === 'result') {
            result = data.data;
          } else if (data.type === 'error') {
            throw new Error(data.error);
          }
        }
      }

      const duration = ((Date.now() - reqStart) / 1000).toFixed(2);
      console.log(`[Request ${index + 1}] ✅ Completed in ${duration}s - SGPA: ${result?.sgpa || 'N/A'}\n`);
      
      return { success: true, prn: cred.prn, sgpa: result?.sgpa, duration };
    } catch (error) {
      const duration = ((Date.now() - reqStart) / 1000).toFixed(2);
      console.log(`[Request ${index + 1}] ❌ Failed in ${duration}s: ${error.message}\n`);
      
      return { success: false, prn: cred.prn, error: error.message, duration };
    }
  });

  const results = await Promise.all(promises);
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n========== SUMMARY ==========');
  console.log(`Total Time: ${totalTime}s`);
  console.log(`Successful: ${results.filter(r => r.success).length}/3`);
  console.log(`Failed: ${results.filter(r => !r.success).length}/3`);
  
  results.forEach((r, i) => {
    if (r.success) {
      console.log(`  ${i + 1}. ${r.prn}: ✅ SGPA ${r.sgpa} (${r.duration}s)`);
    } else {
      console.log(`  ${i + 1}. ${r.prn}: ❌ ${r.error} (${r.duration}s)`);
    }
  });
}

testConcurrent().catch(console.error);
