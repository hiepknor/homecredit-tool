# Home Credit Installment Calculator

Tiện ích mở rộng (Manifest V3) giúp bạn tư vấn khoản vay Home Credit chỉ trong vài giây. Popup mới có giao diện dashboard: gợi ý nhanh theo gói phổ biến, form nhập linh hoạt (chuyển đổi trả trước VND/%), bảng tổng quan và lịch góp 12 kỳ đầu.

## Tính năng nổi bật
- **Preset 1 chạm**: bốn gói mẫu (6tr/6T, 10tr/9T, 15tr/12T, 20tr/12T) tự động điền giá, trả trước, lãi, phí và kiểu tính.
- **Form chuyên nghiệp**: trường giá và phí hỗ trợ định dạng có phân cách hàng nghìn; trả trước có thể nhập theo VND hoặc %. Mọi dữ liệu được lưu lại trong `chrome.storage.sync`.
- **Tổng quan tức thì**: hiển thị khoản giải ngân, góp mỗi tháng, tổng lãi, tổng phải trả cùng một lời giải thích nhanh về tỷ lệ trả trước, tỷ trọng lãi và tổng chi.
- **Lịch góp 12 kỳ đầu**: luôn cập nhật theo kiểu tính đã chọn (lãi phẳng hoặc dư nợ giảm dần) và có thể xuất toàn bộ lịch ra CSV.
- **Chia sẻ nhanh**: nút “Sao chép tóm tắt” tạo đoạn text tiếng Việt đầy đủ để gửi khách qua chat/Zalo/email.

## Cài đặt tạm thời trên Chrome
1. Mở `chrome://extensions`, bật **Developer mode**.
2. Chọn **Load unpacked** và trỏ tới thư mục dự án.
3. Ghim tiện ích để truy cập từ thanh công cụ.

## Hướng dẫn sử dụng
1. Mở popup và chọn gói ở mục **Gợi ý nhanh** hoặc nhập thủ công.
2. Điều chỉnh giá, trả trước, lãi suất, kỳ hạn, phí. Có thể chuyển tab trả trước giữa **VND** và **% giá**.
3. Chọn kiểu tính (lãi phẳng / dư nợ giảm dần) để xem ngay tổng quan, insight và lịch góp 12 kỳ đầu.
4. Dùng nút **Sao chép tóm tắt** hoặc **Xuất lịch góp (.csv)** để chia sẻ cho khách hàng.

## Cấu trúc thư mục
- `manifest.json`: khai báo tiện ích (popup, background, quyền).
- `popup.html`: giao diện popup (preset, tổng quan, form, lịch góp).
- `popup.js`: logic tính toán, định dạng số, preset, copy, xuất CSV.
- `background.js`: khởi tạo state mặc định khi cài đặt.

## Quyền & lưu trữ
- Chỉ cần quyền `storage` để lưu trạng thái lần nhập gần nhất.
- Không gọi mạng ngoài, không phụ thuộc build tool – load thư mục lên Chrome là chạy.
