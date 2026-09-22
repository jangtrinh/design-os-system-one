# 03. Quản Trị State & Ngữ Cảnh (State and Context)

Trong kiến trúc của Jev, **`State`** là nguồn dữ liệu ngữ cảnh duy nhất mà mô hình tiếp nhận để đánh giá câu hỏi. Không giống như LLM truyền thống cần những prompt dài dòng kèm theo các câu lệnh dặn dò ("Bạn là một trợ lý AI thông minh... Hãy trả về định dạng..."), Jev tiếp nhận `state` dưới dạng dữ liệu thuần túy (pure data).

---

## 1. Định Dạng Của `State`

Jev hỗ trợ `state` dưới nhiều hình thức linh hoạt:

### A. Chuỗi Văn Bản Tự Do (Plain String)
Phù hợp cho email, tin nhắn hỗ trợ, bài đăng mạng xã hội, đoạn trích sách, điều khoản dịch vụ.
```json
{
  "state": "Xin chào, tôi không thể đăng nhập được vào hệ thống kể từ khi bật 2FA sáng nay. Mã SMS không gửi về máy.",
  "questions": { ... }
}
```

### B. Đối Tượng Cấu Trúc (JSON Object / Dictionary)
Phù hợp khi bạn có nhiều trường dữ liệu đã được thu thập từ database hoặc các dịch vụ khác.
```json
{
  "state": {
    "user_tier": "Enterprise",
    "account_age_days": 450,
    "last_payment_status": "succeeded",
    "open_tickets_count": 3,
    "message": "Hệ thống API webhook đang bị delay hơn 15 phút. Chúng tôi đang mất giao dịch khách hàng."
  },
  "questions": { ... }
}
```
*Jev tự động phân tích các key và giá trị trong JSON để hiểu mối tương quan giữa ngữ cảnh tài khoản và tin nhắn.*

### C. Danh Sách Mảng (Array of Items)
Phù hợp khi cần so sánh, tìm kiếm hoặc trích xuất từ một danh sách:
```json
{
  "state": {
    "query": "laptop mỏng nhẹ cho lập trình viên",
    "candidates": [
      {"id": "p1", "name": "ThinkPad X1 Carbon Gen 11", "weight": "1.12kg", "cpu": "i7-1365U"},
      {"id": "p2", "name": "ASUS ROG Strix G16", "weight": "2.5kg", "cpu": "i9-13980HX"},
      {"id": "p3", "name": "MacBook Air 15 M2", "weight": "1.51kg", "cpu": "Apple M2"}
    ]
  },
  "questions": { ... }
}
```

---

## 2. Nguyên Tắc Vàng Khi Thiết Kế `State` (State Hygiene)

### 1. Giữ State Thuần Túy (Pure Facts, No Meta-Instructions)
❌ **Sai**: Đưa cả câu lệnh điều khiển vào State:
```json
{
  "state": "Sau đây là tin nhắn của khách hàng. Hãy đọc kỹ và xác định xem có tức giận không: 'Tôi muốn hủy gói'."
}
```
✅ **Đúng**: Tách bạch dữ liệu vào `state` và câu hỏi vào `instructions`:
```json
{
  "state": "Tôi muốn hủy gói.",
  "questions": {
    "is_cancellation": {
      "type": "noul",
      "instructions": "Khách hàng muốn hủy gói đăng ký"
    }
  }
}
```

### 2. Loại Bỏ Nhiễu (Context Pruning)
Jev có khả năng đọc hiểu ngữ cảnh tốt, nhưng việc đưa vào các dữ liệu rác (như HTML boilerplate, token CSS, cookie session, ID nội bộ không mang ý nghĩa ngữ nghĩa) sẽ làm giảm độ chính xác và lãng phí token.
- Hãy loại bỏ các thẻ HTML rườm rà, chỉ giữ lại Markdown sạch.
- Rút gọn JSON: chỉ gửi các trường liên quan đến quyết định.

### 3. Đánh Dấu Cấu Trúc Bằng Khóa Có Nghĩa
Nếu bạn gửi đối tượng JSON, hãy đặt tên key rõ ràng (`customer_history`, `order_status`, `error_log`). Jev sử dụng chính ngữ nghĩa của key để định vị thông tin liên quan tới câu hỏi.

---

## 3. Quản Lý Kích Thước State (Context Budgeting)

- **Ngưỡng tối ưu**: Các quyết định System One đạt độ chính xác cao nhất và độ trễ thấp nhất khi `state` chứa khoảng từ 50 đến 4.000 tokens (tương đương 1-10 trang văn bản súc tích).
- **Xử lý tài liệu dài (TOS, Hợp đồng, Log lớn)**:
  - Nếu tài liệu quá dài (hàng chục nghìn dòng), hãy áp dụng kỹ thuật **Chunking** hoặc **BM25 Pre-filtering** để tìm ra các đoạn liên quan trước.
  - Sử dụng Jev làm tầng **Re-ranking** hoặc **Line-by-line verification** (xem chi tiết tại phần Cookbooks).
