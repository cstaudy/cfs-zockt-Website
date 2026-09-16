"use strict";

const crypto=require("crypto");
const ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(input){
  const buf=Buffer.isBuffer(input)?input:Buffer.from(input||"");
  let bits=0,value=0,out="";
  for(const byte of buf){value=(value<<8)|byte;bits+=8;while(bits>=5){out+=ALPHABET[(value>>>(bits-5))&31];bits-=5;}}
  if(bits>0)out+=ALPHABET[(value<<(5-bits))&31];
  return out;
}
function base32Decode(text){
  const src=String(text||"").toUpperCase().replace(/[^A-Z2-7]/g,"");
  let bits=0,value=0;const out=[];
  for(const ch of src){const idx=ALPHABET.indexOf(ch);if(idx<0)throw new Error("Ungültiges Base32-Secret.");value=(value<<5)|idx;bits+=5;if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8;}}
  return Buffer.from(out);
}
function createTotpSecret(bytes=20){return base32Encode(crypto.randomBytes(Math.max(20,Math.min(64,Number(bytes)||20))));}
function hotp(secret,counter,digits=6){
  const key=base32Decode(secret);const msg=Buffer.alloc(8);msg.writeBigUInt64BE(BigInt(counter));
  const digest=crypto.createHmac("sha1",key).update(msg).digest();const offset=digest[digest.length-1]&15;
  const binary=((digest[offset]&0x7f)<<24)|((digest[offset+1]&0xff)<<16)|((digest[offset+2]&0xff)<<8)|(digest[offset+3]&0xff);
  return String(binary%(10**digits)).padStart(digits,"0");
}
function totpStep(now=Date.now(),period=30){return Math.floor(Number(now)/1000/period);}
function verifyTotp(secret,code,{now=Date.now(),window=1,lastUsedStep=-1,period=30,digits=6}={}){
  const normalized=String(code||"").replace(/\s+/g,"");if(!new RegExp(`^\\d{${digits}}$`).test(normalized))return{ok:false,step:null};
  const current=totpStep(now,period);
  for(let delta=-Math.max(0,window);delta<=Math.max(0,window);delta++){
    const step=current+delta;if(step<=Number(lastUsedStep??-1))continue;
    if(crypto.timingSafeEqual(Buffer.from(hotp(secret,step,digits)),Buffer.from(normalized)))return{ok:true,step};
  }
  return{ok:false,step:null};
}
function createRecoveryCodes(count=10){
  const total=Math.max(6,Math.min(16,Number(count)||10));
  return Array.from({length:total},()=>{
    const raw=crypto.randomBytes(9).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,12).padEnd(12,"X");
    return `${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}`;
  });
}
function normalizeRecoveryCode(value){return String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"");}
function recoveryCodeHash(secret,creatorId,code){
  return crypto.createHmac("sha256",String(secret||"")).update(`v1|${String(creatorId||"")}|${normalizeRecoveryCode(code)}`).digest("hex");
}
function otpauthUri({secret,email,issuer="cfs_zockt"}){
  const label=`${issuer}:${String(email||"creator")}`;
  const q=new URLSearchParams({secret:String(secret||""),issuer,algorithm:"SHA1",digits:"6",period:"30"});
  return `otpauth://totp/${encodeURIComponent(label)}?${q.toString()}`;
}
module.exports={base32Encode,base32Decode,createTotpSecret,hotp,totpStep,verifyTotp,createRecoveryCodes,normalizeRecoveryCode,recoveryCodeHash,otpauthUri};
