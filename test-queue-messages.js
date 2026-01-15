
const fetch = require('node-fetch');

const users = [
  { prn: "MU0341120240233054", dob: "10-03-2006" },
  { prn: "MU0341120240233075", dob: "22-10-2006" },
  { prn: "MU0341120240233082", dob: "20-03-2006" },
  { prn: "MU0341120240233086", dob: "29-07-2006" }
];

async function simulateUser(user, index) {
  try {
    console.log(`[User ${index+1}] ${user.prn} connecting...`);
    // Wait a random bit to stagger them slightly
    await new Promise(r => setTimeout(r, index * 200)); 

    const response = await fetch("http://127.0.0.1:3000/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...user, forceRefresh: true }),
    });

    if (!response.ok) {
      console.error(`[User ${index+1}] HTTP Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`[User ${index+1}] Response body: ${text}`);
      return;
    }

    const stream = response.body;
    stream.on('data', (chunk) => {
      const text = chunk.toString();
      const lines = text.split("\n\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.replace("data: ", ""));
            if (data.type === "progress") {
               // Log ALL progress to show the transition from Queue -> Processing
               console.log(`[User ${index+1}] 🟢 MSG: "${data.message}"`);
            } else if (data.type === "result") {
              console.log(`[User ${index+1}] ✅ Got Result! SGPA: ${data.data.sgpa}`);
            } else if (data.type === "error") {
              console.log(`[User ${index+1}] ❌ Error: ${data.error}`);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    });

    await new Promise((resolve) => stream.on('end', resolve));

  } catch (err) {
    console.error(`[User ${index+1}] Failed:`, err.code || err.message);
  }
}

// Start all users
(async () => {
  console.log("Starting concurrency test with 4 users...");
  const promises = users.map((u, i) => simulateUser(u, i));
  await Promise.all(promises);
})();
