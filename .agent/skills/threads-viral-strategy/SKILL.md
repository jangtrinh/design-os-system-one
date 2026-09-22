---
name: threads-viral-strategy
description: Nghiên cứu, tối ưu hóa cấu trúc bài đăng và xây dựng chiến lược viral cho Threads và các cộng đồng chủ đề (AI Threads, Design Threads, 3D Printing...) bằng JEV Browser CLI và JEV System One.
allowed-tools: run_command, view_file, write_to_file
version: 1.0.0
priority: HIGH
---

# Threads Viral Strategy & Community Publishing Skill

> Kỹ năng tự động hóa nghiên cứu và xuất bản nội dung viral trên **Threads** thông qua **`jev-browser` CLI** và **TypeSafe JEV System One**.

---

## 🎯 1. Mục Tiêu & Phạm Vi Kỹ Năng

Kỹ năng này được kích hoạt khi AI Agent (hoặc người dùng) cần:
1. **Nghiên cứu thị trường / cộng đồng Threads**: Tìm hiểu bài viết nào đang đứng top, định dạng nào được tương tác nhiều nhất trong các nhóm/tag như `AI Threads`, `Design Threads`, `3D Printing`, `Figma`.
2. **Thiết kế nội dung Viral**: Áp dụng **5 Hình Mẫu Viral (Viral Archetypes)** đã được kiểm chứng bằng dữ liệu thực tế.
3. **Soạn thảo và đăng bài an toàn**: Kết hợp cùng lệnh `jev-browser post` với cơ chế bảo vệ quyền riêng tư tuyệt đối (**Zero Public Leak Guard**).

---

## 🏛️ 2. Năm Hình Mẫu Nội Dung Viral Trên Threads (5 Proven Archetypes)

Dữ liệu thực nghiệm qua JEV Browser trên các cộng đồng hàng triệu thành viên chỉ ra 5 công thức thành công:

### Archetype 1: The Builder Proof & Hard Demo (Chia Sẻ Sản Phẩm Thật)
- **Tỷ lệ Repost & Bookmark cao nhất**: Người dùng Threads yêu thích những người trực tiếp "build in public".
- **Công thức Hook**: `[Kết quả ấn tượng/Con số cụ thể: 4ms, 244s, 15 apps] + [Video/GIF minh họa chuyển động] + [Mã nguồn mở hoặc link trải nghiệm]`
- **Ví dụ**:
  > *"Mất đúng 4ms để một AI Agent kết nối và điều khiển trực tiếp tab trình duyệt thật của bạn. ⚡️ Không cần server trung gian, giữ nguyên 100% cookies..."*

### Archetype 2: Multi-part Micro-Carousel (Chuỗi Thẻ Đẩy Thuật Toán)
- **Đẩy đề xuất For You mạnh nhất**: Thuật toán Threads thưởng điểm phân phối cao cho những bài viết giữ chân người đọc vuốt qua các thẻ (1/4, 1/5).
- **Cấu trúc 4 thẻ**:
  - **Thẻ 1 (Hook)**: Nỗi đau/sự thật gây sốc (`Ai từng làm X chắc chắn đều nếm trải nỗi sợ này... 🤯 1/4`).
  - **Thẻ 2-3 (Value)**: 3 gạch đầu dòng giải pháp hoặc phân tích nguyên nhân.
  - **Thẻ 4 (CTA)**: Câu hỏi gợi mở thảo luận hoặc link ở bio.

### Archetype 3: The Curiosity Gap ("Prompt ↓" / "Code in Thread")
- **Tỷ lệ Comment & Save cao nhất**: Đưa ra kết quả cuối cùng hoàn hảo, nhưng giữ lại "công thức nấu ăn" ở comment đầu hoặc thẻ tiếp theo.
- **Ví dụ**:
  > *"GPT-6 Astra is by far the best design model today. Prompt ↓ 1/2"*

### Archetype 4: Community Crowdsource (Hỏi Ý Kiến Chuyên Gia)
- **Tỷ lệ Reply thảo luận sôi nổi nhất**: Đặt câu hỏi cụ thể, đánh số rõ ràng (1, 2) thay vì hỏi chung chung.
- **Ví dụ**:
  > *"Cả nhà có ai từng dùng thử công cụ X chưa ạ? Em xin review với: 1. Tốc độ ổn không? 2. Có bị khóa tài khoản không?..."*

### Archetype 5: Authentic Builder Confession (Tâm Sự Người Làm Nghề)
- **Tỷ lệ Thả Tim tự nhiên**: Những mẩu chuyện ngắn, thật, không màu mè về hành trình làm sản phẩm ban đêm hoặc những bài học xương máu.
- **Ví dụ**:
  > *"15+ apps live. I still build after work. ❤️"*

---

## 🚀 3. Quy Trình Vận Hành 4 Bước (The 4-Step Viral Workflow)

```
[Phase 1: Scout] ──► [Phase 2: Analyze] ──► [Phase 3: Craft] ──► [Phase 4: Stage & Post]
  Quét cộng đồng      Phân loại Archetype     Viết bài theo         Dry-run & Đăng bài
  bằng CLI            & tính virality score   chuẩn Carousel        an toàn với JEV
```

### Bước 1: Scout — Quét Dữ Liệu Cộng Đồng Mục Tiêu
Sử dụng `jev-browser research threads` để quét dữ liệu trực tiếp trong 4 giây:
```bash
# Quét cộng đồng AI Threads (1.3M thành viên)
jev-browser research threads "aithreads" --limit 10

# Quét cộng đồng Design Threads (141K thành viên)
jev-browser research threads "designthreads" --limit 10

# Xuất dữ liệu JSON có cấu trúc cho AI:
jev-browser research threads "aithreads" --limit 5 --json
```

### Bước 2: Analyze — Đánh Giá Tương Tác & Chọn Góc Tiếp Cận
Dựa vào chỉ số `archetypeDistribution` và `averageEngagement`:
- Nếu cộng đồng nhiều bài **Micro-Carousel**: Chọn góc kể chuyện (Storytelling 1/4).
- Nếu cộng đồng nhiều bài **Builder Demo**: Chuẩn bị video/ảnh chụp màn hình kèm chỉ số đo lường (ms/fps).

### Bước 3: Craft — Soạn Thảo Nội Dung Đạt Chuẩn
Tuân thủ nghiêm ngặt 3 quy tắc vàng:
1. **Quy tắc thẻ 1**: Dưới 150 ký tự, có biểu tượng cảm xúc gây chú ý (`⚡️`, `🤯`, `🚨`), không chèn link ngoài ở thẻ 1.
2. **Quy tắc độ dài**: Mỗi thẻ thân bài chỉ từ 180 - 280 ký tự, ngắt dòng thoáng, dùng bullet points `•`.
3. **Quy tắc Call-to-Action**: Đặt câu hỏi mở ở cuối để kích thích người đọc để lại bình luận.

### Bước 4: Stage & Post — Kiểm Thử & Xuất Bản An Toàn
Luôn luôn chạy chế độ `--dry-run` hoặc `--privacy draft` để xem trước trên trình duyệt thật trước khi đăng:
```bash
# Soạn bài trên Threads dạng nháp an toàn (không bao giờ rò rỉ khi test):
jev-browser -T threads post "Nội dung bài viết viral..." --dry-run --privacy draft
```

---

## 🛠️ 4. Bảng Lệnh Tóm Tắt

| Thao tác | Lệnh thực thi |
|---|---|
| Nghiên cứu AI Threads | `jev-browser research threads aithreads` |
| Nghiên cứu Design Threads | `jev-browser research threads designthreads` |
| Nghiên cứu 3D Printing | `jev-browser research threads 3dprinting` |
| Xuất dữ liệu phân tích JSON | `jev-browser research threads <tag> --json` |
| Soạn bài nháp kiểm thử | `jev-browser -T threads post "<content>" --dry-run --privacy draft` |
