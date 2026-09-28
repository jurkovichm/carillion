// Character and loot atlases are sampled once into small, crisp game sprites.
const fishermanChoices = [
  {id:'regular', name:'Lakeside Regular', short:'Regular', description:'A trusty hat and a well-worn fishing vest.'},
  {id:'student', name:'Student Angler', short:'Student', description:'Carleton blue, gold, and a little ambition.'},
  {id:'professor', name:'Old Professor', short:'Professor', description:'A patient angler with a lifetime of stories.'}
];
let selectedFisherman = 1;
try { const saved = localStorage.getItem('carillion-character'); const index = fishermanChoices.findIndex(c=>c.id===saved); if(index>=0)selectedFisherman=index; } catch {}
let rewardStage = 0;
const characterFrames = [], lootFrames = {};

function sampleSprite(image, x, y, width, height, targetHeight) {
  const source=document.createElement('canvas');source.width=width;source.height=height;
  const ctx=source.getContext('2d');ctx.drawImage(image,x,y,width,height,0,0,width,height);
  const data=ctx.getImageData(0,0,width,height).data;
  let left=width,top=height,right=0,bottom=0;
  for(let py=0;py<height;py++)for(let px=0;px<width;px++)if(data[(py*width+px)*4+3]>128){left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);}
  if(left>right)return source;
  const sprite=document.createElement('canvas');sprite.height=targetHeight;sprite.width=Math.max(1,Math.round((right-left+1)/(bottom-top+1)*targetHeight));
  const out=sprite.getContext('2d');out.imageSmoothingEnabled=false;
  out.drawImage(source,left,top,right-left+1,bottom-top+1,0,0,sprite.width,sprite.height);
  const pixels=out.getImageData(0,0,sprite.width,sprite.height);
  for(let i=3;i<pixels.data.length;i+=4)pixels.data[i]=pixels.data[i]>128?255:0;
  out.putImageData(pixels,0,0);return sprite;
}

const characterAtlas = new Image();
const characterSpritesReady = new Promise((resolve,reject)=>{
  characterAtlas.onload=()=>{
    const cw=Math.floor(characterAtlas.naturalWidth/3);
    // Explicit transparent gutters keep the next row's cap out of each crop.
    const rows=[[26,348],[369,704],[721,1055],[1073,1417]];
    for(let row=0;row<4;row++){
      characterFrames[row]=[];
      const [top,bottom]=rows[row];
      for(let col=0;col<3;col++)characterFrames[row][col]=sampleSprite(characterAtlas,col*cw,top,cw,bottom-top,56);
    }
    resolve();
  };
  characterAtlas.onerror=()=>reject(new Error('Character artwork could not load.'));
});
characterAtlas.src='assets/fishermen-atlas.png';

const lootAtlas=new Image();
lootAtlas.onload=()=>{
  const cw=Math.floor(lootAtlas.naturalWidth/3),ch=lootAtlas.naturalHeight;
  ['boot','skeleton','bottle'].forEach((kind,col)=>lootFrames[kind]=sampleSprite(lootAtlas,col*cw,0,cw,ch,32));
};
lootAtlas.src='assets/loot-atlas.png';

function drawFisherman(time, reeling) {
  const sprite=characterFrames[rewardStage]?.[selectedFisherman];if(!sprite)return;
  const actorHeight=206,actorWidth=actorHeight*sprite.width/sprite.height;
  const actorX=950-actorWidth/2,actorY=480-actorHeight;
  paint.save();paint.translate(950,480);
  if(reeling&&!reducedFishingMotion)paint.rotate(Math.sin(time*7)*.025);
  paint.imageSmoothingEnabled=false;
  paint.drawImage(sprite,actorX-950,actorY-480,actorWidth,actorHeight);
  paint.restore();
  // Repaint only the foreground rail and posts from the original scene.
  // The body remains visible through its open gaps, with feet on the deck.
  if(bridgeReady)for(const [x,y,w,h] of [[120,232,77,5],[120,247,77,4],[146,229,5,32],[194,230,5,35]]){
    paint.drawImage(bridgePixels,x,y,w,h,x*6.4,y*6.4-1107,w*6.4,h*6.4);
  }
  paint.strokeStyle='#d6b56d';paint.lineWidth=5;paint.beginPath();paint.moveTo(1003,379);
  paint.quadraticCurveTo(1040,reeling?290:305,1100,320);paint.stroke();
}

function drawLoot(x,y,kind,rotation=0){
  const sprite=lootFrames[kind];if(!sprite)return;
  paint.save();paint.translate(x,y);paint.rotate(rotation);paint.imageSmoothingEnabled=false;
  const h=kind==='skeleton'?90:100,w=h*sprite.width/sprite.height;
  paint.drawImage(sprite,-w/2,-h/2,w,h);paint.restore();
}
