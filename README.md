# 🐕 24BP Dog Handbook System

Hệ thống sổ tay số hỗ trợ huấn luyện chó nghiệp vụ quân đội  
Capstone Project – SEP490-G52

---

## 📋 Giới thiệu

**24BP Dog Handbook System** là hệ thống hỗ trợ huấn luyện chó nghiệp vụ quân đội, cung cấp cơ sở kiến thức số hóa toàn diện về:

- Giống chó nghiệp vụ
- Giai đoạn phát triển
- Tiêu chuẩn dinh dưỡng
- Bài tập huấn luyện
- Y tế và sơ cứu cơ bản
- Scan tài liệu

Hệ thống được thiết kế theo mô hình **offline-first**, cho phép huấn luyện viên tra cứu thông tin **mọi lúc, mọi nơi**, ngay cả khi **không có kết nối Internet** – đặc biệt phù hợp trong môi trường thao trường, khu vực huấn luyện dã ngoại hoặc nhiệm vụ đặc thù của quân đội.

---

## 🛠️ Tech Stack

| Module    | Công nghệ sử dụng                     |
|-----------|---------------------------------------|
| Backend   | Java, Spring Boot, MySQL              |
| Mobile    | React Native, Expo, SQLite (Offline)  |
| Web Admin | ReactJS, Vite (SPA)                   |

> Web Admin đóng vai trò **CMS nội bộ**, không yêu cầu SEO hay Server-Side Rendering.

---

## ✨ Tính năng chính

### 📱 Mobile Application (Offline-first)
- 🔍 Tra cứu thông tin giống chó nghiệp vụ
- 📊 Theo dõi giai đoạn phát triển theo độ tuổi
- 🍖 Tra cứu khẩu phần dinh dưỡng và định lượng thức ăn
- 🎯 Xem bài tập huấn luyện với hướng dẫn chi tiết
- 🏥 Tra cứu triệu chứng sức khỏe và hướng dẫn sơ cứu
- 💊 Danh sách thuốc thiết yếu cho chó nghiệp vụ
- 📶 Hoạt động offline 100% với dữ liệu lưu trữ cục bộ
- 🔄 Đồng bộ dữ liệu khi có kết nối mạng

### 🖥️ Web Admin (CMS nội bộ)
- 📝 Quản lý nội dung cẩm nang (CRUD)
- 🐕 Quản lý giống chó, huấn luyện, dinh dưỡng, y tế
- 📂 Upload hình ảnh và tài liệu minh họa
- 🔐 Phân quyền và quản trị nội dung
- 🔗 Giao tiếp với Backend thông qua REST API

---

## 🧱 Kiến trúc tổng thể

- Mobile App và Web Admin **không truy cập trực tiếp database**
- Backend Spring Boot cung cấp **RESTful API**
- Mobile App sử dụng **SQLite** để lưu trữ dữ liệu offline
- Web Admin sử dụng **ReactJS SPA** cho quản trị nội dung

---

## 👥 Thành viên nhóm

| Họ tên            | Vai trò  | Email                         |
|-------------------|----------|-------------------------------|
| Vương Tuấn Kiên   | Leader   | kienvthe186370@fpt.edu.vn     |
| Đinh Quang Minh   | Member   | minhdqhe170267@fpt.edu.vn     |
| Đinh Hoàng Phong  | Member   | phongdhhe181925@fpt.edu.vn    |
| Nguyễn Quốc Anh   | Member   | anhnqhe181014@fpt.edu.vn      |

**Giảng viên hướng dẫn:**  
Nghiêm Thị Lan Phương

---

## 📄 License

Dự án được phát triển **cho mục đích học tập** tại **FPT University**  
Thuộc học phần **SEP490 – Capstone Project**  
Học kỳ **Spring 2026**
