// CLI Mastery — Terminal engine
// Supports two modes:
//   1) Inline: any element with class "terminal-sim" already in the page is initialized.
//   2) Modal: a floating button + dialog is auto-mounted on every page.
// Keyboard: Ctrl+` opens modal, Esc closes it.

(function () {
  // ===== Virtual filesystem =====
  const fs = {
    '/': { type: 'dir', children: ['Users'] },
    '/Users': { type: 'dir', children: ['you'] },
    '/Users/you': {
      type: 'dir',
      children: ['Developer', 'Documents', 'Downloads', '.zshrc', '.bashrc']
    },
    '/Users/you/Documents': { type: 'dir', children: ['note.txt', 'todo.md'] },
    '/Users/you/Downloads': { type: 'dir', children: ['app.dmg'] },
    '/Users/you/Developer': { type: 'dir', children: ['IT Basic', 'projects'] },
    '/Users/you/Developer/IT Basic': { type: 'dir', children: ['CLI', 'JS', 'Python'] },
    '/Users/you/Developer/IT Basic/CLI': {
      type: 'dir',
      children: ['index.html', 'css', 'js', 'chuong']
    },
    '/Users/you/Developer/projects': { type: 'dir', children: ['hello-world'] },
    '/Users/you/Documents/note.txt': {
      type: 'file',
      content: 'Hello from note.txt\nĐây là file giả lập trong terminal.'
    },
    '/Users/you/Documents/todo.md': {
      type: 'file',
      content: '# TODO\n- Học CLI tuần 1\n- Làm bài tập navigation'
    },
    '/Users/you/.zshrc': { type: 'file', content: '# zsh config\nexport PATH=$PATH:/usr/local/bin' },
    '/Users/you/.bashrc': { type: 'file', content: '# bash config' }
  };

  let cwd = '/Users/you';
  let oldPwd = null;

  function resolve(path) {
    if (!path || path === '~') return '/Users/you';
    if (path.startsWith('~/')) path = '/Users/you/' + path.slice(2);
    if (!path.startsWith('/')) path = cwd === '/' ? '/' + path : cwd + '/' + path;
    const parts = path.split('/').filter(Boolean);
    const stack = [];
    for (const p of parts) {
      if (p === '.') continue;
      if (p === '..') stack.pop();
      else stack.push(p);
    }
    return '/' + stack.join('/');
  }

  function listDir(path) {
    const node = fs[path];
    if (!node || node.type !== 'dir') return null;
    return node.children;
  }

  function parentOf(path) {
    if (path === '/') return null;
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    return '/' + parts.join('/');
  }

  function basenameOf(path) {
    const parts = path.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  }

  function joinPath(dir, name) {
    return dir === '/' ? '/' + name : dir + '/' + name;
  }

  function addEntry(dirPath, name, node) {
    fs[joinPath(dirPath, name)] = node;
    const parent = fs[dirPath];
    if (parent && parent.type === 'dir' && !parent.children.includes(name)) {
      parent.children.push(name);
    }
  }

  function removeEntry(path) {
    const parent = parentOf(path);
    const name = basenameOf(path);
    delete fs[path];
    // Recursively delete dir descendants
    Object.keys(fs).forEach((k) => {
      if (k.startsWith(path + '/')) delete fs[k];
    });
    if (parent && fs[parent]) {
      fs[parent].children = fs[parent].children.filter((n) => n !== name);
    }
  }

  function deepCopy(srcPath, dstPath) {
    const node = fs[srcPath];
    if (!node) return false;
    if (node.type === 'file') {
      fs[dstPath] = { type: 'file', content: node.content };
      const parent = parentOf(dstPath);
      const name = basenameOf(dstPath);
      if (fs[parent] && !fs[parent].children.includes(name)) {
        fs[parent].children.push(name);
      }
      return true;
    }
    // Dir
    fs[dstPath] = { type: 'dir', children: [] };
    const parent = parentOf(dstPath);
    const name = basenameOf(dstPath);
    if (fs[parent] && !fs[parent].children.includes(name)) {
      fs[parent].children.push(name);
    }
    for (const child of node.children) {
      deepCopy(joinPath(srcPath, child), joinPath(dstPath, child));
    }
    return true;
  }

  const commands = {
    help() {
      return [
        'Các lệnh có sẵn trong terminal giả lập:',
        '',
        'Navigation:',
        '  pwd                       — in thư mục hiện tại',
        '  ls [-laSthr1]             — liệt kê file/folder',
        '  cd <path | - | ~ | ..>    — chuyển thư mục',
        '  cat | head <file>         — xem nội dung file',
        '',
        'File ops (Chương 2):',
        '  mkdir [-p] <dir>          — tạo folder (-p tạo cả parent)',
        '  touch <file>              — tạo file rỗng',
        '  cp [-r] <src> <dst>       — copy file/folder',
        '  mv <src> <dst>            — di chuyển hoặc đổi tên',
        '  rm [-r|-rf] <target>      — xóa file/folder',
        '  rmdir <dir>               — xóa folder rỗng',
        '  chmod <mode> <file>       — đổi quyền (cosmetic)',
        '',
        'Misc:',
        '  echo <text> · whoami · date · clear · help',
        '',
        'Phím tắt: Tab autocomplete · ↑/↓ history · Ctrl+L clear · Esc đóng modal · Ctrl+` toggle'
      ].join('\n');
    },
    pwd() {
      return cwd;
    },
    ls(args) {
      const flags = args.filter((a) => a.startsWith('-')).join('');
      const has = (f) => flags.includes(f);
      const target = args.find((a) => !a.startsWith('-')) || cwd;
      const path = resolve(target);
      const items = listDir(path);
      if (items === null) return { err: `ls: ${target}: No such file or directory` };

      const fakeSize = (full) => {
        const node = fs[full];
        if (node && node.type === 'dir') return 128;
        let h = 0;
        for (let i = 0; i < full.length; i++) h = (h * 31 + full.charCodeAt(i)) >>> 0;
        return 100 + (h % 90000);
      };
      const fmtSize = (n) => {
        if (!has('h')) return String(n);
        if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + 'M';
        if (n >= 1024) return (n / 1024).toFixed(1) + 'K';
        return n + 'B';
      };

      let visible = items.slice();
      if (!has('a')) visible = visible.filter((n) => !n.startsWith('.'));

      // Default sort: alphabetical, case-insensitive (matches macOS ls)
      visible.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

      // -t: sort by "mtime" (we use original array order as proxy: later index = newer)
      if (has('t')) {
        visible.sort((a, b) => items.indexOf(b) - items.indexOf(a));
      }
      // -S: sort by size descending
      if (has('S')) {
        const fullOf = (n) => (path === '/' ? '/' + n : path + '/' + n);
        visible.sort((a, b) => fakeSize(fullOf(b)) - fakeSize(fullOf(a)));
      }
      // -r: reverse the final order
      if (has('r')) visible.reverse();

      if (has('l')) {
        return visible
          .map((n) => {
            const full = path === '/' ? '/' + n : path + '/' + n;
            const node = fs[full];
            const isDir = node && node.type === 'dir';
            const type = isDir ? 'd' : '-';
            const sizeStr = fmtSize(fakeSize(full)).padStart(6);
            return `${type}rwxr-xr-x  1 you  staff  ${sizeStr}  May  8 12:30  ${n}`;
          })
          .join('\n');
      }

      if (has('1')) return visible.join('\n');
      return visible.join('  ');
    },
    cd(args) {
      const target = args[0] || '~';
      let path;
      if (target === '-') {
        if (!oldPwd) return { err: 'cd: OLDPWD not set' };
        path = oldPwd;
      } else {
        path = resolve(target);
      }
      if (!fs[path]) return { err: `cd: ${target}: no such file or directory` };
      if (fs[path].type !== 'dir') return { err: `cd: ${target}: not a directory` };
      oldPwd = cwd;
      cwd = path;
      // Real bash prints the new directory when using `cd -`
      return target === '-' ? path : '';
    },
    cat(args) {
      if (!args[0]) return { err: 'cat: missing file operand' };
      const path = resolve(args[0]);
      const node = fs[path];
      if (!node) return { err: `cat: ${args[0]}: No such file or directory` };
      if (node.type !== 'file') return { err: `cat: ${args[0]}: Is a directory` };
      return node.content;
    },
    echo(args) {
      return args.join(' ');
    },
    whoami() {
      return 'you';
    },
    date() {
      return new Date().toString();
    },
    clear() {
      return '__CLEAR__';
    },

    mkdir(args) {
      const flags = args.filter((a) => a.startsWith('-')).join('');
      const targets = args.filter((a) => !a.startsWith('-'));
      if (!targets.length) return { err: 'mkdir: missing operand' };
      const recursive = flags.includes('p');
      for (const t of targets) {
        const path = resolve(t);
        if (fs[path]) {
          if (!recursive) return { err: `mkdir: ${t}: File exists` };
          continue;
        }
        if (recursive) {
          // Create all intermediate directories
          const parts = path.split('/').filter(Boolean);
          let cur = '';
          for (const p of parts) {
            cur += '/' + p;
            if (!fs[cur]) {
              const parent = parentOf(cur);
              if (parent !== null && (!fs[parent] || fs[parent].type !== 'dir')) {
                return { err: `mkdir: ${t}: Not a directory` };
              }
              addEntry(parent, p, { type: 'dir', children: [] });
            } else if (fs[cur].type !== 'dir') {
              return { err: `mkdir: ${t}: Not a directory` };
            }
          }
        } else {
          const parent = parentOf(path);
          if (!fs[parent] || fs[parent].type !== 'dir') {
            return { err: `mkdir: ${t}: No such file or directory` };
          }
          addEntry(parent, basenameOf(path), { type: 'dir', children: [] });
        }
      }
      return '';
    },

    touch(args) {
      const targets = args.filter((a) => !a.startsWith('-'));
      if (!targets.length) return { err: 'touch: missing file operand' };
      for (const t of targets) {
        const path = resolve(t);
        if (fs[path]) continue; // would update mtime, but we don't track time
        const parent = parentOf(path);
        if (!fs[parent] || fs[parent].type !== 'dir') {
          return { err: `touch: ${t}: No such file or directory` };
        }
        addEntry(parent, basenameOf(path), { type: 'file', content: '' });
      }
      return '';
    },

    rmdir(args) {
      const targets = args.filter((a) => !a.startsWith('-'));
      if (!targets.length) return { err: 'rmdir: missing operand' };
      for (const t of targets) {
        const path = resolve(t);
        if (!fs[path]) return { err: `rmdir: ${t}: No such file or directory` };
        if (fs[path].type !== 'dir') return { err: `rmdir: ${t}: Not a directory` };
        if (fs[path].children.length) return { err: `rmdir: ${t}: Directory not empty` };
        if (path === cwd) return { err: `rmdir: ${t}: cannot remove current directory` };
        removeEntry(path);
      }
      return '';
    },

    rm(args) {
      const flags = args.filter((a) => a.startsWith('-')).join('');
      const targets = args.filter((a) => !a.startsWith('-'));
      if (!targets.length) return { err: 'rm: missing operand' };
      const recursive = flags.includes('r') || flags.includes('R');
      const force = flags.includes('f');
      for (const t of targets) {
        const path = resolve(t);
        if (path === '/' || path === '/Users' || path === '/Users/you') {
          return { err: `rm: ${t}: từ chối thực hiện (đường dẫn đặc biệt — đừng thử rm -rf / nhé!)` };
        }
        if (path === cwd) {
          return { err: `rm: ${t}: cannot remove current directory` };
        }
        if (!fs[path]) {
          if (force) continue;
          return { err: `rm: ${t}: No such file or directory` };
        }
        if (fs[path].type === 'dir' && !recursive) {
          return { err: `rm: ${t}: is a directory (dùng rm -r để xóa folder)` };
        }
        removeEntry(path);
      }
      return '';
    },

    cp(args) {
      const flags = args.filter((a) => a.startsWith('-')).join('');
      const ops = args.filter((a) => !a.startsWith('-'));
      if (ops.length < 2) return { err: 'cp: missing destination operand' };
      const recursive = flags.includes('r') || flags.includes('R');
      const dst = ops.pop();
      const dstPath = resolve(dst);
      const dstIsDir = fs[dstPath] && fs[dstPath].type === 'dir';

      for (const src of ops) {
        const srcPath = resolve(src);
        if (!fs[srcPath]) return { err: `cp: ${src}: No such file or directory` };
        if (fs[srcPath].type === 'dir' && !recursive) {
          return { err: `cp: ${src} is a directory (dùng cp -r)` };
        }
        const finalDst = dstIsDir ? joinPath(dstPath, basenameOf(srcPath)) : dstPath;
        deepCopy(srcPath, finalDst);
      }
      return '';
    },

    mv(args) {
      const ops = args.filter((a) => !a.startsWith('-'));
      if (ops.length < 2) return { err: 'mv: missing destination operand' };
      const dst = ops.pop();
      const dstPath = resolve(dst);
      const dstIsDir = fs[dstPath] && fs[dstPath].type === 'dir';

      for (const src of ops) {
        const srcPath = resolve(src);
        if (!fs[srcPath]) return { err: `mv: ${src}: No such file or directory` };
        const finalDst = dstIsDir ? joinPath(dstPath, basenameOf(srcPath)) : dstPath;
        // Copy then remove (simulates rename / move)
        deepCopy(srcPath, finalDst);
        removeEntry(srcPath);
      }
      return '';
    },

    chmod(args) {
      const ops = args.filter((a) => !a.startsWith('-'));
      if (ops.length < 2) return { err: 'chmod: missing operand' };
      const mode = ops[0];
      const targets = ops.slice(1);
      // Validate mode (octal or symbolic)
      const isOctal = /^[0-7]{3,4}$/.test(mode);
      const isSymbolic = /^[ugoa]*[+\-=][rwxXst]*$/.test(mode);
      if (!isOctal && !isSymbolic) {
        return { err: `chmod: ${mode}: invalid mode` };
      }
      for (const t of targets) {
        const path = resolve(t);
        if (!fs[path]) return { err: `chmod: ${t}: No such file or directory` };
      }
      // Cosmetic: in simulator we don't actually track mode, just acknowledge.
      return '';
    },

    head(args) {
      const ops = args.filter((a) => !a.startsWith('-'));
      if (!ops.length) return { err: 'head: missing file operand' };
      const path = resolve(ops[0]);
      if (!fs[path]) return { err: `head: ${ops[0]}: No such file or directory` };
      if (fs[path].type !== 'file') return { err: `head: ${ops[0]}: Is a directory` };
      return fs[path].content.split('\n').slice(0, 10).join('\n');
    }
  };

  function escapeHTML(s) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function appendLine(body, text, cls) {
    const div = document.createElement('div');
    div.className = 'line ' + (cls || '');
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function appendPromptLine(body, command) {
    const div = document.createElement('div');
    div.className = 'line';
    const promptLabel = cwd.replace('/Users/you', '~');
    div.innerHTML = `<span class="prompt">you@mac ${promptLabel} $</span> ${escapeHTML(command)}`;
    body.appendChild(div);
  }

  // Shell-like tokenizer: respects "double quotes", 'single quotes', and \ escapes.
  function tokenize(input) {
    const tokens = [];
    let cur = '';
    let inSingle = false;
    let inDouble = false;
    let hasContent = false;
    for (let i = 0; i < input.length; i++) {
      const c = input[i];
      if (inSingle) {
        if (c === "'") { inSingle = false; }
        else { cur += c; hasContent = true; }
        continue;
      }
      if (inDouble) {
        if (c === '"') { inDouble = false; }
        else if (c === '\\' && i + 1 < input.length && '"\\$`'.includes(input[i + 1])) {
          cur += input[++i]; hasContent = true;
        } else { cur += c; hasContent = true; }
        continue;
      }
      if (c === "'") { inSingle = true; hasContent = true; continue; }
      if (c === '"') { inDouble = true; hasContent = true; continue; }
      if (c === '\\' && i + 1 < input.length) {
        cur += input[++i]; hasContent = true; continue;
      }
      if (/\s/.test(c)) {
        if (hasContent) { tokens.push(cur); cur = ''; hasContent = false; }
        continue;
      }
      cur += c; hasContent = true;
    }
    if (inSingle || inDouble) {
      return { err: 'Lỗi cú pháp: thiếu dấu nháy đóng ' + (inSingle ? "'" : '"') };
    }
    if (hasContent) tokens.push(cur);
    return { tokens };
  }

  // ===== Tab completion helpers =====
  // Walk text up to cursor and identify the token currently being completed.
  function getCurrentToken(text, cursor) {
    const slice = text.slice(0, cursor);
    let cur = '';
    let curStart = -1;
    let inSingle = false;
    let inDouble = false;
    let openQuote = '';
    let tokensBefore = [];

    for (let i = 0; i < slice.length; i++) {
      const c = slice[i];
      if (inSingle) {
        if (c === "'") { inSingle = false; openQuote = ''; }
        else cur += c;
        continue;
      }
      if (inDouble) {
        if (c === '"') { inDouble = false; openQuote = ''; }
        else if (c === '\\' && i + 1 < slice.length) cur += slice[++i];
        else cur += c;
        continue;
      }
      if (c === "'") {
        if (curStart < 0) curStart = i;
        inSingle = true; openQuote = "'";
        continue;
      }
      if (c === '"') {
        if (curStart < 0) curStart = i;
        inDouble = true; openQuote = '"';
        continue;
      }
      if (c === '\\' && i + 1 < slice.length) {
        if (curStart < 0) curStart = i;
        cur += slice[++i];
        continue;
      }
      if (/\s/.test(c)) {
        if (curStart >= 0) {
          tokensBefore.push(cur);
          cur = ''; curStart = -1;
        }
        continue;
      }
      if (curStart < 0) curStart = i;
      cur += c;
    }

    return {
      word: cur,
      wordStart: curStart >= 0 ? curStart : cursor,
      isFirst: tokensBefore.length === 0,
      openQuote
    };
  }

  function commonPrefix(strings) {
    if (!strings.length) return '';
    let p = strings[0];
    for (let i = 1; i < strings.length; i++) {
      while (strings[i].indexOf(p) !== 0) {
        p = p.slice(0, -1);
        if (!p) return '';
      }
    }
    return p;
  }

  function escapeUnquoted(s) {
    return s.replace(/([ '"\\$`!*?()\[\]{}<>|&;])/g, '\\$1');
  }

  function getCompletions(ctx) {
    if (ctx.isFirst) {
      return Object.keys(commands)
        .filter((k) => k.startsWith(ctx.word))
        .sort()
        .map((name) => ({ name, isDir: false, isCommand: true }));
    }
    const word = ctx.word;
    const lastSlash = word.lastIndexOf('/');
    const dirPart = lastSlash >= 0 ? word.slice(0, lastSlash + 1) : '';
    const basePart = lastSlash >= 0 ? word.slice(lastSlash + 1) : word;
    const dirPath = resolve(dirPart || '.');
    const entries = listDir(dirPath) || [];
    let visible = entries;
    if (!basePart.startsWith('.')) visible = entries.filter((e) => !e.startsWith('.'));
    return visible
      .filter((e) => e.startsWith(basePart))
      .sort()
      .map((name) => {
        const full = dirPath === '/' ? '/' + name : dirPath + '/' + name;
        const node = fs[full];
        return { name, isDir: node && node.type === 'dir', dirPart };
      });
  }

  // Build the replacement string for a completion result, respecting quote state.
  function buildCompletion(ctx, completedName, isDir, finished) {
    const trail = finished ? (isDir ? '/' : ' ') : '';
    if (ctx.isFirst) return completedName + trail;

    if (ctx.openQuote === '"') {
      const closing = finished ? '"' : '';
      return '"' + (completedName.replace(/(["\\$`])/g, '\\$1')) + closing + trail;
    }
    if (ctx.openQuote === "'") {
      // Inside single quote — cannot escape, so just close the quote literally.
      const closing = finished ? "'" : '';
      return "'" + completedName + closing + trail;
    }
    // Unquoted: backslash-escape spaces and special chars
    return escapeUnquoted(completedName) + trail;
  }

  function runCommand(input, body) {
    const trimmed = input.trim();
    if (!trimmed) return;
    const parsed = tokenize(trimmed);
    if (parsed.err) {
      appendLine(body, parsed.err, 'err');
      return;
    }
    const [cmd, ...args] = parsed.tokens;
    const fn = commands[cmd];
    if (!fn) {
      appendLine(body, `zsh: command not found: ${cmd}`, 'err');
      return;
    }
    const result = fn(args);
    if (result === '__CLEAR__') {
      body.innerHTML = '';
      return;
    }
    if (result && typeof result === 'object' && result.err) {
      appendLine(body, result.err, 'err');
    } else if (result) {
      appendLine(body, result, 'output');
    }
  }

  function updatePrompt(root) {
    const promptEl = root.querySelector('.terminal-input-line .prompt');
    if (promptEl) {
      const label = cwd.replace('/Users/you', '~');
      promptEl.textContent = `you@mac ${label} $`;
    }
  }

  function initTerminal(root, opts = {}) {
    if (root.dataset.initialized === '1') return;
    root.dataset.initialized = '1';

    const body = root.querySelector('.terminal-body');
    const input = root.querySelector('.terminal-input');
    if (!body || !input) return;

    if (!opts.skipBanner) {
      appendLine(body, '╭─────────────────────────────────────────╮', 'output');
      appendLine(body, '│  CLI Practice Terminal — gõ "help"      │', 'output');
      appendLine(body, '╰─────────────────────────────────────────╯', 'output');
    }

    const history = [];
    let historyIdx = -1;
    let lastTabTime = 0;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const text = input.value;
        const cursor = input.selectionStart ?? text.length;
        const ctx = getCurrentToken(text, cursor);
        const candidates = getCompletions(ctx);

        if (candidates.length === 0) {
          lastTabTime = 0;
          return;
        }

        if (candidates.length === 1) {
          const c = candidates[0];
          const fullToken = (c.dirPart || '') + c.name;
          const replacement = buildCompletion(ctx, fullToken, c.isDir, true);
          const newText = text.slice(0, ctx.wordStart) + replacement + text.slice(cursor);
          input.value = newText;
          const newCursor = ctx.wordStart + replacement.length;
          input.setSelectionRange(newCursor, newCursor);
          lastTabTime = 0;
          return;
        }

        // Multiple matches — try to extend to common prefix
        const names = candidates.map((c) => c.name);
        const cp = commonPrefix(names);
        const lastSlash = ctx.word.lastIndexOf('/');
        const basePart = lastSlash >= 0 ? ctx.word.slice(lastSlash + 1) : ctx.word;
        const dirPart = lastSlash >= 0 ? ctx.word.slice(0, lastSlash + 1) : '';

        if (cp.length > basePart.length) {
          const fullToken = (ctx.isFirst ? '' : dirPart) + cp;
          const replacement = buildCompletion(ctx, fullToken, false, false);
          const newText = text.slice(0, ctx.wordStart) + replacement + text.slice(cursor);
          input.value = newText;
          const newCursor = ctx.wordStart + replacement.length;
          input.setSelectionRange(newCursor, newCursor);
          lastTabTime = Date.now();
          return;
        }

        // Cannot extend — on double-Tab, list candidates
        const now = Date.now();
        if (now - lastTabTime < 600) {
          appendPromptLine(body, text);
          const display = candidates.map((c) =>
            c.name + (c.isDir ? '/' : c.isCommand ? '' : '')
          );
          appendLine(body, display.join('   '), 'output');
          lastTabTime = 0;
        } else {
          lastTabTime = now;
        }
        return;
      }

      if (e.key === 'Enter') {
        const value = input.value;
        appendPromptLine(body, value);
        if (value.trim()) {
          history.unshift(value);
          historyIdx = -1;
        }
        runCommand(value, body);
        input.value = '';
        updatePrompt(root);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (history.length && historyIdx < history.length - 1) {
          historyIdx++;
          input.value = history[historyIdx];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIdx > 0) {
          historyIdx--;
          input.value = history[historyIdx];
        } else {
          historyIdx = -1;
          input.value = '';
        }
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        body.innerHTML = '';
      }
    });

    root.addEventListener('click', (e) => {
      // Don't steal focus from buttons inside the terminal
      if (e.target.closest('button')) return;
      input.focus();
    });
    updatePrompt(root);
  }

  document.querySelectorAll('.terminal-sim').forEach(el => initTerminal(el));
})();
