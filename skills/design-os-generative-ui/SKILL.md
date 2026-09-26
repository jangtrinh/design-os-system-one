---
name: design-os-generative-ui
license: Apache-2.0
description: >
  Sub-50ms Real-Time Generative UI engine powered by Laya-MLX (Apple Silicon local edge, 6.5ms)
  and TypeSafe JEV (Cloud API) with Zod Component Catalogs. Use when building adaptive dashboards,
  real-time generative UI in Next.js/React, morphing interfaces, or Zero-Hallucination AI design systems.
version: 1.1.0
priority: HIGH
---

# Design OS Generative UI: Sub-50ms Real-Time Adaptive UI Engine

`design-os-generative-ui` is a production-grade Generative UI framework that combines **The Catalog Pattern (Zod)** with **System 1 Decision Models** (Laya-MLX on-device + TypeSafe JEV in the cloud).

It replaces slow, fragile, and insecure LLM code streaming (3–8s lag in v0 / Claude Artifacts) with **instant, 100% type-safe component composition (< 50ms total, 6.5ms local P50)** with zero hallucinations and zero injection risks.

---

## 🏛️ Architectural Pillars

```text
[ User Prompt / Interaction ]
              │
              ▼
   [ DesignOSComposer ]
              │
   ┌──────────┴──────────┐
   ▼ (70% traffic)       ▼ (30% ambiguous)
[ Laya-MLX Local ]    [ TypeSafe JEV Cloud ]
   (~6.5ms, $0)          (~250ms - 800ms)
   └──────────┬──────────┘
              ▼
   [ Validated UISpec (JSON) ]
              │
              ▼
   [ <DesignOSRenderer /> ]
   (Zod Validation + Layout Dispatcher)
              │
              ▼
   [ Instant Adaptive DOM ]
```

1. **Sub-50ms Execution Budget**: Local Laya-MLX evaluates prompt vs Catalog candidates in ~7ms. Total DOM render is imperceptible to the human eye (<50ms).
2. **The Catalog Pattern**: Developers own the design system; AI only selects and configures allowed Zod-checked components.
3. **Local-First Cascade Router ($\tau = 0.30$)**: 70% of prompts resolved locally on Apple Silicon at $0 cost; boundary cases escalate to JEV Cloud.
4. **Air-Gapped & Local-Only Mode (`localOnly: true`)**: Guarantees zero WAN or cloud network requests, enforcing 100% on-device privacy on Apple Silicon MacBooks.
5. **Zero Injection / XSS**: Never outputs or executes raw code or HTML; outputs strictly validated JSON Specs with layout enum bounds (`dashboard_grid`, `marketing_stack`, `detail_split`, `blank`).
6. **Stark Zinc Aesthetics**: 100% compliant with the Purple Ban (no violet/purple); modern linear/apple stark zinc styling (`#18181b`, `#f4f4f5`).

---

## 📦 How to Add to ANY Project

### GitHub Repository
🔗 **[github.com/jangtrinh/design-os-generative-ui](https://github.com/jangtrinh/design-os-generative-ui)**

### 1. Install via GitHub or Local Path
In your project (e.g. `EaseUI`, `Admin Dashboard`, or new Next.js app):

```bash
# Install directly from GitHub:
pnpm add github:jangtrinh/design-os-generative-ui
# or with npm:
npm install github:jangtrinh/design-os-generative-ui

# Or install via local path on this machine:
pnpm add /Users/jangtrinh/Products/design-os-generative-ui
```

---

## ⚡ 4 Practical Implementation Recipes

### Recipe 1: Quickstart in React / Next.js
```tsx
import React, { useState } from "react";
import { DesignOSComposer, DesignOSRenderer, defaultCatalog } from "design-os-generative-ui";

// Initialize composer with Local-First Cascade (supports air-gapped localOnly mode)
const composer = new DesignOSComposer({
  localOnly: false, // Set to true for 100% on-device air-gapped execution on MacBook
  cascadeThreshold: 0.30,
  localEndpoint: "http://127.0.0.1:8000/predict"
});

export function AdaptiveUI() {
  const [spec, setSpec] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePrompt = async (prompt: string) => {
    setLoading(true);
    try {
      const { spec, telemetry } = await composer.compose(prompt);
      console.log(`Composed in ${telemetry.latencyMs}ms via ${telemetry.engine}`);
      setSpec(spec);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <input
        placeholder="Yêu cầu giao diện (VD: Dựng dashboard theo dõi doanh số)..."
        onKeyDown={(e) => e.key === "Enter" && handlePrompt(e.currentTarget.value)}
        className="w-full px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-white"
      />

      {spec && <DesignOSRenderer spec={spec} catalog={defaultCatalog} />}
    </div>
  );
}
```

---

### Recipe 2: Extending with Custom Project-Specific Components
You can register your own components into the Catalog using Zod schemas and System 1 semantic criteria:

```tsx
import { z } from "zod";
import { defaultCatalog, DesignOSComposer, type CatalogRegistry } from "design-os-generative-ui";

// 1. Define custom component schema
const UserKpiSchema = z.object({
  activeUsers: z.number(),
  retentionRate: z.string(),
  topRegion: z.string(),
});

// 2. Custom Component
function UserKpiWidget({ activeUsers, retentionRate, topRegion }: z.infer<typeof UserKpiSchema>) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h4 className="text-xs text-zinc-400">Tăng Trưởng Người Dùng</h4>
      <div className="text-2xl font-bold mt-1">{activeUsers.toLocaleString()}</div>
      <div className="text-xs text-emerald-400 mt-2">Retention: {retentionRate} • {topRegion}</div>
    </div>
  );
}

// 3. Extend Catalog
export const myCustomCatalog: CatalogRegistry = {
  ...defaultCatalog,
  user_kpi: {
    id: "user_kpi",
    name: "Chỉ Số Người Dùng (UserKpiWidget)",
    category: "dashboard",
    description: "Hiển thị người dùng hoạt động và tỷ lệ giữ chân",
    system1Criteria: "Thống kê người dùng hoạt động, retention rate, nhân khẩu học hoặc tăng trưởng user",
    schema: UserKpiSchema,
    defaultProps: { activeUsers: 8420, retentionRate: "68.4%", topRegion: "Việt Nam" },
    component: UserKpiWidget,
  }
};

// 4. Instantiate composer with custom catalog
const customComposer = new DesignOSComposer({}, myCustomCatalog);
```

---

### Recipe 3: Dynamic Runtime Data Hydration (The Astra Pattern)
Never bake live dynamic database data into the AI model. Let System 1 select the layout and components, then bind real backend data at runtime:

```tsx
export function LiveDataRenderer({ spec }: { spec: UISpec }) {
  // Fetch actual data from backend
  const { data: analyticsData } = useSWR("/api/analytics/realtime");

  // Hydrate spec with live data props
  const hydratedSpec = {
    ...spec,
    components: spec.components.map((comp) => {
      if (comp.type === "metric_card" && analyticsData) {
        return {
          ...comp,
          props: {
            ...comp.props,
            value: analyticsData.formattedTotal,
            change: analyticsData.growthPercentage,
          }
        };
      }
      return comp;
    })
  };

  return <DesignOSRenderer spec={hydratedSpec} />;
}
```

---

### Recipe 4: Next.js API Route for Headless UI Composition (`/api/genui`)
```typescript
// app/api/genui/route.ts
import { NextResponse } from "next/server";
import { DesignOSComposer } from "design-os-generative-ui";

const composer = new DesignOSComposer();

export async function POST(req: Request) {
  const { prompt, options } = await req.json();
  const result = await composer.compose(prompt, options);
  return NextResponse.json(result);
}
```

---

## 📋 Pre-Configured Components in Catalog

| Component ID | Category | Description | Primary Use Case |
|---|:---:|---|---|
| `metric_card` | Dashboard | KPI card with value, trend icon & percentage | Doanh thu, đơn hàng, user, tỷ lệ chuyển đổi |
| `trend_chart` | Dashboard | Pure SVG line/bar chart with period markers | Xu hướng 7 ngày, biểu đồ tăng trưởng |
| `data_table` | Dashboard | Table with search input, columns & status pills | Danh sách giao dịch, đơn hàng, nhật ký hệ thống |
| `alert_banner` | Feedback | Status banner (info, warning, critical, success) | Cảnh báo lỗi, thông báo bảo trì, sự cố |
| `hero_section` | Marketing | Stark linear hero with badge, headline, dual CTAs | Trang chủ, banner đầu trang sản phẩm |
| `feature_grid` | Marketing | 3-card micro-border grid with Lucide icons | Giới thiệu tính năng, ưu điểm công nghệ |
| `pricing_table` | Marketing | Multi-tier cards with highlight badge & checklists | Bảng giá SaaS, so sánh gói cước dịch vụ |
| `cta_section` | Marketing | High-contrast black section with email input | Kêu gọi đăng ký, chốt đơn cuối trang |

---

## 🛠️ Verification & Telemetry Guide

To verify the System 1 decision engine status on this machine:
1. Ensure Laya daemon is running at `http://127.0.0.1:8000` (`start_server.sh`).
2. Run test suite:
   ```bash
   cd /Users/jangtrinh/Products/design-os-generative-ui
   npx tsx tests/run-all-tests.ts
   ```
3. Test interactive playground:
   ```bash
   npm run dev:playground
   # Opens http://localhost:3300
   ```
