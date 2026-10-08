/* Browser-only Alert Sample Studio. Audio source bytes never leave this tab. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const core = window.CFSAudioSampleCore;
    const root = document.getElementById('alertToneStudio');
    if (!root || !core) return;
    const $ = id => root.querySelector(`#${id}`);
    const fileInput = $('toneFile'), drop = $('toneDrop'), status = $('toneStatus');
    const controls = ['toneStart','toneEnd','toneFadeIn','toneFadeOut','toneGain','tonePeakLimit'].map($);
    const play = $('tonePlay'), stop = $('toneStop'), download = $('toneDownload');
    const canvas = $('toneWave'), ctx = canvas.getContext('2d');
    let audioContext = null, decoded = null, activeSource = null, sourceName = 'alert-sound', loadId = 0;
    const announce = (message, error = false) => { status.textContent = message; status.className = `notice ${error ? 'danger' : ''}`; };
    const fmt = n => `${Number(n).toFixed(2).replace('.', ',')} s`;
    const audio = () => {
      if (!audioContext) {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioClass) throw new Error('Dieser Browser unterstützt Web Audio nicht.');
        audioContext = new AudioClass();
      }
      return audioContext;
    };
    function halt() {
      if (activeSource) {
        const src = activeSource;
        activeSource = null;
        src.onended = null;
        try { src.stop(); } catch (_) { /* already ended */ }
        try { src.disconnect(); } catch (_) { /* disconnected */ }
      }
      stop.disabled = true;
      play.textContent = '▶ AUSSCHNITT ANHÖREN';
    }
    function setEnabled(yes) {
      for (const item of [...controls, play, download]) item.disabled = !yes;
      stop.disabled = true;
    }
    const opts = () => ({start:Number($('toneStart').value), end:Number($('toneEnd').value), fadeIn:Number($('toneFadeIn').value), fadeOut:Number($('toneFadeOut').value), gainDb:Number($('toneGain').value), peakLimit:$('tonePeakLimit').checked});
    function labels() {
      $('toneStartText').textContent = fmt($('toneStart').value);
      $('toneEndText').textContent = fmt($('toneEnd').value);
      $('toneGainText').textContent = `${Number($('toneGain').value)>0?'+':''}${$('toneGain').value} dB`;
      $('toneFadeInText').textContent = fmt($('toneFadeIn').value);
      $('toneFadeOutText').textContent = fmt($('toneFadeOut').value);
      if (decoded) {
        try { const s = core.sanitizeSelection(decoded, opts()); $('toneSelection').textContent = `Ausschnitt: ${fmt(s.duration)} · WAV, ${decoded.numberOfChannels === 1 ? 'Mono' : 'Stereo'} · ${(decoded.sampleRate/1000).toFixed(1).replace('.', ',')} kHz`; }
        catch (e) { $('toneSelection').textContent = e.message; }
      }
    }
    function waveform() {
      if (!ctx) return;
      const {width:w,height:h} = canvas;
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle = '#0b1225'; ctx.fillRect(0,0,w,h);
      if (!decoded) { ctx.fillStyle = '#9caecf'; ctx.font = '15px sans-serif'; ctx.fillText('Audiodatei auswählen, um die Wellenform anzuzeigen.', 15,h/2); return; }
      const x0 = Math.round(Number($('toneStart').value)/decoded.duration*w);
      const x1 = Math.round(Number($('toneEnd').value)/decoded.duration*w);
      ctx.fillStyle = 'rgba(14,165,233,.2)';ctx.fillRect(x0,0,Math.max(1,x1-x0),h);
      const wave = decoded.getChannelData(0), step = Math.max(1,Math.floor(wave.length/w));
      ctx.strokeStyle='#6ee7f9';ctx.lineWidth=1;ctx.beginPath();
      for(let x=0;x<w;x++){
        const start=Math.floor(x*wave.length/w),end=Math.min(wave.length, start+step);
        let min=1,max=-1;for(let i=start;i<end;i++){const v=wave[i];if(v<min)min=v;if(v>max)max=v;}
        if(end===start){min=0;max=0;}
        ctx.moveTo(x,(1-max)*h/2);ctx.lineTo(x,(1-min)*h/2);
      }
      ctx.stroke();ctx.strokeStyle='#f6c453';ctx.beginPath();ctx.moveTo(x0,0);ctx.lineTo(x0,h);ctx.moveTo(x1,0);ctx.lineTo(x1,h);ctx.stroke();
    }
    function editChanged() { halt(); labels(); waveform(); }
    for (const control of controls) control.addEventListener('input', () => {
      if (decoded && (control === $('toneStart') || control === $('toneEnd'))) {
        const begin = Number($('toneStart').value),end=Number($('toneEnd').value);
        if (control === $('toneStart') && begin >= end) $('toneEnd').value = Math.min(decoded.duration, begin + 0.01);
        if (control === $('toneEnd') && end <= begin) $('toneStart').value = Math.max(0,end-0.01);
        const currentStart = Number($('toneStart').value), currentEnd = Number($('toneEnd').value);
        if (currentEnd - currentStart > core.MAX_CLIP_SECONDS) {
          if (control === $('toneStart')) $('toneEnd').value = Math.min(decoded.duration,currentStart+core.MAX_CLIP_SECONDS);
          else $('toneStart').value = Math.max(0,currentEnd-core.MAX_CLIP_SECONDS);
        }
      }
      editChanged();
    });
    async function load(file) {
      const token = ++loadId;
      halt(); decoded = null; setEnabled(false); waveform();
      if (!file) return;
      try {
        core.checkFile(file);
        announce('Datei wird ausschließlich lokal im Browser entschlüsselt …');
        const bytes = await file.arrayBuffer();
        if (token !== loadId) return;
        const buffer = await audio().decodeAudioData(bytes);
        if (token !== loadId) return;
        core.validateBuffer(buffer);
        decoded = buffer; sourceName = file.name;
        $('toneStart').max = (buffer.duration-0.01).toFixed(2);$('toneStart').value='0';
        $('toneEnd').max=buffer.duration.toFixed(2);$('toneEnd').value=Math.min(buffer.duration,core.MAX_CLIP_SECONDS).toFixed(2);
        $('toneSource').textContent=`${file.name} · ${fmt(buffer.duration)} · lokal geladen`;
        setEnabled(true); labels(); waveform();
        announce('Sound geladen. Markiere einen Ausschnitt und höre ihn mit echten Audiodaten an. Keine Datei wurde hochgeladen.');
      } catch (error) {
        if (token!==loadId) return;
        $('toneSource').textContent='Keine Audiodatei geladen';
        announce(`Sound konnte nicht geladen werden: ${error.message || 'Unbekannter Fehler'}`,true);
      }
    }
    fileInput.addEventListener('change', () => { const f=fileInput.files?.[0];load(f);fileInput.value=''; });
    drop.addEventListener('dragover', e => {e.preventDefault();drop.classList.add('drag');});
    drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
    drop.addEventListener('drop', e => {e.preventDefault();drop.classList.remove('drag'); if (e.dataTransfer?.files?.length) load(e.dataTransfer.files[0]);});
    play.addEventListener('click', async () => {
      if (!decoded) return;
      halt();
      try {
        const context=audio();await context.resume();
        const edited=core.process(decoded,opts());
        const source=context.createBufferSource();source.buffer=core.buildPreviewBuffer(context,edited);
        source.connect(context.destination);activeSource=source;
        source.onended=()=>{if(activeSource===source){activeSource=null;stop.disabled=true;play.textContent='▶ AUSSCHNITT ANHÖREN';}};
        source.start();stop.disabled=false;play.textContent='↻ ERNEUT ANHÖREN';
        announce(`Echte Audio-Vorschau läuft (${fmt(edited.duration)}). ${edited.limited?'Pegelschutz aktiv.':''}`);
      } catch (error) {halt();announce(`Wiedergabe nicht möglich: ${error.message}`,true);}
    });
    stop.addEventListener('click',halt);
    download.addEventListener('click', () => {
      if (!decoded) return;
      try {
        halt();const edited=core.process(decoded,opts());const bytes=core.encodeWav(edited);
        const url=URL.createObjectURL(new Blob([bytes],{type:'audio/wav'}));
        const link=document.createElement('a');link.href=url;link.download=core.safeFilename(sourceName);
        document.body.appendChild(link);link.click();link.remove();
        setTimeout(()=>URL.revokeObjectURL(url),3000);
        announce(`WAV exportiert (${fmt(edited.duration)}, 16 Bit PCM). ${edited.limited?'Pegelspitzen wurden auf −1 dBFS abgesenkt.':'Keine Pegelabsenkung nötig.'} Die Datei liegt nur auf deinem Gerät.`);
      } catch (error) {announce(`WAV-Export fehlgeschlagen: ${error.message}`,true);}
    });
    window.addEventListener('pagehide', () => {halt();if (audioContext) audioContext.close().catch(()=>{});});
    setEnabled(false);labels();waveform();
  });
})();
