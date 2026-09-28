import { CATALOG } from './catalog.js';
import { PETS, petLabel } from './core.js';
import { costumeActionsFor, validSource } from './customization.js';

// 0.3.10：给梨梨工作台「换装 / 动作大小」用的接口。和面板里的换装页共用同一份设置、同一个本地图片仓库。
// 大小单位是像素；size 为 null 表示跟随伙伴大小，base 是此时实际使用的大小。
export function createWardrobeApi({ settings, save, costumes, refresh }) {
  const comboNames = key => key.replace(/_2$/, '').split('-');
  const comboLabel = (st, key) => comboNames(key).map(n => petLabel(st, n)).join('、') + ' · ' + (key.endsWith('_2') ? '叠叠乐' : comboNames(key).includes('灰鸮g老师') ? '一起看书' : '贴贴');
  const actionsOf = name => name === '组合' ? CATALOG.combos : PETS.includes(name) ? costumeActionsFor(name) : null;
  const check = (name, action) => {
    const list = actionsOf(name);
    if (!list) throw Error('没有这只伙伴。');
    if (!list.includes(action)) throw Error('没有这个动作。');
  };
  const inherited = (st, name, action) => name === '组合'
    ? Math.max(...comboNames(action).map(n => st.petSizes[n] ?? st.size))
    : action === '通用皮肤' ? (st.petSizes[name] ?? st.size) : (st.actionSizes[name]?.['通用皮肤'] ?? st.petSizes[name] ?? st.size);
  async function replace(name, action, source) {
    const st = settings(), old = st.skins[name]?.[action];
    if (source) (st.skins[name] ??= {})[action] = source; else if (st.skins[name]) delete st.skins[name][action];
    save(); await refresh();
    if (old && old !== source) { try { await costumes.remove(old); } catch {} }
  }
  return {
    get(name) {
      const st = settings(), list = actionsOf(name);
      if (!list) throw Error('没有这只伙伴。');
      return { actions: list.map(action => ({
        action,
        label: name === '组合' ? comboLabel(st, action) : undefined,
        custom: !!st.skins[name]?.[action],
        size: st.actionSizes[name]?.[action] ?? null,
        base: inherited(st, name, action)
      })) };
    },
    async setImage(name, action, src) {
      check(name, action);
      let source;
      if (typeof src === 'string') { source = validSource(src.trim()); if (!source || source.startsWith('local:')) throw Error('请输入有效的 http 或 https 图片链接。'); }
      else if (src instanceof Blob) source = await costumes.put(src);
      else throw Error('请选择图片或填写链接。');
      await replace(name, action, source);
    },
    async reset(name, action) { check(name, action); await replace(name, action, ''); },
    async setSize(name, action, px) {
      check(name, action);
      const st = settings();
      if (px == null) { if (st.actionSizes[name]) delete st.actionSizes[name][action]; }
      else {
        const v = Math.round(Number(px));
        if (!Number.isFinite(v)) throw Error('大小不对。');
        (st.actionSizes[name] ??= {})[action] = Math.max(48, Math.min(360, v));
      }
      save(); await refresh();
    }
  };
}
