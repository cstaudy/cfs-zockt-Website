(()=>{"use strict";
const form=document.querySelector("[data-support-report]");
if(!form)return;
const submit=form.querySelector("[data-support-submit]");
const status=form.querySelector("[data-support-status]");
const makeId=()=>globalThis.crypto?.randomUUID?.().replace(/-/g,"")||`${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
let submissionId=makeId();
const setStatus=(text,bad=false)=>{status.textContent=text;status.classList.toggle("bad",Boolean(bad));status.classList.toggle("ok",!bad&&text!=="Noch nichts gesendet.")};
const containsSecret=value=>{
  const text=String(value||"");
  return [
    /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i,
    /\bauthorization\s*:\s*bearer\s+[A-Za-z0-9._~+\/=-]{16,}/i,
    /\b(?:access[_ -]?token|refresh[_ -]?token|api[_ -]?key|client[_ -]?secret|password|passwort|secret)\s*[:=]\s*["']?[A-Za-z0-9._~+\/=-]{12,}/i,
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
    /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}\b/i,
    /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
    /https:\/\/(?:discord(?:app)?\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+/i
  ].some(pattern=>pattern.test(text));
};
form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  const data=new FormData(form);
  const subject=String(data.get("subject")||"");
  const message=String(data.get("message")||"");
  if(containsSecret(`${subject}\n${message}`)){
    setStatus("Bitte entferne Passwörter oder Tokens sowie private Schlüssel und andere Secrets, bevor du sendest.",true);
    return;
  }
  submit.disabled=true;setStatus("Meldung wird sicher übermittelt …");
  try{
    const response=await fetch("/api/public/support/report",{
      method:"POST",
      credentials:"same-origin",
      headers:{"Content-Type":"application/json","Accept":"application/json"},
      body:JSON.stringify({
        submission_id:submissionId,
        category:String(data.get("category")||"technical"),
        priority:String(data.get("priority")||"normal"),
        contact_email:String(data.get("contact_email")||""),
        subject:String(data.get("subject")||""),
        message,
        website:String(data.get("website")||""),
        source_path:`${location.pathname}${location.hash||""}`
      })
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||"Die Meldung konnte nicht gesendet werden.");
    const reference=String(payload.reference||"").trim();
    const referenceText=reference?` Referenz: ${reference.slice(0,8).toUpperCase()}.`:"";
    setStatus(`${payload.message||"Danke. Deine Meldung wurde privat gespeichert."}${referenceText}`);
    form.reset();submissionId=makeId();
  }catch(error){
    setStatus(error?.message||"Die Meldung konnte nicht gesendet werden.",true);
  }finally{submit.disabled=false}
});
})();
