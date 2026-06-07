/**
 * Owns the "MCP" tab group — the security boundary for automation.
 *
 * Only tabs inside this group accept tool commands. This class encapsulates the
 * group's id and membership (previously two module-level globals) and the
 * ensure/recover/adopt lifecycle.
 */

import { brand } from "../../shared/brand";
import { logger } from "../../shared/logger";

const log = logger.child("tab-group");
const UNGROUPED = chrome.tabGroups?.TAB_GROUP_ID_NONE ?? -1;
const GROUP_TITLE = brand.tabGroupTitle;

export class TabGroupManager {
  private groupId: number | null = null;
  private members = new Set<number>();

  get id(): number | null {
    return this.groupId;
  }

  registerListeners(): void {
    chrome.tabs.onRemoved.addListener((tabId) => this.members.delete(tabId));
  }

  /** On startup, adopt a pre-existing automation group if one survived a restart. */
  async recover(): Promise<void> {
    try {
      const groups = await chrome.tabGroups.query({ title: GROUP_TITLE });
      const group = groups[0];
      if (group) {
        this.groupId = group.id;
        await this.refreshMembers();
      }
    } catch {
      // Non-critical: the group is (re)established on the first tabs_context call.
    }
  }

  /**
   * Ensure a usable group exists. With `createIfEmpty`, spawns a fresh window +
   * grouped tab when none is present; otherwise leaves `id` null.
   */
  async ensure(createIfEmpty: boolean): Promise<void> {
    if (this.groupId !== null && (await this.isCurrentGroupAlive())) return;
    if (!createIfEmpty) return;

    const win = await chrome.windows.create({ focused: true, url: "about:blank" });
    const tab = win?.tabs?.[0];
    if (!tab?.id) throw new Error("Failed to create automation window/tab.");

    const groupId = await chrome.tabs.group({ tabIds: [tab.id] });
    await chrome.tabGroups.update(groupId, {
      title: GROUP_TITLE,
      color: brand.tabGroupColor,
    });
    this.groupId = groupId;
    this.members = new Set([tab.id]);
    log.info(`created ${GROUP_TITLE} group ${groupId}`);
  }

  /** Create a new active tab inside the group. */
  async addTab(): Promise<chrome.tabs.Tab> {
    await this.ensure(true);
    const tab = await chrome.tabs.create({ active: true });
    await chrome.tabs.group({ tabIds: [tab.id!], groupId: this.groupId! });
    this.members.add(tab.id!);
    return tab;
  }

  /** All tabs currently in the group. */
  async listTabs(): Promise<chrome.tabs.Tab[]> {
    if (this.groupId === null) return [];
    return chrome.tabs.query({ groupId: this.groupId });
  }

  /** Whether a tab is inside the MCP group (adopting the group if needed). */
  async isInGroup(tabId: number): Promise<boolean> {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.groupId !== UNGROUPED) {
        if (this.groupId === null) await this.tryAdopt(tab.groupId);
        return tab.groupId === this.groupId;
      }
      return this.members.has(tabId);
    } catch {
      return false;
    }
  }

  private async isCurrentGroupAlive(): Promise<boolean> {
    try {
      await chrome.tabGroups.get(this.groupId!);
      await this.refreshMembers();
      return this.members.size > 0;
    } catch {
      this.groupId = null;
      this.members.clear();
      return false;
    }
  }

  private async tryAdopt(candidateGroupId: number): Promise<void> {
    try {
      const group = await chrome.tabGroups.get(candidateGroupId);
      if (group.title === GROUP_TITLE) {
        this.groupId = group.id;
        await this.refreshMembers();
      }
    } catch {
      // Not adoptable — leave groupId null.
    }
  }

  private async refreshMembers(): Promise<void> {
    if (this.groupId === null) return;
    const tabs = await chrome.tabs.query({ groupId: this.groupId });
    this.members = new Set(tabs.map((t) => t.id!).filter((id) => id !== undefined));
  }
}
