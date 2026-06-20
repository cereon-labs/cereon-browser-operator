/**
 * Popup controller.
 *
 * A thin view layer: it sends typed requests to the service worker and renders
 * the three connection states. Backend specifics live in the Options page; this
 * popup only connects/disconnects and shows status. Copy comes from `brand`.
 */

import { brand } from "../shared/brand";
import type {
  ConnectAck,
  PairOfferResponse,
  PopupRequest,
  StatusResponse,
  StatusUpdate,
} from "../shared/messages";
import type { PairOffer } from "../shared/pairing";

class PopupView {
  private readonly title = this.byId("headerTitle");
  private readonly dot = this.byId("statusDot");
  private readonly label = this.byId("statusLabel");
  private readonly workspace = this.byId("workspaceName");
  private readonly error = this.byId("errorMsg");
  private readonly statusCard = this.byId("statusCard");
  private readonly connectBtn = this.byId<HTMLButtonElement>("connectBtn");
  private readonly disconnectBtn = this.byId<HTMLButtonElement>("disconnectBtn");
  private readonly configureLink = this.byId<HTMLAnchorElement>("configureLink");
  private readonly homeLink = this.byId<HTMLAnchorElement>("homeLink");
  private readonly pairCard = this.byId("pairCard");
  private readonly pairTitle = this.byId("pairTitle");
  private readonly pairSub = this.byId("pairSub");
  private readonly pairOrigin = this.byId("pairOrigin");
  private readonly pairAcceptBtn = this.byId<HTMLButtonElement>("pairAcceptBtn");
  private readonly pairDismissBtn = this.byId<HTMLButtonElement>("pairDismissBtn");

  constructor() {
    this.title.textContent = brand.productName;
    this.connectBtn.textContent = brand.copy.connectButton;
    this.disconnectBtn.textContent = brand.copy.disconnectButton;
    this.configureLink.textContent = brand.copy.configureLink;
    this.homeLink.textContent = brand.homeLabel;
    this.homeLink.href = brand.homeUrl;
    this.pairTitle.textContent = brand.copy.pairTitle;
    this.pairAcceptBtn.textContent = brand.copy.pairAccept;
    this.pairDismissBtn.textContent = brand.copy.pairDismiss;
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

  onPairAccept(handler: () => void): void {
    this.pairAcceptBtn.addEventListener("click", handler);
  }

  onPairDismiss(handler: () => void): void {
    this.pairDismissBtn.addEventListener("click", handler);
  }

  /** Show the pending pairing offer; hides the normal status/connect controls. */
  renderPairOffer(offer: PairOffer): void {
    const who = offer.brand?.name?.trim() || "A website";
    this.pairSub.textContent = `${who} ${brand.copy.pairBody}.`;
    this.pairOrigin.textContent = offer.origin;
    this.statusCard.style.display = "none";
    this.connectBtn.style.display = "none";
    this.disconnectBtn.style.display = "none";
    this.pairCard.style.display = "block";
    this.pairAcceptBtn.disabled = false;
    this.pairAcceptBtn.textContent = brand.copy.pairAccept;
    this.pairAcceptBtn.style.display = "block";
    this.pairDismissBtn.style.display = "block";
  }

  /** Leave the pairing view and return to the normal status view. */
  clearPairOffer(): void {
    this.pairCard.style.display = "none";
    this.pairAcceptBtn.style.display = "none";
    this.pairDismissBtn.style.display = "none";
    this.statusCard.style.display = "block";
  }

  setPairAccepting(): void {
    this.pairAcceptBtn.disabled = true;
    this.pairAcceptBtn.innerHTML = `<span class="spinner"></span>${brand.copy.connecting}`;
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
    this.view.onPairAccept(() => this.acceptPairing());
    this.view.onPairDismiss(() => this.dismissPairing());
    this.listenForStatusUpdates();
    this.loadInitialView();
  }

  /** A pending pairing offer takes precedence over the normal status view. */
  private loadInitialView(): void {
    this.send<PairOfferResponse>({ type: "getPairOffer" }, (res) => {
      if (!chrome.runtime.lastError && res?.offer) {
        this.view.renderPairOffer(res.offer);
        return;
      }
      this.loadInitialStatus();
    });
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

  private acceptPairing(): void {
    this.view.setPairAccepting();
    this.send<ConnectAck>({ type: "acceptPairOffer" }, (res) => {
      this.view.clearPairOffer();
      if (chrome.runtime.lastError || !res?.ok) {
        this.view.renderDisconnected(
          res?.error ?? chrome.runtime.lastError?.message ?? "Connection failed",
        );
        return;
      }
      this.view.renderConnecting();
      // The worker fires a statusUpdate which renders Connected.
    });
  }

  private dismissPairing(): void {
    this.send<ConnectAck>({ type: "dismissPairOffer" }, () => {
      this.view.clearPairOffer();
      this.loadInitialStatus();
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
