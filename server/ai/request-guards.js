const {AIError}=require('./errors');
function guard(event){
 if(event.httpMethod!=='POST')throw new AIError('METHOD_NOT_ALLOWED','Используйте POST.',405);
 const headers=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
 if(!headers['content-type']?.toLowerCase().startsWith('application/json'))throw new AIError('CONTENT_TYPE','Ожидается application/json.',415);
 if(headers.origin){
  let origin;try{origin=new URL(headers.origin);}catch{throw new AIError('ORIGIN_REJECTED','Недопустимый источник запроса.',403);}
  const host=headers.host;
  if(!host||origin.host!==host||!['http:','https:'].includes(origin.protocol))throw new AIError('ORIGIN_REJECTED','Запрос должен поступать с этого сайта.',403);
 }
 const raw=event.isBase64Encoded?Buffer.from(event.body||'','base64').toString('utf8'):(event.body||'');
 if(Buffer.byteLength(raw,'utf8')>204800)throw new AIError('REQUEST_TOO_LARGE','Запрос слишком большой. Уменьшите проект.',413);
 try{return JSON.parse(raw);}catch{throw new AIError('INVALID_JSON','Некорректный JSON запроса.',400);}
}
module.exports={guard};