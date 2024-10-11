#!/bin/bash

folder_in_repository="$HOME/Code/gnome-nightscout/nightscout@jeroen.wtf"
folder_in_extensions="$HOME/.local/share/gnome-shell/extensions/nightscout@jeroen.wtf"

cd "$folder_in_repository" || exit

glib-compile-schemas schemas/

if [ -L "$folder_in_extensions" ]; then
  # It's a symlink, remove it
  rm "$folder_in_extensions"
elif [ -d "$folder_in_extensions" ]; then
  # It's a directory, remove it
  rm -rf "$folder_in_extensions"
fi

ln -sf "$folder_in_repository" "$folder_in_extensions"

