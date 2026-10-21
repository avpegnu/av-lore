export type ReadPolicy = 'replica' | 'primary' | 'watermark';
export function sessionRead(replicaVersion:number, policy:ReadPolicy) {
  if(!Number.isInteger(replicaVersion)||replicaVersion<0||replicaVersion>3) throw new RangeError('Replica version must be 0..3');
  const observed=policy==='primary'?3:policy==='watermark'&&replicaVersion<3?null:replicaVersion;
  return {observed, waiting:observed===null, readYourWrites:observed!==null&&observed>=3, monotonic:observed!==null&&observed>=2};
}
export function quorumBounds(n:number,r:number,w:number,failed=0){
  if(![n,r,w,failed].every(Number.isInteger)||n<1||r<1||w<1||r>n||w>n||failed<0||failed>n) throw new RangeError('Invalid fixed-membership quorum');
  const write=Array.from({length:w},(_,i)=>i),read=Array.from({length:r},(_,i)=>n-r+i);
  return {minimumOverlap:Math.max(0,r+w-n),read,write,intersection:read.filter(i=>write.includes(i)),readAvailable:n-failed>=r,writeAvailable:n-failed>=w};
}
export type RaftNode={id:string;term:number;role:'leader'|'follower';lastEntry:string;commitIndex:number;partition:0|1};
export function raftFrame(index:number):RaftNode[]{
  if(!Number.isInteger(index)||index<0||index>4) throw new RangeError('Raft frame must be 0..4');
  return ['A','B','C','D','E'].map((id,i)=>{
    const minority=i<2, split=index>=1&&index<=3, newTerm=index>=2&&!minority||index===4;
    return {id,term:newTerm?2:1,role:(index<2&&id==='A'||index>=2&&id==='C'||split&&id==='A')?'leader':'follower',
      lastEntry:index===0?'1:t1':minority&&split?'2:x:t1':index>=3?'2:y:t2':'1:t1',
      commitIndex:index>=3&&(!minority||index===4)?2:1,partition:split&&!minority?1:0};
  });
}
