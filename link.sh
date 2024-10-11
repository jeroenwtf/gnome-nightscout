#!/bin/bash

folder_in_repository=$HOME/Code/gnome-nightscout/nightscout@jeroen.wtf
folder_in_extensions=$HOME/.local/share/gnome-shell/extensions/nightscout@jeroen.wtf

cd $folder_in_repository

glib-compile-schemas schemas/

if [ ! -L "$folder_in_extensions" ]; then
  rm -rf "$folder_in_extensions"
fi

ln -s $folder_in_repository $folder_in_extensions

