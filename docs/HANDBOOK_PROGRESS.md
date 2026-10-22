# Tiến độ System Design & AI

Cập nhật22/10/2026. Chủ sở hữu yêu cầu commit/push các mốc đã kiểm tra rồi tiếp tục triển khai nhiều bài liên tiếp, không dừng xin xác nhận sau mỗi mục. Phạm vi73 bài/công cụ chưa hoàn tất.

## Trạng thái hiện tại

- **49/73 bài đã biên soạn Việt–Anh**, gồm4 Foundations,8 Building Blocks,26 Case Studies,10 Build Stories và1 AI Systems.
- Tất cả49 bài `status: review`, **0 complete**. Build/tests/counts không thay vòng review độc lập về coverage, kỹ thuật, diễn giải/English và visual learning purposes.
- **24 mục chưa biên soạn**:2 Build Stories (`ep-figma`, `ep-youtube`),14 AI Systems,3 Practice và5 Interview tools.
- Main preview **http://127.0.0.1:4322/av-lore/** đã publish local49. Các bài `/episodes/ep-amazon/`, `/episodes/ep-spotify/`, `/episodes/ep-airbnb/` có bản `/en/` tương ứng.
- Giữ198 chương/15 lộ trình,31 Notes & Interview topics, stable IDs, localStorage keys và9 themes. Không portfolio.

## Mốc đã push

- Checkpoint33: AV Lore `3f3974547036498387b2bab2d6fcbe58aa581916`, IT Basic `996c995f1ec763944fe9d5bc53efc52d74861ef2`. Pages thành công39721870116.
- Checkpoint40: AV Lore `243167f548a0a2a6add8a9adf6c98d9e263f8f4a`, IT Basic `4cd80c94c25287d217e12e5fb53c0a4cf50836af`. Pages thành công https://github.com/avpegnu/av-lore/actions/runs/39740983441 . IT VPS39740981336 failed `ssh-keyscan`, vẫn failed sau1retry.
- Checkpoint41: AV Lore `9c9eb33130ed313af9ae319c676130c4efef2058`, IT Basic `29492f5d7127605f5c870447dfc6f03db5a57b18`. Pages thành công https://github.com/avpegnu/av-lore/actions/runs/39745514081 ; IT VPS39745517763 failed.
- Checkpoint45: AV Lore `aa559d70ba76ff29edf090b35e7772bd6c34102a`, IT Basic `8357d80c9bfcb89e93f3f08d9fafb1018175ee72`. Pages thành công https://github.com/avpegnu/av-lore/actions/runs/39752592201 . IT VPS https://github.com/avpegnu/it-basic/actions/runs/39752592483 failed trong Setup SSH key tại `ssh-keyscan`; đã đọc failed log22/10. Source hai repo push thành công; không đổi workflow/settings/secrets.
- Checkpoint48 đã push: AV Lore `0aa78f454e48699205d7d7c4036a4df55a306b7b`, IT Basic `cc679068914e4d75e3616e469342965251825586`. Pages workflow thành công https://github.com/avpegnu/av-lore/actions/runs/39758156091; IT VPS39758157616 failed. Không suy deploy từ push.

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

## Bổ sung sau checkpoint41

| Bài | Nội dung gốc Việt–Anh | Mô phỏng / giới hạn chính |
| --- | --- | --- |
| Stripe (`ep-stripe`) |17sections/12stages/5maintraces/3labs/8worked questions|Processor ambiguity, verified inbox/business guards, migration cutover; auth không capture/settlement, stale NOT_FOUND không proof|
| Uber (`ep-uber`)|15sections/12stages/5traces/3labs/8questions|Geo epoch/seq/TTL, matching total/fairness/delay, trip+driver/current-offer invariants|
| Community Chat (`ep-discord`)|15sections/12stages/5traces/3labs/8questions|Scope/cursor/version-safe reads, active audience/relay gaps, snapshot/live/deletion recovery|
| Photo Platform (`ep-instagram`)|15sections/12stages/5traces/3labs/8questions|ID clock/capacity/ownership/precision, publish/delete races, Stories expiry/seen holes|
| Checkout (`ep-amazon`)|15sections/11stages/5traces/5APIs/3labs/8questions|Atomic hold/expiry/late auth, observed cart membership, retry-aware shuffle subsets/shared dependency|
| Audio Platform (`ep-spotify`)|14sections/11stages/5traces/5APIs/3labs/8questions|Startup critical path/rights gates, offline entry anchors/replay, semantic play/report corrections|
| Booking Marketplace (`ep-airbnb`)|15sections/11stages/5traces/5APIs/3labs/8questions|Local-date horizon/rules, quote expiry/consent, CDC regression versus missing changes|

Bốn bài đầu thuộc checkpoint45; ba bài cuối thuộc checkpoint48. Mỗi stage có diagram và problem/decision/tradeoff/nextPressure/exitCriteria. Traces có step playback; prose dùng cards/flows/tables theo nghĩa. Không copy code/prose bên ngoài; không thêm acknowledgements/references UI/README. English được biên tập cùng canonical pairs và manual runtime dictionary, build offline.

## Kiểm tra snapshot48

- Source:246files,0errors/warnings/hints;133unit tests đạt.
- Build+verify: **606pages,265084links/assets**,198courses,31topics,26cases. Localization thiếu0keys, không gọi online dịch.
- Checkout,Audio,Booking đều có dedicated VI/EN,11stages,keyboard,boundary cases,desktop/mobile và9theme accessibility pass. Generic mỗi bài2routes pass. Checkout regression chạy lại trên snapshot47 sau tăng readability mobile. Đã xem screenshots và chỉnh label/output spacing, balanced worker grid, calendar14nights vừa desktop và quote status gọn; sau chỉnh chạy lại dedicated suites tương ứng.
- Static IT Basic: **48bài/98HTML,1150internal links** pass. Browser6staticpagesVIEN của ba bài mới kiểm canonical headings/sections/stage transcripts/tables/diagrams/mobile/language; React labs chỉ AV Lore.
- Baseline full IT Basic còn49brokenlinks cũ ởAIindexes/JSchapter8, source giốngHEAD và ngoài diff. Không chạm `Test/Python/test.py`. Courses giữ baseline792viewport/30contrastchecks; lượt này không sửa courses.
- Logs `.cache/handbook-expansion/{checkout,audio,stay}-*` và `batch{46,47,48}-legacy-*`; reports/screenshots `artifacts/`. Persistent local trong repo, ignored, không `/tmp`. Staging đã dừng sau verified snapshot; main4322 tiếp tục phục vụ48.

## Tiếp theo

1. `ep-whatsapp` đã hoàn thành biên soạn/kiểm tra local49; tiếp tục Figma.
2. `ep-figma`, `ep-youtube`; sau đó14 AI entries bắt đầu`ai-kv-cache`, rồi8 Practice/Interview tools. `npm run content:audit` là danh sách chính xác.
3. Independent final review từng bài theo coverage/purpose, diễn giải tự nhiên Việt/English, formulas/units và failure/security assumptions. Không nâng complete bằng đếm blocks/tests. Framework còn cần product prompt/query mismatch review; Exchange có thể thêm regional DR/RPO.

## Source và cách tiếp tục

Canonical `src/content/handbook/*.json` là chuẩn; schema `src/lib/handbook-schema.ts`, catalog73 `src/lib/handbook-catalog.json`, renderer `src/components/HandbookLesson.astro`. Không rerun one-time creation helpers trong `.cache/handbook-expansion/authoring/` để overwrite bài đã chỉnh. Đặc biệt canonical Uber đã thêm technology table, Airbnb đã polish interview answers sau helper. Sửa trực tiếp JSON và giữ IDs.

Trước sửa tiếp đọc git status cả hai repo; giữ unrelated IT Basic/Test/Python/test.py. Không migrate, không tạo Astro trong IT Basic. Shared prose/flows/cards/table/API/diagram/stage transcripts sync bằng `python3 tools/sync-handbook.py` tại IT Basic; không fake React labs trong HTML.

AV Lore source/content cần check,test,build,verify và browser khi behavior/language/navigation đổi. Browser generic hỗ trợ `HANDBOOK_IDS`, `HANDBOOK_CONTENT_DIR`, `PREVIEW_URL`; range helper theo min/step; await island-ready và language-ready. Source model fixtures không là benchmark/production/security implementation.

Main4322 phục vụ `dist/`. Build ở `.cache/handbook-preview/`, chỉ rsync source lúc staging đã dừng và không test/build đang chạy. Đợi build+verify exit0 rồi start4323, đợi server ready/HTTP200 trước browser. Sau browser/screenshots pass, copy `_astro` trước rồi toàn dist + localization report về main; không `--delete` old assets. Dừng bằng `npx astro preview stop` tại stagingcwd, không main. Không mutate staging khi browser chạy.

Không auto Settings/secrets/workflows/PR; user hiện cho phép commit/push checkpoint và tiếp tục nhiều mục. Đừng final là hoàn tất khi73scope/review chưa xong. Progress local `plan.json`, `coverage.json` cùng folderignored; tracked handoff là file này.

## Checkpoint49: Private Messenger

`ep-whatsapp.json`:16sections/12stages/5traces/6APIs/3labs/8worked questions, Việt–Anh, statusreview. Labs kiểm durable per-device ACK/replay, active-sender/group-epoch envelope arithmetic và membership/key-holder boundary. Rotation không xóa observed plaintext history; private signing key không distribute cho recipients. E2EE/HSM/companion assumptions tách rõ, không real crypto implementation.

- Source250files0diagnostics;136tests đạt;608pages266562links/assets; localization0missing.
- Dedicated12stages/3labs/boundary scenarios/VIEN/keyboard/mobile/9themes và generic2routes đạt. Đã xem screenshots desktop/mobile.
- Static49bài/100HTML/1176links và2VIENbrowserpages đạt; không fake React labs.
- Main4322đã publish49; stagingđã dừng. NewFigma models/tests đang viết, chưa canonical/build/browser/static; không tính vào49.
- Figma research đã đọc full12stages và primarymultiplayer/journal/sharding/LiveGraph/plugin posts. Chú ý correction: Realms sandbox lịch sử đã đổi sang interpreter compiledtoWasm sau vulnerability; CDC có thể replay và không là globalorder acrossshards. Đừng ghi oldsourceoversimplifications thành guarantee.
