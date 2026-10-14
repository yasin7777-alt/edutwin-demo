const {geminiRequest}=require('../../server/ai/provider');
exports.handler=async function(event){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};
 if(event.httpMethod==='OPTIONS')return {statusCode:200,headers,body:''};
 if(event.httpMethod!=='POST')return {statusCode:405,headers,body:JSON.stringify({error:'Method Not Allowed'})};
 try{
  if(Buffer.byteLength(event.body||'','utf8')>4500000)return {statusCode:413,headers,body:JSON.stringify({error:'Request too large'})};
  let body;try{body=JSON.parse(event.body||'{}');}catch{return {statusCode:400,headers,body:JSON.stringify({error:'Invalid JSON'})};}
  if(body.message!=null&&(typeof body.message!=='string'||body.message.length>20000))return {statusCode:400,headers,body:JSON.stringify({error:'Message must be a string up to 20000 characters'})};
  const parts=[{text:body.message||'Привет'}];
  if(typeof body.image==='string'){
   const match=body.image.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
   if(match)parts.push({inlineData:{mimeType:match[1],data:match[2]}});
  }
  const data=await geminiRequest({systemInstruction:{parts:[{text:'Ты — Saule AI, умный ассистент образовательной платформы EduTwin. Помогай студентам и преподавателям.'}]},contents:[{role:'user',parts}]});
  return {statusCode:200,headers,body:JSON.stringify(data)};
 }catch(error){return {statusCode:error.status||500,headers,body:JSON.stringify({error:error.status?error.message:'Ошибка обработки запроса'})};}
};