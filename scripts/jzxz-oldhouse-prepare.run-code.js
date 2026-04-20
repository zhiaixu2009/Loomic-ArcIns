async (page) => {
  page.setDefaultTimeout(30000);

  const topName = "旧房改造";
  const leafCatalogId = "jiufanggaizao-fd8c";

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

      if (!target) {
        return false;
      }

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

  const listResponsePromise = page.waitForResponse((response) => {
    return (
      response.request().method() === "GET" &&
      response.status() === 200 &&
      response.url().includes("/cykj_community/templates?") &&
      response.url().includes("catalogId=" + leafCatalogId)
    );
  });

  await clickVisibleExactText("div.first_level_eJSoJ1.jzxz", topName);
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

  return {
    titles: templates.map((item) => item?.title),
    visibleTitles,
    firstTitleMeta: templates[0]
      ? {
          raw: templates[0].title,
          json: JSON.stringify(templates[0].title),
          length: templates[0].title?.length ?? null,
          codes: Array.from(templates[0].title ?? "").map((char) => char.charCodeAt(0)),
        }
      : null,
  };
}
