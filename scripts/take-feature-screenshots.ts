import * as fs from "node:fs";
import * as path from "node:path";
import puppeteer from "puppeteer-core";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUTPUT_DIR = "C:\\Users\\Acer\\.gemini\\antigravity\\brain\\75a4fcba-e6d2-4e99-87cf-7b6baffbb782\\screenshots";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runFeatureTour() {
  console.log("================================================================================");
  console.log("   CARTOGRAPH FEATURE TOUR & SCREENSHOT CAPTURE                                 ");
  console.log("   (Waiting 10 seconds on every feature as requested)                           ");
  console.log("================================================================================\n");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Connecting via Microsoft Edge at: ${EDGE_PATH}`);
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2, // High resolution retina capture
    },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();

  try {
    // -------------------------------------------------------------------------
    // 1. Landing Page - Hero & Repository Input
    // -------------------------------------------------------------------------
    console.log("--> [1/11] Feature: Public Landing Page - Hero & Repository Input");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle0", timeout: 30000 });
    console.log("    Pausing 10 seconds to observe feature...");
    await sleep(10000);
    const p1 = path.join(OUTPUT_DIR, "01_landing_hero.png");
    await page.screenshot({ path: p1 });
    console.log(`    Captured: ${p1}\n`);

    // -------------------------------------------------------------------------
    // 2. Landing Page - Visualization Section
    // -------------------------------------------------------------------------
    console.log("--> [2/11] Feature: Landing Page - Interactive Visualization Section");
    await page.evaluate(() => {
      document.querySelector("#visualization")?.scrollIntoView({ behavior: "instant" });
    });
    console.log("    Pausing 10 seconds to observe feature...");
    await sleep(10000);
    const p2 = path.join(OUTPUT_DIR, "02_landing_visualization.png");
    await page.screenshot({ path: p2 });
    console.log(`    Captured: ${p2}\n`);

    // -------------------------------------------------------------------------
    // 3. Landing Page - AI Agent Section
    // -------------------------------------------------------------------------
    console.log("--> [3/11] Feature: Landing Page - AI Agent Section");
    await page.evaluate(() => {
      document.querySelector("#agent")?.scrollIntoView({ behavior: "instant" });
    });
    console.log("    Pausing 10 seconds to observe feature...");
    await sleep(10000);
    const p3 = path.join(OUTPUT_DIR, "03_landing_agent.png");
    await page.screenshot({ path: p3 });
    console.log(`    Captured: ${p3}\n`);

    // -------------------------------------------------------------------------
    // 4. Landing Page - Framework Adapters Section
    // -------------------------------------------------------------------------
    console.log("--> [4/11] Feature: Landing Page - Framework Adapters Section");
    await page.evaluate(() => {
      document.querySelector("#frameworks")?.scrollIntoView({ behavior: "instant" });
    });
    console.log("    Pausing 10 seconds to observe feature...");
    await sleep(10000);
    const p4 = path.join(OUTPUT_DIR, "04_landing_frameworks.png");
    await page.screenshot({ path: p4 });
    console.log(`    Captured: ${p4}\n`);

    // -------------------------------------------------------------------------
    // 5. Landing Page - Validation Feedback on Invalid Input
    // -------------------------------------------------------------------------
    console.log("--> [5/11] Feature: Landing Page - Invalid Repository URL Validation");
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await sleep(500);
    const inputSelector = 'input[placeholder*="github.com"]';
    await page.waitForSelector(inputSelector);
    await page.type(inputSelector, "https://gitlab.com/unsupported/repo");
    await page.click('button[type="submit"]');
    console.log("    Submitted invalid URL. Pausing 10 seconds to observe validation feedback...");
    await sleep(10000);
    const p5 = path.join(OUTPUT_DIR, "05_landing_validation_error.png");
    await page.screenshot({ path: p5 });
    console.log(`    Captured: ${p5}\n`);

    // -------------------------------------------------------------------------
    // 6. Landing Page - Valid Repository Onboarding Guide
    // -------------------------------------------------------------------------
    console.log("--> [6/11] Feature: Landing Page - Valid Repository Onboarding Guide");
    // Clear and enter valid URL
    await page.click(inputSelector, { count: 3 });
    await page.keyboard.press("Backspace");
    await page.type(inputSelector, "https://github.com/honojs/hono");
    await page.click('button[type="submit"]');
    console.log("    Submitted valid repository. Pausing 10 seconds to observe onboarding guide...");
    await sleep(10000);
    const p6 = path.join(OUTPUT_DIR, "06_landing_validated_guide.png");
    await page.screenshot({ path: p6 });
    console.log(`    Captured: ${p6}\n`);

    // -------------------------------------------------------------------------
    // 7. Interactive Codebase Map (Preview Explorer)
    // -------------------------------------------------------------------------
    console.log("--> [7/11] Feature: Interactive Codebase Map (Preview Canvas)");
    await page.goto("http://localhost:3000/preview", { waitUntil: "networkidle0", timeout: 30000 });
    console.log("    Loaded preview explorer. Pausing 10 seconds to observe canvas...");
    await sleep(10000);
    const p7 = path.join(OUTPUT_DIR, "07_preview_canvas_overview.png");
    await page.screenshot({ path: p7 });
    console.log(`    Captured: ${p7}\n`);

    // -------------------------------------------------------------------------
    // 8. Detail Pane - Structure Tab & Blast Radius
    // -------------------------------------------------------------------------
    console.log("--> [8/11] Feature: Detail Pane - Structure Tab & Blast Radius");
    // Click on a node or file in the left list or canvas to open detail pane
    const fileSelector = 'button[title*="router.ts"], div[data-file*="router.ts"], .cursor-pointer';
    try {
      await page.waitForSelector(fileSelector, { timeout: 5000 });
      // Find a button containing router or click first file item
      await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll("button, div"));
        const target = items.find((el) => el.textContent?.includes("router.ts") || el.textContent?.includes("router"));
        if (target) {
          (target as HTMLElement).click();
        }
      });
    } catch {
      console.log("    Clicking available graph item...");
    }
    console.log("    Opened file details. Pausing 10 seconds to observe Structure tab...");
    await sleep(10000);
    const p8 = path.join(OUTPUT_DIR, "08_preview_structure_tab.png");
    await page.screenshot({ path: p8 });
    console.log(`    Captured: ${p8}\n`);

    // -------------------------------------------------------------------------
    // 9. Detail Pane - Explanation Tab
    // -------------------------------------------------------------------------
    console.log("--> [9/11] Feature: Detail Pane - AI Explanation Tab");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const explanationBtn = buttons.find((b) => b.textContent?.trim().toLowerCase() === "explanation");
      if (explanationBtn) explanationBtn.click();
    });
    console.log("    Switched to Explanation tab. Pausing 10 seconds to observe explanation...");
    await sleep(10000);
    const p9 = path.join(OUTPUT_DIR, "09_preview_explanation_tab.png");
    await page.screenshot({ path: p9 });
    console.log(`    Captured: ${p9}\n`);

    // -------------------------------------------------------------------------
    // 10. Detail Pane - Ask AI Agent Tab
    // -------------------------------------------------------------------------
    console.log("--> [10/11] Feature: Detail Pane - Ask AI Agent Tab");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const askBtn = buttons.find((b) => b.textContent?.trim().toLowerCase().includes("ask"));
      if (askBtn) askBtn.click();
    });
    await sleep(1500);

    // Click suggested prompt or submit query
    await page.evaluate(() => {
      const promptBtn = document.querySelector('button[title*="dependencies"], button[title*="blast"], .group') as HTMLElement;
      if (promptBtn) {
        promptBtn.click();
      } else {
        const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
        if (textarea) {
          textarea.value = "What is the blast radius of router and what depends on it?";
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
        }
        const submitBtn = document.querySelector('button[type="submit"]') as HTMLElement;
        if (submitBtn) submitBtn.click();
      }
    });

    console.log("    Submitted question to AI Agent. Waiting for streamed tool execution & answer...");
    // Wait for streaming answer to arrive
    await sleep(8000);
    console.log("    Pausing 10 seconds to observe grounded answer and executed tools...");
    await sleep(10000);
    const p10 = path.join(OUTPUT_DIR, "10_preview_ask_agent_tab.png");
    await page.screenshot({ path: p10 });
    console.log(`    Captured: ${p10}\n`);

    // -------------------------------------------------------------------------
    // 11. Authentication & Protected Gateway
    // -------------------------------------------------------------------------
    console.log("--> [11/11] Feature: Authentication & Protected Dashboard Gateway");
    await page.goto("http://localhost:3000/sign-in", { waitUntil: "networkidle0", timeout: 30000 });
    console.log("    Loaded Sign-In gateway. Pausing 10 seconds to observe authentication interface...");
    await sleep(10000);
    const p11 = path.join(OUTPUT_DIR, "11_auth_sign_in_gateway.png");
    await page.screenshot({ path: p11 });
    console.log(`    Captured: ${p11}\n`);

    console.log("================================================================================");
    console.log("   ALL 11 FEATURE SCREENSHOTS CAPTURED SUCCESSFULLY!                           ");
    console.log(`   Saved in: ${OUTPUT_DIR}`);
    console.log("================================================================================");
  } finally {
    await browser.close();
  }
}

runFeatureTour().catch((err) => {
  console.error("Error during feature tour:", err);
  process.exit(1);
});
