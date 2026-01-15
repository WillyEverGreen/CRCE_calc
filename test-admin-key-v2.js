
async function check(port) {
  const url = `http://localhost:${port}/api/admin?key=saiisadmin`;
  try {
    console.log(`Checking ${url}...`);
    const res = await fetch(url);
    if (res.ok) {
        console.log(`Port ${port} SUCCESS: ${res.status}`);
        const text = await res.text();
        console.log(`Body: ${text.substring(0, 100)}...`);
    } else {
        console.log(`Port ${port} HTTP ERROR: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`Body: ${text}`);
    }
  } catch (e) {
    console.log(`Port ${port} CONNECTION FAILED: ${e.message}`);
    if (e.cause) console.log(e.cause);
  }
}

async function run() {
  await check(3000);
  // await check(4000);
}

run();
