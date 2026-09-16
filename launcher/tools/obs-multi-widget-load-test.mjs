import http from "node:http";

const SOURCES=12;
const DURATION_MS=4200;
const INTERVAL_MS=250; // Accelerated equivalent of many Browser Sources.
let requests=0;
let concurrent=0;
let peakConcurrent=0;

const server=http.createServer(async(_req,res)=>{
  concurrent++;
  peakConcurrent=Math.max(peakConcurrent,concurrent);
  requests++;
  await new Promise(r=>setTimeout(r,8));
  res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});
  res.end(JSON.stringify({ok:true,widget:{config:{canvas:{width:600,height:120},elements:[]}},tiktok:{follower_count:100}}));
  concurrent--;
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const port=server.address().port;
const url=`http://127.0.0.1:${port}/api/widgets/studio/test`;

const start=Date.now();
const workers=Array.from({length:SOURCES},(_,index)=>(async()=>{
  let polls=0;
  while(Date.now()-start<DURATION_MS){
    const response=await fetch(`${url}?source=${index}`,{cache:"no-store"});
    if(!response.ok)throw new Error(`Source ${index} HTTP ${response.status}`);
    await response.json();
    polls++;
    await new Promise(r=>setTimeout(r,INTERVAL_MS));
  }
  return polls;
})());

const counts=await Promise.all(workers);
await new Promise(resolve=>server.close(resolve));
const min=Math.min(...counts),total=counts.reduce((a,b)=>a+b,0);
if(min<10)throw new Error(`OBS source polling too low: min ${min}`);
if(total<120)throw new Error(`OBS total polling too low: ${total}`);

console.log(JSON.stringify({ok:true,sources:SOURCES,total_requests:requests,polls_per_source:counts,peak_concurrent:peakConcurrent}));
