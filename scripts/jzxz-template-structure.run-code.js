async (page) => {
  const groups = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll(".menu_lDCw60.jzxz > div"));
    return nodes.map((group, index) => {
      const top = group.querySelector("div.first_level_eJSoJ1.jzxz");
      const children = Array.from(group.querySelectorAll("div.second_GDKSG2.jzxz"));
      return {
        index,
        topText: top?.textContent?.trim() ?? null,
        childTexts: children.map((child) => child.textContent?.trim() ?? ""),
      };
    });
  });

  const subjects = await page.evaluate(() =>
    Array.from(document.querySelectorAll("div.subject_ttc0Lf.jzxz"))
      .map((node) => node.textContent?.trim() ?? "")
      .filter(Boolean)
      .slice(0, 20),
  );

  return {
    groupCount: groups.length,
    groups,
    subjects,
  };
}
