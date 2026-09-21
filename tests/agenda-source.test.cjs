const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function setup(respond) {
 const calls=[]; let query;
 const row={id:'medic',client_name:'Medic Endos',title:'Reuniao com Medic Endos',client_phone:'5521975727924',event_date:'2026-09-21',event_time:'13:30:00',color:'#3B82F6',team_id:null};
 const db={from(table){const call={table,action:'select'};calls.push(call);const b={};for(const k of ['select','order','eq','range','insert','update','delete','single','maybeSingle'])b[k]=(...args)=>{if(['insert','update','delete'].includes(k)){call.action=k;call.payload=args[0];}if(k==='range')call.from=args[0];return b;};b.then=(ok,bad)=>Promise.resolve(respond?.(call,row) ?? {data:call.from!==undefined?(call.from===0?[row]:[]):row,error:null}).then(ok,bad);return b;}};
 const mods={react:{useEffect(){},useRef:v=>({current:v})},'@tanstack/react-query':{useQuery:c=>(query=c,{data:[row]}),useMutation:c=>c,useQueryClient:()=>({invalidateQueries(){}})},sonner:{toast:{}},'@/contexts/CommercialContext':{useCommercialSafe:()=>null},'@/integrations/supabase/client':{supabase:db,isSupabaseConfigured:true},'@/lib/commercialLocalStore':{readCommercialLocalData:()=>({agendaEvents:[]})},'@/lib/phoneUtils':{formatPhoneForWhatsApp:v=>v},'@/lib/agendaTitle':{},'@/lib/agendaDate':{normalizeAgendaDateKey:v=>v,normalizeAgendaTimeKey:v=>v,normalizeAgendaColor:v=>v},'@/lib/fetchAllRows':{async fetchAllRows(fetch){const data=[];while(true){const r=await fetch(data.length,data.length+999);if(r.error)throw r.error;if(!r.data?.length)return {data};data.push(...r.data);}}}};
 const output=ts.transpileModule(fs.readFileSync('src/hooks/useAgendaData.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const exports={};vm.runInNewContext(output,{exports,require:n=>{if(!mods[n])throw Error(n);return mods[n];},console,crypto:require('node:crypto').webcrypto,setTimeout:(cb,ms)=>{const t=setTimeout(cb,ms);t.unref();return t;}});
 const hook=exports.useAgendaData();return {calls,query,hook};
}
test('loads Medic Endos from agenda_events with null team and all pages',async()=>{const h=setup();const rows=await h.query.queryFn();assert.equal(rows[0].client_name,'Medic Endos');assert.equal(rows[0].event_date,'2026-09-21');assert.equal(rows[0].team_id,null);assert.deepEqual(h.calls.map(c=>c.table),['agenda_events','agenda_events']);});
test('failed agenda read rejects instead of replacing events with another table',async()=>{const failure=Error('offline');const h=setup(()=>({data:null,error:failure}));await assert.rejects(h.query.queryFn(),failure);assert.equal(h.calls.length,1);});
test('color edit touches only requested field on agenda_events',async()=>{const h=setup();await h.hook.updateEvent.mutationFn({id:'medic',color:'#66FF00'});assert.deepEqual(h.calls.map(c=>c.table),['agenda_events','agenda_events']);assert.deepEqual(Object.keys(h.calls[1].payload).sort(),['color','updated_at']);});
test('insert failure never retries in a different table',async()=>{const failure=Error('conflict');const h=setup(()=>({data:null,error:failure}));await assert.rejects(h.hook.createEvent.mutationFn({title:'Medic',client_phone:'55',skip_related_sync:true}),failure);assert.equal(h.calls.length,1);assert.equal(h.calls[0].table,'agenda_events');});
test('edit conflict does not delete another event or try another table',async()=>{const failure=Error('unique conflict');const h=setup(c=>c.action==='update'?{data:null,error:failure}:undefined);await assert.rejects(h.hook.updateEvent.mutationFn({id:'medic',color:'#66FF00'}),failure);assert.deepEqual(h.calls.map(c=>c.action),['select','update']);});
test('delete targets agenda_events and its lead link',async()=>{const h=setup();await h.hook.deleteEvent.mutationFn('medic');assert.deepEqual(h.calls.map(c=>c.table),['agenda_events','agendamento_leads']);});
