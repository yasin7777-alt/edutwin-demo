import './preview-policy.js';
const {tags,safeAttr}=globalThis.EduTwinPreviewPolicy;
export function sanitizeHtml(html){
 const template=document.createElement('template');template.innerHTML=html;
 let count=0;
 const walk=root=>{
  for(const child of [...root.childNodes]){
   if(++count>5000)throw new Error('В HTML слишком много элементов.');
   if(child.nodeType===Node.COMMENT_NODE){child.remove();continue;}
   if(child.nodeType!==Node.ELEMENT_NODE)continue;
   if(child.namespaceURI!=='http://www.w3.org/1999/xhtml'||!tags.has(child.localName)){child.remove();continue;}
   for(const attr of [...child.attributes])if(!safeAttr(attr.name,attr.value))child.removeAttribute(attr.name);
   walk(child);
  }
 };
 walk(template.content);return template.innerHTML;
}
function safeScript(value){return value.replace(/<\/script/gi,'<\\/script');}
function safeStyle(value){return value.replace(/<\/style/gi,'\\3c /style');}
export function buildPreview(doc,token){
 const nonce=Array.from(crypto.getRandomValues(new Uint8Array(18)),v=>v.toString(16).padStart(2,'0')).join('');
 const csp=`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'; media-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
 const diagnostic=`(()=>{const token=${JSON.stringify(token)};const send=message=>parent.postMessage({type:'edutwin-preview-error',token,message:String(message).slice(0,500)},'*');addEventListener('error',e=>send(e.message));addEventListener('unhandledrejection',e=>send(e.reason?.message||e.reason));document.addEventListener('submit',e=>e.preventDefault(),true);document.addEventListener('click',e=>{const a=e.target.closest?.('a');if(a&&!a.getAttribute('href')?.startsWith('#'))e.preventDefault();},true);})();`;
 return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${safeStyle(doc.css)}</style></head><body>${sanitizeHtml(doc.html)}<script nonce="${nonce}">${safeScript(diagnostic)}</script><script nonce="${nonce}">${safeScript(doc.js)}</script></body></html>`;
}
export class WebsitePreview{
 constructor(host,errors){this.host=host;this.errors=errors;this.frame=null;this.token='';window.addEventListener('message',event=>{
  if(event.source!==this.frame?.contentWindow||event.origin!=='null'||event.data?.type!=='edutwin-preview-error'||event.data.token!==this.token||typeof event.data.message!=='string')return;
  this.errors.textContent=event.data.message.slice(0,500);this.errors.hidden=false;
 });}
 update(doc){
  this.stop();this.errors.hidden=true;this.token=crypto.randomUUID();
  const frame=document.createElement('iframe');frame.title='Живой просмотр созданного сайта';frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';frame.setAttribute('allow','camera \'none\'; microphone \'none\'; geolocation \'none\'; payment \'none\'');frame.srcdoc=buildPreview(doc,this.token);this.frame=frame;this.host.replaceChildren(frame);
 }
 stop(){if(this.frame){this.frame.srcdoc='';this.frame.remove();this.frame=null;}this.host.replaceChildren();}
}