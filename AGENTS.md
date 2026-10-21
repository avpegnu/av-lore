# AV Lore — hướng dẫn cho AI

Website độc lập dùng Astro + React + TypeScript. Chạy lệnh npm ở repo root; không cần checkout IT Basic để build hoặc deploy. Nội dung gốc là tiếng Việt, bản English sinh từ dictionary đã commit.

Theo yêu cầu của chủ sở hữu, không thêm lại file acknowledgements hoặc mục giới thiệu nguồn tham khảo vào README hay giao diện khi chưa được yêu cầu.

Thương hiệu hiển thị của repo này luôn là AV Lore, gồm giao diện, nội dung bài học, ví dụ, file tải xuống và cả hai ngôn ngữ. Các key lưu trữ `it-basic-*` hiện có được giữ để tương thích dữ liệu học tập; không dùng chúng làm tên hiển thị. Tên IT Basic chỉ dùng trong hướng dẫn kỹ thuật về repo đối ứng bên dưới.

## Giao diện

Bộ giao diện đã chốt 9 theme: 4 tối (GitHub Dark, Tối hiện đại, Dracula, Ayu Mirage) và 5 sáng (Sáng pastel, Sáng giấy, GitHub Light, Solarized Light, Rosé Pine Dawn). Mặc định là GitHub Dark; giữ các lựa chọn còn hợp lệ đã lưu của người dùng. Không thêm lại các theme bị loại. Trang `/themes/` vẫn dùng để xem và so sánh.

## Đồng bộ nội dung giữa IT Basic và AV Lore

Chủ sở hữu muốn duy trì kiến thức tương ứng ở hai repo. IT Basic giữ website HTML/CSS/JavaScript; AV Lore là website Astro độc lập. IT Basic không có thư mục `website/`: không tạo lại bản Astro bên trong repo này.

Hai repo mặc định nằm cạnh nhau. Nội dung được đối chiếu theo ý nghĩa và ID, không sao chép đè toàn bộ cấu trúc:

| IT Basic                                            | AV Lore                                                |
| --------------------------------------------------- | ------------------------------------------------------ |
| `CLI/`, `DSA/`, `OS/`, `Networking/`, `OOP/`        | `src/content/courses/` theo `track` và trường `source` |
| `Programming Language/`, `Fullstack-ContactCenter/` | `src/content/courses/` theo `track` và trường `source` |
| `Database/`, `DevOps/`, `SystemDesign/`, `AI/`      | `src/content/courses/` theo `track` và trường `source` |
| `NotesInterview/content/<topic>.json`               | `src/content/topics/<topic>.json`                      |
| Navigation, danh mục, trang HTML theo chủ đề        | `src/lib/content.ts`, các routes và sidebar tương ứng  |

- Trước khi sửa, đọc `git status` ở cả hai repo và giữ nguyên thay đổi ngoài phạm vi của người dùng.
- Khi thêm, sửa hoặc xóa kiến thức dùng chung (chương, Notes, câu hỏi Interview, sơ đồ hoặc topic), cập nhật nội dung tương ứng ở cả hai repo trong cùng công việc. Giữ ID ổn định; chú ý khác biệt schema, HTML và đường dẫn asset. Không chép nguyên JSON hoặc HTML giữa hai định dạng nếu chưa kiểm tra.
- Nếu thêm thư mục hoặc chủ đề mới, cập nhật danh mục và navigation ở cả hai phía. Với AV Lore, bổ sung metadata, lab khi phù hợp và bản English tương ứng. Nếu một phần chỉ có ở một kiến trúc (ví dụ React lab hoặc công cụ chỉ dành cho repo nguồn), không tạo bản sao giả để đủ số lượng; ghi rõ phạm vi áp dụng khi bàn giao.
- Các nguồn chương trong AV Lore có trường `source` và `sourceHash`; khi đối chiếu với IT Basic, cập nhật metadata có chủ đích và giữ các cải tiến nội dung. Không tự chạy lại toàn bộ migration vì có thể ghi đè nội dung đã biên tập. `npm run migrate` của AV Lore chỉ dùng khi được yêu cầu, với `LEGACY_SOURCE_ROOT` rõ ràng.
- Giữ riêng thương hiệu và công nghệ: **IT Basic** dùng HTML/CSS/JavaScript; **AV Lore** dùng Astro + React + TypeScript. Không mang navbar, themes, workflows, package, dependencies hoặc cấu hình Astro sang IT Basic chỉ để đồng bộ.
- Các thay đổi nội dung AV Lore cần có bản English tương ứng. Giữ code, API, ID và key dữ liệu học tập ổn định. Build dùng từ điển đã lưu, không gọi dịch vụ dịch online.
- Giữ riêng `.git/`, README, AGENTS.md, cấu hình deploy, domain/base path và secrets. Không đồng bộ `node_modules/`, `dist/`, `.astro/`, `.cache/`, `artifacts/`, `.env` hoặc bộ ảnh `FDown.vn_instagram_*`.
- AV Lore phải build và verify được mà không cần repo IT Basic. Nếu không có bản đối ứng trong môi trường hiện tại, hoàn thành phần local có thể làm, rồi ghi rõ nội dung chưa đồng bộ; không tự clone/push repo khác.
- Kiểm tra IT Basic bằng các công cụ phù hợp trong `tools/` và trình duyệt. Khi sửa `NotesInterview/content/`, chạy `node tools/build-notes-interview.js` và `node tools/check-notes-interview.js`; kiểm tra diff các file sinh ra. Không chạy npm/Astro trong IT Basic.
- Với thay đổi source hoặc nội dung AV Lore, chạy `npm run check`, `npm test`, `npm run build`, `npm run verify`; kiểm tra trình duyệt khi thay đổi tương tác, navigation hoặc ngôn ngữ. Với chỉnh sửa tài liệu đơn thuần, kiểm tra diff và liên kết liên quan.
- Quy ước này hướng dẫn AI làm việc, không phải đồng bộ tự động. Không tự commit, push, deploy, chỉnh Settings GitHub hay mở PR nếu công việc hiện tại chưa được người dùng cho phép các bước đó.
