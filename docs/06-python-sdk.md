# 06. Hướng Dẫn Python SDK (`typesafe-sdk`)

SDK chính thức của TypeSafe AI dành cho hệ sinh thái Python (hỗ trợ Python >= 3.10).

---

## 1. Cài Đặt (Installation)

```bash
# Sử dụng pip
pip install typesafe-sdk

# Hoặc sử dụng uv (khuyên dùng)
uv add typesafe-sdk
```

---

## 2. Cấu Hình Khóa API

SDK tự động đọc biến môi trường `TYPESAFE_API_KEY`:

```bash
export TYPESAFE_API_KEY="ts_live_your_api_key_here"
```

Hoặc truyền trực tiếp vào client:

```python
from typesafe_sdk import TypeSafeClient

client = TypeSafeClient(api_key="ts_live_your_api_key_here")
```

---

## 3. Đồng Bộ (Synchronous Client)

```python
import os
from typesafe_sdk import TypeSafeClient, Choice, Score, Noul

client = TypeSafeClient()

customer_feedback = """
Ứng dụng tải quá chậm khi mở danh mục sản phẩm lớn, thỉnh thoảng còn bị crash văng ra màn hình chính. 
Tôi dùng iPhone 14 Pro, iOS 17.5.
"""

response = client.system_one(
    state=customer_feedback,
    model="jev-latest", # Tùy chọn, mặc định là jev-latest
    questions={
        "category": Choice(
            instructions="Phân loại vấn đề kỹ thuật",
            criteria={
                "perf_issue": "Hiệu năng, tốc độ tải chậm, lag",
                "crash_bug": "Sập ứng dụng, văng app, crash",
                "ui_ux": "Giao diện khó dùng, lỗi hiển thị"
            }
        ),
        "severity": Score(
            instructions="Mức độ nghiêm trọng của lỗi ảnh hưởng tới người dùng",
            criteria=[
                "Khó chịu nhỏ, vẫn dùng được",
                "Gây gián đoạn trải nghiệm đáng kể",
                "Không thể sử dụng được dịch vụ, chặn người dùng hoàn toàn"
            ]
        ),
        "has_device_info": Noul(
            instructions="Người dùng có cung cấp thông tin thiết bị / phiên bản OS cụ thể không?"
        )
    }
)

# Truy xuất kết quả
category = response.answers["category"]
print(f"Lựa chọn chính: {category.choice}")
print(f"Xác suất từng mục: {category.probabilities}")
print(f"Độ tin cậy: {category.confidence}")

severity = response.answers["severity"]
print(f"Điểm nghiêm trọng (0-2): {severity.score:.2f}")

device_info = response.answers["has_device_info"]
print(f"Có thông tin thiết bị: {device_info.noul >= 0.8} (P = {device_info.noul})")
```

---

## 4. Bất Đồng Bộ (Asynchronous Client: `AsyncTypeSafeClient`)

Rất hữu ích cho FastAPI, aiohttp, Celery worker hoặc khi cần bắn hàng loạt request song song:

```python
import asyncio
from typesafe_sdk import AsyncTypeSafeClient, Noul

async def check_single_passage(client: AsyncTypeSafeClient, query: str, passage: str):
    response = await client.system_one(
        state={"query": query, "passage": passage},
        questions={
            "is_relevant": Noul(
                instructions="Đoạn văn bản có trả lời trực tiếp hoặc gián tiếp cho câu hỏi không?"
            )
        }
    )
    return response.answers["is_relevant"].noul

async def main():
    async with AsyncTypeSafeClient() as client:
        passages = [
            "Đoạn văn 1...",
            "Đoạn văn 2...",
            "Đoạn văn 3..."
        ]
        tasks = [
            check_single_passage(client, "Cách hủy tài khoản", p)
            for p in passages
        ]
        results = await asyncio.gather(*tasks)
        print("Điểm liên quan của các đoạn văn:", results)

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 5. Cấu Hình Retry Policy & Timeout

Khi triển khai trên Production, luôn cấu hình Timeout và Retry Policy để chống sụt giảm kết nối mạng:

```python
from typesafe_sdk import TypeSafeClient, RetryPolicy

client = TypeSafeClient(
    timeout=15.0,  # Thời gian chờ tối đa 15 giây
    retry_policy=RetryPolicy(
        max_retries=3,          # Thử lại tối đa 3 lần
        backoff_factor=1.5,     # Hệ số tăng dần thời gian chờ (Exponential backoff)
        retry_statuses=[429, 500, 502, 503, 504] # Các mã lỗi được tự động retry
    )
)
```

---

## 6. Xử Lý Ngoại Lệ (Exception Handling)

SDK phân loại các lớp ngoại lệ rõ ràng:

```python
from typesafe_sdk.exceptions import (
    TypeSafeError,
    APIConnectionError,
    RateLimitError,
    BadRequestError,
    AuthenticationError
)

try:
    response = client.system_one(state=..., questions=...)
except AuthenticationError:
    print("Khóa API không hợp lệ. Vui lòng kiểm tra TYPESAFE_API_KEY.")
except RateLimitError as e:
    print(f"Bị giới hạn tốc độ gọi API: {e}. Cần giãn tần suất gọi.")
except APIConnectionError:
    print("Mất kết nối mạng tới https://api.typesafe.ai")
except TypeSafeError as e:
    print(f"Lỗi chung từ TypeSafe SDK: {e}")
```
