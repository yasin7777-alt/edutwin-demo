import {createProject,applyGenerated,validateDocument} from './ai/state.mjs';
import {openStore,memoryStore} from './ai/project-store.js';
import {generate} from './ai/api-client.js';
import {PresentationEditor} from './ai/presentation-editor.js';
import {WebsiteEditor} from './ai/website-editor.js';
const $=id=>document.getElementById(id);
let store,projects=[],project,busy=false,activeController=null,persistTimer;
let saveQueue=Promise.resolve();
const examples={presentation:['Создай 8 слайдов про искусственный интеллект для студентов','Создай 6 слайдов о возобновляемой энергии для школьников'],website:['Создай минималистичный сайт-портфолио фотографа','Создай сайт учебного клуба с расписанием встреч']};
function status(message,error=false){$('status').textContent=message;$('status').className=`status-text${error?' error':busy?' busy':''}`;}
function persistenceWarning(message){$('storage-warning').hidden=false;$('storage-warning').textContent=message;}
function queueSave(value){
 const snapshot=structuredClone(value);const existing=projects.findIndex(p=>p.id===value.id);
 if(existing===-1)projects.unshift(snapshot);else projects[existing]=snapshot;
 saveQueue=saveQueue.then(()=>store.save(snapshot)).catch(()=>{persistenceWarning('Не удалось сохранить проект в браузере. Скачайте JSON, чтобы не потерять изменения.');});return saveQueue;
}
function changed(doc){
 if(busy)return;
 project.document=structuredClone(doc);project.revision++;project.updatedAt=Date.now();
 clearTimeout(persistTimer);persistTimer=setTimeout(()=>queueSave(project),400);renderMeta();
 status('Изменения сохраняются в этом браузере.');
}
const presentation=new PresentationEditor({change:changed});
const website=new WebsiteEditor({change:changed,error:message=>status(message,true)});
function renderMeta(){
 if(!project)return;
 $('version-label').textContent=`Версия ${project.revision}`;
 $('generate-label').textContent=busy?'Генерация…':project.document?'Применить изменения':project.kind==='website'?'Создать сайт':'Создать презентацию';
 $('instruction-label').textContent=project.document?'Что изменить в проекте?':'Что будем создавать?';
 $('export-site').disabled=!project.document||project.kind!=='website';
}
function renderProjects(){
 $('project-select').replaceChildren();
 for(const p of projects.filter(p=>p.kind===project.kind).sort((a,b)=>b.updatedAt-a.updatedAt)){
  const option=document.createElement('option');option.value=p.id;option.textContent=p.name;$('project-select').append(option);
 }
 $('project-select').value=project.id;
}
function renderHistory(){
 $('request-list').replaceChildren();
 for(const message of project.messages||[]){const card=document.createElement('div');card.className='instruction-message';const time=document.createElement('small');time.textContent=new Date(message.at).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});card.append(time,document.createTextNode(message.instruction));$('request-list').append(card);}
 $('request-list').scrollTop=$('request-list').scrollHeight;
 $('revision-select').replaceChildren(new Option('История версий',''));
 for(let i=project.history.length-1;i>=0;i--){const version=project.history[i];$('revision-select').add(new Option(`Версия ${version.revision} · ${new Date(version.at).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}`,String(i)));}
 $('restore-revision').disabled=true;
}
function showProject(value){
 project=structuredClone(value);
 const site=project.kind==='website';
 for(const button of document.querySelectorAll('[data-kind]'))button.setAttribute('aria-pressed',String(button.dataset.kind===project.kind));
 $('presentation-panel').hidden=site;$('website-panel').hidden=!site;
 $('document-type').textContent=site?'Сайт':'Презентация';$('assistant-subtitle').textContent=site?'Рабочий сайт и изменения по вашим инструкциям':'Структура, текст и оформление слайдов';
 $('project-name').value=project.name;$('instruction').value='';$('char-count').textContent='0 / 4000';
 $('instruction').placeholder=project.document?(site?'Сделай фон чёрным и добавь кнопку…':'Сократи текст на втором слайде и добавь примеры…'):examples[project.kind][0]+'…';
 for(const [id,i] of [['example-one',0],['example-two',1]])$(id).textContent=examples[project.kind][i];
 presentation.setDocument(site?null:project.document);
 if(site)website.setDocument(project.document);else website.pause();
 renderProjects();renderHistory();renderMeta();
 const url=new URL(location.href);url.searchParams.set('tool',project.kind);history.replaceState(null,'',url);
 status('Готово. Проекты сохраняются в этом браузере.');
}
async function flush(){clearTimeout(persistTimer);await queueSave(project);}
function lock(value){
 busy=value;$('editor-fieldset').disabled=value;
 for(const id of ['project-select','project-name','new-project','import-project','export-project','revision-select','instruction','example-one','example-two'])$(id).disabled=value;
 $('generate-btn').disabled=value;$('cancel-btn').hidden=!value;
 for(const button of document.querySelectorAll('[data-kind]'))button.disabled=value;
 $('restore-revision').disabled=value||$('revision-select').value==='';renderMeta();
}
for(const button of document.querySelectorAll('[data-kind]'))button.addEventListener('click',async()=>{
 if(busy||button.dataset.kind===project.kind)return;await flush();const existing=projects.filter(p=>p.kind===button.dataset.kind).sort((a,b)=>b.updatedAt-a.updatedAt)[0];const next=existing||createProject(button.dataset.kind);await queueSave(next);showProject(next);
});
$('new-project').addEventListener('click',async()=>{if(busy)return;await flush();const next=createProject(project.kind);await queueSave(next);showProject(next);$('instruction').focus();});
$('project-select').addEventListener('change',async event=>{const id=event.target.value;if(busy)return;await flush();const selected=projects.find(p=>p.id===id);if(selected)showProject(selected);});
$('project-name').addEventListener('input',()=>{project.name=$('project-name').value.trim()||'Без названия';if(project.document?.title!==undefined)project.document.title=project.name.slice(0,160);project.revision++;project.updatedAt=Date.now();clearTimeout(persistTimer);persistTimer=setTimeout(()=>{queueSave(project);renderProjects();},400);renderMeta();if(project.kind==='presentation')presentation.setDocument(project.document);});
$('instruction').addEventListener('input',()=>{$('char-count').textContent=`${$('instruction').value.length} / 4000`;});
for(const id of ['example-one','example-two'])$(id).addEventListener('click',()=>{$('instruction').value=$(id).textContent;$('instruction').dispatchEvent(new Event('input'));$('instruction').focus();});
$('instruction').addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();if(!busy)$('instruction-form').requestSubmit();}});
$('cancel-btn').addEventListener('click',()=>activeController?.abort());
$('instruction-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;
 const instruction=$('instruction').value.trim();if(instruction.length<2){status('Опишите проект или изменение минимум двумя символами.',true);return;}
 try{if(project.document)validateDocument(project.kind,project.document);}catch(error){status(error.message,true);return;}
 lock(true);status('Saule создаёт результат. Обычно это занимает несколько десятков секунд.');
 const controller=new AbortController();activeController=controller;
 try{
  await flush();const snapshot=structuredClone(project);const doc=await generate(snapshot,instruction,controller.signal);
  if(controller.signal.aborted)return;
  project=applyGenerated(project,doc,snapshot.revision,instruction);
  if(project.kind==='presentation')project.name=doc.title;
  else if(project.name==='Новый сайт')project.name=instruction.slice(0,60);
  await queueSave(project);const result=project;showProject(result);status('Готово. Можно редактировать результат или написать следующую инструкцию.');
 }catch(error){status(error.message||'Не удалось выполнить запрос. Предыдущий проект сохранён.',true);}
 finally{if(activeController===controller){activeController=null;lock(false);}}
});
$('revision-select').addEventListener('change',()=>{$('restore-revision').disabled=busy||$('revision-select').value==='';});
$('restore-revision').addEventListener('click',async()=>{
 const i=Number($('revision-select').value);const old=project.history[i];if(busy||!old)return;
 project=applyGenerated(project,old.document,project.revision,'Восстановление предыдущей версии');await queueSave(project);showProject(project);status('Предыдущая версия восстановлена.');
});
function download(value,name,type){const url=URL.createObjectURL(new Blob([value],{type}));const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export-project').addEventListener('click',async()=>{await flush();download(JSON.stringify({schemaVersion:1,project},null,2),`edutwin-${project.kind}-${project.id.slice(0,8)}.json`,'application/json');status('JSON скачан. В нём сохранены документ и история версий.');});
$('import-project').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async event=>{
 const file=event.target.files[0];event.target.value='';if(!file||busy)return;
 try{
  if(file.size>2500000)throw new Error('JSON-файл должен быть меньше 2,5 МБ.');
  const data=JSON.parse(await file.text());const imported=data.project;
  if(data.schemaVersion!==1||!imported||!['presentation','website'].includes(imported.kind))throw new Error('Выберите JSON-проект EduTwin AI Studio.');
  const clean=createProject(imported.kind);clean.document=imported.document?validateDocument(imported.kind,imported.document):null;clean.name=typeof imported.name==='string'?imported.name.slice(0,160):clean.name;
  clean.history=(Array.isArray(imported.history)?imported.history:[]).slice(-10).map(h=>({document:validateDocument(imported.kind,h.document),revision:Number.isSafeInteger(h.revision)?h.revision:0,at:Number.isFinite(h.at)?h.at:Date.now()}));
  clean.messages=(Array.isArray(imported.messages)?imported.messages:[]).slice(-6).filter(m=>typeof m.instruction==='string').map(m=>({instruction:m.instruction.slice(0,4000),at:Number.isFinite(m.at)?m.at:Date.now()}));
  clean.revision=Number.isSafeInteger(imported.revision)&&imported.revision>=0?imported.revision:0;
  await flush();await queueSave(clean);showProject(clean);status('Проект открыт и сохранён в этом браузере.');
 }catch(error){status(error.message||'Не удалось открыть JSON.',true);}
});
$('export-site').addEventListener('click',()=>{
 if(project.kind!=='website'||!project.document)return;
 try{validateDocument('website',project.document);}catch(error){status(error.message,true);return;}
 const {html,css,js}=project.document;
 const file=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Мой сайт</title><style>${css.replace(/<\/style/gi,'\\3c /style')}</style></head><body>${html}<script>${js.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
 download(file,'edutwin-website.html','text/html');status('HTML скачан. При открытии отдельно код сайта выполняется вне изолированного preview.');
});
window.addEventListener('pagehide',()=>{if(project){clearTimeout(persistTimer);queueSave(project);}website.pause();});
async function initialize(){
 lock(true);
 try{store=await openStore();projects=await store.list();}catch{store=memoryStore();projects=[];persistenceWarning('Браузер не разрешил локальное сохранение. Проект доступен до закрытия страницы; скачайте JSON для сохранения.');}
 const kind=new URLSearchParams(location.search).get('tool')==='website'?'website':'presentation';
 const candidate=projects.find(p=>p.kind===kind)||createProject(kind);project=candidate;
 await queueSave(candidate);showProject(candidate);lock(false);
}
initialize().catch(error=>{status(error.message,true);});