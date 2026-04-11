#!/bin/bash

cd nightscout@jeroen.wtf && zip -r ../nightscout@jeroen.wtf.zip * -x "schemas/gschemas.compiled"

echo -e "\n\033[0;31m🚨 Did you remember to bump the version in metadata.json?\033[0m"
