"use strict";
// Owner identity is resolved on the server. Display names are NOT authenticators.
function ownerDesktopAccess(account,{ownerEmail="",ownerCreatorId="",verifiedOnly=true}={}){
  const email=String(account?.email||"").trim().toLowerCase();
  const expected=String(ownerEmail||"").trim().toLowerCase();
  const expectedId=String(ownerCreatorId||"").trim();
  if(!expected)return {allowed:false,code:"owner_not_configured"};
  if(!account?.id || !email || email!==expected)return {allowed:false,code:"not_owner"};
  if(expectedId && String(account.id)!==expectedId)return {allowed:false,code:"wrong_account_id"};
  if(verifiedOnly && !account.email_verified_at)return {allowed:false,code:"email_not_verified"};
  return {allowed:true,code:"ok"};
}
module.exports={ownerDesktopAccess};
