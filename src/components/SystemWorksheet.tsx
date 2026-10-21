import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { mm1Queue, requestHandshake } from '../lib/handbook-models';
export type SystemWorksheetKind='handshake'|'transport'|'saturation';
export default function SystemWorksheet({kind}:{kind:SystemWorksheetKind}){
  const ref=useIslandReady(),uid='system-model-'+useId().replace(/:/g,'');
  const [rtt,setRtt]=useState(40),[mode,setMode]=useState<'tcp-tls'|'quic'|'reuse'>('tcp-tls');
  const [arrival,setArrival]=useState(8),[clients,setClients]=useState(100000),[interval,setInterval]=useState(5);
  const [push,setPush]=useState(false);
  const handshake=requestHandshake(mode,rtt,30,20),queue=mm1Queue(arrival,10);
  const slider=(label:string,value:number,min:number,max:number,step:number,change:(n:number)=>void)=><label>{label}<output>{value}</output><input type="range" min={min} max={max} step={step} value={value} onChange={e=>change(+e.target.value)}/></label>;
  return <section className="handbook-experiment" ref={ref} aria-labelledby={uid}>
    <span className="eyebrow">SYSTEM / TEST THE ASSUMPTIONS</span>
    {kind==='handshake'&&<>
      <h3 id={uid}>Một request mất bao nhiêu round trip?</h3><p>Mô hình giả định DNS cold 30 ms, server xử lý 20 ms, không packet loss; TCP + TLS 1.3 dùng hai RTT trước HTTP, QUIC fresh dùng một RTT, connection reuse không có handshake mới.</p>
      <div className="worksheet-choices">{([['tcp-tls','TCP + TLS 1.3'],['quic','QUIC fresh'],['reuse','Connection reuse']] as const).map(([id,label])=><button type="button" className="secondary" key={id} aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</button>)}</div>
      <div className="worksheet-inputs">{slider('RTT / ms',rtt,5,200,5,setRtt)}</div>
      <div className="handshake-bar" aria-hidden="true">{Object.entries(handshake).filter(([k,v])=>k!=='total'&&v>0).map(([key,value])=><span key={key} style={{flexGrow:value}}>{key}<br/>{value} ms</span>)}</div>
      <dl className="worksheet-results" aria-live="polite"><div><dt>Setup / ms</dt><dd>{handshake.dns+handshake.transport+handshake.crypto}</dd></div><div><dt>First response / ms</dt><dd>{handshake.total}</dd></div></dl>
      <p>Đây là timeline đơn giản, không đo browser thật. DNS có thể cần nhiều lookup; certificate work, proxy hops, resumption, transfer size và congestion không được mô phỏng. QUIC tích hợp transport và TLS; hai phần không cộng như TCP + TLS.</p>
    </>}
    {kind==='transport'&&<>
      <h3 id={uid}>Polling hay server push cho bảng tỉ số?</h3><p>Giả định một update mỗi 30 giây, snapshot/event payload đều 200 byte. Polling trả snapshot mỗi lần hỏi; server push chỉ gửi khi có update. Chưa tính headers, heartbeat, handshake hoặc reconnect.</p>
      <div className="worksheet-inputs">{slider('Clients',clients,1000,1000000,1000,setClients)}{slider('Polling interval / s',interval,1,30,1,setInterval)}</div>
      <div className="worksheet-choices"><button type="button" className="secondary" aria-pressed={!push} onClick={()=>setPush(false)}>Polling</button><button type="button" className="secondary" aria-pressed={push} onClick={()=>setPush(true)}>SSE / WebSocket push</button></div>
      <dl className="worksheet-results" aria-live="polite"><div><dt>Payload deliveries / s</dt><dd>{(clients/(push?30:interval)).toFixed(0)}</dd></div><div><dt>Payload egress / MB/s</dt><dd>{(clients/(push?30:interval)*200/1e6).toFixed(3)}</dd></div><div><dt>Held stream connections</dt><dd>{push?clients:0}</dd></div><div><dt>New polls / s</dt><dd>{push?0:(clients/interval).toFixed(0)}</dd></div></dl>
      <p>Polling có độ trễ phát hiện trung bình khoảng nửa interval nếu update đến đều ngẫu nhiên trong chu kỳ. Push cần giữ connection và backpressure; cả SSE và WebSocket đều có state của kết nối. Chi phí fan-out tới nhiều người vẫn tồn tại với mọi transport.</p>
    </>}
    {kind==='saturation'&&<>
      <h3 id={uid}>Vì sao latency tăng mạnh gần saturation?</h3><p>Mô hình M/M/1 có một server, arrival Poisson và service time exponential; service rate cố định 10 job/s, queue vô hạn. Đây là mô hình toán học để học, không phải dự báo latency production.</p>
      <div className="worksheet-inputs">{slider('Arrival / jobs/s',arrival,0,15,.5,setArrival)}</div>
      <dl className="worksheet-results" aria-live="polite"><div><dt>Utilization</dt><dd>{(queue.utilization*100).toFixed(0)}%</dd></div><div><dt>Mean residence / ms</dt><dd>{queue.stable?(queue.meanSeconds!*1000).toFixed(0):'—'}</dd></div><div><dt>Mean jobs in system</dt><dd>{queue.stable?queue.meanJobs!.toFixed(1):'—'}</dd></div><div><dt>Service time / ms</dt><dd>100</dd></div></dl>
      <p role="status">{queue.stable?'Mô hình có steady state; latency gồm service và queue wait.':'Arrival đạt hoặc vượt service rate: không có steady-state queue hữu hạn trong mô hình này.'}</p>
      <p>Hệ thật có nhiều worker, burst, tail và queue cap nên cần đo riêng. Admission control giới hạn wait và bảo vệ dependency; thêm queue không biến overload dài hạn thành capacity.</p>
    </>}
  </section>;
}
