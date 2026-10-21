/** Explicit content translation task. Builds use the saved dictionary without network access. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { site, cachePath, collectStrings, readCache } from './localization.mjs';
const journal = path.join(site, '.cache/translations/en.jsonl');
fs.mkdirSync(path.dirname(journal), { recursive: true });
const cache = readCache();
if (fs.existsSync(journal))
  for (const line of fs.readFileSync(journal, 'utf8').split('\n').filter(Boolean)) {
    try {
      Object.assign(cache, JSON.parse(line));
    } catch {}
  }
const { all } = collectStrings();
const pending = [...all].filter((s) => !cache[s]);
console.log(
  `${all.size} unique strings; ${pending.length} need English translation (${pending.reduce((n, s) => n + s.length, 0)} source characters).`,
);
if (process.argv.includes('--manifest') || process.argv.includes('--offline')) {
  fs.writeFileSync(path.join(site, '.cache/translations/pending-en.json'), JSON.stringify(pending));
  if (process.argv.includes('--offline')) {
    const result = spawnSync(
      process.env.TRANSLATION_PYTHON || 'python3',
      [path.join(site, 'scripts/translate-en-offline.py')],
      { stdio: 'inherit', env: process.env },
    );
    if (result.error) throw result.error;
    process.exit(result.status ?? 1);
  }
  process.exit(0);
}
let batches = [],
  batch = [],
  size = 0;
for (const text of pending) {
  if (size + text.length + 25 > 2300 && batch.length) {
    batches.push(batch);
    batch = [];
    size = 0;
  }
  batch.push(text);
  size += text.length + 25;
}
if (batch.length) batches.push(batch);
let cursor = 0,
  done = 0;
let stopped = false;
const started = Date.now();
async function request(strings, attempt = 0) {
  const q =
    strings.map((s, i) => `[ITB${String(i).padStart(6, '0')}]\n${s}\n`).join('\n') +
    '\n[ITB999999]';
  const params = new URLSearchParams({ client: 'gtx', sl: 'vi', tl: 'en', dt: 't', q });
  try {
    const response = await fetch('https://translate.googleapis.com/translate_a/single?' + params, {
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) {
      const error = new Error(`Translation HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const data = await response.json(),
      result = data[0].map((row) => row[0] || '').join('');
    const markers = [...result.matchAll(/\[\s*ITB\s*(\d{6})\s*\]/gi)];
    if (markers.length !== strings.length + 1)
      throw Error(`Marker count ${markers.length}/${strings.length + 1}`);
    const out = {};
    for (let i = 0; i < strings.length; i++) {
      if (Number(markers[i][1]) !== i) throw Error('Translation marker order changed.');
      const value = result
        .slice(markers[i].index + markers[i][0].length, markers[i + 1].index)
        .trim();
      if (!value) throw Error('Empty translation.');
      out[strings[i]] = value;
    }
    return out;
  } catch (error) {
    if (error.status === 429)
      throw Error(
        'Translation service rate-limited this task. Checkpoint saved; resume later or use --offline.',
      );
    if (attempt >= 5) {
      if (strings.length > 1) {
        const mid = Math.ceil(strings.length / 2);
        return {
          ...(await request(strings.slice(0, mid))),
          ...(await request(strings.slice(mid))),
        };
      }
      throw error;
    }
    await new Promise((r) => setTimeout(r, Math.min(30000, 1000 * 2 ** attempt)));
    return request(strings, attempt + 1);
  }
}
async function worker() {
  while (!stopped && cursor < batches.length) {
    const i = cursor++,
      out = await request(batches[i]).catch((error) => {
        stopped = true;
        throw error;
      });
    Object.assign(cache, out);
    fs.appendFileSync(journal, JSON.stringify(out) + '\n');
    done++;
    if (done % 20 === 0)
      console.log(
        `Translated ${done}/${batches.length} batches (${Math.round((Date.now() - started) / 1000)}s).`,
      );
    await new Promise((r) => setTimeout(r, 140));
  }
}
try {
  const results = await Promise.allSettled([worker(), worker()]);
  const failure = results.find((r) => r.status === 'rejected');
  if (failure) throw failure.reason;
} finally {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(
    cachePath,
    JSON.stringify(
      Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b))),
      null,
      2,
    ) + '\n',
  );
}
const missing = [...all].filter((s) => !cache[s]);
if (missing.length) throw Error(`${missing.length} translations missing.`);
console.log(`English dictionary complete: ${all.size} source strings.`);
