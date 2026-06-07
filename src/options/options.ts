/**
 * Options-page controller.
 *
 * Loads the stored connection config into the form, toggles transport/auth-
 * specific sections, validates on save, and persists via {@link ConfigStore}.
 * Saving triggers `chrome.storage.onChanged`, which makes the service worker
 * rebuild its transport — no reload required.
 */

import {
  DEFAULT_CONFIG,
  validateConfig,
  type ConnectionConfig,
  type TransportKind,
} from "../config/connection-config";
import { ConfigStore } from "../config/config-store";
import { brand } from "../shared/brand";

const store = new ConfigStore();

const el = <T extends HTMLElement = HTMLInputElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`options: missing #${id}`);
  return node as T;
};

const fields = {
  transport: el<HTMLSelectElement>("transport"),
  serverUrl: el("serverUrl"),
  target: el("target"),
  commandPath: el("commandPath"),
  resultPath: el("resultPath"),
  token: el("token"),
};
const sseCard = el<HTMLDivElement>("sseCard");
const msg = el<HTMLSpanElement>("msg");

function readForm(): ConnectionConfig {
  return {
    transport: fields.transport.value as TransportKind,
    serverUrl: fields.serverUrl.value.trim(),
    target: fields.target.value.trim() || undefined,
    commandPath: fields.commandPath.value.trim(),
    resultPath: fields.resultPath.value.trim(),
    token: fields.token.value.trim() || undefined,
  };
}

function writeForm(config: ConnectionConfig): void {
  fields.transport.value = config.transport;
  fields.serverUrl.value = config.serverUrl;
  fields.target.value = config.target ?? "";
  fields.commandPath.value = config.commandPath;
  fields.resultPath.value = config.resultPath;
  fields.token.value = config.token ?? "";
  syncVisibility();
}

function syncVisibility(): void {
  sseCard.classList.toggle("hidden", fields.transport.value !== "sse-http");
}

function setMessage(text: string, kind: "ok" | "err"): void {
  msg.textContent = text;
  msg.className = `msg ${kind}`;
}

async function save(event: Event): Promise<void> {
  event.preventDefault();
  const config = readForm();
  const errors = validateConfig(config);
  if (errors.length) {
    setMessage(errors.join("\n"), "err");
    return;
  }
  await store.write(config);
  setMessage("Saved.", "ok");
}

function init(): void {
  document.title = `${brand.productName} — Settings`;
  el<HTMLHeadingElement>("title").textContent = brand.productName;

  fields.transport.addEventListener("change", syncVisibility);
  el<HTMLFormElement>("form").addEventListener("submit", (e) => void save(e));
  el<HTMLButtonElement>("resetBtn").addEventListener("click", () => {
    writeForm(DEFAULT_CONFIG);
    setMessage("Reset to defaults — Save to apply.", "ok");
  });

  void store.read().then(writeForm);
}

init();
