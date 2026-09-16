document.addEventListener("DOMContentLoaded", async () => {
  const me = await CFS.requireAuth();
  if (!me) return;

  try {
    const data = await CFS.json("/api/creator/modules/audio_studio/state");
    const s = data.state || {};
    audioApp.classList.remove("hidden");
    audioForm.preset_name.value = s.preset_name || "Mein Stream";
    audioForm.master.value = Number(s.master ?? 80);
    audioForm.voice.value = Number(s.voice ?? 85);
    audioForm.game.value = Number(s.game ?? 65);
    audioForm.soundboard.value = Number(s.soundboard ?? 70);
  } catch (error) {
    if (error.status === 403) {
      locked.textContent = `${error.message} Die Oberfläche ist bereits vorbereitet; freigeschaltet wird serverseitig über deinen Plan.`;
      locked.className = "notice warn";
      return;
    }
    locked.textContent = error.message;
    locked.className = "notice danger";
    return;
  }

  audioForm.addEventListener("submit", async event => {
    event.preventDefault();
    const state = {
      preset_name: audioForm.preset_name.value.trim(),
      master: Number(audioForm.master.value),
      voice: Number(audioForm.voice.value),
      game: Number(audioForm.game.value),
      soundboard: Number(audioForm.soundboard.value)
    };
    try {
      const saved = await CFS.json("/api/creator/modules/audio_studio/state", {
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({state})
      });
      message.textContent = `Audio Preset gespeichert · ${new Date(saved.updated_at).toLocaleString("de-DE")}`;
      message.className = "notice";
    } catch(error) {
      message.textContent = error.message;
      message.className = "notice danger";
    }
  });
});
