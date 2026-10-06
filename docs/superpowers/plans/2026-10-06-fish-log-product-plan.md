# FISH LOG Product & Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 用戶其後明確要求「直接一次過做 到 V3」，已授權本地實作 v0.1–v0.3；不包括提交、推送或部署。

**Goal:** 將 fishboard 改成以真實釣魚紀錄逐步成長的私人 Fish Log：首頁展示已解鎖魚種的 Pixel Aquarium，以及最重要的 Catch Log。

**Architecture:** 第一版使用 `data/species.ts`、`data/catches.ts` 的明確標示 mock data，Species 與 Catch 分開。Aquarium、Collection 與統計都從 Catch → Species 關聯推導；v0.1 先完成首頁、游魚、timeline、手機版及 Catch Detail，v0.2 加魚種收藏與篩選，v0.3 才接身份、資料庫、上傳、生圖及地圖。

**Tech Stack:** 沿用現有 TypeScript / React / Tailwind、Next.js App Router 路由結構及 Vinext 執行環境；游魚採 Framer Motion，icons 採現有 Lucide。標題 Geist 或 Inter，metadata IBM Plex Mono。維持原有框架及 hosting；後端沿用最初要求的 Firebase / Firestore / Cloudinary / Workers AI。

**Spec:** 用戶 2026-10-06 提供的 FISH LOG 規格；[首頁參考圖](../references/fish-log-home-reference.png) 已保存於 `docs/superpowers/references/`。需求及範圍在本文件內整理，實作不依賴臨時附件路徑永久存在。

## Global Constraints

- 本次只更新計劃；現有未提交修改、現有本地預覽及雲端服務保持原狀。不 commit / push。
- v0.1 不加入 Supabase、Firebase 登入、Map 功能、Upload、Admin panel 或任何新 backend。
- v0.1 的 mock catches 是示範紀錄，不可宣稱為用戶真實漁獲；页面有低調但清楚的 Demo data 標示。
- 每個有 Catch Record 的 Species 在 Aquarium 只出現一條魚。新增同魚種 Catch 不新增游魚；新增魚種首次 Catch 才解鎖。
- 獨立示範魚不可混入 Aquarium／統計；空 Catch Log 對應空 Aquarium，不能補入無關裝飾魚。
- 保留 app 中其他未提交工作；實作需先核對 dirty diff，逐項整合，不能 reset 或以舊版本覆蓋。
- 純白留白 Aquarium 取代現有 Three.js 水背景方向；不加入寫實海景、大面積藍色、gradient、glassmorphism、heavy shadow 或 SaaS dashboard 元素。
- 尊重 prefers-reduced-motion；背景頁暫停動畫；提供暫停游魚的可操作控制。
- 所有私人照片、位置、紀錄在 v0.3 維持私人存取；mock UI 不構成任何雲端權限實作。

## Review Focus

1. 同一 Species 有多條 Catch：Caught 數加一，但 Species 數與游魚數不增加。
2. 空資料或未知 speciesId：正常空狀態；不 crash、不顯示錯誤魚種或虛構紀錄。
3. 日期／長度缺值及同日期多條 Catch：日期分組、時間排序及最佳長度計算仍正確；不把缺值顯示為零。
4. 手機、keyboard／touch、reduced-motion：紀錄資訊完整，整張卡可開詳情，游魚不遮擋主要操作。
5. mock／真實資料切換：畫面有明確資料來源，不將示範紀錄匯入正式帳戶，不用硬寫統計數字。

---

## 產品方向與參考圖解讀

品牌主文案：`FISH LOG`，副文案 `MY WATERS, MY CATCHES.`。主要用途是查閱自己的每次釣獲，並看見已釣魚種逐步增加。

參考圖用來定義構圖、留白、pixel fish、timeline 與 metadata 層次。`23 CAUGHT / 48 SPECIES` 只視為視覺佔位；在本產品規則下，已解鎖 Species 數不可大於 Catch 數。實作顯示實際推導數字，例如 fixture 有 8 次釣獲／6 個魚種就顯示 `8 CAUGHT / 6 SPECIES`。

第一版採六個魚種、八條 mock catch，其中兩個魚種各有重複紀錄，展示 Species／Catch 的差別。資料為設計 fixture；魚種／學名尚未查證時不編造學名，保留未提供狀態。

### Design System

| Token | 值／用法 |
| --- | --- |
| Background | `#F7F6F1` |
| Surface | `#FCFBF8` |
| Text | `#191919` |
| Secondary text | `#777772` |
| Border | `#DEDDD7`；1px thin border |
| Accent blue | `#278DE5`；active underline、timeline node、少量點綴 |
| Aquarium radius | 約 10px |
| Heading | Geist／Inter；中文用可靠 system fallback |
| Metadata | IBM Plex Mono；有 letter-spacing，日期、時間、location、英文魚名使用 |

Desktop 主容器約 1200px，左右留白；首頁魚缸高度約 440–500px。Mobile 留 20px 邊距，魚缸約 300px；實作以內容／viewport 自適應，不整張縮小 desktop table。

Pixel art 是主視覺。每個魚種使用獨立透明圖片，`image-rendering: pixelated`；不能用 emoji／普通 fish icon 代替主魚圖，也不能將整張參考 screenshot 當網站背景。

### Header

- 左側品牌與副文案，右側 HOME / COLLECTION / MAP / SETTINGS；active page 用細藍線。
- v0.1 HOME 可操作；未完成的 COLLECTION / MAP / SETTINGS 用靜態淡色文字及「Coming later」可讀提示，不放死 link、空白 route 或假 setting button。
- v0.2 啟用 COLLECTION；v0.3 啟用 MAP。SETTINGS 的完整內容不在此次 scope，後期至少需要帳戶／登出才啟用。
- Mobile 品牌保持清楚，navigation 可換行成簡短第二行，避免隱藏主要內容或水平溢出。

### Pixel Aquarium

- 大型 off-white 白框、thin grey border、10px radius、大量留白；左上 derived caught／species count，右下 `DIFFERENT WATERS / SAME OBSESSION.`。
- 只列出有 Catch 的 species，按首次釣獲時間排序，確保位置不因重新 render 任意跳動。
- 水平慢游，Y position／speed／direction 由 speciesId 的固定 seed 推導，避免 SSR hydration 差異；duration 20–60 秒，少量 vertical floating。
- direction 以 inner fish 的 `scaleX(-1)` 處理，不能翻轉 tooltip 文字；外層控制位置。
- 小螢幕減少魚圖尺寸及移動幅度；魚不可遮擋 count、文案或其他操作。
- v0.1 游魚展示為非互動；v0.2 加 hover／keyboard／tap tooltip，內容中文名、英文名、caught count、best length，click／Enter 開 Species Detail。
- reduced-motion 顯示分散靜止魚；暫停控制仍可使用。空資料顯示「尚未有釣獲紀錄」，沒有任意裝飾魚。

### Catch Log 與 Mobile

- 首頁 Aquarium 後的主要內容為 `CATCH LOG`，最新紀錄排最前；左侧 timeline 是日期，不使用完整 dashboard table。
- Desktop：同日紀錄分組，左側 `04 / OCT / 2026`、blue node／thin line；右側每條 Catch Card 優先 fish icon、中文／英文魚名、time、location、length、arrow。
- Mobile：日期作 group heading，卡內 fish＋name 在頂部，下面 time、location，length 靠右下；arrow 只作導向提示。不得水平 scroll 才能看主要資訊。
- 可點整張 Catch Card，使用語義化 link；keyboard focus 明顯，不能只靠 hover／arrow clickable。
- v0.1 顯示全部紀錄。ALL / SPECIES / LOCATION / YEAR 功能在 v0.2 一起加入，不在第一版放看似可用但無效果的 filter。

### Catch Detail：v0.1

路由 `/catches/[id]`；從 timeline 點卡進入，提供 Back to Catch Log。

顯示 pixel fish、中文名、英文名、date、time、location、length（cm）、weight（g）、original photo、Rod、Reel、Line、Lure / Bait、Notes。

可選欄位未提供時顯示 `未記錄`；不存在相片時顯示簡單「未提供原始魚相」，不冒充原相。Notes 保留換行並作文字渲染，不插入 HTML。未知 catch id 進正常 404。

### Collection 與 Species Detail：v0.2

- `/collection` 只展示有 Catch 的 Species，pixel fish、雙語名、catch count、best length；empty collection 與空 catch log 一致。
- `/species/[id]`：pixel fish、中文名、英文名、scientific name（如有）、catch count、best length、first caught date、catch history。history 每項可開 Catch Detail。
- metadata 由 Catch records 推導；不在 Species fixture 重複保存會失去同步的 totalCaught／bestLength。
- Tooltip 在 hover／focus 可用；touch 第一次 tap 顯示資料，提供明確 View species link，避免 tap 即跳走而無法看資訊。
- filters 可組合 species、location、year，ALL reset；year 使用 catch.date 的年份。列表按 filtered catch 顯示，Aquarium 保持全帳戶 unlocked species，不因篩選而看似失去解鎖。

### Map：v0.3

- 顯示有座標的 Catch Location；click location 看 count、species、catch records。
- location 文字與 lat/lng 分開；沒座標的 catch 可在列表查看，不猜測地點中心或插入假的 pin。
- 相同地點優先以 locationId 關聯；第一版不把所有同名 location 的不同座標強行合併。
- map provider／定位輸入方式在 v0.3 實作前選定。地點與照片不作公開分享。

## Data Model 與統計

```ts
type Species = {
  id: string;
  chineseName: string;
  englishName: string;
  scientificName?: string;
  pixelImage: string;
};

type Catch = {
  id: string;
  speciesId: string;
  date: string; // YYYY-MM-DD；本地釣獲日期，不轉為 UTC 再分組
  time?: string; // HH:mm；第一版預設 Asia/Hong_Kong
  location: string;
  length?: number; // cm，正數
  weight?: number; // g，正數
  photo?: string;
  rod?: string;
  reel?: string;
  line?: string;
  lure?: string; // UI 顯示 Lure / Bait
  note?: string;
};

type SpeciesSummary = Species & {
  totalCaught: number;
  bestLength?: number;
  firstCaughtDate?: string;
};
```

- `totalCaught` 是同 speciesId 的 catch 數；`bestLength` 只取有有效正數 length 的最大值，沒有值不顯示 0 cm。
- `firstCaughtDate` 是最早 catch.date；所有统计使用同一 selectors，Aquarium、tooltip、detail 不各自計算不同結果。
- 八筆 fixture 必須 refer 到六個既有 species；id 唯一、日期有效、時間格式有效。未知 speciesId 是資料錯誤，不默默計入 Species count。
- 同日期按 time 降序；有時間排在無時間之前；同時間以 id 作穩定 tie-break。
- v0.3 加 `locationId`、`coordinates`、timezone、createdAt／updatedAt、資產 references；uid 由 auth 決定，不能接受 browser 自報 owner。
- v0.3 Species 依帳戶保存 pixel image；不假設不同用戶同 speciesId 必須共用同一張私人魚相或 AI 圖。

## Suggested Structure 與現有項目整合

```text
app/page.tsx                       Home：Aquarium + CatchLog
app/catches/[id]/page.tsx           v0.1 Catch Detail
app/collection/page.tsx             v0.2 Collection
app/species/[id]/page.tsx           v0.2 Species Detail
app/map/page.tsx                    v0.3 Map
components/layout/Header.tsx
components/aquarium/Aquarium.tsx
components/aquarium/SwimmingFish.tsx
components/aquarium/FishTooltip.tsx v0.2
components/catch/CatchLog.tsx
components/catch/CatchLogItem.tsx
components/catch/CatchTimeline.tsx
components/fish/PixelFish.tsx
components/fish/FishCard.tsx         v0.2
data/types.ts
data/species.ts
data/catches.ts
lib/fish-log.ts                     純函數 selectors／統計
public/fish/                       每魚種透明像素圖
tests/fish-log.test.mjs
```

現有 `app/page.tsx` 是 ChatGPT guard + collection，目前包含 demo fish、Three.js water、上傳及圖片 API。實作 v0.1 時首頁改讀 fixture，不經身份／資料 API；原 API 與 storage 工作用原檔保留，不為 mock 頁面建立新的 backend。

`app/collection.tsx`（舊魚缸 component）與新 `app/collection/page.tsx`（Collection route）不同，實作時避免混淆；不要把舊 upload 流程直接掛到 v0.1。舊 `app/aquarium.tsx`／`app/water-background.tsx` 可暫留未使用，不為視覺重做刪除 unrelated code。

此計劃基於本次已核對的本地 route／components，現有 graph 的 freshness limitations 已在原服務方案紀錄；執行前再次核對 source、dirty diff 及新路由衝突。

## v0.1 Implementation Tasks

### Task 1：Mock data、Species／Catch 關聯及 selectors

**Files:** 新 `data/types.ts`、`data/species.ts`、`data/catches.ts`、`lib/fish-log.ts`、`tests/fish-log.test.mjs`。

**Interfaces:** `getSpeciesSummaries(species:Species[], catches:Catch[]): SpeciesSummary[]`；`getCatchDetail(id:string): {catch:Catch,species:Species}|null`；`groupCatchesByDate(catches:Catch[]): Array<{date:string,items:Catch[]}>`。

- [ ] 建六種／八次 fixture，至少两个 Species 有多次 Catch；時間、地點、長度及 gear／notes 用來測試完整／缺值詳情。
- [ ] 寫 meaningful selectors tests：8 caught／6 unlocked；再加同 species catch 只增加 caught；first caught／best length 正確；空資料回空結果；同日 ordering 穩定；unknown reference 不可當另一魚種。
- [ ] 按現有 node-test TS fixture loading 方式執行 `node --test tests/fish-log.test.mjs`，先確認 selectors 未實作時失敗，再實作並通過。

**驗收:** 統計及關聯有一個可信來源；沒有寫死 UI counts。

### Task 2：Header、Design Tokens 及 Pixel Fish 素材

**Files:** 改 `app/layout.tsx`、`app/globals.css`；新 `components/layout/Header.tsx`、`components/fish/PixelFish.tsx`、`public/fish/*`；需要時改依賴清單。

**Interfaces:** `Header({active:'home'|'collection'|'map'|'settings'})`；`PixelFish({species,size?,decorative?})`，從 species.pixelImage 載入，外部 link 負責可讀名稱。

- [ ] 落實六色 tokens、字體、metadata letter-spacing、border／radius；新頁面用局部 class，避免無差別覆蓋其他現有 UI。
- [ ] 準備六款獨立魚種 pixel assets；先使用可確認來源的素材或按參考風格製作，透明邊界與主要花紋需人工驗收。素材取得／AI 生圖若未實際完成，不能以 emoji 冒充完成。
- [ ] Header 實作 HOME active；後期導覽用明確 unavailable 表示；mobile 不溢出。
- [ ] 瀏覽器檢查 desktop／390px mobile 字體、排版、圖片加载與 keyboard focus，不為纯 token 改動增加鏡像測試。

**驗收:** 色彩／留白／pixel identity 貼近參考圖；可用及未提供的導航不混淆。

### Task 3：Pixel Aquarium 與 Swimming Fish

**Files:** 新 aquarium components；改 `app/page.tsx`，依需要加入 Framer Motion（執行時鎖相容版本）。

**Interfaces:** `Aquarium({species:SpeciesSummary[],totalCaught:number})`；`SwimmingFish({species,index,paused})`。動畫 seed 由 species.id 決定。

- [ ] 首頁移除對 ChatGPT 登入／私人 API 的依賴，讀 mock selectors；顯示 Demo data。
- [ ] 實作白框、derived counts、兩行右下文案與一魚種一魚的布局。
- [ ] 加 20–60 秒慢游／方向／微浮動，scaleX 只影響圖片；pause／reduced-motion／page hidden 凍結移動。
- [ ] browser 驗證六條魚而非八條；空資料不補魚；desktop／mobile 不遮住文案，關閉動畫後仍可正常閱讀。

**驗收:** Aquarium 是 unlocked species 的視覺呈現，沒有多餘海洋背景。

### Task 4：Catch Log Timeline 與手機卡片

**Files:** 新 CatchLog／CatchLogItem／CatchTimeline；首頁接入。

**Interfaces:** `CatchLog({groups, speciesById})`；每筆 link href 為 `/catches/{id}`。日期由分組傳入，不從圖片或 fish name 猜。

- [ ] 完成 latest-first date groups、timeline nodes、桌面 card 欄位順序；中文名最突出，英文名／時間／地點為 metadata。
- [ ] 完成 mobile card hierarchy，保持 name、time、location、length 全部可讀；同日 date heading 只出現一次。
- [ ] 缺時間／長度用 `未記錄`／`—`，沒有紀錄用明確 empty state；整卡為可 keyboard 操作的 link。
- [ ] browser 驗證 390px、768px、1440px；逐項核對 click 目標、無水平溢出、沒有無效果的 filter。

**驗收:** Catch Log 是首頁最主要可掃讀資訊區，手機不是縮小 table。

### Task 5：Catch Detail 與最終 v0.1 驗證

**Files:** 新 `app/catches/[id]/page.tsx`；必要的 detail styles；改 `README.md` 記錄 demo-mode scope。

**Interfaces:** 沿用 `getCatchDetail(id)`，unknown id 用 `notFound()`；photo 缺值不請求虛構 URL。

- [ ] 顯示需求列出的所有 catch 欄位，units cm／g；原相只在 fixture 真有可用素材時展示，其他為未提供。
- [ ] Back link 返回 `/#catch-log`；長 Notes／長地點名不撐爆 mobile。
- [ ] 瀏覽器驗證 timeline → detail → back、重新整理 detail、未知 id、缺相片及可選欄位缺值。
- [ ] 執行 `npm test`、`npx tsc --noEmit`、`npm run build` 及 `npm run lint`；existing failures 與新問題分開報告。完成後重開／保持本地 preview，提供 desktop／mobile screenshots。

**v0.1 done:** mock homepage、游魚、timeline、mobile、Catch Detail 全部可用；沒有 backend、upload、map 或假實資料。

## v0.2 Roadmap

1. `Collection` route：unlocked Species cards，共用 summary selector。
2. `Species Detail` route：雙語名／optional 科學名、totalCaught、bestLength、firstCaughtDate、完整 catch history。
3. Fish Tooltip：hover／focus／touch 等價可讀，從 Aquarium 開 Species Detail。
4. Species／Location／Year filters＋ALL reset，與空 filter results；保留全帳戶 Aquarium 的解鎖語義。
5. 統計驗證：同一 selectors 在所有頁面一致，duplicate catch 不會變成新 species。

v0.2 實作前再補對應 routes／filter tests 的細項計劃，毋須提前 scaffold 尚未用到的功能。

## v0.3 Roadmap：Backend、Add Catch、Upload、Map

Backend 存在兩份要求：早前指定 Firebase + Firestore + Cloudinary + Workers AI，最新規格寫 Supabase。兩者不一起裝；選定後才更新服務實作計劃。無論選哪個，v0.1／v0.2 的 Species／Catch 分離及公開 component contracts 均維持。

| 方案 | 身份／資料 | 圖片 | 生圖 |
| --- | --- | --- | --- |
| A：原服務方向 | Firebase Auth / Firestore | Cloudinary authenticated assets | Cloudflare Workers AI |
| B：新規格方向 | Supabase Auth / Postgres | Supabase private Storage | Cloudflare Workers AI，由後端呼叫 |

方案 A 可沿用目前 Cloudinary wrapper；方案 B 適合 Species／Catch relational queries，但要將既有 D1／Cloudinary／R2 references 搬遷及建立 RLS／private storage policy。選 B 不代表 Workers AI 被 Supabase 自動取代。

完整新增流程：

1. Private login，建立 Catch 草稿，填日期／時間／地點／尺寸／裝備／notes，上傳原魚相。
2. 選擇既有 Species：重用該帳戶 pixel fish，只保存新 Catch，不重複生成。
3. 新 Species：填名稱，從原相生成符合該魚形／花紋的透明 Pixel Fish，預覽確認後保存 Species。
4. Species 可引用且圖片保存成功後才保存 Catch；若單獨 Species 保存成功而 Catch 失敗，Species 沒有 Catch，暫不算 unlocked，也不進 Aquarium。
5. Catch 保存成功才解鎖 Collection／Aquarium；generation request 用 idempotency 防止重複收費。故障與中斷用後端恢復，不靠前端 optimistic fish 充數。
6. Add Map 的 location／coordinates 及 private policy；原相／像素圖後端核對 owner。

正式資料從舊 D1 搬遷前要建立 owner 對應及 Species 分類；舊紀錄目前主要是 name／date／image，不可推測 time、location、gear、scientific name。未知值保留缺值，未知 Species 必須讓擁有人分類，不按相片或暱稱隨意合併。

## 本次實作狀態（2026-10-06）

- 已實作首頁、六款魚種素材、游魚／暫停／reduced motion、雙語 Tooltip、Catch Timeline、手機卡片、Catch Detail。
- 已實作 Collection、Species Detail、Catch 衍生統計、Species／Location／Year filters。
- 已實作 Add Catch（示範模式本地保存）、裝備及 Notes、原相／Pixel PNG 上傳入口、Leaflet 地圖與地點紀錄篩選、JSON 備份。
- 已加入 Firebase Auth 私人 session、UID 隔離 Firestore REST、私人 Cloudinary 圖片、Workers AI 原相參考生圖、透明背景處理、重複提交防護及故障清理／reconciliation。
- Browser 驗證：新增既有魚種、detail、reload 保留、species history、地圖地點篩選、390px 手機版；本次臨時測試紀錄已還原。
- 22 個測試通過；TypeScript、build、lint 及 Worker dry-run 驗證記錄見 `docs/service-setup.md`。

**雲端未完成驗證：** 本機缺 Firebase Web／服務帳戶及 Workers AI 設定。沒有建立雲端專案、真實登入、實際 Firestore 保存、實際 Workers AI 生圖、舊資料搬遷或部署。Cloudinary 配置存在，私人新流程只做 mock 測試。AI 目前在儲存時生成；獨立生成預覽／確認流程尚未加入。六款首頁素材為本次設計素材，不能視作 Workers AI 成功證據。

服務接駁步驟：[`docs/service-setup.md`](../../service-setup.md)。舊 D1／R2／ChatGPT routes 保留；不自動搬遷或刪除既有資料。
