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

const useOrientation = "orientation" in St.BoxLayout.prototype;

// Settings
let NIGHTSCOUT_URL = "https://yournightscoutsite.com";
let AUTHENTICATION_TOKEN = "";
let REFRESH_INTERVAL = 60;
let STALE_DATA_THRESHOLD = 15;
let TIMEOUT_TIME = 10;
let SHOW_ELAPSED_TIME = true;
let SHOW_STALE_ELAPSED_TIME = true;
let SHOW_DELTA = true;
let SHOW_TREND_ARROWS = true;
let NOTIFICATION_OUT_OF_RANGE = true;
let NOTIFICATION_STALE_DATA = true;
let NOTIFICATION_RAPIDLY_CHANGES = true;
let NOTIFICATION_URGENCY_LEVEL = 2;
let UNITS_SELECTION = "auto";
let UNITS = "mg/dl";
let THRESHOLD_BG_HIGH = 260;
let THRESHOLD_BG_TARGET_TOP = 180;
let THRESHOLD_BG_TARGET_BOTTOM = 70;
let THRESHOLD_BG_LOW = 55;

let SERVER_UNITS = "mg/dl";
let SERVER_THRESHOLD_BG_HIGH = 260;
let SERVER_THRESHOLD_BG_TARGET_TOP = 180;
let SERVER_THRESHOLD_BG_TARGET_BOTTOM = 70;
let SERVER_THRESHOLD_BG_LOW = 55;

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    destroy() {
      this._disconnectSettings();
      this._disconnectLoop();

      super.destroy();
    }

    _init(extension) {
      super._init(0.0, _("Nightscout Indicator"));

      this.extension = extension;
      this.openSettings = extension.openSettings;

      this._settingsChangedId = null;
      this._error = false;
      this._notificationStorage = [];

      this._loadSettings();

      this.httpSession = new Soup.Session();
      this.httpSession.timeout = TIMEOUT_TIME;

      this._initIndicator();
      this._initMenu();

      this._fetchServerSettings().then(() => {
        this._checkUpdates();
        this._startLooping();
      });
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
        [useOrientation ? "orientation" : "vertical"]: useOrientation
          ? Clutter.Orientation.HORIZONTAL
          : false,
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

      this.elapsedBox = new St.BoxLayout({
        [useOrientation ? "orientation" : "vertical"]: useOrientation
          ? Clutter.Orientation.HORIZONTAL
          : false,
        x_align: Clutter.ActorAlign.START,
        y_align: Clutter.ActorAlign.CENTER,
        style_class: "elapsed",
      });

      this.box.add_child(this.elapsedBox);
      SHOW_ELAPSED_TIME || this.elapsedBox.hide();

      this.buttonElapsedTime = new St.Label({
        text: "",
      });

      this.elapsedBox.add_child(this.buttonElapsedTime);

      this.buttonStaleElapsedTime = new St.Label({
        text: "",
      });

      this.elapsedBox.add_child(this.buttonStaleElapsedTime);

      this.add_child(this.box);
      SHOW_STALE_ELAPSED_TIME || this.buttonStaleElapsedTime.hide();

      this.errorBox = new St.BoxLayout({
        [useOrientation ? "orientation" : "vertical"]: useOrientation
          ? Clutter.Orientation.HORIZONTAL
          : false,
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

      SHOW_ELAPSED_TIME ? this.elapsedBox.show() : this.elapsedBox.hide();

      SHOW_STALE_ELAPSED_TIME
        ? this.buttonStaleElapsedTime.show()
        : this.buttonStaleElapsedTime.hide();
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

      // ------ Toggle: show-stale-elapsed-time

      this._showStaleElapsedTimeItem = new PopupMenu.PopupSwitchMenuItem(
        _("Show stale elapsed time"),
        SHOW_STALE_ELAPSED_TIME,
      );

      this._showStaleElapsedTimeItem.connect("toggled", (item) => {
        settings.set_boolean("show-stale-elapsed-time", item.state);
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
      this.menu.addMenuItem(this._showStaleElapsedTimeItem);
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      this.menu.addMenuItem(settingsItem);
    }

    _updateMenu() {
      this._debugNightscoutUrlItem.label.text =
        NIGHTSCOUT_URL || _("Missing url!");
      this._showDeltaItem.setToggleState(SHOW_DELTA);
      this._showTrendArrowsItem.setToggleState(SHOW_TREND_ARROWS);
      this._showElapsedTimeItem.setToggleState(SHOW_ELAPSED_TIME);
      this._showStaleElapsedTimeItem.setToggleState(SHOW_STALE_ELAPSED_TIME);
    }

    _loadSettings() {
      this._settingsChangedId = this.extension.settings.connect("changed", () =>
        this._onSettingsChange(this),
      );

      this._fetchSettings();
    }

    async _onSettingsChange() {
      try {
        this._fetchSettings();
        await this._fetchServerSettings();
        await this._checkUpdates();

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
      SHOW_STALE_ELAPSED_TIME = settings.get_boolean("show-stale-elapsed-time");
      SHOW_DELTA = settings.get_boolean("show-delta");
      SHOW_TREND_ARROWS = settings.get_boolean("show-trend-arrows");

      UNITS_SELECTION = settings.get_string("units-selection");

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

    _storeNewUnits() {
      UNITS =
        {
          auto: SERVER_UNITS,
          "mmol/L": "mmol/L",
        }[UNITS_SELECTION] || "mg/dl";

      THRESHOLD_BG_HIGH = this._convertBgValue(SERVER_THRESHOLD_BG_HIGH);
      THRESHOLD_BG_TARGET_TOP = this._convertBgValue(
        SERVER_THRESHOLD_BG_TARGET_TOP,
      );
      THRESHOLD_BG_TARGET_BOTTOM = this._convertBgValue(
        SERVER_THRESHOLD_BG_TARGET_BOTTOM,
      );
      THRESHOLD_BG_LOW = this._convertBgValue(SERVER_THRESHOLD_BG_LOW);
    }

    async _fetchServerSettings() {
      try {
        const data = await this._fetchFromNightscout("/api/v1/status");

        if (!data) {
          throw new Error("No data received from Nightscout server");
        }

        const { units, thresholds } = data.settings;

        SERVER_UNITS = ["mmol", "mmol/L"].includes(units) ? "mmol/L" : "mg/dl";
        SERVER_THRESHOLD_BG_HIGH = thresholds.bgHigh;
        SERVER_THRESHOLD_BG_TARGET_TOP = thresholds.bgTargetTop;
        SERVER_THRESHOLD_BG_TARGET_BOTTOM = thresholds.bgTargetBottom;
        SERVER_THRESHOLD_BG_LOW = thresholds.bgLow;

        this._storeNewUnits();
      } catch (error) {
        console.error("Error fetching server settings:", error);
        this._showErrorBox();
      }
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

        this._showNotification({
          title: "Error calling " + url,
          message: error.message,
          action: "open-settings",
        });

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

    _showNotification({ title, message, action, group }) {
      this._initNotificationsSource();

      if (group) {
        this._destroyNotification(group);
      }

      let notification = new MessageTray.Notification({
        source: this._notifSource,
        title,
        body: message,
        urgency: this._getNotificationUrgencyLevel(),
      });

      if (action === "open-settings") {
        notification.addAction("Open settings", () => {
          this.openSettings();
        });
      } else {
        notification.addAction("Open your Nightscout site", () => {
          this._openNightscoutSite();
        });
      }

      if (group) {
        this._notificationStorage[group] = notification;
      }

      this._notifSource.addNotification(notification);
    }

    _destroyNotification(group) {
      const notification = this._notificationStorage[group];

      if (notification) {
        notification.destroy();
        this._notificationStorage[group] = null;
      }
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

      let glucoseValue = this._convertBgValue(entry.sgv);
      let glucoseValueString = glucoseValue.toString();
      let delta = this._convertBgValue(entry.sgv - previousEntry.sgv);
      let deltaString = delta.toString();

      let directionValue = entry.direction;
      let date = entry.date;

      let arrow = this._fromNameToArrowCharacter(directionValue);
      let deltaText = `${delta < 0 ? "" : "+"}${deltaString}`;

      if (
        NOTIFICATION_RAPIDLY_CHANGES &&
        this._lastDirectionValue !== directionValue
      ) {
        if (directionValue == "DoubleDown" || directionValue == "TripleDown") {
          this._showNotification({
            title: "Rapidly lowering!",
            message: `Glucose level is dropping fast (${deltaText}).`,
            group: "rapidly-changes",
          });
        } else if (
          directionValue == "DoubleUp" ||
          directionValue == "TripleUp"
        ) {
          this._showNotification({
            title: "Rapidly rising!",
            message: `Glucose level is going up fast (${deltaText}).`,
            group: "rapidly-changes",
          });
        }

        this._lastDirectionValue = directionValue;
      }

      let elapsed = Math.floor((Date.now() - date) / 1000);
      let elapsedText;
      let staleElapsedText;

      if (elapsed >= STALE_DATA_THRESHOLD * 60) {
        elapsedText = "STALE";
        staleElapsedText = " for ";

        if (elapsed >= 86400) {
          staleElapsedText += ">day";
        } else if (elapsed >= 3600) {
          staleElapsedText += `${Math.floor(elapsed / 3600)}h`;
        } else {
          staleElapsedText += `${Math.floor(elapsed / 60)}m`;
        }

        this.elapsedBox.style_class = "elapsed-stale";

        if (NOTIFICATION_STALE_DATA && !this._lastStaleState) {
          this._showNotification({
            title: "Data is stale",
            message: `Data is considered as stale when ${STALE_DATA_THRESHOLD} minutes passed without new readings.`,
            group: "stale-data",
          });

          this._lastStaleState = true;
        }
      } else {
        if (elapsed >= 60) {
          elapsedText = `(${Math.floor(elapsed / 60)} min ago)`;
        } else {
          elapsedText = "(<1 min ago)";
        }
        staleElapsedText = "";
        this.elapsedBox.style_class = "elapsed";

        if (NOTIFICATION_STALE_DATA) {
          this._destroyNotification("stale-data");

          this._lastStaleState = false;
        }
      }

      if (glucoseValue < THRESHOLD_BG_LOW) {
        this.buttonText.style_class = "very-low-glucose";

        if (NOTIFICATION_OUT_OF_RANGE && this._lastRange !== "very-low") {
          this._showNotification({
            title: "You're VERY low!",
            message: `Glucose level is ${glucoseValueString}. DO SOMETHING!`,
            group: "out-of-range",
          });
        }

        this._lastRange = "very-low";
      } else if (glucoseValue < THRESHOLD_BG_TARGET_BOTTOM) {
        this.buttonText.style_class = "low-glucose";

        if (
          NOTIFICATION_OUT_OF_RANGE &&
          this._lastRange !== "very-low" &&
          this._lastRange !== "low"
        ) {
          this._showNotification({
            title: "You're too low!",
            message: `Glucose level is ${glucoseValueString}. It's below range.`,
            group: "out-of-range",
          });
        }

        this._lastRange = "low";
      } else if (glucoseValue > THRESHOLD_BG_HIGH) {
        this.buttonText.style_class = "very-high-glucose";

        if (NOTIFICATION_OUT_OF_RANGE && this._lastRange !== "very-high") {
          this._showNotification({
            title: "You're too high!",
            message: `Glucose level is ${glucoseValueString}. Did you forget your insulin?`,
            group: "out-of-range",
          });
        }

        this._lastRange = "very-high";
      } else if (glucoseValue > THRESHOLD_BG_TARGET_TOP) {
        this.buttonText.style_class = "high-glucose";

        if (
          NOTIFICATION_OUT_OF_RANGE &&
          this._lastRange !== "very-high" &&
          this._lastRange !== "high"
        ) {
          this._showNotification({
            title: "You're high!",
            message: `Glucose level is ${glucoseValueString}. It's above range.`,
            group: "out-of-range",
          });
        }

        this._lastRange = "high";
      } else {
        this.buttonText.style_class = "in-range";
        this._lastRange = "in-range";

        this._destroyNotification("out-of-range");
      }

      this.buttonText.set_text(glucoseValueString);

      this.buttonDelta.set_text(deltaText);
      this.buttonTrendArrows.set_text(arrow);
      this.buttonElapsedTime.set_text(elapsedText);
      this.buttonStaleElapsedTime.set_text(staleElapsedText);
    }

    _fromNameToArrowCharacter(directionValue) {
      const directionMap = {
        DoubleDown: "↓↓",
        DoubleUp: "↑↑",
        Flat: "→",
        FortyFiveDown: "↘",
        FortyFiveUp: "↗",
        SingleDown: "↓",
        SingleUp: "↑",
        TripleDown: "↓↓↓",
        TripleUp: "↑↑↑",
      };

      return directionMap[directionValue] || "";
    }

    _hasInternetConnection() {
      return Gio.NetworkMonitor.get_default().get_network_available();
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

    _convertBgValue(value) {
      if (UNITS === SERVER_UNITS) {
        return UNITS === "mmol/L" ? Number(value).toFixed(1) : value;
      }

      if (UNITS === "mmol/L" && SERVER_UNITS === "mg/dl") {
        const convertedValue = value * 0.0555;
        return Number(convertedValue.toFixed(1));
      }

      if (UNITS === "mg/dl" && SERVER_UNITS === "mmol/L") {
        const convertedValue = value / 0.0555;
        return Math.round(convertedValue);
      }

      return value;
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
