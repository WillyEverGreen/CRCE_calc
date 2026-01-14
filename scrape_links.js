const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  console.log("Navigating to syllabus page...");
  await page.goto('https://frcrce.ac.in/index.php/academics/autonomous-curriculum/syllabus');

  console.log("Extracting links...");
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => ({
        text: a.innerText.trim() || a.textContent.trim(),
        href: a.href
      }))
      .filter(link => link.href.toLowerCase().endsWith('.pdf'));
  });

  console.log("Found PDF Links:");
  links.forEach(l => console.log(`- [${l.text}] ${l.href}`));

  await browser.close();
})();
