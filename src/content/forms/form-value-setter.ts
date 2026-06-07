/**
 * Sets a form control's value by element ref.
 *
 * Resolves the ref, finds the actual control (descending into shadow DOM if the
 * ref points at a wrapper), assigns via the appropriate strategy per control
 * type, and dispatches input/change so frameworks observe the change. Uses the
 * native value setter for input/textarea so React/Vue controlled inputs update.
 */

import type { FormSetResult } from "../../shared/messages";
import type { ElementRegistry } from "../dom/element-registry";

const FORM_CONTROL = "input, textarea, select";

export class FormValueSetter {
  constructor(private readonly registry: ElementRegistry) {}

  set(refId: string, value: unknown): FormSetResult {
    const el = this.registry.resolve(refId);
    if (!el) return { error: `Element ${refId} not found or was garbage collected.` };

    (el as HTMLElement).scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });

    const target = findInputInside(el) ?? el;
    const tag = target.tagName.toLowerCase();
    const type = ((target as HTMLInputElement).type || "").toLowerCase();

    if (tag === "select") {
      this.setSelect(target as HTMLSelectElement, value);
    } else if (type === "checkbox" || type === "radio") {
      return this.setCheckable(target as HTMLInputElement, value);
    } else if ((target as HTMLElement).isContentEditable) {
      target.textContent = String(value);
    } else if (tag === "input" || tag === "textarea") {
      this.setViaNativeSetter(target as HTMLInputElement | HTMLTextAreaElement, tag, value);
    } else {
      try {
        (target as HTMLInputElement).value = String(value);
      } catch {
        return { error: `Cannot set value on <${tag}> element. No input found inside.` };
      }
    }

    dispatch(target);
    return { success: true, value: (target as HTMLInputElement).value };
  }

  private setSelect(select: HTMLSelectElement, value: unknown): void {
    const wanted = String(value);
    const option = Array.from(select.options).find(
      (o) => o.value === wanted || o.textContent?.trim() === wanted,
    );
    select.value = option ? option.value : wanted;
  }

  private setCheckable(input: HTMLInputElement, value: unknown): FormSetResult {
    const shouldCheck = typeof value === "boolean" ? value : value === "true";
    if (input.checked !== shouldCheck) input.click();
    return { success: true, checked: input.checked };
  }

  private setViaNativeSetter(
    input: HTMLInputElement | HTMLTextAreaElement,
    tag: string,
    value: unknown,
  ): void {
    const proto = tag === "textarea" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(input, String(value));
    else input.value = String(value);
  }
}

/** Find the real input/textarea/select inside a wrapper, including shadow DOM. */
function findInputInside(el: Element): Element | null {
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return el;

  const root = el.shadowRoot ?? el;
  const inner = root.querySelector(FORM_CONTROL);
  if (inner) return inner;

  for (const child of root.querySelectorAll("*")) {
    if (child.shadowRoot) {
      const deep = child.shadowRoot.querySelector(FORM_CONTROL);
      if (deep) return deep;
    }
  }
  return null;
}

function dispatch(target: Element): void {
  target.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  target.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
}
