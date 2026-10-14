import {renderCanvas,renderThumbnails} from './presentation-renderer.js';
export class PresentationEditor{
 constructor({change}){
  this.change=change;this.deck=null;this.index=0;
  this.canvas=document.querySelector('#slide-canvas');this.strip=document.querySelector('#slides-strip');
  for(const key of ['title','body','bullets','notes','layout'])document.querySelector(`#slide-${key}`).addEventListener('input',event=>{
   if(!this.deck)return;const slide=this.deck.slides[this.index];
   slide[key]=key==='bullets'?event.target.value.split('\n').filter(Boolean).slice(0,8).map(s=>s.slice(0,300)):event.target.value;
   this.change(this.deck);this.draw();
  });
  for(const key of ['background','foreground','accent','font'])document.querySelector(`#theme-${key}`).addEventListener('input',event=>{if(!this.deck)return;this.deck.theme[key]=event.target.value;this.change(this.deck);this.draw();});
  document.querySelector('#add-slide').addEventListener('click',()=>{if(!this.deck||this.deck.slides.length>=20)return;this.deck.slides.splice(this.index+1,0,{id:crypto.randomUUID(),layout:'bullets',title:'Новый слайд',body:'',bullets:[],notes:''});this.index++;this.change(this.deck);this.refresh();});
  document.querySelector('#delete-slide').addEventListener('click',()=>{if(!this.deck||this.deck.slides.length<=1)return;this.deck.slides.splice(this.index,1);this.index=Math.min(this.index,this.deck.slides.length-1);this.change(this.deck);this.refresh();});
  for(const [id,delta] of [['move-left',-1],['move-right',1]])document.querySelector(`#${id}`).addEventListener('click',()=>{const next=this.index+delta;if(!this.deck||next<0||next>=this.deck.slides.length)return;const [slide]=this.deck.slides.splice(this.index,1);this.deck.slides.splice(next,0,slide);this.index=next;this.change(this.deck);this.refresh();});
  this.dialog=document.querySelector('#presentation-dialog');
  document.querySelector('#present-btn').addEventListener('click',()=>{if(!this.deck)return;this.dialog.showModal();this.drawPresentation();});
  document.querySelector('#close-presentation').addEventListener('click',()=>this.dialog.close());
  for(const [id,delta] of [['present-prev',-1],['present-next',1]])document.querySelector(`#${id}`).addEventListener('click',()=>this.presentMove(delta));
  this.dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();this.presentMove(1);}if(event.key==='ArrowLeft'){event.preventDefault();this.presentMove(-1);}});
 }
 setDocument(deck){this.deck=deck?structuredClone(deck):null;this.index=Math.min(this.index,Math.max(0,(deck?.slides.length||1)-1));this.refresh();}
 presentMove(delta){this.index=Math.max(0,Math.min(this.deck.slides.length-1,this.index+delta));this.drawPresentation();this.refresh();}
 drawPresentation(){renderCanvas(document.querySelector('#present-canvas'),this.deck,this.index);document.querySelector('#present-count').textContent=`${this.index+1} / ${this.deck.slides.length}`;document.querySelector('#present-prev').disabled=this.index===0;document.querySelector('#present-next').disabled=this.index===this.deck.slides.length-1;}
 refresh(){
  const empty=!this.deck;
  document.querySelector('#presentation-empty').hidden=!empty;document.querySelector('#presentation-work').hidden=empty;
  if(empty){this.canvas.replaceChildren();this.strip.replaceChildren();return;}
  const slide=this.deck.slides[this.index];for(const key of ['title','body','bullets','notes','layout'])document.querySelector(`#slide-${key}`).value=key==='bullets'?slide.bullets.join('\n'):slide[key];
  for(const key of ['background','foreground','accent','font'])document.querySelector(`#theme-${key}`).value=this.deck.theme[key];
  document.querySelector('#slide-editor-heading').textContent=`Слайд ${this.index+1}`;
  this.draw();
 }
 draw(){if(!this.deck)return;renderCanvas(this.canvas,this.deck,this.index);renderThumbnails(this.strip,this.deck,this.index,i=>{this.index=i;this.refresh();});document.querySelector('#add-slide').disabled=this.deck.slides.length>=20;document.querySelector('#delete-slide').disabled=this.deck.slides.length<=1;document.querySelector('#move-left').disabled=this.index===0;document.querySelector('#move-right').disabled=this.index===this.deck.slides.length-1;}
}