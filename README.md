# AV Lore

Website độc lập tách từ IT Basic, dùng Astro + React + TypeScript, xuất HTML tĩnh để chạy tại `https://avpegnu.github.io/av-lore/`. Phạm vi hiện tại là học IT; không có portfolio.

- 198 chương cũ, tổ chức thành 15 lộ trình.
- 31 topic Notes & Interview: 147 notes, 387 câu hỏi chính và follow-up, 44 sơ đồ từ notes.
- Tóm tắt, sơ đồ ghi nhớ và bài thử tương tác cho cả 31 topic.
- 26 System Design case study viết bằng tiếng Việt: requirements, capacity worksheet, API/data, flow, quyết định, lỗi, trade-off và interview drill. Đây là study outlines do IT Basic biên soạn, không phải bản dịch toàn bộ Blueprint.
- Pagefind search, theme, bookmark, đánh giá câu hỏi, tiến độ chương, nhập/xuất dữ liệu tương thích Notes & Interview cũ.

## Chạy local

Cần Node >= 22.22 (CI dùng Node 24), npm >= 9.6.5.

```sh
cd av-lore
npm ci
npm run dev
```

Mở `/av-lore/` trên địa chỉ Astro in ra. Development server không sinh search index; để kiểm tra tìm kiếm hãy dùng bản build:

```sh
npm run check
npm test
npm run build
npm run verify
npm run preview
```

Astro 7 có thể chạy preview thành background process. Dừng bằng `npx astro preview stop` sau khi kiểm tra.

## Cấu trúc

```text
src/content/courses/   Chương HTML đã import, metadata và source hash
src/content/topics/    Notes và câu hỏi; dùng chung cho Handbook và Practice
src/lib/learning.ts    Tóm tắt, phép ví von, luồng ghi nhớ và loại lab cho 31 topic
src/lib/cases.ts       26 case study System Design, nội dung độc lập theo case
src/lib/models.ts      Logic tính toán các mô phỏng
src/lib/scenarios.ts   Kịch bản chạy đúng và lỗi cho các bài mô phỏng luồng
src/lib/study.ts       LocalStorage, validation và tương thích dữ liệu cũ
src/layouts/           Shell chung: sidebar, header, TOC, theme, mobile navigation
src/components/        UI và React islands; không hydrate cả website
src/pages/             Routes tĩnh do Astro tạo lúc build
scripts/               Migration, link/content verification và browser QA
public/examples/       SQL lab tải về
```

Schema Zod trong `src/lib/content.ts` kiểm tra topic/course tại build. Nội dung đọc được render sẵn vào HTML. Chỉ các công cụ cần tương tác mới hydrate React. `src/lib/url.ts` quản lý base path; dùng helper này cho mọi local link mới, kể cả asset.

## Migration và nguồn dữ liệu

`scripts/migrate.mjs` đã import 198 chương từ thư mục cũ và 31 topic từ `NotesInterview/content/`. `migration-report.json` ghi source path/hash, dung lượng và 3 tham chiếu tới mục AI chưa có nội dung. Những tham chiếu này được giữ dưới dạng text, không tạo dead link. Các track AI chưa có chương không được đưa vào catalog.

**Không tự chạy lại `npm run migrate` sau khi đã chỉnh nội dung trong `src/content/`**: script là one-way import và sẽ ghi đè dữ liệu mới. Muốn đồng bộ chương cũ, thực hiện có chủ đích, review diff và giữ các cải tiến mới. `verify` kiểm tra dữ liệu đã commit mà không cần repo cũ. Đặt `LEGACY_SOURCE_ROOT="../IT Basic"` khi muốn đối chiếu thêm source hash với nguồn gốc. Migration chỉ chạy khi đặt biến này rõ ràng.

File nguồn cũ được giữ nguyên. Nội dung đã import loại bỏ scripts/handlers và bố cục cũ, rewrite local links, giữ text/code/tables/details và chuyển quiz cũ sang handler chung. Câu hỏi CLI vốn nằm trong data script được render sẵn vào HTML; terminal dùng virtual filesystem local. Các demo AI riêng từng chương được tách thành script và CSS có scope trong `public/course-labs/`, không tải lại shell cũ. Không tuyên bố đã biên tập lại từng khẳng định kỹ thuật của 198 chương cũ. Khi đóng góp, cần kiểm tra API và phiên bản liên quan bằng tài liệu chính thức.

Ảnh FDown là tài liệu tham khảo local, được gitignore và không có trong `public/` hoặc Pages artifact.

## Thêm hoặc sửa nội dung

1. Sửa JSON trong `src/content/topics/` cho Notes/Interview. Mỗi `question.note` phải trỏ tới một note cùng topic. ID ổn định để bookmark không bị mất.
2. Topic mới cần entry trong thứ tự tại `src/lib/content.ts`, nội dung tại `learning.ts` và một lab thật sự dùng được. Không thêm card giả hoặc link tới chương chưa viết.
3. Case mới thêm vào `cases.ts`, cần API, data model, failure mode và trade-off riêng; không sao chép cùng một bài mẫu rồi đổi tên.
4. Đối chiếu nguồn chính thức, giữ thuật ngữ English, giải thích bằng tiếng Việt. Nêu giả định và đơn vị cho số liệu. Không trình bày số giả định thành benchmark.
5. Chạy các lệnh kiểm tra trước khi mở PR.

Các câu hỏi luyện tổng hợp được lấy từ cùng dữ liệu topic; không tạo một ngân hàng câu hỏi trùng lặp riêng.

## Kiểm tra trình duyệt

Sau build, chạy preview trên port 4321 và:

```sh
npm run test:browser
```

Script mặc định dùng Chrome macOS. Trên môi trường khác, đặt `CHROME_PATH` trỏ tới Chromium/Chrome và `PREVIEW_URL` nếu đổi địa chỉ. Báo cáo và screenshot ghi trong `artifacts/` (gitignored). Script kiểm tra hydration, từng lab trace, model behavior, search dưới base path, bookmark/import/export, quiz cũ, mobile overflow, theme, accessibility và đọc khi tắt JavaScript. Tests không dùng dữ liệu thật của người dùng.

## Deploy GitHub Pages

`.github/workflows/pages.yml` chạy check → unit tests → build → kiểm tra nội dung, local links và anchors. PR chỉ validate, không publish. Push `main` hoặc chạy workflow thủ công sẽ upload **chỉ `dist`** rồi deploy.

Trong GitHub repository, chọn **Settings → Pages → Build and deployment → Source: GitHub Actions**. Repo này deploy độc lập; không có workflow VPS của IT Basic. Repository/project path được cấu hình rõ bằng `PUBLIC_SITE_URL=https://avpegnu.github.io` và `PUBLIC_BASE_PATH=/av-lore`.

Muốn deploy ở domain/root khác, đặt hai biến tương ứng cho build **và verify**, ví dụ `PUBLIC_BASE_PATH=/`. Không dùng `file://` để test các React module hoặc search index.

## Dữ liệu học tập

Giữ key `it-basic-notes-interview-v1` và ID `n/topic/note`, `q/topic/question` để tương thích dữ liệu cũ. Progress chương dùng `it-basic-chapters-v1`; STAR draft có key riêng. Export JSON chứa bookmark/đánh giá/progress; STAR draft lưu riêng, người dùng có thể copy thủ công. Nhập JSON gộp danh sách, ưu tiên “Cần ôn” nếu có hai đánh giá, không xóa trạng thái đang có.

LocalStorage tách theo origin. Chuyển VPS sang GitHub Pages cần xuất từ trang cũ rồi nhập vào Góc học tập. Website không có tài khoản hoặc backend đồng bộ.

## Ghi nhận

[Blueprint — The System Design Handbook](https://github.com/tranhuuhuy297/interactive-system-design) của tranhuuhuy297 là nguồn tham khảo cho cách tổ chức và danh mục case study. Bản mới không sao chép code hoặc dịch nguyên bộ nội dung của repo đó. Blueprint cấp phép code theo MIT, written content theo CC BY-NC 4.0; xem các file LICENSE riêng trong repo nguồn. Từng topic/case có nguồn kỹ thuật để đọc và đối chiếu. Nguồn cũ và quyền của tài liệu bên thứ ba không tự thay đổi khi migration.

## Việt / English và điều hướng

Nút ngôn ngữ trên navbar chuyển giữa URL gốc và `/en/`, giữ đường dẫn bài và anchor. Cả 278 trang đều có bản English; Notes, câu hỏi, follow-up, sơ đồ và nội dung chương đều được dịch. Code, API, ID nội dung và dữ liệu học tập được dùng chung. Tìm kiếm có hai chỉ mục độc lập.

- `src/i18n/en.json`: cache bản dịch; build dùng dữ liệu local và không gọi dịch vụ dịch.
- `src/i18n/en-overrides.json`: nhãn và thuật ngữ chỉnh thủ công, ưu tiên hơn cache tự động.
- `scripts/translate-en.mjs`: tác vụ dịch nội dung mới bằng Google Translate, chỉ chạy khi chủ động yêu cầu `npm run translate:en`. Cache và checkpoint giúp tiếp tục khi bị ngắt. Không dịch nội dung người dùng nhập hoặc trạng thái học tập.
- `scripts/build-locales.mjs`: xuất English HTML và dictionary cho widget; kiểm tra code và anchor không thay đổi. Build thất bại nếu thiếu bản dịch.
- `src/lib/language.ts`: chuyển ngôn ngữ và áp dụng từ điển local sau khi React hydrate; không sửa cấu trúc DOM của widget.

Bản English dùng dịch máy với nhãn giao diện và thuật ngữ được chỉnh riêng; sửa cách diễn đạt trong file overrides khi rà soát. Khi đổi nội dung, chạy `npm run build:vi`, `npm run translate:en`, rồi `npm run build` và review diff. Không chạy dịch vụ dịch trong CI.

Sidebar dùng disclosure native: Lộ trình → chương, Handbook → nhóm → topic → Notes/Interview/case study. Nhánh chứa trang hiện tại được mở sẵn; việc mở/đóng được ghi nhớ trong cùng trang. Breadcrumb và vị trí “Đang đọc” giúp định hướng.

Menu giao diện gồm Tối hiện đại (Dark Modern, mặc định), Tối xanh xám (GitHub Dark Dimmed), Xanh đêm (Midnight), Sáng pastel (Catppuccin Latte) và Sáng giấy (Paper). Mocha và Xám dịu đã được loại bỏ. Các tên hiển thị có bản Việt/Anh tương ứng. Màu chữ phụ và cảnh báo được điều chỉnh để dễ đọc trên các bề mặt của website. Các thiết lập giao diện và ngôn ngữ chỉ lưu trên trình duyệt.

Nếu dịch vụ dịch giới hạn lượt gọi, tác vụ dừng và lưu checkpoint. Có thể tiếp tục hoàn toàn local với model Argos Vietnamese → English (CTranslate2): cài `ctranslate2` và `sentencepiece` trong virtualenv riêng, tải/gỡ nén package từ Argos package index, rồi đặt `ARGOS_MODEL_DIR` và `TRANSLATION_PYTHON` trước khi chạy `npm run translate:en:offline`. Model và virtualenv không thuộc bản build hoặc repo; CI vẫn chỉ dùng cache JSON. Công cụ local giữ nguyên thuật ngữ kỹ thuật, số và interpolation slots.

## Đồng bộ với IT Basic

Đọc [AGENTS.md](AGENTS.md) trước khi sửa nội dung hoặc tính năng. Bản đối ứng local là `../IT Basic/website/`. Cập nhật phần dùng chung ở cả hai bên, giữ riêng tên thương hiệu và cấu hình deploy. Build và preview của AV Lore không cần thư mục nguồn cũ.

Bản English và Pagefind được sinh trong `npm run build`; dùng `npm run preview -- --port 4322` để xem cả hai ngôn ngữ tại `http://127.0.0.1:4322/av-lore/`. `npm run dev` dùng cho source tiếng Việt.
