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
import * as Util from "resource:///org/gnome/shell/misc/util.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

// TODO: Include optional graph?
// TODO: Add button to test notifications in prefs
// TODO: Allow to set if the extension is for the user or for monitoring someone else and adjust copies
// TODO: Add colors based on range and setting to toggle them
// TODO: Add button to check connection to Nightscout server

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init({ settings, openSettings }) {
      super._init(0.0, _("My Shiny Indicator"));

      this._settings = settings;
      this._openSettings = openSettings;
      this._error = false;

      this._nightscoutUrl = this._settings.get_string("nightscout-url");
      this._authenticationToken = this._settings.get_string(
        "authentication-token",
      );
      this._refreshInterval = this._settings.get_int("refresh-interval");
      this._staleDataThreshold = this._settings.get_int("stale-data-threshold");
      this._timeoutTime = this._settings.get_int("timeout-time");

      this._showElapsedTime = this._settings.get_boolean("show-elapsed-time");
      this._showDelta = this._settings.get_boolean("show-delta");
      this._showTrendArrows = this._settings.get_boolean("show-trend-arrows");

      this._notificationOutOfRange = this._settings.get_boolean(
        "notification-out-of-range",
      );
      this._notificationStaleData = this._settings.get_boolean(
        "notification-stale-data",
      );
      this._notificationRapidlyChanges = this._settings.get_boolean(
        "notification-rapidly-changes",
      );
      this._notificationUrgencyLevel = this._settings.get_int(
        "notification-urgency-level",
      );

      this.httpSession = new Soup.Session();
      this.httpSession.timeout = this._timeoutTime;
      this.mainLoop = new GLib.MainLoop(null, false);

      this._initIndicator();
      this._initMenu();
      this._initListeners();
      this._initThresholds();

      this._checkUpdates();
      this._startLooping();
    }

    _initNotificationsSource() {
      if (!this._notifSource) {
        this._notifSource = new MessageTray.Source({
          title: "Nightscout",
          // "icon-name": "edit-paste-symbolic",
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
      this._showDelta || this.buttonDelta.hide();

      // ------ Toggle: show-trend-arrows

      this.buttonTrendArrows = new St.Label({
        text: "",
        style_class: "trend-arrows",
        y_align: Clutter.ActorAlign.CENTER,
      });

      this.box.add_child(this.buttonTrendArrows);
      this._showTrendArrows || this.buttonTrendArrows.hide();

      // ------ Toggle: show-elapsed-time

      this.buttonElapsedTime = new St.Label({
        text: "",
        style_class: "elapsed",
        y_align: Clutter.ActorAlign.CENTER,
      });

      this.box.add_child(this.buttonElapsedTime);
      this._showElapsedTime || this.buttonElapsedTime.hide();

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

    _initMenu() {
      let refreshNowItem = new PopupMenu.PopupMenuItem(_("Refresh now"));

      refreshNowItem.connect("activate", () => {
        this._checkUpdates();
      });

      this.menu.addMenuItem(refreshNowItem);

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      // ------ Open your Nightscout site

      let openNightscoutSiteItem = new PopupMenu.PopupMenuItem(
        _("Open your Nightscout site"),
      );

      openNightscoutSiteItem.connect("activate", () => {
        this._openNightscoutSite();
      });

      this.menu.addMenuItem(openNightscoutSiteItem);

      this.debugNightscoutUrl = new PopupMenu.PopupMenuItem(
        this._nightscoutUrl || "Missing url!",
        { reactive: false },
      );
      this.menu.addMenuItem(this.debugNightscoutUrl);

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      // ------ Toggle: show-delta

      let showDeltaItem = new PopupMenu.PopupSwitchMenuItem(
        _("Show delta"),
        this._showDelta,
      );

      showDeltaItem.connect("toggled", (item) => {
        this._settings.set_boolean("show-delta", item.state);
      });

      this.menu.addMenuItem(showDeltaItem);

      // ------ Toggle: show-trend-arrows

      let showTrendArrowsItem = new PopupMenu.PopupSwitchMenuItem(
        _("Show trend arrows"),
        this._showTrendArrows,
      );

      showTrendArrowsItem.connect("toggled", (item) => {
        this._settings.set_boolean("show-trend-arrows", item.state);
      });

      this.menu.addMenuItem(showTrendArrowsItem);

      // ------ Toggle: show-elapsed-time

      let showElapsedTimeItem = new PopupMenu.PopupSwitchMenuItem(
        _("Show elapsed time"),
        this._showElapsedTime,
      );

      showElapsedTimeItem.connect("toggled", (item) => {
        this._settings.set_boolean("show-elapsed-time", item.state);
      });

      this.menu.addMenuItem(showElapsedTimeItem);

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      // ------ Settings

      let settingsItem = new PopupMenu.PopupMenuItem(_("All settings"));

      settingsItem.connect("activate", () => {
        this._openSettings();
      });

      this.menu.addMenuItem(settingsItem);
    }

    _initListeners() {
      this._settings.connect("changed::nightscout-url", () => {
        this._nightscoutUrl = this._settings.get_string("nightscout-url");
        this.debugNightscoutUrl.label.text =
          this._nightscoutUrl || "Missing url!";
      });

      this._settings.connect(
        "changed::authentication-token",
        () =>
          (this._authenticationToken = this._settings.get_string(
            "authentication-token",
          )),
      );

      this._settings.connect(
        "changed::refresh-interval",
        () =>
          (this._refreshInterval = this._settings.get_int("refresh-interval")),
      );

      this._settings.connect(
        "changed::stale-data-threshold",
        () =>
          (this._staleDataThreshold = this._settings.get_int(
            "stale-data-threshold",
          )),
      );

      const toggleListeners = [
        {
          setting: "show-elapsed-time",
          key: "ElapsedTime",
        },
        {
          setting: "show-delta",
          key: "Delta",
        },
        {
          setting: "show-trend-arrows",
          key: "TrendArrows",
        },
      ];

      toggleListeners.forEach((listener) => {
        this._settings.connect(`changed::${listener.setting}`, () => {
          this[`_show${listener.key}`] = this._settings.get_boolean(
            listener.setting,
          );
          this[`_show${listener.key}`]
            ? this[`button${listener.key}`].show()
            : this[`button${listener.key}`].hide();
        });
      });

      this._settings.connect(
        "changed::notification-out-of-range",
        () =>
          (this._notificationOutOfRange = this._settings.get_boolean(
            "notification-out-of-range",
          )),
      );

      this._settings.connect(
        "changed::notification-stale-data",
        () =>
          (this._notificationStaleData = this._settings.get_boolean(
            "notification-stale-data",
          )),
      );

      this._settings.connect(
        "changed::notification-rapidly-changes",
        () =>
          (this._notificationRapidlyChanges = this._settings.get_boolean(
            "notification-rapidly-changes",
          )),
      );

      this._settings.connect(
        "changed::notification-urgency-level",
        () =>
          (this._notificationUrgencyLevel = this._settings.get_int(
            "notification-urgency-level",
          )),
      );
    }

    async _initThresholds() {
      const data = await this._fetchFromNightscout("/api/v1/status");

      if (!data) {
        return;
      }

      const thresholds = data.settings.thresholds;

      this._thresholdBgHigh = thresholds.bgHigh;
      this._thresholdBgTargetTop = thresholds.bgTargetTop;
      this._thresholdBgTargetBottom = thresholds.bgTargetBottom;
      this._thresholdBgLow = thresholds.bgLow;
    }

    async _fetchFromNightscout(url) {
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

        if (statusCode !== 200) {
          return;
        }

        if (this.get_child_at_index(0) == this.errorBox) {
          this.replace_child(this.errorBox, this.box);
        }
        this._error = false;

        const data = JSON.parse(responseBody);

        return data;
      } catch (error) {
        log(`NS Error on ${url}: ${error.message}`);

        if (this.get_child_at_index(0) == this.box) {
          this.replace_child(this.box, this.errorBox);
        }
        this._error = true;

        this._showNotification(
          "Error calling " + url,
          error.message,
          "open-settings",
        );

        return null;
      }
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
          this._openSettings();
        });
      }

      this._notifSource.addNotification(notification);
    }

    _startLooping() {
      GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT,
        this._refreshInterval,
        () => this._checkUpdates(),
      );
    }

    _openNightscoutSite() {
      const url = this._getUrl("/");

      Util.spawn(["xdg-open", url]);
    }

    _getNotificationUrgencyLevel() {
      switch (this._notificationUrgencyLevel) {
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

    destroy() {
      if (this.mainLoop) {
        this.mainLoop.quit();
      }
      super.destroy();
    }

    _getUrl(url) {
      let fullUrl = this._nightscoutUrl + url;

      if (this._authenticationToken) {
        fullUrl +=
          (fullUrl.includes("?") ? "&" : "?") +
          "token=" +
          encodeURIComponent(this._authenticationToken);
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
        this._notificationRapidlyChanges &&
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

      if (elapsed >= this._staleDataThreshold * 60) {
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

      if (glucoseValue < this._thresholdBgLow) {
        this.buttonText.style_class = "very-low-glucose";

        this._notificationOutOfRange &&
          this._lastRange !== "very-low" &&
          this._showNotification(
            "You're VERY low!",
            `Glucose level is ${glucoseValue}. DO SOMETHING!`,
          );

        this._lastRange = "very-low";
      } else if (glucoseValue < this._thresholdBgTargetBottom) {
        this.buttonText.style_class = "low-glucose";

        this._notificationOutOfRange &&
          this._lastRange !== "very-low" &&
          this._lastRange !== "low" &&
          this._showNotification(
            "You're too low!",
            `Glucose level is ${glucoseValue}. It's below range.`,
          );

        this._lastRange = "low";
      } else if (glucoseValue > this._thresholdBgHigh) {
        this.buttonText.style_class = "very-high-glucose";

        this._notificationOutOfRange &&
          this._lastRange !== "very-high" &&
          this._showNotification(
            "You're too high!",
            `Glucose level is ${glucoseValue}. Did you forget your insulin?`,
          );

        this._lastRange = "very-high";
      } else if (glucoseValue > this._thresholdBgTargetTop) {
        this.buttonText.style_class = "high-glucose";

        this._notificationOutOfRange &&
          this._lastRange !== "very-high" &&
          this._lastRange !== "high" &&
          this._showNotification(
            "You're high!",
            `Glucose level is ${glucoseValue}. It's above range.`,
          );

        this._lastRange = "high";
      } else {
        this.buttonText.style_class = "fresh-data";

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
