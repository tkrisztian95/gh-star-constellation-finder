#!/usr/bin/env bash
# One-line install:
#   curl -fsSL https://raw.githubusercontent.com/tkrisztian95/gh-star-constellation-finder/main/install.sh | bash
set -euo pipefail

REPO="tkrisztian95/gh-star-constellation-finder"
BIN_NAME="gh-star-constellation-finder"
VERSION="${VERSION:-latest}"

case "$(uname -s)" in
  Darwin) OS="darwin" ;;
  Linux)  OS="linux" ;;
  *) echo "Unsupported OS: $(uname -s). Linux and macOS only." >&2; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64|amd64)  ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $(uname -m)." >&2; exit 1 ;;
esac

ASSET="${BIN_NAME}-${OS}-${ARCH}"
if [ "$VERSION" = "latest" ]; then
  URL="https://github.com/${REPO}/releases/latest/download/${ASSET}"
else
  URL="https://github.com/${REPO}/releases/download/${VERSION}/${ASSET}"
fi

if [ -w "/usr/local/bin" ] || [ "$(id -u)" -eq 0 ]; then
  DEST="/usr/local/bin"
else
  DEST="${HOME}/.local/bin"
  mkdir -p "$DEST"
fi

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

echo "Downloading ${ASSET} (${VERSION}) ..."
if ! curl -fSL --progress-bar "$URL" -o "$TMP"; then
  echo "Download failed: $URL" >&2
  echo "Verify a release exists at https://github.com/${REPO}/releases" >&2
  exit 1
fi

chmod +x "$TMP"
mv "$TMP" "${DEST}/${BIN_NAME}"
trap - EXIT

echo "Installed: ${DEST}/${BIN_NAME}"

case ":${PATH:-}:" in
  *":${DEST}:"*) ;;
  *)
    echo
    echo "Note: ${DEST} is not in your PATH. Add this to your shell profile:"
    echo "  export PATH=\"${DEST}:\$PATH\""
    ;;
esac

echo
echo "Run: ${BIN_NAME} --help"
