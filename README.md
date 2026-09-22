# JEV Workspace — Trung Tâm Tri Thức & Phát Triển Dự Án JEV API (TypeSafe AI)

Chào mừng bạn đến với **JEV Workspace** tại `/Users/jangtrinh/Products/JEV`.

Không gian này được thiết lập để nghiên cứu, tích hợp và phát triển các hệ thống phần mềm thông minh ứng dụng **Jev** — mô hình nền tảng đầu tiên thuộc trường phái **System One** do **TypeSafe AI** phát triển.

---

## 🌟 Vì Sao Chọn Jev / TypeSafe AI?

Hầu hết các hệ thống AI hiện nay đang lãng phí tài nguyên khi sử dụng các mô hình LLM System Two cồng kềnh (như GPT-4, Claude) chỉ để đưa ra các quyết định phân loại, chấm điểm hoặc gắn cờ đơn giản.

Jev thay đổi hoàn toàn cách tiếp cận này:
- ⚡ **Siêu Tốc**: Phản hồi trong vài chục mili-giây (~30ms - 100ms).
- 💰 **Tiết Kiệm 90% Chi Phí**: Rẻ hơn 10x - 12x so với việc gọi LLM truyền thống.
- 🎯 **Không Hallucination Về Cấu Trúc**: Trả về dữ liệu có kiểu định sẵn (`Choice`, `Score`, `Noul`) kèm xác suất chuẩn hóa (`probabilities`) và độ tin cậy (`confidence`).
- 🛠️ **Code In Control**: Giữ code của bạn làm chủ luồng điều khiển, Jev đóng vai trò là "cảm quan ngữ nghĩa" (programmable common sense).

---

## ⚡ Quickstart Trong 60 Giây

### Cách 1: Python (`typesafe-sdk`)

```bash
pip install typesafe-sdk
export TYPESAFE_API_KEY="your_api_key_here"
```

```python
from typesafe_sdk import TypeSafeClient, Choice, Score, Noul

client = TypeSafeClient()

response = client.system_one(
    state="Đơn hàng #58129 của tôi bị giao sai sản phẩm. Tôi yêu cầu đổi lại gấp!",
    questions={
        "department": Choice(
            instructions="Phân loại phòng ban xử lý",
            criteria={"shipping": "Giao hàng / Vận chuyển", "billing": "Thanh toán", "tech": "Kỹ thuật"}
        ),
        "anger_level": Score(
            instructions="Mức độ giận dữ của khách hàng",
            criteria=["Bình tĩnh", "Khó chịu vừa", "Rất tức giận"]
        ),
        "is_urgent": Noul(instructions="Nội dung thể hiện sự khẩn cấp hoặc cần giải quyết ngay")
    }
)

print(response.answers["department"].choice)       # -> "shipping"
print(response.answers["anger_level"].score)        # -> 1.45 (thang 0-2)
print(response.answers["is_urgent"].noul)           # -> 0.98 (Xác suất Yes)
```

---

### Cách 2: TypeScript / JavaScript (`@typesafe-ai/sdk`)

```bash
npm install @typesafe-ai/sdk
export TYPESAFE_API_KEY="your_api_key_here"
```

```typescript
import { TypeSafeClient, choice, score, noul } from "@typesafe-ai/sdk";

const client = new TypeSafeClient();

const result = await client.systemOne({
  state: { text: "Phát hiện đăng nhập bất thường từ IP lạ tại Nga." },
  questions: {
    threat_level: score("Mức độ đe dọa an ninh", ["Thấp", "Trung bình", "Báo động đỏ"]),
    action: choice("Hành động bảo mật", {
      allow: "Bỏ qua",
      challenge_2fa: "Bắt buộc xác thực 2FA",
      lock_account: "Khóa tạm thời"
    }),
    is_immediate_risk: noul("Tài khoản đang bị tấn công chiếm quyền")
  }
});

console.log(result.answers.action.choice);
console.log(result.answers.threat_level.score);
```

---

### Cách 3: Lệnh cURL Trực Tiếp

```bash
curl -X POST https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $TYPESAFE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "Xin chào, dịch vụ của bạn có hỗ trợ xuất hóa đơn VAT không?",
    "model": "jev-latest",
    "questions": {
      "is_vat_question": {
        "type": "noul",
        "instructions": "Khách hàng hỏi về hóa đơn VAT hoặc thuế"
      }
    }
  }'
```

---

## 📚 Hệ Thống Kho Tri Thức (Knowledge Base)

Toàn bộ tài liệu chi tiết được tổ chức tại thư mục [`docs/`](file:///Users/jangtrinh/Products/JEV/docs/):

- 📖 [**00. Mục lục & Bản đồ tri thức**](file:///Users/jangtrinh/Products/JEV/docs/00-index.md)
- 🧠 [**01. Triết lý System One**](file:///Users/jangtrinh/Products/JEV/docs/01-system-one-concept.md)
- 🧩 [**02. Các Primitives Cốt Lõi (Choice, Score, Noul)**](file:///Users/jangtrinh/Products/JEV/docs/02-core-primitives.md)
- 🗂️ [**03. Quản Trị State & Ngữ Cảnh**](file:///Users/jangtrinh/Products/JEV/docs/03-state-and-context.md)
- ⚖️ [**04. Confidence & Định Tuyến Tin Cậy**](file:///Users/jangtrinh/Products/JEV/docs/04-confidence-and-routing.md)
- 🌐 [**05. REST API Reference (Chi tiết HTTP Endpoint)**](file:///Users/jangtrinh/Products/JEV/docs/05-rest-api-reference.md)
- 🐍 [**06. Hướng Dẫn Python SDK (`typesafe-sdk`)**](file:///Users/jangtrinh/Products/JEV/docs/06-python-sdk.md)
- 🟨 [**07. Hướng Dẫn TypeScript SDK (`@typesafe-ai/sdk`)**](file:///Users/jangtrinh/Products/JEV/docs/07-javascript-sdk.md)
- 🏛️ [**08. 5 Kiến Trúc Mẫu Vàng (Architectural Patterns)**](file:///Users/jangtrinh/Products/JEV/docs/08-architectural-patterns.md)
- 🍳 [**09. Tuyển Tập Cookbooks & Code Thực Chiến**](file:///Users/jangtrinh/Products/JEV/docs/09-cookbooks-and-recipes.md)
- 📐 [**10. Thông Số Model & Các Góc Cạnh Chưa Hoàn Hảo (Jaggedness)**](file:///Users/jangtrinh/Products/JEV/docs/10-models-and-limits.md)
- 📜 [**Bản Lưu Trữ Thô Toàn Bộ Tài Liệu Gốc (>20.000 dòng)**](file:///Users/jangtrinh/Products/JEV/docs/raw-full-docs.md)

---

## 🤖 Hỗ Trợ AI Agent Tự Động

Thư mục đã được cài đặt sẵn **Agent Skill** tại [`.agent/skills/typesafe-ai/SKILL.md`](file:///Users/jangtrinh/Products/JEV/.agent/skills/typesafe-ai/SKILL.md). Bất kỳ AI Agent nào (Antigravity, Claude Code, Codex) khi mở thư mục `JEV` đều sẽ tự động nhận diện và sử dụng thành thạo JEV API theo đúng quy chuẩn.

---

## 📂 Bắt Đầu Dự Án Mới

Mọi dự án con mới sẽ được khởi tạo trong thư mục [`projects/`](file:///Users/jangtrinh/Products/JEV/projects/):
1. Tạo thư mục mới: `mkdir -p projects/<ten-du-an>`
2. Xem hướng dẫn khởi tạo dự án: [projects/README.md](file:///Users/jangtrinh/Products/JEV/projects/README.md)
