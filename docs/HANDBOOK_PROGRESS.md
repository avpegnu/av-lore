# Tiến độ System Design & AI

Cập nhật ngày 22/10/2026. Checkpoint hiện tại gồm 40 bài Việt–Anh đã biên soạn và kiểm tra local; chủ sở hữu đã yêu cầu commit/push rồi tiếp tục Build Stories. Không coi phạm vi 73 bài/công cụ đã hoàn tất.

## Tình trạng hiện tại

- **40/73 bài đã biên soạn Việt–Anh**, gồm đủ bản mở rộng cho **26 Case Studies**.
- Tất cả 40 bài giữ `status: review`; **0 bài complete**. Số section, unit tests hoặc build thành công không thay vòng review độ phủ/kỹ thuật/English cuối.
- **33 mục chưa biên soạn**: 11 Build Stories, 14 AI Systems, 3 Practice và 5 Interview tools.
- Main preview: `http://127.0.0.1:4322/av-lore/`, snapshot 40 bài đã qua kiểm tra và publish local.
- Giữ nguyên 198 chương/15 lộ trình, 31 topic Notes & Interview, ID và dữ liệu học tập hiện có.

| Nhóm | Số bài | Canonical IDs |
| --- | --- | --- |
| Nền tảng | 4 | estimation, framework, networking, scaling |
| Building Blocks | 8 | caching, consistency, databases, load-balancing, messaging, rate-limiting, reliability, unique-ids |
| Case Studies | 26 | ad-clicks, autocomplete, chat, collaborative-editor, digital-wallet, email-service, exchange, file-sync, job-scheduler, key-value-store, leaderboard, llm-serving, maps-routing, message-queue, metrics-alerts, nearby-friends, news-feed, notifications, object-storage, payments, proximity, reservations, search-engine, url-shortener, video-platform, web-crawler |
| Build Stories | 1 | ep-chatgpt |
| AI Systems | 1 | ai-inference |

## Các bài bổ sung trong checkpoint 40

| Bài | Nội dung | Kiểm tra khi bổ sung |
| --- | --- | --- |
| Collaborative Editor | 16 phần, 5 traces, 3 labs, 8 câu có lời giải; edit contexts, anchors và durable ACK/recovery | 190 source files/87 tests; dedicated VI/EN/mobile/keyboard/9 theme và generic routes đạt |
| LLM Inference Platform | 16 phần, 5 traces, 3 labs, 8 câu; batch occupancy, KV placement và usage lifecycle | 194 files/90 tests; browser, build/verify đạt |
| Email Service | 16 phần, 5 traces, 4 labs, 8 câu; final SMTP acceptance, receipts, alignment, spam và mailbox cursors | 198 files/95 tests; dedicated/generic browser đạt |
| Distributed Message Queue | 16 phần, 5 traces, 3 labs, 8 câu; sparse seek, ISR-only ACK/failover và transaction visibility | 203 files/98 tests; dedicated/generic browser đạt |
| Digital Wallet | 17 phần, 5 traces, 3 labs, 8 câu; snapshot result state, transfer decisions và holds | 207 files/102 tests; dedicated/generic browser đạt |
| Job Scheduler | 16 phần, 5 traces, 3 labs, 8 câu; sink fencing, missed occurrences và DST | 210 files/105 tests; dedicated/generic browser đạt |
| Search Engine | 15 phần, 5 traces, 3 labs, 8 câu; postings/BM25/ACL, visibility và fan-out/hedging | 215 files/109 tests; dedicated/generic browser đạt, kể cả hedge không launch sau deadline |

Đã xem screenshots desktop/mobile của từng bài. Các mô phỏng là offline fixtures có giả định/giới hạn rõ; chúng không thực hiện SMTP, charges, production consensus, cron execution hoặc external search calls.

## Snapshot đã kiểm tra cuối

- `npm run check`: **215 files, 0 errors/warnings/hints**.
- `npm test`: **109 tests đạt**.
- `npm run build` và `npm run verify`: **590 pages, 253420 links/assets**, 198 chương, 31 topics, 26 cases.
- Browser dedicated của các bài mới đạt ở VI/EN, keyboard, desktop/mobile và 9 theme. Batch generic 10 routes của 5 bài mới đạt; sau sửa edge case hedge, Search được chạy lại dedicated và 2 generic routes trên snapshot cuối.
- Runtime dictionary không thiếu key; English build offline từ canonical pairs và từ điển đã lưu.
- IT Basic: đồng bộ **40 bài/82 HTML files**, **946 internal links** đạt. Browser kiểm cấu trúc/ngôn ngữ/diagram/table của 10 trang VI/EN mới; toàn bộ **80 trang bài học** đạt desktop/mobile overflow regression.
- Đã sửa `tools/sync-handbook.py` và CSS sinh ra để prose/inline field names dài ngắt dòng trên mobile. Không mang Astro/React/styles của AV Lore sang IT Basic.
- Course visuals đã có baseline 792 page/viewport combinations và 30 contrast checks từ checkpoint trước; lượt này không sửa courses, không cần lặp toàn bộ suite đó.

Các log cuối nằm trong `.cache/handbook-expansion/`: `search-last-check.log`, `search-last-unit.log`, `search-last-build.log`, `search-last-verify.log`, `search-last-browser.log`, `search-last-generic-browser.log`, `search-generic-browser.log` (10 routes), `new-legacy-browser.log`. Screenshots/reports trong `artifacts/`. Các folder này ignored nhưng nằm bền trong repo local, không dùng `/tmp`.

## Điểm tiếp tục

1. Bắt đầu **`ep-netflix`**, rồi `ep-stripe`, `ep-uber`, `ep-discord`, `ep-instagram`, `ep-amazon`, `ep-spotify`, `ep-airbnb`, `ep-whatsapp`, `ep-figma`, `ep-youtube`. Mới có inventory; chưa biên soạn/model/research riêng cho ep-netflix. `ep-chatgpt` đã có canonical.
2. Hoàn thiện 14 AI Systems còn thiếu, bắt đầu `ai-kv-cache`; rồi 8 công cụ Practice/Interview. `npm run content:audit` cho danh sách chính xác.
3. Review độc lập từng bài theo learning purpose: độ phủ, giải thích dễ hiểu, formulas/units, English, visual meaning và interaction behavior. Không nâng `complete` bằng số lượng blocks/tests. Framework còn cần review product prompt mở và query/model mismatch phát hiện muộn; Exchange có thể bổ sung regional DR/RPO example.
4. Trong review, lưu ý mô hình: Message Queue là ISR-only, không ELR/full Kafka; Wallet giữ decision/result/hold state, không chỉ total; Scheduler highest-seen fence cần activation và sink idempotence riêng; Search scores/statistics và independence assumptions không phải production benchmark.

## Source và cách làm tiếp

`src/content/handbook/*.json` là source chuẩn với cặp `vi/en`; schema ở `src/lib/handbook-schema.ts`, renderer ở `src/components/HandbookLesson.astro`, danh mục 73 mục ở `src/lib/handbook-catalog.json`. Mô hình mới ở `src/lib/{email,log,wallet,scheduler,search}-models.ts`, React labs và browser checks có tên tương ứng.

Không rerun các one-time author helpers trong `.cache/handbook-expansion/authoring/` để overwrite bài đã sửa; sửa trực tiếp canonical JSON. Plan/coverage/research local ở `.cache/handbook-expansion/`. Không chạy lại migration. Patch Chat trong `docs/work-in-progress/chat.patch` đã áp dụng ngày 22/10, không apply lần nữa. Không chạm thay đổi ngoài phạm vi ở `IT Basic/Test/Python/test.py`.

Shared prose/flows/cards/tables/API và diagram transcripts đồng bộ qua `IT Basic/tools/sync-handbook.py`; React labs chỉ ở AV Lore. Giữ branding/deploy/dependencies riêng. Đọc git status cả hai repo trước sửa tiếp.

Main preview phục vụ `dist/`. Dùng staging `.cache/handbook-preview/` trên port 4323, build/verify xong mới start preview và đợi HTTP200 trước browser. Không mutate staging khi suite đang chạy. Sau pass, copy `_astro` trước rồi toàn bộ `dist` và localization report sang main; không `--delete` assets cũ. Dừng bằng `npx astro preview stop` tại đúng staging cwd để không tắt main. Staging đã dừng sau snapshot cuối; main4322 vẫn chạy.

Browser generic hỗ trợ `HANDBOOK_IDS` và `HANDBOOK_CONTENT_DIR` để kiểm phần đổi trên validated snapshot. Chạy dedicated checks cho new behavior; range helper phải tôn trọng min/step và hướng ở max. Giữ key dữ liệu học tập hiện có và 9 themes đã chốt.

`npm run content:audit -- --require-complete` hiện cố ý chưa đạt vì mới authored40/reviewed0 trên scope73. Build/verify chạy độc lập, không cần repo IT Basic hoặc dịch online.

## Checkpoint đã push

Ngày 22/10, mốc 33 bài: AV Lore `3f3974547036498387b2bab2d6fcbe58aa581916`, IT Basic `996c995f1ec763944fe9d5bc53efc52d74861ef2`. Pages workflow thành công: https://github.com/avpegnu/av-lore/actions/runs/39721870116 . Bảy bài trong bảng trên được triển khai sau mốc 33 và thuộc checkpoint 40 được chủ sở hữu yêu cầu commit/push ở lượt hiện tại. Các bài bổ sung sau checkpoint 40 sẽ được theo dõi riêng.

Checkpoint trước ngày 21/10: AV Lore `12e9038bff6f5c51bb39059aa8c6427713362e36`, IT Basic `5aa8f07`. Giữ lịch sử commit, không reset/rewrite.
