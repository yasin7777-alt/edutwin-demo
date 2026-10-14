const {parseFragment}=require('parse5');
const {tags,safeAttr}=require('../../assets/js/ai/preview-policy');
const {AIError}=require('./errors');
function checkGeneratedHtml(html){
 const root=parseFragment(html);let count=0;
 const visit=node=>{
  if(++count>5000)throw new AIError('INVALID_OUTPUT','HTML содержит слишком много элементов.',502);
  if(node.tagName){
   if(node.namespaceURI!=='http://www.w3.org/1999/xhtml'||!tags.has(node.tagName)||node.attrs.some(attr=>!safeAttr(attr.name,attr.value)))throw new AIError('INVALID_OUTPUT','HTML содержит неподдерживаемый элемент, внешнюю ссылку или встроенный обработчик. Попросите использовать отдельные HTML/CSS/JS.',502);
  }
  for(const child of node.childNodes||[])visit(child);
 };
 visit(root);
}
module.exports={checkGeneratedHtml};