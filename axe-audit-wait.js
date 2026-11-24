const { chromium } = require('playwright');
const { injectAxe, checkA11y } = require('axe-playwright');

// Pages that work without authentication
const urls = [
  'http://localhost:3000/pt-BR/login',
  'http://localhost:3000/pt-BR/register',
  'http://localhost:3000/pt-BR/calendar',
  'http://localhost:3000/pt-BR/posts',
  'http://localhost:3000/pt-BR/brand',
  'http://localhost:3000/pt-BR/settings',
];

async function runAxeAudit() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const url of urls) {
    try {
      console.log(`\n🔍 Auditing: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for hydration to complete
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check the html lang attribute
      const htmlLang = await page.getAttribute('html', 'lang');
      console.log(`  HTML lang: ${htmlLang}`);

      // Check for main landmark
      const mainExists = await page.locator('main').count();
      console.log(`  Main elements: ${mainExists}`);

      // Check for h1
      const h1Count = await page.locator('h1').count();
      console.log(`  H1 elements: ${h1Count}`);

      await injectAxe(page);
      const results = await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: false }
      });

      if (results.violations && results.violations.length > 0) {
        console.log(`  ❌ ${results.violations.length} violations found:`);
        results.violations.forEach(v => {
          console.log(`    - [${v.impact}] ${v.id}: ${v.description}`);
          v.nodes.forEach(n => {
            console.log(`      Target: ${n.target.join(', ')}`);
          });
        });
      } else {
        console.log(`  ✅ No violations`);
      }

      if (results.incomplete && results.incomplete.length > 0) {
        console.log(`  ⚠️ ${results.incomplete.length} incomplete (needs manual review):`);
        results.incomplete.forEach(v => {
          console.log(`    - [${v.impact}] ${v.id}: ${v.description}`);
        });
      }

    } catch (error) {
      console.log(`  ⚠️ Error loading ${url}: ${error.message}`);
    }
  }

  await browser.close();
}

runAxeAudit().catch(console.error);