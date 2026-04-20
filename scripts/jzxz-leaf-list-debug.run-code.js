async (page) => {
  page.setDefaultTimeout(30000);

  const topName = "户型填色";
  const leafName = "家装平面";
  const leafCatalogId = "jiazhuangpingmian-hphx";

  const clickVisibleExactText = async (selector, text) => {
    const clicked = await page.evaluate(({ selector, text }) => {
      const nodes = Array.from(document.querySelectorAll(selector));
      const target = nodes.find((node) => {
        const value = node.textContent?.trim() ?? "";
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return (
          value === text &&
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0"
        );
      });
      if (!target) return false;
      target.scrollIntoView({ block: "center", inline: "center" });
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return true;
    }, { selector, text });

    if (!clicked) {
      throw new Error("VISIBLE_TARGET_NOT_FOUND:" + text);
    }

    await page.waitForTimeout(300);
  };

  const tooltip = page.locator('[role="tooltip"]');
  if (!(await tooltip.isVisible().catch(() => false))) {
    await page.getByText("模版", { exact: true }).first().click();
    await page.waitForTimeout(500);
  }

  await clickVisibleExactText("div.first_level_eJSoJ1.jzxz", topName);

  const listResponsePromise = page.waitForResponse((response) => {
    return (
      response.request().method() === "GET" &&
      response.status() === 200 &&
      response.url().includes("/cykj_community/templates?") &&
      response.url().includes("catalogId=" + leafCatalogId)
    );
  });

  await clickVisibleExactText("div.second_GDKSG2.jzxz", leafName);
  const rawList = await (await listResponsePromise).json();
  const templates = Array.isArray(rawList)
    ? rawList
    : Array.isArray(rawList?.data)
      ? rawList.data
      : Array.isArray(rawList?.list)
        ? rawList.list
        : [];

  const visibleTitles = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("div.subject_ttc0Lf.jzxz"))
      .map((node) => {
        const value = node.textContent?.trim() ?? "";
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0"
          ? value
          : null;
      })
      .filter(Boolean);
  });

  const heading = await page
    .locator("h3.heading_7rULvE.jzxz")
    .textContent()
    .catch(() => null);

  return {
    heading,
    listTitles: templates.map((item) => item?.title),
    visibleTitles,
  };
}
