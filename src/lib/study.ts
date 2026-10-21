const key = 'it-basic-notes-interview-v1';
export interface StudyState {
  bookmarks: string[];
  known: string[];
  review: string[];
  last: string | null;
  session: unknown;
}
const empty = (): StudyState => ({
  bookmarks: [],
  known: [],
  review: [],
  last: null,
  session: null,
});
export function readStudy(): StudyState {
  try {
    return validateStudy(JSON.parse(localStorage.getItem(key) || 'null'));
  } catch {
    return empty();
  }
}
export function validateStudy(value: unknown): StudyState {
  if (!value || typeof value !== 'object') throw Error('Tệp không chứa dữ liệu học tập.');
  const v = value as Record<string, unknown>;
  for (const f of ['bookmarks', 'known', 'review'])
    if (!Array.isArray(v[f]) || (v[f] as unknown[]).some((x) => typeof x !== 'string'))
      throw Error(`Trường ${f} không hợp lệ.`);
  return {
    bookmarks: [...new Set(v.bookmarks as string[])],
    known: [...new Set(v.known as string[])],
    review: [...new Set(v.review as string[])],
    last: typeof v.last === 'string' ? v.last : null,
    session: v.session ?? null,
  };
}
export function saveStudy(s: StudyState) {
  try {
    localStorage.setItem(key, JSON.stringify(s));
    window.dispatchEvent(new Event('study-change'));
    return true;
  } catch {
    return false;
  }
}
export function setRating(id: string, rating: 'known' | 'review') {
  const s = readStudy();
  s.known = s.known.filter((k) => k !== id);
  s.review = s.review.filter((k) => k !== id);
  s[rating].push(id);
  saveStudy(s);
}
export function initStudy() {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-save]')];
  function paint() {
    const s = readStudy();
    for (const b of buttons) {
      const on = s.bookmarks.includes(b.dataset.save!);
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? '✓ Đã lưu' : '+ Lưu lại';
    }
    document.querySelectorAll<HTMLButtonElement>('[data-rating]').forEach((b) => {
      const s = readStudy();
      const field = b.dataset.rating as 'known' | 'review';
      b.setAttribute('aria-pressed', String(s[field].includes(b.dataset.key!)));
    });
  }
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      const s = readStudy(),
        id = b.dataset.save!;
      s.bookmarks = s.bookmarks.includes(id)
        ? s.bookmarks.filter((k) => k !== id)
        : [...s.bookmarks, id];
      if (!saveStudy(s)) {
        const status = document.querySelector('#storage-status');
        if (status)
          status.textContent =
            'Trình duyệt chưa cho phép lưu dữ liệu. Bạn vẫn có thể đọc toàn bộ nội dung.';
      }
      paint();
    }),
  );
  document.querySelectorAll<HTMLButtonElement>('[data-rating]').forEach((b) =>
    b.addEventListener('click', () => {
      setRating(b.dataset.key!, b.dataset.rating as 'known' | 'review');
      paint();
    }),
  );
  paint();
  const progress = document.querySelector<HTMLButtonElement>('[data-chapter]');
  if (progress) {
    const id = progress.dataset.chapter!;
    let done: string[] = [];
    try {
      done = JSON.parse(localStorage.getItem('it-basic-chapters-v1') || '[]');
    } catch {}
    const render = () => {
      progress.setAttribute('aria-pressed', String(done.includes(id)));
      progress.textContent = done.includes(id) ? '✓ Đã hoàn thành chương' : 'Đánh dấu đã học';
    };
    render();
    progress.addEventListener('click', () => {
      done = done.includes(id) ? done.filter((k) => k !== id) : [...done, id];
      try {
        localStorage.setItem('it-basic-chapters-v1', JSON.stringify(done));
      } catch {}
      render();
    });
  }
  // Quiz markup imported from legacy chapters; keyboard and mouse share the same behavior.
  document.querySelectorAll<HTMLElement>('[data-quiz-correct]').forEach((q) => {
    const choose = (option: HTMLElement) => {
      q.querySelectorAll('[data-option]').forEach((o) => {
        o.classList.remove('correct', 'wrong');
        o.setAttribute('aria-pressed', 'false');
      });
      option.classList.add(option.dataset.option === q.dataset.quizCorrect ? 'correct' : 'wrong');
      option.setAttribute('aria-pressed', 'true');
      const exp = q.querySelector<HTMLElement>('.quiz-explain');
      if (exp) {
        exp.hidden = false;
        exp.setAttribute('role', 'status');
      }
    };
    q.querySelectorAll<HTMLElement>('[data-option]').forEach((o) => {
      o.addEventListener('click', () => choose(o));
      o.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          choose(o);
        }
      });
    });
  });
  document.querySelectorAll<HTMLElement>('[data-quiz-group]').forEach((q) => {
    q.querySelectorAll<HTMLElement>('.opt').forEach((o) => {
      if (o.tagName !== 'BUTTON') {
        o.tabIndex = 0;
        o.setAttribute('role', 'button');
      }
      const choose = () => {
        q.querySelectorAll('.opt').forEach((x) => x.classList.remove('correct', 'wrong'));
        o.classList.add(o.dataset.correct === 'true' ? 'correct' : 'wrong');
        const exp = q.querySelector<HTMLElement>('.explain');
        if (exp) {
          exp.hidden = false;
          exp.setAttribute('role', 'status');
        }
      };
      o.addEventListener('click', choose);
      if (o.tagName !== 'BUTTON')
        o.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            choose();
          }
        });
    });
  });
  document.querySelectorAll<HTMLPreElement>('main pre').forEach((pre) => {
    if (pre.closest('astro-island')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'code-shell';
    pre.before(wrapper);
    wrapper.append(pre);
    const b = document.createElement('button');
    b.className = 'copy-code';
    b.textContent = 'Copy';
    b.type = 'button';
    b.setAttribute('aria-label', 'Sao chép đoạn code');
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.textContent || '');
        b.textContent = 'Đã copy';
        setTimeout(() => (b.textContent = 'Copy'), 1500);
      } catch {
        b.textContent = 'Chọn code để copy';
      }
    });
    wrapper.append(b);
  });
}
