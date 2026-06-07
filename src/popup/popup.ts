/**
 * Popup controller.
 *
 * A thin view layer: it sends typed requests to the service worker and renders
 * the three connection states. Backend specifics live in the Options page; this
 * popup only connects/disconnects and shows status. Copy comes from `brand`.
 */

import { brand } from "../shared/brand";
import type { ConnectAck, PopupRequest, StatusResponse, StatusUpdate } from "../shared/messages";

class PopupView {
  private readonly title = this.byId("headerTitle");
  private readonly dot = this.byId("statusDot");
  private readonly label = this.byId("statusLabel");
  private readonly workspace = this.byId("workspaceName");
  private readonly error = this.byId("errorMsg");
  private readonly connectBtn = this.byId<HTMLButtonElement>("connectBtn");
  private readonly disconnectBtn = this.byId<HTMLButtonElement>("disconnectBtn");
  private readonly configureLink = this.byId<HTMLAnchorElement>("configureLink");
  private readonly homeLink = this.byId<HTMLAnchorElement>("homeLink");

  constructor() {
    this.title.textContent = brand.productName;
    this.connectBtn.textContent = brand.copy.connectButton;
    this.disconnectBtn.textContent = brand.copy.disconnectButton;
    this.configureLink.textContent = brand.copy.configureLink;
    this.homeLink.textContent = brand.homeLabel;
    this.homeLink.href = brand.homeUrl;
  }

  onConnect(handler: () => void): void {
    this.connectBtn.addEventListener("click", handler);
  }

  onDisconnect(handler: () => void): void {
    this.disconnectBtn.addEventListener("click", handler);
  }

  onConfigure(handler: () => void): void {
    this.configureLink.addEventListener("click", (e) => {
      e.preventDefault();
      handler();
    });
  }

  renderConnected(label?: string): void {
    this.dot.className = "status-dot connected";
    this.label.textContent = brand.copy.connected;
    this.workspace.textContent = label ?? "";
    this.workspace.style.display = label ? "block" : "none";
    this.error.style.display = "none";
    this.connectBtn.style.display = "none";
    this.disconnectBtn.style.display = "block";
  }

  renderDisconnected(error?: string): void {
    this.dot.className = "status-dot disconnected";
    this.label.textContent = brand.copy.disconnected;
    this.workspace.style.display = "none";
    if (error) {
      this.error.textContent = error;
      this.error.style.display = "block";
    } else {
      this.error.style.display = "none";
    }
    this.connectBtn.disabled = false;
    this.connectBtn.textContent = brand.copy.connectButton;
    this.connectBtn.style.display = "block";
    this.disconnectBtn.style.display = "none";
  }

  renderConnecting(): void {
    this.dot.className = "status-dot disconnected";
    this.label.textContent = brand.copy.connecting;
    this.error.style.display = "none";
    this.connectBtn.disabled = true;
    this.connectBtn.innerHTML = `<span class="spinner"></span>${brand.copy.connecting}`;
  }

  private byId<T extends HTMLElement = HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`popup: missing #${id}`);
    return el as T;
  }
}

class PopupController {
  constructor(private readonly view: PopupView) {}

  init(): void {
    this.view.onConnect(() => this.connect());
    this.view.onDisconnect(() => this.disconnect());
    this.view.onConfigure(() => chrome.runtime.openOptionsPage());
    this.listenForStatusUpdates();
    this.loadInitialStatus();
  }

  private loadInitialStatus(): void {
    this.send<StatusResponse>({ type: "getStatus" }, (res) => {
      if (chrome.runtime.lastError) {
        this.view.renderDisconnected("Extension not ready. Try reloading.");
        return;
      }
      if (res?.connected) this.view.renderConnected(res.label);
      else this.view.renderDisconnected();
    });
  }

  private connect(): void {
    this.view.renderConnecting();
    this.send<ConnectAck>({ type: "connect" }, (res) => {
      if (chrome.runtime.lastError || !res?.ok) {
        this.view.renderDisconnected(
          res?.error ?? chrome.runtime.lastError?.message ?? "Connection failed",
        );
      }
      // On success the worker fires a statusUpdate which renders Connected.
    });
  }

  private disconnect(): void {
    this.send({ type: "disconnect" }, () => this.view.renderDisconnected());
  }

  private listenForStatusUpdates(): void {
    chrome.runtime.onMessage.addListener((msg: StatusUpdate) => {
      if (msg.type !== "statusUpdate") return;
      if (msg.connected) this.view.renderConnected(msg.label);
      else this.view.renderDisconnected(msg.error);
    });
  }

  private send<T>(request: PopupRequest, callback: (response: T | undefined) => void): void {
    chrome.runtime.sendMessage(request, callback);
  }
}

new PopupController(new PopupView()).init();
