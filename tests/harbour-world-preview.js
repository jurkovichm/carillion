const previewJourney=document.createElement('button');
previewJourney.textContent='Preview canoe journey';
previewJourney.style.cssText='position:fixed;z-index:120;top:90px;left:12px;padding:12px;background:#163c31;color:#efcd87;border:2px solid #bc9155';
document.body.append(previewJourney);
previewJourney.onclick=async()=>{
  await Promise.all([characterSpritesReady,harbourCanoeReady,harbourArtworkReady]);
  if(harbour.phase!=='dock')return;
  Object.assign(pregameAngler,{...DOCK_BOARDING,swimming:false});
  document.body.classList.add('exploring');updateCanoePrompt();startCanoe();
};
