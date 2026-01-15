const fetch = require('node-fetch');

async function testValidation() {
  const tests = [
    { prn: "8888888", dob: "20-30-3000", expected: "PRN too short / Month invalid" },
    { prn: "12345678901", dob: "15-13-2000", expected: "Month > 12" },
    { prn: "12345678901", dob: "32-06-2000", expected: "Day > 31" },
    { prn: "12345678901", dob: "15-06-1800", expected: "Year < 1900" },
  ];
  
  for (const test of tests) {
    console.log(`\n--- Testing: PRN="${test.prn}", DOB="${test.dob}" ---`);
    console.log(`Expected: ${test.expected}`);
    
    try {
      const response = await fetch("http://localhost:3000/api/scrape", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prn: test.prn, dob: test.dob, forceRefresh: false })
      });
      
      let buffer = "";
      for await (const chunk of response.body) {
        buffer += chunk.toString();
      }
      
      // Extract the error message
      const errorMatch = buffer.match(/"error":"([^"]+)"/);
      if (errorMatch) {
        console.log(`Result: ${errorMatch[1]}`);
      } else {
        console.log("Result: No error (unexpected)");
        console.log("Buffer:", buffer.substring(0, 300));
      }
    } catch (err) {
      console.error("Fetch error:", err.message);
    }
    
    // Small delay between tests
    await new Promise(r => setTimeout(r, 500));
  }
}

testValidation();
