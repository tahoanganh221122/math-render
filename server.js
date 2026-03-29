app.post("/render", async (req, res) => {
  const { title, items, closing } = req.body || {};

  if (!title || !Array.isArray(items) || !closing) {
    return res.status(400).json({ error: "Missing title/items/closing" });
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
    await page.waitForTimeout(1500);

    const body = await page.locator("body");
    const png = await body.screenshot({ type: "png" });

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