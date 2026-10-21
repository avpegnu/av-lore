type Node = { id:string; x:number; y:number };
type Point = { x:number; y:number };
/** Orthogonal visibility grid. Routes stay outside component rectangles, including long reverse edges. */
export function architectureRoute(nodes:Node[], from:string, to:string):Point[] {
  const source=nodes.find(n=>n.id===from), target=nodes.find(n=>n.id===to);
  if(!source||!target||from===to)throw new Error('Invalid architecture edge');
  const ports=(node:Node)=>[
    {x:node.x-102,y:node.y,inner:{x:node.x-88,y:node.y},direction:1},
    {x:node.x+102,y:node.y,inner:{x:node.x+88,y:node.y},direction:1},
    {x:node.x,y:node.y-46,inner:{x:node.x,y:node.y-32},direction:2},
    {x:node.x,y:node.y+46,inner:{x:node.x,y:node.y+32},direction:2},
  ];
  const starts=ports(source),ends=ports(target);
  const xs=[...new Set(nodes.flatMap(n=>[n.x-102,n.x,n.x+102]))].sort((a,b)=>a-b);
  const ys=[...new Set(nodes.flatMap(n=>[n.y-46,n.y,n.y+46]))].sort((a,b)=>a-b);
  const width=xs.length;
  const points=ys.flatMap(y=>xs.map(x=>({x,y})));
  const index=(p:Point)=>ys.indexOf(p.y)*width+xs.indexOf(p.x);
  function clear(a:Point,b:Point){
    return !nodes.some(n=>{
      const left=n.x-98,right=n.x+98,top=n.y-42,bottom=n.y+42;
      return a.x===b.x
        ? a.x>left&&a.x<right&&Math.max(a.y,b.y)>top&&Math.min(a.y,b.y)<bottom
        : a.y>top&&a.y<bottom&&Math.max(a.x,b.x)>left&&Math.min(a.x,b.x)<right;
    });
  }
  const distances=new Map<number,number>(),previous=new Map<number,number>();
  const origins=new Map<number,number>();
  const queue:{state:number;cost:number}[]=[];
  function push(item:{state:number;cost:number}){
    queue.push(item);let i=queue.length-1;
    while(i>0){const parent=(i-1)>>1;if(queue[parent].cost<=item.cost)break;queue[i]=queue[parent];i=parent;}queue[i]=item;
  }
  function pop(){
    const first=queue[0],last=queue.pop()!;
    if(queue.length){let i=0;while(i*2+1<queue.length){let child=i*2+1;if(child+1<queue.length&&queue[child+1].cost<queue[child].cost)child++;if(queue[child].cost>=last.cost)break;queue[i]=queue[child];i=child;}queue[i]=last;}
    return first;
  }
  starts.forEach((p,i)=>{const state=index(p)*3+p.direction;distances.set(state,14);origins.set(state,i);push({state,cost:14});});
  const destinations=new Map(ends.map((p,i)=>[index(p),i]));
  let found:number|undefined;
  while(queue.length){
    const {state,cost}=pop();if(cost!==distances.get(state))continue;
    const pointIndex=Math.floor(state/3),direction=state%3;
    if(destinations.has(pointIndex)){found=state;break;}
    const x=pointIndex%width,y=Math.floor(pointIndex/width);
    const neighbors=[...(x>0?[pointIndex-1]:[]),...(x<width-1?[pointIndex+1]:[]),...(y>0?[pointIndex-width]:[]),...(y<ys.length-1?[pointIndex+width]:[])];
    for(const next of neighbors){
      const a=points[pointIndex],b=points[next];if(!clear(a,b))continue;
      const heading=a.y===b.y?1:2,nextState=next*3+heading;
      const nextCost=cost+Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+(direction===heading?0:24);
      if(nextCost>=(distances.get(nextState)??Infinity))continue;
      distances.set(nextState,nextCost);previous.set(nextState,state);origins.set(nextState,origins.get(state)!);push({state:nextState,cost:nextCost});
    }
  }
  if(found===undefined)throw new Error(`No unobstructed route: ${from} -> ${to}`);
  const end=ends[destinations.get(Math.floor(found/3))!];
  const result:Point[]=[];let cursor:number|undefined=found;
  while(cursor!==undefined){result.push(points[Math.floor(cursor/3)]);cursor=previous.get(cursor);}
  result.reverse();result.unshift(starts[origins.get(found)!].inner);
  // Leave five pixels between the arrow tip and the target border.
  result.push({x:end.inner.x+(end.x-end.inner.x)*5/14,y:end.inner.y+(end.y-end.inner.y)*5/14});
  return result.filter((p,i,all)=>i===0||i===all.length-1||!((all[i-1].x===p.x&&p.x===all[i+1].x)||(all[i-1].y===p.y&&p.y===all[i+1].y)));
}
export function architecturePath(points:Point[]){return points.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');}
