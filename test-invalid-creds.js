const fetch = require('node-fetch');

async function testInvalidCredentials() {
  const prn = "INVALID123"; // Invalid PRN
  const dob = "01-01-2000";
  const url = "http://localhost:3000/api/scrape";
  const body = JSON.stringify({ prn, dob, forceRefresh: false });

  console.log("Testing invalid credentials...");
  console.log("PRN:", prn);
  console.log("DOB:", dob);
  
  try {
    const response = await fetch(url, { 
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body 
    });
    
    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));
    
    if (response.status === 429) {
      console.log("Rate limited - wait 10 seconds and try again");
      return;
    }
    
    const reader = response.body;
    let buffer = "";
    
    for await (const chunk of reader) {
      buffer += chunk.toString();
      console.log("Received chunk:", chunk.toString().substring(0, 200));
    }
    
    console.log("\n--- Full Response ---");
    console.log(buffer);
    
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

testInvalidCredentials();
