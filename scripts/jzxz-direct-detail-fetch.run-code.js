async (page) => {
  const templateId = "698ec3d329ec4c43ff9a878c";
  const response = await page.evaluate(async (currentTemplateId) => {
    const result = await fetch(
      "https://community-backend.soutushenqi.com/cykj_community/templates/" + currentTemplateId,
      {
        method: "GET",
        credentials: "include",
        headers: {
          accept: "application/json, text/plain, */*",
          lang: "zh-CN",
          "product-type": "JZXZ",
          timestamp: String(Date.now()),
        },
      },
    );

    const text = await result.text();
    return {
      ok: result.ok,
      status: result.status,
      text,
    };
  }, templateId);

  return response;
}
