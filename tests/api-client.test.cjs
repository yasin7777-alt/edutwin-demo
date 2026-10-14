const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
test('already canceled generation makes no network request',async()=>{
 const source=fs.readFileSync('assets/js/ai/api-client.js','utf8').replace(/^import .*;\r?\n/,"const requestPayload=()=>({});const validateDocument=(_,doc)=>doc;\n");
 const {generate}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({document:{html:'',css:'',js:''}})};};
 const controller=new AbortController();controller.abort();
 try{await assert.rejects(generate({kind:'website'},'Create website',controller.signal),/отменена/);assert.equal(calls,0);}finally{globalThis.fetch=original;}
});
test('memory fallback stores cloned projects without shared references',async()=>{
 const source=fs.readFileSync('assets/js/ai/project-store.js','utf8');const {memoryStore}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const store=memoryStore();const project={id:'p1',document:{html:'original'}};await store.save(project);project.document.html='changed';
 const list=await store.list();assert.equal(list[0].document.html,'original');list[0].document.html='mutated';assert.equal((await store.list())[0].document.html,'original');
});