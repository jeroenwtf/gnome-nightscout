/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GObject from "gi://GObject";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import St from "gi://St";
import Clutter from "gi://Clutter";
import Soup from "gi://Soup";

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as MessageTray from "resource:///org/gnome/shell/ui/messageTray.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

// Settings
let NIGHTSCOUT_URL = "https://yournightscoutsite.com";
let AUTHENTICATION_TOKEN = "";
let REFRESH_INTERVAL = 60;
let STALE_DATA_THRESHOLD = 15;
let TIMEOUT_TIME = 10;
let SHOW_ELAPSED_TIME = true;
let SHOW_DELTA = true;
let SHOW_TREND_ARROWS = true;
let NOTIFICATION_OUT_OF_RANGE = true;
let NOTIFICATION_STALE_DATA = true;
let NOTIFICATION_RAPIDLY_CHANGES = true;
let NOTIFICATION_URGENCY_LEVEL = 2;

// NS thresholds
let THRESHOLD_BG_HIGH = 260;
let THRESHOLD_BG_TARGET_TOP = 180;
let THRESHOLD_BG_TARGET_BOTTOM = 70;
let THRESHOLD_BG_LOW = 55;

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    destroy() {
      this._disconnectSettings();
      this._disconnectLoop();

      super.destroy();
    }

    _init(extension) {
      super._init(0.0, _("Nighscout Indicator"));

      this.extension = extension;
      this.openSettings = extension.openSettings;

      this._settingsChangedId = null;
      this._error = false;

      this.httpSession = new Soup.Session();
      this.httpSession.timeout = TIMEOUT_TIME;

      this._loadSettings();
      this._fetchThresholds();

      this._initIndicator();
      this._initMenu();

      this._checkUpdates();
      this._startLooping();
    }

    _initNotificationsSource() {
      if (!this._notifSource) {
        this._notifSource = new MessageTray.Source({
          title: "Nightscout",
        });

        this._notifSource.connect("destroy", () => {
          this._notifSource = null;
        });

        Main.messageTray.add(this._notifSource);
      }
    }

    _initIndicator() {
      this.box = new St.BoxLayout({
        vertical: false,
        reactive: true,
        can_focus: true,
        x_align: Clutter.ActorAlign.START,
        y_align: Clutter.ActorAlign.CENTER,
      });

      this.buttonText = new St.Label({
        text: "Loading...",
        y_align: Clutter.ActorAlign.CENTER,
      });

      this.box.add_child(this.buttonText);

      // ------ Toggle: show-delta

      this.buttonDelta = new St.Label({
        text: "",
        style_class: "delta",
        y_align: Clutter.ActorAlign.CENTER,
      });

      this.box.add_child(this.buttonDelta);
      SHOW_DELTA || this.buttonDelta.hide();

      // ------ Toggle: show-trend-arrows

      this.buttonTrendArrows = new St.Label({
        text: "",
        style_class: "trend-arrows",
        y_align: Clutter.ActorAlign.CENTER,
      });

      this.box.add_child(this.buttonTrendArrows);
      SHOW_TREND_ARROWS || this.buttonTrendArrows.hide();

      // ------ Toggle: show-elapsed-time

      this.buttonElapsedTime = new St.Label({
        text: "",
        style_class: "elapsed",
        y_align: Clutter.ActorAlign.CENTER,
      });

      this.box.add_child(this.buttonElapsedTime);
      SHOW_ELAPSED_TIME || this.buttonElapsedTime.hide();

      this.add_child(this.box);

      this.errorBox = new St.BoxLayout({
        vertical: false,
        reactive: true,
        can_focus: true,
        x_align: Clutter.ActorAlign.START,
        y_align: Clutter.ActorAlign.CENTER,
      });

      this.errorButtonText = new St.Label({
        text: "Error",
        y_align: Clutter.ActorAlign.CENTER,
      });

      this.errorBox.add_child(this.errorButtonText);
    }

    _updateIndicator() {
      SHOW_DELTA ? this.buttonDelta.show() : this.buttonDelta.hide();
      SHOW_TREND_ARROWS
        ? this.buttonTrendArrows.show()
        : this.buttonTrendArrows.hide();
      SHOW_ELAPSED_TIME
        ? this.buttonElapsedTime.show()
        : this.buttonElapsedTime.hide();
    }

    _initMenu() {
      const { settings } = this.extension;

      let refreshNowItem = new PopupMenu.PopupMenuItem(_("Refresh now"));

      refreshNowItem.connect("activate", () => {
        this._checkUpdates();
      });

      // ------ Open your Nightscout site

      let openNightscoutSiteItem = new PopupMenu.PopupMenuItem(
        _("Open your Nightscout site"),
      );

      openNightscoutSiteItem.connect("activate", () => {
        this._openNightscoutSite();
      });

      this._debugNightscoutUrlItem = new PopupMenu.PopupMenuItem(
        NIGHTSCOUT_URL || _("Missing url!"),
        { reactive: false },
      );

      // ------ Toggle: show-delta

      this._showDeltaItem = new PopupMenu.PopupSwitchMenuItem(
        _("Show delta"),
        SHOW_DELTA,
      );

      this._showDeltaItem.connect("toggled", (item) => {
        settings.set_boolean("show-delta", item.state);
      });

      // ------ Toggle: show-trend-arrows

      this._showTrendArrowsItem = new PopupMenu.PopupSwitchMenuItem(
        _("Show trend arrows"),
        SHOW_TREND_ARROWS,
      );

      this._showTrendArrowsItem.connect("toggled", (item) => {
        settings.set_boolean("show-trend-arrows", item.state);
      });

      // ------ Toggle: show-elapsed-time

      this._showElapsedTimeItem = new PopupMenu.PopupSwitchMenuItem(
        _("Show elapsed time"),
        SHOW_ELAPSED_TIME,
      );

      this._showElapsedTimeItem.connect("toggled", (item) => {
        settings.set_boolean("show-elapsed-time", item.state);
      });

      // ------ Settings

      let settingsItem = new PopupMenu.PopupMenuItem(_("All settings"));

      settingsItem.connect("activate", () => {
        this.openSettings();
      });

      // ------ Build the menu

      this.menu.addMenuItem(refreshNowItem);
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      this.menu.addMenuItem(openNightscoutSiteItem);
      this.menu.addMenuItem(this._debugNightscoutUrlItem);
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      this.menu.addMenuItem(this._showDeltaItem);
      this.menu.addMenuItem(this._showTrendArrowsItem);
      this.menu.addMenuItem(this._showElapsedTimeItem);
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      this.menu.addMenuItem(settingsItem);
    }

    _updateMenu() {
      this._debugNightscoutUrlItem.label.text =
        NIGHTSCOUT_URL || _("Missing url!");
      this._showDeltaItem.setToggleState(SHOW_DELTA);
      this._showTrendArrowsItem.setToggleState(SHOW_TREND_ARROWS);
      this._showElapsedTimeItem.setToggleState(SHOW_ELAPSED_TIME);
    }

    _loadSettings() {
      this._settingsChangedId = this.extension.settings.connect("changed", () =>
        this._onSettingsChange(this),
      );

      this._fetchSettings();
    }

    _onSettingsChange() {
      try {
        this._fetchSettings();

        this._updateMenu();
        this._updateIndicator();
      } catch (e) {
        console.error(e);
      }
    }

    _fetchSettings() {
      const { settings } = this.extension;

      NIGHTSCOUT_URL = settings.get_string("nightscout-url");
      AUTHENTICATION_TOKEN = settings.get_string("authentication-token");
      REFRESH_INTERVAL = settings.get_int("refresh-interval");
      STALE_DATA_THRESHOLD = settings.get_int("stale-data-threshold");
      TIMEOUT_TIME = settings.get_int("timeout-time");

      SHOW_ELAPSED_TIME = settings.get_boolean("show-elapsed-time");
      SHOW_DELTA = settings.get_boolean("show-delta");
      SHOW_TREND_ARROWS = settings.get_boolean("show-trend-arrows");

      NOTIFICATION_OUT_OF_RANGE = settings.get_boolean(
        "notification-out-of-range",
      );
      NOTIFICATION_STALE_DATA = settings.get_boolean("notification-stale-data");
      NOTIFICATION_RAPIDLY_CHANGES = settings.get_boolean(
        "notification-rapidly-changes",
      );
      NOTIFICATION_URGENCY_LEVEL = settings.get_int(
        "notification-urgency-level",
      );
    }

    async _fetchThresholds() {
      const data = await this._fetchFromNightscout("/api/v1/status");

      if (!data) {
        return;
      }

      const thresholds = data.settings.thresholds;

      THRESHOLD_BG_HIGH = thresholds.bgHigh;
      THRESHOLD_BG_TARGET_TOP = thresholds.bgTargetTop;
      THRESHOLD_BG_TARGET_BOTTOM = thresholds.bgTargetBottom;
      THRESHOLD_BG_LOW = thresholds.bgBottom;
    }

    async _fetchFromNightscout(url) {
      if (!this._hasInternetConnection()) {
        this._showErrorBox("Waiting for network...");
        return;
      }

      try {
        let message = Soup.Message.new("GET", this._getUrl(url));
        message.request_headers.append("Accept", "application/json");

        let response = await this.httpSession.send_and_read_async(
          message,
          null,
          null,
        );

        let responseBody = String.fromCharCode.apply(null, response.get_data());
        let statusCode = message.get_status();

        if (statusCode == 401) {
          throw new Error("Unauthorized: check your authentication token.");
        }

        if (statusCode !== 200) {
          throw new Error("Something went wrong.");
        }

        this._hideErrorBox();

        const data = JSON.parse(responseBody);

        return data;
      } catch (error) {
        log(`NS Error on ${url}: ${error.message}`);

        this._showErrorBox();

        this._showNotification(
          "Error calling " + url,
          error.message,
          "open-settings",
        );

        return null;
      }
    }

    _showErrorBox(message = "Error") {
      this.errorButtonText.set_text(message);

      if (this.get_child_at_index(0) == this.box) {
        this.replace_child(this.box, this.errorBox);
      }
      this._error = true;
    }

    _hideErrorBox() {
      if (this.get_child_at_index(0) == this.errorBox) {
        this.replace_child(this.errorBox, this.box);
      }
      this._error = false;
    }

    _showNotification(title, message, action = "open-site") {
      this._initNotificationsSource();

      let notification = new MessageTray.Notification({
        source: this._notifSource,
        title,
        body: message,
        urgency: this._getNotificationUrgencyLevel(),
      });

      if (action == "open-site") {
        notification.addAction("Open your Nightscout site", () => {
          this._openNightscoutSite();
        });
      } else if (action == "open-settings") {
        notification.addAction("Open settings", () => {
          this.openSettings();
        });
      }

      this._notifSource.addNotification(notification);
    }

    _startLooping() {
      this._sourceId = GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT,
        REFRESH_INTERVAL,
        () => {
          this._checkUpdates();

          return GLib.SOURCE_CONTINUE;
        },
      );
    }

    _openNightscoutSite() {
      const url = this._getUrl("/");

      Gio.AppInfo.launch_default_for_uri(url, null);
    }

    _getNotificationUrgencyLevel() {
      switch (NOTIFICATION_URGENCY_LEVEL) {
        case 0:
          return MessageTray.Urgency.LOW;

        case 1:
          return MessageTray.Urgency.HIGH;

        case 1:
          return MessageTray.Urgency.CRITICAL;

        default:
          return MessageTray.Urgency.NORMAL;
      }
    }

    _getUrl(url) {
      let fullUrl = NIGHTSCOUT_URL + url;

      if (AUTHENTICATION_TOKEN) {
        fullUrl +=
          (fullUrl.includes("?") ? "&" : "?") +
          "token=" +
          encodeURIComponent(AUTHENTICATION_TOKEN);
      }

      let parsedUrl = GLib.Uri.parse(fullUrl, null);
      if (!parsedUrl) {
        throw new Error("Invalid URL");
      }

      return fullUrl;
    }

    async _checkUpdates() {
      const data = await this._fetchFromNightscout(
        "/api/v1/entries.json?count=2",
      );

      if (!data) {
        return;
      }

      let previousEntry = data[1];
      let entry = data[0];

      if (typeof entry === "undefined") {
        this.buttonText.set_text(`No data`);
        return;
      }

      let glucoseValue = entry.sgv;
      let directionValue = entry.direction;
      let delta = previousEntry.sgv - entry.sgv;
      let date = entry.date;

      let arrow = this._fromNameToArrowCharacter(directionValue);
      let deltaText = `${delta < 0 ? "" : "+"}${delta}`;

      if (
        NOTIFICATION_RAPIDLY_CHANGES &&
        this._lastDirectionValue !== directionValue
      ) {
        if (directionValue == "DoubleDown" || directionValue == "TripleDown") {
          this._showNotification(
            "Rapidly lowering!",
            `Glucose level is going down quick.`,
          );
        } else if (
          directionValue == "DoubleUp" ||
          directionValue == "TripleUp"
        ) {
          this._showNotification(
            "Rapidly rising!",
            `Glucose level is going up quick.`,
          );
        }

        this._lastDirectionValue = directionValue;
      }

      let elapsed = Math.floor((Date.now() - date) / 1000);
      let elapsedText;

      if (elapsed >= STALE_DATA_THRESHOLD * 60) {
        elapsedText = "(STALE)";
        this.buttonElapsedTime.style_class = "elapsed-stale";

        if (!this._lastStaleState) {
          this._showNotification(
            "Data is stale",
            `Last reading is from ${Math.floor(elapsed / 60)} minutes ago.`,
          );
        }

        this._lastStaleState = true;
      } else {
        if (elapsed >= 60) {
          elapsedText = `(${Math.floor(elapsed / 60)} min ago)`;
        } else {
          elapsedText = "(<1 min ago)";
        }
        this.buttonElapsedTime.style_class = "elapsed";

        this._lastStaleState = false;
      }

      if (glucoseValue < THRESHOLD_BG_LOW) {
        this.buttonText.style_class = "very-low-glucose";

        NOTIFICATION_OUT_OF_RANGE &&
          this._lastRange !== "very-low" &&
          this._showNotification(
            "You're VERY low!",
            `Glucose level is ${glucoseValue}. DO SOMETHING!`,
          );

        this._lastRange = "very-low";
      } else if (glucoseValue < THRESHOLD_BG_TARGET_BOTTOM) {
        this.buttonText.style_class = "low-glucose";

        NOTIFICATION_OUT_OF_RANGE &&
          this._lastRange !== "very-low" &&
          this._lastRange !== "low" &&
          this._showNotification(
            "You're too low!",
            `Glucose level is ${glucoseValue}. It's below range.`,
          );

        this._lastRange = "low";
      } else if (glucoseValue > THRESHOLD_BG_HIGH) {
        this.buttonText.style_class = "very-high-glucose";

        NOTIFICATION_OUT_OF_RANGE &&
          this._lastRange !== "very-high" &&
          this._showNotification(
            "You're too high!",
            `Glucose level is ${glucoseValue}. Did you forget your insulin?`,
          );

        this._lastRange = "very-high";
      } else if (glucoseValue > THRESHOLD_BG_TARGET_TOP) {
        this.buttonText.style_class = "high-glucose";

        NOTIFICATION_OUT_OF_RANGE &&
          this._lastRange !== "very-high" &&
          this._lastRange !== "high" &&
          this._showNotification(
            "You're high!",
            `Glucose level is ${glucoseValue}. It's above range.`,
          );

        this._lastRange = "high";
      } else {
        this._lastRange = "in-range";
      }

      this.buttonText.set_text(glucoseValue.toString());

      this.buttonDelta.set_text(deltaText);
      this.buttonTrendArrows.set_text(arrow);
      this.buttonElapsedTime.set_text(elapsedText);
    }

    _fromNameToArrowCharacter(directionValue) {
      switch (directionValue) {
        case "DoubleDown":
          return "↓↓";
        case "DoubleUp":
          return "↑↑";
        case "Flat":
          return "→";
        case "FortyFiveDown":
          return "↘";
        case "FortyFiveUp":
          return "↗";
        case "SingleDown":
          return "↓";
        case "SingleUp":
          return "↑";
        case "TripleDown":
          return "↓↓↓";
        case "TripleUp":
          return "↑↑↑";
        default:
          return "";
      }
    }

    _hasInternetConnection() {
      let networkMonitor = Gio.NetworkMonitor.get_default();
      return networkMonitor.get_network_available();
    }

    _disconnectSettings() {
      if (!this._settingsChangedId) return;

      this.extension.settings.disconnect(this._settingsChangedId);
      this._settingsChangedId = null;
    }

    _disconnectLoop() {
      if (this._sourceId) {
        GLib.Source.remove(this._sourceId);
        this._sourceId = null;
      }
    }
  },
);

export default class IndicatorNightscoutExtension extends Extension {
  enable() {
    this._indicator = new Indicator({
      settings: this.getSettings(),
      openSettings: () => this.openPreferences(),
    });

    Main.panel.addToStatusArea(this.uuid, this._indicator);
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}
