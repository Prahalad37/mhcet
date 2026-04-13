/**
 * Content language for merged question text (exam + results). Not UI i18n.
 * @param {import('express').Request} req
 * @returns {'en' | 'hi'}
 */
export function getContentLang(req) {
  const q = req.query?.lang;
  if (q === "hi" || q === "en") return q;

  const header =
    (typeof req.get === "function" && req.get("x-content-language")) ||
    req.headers?.["x-content-language"];
  const h = String(header || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (h === "hi" || h === "en") return h;

  const accept = String(
    (typeof req.get === "function" && req.get("accept-language")) ||
      req.headers?.["accept-language"] ||
      ""
  ).toLowerCase();
  if (accept.includes("hi")) return "hi";
  return "en";
}
