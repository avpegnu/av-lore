"""Finish a saved translation manifest locally with an Argos/CTranslate2 vi-en model.
Requires: pip install ctranslate2 sentencepiece
Use: ARGOS_MODEL_DIR=/path/to/unpacked/package python scripts/translate-en-offline.py
No website content or learning state is sent to a remote service.
"""
import concurrent.futures
import json
import os
from pathlib import Path
import re
import time
import ctranslate2
import sentencepiece

site = Path(__file__).resolve().parent.parent
model_dir = Path(os.environ['ARGOS_MODEL_DIR'])
cache_path = site / 'src/i18n/en.json'
journal = site / '.cache/translations/en.jsonl'
pending_path = site / '.cache/translations/pending-en.json'
cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
for line in journal.read_text().splitlines() if journal.exists() else []:
    try:
        cache.update(json.loads(line))
    except json.JSONDecodeError:
        pass
cache.update(json.loads((site / 'src/i18n/en-overrides.json').read_text()))
pending = [s for s in json.loads(pending_path.read_text()) if s not in cache]
terms = ['JavaScript', 'TypeScript', 'Node.js', 'React', 'Promise', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'Kubernetes', 'Docker', 'WebSocket', 'GraphQL', 'gRPC', 'OAuth', 'OpenID Connect', 'GitHub', 'Linux', 'Python', 'Java', 'Dart', 'Flutter', 'Array', 'Object', 'Map', 'Set', 'WeakMap', 'undefined', 'null', 'NaN', 'async', 'await', 'typeof', 'instanceof', 'this', 'let', 'const', 'var', 'true', 'false', 'fetch', 'setTimeout', 'queueMicrotask', 'Idempotency-Key', 'ReplicaSet', 'Deployment', 'Service', 'Pod', 'StatefulSet', 'DaemonSet', 'ConfigMap', 'Secret', 'Ingress', 'HorizontalPodAutoscaler', 'useEffect', 'useState', 'useMemo', 'useCallback', 'useRef', 'AbortController', 'EventEmitter', 'localStorage', 'sessionStorage', 'textContent', 'innerHTML', 'double-entry', 'exactly-once', 'at-least-once', 'idempotency', 'invariant', 'base62', 'p99', 'p95', 'p50', 'Node', 'Next.js', 'Astro']
protected = re.compile(r'(__ITB_VAR_\d+__|https?://\S+|[A-Za-z_][\w.-]*\([^\n)]*\)|\b[A-Z][A-Z0-9_]{1,}\b|\b\d[\d.,]*\b|[\u0370-\u03FF\u2200-\u22FF]+|\b(?:' + '|'.join(re.escape(t) for t in sorted(terms,key=len,reverse=True)) + r')\b)')
vi = re.compile(r'[À-ỹĐđ]')
parts = {s:protected.split(s) for s in pending}
segments = list(dict.fromkeys(p.strip() for chunks in parts.values() for i,p in enumerate(chunks) if i%2==0 and vi.search(p)))
sp = sentencepiece.SentencePieceProcessor(model_file=str(model_dir / 'sentencepiece.model'))
translator = ctranslate2.Translator(str(model_dir / 'model'), device='cpu', compute_type='int8', inter_threads=2, intra_threads=4)
translated = {}
started=time.time()
print(f'Offline translation: {len(pending)} strings, {len(segments)} unique prose segments.',flush=True)
for offset in range(0,len(segments),128):
    batch=segments[offset:offset+128]
    results=translator.translate_batch([sp.encode(s,out_type=str) for s in batch],beam_size=2,max_decoding_length=1024,max_input_length=1024,max_batch_size=32,batch_type='examples')
    for source,result in zip(batch,results):
        output=re.sub(r'\s+',' ',sp.decode(result.hypotheses[0]).replace('▁',' ')).strip()
        if not output:
            raise ValueError('Empty local translation')
        translated[source]=output
    if offset%1024==0:
        print(f'Local segments {min(offset+128,len(segments))}/{len(segments)} ({round(time.time()-started)}s).',flush=True)
    # Save completed strings continuously; interrupted work can be resumed.
    completed={}
    for source,chunks in parts.items():
        if source in cache:continue
        if any(i%2==0 and vi.search(p) and p.strip() not in translated for i,p in enumerate(chunks)):continue
        out=[]
        for i,p in enumerate(chunks):
            if i%2==0 and vi.search(p):
                leading=p[:len(p)-len(p.lstrip())];trailing=p[len(p.rstrip()):]
                out.append(leading+translated[p.strip()]+trailing)
            else:out.append(p)
        completed[source]=''.join(out)
    if completed:
        cache.update(completed)
        with journal.open('a') as f:f.write(json.dumps(completed,ensure_ascii=False)+'\n')
cache_path.write_text(json.dumps(dict(sorted(cache.items())),ensure_ascii=False,indent=2)+'\n')
missing=[s for s in pending if s not in cache]
if missing:raise ValueError(f'{len(missing)} strings still missing')
print(f'Offline translation finished: {len(pending)} strings in {round(time.time()-started)}s.',flush=True)
