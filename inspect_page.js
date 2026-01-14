const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    console.log("Navigating...");
    await page.goto('https://frcrce.ac.in/index.php/academics/autonomous-curriculum/syllabus', { waitUntil: 'networkidle' });
    
    // Screenshot to see what it looks like
    const screenshotPath = path.resolve('syllabus_page.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to: ${screenshotPath}`);

    // Get HTML of the main container
    const content = await page.content();
    fs.writeFileSync('page_content.html', content);
    console.log("HTML content saved to page_content.html");

    // Try to find elements with text "Electronics and Computer Science"
    const ecs = await page.getByText('Electronics and Computer Science').all();
    console.log(`Found ${ecs.length} elements with 'Electronics and Computer Science'`);

    await browser.close();
})();
