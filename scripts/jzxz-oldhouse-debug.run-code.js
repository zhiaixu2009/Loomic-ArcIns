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
      if (!target) return false;
      target.scrollIntoView({ block: "center", inline: "center" });
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return true;
    }, { selector, text });

    if (!clicked) {
      throw new Error("VISIBLE_TARGET_NOT_FOUND:" + text);
    }

    await page.waitForTimeout(400);
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

  const firstTitle = templates[0]?.title ?? null;
  let detailResponseUrl = null;
  let detailStatus = "not-attempted";

  if (firstTitle) {
    const detailResponsePromise = page
      .waitForResponse((response) => {
        return (
          response.request().method() === "GET" &&
          response.status() === 200 &&
          response.url().includes("/cykj_community/templates/")
        );
      }, { timeout: 4000 })
      .then((response) => {
        detailResponseUrl = response.url();
        detailStatus = "response";
        return response;
      })
      .catch(() => {
        detailStatus = "timeout";
        return null;
      });

    await clickVisibleExactText("div.subject_ttc0Lf.jzxz", firstTitle);
    await detailResponsePromise;
    await page.waitForTimeout(400);
  }

  const panel = await page.evaluate(() => {
    const root = document.querySelector('[role="tooltip"]');
    const heading = document.querySelector("h3.heading_7rULvE.jzxz")?.textContent?.trim() ?? null;
    const activeTitles = Array.from(document.querySelectorAll("div.subject_ttc0Lf.jzxz"))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        const value = node.textContent?.trim() ?? "";
        const background = style.backgroundColor;
        const borderColor = style.borderColor;
        const ariaPressed =
          node.getAttribute("aria-pressed") ??
          node.querySelector("[aria-pressed]")?.getAttribute("aria-pressed") ??
          null;

        if (
          rect.width <= 0 ||
          rect.height <= 0 ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0"
        ) {
          return null;
        }

        return {
          value,
          background,
          borderColor,
          ariaPressed,
          className: node.className,
        };
      })
      .filter(Boolean);
    const visibleButtons = Array.from(document.querySelectorAll("button, div, a"))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        const value = node.textContent?.trim() ?? "";

        if (
          value.length === 0 ||
          rect.width <= 0 ||
          rect.height <= 0 ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0"
        ) {
          return null;
        }

        return {
          value,
          className: node.className,
          tagName: node.tagName,
        };
      })
      .filter((item) => item && item.value.length <= 20)
      .slice(0, 120);
    const textBlocks = root
      ? Array.from(root.querySelectorAll("div, p, span"))
          .map((node) => node.textContent?.trim() ?? "")
          .filter((value) => value.length > 8)
          .slice(0, 40)
      : [];
    const visibleImages = Array.from(document.querySelectorAll("img"))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0"
          ? node.getAttribute("src")
          : null;
      })
      .filter(Boolean)
      .slice(-20);

    return {
      heading,
      activeTitles,
      visibleButtons,
      textBlocks,
      visibleImages,
    };
  });

  return {
    titles: templates.map((item) => item?.title),
    firstTitle,
    detailStatus,
    detailResponseUrl,
    panel,
  };
}
