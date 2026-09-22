# JEV API (TypeSafe AI) — Bản Đồ Tri Thức (Knowledge Map)

Chào mừng bạn đến với kho tri thức toàn diện về **JEV API** và nền tảng **TypeSafe AI**. Đây là tài liệu được trích xuất, tổ chức và hệ thống hóa từ tài liệu chính thức [docs.typesafe.ai](https://docs.typesafe.ai) để phục vụ việc nghiên cứu, kiến trúc và phát triển các ứng dụng AI thế hệ mới.

---

## 🧭 Lộ Trình Khám Phá & Học Tập

| STT | Tài Liệu | Nội Dung Trọng Tâm | Dành Cho |
| :--- | :--- | :--- | :--- |
| **01** | [**01. Triết lý System One**](file:///Users/jangtrinh/Products/JEV/docs/01-system-one-concept.md) | Phân biệt System 1 vs System 2, vai trò của Calibrated Probabilities, tư duy "Code in Control". | Kiến trúc sư, Developer mới bắt đầu |
| **02** | [**02. Các Primitives Cốt Lõi**](file:///Users/jangtrinh/Products/JEV/docs/02-core-primitives.md) | Chi tiết 3 câu hỏi cơ bản: `Choice`, `Score`, `Noul` và cơ chế Batching nhiều câu hỏi cùng lúc. | Backend Dev, AI Engineer |
| **03** | [**03. Quản Trị State & Context**](file:///Users/jangtrinh/Products/JEV/docs/03-state-and-context.md) | Kỹ thuật cấu trúc State (JSON, Text, Tables, Code) và tối ưu hóa context window để đạt độ chính xác cao nhất. | Prompt Engineer, Backend Dev |
| **04** | [**04. Confidence & Định Tuyến Rủi Ro**](file:///Users/jangtrinh/Products/JEV/docs/04-confidence-and-routing.md) | Phân biệt `probability` vs `confidence`, xây dựng bộ lọc Confidence-gated routing và Self-consistency. | Reliability Engineer, Tech Lead |
| **05** | [**05. REST API Reference**](file:///Users/jangtrinh/Products/JEV/docs/05-rest-api-reference.md) | HTTP Endpoint `POST /v1/systemone`, Auth headers, JSON Request/Response schemas, HTTP status & Error codes. | Tích hợp hệ thống, mọi ngôn ngữ |
| **06** | [**06. Python SDK Hướng Dẫn**](file:///Users/jangtrinh/Products/JEV/docs/06-python-sdk.md) | Thư viện `typesafe-sdk`, Sync & Async Clients, Type Hints, Retry Policy, xử lý ngoại lệ. | Python Developer, Data Scientist |
| **07** | [**07. TypeScript / JS SDK Hướng Dẫn**](file:///Users/jangtrinh/Products/JEV/docs/07-javascript-sdk.md) | Package `@typesafe-ai/sdk`, helper functions (`choice`, `score`, `noul`), Type inference, Promise wrapper. | Frontend/Fullstack Developer, Node.js |
| **08** | [**08. Kiến Trúc Mẫu (Design Patterns)**](file:///Users/jangtrinh/Products/JEV/docs/08-architectural-patterns.md) | 5 Pattern vàng: Speculative Fan-out, Confidence Routing, Composite Scoring, Intent Routing, SDE Cascade. | Software Architect, Lead Dev |
| **09** | [**09. Cookbooks & Thực Chiến**](file:///Users/jangtrinh/Products/JEV/docs/09-cookbooks-and-recipes.md) | 10+ kịch bản mẫu đầy đủ: Re-ranking, Semantic find, LLM Guardrails, Date/Entity extraction, Function calling. | Toàn bộ đội ngũ phát triển |
| **10** | [**10. Thông Số Model & Jaggedness**](file:///Users/jangtrinh/Products/JEV/docs/10-models-and-limits.md) | Thông số `jev-latest`, `jev-1.13`, độ trễ, giới hạn tokens, các góc cạnh chưa hoàn hảo (jagged edges) cần tránh. | Mọi kỹ sư vận hành |
| **Archive**| [**Bản Tài Liệu Thô Đầy Đủ**](file:///Users/jangtrinh/Products/JEV/docs/raw-full-docs.md) | Hơn 20.000 dòng tài liệu nguyên bản từ TypeSafe AI phục vụ tra cứu chuyên sâu và đối chiếu. | Tra cứu ngoại tuyến |

---

## ⚡ Tóm Tắt Trong 30 Giây

- **Jev là gì?** Jev là mô hình đầu tiên thuộc trường phái **System One**. Nó được thiết kế đặc thù cho phần mềm (software-first AI): nhận vào `state` + các câu hỏi có kiểu dữ liệu (`questions`), và trả về kết quả có cấu trúc với xác suất chuẩn hóa (`probabilities`) và độ tin cậy (`confidence`).
- **Khác gì với LLM thông thường (GPT-4, Claude, Gemini)?**
  - LLM thông thường là **System Two**: chậm, sinh chuỗi token tự do (text generation), cần prompt engineering phức tạp và parser để parse JSON.
  - Jev là **System One**: cực nhanh (vài chục ms), siêu rẻ (rẻ hơn 10x - 12x), không sinh text rườm rà, trả thẳng cấu trúc dữ liệu mà code có thể rẽ nhánh `if/else` ngay lập tức.
- **Code luôn làm chủ (Code in Control):** Jev đóng vai trò là "giác quan / cảm quan ngữ nghĩa" (semantic common sense) được nhúng vào các khối điều kiện trong phần mềm, còn code chịu trách nhiệm điều hướng luồng, tính toán, và tương tác DB.
