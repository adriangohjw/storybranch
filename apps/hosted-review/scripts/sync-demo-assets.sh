#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
fixture="$root/packages/fixture/.storybranch/baseline"
dest="$(cd "$(dirname "$0")/.." && pwd)/demo/images"

mkdir -p "$dest/baseline" "$dest/actual" "$dest/diff"

cp "$fixture/hero--default__1200x900__chrome.png" "$dest/baseline/"
cp "$fixture/hero--default__1200x900__chrome.png" "$dest/actual/"
cp "$fixture/hero--modes__narrow__chrome.png" "$dest/baseline/"
cp "$fixture/hero--modes__wide__chrome.png" "$dest/actual/"
cp "$fixture/hero--modes__wide__chrome.png" "$dest/diff/hero--modes__narrow__chrome.png"
cp "$fixture/hero--pinned__mobile1__chrome.png" "$dest/actual/"

echo "Synced demo PNGs from packages/fixture into $dest"
