const test = require('node:test');
const assert = require('node:assert/strict');
const {createHandler} = require('../server/ai/handler.js');
const {geminiRequest} = require('../server/ai/provider.js');
const site = {html:'<h1>Hello</h1>',css:'body {color:black}',js:'document.querySelector("h1").textContent="Hi";'};
const event = (body, extra={}) => ({httpMethod:'POST',headers:{'content-type':'application/json',host:'localhost:8888',origin:'http://localhost:8888'},body:JSON.stringify(body),...extra});
const response = (status,data,headers={}) => new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json',...headers}});
const options = fetchImpl => ({env:{GEMINI_API_KEY:'test-only-not-a-real-key',GEMINI_MODEL:'gemini-3.5-flash-lite'},fetchImpl});
test('one structured request includes manual edits and returns website object',async()=>{
 let calls=0;
 const handler=createHandler('website',options(async(url,config)=>{
   calls++;
   assert.ok(url.endsWith('/gemini-3.5-flash-lite:generateContent'));
   assert.ok(!url.includes('test-only'));
   assert.equal(config.headers['x-goog-api-key'],'test-only-not-a-real-key');
   const payload=JSON.parse(config.body);
   assert.equal(payload.generationConfig.responseMimeType,'application/json');
   assert.ok(payload.generationConfig.responseJsonSchema.properties.html);
   assert.ok(payload.contents[0].parts[0].text.includes('manual change'));
   return response(200,{candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(site)}]}}]});
 }));
 const res=await handler(event({instruction:'Add a button',currentDocument:{...site,html:'<h1>manual change</h1>'},recentInstructions:[]}));
 assert.equal(res.statusCode,200); assert.equal(calls,1); assert.deepEqual(JSON.parse(res.body).document,site);
});
test('quota produces explicit 429 without retry or provider fallback',async()=>{
 let calls=0;
 const res=await createHandler('website',options(async()=>{calls++;return response(429,{error:{message:'secret server details'}});})) (event({instruction:'Make a site'}));
 assert.equal(res.statusCode,429);assert.equal(calls,1);assert.equal(JSON.parse(res.body).error.code,'QUOTA_EXCEEDED');assert.ok(!res.body.includes('secret server details'));
});
test('missing credentials never use source fallback',async()=>{
 const res=await createHandler('website',{env:{},fetchImpl:()=>assert.fail('should not call provider')})(event({instruction:'Make a site'}));
 assert.equal(res.statusCode,503);assert.equal(JSON.parse(res.body).error.code,'NOT_CONFIGURED');
});
test('invalid method, malformed input and oversized documents reject before provider',async()=>{
 const handler=createHandler('website',options(()=>assert.fail('must reject first')));
 for(const [ev,status] of [[event({}, {httpMethod:'GET'}),405],[event({}, {body:'not-json'}),400],[event({instruction:'a'.repeat(4001)}),400],[event({instruction:'Make a site',currentDocument:{...site,html:'x'.repeat(120001)}}),400],[event({}, {body:'x'.repeat(204801)}),413],[event({instruction:'Make a site'},{headers:{'content-type':'text/plain'}}),415],[event({instruction:'Make a site'},{headers:{host:'localhost:8888',origin:'https://attacker.example','content-type':'application/json'}}),403]]) assert.equal((await handler(ev)).statusCode,status);
});
test('model truncation, safety refusal and invalid JSON are explicit errors',async()=>{
 for(const data of [{candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]},{promptFeedback:{blockReason:'SAFETY'}},{candidates:[{finishReason:'STOP',content:{parts:[{text:'not json'}]}}]},{candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({html:5,css:'',js:''})}]}}]}]) {
  const res=await createHandler('website',options(async()=>response(200,data)))(event({instruction:'Make a site'}));
  assert.ok([422,502].includes(res.statusCode)); assert.ok(JSON.parse(res.body).error.code);
 }
});
test('duplicate slide IDs fail validation rather than corrupting editor selection',async()=>{
 const doc={title:'AI',language:'ru',audience:'Students',theme:{background:'#ffffff',foreground:'#111111',accent:'#4361ee',font:'Inter'},slides:[{id:'s1',layout:'title',title:'Intro',body:'',bullets:[],notes:''},{id:'s1',layout:'bullets',title:'Intro',body:'',bullets:[],notes:''}]};
 const res=await createHandler('presentation',options(async()=>response(200,{candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(doc)}]}}]})))(event({instruction:'Make 2 slides'}));
 assert.equal(res.statusCode,502);
});
test('transport timeout aborts and reports useful failure',async()=>{
 await assert.rejects(geminiRequest({contents:[{parts:[{text:'x'}]}]},{env:{GEMINI_API_KEY:'test-only',AI_REQUEST_TIMEOUT_MS:'10'},fetchImpl:async(_,config)=>new Promise((resolve,reject)=>config.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})),{once:true}))}),e=>e.code==='TIMEOUT');
});
test('network errors never leak provider details',async()=>{
 const res=await createHandler('website',options(async()=>{throw new Error('private provider internals')}))(event({instruction:'Make a site'}));
 assert.equal(res.statusCode,502);assert.ok(!res.body.includes('private'));
});
test('provider rejection diagnostics help server debugging without exposing API keys',async()=>{
 const records=[];const original=console.error;console.error=(...parts)=>records.push(parts.join(' '));
 try{
  await assert.rejects(geminiRequest({contents:[]},options(async()=>response(400,{error:{status:'INVALID_ARGUMENT',message:'Rejected key test-only-not-a-real-key',details:[{reason:'API_KEY_INVALID'}]}}))),e=>e.code==='PROVIDER_ERROR');
  assert.ok(records.join(' ').includes('INVALID_ARGUMENT'));assert.ok(!records.join(' ').includes('test-only-not-a-real-key'));
 }finally{console.error=original;}
});