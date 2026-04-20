async (page) => {
  page.setDefaultTimeout(15000);

  const tooltip = page.locator('[role="tooltip"]');
  if (!(await tooltip.isVisible().catch(() => false))) {
    await page.getByText("模版", { exact: true }).first().click();
    await page.waitForTimeout(500);
  }

  const topName = "效果渲染";
  const leafName = "建筑渲染";
  const group = page
    .locator(".menu_lDCw60.jzxz > div")
    .filter({ has: page.locator("div.first_level_eJSoJ1.jzxz", { hasText: topName }) })
    .first();

  await group.locator("div.first_level_eJSoJ1.jzxz").click();
  await page.waitForTimeout(250);

  const listResponsePromise = page.waitForResponse((response) => {
    return (
      response.request().method() === "GET" &&
      response.status() === 200 &&
      response.url().includes("/cykj_community/templates?") &&
      response.url().includes("catalogId=jianzhuxuanran-aibm")
    );
  });

  await group
    .locator("div.second_GDKSG2.jzxz")
    .filter({ hasText: leafName })
    .first()
    .click();

  await listResponsePromise;

  const cards = page.locator("div.subject_ttc0Lf.jzxz");
  const targets = [
    { sortOrder: 1, templateId: "698ec3d329ec4c43ff9a878c", title: "建筑晴天渲染" },
    { sortOrder: 2, templateId: "698fda5f574d64bb8e1e4993", title: "写实建筑渲染" }
  ];
  const details = [];

  for (const target of targets) {
    const card = page
      .locator("div.subject_ttc0Lf.jzxz")
      .filter({ hasText: target.title })
      .first();
    await card.scrollIntoViewIfNeeded().catch(() => {});
    const detailResponsePromise = page.waitForResponse((response) => {
      return (
        response.request().method() === "GET" &&
        response.status() === 200 &&
        response.url().includes("/cykj_community/templates/" + target.templateId)
      );
    });
    await card.click();
    const detail = await (await detailResponsePromise).json();
    details.push({
      sortOrder: target.sortOrder,
      title: detail?.title ?? null,
      templateId: detail?.templateId ?? null
    });
  }

  return { details };
}
