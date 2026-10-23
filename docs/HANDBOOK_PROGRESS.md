# Tiến độ System Design & AI

Cập nhật23/10/2026. Chủ sở hữu đã quay lại và yêu cầu tiếp tục. Chủ sở hữu yêu cầu commit/push các mốc đã kiểm tra rồi tiếp tục triển khai nhiều bài liên tiếp, không dừng xin xác nhận sau mỗi mục. Phạm vi73 bài/công cụ chưa hoàn tất.

## Trạng thái hiện tại

- **51/73 bài có nội dung Việt–Anh trong source**, gồm4 Foundations,8 Building Blocks,26 Case Studies,12 Build Stories và1 AI Systems. **51 bài đã build/browser local.**
- Tất cả51 bài `status: review`, **0 complete**. Build/tests/counts không thay vòng review độc lập về coverage, kỹ thuật, diễn giải/English và visual learning purposes.
- **22 mục chưa biên soạn**:14 AI Systems,3 Practice và5 Interview tools. Chưa bắt đầu AI tiếp theo.
- Main preview **http://127.0.0.1:4322/av-lore/** đã publish local51. Các bài `/episodes/ep-whatsapp/`, `/episodes/ep-figma/` có bản `/en/` tương ứng.
- Giữ198 chương/15 lộ trình,31 Notes & Interview topics, stable IDs, localStorage keys và9 themes. Không portfolio.

## Mốc đã push

- **HEAD hiện tại checkpoint49:** AV Lore `be7817b`, IT Basic `ff7e396`. Push thành công; Pages https://github.com/avpegnu/av-lore/actions/runs/39760389076 thành công, IT VPS https://github.com/avpegnu/it-basic/actions/runs/39760401575 failed. Phần Figma50/YouTube51 đang local, **chưa commit/push** theo yêu cầu tạm dừng mới nhất.

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

## Khi tiếp tục

1. Đọc mục tạm dừng cuối file: YouTube51 cần build/browser cuối; Figma50 đã validated/publish local. Source canonical là chuẩn, không rerun creation helpers.
2. Sau khi51validated, cập nhật handoff và thực hiện checkpoint commit/push theo yêu cầu lúc tiếp tục; chưa tự push trong lượt tạm dừng này.
3. Còn14AI bắt đầu`ai-kv-cache`, rồi8Practice/Interview tools. `npm run content:audit` là danh sách chính xác.
4. Independent final review từng bài theo coverage/purpose, diễn giải tự nhiên Việt/English, formulas/units và failure/security assumptions. Không nâng complete bằng đếm blocks/tests. Framework còn cần product prompt/query mismatch review; Exchange có thể thêm regional DR/RPO.

## Source và cách tiếp tục

Canonical `src/content/handbook/*.json` là chuẩn; schema `src/lib/handbook-schema.ts`, catalog73 `src/lib/handbook-catalog.json`, renderer `src/components/HandbookLesson.astro`. Không rerun one-time creation helpers trong `.cache/handbook-expansion/authoring/` để overwrite bài đã chỉnh. Đặc biệt canonical Uber đã thêm technology table, Airbnb đã polish interview answers sau helper. Sửa trực tiếp JSON và giữ IDs.

Trước sửa tiếp đọc git status cả hai repo; giữ unrelated IT Basic/Test/Python/test.py. Không migrate, không tạo Astro trong IT Basic. Shared prose/flows/cards/table/API/diagram/stage transcripts sync bằng `python3 tools/sync-handbook.py` tại IT Basic; không fake React labs trong HTML.

AV Lore source/content cần check,test,build,verify và browser khi behavior/language/navigation đổi. Browser generic hỗ trợ `HANDBOOK_IDS`, `HANDBOOK_CONTENT_DIR`, `PREVIEW_URL`; range helper theo min/step; await island-ready và language-ready. Source model fixtures không là benchmark/production/security implementation.

Main4322 phục vụ `dist/`. Build ở `.cache/handbook-preview/`, chỉ rsync source lúc staging đã dừng và không test/build đang chạy. Đợi build+verify exit0 rồi start4323, đợi server ready/HTTP200 trước browser. Sau browser/screenshots pass, copy `_astro` trước rồi toàn dist + localization report về main; không `--delete` old assets. Dừng bằng `npx astro preview stop` tại stagingcwd, không main. Không mutate staging khi browser chạy.

Không auto Settings/secrets/workflows/PR. Ngày23/10 chủ sở hữu đã resume. Tiếp tục nhiều phần, giữ quyền commit/push các checkpoint ổn định đã được cho phép; không push partial chưa validate. Mục tạm dừng22/10 ở dưới là lịch sử. Phạm vi73scope/review chưa xong. Progress local `plan.json`, `coverage.json` cùng folderignored; tracked handoff là file này.

## Checkpoint49: Private Messenger

`ep-whatsapp.json`:16sections/12stages/5traces/6APIs/3labs/8worked questions, Việt–Anh, statusreview. Labs kiểm durable per-device ACK/replay, active-sender/group-epoch envelope arithmetic và membership/key-holder boundary. Rotation không xóa observed plaintext history; private signing key không distribute cho recipients. E2EE/HSM/companion assumptions tách rõ, không real crypto implementation.

- Source250files0diagnostics;136tests đạt;608pages266562links/assets; localization0missing.
- Dedicated12stages/3labs/boundary scenarios/VIEN/keyboard/mobile/9themes và generic2routes đạt. Đã xem screenshots desktop/mobile.
- Static49bài/100HTML/1176links và2VIENbrowserpages đạt; không fake React labs.
- Main4322đã publish49; stagingđã dừng. NewFigma models/tests đang viết, chưa canonical/build/browser/static; không tính vào49.
- Figma research đã đọc full12stages và primarymultiplayer/journal/sharding/LiveGraph/plugin posts. Chú ý correction: Realms sandbox lịch sử đã đổi sang interpreter compiledtoWasm sau vulnerability; CDC có thể replay và không là globalorder acrossshards. Đừng ghi oldsourceoversimplifications thành guarantee.

## TẠM DỪNG theo yêu cầu chủ sở hữu — 22/10/2026

Yêu cầu cuối: không cần chốt nhanh; nếu chưa xong thì chưa cần commit/push, lưu tiến độ để mai làm tiếp. **Đã dừng implementation tại đây.** Source lưu trong hai repo trên ổ đĩa, tracked handoff là file này; không có file tiến độ duy nhất ở`/tmp`.

### Figma / Design Canvas — local50 đã kiểm tra

- `src/content/handbook/ep-figma.json`: **15 sections,12 stages,5 traces,6 API contracts,3 labs,8 worked questions**, bảnVI/EN, statusreview. Không phải16sections như một commentary trước đó ước lượng.
- Source mới:`src/lib/design-canvas-models.ts`, `tests/design-canvas-models.test.ts`, `src/components/DesignCanvasPlayground.tsx`, `scripts/design-browser-check.mjs`; schema/renderer/CSS/dictionary/package đã nối.
- Labs: property patches vs stale whole-object replacement và latest-pending ACK; snapshot3+durable-prefix3..6 với journal gap4; metadata v10 refill sau invalidation v11, generation guard và supplied verified barrier.
- Check255files0diagnostics;139tests; final50build/verify **610pages268042links/assets**, localization0missing. Dedicated12stages/3labs/VIEN/mobile/keyboard/9themes và generic2routes/static2pages pass. Đã xem screenshots desktop/mobile.
- Dedicated đầu phát hiện aria-label trên generic div; đã sửa `role=img`, tăng labels12px, rebuild/verify và chạy lại dedicated đạt. Logs`design-last-build.log`,`design-last-verify.log`,`design-final-browser.log`; screenshots`artifacts/design-*`.
- Main preview4322 đang phục vụ50:`http://127.0.0.1:4322/av-lore/episodes/ep-figma/` và`/en/episodes/ep-figma/`. Đã copy validateddist; staging4323 đã dừng.

### YouTube / Creator Video — source51, còn kiểm tra cuối

- `src/content/handbook/ep-youtube.json`: **14 sections,13 stages,5 traces,6 APIs,3 labs,8 worked questions**, VI/EN, statusreview. Bao gồm resumable source/lifecycle, baseline/enhancements/rights gates, tiny thumbnails, replicas/sharding/proxy, live, codec economics, retrieval/ranking, ISP caches, Shorts và accelerator decisions.
- Files mới:`src/lib/creator-video-models.ts`, `tests/creator-video-models.test.ts`, `src/components/CreatorVideoPlayground.tsx`, `scripts/creator-browser-check.mjs`; đã nối schema/renderer/CSS/dictionary/package.
- Sourcecheck258files0diagnostics và **142tests đạt** (`creator-final-check.log`,`creator-last-unit.log`). Lượt test cũ có float equality failure đã sửa tolerance; tiếp theo schema chưa registered từng fail trước khi wiring; latest142đã pass. `node --check scripts/creator-browser-check.mjs` pass, chưa chạy browser script.
- Runtime dictionary manually authored trong`src/i18n/en-overrides.json`; collector`creator-missing.json` thiếu0 trước polish typography/table labels. Sau polish chỉ canonicalpairs đổi, cần build offline xác nhận cuối.
- **Chưa `npm run build`/`verify` cho51, chưa dedicated/generic browser, chưa screenshot/9theme review củaYouTube.** Không lấy số142tests hoặc authorcount làm complete.
- Stagingsource đã rsync51 tại`.cache/handbook-preview/`, nhưng **stagingdist vẫn50**, server4323stopped. Maindist cũng50. Đừng nhầmsource51vớibuilt51.
- IT Basic đã sync51bằng`python3 tools/sync-handbook.py`: **104HTML/1226internal links pass**. Static browser mới chỉ Figma, script4pagesFigma+YouTube đã chuẩn bị`.cache/handbook-expansion/batch51-legacy-browser.mjs` nhưng chưa chạy. React labs chỉ AVLore.

### Expected lab scenarios để tiếp tục kiểm tra51

1. Retrieval default6candidates/mixedsources/2slots:75%eligibleoracle recall; single-source0%;16candidates1slot vượt30ms,8slots đạt. Blockedv03 không show dùutility100. Oracle là top4eligiblefixture, không claim production có toàn tri. Fixedbatchlatency là giả định.
2. Codec default20kviews/100%compatible/3min/1Mbpssaved/$12encode/1monthstorage:450GB,$15cost,$3net,break-even16667views.50%compatible net−$6;0%NONE;12months net−$30. DecimalGB,storage$3/month,egress$0.04/GB đều synthetic.
3. Prefetch defaultdepth3,next1,3.2Mbps,window2s,watched2s:spare2Mbps,0.5MBprefetched,0.3useful,0.2wasted,startup80ms.Chooseclip5:cold830ms,waste0.5MB. Watch0.5s:waste0.425MB. Depth0no transfer;link1Mbpsspare0 và currentbitrate1.2Mbpskhôngsustain. Prefixpartialreuse và afteronechoice discardothers là assumptions explicit.

### Lệnh bắt đầu lại

Đọc gitstatus/AGENTS hai repo và giữ unrelated`IT Basic/Test/Python/test.py`. Không migrate, không rerun author helpers (canonical đã polish/contextualize sauhelper), không overwrite source từ staging.

Tại AVLore, kiểm source hiện tại rồi build stage51 (đã stopped và sourcecopy51):

```sh
npm run check
npm test
cd .cache/handbook-preview
npm run build > ../handbook-expansion/creator-build.log 2>&1
npm run verify > ../handbook-expansion/creator-verify.log 2>&1
npm run preview -- --port 4323
```

Đợi build+verify **exit0**, serverready/HTTP200; tại root AVLore chạy dedicated`PREVIEW_URL=http://127.0.0.1:4323/av-lore node scripts/creator-browser-check.mjs`, generic`HANDBOOK_IDS=ep-youtube HANDBOOK_CONTENT_DIR=<absolute stagecontentdir> PREVIEW_URL=... node scripts/handbook-browser-check.mjs`, static4pages script ở trên. Xem screenshot desktop/mobile bằngimageviewer. SaufixUI cần rerun phù hợp; stage mutations chỉ khi server stopped và không build/browseractive. Nếu source đổi saucopy thì rsync trướcbuild đúng exclusions, không chépnode_modules/dist/cache/artifacts/env/git.

Saupass: copy`dist/_astro`trước rồi allstage dist +localizationreport vềmain, không`--delete`; stopstage bằng`npx astro preview stop`tại stagecwd. Update doc/plan/coverage actualresults. Chưa đẩy Figma/YouTube lênGitHub trong lượt này; khi resume theo yêu cầu chủ sở hữu mới chốt checkpoint ổn định.

Mainpreview nếu đã tắt sau shutdown có thể restart tại rootAVLore:`npm run preview -- --port 4322`để xem snapshot50đã build. File progress/source đều nằm trongrepo local, khôngtmp. Remaining22unwritten+finalindependentreview51vẫn cần làm.

## Tiếp tục23/10: checkpoint51 đã kiểm tra

- Chủ sở hữu: “Tôi quay lại rồi đây, tiếp tục nhé”. Đã đọcstatus/AGENTS hai repo, giữ unrelatedITBasic/Test/Python/test.py.
- YouTube51 đã qua sourcecheck259files0diagnostics,142tests,build/verify **612pages269522links/assets**, localization0missing; dedicated13stages/3labs/VIEN/keyboard/mobile/9themes và generic2routes pass. Đã xem screenshot desktop/mobile.
- StaticFigma+YouTube4VIENpages pass; shared51static104HTML1226links đã kiểm. Main4322publish51, staging4323stopped. Logs`resume51-*`,`creator-{build,verify,browser,generic-browser}.log`,`batch51-legacy-browser.log`; screenshots/reports`artifacts/creator-*`.
- Checkpoint51Figma+YouTube chuẩn bị commit/push stable. Còn22mục chưa author và final independentreview;0complete. Tiếp theo`ai-kv-cache`. Đã đọc full referencechapter+allocator model và primary PagedAttention/GQA/GPTQ/AWQ/Transformerscache/vLLMprefix+quantizedKV docs. Sourceoversimplifications cần sửa: full causal KVformula có kiến trúc điều kiện, perrankTPreplication, cachedprefix không xóa decode/newtail work, quantization không universal speedup/near-lossless.
