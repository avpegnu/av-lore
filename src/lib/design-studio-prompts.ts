import { studioNode, type StudioDesign, type StudioKind } from './design-studio-models';
type Pair = { vi: string; en: string };
const t = (vi: string, en: string): Pair => ({ vi, en });
export const studioPrompts = [
  {
    id: 'short-links',
    title: t('Short links có hot keys', 'Short links with hot keys'),
    brief: t(
      'Thiết kế tạo link và redirect: peak 12000 reads/s, 300 writes/s. Phải xử lý expiry, malicious links và hot keys; cache không thay authority của mapping.',
      'Design creation and redirects at 12000 reads/s and 300 writes/s, addressing expiry, abuse and hot keys. A cache does not replace authoritative mappings.',
    ),
    reads: 12000,
    writes: 300,
    kinds: ['client', 'gateway', 'service', 'cache', 'sql'] as StudioKind[],
    focus: t(
      'Chọn một read path và write path rõ; giải thích cache invalidation/negative caching, code uniqueness và expiry race.',
      'Explain separate read/write paths, cache invalidation, uniqueness and expiry races.',
    ),
  },
  {
    id: 'feed',
    title: t('News Feed với fan-out', 'News Feed with fan-out'),
    brief: t(
      'Peak 8000 feed reads/s và 400 new posts/s; giả định mỗi post tạo 25 timeline insertions. Tách logical requests khỏi internal operations và celebrity exceptions.',
      'Use 8000 feed reads/s and 400 posts/s, assuming 25 timeline insertions per post. Separate logical requests, internal operations and celebrity exceptions.',
    ),
    reads: 8000,
    writes: 400,
    kinds: [
      'client',
      'gateway',
      'service',
      'cache',
      'sql',
      'queue',
      'worker',
      'kv',
    ] as StudioKind[],
    focus: t(
      'Edge multiplier 25 có nghĩa operations per post, không làm tăng số user requests. Chốt dedup/order/ACL và feed freshness.',
      'An edge multiplier of 25 counts operations per post, not user requests. Define deduplication, ordering, ACLs and freshness.',
    ),
  },
  {
    id: 'chat',
    title: t('Chat có reconnect và device ACK', 'Chat with reconnect and device ACK'),
    brief: t(
      'Peak 3000 history reads/s và 2000 messages/s; online fan-out giả định 3 deliveries/message. Phân biệt socket connection capacity với message operations.',
      'Use 3000 history reads/s, 2000 messages/s and three online deliveries per message. Connection capacity differs from message-operation throughput.',
    ),
    reads: 3000,
    writes: 2000,
    kinds: ['client', 'gateway', 'socket', 'service', 'sql', 'queue', 'worker'] as StudioKind[],
    focus: t(
      'Nêu durable acceptance, per-device cursor/ACK, duplicate delivery và reconnect recovery; sơ đồ push không tự chứng minh exactly-once UI.',
      'Explain durable acceptance, device cursors/ACKs, duplicate delivery and reconnect recovery. Push diagrams do not prove exactly-once UI.',
    ),
  },
  {
    id: 'checkout',
    title: t('Checkout giữ stock và payment intent', 'Checkout with stock and payment intents'),
    brief: t(
      'Peak 2500 product/cart reads/s và 200 checkout attempts/s. Inventory reservation, payment outcome unknown và webhook replay phải có owners.',
      'Use 2500 product/cart reads/s and 200 checkout attempts/s. Assign owners to stock reservations, unknown payment outcomes and webhook replay.',
    ),
    reads: 2500,
    writes: 200,
    kinds: ['client', 'gateway', 'service', 'sql', 'queue', 'worker'] as StudioKind[],
    focus: t(
      'Vẽ authority boundaries và stable business intent; cache/queue không chứng minh no oversell hoặc one charge.',
      'Explain authority boundaries and stable business intents; caches and queues do not prove no overselling or single charges.',
    ),
  },
  {
    id: 'media',
    title: t('Upload media và publish derivatives', 'Upload media and publish derivatives'),
    brief: t(
      'Peak 10000 metadata/media reads/s và 100 upload commits/s; mỗi upload tạo 4 derivative tasks. Byte bandwidth và encoding duration cần worksheet riêng.',
      'Use 10000 metadata/media reads/s, 100 upload commits/s and four derivative tasks per upload. Model bandwidth and encoding duration separately.',
    ),
    reads: 10000,
    writes: 100,
    kinds: [
      'client',
      'cdn',
      'gateway',
      'service',
      'blob',
      'sql',
      'queue',
      'worker',
    ] as StudioKind[],
    focus: t(
      'Chốt staging/published manifests, multipart completion và orphan cleanup; CDN hit ratio chỉ giảm modeled read operations.',
      'Define staging/published manifests, multipart completion and orphan cleanup. CDN hits reduce modeled read operations only.',
    ),
  },
  {
    id: 'search',
    title: t('Search có index freshness và ACL', 'Search with index freshness and ACLs'),
    brief: t(
      'Peak 6000 search reads/s và 800 document updates/s. Search index là derived state; permissions có thể đổi giữa retrieval và render.',
      'Use 6000 search reads/s and 800 document updates/s. Indexes are derived state, and permissions can change between retrieval and rendering.',
    ),
    reads: 6000,
    writes: 800,
    kinds: ['client', 'gateway', 'service', 'search', 'sql', 'queue', 'worker'] as StudioKind[],
    focus: t(
      'Giải thích outbox/CDC, stale/delete fencing và current authorization; positive graph path không chứng minh full recall hoặc no disclosure.',
      'Explain CDC/outbox, stale/delete fencing and current authorization. Graph paths do not prove recall or prevent disclosures.',
    ),
  },
  {
    id: 'gateway',
    title: t('LLM traffic có reservations và streams', 'LLM traffic with reservations and streams'),
    brief: t(
      'Peak 1500 logical calls/s. Nhập read/write operation classes có chủ đích; tokens, streams, first-token latency và provider limits không nằm trong two-rate model.',
      'Use 1500 logical calls/s and deliberately define read/write operation classes. Tokens, streams, first-token latency and provider quotas lie outside the two-rate model.',
    ),
    reads: 0,
    writes: 1500,
    kinds: ['client', 'gateway', 'service', 'kv', 'queue', 'worker'] as StudioKind[],
    focus: t(
      'Phân biệt logical operation/attempt/usage; explain qualified fallback, pending usage và atomic reservation. Không gán model throughput từ API op capacity.',
      'Separate operations, attempts and usage; explain qualified fallback, pending usage and atomic reservations. API operation capacity is not model token throughput.',
    ),
  },
  {
    id: 'custom',
    title: t('Đề bài tự đặt', 'Your own design prompt'),
    brief: t(
      'Tự ghi functional requirements, actors, invariants, non-functional targets và out-of-scope. Đặt operation rates và capacity assumptions trước review.',
      'Write actors, functional requirements, invariants, service targets and exclusions. Define operation rates and capacity assumptions before review.',
    ),
    reads: 1000,
    writes: 100,
    kinds: ['client', 'gateway', 'service', 'sql'] as StudioKind[],
    focus: t(
      'Ghi rõ mỗi arrow là operation nào, share hay fan-out, và evidence còn thiếu. Dùng notes để lưu trade-offs và failure walkthrough.',
      'Name every arrow, its share or fan-out, and missing evidence. Keep trade-offs and failure walkthroughs in notes.',
    ),
  },
];
export function studioExample(id: string): StudioDesign {
  const p = studioPrompts.find((p) => p.id === id) || studioPrompts[0];
  const nodes = p.kinds.map((kind, i) => ({
    ...studioNode(kind, kind + '-' + (i + 1), i),
    label: kind,
    units: kind === 'client' ? 1 : 2,
    readCapacity: 5000,
    writeCapacity: 2000,
  }));
  const by = (k: StudioKind) => nodes.find((n) => n.kind === k)?.id;
  const edges: StudioDesign['edges'] = [];
  const add = (a: StudioKind, b: StudioKind, reads = 1, writes = 1) => {
    const from = by(a),
      to = by(b);
    if (from && to) edges.push({ from, to, reads, writes });
  };
  if (by('cdn')) {
    add('client', 'cdn', 1, 0);
    add('cdn', 'blob', 1, 0);
    add('client', 'gateway', 0, 1);
  } else add('client', 'gateway');
  if (by('socket')) {
    add('gateway', 'socket');
    add('socket', 'service');
  } else add('gateway', 'service');
  if (by('cache')) {
    add('service', 'cache', 1, 0);
    add('cache', 'sql', 1, 0);
    add('service', 'sql', 0, 1);
  } else add('service', 'sql');
  if (by('search')) {
    add('service', 'search', 1, 0);
    const s = edges.find((e) => e.from === by('service') && e.to === by('sql'));
    if (s) s.reads = 0;
  }
  if (by('blob')) add('service', 'blob', 0, 1);
  if (by('queue')) {
    add('service', 'queue', 0, 1);
    add('queue', 'worker', 0, p.id === 'feed' ? 25 : p.id === 'media' ? 4 : 1);
    if (by('kv')) add('worker', 'kv', 0, 1);
    else if (by('search')) add('worker', 'search', 0, 1);
  }
  if (p.id === 'gateway') {
    add('service', 'kv', 0, 1);
  }
  return { version: 1, nodes, edges, notes: '' };
}
