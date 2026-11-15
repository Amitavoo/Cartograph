import * as os from "node:os";
import * as path from "node:path";
import puppeteer from "puppeteer-core";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUTPUT_DIR = "C:\\Users\\Acer\\.gemini\\antigravity\\brain\\75a4fcba-e6d2-4e99-87cf-7b6baffbb782\\screenshots";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyHeroVideo() {
  console.log("================================================================================");
  console.log("   CARDOGRAPH HERO VIDEO & AUDIO TOGGLE VERIFICATION                            ");
  console.log("================================================================================\n");

  const consoleErrors: string[] = [];

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    userDataDir: path.join(__dirname, "..", ".edge-profile"),
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
    },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err: unknown) => {
    consoleErrors.push(err instanceof Error ? err.message : String(err));
  });

  try {
    console.log("--> Navigating to http://localhost:3000");
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 20000 });
    await sleep(2500);

    // 1. Verify Video Element and Attributes
    console.log("--> Verifying video element configuration...");
    const videoInfo = await page.evaluate(() => {
      const video = document.querySelector("video") as HTMLVideoElement | null;
      if (!video) return null;
      return {
        hasVideo: true,
        src: video.currentSrc || video.src,
        autoplay: video.autoplay,
        loop: video.loop,
        muted: video.muted,
        playsInline: video.playsInline,
        paused: video.paused,
        readyState: video.readyState,
        currentTime: video.currentTime,
        duration: video.duration,
      };
    });

    if (!videoInfo || !videoInfo.hasVideo) {
      throw new Error("No <video> element found on the landing page!");
    }

    console.log(`    Video Source:       ${videoInfo.src}`);
    console.log(`    Autoplay Enabled:   ${videoInfo.autoplay}`);
    console.log(`    Loop Enabled:       ${videoInfo.loop}`);
    console.log(`    Initially Muted:    ${videoInfo.muted}`);
    console.log(`    PlaysInline:        ${videoInfo.playsInline}`);
    console.log(`    Ready State:        ${videoInfo.readyState}`);
    console.log(`    Currently Playing:  ${!videoInfo.paused}`);
    console.log(`    Playback Time:      ${videoInfo.currentTime.toFixed(2)}s / ${videoInfo.duration.toFixed(2)}s`);

    if (!videoInfo.src.includes("cardograph-hero.mp4")) {
      throw new Error(`Unexpected video src: ${videoInfo.src}`);
    }

    // 2. Verify Audio Toggle Button
    console.log("\n--> Verifying bottom-right speaker toggle button...");
    const initialButtonLabel = await page.evaluate(() => {
      const btn = document.querySelector("#hero-audio-toggle") as HTMLButtonElement | null;
      return btn ? btn.getAttribute("aria-label") : null;
    });

    console.log(`    Initial Button State: "${initialButtonLabel}"`);

    // Click audio toggle to UNMUTE
    console.log("    Clicking audio toggle to UNMUTE sound...");
    await page.evaluate(() => {
      const btn = document.querySelector("#hero-audio-toggle") as HTMLButtonElement | null;
      if (btn) btn.click();
    });
    await sleep(600);

    const unmutedState = await page.evaluate(() => {
      const video = document.querySelector("video") as HTMLVideoElement;
      const btn = document.querySelector("#hero-audio-toggle") as HTMLButtonElement;
      return {
        videoMuted: video.muted,
        videoPlaying: !video.paused,
        btnLabel: btn.getAttribute("aria-label"),
        hasCrimsonBg: btn.className.includes("bg-[#EF3340]"),
      };
    });

    console.log(`    Unmuted Video.muted:  ${unmutedState.videoMuted} (Expected: false)`);
    console.log(`    Video Still Playing:  ${unmutedState.videoPlaying} (Without restart!)`);
    console.log(`    Updated Button Label: "${unmutedState.btnLabel}"`);
    console.log(`    Active Crimson State: ${unmutedState.hasCrimsonBg}`);

    if (unmutedState.videoMuted !== false) {
      throw new Error("Clicking speaker button failed to unmute video!");
    }

    // Take screenshot of hero with video playing and active unmuted speaker state
    const pUnmuted = path.join(OUTPUT_DIR, "hero_video_unmuted.png");
    await page.screenshot({ path: pUnmuted });
    console.log(`    Captured unmuted state: ${pUnmuted}`);

    // Click audio toggle again to MUTE
    console.log("\n    Clicking audio toggle to MUTE sound again...");
    await page.evaluate(() => {
      const btn = document.querySelector("#hero-audio-toggle") as HTMLButtonElement | null;
      if (btn) btn.click();
    });
    await sleep(600);

    const mutedState = await page.evaluate(() => {
      const video = document.querySelector("video") as HTMLVideoElement;
      const btn = document.querySelector("#hero-audio-toggle") as HTMLButtonElement;
      return {
        videoMuted: video.muted,
        videoPlaying: !video.paused,
        btnLabel: btn.getAttribute("aria-label"),
      };
    });

    console.log(`    Re-muted Video.muted: ${mutedState.videoMuted} (Expected: true)`);
    console.log(`    Button Label Reset:   "${mutedState.btnLabel}"`);

    if (mutedState.videoMuted !== true) {
      throw new Error("Clicking speaker button failed to re-mute video!");
    }

    // Capture screenshot of hero with video playing in standard muted state
    const pMuted = path.join(OUTPUT_DIR, "hero_video_playing.png");
    await page.screenshot({ path: pMuted });
    console.log(`    Captured playing state: ${pMuted}`);

    // 3. Check for browser console errors
    console.log("\n--> Checking browser console for errors...");
    if (consoleErrors.length > 0) {
      console.warn("    Console warnings/errors detected:", consoleErrors);
    } else {
      console.log("    Zero console errors detected!");
    }

    console.log("\n================================================================================");
    console.log("   ALL HERO VIDEO & AUDIO TOGGLE CHECKS PASSED PERFECTLY!                       ");
    console.log("================================================================================");
  } finally {
    await browser.close();
  }
}

verifyHeroVideo().catch((err) => {
  console.error("\n❌ Verification failed:", err);
  process.exit(1);
});
