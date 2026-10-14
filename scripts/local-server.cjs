const http=require('node:http');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
if(fs.existsSync(path.join(root,'.env')))process.loadEnvFile(path.join(root,'.env'));
const routes={'/api/ai/presentation':'ai-presentation','/api/ai/website':'ai-website','/api/chat':'chat','/api/send_email':'send_email'};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpeg':'image/jpeg','.jpg':'image/jpeg','.png':'image/png','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const name=routes[pathname]||(/^\/\.netlify\/functions\/([a-z_-]+)$/.exec(pathname)?.[1]);
  if(name){
   const file=path.join(root,'netlify','functions',name+'.js');if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
   let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>4500000){res.writeHead(413);return res.end();}chunks.push(chunk);}
   const result=await require(file).handler({httpMethod:req.method,headers:req.headers,body:Buffer.concat(chunks).toString('utf8')});res.writeHead(result.statusCode,result.headers);return res.end(result.body);
  }
  const base=path.join(root,'dist');const relative=decodeURIComponent(pathname).replace(/^\/+/, '')||'index.html';const file=path.resolve(base,relative);
  if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found');}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('X-Content-Type-Options','nosniff');
  if(relative==='ai-studio.html'){
   res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-src 'self' about:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'");
   res.setHeader('Referrer-Policy','no-referrer');
  }
  fs.createReadStream(file).pipe(res);
 }catch(error){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:'Local server error'}}));console.error(error.message);}
});
server.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('EduTwin preview: http://127.0.0.1:4173/ai-studio.html'));