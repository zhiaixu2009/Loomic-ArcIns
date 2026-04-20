async (page) => {
  const firstSubject = page.locator("div.subject_ttc0Lf.jzxz").first();
  await firstSubject.hover();
  await page.waitForTimeout(600);

  const data = await page.evaluate(() => {
    const visibleNodes = Array.from(document.querySelectorAll("img"))
      .map((image) => {
        const rect = image.getBoundingClientRect();
        const style = window.getComputedStyle(image);
        return {
          src: image.getAttribute("src"),
          alt: image.getAttribute("alt"),
          width: rect.width,
          height: rect.height,
          visible:
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== "hidden" &&
            style.display !== "none" &&
            style.opacity !== "0",
        };
      })
      .filter((item) => item.visible);

    return {
      subjectCount: document.querySelectorAll("div.subject_ttc0Lf.jzxz").length,
      visibleImages: visibleNodes.slice(-20),
      hoveredText:
        document.querySelector("div.subject_ttc0Lf.jzxz")?.textContent?.trim() ?? null,
    };
  });

  return data;
}
