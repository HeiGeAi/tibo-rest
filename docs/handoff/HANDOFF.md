# tibo.rest — 交接包（给下一个 AI）

生成时间：2026-09-16（Asia/Shanghai）  
前任助手：鸡维斯（Grok Bot）  
用户：哥黑 / Blake（@Blake488137，GitHub HeiGeAi）  
用户评价：认为当前前端做得稀烂，要求换另一个 AI 接手。请勿沿用「差不多就行」的审美；需要生产级、有气场、像人做的站点。

---

## 1. 一句话目标

域名 **`tibo.rest`**：做成 **Codex / ChatGPT Work 额度用完后的粉丝休息室**（fan lounge / rest room），围绕 OpenAI 的 Thibault「Tibo」Sottiaux（`@thsottiaux`）的 goodwill reset 文化。

**不是**严肃监控站。严肃赛道已被：
- https://aihot.news/codex-reset
- https://codex-reset.com/
- https://codexreset.org/

抢走。本站要做 **情绪玩具 + 社区休息室**：额度死了来歇一会儿、点灯、写祈愿、一键意图推 @Tibo。

---

## 2. 硬约束（用户已拍板）

| 项 | 决定 |
|----|------|
| 域名 | `tibo.rest`（用户已注册；DNS/服务器「就绪后再上线」） |
| 仓库 | https://github.com/HeiGeAi/tibo-rest （public） |
| 预览 | https://heigeai.github.io/tibo-rest/ （GitHub Pages，`gh-pages` 分支） |
| 数据 | **只**用 AIHOT 公开 API，**禁止**爬 aihot 页面/抄 HTML |
| 登录 | 不要 OpenAI 账号登录 / 不要读 `~/.codex/auth.json` |
| 预测 | 不要伪装成准确预测；可做玩梗，不可当真理 |
| 商业 | AIHOT 条款：个人非商用可 attribution；商用需书面授权 |
| 语言 | EN 主 + 中文辅（用户中文语境） |
| 审美 | 用户自有 **HeiGe-UI** 方法论（见下）；反 AI slop |
| 自主权 | 用户曾授权「全权自主、不反复确认」——但交付审美未过关 |

---

## 3. 产品功能清单（定位不变）

必须保留：

1. **状态灯 / Rest Room** — 距上次确认 `direct_reset` 多久  
2. **一键意图推** — 打开 X intent：`@thsottiaux` + 休息时长 + 可选 note + `tibo.rest`  
3. **Reset Radar** — `direct_reset` + `reset_credit` 时间线，链到 X / AIHOT  
4. **祈愿墙** — 当前仅 `localStorage`；后续可选共享后端  
5. **「我在休息」vigil** — 本地印记  
6. **Honesty FAQ** — 非官方、不碰账号、数据来源说明  
7. **纯静态可部署**（Cloudflare Pages / Nginx）

可选后续：
- 共享祈愿墙（Cloudflare Worker，参考 codex-reset.com 的隐私做法）
- 预测池（玩梗级，勿当预报）
- 正式 DNS 绑 `tibo.rest`

---

## 4. AIHOT API（已验证）

- **GET** `https://aihot.news/api/v1/codex-resets`  
- OpenAPI：`https://aihot.news/openapi-v1.json`  
- CORS：GET 有 `access-control-allow-origin: *`  
- 建议轮询 ≥5 分钟；支持 `If-None-Match` / ETag → 304  
- 时区：`Asia/Shanghai`（+08:00）  
- 事件类型：`direct_reset` | `reset_credit`；状态 `announced` | `confirmed`  
- 页面还有 `HEAD/GET https://aihot.news/api/public/codex-reset-version`（ETag 版本探针）  
- **不要**碰不存在的路径：`/api/codex-reset` 等会 404  
- 商业用途 header 提示：`X-AIHOT-Commercial-Use`；条款 https://aihot.news/terms  
- 联系：wzglyay@virxact.com  

样例字段见 `research/aihot-api-notes.md`。

最后在种子数据里确认过的全局 reset：约 **2026-09-12 16:09 +08**（「Reset all propagated. Sweet dreams.」）。

---

## 5. 人物调研：Tibo 是谁

**正确人物**：Thibault「Tibo」Sottiaux（`@thsottiaux`）— Codex / ChatGPT 核心产品负责人。  
**不是**：indie SaaS 的 Tibo Maker。

发帖习惯（供文案/互动）：
- 高频短帖产品日更  
- 人设核心：**Reset / Banked Reset**（「The Reset Company」气质）  
- 对竞对极短刀（如对 Anthropic「I smell fear」）  
- 出事模式：承认 → 列修复 → 再发 reset  
- 爱问社区问题；定位是产品前线指挥官，不是对齐哲学 KOL  

---

## 6. 竞品与差异化

| 站 | 气质 | 我们该学什么 | 我们不要什么 |
|----|------|--------------|--------------|
| aihot.news/codex-reset | 严肃日历+公开 API | API、ETag、归因 | 整站抄 UI |
| codex-reset.com | 预测+个人 timer+vigil | 隐私设计、社区仪式感 | 黑盒预报当真 |
| codexreset.org | 证据时间线 | 信号分级 | 监控仪表盘脸 |
| AyalX/codex-reset-tracker | 本地 CLI 读本机 auth | — | 本站不做账号读写 |

**差异化一句话**：他们是雷达站；我们是额度死后的休息室。

---

## 7. 前端调研（X + Awwwards）摘要

用户明确要求：去 X 看优秀站，整站前端优化。调研结论（休息室向）：

**最佳方向**：近黑/暖棕底 + 一个暖色强调 + 超大编辑排版 + **一个**慢动主视觉/纹理 + 滚动揭示 + 少量触感控件（pill / 进度点 / 圆形按钮）。不要满屏乱晃。

参考（学手法不抄品牌）：
- Forms（forms.world）— SplitText + ScrollTrigger  
- MIRA（trymira.com）— 电影感、暖橙 CTA、sticky 轮廓导航  
- Zephyr — 暗橄榄、serif/sans、大气单个焦点  
- Aspen Search — 噪点/半调纹理、几何面板  
- RedNova — 慢暖色背景循环  
- Mat Voyce（matvoyce.tv）— 动能大字  
- Ribbit / More Nutrition / Dylan — GSAP + Lenis/平滑滚动语言  

用户自有方法论：**HeiGe-UI**  
https://github.com/HeiGeAi/HeiGe-UI  
五道工序：开场定调 / 节奏曲线 / 一屏一主角 / 签名时刻 / 反 AI 体检。  
交接包内附：`research/heige-ui-refs/`（anti-slop、production、aesthetic、样例 HTML）。

---

## 8. 当前代码与部署状态

### 仓库
- https://github.com/HeiGeAi/tibo-rest  
- `main`：源码（Vite + vanilla JS）  
- `gh-pages`：`dist/` 静态产物  

### 本地副本（本交接包）
- `site/` — 完整源码（无 `node_modules`）  
- `site/dist/` — 最近一次 build 产物（可直接预览）  

### 技术栈（现况）
- Vite 5，`base: './'`（**必须**，否则 GH Pages 子路径 `/tibo-rest/` 会 CSS/JS 404）  
- `gsap` + ScrollTrigger  
- `lenis` 平滑滚动  
- 入口：`index.html`，逻辑：`src/main.js`，动效：`src/motion.js`，样式：`src/styles.css`，配置：`src/config.js`  
- 兜底数据：`public/data/fallback-events.json`  
- 脚本：`npm run refresh-fallback`  

### 已知严重问题 / 用户反馈时间线
1. 第一版雏形：功能有，审美弱  
2. GH Pages 预览 **整站空白**：绝对路径 `/assets/...` 404 → 已改为 `base: './'`  
3. 用户仍嫌丑、缺动效 → 加了 GSAP/Lenis 开场/滚动/磁吸  
4. 又按 X 调研补了 grain/focal wash/pills → **用户仍认为稀烂，要求换 AI**  

**接手优先建议**：不要在现有「酒店大堂模板感」上打补丁；用 HeiGe-UI 重新定调 + 重做视觉叙事。功能与 API 接线可复用，UI 层大概率需要重写级改动。

### 域名
- `tibo.rest` 曾解析到 AWS IP；正式内容应以仓库 + 用户服务器/CF Pages 为准。  
- OG/canonical 已写成 `https://tibo.rest/`（自定义域目标）。  

---

## 9. 用户偏好（相关）

- 说话/产品：偏朋友式、干脆；中文为主  
- GitHub：HeiGeAi  
- X：@Blake488137  
- 有完整设计系统 HeiGe-UI / HeiGe-Design，请优先读再用  
- 不喜欢「正确的废话」现代简约；要极端气质  

---

## 10. 建议接手步骤

1. 读本文件 + `DEVPLAN.md` + `BUILD_NOTES.md` + HeiGe-UI `SKILL.md`  
2. `cd site && npm i && npm run dev` 看现状  
3. 打开 https://heigeai.github.io/tibo-rest/ 对照用户不满点  
4. **重新定调**（用户曾选暖琥珀深夜休息室，但执行失败——可保留方向或更大胆重定，需做出签名时刻）  
5. 重做前端；保持 API/`base: './'`/功能清单  
6. `npm run build` → 推 `main` + 更新 `gh-pages`  
7. 用户服务器就绪后再绑 `tibo.rest`  

---

## 11. 本包文件树

```
tibo-rest-handoff/
  HANDOFF.md                 ← 你在这里
  research/
    aihot-api-notes.md
    tibo-persona.md
    competitors.md
    x-awwwards-design-brief.md
    heige-ui-refs/           ← 从 HeiGe-UI 拉的反 slop / 样例
  site/                      ← 当前仓库源码快照
  deploy/
    PREVIEW.md               ← 预览与分支说明
```

