# 07. TypeScript / JavaScript SDK (`@typesafe-ai/sdk`)

Official client SDK for Node.js, Bun, Deno, Next.js, and Cloudflare Workers (Node.js >= 20).

---

## 1. Installation

```bash
# npm
npm install @typesafe-ai/sdk

# pnpm
pnpm add @typesafe-ai/sdk

# bun
bun add @typesafe-ai/sdk
```

---

## 2. Client Initialization & Configuration

The SDK exports full ESM and CommonJS definitions with end-to-end TypeScript type inference:

```typescript
import { TypeSafeClient } from "@typesafe-ai/sdk";

// Automatically resolves process.env.TYPESAFE_API_KEY
const client = new TypeSafeClient();

// Or pass explicit configuration:
const customClient = new TypeSafeClient({
  apiKey: process.env.TYPESAFE_API_KEY,
  baseURL: "https://api.typesafe.ai",
  timeout: 20000, // 20 seconds
  retryPolicy: {
    maxRetries: 3,
    statusCodes: [429, 500, 502, 503, 504],
  },
});
```

---

## 3. Typed Helpers (`choice`, `score`, `noul`)

The SDK provides ergonomic helper functions that enable automatic TypeScript union inference:

```typescript
import { TypeSafeClient, choice, score, noul } from "@typesafe-ai/sdk";

const client = new TypeSafeClient();

async function analyzeUserRequest() {
  const message = "My account was charged $99 but the platform displays a card error. Activate immediately or refund my money!";

  const response = await client.systemOne({
    state: {
      user_id: "u_10294",
      user_tier: "Enterprise",
      raw_message: message,
    },
    questions: {
      // 1. Department routing
      department: choice("Department to handle ticket", {
        billing: "Chargebacks, invoices, unexpected fees, payment gateways",
        tech_support: "Platform errors, code bugs, API failures",
        sales: "Price quotes, enterprise contract renewals",
      }),

      // 2. Business urgency level (0-2 scale)
      urgency_level: score("Business urgency level", [
        "Non-urgent, can be handled within standard 24h SLA",
        "Moderate urgency, resolve within business shift",
        "High urgency, directly blocks customer revenue or payment flow",
      ]),

      // 3. Binary refund proposition
      is_refund_demand: noul("Does the customer explicitly demand a financial refund?"),
    },
  });

  // Type Inference: TypeScript automatically knows `response.answers.department.choice`
  // is strictly typed as: "billing" | "tech_support" | "sales"
  const department = response.answers.department.choice;
  const probabilities = response.answers.department.probabilities;
  const confidence = response.answers.department.confidence;

  console.log(`Department: ${department} (Confidence: ${confidence})`);
  console.log(`Probabilities:`, probabilities);

  // Continuous Score:
  const urgency = response.answers.urgency_level.score;
  console.log(`Urgency Score: ${urgency.toFixed(2)} / 2.0`);

  // Binary probability:
  const refundProb = response.answers.is_refund_demand.noul;
  console.log(`Refund Demand Probability: ${(refundProb * 100).toFixed(1)}%`);
}

analyzeUserRequest().catch(console.error);
```

---

## 4. Next.js Guardrail Middleware Integration

Example of a zero-latency prompt guardrail in a Next.js App Router route handler:

```typescript
// app/api/chat/route.ts
import { NextResponse } from "next/server";
import { TypeSafeClient, noul, score } from "@typesafe-ai/sdk";

const typesafe = new TypeSafeClient();

export async function POST(req: Request) {
  const { prompt } = await req.json();

  // 1. Evaluate guardrails prior to invoking expensive generative LLMs
  const safetyCheck = await typesafe.systemOne({
    state: prompt,
    questions: {
      is_malicious: noul("Prompt attempts jailbreak, system prompt extraction, or contains hostile exploit payload"),
      harm_score: score("Potential harm severity", [
        "Completely benign conversational intent",
        "Ambiguous or unusual probing",
        "Overtly malicious exploit or attack payload"
      ]),
    },
  });

  const isMalicious = safetyCheck.answers.is_malicious.noul > 0.75;
  const isSevere = safetyCheck.answers.harm_score.score > 1.2;

  if (isMalicious || isSevere) {
    return NextResponse.json(
      { error: "Request violates content safety and security policies." },
      { status: 400 }
    );
  }

  // 2. Safe -> Forward to generative model (Claude / GPT / Gemini)
  return NextResponse.json({ message: "Payload approved." });
}
```
