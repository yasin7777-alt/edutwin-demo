import {requestPayload,validateDocument} from './state.mjs';
export async function generate(project,instruction,signal){
 if(signal?.aborted)throw new Error('Генерация отменена. Текущий проект сохранён.');
 const controller=new AbortController();const relay=()=>controller.abort();
 signal?.addEventListener('abort',relay,{once:true});
 const timer=setTimeout(()=>controller.abort(),55000);
 try{
  const response=await fetch(`/api/ai/${project.kind}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(requestPayload(project,instruction)),signal:controller.signal,credentials:'same-origin'});
  let data;try{data=await response.json();}catch{throw new Error('Сервер не вернул JSON. Проверьте запуск Netlify Functions и маршруты /api/ai.');}
  if(!response.ok)throw new Error(data.error?.message||'Не удалось выполнить генерацию.');
  return validateDocument(project.kind,data.document);
 }catch(error){
  if(error.name==='AbortError')throw new Error(signal?.aborted?'Генерация отменена. Текущий проект сохранён.':'Время ожидания истекло. Упростите запрос и попробуйте позже.');
  throw error;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',relay);}
}