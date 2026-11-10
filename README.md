# Lịch giảng dạy · Khoa Hoá học HCMUS

Ứng dụng web xem thời khoá biểu giảng dạy, lịch cá nhân, lịch lớp sinh viên và lịch phòng thí nghiệm
của Khoa Hoá học – Trường ĐH Khoa học Tự nhiên, ĐHQG-HCM. Dữ liệu đọc trực tiếp từ Google Sheet của Văn phòng Khoa.

## Cập nhật dữ liệu
Chỉ cần sửa Google Sheet. Trang web tự tải dữ liệu mới mỗi lần mở (hoặc bấm nút **Cập nhật**).
Bảng tính phải được chia sẻ ở chế độ *Bất kỳ ai có đường liên kết đều có thể xem*.

## Đăng trang lên GitHub Pages
1. Tạo repo mới, đưa toàn bộ thư mục này lên (trừ `node_modules`, `dist`, `_ban_goc_truoc_khi_nang_cap`).
2. Vào **Settings → Pages → Build and deployment → Source**, chọn **GitHub Actions**.
3. Đợi 1–2 phút ở tab **Actions**; trang sẽ có địa chỉ `https://<tên-tài-khoản>.github.io/<tên-repo>/`.

Mỗi lần đưa code mới lên nhánh `main`, trang sẽ tự build lại.

## Chạy thử trên máy
Cần Node.js 20 trở lên.
```
npm install
npm run dev
```
