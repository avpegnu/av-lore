# Tiến độ System Design & AI

Checkpoint ngày 22/10/2026 gồm 33 bài Việt–Anh đã biên soạn, sau mốc 16 bài ngày 21/10. Chủ sở hữu đã yêu cầu commit/push checkpoint này rồi tiếp tục triển khai. Các bài bổ sung sau checkpoint được theo dõi riêng; chưa coi phạm vi 73 mục là hoàn tất.

## Phạm vi và tình trạng hiện tại

- Danh mục đã thống nhất: **73 bài/công cụ**.
- **33 bài đã có canonical nội dung Việt–Anh**, hiện giữ trạng thái `review`; chưa đánh dấu bài nào `complete` từ số lượng section hoặc việc build thành công.
- **40 mục chưa mở rộng**: 7 Case Studies, 11 Build Stories, 14 AI Systems, 3 Practice và 5 Interview tools.
- Main preview `http://127.0.0.1:4322/av-lore/` đang có **33 bài đã qua kiểm tra**, tới Stock Exchange.
- Snapshot 33 bài đã được build/verify, kiểm tra browser và publish local. Nhãn UI Việt/English riêng của Metrics/Maps/Nearby/Object đã được kiểm tra.

Danh sách canonical hiện có:

| Nhóm | Bài |
| --- | --- |
| Foundations (4) | framework, estimation, scaling, networking |
| Building Blocks (8) | load-balancing, caching, databases, consistency, messaging, rate-limiting, unique-ids, reliability |
| Case Studies (19) | url-shortener, news-feed, chat, notifications, autocomplete, web-crawler, video-platform, file-sync, proximity, key-value-store, payments, leaderboard, ad-clicks, reservations, metrics-alerts, maps-routing, nearby-friends, object-storage, exchange |
| Build Stories (1) | ep-chatgpt |
| AI Systems (1) | ai-inference |

Các case còn lại vẫn có URL từ bản outline cũ; có route/menu không chứng minh nội dung đã được mở rộng. Giữ nguyên 198 chương/15 lộ trình, 31 topic Notes & Interview và các key dữ liệu học tập. React lab chỉ có ở AV Lore; prose/flows/cards/tables/API/sơ đồ dạng tĩnh Việt–Anh được đồng bộ sang IT Basic bằng `tools/sync-handbook.py`.

## Nội dung và kiểm tra ngày 22/10

Các case mới đều có bản Việt–Anh biên tập, flow/cards, sơ đồ request có trace, mô phỏng nêu giả định và tám câu hỏi có lời giải. Chúng được viết trực tiếp trong canonical JSON, chưa hoàn tất vòng review độ phủ/biên tập cuối cho toàn bộ scope.

| Bài | Nội dung | Kiểm tra đạt |
| --- | --- | --- |
| Chat | 15 phần, 4 trace, routing/session generation và gap-aware sync | 41 unit test; 34 route; browser riêng VI/EN/mobile/9 theme |
| Notification System | 14 phần, 5 trace, unknown provider outcome và delivery pipeline | Browser riêng 9 theme; generic 38 route cùng Autocomplete |
| Autocomplete | 14 phần, 4 trace, prefix candidates/filtering và stale request generations | 45 unit test; generic 38 route; browser riêng 9 theme; đã xem ảnh |
| Web Crawler | 16 phần, 4 trace, polite frontier schedule và Bloom budget | 47 unit test; 40 route; browser riêng 9 theme; đã xem ảnh |
| Video Platform | 15 phần, 4 trace, gated/progressive publication, ABR và byte-hit bandwidth | 49 unit test; 42 route; browser riêng 9 theme; regression sau CSS controls đạt |
| File Sync | 15 phần, 4 trace, unique missing chunks và guarded offline conflicts | 51 unit test; 44 route; browser riêng 9 theme; đã xem ảnh |
| Proximity | 14 phần, 4 trace, conservative cell cover và bounded quadtree | 53 unit test; 46 route; browser riêng 9 theme; label/map regression trong batch KV đạt |
| Key–Value Store | 15 phần, 4 trace, ring/quorum và symbolic Merkle comparison | 54 unit test; 48 route; browser riêng 9 theme; Merkle mobile layout đã sửa và kiểm tra lại |
| Payment System | 14 phần, 5 trace, ambiguous capture và balanced-but-duplicate ledger | 56 unit test; 50 route; browser riêng 9 theme; đã xem ảnh |
| Leaderboard | 14 phần, 4 trace, versioned score replay/ties và sharded top-K/rank | Check 158 file/58 unit test, 52 route và browser riêng 9 theme đạt; đã xem ảnh và publish local |
| Ad Click Aggregation | 14 phần, 4 trace, event-time/late windows và fenced aggregate sink | Check 162 file/60 unit test; 54 route; browser riêng 9 theme; đã xem ảnh và publish local |
| Reservation System | 14 phần, 5 trace, whole-stay race/rollback và expired hold/late payment | Check 167 file/62 unit test; 56 route; browser riêng 9 theme; đã xem ảnh và publish local |
| Metrics & Alerting | 15 phần, 4 trace, cardinality budgets, gauge rollups và alert for/no-data | Check 171 file/65 unit test; 58 route; browser riêng 9 theme; đã xem ảnh và publish local |
| Maps & Routing | 14 phần, 4 trace, viewport keys/version/style, shortest paths/closures và ETA trust | Check 175 file/68 unit test; 60 route; browser riêng 9 theme và visual fixes đạt; đã publish local |
| Nearby Friends | 14 phần, 5 trace, multiplexed fan-out, viewer-movement recompute và policy/expiry timeline | Check 179 file/71 unit test; 62 route; browser riêng 9 theme; labels regression cả Metrics/Maps/Nearby đạt; đã publish local |
| Object Storage | 16 phần, 5 trace, correlated MDS failures, multipart conflicts và reader-pinned GC | Check 183 file/77 unit tests; dedicated VI/EN/mobile/keyboard/9 theme và 2 route mới đạt; đã xem ảnh và publish local |
| Stock Exchange | 16 phần, 5 trace, price-time/FIFO/replace, committed-prefix authority và shared risk reservations | Check 187 file/83 unit tests; 2 route mới; dedicated VI/EN/mobile/keyboard/9 theme; đã xem ảnh và publish local |

Main preview Stock Exchange đã qua build/verify **590 trang/253.168 liên kết/asset** và browser. Generic browser baseline 62 route cùng 2 route Object Storage và 2 route Exchange mới đã đạt. Prose hiện đồng bộ đủ cả 33 bài sang IT Basic: **68 HTML/766 liên kết nội bộ** đạt. Không chạm `Test/Python/test.py` của người dùng.

Các lỗi UI/SSR đã sửa trong quá trình kiểm tra:

- Code/API block dài trong handbook và redirect demo nhận focus để cuộn bằng bàn phím.
- Crawler SVG title dùng một string để tránh React hydration mismatch.
- Labels checkbox có khoảng cách/dòng rõ; text input handbook dùng theme tokens.
- Merkle upper levels vừa reading column, chỉ lower rows dày cần cuộn ngang; có transcript.
- Browser harness dùng ArrowLeft khi slider đang ở max, tránh test chờ thay đổi không thể xảy ra.

## Điểm tiếp tục

1. Case tiếp theo là `collaborative-editor`; chưa có canonical hoặc models. Sau đó là `llm-serving`, `email-service`, `message-queue`, `digital-wallet`, `job-scheduler`, `search-engine` theo catalog.
2. Object Storage đã publish local sau `object-final-browser.log`; check 183 file/77 tests, hai route mới và 9 theme đạt. Không rerun script author để overwrite canonical.
3. Stock Exchange đã publish local sau `exchange-browser.log` và `exchange-generic-browser.log`: 16 phần/5 trace/3 labs/8 worked questions, check 187 file/83 tests. Reference structure/protocol corrections lưu ở `.cache/handbook-expansion/exchange-research.json`; mô hình có 6 tests về matching, identities, snapshots, fencing, budgets và boundaries. Source chuẩn là JSON + React/pure models, không phải helper draft.
4. Còn 40 mục chưa mở rộng: 7 cases, 11 build stories, 14 AI, 8 practice/interview tools. Các route outline cũ chưa được tính hoàn tất.
5. Sau vòng mở rộng, đối chiếu độ phủ và biên tập kỹ thuật/bản Anh để chuyển từng bài sang `complete`. Tất cả 33 bài vẫn `review` (0 complete). Exchange có thể bổ sung regional DR/RPO example trong vòng review cuối; không suy no-loss cho failure model chưa định nghĩa. Riêng framework còn product prompt mở và query/model mismatch phát hiện muộn.

Research/drafts/logs đặt bền trong `.cache/handbook-expansion/`, không dùng `/tmp`. Reference checkout read-only ở `.cache/handbook-expansion/reference/`; các script author là bản nháp dùng một lần, **không chạy lại để overwrite canonical bài đã chỉnh**. Research Payment và Leaderboard đã được thực hiện và hiện đã có source, không còn là phần chưa bắt đầu. Bản source chuẩn là `src/content/handbook/*.json`.

Patch Chat trong `docs/work-in-progress/chat.patch` đã áp dụng ngày 22/10, giữ làm lịch sử; không apply lại. Không chạy lại toàn bộ migration. Build English offline từ cặp canonical và dictionary đã lưu.

Main preview phục vụ `dist/`. Staging `.cache/handbook-preview/` tách biệt, dùng port 4323 để kiểm tra trước khi copy `dist` sang main. Không mutate staging trong khi browser suite đang chạy. Khi publish local, copy `_astro` trước rồi toàn bộ `dist` và localization report; không xóa assets cũ khi user còn mở tab. Dừng preview bằng `npx astro preview stop` **tại đúng working directory** để không dừng nhầm main.

## Checkpoint đã push ngày 21/10

AV Lore commit `12e9038bff6f5c51bb39059aa8c6427713362e36`, IT Basic `5aa8f07`. Check 118 file/39 unit test; build/verify 590 trang/252.604 liên kết/asset; 32 handbook route Việt–Anh và 9 theme đạt. Đã sửa 25 file chương nền tảng; course visuals trước đó đạt 792 tổ hợp page/viewport, 30 kiểm tra contrast cùng legacy interactions. Không cần chạy lại toàn bộ course suite cho thay đổi chỉ giới hạn handbook trừ khi phát sinh ảnh hưởng mới.

Sau khi khởi động máy, dùng `npm run preview -- --port 4322` tại AV Lore để mở bản `dist` đã có. `npm run content:audit` báo authored/review/missing; `--require-complete` hiện **cố ý chưa đạt** vì scope 73 mục chưa xong.

Lượt browser labels cuối chạy sau khi build/verify kết thúc (lượt khởi động sớm đã hủy, không dùng làm evidence). Các log cuối: `metrics-labels-browser.log`, `maps-labels-browser.log`, `nearby-labels-browser.log`.

Browser harness hỗ trợ `HANDBOOK_IDS` (comma-separated) để kiểm tra phần thay đổi sau baseline đã đạt; không cần lặp mọi route cũ cho CSS/UI scoped độc lập. Không có filter vẫn chạy toàn bộ canonical. New checkbox/button-only labs cũng được kiểm tra. Object multipart có status/help thực, không chỉ đổi checked property.

Khi start preview, chờ launcher hoàn tất và kiểm tra HTTP200 tại route định test rồi mới chạy browser. Không chỉ thấy dòng `npm run preview` rồi cho suite chạy; Astro7 có thể còn khởi động background server. Nếu start/browser nhầm timing, bỏ kết quả lượt đó và chạy lại trên snapshot đã verify.
