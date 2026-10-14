function node(tag,className,text){const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;}
export function slideElement(deck,index,{mini=false}={}){
 const slide=deck.slides[index];const element=node('article',`slide layout-${slide.layout}${mini?' mini-slide':''}`);
 element.style.setProperty('--slide-bg',deck.theme.background);element.style.setProperty('--slide-fg',deck.theme.foreground);element.style.setProperty('--slide-accent',deck.theme.accent);element.style.fontFamily=deck.theme.font==='Inter'?'Inter,Arial,sans-serif':deck.theme.font;
 const top=node('div','slide-top');top.append(node('span','slide-deck-name',deck.title),node('span','slide-position',`${index+1} / ${deck.slides.length}`));
 const content=node('div','slide-content');content.append(node('h2','slide-title',slide.title));
 const body=node('div','slide-body');if(slide.body)body.append(node('p','slide-paragraph',slide.body));
 if(slide.bullets.length){const list=node('ul','slide-bullets');for(const bullet of slide.bullets)list.append(node('li','',bullet));body.append(list);}
 content.append(body);element.append(top,content,node('div','slide-footer','EduTwin'));
 const longest=slide.body.length+slide.bullets.join('').length+slide.title.length;
 if(longest>750)element.classList.add('dense');
 return element;
}
export function renderCanvas(container,deck,index){container.replaceChildren(slideElement(deck,index));}
export function renderThumbnails(container,deck,index,select){
 container.replaceChildren();
 deck.slides.forEach((slide,i)=>{const button=node('button',`slide-thumb${index===i?' selected':''}`);button.type='button';button.setAttribute('aria-label',`Слайд ${i+1}: ${slide.title||'Без названия'}`);button.setAttribute('aria-pressed',String(index===i));const canvas=node('div','thumb-canvas');canvas.append(slideElement(deck,i,{mini:true}));button.append(node('span','thumb-number',String(i+1)),canvas,node('span','thumb-caption',slide.title||'Без названия'));button.addEventListener('click',()=>select(i));container.append(button);});
}