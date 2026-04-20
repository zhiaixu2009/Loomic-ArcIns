async (page) => {
  page.setDefaultTimeout(20_000);

  const tooltip = page.locator('[role="tooltip"]');
  if (await tooltip.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(200);
  }

  const closeSelectors = [
    '[class*="close-circle"]',
    '[class*="closeCircle"]',
    'img[src*="close-circle"]',
    'img[alt*="close"]',
  ];

  for (const selector of closeSelectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click().catch(() => {});
      await page.waitForTimeout(300);
      break;
    }
  }

  const catalogsResponsePromise = page.waitForResponse((response) => {
    return (
      response.request().method() === "GET" &&
      response.status() === 200 &&
      response.url().includes("/cykj_community/catalogs") &&
      response.url().includes("catalogType=BNNA_GEN_TMPL")
    );
  });

  await page.getByText("模版", { exact: true }).first().click();
  const catalogs = await (await catalogsResponsePromise).json();

  return {
    topLevelCount: Array.isArray(catalogs) ? catalogs.length : null,
    catalogs,
  };
}
