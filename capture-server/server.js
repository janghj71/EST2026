// capture-server/server.js
// Puppeteer 기반 개인정보활용동의서 페이지 캡처 서버
// 포트: 3001 (vite proxy: /capture-api → http://localhost:3001)

const express  = require("express");
const cors     = require("cors");
const puppeteer = require("puppeteer");

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

/**
 * POST /consent-pages
 * body: {
 *   captureData: { ...ctx, c1, c2, c2id, c3, sigDataUrl },
 *   appUrl:      "http://localhost:5173"   (React 앱 origin)
 * }
 * response: {
 *   result: "OK",
 *   signstamp:  "<base64 JPEG>",   // 1페이지
 *   signstamp2: "<base64 JPEG>",   // 2페이지
 * }
 */
app.post("/consent-pages", async (req, res) => {
  const { captureData, appUrl } = req.body;

  if (!captureData || !appUrl) {
    return res.json({ result: "false", msg: "captureData 또는 appUrl 누락" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",   // 한글 폰트 힌팅 문제 방지
      ],
    });

    const page = await browser.newPage();

    // A4 너비 기준, 높이는 두 페이지 충분히 담을 크기
    await page.setViewport({ width: 900, height: 2400, deviceScaleFactor: 1.5 });

    // 탐색 전에 sessionStorage에 captureData 주입
    await page.evaluateOnNewDocument((data) => {
      try {
        sessionStorage.setItem("privacyConsentCaptureCtx", JSON.stringify(data));
      } catch (e) { /* ignore */ }
    }, captureData);

    const captureUrl = `${appUrl}/print/privacy-consent/capture`;
    console.log("[capture] URL:", captureUrl);

    await page.goto(captureUrl, { waitUntil: "networkidle0", timeout: 30_000 });

    // React 렌더 + 한글 폰트 로드 대기
    await page.waitForSelector("#pcp-capture-page1", { timeout: 10_000 });
    await new Promise((r) => setTimeout(r, 800));

    // 각 페이지 요소의 위치/크기 가져오기
    const [rect1, rect2] = await page.evaluate(() => {
      const el1 = document.getElementById("pcp-capture-page1");
      const el2 = document.getElementById("pcp-capture-page2");
      const toRect = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      };
      return [toRect(el1), toRect(el2)];
    });

    if (!rect1 || !rect2) {
      throw new Error("캡처 페이지 요소를 찾을 수 없습니다 (#pcp-capture-page1, #pcp-capture-page2)");
    }

    console.log("[capture] rect1:", rect1, "rect2:", rect2);

    // 페이지별 JPEG 캡처
    const [buf1, buf2] = await Promise.all([
      page.screenshot({ type: "jpeg", quality: 90, clip: rect1 }),
      page.screenshot({ type: "jpeg", quality: 90, clip: rect2 }),
    ]);

    res.json({
      result:     "OK",
      signstamp:  buf1.toString("base64"),
      signstamp2: buf2.toString("base64"),
    });

  } catch (err) {
    console.error("[capture] 오류:", err);
    res.json({ result: "false", msg: err.message || "캡처 실패" });
  } finally {
    if (browser) await browser.close();
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`✅ Capture server listening on http://localhost:${PORT}`);
});
