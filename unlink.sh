#!/bin/bash

# Cleanly remove the dev symlink created by link.sh.
#
# Only ever removes a *symlink* — never a real install directory — so it
# will not touch your repository or a genuine (e.g. extensions.gnome.org)
# install. This avoids the footgun where the GNOME Extensions panel's
# "uninstall" follows the symlink and deletes the repo files.

folder_in_extensions="$HOME/.local/share/gnome-shell/extensions/nightscout@jeroen.wtf"

if [ -L "$folder_in_extensions" ]; then
  rm "$folder_in_extensions"
  echo "Removed dev symlink: $folder_in_extensions"
elif [ -e "$folder_in_extensions" ]; then
  echo "Refusing to remove: $folder_in_extensions exists but is not a symlink"
  echo "(looks like a real install). Remove it manually if that is intended."
  exit 1
else
  echo "Nothing to remove: $folder_in_extensions does not exist."
fi
