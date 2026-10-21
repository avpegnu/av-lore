# AV Lore

**Hiểu bản chất. Kết nối kiến thức.**

AV Lore là website học tập và tra cứu kiến thức công nghệ: từ nền tảng lập trình, Web, Database đến vận hành và System Design. Nội dung được tổ chức thành lộ trình, Notes, câu hỏi Interview và bài thực hành tương tác, hỗ trợ tiếng Việt và English.

**[Khám phá website](https://avpegnu.github.io/av-lore/)** · **[English](https://avpegnu.github.io/av-lore/en/)**

## Tính năng

- **Lộ trình học:** 15 lộ trình với 198 chương, điều hướng theo chủ đề và chương học.
- **Notes & Interview:** 31 topic, 147 notes và 387 câu hỏi chính cùng các câu hỏi đào sâu; câu hỏi liên kết với phần kiến thức tương ứng.
- **Case Studies:** thư viện riêng với 26 bài System Design với requirements, capacity estimation, API, data model, sơ đồ luồng, failure mode và trade-off.
- **Học trực quan:** sơ đồ minh họa, tóm tắt ghi nhớ và 31 bài thử tương tác để quan sát hành vi của hệ thống.
- **Luyện tập:** lọc câu hỏi theo vai trò, xem gợi ý trả lời và đánh dấu nội dung cần ôn.
- **Tra cứu:** tìm kiếm toàn văn với chỉ mục riêng cho từng ngôn ngữ, mục lục trong bài và breadcrumb.
- **Cá nhân hóa:** năm theme sáng/tối (mặc định Tối xanh xám), bookmark, tiến độ chương và nhập/xuất dữ liệu học tập bằng JSON.
- **Hai ngôn ngữ:** chuyển Việt/English ngay tại bài đang đọc, giữ đường dẫn và vị trí mục.

Nội dung đọc được xuất sẵn thành HTML. Các lab, tìm kiếm và công cụ học tập dùng JavaScript. Dữ liệu học tập lưu trên trình duyệt; có thể xuất JSON để sao lưu hoặc chuyển sang thiết bị khác.

## Công nghệ

| Thành phần                            | Công nghệ                    |
| ------------------------------------- | ---------------------------- |
| Website tĩnh và routing               | Astro                        |
| Các công cụ tương tác                 | React, TypeScript            |
| Kiểm tra cấu trúc nội dung            | Zod                          |
| Tìm kiếm toàn văn                     | Pagefind                     |
| Kiểm tra trình duyệt và accessibility | Playwright, axe-core         |
| CI/CD và hosting                      | GitHub Actions, GitHub Pages |

## Chạy local

Yêu cầu **Node.js >= 22.22.0**; CI sử dụng Node.js 24.

```sh
git clone https://github.com/avpegnu/av-lore.git
cd av-lore
npm ci
npm run dev
```

Mở đường dẫn `/av-lore/` tại địa chỉ Astro hiển thị. Dev server phục vụ nội dung tiếng Việt; để xem đủ hai ngôn ngữ và tìm kiếm, dùng bản build:

```sh
npm run build
npm run preview -- --port 4322
```

- Tiếng Việt: <http://127.0.0.1:4322/av-lore/>
- English: <http://127.0.0.1:4322/av-lore/en/>

Nếu preview chạy dưới dạng background process, dừng bằng `npx astro preview stop`.

## Các lệnh chính

| Lệnh                             | Chức năng                                                      |
| -------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                    | Chạy môi trường phát triển                                     |
| `npm run check`                  | Kiểm tra Astro và TypeScript                                   |
| `npm test`                       | Chạy unit tests                                                |
| `npm run build`                  | Xuất website Việt/English và hai chỉ mục tìm kiếm              |
| `npm run verify`                 | Kiểm tra nội dung, liên kết, anchors và bản dịch trong `dist/` |
| `npm run preview -- --port 4322` | Xem bản build tại local                                        |
| `npm run test:browser`           | Kiểm tra tương tác, responsive, ngôn ngữ và accessibility      |
| `npm run format`                 | Định dạng mã nguồn                                             |

Browser tests mặc định dùng Google Chrome trên macOS và địa chỉ preview tại port 4322. Đặt `CHROME_PATH` hoặc `PREVIEW_URL` khi dùng môi trường khác. Báo cáo và ảnh kiểm tra nằm trong `artifacts/`.

## Cấu trúc dự án

```text
src/
  components/          Giao diện và React islands
  content/
    courses/           Nội dung chương học
    topics/            Notes và câu hỏi Interview
  i18n/                Từ điển English và các bản dịch chỉnh thủ công
  layouts/             Bố cục chung, navbar, sidebar và mục lục
  lib/                 Nội dung case study, mô phỏng và logic học tập
  pages/               Các trang và routes
  styles/              Style chung và bảng màu theme
public/
  course-labs/         Tài nguyên cho các bài thực hành
  examples/            Ví dụ và tài liệu tải về
scripts/               Công cụ build, bản dịch và kiểm tra
tests/                Unit tests
.github/workflows/     CI và deploy GitHub Pages
AGENTS.md              Quy ước làm việc dành cho AI
```

## Nội dung và bản dịch

Notes và Interview dùng chung dữ liệu trong `src/content/topics/`; các bài luyện tập đọc trực tiếp từ ngân hàng câu hỏi này. Case study nằm trong `src/lib/cases.ts`. ID nội dung cần được giữ ổn định để bookmark và tiến độ tiếp tục hoạt động.

Nội dung ưu tiên giải thích dễ hiểu bằng tiếng Việt và giữ các thuật ngữ chuyên ngành bằng English. Mỗi topic hoặc case study có nguồn kỹ thuật để đọc thêm và đối chiếu; số liệu giả định cần đi kèm bối cảnh và đơn vị.

Bản English dùng dịch máy với nhãn giao diện và thuật ngữ được chỉnh riêng; chưa được rà soát thủ công toàn bộ. Từ điển nằm trong `src/i18n/en.json`; các chỉnh sửa trong `src/i18n/en-overrides.json` được ưu tiên. Build sử dụng từ điển đã lưu, không gọi dịch vụ dịch online, và báo lỗi nếu thiếu bản dịch.

Sau khi cập nhật nội dung, kiểm tra bản dịch tương ứng rồi chạy:

```sh
npm run check
npm test
npm run build
npm run verify
```

## Deploy

Website được deploy bằng workflow [GitHub Pages](.github/workflows/pages.yml). Push lên `main` sẽ chạy kiểm tra, build và publish thư mục `dist/`. Pull Request chỉ chạy kiểm tra và build.

| Biến môi trường    | Giá trị mặc định            |
| ------------------ | --------------------------- |
| `PUBLIC_SITE_URL`  | `https://avpegnu.github.io` |
| `PUBLIC_BASE_PATH` | `/av-lore`                  |

Trong CI, hai giá trị này được lấy từ owner và tên repository. Khi dùng domain hoặc base path khác, đặt cùng cấu hình cho cả build và verify.
