import { useState } from 'react';
import { feedCapacity, kvCapacity } from '../lib/handbook-models';
import { useIslandReady } from '../lib/use-island-ready';

export default function HandbookExperiment({ kind }: { kind: 'feed-fanout' | 'kv-budget' }) {
  const ref = useIslandReady();
  const [followers, setFollowers] = useState(200);
  const [push, setPush] = useState(100);
  const [tokens, setTokens] = useState(8192);
  const [sequences, setSequences] = useState(16);
  const feed = feedCapacity({ users: 30e6, postsPerUser: 0.5, readsPerUser: 10,
    followers, cachedIds: 500, bytesPerId: 16, peak: 3, pushFraction: push / 100 });
  const kv = kvCapacity({ layers: 32, kvHeads: 8, headDimension: 128, bytes: 2,
    tokens, sequences, memoryGB: 40 });
  return <section className="handbook-experiment" ref={ref}>
    <span className="eyebrow">WORKSHEET / WHAT IF?</span>
    {kind === 'feed-fanout' ? <>
      <h3>Thử thay đổi chi phí fan-out</h3>
      <p>Giả định: 30 triệu DAU, 0,5 post và 10 lần đọc mỗi ngày; 500 ID × 16 byte cho mỗi timeline. Các con số chỉ dùng cho bài tập.</p>
      <div className="worksheet-inputs">
        <label>Followers trung bình <output>{followers}</output>
          <input type="range" min="0" max="2000" step="10" value={followers} onChange={e => setFollowers(+e.target.value)} /></label>
        <label>Tỷ lệ cạnh được push <output>{push}%</output>
          <input type="range" min="0" max="100" value={push} onChange={e => setPush(+e.target.value)} /></label>
      </div>
      <dl className="worksheet-results" aria-live="polite">
        <div><dt>Post writes / s</dt><dd>{feed.writes.toFixed(1)}</dd></div>
        <div><dt>Timeline inserts / s</dt><dd>{feed.fanout.toFixed(0)}</dd></div>
        <div><dt>Write amplification</dt><dd>{feed.amplification.toFixed(0)}×</dd></div>
        <div><dt>Timeline payload / GB</dt><dd>{feed.cacheGB.toFixed(0)}</dd></div>
      </dl>
      <p>Giảm push làm giảm số lần chèn timeline; số post và kích thước timeline giả định vẫn giữ nguyên. Chi phí merge khi đọc chưa được mô phỏng. Đây là tỷ lệ cạnh follower, không phải tỷ lệ tác giả.</p>
      <code>inserts/s = DAU × posts/day ÷ 86400 × followers × pushFraction</code>
    </> : <>
      <h3>Tính ngân sách KV cache</h3>
      <p>Model giả định có 32 layers, 8 KV heads, head dimension 128, KV dùng 2 byte mỗi phần tử. Ngân sách 40 GB đã dành riêng cho KV; weights và workspace dùng ngân sách khác.</p>
      <div className="worksheet-inputs">
        <label>Tokens mỗi sequence <output>{tokens}</output>
          <input type="range" min="1024" max="65536" step="1024" value={tokens} onChange={e => setTokens(+e.target.value)} /></label>
        <label>Sequences đồng thời <output>{sequences}</output>
          <input type="range" min="1" max="128" value={sequences} onChange={e => setSequences(+e.target.value)} /></label>
      </div>
      <dl className="worksheet-results" aria-live="polite">
        <div><dt>Bytes / token</dt><dd>{kv.bytesPerToken}</dd></div>
        <div><dt>GB / sequence</dt><dd>{kv.perSequenceGB.toFixed(3)}</dd></div>
        <div><dt>Total KV / GB</dt><dd>{kv.totalGB.toFixed(2)}</dd></div>
        <div><dt>Sequences / 40 GB</dt><dd>{kv.maxSequences}</dd></div>
      </dl>
      <p>Ước lượng chưa tính block padding, fragmentation, prefix sharing hoặc phân chia KV giữa các GPU. Đủ memory không đồng nghĩa đạt SLO latency.</p>
      <code>KV bytes = 2 × layers × KV heads × head dimension × bytes × tokens × sequences</code>
    </>}
  </section>;
}
