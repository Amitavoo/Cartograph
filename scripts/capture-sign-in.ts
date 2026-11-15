import * as path from "node:path";
import puppeteer from "puppeteer-core";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUTPUT_DIR = "C:\\Users\\Acer\\.gemini\\antigravity\\brain\\75a4fcba-e6d2-4e99-87cf-7b6baffbb782\\screenshots";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureSignIn() {
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
    console.log("--> [11/11] Feature: Authentication & Protected Dashboard Gateway");
    await page.goto("http://localhost:3000/sign-in", { waitUntil: "domcontentloaded", timeout: 15000 });
    console.log("    Pausing 10 seconds to observe authentication interface...");
    await sleep(10000);
    const p11 = path.join(OUTPUT_DIR, "11_auth_sign_in_gateway.png");
    await page.screenshot({ path: p11 });
    console.log(`    Captured: ${p11}`);
  } finally {
    await browser.close();
  }
}

captureSignIn().catch((err) => {
  console.error("Error capturing sign-in:", err);
  process.exit(1);
});
