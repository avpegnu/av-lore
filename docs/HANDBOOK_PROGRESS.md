# Tiến độ System Design & AI

Cập nhật23/10/2026. Chủ sở hữu đã quay lại và yêu cầu tiếp tục. Chủ sở hữu yêu cầu commit/push các mốc đã kiểm tra rồi tiếp tục triển khai nhiều bài liên tiếp, không dừng xin xác nhận sau mỗi mục. Phạm vi73 bài/công cụ chưa hoàn tất.

## Trạng thái hiện tại

- **66/73 bài có nội dung Việt–Anh**, gồm 4 Foundations, 8 Building Blocks, 26 Case Studies, 12 Build Stories,15 AI Systems và1Practice. **66 bài đã build và kiểm tra browser local.**
- Tất cả 66 bài `status: review`, **0 complete**. Còn vòng đối chiếu độc lập về độ phủ, kỹ thuật, diễn giải/English và mục đích của hình/tương tác; tests/counts không thay vòng review.
- **7 mục chưa biên soạn**: 2 Practice và 5 Interview tools. `review`67 có models/tests/deck builder/UI local nhưng chưa canonical/wiring/runtimeEnglish/build/browser.
- Main preview **http://127.0.0.1:4322/av-lore/** đã publish local66. Các bài mới `/ai-systems/ai-rag/`, `/ai-systems/ai-fine-tuning/`, `/ai-systems/ai-evals/`, `/ai-systems/ai-agents/`, `/ai-systems/ai-production/`, `/ai-systems/ai-safety/`, `/ai-systems/ai-case-rag/` và bản `/en/` tương ứng.
- Giữ 198 chương/15 lộ trình, 31 Notes & Interview topics, stable IDs, localStorage keys và 9 themes. Không portfolio.

## Mốc đã push

- **Checkpoint51 đã push:** AV Lore `5b4043d`, IT Basic `c957138`. Pages https://github.com/avpegnu/av-lore/actions/runs/39882720793 thành công; IT VPS https://github.com/avpegnu/it-basic/actions/runs/39882722183 failed. Checkpoint52–54 đã push AV Lore `a5015af`, IT Basic `baba703`; Pages39885948851 thành công, IT VPS39885950249 failed. Nội dung ai-serving55 đang phát triển local.

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

## Local52: KV Cache — đã publish local

`ai-kv-cache.json`:15sections,5traces,4labs,8workedquestions, VI/ENstatusreview. Per-rank denseKV/quantizedweightscale arithmetic, TPheadreplication, pagedcurrentvsfutureallocation, full-prefixsecurity/contextidentity, samplingforkCOW và roundtripoffloadvsrecompute. Không claim benchmark/security implementation.

-262sourcefiles0diagnostics,147tests;614pages271006links/assets,localization0missing. Dedicated4labs/VIEN/keyboard/mobile/9themes và generic2routes pass; đã xem desktop/mobile screenshot. Dedicated đầu chỉ fail screenshotlocator vìprefixcó2dl, đã sửaselector và rerunpassed, không cheUIbug.
-Static52lessons106HTML1248links và2VIENpages pass. Main4322publish52,stage4323stopped. `scripts/kv-cache-browser-check.mjs`, reports/screenshots`artifacts/kv-cache-*`,logs`kv-cache-*`.
-Checkpoint51đãpush: AVLore`5b4043d`, ITBasic`c957138`; Pages39882720793success, ITVPS39882722183failed. Chưapushlocal52. Giữ workflows/settings/secrets.
-Tiếp theo`ai-batching`: fullreferencechapter/modelđãđọc, primaryOrca/Sarathi-Serve/DistServe/speculativepapers và exactsamplingalgorithm/methodsđãđốichiếu. Added`llm-scheduling-models.ts`/tests local, chưaUI/canonical/dictionary/browser/static. Models: chunked-prefilltradeoff/starvation, exactone-positionresidualprobabilitymass, gamma/verificationcost/memorybudget, splitpoolKVhandoffTTFT/TPOT. Chưa tính vào52.

## Local53: Batching & Speculative Decoding — đã publish local

`ai-batching.json`:14sections,5traces,4labs,8workedquestions, VI/ENstatusreview. Static/dynamic/continuous membership; chunkedprefill/fairness; splitpoolKVhandoff; exact residual sampling, limits/rollback; expectedcost/memory và adaptivepolicy. Mô hình minh họa, không benchmark.

-266sourcefiles0diagnostics,151tests;616pages272494links/assets,localization0missing. Dedicated4labs/VIEN/keyboard/mobile/9themes và generic2routes pass; đã xem screenshots desktop/mobile. Static53:108HTML1272links và2VIENbrowserpages pass.
-Main4322publish53;stage4323stopped. Logs `batch-schedule-*`, `batch53-legacy-browser.log`; scripts`batch-schedule-browser-check.mjs`; screenshots`artifacts/batch-schedule-*`. Chưa push52/53.
-Tiếp theo `ai-parallelism`: đã đọc fullchapter; research Megatron/GPipe/SPvsCP/MoE. Cần mô phỏng placement/failure domain, collective cost, pipeline utilization và expert routing/replication/capacity; không nhầm active weights với resident weights, không coi drop/reroute là bảo toàn semantics. Còn12AI+8tools chưa author;0complete.

## Local54: Parallelism & MoE — đã publish local

`ai-parallelism.json`:15sections,5traces,3labs,8workedquestions, VI/ENstatusreview. DP/TP/PP/SPvsCP/EP; perrankmemory/ringcollectivecost; actualplacement/failure-domain map; forward-onlypipeline recurrence; MoEweightinventory/dispatch/skew/copies/capacity; fleetreadiness/drain/recovery và workedcapacitybudgets. Không hardwarebenchmark hoặc productionplanner.

-271sourcefiles0diagnostics,155tests;618pages273988links/assets,localization0missing. Dedicated3labs/VIEN/keyboard/mobile/9themes, generic2routes và static2pages pass; screenshots desktop/mobile đã xem. Static54lessons110HTML1296links pass.
-Dedicated đầu scenario pass nhưng axe harness lỗi vìbrowser.newPage; sửa explicitbrowser.newContext/newPage rồi chạy lại dedicatedpass. Không sửa app để bỏ qua check. Test/logs `parallel-*`; screenshots/reports`artifacts/parallel-*`.
-Main4322publish54;stage4323stopped. Chuẩn bị checkpoint52–54 stable, chưa hoàn thành scope. Còn11AI+8Practice/Interview chưa author; toàn bộ54bài vẫnstatusreview,0complete.
-Tiếp theo`ai-serving`: fullchapter+cascade model đã đọc; primarycurrentvLLMLoRA/OpenAIcompatible, SGLang, TensorRT-LLM, Triton, TGImaintenanceREADME, llama.cpp, S-LoRA/Punica/RouteLLM đã kiểm. Corrections: engine/server-layer taxonomy overlapping; APIcompatibility không fullsemanticparity; schema validation không semanticconfidence; fallback có thể làm đáp án đúng thành sai; costformula cần3600 và không double utilization; arbitraryfullfinetunes không tự thànhLoRA; adapterauth/revision/pinning/cacheidentity phải rõ.

## Checkpoint54 đã push / local55 đang phát triển

- AV Lore `a5015af`, IT Basic `baba703` push thành công. Pages https://github.com/avpegnu/av-lore/actions/runs/39885948851 success; ITVPS https://github.com/avpegnu/it-basic/actions/runs/39885950249 failed. Không đổi Settings/workflow/secrets; không suy deploy từ push.
- `ai-serving.json` source55 đã author15sections/5traces/5internalAPIs/3labs/8workedquestions, VIENstatusreview. `serving-stack-models.ts` và tests/UI đã có: jointoutcomescascade (falseescalation có thể regression), compatibleadapterauth/base/pinned eviction, wholewindowvsbusycostvàSLOdenominator. Chưa build/browser/verify55; main vẫn54.
- Primaryengine/LoRA/routerdocs đã đọc; chưa gọi online translator. Bản English/runtime mappings biên tập tay. Cần hoàn tất validation, syncstatic, screenshots và cập nhật actualprogress trước tính55validated.

## Local55: Serving Stacks & Model Routing — đã publish local

`ai-serving.json`:15sections/5traces/5internalAPIs/3labs/8workedquestions, VIENstatusreview. Engineevaluation/capabilitycontracts, compatiblemultiLoRA, auth/base/pin-awareadmission, jointoutcomescascade, streamingcommit/sideeffects, wholewindowcost/SLOdenominators và fleetplanning. Primaryprojectcapabilities kiểm23/10/2026; không benchmark/không providerpricing.

-275sourcefiles0diagnostics159tests;620pages275488links/assets,localization0missing. Dedicated3labs/VIEN/keyboard/mobile/9themes và generic4routes(ai-serving+ai-parallelism)pass; prosepolishspacing xong rebuild/verify, rerun dedicated+generic2routes/static2pagespass. Đã xem desktop/mobile screenshots.
-Static55:112HTML1322internal links. Main4322publish55;stage4323stopped. Logs`serving-stack-{polish-build,polish-verify,final-browser,final-generic-browser,final-legacy-browser}.log`; screenshots`artifacts/serving-stack-*`. Local55 chưa push; checkpoint54 vẫnGitHubHEAD.
-Tiếp theo56`ai-prompting`: fullchapter/toymodel và primaryRFC/JSONSchema/XGrammar/vLLM/fewshot/CoT/guidedgeneration đã đọc. `prompt-contract-models.ts`, tests4passed và unwired`PromptContractPlayground.tsx` local. Chưa canonical/schema/renderer/CSS/dictionary/browserscript/static/build56. Models: six-string prefix masks với multigrammar-boundary pieces và EOS/truncation; parse/schema/trusted-source ladder; close-ticket auth/version/blockers/atomicreceipt-idempotency. Không generalgrammarcompiler, tokenizer, JSONschemalibrary hoặc securityimplementation. Cần hoàn thiện rồi validate; không rerun author55 vì canonical đã polish sau helper.

## Local56 đang kiểm tra cuối — Prompting & Structured Output

- Canonical`ai-prompting.json`:14sections/5traces/3labs/8workedquestions, VIENstatusreview. Đã nối schema/renderer/CSS/dictionary/package và `prompt-contract-browser-check.mjs`. Không rerun creation helper: canonical đã polish number spacing trực tiếp.
- Sourcecheck latest279files0diagnostics,163tests. Build/verify đầu56:622pages276984links,localization0missing; dedicated3labs/VIENkeyboard/mobile9themes và generic2routes/static2pages pass. Static56:114HTML1342links. Screenshots desktop/mobile đã xem.
- Sau screenshot review đã đổi generic stepper/result/reset labels sang VI đúng UI và dictionaryEN tương ứng. Finalbuild/verify đang chạy `.cache/handbook-preview/`, logs`prompt-final-{build,verify}.log`; session80938 nếu còn. Stage server4323stopped. Main4322vẫn55; **chưa publish56 sau polish**, cần đợi exit0, startstage, rerun dedicated+generic và screenshots cuối rồi publish. Không nhầm first pass với final build.
- Models use six exact strings, vocab25; defaultmasked output`{"status":"ok","count":0}`5steps inclEOS, stepbudget2LIMIT, free`Sure!`2stepsEOS. Validation defaultsemanticmismatch; presetsparse/schema/refusal/incomplete. Tooldefaultatomiccommit+lostresponse, samekeyreplay1effect, changedargsKEY_MISMATCH, newkeystaleVERSION_CONFLICT; auth/businessgates độc lập. Fixed toy logits để free greedy choice đúng highestscore; tests validate that.
- RAG57 research: đã đọc fullchapter, retrievalmodel vàANNdemo; primaryRAG2005.11401,HNSW1603.09320,FaissIVF+memorydocs,RRF2009,BM25review,reranker1901.04085,HyDE2212.10496,LostMiddle2307.03172,Anthropiccontextualretrieval,Azurefilterdocs. Chưa57source. Corrections: retrievalmiss không mặc định là phần lớn mọi lỗi; ANNrecall vs relevance khác nhau; exactscan không luôn quá chậm; metric/normalization/encoderpair phải hợp training; reembedding compatibility needsmeasured migration; postfilter không tự noleaks nếu unauthorized content đi reranker/log/provider; querytimeACL+freshfetch/revalidation/cache scope; no automaticbest reranker/hybrid/longcontext thresholds.

## Local56 đã hoàn tất validation và publish local

- Finalpolish sourcecheck279files0diagnostics,163tests; finalbuild/verify622pages276984links/assets,localization0missing. Dedicated3labs/VIENkeyboard/mobile9themes và generic2routes pass sau UIlabelsVI/ENpolish; screenshots đã xem. Shared static114HTML1342links/static2pagespass.
- Main4322publish56;stage4323stopped. Logs`prompt-final-*`; screenshots`artifacts/prompt-contract-*`. Source55+56 ổn định chuẩn bị checkpoint, toàn bộ56vẫnstatusreview/0complete. Còn9AI+8tools chưa author rồi independentreview.
- RAG57 mới có `rag-learning-models.ts`, `tests/rag-learning-models.test.ts`4tests pass; **chưa UI/canonical/schema/dictionary/browser/static/build57**. Fused fixedlists8docs với eligible/relevance annotations, candidateceiling/rerank và filterstarvation; actual48-point2DIVF/nprobe/exacttop4 comparisons, payloadmemory + PQcodebooks; generation4 latebuild so generation5 current/delete, finalquerypermissionguard. Không fabricated latency/recall curves; rerank outputs precomputedfixture không realneuralmodel. Không commit source57 partial cùng checkpoint56.

## Checkpoint56 đã push; RAG57 đang triển khai

- AVLore`dd8b06e`, ITBasic`ad13dd3` push thành công. Pages https://github.com/avpegnu/av-lore/actions/runs/39887995834 success; ITVPS https://github.com/avpegnu/it-basic/actions/runs/39887996784 failed. Không thay workflows/settings/secrets. Mainlocal4322vẫnvalidated56; stage4323stopped.
- RAG57 có models4tests và unwired`RagLearningPlayground.tsx` + scopedCSS. WIPcheck282files0diagnostics167tests. SVGIVF vừa bọc scrollregionkeyboard-friendly với minwidth560 để labels không co quá nhỏ trên mobile; chưa browser test. Chưa canonical/schema/renderer/dictionary/browserscript/static57. Không tính167tests là57completed.
- Lab1fixedrankedlists8chunks,2relevant, precomputedreranks; default hybriddepth3reranktrue givesOPS+RECOVERY recall1; rerankoffrecall.5; lexicalcandidateceiling.5; latedepth1emptyafterineligiblePRIVATE removed.
- Lab2actual48points/6cells/2D, queriesx/y,nprobe, exacttop4. Memory worksheet riêng(N=1M,d768,m96,bits8): flat3.08e9B, PQpayload104e6B +codebooks786432B, optionaloriginals. NoPQdistance simulation/latency curve.
- Lab3generation4latejob vs source5update/delete, publicationguard và finalqueryACL/deleteguard; queryguardkhông tự sửa stalebody. Defaultdelete/guardsbothtrue→NONEindex/NOvisible; disablepublicationguardresurrectsv4nhưng finalqueryguardstillblocks; disablebothleaks. SeparateACLrevocationcanstaleevenmatchingcontentversion.

## RAG57: đã authored, đang kiểm final visual polish

- `ai-rag.json`:17sections/5traces/4internalAPIs/3labs/8workedquestions, VIENstatusreview. Added embedding/funnel/access flows, ANNvsrelevancemetrics table, chunk/longcontext cards; giữ technical coverage và diagrams. Canonical đã polish saucreationhelper; đừng rerun author.
- Sourcecheck283files0diagnostics167tests trước WIP58. Build624pages278494links/assets,localization0missing. Shared57:116HTML1366links/static2pages pass. Main4322vẫn56.
- Firstunitrun caught wrongrelatedtopicsearch-data→fixedstorage-search. First staticbrowserasserttablecount chưa có table; sau visualpolish thêm relevantmetricscomparison table và flows/cards rồistaticpass. Builddictionarycaught ambiguous “Không chứng minh”→contextualized newheader“Metric chưa chứng minh điều gì?”; unambiguous37716keys verified.
- Browser caught real React418 ởSVG point title mixedtextnodes; dev4324 reproduced specificdiff, fixed singletemplate-string title, rerun devnoerrors. Dev4324đãstop. Rebuild`rag-fixed-*`: dedicated3labsVIEN/keyboard/mobile9themes +generic2routes pass và screenshotsđãxem. Không suppresspageerrors.
- Sau visualreview tăng fontrowheaders, moveCcelllabels ra corner, thêm coordinateaxes và đổi labh3 thành outcome-oriented“Probe thêm cells…”. Currentstage sourcecopy gồm final57 +unwired58models/tests, đang build/verify `rag-visual-{build,verify}.log`session75133; stage4323stopped. Cần đợiexit0,startstage,rerun dedicated/generic,screenshots final rồipublish57main. Rootcheck/test`rag-visual-*`session4753 nếu còn. Khôngpublishpreviousdist vìfinalvisualsourceđãđổi.
-58research/fullchapter+wizard/calculator/modelread; primaryLoRA/QLoRA/DPO methods và distillation/InstructGPT, PEFTquantization/LoRAdocsđãđọc. `fine-tune-models.ts` vàtests4passed local, chưa UI/canonical/wiring/dictionary/browser/static58. Modelsinventory: hypothetical8B/70B shapes,GQAwidth1024, LoRA targetcount, 12/16bytestrainablestate, explicit4bitmetadata(2Bscale/128w), suppliedruntimeGiB; nonrigid evidence-driven experiment choices; distillationTCOsetup/monthlyops/fallback costs. Đừng commit58partial cùng57.

## Snapshot tiếp tục — finalRAGvisual đang browser test,58UI đã có

- `rag-visual-build/verify` exit0:624pages278494links/assets,localization0missing; source285files0diagnostics171tests gồm58models4tests uncommitted. 57release riêng có167tests,58chưa author.
- Stage4323đangRUNNINGpid95936 phục vụfinal57. Dedicated`rag-visual-browser.log`session29275 và generic`rag-visual-generic-browser.log`session4186 đang chạy hoặc vừa xong. Đợi exit0, xem final screenshots (celllabels góc +axes+tablefont), publishstage→main rồistopstage trước sourcecopy mới. Main4322vẫn56. No ongoingbuild.
-58 `FineTunePlayground.tsx` đã tạo, scopedCSS có tronghandbook.css; **chưa schema/renderer/canonical/dictionary/browserscript/static/build58**. Three kinds` tune-plan,tune-budget,tune-cost` (actual strings không có leading space). Evidence-led experiment flags/labels; LoRAtargetq/vdefault rank16 mastertrue runtime8GiB cap24GiB với2hypotheticalshapes; TCOdaily100Kteacher$4/1kstudent$.8/1kfback10%setup2400ops300. Unwired source cần check/synckhi canonicalready; globalruntimecollector sẽ scan58UI ở build sau.
-Checkpoint56GitHubHEADdd8b06e/ad13dd3successPages39887995834. RAG57local chưa commit; giữunrelatedITBasic/Test/Python/test.py. Nếu commit57 phải loại58UI/models/tests và58-onlyCSS để không pushpartial. Tốt hơn batch57+58khi58validate xong; chưa cần push57ngay.

## RAG57 final đã validate/publish local

- Final`rag-visual-build/verify`exit0:624pages278494links/assets,localization0missing. Dedicated3labs/VIENkeyboard/mobile9themes và generic2routes finalpass sau tooltip/visual fixes; final screenshots đã xem. Main4322publish57;stage4323stopped. Static57:116HTML1366links và2VIENbrowserpagespass. Root171tests includes58models4;57release tests167,58chưa author.
- 57canonical17sections/5traces/4APIs/3labs/8Qs và additionalflows/cards/table. All57statusreview,0complete. Chưa push57; checkpoint56GitHubHEAD. RAGsourceheadertranslation“Metric chưa chứng minh điều gì?” tránh globalkeyambiguity; relatedtopicstorage-search valid. SVGpointtitle dùng one template string để không hydration418; đừng regress thành split JSX text trongtitle.
-58unwiredUI/models/tests/CSS local; cần authorcanonicalVIEN, schema+renderer, dictionary, browserscript/package, syncstatic, check/test/build/verify và browser/screenshots. Không copy stage source over root. Không rerun57authorcreationhelpers vì đãpolishvisually/spacing/metadata.

## Local58: Fine-tuning Decisions — đã validate và publish local

- Canonical `ai-fine-tuning.json`: 16 sections, 5 traces, 3 internal APIs, 3 labs, 8 câu có giải thích; Việt–Anh, status review. Nội dung về lựa chọn adaptation theo evidence, dataset/provenance/splits, SFT/masks, LoRA/GQA, explicit training-state assumptions, QLoRA, distillation, RLHF/DPO, serving, base upgrades và regressions/privacy.
- Ba labs: evidence/prerequisite decision aid; LoRA matrix-specific counts + supplied memory budget; student-first TCO/fallback/setup/ongoing operations. Không chạy training thật, không dự đoán quality hoặc measured peak memory và không dùng giá provider.
- Check trước WIP59: 286 source files/0 diagnostics, 171 tests. Final build/verify 626 pages, 280004 links/assets, localization 0 missing. Dedicated 3 labs/VI–EN/keyboard/mobile/9 themes, generic 2 routes và static 2 pages pass; đã xem desktop/mobile screenshots. Shared static: 118 HTML/1388 internal links.
- Build đầu bắt 4 SSR matrix strings thiếu identity dictionary; thêm các shape strings, sửa NF4/FP32 spacing và rebuild thành công. Không gọi dịch vụ dịch online. Logs `fine-tune-final-{build,verify,check,unit}.log`, `fine-tune-{browser,generic-browser}.log`; screenshots/report `artifacts/fine-tune-*`.
- Main4322 publish58; stage4323 stopped. RAG57 + Fine-tuning58 chuẩn bị checkpoint; toàn bộ vẫn review/0 complete.
- `ai-evals`59: full chapter + judge/harness demos đã đọc, đối chiếu primary judge-bias papers, Wilson intervals, paired bootstrap documentation. Models/tests mới có: paired case resampling (degenerate warning), exact order/accuracy probabilities with unresolved mass, gates rejecting slice/privacy regressions or missing evidence. Chưa UI/canonical/schema/dictionary/browser/build59; không commit partial59 cùng checkpoint58.

## Checkpoint58 đã push; Evaluation59 đã validate local

- AV Lore `f4aa167`, IT Basic `f9fa25b` push thành công. Pages https://github.com/avpegnu/av-lore/actions/runs/39890767270 success; IT VPS https://github.com/avpegnu/it-basic/actions/runs/39890768695 failed. Không chỉnh Settings/workflow/secrets; preserve unrelated Test/Python/test.py.
- `ai-evals.json`: 16 sections/5 traces/3 internal APIs/3 labs/8 worked questions; Việt–Anh, review. Dataset/split/provenance, deterministic/reference/judge/human metrics, RAG/agent outcomes, calibration/order bias, paired bootstrap, Wilson, clustering/degeneracy, multiplicity/power, evidence gates, online experiments, traces/privacy và ownership.
- 291 source files/0 diagnostics; 175 tests. Build/verify 628 pages/281518 links/assets; localization0missing. Dedicated 3labs VIEN/keyboard/mobile9themes và generic2routes/static2pages pass; screenshots desktop/mobile đã xem. Static59:120HTML1410links. Main4322publish59;stage4323stopped.
- First unit run caught invalid visual icon names, replaced with established schema icons. First dedicated harness failed ambiguous role=status (range output also has status role); selector narrowed to p[role=status], rerun passed. Không suppress app errors. Logs `evaluation-{build,verify,final-check,final-unit,final-browser,generic-browser,legacy-browser}.log`; screenshots/report `artifacts/evaluation-*`.
- 59 chưa commit/push; GitHub HEAD vẫn checkpoint58. Canonical đã sửa icon sau author helper: không rerun creation helper. Next60 full reference + demo đã đọc, primary ReAct/Toolformer, workflow/agents, checkpoint/replay/durability và MCP security đã kiểm. Corrections: checkpoint-after-tool không tự exactly-once; reads cũng có auth/privacy/cost; approvals bind exact payload/principal/expiry; model memory là context+external state, không khẳng định mọi API stateless; growth quadratic chỉ dưới full-history assumptions; approval waits vẫn storage/operations cost; MCP interoperability không là trust boundary.

## Local60: Agents & Tool Use — đã validate/publish local

- `ai-agents.json`:17sections/5traces/4internalAPIs/3labs/8workedquestions; VIENstatusreview. Workflow/agent/hybrid, tool semantics, auth/business/prompt-injection boundaries, action-bound approvals, durable intent/receipts, cancellation, budgets/concurrent admission, memory/context, MCP, coordination và trajectory/outcome evals.
- Model loop reserves before turns; pending/rejected/current auth independent; post-write budget stop retains committed effect. Lost-response fixture requires persisted intent identity AND atomic sink receipt/dedup; cancellation does not undo prior effects. Context worksheet computes full/window input inventories, no fabricated pricing/latency/quality.
- Release60check295files0diagnostics179tests. Finalbuild/verify630pages283040links/assets,localization0missing. Dedicated3labsVIENkeyboard/mobile9themes và generic2routes finalpass sau sliderlabelgap polish; screenshots desktop/mobile đã xem. Static60:122HTML1434links/static2pagespass. Main4322publish60;stage4323stopped.
- First unit run caught invalid prerequisite queues-streams→messaging, fixed before build. Logs `agent-final-{build,verify,check,unit,browser,generic-browser}.log`, static`agent-legacy-browser.log`;screenshots/report`artifacts/agent-runtime-*`. All60review/0complete;13unwritten.
- Next61: fullchapter/costdemo/model đọc; primary WHATWG SSE, AWSretry/backoff, prompt-prefixcache và currentOTelGenAIrepo checked. `production-app-models.ts` +4tests mới có local, chưaUI/canonical/wiring/CSS/dictionary/browser/static/build61. Models: synthetic stream with heartbeat vs first-content timeout, explicit generation restart vs unsafe splice, cancellation unconfirmed usage; exact/semantic cache fixture with tenant/dependency/current ACL guards and false-positive intent; conditional-hit inventory + prefix-read input discount + output/embedding costs/falsehits. Giá là fictional assumptions, không marketpricing hoặclatencybenchmark. Không commit partial61 cùng checkpoint60.

## Checkpoint60 đã push; local61 Production LLM Apps đã validate

- AV Lore `8d2cdf6`, IT Basic `4028f1e` push thành công; Pages https://github.com/avpegnu/av-lore/actions/runs/39892533340 success; IT VPS https://github.com/avpegnu/it-basic/actions/runs/39892535010 failed. Không chỉnh workflow/settings/secrets; unrelated Test/Python/test.py giữ nguyên.
- `ai-production.json`:17sections/5traces/3labs/3internalAPIs/8workedquestions, VIENstatusreview. App/gateway boundaries, first-content vs transport events, SSE framing/reconnect, partial-output commits, exact/semantic/prefix caching, dependency/permission invalidation, conditional cost inventory, request/token/concurrency/spend quotas, retry amplification, routing/fallback qualification, cancellation/backpressure, telemetry, rollout và data lifecycle.
- Release61check299files0diagnostics183tests. Finalbuild/verify632pages284568links/assets/localization0missing. Dedicated3labsVIEN/keyboard/mobile9themes và generic2routes finalpass sau mobile long-state full-row polish; desktop/mobile screenshots đã xem. Static61:124HTML1460links/static2pagespass. Main4322publish61;stage4323stopped.
- First unit run caught relatedtopic caching→cache, fixed before build. Canonical đã sửa metadata sau author helper; không rerun creation helper. Logs `production-{final-build,final-verify,polish-check,polish-unit,final-browser,final-generic-browser,legacy-browser}.log`; screenshots/report`artifacts/production-app-*`. Chưa push61.
- Next62 `ai-safety`: fullreferencechapter+demo/model đã đọc, primary OWASP selectedrisk pages, indirectinjection/spotlighting papers và XSS/SSRF methods đã kiểm. Corrections: direct injections can cross tenant/global boundaries, not just attacker session; code controls need correct implementation/config, not universal alwayshold; model can leak training/prior state as well as currentcontext; capability/data/egress separation bounds specific paths, not proof allrisksgone; consistency/delimiters/moderation not guaranteedsecurity; dualLLM can reintroduce taint through free-text summaries; currentACL before prompt/rerank/cache matters; publicshare caches possible under explicit scope.
- Local62 `ai-security-models.ts` +4tests passed only, **chưaUI/canonical/schema/dictionary/browser/static/build62**. Threefixtures: independent tool/image disclosure paths with manually assumed model-following behavior; parsed exact-host vs connection/redirect destination boundaries (noDNS/network); moderation confusionmatrix/conditionalrates/prevalencePPV, not realclassifier. Source/toggles don't execute malicious strings/network. Không commit partial62 cùng61.

## Snapshot tiếp tục62 — UI chưa nối vào bài

- Checkpoint61 push thành công: AV Lore `2c03b0d`, IT Basic `0df0905`; CI chưa kiểm sau push. Main4322validated61; stage4323stopped. Không đổi unrelated ITBasic/Test/Python/test.py.
- `AiSecurityPlayground.tsx` và scopedCSS đã tạo sau checkpoint61, **chưa canonical/schema/renderer/dictionary/browser/build62**. `ai-security-models.ts`+4tests passed; phân biệt NO_ATTACK_ATTEMPT với NO_PRIVATE_PAYLOAD đã sửa và format/test lại. Three kinds: security-paths/security-url/security-moderation. Runtime translation collector đang/chưa xong `.cache/handbook-expansion/security-missing.json`, session7473 nếu còn.
- Paths default assumedFollows/privateData true, send/recipient/images/egress false, reviewreject; 0simulatedleaks. URL defaults lookalikehost with all3checks true→BLOCKED/no initial simulatedadmission; noDNS/network. Moderationthreshold.7/prevalence1%: TP3 FP2 FN3 TN4, sampleprecision60%, expectedTP50/FP3300 over10000, expectedprecision≈1.5%; assumptions not realclassifier.
- Next author62 canonical đầy đủVIEN/flows/cards/table/5traces/3labs/8questions, wire schema/renderer, runtimeEnglish, browserchecks/package, syncstatic rồicheck/test/build/verify/browser/screenshots. Không tính unwired UI là authored bài. Primary methods OWASPXSS safe sinks và SSRF exacthost/validatedIPconnect/redirect rechecks đã đọc. Không rerun author61helper vì cacheID đã sửa trực tiếp.

## Local62: AI Safety & Security — đã validate/publish local

- `ai-safety.json`:17sections/5traces/3labs/3internalAPIs/8workedquestions,VIENstatusreview. Threat assets/risk families, direct/indirect injection, disclosure paths, authority/leastprivilege/action-bound review, defense layers, quarantine/typedhandoffs, contextual output/SQL/code boundaries, URL/SSRF, moderation/prevalence, retrieval/memory/training data, supplychain, consumption, redteam và containment.
- Release62check303files0diagnostics187tests. Build/verify634pages286098links/assets/localization0missing. Dedicated3labsVIENkeyboard/mobile9themes và generic2routes pass; screenshotsdesktop/mobileđãxem. Static62:126HTML1484links/static2pagespass. Main4322publish62;stage4323stopped.
- Browser asserts không có request tới .testfixture domains; data stays React text, no realexfil/network/unsafeHTML. Codefixtures không là productionvalidators/securityproof. Logs`security-{build,verify,final-check,final-unit,browser,generic-browser,legacy-browser}.log`;screenshots/report`artifacts/ai-security-*`.62chưa commit/push;GitHubHEAD61.
- Checkpoint61CI:Pages https://github.com/avpegnu/av-lore/actions/runs/39893493666 success; ITVPS https://github.com/avpegnu/it-basic/actions/runs/39893495962 failed. Không change Settings/workflow/secrets;unrelated Test/Python/test.pygiữnguyên.
- Next63fullreferencechapter+ACLdemo/modelđãđọc; primaryAzuresecurityfilter/auth/ANNfilter docschecked. Corrections: prefilter doesn't universally guarantee ANNfullrecall; postfilter before anyunauthorizedexternalprocessing can protectdata but underfill; principalhashalone not enough for staleACL/ABAC/denies; current permissions before rerank/model/cache/share; finalcitationIDexistence not entailment; rerank/hybrid not alwaysbest nor fixedlatency; sourcegroup/cachefreshness SLO differs from absolute noleak guarantee; backfill/upsertidentity not enough without generations/tombstones/orderfences.
- `enterprise-rag-models.ts`+4tests passedlocal, **chưaUI/canonical/schema/dictionary/browser/static/build63**. Models: threeusers over6fixedrankedrecords, tenantfilteralwaysenforced +eligible-first/topkpost/noACL; optional explicitGUIDEcandidate miss provesfiltering≠fullrecall. RevocationtimingbeforeRerank/beforeModel/afterModel, separateguards +upstream/userdisclosure. Candidate-index migrationfixedhighwatermark120, backfill%,catchupcursor,pairedqueryencoder/evals/unsafeForce;notrealdistributedcutoverplanner. Don't commit partial63 along62.

## Local63: Enterprise RAG — đã validate/publish local

- `ai-case-rag.json`:17sections/5traces/3labs/4internalAPIs/8workedquestions,VIENstatusreview. Requirements/currentpermission/freshness contract, workedcapacity inputs, APIs/sharedanswers, query/ingest/controlplanes, complexsourcepolicies, filterplacement, in-flightrevocations, generationpublish/deletes/ACL, quality/citations, scopedcache/history, datamodel, embeddingmigration và tenantoperations.
- Release63check307files0diagnostics191tests. Build/verify636pages287636links/assets/localization0missing. Dedicated3labsVIENkeyboard/mobile9themes và generic2routes pass; screenshotsdesktop/mobileđãxem. Static63:128HTML1512links/static2pagespass. Main4322publish63;stage4323stopped. All63review0complete;10unwritten.
- Logs`enterprise-rag-{build,verify,final-check,final-unit,browser,generic-browser,legacy-browser}.log`;screenshots/report`artifacts/enterprise-rag-*`.62+63ready checkpoint, chưa push.
- Next64fullreferencechapter+latencydemo/modelđãđọc; primaryFIM2207.14255, repo-levelSWEbench2310.06770, acceptance/productivity2205.06537 và MicrosoftLSP3.17TextDocumentEdit/version semanticschecked. Corrections: acceptance/retention notgroundtruthcorrectness; promptprefill notuniversaldominantbilling; smallerFIM/speculative/stickycache nofixedguaranteedspeedup; requiredcontext cannot bypassbudget; cancel notguaranteestale response/compute stopped; session/prefix cacheidentity includesmodel/tokenizer/template/tenant/exacttokenprefix; edits needcurrentbase/version and boundtestedpatch/evidence, sandbox notproductioncredentials; reviewpolicy honors preauthorization, notblanketeverydiffconfirmation.
- Local64 `coding-assistant-models.ts`+4tests passed: actualsynthetickeys0/80/160ms, debounce/snapshot/deadline guards/cancelackrace; boundedrequired/optionalcontext/exclusions; base/patch/test/approval/currentcommitversiongates. Approval binds patch ANDbase; currentbase check atcommit required for concurrentedit. **ChưaUI/canonical/schema/dictionary/browser/static/build64**. Don't commit partial64 with62+63.

## Checkpoint63 đã push; Coding64 đang triển khai

- AV Lore `52be2bc`, IT Basic `c8e598e` push thành công. Pages39895201314 đang/chưa kiểm lại; IT VPS39895203604 failed. Main4322validated63;stage4323stopped. Giữ unrelated Test/Python/test.py.
-64 `CodingAssistantPlayground.tsx` +scopedCSS đã tạo nhưng chưa wire/canonical. WIPcheck310files0diagnostics195tests. `coding-missing.json` collector đã xong(session33632nếu còn), chưa merge runtimeEnglish. Three kinds coding-race/coding-context/coding-patch; immutablefixtures không edit/run actualrepo/model.
- Models approval binding đã nâng thành exactpatch ANDbase. Race defaultdebounce100/latency200→R3finish460ms/admitted1;debounce0/no guards→responsesR3@360,R2@480,R1@700/staleshown2,lastR1. cancel acknowledgesR2 only, R1maystillarrive; snapshotguard dropsobsolete. Contextbudget1500/exclusionstrue→PREFIX400+SUFFIX200+TYPE600+README300;required600>budget500→no prompt. Patch defaultworkspacechanged/allguards→BASE_CONFLICT; testsbindbase/patch,approvalbindbase/patch,atomiccommit rejectsconcurrentedit.
- Next author64 completeVIEN richcontent, then wiring/dictionary/browser/static/check/test/build/verify/screenshots. PrimaryLSPofficialtextDocumentEdit source verified https://github.com/microsoft/language-server-protocol/blob/gh-pages/_specifications/lsp/3.17/types/textDocumentEdit.md ; emptyLSPsite shell không dùng làm sole evidence. No generalLSPatomicmulti-file guarantee.


## Local64: Coding Assistant — đã validate/publish local

- `ai-case-coding.json`:18sections/5traces/3labs/4APIs/8workedquestions, đầy đủ canonical VIEN, statusreview. Inline/chat-agent requirements; workload arithmetic; snapshot APIs; context/LSP overlays/FIM/cache; bounded isolated agents; exact base/patch/test/review identities; atomic apply conflicts; function/repository/pass@k evaluation; acceptance/retention interpretation; privacy/degradation/release controls.
- Release64:310files0diagnostics195tests, build/verify638pages289180links/assets, localization0missing. Dedicated VIEN/boundary scenarios/keyboard/mobile/9themes và generic2routes passed. Desktop/mobile screenshots đã xem; sửa ambiguous translated table header thành Patch identity và rerun dedicated suite/build. Static64:130HTML1540links;2VIENpages passed. Main4322publish64;stage4323dừng sau checks. All64review0complete,9unwritten.
- Logs `coding-{check,unit,final-check,final-unit,build,verify,browser,generic-browser,legacy-browser}.log`; screenshots/report `artifacts/coding-assistant-*`. Chưa push64; sẽ batch với65 khi stable. Checkpoint63 Pages39895201314success;ITVPS39895203604failed.
-65fullreferencechapter/demo/model đọc; corrections: temperature0 notdeterministic guarantee; tenant scope alone insufficient cache authorization/freshness; fallback beforefirsttoken notproofreplaysafe; requestID alone notdedup upstream execution/bills; attempts may bill despite timeout/disconnect; usagepending notzero; providerlimit dimensions/cacheaccounting vary; failopenquota notuniversal safechoice; selfhostcost/utilization notalwayscheapest; reserve/refundrate bucket distinct from durablebudget accounting. Research local sources: RFC6585, AWSretry/backoff, Claude rate-limit/stream event docs, gateway official overview.
- New65 models/tests/UI/CSS are WIP only. No schema/canonical/runtimeEnglish/browser/static/build65 yet. Canonical helpers must not rerun64 creation.


## Local65: LLM Gateway — đã validate/publish local, ready checkpoint

- `ai-case-gateway.json`:17sections/5traces/3labs/4internalAPIs/8workedquestions,VIENstatusreview. Covers shared workload coordination, capability/quality aliases, 50M/day capacity arithmetic, hard-policy routing, replay/exposure/effect boundaries, rate vs concurrency vs money budgets, durable reservation/attempt/usage identities, streaming backpressure/parser lifecycle, scoped caching/logs/credentials, regional recovery and rollout/economics.
- Release65:314files0diagnostics199tests, build/verify640pages290728links/assets, localization0missing. Dedicated3labsVIEN/keyboard/mobile/9themes +generic2routes passed. Screenshotsdesktop/mobile viewed. Static65:132HTML1570links and2VIENpages passed. Main4322publish65;stage4323stopped. All65review0complete;8unwritten.
- Logs`gateway-{check,unit,final-check,final-unit,build,verify,browser,generic-browser,legacy-browser}.log`;reports/screenshots`artifacts/llm-gateway-*`. Build caught invalid card tone/node kind and canonical corrected; final check/tests/build rerun passed. Browser harness unsafe-route expectation corrected to3 eligible because disabled constraints admit A too; actual implementation correctly preserved honest candidate counts.
- New66 `design-studio-models.ts`/tests are uncommitted WIP, excluded from65checkpoint. Own bounded parser30nodes80edges/100KB import limit; explicit read/write operation multipliers, cache misses, acyclic load propagation, modeled independent read/write capacities, SQL write-primary cap, missing paths/orphans and cycle refusal. No p99-from-mean, numeric availability, arbitrary interview score or claim that a reachable database proves durability. Need test WIP, prompts/UI/canonical/translations/browser/static before complete.
- Preserve unrelated IT Basic/Test/Python/test.py. No online translator, migration, settings/workflow/secrets changes. Continue66–73 then independent technical/coverage/English/visual review all authored lessons.


## Local66: Design Studio — validated/publish local; user steering EasyInvoice

- Checkpoint65 đã push AV Lore `bc25340`, IT Basic `75a99e9`. Pages39897054892success;ITVPS39897055109failed.
-66 `studio.json`:12sections/3traces/8promptcards/interactive editor/4workedquestions, VIENstatusreview. Own graph model + prompts + DesignStudio UI wired/schema/dictionary. 319files0diagnostics204tests. Build/verify642pages292268links/assets/localization0missing. Dedicated canvas keyboard/drag,8prompts,edgeedit/review,scoped reload persistence,guardedreplace,JSON/Markdownexport,invalid/XSSimports,cycle refusal,cross-tab/corruptstorepreservation,VIEN/mobile/9themes all passed. Generic2routes andstatic2pagespassed;134HTML1598links. Main4322published66;stage4323stopped. No66commit yet.
- Screenshots viewed: list/editor desktop and reviewmobile readable. Actual canvas keyboard/drag tested, but dedicated final screenshots currently capture list mode. Next polish: consider fullscreen canvas for full-width graph visibility, take actual canvas screenshot desktop. Fullscreen API spec read; **no fullscreen code implemented yet**. Do not claim fullscreen exists. Existing source clean validated66 otherwise.
- 66canonical creation helper `.cache/handbook-expansion/authoring/studio.py` already ran; do not rerun. Authoritative currentJSON. Source components/models/prompts/tests/CSS/schema/renderer/dict/package uncommitted. Dedicated harness `scripts/design-studio-browser-check.mjs`. Logs `studio-{check,unit,model-unit,build,verify,browser,generic-browser,legacy-browser}.log`; artifacts`studio-*`/`design-studio-browser-report.json`. First harness focus test needed Enter before moving selected SVG node; corrected harness, not implementation bug. First browser launch raced staging startup; waited readiness/HTTP200 then reran suites successfully.
- Progress:66authored/validated,allreview0complete;7unwritten(Review,Glossary+5interview). Need top progress/ignored plan/coverage refresh to66 when returning. Previous top65 remains historical until refreshed.
-67research full dailyreviewchapter, scheduler and session read; primary SuperMemoSM2 and testing-effect study abstract checked, spacing review located. Corrections: scheduler cannot know justbeforeforget; own algorithm not originalSM2/Anki claim; immediate Again requeue is practice rather than elapsed10min; filterstats must use pool; undo limitedlog must noterasehistoricaldaycounts; no retentionpercentage called actualmemoryprobability; calendar/timezone vs elapsedms explicit. **No67 source/models/UI/canonical yet.** Source refs/readnotes remain ignoredlocal.
- User now posted unrelated bi.mmenu.io EasyInvoice error `Invalid EasyInvoice field: Total`, HTTP200, missing payment-method translation and chart dimension warnings. Asked repo/branch via async input. Save AV progress here before investigating; no cancellation of original goal inferred. Preserve IT Basic/Test/Python/test.py.

- Correction: user immediately clarified EasyInvoice message was sent by mistake and asked to continue AV Lore. Ignore unrelated report; no other repo was changed. Continuing canvas fullscreen polish, then Daily Review.


## Local66 final polish — ready stable checkpoint

- Fullscreen canvas implemented and browser-tested VIEN, including exit button; actual fullscreen screenshots viewed. Visual inspection caught undefined `--text-muted` in rich handbook styles: alias only existed under legacy-prose, causing invisible SVG edges/meta text. Replaced affected scoped references with theme `--muted`. Added explicit computed SVG edge contrast≥3 and metadata contrast≥4.5 across all9themes. New fullscreen screenshot shows readable edges and multipliers.
- Rebuilt/verified642pages292268links/assets,0missingEnglish. Dedicatedstudio+generic2routes pass again. CSS regression dedicated suites for Evaluation,Agents,Production Apps,AI Security,Enterprise RAG,LLM Gateway all pass VIEN/mobile/keyboard9themes. Source66release319files204tests; latest WIP includes67model/deck/UI at324files208tests passed, distinguish these counts. Static66 remains134HTML1598links and2VIENbrowser pages passed. Main4322published66;stage4323stopped.
-67 WIP created: `daily-review-models.ts`,4unit tests,`review-deck.ts` (canonical questions+visualflow, stable IDs/content revisions),`DailyReview.tsx` UI. No67 schema/renderer/canonical/runtimeEnglish/CSS/package/browser/static/build yet. Independent heuristic ladder10m/1d/3d/7d/14d/30d/60d/120d/180d, notSM2/FSRS; Again10m notimmediate requeue; Hardhalfinterval/keep level; Good+1/Easy+2. Duefiltereddeck/globalnewcap, revisionreset, boundedundo50 retains exactdaycounters, forecastelapsed24hbins. UI settings/filter/legacy-review-only, reveal/grading/keyboard/preview-no-schedule, exports/importpreflight/guards and paused saving on corrupt/cross-tabstate. Need finish polish e.gexplicit imported/reset recovery may setSaving(true) after intentional replacement; full bilingual/browser validation pending.
- Original goal remains active. User EasyInvoice screenshot was explicitly sent by mistake; ignore it and pending async repo question. No unrelated repo changes.
