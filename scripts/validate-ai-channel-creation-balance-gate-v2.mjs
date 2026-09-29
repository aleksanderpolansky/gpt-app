import fs from 'node:fs';
import path from 'node:path';

const repo=path.resolve(process.argv[2]||process.cwd());
const files={
 server:path.join(repo,'src/lib/ai-channels/server.ts'),
 route:path.join(repo,'src/app/api/ai-channels/route.ts'),
 client:path.join(repo,'src/app/feed/AiChannels.tsx'),
};
const text=Object.fromEntries(Object.entries(files).map(([k,p])=>[k,fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')]));
let passed=0;
function check(condition,label){
 if(!condition){console.error('FAIL '+label);process.exitCode=1;return;}
 passed++;console.log('PASS '+label);
}
check(text.server.includes("from('ai_credit_wallets').select('balance_eur,reserved_eur,status')"),'wallet table is server-only source');
check(text.server.includes("const availableEur=Math.max(balance-reserved,0);"),'available balance subtracts reserved');
check(text.server.includes("if(data.status!=='active')return {allowed:false,reason:'wallet_inactive'"),'inactive wallet blocked');
check(text.server.includes("if(!data)return {allowed:false,reason:'no_wallet',availableEur:0};"),'missing wallet blocked');
check(text.server.includes("if(availableEur<=0)return {allowed:false,reason:'insufficient_balance'"),'zero balance blocked');
check(text.server.includes("if(error)return {allowed:false,reason:'unavailable',availableEur:null};"),'wallet read failure fails closed');
check(text.server.includes("return {allowed:true,reason:'available',availableEur};"),'positive balance grants creation');
check(text.server.includes("export async function requireChannelCreationBalance"),'server enforcement helper exists');
check(text.server.includes("CHANNEL_CREATE_BALANCE_REQUIRED"),'create balance required error exists');
check(text.server.includes("CHANNEL_CREATE_BALANCE_UNAVAILABLE"),'create balance unavailable error exists');
check(text.route.includes("creationAccess,channels:channels.map"),'route exposes creation access');
check(text.route.includes("if(body.action==='save'){\n  if(!id)await requireChannelCreationBalance(who);"),'route gates only id-less save');
check(text.route.includes("code==='CHANNEL_CREATE_BALANCE_REQUIRED'?402"),'insufficient balance returns 402');
check(text.route.includes("code==='CHANNEL_CREATE_BALANCE_UNAVAILABLE'?503"),'balance unavailable returns 503');
check(text.client.includes("[creationAccess,setCreationAccess]=useState<CreationAccess|null>(null)"),'client stores creation access');
check(text.client.includes("disabled={busy||creationAccess?.allowed!==true}"),'create button disabled by access');
check(text.client.includes("creationAccess?.allowed===false"),'warning only shown when blocked');
check(text.client.includes(">!</button>"),'warning icon rendered');
check(text.client.includes("MODERATOR_ACTOR_ID='d4727330-1cd4-475a-ac0b-aaba89087f4a'"),'moderator actor id exact');
check(text.client.includes("'/messages?to='+encodeURIComponent(MODERATOR_ACTOR_ID)"),'moderator link opens existing direct messages');
check(text.client.includes("Недостаточно токенов для создания ИИ канала."),'requested Russian warning present');
check(text.client.includes("Написать сообщение модератору для получения тестовых 100 000 токенов"),'requested Russian moderator action present');
check(text.client.includes("Za mało tokenów, aby utworzyć kanał AI."),'Polish warning present');
check(text.client.includes("disabled={busy||Boolean(c.runningRunId)} onClick={()=>{setEditing(c.id)"),'existing edit button not balance-gated');
check(!text.route.includes("if(body.action==='save'){\n  await requireChannelCreationBalance(who);"),'editing is not accidentally gated');
if(process.exitCode){console.error(`VALIDATOR=FAIL_${passed}_25`);process.exit(1);}
console.log(`VALIDATOR=PASS_${passed}_25`);
