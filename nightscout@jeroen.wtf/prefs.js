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

    this._extensionMetadata = metadata;

    // Global settings schema for debug display
    this._settingsSchema = [
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
      {
        key: "timeout-time",
        type: "int",
        format: (v) => _(`${v} seconds`),
      },
      {
        key: "stale-data-threshold",
        type: "int",
        format: (v) => _(`${v} minutes`),
      },
      {
        key: "units-selection",
        type: "string",
        format: (v) => v,
      },
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

    const urgencyLevelsList = new Gtk.StringList();
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
      title: _("Diagnostics"),
      icon_name: "org.gnome.Settings-device-diagnostics-symbolic",
    });
    window.add(debugPage);

    const headerGroup = new Adw.PreferencesGroup({
      title: _("What is this screen?"),
      description: _(
        "Use this data to report any problem with the extension. You can attach the info copied with the button below.",
      ),
    });
    debugPage.add(headerGroup);

    const extensionVersion =
      this._extensionMetadata["version-name"] ||
      this._extensionMetadata.version ||
      "Unknown";

    // Extension version row
    const versionRow = new Adw.ActionRow({
      title: `${_("Extension Version")}: ${extensionVersion}`,
    });
    headerGroup.add(versionRow);

    const githubIssuesButton = new Gtk.LinkButton({
      label: _("Go to GitHub issues"),
      valign: Gtk.Align.CENTER,
      uri: "https://github.com/jeroenwtf/gnome-nightscout/issues",
    });
    versionRow.add_suffix(githubIssuesButton);

    // Copy debug info ButtonRow
    const copyDebugButtonRow = new Adw.ButtonRow({
      title: _("Copy debug info"),
      start_icon_name: "edit-copy-symbolic",
    });
    headerGroup.add(copyDebugButtonRow);
    copyDebugButtonRow.connect("activated", () => {
      this._copyAllDebugInfo(window._settings, window._debugElements);
    });

    // Server configuration group
    const serverConfigGroup = new Adw.PreferencesGroup({
      title: _("Server Configuration"),
      description: _("Configuration obtained from your Nightscout server"),
    });
    debugPage.add(serverConfigGroup);

    // Server status row
    const serverStatusRow = new Adw.ActionRow({
      title: _("Server Status"),
      subtitle: _("Click to fetch server configuration"),
    });
    serverConfigGroup.add(serverStatusRow);
    serverStatusRow.set_activatable(true);
    serverStatusRow.connect("activated", () => {
      this._refreshDebugInfo(window._settings, window._debugElements);
    });

    // Server version row
    const serverVersionRow = this._createRow(
      serverConfigGroup,
      _("Server Version"),
      _("Not fetched"),
    );

    // Server units row
    const serverUnitsRow = this._createRow(
      serverConfigGroup,
      _("Server Units"),
      _("Not fetched"),
    );

    // Server thresholds expander
    const serverThresholdsExpander = new Adw.ExpanderRow({
      title: _("Server Thresholds"),
      subtitle: _("Blood glucose target ranges from server"),
    });
    serverConfigGroup.add(serverThresholdsExpander);

    const serverBgLowRow = this._createRow(
      serverThresholdsExpander,
      _("Low Threshold"),
      _("Not fetched"),
      true,
    );

    const serverBgTargetBottomRow = this._createRow(
      serverThresholdsExpander,
      _("Target Bottom"),
      _("Not fetched"),
      true,
    );

    const serverBgTargetTopRow = this._createRow(
      serverThresholdsExpander,
      _("Target Top"),
      _("Not fetched"),
      true,
    );

    const serverBgHighRow = this._createRow(
      serverThresholdsExpander,
      _("High Threshold"),
      _("Not fetched"),
      true,
    );

    // Local settings group
    const localSettingsGroup = new Adw.PreferencesGroup({
      title: _("Local Extension Settings"),
      description: _("The settings in this GNOME extension."),
    });
    debugPage.add(localSettingsGroup);

    // Computed values group
    const computedValuesGroup = new Adw.PreferencesGroup({
      title: _("Computed Values"),
      description: _("The values after applying all the configuration."),
    });
    debugPage.add(computedValuesGroup);

    // Effective units row
    const effectiveUnitsRow = this._createRow(
      computedValuesGroup,
      _("Effective Units"),
      _("Not fetched"),
    );

    // Computed threshold rows
    const computedLowRow = this._createRow(
      computedValuesGroup,
      _("Computed Low"),
      _("Not fetched"),
    );

    const computedTargetBottomRow = this._createRow(
      computedValuesGroup,
      _("Computed Target Bottom"),
      _("Not fetched"),
    );

    const computedTargetTopRow = this._createRow(
      computedValuesGroup,
      _("Computed Target Top"),
      _("Not fetched"),
    );

    const computedHighRow = this._createRow(
      computedValuesGroup,
      _("Computed High"),
      _("Not fetched"),
    );

    // Store debug elements for updating
    window._debugElements = {
      serverConfigGroup,
      localSettingsGroup,
      computedValuesGroup,
      serverThresholdsExpander,
      serverStatusRow,
      serverVersionRow,
      serverUnitsRow,
      serverBgLowRow,
      serverBgTargetBottomRow,
      serverBgTargetTopRow,
      serverBgHighRow,
      effectiveUnitsRow,
      computedLowRow,
      computedTargetBottomRow,
      computedTargetTopRow,
      computedHighRow,
    };

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
        const response = JSON.parse(bytes.get_data().toString());
        const version = response.version;
        statusLabel.set_title(_(`Success! Version: ${version}`));
      });
    } catch (error) {
      console.log(error);
      statusLabel.set_title(_(`Error: ${error.message}`));
    }
  }

  _refreshDebugInfo(settings, debugElements) {
    const { serverStatusRow, localSettingsGroup } = debugElements;

    // Update server status to show loading
    serverStatusRow.set_title(_("Updating..."));
    serverStatusRow.set_subtitle(_("Fetching server configuration..."));

    // Fetch server configuration and local settings
    this._fetchServerConfigForDebug(settings, debugElements);
    this._updateLocalSettings(settings, localSettingsGroup);
  }

  _updateDebugInfo(settings, debugElements) {
    const { localSettingsGroup } = debugElements;

    // Update local settings display
    this._updateLocalSettings(settings, localSettingsGroup);

    // Update computed values if server data is available
    if (window._lastServerData) {
      this._updateComputedValues(window._lastServerData, settings);
    }
  }

  async _fetchServerConfigForDebug(settings, debugElements) {
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

      const response = JSON.parse(bytes.get_data().toString());

      // Update server status row that will be recreated in _displayServerConfig
      // The refresh button will be added there as well

      // Store server data for copying
      window._lastServerData = response;

      this._displayServerConfig(response, debugElements);
      this._displayComputedValues(response, settings, debugElements);
    } catch (error) {
      console.log(error);

      // Update server status to show error
      debugElements.serverStatusRow.set_title(_("Error"));
      debugElements.serverStatusRow.set_subtitle(error.toString());

      // Reset other values to show error state
      debugElements.serverVersionRow.set_subtitle(_("Error"));
      debugElements.serverUnitsRow.set_subtitle(_("Error"));
      debugElements.serverBgLowRow.set_subtitle(_("Error"));
      debugElements.serverBgTargetBottomRow.set_subtitle(_("Error"));
      debugElements.serverBgTargetTopRow.set_subtitle(_("Error"));
      debugElements.serverBgHighRow.set_subtitle(_("Error"));

      // Reset computed values
      debugElements.effectiveUnitsRow.set_subtitle(_("Error"));
      debugElements.computedLowRow.set_subtitle(_("Error"));
      debugElements.computedTargetBottomRow.set_subtitle(_("Error"));
      debugElements.computedTargetTopRow.set_subtitle(_("Error"));
      debugElements.computedHighRow.set_subtitle(_("Error"));
    }
  }

  _displayServerConfig(serverData, elements) {
    const currentTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: this._is24HourFormat() === false,
    });

    // Update server status
    elements.serverStatusRow.set_title(_("Connected"));
    elements.serverStatusRow.set_subtitle(
      _(`Fetched server configuration at ${currentTime}.`),
    );

    // Update server version
    if (serverData.version) {
      elements.serverVersionRow.set_subtitle(serverData.version);
    } else {
      elements.serverVersionRow.set_subtitle(_("Not available"));
    }

    // Update server settings
    if (serverData.settings) {
      const settings = serverData.settings;

      // Update units
      if (settings.units) {
        elements.serverUnitsRow.set_subtitle(settings.units);
      } else {
        elements.serverUnitsRow.set_subtitle(_("Not available"));
      }

      // Update thresholds
      if (settings.thresholds) {
        const thresholds = settings.thresholds;

        elements.serverBgLowRow.set_subtitle(
          thresholds.bgLow !== undefined
            ? thresholds.bgLow.toString()
            : _("Not available"),
        );
        elements.serverBgTargetBottomRow.set_subtitle(
          thresholds.bgTargetBottom !== undefined
            ? thresholds.bgTargetBottom.toString()
            : _("Not available"),
        );
        elements.serverBgTargetTopRow.set_subtitle(
          thresholds.bgTargetTop !== undefined
            ? thresholds.bgTargetTop.toString()
            : _("Not available"),
        );
        elements.serverBgHighRow.set_subtitle(
          thresholds.bgHigh !== undefined
            ? thresholds.bgHigh.toString()
            : _("Not available"),
        );
      } else {
        elements.serverBgLowRow.set_subtitle(_("Not available"));
        elements.serverBgTargetBottomRow.set_subtitle(_("Not available"));
        elements.serverBgTargetTopRow.set_subtitle(_("Not available"));
        elements.serverBgHighRow.set_subtitle(_("Not available"));
      }
    } else {
      elements.serverUnitsRow.set_subtitle(_("Not available"));
      elements.serverBgLowRow.set_subtitle(_("Not available"));
      elements.serverBgTargetBottomRow.set_subtitle(_("Not available"));
      elements.serverBgTargetTopRow.set_subtitle(_("Not available"));
      elements.serverBgHighRow.set_subtitle(_("Not available"));
    }
  }

  _displayLocalSettings(settings, group) {
    // Store group reference for updates
    window._debugSettingsGroup = group;

    // Separate settings into categories
    const basicSettings = [];
    const showSettings = [];
    const notificationSettings = [];

    this._settingsSchema.forEach((setting) => {
      if (setting.key.startsWith("show-")) {
        showSettings.push(setting);
      } else if (setting.key.startsWith("notification-")) {
        notificationSettings.push(setting);
      } else {
        basicSettings.push(setting);
      }
    });

    // Create rows for basic settings
    basicSettings.forEach((setting) => {
      let value;
      if (setting.type === "int") {
        value = settings.get_int(setting.key);
      } else if (setting.type === "boolean") {
        value = settings.get_boolean(setting.key);
      } else {
        value = settings.get_string(setting.key);
      }

      const title = setting.key
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      const row = this._createRow(group, title, setting.format(value));

      // Connect to changes
      const handler = settings.connect(`changed::${setting.key}`, () => {
        let newValue;
        if (setting.type === "int") {
          newValue = settings.get_int(setting.key);
        } else if (setting.type === "boolean") {
          newValue = settings.get_boolean(setting.key);
        } else {
          newValue = settings.get_string(setting.key);
        }
        row.set_subtitle(setting.format(newValue));
      });

      if (!window._debugHandlers) window._debugHandlers = {};
      window._debugHandlers[setting.key] = handler;
    });

    // Create expander for "show..." settings
    if (showSettings.length > 0) {
      const showExpander = new Adw.ExpanderRow({
        title: _("Display Options"),
        subtitle: _("Settings for what information to show"),
      });
      group.add(showExpander);

      showSettings.forEach((setting) => {
        let value = settings.get_boolean(setting.key);
        const title = setting.key
          .replace("show-", "")
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        const row = this._createRow(
          showExpander,
          title,
          setting.format(value),
          true,
        );

        const handler = settings.connect(`changed::${setting.key}`, () => {
          let newValue = settings.get_boolean(setting.key);
          row.set_subtitle(setting.format(newValue));
        });

        if (!window._debugHandlers) window._debugHandlers = {};
        window._debugHandlers[setting.key] = handler;
      });
    }

    // Create expander for notification settings
    if (notificationSettings.length > 0) {
      const notificationExpander = new Adw.ExpanderRow({
        title: _("Notifications"),
        subtitle: _("Alert and notification preferences"),
      });
      group.add(notificationExpander);

      notificationSettings.forEach((setting) => {
        let value;
        if (setting.type === "int") {
          value = settings.get_int(setting.key);
        } else {
          value = settings.get_boolean(setting.key);
        }
        const title = setting.key
          .replace("notification-", "")
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        const row = this._createRow(
          notificationExpander,
          title,
          setting.format(value),
          true,
        );

        const handler = settings.connect(`changed::${setting.key}`, () => {
          let newValue;
          if (setting.type === "int") {
            newValue = settings.get_int(setting.key);
          } else {
            newValue = settings.get_boolean(setting.key);
          }
          row.set_subtitle(setting.format(newValue));
        });

        if (!window._debugHandlers) window._debugHandlers = {};
        window._debugHandlers[setting.key] = handler;
      });
    }
  }

  _updateLocalSettings(settings, group) {
    // Find and update existing rows
    let child = group.get_first_child();

    while (child) {
      if (
        child.title &&
        child.subtitle &&
        child.get_css_classes().includes("property")
      ) {
        // Try to find a matching setting in the schema
        const matchingSetting = this._settingsSchema.find((setting) => {
          const title = setting.key
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

          // Handle special cases for grouped settings
          if (setting.key.startsWith("show-")) {
            const cleanTitle = setting.key
              .replace("show-", "")
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
            return child.title === cleanTitle;
          }

          if (setting.key.startsWith("notification-")) {
            const cleanTitle = setting.key
              .replace("notification-", "")
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
            return child.title === cleanTitle;
          }

          return child.title === title;
        });

        if (matchingSetting) {
          let value;
          if (matchingSetting.type === "string") {
            value = settings.get_string(matchingSetting.key);
          } else if (matchingSetting.type === "int") {
            value = settings.get_int(matchingSetting.key);
          } else if (matchingSetting.type === "boolean") {
            value = settings.get_boolean(matchingSetting.key);
          }

          child.set_subtitle(matchingSetting.format(value));
        }
      }
      child = child.get_next_sibling();
    }
  }

  _copyAllDebugInfo(settings) {
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

  _displayComputedValues(serverData, settings, elements) {
    const serverSettings = serverData.settings || {};
    const serverUnits = ["mmol", "mmol/L"].includes(serverSettings.units)
      ? "mmol/L"
      : "mg/dl";
    const unitsSelection = settings.get_string("units-selection");
    const effectiveUnits =
      unitsSelection === "auto" ? serverUnits : unitsSelection;

    // Update effective units
    elements.effectiveUnitsRow.set_subtitle(effectiveUnits);

    // Update computed thresholds
    if (serverSettings.thresholds) {
      const thresholds = serverSettings.thresholds;
      const conversionFactor =
        effectiveUnits === "mmol/L" && serverUnits === "mg/dl"
          ? 0.0555
          : effectiveUnits === "mg/dl" && serverUnits === "mmol/L"
            ? 1 / 0.0555
            : 1;

      // Update computed low
      if (thresholds.bgLow !== undefined) {
        const converted =
          Math.round(thresholds.bgLow * conversionFactor * 10) / 10;
        elements.computedLowRow.set_subtitle(
          `${converted} ${effectiveUnits} (server: ${thresholds.bgLow} ${serverUnits})`,
        );
      } else {
        elements.computedLowRow.set_subtitle(_("Not available"));
      }

      // Update computed target bottom
      if (thresholds.bgTargetBottom !== undefined) {
        const converted =
          Math.round(thresholds.bgTargetBottom * conversionFactor * 10) / 10;
        elements.computedTargetBottomRow.set_subtitle(
          `${converted} ${effectiveUnits} (server: ${thresholds.bgTargetBottom} ${serverUnits})`,
        );
      } else {
        elements.computedTargetBottomRow.set_subtitle(_("Not available"));
      }

      // Update computed target top
      if (thresholds.bgTargetTop !== undefined) {
        const converted =
          Math.round(thresholds.bgTargetTop * conversionFactor * 10) / 10;
        elements.computedTargetTopRow.set_subtitle(
          `${converted} ${effectiveUnits} (server: ${thresholds.bgTargetTop} ${serverUnits})`,
        );
      } else {
        elements.computedTargetTopRow.set_subtitle(_("Not available"));
      }

      // Update computed high
      if (thresholds.bgHigh !== undefined) {
        const converted =
          Math.round(thresholds.bgHigh * conversionFactor * 10) / 10;
        elements.computedHighRow.set_subtitle(
          `${converted} ${effectiveUnits} (server: ${thresholds.bgHigh} ${serverUnits})`,
        );
      } else {
        elements.computedHighRow.set_subtitle(_("Not available"));
      }
    } else {
      // No thresholds available
      elements.computedLowRow.set_subtitle(_("Not available"));
      elements.computedTargetBottomRow.set_subtitle(_("Not available"));
      elements.computedTargetTopRow.set_subtitle(_("Not available"));
      elements.computedHighRow.set_subtitle(_("Not available"));
    }
  }

  _updateComputedValues(serverData, settings) {
    // Update existing computed values with updated settings
    this._displayComputedValues(serverData, settings, window._debugElements);
  }

  _createRow(container, title, subtitle, isExpander = false) {
    const row = new Adw.ActionRow({ title, subtitle });
    row.add_css_class("property");
    if (isExpander) {
      container.add_row(row);
    } else {
      container.add(row);
    }
    return row;
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
