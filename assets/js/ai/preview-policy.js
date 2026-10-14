(function(root){
 const tags=new Set('a abbr article aside b blockquote br button caption code col colgroup dd details div dl dt em fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr i img input label legend li main nav ol option p pre progress section select small span strong sub summary sup table tbody td textarea th thead time tr u ul'.split(' '));
 const attrs=new Set('id class title style role tabindex aria-label aria-labelledby aria-describedby aria-expanded aria-hidden aria-controls aria-live aria-pressed aria-current aria-modal type name value placeholder disabled checked selected required minlength maxlength min max step rows cols for width height alt open colspan rowspan scope datetime'.split(' '));
 function safeAttr(name,value){
  name=name.toLowerCase();
  if(name==='href')return /^#[\w-]*$/.test(value);
  if(name==='src')return /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value);
  if(name==='target')return false;
  return attrs.has(name)||/^data-[a-z0-9-]+$/.test(name);
 }
 const policy={tags,safeAttr};
 if(typeof module!=='undefined'&&module.exports)module.exports=policy;
 else root.EduTwinPreviewPolicy=policy;
})(globalThis);