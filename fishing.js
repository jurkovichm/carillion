/* Presentation layer. Question bank, answer matching and summary stay in index.html. */
const bridgeImage=new Image();
const bridgePixels=document.createElement('canvas');
bridgePixels.width=320;bridgePixels.height=534;
let bridgeReady=false;
bridgeImage.onload=()=>{
 const ctx=bridgePixels.getContext('2d');ctx.imageSmoothingEnabled=false;
 ctx.drawImage(bridgeImage,0,0,320,534);
 // One fixed pixel grid and palette: no blended shades within a pixel.
 const palette=['#073d40','#084b52','#0b5968','#11687b','#177d88','#26989b','#48b9b1','#77cbbc','#113e2d','#175535','#216944','#287d46','#36964c','#4aaa51','#68b957','#87ca63','#a6d875','#c0e58f','#343b3b','#465452','#5c6d63','#819382','#a6b49a','#cbd1af','#e5dfb9','#49382d','#634632','#815a39','#a17143','#bc9155','#d5ad6c','#efcd87'].map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));
 const pixels=ctx.getImageData(0,0,320,534);
 for(let i=0;i<pixels.data.length;i+=4){let best=palette[0],distance=Infinity;for(const color of palette){const d=(pixels.data[i]-color[0])**2+(pixels.data[i+1]-color[1])**2+(pixels.data[i+2]-color[2])**2;if(d<distance){distance=d;best=color}}pixels.data[i]=best[0];pixels.data[i+1]=best[1];pixels.data[i+2]=best[2];}
 ctx.putImageData(pixels,0,0);bridgeReady=true;
};
bridgeImage.src='assets/fishing-world-extended.png';
const fishSprites = {};
const fishFiles = {10:'Cenrarchidae/Panfish/bluegill_panfish.png',15:'Percidae/Perch/yellow_perch.png',30:'Cenrarchidae/Bass/large_mouth_bass.png',60:'Percidae/Walleye/walleye.png',85:'Ictaluridae/Catfish/channel_catfish.png',100:'Esocidae/Muskie/muskie.png'};
Object.entries(fishFiles).forEach(([points,path])=>{const img=new Image();img.src='sprites/NewRiverFishAssetPack1.0/'+path;fishSprites[points]=img;});
const caughtFish = [];
let fishingCatch = null, catchTimers = [], fishingBusy = false;
const fishColors = {10:'#b5c4a2',15:'#e6a354',30:'#68c9cf',60:'#e67668',85:'#b99be9',100:'#ffe080'};
const reducedFishingMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CATCH_REVEAL_MS=reducedFishingMotion?300:1500;
const CATCH_FLIGHT_MS=reducedFishingMotion?0:1400;
const CATCH_SETTLE_MS=reducedFishingMotion?900:100;
const fishingViewport=document.getElementById('game');
let fishingWidth=innerWidth,fishingHeight=innerHeight,keyboardOpen=false;
resizeScene = function(){
 const dpr=Math.min(devicePixelRatio||1,2),width=Math.round(fishingViewport.clientWidth*dpr),height=Math.round(fishingViewport.clientHeight*dpr);
 if(scene.width!==width)scene.width=width;
 if(scene.height!==height)scene.height=height;
};
function updateFishingViewport(){
 const viewport=window.visualViewport;
 const typing=document.activeElement===document.getElementById('answerInput');
 if(innerWidth!==fishingWidth){fishingWidth=innerWidth;fishingHeight=innerHeight;}
 const visibleHeight=viewport?.height||innerHeight;
 const touchDevice=navigator.maxTouchPoints>0;
 // Keep the world at its pre-keyboard size, including during keyboard dismissal.
 keyboardOpen=(typing||keyboardOpen)&&(touchDevice||visibleHeight<innerHeight-120)&&(!viewport||viewport.scale===1)&&fishingHeight-visibleHeight>120;
 if(!keyboardOpen&&(!typing||!touchDevice||innerHeight>=fishingHeight))fishingHeight=innerHeight;
 fishingViewport.style.setProperty('--game-height',fishingHeight+'px');
 fishingViewport.style.setProperty('--viewport-top',(keyboardOpen?viewport?.offsetTop||0:0)+'px');
 fishingViewport.style.setProperty('--keyboard-inset',(keyboardOpen?Math.max(0,fishingHeight-visibleHeight):0)+'px');
 fishingViewport.classList.toggle('keyboard-open',keyboardOpen);
 resizeScene();
}
setDepth = function(){targetDepth=0;diveDepth=0;cameraTarget=0;camera=0;};
function drawCatchFish(x,y,points,rotation=0){
 const p=paint,s=2*(1+points/180)*(innerWidth<650?1.6:1);p.save();p.translate(x,y);p.rotate(rotation);p.scale(s,s);
 const sprite=fishSprites[points];
 if(sprite?.complete&&sprite.naturalWidth){p.imageSmoothingEnabled=false;const width=points>=60?65:45,height=width*sprite.naturalHeight/sprite.naturalWidth;p.drawImage(sprite,-width/2,-height/2,width,height);p.restore();return;}
 p.fillStyle='#16392c70';p.fillRect(-15,7,32,4);
 p.fillStyle=fishColors[points];p.beginPath();p.moveTo(-13,0);p.lineTo(-22,-9);p.lineTo(-22,9);p.closePath();p.fill();
 p.fillRect(-13,-7,24,14);p.fillRect(-8,-10,15,20);p.fillRect(11,-4,5,8);
 p.fillStyle='#fff5ce99';p.fillRect(-6,-6,14,3);p.fillRect(-7,5,16,3);
 p.fillStyle='#234039';p.fillRect(8,-4,3,3);p.fillRect(-4,-2,2,5);p.fillRect(1,-2,2,5);
 p.fillStyle=fishColors[points];p.fillRect(-5,-14,7,5);p.restore();
}
function shoreCatchPosition(index){
 // Tightly overlapping catches build a visible pile within the marked left bank.
 const col=index%5,row=Math.floor(index/5);
 return {x:220+col*43+(row%2)*12,y:575-Math.min(row,10)*17};
}
function drawCatchItem(item,x,y,rotation=0){
 if(item.kind==='fish')drawCatchFish(x,y,item.points,rotation);
 else drawLoot(x,y,item.kind,rotation);
}
animateScene = function(now){
 requestAnimationFrame(animateScene);
 const p=paint,w=fishingViewport.clientWidth,h=fishingViewport.clientHeight,t=reducedFishingMotion?0:now/1000,mobile=w<650;
 p.setTransform(scene.width/w,0,0,scene.height/h,0,0);p.imageSmoothingEnabled=false;p.fillStyle='#143f36';p.fillRect(0,0,w,h);
 // Extended world uses the same horizontal grid; the bridge band begins 1107 units down.
 const worldWidth=2048,worldHeight=worldWidth*534/320,bridgeOffset=1107;
 const scale=Math.max(w/worldWidth,h/worldHeight),iw=worldWidth*scale,ih=worldHeight*scale,ox=(w-iw)/2;
 const worldY=Math.max(h-ih,Math.min(0,h*.44-(bridgeOffset+392)*scale));
 if(bridgeReady)p.drawImage(bridgePixels,ox,worldY,iw,ih);
 const oy=worldY+bridgeOffset*scale;
 p.save();p.translate(ox,oy);p.scale(scale,scale);
 $('#catchCaption').style.left=Math.max(12,ox+135*scale)+'px';$('#catchCaption').style.right='auto';
 $('#catchCaption').style.top=Math.min(h-30,oy+650*scale)+'px';
 const reeling=!!fishingCatch&&!fishingCatch.revealed;
 drawFisherman(t,reeling);
 const bobX=1100,bobY=756+Math.sin(t*2)*(reeling?8:3);
 if(!reeling){p.strokeStyle='#edf0c394';p.lineWidth=2;p.beginPath();p.moveTo(1100,320);p.quadraticCurveTo(1100,530,bobX,bobY);p.stroke();}
 for(let i=0;i<7;i++){p.strokeStyle='#c7eed330';p.lineWidth=2;p.beginPath();p.ellipse(750+(i*113)%520,710+(i*79)%340,18+Math.sin(t+i)*7,3,0,0,Math.PI*2);p.stroke();}
 p.fillStyle='#f1e2b0';p.fillRect(bobX-4,bobY-8,8,8);p.fillStyle='#ce7959';p.fillRect(bobX-4,bobY,8,5);
 p.strokeStyle='#e3ecd870';p.beginPath();p.ellipse(bobX,bobY+7,18+Math.sin(t*3)*5,5,0,0,Math.PI*2);p.stroke();
 if(typeof shoreCatches!=='undefined')shoreCatches.forEach((item,i)=>{const pos=shoreCatchPosition(i);drawCatchItem(item,pos.x,pos.y,i%2?.15:-.12);});
 if(fishingCatch?.revealed){
   const a=reducedFishingMotion?1:Math.max(0,Math.min(1,(now-fishingCatch.revealedAt)/CATCH_FLIGHT_MS)),target=fishingCatch.target;
   drawCatchItem(fishingCatch,1100+(target.x-1100)*a,756+(target.y-756)*a-Math.sin(a*Math.PI)*275,reducedFishingMotion?0:-.6+a*1.1);
 }
 p.restore();
};

updateFishingViewport();
addEventListener('resize',updateFishingViewport);
window.visualViewport?.addEventListener('resize',updateFishingViewport);
window.visualViewport?.addEventListener('scroll',updateFishingViewport);
document.getElementById('answerInput').addEventListener('focus',updateFishingViewport);
document.getElementById('answerInput').addEventListener('blur',updateFishingViewport);
