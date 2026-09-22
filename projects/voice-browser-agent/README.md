# JEV Voice Browser Agent 🎙️🌐

Ứng dụng Web điều khiển trình duyệt thời gian thực bằng giọng nói (Real-time Voice Web Browser Automation) được hỗ trợ bởi **Jev API (TypeSafe AI)** và **Playwright**.

---

## 🌟 Điểm Nổi Bật

1. **Auto-Transcribe Thời Gian Thực**: Sử dụng Web Speech API tích hợp sẵn trên trình duyệt, hỗ trợ nhận diện Tiếng Việt (`vi-VN`) và Tiếng Anh (`en-US`), không độ trễ và không cần API key phụ.
2. **Quyết Định Siêu Tốc Bằng Jev System One**:
   - **Intent Classification (`Choice`)**: Nhận diện ý định (`navigate`, `click`, `type`, `scroll`, `back`, v.v.) trong ~30-50ms.
   - **Interactive Element Disambiguation (`Choice`)**: Tự động quét toàn bộ cây DOM các liên kết/nút bấm trên trang hiện tại, Jev chỉ định chính xác phần tử mục tiêu dựa trên xác suất chuẩn hóa.
   - **Confidence-Gated Safety**: Chỉ tự động thực thi khi điểm tin cậy `confidence >= 0.60`. Khi câu lệnh mơ hồ hoặc không rõ ràng, hệ thống sẽ cảnh báo thay vì thao tác bừa bãi.
3. **Hiển Thị Song Song (Dual View)**:
   - **Cửa Sổ Chromium Thật (Headful)**: Mở trình duyệt thật ngay trên máy tính, bạn thấy con trỏ và trang web tự động thao tác live.
   - **Live Screencast Stream**: Truyền luồng ảnh chụp màn hình trực tiếp về giao diện Web App qua WebSocket.
4. **Jev Inspector Trực Quan**: Hiển thị bảng phân phối xác suất `probabilities`, điểm tin cậy `confidence`, độ trễ xử lý (ms) và mục tiêu nhận diện.

---

## 🚀 Hướng Dẫn Khởi Chạy

### 1. Cài đặt dependencies (đã hoàn thành)
```bash
npm install
```

### 2. Cấu hình khóa API (Tùy chọn)
Nếu bạn có `TYPESAFE_API_KEY`, tạo file `.env`:
```bash
TYPESAFE_API_KEY="ts_live_your_key_here"
```
*(Lưu ý: Nếu chưa có key, hệ thống vẫn hoạt động trơn tru 100% với bộ Smart Heuristic Mock engine để bạn trải nghiệm và test ngay lập tức).*

### 3. Khởi động ứng dụng
```bash
npm start
```
Sau đó mở trình duyệt tại: **`http://localhost:3000`**

---

## 🗣️ Các Câu Lệnh Giọng Nói Mẫu Để Thử Nghiệm

| Ý Định | Câu Lệnh Mẫu (Tiếng Việt) | Lệnh Tiếng Anh |
| :--- | :--- | :--- |
| **Mở trang web** | *"Mở trang vnexpress.net"* / *"Truy cập google.com"* | *"Open github.com"* / *"Go to reddit"* |
| **Click vào link / bài viết** | *"Click vào bài báo đầu tiên"* / *"Bấm vào Tin tức"* | *"Click the first link"* / *"Click sign in"* |
| **Cuộn trang** | *"Cuộn xuống dưới"* / *"Cuộn lên trên"* | *"Scroll down"* / *"Scroll up"* |
| **Tìm kiếm / Nhập liệu** | *"Tìm kiếm thời tiết hôm nay"* / *"Gõ từ khóa AI"* | *"Search for apple"* / *"Type hello world"* |
| **Điều hướng** | *"Quay lại trang trước"* / *"Tải lại trang"* | *"Go back"* / *"Reload page"* |
