
async function run() {
  try {
    const response = await fetch("http://localhost:3000/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prn: "MU0341120240233054", dob: "10-03-2006" }),
    });

    if (!response.ok) {
      console.error("Error:", response.status, await response.text());
      return;
    }

    const text = await response.text();
    console.log(text);
  } catch (e) {
    console.error(e);
  }
}

run();
