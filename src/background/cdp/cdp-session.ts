/**
 * A Chrome DevTools Protocol session bound to a single tab.
 *
 * Encapsulates the attach-once / enable-domain-once bookkeeping that was
 * previously global `Map` state, and exposes a typed `send`. Other layers
 * (input, screenshot, tools) depend on this small surface rather than calling
 * chrome.debugger directly.
 */

import { CDP_VERSION } from "../../shared/constants";
import { CdpError, toMessage } from "../../shared/errors";
import { logger } from "../../shared/logger";

const log = logger.child("cdp");

export class CdpSession {
  private attached = false;
  private readonly enabledDomains = new Set<string>();

  constructor(private readonly tabId: number) {}

  /** Attach the debugger and seed device metrics from the owning window. */
  async ensureAttached(): Promise<void> {
    if (this.attached) return;
    try {
      await chrome.debugger.attach({ tabId: this.tabId }, CDP_VERSION);
    } catch (err) {
      throw new CdpError(`Failed to attach debugger to tab ${this.tabId}: ${toMessage(err)}`, {
        cause: err,
      });
    }
    this.attached = true;
    await this.syncDeviceMetrics();
  }

  /** Enable a CDP domain at most once per session. */
  async ensureDomain(domain: string): Promise<void> {
    await this.ensureAttached();
    if (this.enabledDomains.has(domain)) return;
    await this.send(`${domain}.enable`, {});
    this.enabledDomains.add(domain);
  }

  /** Send a CDP command, attaching first if needed. */
  async send<T = any>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    await this.ensureAttached();
    return (await chrome.debugger.sendCommand({ tabId: this.tabId }, method, params)) as T;
  }

  /** Called by the manager when Chrome reports the debugger detached. */
  markDetached(): void {
    this.attached = false;
    this.enabledDomains.clear();
  }

  /** Best-effort detach (used on tab close). */
  async detach(): Promise<void> {
    if (!this.attached) return;
    try {
      await chrome.debugger.detach({ tabId: this.tabId });
    } catch {
      // Tab may already be gone — nothing to clean up.
    }
    this.markDetached();
  }

  private async syncDeviceMetrics(): Promise<void> {
    try {
      const tab = await chrome.tabs.get(this.tabId);
      const win = await chrome.windows.get(tab.windowId);
      await this.send("Emulation.setDeviceMetricsOverride", {
        width: win.width,
        height: win.height,
        deviceScaleFactor: 1,
        mobile: false,
      });
    } catch (err) {
      // Non-fatal: metrics override is a nicety, not a requirement for commands.
      log.debug(`device metrics override failed for tab ${this.tabId}`, toMessage(err));
    }
  }
}
