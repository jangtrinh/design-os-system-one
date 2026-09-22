# 02. Các Primitives Cốt Lõi (Core Primitives)

Trong Jev / TypeSafe AI, mọi tương tác với mô hình đều xoay quanh **3 kiểu câu hỏi nguyên thủy (Primitives)**. Mỗi kiểu được thiết kế để giải quyết một dạng quyết định cụ thể trong kỹ thuật phần mềm.

---

## 1. `Choice` (Lựa Chọn Trong Tập Hữu Hạn)

### Mục đích
Sử dụng khi bạn cần phân loại nội dung hoặc chọn **duy nhất 1 lựa chọn** từ một danh sách các phương án cho trước (`criteria`).

### Cấu trúc câu hỏi
```json
{
  "type": "choice",
  "instructions": "Mô tả tiêu chí lựa chọn",
  "criteria": {
    "key_1": "Mô tả chi tiết phương án 1",
    "key_2": "Mô tả chi tiết phương án 2",
    "key_3": "Mô tả chi tiết phương án 3"
  }
}
```

### Cấu trúc kết quả trả về (`ChoiceResponse`)
```json
{
  "type": "choice",
  "choice": "key_1",
  "probabilities": {
    "key_1": 0.842,
    "key_2": 0.150,
    "key_3": 0.008
  },
  "confidence": 0.912
}
```
- `choice`: Khóa (key) của phương án có xác suất cao nhất.
- `probabilities`: Bảng phân phối xác suất được chuẩn hóa (tổng bằng 1.0) cho mọi phương án.
- `confidence`: Độ tin cậy nhận thức của mô hình đối với lựa chọn này (từ $0.0$ đến $1.0$).

### Best Practices cho `Choice`
1. **Luôn có phương án thoát hiểm (Escape Hatch)**: Khi phân loại đầu vào tự do của người dùng, nên thêm một key như `other` hoặc `none_of_the_above` để mô hình không bị ép gán nhầm vào các danh mục cụ thể.
2. **Criteria rõ ràng**: Thay vì chỉ đặt key ngắn (`billing`), hãy cung cấp mô tả ngắn gọn nhưng súc tích (`"Thanh toán, hóa đơn, hoặc gói cước định kỳ"`).

---

## 2. `Score` (Đánh Giá Theo Bậc Thang Thứ Tự)

### Mục đích
Được sử dụng để đánh giá hoặc xếp hạng một khía cạnh trên **thang đo có thứ tự (ordered levels)**, từ thấp đến cao (ví dụ: mức độ phẫn nộ, mức độ uy tín, chất lượng nội dung, độ phức tạp kỹ thuật).

### Cấu trúc câu hỏi
```json
{
  "type": "score",
  "instructions": "Đánh giá mức độ phẫn nộ của khách hàng",
  "criteria": [
    "Bình tĩnh, chỉ trình bày sự việc khách quan",
    "Khó chịu nhưng vẫn giữ lịch sự",
    "Rất tức giận, dùng từ ngữ công kích, đe dọa rời bỏ dịch vụ"
  ]
}
```
*Lưu ý: `criteria` là một mảng (Array). Chỉ số index `0`, `1`, `2` tương ứng với các bậc điểm từ thấp đến cao.*

### Cấu trúc kết quả trả về (`ScoreResponse`)
```json
{
  "type": "score",
  "score": 1.74,
  "legend": {
    "0": "Bình tĩnh, chỉ trình bày sự việc khách quan",
    "1": "Khó chịu nhưng vẫn giữ lịch sự",
    "2": "Rất tức giận, dùng từ ngữ công kích, đe dọa rời bỏ dịch vụ"
  },
  "confidence": 0.885
}
```
- `score`: Điểm số dạng số thực liên tục (continuous float), ví dụ $1.74$ nằm giữa mức 1 và mức 2. Điểm này được tính toán kỳ vọng toán học dựa trên phân phối xác suất qua các bậc!
- `confidence`: Mức độ chắc chắn của mô hình về điểm số đã cho.

### Ưu điểm vượt trội của `Score`
Khác với việc yêu cầu LLM "hãy chấm điểm từ 1 đến 10" (thường sinh số ngẫu nhiên hoặc thiên lệch về 7-8), `Score` của Jev dựa trên mô tả các mốc cụ thể và tính toán kỳ vọng toán học chính xác từ xác suất qua từng mốc.

---

## 3. `Noul` (Đánh Giá Nhị Phân / Xác Suất Yes-No)

### Mục đích
`Noul` (tên gọi bắt nguồn từ Boolean/Null-One) kiểm tra xem **một tiêu chí hoặc mệnh đề cụ thể có đúng hay không**. Kết quả trả về là xác suất chuẩn hóa $P(\text{Yes})$.

### Cấu trúc câu hỏi
```json
{
  "type": "noul",
  "instructions": "Văn bản này có chứa yêu cầu khẩn cấp không?"
}
```

### Cấu trúc kết quả trả về (`NoulResponse`)
```json
{
  "type": "noul",
  "noul": 0.965,
  "confidence": 0.94
}
```
- `noul`: Xác suất từ $0.0$ đến $1.0$ rằng câu trả lời là **YES** (Thỏa mãn tiêu chí).
- `confidence`: Mức độ tự tin của mô hình vào việc đưa ra xác suất này.

### Khi nào dùng `Noul` thay vì `Choice`?
- Dùng `Noul` khi câu hỏi mang tính độc lập: "Có chứa thông tin nhạy cảm không?", "Có cần phê duyệt bởi quản lý không?".
- Nếu bạn có 5 tiêu chí độc lập nhau (ví dụ một email có thể vừa "khẩn cấp", vừa "có lỗi kỹ thuật", vừa "chứa link lạ"), hãy dùng 5 câu hỏi `Noul` thay vì 1 câu `Choice`!

---

## 4. Cơ Chế Batching: Hỏi Nhiều Câu Trong 1 Lần Gọi

Điểm mạnh độc nhất của Jev là bạn có thể gửi kèm **hàng chục câu hỏi khác nhau** (hỗn hợp Choice, Score, Noul) trong cùng một request với cùng một `state`.

```json
{
  "state": "Tôi mua gói Pro ngày hôm qua nhưng tài khoản vẫn báo là Free. Yêu cầu hoàn tiền ngay lập tức nếu không kích hoạt trong 1 giờ tới!",
  "model": "jev-latest",
  "questions": {
    "intent": {
      "type": "choice",
      "instructions": "Phân loại mục đích của ticket",
      "criteria": {
        "upgrade_issue": "Lỗi nâng cấp gói dịch vụ",
        "refund_request": "Yêu cầu hoàn tiền",
        "feature_inquiry": "Hỏi thông tin tính năng"
      }
    },
    "customer_sentiment": {
      "type": "score",
      "instructions": "Tâm trạng khách hàng",
      "criteria": [
        "Tích cực hoặc bình thường",
        "Thất vọng nhẹ",
        "Cực kỳ gay gắt và đe dọa"
      ]
    },
    "churn_risk": {
      "type": "noul",
      "instructions": "Khách hàng có nguy cơ rời bỏ dịch vụ hoặc hủy thanh toán không?"
    },
    "urgent_sla": {
      "type": "noul",
      "instructions": "Nội dung có đặt thời hạn xử lý ngắn hoặc khẩn cấp không?"
    }
  }
}
```

### Lợi ích của Batching
1. **Chỉ truyền State một lần**: Giảm tải băng thông và chi phí token đầu vào.
2. **Độ trễ tương đương 1 câu hỏi**: Jev xử lý song song các câu hỏi trên biểu diễn ngữ nghĩa của `state`.
3. **Tiết kiệm tới 90% chi phí**: Thay vì phải gọi 4 lần LLM hoặc viết 4 prompt riêng biệt.
