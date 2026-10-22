export function assessmentChallenge({siteKey,document:doc=document,window:win=window}={}){
 let widget=null,token='',loading;
 const load=()=>loading??=new Promise((resolve,reject)=>{
  if(win.turnstile)return resolve(win.turnstile);
  const script=doc.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;
  script.onload=()=>win.turnstile?resolve(win.turnstile):reject(Error('Verification unavailable'));
  script.onerror=()=>reject(Error('Verification unavailable'));doc.head.appendChild(script);
 });
 return {
  async show(){
   if(!siteKey)throw Error('Verification unavailable');const api=await load();
   if(widget!==null)return;
   widget=api.render('#assessment-verification',{sitekey:siteKey,action:'assessment',callback:value=>{token=value;},'expired-callback':()=>{token='';},'error-callback':()=>{token='';}});
  },
  token(){return token;},
  reset(){token='';if(widget!==null&&win.turnstile)win.turnstile.reset(widget);}
 };
}
