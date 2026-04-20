async (page) => {
  page.setDefaultTimeout(20_000);

  const topName = "效果渲染";
  const leafName = "建筑渲染";
  const templateTitle = "建筑晴天渲染";

  const tooltip = page.locator('[role="tooltip"]');
  if (!(await tooltip.isVisible().catch(() => false))) {
    await page.getByText("模版", { exact: true }).first().click();
    await page.waitForTimeout(800);
  }

  const group = page
    .locator(".menu_lDCw60.jzxz > div")
    .filter({ has: page.locator("div.first_level_eJSoJ1.jzxz", { hasText: topName }) })
    .first();

  await group.locator("div.first_level_eJSoJ1.jzxz").click();

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

  const listResponse = await listResponsePromise;
  const rawList = await listResponse.json();
  const templates = Array.isArray(rawList)
    ? rawList
    : Array.isArray(rawList?.data)
      ? rawList.data
      : Array.isArray(rawList?.list)
        ? rawList.list
        : [];

  const targetTemplate = templates.find((item) => item?.title === templateTitle) ?? null;
  if (!targetTemplate) {
    return {
      error: "TARGET_TEMPLATE_NOT_FOUND",
      listSize: templates.length,
      titles: templates.map((item) => item?.title).filter(Boolean),
    };
  }

  const detailResponsePromise = page.waitForResponse((response) => {
    return (
      response.request().method() === "GET" &&
      response.status() === 200 &&
      response
        .url()
        .includes("/cykj_community/templates/" + targetTemplate.templateId)
    );
  });

  await page
    .locator("div.subject_ttc0Lf.jzxz")
    .filter({ hasText: templateTitle })
    .first()
    .click();

  const detailResponse = await detailResponsePromise;
  const detail = await detailResponse.json();
  const detailRequestHeaders = await detailResponse.request().allHeaders();

  return {
    listSize: templates.length,
    firstFiveTitles: templates.slice(0, 5).map((item) => item?.title),
    targetTemplate,
    detail: {
      title: detail?.title ?? null,
      templateId: detail?.templateId ?? null,
      coverUrl: detail?.coverUrl ?? null,
      prompt: detail?.content?.prompt ?? null,
      baseImageList: detail?.content?.baseImageList ?? null,
      generateImage: detail?.content?.generateImage ?? null,
      catalogs: detail?.catalogs ?? null,
      requestHeaders: detailRequestHeaders,
    },
  };
}
