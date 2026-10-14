export const fonts=['Inter','Georgia','Arial'];
export const layouts=['title','bullets','two-column','quote','closing'];
const text=(value,max)=>typeof value==='string'&&value.length<=max;
export function validateDocument(kind,doc){
 if(!doc||typeof doc!=='object')throw new Error('Неверная структура проекта.');
 if(kind==='website'){
  if(Object.keys(doc).sort().join(',')!=='css,html,js'||!['html','css','js'].every(k=>text(doc[k],120000))||doc.html.length+doc.css.length+doc.js.length>120000)throw new Error('HTML/CSS/JS должны быть строками суммарно до 120 000 символов.');
 }else if(kind==='presentation'){
  if(!text(doc.title,160)||!doc.title||!text(doc.language,40)||!text(doc.audience,200)||!doc.theme||!fonts.includes(doc.theme.font)||!['background','foreground','accent'].every(k=>/^#[0-9a-fA-F]{6}$/.test(doc.theme[k]))||!Array.isArray(doc.slides)||doc.slides.length<1||doc.slides.length>20)throw new Error('Неверная структура презентации.');
  if(!doc.slides.every(s=>s&&text(s.id,80)&&s.id&&layouts.includes(s.layout)&&text(s.title,160)&&text(s.body,2000)&&text(s.notes,1500)&&Array.isArray(s.bullets)&&s.bullets.length<=8&&s.bullets.every(b=>text(b,300)))||new Set(doc.slides.map(s=>s.id)).size!==doc.slides.length)throw new Error('Неверная структура слайдов.');
 }else throw new Error('Неизвестный тип проекта.');
 return structuredClone(doc);
}
export function requestPayload(project,instruction){return {instruction,currentDocument:project.document,recentInstructions:(project.messages||[]).slice(-6).map(m=>m.instruction)};}
export function applyGenerated(project,doc,expectedRevision,instruction=''){
 if(project.revision!==expectedRevision)throw new Error('Проект изменился во время генерации. Ответ не применён.');
 const document=validateDocument(project.kind,doc);
 const history=[...(project.history||[])];
 if(project.document)history.push({document:structuredClone(project.document),at:Date.now(),revision:project.revision});
 return {...project,document,revision:project.revision+1,updatedAt:Date.now(),history:history.slice(-10),messages:[...(project.messages||[]),{instruction,at:Date.now()}].slice(-6)};
}
export function createProject(kind){return {id:crypto.randomUUID(),kind,name:kind==='presentation'?'Новая презентация':'Новый сайт',revision:0,document:null,history:[],messages:[],updatedAt:Date.now()};}