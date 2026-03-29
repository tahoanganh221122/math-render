const express = require("express");
const { chromium } = require("playwright");

const app = express();

app.use(express.json({ limit: "1mb" }));

function buildHtml({ title, items, closing }) {
  return `
  <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          font-family: Arial;
          padding: 40px;
          font-size: 28px;
        }
        .title {
          font-weight: bold;
          font-size: 36px;
          margin-bottom: 20px;
        }
        .formula {
          margin: 10px 0;
          text-align: center;
          font-size: 34px;
        }
      </style>
    </head>
    <body>
      <div class="title">${title}</div>
      ${items
        .map((item) => {
          if (item.type === "text") {
            return `<div>${item.value}</div>`;
          }
          if (item.type === "formula") {
            return `<div class="formula">\\(${item.value}\\)</div>`;
          }
          return "";
        })
        .join("")}
      <div style="margin-top:20px;">${closing}</div>

      <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    </body>
  </html>
  `;
}

app.post("/render", async (req, res) => {
  console.log("BODY:", req.body);

  const { title, items, closing } = req.body || {};

  if (!title || !Array.isArray(items) || !closing) {
    return res.status(400).json({
      error: "missing_fields",
      message: "Missing title/items/closing",
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
      viewport: { width: 1200, height: 1600 },
      deviceScaleFactor: 2
    });

    const html = buildHtml({ title, items, closing });

    await page.setContent(html, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const png = await page.screenshot({ type: "png", fullPage: true });

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
