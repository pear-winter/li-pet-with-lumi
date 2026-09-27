import { createCostumeStore, behaviorAction } from './customization.js';
import { renderWardrobe } from './wardrobe.js';
import { CATALOG } from './catalog.js';
import { isMusicPlaying } from './music.js';
import { PETS, normalize, clamp, count, dayKey, comboFor, chooseState, petAsset, comboAsset } from './core.js';
import { toolStatus, openTool, readActivity, exportDiary, WORKBENCH_PAGES } from './adapters.js';

const KEY='li_pet_with_lumi';
const OWNER='__liPetWithLumi';
const context=()=>window.SillyTavern?.getContext?.();
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,fn,cls='lp-button')=>{const n=el('button',cls,text);n.type='button';n.addEventListener('click',fn);return n;};

export function boot(){
  const ctx=context();
  if(!ctx?.extensionSettings || !document.body)return;
  window[OWNER]?.dispose();
  let settings=normalize(ctx.extensionSettings[KEY]);
  let disposed=false,frame=0,lastFrame=0,chatBusy=false,chatStarted=0,typingUntil=0,musicPlaying=false;
  let selected=settings.pets[0]||PETS[1],tab='home',lastOpener=null,panelOpen=false,group=null,comboCooldown=0;
  let lastToolActivity={atelier:false,meow:false,reading:false};
  const pets=new Map(),cleanups=[],timers=new Set(),costumes=createCostumeStore(),skinUrls=new Map();
  let costumeRevision=0;
  const mapped=(p,event)=>behaviorAction(settings,p.name,event);
  const imageFor=(name,action)=>skinUrls.get(settings.skins[name]?.[action])||(name==='组合'?comboAsset(action):petAsset(name,action));
  async function refreshCostumes(){const rev=++costumeRevision;for(const group of Object.values(settings.skins))for(const source of Object.values(group)){try{const url=await costumes.load(source);if(url)skinUrls.set(source,url);}catch{}}if(disposed||rev!==costumeRevision)return;for(const p of pets.values()){const action=p.action;p.action='';showAction(p,action);}if(group)group.node.querySelector('img').src=imageFor('组合',group.key);}
  const resolveImage=async(name,action)=>{const source=settings.skins[name]?.[action];try{return source?(await costumes.load(source)||imageFor(name,action)):imageFor(name,action);}catch{return imageFor(name,action);}};
  const save=()=>{ctx.extensionSettings[KEY]=settings;ctx.saveSettingsDebounced?.();};
  const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);if(!disposed)fn();},ms);timers.add(id);return id;};
  const on=(node,type,fn,options)=>{node.addEventListener(type,fn,options);cleanups.push(()=>node.removeEventListener(type,fn,options));};
  const layer=el('div');layer.id='lp-pets';layer.setAttribute('aria-label','梨间雪酒馆桌宠');document.body.append(layer);
  const dialog=el('dialog');dialog.id='lp-dialog';dialog.setAttribute('aria-label','梨间雪 · 酒馆桌宠');document.body.append(dialog);
  const customStyle=el('style');customStyle.id='lp-custom-style';document.head.append(customStyle);
  function applyTheme(){for(const n of [layer,dialog,menu,toast])n.dataset.theme=settings.theme;customStyle.textContent=settings.customCss;}
  const menu=el('div','lp-quick');menu.id='lp-quick';menu.hidden=true;menu.setAttribute('role','dialog');menu.setAttribute('aria-label','桌宠互动');document.body.append(menu);
  function hideMenu(){menu.hidden=true;}
  function quick(p,magic=false){selected=p.name;menu.replaceChildren(el('strong','',magic?'魔法门':p.name));menu.hidden=false;
    const add=(label,fn)=>menu.append(button(label,fn));
    if(magic){for(const[id,label]of Object.entries(WORKBENCH_PAGES))add(label,()=>launch(id));add('喵喵星绘',()=>launch('meow'));add('梨梨画室',()=>launch('atelier'));add('打开设置面板',()=>{hideMenu();open('settings',p.node);});add('返回',()=>quick(p));}
    else{add('喂食',()=>{hideMenu();feed(p.name);});add('摸摸',()=>{hideMenu();pet(p.name);});add('魔法门',()=>quick(p,true));}
    const v=viewport(),r=menu.getBoundingClientRect();menu.style.left=clamp(p.x,v.left+6,v.left+v.width-r.width-6)+'px';menu.style.top=clamp(p.y-r.height-8,v.top+6,v.top+v.height-r.height-6)+'px';menu.querySelector('button')?.focus();}
  on(document,'pointerdown',e=>{if(!menu.contains(e.target)&&!e.target.closest?.('.lp-pet'))hideMenu();});
  on(document,'keydown',e=>{if(e.key==='Escape'&&!menu.hidden){hideMenu();pets.get(selected)?.node.focus();}});
  const toast=el('div');toast.id='lp-toast';toast.setAttribute('role','status');toast.hidden=true;document.body.append(toast);
  let toastTimer;
  function tell(text){(dialog.open?dialog:document.body).append(toast);toast.textContent=text;toast.hidden=false;clearTimeout(toastTimer);toastTimer=later(()=>toast.hidden=true,4200);}
  const head=el('header','lp-header'),brand=el('div');brand.append(el('span','lp-eyebrow','LILI × LUMI / TAVERN COMPANIONS'),el('h2','','梨间雪'),el('p','','把一点小小的陪伴，放进酒馆里。'));
  const close=button('×',()=>dialog.close(),'lp-close');close.setAttribute('aria-label','关闭桌宠面板');head.append(brand,close);
  const nav=el('nav','lp-tabs');nav.setAttribute('aria-label','桌宠面板分页');
  const pages=new Map(),body=el('div','lp-body');
  for(const [id,label] of [['home','小小伙伴'],['links','一起做事'],['diary','陪伴日记'],['settings','小设置'],['wardrobe','换装动作']]){
    const b=button(label,()=>showTab(id));b.dataset.tab=id;nav.append(b);const p=el('section','lp-page');p.hidden=true;pages.set(id,p);body.append(p);
  }
  const foot=el('footer','lp-footer','梨梨 × Lumi · 陪伴版 0.3.0');dialog.append(head,nav,body,foot);
  function showTab(id){tab=id;for(const[k,p]of pages)p.hidden=k!==id;for(const b of nav.children)b.setAttribute('aria-selected',String(b.dataset.tab===id));if(id==='links')renderLinks();if(id==='diary')renderDiary();if(id==='wardrobe')renderWardrobe({page:pages.get(id),settings,save,costumes,resolveImage,refresh:refreshCostumes,tell});}
  function open(id='home',opener=null){hideMenu();lastOpener=opener||document.activeElement;renderHome();renderSettings();showTab(id);if(!dialog.open)dialog.showModal();panelOpen=true;close.focus();}
  on(dialog,'close',()=>{panelOpen=false;lastOpener?.isConnected&&lastOpener.focus?.();});
  on(dialog,'click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});

  const entry=button('',()=>open('home',entry),'list-group-item flex-container flexGap5');entry.id='lp-wand-entry';entry.title='梨间雪 · 酒馆桌宠';
  const icon=el('i','fa-solid fa-paw fa-fw');icon.setAttribute('aria-hidden','true');entry.append(icon,el('span','','梨间雪 · 酒馆桌宠'));
  const settingsEntry=button('打开梨间雪 · 酒馆桌宠',()=>open('settings',settingsEntry),'menu_button');settingsEntry.id='lp-settings-entry';
  const settingsContainer=el('div','extension_container');settingsContainer.id='lp-settings-container';settingsContainer.append(settingsEntry);
  function mountEntries(){const menu=document.getElementById('extensionsMenu');if(menu&&entry.parentElement!==menu)menu.append(entry);const area=document.querySelector('#extensions_settings2, #extensions_settings');if(area&&settingsContainer.parentElement!==area)area.append(settingsContainer);}
  mountEntries();

  function viewport(){const v=window.visualViewport;return {left:v?.offsetLeft||0,top:v?.offsetTop||0,width:v?.width||innerWidth,height:v?.height||innerHeight};}
  function place(p){const v=viewport(),size=settings.size;p.x=clamp(p.x,v.left+4,v.left+v.width-size-4);p.y=clamp(p.y,v.top+4,v.top+v.height-size-4);p.node.style.transform=`translate(${p.x}px,${p.y}px)`;}
  function remember(p){const v=viewport();settings.positions[p.name]={x:clamp((p.x-v.left)/Math.max(1,v.width-settings.size),0,1),y:clamp((p.y-v.top)/Math.max(1,v.height-settings.size),0,1)};}
  function moveToSaved(p,index){const v=viewport(),pos=settings.positions[p.name];p.x=v.left+(pos?pos.x*(v.width-settings.size):Math.max(6,v.width-settings.size*(index+1)-18));p.y=v.top+(pos?pos.y*(v.height-settings.size):Math.max(8,v.height-settings.size-100));place(p);}
  function showAction(p,action){if(p.action===action)return;p.action=action;p.img.src=imageFor(p.name,action);p.node.dataset.state=action;}
  function bubble(p,text,ms=3300){if(!p||!settings.bubbles)return;p.bubble.textContent=text;p.bubble.hidden=false;p.bubbleUntil=Date.now()+ms;}
  function allSay(text){const p=pets.get(selected)||pets.values().next().value;bubble(p,text);}
  function manual(p,action,text='',ms=4500){if(!p)return;if(group)endCombo();p.lastTouch=Date.now();p.autoManual=false;p.manual=action;p.until=Date.now()+ms;showAction(p,action);if(text)bubble(p,text);}
  function pet(name){const p=pets.get(name);if(!p)return;manual(p,mapped(p,'pet')||'待机',`${settings.name||'你'}，再摸一下嘛 ♡`);count(settings,'pets');save();}
  function feed(name){const p=pets.get(name);if(!p)return;manual(p,mapped(p,'feed')||'待机','今天也被好好照顾啦。',6500);count(settings,'feeds');save();}
  function endCombo(){if(!group)return;const current=group;group=null;current.node.remove();current.names.forEach((name,i)=>{const p=pets.get(name);if(p){p.node.hidden=false;p.manual='开心蹦蹦';p.until=Date.now()+1800;p.x+=(i?1:-1)*settings.size*.4;place(p);p.lastTouch=Date.now();}});comboCooldown=Date.now()+18000;}
  function hug(names,stack=false){const key=comboFor(names,stack);if(!key)return false;endCombo();const participants=names.map(n=>pets.get(n));if(participants.some(p=>!p))return false;
    const v=viewport(),width=Math.min(v.width-12,settings.size*1.9),height=settings.size*1.5;
    const node=button('',endCombo,'lp-combo');node.setAttribute('aria-label',stack?'叠叠乐，点击散开':'贴贴，点击散开');
    const img=el('img');img.src=imageFor('组合',key);img.referrerPolicy='no-referrer';img.onerror=()=>{if(img.src!==comboAsset(key))img.src=comboAsset(key);};img.alt=names.join('和')+(stack?'叠叠乐':'贴贴');node.append(img);
    node.style.width=width+'px';node.style.height=height+'px';node.style.left=clamp(participants.reduce((s,p)=>s+p.x,0)/participants.length,v.left+4,v.left+v.width-width-4)+'px';node.style.top=clamp(Math.max(...participants.map(p=>p.y))+settings.size-height,v.top+4,v.top+v.height-height-4)+'px';
    layer.append(node);participants.forEach(p=>p.node.hidden=true);group={names,node,key,until:Date.now()+7500};count(settings,'hugs');save();return true;
  }
  function hugAny(stack=false){const names=[...pets.keys()];for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++)if(hug([names[i],names[j]],stack)){dialog.close();return true;}tell(stack?'请放出两只支持叠叠乐的伙伴；g老师只参与双人看书贴贴。':'请放出一组能贴贴的伙伴，例如梨梨兔兔和千千猫猫。');return false;}
  function buildPets(){hideMenu();endCombo();pets.clear();layer.replaceChildren();layer.hidden=!settings.enabled;
    settings.pets.forEach((name,index)=>{
      const node=button('',()=>{},'lp-pet'),img=el('img'),speech=el('span','lp-bubble');node.setAttribute('aria-label',`${name}：点击打开喂食、摸摸和魔法门，拖动移动，右键打开面板`);node.title=name+' · 点击互动 / 右键小面板';node.style.width=node.style.height=settings.size+'px';img.alt=name;img.draggable=false;speech.hidden=true;
      const fallback=el('span','lp-fallback',name);fallback.hidden=true;node.append(img,fallback,speech);layer.append(node);
      const p={name,node,img,bubble:speech,x:0,y:0,action:'',manual:'',until:0,lastTouch:Date.now(),direction:index%2?1:-1,walkUntil:0,nextWalk:Date.now()+800+Math.random()*1200,drag:null,suppress:false,vy:0,nextIdle:Date.now()+8000+Math.random()*10000};pets.set(name,p);moveToSaved(p,index);showAction(p,'待机');
      img.referrerPolicy='no-referrer';img.addEventListener('error',()=>{const bundled=petAsset(name,p.action);if(img.src!==bundled){img.src=bundled;return;}fallback.hidden=false;img.hidden=true;});img.addEventListener('load',()=>{fallback.hidden=true;img.hidden=false;});
      node.addEventListener('click',()=>{if(p.suppress){p.suppress=false;return;}selected=name;quick(p);});
      node.addEventListener('contextmenu',e=>{e.preventDefault();selected=name;open('home',node);});
      node.addEventListener('pointerdown',e=>{if(e.button!==0)return;hideMenu();selected=name;p.vy=0;p.suppress=false;p.drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:p.x,top:p.y,moved:false};p.lastTouch=Date.now();node.setPointerCapture(e.pointerId);});
      node.addEventListener('pointermove',e=>{const d=p.drag;if(!d||d.id!==e.pointerId)return;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>7)d.moved=true;if(d.moved){p.x=d.left+e.clientX-d.x;p.y=d.top+e.clientY-d.y;place(p);}});
      const finish=e=>{const d=p.drag;if(!d||d.id!==e.pointerId)return;p.drag=null;p.suppress=d.moved;if(node.hasPointerCapture(e.pointerId))node.releasePointerCapture(e.pointerId);if(d.moved){remember(p);save();const nearby=[...pets.values()].find(other=>other!==p&&Math.abs(other.x-p.x)<settings.size*.55&&Math.abs(other.y-p.y)<settings.size*.65);if(e.type==='pointerup'&&nearby&&hug([name,nearby.name],true))return;if(!settings.gravity)manual(p,'开心蹦蹦','就在这里陪你。',1900);}};
      node.addEventListener('pointerup',finish);node.addEventListener('pointercancel',finish);
    });
  }
  function renderHome(){const page=pages.get('home');page.replaceChildren();
    const welcome=el('div','lp-welcome');welcome.append(el('span','lp-kicker','一间有你的小酒馆'),el('h3','','今天，想让谁陪你？'),el('p','','点一下喂食、摸摸或打开魔法门，拖到喜欢的位置。魔法棒里随时能找到我们。'));page.append(welcome);
    const grid=el('div','lp-pet-grid');
    for(const name of PETS){const card=button('',()=>{const has=settings.pets.includes(name);settings.pets=has?settings.pets.filter(n=>n!==name):[...settings.pets,name];if(!has)selected=name;save();buildPets();renderHome();},'lp-card');const img=el('img');img.src=imageFor(name,'待机');img.alt='';card.setAttribute('aria-pressed',String(settings.pets.includes(name)));card.append(img,el('strong','',name),el('span','lp-card-state',settings.pets.includes(name)?'在这里陪你':'邀请来玩'));grid.append(card);}page.append(grid);
    const bar=el('div','lp-action-bar'),select=el('select');select.setAttribute('aria-label','选择互动伙伴');for(const name of settings.pets){const o=el('option','',name);o.value=name;select.append(o);}if(!settings.pets.includes(selected))selected=settings.pets[0]||'';select.value=selected;select.onchange=()=>selected=select.value;bar.append(select);
    for(const[label,action]of [['摸摸',()=>pet(selected)],['喂食',()=>feed(selected)],['睡一会',()=>{const p=pets.get(selected);if(p)manual(p,mapped(p,'sleep')||'待机','做个甜甜的梦。',60000);}],['叫醒',()=>{const p=pets.get(selected);if(p)manual(p,mapped(p,'wake')||'待机','我在呢。');}]]){const b=button(label,()=>{action();dialog.close();});b.disabled=!settings.pets.length;bar.append(b);}page.append(bar);
    const row=el('div','lp-row');row.append(button('♡ 一起贴贴',()=>hugAny()),button('叠叠乐',()=>hugAny(true)),button(settings.enabled?'暂时藏起来':'让伙伴出来',()=>{settings.enabled=!settings.enabled;save();layer.hidden=!settings.enabled;if(!settings.enabled)endCombo();renderHome();renderSettings();}));page.append(row);
    page.append(el('p','lp-hint',settings.enabled?'小提示：互动动画在酒馆页面中播放，收起面板就能看到。':'伙伴暂时藏起来了，点击“让伙伴出来”即可恢复。'));
  }
  const toolNames={...WORKBENCH_PAGES,workbench:'梨梨工作台',atelier:'梨梨画室',meow:'喵喵星绘'};
  async function launch(id){hideMenu();const wasOpen=dialog.open;if(wasOpen)dialog.close();
    try{if(await openTool(id))return;}catch(error){console.warn('[梨间雪] 打开工具失败',error);}
    if(wasOpen)open('links');
    tell(Object.hasOwn(WORKBENCH_PAGES,id)?'请先安装并启用最新版梨梨工作台，再打开这个分页。':`请先安装并启用${toolNames[id]}，再刷新酒馆。`);
  }
  function renderLinks(){const page=pages.get('links'),status=toolStatus();page.replaceChildren(el('h3','','陪你读，也陪你画'),el('p','lp-hint','打开你已经安装的工具。绘图仍由你在原面板中确认。'));
    for(const[id,description]of [['workbench','角色、聊天、预设与世界书，都在熟悉的工作台。'],['atelier','打开画室，继续画画、看图库和整理灵感。'],['meow','打开 Lumi 的猫猫星绘，继续正文生图和相册。']]){const card=el('div','lp-tool');const text=el('div');text.append(el('strong','',toolNames[id]),el('p','',description),el('span','lp-badge',status[id]?'已加载 · 可以打开':'未检测到'));card.append(text,button('打开',()=>launch(id)));page.append(card);}
    page.append(button('重新检测工具',renderLinks),el('p','lp-hint','魔法门可直达梨梨工作台的各分页。工具稍后启动也能识别。桌宠不保存或接管它们的 API Key。'));
  }
  function diaryText(){const d=settings.diary.find(d=>d.day===dayKey())||{pets:0,feeds:0,hugs:0};return `${dayKey()} · 梨间雪陪伴日记\n\n今天和${settings.name||'你'}一起待在酒馆里。\n收到了 ${d.pets} 次摸摸，吃了 ${d.feeds} 份小零食，和伙伴贴贴或叠叠乐 ${d.hugs} 次。\n\n一点小小的陪伴，也值得被记住。`;
  }
  function renderDiary(){const page=pages.get('diary');page.replaceChildren(el('span','lp-kicker','OUR LITTLE DAYS'),el('h3','','今天也一起度过了'),el('pre','lp-diary',diaryText()));const row=el('div','lp-row');row.append(button('放进工作台书摘',()=>{if(exportDiary(diaryText()))dialog.close();else tell('请先启用工作台里的书摘功能，再试一次。');}),button('复制日记',async()=>{try{await navigator.clipboard.writeText(diaryText());tell('日记已复制。');}catch{tell('复制受浏览器限制，可以直接选中日记文字复制。');}}));page.append(row,el('p','lp-hint','日记是本地互动次数的小记录，不读取聊天正文，也不调用模型。最近 30 天保存在当前酒馆用户的扩展设置中。'));
    const history=el('details','lp-history');history.append(el('summary','','看看前几天'));for(const d of [...settings.diary].reverse().filter(d=>d.day!==dayKey()))history.append(el('p','',`${d.day} · 摸摸 ${d.pets} · 喂食 ${d.feeds} · 贴贴 ${d.hugs}`));page.append(history);
  }
  function renderSettings(){const page=pages.get('settings');page.replaceChildren(el('h3','','调成你喜欢的样子'));
    const text=el('label','lp-field');text.append(el('span','','怎么称呼你'));const input=el('input');input.value=settings.name;input.maxLength=24;input.onchange=()=>{settings.name=input.value.trim().slice(0,24)||'梨梨';save();};text.append(input);page.append(text);
    for(const[key,label,min,max]of [['size','伙伴大小',64,160],['speed','散步速度',0,40]]){const line=el('label','lp-field'),title=el('span','',`${label} · ${settings[key]}`),range=el('input');range.type='range';range.min=min;range.max=max;range.value=settings[key];range.oninput=()=>{settings[key]=Number(range.value);title.textContent=`${label} · ${settings[key]}`;if(key==='size'){endCombo();for(const p of pets.values()){p.node.style.width=p.node.style.height=settings.size+'px';place(p);}}};range.onchange=()=>{for(const p of pets.values())remember(p);save();};line.append(title,range);page.append(line);}
    for(const[key,label]of [['enabled','显示桌宠'],['wander','偶尔散散步'],['bubbles','说一点悄悄话'],['react','跟随聊天与画图状态'],['music','听到音乐时一起摇摆'],['gravity','开启重力，松手后落到屏幕底部'],['playful','偶尔做些小动作']]){const line=el('label','lp-check'),input=el('input');input.type='checkbox';input.checked=settings[key];input.onchange=()=>{settings[key]=input.checked;if(key==='wander'&&input.checked)for(const p of pets.values()){p.nextWalk=Date.now();if(p.autoManual)p.manual='';}if(key==='gravity')for(const p of pets.values())p.vy=0;save();if(key==='enabled'){layer.hidden=!settings.enabled;if(!settings.enabled)endCombo();}};line.append(input,el('span','',label));page.append(line);}
    const themeLabel=el('label','lp-field');themeLabel.append(el('span','','面板美化'));const theme=el('select');theme.setAttribute('aria-label','面板美化');for(const[id,label]of [['tavern','跟随酒馆'],['mono','黑白方线框'],['pink','粉白圆框']]){const o=el('option','',label);o.value=id;theme.append(o);}theme.value=settings.theme;theme.onchange=()=>{settings.theme=theme.value;applyTheme();save();};themeLabel.append(theme);page.append(themeLabel);
    const cssLabel=el('label','lp-field');cssLabel.append(el('span','','自定义 CSS'));const css=el('textarea');css.value=settings.customCss;css.rows=7;css.maxLength=50000;css.placeholder='#lp-dialog { /* 你的面板样式 */ }';cssLabel.append(css);page.append(cssLabel,button('保存 CSS',()=>{settings.customCss=css.value.slice(0,50000);applyTheme();save();tell('美化已保存。');}),button('清空自定义 CSS',()=>{settings.customCss='';css.value='';applyTheme();save();}));
    const actions=el('div','lp-row');for(const[action,label]of [['打招呼','打招呼'],['开心蹦蹦','蹦蹦'],['跳舞','跳舞'],['打哈欠','打哈欠'],['害羞','害羞'],['打滚','打滚'],['比心','比心'],['点赞','点赞']])actions.append(button(label,()=>{const p=pets.get(selected)||pets.values().next().value;if(!p){tell('先邀请一只伙伴吧。');return;}if(!CATALOG.pets[p.name]?.includes(action)){tell('这只伙伴还没有这个动作素材。');return;}manual(p,action);dialog.close();}));page.append(el('h3','','看看小动作'),actions);
    page.append(button('把伙伴叫回屏幕边上',()=>{settings.positions={};settings.enabled=true;save();buildPets();renderSettings();tell('伙伴已经回到屏幕边上。');}),el('p','lp-hint','手机键盘弹出或屏幕旋转时，伙伴会留在可见范围内。关闭酒馆页面后，酒馆桌宠也会休息。'));
  }
  function activityTick(){mountEntries();if(!settings.enabled||document.hidden)return;const activity=readActivity();if(settings.react){for(const id of ['atelier','meow']){if(activity[id]&&!lastToolActivity[id])allSay(id==='atelier'?'画室正在忙，我来陪你。':'猫猫星绘正在忙，我也开工。');if(!activity[id]&&lastToolActivity[id])allSay('任务结束啦，去看看结果吧。');}}lastToolActivity=activity;}
  function tick(time){if(disposed)return;frame=requestAnimationFrame(tick);if(time-lastFrame<32)return;const dt=Math.min(.1,(time-lastFrame)/1000||0);lastFrame=time;
    const now=Date.now();
    if(!settings.enabled||document.hidden)return;if(group&&now>=group.until)endCombo();
    if(chatBusy&&now-chatStarted>10*60000)chatBusy=false;
    const busy=settings.react&&(chatBusy||now<typingUntil||lastToolActivity.atelier||lastToolActivity.meow);
    for(const p of pets.values()){
      if(p.node.hidden)continue;
      if(p.bubbleUntil&&now>p.bubbleUntil)p.bubble.hidden=true;
      if(p.manual&&now>=p.until)p.manual='';
      if(p.drag)continue;
      if(settings.gravity){const v=viewport(),floor=v.top+v.height-settings.size-4;if(p.y<floor-.1){p.vy+=1500*dt;p.y+=p.vy*dt;place(p);if(p.y>=floor-.1){p.vy=0;manual(p,mapped(p,'land')||'待机','落地啦。',1900);remember(p);save();}else showAction(p,mapped(p,'fall')||'待机');continue;}p.vy=0;}
      if(settings.playful&&!busy&&!musicPlaying&&!p.manual&&now>=p.nextIdle){const pool=['打哈欠','向左看','向右看','打滚','比心','点赞','害羞','打招呼','互动_看书'].filter(a=>CATALOG.pets[p.name].includes(a));p.autoManual=true;p.manual=pool[Math.floor(Math.random()*pool.length)];p.until=now+3000;p.nextIdle=now+10000+Math.random()*15000;}
      const idle=settings.wander?0:now-p.lastTouch,canWalk=settings.wander&&settings.speed>0&&!busy&&!musicPlaying&&!p.manual&&!panelOpen&&(menu.hidden||selected!==p.name);
      if(canWalk&&now>p.nextWalk){p.walkUntil=now+3000+Math.random()*3000;p.nextWalk=now+6000+Math.random()*6000;p.direction=Math.random()<.5?-1:1;}
      const walking=canWalk&&now<p.walkUntil;
      if(walking){const before=p.x;p.x+=p.direction*settings.speed*dt;place(p);if(p.x===before)p.direction*=-1;}
      const event=settings.react&&(chatBusy?'generation':now<typingUntil?'typing':lastToolActivity.atelier?'atelier':lastToolActivity.meow?'meow':lastToolActivity.reading?'reading':'');
      const automatic=event&&mapped(p,event);
      const action=p.manual&&!p.autoManual?p.manual:automatic|| (musicPlaying&&mapped(p,'music')) || p.manual || mapped(p,walking?(p.direction<0?'walkLeft':'walkRight'):idle>60000?'sleep':'idle');
      showAction(p,action||'待机');
    }
    if(!panelOpen&&menu.hidden&&!busy&&!musicPlaying&&!group&&now>comboCooldown){const list=[...pets.values()].filter(p=>!p.drag&&!p.vy&&!p.manual);outer:for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i],b=list[j];if(Math.abs(a.x-b.x)<settings.size*.5&&Math.abs(a.y-b.y)<20&&hug([a.name,b.name]))break outer;}}
  }
  function listen(name,fn){const event=ctx.eventTypes?.[name]||ctx.event_types?.[name];if(!event||!ctx.eventSource)return;ctx.eventSource.on(event,fn);cleanups.push(()=>ctx.eventSource.removeListener?.(event,fn));}
  listen('GENERATION_STARTED',(type,options,dryRun)=>{if(dryRun||type==='quiet')return;chatBusy=true;chatStarted=Date.now();if(settings.react){endCombo();for(const p of pets.values()){p.manual='';p.lastTouch=Date.now();showAction(p,mapped(p,'generation')||'待机');}}if(settings.react)allSay('正在写回复，我陪你一起等。');});
  const stop=()=>{chatBusy=false;typingUntil=0;};
  function eventAction(event){if(settings.react)for(const p of pets.values()){const a=mapped(p,event);if(a)manual(p,a,'',1800);}}
  listen('GENERATION_ENDED',()=>{const was=chatBusy;stop();if(was){eventAction('finish');if(settings.react)allSay('这一轮结束啦。');}});listen('GENERATION_STOPPED',()=>{stop();eventAction('stop');});listen('CHAT_CHANGED',()=>{stop();endCombo();eventAction('chatChange');});
  on(document,'input',e=>{if(e.target?.id==='send_textarea'){typingUntil=Date.now()+2300;for(const p of pets.values())p.lastTouch=Date.now();}});
  const resized=()=>{hideMenu();endCombo();for(const p of pets.values())place(p);};on(window,'resize',resized);if(window.visualViewport){on(window.visualViewport,'resize',resized);on(window.visualViewport,'scroll',resized);}
  on(document,'visibilitychange',()=>{lastFrame=0;if(!document.hidden){resized();activityTick();}});
  on(window,'pagehide',()=>dispose());
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);clearInterval(poll);clearInterval(musicPoll);for(const id of timers)clearTimeout(id);for(const fn of cleanups)fn();for(const p of pets.values())remember(p);save();dialog.close();layer.remove();dialog.remove();toast.remove();menu.remove();customStyle.remove();costumes.dispose();entry.remove();settingsContainer.remove();if(window[OWNER]?.dispose===dispose)delete window[OWNER];}
  function musicTick(){if(document.hidden)return;const next=settings.enabled&&settings.music&&isMusicPlaying();if(next&&!musicPlaying){endCombo();for(const p of pets.values()){p.lastTouch=Date.now();if(!['吃饭','摸摸头','摔趴趴'].includes(p.manual))p.manual='';}allSay('♪ 一起听音乐吧。');}musicPlaying=next;}
  const musicPoll=setInterval(musicTick,300);applyTheme();musicTick();
  buildPets();renderHome();renderSettings();showTab('home');save();const poll=setInterval(activityTick,1500);activityTick();frame=requestAnimationFrame(tick);
  window[OWNER]={open,dispose,version:'0.3.0'};refreshCostumes();
}

// APP_READY is replayable on supported SillyTavern versions. The guard avoids duplicate mounting.
function init(){if(!window[OWNER])boot();}
const ctx=context(),ready=ctx?.eventTypes?.APP_READY||ctx?.event_types?.APP_READY;
if(ready)ctx.eventSource.on(ready,init);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
