/* CFS Zockt 3.20.71 · Elevated read-only finance observations.
   Never treat displayed product prices or recurring plan estimates as collected money. */
(()=>{"use strict";
const by=id=>document.getElementById(id),set=(id,value)=>{const el=by(id);if(el)el.textContent=String(value)};
const currency=(minor,unit)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:unit.toUpperCase()}).format(minor/100);
let last=null,month="";
function reset(){last=null;by("financeCsv").disabled=true;set("financeInvoiceCount","–");set("financeActiveCount","–");set("financePreviewCount","–");by("financeCurrencyRows").replaceChildren()}
function render(data){
  last=data;by("financeCsv").disabled=false;
  const r=data.report||{};
  set("financeInvoiceCount",r.invoice_count??0);
  set("financeActiveCount",(data.subscription_statuses||[]).filter(x=>["active","trialing"].includes(x.status)).reduce((n,x)=>n+Number(x.count||0),0));
  set("financePreviewCount",data.shop?.paid_preview??0);
  set("financeReportStatus",`${data.month} · Stripe ${r.mode==="live"?"LIVE":"TESTMODUS"} · ${data.stripe_configured?"konfiguriert":"nicht konfiguriert"} · Datenstand ${new Date(data.generated_at).toLocaleString("de-DE")}`);
  const holder=by("financeCurrencyRows");holder.replaceChildren();
  if(!r.currencies?.length){const p=document.createElement("p");p.className="finance-state";p.textContent="Keine auswertbaren, bestätigten Stripe-Zahlungsbeträge für diesen Monat. Das bedeutet nicht, dass garantiert kein Umsatz angefallen ist.";holder.append(p)}
  for(const item of r.currencies||[]){
    const article=document.createElement("article"),title=document.createElement("h3"),grid=document.createElement("div");
    article.className="finance-currency";title.textContent=`${item.currency.toUpperCase()} · ${item.invoices} bezahlte Rechnungen`;grid.className="finance-numbers";
    for(const [label,amount] of [["Brutto bezahlt",item.gross_minor],["Bekannte, zugeordnete Erstattungen",item.refund_minor],["Saldo vor Gebühren",item.net_before_fees_minor]]){
      const block=document.createElement("div"),caption=document.createElement("span"),strong=document.createElement("strong");
      caption.textContent=label;strong.textContent=currency(amount,item.currency);block.append(caption,strong);grid.append(block);
    }
    article.append(title,grid);holder.append(article);
  }
  const warnings=[];
  if(r.mode!=="live")warnings.push("TESTMODUS: Beträge sind keine echten Einnahmen.");
  if(!data.stripe_configured||!data.stripe_webhook_ready)warnings.push("Stripe bzw. Webhooks nicht vollständig eingerichtet.");
  if(r.missing_legacy_invoice_amount)warnings.push(`${r.missing_legacy_invoice_amount} ältere Rechnungsereignisse ohne gespeicherten Betrag.`);
  if(r.unlinked_refunds||r.missing_refund_mapping)warnings.push(`${Number(r.unlinked_refunds||0)+Number(r.missing_refund_mapping||0)} Erstattungen ohne eindeutige Zuordnung.`);
  if(r.truncated)warnings.push("Zu viele Stripe-Ereignisse: Die Ansicht ist abgeschnitten.");
  warnings.push("Nur erfasste Webhooks, keine vollständige Stripe-Historie; Erstattungen aus anderen Monaten können fehlen. Keine Stripe-Gebühren, Steuern oder Auszahlungssalden enthalten.");
  warnings.push("Shop-Pakete: Preisvorschau (paid_preview), echter Kauf-/Downloadanspruch noch nicht aktiviert.");
  set("financeReportWarning",warnings.join(" "));
}
async function load(){
  reset();const value=by("financeMonth").value;
  if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(value)){set("financeReportStatus","Bitte einen gültigen Monat auswählen.");return}
  month=value;const button=by("financeLoad");button.disabled=true;set("financeReportStatus","Stripe-Ereignisse werden sicher geladen …");
  try{render(await CFS.json(`/api/admin/creator-suite/finance-report?month=${encodeURIComponent(value)}`))}
  catch(error){set("financeReportStatus",error?.status===428?"Admin-Schutz benötigt eine frische starke Sicherheitsfreigabe. Bitte im Adminbereich oben entsperren.":`Finanzübersicht nicht verfügbar: ${error.message||"Verbindungsfehler"}`)}
  finally{button.disabled=false}
}
function csv(){if(!last)return;const rows=[["Monat","Stripe-Modus","Währung","Brutto Cent","Erstattungen Cent","Saldo vor Gebühren Cent","Rechnungen","Vollständig"]];for(const r of last.report?.currencies||[]){rows.push([last.month,last.report.mode,r.currency,r.gross_minor,r.refund_minor,r.net_before_fees_minor,r.invoices,"NEIN"])}
  const output='\ufeff'+rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([output],{type:"text/csv;charset=utf-8"})),link=document.createElement("a");link.href=url;link.download=`cfs-finanzereignisse-${month}-${last.report.mode}-UNVOLLSTAENDIG.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.addEventListener("DOMContentLoaded",()=>{if(!by("adminFinancePanel"))return;by("financeMonth").value=new Date().toISOString().slice(0,7);by("financeLoad").addEventListener("click",load);by("financeCsv").addEventListener("click",csv);if(location.hash==="#adminFinancePanel")by("adminFinancePanel").open=true;});
})();
