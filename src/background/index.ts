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
import type {
  ConnectAck,
  PairOfferResponse,
  StatusResponse,
  WorkerInbound,
} from "../shared/messages";
import { offerToConfig } from "../shared/pairing";
import { validateConfig } from "../config/connection-config";
import type { AuthProvider } from "./auth/auth-provider";
import { CdpSessionManager } from "./cdp/cdp-manager";
import { ContentBridge } from "./content-bridge/content-bridge";
import { PairingManager } from "./pairing";
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
const pairing = new PairingManager();

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
  // The accept-pairing path writes the config and then rebuilds + starts the
  // transport itself. chrome.storage.onChanged still fires for that write — if
  // we already applied this exact config and are connected, ignore the echo so
  // we don't tear down and restart a freshly-established connection.
  if (currentConfig && sameConfig(config, currentConfig) && (activeTransport?.isRunning ?? false)) {
    return;
  }
  const wasRunning = activeTransport?.isRunning ?? false;
  await rebuild(config);
  if (wasRunning) await activeTransport!.start();
}

function sameConfig(a: ConnectionConfig, b: ConnectionConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Persist a config, rebuild the transport for it, and connect — used by the
 *  accept-pairing path so connecting is deterministic regardless of the async
 *  storage-change event. */
async function applyConfigAndConnect(config: ConnectionConfig): Promise<void> {
  await configStore.write(config);
  await rebuild(config);
  await activeTransport!.start();
}

// ─── Popup + pairing protocol ────────────────────────────────────────────────
function registerPopupProtocol(): void {
  chrome.runtime.onMessage.addListener((message: WorkerInbound, _sender, sendResponse) => {
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

      // A backend page offered a connection config (relayed by the content
      // script). Park it for the user to confirm — never auto-apply.
      case "pairOffer": {
        const config = offerToConfig(message.config);
        if (validateConfig(config).length > 0) return false; // ignore malformed offers
        void pairing.setPending({
          origin: message.origin,
          config: message.config,
          brand: message.brand,
        });
        return false;
      }

      case "getPairOffer":
        void pairing
          .getPending()
          .then((offer) => sendResponse({ offer } satisfies PairOfferResponse));
        return true;

      case "acceptPairOffer":
        acceptPairing()
          .then(() => sendResponse({ ok: true } satisfies ConnectAck))
          .catch((err) => sendResponse({ ok: false, error: toMessage(err) } satisfies ConnectAck));
        return true;

      case "dismissPairOffer":
        void pairing.clear().then(() => sendResponse({ ok: true } satisfies ConnectAck));
        return true;

      default:
        return false;
    }
  });
}

/** Apply the parked pairing offer (user confirmed in the popup) and connect. */
async function acceptPairing(): Promise<void> {
  const offer = await pairing.getPending();
  if (!offer) throw new Error("No pending connection request.");
  const config = offerToConfig(offer.config);
  const problems = validateConfig(config);
  if (problems.length > 0) {
    await pairing.clear();
    throw new Error(problems.join(" "));
  }
  await applyConfigAndConnect(config);
  await pairing.clear();
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
