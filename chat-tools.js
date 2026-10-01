// Chat source is authoritative: searches include messages not mounted in #chat.
export function findMatches(chat, query) {
    if (!query) return [];
    const hits = [];
    chat.forEach((message, id) => {
        const source = String(message.mes ?? '');
        for (let offset = source.indexOf(query); offset !== -1; offset = source.indexOf(query, offset + query.length)) {
            hits.push({ id, offset, source, message });
        }
    });
    return hits;
}

export function replaceText(source, query, replacement, offset = null) {
    if (!query) throw Error('请输入查找文本。');
    if (offset === null) return source.split(query).join(replacement);
    if (source.slice(offset, offset + query.length) !== query) throw Error('原文已经变化，请重新查找。');
    return source.slice(0, offset) + replacement + source.slice(offset + query.length);
}

export function createChatTools({ context, tell, theme, busy }) {
    let disposed = false, picking = false, writing = false, navigation = false, dialog = null, opener = null;
    const node = (tag, text, cls) => {
        const n = document.createElement(tag);
        if (text !== undefined) n.textContent = text;
        if (cls) n.className = cls;
        return n;
    };
    const button = (text, fn) => {
        const b = node('button', text); b.type = 'button';
        b.onclick = () => Promise.resolve().then(fn).catch(error => tell(error.message));
        return b;
    };
    const current = () => {
        const ctx = context();
        if (!ctx?.chat?.length) throw Error('请先打开一段有消息的对话。');
        return ctx;
    };
    const identity = ctx => `${ctx.characterId ?? ''}/${ctx.groupId ?? ''}/${ctx.chatId ?? ctx.getCurrentChatId?.() ?? ''}`;
    const same = (ctx, chat, key) => ctx?.chat === chat && identity(ctx) === key;
    function close() { if (dialog) { dialog.close(); dialog.remove(); dialog = null; } }
    function popup(title) {
        close(); picking = false; opener = document.activeElement;
        const d = node('dialog', undefined, 'lp-chat-dialog'); d.dataset.theme = theme();
        const heading = node('header'); heading.append(node('strong', title), button('×', close));
        heading.lastChild.setAttribute('aria-label', '关闭');
        d.setAttribute('aria-label', title); d.append(heading); document.body.append(d); dialog = d;
        d.addEventListener('close', () => { d.remove(); if (dialog === d) dialog = null; opener?.isConnected && opener.focus?.({ preventScroll: true }); });
        d.showModal(); return d;
    }
    function input(d, label, value = '') {
        const field = node('label', label), control = node('textarea'); control.rows = 2; control.value = value;
        field.append(control); d.append(field); return control;
    }
    function visibleId() {
        const container = document.getElementById('chat');
        const top = container?.getBoundingClientRect().top ?? 0;
        const messages = [...document.querySelectorAll('#chat .mes[mesid]')];
        return Number(messages.find(m => m.getBoundingClientRect().bottom > top + 2)?.getAttribute('mesid') ?? 0);
    }
    async function jump(id, bottom = false, hit = null, query = '') {
        const ctx = current();
        if (!Number.isInteger(id) || id < 0 || id >= ctx.chat.length) throw Error(`请输入 0～${ctx.chat.length - 1} 的楼层号。`);
        if (navigation) return;
        navigation = true;
        const chat = ctx.chat, key = identity(ctx);
        try {
            let target = document.querySelector(`#chat .mes[mesid="${id}"]`);
            if (!target) {
                if (!ctx.executeSlashCommandsWithOptions) throw Error('当前酒馆不支持加载未显示的楼层，请先加载历史消息。');
                // Only validated integer IDs enter the command; user text is never executed.
                await ctx.executeSlashCommandsWithOptions(`/chat-jump ${id}`);
                if (disposed || !same(context(), chat, key)) return;
                target = document.querySelector(`#chat .mes[mesid="${id}"]`);
            }
            const container = document.getElementById('chat');
            if (!target || !container) throw Error('该楼层尚未显示，请稍后重试。');
            container.scrollTo({ top: bottom ? container.scrollHeight : container.scrollTop + target.getBoundingClientRect().top - container.getBoundingClientRect().top, behavior: 'instant' });
            if (hit && query) {
                const body = target.querySelector('.mes_text');
                if (body) {
                    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
                    const nodes = []; let text = '', n;
                    while ((n = walker.nextNode())) { nodes.push({ n, start: text.length }); text += n.textContent; }
                    let ordinal = findMatches([{ mes: hit.source.slice(0, hit.offset) }], query).length;
                    let at = text.indexOf(query);
                    while (ordinal-- > 0 && at !== -1) at = text.indexOf(query, at + query.length);
                    if (at !== -1) {
                        const start = nodes.find(x => x.start + x.n.length > at);
                        const end = nodes.find(x => x.start + x.n.length >= at + query.length);
                        if (start && end) {
                            const range = document.createRange(); range.setStart(start.n, at - start.start); range.setEnd(end.n, at + query.length - end.start);
                            const rect = range.getBoundingClientRect();
                            if (rect.height) container.scrollTo({ top: container.scrollTop + rect.top - container.getBoundingClientRect().top, behavior: 'instant' });
                            const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
                        }
                    }
                }
            }
            target.animate?.([{ outline: '2px solid currentColor' }, { outline: '2px solid transparent' }], { duration: 1300 });
        } finally { navigation = false; }
    }
    async function navigate(kind) {
        const ctx = current(), last = ctx.chat.length - 1;
        const id = kind === 'top' ? 0 : kind === 'previous' ? Math.max(0, visibleId() - 1) : kind === 'next' ? Math.min(last, visibleId() + 1) : last;
        await jump(id, kind === 'bottom');
    }
    function specified() {
        const ctx = current(), chat = ctx.chat, key = identity(ctx);
        const d = popup('指定跳转'), value = input(d, `楼层号（与酒馆一致，从 0 开始，最大 ${chat.length - 1}）`);
        value.inputMode = 'numeric'; value.rows = 1;
        d.append(button('跳转', async () => {
            if (!same(context(), chat, key)) throw Error('对话已切换，请重新打开。');
            if (!/^\d+$/.test(value.value.trim())) throw Error('请输入整数楼层号。');
            const id = Number(value.value.trim());
            if (id >= chat.length) throw Error(`最大楼层号是 ${chat.length - 1}。`);
            close(); await jump(id);
        })); value.focus();
    }
    function search(edit = false, seed = '', initialId = null) {
        const ctx = current(), chat = ctx.chat, key = identity(ctx);
        const d = popup(edit ? '查找替换' : '查找跳转');
        d.append(node('p', edit ? '按原文精确查找。点击结果选中一处；全部替换作用于当前对话，替换栏留空就是删除。' : '搜索当前对话所有楼层的原文，点击任意结果跳转。'));
        const query = input(d, '查找文本', seed);
        const replacement = edit ? input(d, '替换为（留空删除）') : null;
        let hits = [], selected = null, page = 0;
        const status = node('p'), results = node('div', undefined, 'lp-chat-results'); status.setAttribute('role', 'status');
        const actions = node('div', undefined, 'lp-chat-actions');
        const valid = () => {
            if (disposed || !same(context(), chat, key)) throw Error('对话已切换，请关闭后重新打开。');
        };
        function paint() {
            results.replaceChildren();
            status.textContent = query.value ? `共 ${hits.length} 处${selected ? ` · 已选 #${selected.id} 楼` : ''}` : '请输入要查找的文本。';
            for (const hit of hits.slice(page * 60, (page + 1) * 60)) {
                const text = hit.source.slice(Math.max(0, hit.offset - 45), hit.offset + query.value.length + 65);
                const row = button(`#${hit.id} · ${hit.message.name || '消息'} · ${hit.offset + 1} 字：${text}`, async () => {
                    valid();
                    if (edit) { selected = hit; paint(); }
                    else { close(); await jump(hit.id, false, hit, query.value); }
                });
                row.setAttribute('aria-pressed', String(selected === hit)); results.append(row);
            }
            if (hits.length > 60) {
                const prev = button('上一页', () => { page--; paint(); }); prev.disabled = page === 0;
                const next = button('下一页', () => { page++; paint(); }); next.disabled = (page + 1) * 60 >= hits.length;
                results.append(prev, node('span', ` ${page + 1} / ${Math.ceil(hits.length / 60)} `), next);
            }
        }
        function refresh() { valid(); hits = findMatches(chat, query.value); selected = hits.find(h => h.id === initialId) || null; initialId = null; page = 0; paint(); }
        query.oninput = () => { try { refresh(); } catch (e) { status.textContent = e.message; results.replaceChildren(); } };
        async function replace(all) {
            valid();
            if (writing) return;
            if (busy() || context().streamingProcessor || document.querySelector('#chat .mes textarea.edit_textarea')) throw Error('请等生成或消息编辑结束后再替换。');
            if (typeof ctx.saveChat !== 'function' || typeof ctx.updateMessageBlock !== 'function') throw Error('当前酒馆缺少消息保存接口。');
            const q = query.value, value = replacement.value;
            if (!q) throw Error('请输入查找文本。');
            if (!all && !selected) throw Error('请先点击一条结果，选择要替换的那一处。');
            const targets = all ? findMatches(chat, q) : [selected];
            if (!targets.length) throw Error('没有可替换的文本。');
            for (const h of targets) if (chat[h.id] !== h.message || h.message.mes !== h.source) throw Error('原文已变化，请重新查找。');
            const changes = [...new Map(targets.map(h => [h.id, h])).values()].map(h => ({
                ...h, after: replaceText(h.source, q, value, all ? null : h.offset),
                swipeId: h.message.swipe_id, swipe: h.message.swipes?.[h.message.swipe_id],
            }));
            const set = (c, undo) => {
                c.message.mes = undo ? c.source : c.after;
                if (Array.isArray(c.message.swipes) && Number.isInteger(c.swipeId) && c.swipeId >= 0 && c.swipeId < c.message.swipes.length) c.message.swipes[c.swipeId] = undo ? c.swipe : c.after;
            };
            writing = true; d.querySelectorAll('button,textarea').forEach(n => n.disabled = true);
            try {
                changes.forEach(c => set(c, false));
                try { await ctx.saveChat(); }
                catch (error) { changes.forEach(c => set(c, true)); throw Error(`保存失败，已恢复原文：${error.message}`); }
                if (!disposed && same(context(), chat, key)) {
                    for (const c of changes) { await ctx.updateMessageBlock(c.id, c.message); }
                    if (dialog === d) refresh();
                }
                tell(`已${value === '' ? '删除' : '替换'} ${targets.length} 处文本。`);
            } finally { writing = false; d.querySelectorAll('button,textarea').forEach(n => n.disabled = false); if (dialog === d) paint(); }
        }
        if (edit) {
            actions.append(button('单独替换', () => replace(false)), button('全部替换', () => replace(true)), button('跳转选中楼层', async () => { valid(); if (!selected) throw Error('请先选择一处结果。'); const hit = selected; close(); await jump(hit.id, false, hit, query.value); }), button('点击聊天文本选取', () => { close(); picking = true; tell('请点击要修改的聊天正文；可先选中文字。按 Esc 取消。'); }));
        }
        d.append(actions, status, results); refresh(); query.focus();
    }
    function pick(event) {
        if (!picking) return;
        const text = event.target.closest?.('#chat .mes .mes_text');
        if (!text || event.target.closest('a,button,input,textarea,select')) return;
        event.preventDefault(); event.stopPropagation(); picking = false;
        try {
            const id = Number(text.closest('.mes').getAttribute('mesid'));
            const selection = window.getSelection();
            const seed = selection && text.contains(selection.anchorNode) && text.contains(selection.focusNode) ? selection.toString() : '';
            search(true, seed || String(current().chat[id]?.mes ?? ''), id);
        } catch (error) { tell(error.message); }
    }
    function escape(event) { if (event.key === 'Escape' && picking) { picking = false; tell('已取消选取。'); } }
    document.addEventListener('click', pick, true); document.addEventListener('keydown', escape);
    return {
        navigate, specified, search,
        reset() { picking = false; close(); },
        dispose() { disposed = true; picking = false; close(); document.removeEventListener('click', pick, true); document.removeEventListener('keydown', escape); },
    };
}
