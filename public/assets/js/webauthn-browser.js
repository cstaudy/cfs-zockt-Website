(function(){
  "use strict";

  function base64urlToBytes(value){
    const text=String(value||"").replace(/-/g,"+").replace(/_/g,"/");
    const padded=text+"=".repeat((4-text.length%4)%4);
    const binary=atob(padded);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return bytes;
  }

  function bytesToBase64url(value){
    if(value==null)return null;
    const bytes=value instanceof Uint8Array?value:new Uint8Array(value);
    let binary="";
    for(const byte of bytes)binary+=String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
  }

  function creationOptions(options){
    const out=structuredClone(options||{});
    out.challenge=base64urlToBytes(out.challenge);
    if(out.user?.id)out.user.id=base64urlToBytes(out.user.id);
    if(Array.isArray(out.excludeCredentials)){
      out.excludeCredentials=out.excludeCredentials.map(item=>({...item,id:base64urlToBytes(item.id)}));
    }
    return out;
  }

  function requestOptions(options){
    const out=structuredClone(options||{});
    out.challenge=base64urlToBytes(out.challenge);
    if(Array.isArray(out.allowCredentials)){
      out.allowCredentials=out.allowCredentials.map(item=>({...item,id:base64urlToBytes(item.id)}));
    }
    return out;
  }

  function commonCredential(credential){
    return {
      id:credential.id,
      rawId:bytesToBase64url(credential.rawId),
      type:credential.type,
      authenticatorAttachment:credential.authenticatorAttachment||undefined,
      clientExtensionResults:credential.getClientExtensionResults?.()||{}
    };
  }

  function registrationResponse(credential){
    return {
      ...commonCredential(credential),
      response:{
        clientDataJSON:bytesToBase64url(credential.response.clientDataJSON),
        attestationObject:bytesToBase64url(credential.response.attestationObject),
        transports:credential.response.getTransports?.()||[]
      }
    };
  }

  function authenticationResponse(credential){
    return {
      ...commonCredential(credential),
      response:{
        clientDataJSON:bytesToBase64url(credential.response.clientDataJSON),
        authenticatorData:bytesToBase64url(credential.response.authenticatorData),
        signature:bytesToBase64url(credential.response.signature),
        userHandle:credential.response.userHandle?bytesToBase64url(credential.response.userHandle):undefined
      }
    };
  }

  async function create(options){
    if(!window.PublicKeyCredential||!navigator.credentials?.create)throw new Error("Passkeys werden von diesem Browser nicht unterstützt.");
    const credential=await navigator.credentials.create({publicKey:creationOptions(options)});
    if(!credential)throw new Error("Passkey-Einrichtung wurde abgebrochen.");
    return registrationResponse(credential);
  }

  async function get(options){
    if(!window.PublicKeyCredential||!navigator.credentials?.get)throw new Error("Passkeys werden von diesem Browser nicht unterstützt.");
    const credential=await navigator.credentials.get({publicKey:requestOptions(options)});
    if(!credential)throw new Error("Passkey-Anmeldung wurde abgebrochen.");
    return authenticationResponse(credential);
  }

  window.CFSWebAuthn={supported:()=>Boolean(window.PublicKeyCredential&&navigator.credentials),create,get};
})();
