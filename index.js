const express = require("express");
const { chromium } = require("playwright");
const fs = require("fs/promises");
const path = require("path");
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.post("/screenshots", async (req, res) => {
  const data = req.body.data;

  if (!Array.isArray(data) || data.length === 0) {
    res.status(400).json({
      success: false,
      message: "Invalid data format",
    });
  }
  let browser;
  const results = [];

  const batchNumber = 3;
  try {
    fs.mkdir(path.join(__dirname, "uploads", "screenshots"), {
      recursive: true,
    });
    browser = await chromium.launch();
    const context = await browser.newContext();

    for (let i = 0; i < data.length; i += batchNumber) {
      const batch = data.slice(i, i + batchNumber);
      console.log("Processing batch:", batch);
      // Here you can add your logic to process each batch
      for (const url of batch) {
        console.log("Processing URL:", url);
        // Add your URL processing logic here

        const page = await context.newPage();
        await page.goto(url);
        const screenshotBuffer = await page.screenshot({
          path: `${Date.now()}.png`,
        });
        const filePath = path.join(
          __dirname,
          "uploads",
          "screenshots",
          `screenshot-${i}.png`
        );
        await fs.writeFile(filePath, screenshotBuffer);

        // push url screenshot path to data array
        results.push({
          url,
          filePath,
          screenshotUrl:
            req.protocol +
            "://" +
            req.get("host") +
            "/uploads/screenshots/" +
            path.basename(filePath),
        });

        await page.close();

        console.log(`Screenshot taken for ${url}`);
      }
      await context.close();

      res.json({ success: true, data: results });
    }
  } catch (error) {
    console.error("Error processing URLs:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
    return;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.post("/pdf", async (req, res) => {
  const { html } = req.body;
  if (!html) {
    res.status(400).json({
      success: false,
      message: "Invalid data format",
    });
  }
  let browser;

  try {
    fs.mkdir(path.join(__dirname, "uploads", "pdfs"), { recursive: true });
    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ format: "A4" });
    const filePath = path.join(
      __dirname,
      "uploads",
      "pdfs",
      `document-${Date.now()}.pdf`
    );
    await fs.writeFile(filePath, pdfBuffer);
    res.status(200).json({
      success: true,
      pdfUrl:
        req.protocol +
        "://" +
        req.get("host") +
        "/uploads/pdfs/" +
        path.basename(filePath),
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
