// Versioned, read-only detection. Never intercept fetch, read credentials, or run generation.
export function toolStatus(win=window,doc=document) {
  return {
    workbench: !!(win.__cyll_pear_hub_v1__ || doc.querySelector('#cw-top, #cw-fab, #cw-hub')),
    atelier: typeof win.__pear_nai_studio_v1?.open==='function',
    meow: !!doc.querySelector('#meow-wand-entry, #meow-open-settings, #meow-top-button'),
    excerpt: typeof win.__pearBookExcerpt?.excerpt==='function',
  };
}
export function openTool(id,win=window,doc=document) {
  if(id==='atelier' && typeof win.__pear_nai_studio_v1?.open==='function'){win.__pear_nai_studio_v1.open();return true;}
  if(id==='workbench'){
    const panel=doc.querySelector('#cw-hub');
    if(panel && !panel.hidden){panel.focus?.();return true;}
    const entry=doc.querySelector('#cw-top, #cw-fab');
    if(entry){entry.click();return true;}
    return false;
  }
  if(id==='meow'){
    if(doc.querySelector('#meow-dialog')?.open)return true;
    const entry=doc.querySelector('#meow-wand-entry, #meow-open-settings, #meow-top-button');
    if(entry){entry.click();return true;}
  }
  return false;
}
export function readActivity(doc=document) {
  const atelier=doc.getElementById('pear-nai-host')?.shadowRoot;
  return {
    atelier: !!atelier?.querySelector('.header-wait:not([hidden])'),
    meow: !!doc.querySelector('#meow-panel[aria-busy="true"]'),
    reading: !!doc.querySelector('#cw-hub:not([hidden])'),
  };
}
export function exportDiary(text,win=window) {
  if(typeof win.__pearBookExcerpt?.excerpt!=='function')return false;
  win.__pearBookExcerpt.excerpt(text);return true;
}
