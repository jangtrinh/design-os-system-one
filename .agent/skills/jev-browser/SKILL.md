---
name: jev-browser
description: Universal Browser Automation CLI & Ultrafast Autonomous Agent powered by TypeSafe JEV System One & Chrome DevTools Protocol (CDP). Use whenever the user mentions JEV, jev-browser, jev-ultrafast, TypeSafe JEV, controlling browsers (Chrome, Arc, Dia, Edge, Brave), browser automation, web scraping, social media posting, or Threads viral research.
allowed-tools: run_command, view_file, write_to_file
version: 1.1.0
priority: HIGH
---

# JEV Browser & JEV Ultrafast Autonomous Agent

> **Universal Browser Automation CLI for AI Agents** — Powered by TypeSafe JEV System One, Chrome DevTools Protocol (CDP), and the Ultrafast Speculative Fan-Out architecture.

`jev-browser` allows AI Agents (**Antigravity, Claude, Codex**) and developers to control, inspect, and automate any Chromium browser (**Google Chrome, Arc, Dia, Edge, Brave**) directly on the user's real session with full cookies, logins, and extensions intact.

The CLI binary is installed globally in `$PATH`:
```bash
jev-browser --help
```
(Local path: `/Users/jangtrinh/.local/bin/jev-browser` or inside `/Users/jang/Products/JEV/projects/jev-browser-cli/bin/jev-browser.js`)

---

## 🌟 Core Capabilities

1. **JEV Ultrafast Autonomous Agent (`jev-browser uf "<goal>"`)**:
   - **Dynamic Indexed Action Space**: Every observation indexes visible controls (`[1] button`, `[2] combobox`, `[3] textbox`...).
   - **Speculative Fan-Out**: Evaluates operations (`CLICK`, `TYPE_TEXT`, `SELECT`, `SCROLL_DOWN`, `SCROLL_UP`, `WAIT`, `DONE`, `BLOCKED`) and speculative candidate targets in **ONE network round trip** to TypeSafe JEV System One.
   - **Dedicated Text Helper**: When `TYPE_TEXT` is chosen, a lightweight LLM generates the field text from context and history without guessing.
   - **Freshness & Occlusion Guards**: Verifies `page_key`, `guards`, and `document.elementFromPoint` before clicking to prevent stale or occluded actions.
   - **Autocomplete Settle Wait**: Automatically pauses up to 200ms or 2 rAF for combobox suggestions (`[role="option"]`).
   - **Focus Emulation**: Keeps background tabs in Dia/Chrome rendering animations and menus without throttling.

2. **Real Browser Session Automation**:
   - Directly attaches to your daily browser (**Google Chrome, Arc, Dia, Edge**) over CDP port `9222`.
   - Never gets blocked by Cloudflare or anti-bot because it runs on your authenticated user profile.

3. **Dual-Brain Harmony & Safety Guardrails**:
   - **Brain 1 (Fast Action Evaluator)**: Sub-200ms DOM scan and action recommendation.
   - **Brain 2 (Asynchronous Safety Guard)**: Pre-flight safety check against destructive actions (deletions, payments, irreversible mutations) with policy enforcement.

4. **Threads & Social Viral Automation**:
   - `jev-browser research threads <community>`: Scrapes and analyzes top viral posts in AI Threads, Design Threads, 3D Printing, classified by **5 Proven Viral Archetypes**.
   - `jev-browser post "<content>"`: Auto-posts to Facebook, Threads, LinkedIn with **Zero Public Leak Guard** (`--privacy only_me`, `draft`, `connections`).
   - `curate-feed` & `social-engage`: AI slop detection and high-virality engagement curation.

---

## 🚀 Quick Start for AI Agents

### 1. Check Browser Connection
```bash
# Check active tab status
jev-browser status --json

# List all open tabs
jev-browser tabs --json

# Switch to a specific tab
jev-browser switch "Threads"
```

### 2. Autonomous Task Execution (Ultrafast Mode)
```bash
# Run multi-step goal autonomously
jev-browser uf "Find flights from Zurich to London on Google Flights"

# Test or dry-run without executing clicks
jev-browser uf "Fill checkout form" --dry-run

# Single-step speculative evaluation (< 200ms)
jev-browser ufe "Click Login button"
```

### 3. Natural Language Single Command
```bash
# AI interprets intent and executes immediately
jev-browser do "mở trang github và tìm kiếm repository browser-use"
```

### 4. Low-Level Precise Control
```bash
# Extract token-efficient interactive DOM snapshot (< 300 tokens)
jev-browser snapshot --json

# Click target by synthetic ID, text, or selector
jev-browser click "#7"
jev-browser click "Sign in"

# Type into focused element or field
jev-browser type "Antigravity AI"

# Keyboard keys
jev-browser key Enter
jev-browser key Escape

# Scroll
jev-browser scroll down
```

### 5. Social & Threads Workflows
```bash
# Research trending topics
jev-browser research threads aithreads --limit 10 --json

# Safe draft post on Threads
jev-browser -T threads post "Update on AI agent workflows" --privacy draft

# Safe test post on Facebook (Only Me)
jev-browser -T facebook post "Testing JEV Browser" --privacy only_me
```

---

## ⚙️ Environment Variables

- `TYPESAFE_API_KEY`: API key for TypeSafe JEV System One decision engine.
- `TYPESAFE_MODEL`: Default model (defaults to `jev-latest`).
- `TEXT_MODEL_API_KEY`: Optional API key for field text generation (OpenRouter, DeepSeek, OpenAI, Gemini).
- `TEXT_MODEL_BASE_URL`: Endpoint for text model (e.g. `https://api.deepseek.com/v1`).
- `TEXT_MODEL`: Text helper model (defaults to `deepseek-chat`).
