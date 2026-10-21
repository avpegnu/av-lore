import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import type { LocalizedText } from '../lib/handbook-schema';
import type { Architecture } from '../lib/handbook-schema';
import ArchitectureExplorer from './ArchitectureExplorer';
type Stage = { id:string; title:LocalizedText; description:LocalizedText; exitCriteria:LocalizedText; diagram?:Architecture };
export default function BuildTimeline({ stages }: { stages:Stage[] }) {
  const ref=useIslandReady(),uid='build-'+useId().replace(/:/g,'');
  const [selected,setSelected]=useState(0);
  const stage=stages[selected];
  return <section className="build-timeline" ref={ref}>
    <ol aria-label="Các giai đoạn xây dựng">{stages.map((item,i)=><li key={item.id}>
      <button type="button" aria-current={selected===i?'step':undefined} aria-controls={uid} onClick={()=>setSelected(i)}>
        <span>{String(i+1).padStart(2,'0')}</span>{item.title.vi}
      </button>
    </li>)}</ol>
    <div id={uid} className="build-stage"><div aria-live="polite"><span className="eyebrow">STAGE {selected+1} / {stages.length}</span>
      <h3>{stage.title.vi}</h3><p>{stage.description.vi}</p>
      <aside className="callout"><strong>Điều kiện trước khi mở rộng</strong><p>{stage.exitCriteria.vi}</p></aside></div>
      {stage.diagram&&<ArchitectureExplorer key={stage.id} diagram={stage.diagram}/>}
    </div>
  </section>;
}
