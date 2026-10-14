const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pages = ['index.html','account.html','materials.html','rabota.html','register.html','schedule.html','survey.html','test.html','ai-studio.html','bg.jpeg','videos-config.js','service-worker.js'];
function build() {
  const output = path.join(root, 'dist');
  if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Unsafe output path');
  fs.rmSync(output, {recursive:true, force:true});
  fs.mkdirSync(output,{recursive:true});
  for (const name of pages) fs.copyFileSync(path.join(root,name),path.join(output,name));
  for (const folder of ['Skillchain','assets']) {
    fs.cpSync(path.join(root,folder),path.join(output,folder),{recursive:true,filter:source => !fs.lstatSync(source).isSymbolicLink() && !path.basename(source).startsWith('.')});
  }
  return output;
}
module.exports={build};
if(require.main===module) console.log('Public build:',build());