# Home Credit Installment Calculator

Tiện ích mở rộng (Manifest V3) giúp bạn tính nhanh khoản vay trả góp Home Credit với hai phương pháp phổ biến: lãi phẳng và dư nợ giảm dần. Nhập giá sản phẩm, trả trước, lãi suất, phí hồ sơ/bảo hiểm và kỳ hạn để xem ngay khoản vay, số tiền góp mỗi tháng, tổng lãi và lịch trả góp 12 kỳ đầu.

## Tính năng chính
- Nhập đủ thông số vay: giá sản phẩm, trả trước (%), lãi suất/tháng, kỳ hạn, phí hồ sơ/bảo hiểm.
- Chọn phương pháp tính: lãi phẳng (gốc đều, lãi cố định) hoặc dư nợ giảm dần (tổng góp cố định, lãi giảm).
- Hiển thị khoản vay, góp mỗi tháng, tổng lãi, tổng phải trả và bảng lịch góp rút gọn.
- Lưu lại dữ liệu nhập gần nhất trong `chrome.storage.sync`.

## Cài đặt tạm thời trên Chrome
1) Mở `chrome://extensions` và bật **Developer mode**.  
2) Nhấn **Load unpacked** và chọn thư mục dự án này.  
3) Ghim tiện ích để truy cập nhanh từ toolbar.

## Cách dùng
1) Mở popup của tiện ích.  
2) Nhập các trường bắt buộc.  
3) Chọn kiểu tính và xem kết quả ngay: khoản vay, góp tháng, tổng lãi/tổng trả.  
4) Xem bảng lịch góp tối đa 12 kỳ đầu (kỳ dài hơn vẫn được tính).

## Cấu trúc chính
- `manifest.json`: khai báo tiện ích (icons, popup, background).  
- `popup.html`: giao diện popup.  
- `popup.js`: logic tính toán và lưu state.  
- `background.js`: service worker trống (đặt chỗ cho mở rộng sau).  
- `Home-Credit-Logo.jpg`: dùng làm icon tiện ích.

## Quyền và lưu trữ
- Chỉ dùng quyền `storage` để lưu state người dùng.  
- Không gọi mạng ngoài, không cần build tool; load trực tiếp thư mục là chạy.
