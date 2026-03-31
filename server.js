const express = require("express");
const { chromium } = require("playwright");

const app = express();

app.use(express.json({ limit: "10mb" }));

app.post("/render", async (req, res) => {
  const { html } = req.body || {};

  if (!html) {
    return res.status(400).json({
      error: "missing_html",
      message: "Missing html",
      body: req.body
    });
  }

  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });

    const page = await browser.newPage({
      viewport: { width: 1300, height: 2000 },
      deviceScaleFactor: 2
    });

    await page.setContent(html, { waitUntil: "load" });

    await page.waitForTimeout(2500);

    const png = await page.screenshot({
      type: "png",
      fullPage: true
    });

    res.setHeader("Content-Type", "image/png");
    return res.send(png);
  } catch (err) {
    console.error("RENDER_ERROR:", err);
    return res.status(500).json({
      error: "render_failed",
      message: String(err)
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.get("/", (req, res) => {
  res.send("OK");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});