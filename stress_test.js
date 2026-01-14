const users = [
    { prn: "MU0341120240233054", dob: "10-03-2006" },
    { prn: "MU0341120240233075", dob: "22-10-2006" },
    { prn: "MU0341120240233082", dob: "20-03-2006" },
    { prn: "MU0341120240233086", dob: "29-07-2006" }
];

async function runTest() {
    console.log(`🚀 Starting stress test with ${users.length} simultaneous users...`);
    const startTime = Date.now();

    const promises = users.map(async (user, index) => {
        const userStart = Date.now();
        console.time(`User ${index+1} (${user.prn})`);
        
        try {
            const response = await fetch("http://localhost:3000/api/scrape", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    prn: user.prn, 
                    dob: user.dob,
                    forceRefresh: true // Force fresh scrape to test concurrency
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let finalResult = null;
            let queueMsgSeen = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const text = decoder.decode(value);
                const lines = text.split("\n\n");
                
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.replace("data: ", ""));
                            if (data.type === 'progress') {
                                if (data.message.includes("queue")) {
                                    if (!queueMsgSeen) {
                                        console.log(`⚠️ User ${index+1}: ${data.message}`);
                                        queueMsgSeen = true;
                                    }
                                }
                            } else if (data.type === 'result') {
                                finalResult = data.data;
                            } else if (data.type === 'error') {
                                throw new Error(data.error);
                            }
                        } catch (e) {}
                    }
                }
            }

            console.timeEnd(`User ${index+1} (${user.prn})`);
            if (finalResult) {
                console.log(`✅ User ${index+1} SUCCESS: SGPA ${finalResult.sgpa}`);
            } else {
                console.log(`❌ User ${index+1} FAILED: No result`);
            }

        } catch (error) {
            console.timeEnd(`User ${index+1} (${user.prn})`);
            console.error(`❌ User ${index+1} ERROR: ${error.message}`);
        }
    });

    await Promise.all(promises);
    console.log(`\n✨ Stress test completed in ${(Date.now() - startTime) / 1000}s`);
}

runTest();
