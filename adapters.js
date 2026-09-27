// Versioned, read-only detection. Never intercept fetch, read credentials, or run generation.
export function toolStatus(win=window,doc=document) {
  return {
    workbench: !!(win.__cyll_pear_hub_v1__ || doc.querySelector('#cw-top, #cw-fab, #cw-hub')),
    atelier: typeof win.__pear_nai_studio_v1?.open==='function',
    meow: !!doc.querySelector('#meow-wand-entry, #meow-open-settings, #meow-top-button'),
  };
}
export const WORKBENCH_PAGES = {preset:"管理预设",api:"管理 API",worldbook:"管理世界书",archive:"聊天档案馆",history:"回复与分支",sttheme:"酒馆美化",tools:"插件与脚本",beauty:"控制台"};
export function openTool(id,win=window,doc=document) {
  if((id==='workbench'||Object.hasOwn(WORKBENCH_PAGES,id))&&typeof win.__cyll_pear_hub_v1__?.open==='function'){return Promise.resolve(win.__cyll_pear_hub_v1__.open(id==='workbench'?undefined:id)).then(()=>true);}
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
