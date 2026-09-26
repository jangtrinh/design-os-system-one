# Projects & Subsystems Directory

This directory hosts production tools, proofs of concept (PoCs), and autonomous agents powered by the **System 1 Dual-Brain Architecture**.

---

## 📁 Subsystem Overview

```text
projects/
├── jev-browser-cli/               # Universal Browser Automation CLI (CDP 9222 + JEV System One, Social Posting, Threads Research)
├── voice-browser-agent/           # Real-time Voice Web Browser Agent (Web Speech API + Playwright)
├── laya-jev-lab/                  # Cascade routing, threshold sweep experiments, and stress benchmark suites
└── <new-project>/                 # Ready for future autonomous agent extensions
```

---

## 🔑 Environment Variables

Subsystems interacting with Cloud APIs require the following configuration in `.env`:

```bash
TYPESAFE_API_KEY="ts_live_..."
```

For purely local, air-gapped on-device workloads (`localOnly: true`), no API key or WAN connection is required.

---

## 📚 Architectural References

When authoring new agent subsystems, refer to the root documentation:
- **Architectural Patterns**: `../docs/08-architectural-patterns.md`
- **Cookbooks & Recipes**: `../docs/09-cookbooks-and-recipes.md`
- **SDK References**: `../docs/06-python-sdk.md` (Python) or `../docs/07-javascript-sdk.md` (Node/TypeScript)
