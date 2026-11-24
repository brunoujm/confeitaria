const { chromium } = require('playwright');
const { injectAxe, checkA11y } = require('axe-playwright');

const urls = [
  'http://localhost:3000/pt-BR/login',
  'http://localhost:3000/pt-BR/register',
  'http://localhost:3000/pt-BR/calendar',
  'http://localhost:3000/pt-BR/posts',
  'http://localhost:3000/pt-BR/gallery',
  'http://localhost:3000/pt-BR/templates',
  'http://localhost:3000/pt-BR/brand',
  'http://localhost:3000/pt-BR/settings',
  'http://localhost:3000/pt-BR/settings/ai',
  'http://localhost:3000/pt-BR/settings/account',
];

async function runAxeAudit() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const allResults = [];

  for (const url of urls) {
    try {
      console.log(`\n🔍 Auditing: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await injectAxe(page);
      const results = await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: false }
      });

      if (results.violations.length > 0) {
        console.log(`  ❌ ${results.violations.length} violations found:`);
        results.violations.forEach(v => {
          console.log(`    - [${v.impact}] ${v.id}: ${v.description}`);
          v.nodes.forEach(n => {
            console.log(`      Target: ${n.target.join(', ')}`);
            console.log(`      HTML: ${n.html.substring(0, 150)}...`);
          });
        });
        allResults.push({ url, violations: results.violations });
      } else {
        console.log(`  ✅ No violations`);
      }

      // Also check incomplete (needs manual review)
      if (results.incomplete.length > 0) {
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

  // Summary
  console.log('\n\n========== SUMMARY ==========');
  let totalViolations = 0;
  allResults.forEach(r => {
    totalViolations += r.violations.length;
    console.log(`${r.url}: ${r.violations.length} violations`);
  });
  console.log(`Total violations: ${totalViolations}`);
}

runAxeAudit().catch(console.error);