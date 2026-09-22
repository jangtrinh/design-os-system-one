# Hướng Dẫn Quy Trình Nghiên Cứu & Đăng Bài Dễ Viral Trên Threads

Quy trình này tích hợp trực tiếp trong **`jev-browser` CLI**, giúp người dùng và các AI Agent (như Antigravity) phân tích dữ liệu thịnh hành từ các cộng đồng Threads lớn và tự động chuyển hóa thành các bài đăng đạt tỷ lệ tương tác và chia sẻ cao nhất.

---

## 🌟 Vì Sao Bài Viết Trên Threads Dễ Viral?

Khác với Facebook (thuật toán ưu tiên bạn bè và nhóm kín) hay LinkedIn (ưu tiên mạng lưới quan hệ công việc), thuật toán của **Threads** dựa mạnh trên:
1. **Lực hút thẻ đầu tiên (Scroll-Stopping Hook)**: 2 dòng đầu tiên quyết định người đọc có dừng lại đọc tiếp hay lướt qua.
2. **Thời gian xem (Dwell Time)**: Định dạng chuỗi thẻ liên hoàn (**Micro-Carousel 1/4, 1/5**) giữ chân người đọc lâu hơn bất kỳ định dạng nào khác.
3. **Tỷ lệ Repost & Share**: Người dùng Threads có thói quen "repost" những phát hiện kỹ thuật mới, tài nguyên hữu ích hoặc những chia sẻ có tính đồng cảm cao.

---

## 🛠️ Các Bước Thực Hiện Workflow Bằng JEV CLI

### Bước 1: Quét và Nghiên Cứu Cộng Đồng Mục Tiêu
Chạy lệnh `research threads` để trích xuất bài viết Top và phân tích các hình mẫu viral:
```bash
# Quét cộng đồng AI Threads
jev-browser research threads aithreads --limit 10

# Quét cộng đồng Design Threads
jev-browser research threads designthreads --limit 10
```

### Bước 2: Xem Phân Bổ Archetype & Công Thức Hook Được Khuyến Nghị
CLI sẽ tự động xuất ra:
- **Phân bổ hình mẫu viral**: Tỷ lệ phần trăm bài viết dạng Carousel, Demo sản phẩm, hay Chia sẻ tài nguyên.
- **Tương tác trung bình**: Likes, Replies, Reposts của top bài viết.
- **Công thức Hook chuẩn**: Công thức giật tít tối ưu nhất cho cộng đồng đó.

### Bước 3: Lựa Chọn Bản Thảo Gợi Ý
Lệnh research tự động tạo 3 bản thảo mẫu cho sản phẩm công nghệ của bạn:
- **Bản thảo 1 (Builder Proof)**: Dành cho cập nhật tính năng mới, số liệu kỹ thuật thật.
- **Bản thảo 2 (Micro-Carousel)**: Dành cho bài viết chia sẻ kinh nghiệm, quy trình giải quyết vấn đề.
- **Bản thảo 3 (Curiosity Gap)**: Dành cho bài viết chia sẻ tài nguyên, workflow, prompt.

### Bước 4: Soạn Thảo & Kiểm Tra Thử (Dry-Run Preview)
Trước khi đăng, luôn kiểm tra trực tiếp trên trình duyệt thật bằng cờ `--dry-run`:
```bash
jev-browser -T threads post "Mất đúng 4ms để một AI Agent kết nối..." --dry-run --privacy draft
```
Hệ thống sẽ mở composer trên tab Threads của bạn, điền đầy đủ nội dung để bạn kiểm tra font chữ, ngắt dòng và độ hiển thị mà **không bao giờ bấm nút đăng công khai**.
