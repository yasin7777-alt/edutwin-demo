import {WebsitePreview} from './website-preview.mjs';
export class WebsiteEditor{
 constructor({change,error}){
  this.change=change;this.error=error;this.document=null;this.timer=null;
  this.preview=new WebsitePreview(document.querySelector('#website-preview'),document.querySelector('#preview-errors'));
  for(const key of ['html','css','js'])document.querySelector(`#code-${key}`).addEventListener('input',event=>{
   const doc=this.document||{html:'',css:'',js:''};doc[key]=event.target.value;this.document=doc;this.change(doc);clearTimeout(this.timer);this.timer=setTimeout(()=>this.renderPreview(),650);
  });
  for(const button of document.querySelectorAll('[data-code-tab]'))button.addEventListener('click',()=>{
   for(const item of document.querySelectorAll('[data-code-tab]'))item.setAttribute('aria-pressed',String(item===button));
   for(const key of ['html','css','js'])document.querySelector(`#code-${key}`).hidden=key!==button.dataset.codeTab;
  });
  document.querySelector('#viewport').addEventListener('change',event=>{document.querySelector('#website-preview').style.maxWidth=event.target.value==='mobile'?'390px':'100%';});
  document.querySelector('#reload-preview').addEventListener('click',()=>this.renderPreview());
  document.querySelector('#stop-preview').addEventListener('click',()=>{clearTimeout(this.timer);this.preview.stop();document.querySelector('#preview-empty').hidden=false;document.querySelector('#preview-empty-text').textContent='Просмотр остановлен. Нажмите «Обновить», чтобы запустить снова.';});
 }
 setDocument(doc){clearTimeout(this.timer);this.document=doc?structuredClone(doc):null;for(const key of ['html','css','js'])document.querySelector(`#code-${key}`).value=doc?.[key]||'';this.renderPreview();}
 renderPreview(){clearTimeout(this.timer);document.querySelector('#preview-empty').hidden=!!this.document;
  if(!this.document){this.preview.stop();document.querySelector('#preview-empty-text').textContent='Опишите сайт — здесь появится живой результат.';return;}
  try{this.preview.update(this.document);}catch(e){this.error(e.message);}
 }
 pause(){clearTimeout(this.timer);this.preview.stop();}
}