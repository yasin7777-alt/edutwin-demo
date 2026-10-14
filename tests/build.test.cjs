const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
test('build includes existing assets and new studio but excludes private source', () => {
  const {build} = require('../scripts/build-static.js');
  const result = build();
  for (const file of ['index.html','ai-studio.html','materials.html','bg.jpeg','Skillchain/style.css','assets/js/ai-studio.js']) assert.ok(fs.existsSync(path.join(result,file)), file);
  for (const file of ['server','netlify','node_modules','tests','package.json','.env','.env.example']) assert.ok(!fs.existsSync(path.join(result,file)),file);
});