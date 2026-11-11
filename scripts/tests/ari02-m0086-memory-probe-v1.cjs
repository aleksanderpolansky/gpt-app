'use strict';
// Runs INSIDE the measured Node process; read-only sampling and exit receipt.
const fs=require('node:fs');
const out=process.env.ARCTOR_M0086_PROBE_PATH;
if(out){
 const start=process.hrtime.bigint();let maxRss=0,maxHeap=0,samples=0;
 function sample(){const m=process.memoryUsage();maxRss=Math.max(maxRss,m.rss);maxHeap=Math.max(maxHeap,m.heapUsed);samples++;}
 sample();const timer=setInterval(sample,20);timer.unref();
 process.once('exit',()=>{
  sample();let ru=null;try{ru=process.resourceUsage()}catch{}
  const payload={contract:'ARCTOR_ARI_M0086_CHILD_MEMORY_V1',platform:process.platform,node:process.version,
   sampledPeakRssBytes:maxRss,sampledPeakHeapUsedBytes:maxHeap,samples,
   elapsedInsideMs:Number(process.hrtime.bigint()-start)/1e6,
   osMaxRssRaw:ru?.maxRSS>0?ru.maxRSS:null,
   osMaxRssUnit:process.platform==='linux'?'KiB':process.platform==='darwin'?'bytes':'unverified_platform_unit',
   measurementScope:'top_level_node_process_only_descendants_not_included',
   processHeapLimitConfiguredMiB:384};
  try{fs.writeFileSync(out,JSON.stringify(payload,null,2)+'\n',{flag:'wx'})}catch{}
 });
}
