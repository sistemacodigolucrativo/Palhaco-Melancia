(() => {
  'use strict';
  const config = window.PALHACO_PIX;
  if (!config || typeof config.pixKey !== 'string' || typeof config.pixRecipient !== 'string' || typeof config.pixQrCode !== 'string') return;
  const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', {fatal:true});
  const key = config.pixKey.trim(), recipient = config.pixRecipient.trim(), payload = config.pixQrCode.trim();
  function tlv(bytes) {
    const result = new Map();
    for (let offset = 0; offset < bytes.length;) {
      if (offset + 4 > bytes.length) throw new Error('Campo incompleto');
      const id = decoder.decode(bytes.slice(offset,offset+2)), len = decoder.decode(bytes.slice(offset+2,offset+4));
      if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(len) || result.has(id)) throw new Error('Campo inválido');
      offset += 4; const end = offset + Number(len); if (end > bytes.length) throw new Error('Campo incompleto');
      result.set(id,bytes.slice(offset,end)); offset = end;
    }
    return result;
  }
  function crc16(bytes) {
    let crc=0xffff;
    for (const byte of bytes) {crc ^= byte << 8;for(let i=0;i<8;i++) crc = crc & 0x8000 ? ((crc<<1)^0x1021)&0xffff : (crc<<1)&0xffff;}
    return crc.toString(16).toUpperCase().padStart(4,'0');
  }
  function value(fields,id) {const item=fields.get(id);return item ? decoder.decode(item) : '';}
  function normalizeName(name) {return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,'').replace(/\s+/g,' ').trim();}
  function validConfig() {
    try {
      if (!key || !recipient || !payload || !/6304[0-9A-Fa-f]{4}$/.test(payload)) return false;
      const bytes=encoder.encode(payload), suffix=decoder.decode(bytes.slice(-4)).toUpperCase();
      if (crc16(bytes.slice(0,-4))!==suffix) return false;
      const fields=tlv(bytes), init=value(fields,'01');
      if(value(fields,'00')!=='01'||(init && init!=='11')||value(fields,'53')!=='986'||value(fields,'58')!=='BR'||fields.has('54')) return false;
      if(normalizeName(value(fields,'59'))!==normalizeName(recipient)) return false;
      let matches=0;
      for(let id=26;id<=51;id++) {
        const data=fields.get(String(id));if(!data) continue;
        const nested=tlv(data);
        if(value(nested,'00').toLowerCase()==='br.gov.bcb.pix') {
          if(value(nested,'01')!==key || nested.has('25')) return false;
          matches++;
        }
      }
      return matches===1;
    } catch {return false;}
  }
  if (!validConfig() || window.__palhacoPixInitialized) return;
  window.__palhacoPixInitialized = true;
  const sessionKey='palhaco-pix-session-v1', cooldownKey='palhaco-pix-dismissed-at';
  const duration=Number.isFinite(config.popupDelay)&&config.popupDelay>=0?config.popupDelay:10000;
  const days=Number.isFinite(config.dismissCooldownDays)&&config.dismissCooldownDays>=0?config.dismissCooldownDays:7;
  let canRemember=true;
  try {const probe='palhaco-pix-storage-check';sessionStorage.setItem(probe,'1');sessionStorage.removeItem(probe);localStorage.setItem(probe,'1');localStorage.removeItem(probe);} catch {canRemember=false;}
  let state={elapsed:0,shown:false};
  try {const saved=JSON.parse(sessionStorage.getItem(sessionKey)||'null');if(saved && Number.isFinite(saved.elapsed))state={elapsed:Math.max(0,saved.elapsed),shown:!!saved.shown};} catch {}
  const saveState=()=>{try{sessionStorage.setItem(sessionKey,JSON.stringify(state));}catch{}};
  const onCooldown=()=>{try{const t=Number(localStorage.getItem(cooldownKey));return t>0 && Date.now()-t<days*86400000;}catch{return false;}};
  const markDismissed=()=>{try{localStorage.setItem(cooldownKey,String(Date.now()));}catch{}};
  const button=document.createElement('button');button.type='button';button.className='pix-open';button.textContent='♥  Apoie essa missão';button.setAttribute('aria-haspopup','dialog');
  const modal=document.createElement('dialog');modal.className='pix-dialog';modal.setAttribute('aria-labelledby','pix-heading');modal.setAttribute('aria-describedby','pix-intro');
  modal.innerHTML=`<div class="pix-shell"><button type="button" class="pix-close" aria-label="Fechar apoio à missão">&times;</button><div class="pix-photo"><img alt="Fotografia do Palhaço Melancia durante um encontro ao ar livre" width="640" height="1458" loading="lazy"><span>♥ &nbsp; Alegria compartilhada</span></div><div class="pix-content"><p class="pix-kicker">UMA CORRENTE DE SORRISOS <span aria-hidden="true">✦</span></p><h2 id="pix-heading">Nos ajude a levar um sorriso onde já não existe mais.</h2><p class="pix-subtitle">Exercer o amor é mais bonito do que pegar.</p><p id="pix-intro">Um pequeno gesto pode ajudar a criar grandes momentos de alegria. O Palhaço Melancia leva sorrisos gratuitamente a quem mais precisa. Com a sua ajuda, essa missão pode continuar alcançando mais pessoas.</p><div class="pix-payment"><strong>Faça parte dessa corrente de sorrisos!</strong><div class="pix-qr-wrap"><canvas class="pix-qr" role="img" aria-label="QR Code Pix para contribuição voluntária"></canvas></div><p class="pix-recipient-label">Beneficiário: <strong class="pix-recipient"></strong></p><p class="pix-verify">Confira o nome do destinatário no aplicativo do seu banco antes de confirmar.</p><label for="pix-key-field">Chave Pix</label><div class="pix-copy-row"><input id="pix-key-field" readonly spellcheck="false" autocomplete="off"><button class="pix-copy" type="button"><span aria-hidden="true">⧉</span> COPIAR CHAVE PIX</button></div><p class="pix-copy-status" role="status" aria-live="polite"></p></div><div class="pix-kindness"><strong>Qualquer valor é bem-vindo!</strong><p>Não existe valor mínimo para contribuir. Cada gesto de carinho faz diferença.</p></div><p class="pix-disclosure">As contribuições são voluntárias e ajudam a apoiar as atividades solidárias do Palhaço Melancia. As visitas são gratuitas.</p><p class="pix-thanks">Obrigado por espalhar sorrisos! <span aria-hidden="true">♥</span></p></div></div>`;
  const $=selector=>modal.querySelector(selector);
  $('.pix-recipient').textContent=recipient;$('.pix-copy-row input').value=key;
  document.body.append(button,modal);
  let qrReady=null, lastFocus=null, opening=false;
  function loadQr(){
    if(qrReady)return qrReady;
    qrReady=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/js/pix-qr.js';script.onload=()=>window.PixQr?resolve():reject(new Error('QR Code indisponível'));script.onerror=()=>reject(new Error('QR Code indisponível'));document.head.append(script);})
      .then(()=>window.PixQr.toCanvas($('.pix-qr'),payload,{width:240,margin:4,errorCorrectionLevel:'M',color:{dark:'#000000',light:'#ffffff'}}));
    return qrReady;
  }
  async function openPopup() {
    if(opening||modal.open||document.querySelector('dialog[open]')||document.querySelector('.nav.open'))return false;
    opening=true;lastFocus=document.activeElement;
    try {
      await loadQr();
      if(document.querySelector('dialog[open]')||document.querySelector('.nav.open')||document.visibilityState!=='visible')return false;
      $('.pix-photo img').src='/img/apoio-palhaco.webp';
      $('.pix-copy-status').textContent='';modal.showModal();$('.pix-close').focus();
      state.shown=true;saveState();return true;
    } catch {qrReady=null;return false;} finally{opening=false;}
  }
  button.addEventListener('click',()=>void openPopup());
  $('.pix-close').addEventListener('click',()=>modal.close());
  modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});
  modal.addEventListener('close',()=>{markDismissed();if(lastFocus && typeof lastFocus.focus==='function' && lastFocus.isConnected)lastFocus.focus();});
  $('.pix-copy').addEventListener('click',async()=>{
    const field=$('#pix-key-field'),feedback=$('.pix-copy-status');
    try{
      if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(key);
      else {field.focus();field.select();if(!document.execCommand('copy'))throw new Error('Cópia indisponível');field.setSelectionRange(0,0);}
      feedback.textContent='Chave Pix copiada!';
    }catch{field.focus();field.select();feedback.textContent='Não foi possível copiar. Selecione e copie a chave manualmente.';}
  });
  let last=performance.now(), wasVisible=document.visibilityState==='visible';
  function tick(){
    const now=performance.now();if(wasVisible)state.elapsed+=Math.max(0,now-last);last=now;wasVisible=document.visibilityState==='visible';saveState();
    if(canRemember&&wasVisible&&state.elapsed>=duration&&(!config.showOncePerSession||!state.shown)&&!onCooldown())void openPopup();
  }
  setInterval(tick,1000);
  document.addEventListener('visibilitychange',tick);
  window.addEventListener('pagehide',tick);
})();
