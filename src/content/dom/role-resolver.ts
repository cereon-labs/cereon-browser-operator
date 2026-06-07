/**
 * Resolves an element's ARIA role.
 *
 * Honors an explicit `role` attribute, then input-type-specific roles, then a
 * tag→role fallback table. Pure (no DOM mutation), so it's directly unit tested
 * against jsdom elements.
 */

const TAG_TO_ROLE: Record<string, string> = {
  a: "link",
  button: "button",
  input: "textbox",
  textarea: "textbox",
  select: "combobox",
  img: "img",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  nav: "navigation",
  main: "main",
  header: "banner",
  footer: "contentinfo",
  aside: "complementary",
  form: "form",
  table: "table",
  tr: "row",
  th: "columnheader",
  td: "cell",
  ul: "list",
  ol: "list",
  li: "listitem",
  dialog: "dialog",
  details: "group",
  summary: "button",
  progress: "progressbar",
  meter: "meter",
  video: "video",
  audio: "audio",
  section: "region",
  article: "article",
};

const INPUT_TYPE_TO_ROLE: Record<string, string> = {
  checkbox: "checkbox",
  radio: "radio",
  range: "slider",
  button: "button",
  submit: "button",
  reset: "button",
  search: "searchbox",
  number: "spinbutton",
};

export function getRole(el: Element): string | null {
  const explicit = el.getAttribute("role");
  if (explicit) return explicit;

  const tag = el.tagName.toLowerCase();
  if (tag === "input") {
    const type = ((el as HTMLInputElement).type || "text").toLowerCase();
    return INPUT_TYPE_TO_ROLE[type] ?? "textbox";
  }
  return TAG_TO_ROLE[tag] ?? null;
}
