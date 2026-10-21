export interface Learning {
  takeaways: string[];
  analogy: string;
  path: string[];
  lab: string;
}
export const learning: Record<string, Learning> = {
  programming: {
    takeaways: [
      'Xác định input, output và invariant trước khi viết code.',
      'Đặt tên theo ý nghĩa; tách hàm khi có một trách nhiệm rõ ràng.',
      'Kiểm tra boundary, lỗi và side effect thay vì chỉ happy path.',
    ],
    analogy:
      'Một công thức nấu ăn tốt cần định lượng đầu vào, thứ tự thao tác và điều kiện món đã chín.',
    path: ['Đọc yêu cầu', 'Xác định hợp đồng', 'Viết hàm nhỏ', 'Kiểm tra boundary'],
    lab: 'complexity',
  },
  oop: {
    takeaways: [
      'Encapsulation bảo vệ invariant; private không tự động làm thiết kế tốt.',
      'Polymorphism cho phép thay implementation qua cùng một hợp đồng.',
      'Ưu tiên composition khi quan hệ kế thừa không thực sự là “is-a”.',
    ],
    analogy: 'Ổ cắm là interface; mỗi thiết bị thực hiện hợp đồng theo cách riêng.',
    path: ['Client', 'Interface', 'Implementation được chọn', 'Kết quả giữ đúng hợp đồng'],
    lab: 'oop',
  },
  dsa: {
    takeaways: [
      'Chọn cấu trúc dữ liệu theo thao tác thường gặp và memory budget.',
      'Big O mô tả tốc độ tăng, không thay cho benchmark thực tế.',
      'Hash lookup trung bình O(1); collision và phân bố dữ liệu vẫn quan trọng.',
    ],
    analogy: 'Tìm sách trong một chồng, danh sách đã sắp xếp và mục lục cần những cách khác nhau.',
    path: ['Dữ liệu đầu vào', 'Chọn cấu trúc', 'Chọn thuật toán', 'Đo thời gian & bộ nhớ'],
    lab: 'complexity',
  },
  os: {
    takeaways: [
      'Process có không gian địa chỉ riêng; thread chia sẻ tài nguyên của process.',
      'Concurrency cần đồng bộ khi truy cập shared mutable state.',
      'Scheduling và context switch có chi phí; nhiều thread chưa chắc nhanh hơn.',
    ],
    analogy:
      'Một đầu bếp chia thời gian cho nhiều món là concurrency; nhiều bếp cùng nấu mới là parallelism.',
    path: ['Ready queue', 'CPU scheduler', 'Running', 'Blocked hoặc complete'],
    lab: 'schedule',
  },
  git: {
    takeaways: [
      'Commit là snapshot có quan hệ cha, branch là con trỏ di động.',
      'Merge giữ lịch sử phân nhánh; rebase tạo commit mới.',
      'Trước khi sửa lịch sử chung, kiểm tra ai đang dựa vào các commit đó.',
    ],
    analogy: 'Branch giống dấu trang trỏ vào một trang trong cuốn nhật ký có lịch sử.',
    path: ['Working tree', 'Staging area', 'Local commit', 'Remote branch'],
    lab: 'git',
  },
  linux: {
    takeaways: [
      'stdin, stdout và stderr là các luồng riêng.',
      'Pipe nối stdout vào stdin; không tự đưa stderr qua pipe.',
      'Quyền truy cập phụ thuộc user, group và các quyền trên thư mục cha.',
    ],
    analogy: 'Pipeline là dây chuyền: mỗi công cụ chỉ nhận và biến đổi một dòng dữ liệu.',
    path: ['Log file', 'Lọc mẫu', 'Chọn trường', 'Đếm & sắp xếp'],
    lab: 'linux',
  },
  network: {
    takeaways: [
      'DNS tìm endpoint; TCP/QUIC vận chuyển; TLS bảo vệ kênh; HTTP mô tả trao đổi.',
      'Timeout không chứng minh server chưa xử lý request.',
      'Đo DNS, handshake và TTFB để tìm đúng chỗ chậm.',
    ],
    analogy: 'DNS là danh bạ; TLS xác thực người nhận và niêm phong thư; HTTP là nội dung thư.',
    path: ['DNS lookup', 'Kết nối & TLS', 'HTTP request', 'Response & cache'],
    lab: 'network',
  },
  'html-css': {
    takeaways: [
      'Semantic HTML giúp cả người dùng bàn phím, screen reader và máy tìm kiếm.',
      'Box model gồm content, padding, border và margin.',
      'Responsive cần kiểm tra overflow và nội dung dài, không chỉ vài breakpoint.',
    ],
    analogy:
      'Content là đồ trong hộp; padding là lớp đệm; border là vỏ; margin là khoảng cách giữa các hộp.',
    path: ['Semantic HTML', 'Cascade & layout', 'Responsive', 'Accessibility'],
    lab: 'box',
  },
  javascript: {
    takeaways: [
      'Synchronous code chạy trước; microtask được xử lý khi stack rỗng.',
      'Closure giữ tham chiếu tới lexical environment.',
      'Promise không tự biến công việc CPU nặng thành chạy song song.',
    ],
    analogy: 'Call stack là việc đang làm; microtask là việc cần xử lý ngay sau khi dọn xong bàn.',
    path: ['Call stack', 'Microtask checkpoint', 'Task queue', 'Render opportunity'],
    lab: 'eventloop',
  },
  typescript: {
    takeaways: [
      'TypeScript kiểm tra lúc build; type không tồn tại như validator ở runtime.',
      'unknown buộc kiểm tra trước khi dùng; any bỏ qua kiểm tra.',
      'Discriminated union mô tả các trạng thái hợp lệ rõ hơn nhiều boolean.',
    ],
    analogy: 'Bản vẽ giúp thợ xây tránh lỗi; vẫn cần kiểm tra vật liệu thực tế khi nhận hàng.',
    path: ['Dữ liệu unknown', 'Runtime validation', 'Narrow type', 'Dùng dữ liệu hợp lệ'],
    lab: 'typescript',
  },
  react: {
    takeaways: [
      'Render là tính UI từ props và state, không trực tiếp đồng nghĩa cập nhật DOM.',
      'State là snapshot của một lần render; functional update dùng state đang chờ.',
      'Effect đồng bộ với hệ thống bên ngoài; derived state thường tính ngay trong render.',
    ],
    analogy:
      'Mỗi lần render là một tấm ảnh chụp trạng thái; handler nhìn thấy tấm ảnh của lần render đó.',
    path: ['Event', 'State update queue', 'Render', 'Commit DOM'],
    lab: 'react',
  },
  rendering: {
    takeaways: [
      'CSR, SSR và SSG quyết định nơi và thời điểm tạo HTML.',
      'Hydration gắn tương tác lên HTML có sẵn; dữ liệu khác nhau có thể gây mismatch.',
      'Chọn theo tốc độ hiển thị, độ mới nội dung, SEO và chi phí vận hành.',
    ],
    analogy:
      'SSG như sách in sẵn, SSR như in theo đơn và CSR như gửi bộ hướng dẫn để người đọc tự lắp.',
    path: ['Yêu cầu trang', 'HTML có sẵn hoặc sinh mới', 'Tải JavaScript', 'Tương tác'],
    lab: 'rendering',
  },
  backend: {
    takeaways: [
      'Đi theo luồng request để tách validation, authorization, business rule và persistence.',
      'Database constraint là lớp bảo vệ cuối cho invariant.',
      'Side effect sang hệ thống khác cần retry, idempotency và theo dõi.',
    ],
    analogy:
      'Quầy tiếp nhận kiểm hồ sơ, bộ phận nghiệp vụ quyết định, kho lưu trữ đảm bảo hồ sơ nhất quán.',
    path: ['Frontend', 'API & authorization', 'Business service', 'Database & outbox'],
    lab: 'backend',
  },
  nodejs: {
    takeaways: [
      'Event loop xử lý callback; một số I/O dùng kernel, một số dùng libuv thread pool.',
      'CPU-bound JavaScript giữ event loop bận và tăng latency của request khác.',
      'Dùng worker thread hoặc job worker cho tính toán nặng khi phù hợp.',
    ],
    analogy:
      'Nhân viên tiếp tân có thể giao việc đi; nếu tự ngồi tính toán lâu thì mọi người ở quầy đều phải chờ.',
    path: ['Request', 'Event loop', 'I/O hoặc worker', 'Callback & response'],
    lab: 'eventloop',
  },
  api: {
    takeaways: [
      'Thiết kế resource, status và lỗi theo một hợp đồng nhất quán.',
      'Idempotency key cần gắn với request fingerprint và kết quả đã xử lý.',
      'Retry có backoff, jitter và budget; timeout vẫn có thể là kết quả chưa biết.',
    ],
    analogy: 'Mã đơn hàng giúp quầy biết lần gọi lại là cùng một giao dịch hay đơn mới.',
    path: ['Client retry', 'Idempotency lookup', 'Transaction', 'Lưu kết quả & trả response'],
    lab: 'api',
  },
  auth: {
    takeaways: [
      'Authentication xác định ai; authorization quyết định được làm gì với resource nào.',
      'Kiểm tra ownership ở server cho mỗi request.',
      'Token có chữ ký không đồng nghĩa token được mã hóa hay có thể thu hồi ngay.',
    ],
    analogy: 'Có thẻ vào tòa nhà không có nghĩa được mở mọi phòng.',
    path: ['Credential', 'Identity', 'Resource policy', 'Allow hoặc deny'],
    lab: 'auth',
  },
  security: {
    takeaways: [
      'Threat model bắt đầu từ tài sản, trust boundary và khả năng của attacker.',
      'Parameterized query và output encoding giải quyết những lớp tấn công khác nhau.',
      'Defense in depth gồm quyền tối thiểu, validation, rate limit và audit.',
    ],
    analogy: 'Khóa cửa, kiểm thẻ và giới hạn khu vực làm việc bảo vệ những lớp khác nhau.',
    path: ['Untrusted input', 'Validation', 'Authorization', 'Safe output & audit'],
    lab: 'security',
  },
  sql: {
    takeaways: [
      'NULL dùng logic ba giá trị; so sánh với NULL bằng IS NULL.',
      'JOIN có thể nhân số dòng; lọc phía phải ở WHERE có thể làm mất ý nghĩa LEFT JOIN.',
      'Window function giữ các dòng chi tiết thay vì gộp như GROUP BY.',
    ],
    analogy: 'LEFT JOIN như điểm danh toàn bộ khách hàng, kể cả những người chưa có đơn.',
    path: ['FROM & JOIN', 'WHERE', 'GROUP BY & HAVING', 'SELECT & ORDER BY'],
    lab: 'sql',
  },
  database: {
    takeaways: [
      'Transaction giữ invariant dưới concurrent access theo isolation đang dùng.',
      'Index phục vụ access pattern và phải trả chi phí write, dung lượng.',
      'Replication, partition và backup giải quyết các vấn đề khác nhau.',
    ],
    analogy:
      'Hai người cùng đọc số vé cuối rồi cùng bán là lỗi phối hợp, không phải lỗi tốc độ đọc.',
    path: ['Read current state', 'Check invariant', 'Atomic write', 'Commit hoặc retry'],
    lab: 'race',
  },
  nosql: {
    takeaways: [
      'Thiết kế document/key theo truy vấn trước, không theo tên sản phẩm.',
      'Embed giúp đọc cùng lúc nhưng tăng kích thước và chi phí cập nhật.',
      'Consistency và transaction phụ thuộc database/cấu hình, không do nhãn NoSQL.',
    ],
    analogy:
      'Để địa chỉ giao hàng vào đơn giúp giữ snapshot; sao chép mọi hồ sơ khách hàng vào mọi đơn gây khó đồng bộ.',
    path: ['Access pattern', 'Partition key', 'Document boundary', 'Consistency choice'],
    lab: 'nosql',
  },
  cache: {
    takeaways: [
      'Cache-aside: đọc cache, miss thì đọc DB rồi điền cache.',
      'TTL giới hạn tuổi dữ liệu nhưng không bảo đảm đọc mới nhất sau write.',
      'Hot key, stampede và invalidation cần được thiết kế riêng.',
    ],
    analogy: 'Bản ghi chú trên bàn nhanh hơn mở tủ hồ sơ, nhưng có thể đã cũ.',
    path: ['Read key', 'Cache hit hoặc miss', 'Fetch source', 'Fill cache với TTL'],
    lab: 'cache',
  },
  messaging: {
    takeaways: [
      'ACK sau side effect có thể gây xử lý lại nếu worker chết trước ACK.',
      'At-least-once delivery cần idempotent consumer.',
      'Ordering chỉ có ý nghĩa trong phạm vi được bảo đảm, thường là một partition.',
    ],
    analogy:
      'Người giao thư chưa nhận giấy biên nhận sẽ giao lại; người nhận cần biết thư nào đã xử lý.',
    path: ['Publish', 'Durable queue', 'Consumer effect', 'ACK hoặc redelivery'],
    lab: 'queue',
  },
  architecture: {
    takeaways: [
      'Bắt đầu từ module boundaries và dữ liệu sở hữu.',
      'Microservices thêm network failure và chi phí phối hợp.',
      'Chỉ tách service khi có lý do về ownership, scaling hoặc triển khai độc lập.',
    ],
    analogy: 'Tách phòng ban giúp tự chủ nhưng cần quy trình bàn giao và trách nhiệm rõ ràng.',
    path: ['Client', 'Module/service boundary', 'Domain invariant', 'Persistence & events'],
    lab: 'architecture',
  },
  distributed: {
    takeaways: [
      'Network partition buộc xem xét consistency và availability theo từng operation.',
      'Quorum không thay thế consensus và không tự bảo đảm linearizability.',
      'Timeout, retry và duplicate là trạng thái bình thường của distributed system.',
    ],
    analogy:
      'Các chi nhánh mất liên lạc phải chọn việc nào có thể tiếp tục và việc nào phải chờ xác nhận.',
    path: ['Request', 'Replica coordination', 'Quorum hoặc leader', 'Commit hoặc fail'],
    lab: 'distributed',
  },
  'storage-search': {
    takeaways: [
      'Object storage giữ blob; metadata DB và search index phục vụ truy vấn khác.',
      'Search index thường là dữ liệu dẫn xuất có độ trễ cập nhật.',
      'Multipart upload cần checksum, trạng thái hoàn tất và dọn phần upload bỏ dở.',
    ],
    analogy: 'Kho chứa sách khác với mục lục tìm kiếm; mục lục có thể cập nhật chậm hơn kho.',
    path: ['Upload object', 'Commit metadata', 'Publish change', 'Build search index'],
    lab: 'storage',
  },
  'system-design': {
    takeaways: [
      'Làm rõ use case, SLO và giới hạn trước khi chọn component.',
      'Ước lượng từ giả định có đơn vị; phân biệt trung bình với peak.',
      'Đào sâu đường đi dữ liệu, invariant, lỗi và trade-off của một thiết kế.',
    ],
    analogy:
      'Thiết kế thành phố bắt đầu từ dân số và luồng giao thông, không từ việc chọn tên cây cầu.',
    path: ['Requirements', 'Estimate', 'API & data', 'Architecture & failure modes'],
    lab: 'base62',
  },
  testing: {
    takeaways: [
      'Test kiểm tra hành vi có giá trị, không lặp lại chi tiết implementation.',
      'Boundary, failure và concurrency thường lộ lỗi hơn happy path.',
      'Unit, integration và E2E có phạm vi, tốc độ và tín hiệu khác nhau.',
    ],
    analogy:
      'Kiểm từng linh kiện, chạy cả dây chuyền và thử sản phẩm thực tế trả lời những câu hỏi khác nhau.',
    path: ['Requirement', 'Test case', 'Action & assertion', 'Regression signal'],
    lab: 'testing',
  },
  'docker-cicd': {
    takeaways: [
      'Image là artifact bất biến; container là process chạy từ image.',
      'Build một lần, kiểm chứng và promote cùng artifact qua các môi trường.',
      'Deployment cần health check, rollback và migration tương thích.',
    ],
    analogy: 'Image là bản thiết kế đóng gói; mỗi container là một lần vận hành bản thiết kế đó.',
    path: ['Commit', 'Build & test', 'Artifact', 'Deploy & verify'],
    lab: 'deploy',
  },
  kubernetes: {
    takeaways: [
      'Deployment quản lý replica; Service tạo endpoint ổn định cho tập Pod.',
      'Readiness quyết định Pod có nhận traffic; liveness có thể kích hoạt restart.',
      'HPA cần metric và resource requests hợp lý; replicas không sửa được bottleneck DB.',
    ],
    analogy:
      'Deployment là quản đốc giữ đủ nhân viên; Service là quầy tiếp nhận không đổi khi người trực thay ca.',
    path: ['Deployment', 'ReplicaSet', 'Ready Pods', 'Service endpoints'],
    lab: 'capacity',
  },
  observability: {
    takeaways: [
      'Metrics thấy xu hướng, logs có chi tiết, traces nối các span trong request.',
      'p99 không tính bằng trung bình các p99 và không mô tả mọi request.',
      'Alert theo tác động người dùng và error budget thay vì mọi spike tài nguyên.',
    ],
    analogy: 'Dashboard là bảng đồng hồ, log là nhật ký, trace là hành trình của một chuyến đi.',
    path: ['User request', 'Trace spans', 'Metrics & logs', 'SLO & action'],
    lab: 'latency',
  },
  'interview-skills': {
    takeaways: [
      'Trả lời kết luận trước rồi giải thích bằng ví dụ và trade-off.',
      'Nêu giả định, hỏi lại yêu cầu và dùng số liệu có đơn vị.',
      'STAR cần hành động cụ thể của bạn, kết quả và điều rút ra.',
    ],
    analogy: 'Một câu trả lời tốt là bản đồ có điểm đến, lộ trình và bằng chứng bạn đã đi qua.',
    path: ['Situation', 'Task', 'Action', 'Result & reflection'],
    lab: 'star',
  },
};
