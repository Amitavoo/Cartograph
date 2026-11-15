import * as os from "node:os";
import * as path from "node:path";
import puppeteer from "puppeteer-core";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureHeroHQ() {
  const tmpProfile = path.join(os.tmpdir(), "cartograph_hq_" + Date.now());
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    userDataDir: tmpProfile,
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
    },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();
    console.log("--> Navigating to http://localhost:3000 ...");
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 20000 });

    // Wait 5 seconds for video to load, play, and render high-res frames
    console.log("--> Waiting 5 seconds for video playback and UI stabilization ...");
    await sleep(5000);

    const assetTarget = path.join(__dirname, "..", "assets", "cardograph_hero_banner.png");
    const publicTarget = path.join(__dirname, "..", "public", "assets", "screenshots", "01_landing_hero.png");

    await page.screenshot({ path: assetTarget, type: "png" });
    await page.screenshot({ path: publicTarget, type: "png" });

    console.log(`[SUCCESS] Captured Ultra-HQ hero screenshot to:`);
    console.log(`  - ${assetTarget}`);
    console.log(`  - ${publicTarget}`);
  } catch (err) {
    console.error("Capture failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

captureHeroHQ();
