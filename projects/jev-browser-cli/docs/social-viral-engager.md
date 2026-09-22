---
name: social-viral-engager
description: Tự động hóa toàn diện quy trình tìm kiếm (Scout), lọc rác AI Slop, chấm điểm Viral, tạo bình luận chuyên môn cao theo Persona kỹ thuật và tương tác an toàn trên LinkedIn/Threads/X bằng JEV Browser Dual-Brain.
allowed-tools: run_command, view_file, write_to_file
version: 1.0.0
priority: HIGH
---

# Social Viral Engager & Autonomous Thought-Leadership Workflow

> Quy trình tự động hóa tương tác mạng xã hội chuẩn Enterprise: **Tìm kiếm bài viết chất lượng cao -> Loại bỏ AI Slop -> Chấm điểm Virality -> Tạo thảo luận chuyên môn sâu sắc -> Tương tác DOM tự động có kiểm duyệt an toàn**.

---

## 🎯 1. Tổng Quan & Kiến Trúc Dual-Brain

Kỹ năng này kết hợp sức mạnh của:
1. **JEV Fast Evaluator (Brain 1)**: Điều khiển CDP trực tiếp (port 9222), xuyên thấu Shadow DOM, tự động cuộn (auto-hydration) và inject văn bản vào ProseMirror / Tiptap / ContentEditable trong dưới 200ms.
2. **Async Guard (Brain 2)**: Giám sát an toàn đa ngữ (6 thứ tiếng: EN, VI, DE, FR, ES, JA, ZH), chặn đứng rò rỉ API Keys (sk-, ghp-, AKIA, RSA), ngăn chặn spam và các hành vi hủy hoại tài khoản.
3. **Social Viral Curator**: Nhận diện 5 Archetypes viral, chấm điểm `viralScore` (0-100) và `slopScore` (0-100), loại bỏ các bài viết sáo rỗng (buzzwords, fluff).

---

## 🚀 2. Sử Dụng Nhanh Qua JEV Browser CLI

Kỹ năng được tích hợp trực tiếp trong `jev-browser-cli`:

### A. Chạy thử nghiệm an toàn (Dry-Run Preview)
Tự động quét feed, soạn thảo bình luận, mở editor trên trình duyệt thật và chụp ảnh nghiệm thu bản nháp mà **không gửi thật**:
```bash
jev-browser social-engage \
  --platform linkedin \
  --query "AI Product Design" \
  --persona principal_engineer \
  --dry-run
```

### B. Tự động tương tác và xuất bản thật (Auto-Submit with Proof)
Tự động gửi bình luận có kiểm duyệt của `AsyncGuard`, kiểm tra xác thực xuất bản trên DOM và lưu ảnh minh chứng:
```bash
jev-browser social-engage \
  --platform linkedin \
  --query "3D Design AI" \
  --persona hardware_specialist \
  --auto-submit \
  --max-engagements 1
```

### C. Quét & Đánh giá Feed độc lập (Curate Only)
```bash
jev-browser curate-feed \
  --platform linkedin \
  --limit 10 \
  --min-viral 50 \
  --max-slop 20 \
  --draft-reply
```

---

## 🏛️ 3. Thư Viện Kỹ Thuật Personas (Persona-Driven Comment Matrix)

Hệ thống cung cấp 4 Persona kỹ thuật nhằm tạo ra các thảo luận chất lượng cao, tránh các câu sáo rỗng ("Great post!", "Agree! 🚀"):

| Persona | Trọng Tâm Chuyên Môn | Kỹ Thuật Phản Biện / Thảo Luận |
|---|---|---|
| `principal_engineer` | Systems Thinking & Architecture | Cân bằng trade-off (cognitive load, latency, RAM), phân tích failure states, multi-physics boundary conditions. |
| `product_designer` | Ergonomics & Mental Models | Phân tích hành vi người dùng thực tế, giảm thiểu cognitive friction, thiết kế hệ thống thay vì vẽ pixel. |
| `hardware_specialist` | Physical Constraints & Safety | Tiêu chuẩn IEC creepage/clearance, tản nhiệt, giới hạn mật độ dòng điện, human-in-the-loop validation. |
| `general_tech` | Pragmatic Execution & ROI | So sánh giữa demo AI hào nhoáng và dây chuyền sản xuất thực tế, đo lường ROI cụ thể. |

---

## 🛡️ 4. Bộ Tiêu Chuẩn An Toàn & Chống Khóa Tài Khoản (Account Safety Policy)

1. **Anti-Slop Threshold**: Tự động loại bỏ mọi bài viết có `slopScore > 40` (chứa các từ khóa buzzword như *"in today's fast-paced world"*, *"supercharge your workflow"*, *"game-changer"*).
2. **Zero-Secret Leak**: Quét toàn bộ nội dung bình luận qua 7 mẫu Regex API Key trước khi inject vào DOM. Nếu phát hiện chuỗi nghi ngờ khóa bí mật, `AsyncGuard` sẽ lập tức hủy lệnh.
3. **Human-like Delay & Native Events**: Sử dụng `document.execCommand('insertText')` kết hợp với micro-delay (1000ms - 1500ms) để đồng bộ hoàn hảo với React/ProseMirror state manager, tránh bị LinkedIn gắn cờ bot automation.
4. **Visual Proof & DOM Verification**: Mọi tương tác xuất bản đều phải trải qua kiểm tra kép (kiểm tra chuỗi ký tự trên DOM + ảnh chụp màn hình độ phân giải gốc).

---

## 📋 5. Quy Trình Vận Hành Tiêu Chuẩn Cho Agent (Agent SOP)

Khi nhận lệnh *"Đi tương tác dạo trên LinkedIn/Threads về chủ đề X"*:
1. **Bước 1 - Khảo sát (Scout)**: Gọi `jev-browser social-engage --platform <platform> --query "<keyword>" --dry-run`.
2. **Bước 2 - Phân tích & Đánh giá**: Kiểm tra danh sách bài viết được lọc, điểm viral, slop score và bản nháp comment.
3. **Bước 3 - Duyệt ý định**: Nếu người dùng đồng ý hoặc ở chế độ tự động an toàn, kích hoạt `--auto-submit`.
4. **Bước 4 - Nghiệm thu (Verify)**: Kiểm tra ảnh chụp màn hình kết quả và báo cáo link/hình ảnh trực tiếp cho người dùng.
