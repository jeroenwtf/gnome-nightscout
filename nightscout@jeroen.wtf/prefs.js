import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import Adw from "gi://Adw";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class NightscoutPreferences extends ExtensionPreferences {
  constructor(metadata) {
    super(metadata);

    console.debug(`constructing ${this.metadata.name}`);
  }

  fillPreferencesWindow(window) {
    window._settings = this.getSettings();

    const page = new Adw.PreferencesPage({
      title: _("General"),
      icon_name: "dialog-information-symbolic",
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
  }
}
