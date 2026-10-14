# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.8.2] - 2026-10-14
### Added
- Support for GNOME 51.

## [1.8.1] - 2026-07-08
### Fixed
- mmol/L values were shown as raw mg/dL (e.g. `72` instead of `4.0`)
- Notification urgency dropdown had no effect for "Normal" and "Critical". The four options now map correctly to Low/Normal/High/Critical.
- Override thresholds no longer false-flag every reading as "very low" on servers configured in mmol/L.
- Diagnostics tab now displays server and computed thresholds in the correct units.

### Added
- Override threshold fields show a live mmol/L equivalent when the display unit is mmol/L (values still entered in mg/dL).
- `unlink.sh` script to opt-out from the developer version.

### Changed
- Consistent `mg/dL` casing (was `mg/dl`) across the extension.

## [1.8.0] - 2026-05-03
### Added
- Option for overridding the thresholds from the server.
- Support for GNOME 50.

## [1.7.0] - 2026-01-02
### Added
- Diagnostics screen in the settings to help debug problems.

## [1.6.0] - 2025-10-17
### Added
- Selector to ignore server units and force mg/dl or mmol/L locally (thanks @yamixst!).
- Support for GNOME 49.

### Fixed
- Weird value conversion if the server uses mmol/L.

## [1.5.0] - 2025-03-24
### Added
- Support for GNOME 48.

## [1.4.1] - 2025-01-04
### Fixed
- Bug with mmol/L values triggering always very low alerts when out of range.

## [1.4.0] - 2025-01-03
### Added
- Support for mmol/L units (thanks @3-5mmJack!).

### Changed
- Improved the colors for backgrounds other than black.

## [1.3.0] - 2024-12-03
### Changed
- Changed the copy of the stale data notification to avoid confusion.

### Fixed
- Delta plus and minus signs were reversed (thanks ninelore!).

## [1.2.0] - 2024-11-27
### Added
- Added elapsed time when data is stale (optional).

## [1.1.0] - 2024-10-12
### Added
- Notifications are removed when no longer apply.
- Check if we have internet connection.
- Colors for out of range values.
- Button for testing the server status in the preferences.
- Better error feedback.

### Changed
- Stale indicator is now a badge.

### Fixed
- Stale data notifications are now shown only if they're enabled.
- Use the timeout time from the settings now.

## [1.0.0] - 2024-10-01
### Added
- First release.
