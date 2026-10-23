import { useId, useState } from 'react';
import {
  composeDependencies,
  initialDependencies,
  type ModelDependency,
} from '../lib/dependency-composition';
const probabilities = [0.99, 0.995, 0.999, 0.9995, 0.9999, 0.99999];
export default function DependencyComposer({ commonFailure }: { commonFailure: number }) {
  const id = 'dependencies-' + useId().replace(/:/g, ''),
    [rows, setRows] = useState(initialDependencies),
    [nextId, setNextId] = useState(6);
  const model = composeDependencies(rows, commonFailure);
  const update = (id: number, patch: Partial<ModelDependency>) =>
    setRows((old) => old.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  return (
    <div className="dependency-composer" aria-labelledby={id}>
      <h4 id={id}>Ghép các dependency khác nhau trên cùng đường chính</h4>
      <p>
        Mỗi dòng có availability và số replica riêng. Khi không có lỗi chung, mô hình giả định
        replica và các dòng độc lập; chỉ một replica tốt là đủ cho một dòng. Bật lỗi chung 1% ở phía
        trên để thêm một sự kiện làm hỏng toàn bộ đường này. Đây là availability của các dependency
        đã chọn, chưa bao gồm code, routing, capacity hay lỗi của chính ứng dụng.
      </p>
      <ol className="dependency-composition">
        {model.rows.map((row) => (
          <li key={row.id}>
            <strong>{row.name}</strong>
            <label>
              Component availability
              <select
                value={row.availability}
                onChange={(e) => update(row.id, { availability: +e.target.value })}
              >
                {probabilities.map((p) => (
                  <option key={p} value={p}>
                    {(p * 100).toFixed(3)}%
                  </option>
                ))}
              </select>
            </label>
            <label>
              Replica count
              <input
                type="number"
                min={1}
                max={5}
                value={row.replicas}
                onChange={(e) =>
                  update(row.id, {
                    replicas: Math.max(1, Math.min(5, Math.trunc(+e.target.value) || 1)),
                  })
                }
              />
            </label>
            <span>Effective: {(row.effective * 100).toFixed(5)}%</span>
            <button
              type="button"
              className="secondary"
              aria-pressed={row.required}
              data-dependency-action="required"
              onClick={() => update(row.id, { required: !row.required })}
            >
              {row.required ? 'Tính vào hard path' : 'Đã tách khỏi hard path'}
            </button>
            <button
              type="button"
              className="secondary"
              data-dependency-action="remove"
              onClick={() => setRows((old) => old.filter((item) => item.id !== row.id))}
            >
              Bỏ dòng dependency
            </button>
          </li>
        ))}
      </ol>
      <div className="worksheet-choices">
        <button
          type="button"
          className="secondary"
          data-dependency-action="add"
          disabled={rows.length >= 8}
          onClick={() => {
            setRows((old) => [
              ...old,
              { id: nextId, name: `D${nextId}`, availability: 0.999, replicas: 1, required: true },
            ]);
            setNextId((n) => n + 1);
          }}
        >
          Thêm dependency
        </button>
        <button
          type="button"
          className="secondary"
          data-dependency-action="reset"
          onClick={() => {
            setRows(initialDependencies);
            setNextId(6);
          }}
        >
          Reset dependency graph
        </button>
      </div>
      <dl className="worksheet-results" aria-live="polite">
        <div>
          <dt>Selected hard dependencies</dt>
          <dd>{model.required}</dd>
        </div>
        <div>
          <dt>Conditional chain / %</dt>
          <dd>{(model.conditional * 100).toFixed(5)}</dd>
        </div>
        <div>
          <dt>With common cause / %</dt>
          <dd>{(model.withCommonCause * 100).toFixed(5)}</dd>
        </div>
      </dl>
      <p>
        Tách khỏi hard path chỉ đổi assumption: tính năng phải thực sự có fallback phù hợp, không
        còn chặn tác vụ và được đo chất lượng riêng. Không có hard dependency cho tích rỗng bằng 1
        trong công thức, không có nghĩa hệ thống đạt 100%. Số làm tròn 100,00000% cũng không chứng
        minh xác suất lỗi bằng 0.
      </p>
    </div>
  );
}
