// Read only the playback indicators owned by the supplied music players.
// Re-scan live documents so removed messages/iframes cannot leave a stale state.
export function isMusicPlaying(doc=document, depth=0) {
  try {
    if(doc.querySelector('.ll-player.is-playing')) return true;
    if(doc.querySelector('#song-sheet') && doc.querySelector('#pl .ct .mn[title="暂停"]')) return true;
    for(const media of doc.querySelectorAll('audio,video')) {
      if(!media.paused && !media.ended && !media.muted && media.volume>0 && media.readyState>=2) return true;
    }
    if(depth<4) for(const frame of doc.querySelectorAll('iframe')) {
      try { if(frame.contentDocument && isMusicPlaying(frame.contentDocument,depth+1)) return true; } catch {}
    }
  } catch {}
  return false;
}
