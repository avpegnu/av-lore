import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { availabilityBudget, contextBudget, decodeRoofline } from '../lib/handbook-models';
export type WorksheetKind='context-budget'|'roofline'|'availability'|'latency';
export default function ConceptWorksheet({kind}:{kind:WorksheetKind}){
  const ref=useIslandReady(),uid='worksheet-'+useId().replace(/:/g,'');
  const [batch,setBatch]=useState(16),[context,setContext]=useState(4096);
  const [history,setHistory]=useState(12000),[evidence,setEvidence]=useState(8000),[output,setOutput]=useState(4096);
  const [target,setTarget]=useState(99.9);
  const [parallel,setParallel]=useState(false);
  const roof=decodeRoofline({parameters:8e9,weightBytes:2,batch,context,kvBytesPerToken:131072,bandwidthGBs:1000,computeTFLOPs:200,memoryGB:48});
  const budget=contextBudget({window:32768,system:3072,history,evidence,tools:1024,output});
  const seconds=availabilityBudget(target,30);
  const chartX=(intensity:number)=>55+(Math.log2(intensity)+2)/12*640;
  const chartY=(teraflops:number)=>280-(Math.log2(teraflops)+2)/10*235;
  const slider=(label:string,value:number,min:number,max:number,step:number,change:(v:number)=>void)=><label>{label}<output>{value}</output><input type="range" min={min} max={max} step={step} value={value} onChange={e=>change(+e.target.value)}/></label>;
  return <section className="handbook-experiment concept-worksheet" ref={ref} aria-labelledby={uid}>
    <span className="eyebrow">MODEL / EXPLORE THE TRADE-OFF</span>
    {kind==='roofline'&&<>
      <h3 id={uid}>Roofline: bandwidth, compute và context</h3>
      <p>Giả định 8B parameters, weights 2 byte, KV 128 KiB/token; bandwidth 1.000 GB/s, compute 200 TFLOP/s và 48 GB dành cho weights + KV. Đây là phần cứng giả định, không phải benchmark.</p>
      <div className="worksheet-inputs">{slider('Batch size',batch,1,256,1,setBatch)}{slider('Context tokens',context,1024,32768,1024,setContext)}</div>
      <div className="roofline-chart" role="region" tabIndex={0} aria-label="Biểu đồ roofline, trục logarithmic">
        <svg viewBox="0 0 760 340" role="img" aria-label="Giới hạn compute và bandwidth theo arithmetic intensity">
          {[.25,1,4,16,64,256].map(value=><g key={value}><line x1="55" x2="695" y1={chartY(value)} y2={chartY(value)}/><text x="45" y={chartY(value)+4} textAnchor="end">{value}</text></g>)}
          {[.25,1,4,16,64,256,1024].map(value=><text key={value} x={chartX(value)} y="300" textAnchor="middle">{value}</text>)}
          <polyline className="roofline-bound" points={`${chartX(.25)},${chartY(.25)} ${chartX(200)},${chartY(200)} ${chartX(1024)},${chartY(200)}`}/>
          <circle className="roofline-current" cx={chartX(roof.intensity)} cy={chartY(Math.min(200,roof.intensity))} r="7"/>
          <text x="55" y="22">Attainable TFLOP/s (upper bound)</text><text x="375" y="328" textAnchor="middle">Arithmetic intensity / FLOPs per byte</text>
        </svg>
      </div>
      <dl className="worksheet-results" aria-live="polite"><div><dt>Memory lower bound / ms</dt><dd>{(roof.memorySeconds*1000).toFixed(2)}</dd></div><div><dt>Compute lower bound / ms</dt><dd>{(roof.computeSeconds*1000).toFixed(2)}</dd></div><div><dt>Tokens/s/user ceiling</dt><dd>{roof.perUserTokens.toFixed(1)}</dd></div><div><dt>Aggregate tokens/s ceiling</dt><dd>{roof.totalTokens.toFixed(0)}</dd></div><div><dt>FLOPs / byte</dt><dd>{roof.intensity.toFixed(2)}</dd></div><div><dt>Weights + KV / GB</dt><dd>{roof.totalGB.toFixed(2)}</dd></div></dl>
      <p className="worksheet-verdict" role="status">{roof.fits?'Payload còn trong ngân sách 48 GB; workspace và overhead vẫn cần dự phòng.':'Payload vượt 48 GB: cấu hình không vừa ngân sách; các ceiling hiển thị không phải throughput chạy được.'}</p>
      <p>Mô hình lấy max(memory time, compute time), bỏ qua attention FLOPs, launch overhead, communication và hiệu suất kernel. Kết quả là lower bound thời gian, tương ứng upper bound throughput; thực tế có thể chậm hơn đáng kể.</p>
      <code>step ≥ max((weightBytes + batch × context × KV/token) / bandwidth, 2 × params × batch / FLOPs)</code>
    </>}
    {kind==='context-budget'&&<>
      <h3 id={uid}>Chia ngân sách context 32K</h3>
      <p>Cửa sổ 32.768 token; system/template dùng 3.072 và dự phòng tool dùng 1.024. Output reserve phải tính cùng history và evidence.</p>
      <div className="worksheet-inputs">{slider('History tokens',history,0,24000,500,setHistory)}{slider('Evidence tokens',evidence,0,24000,500,setEvidence)}{slider('Output reserve',output,1024,8192,1024,setOutput)}</div>
      <meter min={0} max={32768} value={Math.min(budget.required,32768)} aria-label="Mức sử dụng context"/>
      <dl className="worksheet-results" aria-live="polite"><div><dt>Required tokens</dt><dd>{budget.required}</dd></div><div><dt>Remaining tokens</dt><dd>{budget.remaining}</dd></div></dl>
      <p className="worksheet-verdict" role="status">{budget.fits?'Còn đủ ngân sách theo giả định; cần đếm lại bằng tokenizer thật trước mỗi model call.':'Vượt context budget: giảm history/evidence hoặc đổi chiến lược trước khi gọi model.'}</p>
      <p>Giảm output reserve có thể làm câu trả lời bị cắt. Summary có thể bỏ thông tin; retrieval quá ít có thể thiếu evidence. Chọn bằng chất lượng tác vụ, không chỉ làm thanh đo vừa khung.</p>
    </>}
    {kind==='availability'&&<>
      <h3 id={uid}>Error budget theo thời gian</h3><p>Tháng giả định có 30 ngày. Chọn mục tiêu để xem tổng thời gian không khả dụng cho phép; đây không phải số sự cố được phép xảy ra.</p>
      <div className="worksheet-choices">{[99,99.9,99.95,99.99,99.999].map(n=><button type="button" key={n} className="secondary" aria-pressed={target===n} onClick={()=>setTarget(n)}>{n}%</button>)}</div>
      <dl className="worksheet-results" aria-live="polite"><div><dt>Seconds / 30 days</dt><dd>{seconds.toFixed(2)}</dd></div><div><dt>Minutes / 30 days</dt><dd>{(seconds/60).toFixed(3)}</dd></div></dl>
      <p>SLO theo tỷ lệ request tốt dùng error budget bằng số request, không tự chuyển thành downtime nếu traffic thay đổi theo giờ. Maintenance có tính hay không phải được định nghĩa trước khi đo.</p>
    </>}
    {kind==='latency'&&<>
      <h3 id={uid}>Latency nằm trên critical path</h3><p>Ví dụ giả định: auth 15 ms, profile 60 ms, posts 100 ms, render 10 ms. Profile và posts chỉ được chạy song song khi độc lập sau auth.</p>
      <div className="worksheet-choices"><button type="button" className="secondary" aria-pressed={!parallel} onClick={()=>setParallel(false)}>Chạy tuần tự</button><button type="button" className="secondary" aria-pressed={parallel} onClick={()=>setParallel(true)}>Hai nhánh song song</button></div>
      <dl className="worksheet-results" aria-live="polite"><div><dt>Critical path / ms</dt><dd>{15+(parallel?Math.max(60,100):60+100)+10}</dd></div><div><dt>Downstream work / ms</dt><dd>160</dd></div></dl>
      <p>Song song giảm wall time, không giảm tổng downstream work. Đây là thời gian cố định minh họa; p99 tổng không được tính bằng cộng hoặc lấy max các p99 riêng mà bỏ phân phối và tương quan.</p>
    </>}
  </section>;
}
