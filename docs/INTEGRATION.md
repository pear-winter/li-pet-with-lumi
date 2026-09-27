# 联动与接力记录

日期：2026-09-28（北京时间），酒馆初版 0.1.0。

## 文件职责

- `index.js`：原生扩展启动、魔法棒／扩展设置入口、宠物控制、面板、事件和清理。
- `core.js`：配置归一化、状态优先级、日记计数、组合规则、本地素材 URL。
- `adapters.js`：已核对版本的三个现有工具适配，集中维护 DOM/API 依赖。
- `catalog.js`：实际随仓库分发的素材清单。
- `style.css`：只匹配 `lp-*` 命名空间，避免改动酒馆和别的扩展。

入口与资源都不硬编码扩展安装文件夹名称。JS 使用相对 ES 模块导入，资源基于 `import.meta.url`。

## 已核对接口

SillyTavern 通过 `window.SillyTavern.getContext()` 访问 `extensionSettings`、`saveSettingsDebounced`、`eventSource` 和 `eventTypes`／`event_types`。监听 `GENERATION_STARTED`、`GENERATION_ENDED`、`GENERATION_STOPPED`、`CHAT_CHANGED`。忽略 dry run 和 quiet generation；超长未结束状态十分钟后退回待机。官方依据：[扩展开发](https://docs.sillytavern.app/for-contributors/writing-extensions/) 和 [st-context.js](https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/st-context.js)。

| 对象 | 接入点 | 语义 |
| --- | --- | --- |
| 工作台 3.6.1 | `#cw-top` / `#cw-fab` | 通过原点击事件打开；已显示的 `#cw-hub` 不重复点击，以免关闭 |
| 书摘 | `window.__pearBookExcerpt.excerpt(text)` | 打开日记的书摘编辑窗口；不自动保存 |
| 画室 3.9.1 | `window.__pear_nai_studio_v1.open()` | 打开原面板 |
| 画室任务状态 | `#pear-nai-host.shadowRoot` 中 `.header-wait:not([hidden])` | 原画室设置的等待状态，仅布尔值 |
| Meow 0.9.15 | `#meow-wand-entry` / `#meow-open-settings` / `#meow-top-button` | 原入口点击，已打开时不重复 |
| Meow 任务状态 | `#meow-panel[aria-busy="true"]` | 原扩展设置的忙碌状态，仅布尔值 |

工作台当前没有公开 `open` 函数，因此入口同时关闭时明确提示用户，不直接改它的隐藏 DOM 或草稿。日记接收依赖书摘功能，未安装时明确提示。所有适配每次按需重新解析，不缓存已失效的脚本函数。

未修改 fetch/XMLHttpRequest，也未读取网络请求、提示词、聊天正文、画室设置、IndexedDB、凭证或原工具 localStorage。检测每 1.5 秒一次，页面隐藏或桌宠关闭时跳过工具状态读取；不遍历聊天楼层。

## 持久化与生命周期

当前用户的 `extensionSettings.li_pet_with_lumi` 保存开关、角色、相对位置、称呼、大小、速度、开始日期、专注结束时间、最多 30 天互动计数。无网络同步和账号配对。

`window.__liPetWithLumi` 提供 `open(page)`、`dispose()` 与 `version`，方便后续协作。重新初始化先清理旧实例；清理动画帧、定时器、事件、面板和入口。素材 GIF 存在本仓库，运行时无外链依赖。

## 后续适配建议

后续可由三个工具共同提供命名一致的 `open`、任务开始／完成／失败事件，从而替换 DOM 兼容层。若要让桌宠请求画图，需要另外设计可审阅的草稿、确认按钮与取消机制。与桌面版互联也应作为独立功能，不复用或泄露 API Key、聊天正文。

新增角色或动作后同步 `catalog.js` 并运行素材完整性测试。不要把复杂剧情后缀当成随机基础动作，尊重原版关系和 g老师不叠叠乐的规则。
