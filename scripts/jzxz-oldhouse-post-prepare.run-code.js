async (page) => {
  page.setDefaultTimeout(30000);

  const targetTitle = "建筑立面改造";

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

  const clicked = await page.evaluate((text) => {
    const nodes = Array.from(document.querySelectorAll("div.subject_ttc0Lf.jzxz"));
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
  }, targetTitle);

  let detailResponseUrl = null;
  const detailStatus = await page
    .waitForResponse((response) => {
      return (
        response.request().method() === "GET" &&
        response.status() === 200 &&
        response.url().includes("/cykj_community/templates/")
      );
    }, { timeout: 5000 })
    .then((response) => {
      detailResponseUrl = response.url();
      return "response";
    })
    .catch(() => "timeout");

  return {
    visibleTitles,
    clicked,
    detailStatus,
    detailResponseUrl,
  };
}
