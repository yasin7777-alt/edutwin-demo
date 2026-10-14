const test=require('node:test');const assert=require('node:assert/strict');
const {checkGeneratedHtml}=require('../server/ai/preview-document.js');
test('server rejects embedded executable HTML and external resources',()=>{
 for(const html of ['<script>attack()</script>','<iframe src="https://evil.example"></iframe>','<meta http-equiv="refresh" content="0;url=https://evil.example">','<link rel="stylesheet" href="https://evil.example/a.css">','<div onclick="attack()">Click</div>','<img src="https://evil.example/x">','<a href="javascript:attack()">Go</a>','<svg><script>attack()</script></svg>'])assert.throws(()=>checkGeneratedHtml(html),html);
 assert.doesNotThrow(()=>checkGeneratedHtml('<section><h1>Hello</h1><a href="#work">Work</a><button id="action">Click</button></section>'));
});