import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import Adw from "gi://Adw";
import Soup from "gi://Soup";
import Gdk from "gi://Gdk";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class NightscoutPreferences extends ExtensionPreferences {
  constructor(metadata) {
    super(metadata);

    // Store metadata for access in methods
    this._extensionMetadata = metadata;

    console.debug(`constructing ${this.metadata.name}`);
  }

  fillPreferencesWindow(window) {
    window._settings = this.getSettings();

    const page = new Adw.PreferencesPage({
      title: _("General"),
      icon_name: "applications-system-symbolic",
    });
    window.add(page);

    const instanceGroup = new Adw.PreferencesGroup({
      title: _("Nightscout instance"),
    });
    page.add(instanceGroup);

    const nightscoutUrlRow = new Adw.EntryRow({
      title: _("Url"),
    });
    instanceGroup.add(nightscoutUrlRow);

    window._settings.bind(
      "nightscout-url",
      nightscoutUrlRow,
      "text",
      Gio.SettingsBindFlags.DEFAULT,
    );

    const authenticationTokenRow = new Adw.PasswordEntryRow({
      title: _("Authentication token"),
    });
    instanceGroup.add(authenticationTokenRow);

    window._settings.bind(
      "authentication-token",
      authenticationTokenRow,
      "text",
      Gio.SettingsBindFlags.DEFAULT,
    );

    const statusRow = new Adw.ActionRow({
      title: _("Click to check the server status"),
    });
    instanceGroup.add(statusRow);

    const statusButton = new Gtk.Button({
      label: _("Check status"),
      valign: Gtk.Align.CENTER,
    });
    statusRow.add_suffix(statusButton);

    statusButton.connect("clicked", () => {
      this._checkServerStatus(window._settings, statusRow);
    });

    const generalGroup = new Adw.PreferencesGroup({
      title: _("General settings"),
    });
    page.add(generalGroup);

    const refreshIntervalRow = new Adw.SpinRow({
      title: _("Seconds between data updates"),
      adjustment: new Gtk.Adjustment({
        lower: 30,
        upper: 600,
        step_increment: 10,
      }),
    });
    generalGroup.add(refreshIntervalRow);

    window._settings.bind(
      "refresh-interval",
      refreshIntervalRow,
      "value",
      Gio.SettingsBindFlags.DEFAULT,
    );

    const staleDataThresholdRow = new Adw.SpinRow({
      title: _("Minutes before marking data as stale"),
      adjustment: new Gtk.Adjustment({
        lower: 5,
        upper: 60,
        step_increment: 1,
      }),
    });
    generalGroup.add(staleDataThresholdRow);

    window._settings.bind(
      "stale-data-threshold",
      staleDataThresholdRow,
      "value",
      Gio.SettingsBindFlags.DEFAULT,
    );

    const toggleInformationGroup = new Adw.PreferencesGroup({
      title: _("Toggle information"),
    });
    page.add(toggleInformationGroup);

    const showDeltaRow = new Adw.SwitchRow({
      title: _("Show delta"),
      subtitle: _(
        "The variation between the current and the previous glucose level",
      ),
    });
    toggleInformationGroup.add(showDeltaRow);

    window._settings.bind(
      "show-delta",
      showDeltaRow,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );

    const showTrendArrowsRow = new Adw.SwitchRow({
      title: _("Show trend arrows"),
      subtitle: _("Trend arrows next to your reading"),
    });
    toggleInformationGroup.add(showTrendArrowsRow);

    window._settings.bind(
      "show-trend-arrows",
      showTrendArrowsRow,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );

    const showElapsedTimeRow = new Adw.SwitchRow({
      title: _("Show elapsed time"),
      subtitle: _("Whether to show the panel indicator"),
    });
    toggleInformationGroup.add(showElapsedTimeRow);

    window._settings.bind(
      "show-elapsed-time",
      showElapsedTimeRow,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );

    const showStaleElapsedTimeRow = new Adw.SwitchRow({
      title: _("Show stale elapsed time"),
      subtitle: _("Also show elapsed time when stale"),
    });
    toggleInformationGroup.add(showStaleElapsedTimeRow);

    window._settings.bind(
      "show-stale-elapsed-time",
      showStaleElapsedTimeRow,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );

    const unitsGroup = new Adw.PreferencesGroup({
      title: _("Units"),
    });
    page.add(unitsGroup);

    const unitsList = new Gtk.StringList();
    unitsList.append(_("Auto (from server)"));
    unitsList.append(_("mg/dL"));
    unitsList.append(_("mmol/L"));

    const unitsSelectionRow = new Adw.ComboRow({
      title: _("Glucose units"),
      subtitle: _("Used to display glucose values."),
      model: unitsList,
    });
    unitsGroup.add(unitsSelectionRow);

    const unitsMap = ["auto", "mg/dl", "mmol/L"];
    const currentUnits = window._settings.get_string("units-selection");
    const currentIndex = unitsMap.indexOf(currentUnits);

    if (currentIndex !== -1) {
      unitsSelectionRow.set_selected(currentIndex);
    }

    unitsSelectionRow.connect("notify::selected", () => {
      const selectedIndex = unitsSelectionRow.get_selected();
      if (selectedIndex >= 0 && selectedIndex < unitsMap.length) {
        window._settings.set_string("units-selection", unitsMap[selectedIndex]);
      }
    });

    const notificationsGroup = new Adw.PreferencesGroup({
      title: _("Notifications"),
    });
    page.add(notificationsGroup);

    const notificationOutOfRangeRow = new Adw.SwitchRow({
      title: _("When I go out of range"),
    });
    notificationsGroup.add(notificationOutOfRangeRow);

    window._settings.bind(
      "notification-out-of-range",
      notificationOutOfRangeRow,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );

    const notificationStaleDataRow = new Adw.SwitchRow({
      title: _("When data is marked as stale"),
    });
    notificationsGroup.add(notificationStaleDataRow);

    window._settings.bind(
      "notification-stale-data",
      notificationStaleDataRow,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );

    const notificationRapidlyChangesRow = new Adw.SwitchRow({
      title: _("When the level rises or drops rapidly"),
    });
    notificationsGroup.add(notificationRapidlyChangesRow);

    window._settings.bind(
      "notification-rapidly-changes",
      notificationRapidlyChangesRow,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );

    let urgencyLevelsList = new Gtk.StringList();
    urgencyLevelsList.append(_("Low"));
    urgencyLevelsList.append(_("Normal"));
    urgencyLevelsList.append(_("High"));
    urgencyLevelsList.append(_("Critical"));

    const notificationUrgencyLevelRow = new Adw.ComboRow({
      title: _("Urgency level"),
      subtitle: _(
        "Determines how and when notifications are presented to the user.",
      ),
      model: urgencyLevelsList,
    });
    notificationsGroup.add(notificationUrgencyLevelRow);

    window._settings.bind(
      "notification-urgency-level",
      notificationUrgencyLevelRow,
      "selected",
      Gio.SettingsBindFlags.DEFAULT,
    );

    const advancedSettingsGroup = new Adw.PreferencesGroup({
      title: _("Advanced settings"),
    });
    page.add(advancedSettingsGroup);

    const timeoutTimeRow = new Adw.SpinRow({
      title: _("Seconds to timeout calls"),
      adjustment: new Gtk.Adjustment({
        lower: 5,
        upper: 120,
        step_increment: 1,
      }),
    });
    advancedSettingsGroup.add(timeoutTimeRow);

    window._settings.bind(
      "timeout-time",
      timeoutTimeRow,
      "value",
      Gio.SettingsBindFlags.DEFAULT,
    );

    // Debug page
    const debugPage = new Adw.PreferencesPage({
      title: _("Debug"),
      icon_name: "applications-science-symbolic",
    });
    window.add(debugPage);

    const headerGroup = new Adw.PreferencesGroup();
    debugPage.add(headerGroup);

    const extensionVersion =
      this._extensionMetadata["version-name"] ||
      this._extensionMetadata.version ||
      "Unknown";
    const copyDebugRow = new Adw.ActionRow({
      title: `${_("Extension Version")}: ${extensionVersion}`,
      subtitle: _("You can copy this debugging info to share it easily."),
    });
    headerGroup.add(copyDebugRow);

    const copyDebugButton = new Gtk.Button({
      label: _("Copy debug info"),
      valign: Gtk.Align.CENTER,
    });
    copyDebugRow.add_suffix(copyDebugButton);

    // Server configuration group
    const serverConfigGroup = new Adw.PreferencesGroup({
      title: _("Server Configuration"),
    });
    debugPage.add(serverConfigGroup);

    const serverStatusRow = new Adw.ActionRow({
      title: _("Server Status"),
      subtitle: _("Click 'Refresh' to fetch server data"),
    });
    serverConfigGroup.add(serverStatusRow);

    // Local settings group
    const localSettingsGroup = new Adw.PreferencesGroup({
      title: _("Local Extension Settings"),
    });
    debugPage.add(localSettingsGroup);

    // Computed values group
    const computedValuesGroup = new Adw.PreferencesGroup({
      title: _("Computed Values"),
    });
    debugPage.add(computedValuesGroup);

    // Store debug elements for updating
    window._debugElements = {
      serverStatusRow,
      serverConfigGroup,
      localSettingsGroup,
      computedValuesGroup,
    };

    // Store reference for refresh button
    window._refreshButton = null;

    // Connect copy button
    copyDebugButton.connect("clicked", () => {
      this._copyAllDebugInfo(window._settings, window._debugElements);
    });

    // Connect to settings changes for real-time debug updates
    window._settingsHandler = window._settings.connect("changed", () => {
      this._updateDebugInfo(window._settings, window._debugElements);
    });

    // Initial debug info load
    this._fetchServerConfigForDebug(window._settings, window._debugElements);
    this._displayLocalSettings(window._settings, localSettingsGroup);
  }

  _checkServerStatus(settings, statusLabel) {
    const nightscoutUrl = settings.get_string("nightscout-url");
    const authToken = settings.get_string("authentication-token");

    if (!nightscoutUrl) {
      statusLabel.set_title(_("Error: Nightscout URL not set"));
      return;
    }

    statusLabel.set_title(_("Checking..."));

    const session = new Soup.Session();
    const message = Soup.Message.new("GET", `${nightscoutUrl}/api/v1/status`);
    message.request_headers.append("Accept", "application/json");

    if (authToken) {
      message.request_headers.append("API-SECRET", authToken);
    }

    try {
      session.send_and_read_async(message, null, null, (session, result) => {
        if (message.status_code == Soup.Status.UNAUTHORIZED) {
          statusLabel.set_title(
            _(`Error: Unauthorized. Check your authentication token.`),
          );
          throw new Error(`HTTP error! status: ${message.status_code}`);
        }

        if (message.status_code !== Soup.Status.OK) {
          statusLabel.set_title(_(`Error: Check if the url is correct.`));
          throw new Error(`HTTP error! status: ${message.status_code}`);
        }

        const bytes = session.send_and_read_finish(result);
        const decoder = new TextDecoder("utf-8");
        const response = JSON.parse(decoder.decode(bytes.get_data()));
        const version = response.version;
        statusLabel.set_title(_(`Success! Version: ${version}`));
      });
    } catch (error) {
      console.log(error);
      statusLabel.set_title(_(`Error: ${error.message}`));
    }
  }

  _refreshDebugInfo(settings, debugElements) {
    const {
      serverStatusRow,
      serverConfigGroup,
      localSettingsGroup,
      computedValuesGroup,
    } = debugElements;

    // Update server status to show loading
    serverStatusRow.set_subtitle(_("Fetching server configuration..."));

    // Fetch server configuration and local settings
    this._fetchServerConfigForDebug(settings, debugElements);
    this._updateLocalSettings(settings, localSettingsGroup);
  }

  _updateDebugInfo(settings, debugElements) {
    const { localSettingsGroup, computedValuesGroup } = debugElements;

    // Update local settings display
    this._updateLocalSettings(settings, localSettingsGroup);

    // Update computed values if server data is available
    if (window._lastServerData) {
      this._updateComputedValues(
        window._lastServerData,
        settings,
        computedValuesGroup,
      );
    }
  }

  async _fetchServerConfigForDebug(settings, debugElements) {
    const { serverStatusRow, serverConfigGroup, computedValuesGroup } =
      debugElements;

    // Make sure server status row is added if not already present
    if (!serverConfigGroup.get_first_child()) {
      serverConfigGroup.add(serverStatusRow);
    }

    // Store reference to debug elements for copying
    window._lastServerData = null;

    const nightscoutUrl = settings.get_string("nightscout-url");
    const authToken = settings.get_string("authentication-token");

    if (!nightscoutUrl) {
      serverStatusRow.set_title(_("Error"));
      serverStatusRow.set_subtitle(_("Nightscout URL not configured"));
      return;
    }

    const session = new Soup.Session();
    const message = Soup.Message.new("GET", `${nightscoutUrl}/api/v1/status`);
    message.request_headers.append("Accept", "application/json");

    if (authToken) {
      message.request_headers.append("API-SECRET", authToken);
    }

    try {
      const bytes = await new Promise((resolve, reject) => {
        session.send_and_read_async(message, null, null, (session, result) => {
          try {
            if (message.status_code == Soup.Status.UNAUTHORIZED) {
              reject(
                new Error("Unauthorized. Check your authentication token."),
              );
              return;
            }

            if (message.status_code !== Soup.Status.OK) {
              reject(new Error(`HTTP error! status: ${message.status_code}`));
              return;
            }

            resolve(session.send_and_read_finish(result));
          } catch (error) {
            reject(error);
          }
        });
      });

      const decoder = new TextDecoder("utf-8");
      const response = JSON.parse(decoder.decode(bytes.get_data()));

      const currentTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: this._is24HourFormat() === false,
      });

      serverStatusRow.set_title(_("Connected"));
      serverStatusRow.set_subtitle(
        _(`Fetched server configuration at ${currentTime}.`),
      );

      // Add refresh button to the status row if it doesn't exist
      if (!window._refreshButton) {
        window._refreshButton = new Gtk.Button({
          label: _("Fetch server configuration"),
          valign: Gtk.Align.CENTER,
        });
        serverStatusRow.add_suffix(window._refreshButton);

        // Connect refresh button
        window._refreshButton.connect("clicked", () => {
          this._refreshDebugInfo(settings, debugElements);
        });
      }

      // Store server data for copying
      window._lastServerData = response;

      this._displayServerConfig(response, serverConfigGroup);
      this._displayComputedValues(response, settings, computedValuesGroup);
    } catch (error) {
      console.log(error);
      serverStatusRow.set_title(_("Error"));
      serverStatusRow.set_subtitle(error.message);

      // Add error details row
      const errorRow = new Adw.ActionRow({
        title: _("Error Details"),
        subtitle: error.toString(),
      });
      serverConfigGroup.add(errorRow);
    }
  }

  _displayServerConfig(serverData, group) {
    // Extension version (already added at top of debug page)
    // This row is now handled in fillPreferencesWindow

    // Server version
    if (serverData.version) {
      const versionRow = new Adw.ActionRow({
        title: _("Server Version"),
        subtitle: serverData.version,
      });
      versionRow.add_css_class("property");
      group.add(versionRow);
    }

    // Server settings
    if (serverData.settings) {
      const settings = serverData.settings;

      // Units
      if (settings.units) {
        const unitsRow = new Adw.ActionRow({
          title: _("Server Units"),
          subtitle: settings.units,
        });
        unitsRow.add_css_class("property");
        group.add(unitsRow);
      }

      // Thresholds
      if (settings.thresholds) {
        const thresholds = settings.thresholds;

        if (thresholds.bgLow !== undefined) {
          const bgLowRow = new Adw.ActionRow({
            title: _("Server Low Threshold"),
            subtitle: thresholds.bgLow.toString(),
          });
          bgLowRow.add_css_class("property");
          group.add(bgLowRow);
        }

        if (thresholds.bgTargetBottom !== undefined) {
          const bgTargetBottomRow = new Adw.ActionRow({
            title: _("Server Target Bottom"),
            subtitle: thresholds.bgTargetBottom.toString(),
          });
          bgTargetBottomRow.add_css_class("property");
          group.add(bgTargetBottomRow);
        }

        if (thresholds.bgTargetTop !== undefined) {
          const bgTargetTopRow = new Adw.ActionRow({
            title: _("Server Target Top"),
            subtitle: thresholds.bgTargetTop.toString(),
          });
          bgTargetTopRow.add_css_class("property");
          group.add(bgTargetTopRow);
        }

        if (thresholds.bgHigh !== undefined) {
          const bgHighRow = new Adw.ActionRow({
            title: _("Server High Threshold"),
            subtitle: thresholds.bgHigh.toString(),
          });
          bgHighRow.add_css_class("property");
          group.add(bgHighRow);
        }
      }
    }
  }

  _displayLocalSettings(settings, group) {
    // Store group reference for updates
    window._debugSettingsGroup = group;

    // Create helper function to format display values
    const formatDisplay = (key, value) => {
      switch (key) {
        case "nightscout-url":
          return value || _("Not set");
        case "authentication-token":
          return value ? `${value.substring(0, 4)}***` : _("Not set");
        case "refresh-interval":
        case "timeout-time":
          return _(`${value} seconds`);
        case "stale-data-threshold":
          return _(`${value} minutes`);
        case "notification-urgency-level":
          const urgencyLevels = [
            _("Low"),
            _("Normal"),
            _("High"),
            _("Critical"),
          ];
          return urgencyLevels[value] || _("Unknown");
        default:
          return typeof value === "boolean"
            ? value
              ? _("Enabled")
              : _("Disabled")
            : value;
      }
    };

    // URL - we can't bind directly since we need special formatting
    const urlRow = new Adw.ActionRow({
      title: _("Nightscout URL"),
      subtitle: formatDisplay(
        "nightscout-url",
        settings.get_string("nightscout-url"),
      ),
    });
    urlRow.add_css_class("property");
    group.add(urlRow);

    // Listen for URL changes
    settings.connect("changed::nightscout-url", () => {
      urlRow.subtitle = formatDisplay(
        "nightscout-url",
        settings.get_string("nightscout-url"),
      );
    });

    // Auth token - special formatting
    const tokenRow = new Adw.ActionRow({
      title: _("Authentication Token"),
      subtitle: formatDisplay(
        "authentication-token",
        settings.get_string("authentication-token"),
      ),
    });
    tokenRow.add_css_class("property");
    group.add(tokenRow);

    // Listen for auth token changes
    settings.connect("changed::authentication-token", () => {
      tokenRow.subtitle = formatDisplay(
        "authentication-token",
        settings.get_string("authentication-token"),
      );
    });

    // Bind settings that can be directly mapped
    const bindableSettings = [
      {
        key: "refresh-interval",
        property: "subtitle",
        format: (v) => formatDisplay("refresh-interval", v),
      },
      {
        key: "timeout-time",
        property: "subtitle",
        format: (v) => formatDisplay("timeout-time", v),
      },
      {
        key: "stale-data-threshold",
        property: "subtitle",
        format: (v) => formatDisplay("stale-data-threshold", v),
      },
      { key: "units-selection", property: "subtitle", format: (v) => v },
      {
        key: "show-delta",
        property: "subtitle",
        format: (v) => formatDisplay("show-delta", v),
      },
      {
        key: "show-trend-arrows",
        property: "subtitle",
        format: (v) => formatDisplay("show-trend-arrows", v),
      },
      {
        key: "show-elapsed-time",
        property: "subtitle",
        format: (v) => formatDisplay("show-elapsed-time", v),
      },
      {
        key: "show-stale-elapsed-time",
        property: "subtitle",
        format: (v) => formatDisplay("show-stale-elapsed-time", v),
      },
      {
        key: "notification-out-of-range",
        property: "subtitle",
        format: (v) => formatDisplay("notification-out-of-range", v),
      },
      {
        key: "notification-stale-data",
        property: "subtitle",
        format: (v) => formatDisplay("notification-stale-data", v),
      },
      {
        key: "notification-rapidly-changes",
        property: "subtitle",
        format: (v) => formatDisplay("notification-rapidly-changes", v),
      },
      {
        key: "notification-urgency-level",
        property: "subtitle",
        format: (v) => formatDisplay("notification-urgency-level", v),
      },
    ];

    bindableSettings.forEach(({ key, property, format }) => {
      // Get initial value and create row
      let value;
      if (
        key.includes("interval") ||
        key.includes("timeout") ||
        key.includes("threshold") ||
        key.includes("urgency")
      ) {
        value = settings.get_int(key);
      } else if (key.includes("show-") || key.includes("notification-")) {
        value = settings.get_boolean(key);
      } else {
        value = settings.get_string(key);
      }

      const title = key
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      const row = new Adw.ActionRow({
        title: title,
        subtitle: format(value),
      });
      row.add_css_class("property");
      group.add(row);

      // Create a wrapper to handle the formatting
      const settingsObject = {
        get: () => {
          let val;
          if (
            key.includes("interval") ||
            key.includes("timeout") ||
            key.includes("threshold") ||
            key.includes("urgency")
          ) {
            val = settings.get_int(key);
          } else if (key.includes("show-") || key.includes("notification-")) {
            val = settings.get_boolean(key);
          } else {
            val = settings.get_string(key);
          }
          return format(val);
        },
        set: () => {}, // Read-only for display
      };

      // Connect to changes
      settings.connect(`changed::${key}`, () => {
        row[property] = settingsObject.get();
      });
    });
  }

  _updateLocalSettings(settings, group) {
    // Find and update existing rows
    let child = group.get_first_child();
    let rowIndex = 0;

    const settingsData = [
      {
        key: "nightscout-url",
        type: "string",
        format: (v) => v || _("Not set"),
      },
      {
        key: "authentication-token",
        type: "string",
        format: (v) => (v ? `${v.substring(0, 4)}***` : _("Not set")),
      },
      {
        key: "refresh-interval",
        type: "int",
        format: (v) => _(`${v} seconds`),
      },
      { key: "timeout-time", type: "int", format: (v) => _(`${v} seconds`) },
      {
        key: "stale-data-threshold",
        type: "int",
        format: (v) => _(`${v} minutes`),
      },
      { key: "units-selection", type: "string", format: (v) => v },
      {
        key: "show-delta",
        type: "boolean",
        format: (v) => (v ? _("Enabled") : _("Disabled")),
      },
      {
        key: "show-trend-arrows",
        type: "boolean",
        format: (v) => (v ? _("Enabled") : _("Disabled")),
      },
      {
        key: "show-elapsed-time",
        type: "boolean",
        format: (v) => (v ? _("Enabled") : _("Disabled")),
      },
      {
        key: "show-stale-elapsed-time",
        type: "boolean",
        format: (v) => (v ? _("Enabled") : _("Disabled")),
      },
      {
        key: "notification-out-of-range",
        type: "boolean",
        format: (v) => (v ? _("Enabled") : _("Disabled")),
      },
      {
        key: "notification-stale-data",
        type: "boolean",
        format: (v) => (v ? _("Enabled") : _("Disabled")),
      },
      {
        key: "notification-rapidly-changes",
        type: "boolean",
        format: (v) => (v ? _("Enabled") : _("Disabled")),
      },
      {
        key: "notification-urgency-level",
        type: "int",
        format: (v) =>
          [_("Low"), _("Normal"), _("High"), _("Critical")][v] || _("Unknown"),
      },
    ];

    while (child && rowIndex < settingsData.length) {
      const setting = settingsData[rowIndex];
      let value;

      if (setting.type === "string") {
        value = settings.get_string(setting.key);
      } else if (setting.type === "int") {
        value = settings.get_int(setting.key);
      } else if (setting.type === "boolean") {
        value = settings.get_boolean(setting.key);
      }

      child.set_subtitle(setting.format(value));
      child = child.get_next_sibling();
      rowIndex++;
    }
  }

  _copyAllDebugInfo(settings, debugElements) {
    const nightscoutUrl = settings.get_string("nightscout-url");
    const authToken = settings.get_string("authentication-token");
    const refreshInterval = settings.get_int("refresh-interval");
    const timeout = settings.get_int("timeout-time");
    const staleThreshold = settings.get_int("stale-data-threshold");

    const unitsSelection = settings.get_string("units-selection");
    const showDelta = settings.get_boolean("show-delta");
    const showTrendArrows = settings.get_boolean("show-trend-arrows");
    const showElapsedTime = settings.get_boolean("show-elapsed-time");
    const showStaleElapsedTime = settings.get_boolean(
      "show-stale-elapsed-time",
    );

    const notifOutOfRange = settings.get_boolean("notification-out-of-range");
    const notifStaleData = settings.get_boolean("notification-stale-data");
    const notifRapidChanges = settings.get_boolean(
      "notification-rapidly-changes",
    );
    const notifUrgency = settings.get_int("notification-urgency-level");

    // Get relevant server data that's displayed in the debug tab
    let serverConfig = {
      version: null,
      units: null,
      thresholds: null,
    };

    if (window._lastServerData) {
      serverConfig.version = window._lastServerData.version || null;

      if (window._lastServerData.settings) {
        const serverSettings = window._lastServerData.settings;
        serverConfig.units = serverSettings.units || null;

        if (serverSettings.thresholds) {
          serverConfig.thresholds = {
            bgLow: serverSettings.thresholds.bgLow,
            bgTargetBottom: serverSettings.thresholds.bgTargetBottom,
            bgTargetTop: serverSettings.thresholds.bgTargetTop,
            bgHigh: serverSettings.thresholds.bgHigh,
          };
        }
      }
    }

    // Get computed values if server data is available
    let computedValues = {};
    if (window._lastServerData && window._lastServerData.settings) {
      const serverSettings = window._lastServerData.settings;
      const serverUnits = ["mmol", "mmol/L"].includes(serverSettings.units)
        ? "mmol/L"
        : "mg/dl";
      const effectiveUnits =
        unitsSelection === "auto" ? serverUnits : unitsSelection;

      computedValues = {
        effectiveUnits,
        serverUnits,
        unitsSelection,
      };

      if (serverSettings.thresholds) {
        const thresholds = serverSettings.thresholds;
        const conversionFactor =
          effectiveUnits === "mmol/L" && serverUnits === "mg/dl"
            ? 0.0555
            : effectiveUnits === "mg/dl" && serverUnits === "mmol/L"
              ? 1 / 0.0555
              : 1;

        computedValues.thresholds = {
          low:
            thresholds.bgLow !== undefined
              ? Math.round(thresholds.bgLow * conversionFactor * 10) / 10
              : null,
          targetBottom:
            thresholds.bgTargetBottom !== undefined
              ? Math.round(thresholds.bgTargetBottom * conversionFactor * 10) /
                10
              : null,
          targetTop:
            thresholds.bgTargetTop !== undefined
              ? Math.round(thresholds.bgTargetTop * conversionFactor * 10) / 10
              : null,
          high:
            thresholds.bgHigh !== undefined
              ? Math.round(thresholds.bgHigh * conversionFactor * 10) / 10
              : null,
        };
      }
    }

    const allDebugInfo = {
      timestamp: new Date().toISOString(),
      extensionVersion:
        this._extensionMetadata["version-name"] ||
        this._extensionMetadata.version ||
        "Unknown",
      localSettings: {
        connection: {
          nightscoutUrl: "[REDACTED]",
          authToken: authToken ? "[REDACTED]" : null,
          refreshInterval,
          timeout,
          staleThreshold,
        },
        display: {
          unitsSelection,
          showDelta,
          showTrendArrows,
          showElapsedTime,
          showStaleElapsedTime,
        },
        notifications: {
          outOfRange: notifOutOfRange,
          staleData: notifStaleData,
          rapidChanges: notifRapidChanges,
          urgency: notifUrgency,
        },
      },
      serverConfiguration: serverConfig,
      computedValues,
    };

    const clipboard = Gdk.Display.get_default().get_clipboard();
    clipboard.set(JSON.stringify(allDebugInfo, null, 2));
  }

  _displayComputedValues(serverData, settings, group) {
    // Store computed values data for updates
    window._debugComputedData = {
      serverData,
      settings,
      group,
    };

    const serverSettings = serverData.settings || {};
    const serverUnits = ["mmol", "mmol/L"].includes(serverSettings.units)
      ? "mmol/L"
      : "mg/dl";
    const unitsSelection = settings.get_string("units-selection");
    const effectiveUnits =
      unitsSelection === "auto" ? serverUnits : unitsSelection;

    // Effective units
    const effectiveUnitsRow = new Adw.ActionRow({
      title: _("Effective Units"),
      subtitle: effectiveUnits,
    });
    effectiveUnitsRow.add_css_class("property");
    group.add(effectiveUnitsRow);

    // Computed thresholds
    if (serverSettings.thresholds) {
      const thresholds = serverSettings.thresholds;
      const conversionFactor =
        effectiveUnits === "mmol/L" && serverUnits === "mg/dl"
          ? 0.0555
          : effectiveUnits === "mg/dl" && serverUnits === "mmol/L"
            ? 1 / 0.0555
            : 1;

      const computedValues = [
        { name: _("Computed Low"), server: thresholds.bgLow },
        {
          name: _("Computed Target Bottom"),
          server: thresholds.bgTargetBottom,
        },
        { name: _("Computed Target Top"), server: thresholds.bgTargetTop },
        { name: _("Computed High"), server: thresholds.bgHigh },
      ];

      computedValues.forEach(({ name, server }) => {
        if (server !== undefined) {
          const converted = Math.round(server * conversionFactor * 10) / 10;
          const row = new Adw.ActionRow({
            title: name,
            subtitle: `${converted} ${effectiveUnits} (server: ${server} ${serverUnits})`,
          });
          row.add_css_class("property");
          group.add(row);
        }
      });
    }
  }

  _updateComputedValues(serverData, settings, group) {
    // Clear existing computed values
    let child = group.get_first_child();
    while (child) {
      group.remove(child);
      child = group.get_first_child();
    }

    // Redisplay computed values with updated settings
    this._displayComputedValues(serverData, settings, group);
  }

  _is24HourFormat() {
    // Get the user's time format preference
    const settings = new Gio.Settings({
      schema: "org.gnome.desktop.interface",
    });

    const clockFormat = settings.get_string("clock-format");
    return clockFormat === "24h";
  }
}
