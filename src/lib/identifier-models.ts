export function snowflakeLayout(workerBits:number,sequenceBits:number){
 if(!Number.isInteger(workerBits)||!Number.isInteger(sequenceBits)||workerBits<1||sequenceBits<1||workerBits+sequenceBits>55)throw new RangeError('Invalid bit layout');
 const timeBits=63-workerBits-sequenceBits;
 return {timeBits,workerBits,sequenceBits,workers:2**workerBits,perMillisecond:2**sequenceBits,years:2**timeBits/(1000*60*60*24*365.25)};
}
export function packId(time:bigint,worker:bigint,sequence:bigint,workerBits:number,sequenceBits:number){
 const layout=snowflakeLayout(workerBits,sequenceBits);
 if(time<0n||time>=1n<<BigInt(layout.timeBits)||worker<0n||worker>=1n<<BigInt(workerBits)||sequence<0n||sequence>=1n<<BigInt(sequenceBits))throw new RangeError('ID field overflow');
 return time<<BigInt(workerBits+sequenceBits)|worker<<BigInt(sequenceBits)|sequence;
}
export function unpackId(id:bigint,workerBits:number,sequenceBits:number){
 snowflakeLayout(workerBits,sequenceBits);if(id<0n||id>=1n<<63n)throw new RangeError('ID overflow');
 return {time:id>>BigInt(workerBits+sequenceBits),worker:id>>BigInt(sequenceBits)&((1n<<BigInt(workerBits))-1n),sequence:id&((1n<<BigInt(sequenceBits))-1n)};
}
export function leafReplay(mode:'random'|'time',steps:number){
 if(!Number.isInteger(steps)||steps<0||steps>31)throw new RangeError('Invalid insertion step');
 const order=mode==='random'?Array.from({length:31},(_,i)=>i*17%31):Array.from({length:31},(_,i)=>Math.min(30,Math.floor(i/4)*4+Math.min(3,30-Math.floor(i/4)*4)-i%4));
 const pages:{id:number;keys:number[]}[]=[{id:0,keys:[]}],touches:number[]=[];let nextId=1,splits=0;
 for(const key of order.slice(0,steps)){
  let index=pages.findIndex(p=>!p.keys.length||p.keys.at(-1)!>=key);if(index<0)index=pages.length-1;
  const page=pages[index];touches.push(page.id);page.keys.push(key);page.keys.sort((a,b)=>a-b);
  if(page.keys.length>4){const right=page.keys.splice(2);pages.splice(index+1,0,{id:nextId++,keys:right});splits++;}
 }
 return {order:order.slice(0,steps),pages,touches,splits,recentLeaves:new Set(touches.slice(-8)).size};
}
