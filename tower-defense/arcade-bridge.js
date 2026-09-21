window.stopArcadeAudio = () => { sounds.enabled = false; sounds.context?.close().catch(() => {}); };
window.addEventListener("pagehide", window.stopArcadeAudio);
