const NAME='edutwin-ai-studio';
const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
export async function openStore(){
 const opening=indexedDB.open(NAME,1);
 opening.onupgradeneeded=()=>opening.result.createObjectStore('projects',{keyPath:'id'});
 const db=await request(opening);
 return {
  async list(){return (await request(db.transaction('projects').objectStore('projects').getAll())).sort((a,b)=>b.updatedAt-a.updatedAt);},
  async save(project){await new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(structuredClone(project));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Не удалось сохранить проект.'));});},
  close(){db.close();}
 };
}
export function memoryStore(){const records=new Map();return {list:async()=>[...records.values()].map(value=>structuredClone(value)),save:async p=>records.set(p.id,structuredClone(p)),close(){}};}