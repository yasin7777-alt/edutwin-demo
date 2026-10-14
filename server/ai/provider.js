const {AIError}=require('./errors');
const DEFAULT_MODEL='gemini-3.5-flash-lite';
// Only reviewed models with documented Free Tier text generation. Never auto-switch.
const FREE_MODELS=new Set([DEFAULT_MODEL,'gemini-3.5-flash']);
function setting(value,fallback,min,max){const n=Number(value);return Number.isFinite(n)&&n>=min?Math.min(n,max):fallback;}
async function geminiRequest(payload,{env=process.env,fetchImpl=globalThis.fetch}={}){
 const key=env.GEMINI_API_KEY?.trim();
 if(!key)throw new AIError('NOT_CONFIGURED','На сервере не настроен GEMINI_API_KEY. Добавьте ключ Free Tier проекта в Netlify.',503);
 const model=env.GEMINI_MODEL||DEFAULT_MODEL;
 if(!FREE_MODELS.has(model))throw new AIError('MODEL_NOT_ALLOWED','Модель не входит в разрешённый список Gemini Free Tier.',503);
 const timeout=setting(env.AI_REQUEST_TIMEOUT_MS,45000,1,50000);
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const res=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},body:JSON.stringify({...payload,generationConfig:{...payload.generationConfig,maxOutputTokens:setting(env.AI_MAX_OUTPUT_TOKENS,12000,256,12000)}}),signal:controller.signal});
  if(res.status===429)throw new AIError('QUOTA_EXCEEDED','Бесплатная квота Gemini исчерпана или превышен лимит частоты. Попробуйте позже. Текущий проект сохранён.',429);
  if([401,403].includes(res.status))throw new AIError('KEY_REJECTED','Gemini отклонил ключ или доступ к API. Проверьте серверный ключ и доступность модели в AI Studio.',503);
  if(res.status===404)throw new AIError('MODEL_UNAVAILABLE','Выбранная Gemini-модель недоступна. Платное переключение отключено.',503);
  if(!res.ok){
   // Private server diagnostics only. Never return provider messages or secrets to the browser.
   let detail;try{detail=(await res.clone().json()).error;}catch{}
   const scrub=value=>String(value||'').split(key).join('[REDACTED]').replace(/AQ\.[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{20,}/g,'[REDACTED]').slice(0,500);
   console.error(JSON.stringify({source:'Gemini',httpStatus:res.status,status:scrub(detail?.status),message:scrub(detail?.message),reasons:(detail?.details||[]).map(d=>scrub(d.reason)).filter(Boolean)}));
   throw new AIError('PROVIDER_ERROR','Gemini временно не смог выполнить запрос. Попробуйте позже.',502);
  }
  const data=await res.json();
  const candidate=data.candidates?.[0];
  if(data.promptFeedback?.blockReason||['SAFETY','RECITATION','PROHIBITED_CONTENT','BLOCKLIST','SPII'].includes(candidate?.finishReason))throw new AIError('SAFETY_BLOCK','Gemini не смог выполнить этот запрос. Переформулируйте описание.',422);
  if(candidate?.finishReason==='MAX_TOKENS')throw new AIError('OUTPUT_LIMIT','Результат не поместился в лимит ответа. Уменьшите число слайдов или сложность сайта.',422);
  if(!candidate||candidate.finishReason!=='STOP')throw new AIError('INCOMPLETE_OUTPUT','Gemini вернул неполный результат. Предыдущая версия сохранена.',502);
  return data;
 }catch(error){
  if(error instanceof AIError)throw error;
  if(controller.signal.aborted||error.name==='AbortError')throw new AIError('TIMEOUT','Генерация заняла слишком много времени. Попробуйте более короткий запрос.',504);
  throw new AIError('NETWORK_ERROR','Не удалось получить ответ Gemini. Текущий проект сохранён.',502);
 }finally{clearTimeout(timer);}
}
function responseText(data){return data.candidates?.[0]?.content?.parts?.filter(p=>typeof p.text==='string'&&!p.thought).map(p=>p.text).join('')||'';}
module.exports={geminiRequest,responseText,DEFAULT_MODEL};