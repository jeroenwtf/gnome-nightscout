# Nightscout indicator

A GNOME extension to keep an eye on your glucoses levels stored in a Nightscout site.

![menu image](images/screenshot.png){width=200}


## Features

### Visible bits of information:
- Glucose level.
- Trending arrow (optional).
- Delta or variation between readings (optional).
- Elapsed time since the reading was taken (optional).
- Define update timing and when to mark data as stale.

### Notifications
- When you go out of range and too low or too high.
- When data is marked as stale.
- When the level rises or drops too fast.


## Install from source and development

Download the `nightscout@jeroen.wtf` directory and move it to `~/.local/share/gnome-shell/extensions/`. Enable the extension in **Extensions** or **Extension Manager**, or using the following command:

```bash
$ gnome-extensions enable nightscout@jeroen.wtf
```


## Troubleshooting

As of today I just created the extension. For sure there are bugs and improvements that I will do over time. If you have questions or problems feel free to open an issue and will take a look as soon as I can. Thank you for your patience!


## Acknowledgements

- The people behind the [Nightscout](https://nightscout.github.io/) project, because of their work and effort to make our lives easier.
- [Fernando Pradas](https://github.com/fnandot) for [his GNOME extension](https://github.com/fnandot/gnome-shell-extension-nightscout) that served as inspiration and some code snippets.
- The [Clipboard indicator](https://github.com/Tudmotu/gnome-shell-extension-clipboard-indicator/) and [tailwind-status](https://github.com/maxgallup/tailscale-status) extensions for additional learning.
