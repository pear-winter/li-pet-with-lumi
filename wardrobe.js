import { renderOutfits } from './outfits.js';
import { petLabel } from './core.js';
import { CATALOG } from './catalog.js';
import { actionsFor,BEHAVIORS,validSource,behaviorAction } from './customization.js';
export function renderWardrobe({page,settings,save,costumes,resolveImage,refresh,tell,selected}){
  page.replaceChildren();
  const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
  const select=(label,items)=>{const wrap=el('label',label);wrap.className='lp-field';const n=el('select');n.setAttribute('aria-label',label);for(const[value,text]of items){const o=el('option',text);o.value=value;n.append(o);}wrap.append(n);page.append(wrap);return n;};
  const btn=(text,fn)=>{const b=el('button',text);b.type='button';b.className='lp-button';b.onclick=fn;return b;};
  page.append(el('h3','换装与动作'),el('p','本地图片保存在当前浏览器，GIF 会保留动画。更换设备或清除网站数据后需重新上传。链接图片由提供链接的网站加载。'));
  renderOutfits({page,settings,costumes,save,refresh:async()=>{await refresh();listActions();listShowcase();},tell});
  const who=select('换装伙伴',[...Object.keys(CATALOG.pets),'组合'].map(n=>[n,n==='组合'?'贴贴 / 叠叠乐组合':petLabel(settings,n)]));
  if(Object.hasOwn(CATALOG.pets,selected))who.value=selected;
  const action=select('替换动作',[]),preview=el('img');preview.className='lp-costume-preview';preview.alt='动作预览';preview.referrerPolicy='no-referrer';page.append(preview);
  const field=el('label','图片链接');field.className='lp-field';const url=el('input');url.type='url';url.placeholder='https://…';field.append(url);page.append(field);
  const status=el('p');status.setAttribute('role','status');status.className='lp-hint';page.append(status);
  let revision=0;
  const target=()=>CATALOG.combos.includes(action.value)?'组合':who.value;
  const comboNames=key=>key.replace(/_2$/,'').split('-');
  const comboLabel=key=>{const names=comboNames(key),others=names.filter(n=>n!==who.value).map(n=>petLabel(settings,n));return (who.value==='组合'?names.map(n=>petLabel(settings,n)).join('、'):'与 '+others.join('、'))+' · '+(key.endsWith('_2')?'叠叠乐':names.includes('灰鸮g老师')?'一起看书':'贴贴');};
  async function previewCurrent(){const rev=++revision,source=settings.skins[target()]?.[action.value];url.value=source?.startsWith('local:')?'':source||'';status.textContent=source?.startsWith('local:')?'已使用本地图片':source?'已使用链接图片':'使用默认素材';if(target()==='组合')status.textContent+=' · 这张互动图由参与伙伴共用，与组合换装同步。';const image=await resolveImage(target(),action.value);if(rev===revision&&page.isConnected)preview.src=image;}
  preview.onerror=()=>{status.textContent='图片加载失败，请检查链接或重新上传；桌宠会回退到默认素材。';};
  function listActions(){
    action.replaceChildren();
    const add=(parent,key,text)=>{const o=el('option',text);o.value=key;parent.append(o);};
    if(who.value==='组合')for(const key of CATALOG.combos)add(action,key,comboLabel(key));
    else{
      const solo=el('optgroup');solo.label='单独动作';for(const key of actionsFor(who.value))add(solo,key,key);action.append(solo);
      const interactions=el('optgroup');interactions.label='与其他伙伴互动';
      for(const key of CATALOG.combos)if(comboNames(key).includes(who.value))add(interactions,key,comboLabel(key));
      if(interactions.children.length)action.append(interactions);
    }
    previewCurrent();
  }
  const showcase=select('主页展示动作',[]);
  function listShowcase(){showcase.replaceChildren();showcase.parentElement.hidden=who.value==='组合';if(who.value==='组合')return;for(const key of actionsFor(who.value)){const o=el('option',key);o.value=key;showcase.append(o);}showcase.value=settings.showcase[who.value]||'待机';}
  showcase.onchange=()=>{settings.showcase[who.value]=showcase.value;save();refresh();};
  who.onchange=()=>{listActions();listShowcase();};action.onchange=previewCurrent;

  async function replace(source,name,a){if(!page.isConnected){await costumes.remove(source);return;}const old=settings.skins[name]?.[a];if(source)(settings.skins[name]??={})[a]=source;else if(settings.skins[name])delete settings.skins[name][a];save();await refresh();if(old&&old!==source){try{await costumes.remove(old);}catch{}}await previewCurrent();}
  const controls=el('div');controls.className='lp-row';
  controls.append(btn('保存图片链接',async()=>{const source=validSource(url.value.trim());if(!source||source.startsWith('local:')){tell('请输入有效的 http 或 https 图片链接。');return;}await replace(source,target(),action.value);tell('动作图片已保存。');}),btn('恢复此动作',async()=>{await replace('',target(),action.value);tell('已恢复默认动作图片。');}));page.append(controls);
  const uploadLabel=el('label','本地上传图片');uploadLabel.className='lp-field';const upload=el('input');upload.type='file';upload.accept='image/png,image/jpeg,image/gif,image/webp,image/avif';uploadLabel.append(upload);page.append(uploadLabel);
  upload.onchange=async()=>{const file=upload.files[0],name=target(),a=action.value;if(!file)return;upload.disabled=true;try{const source=await costumes.put(file);await replace(source,name,a);tell('本地动作图片已保存。');}catch(e){tell(e.message||'图片保存失败，请重试。');}finally{upload.disabled=false;upload.value='';}};
  page.append(el('h3','酒馆行为对应动作'),el('p','每只伙伴独立设置。选“不响应”会跳过这个行为；生成中的优先级高于自动小动作。走路换图只改变外观，仍会移动。'));
  const pet=select('行为设置伙伴',Object.keys(CATALOG.pets).map(n=>[n,petLabel(settings,n)])),rows=el('div');page.append(rows);
  function mappings(){rows.replaceChildren();const name=pet.value;for(const[event,[label]]of Object.entries(BEHAVIORS)){
    const line=el('label',label);line.className='lp-field';const input=el('select');input.setAttribute('aria-label',label+'动作');
    for(const[value,text]of [['','默认（'+(behaviorAction({behaviorMap:{}},name,event)||'不响应')+'）'],['__none__','不响应'],...actionsFor(name).map(a=>[a,a])]){const o=el('option',text);o.value=value;input.append(o);}
    input.value=settings.behaviorMap[name]?.[event]||'';input.onchange=()=>{if(input.value)(settings.behaviorMap[name]??={})[event]=input.value;else if(settings.behaviorMap[name])delete settings.behaviorMap[name][event];save();refresh();};line.append(input);rows.append(line);
  }rows.append(btn('恢复这只伙伴的行为设置',()=>{delete settings.behaviorMap[name];save();mappings();refresh();}));}
  pet.onchange=mappings;listActions();listShowcase();mappings();
}
