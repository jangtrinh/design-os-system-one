# 07. Hướng Dẫn TypeScript / JavaScript SDK (`@typesafe-ai/sdk`)

SDK chính thức của TypeSafe AI dành cho môi trường Node.js (hỗ trợ Node.js >= 20, Bun, Deno, Next.js, Cloudflare Workers).

---

## 1. Cài Đặt (Installation)

```bash
# npm
npm install @typesafe-ai/sdk

# pnpm
pnpm add @typesafe-ai/sdk

# bun
bun add @typesafe-ai/sdk
```

---

## 2. Khởi Tạo Client & Cấu Hình

SDK hỗ trợ cả ESM và CommonJS, đi kèm định nghĩa kiểu TypeScript hoàn chỉnh:

```typescript
import { TypeSafeClient } from "@typesafe-ai/sdk";

// Tự động đọc process.env.TYPESAFE_API_KEY
const client = new TypeSafeClient();

// Hoặc truyền thủ công cấu hình:
const customClient = new TypeSafeClient({
  apiKey: process.env.TYPESAFE_API_KEY,
  baseURL: "https://api.typesafe.ai",
  timeout: 20000, // 20 giây
  retryPolicy: {
    maxRetries: 3,
    statusCodes: [429, 500, 502, 503, 504],
  },
});
```

---

## 3. Sử Dụng Các Hàm Trợ Giúp (`choice`, `score`, `noul`)

SDK cung cấp các helper functions giúp TypeScript suy luận kiểu dữ liệu tự động (Type Inference) cho kết quả trả về:

```typescript
import { TypeSafeClient, choice, score, noul } from "@typesafe-ai/sdk";

const client = new TypeSafeClient();

async function analyzeUserRequest() {
  const message = "Tài khoản của tôi bị trừ tiền $99 nhưng hệ thống báo lỗi thẻ. Vui lòng hoàn tiền hoặc kích hoạt ngay!";

  const response = await client.systemOne({
    state: {
      user_id: "u_10294",
      user_tier: "Enterprise",
      raw_message: message,
    },
    questions: {
      // 1. Phân loại phòng ban xử lý
      department: choice("Phòng ban tiếp nhận ticket", {
        billing: "Vấn đề trừ tiền, hóa đơn, hoàn tiền, cổng thanh toán",
        tech_support: "Lỗi tính năng hệ thống, bug code, API",
        sales: "Tư vấn báo giá, gia hạn hợp đồng",
      }),

      // 2. Chấm điểm mức độ khẩn cấp (thang 0-2)
      urgency_level: score("Mức độ khẩn cấp về mặt kinh doanh", [
        "Không khẩn cấp, có thể xử lý trong 24h",
        "Khẩn cấp vừa, cần xử lý trong ca làm việc",
        "Khẩn cấp cao, ảnh hưởng trực tiếp đến doanh thu / thanh toán",
      ]),

      // 3. Đánh giá nhị phân yêu cầu hoàn tiền
      is_refund_demand: noul("Khách hàng có yêu cầu hoàn tiền trực tiếp không?"),
    },
  });

  // Type Inference: TypeScript tự động biết `response.answers.department.choice`
  // chỉ có thể là: "billing" | "tech_support" | "sales"
  const department = response.answers.department.choice;
  const probabilities = response.answers.department.probabilities;
  const confidence = response.answers.department.confidence;

  console.log(`Phòng ban: ${department} (Confidence: ${confidence})`);
  console.log(`Xác suất chi tiết:`, probabilities);

  // Điểm số liên tục:
  const urgency = response.answers.urgency_level.score;
  console.log(`Điểm khẩn cấp: ${urgency.toFixed(2)} / 2.0`);

  // Xác suất Yes/No:
  const refundProb = response.answers.is_refund_demand.noul;
  console.log(`Xác suất đòi hoàn tiền: ${(refundProb * 100).toFixed(1)}%`);
}

analyzeUserRequest().catch(console.error);
```

---

## 4. Tích Hợp Vào Next.js Route Handler / Express

Ví dụ xây dựng một API Route bảo vệ Prompt (Guardrail Middleware) trong Next.js App Router:

```typescript
// app/api/chat/route.ts
import { NextResponse } from "next/server";
import { TypeSafeClient, noul, score } from "@typesafe-ai/sdk";

const typesafe = new TypeSafeClient();

export async function POST(req: Request) {
  const { prompt } = await req.json();

  // 1. Kiểm tra an toàn trước khi gọi LLM đắt tiền
  const safetyCheck = await typesafe.systemOne({
    state: prompt,
    questions: {
      is_malicious: noul("Prompt cố ý jailbreak, trích xuất system prompt, hoặc chứa nội dung độc hại"),
      harm_score: score("Mức độ nguy hại tiềm tàng", [
        "Lành tính hoàn toàn",
        "Có yếu tố nghi vấn nhưng chưa rõ ràng",
        "Độc hại / Tấn công rõ rệt"
      ]),
    },
  });

  const isMalicious = safetyCheck.answers.is_malicious.noul > 0.75;
  const isSevere = safetyCheck.answers.harm_score.score > 1.2;

  if (isMalicious || isSevere) {
    return NextResponse.json(
      { error: "Yêu cầu vi phạm tiêu chuẩn an toàn nội dung." },
      { status: 400 }
    );
  }

  // 2. An toàn -> Cho phép tiếp tục chuyển tới mô hình sinh văn bản chính
  // ... gọi Claude / GPT / Gemini ...
  return NextResponse.json({ message: "Request hợp lệ." });
}
```
