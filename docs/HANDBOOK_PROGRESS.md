# Tiến độ System Design & AI

Tạm dừng theo yêu cầu ngày 21/10/2026. Tiếp tục khi chủ sở hữu yêu cầu; không tự mở rộng nội dung trong lúc tạm dừng.

## Phần đã triển khai

16 bài chuyên sâu có nội dung Việt–Anh, flow/cards, sơ đồ hoặc mô phỏng theo từng chủ đề:

- Foundations (4): framework, estimation, scaling, networking.
- Building Blocks (8): load-balancing, caching, databases, consistency, messaging, rate-limiting, unique-ids, reliability.
- Case Studies (2): news-feed, url-shortener.
- Build Stories (1): ep-chatgpt.
- AI Systems (1): ai-inference.

Framework có planner 45 phút, checklist và đồng hồ mô phỏng. Các bài mới có mô hình tương tác cho routing, cache, transaction, replication, quorum/Raft, consumer group, offset, delivery/crash, rate limiting, ID, retry/circuit breaker và redirect caching. Những mô hình này nêu giả định, không phải benchmark production.

Đã sửa các bố cục bảng/biểu đồ bị mất trong 25 file chương nền tảng. Giữ nguyên 198 chương/15 lộ trình, 31 topic Notes & Interview và các key dữ liệu học tập hiện có. Prose Việt–Anh của cả 16 bài được đồng bộ sang HTML ở repo IT Basic bằng `tools/sync-handbook.py`; React lab chỉ có ở AV Lore.

## Phần chưa hoàn tất

Phạm vi đăng ký là **73 bài/công cụ**, còn **57 mục chưa được mở rộng**:

- 24 Case Studies, bắt đầu bằng Chat.
- 11 Build Stories.
- 14 AI Systems.
- 3 công cụ Practice và 5 công cụ Interview.

Các case cũ ngoài News Feed và URL Shortener vẫn là bản outline, chưa đạt độ sâu của các bài mới. Không coi việc chúng có URL/menu là đã hoàn thiện nội dung.

Cả 16 bài mới đang ở trạng thái `review`. Cần hoàn thành đối chiếu độ phủ theo từng bài, biên tập kỹ thuật và bản Anh trước khi đánh dấu `complete`. Riêng framework cần thêm tình huống product prompt mở và query/model mismatch phát hiện muộn. Dùng `npm run content:audit` để kiểm tra danh mục; `--require-complete` hiện cố ý chưa đạt.

## Điểm tiếp tục

Tiếp theo là Chat: gateway/session routing, durable send + idempotency, per-conversation ordering, gap-aware sync, multi-device receipts, presence, groups, reconnect storms, E2EE và multi-region. Không dùng một sequence toàn cục cho mọi conversation; không coi max received seq là contiguous cursor. ACK sau commit khác với delivered/read receipt; pub/sub không thay durable history.

Draft component/model Chat cùng wiring/style được lưu bền vững trong `docs/work-in-progress/chat.patch` và commit cùng checkpoint, nhưng không đưa vào website build. Draft còn thiếu prose, bản Anh, kiểm thử và review; đọc hướng dẫn trong `docs/work-in-progress/README.md` trước khi áp dụng. Một bản sao local cũng nằm trong `.cache/handbook-expansion/paused-chat/`. Chỉnh trực tiếp canonical JSON trong `src/content/handbook/`; không chạy script author tạm để ghi đè bài đã biên tập.

## Kiểm tra tại checkpoint

- Astro check: 118 file, không có lỗi/cảnh báo.
- 39 unit test đạt; build Việt–Anh offline đạt.
- Verify: 590 trang, 252.604 liên kết/asset; đủ 198 chương, 31 topic và 26 case route.
- Handbook browser: 32 route Việt–Anh, trace, keyboard, worksheet, mobile; kiểm tra accessibility qua 9 theme.
- Các kiểm tra riêng cho planner, consistency, bốn Building Blocks mới và URL Shortener đạt; bốn Building Blocks được quét 36 tổ hợp trang/theme.
- Course visuals: lần kiểm tra trước đạt 792 tổ hợp trang/viewport, cùng kiểm tra contrast và tương tác.

Preview local: `http://127.0.0.1:4322/av-lore/`. Sau khi khởi động máy lại, dùng `npm run preview -- --port 4322` với bản build hoặc chạy lại quy trình build trong README.
