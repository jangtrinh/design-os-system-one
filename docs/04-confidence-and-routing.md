# 04. Confidence & Định Tuyến Tin Cậy (Confidence & Routing)

Một trong những tính năng đột phá nhất của Jev là khả năng cung cấp đồng thời hai chỉ số toán học độc lập: **Xác suất (Probability)** và **Độ tin cậy nhận thức (Confidence)**.

---

## 1. Phân Biệt: Probability vs Confidence

Hầu hết các kỹ sư nhầm lẫn giữa Probability và Confidence. Hãy xem bảng so sánh:

| Khái Niệm | Trả Lời Cho Câu Hỏi Nào? | Ví Dụ Đời Thực |
| :--- | :--- | :--- |
| **Probability (Xác Suất)** | *Khả năng sự kiện này xảy ra là bao nhiêu phần trăm?* | "Đồng xu này tung lên có 50% ra mặt Ngửa." |
| **Confidence (Độ Tin Cậy)** | *Dữ liệu hiện tại có đủ đầy đủ và rõ ràng để ta chắc chắn về nhận định đó hay không?* | "Tôi đã kiểm tra đồng xu rất kỹ, không méo mó, tôi chắc chắn 99% rằng xác suất là 50/50." |

### Ma trận 4 góc phần tư quyết định (Decision Matrix)

```
                       Độ Tin Cậy (Confidence) Cao
                                    ▲
                                    │
           [GÓC 2: RÕ RÀNG KHÔNG]  │   [GÓC 1: TỰ ĐỘNG HÓA HOÀN TOÀN]
          P(Spam) = 0.05, Conf = 0.95│  P(Spam) = 0.98, Conf = 0.97
          => Cho qua thẳng an toàn   │  => Chặn ngay lập tức, không cần hỏi
                                    │
    ────────────────────────────────┼────────────────────────────────► Xác Suất (Probability)
                                    │
           [GÓC 3: MƠ HỒ, THIẾU INFO]│   [GÓC 4: RỦI RO CAO / NỬA VỜI]
          P(Spam) = 0.20, Conf = 0.35│  P(Spam) = 0.85, Conf = 0.40
          => Tin nhắn quá ngắn/kỳ lạ  │  => Cần người duyệt (Human Review)
                                    │
                                    ▼
                       Độ Tin Cậy (Confidence) Thấp
```

### Trường hợp kinh điển: Dữ liệu thiếu / Mơ hồ
- Giả sử khách hàng chỉ gửi đúng một từ: `"help"`.
- Một câu hỏi `Noul` hỏi: *"Khách hàng có muốn thanh toán hóa đơn không?"*
- Mô hình có thể đưa ra $P(\text{Yes}) = 0.30$, nhưng `confidence` sẽ rất thấp (ví dụ: $0.20$), vì chỉ với một từ `"help"` thì không có đủ ngữ cảnh để khẳng định.
- Nếu không có `confidence`, hệ thống tự động sẽ coi $0.30 < 0.5$ và bỏ qua. Nhưng nhờ có `confidence = 0.20`, code của bạn có thể phát hiện sự mơ hồ và hỏi lại người dùng: *"Bạn cần hỗ trợ về chủ đề gì?"*.

---

## 2. Mô Hình Kiến Trúc: Confidence-Gated Routing

Trong kiến trúc này, **Câu trả lời (`choice`/`score`/`noul`) cho bạn biết NÊN LÀM GÌ, còn `confidence` quyết định CÓ ĐƯỢC TỰ ĐỘNG LÀM HAY KHÔNG**.

```python
# Ví dụ triển khai Confidence-Gated Routing trong Python
response = client.system_one(
    state=customer_ticket,
    questions={
        "action": Choice(
            instructions="Chọn hành động xử lý ticket",
            criteria={
                "auto_refund": "Hoàn tiền tự động cho lỗi phát sinh dưới $50",
                "escalate_tier2": "Chuyển lên kỹ thuật viên cấp 2",
                "send_faq": "Gửi tài liệu hướng dẫn thường gặp"
            }
        )
    }
)

answer = response.answers["action"]
selected_action = answer.choice
confidence = answer.confidence

CONFIDENCE_THRESHOLD = 0.80

if confidence >= CONFIDENCE_THRESHOLD:
    # Đạt ngưỡng tự tin: Thực thi tự động
    execute_action(selected_action)
else:
    # Dưới ngưỡng: Chuyển sang hàng đợi nhân viên hỗ trợ (Human-in-the-loop)
    route_to_human_agent(
        ticket=customer_ticket,
        suggested_action=selected_action,
        model_confidence=confidence,
        probabilities=answer.probabilities
    )
```

---

## 3. Kỹ Thuật Self-Consistency (Tự Kiểm Tra Nhất Quán)

Khi làm việc với các quyết định mang tính pháp lý, tài chính hoặc kiểm duyệt nội dung (Trust & Safety), bạn có thể kết hợp:
1. Đặt câu hỏi thuận: *"Nội dung này có vi phạm chính sách bạo lực không?"*
2. Đặt câu hỏi nghịch: *"Nội dung này có hoàn toàn an toàn và tuân thủ cộng đồng không?"*
3. Đánh giá độ nhất quán: Nếu câu thuận trả về $P = 0.90$ mà câu nghịch trả về $P = 0.80$ (tổng xác suất phi lý), điều đó phản ánh văn bản có tính châm biếm, hai nghĩa hoặc mâu thuẫn nội tại $\rightarrow$ kích hoạt cờ cảnh báo để xem xét kỹ lưỡng.
