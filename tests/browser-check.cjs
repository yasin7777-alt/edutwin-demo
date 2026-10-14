// Test-only fixtures and intercepted responses. The application has no prepared AI results.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');const path=require('node:path');
const deck={title:'Искусственный интеллект',language:'ru',audience:'Студенты',theme:{background:'#f7f8fc',foreground:'#20283f',accent:'#4361ee',font:'Inter'},slides:[{id:'intro',layout:'title',title:'Искусственный интеллект',body:'Как машины учатся решать задачи',bullets:[],notes:'Начните с примеров из повседневной жизни.'},{id:'examples',layout:'two-column',title:'AI рядом с нами',body:'Алгоритмы находят закономерности в данных и помогают человеку принимать решения.',bullets:['Рекомендации музыки и фильмов','Распознавание речи','Помощь в обучении'],notes:'Обсудите ограничения.'}]};
const site={html:'<main><h1>Учебный сайт</h1><button id="change">Изменить заголовок</button></main>',css:'body{font-family:Arial;background:#f3f5ff;padding:32px;color:#20283f}button{padding:12px}',js:'document.getElementById("change").addEventListener("click",()=>document.querySelector("h1").textContent="Работает");'};
async function main(){
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const context=await browser.newContext({viewport:{width:1440,height:1050}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/ai-studio.html');await page.waitForFunction(()=>!document.getElementById('generate-btn').disabled);
 assert.equal(await page.locator('#presentation-empty').isVisible(),true);assert.equal(errors.length,0);
 await page.screenshot({path:path.resolve('../studio-empty.png'),fullPage:true});
 const missing=await context.request.post('http://127.0.0.1:4173/api/ai/website',{data:{instruction:'create a site'}});assert.equal(missing.status(),503);assert.equal((await missing.json()).error.code,'NOT_CONFIGURED');
 await page.route('**/api/ai/presentation',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({document:deck})}));
 await page.locator('#instruction').fill('Создай два слайда');await page.locator('#generate-btn').click();await page.waitForFunction(()=>!document.getElementById('generate-btn').disabled);
 assert.equal(await page.locator('.slide-thumb').count(),2);assert.equal(await page.locator('#slide-title').inputValue(),deck.slides[0].title);
 await page.locator('#slide-title').fill('Ручная правка');await page.waitForTimeout(550);await page.reload();await page.waitForFunction(()=>!document.getElementById('generate-btn').disabled);assert.equal(await page.locator('#slide-title').inputValue(),'Ручная правка');
 await page.locator('#add-slide').click();assert.equal(await page.locator('.slide-thumb').count(),3);await page.locator('#delete-slide').click();assert.equal(await page.locator('.slide-thumb').count(),2);
 await page.locator('.slide-thumb').first().click();await page.locator('#present-btn').click();await page.locator('#present-next').click();assert.equal(await page.locator('#present-count').textContent(),'2 / 2');await page.keyboard.press('Escape');
 await page.screenshot({path:path.resolve('../studio-presentation.png'),fullPage:true});
 await page.locator('[data-kind=website]').click();await page.waitForFunction(()=>document.getElementById('website-panel').hidden===false);
 let requestDoc;
 await page.route('**/api/ai/website',route=>{requestDoc=route.request().postDataJSON().currentDocument;return route.fulfill({contentType:'application/json',body:JSON.stringify({document:site})});});
 await page.locator('#instruction').fill('Создай сайт');await page.locator('#generate-btn').click();await page.waitForFunction(()=>!document.getElementById('generate-btn').disabled);
 await page.frameLocator('#website-preview iframe').locator('#change').click();assert.equal(await page.frameLocator('#website-preview iframe').locator('h1').textContent(),'Работает');
 const frame=await (await page.locator('#website-preview iframe').elementHandle()).contentFrame();
 const isolated=await frame.evaluate(()=>{let parentBlocked=false,storageBlocked=false;try{void parent.document.body;}catch{parentBlocked=true;}try{void localStorage.length;}catch{storageBlocked=true;}return {parentBlocked,storageBlocked};});assert.deepEqual(isolated,{parentBlocked:true,storageBlocked:true});
 let reached=0;await page.route('**/blocked-probe',route=>{reached++;return route.fulfill({body:'bad'});});
 await frame.evaluate(async()=>{try{await fetch('/blocked-probe');}catch{}});assert.equal(reached,0);
 await page.locator('#code-html').fill('<h1>Manual website edit</h1><button id="change">Run</button>');await page.waitForTimeout(800);
 await page.locator('#instruction').fill('Сделай фон чёрным');await page.locator('#generate-btn').click();await page.waitForFunction(()=>!document.getElementById('generate-btn').disabled);assert.ok(requestDoc.html.includes('Manual website edit'));
 await page.unroute('**/api/ai/website');await page.route('**/api/ai/website',route=>route.fulfill({status:429,contentType:'application/json',body:JSON.stringify({error:{code:'QUOTA_EXCEEDED',message:'Бесплатная квота исчерпана'}})}));
 const before=await page.locator('#code-html').inputValue();await page.locator('#instruction').fill('Ещё правка');await page.locator('#generate-btn').click();await page.waitForFunction(()=>!document.getElementById('generate-btn').disabled);assert.equal(await page.locator('#code-html').inputValue(),before);assert.ok((await page.locator('#status').textContent()).includes('квота'));
 await page.locator('#revision-select').selectOption('0');await page.locator('#restore-revision').click();await page.waitForFunction(()=>document.getElementById('code-html').value.includes('Manual website edit'));assert.ok((await page.locator('#code-html').inputValue()).includes('Manual website edit'));
 await page.locator('[data-code-tab=js]').click();await page.locator('#code-js').fill('');await page.waitForTimeout(800);await page.locator('[data-code-tab=html]').click();await page.locator('#code-html').fill('<h1 id="safe">Safe</h1><img src="http://127.0.0.1:4173/blocked-probe" onerror="parent.hacked=true"><script>parent.hacked=true</script><iframe src="https://evil.example"></iframe>');await page.waitForTimeout(900);
 assert.equal(await page.frameLocator('#website-preview iframe').locator('script:not([nonce])').count(),0);assert.equal(await page.frameLocator('#website-preview iframe').locator('iframe').count(),0);assert.equal(reached,0);assert.equal(await page.evaluate(()=>window.hacked),undefined);
 const sanitized=await page.evaluate(async()=>{const {sanitizeHtml}=await import('/assets/js/ai/website-preview.mjs');return sanitizeHtml('<meta http-equiv="refresh"><svg><script>x()</script></svg><a href="javascript:x()" onclick="x()">link</a>');});assert.ok(!sanitized.includes('javascript'));assert.ok(!sanitized.includes('onclick'));assert.ok(!sanitized.includes('svg'));
 await page.locator('#code-html').fill(site.html);await page.locator('[data-code-tab=css]').click();await page.locator('#code-css').fill(site.css);await page.waitForTimeout(800);
 await page.screenshot({path:path.resolve('../studio-website.png'),fullPage:true});
 for(const width of [375,768,1024]){await page.setViewportSize({width,height:900});await page.waitForTimeout(150);const over=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(over,false,`overflow at ${width}`);}
 await page.screenshot({path:path.resolve('../studio-mobile.png'),fullPage:true});
 await page.reload();await page.waitForFunction(()=>!document.getElementById('generate-btn').disabled);assert.equal(await page.locator('#code-html').inputValue(),site.html);
 assert.equal(errors.length,0,errors.join('\n'));console.log('Browser checks passed: editors, persistence, revisions, manual-edit payloads, quota errors, sandbox isolation, blocked resources, and responsive layout.');
 await browser.close();
}
main().catch(error=>{console.error(error);process.exit(1);});