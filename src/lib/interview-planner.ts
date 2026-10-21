export function planTimeline(minutes:readonly number[],duration:number){
 if(!Number.isInteger(duration)||duration<1||!minutes.length||minutes.some(m=>!Number.isInteger(m)||m<1))throw new RangeError('Positive whole minute budgets required');
 let cursor=0;
 const phases=minutes.map(m=>{const start=cursor;cursor+=m*60;return {start,end:cursor};});
 return {phases,allocated:cursor,sessionSeconds:duration*60,buffer:duration*60-cursor};
}
export function phaseAt(elapsed:number,timeline:ReturnType<typeof planTimeline>){
 return timeline.phases.findIndex(p=>elapsed>=p.start&&elapsed<p.end);
}
export function formatClock(seconds:number){
 const value=Math.max(0,Math.floor(seconds));return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
}
