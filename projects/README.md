# JEV Sub-Projects Directory

Thư mục này dùng để chứa các dự án phần mềm, PoC (Proof of Concept), microservices hoặc công cụ ứng dụng **JEV API**.

---

## 📁 Cấu Trúc Đề Xuất Cho Một Dự Án Con

Mỗi dự án con nên nằm trong một thư mục riêng biệt với cấu trúc chuẩn:

```text
projects/
├── jev-browser-cli/               # Universal Browser Automation CLI (CDP 9222 + JEV System One, Social Posting, Threads Viral Research)
├── voice-browser-agent/           # Real-time Voice Web Browser Agent (Web Speech API + Playwright)
├── <new-project>/                 # Sẵn sàng cho dự án JEV tiếp theo
```

---

## 🔑 Biến Môi Trường (Environment Variables)

Mọi dự án con cần sử dụng biến môi trường:
```bash
TYPESAFE_API_KEY="ts_live_..."
```

---

## 📚 Tra Cứu Tài Liệu Nhanh

Khi xây dựng các dự án con, luôn tham khảo kho tri thức tại thư mục cha:
- Xem các mẫu thiết kế: `../../docs/08-architectural-patterns.md`
- Xem code mẫu thực chiến: `../../docs/09-cookbooks-and-recipes.md`
- Xem chi tiết SDK: `../../docs/06-python-sdk.md` (Python) hoặc `../../docs/07-javascript-sdk.md` (Node/TypeScript)
