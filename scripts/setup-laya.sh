#!/usr/bin/env bash
# ==============================================================================
# setup-laya.sh — Automated Installer & Model Downloader for Laya System 1 Engine
#
# Idempotent setup script designed for autonomous AI agents & developers.
# Can be run on any macOS (Apple Silicon MPS / MLX) or Linux machine.
#
# Usage:
#   bash setup-laya.sh           # Setup venv, dependencies, download models & verify
#   bash setup-laya.sh --start   # Setup and start background daemon on http://127.0.0.1:8000
# ==============================================================================
set -euo pipefail

PRODUCTS_DIR="${PRODUCTS_DIR:-$HOME/Products}"
LAYA_DIR="$PRODUCTS_DIR/laya"
LAYA_MLX_DIR="$PRODUCTS_DIR/laya-mlx"
VENV_DIR="$LAYA_DIR/.venv"
LOG_FILE="/tmp/laya-setup.log"
START_DAEMON=false

for arg in "$@"; do
  case "$arg" in
    --start|--daemon) START_DAEMON=true ;;
    --help|-h)
      echo "Usage: $0 [--start]"
      echo "  --start: Setup and automatically start Laya daemon on port 8000"
      exit 0
      ;;
  esac
done

echo "=========================================================="
echo "⚡ Setting up Laya On-Device System 1 Decision Engine"
echo "   Target Directory: $LAYA_DIR"
echo "   Log File: $LOG_FILE"
echo "=========================================================="

mkdir -p "$PRODUCTS_DIR"

# 1. Detect Environment & Python
OS="$(uname -s)"
ARCH="$(uname -m)"
IS_APPLE_SILICON=false
DEVICE="cpu"

if [ "$OS" = "Darwin" ] && [ "$ARCH" = "arm64" ]; then
  IS_APPLE_SILICON=true
  DEVICE="mps"
  echo "✔ Detected Apple Silicon macOS (arm64) — MPS acceleration enabled"
else
  echo "ℹ Detected $OS ($ARCH) — CPU mode will be used"
fi

# Find Python 3.10+
PYTHON_BIN=""
for candidate in python3.12 python3.11 python3.10 python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    ver=$("$candidate" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    major=$(echo "$ver" | cut -d. -f1)
    minor=$(echo "$ver" | cut -d. -f2)
    if [ "$major" -eq 3 ] && [ "$minor" -ge 10 ]; then
      PYTHON_BIN="$(command -v "$candidate")"
      echo "✔ Using Python: $PYTHON_BIN (version $ver)"
      break
    fi
  fi
done

if [ -z "$PYTHON_BIN" ]; then
  echo "❌ Error: Python 3.10+ is required but not found in PATH." >&2
  exit 1
fi

# 2. Clone Laya Repository if missing
if [ ! -d "$LAYA_DIR/.git" ]; then
  echo "📦 Cloning Laya repository into $LAYA_DIR..."
  git clone https://github.com/NandhaKishorM/laya.git "$LAYA_DIR" >>"$LOG_FILE" 2>&1
else
  echo "✔ Laya repository already exists at $LAYA_DIR"
fi

# Best-effort clone for native MLX on Apple Silicon
if [ "$IS_APPLE_SILICON" = true ] && [ ! -d "$LAYA_MLX_DIR/.git" ]; then
  echo "📦 Cloning laya-mlx repository into $LAYA_MLX_DIR..."
  git clone https://github.com/mizorewww/laya-mlx.git "$LAYA_MLX_DIR" >>"$LOG_FILE" 2>&1 || true
fi

# 3. Virtual Environment Setup
if [ ! -f "$VENV_DIR/bin/python" ]; then
  echo "🐍 Creating virtual environment at $VENV_DIR..."
  "$PYTHON_BIN" -m venv "$VENV_DIR" >>"$LOG_FILE" 2>&1
else
  echo "✔ Virtual environment exists at $VENV_DIR"
fi

# 4. Install Dependencies
echo "📥 Installing Laya & Python dependencies (this may take a minute)..."
"$VENV_DIR/bin/pip" install --upgrade pip setuptools wheel >>"$LOG_FILE" 2>&1
"$VENV_DIR/bin/pip" install "laya[serve]>=0.3.20" torch transformers huggingface_hub fastapi uvicorn python-multipart requests >>"$LOG_FILE" 2>&1

if [ "$IS_APPLE_SILICON" = true ]; then
  echo "⚡ Installing Apple Silicon MLX extensions..."
  "$VENV_DIR/bin/pip" install laya-mlx mlx >>"$LOG_FILE" 2>&1 || echo "ℹ laya-mlx optional package skipped"
fi

# 5. Pre-download Model Checkpoints & Sanity Check
echo "🧠 Downloading / Warming Laya model weights in HuggingFace cache..."
"$VENV_DIR/bin/python" - << 'PYCHECK'
import sys
import time
import torch
from laya import Router

device = "mps" if (torch.backends.mps.is_available()) else "cpu"
print(f"  PyTorch device: {device}")

router = Router()
models = ["english", "multilingual"]

for m in models:
    t0 = time.time()
    print(f"  Fetching & caching '{m}'...")
    agent = router.load(m)
    dt = time.time() - t0
    print(f"  ✔ Checkpoint '{m}' loaded in {dt:.2f}s on {agent.device}")

# Sanity prediction
state = "Khách hàng thông báo chuyển khoản bị treo cần hỗ trợ khẩn cấp."
questions = {
    "dept": {
        "type": "choice",
        "instructions": "Phòng ban xử lý?",
        "criteria": {"billing": "thanh toán, ngân hàng, chuyển khoản", "tech": "lỗi phần mềm"}
    },
    "urgent": {
        "type": "noul",
        "instructions": "Khẩn cấp không?"
    }
}
t0 = time.time()
res = router.predict(state, questions)
dt_ms = (time.time() - t0) * 1000
print(f"  ✔ Sanity test passed in {dt_ms:.1f}ms: dept={res['answers']['dept']['choice']}, urgent={res['answers']['urgent']['noul']:.2f}")
PYCHECK

# 6. Ensure Server Runner & CLI helper exist
cat << 'STARTSCRIPT' > "$LAYA_DIR/start_server.sh"
#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

HOST="${1:-127.0.0.1}"
PORT="${2:-8000}"
DEVICE="${3:-mps}"

if [ "$(uname -s)" != "Darwin" ] || [ "$(uname -m)" != "arm64" ]; then
  DEVICE="cpu"
fi

echo "=========================================================="
echo "🚀 Starting Laya Web GUI & API Server"
echo "   URL: http://$HOST:$PORT"
echo "   Device: $DEVICE"
echo "   Preload: True (models: english, multilingual)"
echo "=========================================================="

exec "$DIR/.venv/bin/python" examples/server.py --host "$HOST" --port "$PORT" --device "$DEVICE" --max-loaded 3
STARTSCRIPT
chmod +x "$LAYA_DIR/start_server.sh"

mkdir -p "$HOME/.local/bin"
ln -sf "$LAYA_DIR/start_server.sh" "$HOME/.local/bin/laya-server"

# 7. Start daemon if requested or if port 8000 is not running
if [ "$START_DAEMON" = true ]; then
  if curl -s http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "✔ Laya daemon is already running on http://127.0.0.1:8000"
  else
    echo "🚀 Starting Laya daemon in background..."
    nohup "$LAYA_DIR/start_server.sh" 127.0.0.1 8000 "$DEVICE" >/tmp/laya-server.log 2>&1 &
    
    # Wait for server to respond
    echo "⏳ Waiting for Laya daemon to become healthy..."
    for i in {1..20}; do
      if curl -s http://127.0.0.1:8000/health >/dev/null 2>&1; then
        echo "✔ Laya daemon is healthy and accepting requests on http://127.0.0.1:8000"
        break
      fi
      sleep 1
    done
  fi
fi

echo ""
echo "=========================================================="
echo "🎉 LAYA SETUP COMPLETED SUCCESSFULLY!"
echo "   Repository: $LAYA_DIR"
echo "   Venv:       $VENV_DIR"
echo "   Runner:     $HOME/.local/bin/laya-server"
echo "   Status:     Ready for sub-30ms typed decisions"
echo "=========================================================="
