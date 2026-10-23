import { prefixTree } from '../lib/prefix-tree';
import { normalizeSuggestion } from '../lib/autocomplete-models';
import '../styles/prefix-tree.css';

export default function PrefixTree({
  query,
  fold,
  mode,
  choose,
}: {
  query: string;
  fold: boolean;
  mode: 'cached' | 'overfetch' | 'build-filter';
  choose: (prefix: string) => void;
}) {
  const graph = prefixTree(fold, mode),
    input = normalizeSuggestion(query, fold);
  const draw = (portrait: boolean) => {
    const leaves = graph.leafCount;
    const nodes = graph.nodes.map((node) =>
      portrait
        ? {
            ...node,
            x: 45 + ((node.y - 48) / 76) * (270 / Math.max(1, leaves - 1)),
            y: 50 + ((node.x - 95) / 285) * 150,
          }
        : node,
    );
    return (
      <svg
        className={portrait ? 'prefix-tree-portrait' : 'prefix-tree-landscape'}
        viewBox={portrait ? '0 0 360 400' : `0 0 ${graph.width} ${graph.height}`}
        role="group"
        aria-label="Prefix trie"
      >
        {nodes
          .filter((n) => n.parent !== null)
          .map((node) => {
            const parent = nodes.find((n) => n.prefix === node.parent)!;
            return (
              <path
                key={node.prefix}
                data-on-path={input.startsWith(node.prefix)}
                d={
                  portrait
                    ? `M ${parent.x} ${parent.y + 28} C ${parent.x} ${parent.y + 80}, ${node.x} ${node.y - 80}, ${node.x} ${node.y - 28}`
                    : `M ${parent.x + 65} ${parent.y} C ${parent.x + 145} ${parent.y}, ${node.x - 145} ${node.y}, ${node.x - 65} ${node.y}`
                }
              />
            );
          })}
        {nodes.map((node) => (
          <g
            key={node.prefix}
            role="button"
            tabIndex={0}
            data-prefix={node.prefix}
            data-on-path={input.startsWith(node.prefix)}
            aria-label={`${node.prefix || 'root'} / matches: ${node.matches}`}
            aria-pressed={input === node.prefix}
            onClick={() => choose(node.prefix)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                choose(node.prefix);
              }
            }}
          >
            <rect
              x={node.x - (portrait ? 40 : 65)}
              y={node.y - 28}
              width={portrait ? 80 : 130}
              height={56}
              rx={10}
            />
            <text x={node.x} y={node.y - 4} textAnchor="middle">
              {node.prefix || '∅'}
            </text>
            <text className="prefix-tree-count" x={node.x} y={node.y + 17} textAnchor="middle">
              matches: {node.matches}
            </text>
          </g>
        ))}
      </svg>
    );
  };
  return (
    <div className="prefix-tree">
      <h4>Nhìn các nhánh của prefix, không chỉ danh sách kết quả</h4>
      <p>
        Sơ đồ hiển thị root và hai code point đầu của trie mẫu. Chọn node bằng click hoặc
        Enter/Space để đổi prefix; đường sáng đi theo input đã normalize. Matches đếm term trong
        subtree trước serving filter, không phải số suggestion chắc chắn được trả.
      </p>
      <div
        className="prefix-tree-scroll"
        role="region"
        tabIndex={0}
        aria-label="Khám phá cây prefix"
      >
        <div translate="no">
          {draw(false)}
          {draw(true)}
        </div>
      </div>
      <p>
        Bật fold dấu để thấy cà/cá nhập vào nhánh ca; đó là policy tìm kiếm của ví dụ. Prefix dài
        hơn vẫn được lookup đầy đủ trong phần walk bên dưới; hình chỉ rút bớt độ sâu để dễ nhìn,
        không thay đổi index hoặc ranking.
      </p>
    </div>
  );
}
