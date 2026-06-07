/**
 * Persists the connection configuration and notifies on change.
 *
 * Stored as a single object under one key so the Options page and the service
 * worker share exactly one source of truth; `onChange` lets the worker rebuild
 * its transport when the user saves new settings.
 */

import { DEFAULT_CONFIG, type ConnectionConfig } from "./connection-config";

const STORAGE_KEY = "connectionConfig";

export class ConfigStore {
  /** Read the stored config merged over the defaults. */
  async read(): Promise<ConnectionConfig> {
    const stored = await chrome.storage.sync.get(STORAGE_KEY);
    return { ...DEFAULT_CONFIG, ...(stored[STORAGE_KEY] as Partial<ConnectionConfig> | undefined) };
  }

  /** Replace the stored config. */
  async write(config: ConnectionConfig): Promise<void> {
    await chrome.storage.sync.set({ [STORAGE_KEY]: config });
  }

  /** Subscribe to config changes (fires on saves from the Options page). */
  onChange(handler: (config: ConnectionConfig) => void): void {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync" || !changes[STORAGE_KEY]) return;
      handler({
        ...DEFAULT_CONFIG,
        ...(changes[STORAGE_KEY].newValue as Partial<ConnectionConfig>),
      });
    });
  }
}
