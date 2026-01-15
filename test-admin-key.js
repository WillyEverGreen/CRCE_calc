
const fetch = require('node-fetch');

async function check(port) {
  const url = `http://localhost:${port}/api/admin?key=saiisadmin`;
  try {
    console.log(`Checking ${url}...`);
    const res = await fetch(url);
    const data = await res.json();
    console.log(`Port ${port} status: ${res.status}`);
    console.log(`Response:`, data);
  } catch (e) {
    console.log(`Port ${port} failed: ${e.message}`);
  }
}

async function run() {
  await check(3000);
  await check(4000);
}

run();
