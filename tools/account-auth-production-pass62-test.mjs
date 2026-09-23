import fs from 'node:fs';import path from 'node:path';import process from 'node:process';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {signAuthDrillRecord,verifyAuthDrillRecord}=require('../lib/account-auth-drill-security.js');
const root=path.resolve(process.argv[2]||'.'),src=fs.readFileSync(path.join(root,'tools/account-auth-production-drill-r62.mjs'),'utf8');let p=0,f=0;const t=(n,o)=>{console.log(`${o?'PASS':'FAIL'} ${n}`);o?p++:f++};
t('R62 queries public auth readiness',src.includes('/api/public/auth-readiness'));t('R62 requires canonical RP and UV required',src.includes("user_verification!=='required'")&&src.includes('rp_id'));
t('R62 verifies real production security events',src.includes('creator_security_events')&&src.includes('login_success_passkey')&&src.includes('account_elevation_passkey_granted')&&src.includes('account_elevation_totp_granted')&&src.includes('account_elevation_recovery_granted'));
t('R62 proves temporary passkey cleanup',src.includes('passkey_added')&&src.includes('passkey_removed')&&src.includes('baseline_passkeys'));
t('R62 never turns manual yes/no into PASS',!src.includes('--confirm-pass')&&!src.includes('Read-Host'));
const secret='s'.repeat(48),r=signAuthDrillRecord({schema:1,status:'LIVE_AUTH_PASS',drill_id:'x',verified_at:new Date().toISOString()},secret);t('auth evidence HMAC verifies',verifyAuthDrillRecord(r,secret));t('auth evidence rejects tampering',!verifyAuthDrillRecord({...r,status:'BROKEN'},secret));
console.log(`\nAccount Auth Production Security R62: ${p}/${p+f} PASS`);if(f)process.exit(1);
