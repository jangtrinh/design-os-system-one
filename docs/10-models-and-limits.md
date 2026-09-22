# 10. Thông Số Model & Các Góc Cạnh Chưa Hoàn Hảo (Models & Jaggedness)

Để xây dựng hệ thống phần mềm đáng tin cậy với Jev, bạn cần hiểu rõ đặc tính kỹ thuật, giới hạn, và những "góc cạnh chưa hoàn hảo" (Jagged Edges) đã được TypeSafe AI ghi nhận chính thức.

---

## 1. Danh Sách Mô Hình (Model Roster)

| Tên Model | Định Danh | Mục Đích Sử Dụng | Khuyến Nghị |
| :--- | :--- | :--- | :--- |
| **`jev-latest`** | Tự động trỏ tới bản mới nhất | Luôn nhận các cải tiến và bản vá mới nhất | Phù hợp cho môi trường Dev/Staging |
| **`jev-1.13`** | Phiên bản cố định (Version-pinned) | Giữ hành vi và phân phối xác suất bất biến | Bắt buộc cho môi trường Production ổn định |

---

## 2. Thông Số Vận Hành (Operational Specs)

- **Độ trễ trung bình (P50 Latency)**: $30\text{ms} - 120\text{ms}$ (tùy thuộc vào độ dài của `state` và số lượng câu hỏi batching).
- **Giới hạn Context Token**:
  - Tối đa khoảng $8.000$ tokens cho `state`.
  - Khuyến nghị tối ưu: $50 - 4.000$ tokens để đạt độ chuẩn hóa xác suất cao nhất.
- **Số lượng câu hỏi tối đa trong một Request**: Lên tới hàng chục câu hỏi (khuyến nghị $\le 30$ câu hỏi cho một lượt đánh giá để giữ độ trễ thấp).

---

## 3. Các Góc Cạnh Chưa Hoàn Hảo Của Jev 1.13 (Known Jagged Edges)

Tài liệu chính thức từ TypeSafe AI ghi nhận một số hành vi cần lưu ý khi thiết kế câu hỏi cho `jev-1.13`:

### A. Câu Hỏi Phủ Định Kép (Double Negatives)
- ⚠️ **Hiện tượng**: Khi câu hỏi `Noul` hoặc tiêu chí `Choice` sử dụng phủ định kép (ví dụ: *"Văn bản này không chứa nội dung nào không phải là tiếng Anh"*), mô hình có thể bị giảm độ chuẩn xác.
- ✅ **Khắc phục**: Luôn viết câu hỏi ở thể khẳng định trực tiếp: *"Văn bản này được viết hoàn toàn bằng tiếng Anh"*.

### B. Thang Điểm `Score` Quá Dày (Over-Granular Levels)
- ⚠️ **Hiện tượng**: Đưa vào 10 hoặc 20 bậc cho câu hỏi `Score` (ví dụ từ 1 đến 10) thường khiến xác suất bị dàn trải đều (high entropy), làm giảm độ phân định rõ rệt.
- ✅ **Khắc phục**: Giữ thang `Score` từ **3 đến 5 mức mô tả rõ ràng** (ví dụ: `Thấp`, `Trung bình`, `Cao`, hoặc `0: Không`, `1: Nhẹ`, `2: Nghiêm trọng`). Jev sẽ nội suy ra điểm số thực liên tục (ví dụ: $1.42$) cực kỳ chính xác!

### C. Dữ Liệu Bảng (Tables) Thiếu Tiêu Đề
- ⚠️ **Hiện tượng**: Đưa vào văn bản dạng CSV hoặc bảng không có tiêu đề cột rõ ràng khiến mô hình mất nhiều token để suy đoán ý nghĩa từng cột.
- ✅ **Khắc phục**: Chuyển đổi bảng thành danh sách JSON objects hoặc Markdown Table có dòng Header chuẩn.

### D. Tiêu Chí Choice Bị Chồng Lấn (Overlapping Options)
- ⚠️ **Hiện tượng**: Các options trong `Choice` có ranh giới ngữ nghĩa quá mờ nhạt (ví dụ: Option A: "Lỗi thanh toán", Option B: "Lỗi ngân hàng").
- ✅ **Khắc phục**: Làm rõ ranh giới: Option A: "Lỗi do cổng thanh toán Stripe / thẻ tín dụng", Option B: "Chuyển khoản trực tiếp qua tài khoản ngân hàng".
