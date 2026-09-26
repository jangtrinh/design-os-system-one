#!/usr/bin/env bash
# Wrapper to invoke canonical setup-laya.sh
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec bash "$DIR/scripts/setup-laya.sh" "$@"
