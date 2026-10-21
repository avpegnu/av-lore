export interface Scenario {
  title: string;
  question: string;
  normal: string[];
  fault: string[];
  outcome: string;
  failure: string;
  lesson: string;
}
export const scenarios: Record<string, Scenario> = {
  oop: {
    title: 'Strategy cho phí vận chuyển',
    question: 'Bật một implementation vi phạm hợp đồng',
    normal: [
      'Client nhận ShippingStrategy qua constructor.',
      'StandardShipping tính 30.000đ cho kiện 2kg.',
      'ExpressShipping tính 60.000đ; client không đổi.',
      'Mỗi implementation trả số không âm đúng hợp đồng.',
    ],
    fault: [
      'Client nhận ShippingStrategy qua constructor.',
      'BrokenShipping trả -10.000đ cho kiện 2kg.',
      'Type vẫn là number nên compiler không phát hiện invariant nghiệp vụ.',
      'Contract test thất bại: phí vận chuyển không được âm.',
    ],
    outcome: 'Thay strategy mà không đổi checkout.',
    failure: 'Interface đúng cú pháp chưa đủ giữ Liskov substitution.',
    lesson:
      'Cần định nghĩa cả precondition, postcondition và contract test cho các implementation.',
  },
  git: {
    title: 'Push khi remote đã tiến thêm',
    question: 'Có người khác push trước bạn',
    normal: [
      'HEAD ở feature trỏ vào commit B.',
      'Tạo commit C có parent B.',
      'Remote feature vẫn trỏ B.',
      'Push fast-forward: remote trỏ C.',
    ],
    fault: [
      'HEAD ở feature trỏ vào commit B.',
      'Bạn tạo C; đồng đội tạo D từ B và push.',
      'Push C bị non-fast-forward, không tự mất D.',
      'Fetch D; merge hoặc rebase C lên D; xử lý conflict rồi push.',
    ],
    outcome: 'Remote chứa commit C và toàn bộ tổ tiên.',
    failure: 'C và D phân nhánh; cần tích hợp trước khi push.',
    lesson: 'Không force push để bỏ qua lỗi khi chưa xác định lịch sử nào sẽ bị thay thế.',
  },
  linux: {
    title: 'Pipeline phân tích access log',
    question: 'Đưa error log vào stderr',
    normal: [
      'Input stdout: GET / 200; GET /pay 500; GET /pay 500.',
      'Lọc status=500 → còn hai dòng /pay.',
      'Chọn path → /pay, /pay.',
      'Đếm nhóm → 2 /pay.',
    ],
    fault: [
      'Input stdout: GET / 200; stderr: GET /pay 500.',
      'Pipe chỉ nối stdout, stderr vẫn đi riêng.',
      'Lọc status=500 trên stdout → không có dòng nào.',
      'Kết quả rỗng không chứng minh hệ thống không có lỗi.',
    ],
    outcome: 'Pipeline đếm được hai lỗi ở /pay.',
    failure: 'Error trên stderr không xuất hiện trong pipeline.',
    lesson: 'Nếu chủ đích cần gộp, dùng command 2>&1 | filter; thứ tự redirection có ý nghĩa.',
  },
  network: {
    title: 'Từ URL tới HTTP response',
    question: 'Certificate không khớp hostname',
    normal: [
      'Browser tra DNS, nhận IP của hostname.',
      'Thiết lập TCP rồi TLS với certificate hợp lệ.',
      'Gửi HTTPS request GET /notes.',
      'Server trả 200; browser xử lý HTML.',
    ],
    fault: [
      'Browser tra DNS, nhận IP của hostname.',
      'TLS nhận certificate cho hostname khác.',
      'Xác thực TLS thất bại; HTTP request chưa được gửi trên kết nối này.',
      'Hiển thị lỗi kết nối; kiểm tra certificate/SNI/cấu hình proxy.',
    ],
    outcome: 'Kênh được xác thực trước khi trao đổi HTTP.',
    failure: 'IP truy cập được chưa đủ cho HTTPS thành công.',
    lesson: 'Đây là luồng đơn giản cho HTTPS qua TCP; HTTP/3 dùng QUIC thay cho TCP.',
  },
  typescript: {
    title: 'Type assertion và runtime validation',
    question: 'API gửi age dạng chuỗi',
    normal: [
      'JSON.parse nhận {"name":"An","age":20}.',
      'Giữ dữ liệu là unknown ở trust boundary.',
      'Kiểm tra typeof age === "number" và range hợp lệ.',
      'Narrow về User; xử lý age + 1 = 21.',
    ],
    fault: [
      'JSON.parse nhận {"name":"An","age":"20"}.',
      'Ép as User chỉ ảnh hưởng type checker.',
      'JavaScript thực tế tính "20" + 1 thành "201".',
      'Validator từ chối input trước khi vào business logic.',
    ],
    outcome: 'Dữ liệu qua validator phù hợp với model.',
    failure: 'as User không chuyển đổi hoặc xác minh dữ liệu runtime.',
    lesson: 'Định nghĩa schema, giới hạn range và xử lý lỗi ở API boundary.',
  },
  rendering: {
    title: 'HTML và hydration',
    question: 'Client render khác server',
    normal: [
      'SSG/SSR tạo HTML: 3 mục, theme mặc định.',
      'Browser hiển thị HTML trước khi tải đủ JavaScript.',
      'Client render đầu tiên cũng có 3 mục.',
      'Hydration gắn event handler; tương tác sẵn sàng.',
    ],
    fault: [
      'Server render thời gian 10:00:00 vào nội dung.',
      'Browser nhận HTML rồi tải JavaScript.',
      'Client render Date.now() thành 10:00:02.',
      'Markup khác nhau gây hydration mismatch; cần dữ liệu ổn định hoặc cập nhật sau mount.',
    ],
    outcome: 'Có nội dung đọc được trước khi JavaScript sẵn sàng.',
    failure: 'Cùng component không bảo đảm cùng output giữa server và client.',
    lesson: 'SSG phù hợp nội dung học tập; các widget tương tác có thể hydrate độc lập.',
  },
  backend: {
    title: 'Đặt hàng xuyên suốt FE → BE → DB',
    question: 'Request bị gửi lại sau timeout',
    normal: [
      'FE gửi POST /orders với idempotency key K1.',
      'API kiểm identity, schema và quyền mua.',
      'Transaction tạo order và outbox event cùng commit.',
      'Worker gửi thông báo; API trả order_id.',
    ],
    fault: [
      'FE gửi POST /orders với idempotency key K1.',
      'BE commit order nhưng response bị mất trên mạng.',
      'FE retry cùng K1 và cùng payload.',
      'BE trả kết quả đã lưu của K1; không tạo đơn thứ hai.',
    ],
    outcome: 'Order và event được ghi atomically bằng outbox.',
    failure: 'Timeout ở client không chứng minh transaction đã rollback.',
    lesson:
      'Đặt unique constraint cho idempotency key trong phạm vi phù hợp và lưu request fingerprint.',
  },
  api: {
    title: 'Idempotency khi retry',
    question: 'Dùng lại key nhưng đổi payload',
    normal: [
      'POST /payments key=K amount=100.',
      'Server reserve K cùng fingerprint amount=100.',
      'Commit giao dịch và kết quả gắn với K.',
      'Retry cùng K, cùng payload → trả cùng payment_id.',
    ],
    fault: [
      'POST /payments key=K amount=100 đã commit.',
      'Client gửi lại K nhưng amount=200.',
      'Fingerprint mới khác fingerprint đã lưu.',
      'Từ chối conflict theo hợp đồng API; không trả thành công giả cho 200.',
    ],
    outcome: 'Retry cùng thao tác không tạo giao dịch mới.',
    failure: 'Không tái sử dụng key cho hai ý định khác nhau.',
    lesson: 'Hai request đồng thời cần unique constraint/lock để không cùng thực hiện side effect.',
  },
  auth: {
    title: 'Kiểm tra object-level authorization',
    question: 'User A truy cập hóa đơn của B',
    normal: [
      'Xác minh session của user A.',
      'Tải invoice I1 thuộc user A.',
      'Policy kiểm tenant, owner và role.',
      'Trả dữ liệu theo quyền đọc.',
    ],
    fault: [
      'Xác minh session của user A: hợp lệ.',
      'Request đổi invoice_id thành I2 của B.',
      'Server kiểm owner_id khác user A.',
      'Từ chối theo policy; không gửi nội dung invoice.',
    ],
    outcome: 'Identity hợp lệ và quyền trên resource đều thỏa.',
    failure: 'Chỉ kiểm login sẽ dẫn tới IDOR/BOLA.',
    lesson: 'Resource ID khó đoán và ẩn nút trên FE không thay thế authorization ở server.',
  },
  security: {
    title: 'Untrusted input và output encoding',
    question: 'Input chứa thẻ HTML có event handler',
    normal: [
      'User gửi ghi chú: Xin chào.',
      'Server kiểm độ dài và quyền chỉnh sửa.',
      'UI render qua textContent hoặc React text.',
      'Browser hiển thị nội dung dạng văn bản.',
    ],
    fault: [
      'User gửi chuỗi <img src=x onerror=...>.',
      'Validation độ dài vẫn có thể chấp nhận chuỗi này.',
      'Render bằng textContent: chuỗi được hiển thị nguyên văn.',
      'Không có HTML thực thi; innerHTML trên input thô sẽ phá trust boundary.',
    ],
    outcome: 'Text được xử lý như text.',
    failure: 'Ví dụ dùng render an toàn; không thực thi payload trong bài học.',
    lesson:
      'Encoding phụ thuộc ngữ cảnh HTML, attribute, URL, JavaScript. Rich HTML cần sanitizer đáng tin cậy.',
  },
  nosql: {
    title: 'Embed snapshot hay reference?',
    question: 'Khách đổi địa chỉ sau khi đặt hàng',
    normal: [
      'Order lưu shipping_address snapshot tại thời điểm checkout.',
      'Customer profile giữ địa chỉ hiện tại.',
      'Invoice đọc snapshot ngay trong order.',
      'Lịch sử phản ánh chính xác địa chỉ đã giao.',
    ],
    fault: [
      'Order chỉ lưu customer_id, không có shipping snapshot.',
      'Khách cập nhật profile từ Hà Nội sang Đà Nẵng.',
      'Invoice cũ join profile hiện tại.',
      'Invoice hiển thị sai địa chỉ lịch sử của đơn cũ.',
    ],
    outcome: 'Snapshot là duplication có chủ đích để giữ lịch sử.',
    failure: 'Reference luôn đọc hiện tại có thể làm mất dữ kiện quá khứ.',
    lesson:
      'Đối với dữ liệu cần mới nhất như tình trạng tài khoản, reference và kiểm tra ở nguồn có thể phù hợp hơn.',
  },
  architecture: {
    title: 'Từ module tới service',
    question: 'Payment service mất kết nối',
    normal: [
      'Order module tạo order PENDING.',
      'Payment service xử lý với request id ổn định.',
      'Event PaymentSucceeded cập nhật order PAID.',
      'Mỗi service sở hữu dữ liệu, consumer deduplicate event.',
    ],
    fault: [
      'Order tạo PENDING và gửi payment command.',
      'Timeout: chưa biết payment thành công hay thất bại.',
      'Giữ trạng thái PAYMENT_UNKNOWN; query/reconcile bằng request id.',
      'Không tự tạo payment mới hoặc đánh dấu FAILED một cách võ đoán.',
    ],
    outcome: 'Workflow có trạng thái trung gian rõ ràng.',
    failure: 'Network call không có atomicity chung với database của order.',
    lesson:
      'Saga/outbox/reconciliation giải quyết workflow; monolith thường đơn giản hơn nếu chưa cần tách.',
  },
  distributed: {
    title: 'Leader mất quorum',
    question: 'Leader bị tách khỏi đa số replica',
    normal: [
      'Cluster 3 replica, leader nhận write.',
      'Append log tới ít nhất 2 replica theo giao thức consensus.',
      'Entry được commit theo quy tắc giao thức.',
      'Leader xác nhận write thành công cho client.',
    ],
    fault: [
      'Cluster 3 replica: leader cũ chỉ liên lạc được với chính nó.',
      'Không đủ quorum 2/3 để commit write mới.',
      'Phía đa số có thể bầu leader mới theo protocol.',
      'Phía thiểu số từ chối/timeout write để giữ tính nhất quán.',
    ],
    outcome: 'Write có quorum theo consensus protocol.',
    failure: 'Giữ write availability ở cả hai phía có thể gây split brain.',
    lesson:
      'Mô hình đơn giản hóa; linearizable read cũng cần xác nhận leader/lease phù hợp, không chỉ đọc replica bất kỳ.',
  },
  storage: {
    title: 'Object upload và search indexing',
    question: 'Worker indexing bị gián đoạn',
    normal: [
      'Client upload các part và xác minh checksum.',
      'Complete multipart; commit metadata file READY.',
      'Outbox/CDC gửi event tạo file.',
      'Indexer upsert theo file_id/version; tìm kiếm thấy file sau một khoảng trễ.',
    ],
    fault: [
      'Upload hoàn tất; metadata đã commit.',
      'Indexer tạm ngừng, event còn trong queue.',
      'Download theo metadata vẫn hoạt động; search chưa thấy file.',
      'Worker khởi động lại, replay event và kiểm version để tránh ghi đè bản mới.',
    ],
    outcome: 'Object store và search index có vai trò riêng.',
    failure: 'Search là dữ liệu dẫn xuất, có thể tạm thời chậm.',
    lesson: 'Theo dõi indexing lag, retry có dedup, và cơ chế rebuild từ nguồn chính.',
  },
  testing: {
    title: 'Boundary test bắt lỗi lệch một',
    question: 'Implementation dùng > thay vì >=',
    normal: [
      'Yêu cầu: miễn phí ship khi subtotal >= 500.',
      'Test các giá trị 499, 500, 501.',
      'Implementation >= cho kết quả false, true, true.',
      'Cả ba case đều pass.',
    ],
    fault: [
      'Yêu cầu: miễn phí ship khi subtotal >= 500.',
      'Implementation lỗi dùng subtotal > 500.',
      'Case 499 pass; 500 fail; 501 pass.',
      'Boundary 500 phát hiện lỗi mà test 1000 bỏ sót.',
    ],
    outcome: 'Test gắn với điều kiện nghiệp vụ có thể quan sát.',
    failure: 'Chỉ test happy path xa boundary dễ bỏ lỗi.',
    lesson:
      'Thêm invalid input, rounding tiền tệ và contract integration khi chúng ảnh hưởng yêu cầu.',
  },
  deploy: {
    title: 'Readiness và rolling deployment',
    question: 'Phiên bản mới không qua readiness',
    normal: [
      'CI build image SHA bất biến; tests pass.',
      'Khởi động Pod mới trong khi Pod cũ vẫn phục vụ.',
      'Readiness pass; thêm Pod mới vào Service endpoints.',
      'Drain Pod cũ; quan sát SLO rồi hoàn tất rollout.',
    ],
    fault: [
      'CI build image SHA bất biến; tests pass.',
      'Pod mới khởi động nhưng readiness fail.',
      'Không đưa Pod mới vào endpoints; giữ Pod cũ theo strategy/budget.',
      'Rollout không tiến triển; điều tra rồi rollback artifact.',
    ],
    outcome: 'Readiness bảo vệ đường nhận traffic.',
    failure: 'Liveness restart không thay cho readiness hay rollback.',
    lesson:
      'Giữ database migration tương thích hai phiên bản. Demo không mô phỏng mọi giới hạn tài nguyên của cluster.',
  },
};
