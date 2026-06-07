/**
 * Pushes connection-status updates to the popup.
 *
 * One-way and best-effort: if the popup is closed, `sendMessage` rejects and we
 * swallow it (there is no receiver to care).
 */

import type { StatusUpdate } from "../shared/messages";

export class PopupNotifier {
  update(status: Omit<StatusUpdate, "type">): void {
    void chrome.runtime
      .sendMessage<StatusUpdate>({ type: "statusUpdate", ...status })
      .catch(() => {});
  }
}
