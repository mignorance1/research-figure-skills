/* Generic visual grammar. Signals, memberships and scores are illustrative. */
const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const PptxGenJS=require('pptxgenjs');
const args=process.argv.slice(2);
function arg(key,fallback){const i=args.indexOf(key);if(i<0)return fallback;if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing value for '+key);return args[i+1];}
const out=path.resolve(arg('--out','output/method-demo.pptx'));
if(!out.toLowerCase().endsWith('.pptx'))throw Error('--out must end in .pptx');
const python=arg('--python',process.env.PYTHON||'python');
const build=path.join(path.dirname(out),'.build',path.basename(out,'.pptx'));
fs.mkdirSync(build,{recursive:true});
const pptx=new PptxGenJS();pptx.defineLayout({name:'SCIENCE',width:1280/96,height:800/96});pptx.layout='SCIENCE';
pptx.author='research-figure-skills';pptx.subject='Illustrative scientific-method visual grammar';pptx.title='Scientific method: curved-arrow visual grammar';pptx.lang='en-US';
pptx.theme={headFontFace:'Times New Roman',bodyFontFace:'Times New Roman',lang:'en-US'};
const slide=pptx.addSlide();slide.background={color:'FFFFFF'};
const SH=pptx.ShapeType,C={ink:'242B32',blue:'0F4D92',teal:'42949E',purple:'9A4D8E',orange:'C88931',green:'5D9F62',gray:'B8C0C8',navy:'284F68'};
let stage='shared',seq=0;
const id=kind=>stage+'__'+kind+'_'+(++seq),pos=(x,y,w,h)=>({x:x/96,y:y/96,w:w/96,h:h/96});
function text(t,x,y,w,h,size=20,bold=false,align='left',extra={}){
 slide.addText(t,{...pos(x,y,w,h),objectName:id('text'),fontFace:'Times New Roman',fontSize:size*.75,color:C.ink,bold,margin:0,vertAlign:'mid',align,paraSpaceAfterPt:0,breakLine:false,wrap:false,...extra});
}
function rich(parts,x,y,w,h,size=20,align='left'){
 const scaled=parts.map(p=>({...p,options:{...(p.options||{}),...(p.options&&(p.options.subscript||p.options.superscript)?{fontSize:size*.75*.65}:{})}}));
 text(scaled,x,y,w,h,size,false,align);
}
function rect(x,y,w,h,fill='FFFFFF',stroke=C.gray,lw=.65,round=false,dash=false){slide.addShape(round?SH.roundRect:SH.rect,{...pos(x,y,w,h),objectName:id('rect'),rectRadius:.10,fill:{color:fill},line:{color:stroke,width:lw*.75,...(dash?{dashType:'dash'}:{})},radius:.1});}
function line(x,y,xx,yy,c=C.gray,width=.7,dash=false){const dx=xx-x,dy=yy-y;slide.addShape(SH.line,{x:Math.min(x,xx)/96,y:Math.min(y,yy)/96,w:Math.abs(dx)/96,h:Math.abs(dy)/96,objectName:id('line'),flipV:(dx>=0&&dy<0)||(dx<0&&dy>=0),line:{color:c,width:width*.75,...(dash?{dashType:'dash'}:{})}});}
function wave(x,y,w,h,values,c=C.blue,width=1.5,dash=false){for(let i=1;i<values.length;i++)line(x+(i-1)*w/(values.length-1),y+h*(.5-.43*values[i-1]),x+i*w/(values.length-1),y+h*(.5-.43*values[i]),c,width,dash);}
function blend(c,v){return c.match(/../g).map(q=>Math.round(255-(255-parseInt(q,16))*v).toString(16).padStart(2,'0')).join('');}
function panel(n,label,x,y,w,h,color){stage='panel'+n;rect(x,y,w,h,'FFFFFF',color,1.35,true,true);text(n+'  '+label,x+16,y+10,w-30,36,25,true);}
function ch(label,x,y,w=47,h=26){rich([{text:'ch ',options:{italic:false}},{text:String(label),options:{italic:label==='C'}}],x,y,w,h,18);}
function variable(v,sub='',color=C.ink){return [{text:v,options:{italic:true,color}},...(sub?[{text:sub,options:{subscript:true,italic:!/^\d+$/.test(sub),color}}]:[])];}
const sin=(f,phase=0,amp=1)=>Array.from({length:72},(_,i)=>amp*Math.cos(2*Math.PI*f*i/71+phase));
const modes=[Array.from({length:72},(_,i)=>(.73+.21*Math.cos(2*Math.PI*1.4*i/71))*Math.cos(2*Math.PI*3.6*i/71)),sin(7.2,.4,.65),sin(11.5,-.3,.4)];
const colors=[C.teal,C.purple,C.orange],sum=r=>modes[0].map((v,i)=>(v+(r===1?0:modes[1][i])*(r===2?.75:1)+modes[2][i]*(r===2?1.2:1))/1.9);
const spec={slide:1,canvas:[1280,800],paths:[],groups:[]};
function flow(label,segments,width=5,head=true,hw=width*3,hl=width*2){spec.paths.push({name:stage+'__'+label,segments,width,head,head_width:hw,head_length:hl});}
function straight(label,x,y,xx,yy,width=3.8,head=false){flow(label,[[[x,y],[x+(xx-x)/3,y+(yy-y)/3],[x+2*(xx-x)/3,y+2*(yy-y)/3],[xx,yy]]],width,head);}
function small(label,x,y,xx,yy,bend=9,width=4,hw=11,hl=7){flow(label,[[[x,y],[x+(xx-x)*.25,y-bend],[x+(xx-x)*.68,yy],[xx,yy]]],width,true,hw,hl);}

panel(1,'Candidate representations',18,18,454,475,C.navy);
rich([{text:'Observations  ',options:{}},{text:'X',options:{bold:true,italic:false}}],45,89,188,31,22,'center');
for(let r=0;r<3;r++){ch(r<2?r+1:'C',42,130+r*34);line(91,146+r*34,231,146+r*34,'DDE2E6',.65);wave(91,133+r*34,140,26,sum(r));}
text('Candidate domain',265,91,175,26,21,false,'center');
rich(variable('p'),334,115,22,20,22,'center');rich(variable('q'),268,163,22,23,22,'center');
for(let r=0;r<4;r++)for(let c=0;c<4;c++){const invalid=c+r<3,x=302+c*25,y=138+r*21;rect(x,y,22,18,invalid?'E6E9EC':'EAF1F8',invalid?'AEB7C0':'8FAAC4',.7);if(invalid){line(x+3,y+3,x+19,y+15,'A9B2BB',.7);line(x+3,y+10,x+10,y+15,'A9B2BB',.7);}}
rect(267,231,12,10,'E6E9EC',C.gray,.6);line(268,232,277,240,C.gray,.7);text('Excluded',285,224,68,24,17);
rect(365,231,12,10,'EAF1F8','8FAAC4',.6);text('Valid',384,224,54,24,18);
flow('input_to_model',[[[157,230],[157,251],[183,250],[183,275]]],5.3,true,16,11);
flow('candidate_to_model',[[[329,247],[329,257],[310,256],[310,275]]],5.3,true,16,11);
rich([{text:'('},...variable('p','i'),{text:', '},...variable('q','i'),{text:')'}],347,246,91,25,22,'center');
rect(101,279,312,73,'EDF4EE',C.green,1.1,true);
const membership=[[.72,.23,.05],[.18,.73,.09],[.06,.17,.77]];
membership.forEach((row,r)=>row.forEach((v,c)=>rect(127+c*25,295+r*15,22,12,blend(C.green,v),'BCCDBE',.6)));
text('Model',220,285,177,31,26,true,'center');text('Candidate fit',219,317,179,25,19,false,'center');
text('Returned modes',102,359,172,27,21);rich([{text:'U',options:{bold:true}},{text:'i',options:{subscript:true}}],281,359,36,27,24,'center');
flow('model_to_modes',[[[335,354],[363,354],[375,370],[375,393]]],6,true,17,12);
for(let r=0;r<3;r++){const y=398+r*28;ch(r<2?r+1:'C',43,y-2);for(let k=0;k<3;k++){const x=103+k*102;rect(x,y,92,23,'F8FAFB','D3DADF',.65);wave(x+4,y+3,84,17,r===1&&k===1?sin(1,0,0):modes[k],colors[k],1.3);}}

panel(2,'Output-quality evaluation',500,18,762,475,C.purple);
text('Measurements from returned representations',533,72,490,26,19);
rich([{text:'Fixed settings  '},{text:'θ',options:{italic:true}}],1060,72,173,26,19,'right');
const centers=[629,880,1131];
['Signal fidelity','Spectral structure','Model complexity'].forEach((t,i)=>text(t,centers[i]-110,127,220,31,22,true,'center'));
const observed=sum(0).map((v,i)=>v+.04*Math.sin(i*.64));
line(543,249,716,249,'DDE2E6',.7);wave(543,184,173,59,observed,'9A9FA5',2.2,true);wave(543,184,173,59,sum(0),C.blue,1.6);
line(546,278,560,278,'9A9FA5',1.8,true);text('Input',566,265,49,27,18);line(633,278,647,278,C.blue,1.6);text('Sum',653,265,48,27,18);
const spectra=[[[.24,.065],C.teal],[[.5,.08],C.purple],[[.77,.06],C.orange]];
for(let j=0;j<3;j++){const x=785,y=177+j*37,w=190,h=29,values=Array.from({length:64},(_,i)=>Math.exp(-.5*((i/63-spectra[j][0][0])/spectra[j][0][1])**2));line(x,y+h,x+w,y+h,'DDE2E6',.7);for(let i=1;i<values.length;i++)line(x+(i-1)*w/63,y+h*(1-values[i-1]),x+i*w/63,y+h*(1-values[i]),spectra[j][1],1.6);}
text('Frequency bins',786,291,190,25,18,false,'center');
for(let set=0;set<2;set++){const energy=set?[.25,.25,.25,.25]:[.86,.09,.05,0],xx=1049+set*86;energy.forEach((v,k)=>rect(xx+k*15,253-v*60,11,Math.max(.8,v*60),set?C.purple:'6F8396',set?C.purple:'6F8396',.1));line(xx-3,254,xx+59,254,'DDE2E6',.7);}
small('energy_redistribution',1113,215,1131,215,8,3.6,10,7);text('Same total energy',1042,274,186,27,18,false,'center');
for(const [i,v] of ['F','S','P'].entries()){rich(variable(v,'i'),centers[i]-38,326,76,38,35,'center');flow('factor_'+i,[[[centers[i]-12,365],[centers[i]-4,365],[centers[i],373],[centers[i],383]]],4.3,true,12,8);}
straight('factor_bus',629,383,1131,383,3.8);flow('combined_score',[[[868,383],[876,383],[880,391],[880,402]]],4.4,true,12,8);
text('One numerical score for each candidate',635,399,488,27,21,false,'center');
const scoreParts=[...variable('Q','i'),{text:' = Q',options:{italic:true}},{text:'('},{text:'X',options:{bold:true}},{text:', '},{text:'U',options:{bold:true}},{text:'i',options:{subscript:true}},{text:'; '},{text:'θ',options:{italic:true}},{text:')'}];
rich(scoreParts,654,435,453,40,29,'center');

stage='shared';
flow('input_data_branch',[[[235,104],[260,73],[422,65],[459,85]],[[459,85],[475,94],[476,104],[495,104]]],3.5,false);
flow('returned_data_branch',[[[411,438],[503,438],[439,104],[495,104]]],5,false);
straight('data_bus',495,104,1131,104,3.8);
centers.forEach((x,i)=>flow('measurement_'+i,[[[x-12,104],[x-4,104],[x,111],[x,121]]],4.1,true,11.5,7.5));

panel(3,'Maximum-score selection',800,515,462,267,C.teal);
rich(scoreParts,822,572,326,28,22);
rect(1160,580,12,12,C.blue,C.blue,.2);text('Selected',1179,571,72,27,18,false,'left',{color:C.blue});
const bx=[842,919,996,1195],scores=[.37,.62,.86,.45];line(827,698,1240,698,'A9B4BD',.8);
scores.forEach((v,i)=>rect(bx[i],697-v*102,27,v*102,i===2?C.blue:'D5DEE6',i===2?C.blue:'AAB5BE',.7));
for(const [index,x] of [[1,830],[2,907],[3,979],['M',1181]])rich(variable('Q',String(index),index===3?C.blue:C.ink),x,704,58,32,28,'center');
text('···',1062,648,41,30,23,false,'center');
rich([{text:'Select the candidate with the largest '},...variable('Q','i')],821,744,418,27,20,'center');

panel(4,'Selected representation',18,515,754,267,C.blue);
rich([{text:'('},{text:'p',options:{italic:true}},{text:'*',options:{superscript:true}},{text:', '},{text:'q',options:{italic:true}},{text:'*',options:{superscript:true}},{text:')'}],608,527,132,31,25,'center');
text('Selected modes',162,568,237,27,21,true,'center');text('Reconstruction',538,568,200,27,21,true,'center');text('Sum over\nmodes',434,568,91,43,18,false,'center');
for(const [index,x] of [[1,85],[2,211],['p',338]])rich(variable('u',String(index),colors[index===1?0:index===2?1:2]),x,596,90,31,25,'center');
for(let r=0;r<3;r++){const y=634+r*45;ch(r<2?r+1:'C',33,y-4,45,27);for(let k=0;k<3;k++){const x=87+k*126;rect(x,y-7,103,36,'F8FAFB','D3DADF',.65);wave(x+4,y-2,95,26,r===1&&k===1?sin(1,0,0):modes[k],colors[k],1.4);}text('···',319,y-5,23,27,18,false,'center');
 small('to_sum_'+r,444,y+10,460,y+10,8,3.5,9.5,6);slide.addShape(SH.ellipse,{...pos(462,y-4,29,29),objectName:id('sum'),fill:{color:'FFFFFF'},line:{color:C.ink,width:.75}});text('Σ',466,y-3,21,25,22,false,'center');small('to_reconstruction_'+r,493,y+10,521,y+10,10,4.3,12,8.5);
 const clean=sum(r),raw=clean.map((v,i)=>v+.025*Math.sin(i*.71));line(526,y+11,742,y+11,'E3E7EA',.55);wave(526,y-3,216,27,raw,'A4A9AE',2,true);wave(526,y-3,216,27,clean,C.blue,1.5);
}
line(538,768,552,768,'A4A9AE',1.8,true);text('Input',559,755,47,26,18);line(626,768,640,768,C.blue,1.6);text('Mode sum',648,755,89,26,18);
stage='shared';flow('evaluation_to_selection',[[[1019,495],[1027,495],[1031,502],[1031,512]]],4.8,true,13,8);small('selection_to_output',798,658,775,658,13,5.2,14,10);
const boxes=[[18,18,454,475],[500,18,762,475],[800,515,462,267],[18,515,754,267]];
['Candidate representations','Output-quality evaluation','Maximum-score selection','Selected representation'].forEach((label,i)=>spec.groups.push({prefix:'panel'+(i+1)+'__',name:String(i+1).padStart(2,'0')+' '+label,box:boxes[i]}));
slide.addNotes('Illustrative method schematic. Signals, candidate states, memberships, spectra and candidate scores demonstrate visual grammar. Replace the model, constraints, measurements and selection rule with the current scientific method. Objects and arrows are editable; ch C uses the same font size as ch 1 and ch 2.');
(async()=>{
 const base=path.join(build,'base.pptx'),specPath=path.join(build,'arrows.json');await pptx.writeFile({fileName:base});fs.writeFileSync(specPath,JSON.stringify(spec,null,2));
 const run=spawnSync(python,[path.join(__dirname,'curved_arrows.py'),'--source',base,'--spec',specPath,'--output',out],{encoding:'utf8'});
 if(run.error)throw run.error;if(run.status!==0)throw Error(run.stderr||'Arrow helper failed');
 const record={illustrative:true,not_research_results:true,layout:'Clockwise functional regions; aligned dual inputs, centered model, aligned returns; count is example-specific',canvas:spec.canvas,palette:C,membership,candidate_scores:scores,curved_paths:spec.paths,functional_groups:spec.groups,validation:JSON.parse(run.stdout),generator:path.basename(__filename)};
 fs.writeFileSync(out.replace(/\.pptx$/i,'.source.json'),JSON.stringify(record,null,2));console.log('Wrote editable curved-arrow demonstration: '+out);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
