const {AIError}=require('./errors');
const {schemas,request,jsonSchema}=require('./schemas');
const {geminiRequest,responseText}=require('./provider');
const {systemPrompt,userPrompt}=require('./prompts');
const {guard}=require('./request-guards');
const {checkGeneratedHtml}=require('./preview-document');
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function createHandler(kind,options={}){
 return async event=>{
  try{
   const parsed=request.safeParse(guard(event));
   if(!parsed.success)throw new AIError('INVALID_REQUEST','Введите запрос от 2 до 4000 символов. История — до 6 инструкций.',400);
   const body=parsed.data;
   if(body.currentDocument!=null){const checked=schemas[kind].safeParse(body.currentDocument);if(!checked.success)throw new AIError('INVALID_DOCUMENT','Текущий проект имеет неверную структуру или превышает лимиты.',400);body.currentDocument=checked.data;}
   const data=await geminiRequest({systemInstruction:{parts:[{text:systemPrompt(kind)}]},contents:[{role:'user',parts:[{text:userPrompt(body)}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:jsonSchema(kind),temperature:0.7}},options);
   let result;const text=responseText(data);
   if(text.length>150000)throw new AIError('INVALID_OUTPUT','Ответ Gemini слишком большой.',502);
   try{result=JSON.parse(text);}catch{throw new AIError('INVALID_OUTPUT','Gemini вернул некорректный JSON. Предыдущая версия сохранена.',502);}
   const checked=schemas[kind].safeParse(result);
   if(!checked.success)throw new AIError('INVALID_OUTPUT','Ответ Gemini не соответствует структуре проекта. Попробуйте упростить запрос.',502);
   if(kind==='website')checkGeneratedHtml(checked.data.html);
   return {statusCode:200,headers,body:JSON.stringify({document:checked.data})};
  }catch(error){
   const known=error instanceof AIError?error:new AIError('INTERNAL_ERROR','Не удалось обработать запрос.',500);
   return {statusCode:known.status,headers:{...headers,...(known.status===405?{Allow:'POST'}:{})},body:JSON.stringify({error:{code:known.code,message:known.message}})};
  }
 };
}
module.exports={createHandler};