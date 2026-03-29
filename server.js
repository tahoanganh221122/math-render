import express from "express";
import { chromium } from "playwright";

const app = express();
app.use(express.json({ limit: "2mb" }));

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildHtml({ title, items, closing }) {
  const body = (items || [])
    .map((item) => {
      if (item.type === "formula") {
        return `<div class="formula">\\[${item.value || ""}\\]</div>`;
      }
      return `<p>${escapeHtml(item.value || "")}</p>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Math Render</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.25/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.25/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.25/dist/contrib/auto-render.min.js"></script>
  <style>
    body{
      margin:0;
      background:#ffffff;
      font-family: Arial, sans-serif;
      color:#111;
    }
    .wrap{
      width:1200px;
      padding:40px 56px;
      box-sizing:border-box;
    }
    h1{
      font-size:40px;
      line-height:1.4;
      margin:0 0 20px 0;
      font-weight:700;
    }
    p{
      font-size:28px;
      line-height:1.7;
      margin:14px 0;
    }
    .formula{
      text-align:center;
      font-size:34px;
      margin:22px 0;
    }
    .closing{
      margin-top:30px;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(title || "")}</h1>
    ${body}
    <p class="closing">${escapeHtml(closing || "")}</p>
  </div>

  <script>
    window.addEventListener("load", function () {
      renderMathInElement(document.body, {
        delimiters: [
          { left: "\\\\(", right: "\\\\)", display: false },
          { left: "\\\\[", right: "\\\\]", display: true }
        ],
        throwOnError: false
      });
    });
  </script>
</body>
</html>`;
}

app.post("/render", async (req, res) => {
  const { title, items, closing } = req.body || {};

  if (!title || !Array.isArray(items) || !closing) {
    return res.status(400).json({ error: "Missing title/items/closing" });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 1600 },
      deviceScaleFactor: 2
    });

    const html = buildHtml({ title, items, closing });
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForTimeout(1200);

    const body = await page.locator("body");
    const png = await body.screenshot({ type: "png" });

    res.setHeader("Content-Type", "image/png");
    res.send(png);
  } finally {
    await browser.close();
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Math render service running on port " + port);
});