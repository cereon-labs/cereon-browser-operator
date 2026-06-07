/**
 * Service-worker composition root.
 *
 * Builds the engine (CDP, tools, tab group) once, then builds an auth provider +
 * transport from the stored connection config — rebuilding them whenever the
 * config changes. Everything downstream (tools, dispatcher) is transport-agnostic;
 * this file is the only place that knows which transport/auth is active.
 */

import type { ConnectionConfig } from "../config/connection-config";
import { ConfigStore } from "../config/config-store";
import { SSE_WATCHDOG_PERIOD_MINUTES } from "../shared/constants";
import { toMessage } from "../shared/errors";
import { logger } from "../shared/logger";
import type { ConnectAck, PopupRequest, StatusResponse } from "../shared/messages";
import type { AuthProvider } from "./auth/auth-provider";
import { CdpSessionManager } from "./cdp/cdp-manager";
import { ContentBridge } from "./content-bridge/content-bridge";
import { PopupNotifier } from "./popup-notifier";
import { ScreenshotService } from "./screenshot/screenshot-service";
import { TabGroupManager } from "./tabs/tab-group-manager";
import { createTools } from "./tools/all-tools";
import { CommandDispatcher, ToolRegistry, type ResultSink } from "./tools/registry";
import { createToolContext } from "./tools/tool";
import { buildAuth, buildTransport } from "./transport/factory";
import type { Transport } from "./transport/transport";

const log = logger.child("worker");

self.addEventListener("unhandledrejection", (event) => event.preventDefault());

// ─── Engine (transport-independent) ──────────────────────────────────────────
const configStore = new ConfigStore();
const notifier = new PopupNotifier();

const cdp = new CdpSessionManager();
const tabGroup = new TabGroupManager();
const content = new ContentBridge();
const screenshots = new ScreenshotService();

const toolContext = createToolContext({ cdp, tabGroup, content, screenshots });
const registry = new ToolRegistry().register(...createTools());

// ─── Mutable connection (rebuilt on config change) ───────────────────────────
let activeTransport: Transport | null = null;
let activeAuth: AuthProvider | null = null;
let currentConfig: ConnectionConfig;

// The dispatcher always forwards results to whichever transport is live.
const sink: ResultSink = {
  sendResult: (result) => activeTransport?.sendResult(result) ?? Promise.resolve(),
};
const dispatcher = new CommandDispatcher(registry, toolContext, sink);

async function rebuild(config: ConnectionConfig): Promise<void> {
  activeTransport?.stop();
  currentConfig = config;
  activeAuth = buildAuth(config);
  activeTransport = buildTransport(config, activeAuth, {
    onCommand: (command) => void dispatcher.handle(command),
    onStatus: (status) => notifier.update({ ...status, label: connectionLabel() }),
  });
}

cdp.registerListeners();
tabGroup.registerListeners();
registerPopupProtocol();
registerWatchdog();
configStore.onChange((config) => void onConfigChange(config));

void bootstrap();

async function bootstrap(): Promise<void> {
  await rebuild(await configStore.read());
  await tabGroup.recover();
  await activeTransport!.start(); // resumes if a token is configured; no-ops otherwise
  log.info(`registered ${registry.names.length} tools; transport=${currentConfig.transport}`);
}

async function onConfigChange(config: ConnectionConfig): Promise<void> {
  const wasRunning = activeTransport?.isRunning ?? false;
  await rebuild(config);
  if (wasRunning) await activeTransport!.start();
}

// ─── Popup protocol ──────────────────────────────────────────────────────────
function registerPopupProtocol(): void {
  chrome.runtime.onMessage.addListener((message: PopupRequest, _sender, sendResponse) => {
    switch (message.type) {
      case "connect":
        connect()
          .then(() => sendResponse({ ok: true } satisfies ConnectAck))
          .catch((err) => sendResponse({ ok: false, error: toMessage(err) } satisfies ConnectAck));
        return true;

      case "getStatus":
        sendResponse({
          connected: activeTransport?.isRunning ?? false,
          label: connectionLabel(),
        } satisfies StatusResponse);
        return false;

      case "disconnect":
        activeTransport?.stop();
        void activeAuth?.clear();
        sendResponse({ ok: true } satisfies ConnectAck);
        return false;

      default:
        return false;
    }
  });
}

async function connect(): Promise<void> {
  if (!activeAuth || !activeTransport) throw new Error("Not initialized yet.");
  await activeAuth.authorize(); // validates that a token is configured
  await activeTransport.start();
}

// Restart the transport if the service worker was revived after Chrome idled it.
function registerWatchdog(): void {
  chrome.alarms.create("connectionWatchdog", { periodInMinutes: SSE_WATCHDOG_PERIOD_MINUTES });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "connectionWatchdog" && !(activeTransport?.isRunning ?? false)) {
      void activeTransport?.start();
    }
  });
}

/** Human label for the popup: the configured target, else the server host. */
function connectionLabel(): string {
  return currentConfig?.target || hostOf(currentConfig?.serverUrl ?? "");
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}
