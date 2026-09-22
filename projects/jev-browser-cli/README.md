# JEV Browser CLI (`jev-browser`)

> **Universal Browser Automation CLI for AI Agents** — Powered by TypeSafe JEV System One & Chrome DevTools Protocol (CDP).

`jev-browser` là công cụ dòng lệnh (CLI) cho phép các AI Agent (như **Antigravity**) hoặc lập trình viên điều khiển, tương tác và tự động hóa bất kỳ trình duyệt Chromium nào (**Google Chrome, Arc, Dia, Edge, Brave**) một cách mượt mà và trực tiếp trên session thật của người dùng.

---

## 🌟 Tính Năng Nổi Bật

1. **Hoạt Động Với Mọi Trình Duyệt Thật (Không Bắt Buộc Chromium Test)**:
   - Kết nối trực tiếp vào trình duyệt bạn đang dùng hàng ngày (**Google Chrome, Arc, Dia, Edge**) qua cổng CDP (`localhost:9222`).
   - Giữ nguyên cookie, phiên đăng nhập, mật khẩu, tiện ích mở rộng (extension).
2. **Tích Hợp Sâu JEV System One (`jev-latest`)**:
   - Lệnh `jev-browser do "<câu lệnh>"`: Tự động trích xuất DOM tương tác của trang web, gửi qua Jev System One để phân loại ý định (navigate, click, type, scroll, extract) và tìm phần tử mục tiêu chính xác trong chưa đầy 1 giây.
3. **Thân Thiện Với AI Agent (Antigravity Companion)**:
   - Cờ `--json`: Xuất dữ liệu dạng JSON có cấu trúc rõ ràng cho mọi lệnh.
   - Lệnh `jev-browser snapshot`: Nén toàn bộ cây tương tác của trang thành danh sách ID synthetic (`#1`, `#2`, `#3`...) siêu tiết kiệm context token (<300 tokens).
   - Lệnh `jev-browser eval "<js>"`: Chạy trực tiếp mã JavaScript mà không cần hỏi quyền.
4. **Cài Đặt Toàn Cục**:
   - Đã được symlink vào `/Users/jangtrinh/.local/bin/jev-browser` (nằm trong `$PATH`), có thể chạy ở bất kỳ terminal hoặc tool call nào.

---

## 🚀 Cài Đặt & Khởi Động

### 1. Khởi động trình duyệt với CDP
```bash
# Mở Google Chrome
jev-browser launch chrome

# Hoặc mở Arc
jev-browser launch arc

# Hoặc mở Dia
jev-browser launch dia
```

### 2. Kiểm tra kết nối
```bash
jev-browser status
# Hoặc xuất JSON:
jev-browser status --json
```

---

## 📖 Bảng Lệnh Đầy Đủ

| Lệnh | Mô Tả | Ví Dụ |
|---|---|---|
| `launch [browser]` | Mở trình duyệt thật với cổng CDP 9222 | `jev-browser launch chrome` |
| `status` | Kiểm tra URL tab hiện tại, tiêu đề, số tab | `jev-browser status` |
| `tabs` | Liệt kê danh sách tất cả các tab đang mở | `jev-browser tabs` |
| `switch <query>` | Chuyển sang tab theo index, title hoặc URL | `jev-browser switch "Threads"` |
| `scan` | Quét kiến trúc trang web qua JEV System One Fan-Out | `jev-browser scan` |
| `do "<instruction>"` | AI hiểu câu lệnh tự nhiên và tự động thực thi | `jev-browser do "click vào bài viết Typesafe computer use"` |
| `ultrafast "<goal>"` / `uf` | ⚡ Vòng lặp Agent tự động siêu tốc (Browser-Use parity) | `jev-browser uf "Find flights from Zurich to London"` |
| `ultrafast-eval "<goal>"` / `ufe` | 🔍 Kiểm tra Indexed Action Space & xác suất System One | `jev-browser ufe "Search AI"` |
| `snapshot` | Xuất cây DOM tương tác dạng nén cho AI | `jev-browser snapshot` |
| `nav <url>` | Mở địa chỉ trang web | `jev-browser nav https://github.com` |
| `click <target>` | Click theo synthetic ID `#ID`, text, hoặc selector | `jev-browser click "#7"` hoặc `jev-browser click "Sign in"` |
| `type <text>` | Gõ văn bản vào ô input | `jev-browser type "Antigravity AI Agent"` |
| `key <keyName>` | Gửi phím bàn phím (Enter, Escape, Tab...) | `jev-browser key Enter` |
| `scroll <dir>` | Cuộn trang (`down`, `up`, `top`, `bottom`) | `jev-browser scroll down` |
| `back` | Quay lại trang trước | `jev-browser back` |
| `reload` | Tải lại trang | `jev-browser reload` |
| `eval "<script>"` | Thực thi mã JavaScript trên trang | `jev-browser eval "document.title"` |
| `screenshot [path]` | Chụp ảnh màn hình tab hiện tại | `jev-browser screenshot ./page.png` |
| `post <content>` | Đăng bài tự động lên MXH (Facebook, Threads, LinkedIn) | `jev-browser post "Hello" --platform facebook --privacy only_me` |
| `research threads [tag]` | Nghiên cứu bài viết viral & chiến lược đăng bài Threads | `jev-browser research threads aithreads` |

---

## ⚡ Jev Ultrafast Autonomous Agent (`browser-use/jev-ultrafast` Parity)

Vòng lặp tự động điều khiển trình duyệt siêu tốc áp dụng kiến trúc mới nhất từ **Browser Use × TypeSafe**:

1. **Indexed Action Space**: Mọi quan sát đánh số các phần tử tương tác `[1]`, `[2]`, `[3]`...
2. **Speculative Fan-Out (1 Network Round Trip)**: Phán đoán phép toán (`CLICK`, `TYPE_TEXT`, `SELECT`) và mục tiêu tương ứng đồng thời trong một truy vấn duy nhất.
3. **Dedicated Text Helper**: Chỉ khi chọn `TYPE_TEXT`, một mô hình ngôn ngữ nhẹ mới sinh văn bản chính xác từ mục tiêu và ngữ cảnh trường.
4. **Freshness Guards & Occlusion Checks**: Kiểm tra `page_key`, `guards` và `document.elementFromPoint` trước khi click để loại bỏ click trượt hoặc click vào modal bị che.

```bash
# 1. Chạy tự động hoàn thành mục tiêu
jev-browser ultrafast "Tìm chuyến bay từ Zurich đến London vào ngày mai"

# Hoặc dùng alias ngắn gọn:
jev-browser uf "Tìm kiếm bài viết về TypeSafe trên Hacker News" --max-steps 5

# 2. Kiểm tra xác suất quyết định & Action Space trong <200ms không thực thi:
jev-browser ultrafast-eval "Nhập email và đăng nhập"
```

---

## 🧵 Nghiên Cứu & Tối Ưu Bài Đăng Threads (Viral Research)

`jev-browser research threads` quét và phân tích dữ liệu thịnh hành từ các cộng đồng Threads lớn (**AI Threads**, **Design Threads**, **3D Printing**...) bằng **TypeSafe JEV System One** và phân loại theo **5 Hình Mẫu Viral (Viral Archetypes)**:

```bash
# 1. Nghiên cứu cộng đồng AI Threads (1.3M thành viên)
jev-browser research threads aithreads --limit 10

# 2. Nghiên cứu cộng đồng Design Threads (141K thành viên)
jev-browser research threads designthreads --limit 10

# 3. Xuất dữ liệu JSON có cấu trúc cho AI Agent (Antigravity)
jev-browser research threads aithreads --json
```

Xem hướng dẫn chi tiết tại: [Tài Liệu Threads Viral Workflow](./docs/workflows/threads-viral-workflow.md) và [Agent Skill](../../.agent/skills/threads-viral-strategy/SKILL.md).

---

## 📱 Tự Động Hóa Mạng Xã Hội (Social Media Posting)

`jev-browser` hỗ trợ đăng bài tự động trên **Facebook, Threads, và LinkedIn** với cơ chế bảo vệ quyền riêng tư tuyệt đối (**Zero Public Leak Guard**):

### 1. Facebook Post (Hỗ trợ "Chỉ mình tôi" - Only Me 🔒)
```bash
# Đăng thật với quyền riêng tư Chỉ mình tôi (bảo vệ tuyệt đối khi test):
jev-browser -T facebook post "Kiểm tra tính năng đăng tự động với JEV System One" --privacy only_me

# Hoặc chế độ Dry-run (chỉ soạn thảo, không bấm Đăng):
jev-browser -T facebook post "Bản nháp thử nghiệm" --dry-run
```

### 2. LinkedIn Post (Connections Only / Dry-Run)
```bash
# Soạn bài trên LinkedIn với quyền xem "Connections only" và Dry-run:
jev-browser -T linkedin post "Cập nhật công nghệ AI Automation" --dry-run --privacy connections
```

### 3. Threads Post (Draft / Dry-Run)
```bash
# Soạn bài trên Threads và giữ lại dạng nháp an toàn:
jev-browser -T threads post "Thử nghiệm Threads automation" --dry-run --privacy draft
```

---

## 🤖 Hướng Dẫn Dành Cho AI Agent (Antigravity)

Khi AI Agent cần tự động hóa một tác vụ trên trình duyệt:

### Kịch bản 1: Quét kiến trúc trang trước khi thao tác
```bash
# AI Agent gọi scan để nắm danh sách zones, anchors và playbook điều khiển
jev-browser -T zalo scan --json
```

### Kịch bản 2: Nhắn tin hoặc tương tác tự động
```bash
# 1. Tìm kiếm và bấm chọn người nhận
jev-browser type "My Wife"
jev-browser key Enter

# 2. Soạn nội dung và gửi tin nhắn
jev-browser type "Hello pạn"
jev-browser key Enter
```

### Kịch bản 3: Tự động hoàn toàn bằng Jev AI
```bash
jev-browser do "mở youtube và tìm kiếm lofi hip hop"
```
