import fs from 'node:fs';import path from 'node:path';import process from 'node:process';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {mailDrillCodeHash,signDrillRecord,verifyDrillRecord}=require('../lib/account-mail-drill-security.js');
const root=path.resolve(process.argv[2]||'.');
const script=fs.readFileSync(path.join(root,'tools/account-mail-production-drill-r61.mjs'),'utf8');let pass=0,fail=0;
function t(name,ok){console.log(`${ok?'PASS':'FAIL'} ${name}`);ok?pass++:fail++}
const secret='x'.repeat(48),drill='11111111-1111-4111-8111-111111111111';
t('mail drill security library exists',fs.existsSync(path.join(root,'lib/account-mail-drill-security.js')));
t('prepare sends three real mail categories',/email_verification/.test(script)&&/password_reset/.test(script)&&/security_alert/.test(script)&&/sendAccountMail/.test(script));
t('pending stores challenge hashes rather than plaintext codes',/code_hash:mailDrillCodeHash/.test(script)&&!/challenges:rows\.map\([^)]*challenge/.test(script));
t('verify requires all inbox codes',/exakt \$\{categories\.length\} Inbox-Codes/.test(script));
t('evidence only becomes LIVE_MAIL_PASS after verification',/status:'LIVE_MAIL_PASS'/.test(script)&&/inbox_confirmation:true/.test(script)&&/webhook_hmac:true/.test(script));
const record=signDrillRecord({schema:1,status:'LIVE_MAIL_PASS',drill_id:drill,verified_at:new Date().toISOString(),categories:['a','b','c'],inbox_confirmation:true,webhook_hmac:true},secret);
t('mail evidence HMAC verifies',verifyDrillRecord(record,secret));
t('mail evidence HMAC rejects tampering',!verifyDrillRecord({...record,status:'BROKEN'},secret));
t('confirmation hash binds category and code',mailDrillCodeHash(secret,drill,'a','CODE')!==mailDrillCodeHash(secret,drill,'b','CODE'));
console.log(`\nAccount Mail Production Security R61: ${pass}/${pass+fail} PASS`);if(fail)process.exit(1);
