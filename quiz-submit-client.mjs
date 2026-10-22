const storageKey='pk-assessment-submission-v1';
const stable=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(stable).join(',')+']':'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
export function createSubmissionSender({endpoint,fetchImpl=fetch,storage,uuid=()=>crypto.randomUUID()}={}) {
  let pending=null,inFlight=null;
  try{const saved=JSON.parse(storage?.getItem(storageKey)??'null');if(saved&&/^[0-9a-f-]{36}$/i.test(saved.id)&&typeof saved.digest==='string')pending=saved;}catch{}
  return async function submit(payload){
    if(!endpoint||new URL(endpoint).protocol!=='https:')throw new Error('Assessment submission is unavailable. Please try again later.');
    const {verificationToken,...answers}=payload;
    const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stable(answers)));
    const digest=Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
    if(inFlight){if(inFlight.digest===digest)return inFlight.promise;throw new Error('Your previous submission is still being checked.');}
    if(pending?.digest!==digest){pending={id:uuid(),digest};try{storage?.setItem(storageKey,JSON.stringify(pending));}catch{}}
    if(pending.accepted)return {accepted:true,submissionId:pending.id,result:pending.result};
    const id=pending.id;
    const promise=(async()=>{
      const response=await fetchImpl(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000),redirect:'error'});
      let data;try{data=await response.json();}catch{throw new Error('We could not confirm your submission. Please retry.');}
      if(response.status!==202||data.state!=='accepted'||data.submissionId!==id)throw new Error('We could not confirm your submission. Please retry.');
      const result=data.result;
      if(typeof result?.firstName!=='string'||!Number.isInteger(result.readinessScore)||result.readinessScore<0||result.readinessScore>100)throw new Error('We could not confirm your results. Please retry.');
      pending.result={firstName:result.firstName,readinessScore:result.readinessScore};
      pending.accepted=true;return {accepted:true,submissionId:id,result:pending.result};
    })();
    inFlight={digest,promise};try{return await promise;}finally{inFlight=null;}
  };
}
