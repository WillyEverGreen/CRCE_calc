const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const { load } = require('cheerio');
const querystring = require('querystring');

const jar = new CookieJar();
const client = wrapper(axios.create({ 
    jar,
    withCredentials: true,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
}));

const BASE_URL = "https://crce-students.contineo.in/parents";
const CREDENTIALS = {
    username: "MU0341120240233054",
    dd: "10 ", // Space preserved
    mm: "03",
    yyyy: "2006"
};

// Credit Map from verified source
const CREDIT_MAP = {
    "25BSC12CE05": 2, "25PCC12CE05": 3, "25PCC12CE06": 4, "25PCC12CE07": 1,
    "25OE13CE1X": 2, "25MDMX1": 2, "25MDMX2": 2, "25MDMXX1": 2, "25MDMXX2": 2,
    "25AEC12CE02X": 2, "25VEC12CE01": 2, "25CEP12CE01": 2, "25DMX1": 4,
    "25DM31": 4, "25DM21": 4, "25HR02": 4
};
function getCredit(name) {
    const code = name.match(/\((.*?)\)/)?.[1]?.trim()?.replace(/\s/g,'');
    if(code && CREDIT_MAP[code]) return CREDIT_MAP[code];
    return 2; // default
}

(async () => {
    try {
        console.log("1. Fetching Login Page...");
        const loginPageRes = await client.get(`${BASE_URL}/`);
        const $login = load(loginPageRes.data);

        // Extract Form Data
        const form = $login("form").first();
        const action = form.attr("action") || "";
        const inputs = {};
        
        $login("input, select").each((_, el) => {
            const name = $login(el).attr("name");
            const val = $login(el).val() || $login(el).attr("value") || "";
            if (name) inputs[name] = val;
        });

        // Fill Credentials
        inputs['username'] = CREDENTIALS.username;
        inputs['dd'] = CREDENTIALS.dd; 
        inputs['mm'] = CREDENTIALS.mm;
        inputs['yyyy'] = CREDENTIALS.yyyy;
        
        // Remove password field if using DOB login (often causes conflicts)
        delete inputs['password']; 
        delete inputs['captcha-response']; 

        console.log("2. Submitting Login Form...", inputs);
        
        const loginRes = await client.post(`${BASE_URL}/${action}`, querystring.stringify(inputs), {
            maxRedirects: 5,
            headers: {
                'Origin': 'https://crce-students.contineo.in',
                'Referer': `${BASE_URL}/`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        if (loginRes.data.includes("Login") && !loginRes.data.includes("Dashboard")) {
             console.error("❌ Login Failed! Dumping inputs for debug:");
             console.log(inputs);
             // Check if maybe hidden fields were missed?
             return;
        }

        console.log("✅ Login Successful! Fetching Dashboard...");
        const $dashboard = load(loginRes.data);
        
        const subjectLinks = [];
        $dashboard('a[href*="task=ciedetails"]').each((_, el) => {
            subjectLinks.push($dashboard(el).attr('href'));
        });

        console.log(`Found ${subjectLinks.length} subjects.`);
        
        let totalObt = 0;
        let totalMax = 0;
        let totalCredits = 0;
        let totalPoints = 0;

        const startScrape = Date.now();

        // Sequential or Parallel? Parallel is faster.
        const promises = subjectLinks.map(async (href) => {
            try {
                const res = await client.get(href);
                const $sub = load(res.data);
                
                let name = $sub("caption").first().text().trim();
                if(!name) name = $sub("h3").text().trim(); 
                
                // Marks parsing
                let obt = 0, max = 0;
                let found = false;
                $sub("tr").each((_, tr) => {
                    const txt = $sub(tr).text();
                    if(txt.includes("/")) {
                        const parts = txt.match(/(\d+(\.\d+)?)\s*\/\s*(\d+)/);
                        if(parts) {
                            obt += parseFloat(parts[1]);
                            max += parseFloat(parts[3]);
                            found = true;
                        }
                    }
                });

                if(found && max > 0) {
                     const pct = (obt/max)*100;
                     let gp = 0;
                     if(pct>=85) gp=10; else if(pct>=80) gp=9; else if(pct>=70) gp=8;
                     else if(pct>=60) gp=7; else if(pct>=50) gp=6; else if(pct>=45) gp=5;
                     else if(pct>=40) gp=4; else gp=0;
                     
                     const credit = getCredit(name);
                     return { name, obt, max, credit, gp };
                }
            } catch(e) { console.log("Failed link", href); }
            return null;
        });

        const results = (await Promise.all(promises)).filter(r => r);
        const duration = (Date.now() - startScrape) / 1000;

        console.log(`\nScraped ${results.length} subjects in ${duration}s! (Pure HTTP)`);
        
        results.forEach(r => {
            console.log(`${r.name}: ${r.obt}/${r.max} (Cr: ${r.credit}, GP: ${r.gp})`);
            totalObt += r.obt;
            totalMax += r.max;
            totalPoints += (r.gp * r.credit);
            totalCredits += r.credit;
        });
        
        const sgpa = totalPoints / totalCredits;
        console.log("\n--- RESULT ---");
        console.log(`SGPA: ${sgpa.toFixed(2)}`);
        console.log(`Total Marks: ${totalObt} / ${totalMax}`);

    } catch (e) {
        console.error("Error:", e);
    }
})();
