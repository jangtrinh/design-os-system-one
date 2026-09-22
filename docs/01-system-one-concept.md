# 01. Triết Lý Mô Hình System One (System One Concept)

## 1. Khái Niệm System One vs System Two

Khái niệm "System 1" và "System 2" xuất phát từ lý thuyết nhận thức của Daniel Kahneman (*Thinking, Fast and Slow*):
- **System 1 (Hệ Thống 1)**: Nhanh, tự động, tiềm thức, trực giác nhận diện mẫu (pattern recognition), tốn ít năng lượng. Ví dụ: nhận ra một khuôn mặt quen thuộc, đọc một biển báo trên đường, cảm nhận tông giọng giận dữ.
- **System 2 (Hệ Thống 2)**: Chậm, tuần tự, suy luận logic có ý thức, tốn nhiều năng lượng tính toán. Ví dụ: giải bài toán $17 \times 24$, viết luận điểm triết học, lập kế hoạch dự án.

```mermaid
graph TD
    subgraph "Hệ Thống AI Truyền Thống (System Two)"
        LLM[Large Language Models: GPT-4, Claude, Gemini] -->|Sinh chuỗi tokens| TextOut[Văn bản tự do / Giải thích dài dòng]
        TextOut -->|Regex / JSON Parser| CodeParser[Cần tầng phân tích cú pháp]
        CodeParser -->|Dễ lỗi schema / Hallucination| Logic[Phần mềm rẽ nhánh]
    end

    subgraph "Hệ Thống TypeSafe AI (System One)"
        State[Trạng thái ứng dụng: State] --> JEV[Jev Model: System One]
        Questions[Câu hỏi định kiểu: Choice / Score / Noul] --> JEV
        JEV -->|Trả thẳng typed data + probabilities| DirectCode[Code trực tiếp if/else mà không cần parse]
    end
```

### Tại sao phần mềm hiện đại cần System One?
Hầu hết các tác vụ trong ứng dụng không cần một mô hình ngôn ngữ khổng lồ ngồi "viết văn". Chúng chỉ cần một quyết định dứt khoát:
- "Email này thuộc phòng ban nào?" (Support, Billing, Sales)
- "Nội dung này có chứa dấu hiệu lừa đảo không?" (Yes / No)
- "Mức độ phẫn nộ của khách hàng là bao nhiêu trên thang 1-5?"
- "Câu trích dẫn này có đúng với văn bản gốc không?"

Nếu dùng LLM thông thường cho các tác vụ này:
1. **Độ trễ cao**: Phải chờ mô hình sinh hàng chục đến hàng trăm token (tốn từ 1 đến 5 giây).
2. **Chi phí đắt đỏ**: Trả tiền cho việc sinh các từ nối và giải thích không cần thiết.
3. **Kém tin cậy**: LLM có thể trả về JSON sai cú pháp, thêm lời xin lỗi, hoặc bị hallucinate.
4. **Không có xác suất chuẩn hóa (Uncalibrated)**: Khi LLM trả lời "Có", bạn không biết chắc nó chắc chắn 99% hay chỉ đoán mò 51%.

---

## 2. Jev — Mô Hình System One Đầu Tiên

**Jev** là mô hình nền tảng đầu tiên được TypeSafe AI huấn luyện chuyên biệt theo trường phái System One:
- **Không sinh văn bản tự do**: Jev không sinh chữ nối chữ. Jev đọc trạng thái và đánh giá trực tiếp trên các câu hỏi được định kiểu.
- **Đầu ra có cấu trúc (Strictly Structured)**: Kết quả trả về map trực tiếp với các kiểu dữ liệu của ngôn ngữ lập trình (TypeScript Types / Python Pydantic models).
- **Xác suất chuẩn hóa (Calibrated Probabilities)**: Nếu Jev trả về xác suất $0.85$ cho một nhãn, điều đó có nghĩa trong 100 lần Jev dự đoán $0.85$, đúng $85$ lần trường hợp đó là chính xác.
- **Độ tin cậy nhận thức (Confidence Score)**: Jev cung cấp một trục độc lập: không chỉ mức độ thiên lệch (`probability`), mà còn mức độ tự tin vào dữ liệu hiện có (`confidence`).

---

## 3. Triết Lý "Code In Control" (Code Làm Chủ)

Một sai lầm phổ biến khi tích hợp AI vào phần mềm là trao toàn bộ quyền kiểm soát luồng (control flow) cho AI Agent. Điều này dẫn đến sự mất kiểm soát, chi phí không đoán trước, và lỗi logic khó debug.

Với Jev, quy tắc thiết kế bất biến là: **Code luôn nắm quyền điều khiển**.

| Thành Phần | Trách Nhiệm Của Code | Trách Nhiệm Của Jev |
| :--- | :--- | :--- |
| **Logic nghiệp vụ** | Nắm giữ 100% logic kinh doanh, tính toán số học, điều kiện rẽ nhánh | Cung cấp nhận định ngữ nghĩa tại các điểm phân nhánh |
| **Dữ liệu & State** | Truy vấn DB, xác thực schema, lọc dữ liệu sạch | Đọc và thấu hiểu ngữ cảnh tự nhiên trong dữ liệu |
| **Hành động (Side-effects)** | Gửi email, ghi log, kích hoạt transaction, gọi API thanh toán | **Không bao giờ** tự ý thực hiện hành động |
| **Xử lý rủi ro** | Đặt ngưỡng tin cậy (threshold), chuyển con người review | Báo cáo chính xác độ tin cậy và xác suất |

---

## 4. So Sánh Hiệu Năng & Chi Phí (Benchmarks Thực Tế)

Theo kiểm thử chính thức từ TypeSafe AI (được chứng minh qua các Cookbook như *Parallel Questions*):
- **Tốc độ**: Batching các câu hỏi trên Jev nhanh hơn **10.0x** so với gọi LLM tương đương.
- **Chi phí**: Rẻ hơn **12.2x** cho cùng một bộ câu hỏi đánh giá ngữ nghĩa.
- **Tính nhất quán (Deterministic Structure)**: Cấu trúc JSON trả về luôn tuân thủ 100% hợp đồng API, triệt tiêu hoàn toàn rủi ro lỗi cú pháp (JSON parse error).
