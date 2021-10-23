#!/bin/bash

set -e

npm i -g semver > /dev/null
git fetch --tags

oldVersion=$(git tag --sort=-v:refname --list "v[0-9]*" | head -n 1)
if [ -z "$oldVersion" ]; then
   oldVersion="v0.0.0"
fi

newVersion=$(semver -i "$oldVersion")
echo "v${newVersion}"