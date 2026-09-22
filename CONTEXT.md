# JEV Workspace Context & Memory Ledger

> **Durable Context Document**: Lưu trữ toàn bộ tri thức, các quyết định kiến trúc, kinh nghiệm xử lý DOM và bài học thực chiến của workspace `/Users/jangtrinh/Products/JEV`.

---

## 🏛️ 1. Tổng Quan Kiến Trúc & Công Nghệ

Workspace này tập trung nghiên cứu, phát triển và ứng dụng **JEV (TypeSafe AI)** — mô hình nền tảng thuộc trường phái **System One**:
- **Cơ chế hoạt động**: Thay vì sinh text dài (System Two), JEV phản hồi theo kiểu định sẵn (`Choice`, `Score`, `Noul`) trong **30ms - 100ms** kèm phân bổ xác suất chuẩn hóa (`probabilities`) và độ tin cậy (`confidence`).
- **Triết lý cốt lõi**: *Code in Control* — Giữ code lập trình viên làm chủ luồng điều khiển, JEV đóng vai trò là "giác quan ngữ nghĩa siêu tốc" (programmable common sense).
- **Mô hình triển khai**:
  - `Node.js / TypeScript`: `@typesafe-ai/sdk`
  - `Python`: `typesafe-sdk`
  - `REST API`: `POST https://api.typesafe.ai/v1/systemone` (Model: `jev-latest`)

---

## 📦 2. Danh Mục Các Dự Án Hiện Tại

### 🚀 2.1. `projects/jev-browser-cli` (Hoàn thành 100% & Đã kiểm toán)
Universal Browser Automation CLI cho AI Agent (đồng hành cùng Antigravity) điều khiển trình duyệt thật (Chrome, Arc, Dia, Edge) qua CDP port 9222:
- **Đột phá kỹ thuật Direct CDP WebSocket**:
  - Khi trình duyệt có 40+ web workers (Facebook, LinkedIn, Zalo chạy ngầm), Playwright `connectOverCDP` ở cấp browser có thể bị treo hoặc timeout 30s do cơ chế auto-attach.
  - Giải pháp: Tích hợp `evaluateDirectCDP` và `navigateDirectCDP` kết nối trực tiếp vào `webSocketDebuggerUrl` của từng tab page qua Native WebSocket của Node.js. Thời gian phản hồi chỉ **4ms**, ổn định 100%.
- **Động cơ Đăng bài Mạng xã hội & Zero Public Leak Guard**:
  - **Facebook**: Đăng bài thật thành công với chế độ **🔒 Chỉ mình tôi** (đã chụp ảnh xác thực tại `facebook_only_me_verified.png`). Tự động bỏ chọn checkbox "Đặt làm mặc định" để bảo vệ thiết lập cá nhân của người dùng. Hard-lock kiểm tra nút quyền riêng tư trước khi submit.
  - **LinkedIn**: Tương thích TipTap ProseMirror editor (`div.tiptap[role="textbox"]`), chọn đối tượng "Connections only" qua inline popover, chạy an toàn ở chế độ `--dry-run` (ảnh xác thực tại `linkedin_verified.png`).
  - **Threads**: Chặn không cho đăng nhầm khi test; bắt buộc `--dry-run` hoặc `--privacy draft` (ảnh xác thực tại `threads_verified.png`).
- **Động cơ Nghiên cứu Threads Viral (`ThreadsResearcher`)**:
  - Quét bài viết thịnh hành tại các cộng đồng lớn (**AI Threads 1.3M thành viên**, **Design Threads 141K thành viên**) trong **3.7s - 4.4s**.
  - Đúc kết **5 Hình Mẫu Viral (Viral Archetypes)**:
    1. *Builder Proof & Hard Demo*: Đo lường cụ thể (ms/s/fps), video/gif sản phẩm thật → Repost & Bookmark cao nhất.
    2. *Multi-part Micro-Carousel (1/4, 1/5)*: Hook nỗi đau ở Card 1 + quy trình nhiều thẻ → Đẩy đề xuất For You mạnh nhất (tối đa Dwell Time).
    3. *Curiosity Gap ("Prompt ↓")*: Khẳng định gây tò mò + giấu prompt/link ở thẻ sau → Comment & Save cao nhất.
    4. *Community Crowdsource*: Đặt câu hỏi đánh số cụ thể 1, 2... → Thảo luận sôi nổi nhất.
    5. *Authentic Builder Confession*: Tâm sự ngắn gọn, chân thực của người làm sản phẩm → Like tự nhiên.
  - Tích hợp lệnh CLI: `jev-browser research threads [tag] [--limit] [--json]`.
  - Tự động sinh 3 bản thảo mẫu cho sản phẩm của người dùng (JEV Browser CLI, AI Automation, Design-OS).
- **Tối ưu hóa hiệu năng CLI**:
  - File `bin/jev-browser.js` tự động phát hiện và chạy file build `dist/index.js` khi có sẵn, giảm thời gian khởi động từ **~1.2s** xuống **~350ms** (tiết kiệm ~70% overhead của `tsx`).
  - Lệnh `eval` hỗ trợ cả biểu thức 1 dòng lẫn script đa dòng có `return` và `await`.

### 🎙️ 2.2. `projects/voice-browser-agent`
Thử nghiệm điều khiển trình duyệt bằng giọng nói thời gian thực (Web Speech API + Express + Playwright). Đã dừng để ưu tiên phát triển CLI companion độc lập cho AI Agents.

---

## 🧠 3. Thư Viện Kỹ Năng & Workflows Đã Đóng Gói

1. **Agent Skill Toàn Cục**:
   - Vị trí dự án: `.agent/skills/threads-viral-strategy/SKILL.md`
   - Vị trí toàn cục Antigravity: `/Users/jangtrinh/.gemini/config/skills/threads-viral-strategy/SKILL.md`
   - Định nghĩa quy trình 4 bước: **Scout ➔ Analyze ➔ Craft ➔ Stage & Post**.
2. **Tài Liệu Hướng Dẫn Workflow**:
   - `projects/jev-browser-cli/docs/workflows/threads-viral-workflow.md`
3. **Kho Tri Thức JEV Toàn Diện**:
   - `docs/00-index.md` đến `docs/10-models-and-limits.md` (Triết lý, Primitives, Routing, Codebooks, REST API Reference).

---

## 🎯 4. Hướng Dẫn Cho Dự Án JEV Tiếp Theo

Khi khởi tạo một dự án con JEV mới trong thư mục `projects/<new-project>`:
1. **Kiến trúc nhất quán**: Sử dụng TypeScript ESM (`"type": "module"`, `tsconfig.json` với `NodeNext`).
2. **Tận dụng TypeSafe JEV System One**: Luôn sử dụng `@typesafe-ai/sdk` với `client.systemOne()` để ra quyết định nhanh (<100ms) trước khi gọi bất kỳ LLM nặng nào.
3. **Tái sử dụng JEV Browser CLI**: Nếu dự án mới cần cào dữ liệu, duyệt web, tương tác social hoặc giám sát giao diện, hãy gọi trực tiếp `jev-browser` qua CLI flag `--json`.
4. **Biến môi trường**: Đảm bảo `TYPESAFE_API_KEY` được nạp từ file `.env` hoặc shell environment.
