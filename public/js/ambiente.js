(() => {
  'use strict';
  const splash=document.querySelector('.splash-screen');
  const splashKey='palhaco-splash-v1';
  if(splash && !document.documentElement.classList.contains('splash-seen')){
    window.setTimeout(()=>{splash.hidden=true;try{sessionStorage.setItem(splashKey,'1');}catch{}},3900);
  }

  const button=document.querySelector('.music-toggle');
  if(!button)return;
  const AudioEngine=window.AudioContext||window.webkitAudioContext;
  if(!AudioEngine){button.hidden=true;return;}
  const preferenceKey='palhaco-music-preference-v1',positionKey='palhaco-music-position-v1',activeKey='palhaco-music-active-v1';
  const get=(storage,key)=>{try{return storage.getItem(key)}catch{return null}};
  const set=(storage,key,value)=>{try{storage.setItem(key,value)}catch{}};
  let desired=get(localStorage,preferenceKey)!=='off';
  let context=null,master=null,timer=null,playing=false,starting=false,hiddenPause=false;
  let offset=Number(get(sessionStorage,positionKey))||0,anchor=0,nextBeat=0;
  const beat=60/104;
  // Melodia original em compasso ternário; sintetizada localmente, sem gravação de terceiros.
  const melody=[72,76,79,74,77,81,76,74,71,72,79,76,69,72,76,67,71,74,65,69,72,67,71,74,
                76,79,83,74,77,81,72,76,79,71,74,77,69,72,76,74,71,67,72,76,74,72,67,72];
  const bass=[48,48,48,50,50,50,55,55,55,48,48,48,45,45,45,47,47,47,53,53,53,55,55,55,
              48,48,48,50,50,50,48,48,48,55,55,55,45,45,45,55,55,55,48,48,48,48,48,48];
  const loopSeconds=melody.length*beat;
  const hz=n=>440*Math.pow(2,(n-69)/12);
  function tone(note,when,length,level,type){
    const osc=context.createOscillator(),envelope=context.createGain();
    osc.type=type;osc.frequency.setValueAtTime(hz(note),when);
    envelope.gain.setValueAtTime(.0001,when);envelope.gain.exponentialRampToValueAtTime(level,when+.035);
    envelope.gain.exponentialRampToValueAtTime(.0001,when+length);
    osc.connect(envelope);envelope.connect(master);osc.start(when);osc.stop(when+length+.02);
    osc.onended=()=>{osc.disconnect();envelope.disconnect();};
  }
  function schedule(){
    if(!playing||!context||context.state!=='running')return;
    const until=context.currentTime+.22;
    while(anchor+(nextBeat*beat-offset)<until){
      const when=anchor+(nextBeat*beat-offset),index=((nextBeat%melody.length)+melody.length)%melody.length;
      if(when>=context.currentTime-.04){
        const at=Math.max(when,context.currentTime+.002);
        tone(melody[index],at,beat*.72,.19,'triangle');
        if(index%3===0)tone(bass[index],at,beat*.78,.11,'sine');
        else tone(bass[index]+(index%3===1?7:12),at,beat*.48,.055,'sine');
      }
      nextBeat++;
    }
  }
  function updateButton(){
    button.setAttribute('aria-pressed',String(playing));
    button.setAttribute('aria-label',playing?'Desativar música ambiente':'Ativar música ambiente');
    button.setAttribute('title',playing?'Desativar música ambiente':'Ativar música ambiente');
    button.dataset.playing=String(playing);
    button.querySelector('.music-icon').textContent=playing?'♫':'♪';
  }
  function savePosition(){
    if(playing&&context)offset=((offset+context.currentTime-anchor)%loopSeconds+loopSeconds)%loopSeconds;
    set(sessionStorage,positionKey,String(offset));set(sessionStorage,activeKey,playing&&desired?'1':'0');
    if(context)anchor=context.currentTime;
  }
  async function start(){
    if(!desired||playing||starting||document.visibilityState!=='visible')return;
    starting=true;
    try{
      if(!context){context=new AudioEngine();master=context.createGain();master.gain.value=.11;master.connect(context.destination);}
      if(context.state!=='running')await Promise.race([context.resume(),new Promise(resolve=>setTimeout(resolve,500))]);
      if(context.state!=='running')return;
      anchor=context.currentTime;nextBeat=Math.ceil(offset/beat);playing=true;hiddenPause=false;
      set(sessionStorage,activeKey,'1');schedule();timer=window.setInterval(schedule,120);updateButton();
    }catch{updateButton();}finally{starting=false;}
  }
  function pause(rememberActive=false){
    if(playing)savePosition();
    clearInterval(timer);timer=null;playing=false;
    if(context&&context.state==='running')void context.suspend().catch(()=>{});
    set(sessionStorage,activeKey,rememberActive&&desired?'1':'0');updateButton();
  }
  button.addEventListener('click',()=>{
    if(playing){desired=false;set(localStorage,preferenceKey,'off');pause();}
    else{desired=true;set(localStorage,preferenceKey,'on');void start();}
  });
  function firstInteraction(event){
    if(event.target instanceof Element&&event.target.closest('.music-toggle'))return;
    if(desired&&!playing)void start();
  }
  document.addEventListener('pointerdown',firstInteraction,{passive:true});
  document.addEventListener('keydown',firstInteraction);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'&&playing){hiddenPause=true;pause(true);}
    else if(document.visibilityState==='visible'&&hiddenPause&&desired)void start();
  });
  window.addEventListener('pagehide',()=>{if(playing)savePosition();});
  updateButton();
  // Uma navegação normal recria a página; retoma do ponto salvo quando o navegador permitir.
  // Tenta iniciar imediatamente; se houver bloqueio, a próxima interação tenta novamente.
  if(desired)void start();
})();
