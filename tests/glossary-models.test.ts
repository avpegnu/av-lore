import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { glossaryEntrySchema } from '../src/lib/glossary-schema';
import {
  normalizeGlossary,
  indexGlossary,
  searchGlossary,
  findGlossary,
  groupGlossary,
  glossaryAnchor,
} from '../src/lib/glossary-models';
const folder = path.resolve('src/content/glossary'),
  entries = fs
    .readdirSync(folder)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) =>
      glossaryEntrySchema.array().parse(JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8'))),
    ),
  index = indexGlossary(entries);
test('bilingual glossary entries have unique identities and valid authored lesson/topic links', () => {
  const topics = new Set(fs.readdirSync('src/content/topics').map((f) => f.replace(/\.json$/, '')));
  for (const e of entries) {
    for (const id of e.relatedLessons)
      assert.ok(fs.existsSync(`src/content/handbook/${id}.json`), `${e.id} lesson ${id}`);
    for (const id of e.relatedTopics) assert.ok(topics.has(id), `${e.id} topic ${id}`);
    for (const field of ['definition', 'example', 'pitfall'] as const) {
      assert.ok(e[field].vi.trim());
      assert.ok(e[field].en.trim());
      assert.equal(/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(e[field].en), false, e.id + ' ' + field);
    }
  }
  assert.equal(new Set(entries.map((e) => e.id)).size, entries.length);
});
test('query matches accents/case, aliases and either language, with exact term/alias ranking before body hits', () => {
  assert.equal(normalizeGlossary('  ĐỘ  TRỄ '), 'do tre');
  assert.equal(searchGlossary(index, 'TTL').entries[0].id, 'ttl');
  assert.equal(searchGlossary(index, 'time to live').entries[0].id, 'ttl');
  assert.ok(searchGlossary(index, 'khong').entries.length > 0);
  assert.equal(searchGlossary(index, 'zzzz-no-such-token').entries.length, 0);
  const hit = searchGlossary(index, 'authorization', 'cache');
  assert.ok(hit.entries.every((e) => e.category.id === 'cache'));
  assert.ok(hit.totalMatches >= hit.entries.length);
  assert.equal(hit.counts.cache, hit.entries.length);
});
test('grouping and stable links preserve literal terms without treating query text as markup or regex', () => {
  assert.equal(findGlossary(index, 'term-ttl')?.entry.id, 'ttl');
  assert.equal(findGlossary(index, 'TTL')?.entry.id, 'ttl');
  assert.equal(glossaryAnchor('b-tree'), 'term-b-tree');
  assert.ok(
    groupGlossary(entries)
      .find((g) => g.letter === 'T')
      ?.entries.some((e) => e.id === 'ttl'),
  );
  assert.equal(searchGlossary(index, '[.*<script>').entries.length, 0);
  assert.throws(() => indexGlossary([entries[0], entries[0]]));
});

test('category counts are computed before category filtering, while query words must share one entry', () => {
  const fixture = [
    {
      ...entries[0],
      id: 'one',
      term: 'Alpha',
      aliases: ['First'],
      category: { id: 'left', label: { vi: 'Nhóm trái', en: 'Left' } },
      definition: { vi: 'red apple', en: 'red apple' },
      example: { vi: 'green fruit', en: 'green fruit' },
      pitfall: { vi: 'safe', en: 'safe' },
    },
    {
      ...entries[0],
      id: 'two',
      term: 'Beta',
      aliases: [],
      category: { id: 'right', label: { vi: 'Nhóm phải', en: 'Right' } },
      definition: { vi: 'red pear', en: 'red pear' },
      example: { vi: 'blue sky', en: 'blue sky' },
      pitfall: { vi: 'safe', en: 'safe' },
    },
  ];
  const idx = indexGlossary(fixture);
  assert.deepEqual(searchGlossary(idx, 'red', 'left').counts, { left: 1, right: 1 });
  assert.equal(searchGlossary(idx, 'red', 'left').entries.length, 1);
  assert.equal(searchGlossary(idx, 'apple blue').entries.length, 0);
  assert.equal(searchGlossary(idx, 'red green').entries[0].id, 'one');
  assert.equal(searchGlossary(idx, 'FIRST').entries[0].id, 'one');
  assert.equal(searchGlossary(idx, 'red', 'absent').entries.length, 0);
});
