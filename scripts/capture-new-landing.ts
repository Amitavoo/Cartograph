import * as path from "node:path";
import puppeteer from "puppeteer-core";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUTPUT_DIR = "C:\\Users\\Acer\\.gemini\\antigravity\\brain\\75a4fcba-e6d2-4e99-87cf-7b6baffbb782\\screenshots";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureNewLanding() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
    },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  try {
    console.log("--> Navigating to http://localhost:3000");
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 20000 });
    await sleep(3000);

    // 1. Hero
    const p1 = path.join(OUTPUT_DIR, "hero_split_layout.png");
    await page.screenshot({ path: p1 });
    console.log(`Captured: ${p1}`);

    // 2. Visualization
    await page.evaluate(() => {
      document.querySelector("#visualization")?.scrollIntoView({ behavior: "instant" });
    });
    await sleep(1500);
    const p2 = path.join(OUTPUT_DIR, "visualization_section.png");
    await page.screenshot({ path: p2 });
    console.log(`Captured: ${p2}`);

    // 3. AI Assistant
    await page.evaluate(() => {
      document.querySelector("#agent")?.scrollIntoView({ behavior: "instant" });
    });
    await sleep(1500);
    const p3 = path.join(OUTPUT_DIR, "ai_assistant_section.png");
    await page.screenshot({ path: p3 });
    console.log(`Captured: ${p3}`);

    // 4. Frameworks
    await page.evaluate(() => {
      document.querySelector("#frameworks")?.scrollIntoView({ behavior: "instant" });
    });
    await sleep(1500);
    const p4 = path.join(OUTPUT_DIR, "frameworks_section.png");
    await page.screenshot({ path: p4 });
    console.log(`Captured: ${p4}`);

    // 5. Workflow & Final CTA
    await page.evaluate(() => {
      document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "instant" });
    });
    await sleep(1500);
    const p5 = path.join(OUTPUT_DIR, "workflow_and_waveform.png");
    await page.screenshot({ path: p5 });
    console.log(`Captured: ${p5}`);
  } finally {
    await browser.close();
  }
}

captureNewLanding().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
