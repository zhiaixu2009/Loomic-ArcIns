async (page) => {
  const targetText = "效果渲染";
  const group = page
    .locator(".menu_lDCw60.jzxz > div")
    .filter({ has: page.locator("div.first_level_eJSoJ1.jzxz", { hasText: targetText }) })
    .first();

  await group.locator("div.first_level_eJSoJ1.jzxz").click();
  await page.waitForTimeout(800);

  const childTexts = await group.locator("div.second_GDKSG2.jzxz").allInnerTexts();
  const subjects = await page.locator("div.subject_ttc0Lf.jzxz").evaluateAll((nodes) =>
    nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean).slice(0, 20),
  );

  return {
    targetText,
    childTexts,
    subjects,
  };
}
