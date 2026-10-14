const test=require('node:test');const assert=require('node:assert/strict');
const load=()=>import('../assets/js/ai/state.mjs');
const site={html:'<h1>manual</h1>',css:'',js:''};
test('failed or stale requests cannot replace a project and revisions stay bounded',async()=>{
 const {applyGenerated,validateDocument}=await load();
 let project={id:'p1',kind:'website',revision:2,document:site,history:[],messages:[]};
 assert.throws(()=>applyGenerated(project,{...site,html:'new'},1));
 assert.equal(project.document.html,'<h1>manual</h1>');
 for(let i=0;i<15;i++)project=applyGenerated(project,{...site,html:String(i)},project.revision,'instruction');
 assert.equal(project.history.length,10);assert.equal(project.revision,17);assert.equal(project.messages.length,6);
 assert.throws(()=>validateDocument('website',{html:'x',css:2,js:''}));
});
test('request payload contains current manual edits and bounded history',async()=>{
 const {requestPayload}=await load();
 const payload=requestPayload({document:site,messages:Array.from({length:20},(_,i)=>({instruction:String(i)}))},'make black');
 assert.deepEqual(payload.currentDocument,site);assert.equal(payload.recentInstructions.length,6);assert.equal(payload.instruction,'make black');
});