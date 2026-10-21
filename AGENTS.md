# AV Lore — hướng dẫn cho AI

Website độc lập dùng Astro + React + TypeScript. Chạy các lệnh npm ở repo root; không cần checkout IT Basic để build hoặc deploy. Nội dung gốc là tiếng Việt, bản English sinh từ dictionary đã commit.

## Đồng bộ hai bản website

Chủ sở hữu yêu cầu duy trì cả website trong IT Basic và repo AV Lore. Khi thêm, sửa hoặc xóa nội dung, tính năng hay thư mục dùng chung ở một bên, hãy cập nhật phần tương ứng bên kia trong cùng công việc. Đây là quy ước làm việc cho AI, không phải đồng bộ tự động hoặc giấy phép tự push/deploy.

Hai thư mục mặc định nằm cạnh nhau:

| IT Basic | AV Lore |
| --- | --- |
| `../IT Basic/website/src/` | `../av-lore/src/` |
| `../IT Basic/website/public/` | `../av-lore/public/` |
| `../IT Basic/website/tests/` | `../av-lore/tests/` |
| `../IT Basic/website/scripts/` | `../av-lore/scripts/` |

- Đọc `git status` ở cả hai repo trước khi sửa; giữ nguyên thay đổi ngoài phạm vi của người dùng. Chỉ chuyển các thay đổi liên quan, không sao chép đè toàn bộ repo.
- Đồng bộ nội dung chương, Notes, Interview, case study, sơ đồ, lab, UI, tìm kiếm, bản Việt/English và các kiểm tra liên quan. Giữ ID nội dung và các key dữ liệu học tập ổn định.
- Bản dịch mới hoặc sửa bản dịch phải được cập nhật ở cả hai bên. Giữ các alias bản dịch riêng của thương hiệu; build không được gọi dịch vụ dịch online.
- Giữ riêng tên hiển thị: **IT Basic** ở bản cũ, **AV Lore** ở bản mới. Không sao chép mù các chuỗi thương hiệu trong Shell, Sidebar, Breadcrumbs, About, Search và từ điển.
- Giữ riêng cấu hình repo: base path `/it-basic` và `/av-lore`, URL GitHub, package name, README, AGENTS.md, cấu hình Astro, workflows, và đường dẫn preview. AV Lore có source ở repo root; IT Basic có source trong `website/`.
- Các scripts build/locales/verify/browser QA có chung hành vi nhưng khác base path. AV Lore không được bắt buộc có checkout IT Basic để build hoặc verify; chỉ đối chiếu nguồn gốc khi đặt `LEGACY_SOURCE_ROOT`. Migration của AV Lore yêu cầu biến này rõ ràng.
- Nếu sửa các thư mục HTML cũ (CLI, DSA, OS, Networking, Database, DevOps, SystemDesign, Programming Language, Fullstack-ContactCenter, AI) hoặc `NotesInterview/content/`, phải chủ động đưa thay đổi tương ứng vào `website/src/content/` và `av-lore/src/content/`. Không chạy lại toàn bộ migration để ghi đè các cải tiến mới. Kiểm tra diff, hash nguồn và bản English.
- Nếu thêm thư mục source dùng chung, thêm thư mục tương ứng vào cả hai website và cập nhật bảng trên khi cần. Không nhân bản các bài raw ảnh, code thử nghiệm hoặc công cụ cá nhân không phục vụ website.
- Không đồng bộ `.git/`, `node_modules/`, `dist/`, `.astro/`, `.cache/`, `artifacts/`, secret, `.env` hoặc bộ ảnh `FDown.vn_instagram_*`.
- Nếu không tìm thấy bản còn lại (ví dụ trong CI hoặc một clone độc lập), tiếp tục công việc ở repo hiện tại, ghi rõ phần chưa đồng bộ trong kết quả bàn giao; không tự clone/push repo khác để bù.
- Chạy `npm run check`, `npm test`, `npm run build`, `npm run verify` ở các bản bị ảnh hưởng; kiểm tra trình duyệt cho tương tác, bản dịch, navigation hoặc đổi base path. Báo rõ đã đồng bộ file nào và còn khác biệt cấu hình nào.
- Không tự commit, push, deploy, chỉnh Settings GitHub hay gửi PR nếu công việc hiện tại chưa được người dùng cho phép các bước đó. Việc đồng bộ local không tự cấp quyền publish.
