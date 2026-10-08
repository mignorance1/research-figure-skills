/* Native editable visual-grammar demo. All signals/matrices are illustrative. */
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outputArg = outIndex >= 0 ? args[outIndex + 1] : 'output/method-demo.pptx';
if (!outputArg || !/\.pptx$/i.test(outputArg)) {
  throw new Error('Provide --out with a .pptx filename.');
}
const out = path.resolve(outputArg);
const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'research-figure-skills';
pptx.subject = 'Illustrative visual grammar; no study-specific algorithm or results';
pptx.title = 'Scientific method: visual grammar demo';
pptx.lang = 'en-US';
pptx.theme = {headFontFace:'Times New Roman', bodyFontFace:'Times New Roman', lang:'en-US'};
const slide = pptx.addSlide();
slide.background = {color:'FFFFFF'};
const C = {blue:'0F4D92', teal:'42949E', green:'5D9F62', violet:'9A4D8E',
           orange:'C88931', ink:'252525', line:'B7B7B7', pale:'F1F3F5'};
const SH = pptx.ShapeType;
const text = (s,x,y,w,h,size=13,color=C.ink,bold=false,extra={}) =>
  slide.addText(s,{x,y,w,h,fontFace:'Times New Roman',fontSize:size,color,bold,
                   margin:0,breakLine:false,paraSpaceAfterPt:0,vertAlign:'mid',...extra});
const rect = (x,y,w,h,fill='FFFFFF',edge=C.line,extra={}) =>
  slide.addShape(SH.rect,{x,y,w,h,fill:{color:fill},line:{color:edge,width:.6},...extra});
const line = (x1,y1,x2,y2,color=C.ink,width=1,extra={}) => {
  const dx=x2-x1,dy=y2-y1;
  slide.addShape(SH.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.abs(dx),h:Math.abs(dy),
    flipV:(dx>=0&&dy<0)||(dx<0&&dy>=0),line:{color,width,...extra}});
};
const mix = (hex, amount=.9) => hex.match(/../g).map(v=>
  Math.round(parseInt(v,16)*(1-amount)+255*amount).toString(16).padStart(2,'0')).join('');
const down = (cx,y,h=.23) => slide.addShape(SH.downArrow,{x:cx-.10,y,w:.20,h,
    fill:{color:C.ink},line:{color:C.ink,width:.1}});
const sub = (x,y,w,h,label,color) => {
  rect(x,y,w,h);
  rect(x,y,w,.30,mix(color,.93),C.line);
  text(label,x+.10,y+.025,w-.20,.25,14,C.ink,true);
  return {x:x+.12,y:y+.41,w:w-.24,h:h-.50};
};
function curve(box, values, color=C.blue, width=1.3, dash){
  for(let i=1;i<values.length;i++)
    line(box.x+box.w*(i-1)/(values.length-1),box.y+box.h*(1-values[i-1]),
         box.x+box.w*i/(values.length-1),box.y+box.h*(1-values[i]),color,width,
         dash?{dashType:dash}:{});
}
function waves(box, colors, aligned=false){
  for(let j=0;j<colors.length;j++){
    const b={x:box.x+.23,y:box.y+j*box.h/colors.length,w:box.w-.26,h:box.h/colors.length*.80};
    line(b.x,b.y+b.h/2,b.x+b.w,b.y+b.h/2,C.line,.4);
    const v=Array.from({length:71},(_,i)=>.5+.28*Math.sin(i/70*Math.PI*(4+2*j)+(aligned?0:j*.4))
                            +.06*Math.sin(i/70*Math.PI*24));
    curve(b,v,colors[j],1.15);
    text(`${j+1}`,box.x,b.y, .18,b.h,11,colors[j]);
  }
}
const U=[[.92,.06,.02],[.12,.83,.05],[.75,.20,.05],[.04,.11,.85],[.07,.09,.84]];
function matrix(box, data, color=C.blue){
  const labelSpace=.28,bottom=.20;
  const cw=(box.w-labelSpace)/data[0].length,ch=(box.h-bottom)/data.length;
  for(let r=0;r<data.length;r++){
    // Endpoint labels preserve row meaning without tiny crowded numerals.
    if(r===0 || r===data.length-1)
      text(String(r+1),box.x,box.y+(r+.5)*ch-.09,labelSpace-.05,.18,10,C.ink);
    else if(r===Math.floor(data.length/2))
      text('⋮',box.x,box.y+(r+.5)*ch-.09,labelSpace-.05,.18,10,C.ink);
    for(let c=0;c<data[0].length;c++)
      rect(box.x+labelSpace+c*cw,box.y+r*ch,cw-.02,ch-.02,mix(color,1-data[r][c]*.92),C.line);
  }
  for(let c=0;c<data[0].length;c++)
    text(String(c+1),box.x+labelSpace+c*cw,box.y+box.h-bottom,cw,bottom,10,C.ink,false,{align:'center'});
}
function spectra(box){
  const colors=[C.blue,C.teal,C.violet];
  colors.forEach((color,j)=>{
    const b={x:box.x+.28,y:box.y+j*box.h/3,w:box.w-.32,h:box.h/3*.80};
    line(b.x,b.y+b.h,b.x+b.w,b.y+b.h,C.line,.5);
    const v=Array.from({length:81},(_,i)=>{
      const f=i/80,peak=.18+j*.28;
      return .08+.82*Math.exp(-Math.pow((f-peak)/.048,2));
    });
    curve(b,v,color,1.25);
    text(`g${j+1}`,box.x,b.y,.24,b.h,11,color,false,{italic:true});
  });
}
function legend(x,y,w){
  const colors=[C.blue,C.teal,C.violet];
  colors.forEach((color,j)=>{
    const lx=x+j*w/3;line(lx,y+.08,lx+.13,y+.08,color,1.5);
    text(`g${j+1}`,lx+.17,y-.01,.22,.18,10.5,color);
  });
}

text('Scientific method: from observations to selected structure',.23,.22,12.88,.44,23,C.ink,true,{align:'center'});
line(.23,.84,13.1,.84,C.line,.65);
const xs=[.23,3.51,6.79,10.07],w=3.03;
const colors=[C.blue,C.teal,C.green,C.violet];
const names=['Input & candidates','Representation','Structure selection','Optimized output'];
xs.forEach((x,j)=>{
  rect(x,1.12,w,5.87,'FFFFFF',colors[j],{line:{color:colors[j],width:.9,dashType:'dash'}});
  rect(x+.10,1.22,w-.20,.41,mix(colors[j],.88),colors[j]);
  slide.addShape(SH.ellipse,{x:x+.17,y:1.27,w:.27,h:.27,
      fill:{color:colors[j]},line:{color:colors[j],width:.3}});
  text(String(j+1),x+.17,1.27,.27,.27,12,'FFFFFF',true,{align:'center'});
  text(names[j],x+.53,1.26,w-.65,.30,16,colors[j],true);
  if(j<3)slide.addShape(SH.rightArrow,{x:x+w+.025,y:1.30,w:.20,h:.24,
      fill:{color:C.ink},line:{color:C.ink,width:.1}});
  down(x+w/2,3.18);down(x+w/2,4.90);
});
const ys=[1.74,3.46,5.18],h=1.40;
// Input: scientific objects and a legible candidate-state key.
let b=sub(xs[0]+.13,ys[0],w-.26,h,'Observed channels',C.blue);
waves(b,[C.blue,C.teal,C.violet]);
b=sub(xs[0]+.13,ys[1],w-.26,h,'Legal candidate domain',C.blue);
const gw=b.w-1.21,gh=b.h-.24;
for(let r=0;r<3;r++)for(let c=0;c<5;c++){
  const illegal=c<r;
  rect(b.x+.30+c*gw/5,b.y+r*gh/3,gw/5-.03,gh/3-.02,
       illegal?'F1F3F5':(c===2?mix(C.blue,.65):'FFFFFF'),C.line);
  if(illegal)line(b.x+.33+c*gw/5,b.y+.02+r*gh/3,
                 b.x+.30+(c+1)*gw/5-.05,b.y+(r+1)*gh/3-.04,C.line,.65);
}
text('p',b.x+.30+gw/2,b.y+gh+.02,.20,.18,11,C.ink,false,{italic:true});
text('q',b.x,b.y+gh/2-.1,.20,.18,11,C.ink,false,{italic:true});
rect(b.x+gw+.36,b.y+.08,.13,.13,mix(C.blue,.65));text('Scored',b.x+gw+.52,b.y+.04,.65,.20,10);
rect(b.x+gw+.36,b.y+.33,.13,.13,C.pale);text('Illegal',b.x+gw+.52,b.y+.29,.65,.20,10);
line(b.x+gw+.38,b.y+.35,b.x+gw+.47,b.y+.44,C.line,.65);
rect(b.x+gw+.36,b.y+.58,.13,.13);text('Unscored',b.x+gw+.52,b.y+.54,.65,.20,10);
b=sub(xs[0]+.13,ys[2],w-.26,h,'Common analysis settings',C.blue);
waves({x:b.x,y:b.y+.05,w:b.w,h:b.h-.25},[C.blue]);
rect(b.x+.75,b.y+.02,.66,b.h-.18,'FFFFFF',C.teal,{fill:{color:mix(C.teal,.95),transparency:25},line:{color:C.teal,width:.9,dashType:'dash'}});
text('Same signal · solver · domain',b.x,b.y+b.h-.18,b.w,.18,11,C.ink,false,{align:'center'});
// Representation: waveforms -> spectral structure -> aligned family.
b=sub(xs[1]+.13,ys[0],w-.26,h,'Modal components',C.teal);waves(b,[C.blue,C.teal,C.violet]);
b=sub(xs[1]+.13,ys[1],w-.26,h,'Spectral structure',C.teal);
spectra({x:b.x,y:b.y,w:b.w,h:b.h-.18});legend(b.x+.30,b.y+b.h-.15,b.w-1.05);
text('Frequency →',b.x+b.w-.80,b.y+b.h-.15,.80,.18,10.5);
b=sub(xs[1]+.13,ys[2],w-.26,h,'Aligned mode family',C.teal);waves(b,[C.blue,C.teal,C.violet],true);
// Structure: matrix -> prototypes -> short decision trace; native data glyphs.
b=sub(xs[2]+.13,ys[0],w-.26,h,'Soft membership',C.green);
matrix({x:b.x,y:b.y,w:b.w-.60,h:b.h-.22},U);
for(let k=0;k<6;k++)rect(b.x+b.w-.42,b.y+k*(b.h-.35)/6,.15,(b.h-.35)/6,mix(C.blue,.08+k/5*.92));
text('1',b.x+b.w-.22,b.y-.01,.20,.15,10);text('0',b.x+b.w-.22,b.y+b.h-.47,.20,.15,10);
text('Modes × groups',b.x+.25,b.y+b.h-.16,b.w-.45,.15,10.5,C.ink,false,{align:'center'});
b=sub(xs[2]+.13,ys[1],w-.26,h,'Group prototypes',C.green);
spectra({x:b.x,y:b.y,w:b.w,h:b.h-.18});legend(b.x+.30,b.y+b.h-.15,b.w-1.05);
text('Frequency →',b.x+b.w-.80,b.y+b.h-.15,.80,.18,10.5);
b=sub(xs[2]+.13,ys[2],w-.26,h,'Accept / stop',C.green);
const score=[.16,.50,.76,.79,.78],bx=b.x+.20,by=b.y+.06,bw=b.w-.4,bh=b.h-.32;
line(bx,by+bh,bx+bw,by+bh,C.line,.8);line(bx,by,bx,by+bh,C.line,.8);
curve({x:bx,y:by,w:bw,h:bh},score,C.blue,1.3);
const px=bx+bw*.5,py=by+bh*(1-score[2]);
slide.addShape(SH.ellipse,{x:px-.04,y:py-.04,w:.08,h:.08,fill:{color:C.orange},line:{color:C.orange,width:.4}});
text('Accept',bx,by+bh+.04,.75,.18,11,C.blue);text('Stop',bx+bw-.55,by+bh+.04,.55,.18,11,C.orange);
// Output: demonstrate the objects, rather than a lone output label.
b=sub(xs[3]+.13,ys[0],w-.26,h,'Selected modes',C.violet);waves(b,[C.blue,C.teal,C.violet],true);
b=sub(xs[3]+.13,ys[1],w-.26,h,'Group structure',C.violet);
matrix({x:b.x,y:b.y,w:b.w-.57,h:b.h},U);
text('U',b.x+b.w-.39,b.y+.25,.30,.25,21,C.violet,false,{italic:true});
b=sub(xs[3]+.13,ys[2],w-.26,h,'Reusable representation',C.violet);
for(let k=2;k>=0;k--){
  const tx=b.x+.38+k*.09,ty=b.y+.16-k*.07;
  rect(tx,ty,1.60,.58,'FFFFFF',k===0?C.violet:C.line);
  for(let j=0;j<3;j++)rect(tx+.12,ty+.08+j*.14,1.20-j*.13,.07,mix([C.blue,C.teal,C.violet][j],.55),'FFFFFF');
}
text('Modes + memberships',b.x,b.y+b.h-.19,b.w,.18,11,C.ink,false,{align:'center'});
text('Illustrative signals and matrices • replace objects and criteria with the current method',.23,7.13,12.88,.18,11,'767676',false,{align:'center'});
fs.mkdirSync(path.dirname(out),{recursive:true});
pptx.writeFile({fileName:out}).then(()=>{
  fs.writeFileSync(out.replace(/\.pptx$/i,'.source.json'),JSON.stringify({
    illustrative:true,not_research_results:true,membership:U,decision_trace:score,
    layout:'Four modules with three functional regions; this count is example-specific',
    palette:C,generator:path.basename(__filename)
  },null,2));
  console.log('Wrote editable demonstration: '+out);
}).catch(error=>{console.error(error.message);process.exitCode=1;});
