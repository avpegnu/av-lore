/** Original Vietnamese study outlines. Topic selection inspired by Blueprint; not a translation of its chapters. */
export interface CaseStudy {
  id: string;
  title: string;
  goal: string;
  requirements: string[];
  api: string[];
  data: string;
  flow: string[];
  deep: string[];
  failure: string;
  tradeoff: string;
  drill: string[];
  source: { title: string; url: string };
}
const rfc = { title: 'IETF — HTTP Semantics', url: 'https://www.rfc-editor.org/rfc/rfc9110.html' };
const pg = {
  title: 'PostgreSQL — Transaction Isolation',
  url: 'https://www.postgresql.org/docs/current/transaction-iso.html',
};
const s3 = {
  title: 'Amazon S3 — Multipart upload',
  url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html',
};
const kafka = {
  title: 'Apache Kafka — Design',
  url: 'https://kafka.apache.org/documentation/#design',
};
const redis = {
  title: 'Redis — Sorted sets',
  url: 'https://redis.io/docs/latest/develop/data-types/sorted-sets/',
};
const search = { title: 'Elastic — Search', url: 'https://www.elastic.co/docs/solutions/search' };
const stripe = {
  title: 'Stripe — Idempotent requests',
  url: 'https://docs.stripe.com/api/idempotent_requests',
};
export const cases: CaseStudy[] = [
  {
    id: 'url-shortener',
    title: 'URL Shortener',
    goal: 'Biến URL dài thành code ngắn, redirect nhanh và quản lý expiry an toàn.',
    requirements: [
      'Tạo link, redirect, custom alias tùy chọn, expiry.',
      'Làm rõ read/write ratio, p99 redirect và nhu cầu analytics.',
      'Tách kiểm tra abuse khỏi đường redirect nhưng có cơ chế vô hiệu hóa link.',
    ],
    api: [
      'POST /links {url, alias?, expires_at?} + Idempotency-Key',
      'GET /s/:code → redirect hoặc 404/410',
    ],
    data: 'links(code UNIQUE, target_url, owner_id, expires_at, status). Index theo code; analytics lưu riêng theo event_id và timestamp.',
    flow: [
      'Browser gửi code',
      'Redirect service kiểm policy',
      'Cache → DB khi miss',
      'Trả Location đúng target',
      'Click event async',
    ],
    deep: [
      'Một cách đơn giản là cấp ID duy nhất rồi base62 encode. Encoding không loại nhu cầu cấp phát ID và không che giấu thứ tự. Nếu dùng random code, cần UNIQUE constraint và retry collision; độ dài code phải dựa vào số bản ghi và xác suất collision. Custom alias luôn phải reserve atomically.',
      '301/308 phù hợp chuyển hướng lâu dài nhưng browser/cache có thể tiếp tục dùng đích cũ. 302/307 dành cho chuyển hướng tạm thời; cache vẫn phụ thuộc header và quy tắc HTTP. 307/308 giữ method; không lấy redirect code làm công cụ đếm click tuyệt đối. Chọn policy theo khả năng đổi link, expiry và nơi thu analytics.',
    ],
    failure:
      'Cache stampede khi link nổi tiếng hết TTL: coalesce requests, jitter TTL, giới hạn DB concurrency; link bị chặn phải có cơ chế invalidation theo thời gian chấp nhận được.',
    tradeoff:
      'Cache tăng throughput nhưng làm khó đổi URL/thu hồi ngay. ID tuần tự dễ cấp nhưng đoán được; random giảm khả năng đoán nhưng cần xử lý collision.',
    drill: [
      'Nếu cache trả link đã bị xóa, giới hạn tác động thế nào?',
      'Nếu allocator mất kết nối, range ID đã lease còn dùng được không?',
    ],
    source: rfc,
  },
  {
    id: 'news-feed',
    title: 'News Feed',
    goal: 'Hiển thị bài đăng từ tài khoản đang theo dõi với latency đọc thấp.',
    requirements: [
      'Đăng bài, follow, đọc feed phân trang.',
      'Làm rõ chronological hay ranking; freshness và fan-out lớn nhất.',
      'Quyền private và block phải có hiệu lực trong read path.',
    ],
    api: ['POST /posts {text, media_ids}', 'GET /feed?cursor=...'],
    data: 'posts(post_id,author_id,created_at); follows(follower,followee); timeline(user_id,sort_key,post_id). Cursor dựa trên khóa sắp xếp ổn định.',
    flow: [
      'Author tạo post',
      'Lưu post & outbox',
      'Fan-out worker',
      'Timeline của follower',
      'Read hydrate & kiểm quyền',
    ],
    deep: [
      'Fan-out on write ghi post_id vào timeline của follower để đọc nhanh. Với author có hàng triệu follower, chi phí ghi và queue backlog tăng mạnh; mô hình hybrid fan-out tài khoản thường và pull bài của celebrity tại read có thể phù hợp.',
      'Timeline nên chứa reference thay vì sao chép toàn bài. Khi hydrate phải kiểm visibility hiện tại. Ranking cần tránh cursor offset trên danh sách thay đổi liên tục; có thể đóng băng một ranking session và paginate theo score cùng tie-breaker.',
    ],
    failure:
      'Worker retry có thể ghi trùng: unique timeline(user_id,post_id). Theo dõi fan-out lag; khi backlog tăng, ưu tiên bài mới và có read fallback theo yêu cầu.',
    tradeoff:
      'Precompute đổi write amplification lấy read latency; pull giảm write nhưng tăng fan-in và công việc ranking mỗi lần đọc.',
    drill: [
      'Unfollow có cần xóa mọi timeline entry cũ ngay không?',
      'Thiết kế nào cho celebrity có 50 triệu follower?',
    ],
    source: kafka,
  },
  {
    id: 'chat',
    title: 'Chat Realtime',
    goal: 'Nhắn tin bền vững, đồng bộ offline và phân biệt sent, delivered, read.',
    requirements: [
      'Chat 1-1 hoặc nhóm; làm rõ size nhóm và retention.',
      'Thứ tự trong conversation; không yêu cầu tổng thứ tự toàn hệ thống.',
      'Offline sync và xác thực thành viên cho mỗi thao tác.',
    ],
    api: [
      'POST /conversations/:id/messages {client_message_id,body}',
      'GET /conversations/:id/messages?after_sequence=...',
    ],
    data: 'messages(conversation_id,sequence,message_id,sender_id,body); UNIQUE(conversation_id,client_message_id). Read cursor theo user và conversation.',
    flow: [
      'Client gửi message id',
      'Gateway xác thực membership',
      'Durable append + sequence',
      'Push tới người đang online',
      'Offline sync từ cursor',
    ],
    deep: [
      'ACK “sent” chỉ nên có sau khi dữ liệu được lưu theo durability contract. Delivered là phía nhận đã nhận; read là người dùng đã đọc theo định nghĩa sản phẩm. Ba trạng thái không thể suy ra chỉ từ việc WebSocket còn kết nối.',
      'Một owner/partition cho conversation giúp giữ thứ tự. Reconnect có thể nhận lại message nên client cần dedup theo message_id và phát hiện gap qua sequence. Presence là dữ liệu có TTL, thường không cần nhất quán mạnh như message.',
    ],
    failure:
      'Gateway chết giữa lưu và push: client retry cùng client_message_id; server trả message đã tồn tại. Người nhận phục hồi bằng cursor thay vì chỉ trông chờ push.',
    tradeoff:
      'WebSocket giảm độ trễ nhưng tăng quản lý connection và reconnect. Partition theo conversation đơn giản ordering nhưng nhóm quá nóng cần chiến lược riêng.',
    drill: [
      'User mất mạng sau khi send, UI hiển thị trạng thái gì?',
      'Message bị xóa có tạo sequence gap không?',
    ],
    source: rfc,
  },
  {
    id: 'notifications',
    title: 'Notification Service',
    goal: 'Gửi email, push và SMS có ưu tiên, retry và kiểm soát sở thích người dùng.',
    requirements: [
      'Transactional notification khác marketing.',
      'Preference, quiet hours và unsubscribe theo kênh.',
      'Theo dõi accepted/sent/delivered tùy provider; tránh hứa exactly-once.',
    ],
    api: [
      'POST /notifications {event_id,user_id,template,channels}',
      'GET /notifications/:id/status',
    ],
    data: 'notification(id,event_id,user_id,template_version); delivery(notification_id,channel,attempt,status,next_retry_at). UNIQUE(event_id,user_id,channel) theo ý nghĩa nghiệp vụ.',
    flow: [
      'Business event',
      'Preference & template',
      'Queue theo channel',
      'Provider adapter',
      'Callback & delivery state',
    ],
    deep: [
      'Tạo notification và các delivery record với idempotent key. Worker chỉ ACK sau khi cập nhật trạng thái đủ bền vững. Timeout provider có thể là kết quả chưa biết; dùng idempotency/query API nếu provider hỗ trợ.',
      'Tách queue theo mức ưu tiên để email marketing không chặn OTP. Retry dùng backoff/jitter, giới hạn deadline và DLQ. Render template theo version và locale để retry không vô tình đổi nội dung.',
    ],
    failure:
      'Provider gián đoạn: circuit breaker, queue giữ event theo retention; provider fallback phải tránh gửi lặp nếu trạng thái lần đầu chưa rõ.',
    tradeoff:
      'Fallback nhanh tăng availability nhưng có thể tăng duplicate/cost. Dedupe quá rộng có thể làm mất notification hợp lệ.',
    drill: [
      'OTP đã hết hạn có nên tiếp tục retry?',
      'Callback đến trước response của provider thì cập nhật state thế nào?',
    ],
    source: kafka,
  },
  {
    id: 'autocomplete',
    title: 'Search Autocomplete',
    goal: 'Gợi ý prefix nhanh, liên quan và không lộ dữ liệu không được phép.',
    requirements: [
      'Prefix search, top-k, locale và độ dài tối thiểu.',
      'Làm rõ personalized hay toàn cục; freshness của trend.',
      'Lọc nội dung và giới hạn prefix spam.',
    ],
    api: ['GET /suggest?q=...&locale=vi&limit=10'],
    data: 'Prefix index hoặc trie/FST chứa term_id và top-k candidate; popularity và policy metadata tách khỏi raw query log.',
    flow: [
      'Debounced input',
      'Normalize prefix',
      'Prefix index',
      'Rank & policy filter',
      'Top-k suggestions',
    ],
    deep: [
      'Một baseline có thể dùng prefix index với precomputed top-k cho prefix phổ biến. Trie dễ giải thích nhưng overhead con trỏ lớn; cấu trúc nén/FST và search engine có thể tiết kiệm dung lượng, đổi lại pipeline build phức tạp hơn.',
      'Normalize Unicode và xử lý dấu phải khớp cả indexing lẫn query. Debounce và cancel ở client giảm tải; response cũ cần request sequence để không ghi đè suggestion của input mới. Query log có thể chứa PII nên cần retention, aggregation và kiểm soát truy cập.',
    ],
    failure:
      'Indexer chậm: phục vụ snapshot trước và theo dõi freshness. Một prefix nóng cần cache; cache key phải gồm locale và phạm vi quyền.',
    tradeoff:
      'Precompute top-k đọc nhanh nhưng trend cập nhật chậm. Personalization làm giảm khả năng chia sẻ cache và tăng yêu cầu privacy.',
    drill: [
      'Kết quả cho “ca” về sau kết quả “cat” phải xử lý sao?',
      'Xóa term nhạy cảm có phải chờ rebuild toàn index không?',
    ],
    source: search,
  },
  {
    id: 'web-crawler',
    title: 'Web Crawler',
    goal: 'Thu thập trang có kiểm soát, lịch sự với origin và chống crawl trap.',
    requirements: [
      'URL frontier, fetch, parse và dedup.',
      'Respect robots policy và giới hạn tải theo host.',
      'Làm rõ scope, recrawl interval và loại nội dung.',
    ],
    api: ['POST /crawl-jobs {seed_urls,scope}', 'GET /crawl-jobs/:id'],
    data: 'frontier(normalized_url,status,next_fetch_at,host); fetched(url,content_hash,etag,last_modified); host budget và robots cache.',
    flow: [
      'Seed/frontier',
      'Per-host scheduler',
      'Fetch sandbox',
      'Parse & normalize links',
      'Dedup & enqueue',
    ],
    deep: [
      'Dedup URL cần canonicalization có chủ đích: bỏ fragment thường hợp lý, nhưng xóa query tùy tiện có thể gộp các trang khác nhau. Content hash giúp phát hiện nội dung trùng sau fetch. Bloom filter tiết kiệm RAM nhưng false positive có thể bỏ sót URL.',
      'Frontier nên nhóm theo host để áp dụng politeness, backoff và giới hạn concurrent fetch. Fetcher cần timeout, max size, redirect limit, kiểm tra URL/IP sau DNS và redirect để tránh SSRF vào private network. Parser chạy với resource limits.',
    ],
    failure:
      'Infinite calendar URLs làm frontier phình: giới hạn depth, budget theo site và phát hiện pattern lặp. Retry lỗi mạng không được chiếm hết budget recrawl.',
    tradeoff:
      'Crawl rộng tăng coverage nhưng tốn bandwidth và giảm freshness. Dedup xác suất tiết kiệm bộ nhớ nhưng đánh đổi khả năng bỏ sót.',
    drill: [
      'Redirect sang private IP phải chặn ở bước nào?',
      'ETag giúp giảm lưu lượng recrawl như thế nào?',
    ],
    source: rfc,
  },
  {
    id: 'video-platform',
    title: 'Video Platform',
    goal: 'Upload, transcode và phát video thích ứng qua CDN.',
    requirements: [
      'Upload resumable, xử lý async, adaptive bitrate playback.',
      'Quyền xem, moderation và trạng thái processing.',
      'Tách latency upload/processing với startup latency playback.',
    ],
    api: ['POST /videos/uploads', 'POST /videos/:id/complete', 'GET /videos/:id/playback'],
    data: 'video(id,owner,status,source_object); rendition(video_id,codec,resolution,manifest_key,version); job(id,video_id,attempt).',
    flow: [
      'Multipart upload',
      'Durable processing job',
      'Transcode renditions',
      'Manifest + segments',
      'CDN → player',
    ],
    deep: [
      'Upload source vào object store bằng URL giới hạn quyền và thời hạn. Complete phải xác minh object và checksum. Worker tạo rendition vào prefix/version tạm, chỉ publish manifest khi các output cần thiết đã hoàn tất.',
      'Player chọn rendition theo bandwidth và buffer. Segment nhỏ giảm độ trễ chuyển bitrate nhưng tăng request overhead. CDN cache được public segment; private media cần signed access và chính sách cache không làm lộ quyền.',
    ],
    failure:
      'Transcode bị ngắt: retry theo job_id và output version, không publish manifest nửa chừng. Dọn orphan upload/rendition theo lifecycle.',
    tradeoff:
      'Tạo nhiều rendition tăng storage và compute, đổi lấy khả năng phát trên nhiều mạng/thiết bị. Pretranscode khác just-in-time về latency/cost.',
    drill: [
      'Video bị thu hồi nhưng CDN đã cache thì làm sao?',
      'Worker tạo hai bộ output do duplicate job có phá manifest không?',
    ],
    source: s3,
  },
  {
    id: 'file-sync',
    title: 'Cloud File Sync',
    goal: 'Đồng bộ file giữa nhiều thiết bị, có version và xử lý chỉnh sửa đồng thời.',
    requirements: [
      'Upload/download, rename, delete và offline changes.',
      'Làm rõ conflict policy và history retention.',
      'Phân quyền thư mục và khôi phục version.',
    ],
    api: ['PUT /files/:id/versions + If-Match', 'GET /changes?cursor=...'],
    data: 'file(id,parent_id,name,current_version,deleted_at); version(file_id,version,object_key,checksum); change log theo workspace.',
    flow: [
      'Local watcher',
      'Chunk/hash upload',
      'Conditional metadata commit',
      'Change log',
      'Thiết bị khác apply',
    ],
    deep: [
      'Object blob bất biến giúp retry upload và giữ version. Metadata commit dùng expected version/If-Match; hai thiết bị sửa cùng base version cần conflict policy như tạo conflict copy hoặc merge cho loại file hỗ trợ. Không tự áp dụng last-write-wins nếu gây mất tài liệu.',
      'Sync theo cursor từ change log, giữ tombstone đủ lâu để thiết bị offline nhận việc xóa. Khi cursor quá cũ so với retention, client cần full resync. Rename nên đổi metadata file_id, không tải lại toàn blob.',
    ],
    failure:
      'Client upload blob xong nhưng commit metadata fail: blob trở thành orphan và được GC theo grace period. Không xóa ngay vì request khác có thể đang tham chiếu.',
    tradeoff:
      'Chunk dedup giảm bandwidth nhưng tăng metadata và cần đánh giá privacy. Giữ history lâu tăng cost, hỗ trợ recovery tốt hơn.',
    drill: [
      'Thiết bị offline một tháng quay lại sau khi tombstone bị xóa?',
      'Hai thiết bị cùng rename một folder thì phát hiện conflict ra sao?',
    ],
    source: s3,
  },
  {
    id: 'proximity',
    title: 'Proximity Search',
    goal: 'Tìm địa điểm gần vị trí hiện tại với filter và xếp hạng.',
    requirements: [
      'Tra cứu radius/top-k, category, opening hours.',
      'Làm rõ khoảng cách đường chim bay hay thời gian di chuyển.',
      'Location privacy và chất lượng dữ liệu địa điểm.',
    ],
    api: ['GET /places?lat=...&lng=...&radius=...&category=...'],
    data: 'place(id,geo_point,category,visibility); spatial index; business metadata và availability cập nhật riêng.',
    flow: [
      'Location query',
      'Spatial cell candidates',
      'Exact distance filter',
      'Business filter/rank',
      'Top-k results',
    ],
    deep: [
      'Geohash/H3/S2 hoặc spatial tree thu hẹp candidate; cell không trùng vòng tròn nên phải truy vấn cả vùng biên và lọc khoảng cách chính xác. Độ phân giải cell đổi số candidate với số cell phải đọc.',
      'Không cache nguyên kết quả chỉ bằng category: cần phạm vi vị trí, filter và freshness. Với khoảng cách lái xe phải gọi routing hoặc dùng approximation đã nêu rõ; khoảng cách địa lý không phản ánh cầu, sông hay đường một chiều.',
    ],
    failure:
      'Hot cell tại trung tâm thành phố: chia cell nhỏ hơn hoặc cache candidate rồi filter. GPS nhiễu cần UI mô tả độ chính xác.',
    tradeoff:
      'Index cập nhật nhanh tăng write cost; cache theo cell giảm tải nhưng có thể trả địa điểm vừa đóng cửa.',
    drill: [
      'Tại ranh giới hai geohash có bị mất kết quả không?',
      'Top-10 theo thời gian lái xe khác theo khoảng cách thế nào?',
    ],
    source: {
      title: 'PostGIS — Spatial indexes',
      url: 'https://postgis.net/workshops/postgis-intro/indexing.html',
    },
  },
  {
    id: 'key-value-store',
    title: 'Distributed Key-Value Store',
    goal: 'GET/PUT theo key, phân vùng và replication với hợp đồng consistency rõ ràng.',
    requirements: [
      'Value size, TTL, durability và read/write latency.',
      'Chọn semantics cho concurrent writes và partition.',
      'Rebalance, repair và giới hạn hot key.',
    ],
    api: ['GET /kv/:key', 'PUT /kv/:key {value,expected_version?}'],
    data: 'key → value,version,tombstone; partition map; replicated log hoặc WAL và storage engine theo thiết kế.',
    flow: [
      'Client route key',
      'Partition owner',
      'Replicated write',
      'Durable commit',
      'Read theo consistency',
    ],
    deep: [
      'Hash partition trải key nhưng không chia tải của một key nóng. Consistent hashing giảm lượng key chuyển khi đổi node, không tự giải quyết replication hay consensus. Virtual node giúp phân bố nhưng cần quản lý capacity thực tế.',
      'Chọn một mô hình rõ ràng: leader với consensus có thể cung cấp linearizable operation theo protocol; leaderless cần version/conflict resolution và repair. Điều kiện R+W>N chỉ nói về giao nhau của tập replica dưới giả định, không tự đủ cho linearizability.',
    ],
    failure:
      'Node mất sau ACK: contract durability quyết định dữ liệu có còn trên replica đã xác nhận. Tombstone GC quá sớm có thể làm dữ liệu xóa sống lại sau repair.',
    tradeoff:
      'Consistency mạnh thường giảm write availability khi mất quorum; eventual consistency cần chính sách conflict phù hợp dữ liệu.',
    drill: [
      'Một key chiếm 80% traffic thì thêm node có giúp không?',
      'TTL và tombstone ảnh hưởng repair như thế nào?',
    ],
    source: { title: 'Raft consensus paper', url: 'https://raft.github.io/raft.pdf' },
  },
  {
    id: 'payments',
    title: 'Payment Processing',
    goal: 'Quản lý payment lifecycle, retry và reconciliation với provider ngoài.',
    requirements: [
      'Tạo payment, xác thực bổ sung, capture/refund tùy use case.',
      'Theo dõi pending/unknown thay vì đoán kết quả timeout.',
      'Audit, idempotency và bảo vệ dữ liệu thanh toán.',
    ],
    api: ['POST /payments + Idempotency-Key', 'POST /provider-webhooks', 'GET /payments/:id'],
    data: 'payment(id,merchant_id,request_key,amount_minor,currency,status,provider_ref); provider_event(id UNIQUE); ledger/audit bất biến theo yêu cầu.',
    flow: [
      'Client payment intent',
      'Reserve request key',
      'Provider call',
      'Webhook/reconciliation',
      'State transition & ledger',
    ],
    deep: [
      'Idempotency key có scope, payload fingerprint và retention. Không dùng floating point cho tiền. DB transaction nội bộ không bao phủ provider API; timeout phải lưu trạng thái chưa biết và query/reconcile theo provider_ref hoặc request key.',
      'Webhook có thể lặp và không theo thứ tự. Xác minh chữ ký từ raw body theo provider docs, dedup event_id, dùng state machine không hạ trạng thái cuối chỉ vì event cũ đến sau. Side effect như giao hàng phải dựa trên trạng thái được xác nhận theo hợp đồng.',
    ],
    failure:
      'Provider thành công nhưng response mất: retry đúng key hoặc query, không tạo payment mới tùy tiện. Reconciliation phát hiện lệch giữa provider, payment state và ledger.',
    tradeoff:
      'Phản hồi nhanh bằng pending giảm thời gian chờ nhưng UI và downstream phải chấp nhận eventual completion.',
    drill: [
      'Webhook PAID đến trước response CREATE thì xử lý ra sao?',
      'Refund một phần nhiều lần giữ invariant nào?',
    ],
    source: stripe,
  },
  {
    id: 'leaderboard',
    title: 'Leaderboard',
    goal: 'Top-k và thứ hạng cá nhân theo season, với tie-breaker ổn định.',
    requirements: [
      'Score update, top-k, rank của user, vùng quanh rank.',
      'Làm rõ score cộng dồn hay thay thế và chống gian lận.',
      'Season boundary và khả năng rebuild.',
    ],
    api: [
      'POST /score-events {event_id,user_id,delta,season}',
      'GET /leaderboard?season=...&limit=...',
    ],
    data: 'score_event(event_id UNIQUE,season,user_id,delta); sorted set theo season; authoritative score store hoặc log để rebuild.',
    flow: [
      'Validate score event',
      'Dedup event_id',
      'Atomic score update',
      'Sorted ranking index',
      'Top-k hoặc rank lookup',
    ],
    deep: [
      'Redis sorted set phù hợp score/rank và range query, nhưng cần nêu durability, tie behavior và partition. Nếu update là delta, duplicate event làm tăng sai điểm; cần dedup atomically với cập nhật hoặc đảm bảo projection từ log.',
      'Tie-breaker có thể là thời gian đạt score hoặc user_id theo rule sản phẩm. Không nhét timestamp tùy ý vào floating score nếu vượt độ chính xác. Global rank trên nhiều shard cần aggregation/ranking strategy, không chỉ lấy top-k từng shard cho mọi loại query.',
    ],
    failure:
      'Cache/index mất: replay từ nguồn bền vững theo checkpoint; khi replay cần tránh double-count score event.',
    tradeoff:
      'Exact global rank tốn phối hợp hơn rank gần đúng. Tách season giảm dữ liệu nóng nhưng cần khóa ghi vào season đã đóng.',
    drill: [
      'Hai user cùng điểm sẽ xếp ai trước?',
      'Nếu client tự gửi score, chống gian lận ở đâu?',
    ],
    source: redis,
  },
  {
    id: 'ad-clicks',
    title: 'Ad Click Aggregation',
    goal: 'Tổng hợp click theo thời gian, xử lý late event và duplicate có thể kiểm toán.',
    requirements: [
      'Ingest event, thống kê theo ad/campaign/window.',
      'Làm rõ dashboard gần thời gian thực hay số liệu billing cuối.',
      'Fraud filtering, retention và privacy.',
    ],
    api: ['POST /events/clicks {event_id,ad_id,event_time}', 'GET /campaigns/:id/stats?window=...'],
    data: 'Immutable raw events, dedup event_id, aggregates keyed by campaign/window/version; watermark/checkpoint cho stream job.',
    flow: [
      'Click ingestion',
      'Durable event log',
      'Dedup & event-time window',
      'Aggregate store',
      'Dashboard/reconciliation',
    ],
    deep: [
      'Event time khác processing time. Watermark và allowed lateness định nghĩa khi nào tạm chốt window; event đến muộn có thể cập nhật kết quả hoặc đi correction pipeline. Cần công bố dashboard là provisional hay final.',
      'Kafka transaction/stream processing có thể hỗ trợ exactly-once trong một phạm vi, nhưng sink ngoài và billing vẫn cần idempotency/transaction phù hợp. Raw log có retention đủ để replay và audit; metric aggregate có version để rebuild không lẫn dữ liệu cũ.',
    ],
    failure:
      'Consumer restart sau ghi sink trước checkpoint có thể đếm lại. Dùng transactional sink hoặc deterministic upsert theo window/version/offset scope.',
    tradeoff:
      'Lateness window dài tăng độ đầy đủ nhưng làm kết quả cuối chậm hơn. Approximate distinct rẻ hơn exact nhưng không phù hợp mọi billing contract.',
    drill: [
      'Click của hôm qua tới hôm nay tính vào ngày nào?',
      'Replay toàn log có làm dashboard tăng gấp đôi không?',
    ],
    source: kafka,
  },
  {
    id: 'reservations',
    title: 'Ticket & Hotel Reservations',
    goal: 'Giữ chỗ có thời hạn và thanh toán mà không bán trùng inventory.',
    requirements: [
      'Search availability, hold, confirm và cancel.',
      'Làm rõ seat cụ thể hay quota theo room type/ngày.',
      'Hold expiry và payment timeout có race cần xử lý.',
    ],
    api: ['POST /holds {inventory_id,quantity}', 'POST /holds/:id/confirm + Idempotency-Key'],
    data: 'inventory(resource,date,available); hold(id,expires_at,status); booking(id,hold_id UNIQUE). Constraint/atomic update giữ quota không âm.',
    flow: [
      'Search snapshot',
      'Atomic hold',
      'Payment intent',
      'Confirm transaction',
      'Expire hoặc compensate',
    ],
    deep: [
      'Search availability có thể cũ; quyết định bán phải kiểm lại trong transaction. Với ghế cụ thể có thể dùng unique constraint trên active allocation; với quota dùng conditional update hoặc lock record theo ngày/loại phòng. Giữ lock database qua thời gian người dùng thanh toán là lựa chọn tệ.',
      'Hold là state có expires_at và version. Worker expiry và request confirm cạnh tranh cần conditional transition. Không xác nhận chỉ vì worker chưa kịp expire; server phải kiểm deadline. Payment thành công sau hold hết hạn cần refund/reallocation theo policy đã chọn.',
    ],
    failure:
      'Hai request confirm/expire cùng chạy: chỉ một transition thắng. Reconciliation xử lý payment đã thu nhưng booking chưa confirmed.',
    tradeoff:
      'Hold dài cải thiện trải nghiệm thanh toán nhưng làm cạn inventory tạm thời; hold ngắn tăng chuyển đổi thất bại.',
    drill: [
      'Ai được ưu tiên khi payment thành công sát thời điểm expiry?',
      'Đặt phòng 3 đêm phải giữ quota nguyên tử thế nào?',
    ],
    source: pg,
  },
  {
    id: 'metrics-alerts',
    title: 'Metrics & Alerting',
    goal: 'Thu thập time series, truy vấn theo window và cảnh báo theo tác động người dùng.',
    requirements: [
      'Ingest metrics, labels, retention, query và alert.',
      'Giới hạn cardinality; làm rõ resolution theo thời gian.',
      'Alert grouping, dedup và recovery notification.',
    ],
    api: ['POST /metrics/write', 'GET /metrics/query?expr=...', 'POST /alert-rules'],
    data: 'Series identity = metric name + label set. Time-ordered samples, recording rules, alert instance state pending/firing/resolved.',
    flow: [
      'Instrument service',
      'Scrape/remote write',
      'Time-series storage',
      'Rule evaluation',
      'Grouped notification',
    ],
    deep: [
      'Label user_id/request_id tạo cardinality lớn và tăng memory/index cost. Metrics thích hợp tổng hợp; trace/log lưu chi tiết request theo sampling/retention. Histogram bucket cho phép tổng hợp phân phối khi thiết kế đúng; không lấy trung bình p99 của các instance.',
      'Alert nên bám SLO hoặc symptom có action. for-duration giảm báo động transient nhưng tăng time-to-detect. Missing data cần policy khác zero traffic: không có metric có thể là agent hoặc pipeline đã chết.',
    ],
    failure:
      'Monitoring cùng failure domain với ứng dụng có thể im lặng khi cả vùng mất. Health check độc lập và meta-monitoring giúp phát hiện mất tín hiệu.',
    tradeoff:
      'Resolution cao và retention dài tăng cost. Downsampling giảm chi phí nhưng mất chi tiết spike.',
    drill: [
      'Không có sample khác giá trị 0 như thế nào?',
      'Làm sao tránh 1.000 alert cho cùng một dependency outage?',
    ],
    source: {
      title: 'Prometheus — Alerting practices',
      url: 'https://prometheus.io/docs/practices/alerting/',
    },
  },
  {
    id: 'maps-routing',
    title: 'Maps & Routing',
    goal: 'Tìm đường trên road graph, tách base map, route và traffic overlay.',
    requirements: [
      'Tìm địa điểm, route theo mode và ETA.',
      'Làm rõ real-time traffic, turn restrictions và region.',
      'Map tile đọc nhiều; route query cần thuật toán riêng.',
    ],
    api: ['GET /tiles/:z/:x/:y', 'POST /routes {origin,destination,mode}'],
    data: 'Road graph node/edge với direction, cost và restrictions; versioned tiles; traffic weight overlay theo đoạn đường/thời gian.',
    flow: [
      'Origin/destination',
      'Snap to road graph',
      'Route search',
      'Apply traffic costs',
      'Polyline & ETA',
    ],
    deep: [
      'Dijkstra/A* là baseline để giải thích; routing lớn có thể dùng preprocessing/hierarchy. Heuristic A* cần admissible nếu muốn bảo đảm optimal theo mô hình cost. Cấm rẽ, đường một chiều và mode đi bộ/xe không chỉ là khoảng cách hình học.',
      'Tiles có thể precompute và CDN cache theo version. Traffic cập nhật thường xuyên hơn graph; tách overlay để tránh rebuild toàn base map. ETA cần calibration và nêu uncertainty, không chỉ lấy length/speed_limit.',
    ],
    failure:
      'Traffic feed mất: dùng historical/default speed và báo giảm độ tin cậy. Graph version mới cần rollout thống nhất với tile/route response khi quan trọng.',
    tradeoff:
      'Preprocessing tăng tốc query nhưng làm cập nhật graph phức tạp. Route nhanh nhất khác route ngắn nhất.',
    drill: [
      'Dữ liệu traffic cũ 30 phút thì degrade thế nào?',
      'Tại sao không dùng geohash để tìm toàn bộ đường đi?',
    ],
    source: { title: 'OSRM — Routing API', url: 'https://project-osrm.org/docs/v5.24.0/api/' },
  },
  {
    id: 'nearby-friends',
    title: 'Nearby Friends',
    goal: 'Chia sẻ vị trí có consent, TTL và phạm vi nhìn thấy rõ ràng.',
    requirements: [
      'Opt-in, tắt chia sẻ, friend/block policy.',
      'Vị trí gần thời gian thực và độ chính xác phù hợp.',
      'Giới hạn battery, bandwidth và retention vị trí.',
    ],
    api: ['PUT /me/location {lat,lng,accuracy,sequence}', 'GET /friends/nearby?radius=...'],
    data: 'latest_location(user_id,cell,point,sequence,expires_at); friendship/visibility policy. Không mặc định lưu lịch sử vô hạn.',
    flow: [
      'Opt-in device update',
      'Validate sequence & identity',
      'Spatial location index',
      'Friend/privacy filter',
      'Nearby result với freshness',
    ],
    deep: [
      'Chỉ nhận update mới hơn theo session/sequence để packet trễ không ghi đè vị trí mới. Mỗi vị trí có timestamp và TTL; online không đồng nghĩa vị trí còn mới. Tần suất update có thể thích ứng theo chuyển động và trạng thái app.',
      'Tìm candidate theo cell rồi lọc distance và quyền hiện tại. Cache kết quả cần scoped theo viewer; user revoke sharing phải dừng publish và làm mất khả năng truy vấn trong thời gian policy cho phép. Có thể làm tròn vị trí để giảm độ nhạy nếu phù hợp sản phẩm.',
    ],
    failure:
      'Thiết bị mất mạng: vị trí hết TTL thay vì hiện mãi như đang ở đó. Kiểm tra quyền ở server ngay cả khi client đã tắt UI.',
    tradeoff:
      'Update dày tăng freshness nhưng tốn pin và lộ thêm thông tin. Coarse location bảo vệ privacy nhưng giảm độ chính xác khoảng cách.',
    drill: [
      'User block bạn nhưng vị trí đang trong cache thì sao?',
      'GPS nhảy xa bất thường có nên nhận ngay không?',
    ],
    source: { title: 'W3C — Geolocation', url: 'https://www.w3.org/TR/geolocation/' },
  },
  {
    id: 'object-storage',
    title: 'Object Storage',
    goal: 'Lưu blob lớn bền vững với metadata, upload nhiều phần và lifecycle.',
    requirements: [
      'PUT/GET/DELETE, multipart và access control.',
      'Làm rõ consistency contract và durability target.',
      'Checksum, versioning, lifecycle và garbage collection.',
    ],
    api: [
      'POST /uploads → upload_id',
      'PUT /uploads/:id/parts/:part',
      'POST /uploads/:id/complete',
    ],
    data: 'Object metadata(bucket,key,version,manifest,checksum,state); immutable chunks/replicas; upload session với part list và expiry.',
    flow: [
      'Authorize upload',
      'Store parts & checksum',
      'Complete manifest',
      'Publish object metadata',
      'GET reassemble/stream',
    ],
    deep: [
      'Complete upload là thời điểm object trở nên đọc được theo contract. Chỉ publish manifest trỏ tới các part hợp lệ; retry Complete cần trả kết quả nhất quán. ETag không phải lúc nào cũng là MD5 toàn file, đặc biệt multipart hay các chế độ mã hóa.',
      'Replication đơn giản phục hồi nhanh nhưng tốn dung lượng; erasure coding giảm overhead lưu trữ với chi phí CPU/network khi repair và đọc degraded. Metadata và placement quyết định tìm chunk ở đâu, cần redundancy riêng.',
    ],
    failure:
      'Uploader bỏ dở để lại part: lifecycle abort sau grace period. Node chết cần repair theo budget để không làm nghẽn traffic foreground.',
    tradeoff:
      'Erasure coding tiết kiệm storage nhưng tăng độ phức tạp và repair cost. Versioning hỗ trợ recovery nhưng tăng retention cost.',
    drill: [
      'GET chạy khi Complete chưa kết thúc thấy gì?',
      'Xóa metadata trước khi GC blob giúp tránh race nào?',
    ],
    source: s3,
  },
  {
    id: 'exchange',
    title: 'Exchange Order Matching',
    goal: 'Nhận và khớp limit order có thứ tự xác định, kiểm tra balance và khả năng replay.',
    requirements: [
      'Limit order, cancel, trade record và market data.',
      'Chọn price-time priority hoặc rule rõ ràng.',
      'Làm rõ phạm vi ordering theo instrument và audit.',
    ],
    api: ['POST /orders {client_order_id,symbol,side,price,quantity}', 'DELETE /orders/:id'],
    data: 'Order log có sequence, order book theo symbol, trade(id,buy_order,sell_order,price,qty); reserved balance và ledger.',
    flow: [
      'Validate & reserve',
      'Durable sequence log',
      'Matching engine',
      'Trade & balance event',
      'Market data projection',
    ],
    deep: [
      'Single writer theo instrument đơn giản hóa thứ tự và deterministic replay. Matching ưu tiên price rồi time theo rule; cancel cũng là event cùng ordering domain. Không dùng clock client làm thứ tự authoritative.',
      'Risk/balance reservation phải tránh một tài khoản dùng cùng tiền cho nhiều lệnh. Matching log và ledger cần giao thức phối hợp xác định; nói “Kafka xử lý hết” không giải quyết invariant số dư. Snapshot giảm thời gian replay nhưng phải gắn đúng log offset.',
    ],
    failure:
      'Engine crash: khôi phục snapshot và replay log; event output có ID ổn định để downstream dedup. Không xác nhận order trước durability contract.',
    tradeoff:
      'Tách theo symbol tăng parallelism nhưng order đa leg và risk theo tài khoản phức tạp hơn.',
    drill: ['Cancel và match tới cùng lúc ai thắng?', 'Replay có tạo trade mới với ID khác không?'],
    source: kafka,
  },
  {
    id: 'collaborative-editor',
    title: 'Collaborative Editor',
    goal: 'Nhiều người sửa cùng tài liệu, đồng bộ offline và hội tụ trạng thái.',
    requirements: [
      'Concurrent editing, presence và version history.',
      'Làm rõ loại document: plain text hay rich text.',
      'Quyền edit, reconnect và recovery.',
    ],
    api: [
      'POST /documents/:id/operations {client_id,seq,base_version,op}',
      'GET /documents/:id/snapshot',
    ],
    data: 'Document snapshot + operation log; op_id duy nhất; logical/version metadata tùy OT hoặc CRDT; presence có TTL.',
    flow: [
      'Local edit',
      'Operation sync',
      'OT transform hoặc CRDT merge',
      'Persist & broadcast',
      'Snapshot/compaction',
    ],
    deep: [
      'OT biến đổi operation theo operation đồng thời; CRDT thiết kế operation/state để merge hội tụ theo điều kiện của thuật toán. Không chỉ cộng timestamp rồi gọi là CRDT. Rich text, cursor và undo cần semantics riêng, đặc biệt khi nhiều người sửa cùng vùng.',
      'Client optimistic apply để gõ mượt. Server kiểm permission, dedup operation và cung cấp sync từ version. Cursor/presence là ephemeral, không cần cùng độ bền vững như nội dung. Snapshot và compaction phải giữ đủ metadata cho client offline hoặc buộc full resync.',
    ],
    failure:
      'Reconnect gửi lại operation: dedup theo client_id/seq. Client quá cũ không thể apply incremental thì tải snapshot, xử lý local pending edits theo protocol.',
    tradeoff:
      'CRDT hỗ trợ offline tốt nhưng có metadata/tombstone cost; centralized OT cần transformation đúng và coordinator phù hợp.',
    drill: [
      'Hai người xóa và chèn cùng vị trí thì kết quả hợp lệ là gì?',
      'Undo có được xóa thao tác của người khác không?',
    ],
    source: { title: 'Yjs — CRDT documentation', url: 'https://docs.yjs.dev/' },
  },
  {
    id: 'llm-serving',
    title: 'LLM Inference Serving',
    goal: 'Phục vụ generation có streaming, giới hạn token và kiểm soát tài nguyên GPU.',
    requirements: [
      'Streaming completion, cancel và request budget.',
      'Phân biệt TTFT, inter-token latency và throughput.',
      'Tenant isolation, model version và admission control.',
    ],
    api: ['POST /generations {model,input,max_output_tokens}', 'DELETE /generations/:id'],
    data: 'Request metadata, token budget, model/version routing; KV cache phục vụ request hoặc prefix reuse theo policy isolation.',
    flow: [
      'Authenticate & token budget',
      'Admission queue',
      'Prefill',
      'Continuous decode batching',
      'Stream & usage accounting',
    ],
    deep: [
      'Prefill xử lý prompt để tạo trạng thái; decode sinh token theo bước. KV cache giảm tính toán attention lặp nhưng tiêu thụ memory tăng theo sequence length và batch. Vì vậy giới hạn concurrent sequences chỉ theo số request là chưa đủ.',
      'Continuous batching đưa request mới vào khi slot trống thay vì chờ cả batch cũ kết thúc. Scheduling cần cân TTFT với decode latency, request dài với ngắn và cancellation. Prefix cache phải có model/tokenizer/config tương thích và tránh tái sử dụng dữ liệu private qua tenant.',
    ],
    failure:
      'GPU OOM: admission control theo budget thực tế, giới hạn context/output, cancellation cleanup và retry có giới hạn. Không retry stream mù quáng sau khi đã trả một phần output.',
    tradeoff:
      'Batch lớn tăng throughput nhưng có thể xấu latency từng user. Model nhỏ/quantized giảm cost nhưng cần eval chất lượng theo task.',
    drill: [
      'User cancel mà KV cache không được giải phóng thì sao?',
      'Tại sao RPS thấp nhưng GPU vẫn OOM?',
    ],
    source: {
      title: 'vLLM — Serving documentation',
      url: 'https://docs.vllm.ai/en/latest/serving/',
    },
  },
  {
    id: 'email-service',
    title: 'Email Service',
    goal: 'Lưu mailbox và gửi/nhận mail với chống abuse, retry và search.',
    requirements: [
      'Send/receive, folder/labels, attachment và full-text search.',
      'Làm rõ outbound relay hay mail server đầy đủ.',
      'Quota, spam filtering và account security.',
    ],
    api: ['POST /messages/send + Idempotency-Key', 'GET /mailbox?cursor=...', 'GET /messages/:id'],
    data: 'message blob immutable, mailbox entry(user_id,message_id,labels,flags), attachment object, delivery queue và search index.',
    flow: [
      'Compose & validate',
      'Persist sent/outbox',
      'SMTP delivery worker',
      'Recipient ingestion',
      'Mailbox index & search',
    ],
    deep: [
      'Mail body và attachment lớn nên tách blob với metadata mailbox. Nhiều recipient có thể chia sẻ blob theo quyền lưu trữ nhưng flag/read/label là per-user. Search là projection có lag, download vẫn đi qua authorization.',
      'SMTP retry/response có semantics khác HTTP. Timeout sau khi remote nhận có thể dẫn tới giao lặp; Message-ID hữu ích nhưng không là bảo đảm exactly-once. Outbound cần rate limit, reputation, SPF/DKIM/DMARC phù hợp; không biến service thành open relay.',
    ],
    failure:
      'Search index hỏng có thể rebuild từ mailbox nguồn. Delivery retry phải có deadline, bounce state và giới hạn để tránh retry storm.',
    tradeoff:
      'Index toàn body cho search nhanh tăng storage và yêu cầu privacy. Encryption end-to-end làm server-side search khó hơn.',
    drill: [
      'Xóa mail ở một recipient có được xóa shared blob ngay không?',
      'Attachment chưa upload xong có cho send không?',
    ],
    source: { title: 'IETF — SMTP RFC 5321', url: 'https://www.rfc-editor.org/rfc/rfc5321' },
  },
  {
    id: 'message-queue',
    title: 'Distributed Message Queue',
    goal: 'Broker có durable append, consumer progress và backpressure rõ ràng.',
    requirements: [
      'Publish, consume, ACK, retry và retention.',
      'Làm rõ work queue hay replayable log; ordering scope.',
      'Producer ack policy và consumer group semantics.',
    ],
    api: [
      'POST /topics/:id/messages {key,event_id,payload}',
      'GET /topics/:id/poll?group=...',
      'POST /groups/:id/ack',
    ],
    data: 'Partition log + sequence/offset; replication metadata; committed offset hoặc visibility/ACK state; DLQ.',
    flow: [
      'Producer publish',
      'Partition append',
      'Replicated durability',
      'Consumer effect',
      'ACK/checkpoint',
    ],
    deep: [
      'Log với offset và work queue với visibility timeout là hai model khác nhau; nên chọn model trước. Trong log, partition bảo đảm ordering cục bộ và consumer group chia partition. Trong queue, message chưa ACK có thể xuất hiện lại khi visibility timeout hết.',
      'Backpressure thể hiện qua lag, queue age và giới hạn in-flight. Thêm consumer chỉ hữu ích tới giới hạn parallelism/partition và downstream capacity. Poison message cần retry policy, DLQ và công cụ replay có kiểm soát.',
    ],
    failure:
      'Consumer commit side effect rồi chết trước checkpoint sẽ xử lý lại. Dedupe/transaction ở sink quyết định kết quả thực sự, không chỉ broker config.',
    tradeoff:
      'Retention dài hỗ trợ replay nhưng tăng storage. Bảo đảm ordering chặt cho một key giới hạn khả năng xử lý song song key đó.',
    drill: [
      'ACK trước side effect có thể mất gì?',
      'Rebalance group khi message đang xử lý phải tránh lỗi nào?',
    ],
    source: kafka,
  },
  {
    id: 'digital-wallet',
    title: 'Digital Wallet',
    goal: 'Chuyển số dư có ledger, idempotency và invariant tiền tệ.',
    requirements: [
      'Nạp, chuyển, rút, lịch sử; xác định currency.',
      'Không chi vượt số dư theo policy, audit và reconciliation.',
      'Transfer nội bộ khác settlement với ngân hàng ngoài.',
    ],
    api: [
      'POST /transfers {from,to,amount_minor,currency} + Idempotency-Key',
      'GET /accounts/:id/ledger',
    ],
    data: 'accounts, transfer(id,key UNIQUE,status), journal và balanced ledger entries. Amount dùng integer minor unit hoặc decimal chính xác theo currency.',
    flow: [
      'Validate & authorize',
      'Reserve idempotency key',
      'Lock/conditional balance',
      'Debit + credit transaction',
      'Commit & outbox',
    ],
    deep: [
      'Double-entry giữ tổng debit/credit cân bằng theo ledger rule, không tự ngăn negative balance; vẫn cần kiểm available funds dưới concurrency. Trong một DB, chuyển nội bộ có thể dùng transaction, lock account theo thứ tự nhất quán để giảm deadlock.',
      'Balance có thể là projection từ ledger hoặc cache được cập nhật atomically với entry. Ledger sửa sai bằng reversal/adjustment có liên kết, không tùy tiện sửa lịch sử đã post. Với ngân hàng ngoài, trạng thái pending và reconciliation quan trọng vì không có một transaction ACID bao trùm mọi hệ thống.',
    ],
    failure:
      'Response mất sau commit: retry cùng key trả transfer cũ. Deadlock/serialization failure phải retry toàn transaction trong budget, không chỉ câu lệnh cuối.',
    tradeoff:
      'Ledger giàu audit làm data model phức tạp hơn số dư đơn lẻ. Tách shard theo account làm transfer liên shard khó hơn.',
    drill: [
      'Hai lần rút đồng thời từ số dư 100 phải giữ invariant nào?',
      'Số dư ledger khác provider settlement thì xử lý thế nào?',
    ],
    source: pg,
  },
  {
    id: 'job-scheduler',
    title: 'Distributed Job Scheduler',
    goal: 'Chạy tác vụ theo thời gian với lease, retry và giới hạn side effect trùng.',
    requirements: [
      'One-shot, recurring jobs, cancel, retry và priority.',
      'Làm rõ độ chính xác thời gian và timezone/DST.',
      'At-least-once execution; idempotency ở task side effect.',
    ],
    api: [
      'POST /jobs {run_at,payload,retry_policy}',
      'POST /jobs/:id/cancel',
      'GET /jobs/:id/attempts',
    ],
    data: 'job(id,run_at,state,version); attempt(id,job_id,lease_until,fencing_token,status); occurrence_id duy nhất cho recurring schedule.',
    flow: [
      'Schedule record',
      'Due-job dispatcher',
      'Atomic claim + lease',
      'Worker heartbeat/effect',
      'Complete hoặc retry',
    ],
    deep: [
      'Dispatcher tìm due jobs bằng time index hoặc bucket, claim atomically để tránh hai worker cùng nhận. Lease hết hạn cho phép nhận lại nhưng worker cũ có thể vẫn chạy; fencing token chỉ bảo vệ nếu hệ thống nhận side effect kiểm token.',
      'Recurring schedule cần định nghĩa timezone và cách xử lý giờ DST lặp/mất. Mỗi occurrence có ID riêng để retry không tạo thêm lần chạy. Delay thực tế phụ thuộc poll interval, queue lag và thời gian worker; không hứa chạy đúng một mili giây nếu kiến trúc không hỗ trợ.',
    ],
    failure:
      'Worker pause dài rồi tiếp tục sau khi lease mất: cancel hợp tác không đủ; downstream cần idempotency/fencing đúng phạm vi.',
    tradeoff:
      'Polling đơn giản nhưng tăng query load/độ trễ; timing wheel/time buckets hiệu quả hơn khi scale lớn nhưng phức tạp reschedule/recovery.',
    drill: [
      'Job bị cancel đúng lúc đã bắt đầu side effect thì trạng thái gì?',
      'DST tạo 01:30 hai lần, recurring job chạy mấy lần?',
    ],
    source: pg,
  },
  {
    id: 'search-engine',
    title: 'Search Engine',
    goal: 'Index nội dung và truy vấn có ranking, authorization và khả năng rebuild.',
    requirements: [
      'Full-text search, filters, pagination và highlight.',
      'Làm rõ freshness, languages, typo và ranking.',
      'Không để index làm lộ document private.',
    ],
    api: ['POST /documents/:id/index {version,content,acl}', 'GET /search?q=...&cursor=...'],
    data: 'Authoritative document store; inverted index term→posting list; document version, fields và ACL projection; ingestion checkpoint.',
    flow: [
      'Source commit',
      'CDC/outbox ingestion',
      'Analyze & index',
      'Query candidate/rank',
      'ACL filter & hydrate',
    ],
    deep: [
      'Tokenizer/analyzer phải phù hợp ngôn ngữ và nhất quán giữa index/query. Inverted index tạo candidate; ranking như BM25 khác semantic vector search. Hybrid search cần đánh giá bằng tập query có nhãn, không chọn chỉ vì công nghệ mới.',
      'Update/delete theo document version để event cũ không làm sống lại nội dung. Query-time ACL filter hoặc permission check khi hydrate cần bảo đảm không lộ qua snippet, count hay cache. Deep pagination nên dùng search-after/cursor và snapshot semantics khi cần ổn định.',
    ],
    failure:
      'Index bị hỏng: build index version mới từ nguồn, bắt kịp change stream rồi swap alias. Delete nhạy cảm cần propagation theo SLA, không chỉ chờ full rebuild.',
    tradeoff:
      'Index nhiều field/language tăng relevance nhưng tăng storage và ingest cost. Freshness nhanh cần refresh thường hơn, ảnh hưởng throughput.',
    drill: [
      'Tài liệu đổi từ public sang private nhưng index chưa cập nhật?',
      'Làm sao rebuild index mà không dừng search?',
    ],
    source: search,
  },
];
