const {z}=require('zod');
const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
const slide=z.object({id:z.string().min(1).max(80),layout:z.enum(['title','bullets','two-column','quote','closing']),title:z.string().max(160),body:z.string().max(2000),bullets:z.array(z.string().max(300)).max(8),notes:z.string().max(1500)}).strict();
const basePresentation=z.object({title:z.string().min(1).max(160),language:z.string().max(40),audience:z.string().max(200),theme:z.object({background:color,foreground:color,accent:color,font:z.enum(['Inter','Georgia','Arial'])}).strict(),slides:z.array(slide).min(1).max(20)}).strict();
const presentation=basePresentation.refine(doc=>new Set(doc.slides.map(s=>s.id)).size===doc.slides.length,'Slide IDs must be unique');
const website=z.object({html:z.string().max(120000),css:z.string().max(120000),js:z.string().max(120000)}).strict().refine(doc=>doc.html.length+doc.css.length+doc.js.length<=120000,'Project is too large');
const request=z.object({instruction:z.string().trim().min(2).max(4000),currentDocument:z.unknown().optional(),recentInstructions:z.array(z.string().max(4000)).max(6).default([])}).strict();
const jsonSchema=kind=>{const s=z.toJSONSchema(kind==='presentation'?basePresentation:z.object({html:z.string(),css:z.string(),js:z.string()}).strict());delete s.$schema;return s;};
module.exports={schemas:{presentation,website},request,jsonSchema};