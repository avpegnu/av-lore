# Tiến độ System Design & AI

Cập nhật ngày 22/10/2026. Checkpoint 41 (Netflix/BuildTimeline) đã commit/push; Stripe, Uber, Community Chat và Photo Platform được triển khai tiếp ở local; tiếp tục tự triển khai các bài sau theo từng đợt, không dừng sau mỗi mục. Không coi phạm vi 73 bài/công cụ đã hoàn tất.

## Tình trạng hiện tại

- **45/73 bài đã biên soạn Việt–Anh**, gồm đủ bản mở rộng cho **26 Case Studies**.
- Tất cả 45 bài giữ `status: review`; **0 bài complete**. Số section, unit tests hoặc build thành công không thay vòng review độ phủ/kỹ thuật/English cuối.
- **28 mục chưa biên soạn**: 6 Build Stories, 14 AI Systems, 3 Practice và 5 Interview tools.
- Main preview: `http://127.0.0.1:4322/av-lore/`, snapshot 45 bài đã qua kiểm tra và publish local.
- Giữ nguyên 198 chương/15 lộ trình, 31 topic Notes & Interview, ID và dữ liệu học tập hiện có.

| Nhóm | Số bài | Canonical IDs |
| --- | --- | --- |
| Nền tảng | 4 | estimation, framework, networking, scaling |
| Building Blocks | 8 | caching, consistency, databases, load-balancing, messaging, rate-limiting, reliability, unique-ids |
| Case Studies | 26 | ad-clicks, autocomplete, chat, collaborative-editor, digital-wallet, email-service, exchange, file-sync, job-scheduler, key-value-store, leaderboard, llm-serving, maps-routing, message-queue, metrics-alerts, nearby-friends, news-feed, notifications, object-storage, payments, proximity, reservations, search-engine, url-shortener, video-platform, web-crawler |
| Build Stories | 6 | ep-chatgpt, ep-netflix, ep-stripe, ep-uber, ep-discord, ep-instagram |
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

## Bổ sung trong checkpoint 41: Netflix

`ep-netflix.json`: 16 phần Việt–Anh; 14 giai đoạn có sơ đồ riêng và bốn trường problem/decision/tradeoff/nextPressure; sơ đồ Play chính có 5 traces; 4 API contracts, 3 labs và 8 câu có lời giải. Các giai đoạn bao phủ MVP, recovery/migration, domain services, CDN placement/prefill, isolation, device APIs, multi-region, evacuation drills, events, global rights/localization, encoding, discovery, ads và live.

- Rate–quality lab dùng synthetic candidates, device cap và Pareto frontier; không claim VMAF, equal quality hoặc production BD-rate savings.
- Prefill lab duyệt 32 subsets của 5 complete files trong storage/fill budget, so popularity-first với byte objective; tách byte/request hit.
- Live lab tách personalized startup work khỏi shared-segment origin fetches/coalescing; buffer/latency/stall chỉ là analytical fixture.
- BuildTimeline thêm previous/next, arrow/Home/End, selector có bounded scrolling và cards cho reason/trade-off; backward-compatible với ep-chatgpt. CSS selector chỉ áp dụng stage buttons, không đè layout controls của embedded diagram.
- Static transcripts và stage node responsibilities đồng bộ IT Basic. Không sao chép React labs sang HTML.

Preview: `http://127.0.0.1:4322/av-lore/episodes/ep-netflix/` và `/av-lore/en/episodes/ep-netflix/`.

## Bổ sung local sau checkpoint 41

- Stripe: 17 phần, 12 stages, 5 main traces, 3 labs, 8 câu có lời giải. Processor ambiguity/cross-provider routing, verified inbox/business guards và versioned store cutover. Phân biệt authorization/capture/settlement, provider evidence với stale NOT_FOUND.
- Uber: 15 phần, 12 stages, 5 main traces, 3 labs, 8 câu. Geo epoch/seq/TTL, matching theo total/fairness/batch delay và trip-driver/current-offer invariants.
- Community Chat: 15 phần, 12 stages, 5 main traces, 3 labs, 8 câu. Scope/cursor/version-safe query coalescing, active audience/relay backpressure và snapshot/live/deletion replay.
- Photo Platform: 15 phần, 12 stages, 5 main traces, 3 labs, 8 câu. ID capacity/clock/ownership/exact serialization, publication/outbox/generation races và Story eligibility/viewed-state holes.
- Canonical English được biên tập cùng nội dung Việt, runtime strings có manual dictionary. Các mô hình offline ghi rõ assumptions/limits; không gọi payment providers, production storage hoặc social APIs.
- Đã đối chiếu full chapter/stage/demo theo learning purposes khi biên soạn; vòng review độc lập cuối vẫn chưa hoàn tất. Không nâng status bằng số lượng blocks hoặc tests.

## Snapshot đã kiểm tra cuối

- `npm run check`: **234 files, 0 errors/warnings/hints**. `npm test`: **124 tests đạt**.
- `npm run build` + `npm run verify`: **600 pages, 260682 links/assets**, 198 chương, 31 topics và 26 cases.
- Cả bốn bài mới đều qua dedicated browser VI/EN, 12 stages, keyboard, boundary scenarios, desktop/mobile và 9 theme accessibility; generic 6 routes Stripe/Uber/Community và 2 routes Photo Platform đạt. Đã xem screenshots desktop/mobile, gồm diagrams, results và publication/Story states. Uber đã chạy lại sau chỉnh label FREE trên mobile.
- IT Basic: **45 bài / 92 HTML files, 1072 internal links** đạt. Browser 8 static pages VI/EN của bốn bài mới kiểm canonical sections/stages/headings/tables/diagrams, mobile và language.
- Runtime dictionary không thiếu key trên built snapshot; English build offline. Main preview4322 đã publish local45; staging4323 dừng sau kiểm tra.
- Full IT Basic scan baseline còn49 broken links cũ ở AI indexes/JS chapter8, ngoài diff; không sửa `Test/Python/test.py`. Courses giữ baseline792 viewport checks/30 contrast checks, lượt này không đổi courses.
- Logs/research nằm bền trong `.cache/handbook-expansion/`, screenshots/reports trong `artifacts/`; đều ignored local, không dùng `/tmp`. Browser scripts và canonical sources được track.

## Điểm tiếp tục

1. Tiếp tục **`ep-amazon`**, sau đó `ep-spotify`, `ep-airbnb`, `ep-whatsapp`, `ep-figma`, `ep-youtube`. Amazon đã đọc full chapter/11 stages/inventory model/demo; primary docs conditional updates/saga/load shedding đã mở. Cần đọc body cells/shuffle sharding/Dynamo và chốt 3 mô hình gốc trước authoring. Không copy pseudo-SQL tách decrement/hold hoặc sweeper thiếu conditional terminal transition; external payment timeout/late auth không được coi như decline. Không hứa always-writable hoặc saga rollback/isolation tuyệt đối.
2. Hoàn thiện14 AI Systems, bắt đầu `ai-kv-cache`, rồi8 Practice/Interview tools.
3. Review độc lập độ phủ, dễ hiểu, kỹ thuật/formulas/units, English và visual/interaction purposes cho toàn bộ73. Framework còn cần product prompt/query mismatch review; Exchange có thể bổ sung regional DR/RPO.

## Source và cách làm tiếp

`src/content/handbook/*.json` là source chuẩn với cặp `vi/en`; schema ở `src/lib/handbook-schema.ts`, renderer ở `src/components/HandbookLesson.astro`, danh mục 73 mục ở `src/lib/handbook-catalog.json`. Mô hình mới ở `src/lib/{email,log,wallet,scheduler,search,netflix}-models.ts`, React labs và browser checks có tên tương ứng.

Không rerun các one-time author helpers trong `.cache/handbook-expansion/authoring/` để overwrite bài đã sửa; sửa trực tiếp canonical JSON. Plan/coverage/research local ở `.cache/handbook-expansion/`. Không chạy lại migration. Patch Chat trong `docs/work-in-progress/chat.patch` đã áp dụng ngày 22/10, không apply lần nữa. Không chạm thay đổi ngoài phạm vi ở `IT Basic/Test/Python/test.py`.

Shared prose/flows/cards/tables/API và diagram transcripts đồng bộ qua `IT Basic/tools/sync-handbook.py`; React labs chỉ ở AV Lore. Giữ branding/deploy/dependencies riêng. Đọc git status cả hai repo trước sửa tiếp.

Main preview phục vụ `dist/`. Dùng staging `.cache/handbook-preview/` trên port 4323, build/verify xong mới start preview và đợi HTTP200 trước browser. Không mutate staging khi suite đang chạy. Sau pass, copy `_astro` trước rồi toàn bộ `dist` và localization report sang main; không `--delete` assets cũ. Dừng bằng `npx astro preview stop` tại đúng staging cwd để không tắt main. Staging đã dừng sau snapshot cuối; main4322 vẫn chạy.

Browser generic hỗ trợ `HANDBOOK_IDS` và `HANDBOOK_CONTENT_DIR` để kiểm phần đổi trên validated snapshot. Chạy dedicated checks cho new behavior; range helper phải tôn trọng min/step và hướng ở max. Giữ key dữ liệu học tập hiện có và 9 themes đã chốt.

`npm run content:audit -- --require-complete` hiện cố ý chưa đạt vì mới authored45/reviewed0 trên scope73. Build/verify chạy độc lập, không cần repo IT Basic hoặc dịch online.

## Checkpoint đã push

Ngày 22/10, mốc 33 bài: AV Lore `3f3974547036498387b2bab2d6fcbe58aa581916`, IT Basic `996c995f1ec763944fe9d5bc53efc52d74861ef2`. Pages workflow thành công: https://github.com/avpegnu/av-lore/actions/runs/39721870116 . Bảy bài trong bảng trên được triển khai sau mốc 33 và thuộc checkpoint 40 được chủ sở hữu yêu cầu commit/push ở lượt hiện tại. Các bài bổ sung sau checkpoint 40 sẽ được theo dõi riêng.

Checkpoint trước ngày 21/10: AV Lore `12e9038bff6f5c51bb39059aa8c6427713362e36`, IT Basic `5aa8f07`. Giữ lịch sử commit, không reset/rewrite.

## Checkpoint 40 đã push theo yêu cầu mới

AV Lore `243167f548a0a2a6add8a9adf6c98d9e263f8f4a`, IT Basic `4cd80c94c25287d217e12e5fb53c0a4cf50836af`. Pages đã thành công: https://github.com/avpegnu/av-lore/actions/runs/39740983441 . Workflow VPS của IT Basic dừng ở `ssh-keyscan` trong Setup SSH key, vẫn lỗi sau một lần retry: https://github.com/avpegnu/it-basic/actions/runs/39740981336 . Không sửa workflows/secrets để đoán khắc phục; source đã push thành công. Công việc Build Stories tiếp theo được giữ local.

## Checkpoint 41 đã push

AV Lore `9c9eb33130ed313af9ae319c676130c4efef2058`, IT Basic `29492f5d7127605f5c870447dfc6f03db5a57b18`. Pages thành công: https://github.com/avpegnu/av-lore/actions/runs/39745514081 . Workflow VPS IT Basic thất bại: https://github.com/avpegnu/it-basic/actions/runs/39745517763 . Không sửa workflows/settings/secrets. Bốn bài mới phía trên được kiểm tra trong checkpoint 45; chủ sở hữu đã cho phép commit/push và tiếp tục triển khai.
