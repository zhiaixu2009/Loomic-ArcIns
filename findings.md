# Findings & Decisions

## Requirements
- 鍩轰簬 Lovart銆丷aphael Studio銆佸缓绛戝闀?Canvas 鐨勬搷浣滈€昏緫涓庤璁¤瑷€锛屾墦閫犲缓绛戞晥鏋滃浘 / 婕旂ず瑙嗛涓撶敤鐨勫崗鍚屽紡 Agent Studio銆?- 蹇呴』鏀寔澶氫汉鍦ㄥ悓涓€椤圭洰鍐呭崗鍚屾搷浣滐紝骞朵笌鐜版湁 Loomic 鐢诲竷銆佽亰澶┿€侀」鐩兘鍔涜瀺鍚堛€?- Agent 闇€瑕佸叿澶囪鍒掋€佺瓫閫夌瓥鐣ャ€佹墽琛屾楠ゃ€佷骇鐗╄惤浣嶃€佸彲涓柇鎭㈠绛夎兘鍔涖€?- 鎵ц杩囩▼蹇呴』鍐欏叆鏂囨。锛屼笖寮€鍙?/ 楠岃瘉閲囩敤 WSL Docker 鐨勯儴缃叉€濊矾銆?- 鍏堝畬鎴?PRD锛屽啀缁х画瑙勫垝銆佽璁°€佹墽琛屻€侀獙璇併€?
## Research Findings
- 浠撳簱褰撳墠鏄竴涓?Turborepo 鍏ㄦ爤椤圭洰锛屾牳蹇冩妧鏈爤涓?Next.js 15銆丷eact 19銆丗astify 5銆丩angChain / LangGraph銆丼upabase銆丒xcalidraw銆?- 鐜版湁浜у搧宸茬粡鍏峰锛欻ome prompt 杩涘叆椤圭洰銆丳rojects 鍒楄〃銆丆anvas 鏃犻檺鐢诲竷銆丆hatSidebar銆佸浘鐗?/ 瑙嗛鐢熸垚銆丅rand Kit銆佹妧鑳界郴缁熴€佸伐浣滃尯璁剧疆銆?- `apps/server/Dockerfile` 宸叉敮鎸佸皢 server / worker 浠?`SERVICE_MODE` 鍒囨崲杩愯锛屼絾浠撳簱褰撳墠娌℃湁 repo 绾?compose 缂栨帓鏂囦欢銆?- WebSocket 鏍堝綋鍓嶄富瑕佽鐩?agent.run銆乤gent.cancel銆乧anvas.resume銆乼ool events銆乼hinking delta銆乵essage delta銆乺un lifecycle锛涙病鏈夋樉寮忕殑 presence / cursor / selection / canvas mutation 鍏变韩浜嬩欢銆?- `CanvasService` 鐩墠浠呮彁渚涚敾甯冨唴瀹?GET / PUT锛涘墠绔?`CanvasEditor` 鑷姩淇濆瓨鐢诲竷锛屼絾娌℃湁澶氫汉瀹炴椂鍚屾鍗忚銆?- WSL 涓?`docker version` 鍜?`docker compose version` 鍙敤锛沇indows 渚?`docker` 涓嶅湪 PATH 涓娿€?- WSL 涓綋鍓嶅彲瑙?`node`锛屼絾鏈‘璁?`pnpm`銆乣bun`銆乣supabase`銆乣ralph`銆乣codex` 鏄惁鍙洿鎺ユ墽琛屻€?- 褰撳墠浠撳簱鍦?WSL 涓嬪瓨鍦ㄥぇ閲忔湭鎻愪氦鏇存敼锛涘繀椤婚粯璁よ繖鏄敤鎴风幇鎬侊紝涓嶈兘娓呯悊鎴栧洖婊氥€?- WSL 宸ュ叿閾剧幇宸茬‘璁わ細
  - `pnpm 10.26.2`
  - `bun 1.3.12`
  - `supabase 2.89.1`
  - `ralph 1.2.2`锛岄€氳繃 `bun /home/admin123/.npm-global/lib/node_modules/@th0rgal/ralph-wiggum/ralph.ts --version` 楠岃瘉
- Ralph 鐨?Codex fallback 宸插畬鎴愯惤鍦帮細`scripts/wsl/codex-win` 鍙湪 WSL 涓垚鍔熸墽琛?Windows `codex exec --help`銆?- 褰撳墠 WSL Docker 瀵瑰叕鍏遍暅鍍忎粨搴撶殑鎷夊彇瀛樺湪鐜闃诲锛?  - `supabase start` 鎷夊彇 `public.ecr.aws/*` 鎶?`EOF`
  - `docker pull node:22-slim` 涓?`docker pull nginx:1.27-alpine` 鎷夊彇 `registry-1.docker.io` 涔熸姤 `EOF`
  - 鍥犳褰撳墠瀹瑰櫒楠岃瘉闃诲褰掑洜浜?Docker registry 杩為€氭€э紝鑰屼笉鏄?compose 璇硶鎴栦粨搴?Dockerfile 鏈韩銆?
## M1 Workspace Current State

- 棣栭〉 `/` 褰撳墠浠嶆槸绾惀閿€钀藉湴椤碉紝娌℃湁寤虹瓚涓撶敤宸ヤ綔鍙板叆鍙ｃ€?- 宸茬櫥褰曠敤鎴蜂富瑕侀€氳繃 `/home` 鎴?`/projects` 鍒涘缓椤圭洰锛屽啀鐩存帴璺宠浆鍒?`/canvas?id=<primaryCanvasId>`銆?- 椤圭洰鍒涘缓鍏抽敭閾捐矾闆嗕腑鍦?`apps/web/src/hooks/use-create-project.ts`锛屽叾涓瓨鍦?`loading-preview` 鏂版爣绛鹃〉涓?`sessionStorage` 浜ゆ帴閫昏緫锛屼笉鑳藉湪 M1 涓矖鏆存浛鎹€?- 褰撳墠宸ヤ綔鍙板３灞傛槸鍒嗚鐨勶細
  - `(workspace)` 璐熻矗 Home / Projects / Settings 绛?  - `/canvas` 鐙珛鎵胯浇鐪熷疄缂栬緫鍣ㄤ笌 `ChatSidebar`
- `apps/web/src/components/canvas-editor.tsx` 宸插瓨鍦?hydration 涓庤嚜鍔ㄤ繚瀛樹繚鎶ら€昏緫锛孧1 鐨勫３灞傛敼閫犲繀椤婚伩鍏嶅紩鍏?remount 鍥炲綊銆?
## M2 Collaboration Current State

- WebSocket 鐜扮姸鏇村亸鍚?Agent 娴佸紡浜嬩欢锛岃€屼笉鏄浜哄崗鍚屼簨浠躲€?- 鍏抽敭鏂囦欢锛?  - 鏈嶅姟绔細`apps/server/src/ws/handler.ts`銆乣connection-manager.ts`銆乣event-buffer.ts`
  - 鍓嶇锛歚apps/web/src/hooks/use-websocket.ts`銆乣apps/web/src/components/chat-sidebar.tsx`銆乣apps/web/src/components/canvas-editor.tsx`
  - 鍏变韩鍗忚锛歚packages/shared/src/events.ts`銆乣packages/shared/src/ws-protocol.ts`
- 褰撳墠缂哄け鏄惧紡鐨?`presence`銆乣cursor`銆乣selection`銆乣canvas mutation` 鍗忚銆?- 褰撳墠鐢诲竷浜虹被缂栬緫淇濆瓨妯″紡鏄?HTTP `PUT` 鍏ㄩ噺鍐呭鏇存柊锛屼笉鍏峰瀹炴椂鍗忓悓璇箟銆?
## M3 / M4 Agent Runtime Current State

- 宸插叿澶囩鍒扮鐨?`run / thinking / message / tool / canvas-sync / billing` 娴佸紡浜嬩欢銆?- 褰撳墠缂哄け锛?  - 涓€绛夊叕姘戠殑 `plan / step` 瀵硅薄
  - 瀹℃壒涓柇 / 鎭㈠ / retry 濂戠害
  - 寤虹瓚棰嗗煙瀵硅薄涓庡伐浣滄祦妯℃澘
- 鍏抽敭钀界偣锛?  - 鏈嶅姟绔繍琛屾椂锛歚apps/server/src/agent/runtime.ts`銆乣deep-agent.ts`銆乣sub-agents.ts`
  - 鎸佷箙鍖栦笌鍏变韩濂戠害锛歚packages/shared/src/contracts.ts`銆乣events.ts`銆乣artifacts.ts`
  - 鍓嶇灞曠ず锛歚apps/web/src/components/chat-sidebar.tsx`銆乣use-chat-stream.ts`銆乣tool-block-view.tsx`
- M3 鐨勯樁娈垫€ц璁＄粨璁哄凡缁忓喕缁擄細
  - 閲囩敤鈥滄樉寮?planning tools + `agent-plan` content block + WS 鎺у埗鍛戒护鈥濈殑绐勯棴鐜?  - 鏈樁娈典笉鏂板缓 `agent_run_steps` / `agent_run_artifacts` 琛?  - 璁″垝鍧楃洿鎺ュ鐢ㄧ幇鏈夎亰澶╂秷鎭?`contentBlocks` 鎸佷箙鍖栬兘鍔?  - `resume` 涓?`retry` 閮藉垱寤烘柊鐨?run锛屼絾澶嶇敤鍚屼竴 session / thread 涓婁笅鏂?
## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 浠ョ幇鏈?`Home -> createProject -> /canvas` 浣滀负鍒囧叆鐐癸紝鎵╁睍 Architecture Studio 鍏ュ彛锛岃€屼笉鏄彟璧峰叏鏂板簲鐢?| 鍑忓皯瀵圭幇鏈夎璇併€侀」鐩€佺敾甯冦€佷細璇濋摼璺殑澶嶅埗 |
| 寤虹瓚宸ヤ綔鍙伴噰鐢ㄢ€滀腑蹇冪敾甯?+ 宸︿晶涓婁笅鏂囧鑸?+ 鍙充晶 Agent 妫€鏌ュ櫒鈥濈殑澹冲眰 | 鑳借瀺鍚?Raphael 鐨?prompt-to-studio銆佸缓绛戝闀跨殑宸﹀彸渚у伐浣滃尯銆丩ovart 鐨勬櫤鑳界敾甯冭涔?|
| 澶氫汉鍗忎綔鍏堝疄鐜伴」鐩骇 presence銆佸厜鏍囥€侀€夊尯銆佺敾甯冨彉鏇村箍鎾?| 杩欐槸 Phase 2 鐨勬渶灏忛棴鐜紝鑳戒负鍚庣画 Agent 鍗忓悓鍜岃瘎瀹￠摵璺?|
| Agent 瑙勫垝鑳藉姏浼樺厛鍦ㄥ叡浜绾﹀拰鍓嶇灞曠ず灞傝惤鍦帮紝鍐嶉€愭鎵╁睍鏈嶅姟绔繍琛屽厓鏁版嵁 | 褰撳墠宸叉湁 tool / thinking / run 鐢熷懡鍛ㄦ湡锛屽閲忔墿灞曢闄╂洿浣?|
| 寤虹瓚棰嗗煙瀵硅薄鍏堜互鍏变韩绫诲瀷銆佸伐浣滃彴妯℃澘鍜?Agent context 娉ㄥ叆涓轰富 | 鍙互灏藉揩褰㈡垚浜у搧鑳藉姏锛屽啀瑙嗛渶瑕佹墿灞?DB 鎸佷箙鍖?|
| 瀹瑰櫒缂栨帓閲囩敤 WSL host 缃戠粶浼樺厛锛屽繀瑕佹椂鐢?`host-gateway` fallback | 鏈湴 Supabase 榛樿鏆撮湶鍦?WSL 绔彛锛屽簲鐢ㄥ鍣ㄨ蛋 host 缃戠粶鏈€鐩存帴 |
| WSL 涓殑 Ralph-Codex 妗ユ帴閲囩敤浠撳簱鍐呰剼鏈€屼笉鏄敤鎴风骇 shell alias | 渚夸簬鏂囨。鍖栥€佺増鏈寲鍜屽洟闃熷鐢?|
| 鍦ㄦ湰鏈?registry 鏈仮澶嶅墠锛屽鍣ㄩ獙璇佸彲鍏堝尯鍒嗕负鈥渃ompose 瑙ｆ瀽閫氳繃鈥濆拰鈥滈暅鍍忔媺鍙栭樆濉炩€濅袱灞傝瘉鎹?| 閬垮厤鎶婂閮ㄩ暅鍍忎粨搴撴晠闅滆鍒や负椤圭洰閰嶇疆闂 |
| M1 鍏ュ彛鍒囨崲閲囩敤 `studio=architecture` 鏌ヨ鍙傛暟锛岃€屼笉鏄噸鍐?`/canvas` 璺敱 | 澶嶇敤鐜版湁 prompt/session handoff锛岄伩鍏嶈Е纰?`CanvasEditor` 鐨?hydration/save 椋庨櫓鐐?|
| 鍙充晶 Agent inspector 缁х画澶嶇敤 `ChatSidebar`锛岄€氳繃杞婚噺 header 娉ㄥ叆鍒囨崲鎴愬缓绛戝伐浣滃彴璇箟 | 鑳芥渶灏忔敼鍔ㄤ繚鐣欑幇鏈夎亰澶┿€佷細璇濄€佹祦寮忎簨浠惰兘鍔?|
| 宸︿晶寤虹瓚宸ヤ綔鍙颁俊鎭眰鍏堝仛鍓嶇 Studio rail锛屼笉寮鸿鎻愬墠钀?DB domain objects | 濂戝悎 PRD 鍐荤粨鍚堝悓鍜?M4 鐨勫悗缁妭濂?|
| M3 涓嶅厛鍋氱嫭绔嬬紪鎺掑櫒锛岃€屾槸鍏堝湪鐜版湁杩愯鏃朵笂鍙犲姞 plan/step 鎺у埗闈?| 鑳芥渶蹇舰鎴愮敤鎴峰彲瑙佽兘鍔涳紝鍚屾椂鎺у埗椋庨櫓涓庡洖褰掗潰 |
| M3 鐨勮鍒掓寔涔呭寲鍏堟斁杩涜亰澶╂秷鎭?`contentBlocks`锛岃€屼笉鏄柊澧炴暟鎹簱琛?| 鐜版湁 chat 鎸佷箙鍖栧凡鍙法鍒锋柊淇濈暀娑堟伅鍧楋紝閫傚悎褰撳墠鏈€灏忛棴鐜?|

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| PowerShell 涓?`rg.exe` 鎵ц寮傚父 | 鍚庣画鎺㈢储缁熶竴璧?WSL shell |
| 绔炲搧 Lovart 鐩存帴鐢诲竷椤靛瓨鍦ㄥ姩鎬佸姞杞?/ robots 闄愬埗 | 閲囩敤宸插畬鎴愮殑鍏紑鐗规€х爺绌朵笌鍏朵粬涓ょ珯鐨勫疄闄呭伐浣滄祦瑙傚療琛ヨ冻 |
| `using-git-worktrees` 鎶€鑳界殑榛樿寤鸿涓嶉€傚悎褰撳墠鑴忓伐浣滃尯 | 鏄庣‘璁板綍涓嶅惎鐢?worktree锛屽苟缁х画鍦ㄧ幇鏈夊伐浣滃尯澧為噺鎺ㄨ繘 |
| `supabase start` 鏃犳硶鎷夊彇 `public.ecr.aws` 闀滃儚 | 璁板綍涓虹幆澧冮樆濉烇紝骞跺湪 validation 鎶ュ憡涓垎绂昏褰?|
| `docker pull node:22-slim` / `nginx:1.27-alpine` 涔熷け璐?| 璇存槑闃诲浣嶄簬 Docker 瀵瑰鎷夐暅鍍忥紝鑰岄潪 Supabase 鐗逛緥 |
| `pnpm --filter @loomic/web test` 褰撳墠浼氬嵎鍏ュ涓巻鍙插け璐ュ浠?| 褰撳墠楠岃瘉鏀逛负鈥滃畾鍚戞祴璇曢€氳繃 + 鍏ㄩ噺澶辫触鍘熷洜鐣欑棔鈥濓紝閬垮厤鎶婃棫鍣煶璇垽涓烘湰娆″洖褰?|

## M1 Implementation Findings

- `useCreateProject` 鐜板湪榛樿鎶婃柊椤圭洰閫佸叆 `studio=architecture`锛屼粠鑰岃 Home prompt銆丳rojects 鍒涘缓鍏ュ彛銆丆anvas 鍐呮柊椤圭洰鍏ュ彛缁熶竴杩涘叆寤虹瓚宸ヤ綔鍙般€?- `buildCanvasUrl()` 鎴愪负 M1 鐨勫叡浜矾鐢卞绾︼紝閬垮厤 Home銆丳rojects銆丳rojectList 鍚勮嚜鎵嬪啓 `/canvas?...`銆?- Home 涓?Projects 閮芥柊澧炰簡 `ArchitectureStudioEntry`锛屾妸浜у搧鍏ュ彛浠庘€滅函椤圭洰鍒楄〃鈥濇彁鍗囦负鈥滃伐浣滃彴鍏ュ彛 + 璇箟鍖栨澘鍧楄鏄庘€濄€?- `/canvas` 鍦?`studio=architecture` 妯″紡涓嬪鍔狅細
  - 宸︿晶 `ArchitectureStudioRail`
  - 绉诲姩绔?`ArchitectureStudioCompactBar`
  - 鍙充晶 `ChatSidebar` 鐨?Architecture Agent 澶撮儴璇箟
- `AppSidebar` 鐨?Projects 鏍囩鏀逛负 `Studio`锛屽苟鍔犱簡 `Arch` 寰芥爣锛屽己鍖栧缓绛戝伐浣滃彴鍏ュ彛璁ょ煡銆?- M1 鏂板娴嬭瘯瑕嗙洊锛?  - `test/architecture-studio-shell.test.tsx`
  - `test/chat-sidebar.test.tsx` 鐨勪緷璧?mock 琛ラ綈涓?smoke 淇濇寔

## M2 Collaboration Implementation Findings

- 鍗忎綔鍚堝悓宸茬粡娌跨潃鈥滃叡浜被鍨?-> 鏈嶅姟绔箍鎾?-> 鍓嶇璁㈤槄涓庡憟鐜扳€濆畬鏁存墦閫氾細
  - `packages/shared/src/contracts.ts`
  - `packages/shared/src/events.ts`
  - `packages/shared/src/ws-protocol.ts`
  - `packages/shared/src/contracts.test.ts`
- 鏈嶅姟绔浜哄崗浣滄渶灏忛棴鐜凡缁忓氨浣嶏細
  - `apps/server/src/ws/connection-manager.ts` 缁存姢鐢诲竷绾ц繛鎺ャ€乸resence 涓庡崗浣滃箍鎾?  - `apps/server/src/ws/handler.ts` 鎺ユ敹 `collab.presence` / `collab.cursor` / `collab.selection`
  - `apps/server/src/http/canvases.ts` 鍦ㄧ敾甯冧繚瀛樻垚鍔熷悗骞挎挱 `collab.canvas_mutation`
- 鍓嶇寤虹瓚宸ヤ綔鍙板凡娑堣垂 M2 鍗忎綔浜嬩欢骞舵槧灏勫埌鍙鍙嶉锛?  - `apps/web/src/hooks/use-canvas-collaboration.ts` 缁存姢鍗忎綔鑰呫€佽繙绔厜鏍囥€佽繙绔€夊尯銆佸緟鍚屾杩滅鍙樻洿
  - `apps/web/src/components/architecture/architecture-studio-rail.tsx` 灞曠ず鍗忎綔鑰呯姸鎬佷笌杩滅閫夊尯鎽樿
  - `apps/web/src/components/canvas-editor.tsx` 鏄剧ず杩滅鍏夋爣瑕嗙洊灞傚苟缁х画璐熻矗淇濆瓨
  - `apps/web/src/app/canvas/page.tsx` 璐熻矗鎶婂崗浣滅姸鎬佹帴鍒版灦鏋勫伐浣滃彴澹冲眰
- 涓€涓噸瑕佸疄鐜板喅绛栧凡缁忔敹鏁涳細
  - 鏈湴淇濆瓨鎴愬姛鍚庯紝涓嶅啀鐢卞墠绔澶栧彂閫?`collab.canvas_mutation`
  - 杩滅鍚屾鎻愮ず浠ユ湇鍔＄鍦?`PUT /api/canvases/:canvasId` 鎴愬姛鍚庣粺涓€骞挎挱涓哄敮涓€鐪熺浉婧愶紝閬垮厤鍙岄噸 mutation 鎻愮ず
- WSL 楠岃瘉宸ュ叿閾捐鎸夊寘閫夋嫨鏇寸ǔ鐨勬墽琛屾柟寮忥細
  - `pnpm --filter @loomic/server exec vitest ...` 鍦?server 鍖呭彲鐢?  - `packages/shared` 涓?`apps/web` 鏇寸ǔ鐨勬柟寮忔槸鐩存帴鎵ц `node ../../node_modules/vitest/vitest.mjs ...`
  - `apps/web` 绫诲瀷妫€鏌ユ洿绋崇殑鏂瑰紡鏄?`node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit --pretty false`
- Ralph 褰撳墠鍦ㄦ湰鏈鸿繘鍏ヤ簡鈥滃彲鍚姩浣嗘湭瀹屽叏鎵撻€氣€濈殑鐘舵€侊細
  - `ralph --agent codex ...` 宸茶兘閫氳繃 `scripts/wsl/codex-win` 鎷夎捣 loop
  - 浣嗗疄闄呰凯浠ｆ椂锛學indows Codex fallback 浠嶄細鍥?`unexpected argument '/mnt/d/97-CodingProject/Loomic-ArcIns/packages/shared' found` 閫€鍑?  - 杩欒鏄?`codex-win` 瀵?`codex exec` 鐨勫熀纭€妗ユ帴鍙敤锛屼絾鍜?Ralph 褰撳墠鐨?Codex agent 鍙傛暟鍗忚浠嶅瓨鍦ㄥ吋瀹瑰眰闂
- 鏂扮殑杩愯鏃剁粨璁猴細
  - `codex-win` 鐨勬牳蹇冮棶棰樹笉鏄?prompt 鏂囦欢鍐呭锛岃€屾槸瀹冨師鍏堣В鏋愬埌浜?`codex.ps1` npm shim锛涜繖灞備細鍦?Ralph 浼犻€掗暱 prompt / `-c` 鍙傛暟鏃堕噸鏂拌В閲婂弬鏁?  - 鏀逛负浼樺厛璧?`codex.cmd` 鍚庯紝鐩存帴鐨?WSL wrapper smoke test鍙互杩斿洖鐪熷疄缁撴灉
  - 褰撳墠鏈哄櫒鐨?Windows Codex 閰嶇疆榛樿 `model_reasoning_effort = "xhigh"`锛岃€?`gpt-5-codex` 鍙帴鍙?`low|medium|high`
  - 鍥犳鎵€鏈?Ralph + Codex 鐨勬帹鑽愯皟鐢ㄩ兘闇€瑕侀檮鍔?`-c 'model_reasoning_effort="high"'`
  - `--ephemeral` 涔熷€煎緱涓€璧峰甫涓婏紝浠ラ伩鍏?Windows `C:\Users\admin\.codex\state_5.sqlite` 鐨?migration 璀﹀憡骞叉壈 loop
- 褰撳墠 `scripts/wsl/codex-win` 鐨勫疄鐜扮瓥鐣ュ凡缁忓彉鎴愶細
  - bash wrapper 鍦?WSL 涓В鏋?Windows `codex.cmd`
  - 鎶婂師濮嬪弬鏁板簭鍒楀啓鍏ヤ复鏃?JSON 鏂囦欢锛岄伩鍏?shell / PowerShell 浜屾鎷嗗弬
  - `scripts/wsl/codex-win.ps1` 璇诲彇 JSON 鍙傛暟骞惰皟鐢?`codex.cmd`
- Ralph 鐨勫墿浣欓棶棰樺凡缁忔敹绐勶細
  - 鍙楁帶 loop 涓嶅啀绔嬪嵆鍥犲弬鏁伴敊璇垨 `xhigh` 澶辫触
  - 浣?trivial smoke loop 浠嶅彲鑳介暱鏃堕棿淇濇寔 active锛宍ralph --status` 鍙杩唬鐘舵€侊紝蹇呰鏃惰鎵嬪姩娓呯悊 `.ralph/ralph-loop.state.json`
- 娴忚鍣ㄧ骇鍙岀敤鎴峰崗鍚岄獙璇佸凡缁忚绋冲畾璺戦€氾細
  - 绋冲畾璐﹀彿缁勫悎涓?`starter@test.loomic.com` / `opensourceloomic` 涓?`pro@test.loomic.com` / `opensourceloomic`
  - 绋冲畾鍏ュ彛鏄洿鎺ユ墦寮€鍏变韩鐢诲竷 URL锛歚http://127.0.0.1:3000/canvas?id=7acafcaa-2972-4232-9b2f-f9027e3e4248&studio=architecture`
  - 鐧诲綍鍚庡繀椤荤瓑寰呮湰鍦?session 绋冲畾锛屽啀杩涘叆鍏变韩鐢诲竷锛屽惁鍒欎細鍑虹幇鍋跺彂 404 / 鍒濆鍖栫珵浜?  - 鐪熸鍙氦浜掔殑 Excalidraw 鐢诲竷閫夋嫨鍣ㄦ槸 `canvas.excalidraw__canvas.interactive`
  - 鍦ㄧ敾甯冧笂缁樺埗鍓嶅繀椤诲厛鐐瑰嚮鐢诲竷锛屽啀鎸?`r` 杩涘叆鐭╁舰宸ュ叿
  - 涓嶉€傚悎鐢ㄥ悓璐﹀彿鍙屾爣绛鹃〉鍋氭渶缁堣瘉鎹紝鍥犱负 `useCanvasCollaboration()` 浼氬熀浜?`localUserId` 杩囨护杩滅浜嬩欢
- 鍏ㄥ眬 Ralph skill 宸插悓姝ュ惛鏀跺綋鍓嶆満鍣ㄧ殑鍙鐢ㄦ柟妗堬細
  - `C:\Users\admin\.codex\skills\open-ralph-wiggum\SKILL.md` 鐜板凡鍐欏叆 WSL -> Windows Codex bridge 鐨勯獙璇佽矾寰?  - 鎺ㄨ崘鐢ㄦ硶鍥哄畾涓?`RALPH_CODEX_BINARY=/mnt/d/.../scripts/wsl/codex-win`
  - 鎺ㄨ崘鎶?`--ephemeral` 涓?`-c 'model_reasoning_effort="high"'` 杩藉姞鍦?`--` 鍚?- 瀹瑰櫒鍖栬繍琛岀殑鏂板彂鐜帮細
  - `apps/web/Dockerfile` 鍘熷厛閿欒鍦板亣璁?`packages/config/node_modules` 涓€瀹氬瓨鍦紱瀵?`pnpm` workspace 鏉ヨ锛岃繖涓洰褰曞湪褰撳墠瀹夎缁撴灉閲屽苟涓嶄細鐢熸垚
  - `.dockerignore` 鍙拷鐣ヤ簡鏍圭洰褰?`node_modules`锛屾病鏈夊拷鐣?workspace 绾?`apps/web/node_modules` / `packages/shared/node_modules` 绛夌洰褰曪紝瀵艰嚧 Docker build context 鎶婃湰鍦颁緷璧栫洰褰曚篃鎵撳寘杩涘幓
  - 淇杩欎袱鐐逛箣鍚庯紝`docker compose -f docker-compose.local.yml --env-file /tmp/loomic.env build web` 鍙互瀹屾垚
  - 杩涗竴姝ユ墽琛?`docker compose ... up -d web server worker` 鍚庯紝API 涓?Web 鍏ュ彛閮藉彲浠庡涓绘満璁块棶
- 褰撳墠闈欐€佸€哄姟浠嶄负浠撳簱鏃㈡湁闂锛屼笉灞炰簬鏈 M2 鏂板锛?  - `src/app/pricing/components/pricing-card.tsx`
  - `src/components/agent-section.tsx`
  - `src/components/chat-sidebar.tsx`
  - `src/components/chat/tool-block-view.tsx`
  - `test/chat-workbench.test.tsx`
  - `test/env.test.ts`

## Resources
- 绔炲搧鍏ュ彛
  - `https://www.lovart.ai/features/infinite-chatcanvas-ai-collaboration`
  - `https://www.lovart.ai/docs/tools/select-hand-mark`
  - `https://raphael.app/zh/studio`
  - `https://www.jianzhuxuezhang.com/canvas/home`
- 瀹樻柟鏂囨。
  - `https://docs.langchain.com/llms.txt`
- 鍏抽敭浠撳簱鏂囦欢
  - `apps/web/src/app/(workspace)/home/page.tsx`
  - `apps/web/src/app/canvas/page.tsx`
  - `apps/web/src/components/canvas-editor.tsx`
  - `apps/web/src/components/chat-sidebar.tsx`
  - `apps/web/src/hooks/use-websocket.ts`
  - `apps/server/src/ws/handler.ts`
  - `apps/server/src/ws/connection-manager.ts`
  - `packages/shared/src/events.ts`
  - `packages/shared/src/ws-protocol.ts`
  - `apps/server/src/agent/runtime.ts`
  - `apps/server/Dockerfile`
  - `apps/web/Dockerfile`
  - `apps/web/nginx.conf`
  - `docker-compose.local.yml`
  - `scripts/wsl/codex-win`
  - `docs/execution/2026-04-12-architecture-agent-studio-wsl-runtime.md`
  - `supabase/config.toml`

## Visual/Browser Findings

- 鏈€缁堝彲澶嶇敤鐨?M2 娴忚鍣ㄩ獙璇佽剼鏈綅浜?`output/playwright/m2-collab-validate.cjs`锛屽畠涓嶅啀渚濊禆鑴嗗急鐨勫崗璁敞鍏ワ紝鑰屾槸璧扮湡瀹?UI 浜や簰銆?- 娴忚鍣ㄧ骇鍗忓悓璇佹嵁宸茬粡褰㈡垚瀹屾暣鍖咃細
  - `output/playwright/m2-collab-1776028195746/result.json`
  - `output/playwright/m2-collab-1776028195746/presence-user-a.png`
  - `output/playwright/m2-collab-1776028195746/presence-user-b.png`
  - `output/playwright/m2-collab-1776028195746/selection-and-mutation-user-b.png`
  - `output/playwright/m2-collab-1776028195746/synced-user-b.png`
- 鏈€缁堟柇瑷€缁撴灉鍏ㄩ儴閫氳繃锛?  - User A / User B 鍙屽悜鍙 presence
  - User B 鍙互瑙傚療鍒?User A 鍏夋爣绉诲姩鏁伴噺鍙樺寲
  - User B 鑳界湅鍒拌繙绔€夊尯鎻愮ず
  - User B 鑳芥敹鍒?`Remote changes available`
  - 鐐瑰嚮 `Sync now` 鍚庤繙绔彉鏇存彁绀轰細娓呴櫎

## Runtime Update: 2026-04-12 14:15 Asia/Shanghai

- The previous Docker registry pull blocker is resolved on this machine once the Windows host proxy is enabled.
- Confirmed recovered pulls in WSL Docker:
  - `hello-world:latest`
  - `node:22-slim`
  - `nginx:1.27-alpine`
  - Supabase ECR images including `postgres`, `realtime`, `storage-api`, `gotrue`, `kong`, and `edge-runtime`
- `supabase start` now succeeds end-to-end and the local stack is reachable on:
  - `http://127.0.0.1:54321`
  - `http://127.0.0.1:54323`
  - `http://127.0.0.1:54324`
- `supabase status -o env` now returns fresh local credentials and service URLs, so later runtime validation can use real local Supabase values instead of placeholder assumptions.
- During the retry window, WSL entered a hung-client state where many orphaned `wsl.exe` processes blocked new `--exec` commands. Recovery required clearing hanging clients and then running `wsl.exe --shutdown`.
- `docker compose -f docker-compose.local.yml --env-file /tmp/loomic.env config` now passes after regenerating temporary env files.
- `docker compose ... build web server worker` no longer fails on registry access. It timed out after 20 minutes, but `loomic-arcins-server:latest` and `loomic-arcins-worker:latest` exist afterwards, so the remaining follow-up is build completion / web image verification rather than network recovery.
- Raphael Studio 鐨勫叕寮€鍏ュ彛鏇村儚鈥減rompt 鐩存帴杩涘叆宸ヤ綔鍙扳€濈殑鐢熸垚寮忚捣鐐癸紝寮鸿皟浠庝竴鍙ヨ嚜鐒惰瑷€杩涘叆鍒涗綔鑰岄潪鍏堥厤缃」鐩€?- 寤虹瓚瀛﹂暱 Canvas 鐨勪富浣撻獙璇佹槑纭細宸︿晶宸ュ叿 / 涓績鏃犻檺鐢诲竷 / 鍙充晶 AI 杈呭姪鍖虹殑涓夋爮缁撴瀯锛岄€傚悎寤虹瓚鏂规鎺ㄦ暡涓庣礌鏉愭嫾璐淬€?- Lovart 鐨勫叕寮€淇℃伅寮鸿皟鈥滄棤闄?chat-canvas 鍗忎綔鈥濆拰鍦ㄧ敾甯冧笂鐩存帴鎿嶄綔 AI 璁捐鍏冪礌锛岃鏄庡叾鏍稿績浠峰€间笉鏄崟娆＄敓鎴愶紝鑰屾槸璺ㄨ疆娆′笂涓嬫枃椹卞姩鐨勭敾甯冨伐浣滄祦銆?- 涓夎€呯殑鍏卞悓鐐逛笉鏄崟涓帶浠讹紝鑰屾槸鈥滀粠鎻愮ず璇嶈繘鍏ラ」鐩€佸湪鏃犻檺鐢诲竷涓婃寔缁崗浣溿€丄I 涓庤祫浜ч兘鑳藉湪鍚屼竴绌洪棿涓榻愪笂涓嬫枃鈥濄€?
## M3 Backend Findings

- The bounded M3 server slice can avoid new database tables by keeping the latest plan snapshot inside persisted chat `contentBlocks`.
- `publish_plan` and `update_plan_step` are the minimal explicit tools needed to surface planning state without relying on deepagents' internal `write_todos`.
- `adaptDeepAgentStream()` should suppress transcript noise for planning tools and project them into:
  - `agent.plan.updated`
  - `agent.step.updated`
- Resume and retry do not need a full runtime state machine in this slice:
  - `agent.resume` and `agent.retry` can create new runs
  - the lineage is carried with `sourceRunId`
  - resume can prepend a server-generated `run.resumed` event plus a seeded `agent.plan.updated` snapshot
- User interrupt can remain a WS-layer control for this phase:
  - the handler emits `run.interrupted`
  - the underlying runtime still aborts through the existing cancel path
  - `run.canceled` may still follow, so both web and server plan reducers must preserve the interrupted state when that happens
- Fresh M3 verification is currently strongest at the contract/unit level:
  - shared targeted contract tests pass
  - web targeted plan-panel tests pass
  - server targeted stream-adapter / plan-block tests pass
- Current non-M3 verification debt remains:
  - `apps/server` typecheck has pre-existing failures in `src/config/env.ts` and `src/supabase/user.test.ts`
  - `apps/web` typecheck still has pre-existing exact-optional/type debt outside the M3 slice

## M3 Closeout Update: 2026-04-13 07:32 Asia/Shanghai

- Fresh targeted verification was re-run against the implemented bounded slice:
  - `packages/shared`: `node ../../node_modules/vitest/vitest.mjs run src/contracts.test.ts -t "agent"` -> `4 passed`
  - `apps/server`: `node ../../node_modules/vitest/vitest.mjs run src/agent/stream-adapter.test.ts src/ws/agent-plan-blocks.test.ts src/ws/connection-manager.test.ts` -> `9 passed`
  - `apps/web`: `node ../../node_modules/vitest/vitest.mjs run test/chat-sidebar.test.tsx test/use-chat-stream.test.tsx test/use-canvas-collaboration.test.tsx` -> `7 passed`
- The reliable web-side verification bundle for this phase is:
  - `ChatSidebar` action wiring
  - `useChatStream()` plan-block projection
  - regression coverage that keeps M2 collaboration behavior intact while M3 plan controls are present
- Shared package refresh remains an important operational fact:
  - when `packages/shared` contracts change, the web workspace still resolves `@loomic/shared` through `packages/shared/dist`
  - the stable refresh command remains `wsl.exe -e bash -lc 'cd /mnt/d/97-CodingProject/Loomic-ArcIns/packages/shared && node ../../node_modules/typescript/bin/tsc --build tsconfig.json --force'`
- M3 scope is now frozen more explicitly:

## Phase 7 Multi-Reference Ordering Findings (2026-04-17)

- The frozen `15.3 多图与控制台联动规则` requirement is now implemented locally rather than remaining a documentation-only contract.
- The correct ownership boundary is:
  - `ChatInput` renders the visible order controls
  - `ChatSidebar` owns the actual selected-image order state
- Keeping the order state inside `ChatInput` would have been incorrect because:
  - the send payload is assembled in `ChatSidebar`
  - the same selected-image order must survive docked / immersive layout switches
  - selection-derived helpers such as `buildSelectedCanvasImageAttachments(...)` and template/context calculations need the same ordered view
- The stable sync rule for selected images is now:
  - retain the previous order for still-selected images
  - append newly selected images at the end
  - drop deselected images from the ordered state
- A small but important accessibility finding surfaced during verification:
  - the move buttons need explicit readable labels with a separating space, for example `将参考图 1 向后移动`
  - without that exact accessible name, the UI looks correct but the control contract is still broken for tests and assistive tech

## Phase 7 Template Hierarchy Findings (2026-04-17)

- The local template menu mismatch was structural rather than cosmetic:
  - the old implementation rendered a flat list of template items
  - the frozen PRD requires a `类别 -> 模板项` hierarchy for the `模版` entry
- The stable implementation boundary is now:
  - `ChatSidebar` generates template suggestions with category metadata
  - `ChatInput` owns the visible category switching and template-item rendering
- Current category mapping is intentionally conservative:
  - `site_analysis` maps to `总平填色`
  - the currently implemented render/storyboard/video/reference flows map to `效果渲染`
  - `户型填色` remains a reserved PRD category for future floor-plan-specific evidence rather than being guessed into unrelated boards
- The PRD line `点击模板项后自动切换推荐模型` is still only partially closed:
  - prompt injection is implemented and verified
  - the real recommended-model mapping remains open because no trustworthy local/live evidence currently fixes the exact model matrix
  - plan snapshots persist inside chat `contentBlocks` as `agent-plan` blocks
  - `agent-plan` blocks should stay out of transcript rendering and continue to be surfaced through the dedicated `AgentPlanPanel`
  - `interrupt` aborts the active run, while `resume` and `retry` create new runs linked by `sourceRunId`
- Remaining M3 gap is product-facing rather than contract-facing:
  - a live browser walkthrough for real model-backed `interrupt -> resume / retry` is still pending
  - this is a follow-up verification item, not a blocker for entering the bounded M4 architecture domain slice

## Phase 7 Selection-State + Shape Toolbar Findings (2026-04-17)

- The frozen `建筑学长` canvas behavior around image selection is a three-layer model, not a single “selected means attached” state:
  - current canvas selection
  - pending input target shown inside the composer
  - confirmed attachment owned by the conversation input
- The correct trigger boundary for the image floating action bar is now explicit:
  - left-click single-image selection shows the floating action bar
  - right-click selection must open only the context menu
  - clearing the selection removes the floating action bar
- The stable ownership boundary for “待选 -> 确认” is inside `ChatSidebar`, not `ChatInput`, because:
  - attachment state is assembled there before `ws.startRun(...attachments)`
  - docked and immersive composer shells must share the same attachment truth
  - explicit attach-selection commands and passive selection-follow behavior need different confirmation paths
- The two confirmation paths are intentionally different and should stay different:
  - `handleAttachSelectedCanvasImages()` is the explicit `发送至对话` path and may also show the immersive quick record card
  - `handleConfirmSelectedCanvasImagesOnFocus()` is the “点击输入框才算锁定” path and hides the quick record card to avoid duplicate rendering of the same image
- The shape-toolbar ownership belongs in `CanvasToolMenu`, not the page shell, because it needs direct access to:
  - Excalidraw `activeTool`
  - `currentItemStrokeColor / currentItemBackgroundColor / currentItemStrokeWidth`
  - `selectedElementIds`
- The frozen architecture shape-toolbar contract is now:
  - `tool mode` while the user has activated `形状` but has not yet committed a shape
  - `selection mode` when one existing shape is selected
  - width / height editors appear only in `selection mode`
  - shape selection must not reuse the image floating action bar

## Phase 7 Template-Recommended-Model Audit Attempt (2026-04-17)

- Playwright can open `https://www.jianzhuxuezhang.com/canvas/home` and inspect the public shell, but entering a real project or creating a new one currently redirects this session to:
  - `https://www.jianzhuxuezhang.com/login?redirect=%2Fcanvas%2Fhome`
- The login page in this session exposed a mixed phone-login state:
  - phone input prefilled
  - `验证码` / `校验码` inputs present in the DOM
  - password input present in the DOM
  - visible text included `获取验证码` and `正在发送验证码，请稍后再试`
- Because that state risks an unintended SMS / login side effect while the user is away, I did not continue brute-forcing the login flow in this batch.
- The user-provided teaching document is now the strongest trustworthy evidence for the unresolved template/model item:
  - clicking a template item auto-fills the prompt
  - clicking a template item also auto-configures the corresponding model
- The remaining unresolved part is narrower than before:
  - the existence of “模板 -> 推荐模型” linkage is now confirmed at the behavior level
  - the exact per-template or per-category model matrix is still not frozen and should not be invented locally
- A fresh logged-in live audit further strengthened this finding:
  - the Playwright session successfully reused a real logged-in state and returned to `https://www.jianzhuxuezhang.com/canvas/home`
  - opening `模版` exposed the full visible category/template surface in the live DOM
  - manually switching the current model from `Banana Pro` to `Banana2`, then clicking template item `建筑晴天渲染`, reset the visible model chip back to `Banana Pro`
- This means the unresolved question has changed again:
  - no longer “does template click auto-switch the model?”
  - now specifically “what is the full template -> model mapping table across categories?”
## M4 Closeout Update: 2026-04-13 08:52 Asia/Shanghai

- The bounded M4 slice does not need new database tables or server-side architecture persistence yet.
  - Architecture state is recoverable from canvas element metadata plus run payload contracts.
  - This keeps the slice compatible with the dirty workspace and avoids widening migration risk.
- `CanvasEditor` did not need a structural refactor for M4.
  - selection ids from the existing page/editor wiring are sufficient to derive the active board and `objectTypesInSelection`
  - the main landing zone stays at `apps/web/src/app/canvas/page.tsx`
- The new architecture layer is now spread across three explicit boundaries:
  - `apps/web/src/lib/architecture-canvas.ts`: board templates, live-scene insertion, scene-to-context derivation
  - `packages/shared/src/architecture-contracts.ts`: frozen shared domain contracts
  - `apps/server/src/agent/runtime.ts` plus `apps/server/src/agent/prompts/loomic-main.ts`: prompt/runtime enrichment
- Fresh browser evidence now doubles as a product-level UI sanity check for M4.
  - `output/playwright/m2-collab-1776040214026/presence-user-a.png` visibly shows the Architecture Studio rail, board stack, and agent shell in the running containerized app
  - dual-user collaboration still passes after the M4 integration, reducing regression risk across the workspace shell
- The validated Codex Desktop + WSL Ralph pattern is now stable enough to codify globally.
  - the reusable skill entrypoint is `C:\Users\admin\.codex\skills\open-ralph-wiggum\SKILL.md`
  - for host-launched `wsl.exe -e bash -lc ...` flows, the more robust runtime flag form is `-c model_reasoning_effort=high`
  - the repo-local bridge remains `scripts/wsl/codex-win`, with `codex.cmd` preferred over `codex.ps1`
- Remaining product gap after M4:
  - real model-backed browser evidence for `interrupt -> resume / retry` is still outstanding from M3
  - real architecture artifact generation and export/review packaging move to the bounded M5 / M6 follow-up rather than this slice

## M5 Shared Contract Findings: 2026-04-13 09:34 Asia/Shanghai

- The bounded M5 export contract layer fits cleanly in `packages/shared` without changing existing M1-M4 contracts.
  - `shareSnapshotRequest` belongs in the shared contract package, but the HTTP wrapper still needs its own exported alias so route tests and client helpers can consume it from `http.ts`.
- The `packages/shared` barrel now needs tighter export control than earlier phases.
  - `export * from "./http.js"` plus `export * from "./export-contracts.js"` creates duplicate symbol collisions for names like `ShareSnapshotRequest` and `shareSnapshotRequestSchema`.
  - Explicit named exports in `packages/shared/src/index.ts` are the safer pattern when a new shared module and its HTTP wrapper intentionally expose overlapping nouns.
- The installed `planning-with-files` skill path on this machine resolves to:
  - `C:\Users\admin\.codex\skills\planning-with-files\SKILL.md`
  - not the stale `C:\Users\admin\.codex\superpowers\skills\planning-with-files\SKILL.md` path advertised in the skill inventory metadata
  - this does not block execution, but it is now a confirmed tooling nuance for future sessions on this host.

## 2026-04-17 Composer Output Preference Closure

- The frozen PRD interpretation for the immersive bottom composer is now enforced in code rather than only in documentation:
  - `自动` = aspect-ratio menu, not model-preference entry
  - `1K` = resolution menu
  - explicit note copy is required when showing `2K / 4K`, instead of silently implying availability
- The contract path is now end-to-end:
  - `packages/shared/src/contracts.ts` accepts `imageOutputPreference`
  - `apps/web/src/components/chat-sidebar.tsx` forwards it on start / resume / retry
  - `apps/server/src/ws/handler.ts` preserves it through websocket command handling
  - `apps/server/src/agent/runtime.ts` injects `<human_image_output_preference ... />` only when preference differs from default
- Stable verification command set for this slice:
  - `apps/web`: `node ../../node_modules/vitest/vitest.mjs run test/chat-input.test.tsx test/chat-sidebar.test.tsx --reporter=dot --pool forks`
  - `apps/server`: `node ../../node_modules/vitest/vitest.mjs run src/agent/runtime.test.ts --reporter=dot --pool forks`
  - `packages/shared`: `node ../../node_modules/vitest/vitest.mjs run src/contracts.test.ts -t "image output preference" --reporter=dot --pool forks`

## 2026-04-17 Jianzhuxuezhang Header Icon Audit

- The right-panel header icon cluster in the live `建筑学长` canvas is now partially de-risked by direct DOM and tooltip inspection.
- Confirmed icon ids from the real page DOM:
  - `micro-icon-add-dialog`
  - `micro-icon-history`
  - `micro-icon-file-list`
  - `micro-icon-shrink`
- Confirmed tooltip labels from the live page:
  - `添加对话`
  - `历史对话`
  - `文件列表`
  - `收起`
- Additional implementation nuance observed from live React props:
  - `历史对话` is definitely hover-driven via popup trigger hooks, not a plain text button
  - `收起` is an icon-only action in the real page, not a text button
  - `添加对话` and `文件列表` both expose real `onClick` handlers, but their full downstream state changes still need one more higher-signal audit if we want to clone behavior beyond structure/tooltips

## Phase 7 Batch 1 Findings: 2026-04-14

- The first implementation slice should stay on the highest-confidence overlap between the studied products:
  - Lovart drives the logged-in home shell and the immersive canvas feeling
  - 寤虹瓚瀛﹂暱 drives the right-side creation workflow and canvas-to-chat context bridge
- Current Loomic code constraints that shape the first batch:
  - `apps/web/src/app/(workspace)/home/page.tsx` already owns project creation, prompt handoff, recent projects, example seeds, and discovery content
  - `apps/web/src/app/canvas/page.tsx` still mounts `ArchitectureStudioRail` as a persistent left column in architecture mode
  - `apps/web/src/components/chat-sidebar.tsx` already has the right place to own conversation-side state and reuse existing session / stream plumbing
  - `apps/web/src/components/chat-input.tsx` is currently too weak for parity because it only renders an English selection summary and generic placeholder copy
- Batch 1 product decisions are therefore:
  - keep architecture semantics, but move them out of a permanent left rail and into floating controls plus the right-side workflow
  - introduce Chinese-first copy in the touched surfaces immediately, rather than waiting for a global i18n pass
  - treat selected canvas images as durable right-side reference context, not as a transient status line
  - support template prompt injection through the chat input state model before rebuilding the larger 鈥滄坊鍔犵礌鏉愨€?modal system
- Stable verification route for this batch:
  - `wsl.exe -e bash -lc 'cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run <tests> --reporter=dot'`
- Known unrelated baseline noise that should not be misattributed to Batch 1:
  - `apps/web/test/home-discovery-gallery.test.tsx` still reflects old seed expectations in at least one assertion path

## Runtime / WSL Memory Findings: 2026-04-13 14:34 Asia/Shanghai

- Windows Task Manager reporting `vmmemWSL ~30G` does not mean Linux currently has 30G of hard-to-reclaim working memory.
  - Fresh Linux evidence showed `MemAvailable` at roughly `26.7GiB` while `Cached` was roughly `21.9GiB`.
  - The dominant delta is Linux file/page cache retained inside the WSL VM, which Task Manager still attributes to `vmmemWSL`.
- The earlier 鈥渆xtra local dev processes鈥?diagnosis was only partially true.
  - The disposable pressure came from leftover Playwright daemons and Chrome automation processes.
  - The remaining root-owned `next-server` / `node --import tsx src/server.ts` processes are container workloads from the app stack, confirmed via `docker top`, and should not be treated as accidental host residue.
- The local Supabase stack is the biggest sustained memory consumer in this workspace.
  - `supabase_db_loomic` sits around `8.9GiB` even after browser cleanup.
  - `supabase_analytics_loomic` adds roughly `0.8GiB`.
  - This is explainable for a cache-heavy Postgres container plus supporting services under sustained validation traffic, but it is still high enough to affect a desktop workflow and should be considered 鈥渘ormal for this current load pattern, but not ideal as a steady-state dev footprint.鈥?- Browser validation load is what turns the setup from 鈥渉eavy鈥?into 鈥渉ost feels sluggish.鈥?  - Once Playwright/Chrome residue was removed, Linux `used` memory dropped from about `6.3GiB` to about `4.8GiB`, and app/server container CPU also settled sharply.

## Runtime / Build Source Findings: 2026-04-13 15:13 Asia/Shanghai

- Slow local image builds on this host are not caused by one factor alone.
  - the machine is in mainland China and benefits from domestic mirrors
  - before this pass, Docker daemon had no registry mirror configured
  - before this pass, WSL `npm` / `pnpm` still pointed at the upstream npm registry
  - the server image also performs `apt-get` and `pip3 install`, so Docker Hub acceleration alone is insufficient
- Mirror reachability is host-specific and should be validated before hard-coding fallbacks.
  - `docker.m.daocloud.io` is reachable from this machine and is now the chosen Docker registry mirror
  - `hub-mirror.c.163.com` and `mirror.baidubce.com` were not usable on this host during validation
  - `registry.npmmirror.com`, `mirrors.tuna.tsinghua.edu.cn`, and `pypi.tuna.tsinghua.edu.cn` are reachable and suitable defaults here
- The repo now carries build-time domestic source defaults instead of relying only on user-machine global config.
  - `apps/web/Dockerfile` and `apps/server/Dockerfile` now default `NPM_REGISTRY` to `https://registry.npmmirror.com/`
  - `apps/server/Dockerfile` also defaults Debian and pip sources to Tsinghua mirrors
  - `docker-compose.local.yml` exposes those values as overrideable build args so future machines can swap mirrors without patching Dockerfiles again
- The WSL user environment had a hidden permissions issue that could have kept breaking package-manager config changes.
  - `/home/admin123/.npmrc` was root-owned
  - ownership was corrected before switching the registry
- Dangling image cleanup was worth doing immediately, but build cache was intentionally left intact for now.
  - `docker image prune -f` reclaimed about `3.345GB`
  - one dangling web image remains because the currently running `web` container still references it
  - Docker build cache was not broadly pruned in this pass because keeping it should help the next validation rebuild

## M5 Stability Findings: 2026-04-13 19:22 Asia/Shanghai

- The web-side architecture export retry policy needs to stay narrowly scoped.
  - `application_error` and `canvas_not_found` are too broad to retry automatically because they hide deterministic failures behind an extra POST.
  - the bounded retry set that survived final verification on this host is:
    - explicit server-side transient export codes: `chat_error`, `project_query_failed`
    - one transient transport failure on the browser `fetch()` call
- The final manifest flake and the later share-snapshot failure came from different layers.
  - manifest stability improved after the web helper retried only known transient export failures once
  - the later `share-snapshot` timeout was not an export-route regression; browser evidence plus server logs showed the page still uses `/api/uploads`, and the failure came from `UploadServiceError: Failed to generate signed URL.`
- `project-assets` should be treated as a public bucket in the application layer.
  - repository evidence:
    - `supabase/migrations/20260326000001_public_project_assets_bucket.sql` marks `project-assets` public
    - seeded content elsewhere in the repo already uses `/storage/v1/object/public/project-assets/...` URLs
  - therefore `apps/server/src/features/uploads/upload-service.ts` is more robust when it returns `getPublicUrl()` for public buckets instead of creating signed URLs
- On this machine, server image builds must keep the Debian mirror on `http://` during the pre-CA-certificates stage.
  - using `https://mirrors.tuna.tsinghua.edu.cn/debian` before installing `ca-certificates` produced certificate-verification failures inside the `node:22-slim` production stage
  - rerunning the same build with:
    - `DEBIAN_MIRROR=http://mirrors.tuna.tsinghua.edu.cn/debian`
    - `DEBIAN_SECURITY_MIRROR=http://mirrors.tuna.tsinghua.edu.cn/debian-security`
    restored a stable server build path
- Final bounded M5 browser evidence is now clean.
  - `output/playwright/m5-share-export-1776079146235/result.json` records `share-snapshot`, `download-review-package`, and `download-manifest` all as `pass`
  - the new snapshot URL now uses the public storage path form:
    - `http://127.0.0.1:54321/storage/v1/object/public/project-assets/...`

## Reference UI / Interaction Findings: 2026-04-14

- Chrome host-session feasibility:
  - the user's real Chrome process is running from the normal profile path
  - it is **not** currently started with `--remote-debugging-port=9222`
  - therefore the current automation tools cannot yet attach to the user's live logged-in Chrome profile
  - consequence:
    - Lovart logged-in canvas content cannot be fully inspected yet through the host browser session
    - if full logged-in Lovart reverse engineering is required, Chrome must be relaunched with remote debugging enabled
- Lovart public home page findings:
  - layout style is poster-like and high contrast:
    - dark full-bleed first screen
    - thin top nav
    - very strong centered hero typography
    - large visual demo surface under the hero
  - information architecture is not a dashboard:
    - hero prompt / CTA first
    - visual evidence second
    - capability storytelling and editorial sections later
  - visual language:
    - black background with fluorescent accent banner
    - minimal chrome
    - sparse copy
    - large serif-like headline with calm supporting text
- Lovart canvas findings visible before login:
  - canvas route opens inside a focused full-screen shell
  - there is no separate product-style left navigation rail visible outside the canvas
  - login is treated as an overlay dialog on top of the canvas environment, not a redirect back to a classic dashboard
  - implication for Loomic redesign:
    - current architecture left rail should not remain a persistent workspace column in canvas mode
    - canvas mode should feel like one immersive surface with floating tool groups and a right-side agent space
- 寤虹瓚瀛﹂暱 logged-in canvas home findings:
  - homepage structure is operational rather than marketing-led:
    - top nav
    - centered prompt entry
    - model / resolution / template selectors inline with prompt
    - recent project shelf directly below
  - "new project" is treated as a first-class card in recent projects
  - the page is shallow and creation-first; it does not bury creation behind many sections
- 寤虹瓚瀛﹂暱 logged-in canvas detail findings:
  - core shell is a three-region workspace:
    - left vertical drawing toolbar
    - center infinite canvas
    - right conversation / history / generated-files area
  - top-left area:
    - avatar/project switch affordance
    - inline project name editing
  - left toolbar visible buttons:
    - `閫夋嫨`
    - `娣诲姞`
    - `褰㈢姸`
    - `娑傞甫`
    - `鏂囧瓧`
  - right-top utility cluster:
    - zoom controls
    - credit balance
    - `鍏呭€糮
    - `瀵硅瘽`
  - right panel sections visible by default:
    - `鍒涗綔璁板綍`
    - remaining generation count
    - prompt input box
    - model selector (`Banana Pro`)
    - generation mode selector (`鑷姩 / 1K`)
    - template selector (`妯＄増`)
    - send button
    - `鐢熸垚鏂囦欢鍒楄〃`
  - floating bottom-right action:
    - `棰勮`
- 寤虹瓚瀛﹂暱 modal / popup findings captured so far:
  - clicking `娣诲姞` opens a large asset-source modal
  - asset-source tabs visible:
    - `鏈湴涓婁紶`
    - `瀹樻柟鍥惧簱`
    - `浼佷笟鍥惧簱`
    - `鎴戠殑鍒涗綔`
  - local upload tab contains a large empty state plus `涓婁紶鍥剧墖`
  - this confirms `娣诲姞` is not a single-action insert button; it is a source switcher / asset ingestion hub
- Product-gap implications for Loomic:
  - homepage should move from current mixed "discovery + architecture card + generic prompt" surface to a Lovart-like single creation entry with recent projects close below
  - canvas should move from "left architecture rail + center canvas + right chat" to "floating canvas tools + center canvas + right agent/files/history"
  - architecture semantics should not disappear; they should be re-homed into:
    - right agent workflows
    - floating top bars
    - insert dialogs / board templates
    - context-aware inspector panels
  - the remaining English copy problem is substantial and not limited to one page; current home and canvas still expose many English strings in labels, helper text, and placeholders

## Phase 7 Batch 1 Freeze: 2026-04-14

- The first implementation batch is intentionally limited to shell-level redesign and input-context alignment.
- Route-aware workspace chrome is the cleanest first lever:
  - `apps/web/src/app/(workspace)/layout.tsx` currently renders `AppSidebar` for every workspace page.
  - this blocks Lovart-style `/home` and immersive `/canvas` even if the page internals are redesigned.
- Existing code structure already supports a bounded home rewrite without changing backend behavior:
  - `/home` data loading and CTA behavior are concentrated in `apps/web/src/app/(workspace)/home/page.tsx`
  - `HomePrompt` can be restyled or lightly adapted without changing project creation contracts
- Existing canvas architecture already supports a bounded immersive rewrite:
  - `/canvas` already owns its own top-left chrome, bottom bar, layers/files drawers, and right `ChatSidebar`
  - the main remaining shell problem is route/global chrome plus the presentation of architecture controls
- The current runtime screenshot on `http://127.0.0.1:3000/canvas?...` still shows stale English defaults:
  - project button text: `Untitled`
  - session title: `New Chat`
  - agent send button: `Agent`
  - this confirms browser-level acceptance must be rerun after the next rebuild, even though the targeted localization tests already passed

## Phase 7 Batch 1 Runtime Acceptance: 2026-04-14

- After rebuilding `web`, the local runtime now reflects the Batch 1 shell changes.
- Verified home runtime outcome:
  - `/home` no longer renders the old workspace left rail
  - the first screen is now a dark, Lovart-style creation surface
  - page-level navigation is present inside the home page itself
- Verified canvas runtime outcome:
  - `/canvas` shows the lighter `寤虹瓚宸ヤ綔娴乣 floating control bar instead of the heavier project-summary card
  - project and session defaults are now localized in the live browser for the checked project:
    - `鏈懡鍚嶉」鐩甡
    - `鏂板璇漙
    - `鏅鸿兘浣揱
- Residual runtime issue:
  - browser console still reports `500` on `http://127.0.0.1:3001/api/credits`
  - the UI remains usable, but home-page credit data should be treated as a follow-up fix rather than a closed item

## Phase 7 Batch 2 Runtime Findings: 2026-04-15

- The single-image right-click misclassification was a `CanvasEditor` runtime issue, not a `CanvasContextMenu` rendering issue.
  - `page.tsx` can compute the right menu mode if it receives a real-time `selectedElements` snapshot.
  - the remaining breakage lived at the editor boundary:
    - the right-click payload path in `apps/web/src/components/canvas-editor.tsx` still referenced an undeclared `excalidrawApiRef`
    - the half-landed cast to `SceneElementLike` was also invalid
    - in practice this meant the browser sometimes fell back to stale parent selection state and kept opening `blank` even when an image was visibly selected
  - restoring a stable `excalidrawApiRef` and extracting from `getSceneElements()`, `getFiles()`, and `getAppState().selectedElementIds` at pointerdown time fixed the live browser behavior
- Browser validation now confirms the intended 寤虹瓚瀛﹂暱-style right-click matrix in Loomic:
  - blank canvas right-click:
    - `涓婁紶鍙傝€冨浘`
    - `鎻掑叆鍙傝€冩澘`
    - `閾哄紑寤虹瓚鏉垮潡`
    - `鎵撳紑鏅鸿兘浣揱
  - single-image right-click:
    - `鍙戦€佽嚦瀵硅瘽`
    - `濂楃敤妯℃澘锛氭彁鐐煎弬鑰冨浘鏂瑰悜`
    - `濂楃敤妯℃澘锛氶噸缁勫弬鑰冨浘鎯呯华`
  - multi-image right-click:
    - `鏁寸粍鍙戦€佽嚦瀵硅瘽`
    - `濂楃敤妯℃澘锛氭彁鐐煎鍥惧叡鍚岃瑷€`
    - `濂楃敤妯℃澘锛氳緭鍑哄鍥惧樊寮傜粨璁篳
    - `鎴愮粍閫変腑鍥剧墖`
- Right-side composer coupling is now browser-proven for both single and multi-image flows.
  - single-image `鍙戦€佽嚦瀵硅瘽` adds a reference chip plus preview image in `ChatSidebar`
  - single-image template action writes a single-image draft into the input box
  - multi-image template action writes a merged multi-image strategy draft into the input box
  - after multi-image `鏁寸粍鍙戦€佽嚦瀵硅瘽`, clearing the live canvas selection still leaves the preview images and the multi-image placeholder in the sidebar
  - this proves the attach/send action promotes selection context into conversation context rather than only styling the currently selected canvas state
- `鎴愮粍閫変腑鍥剧墖` mutates the live scene exactly as intended.
  - browser-side inspection of the live Excalidraw scene showed both image elements receiving the same `groupId`
  - this matches the expected 鈥滄垚缁?鍚堝苟鈥?semantic basis for later whole-group operations
- A new cross-layer persistence gap is now explicit and should become the next bounded fix.
  - browser-side runtime inspection showed `2` live image elements on the scene
  - the same browser session, using the authenticated access token from local storage, fetched `GET /api/canvases/:id` and received:
    - `status: 200`
    - `elementCount: 0`
    - `imageCount: 0`
  - practical consequence:
    - runtime image insertions work for current-session editing and right-side context actions
    - reload loses those inserted images because the persisted canvas content is still empty
  - likely trace path for the next fix:
    - `insertImageOnCanvas`
    - `CanvasEditor onChange`
    - `saveCanvas`
    - server-side canvas persistence

## Phase 7 Batch 2 Persistence Revalidation: 2026-04-15

- The earlier "persisted canvas is still empty" conclusion has been superseded by stronger evidence gathered from the actual database row plus a fresh browser reload.
- Durable revalidation evidence now lives in-repo:
  - `output/verification/phase7-batch2-canvas-db-state-2026-04-15.txt`
  - `output/verification/phase7-batch2-network-after-refresh-2026-04-15.txt`
  - `output/verification/phase7-batch2-files-panel-2026-04-15.yml`
- What the new evidence shows:
  - the `public.canvases.content` row for canvas `85f737fe-388b-4a42-97df-4ed0e798f609` contains `1` persisted element and its first element type is `image`
  - after refreshing `/canvas` with a new cache-busting URL, the browser still issues `GET /api/canvases/:id => 200`
  - the refreshed generated-files panel still lists `page-2026-04-14T19-01-54-003Z`, which matches the inserted reference image asset
- Updated conclusion:
  - the bounded persistence fix in `apps/web/src/components/canvas-editor.tsx` did work
  - programmatic image insertion now survives the full chain:
    - `insertImageOnCanvas`
    - `CanvasEditor` save queue
    - `PUT /api/canvases/:id`
    - `public.canvases.content`
    - page reload / UI rehydration
  - the prior "GET returned 0 elements" finding was a false negative from unreliable host-side ad hoc inspection, not the authoritative persisted state
- Remaining hardening risk that should stay visible:
  - the current persisted canvas proves that zero-row `update()` was not the active root cause for Batch 2 on this canvas
  - it was still a real risk for future multi-user collaboration or stricter RLS scenarios and needed explicit server hardening

## Phase 7 Batch 2 Server Hardening: 2026-04-15

- The zero-row update risk on canvas saves is now explicitly guarded in source.
- Bounded implementation:
  - new regression test:
    - `apps/server/src/features/canvas/canvas-service.test.ts`
  - minimal production fix:
    - `apps/server/src/features/canvas/canvas-service.ts`
    - save path now calls `.select("id")` after `update(...)`
    - save path throws `CanvasServiceError("canvas_save_failed", ...)` when the update returns no rows
- Verified behavior:
  - red: the new test initially failed because `saveCanvasContent()` resolved on `{ data: [], error: null }`
  - green: targeted server suite now passes:
    - `src/features/canvas/canvas-service.test.ts`
    - `src/http/canvases.test.ts`
    - combined result: `2` files passed, `3` tests passed
- Practical meaning:
  - future silent save failures caused by RLS or unexpected row-matching issues will no longer masquerade as successful canvas persistence
  - this is a hardening improvement on top of the already-verified Batch 2 persistence fix, not a reversal of the PASS verdict

## Phase 7 Batch 3 Live Benchmarking: 2026-04-15

- A fresh live snapshot of `https://www.jianzhuxuezhang.com/canvas/home` now confirms the user's correction about the target home layout.
- Verified live home structure from the authenticated browser session:
  - white/light visual system instead of a dark immersive shell
  - centered title and subtitle above the creation area
  - one large prompt composer at the top of the content area
  - a `鏈€杩戦」鐩甡 strip in the middle, starting with a `鏂板缓椤圭洰` card followed by recent project cards
  - a lower reference/example entry area rather than the current Loomic discovery-heavy mixed layout
- Live top composer structure is already more constrained than the current Loomic `/home`:
  - image upload entry on the left
  - prompt textbox in the middle
  - compact model / ratio / template selectors inside the same composer
  - one primary send action on the right
- Product implication for the next bounded implementation slice:
  - `/` should stop rendering the marketing landing page and hand users directly into login
  - `/home` should be refit to the lighter `寤虹瓚瀛﹂暱` information hierarchy instead of continuing the current black Lovart-style shell
  - extra discovery chrome on the current Loomic home page should be removed before expanding more canvas features

## Phase 7 Batch 3 Live Canvas Benchmarking: 2026-04-15

- A fresh authenticated browser pass on `https://www.jianzhuxuezhang.com/canvas/detail?projectId=69dee2c31f0f9e40898b2322` now confirms the current target canvas shell more concretely.
- Verified live canvas shell structure:
  - left vertical tool rail with only the essential drawing tools:
    - `閫夋嫨`
    - `娣诲姞`
    - `褰㈢姸`
    - `娑傞甫`
    - `鏂囧瓧`
  - center infinite canvas as the dominant surface with almost no extra chrome
  - right-side working panel combining:
    - zoom / credits / `瀵硅瘽` trigger header
    - `鍒涗綔璁板綍`
    - composer with image add button + textbox + model selector + ratio selector + template selector + send button
    - `鐢熸垚鏂囦欢鍒楄〃`
- Verified blank-canvas right-click menu from the live product:
  - `绮樿创`
  - `鏄剧ず鐢诲竷鎵€鏈夊厓绱燻
  - `瀵煎嚭鐢诲竷`
  - `瀵煎叆鐢诲竷`
  - this blank-state menu does not inject anything into the right composer
- Verified selected-image state from the live product:
  - top floating action bar appears with:
    - `缂栬緫`
    - `娑傞甫`
    - `鏂囧瓧`
    - `鏌ョ湅澶у浘`
    - `涓嬭浇`
  - right-clicking the selected image opens the full element menu with:
    - `澶嶅埗`
    - `绮樿创`
    - `涓婄Щ涓€灞俙
    - `涓嬬Щ涓€灞俙
    - `绉诲埌椤跺眰`
    - `绉诲埌搴曞眰`
    - `鍙戦€佽嚦瀵硅瘽`
    - `鍒涘缓缂栫粍`
    - `瑙ｉ櫎缂栫粍`
    - `鍚堝苟鍥惧眰`
    - `鏄剧ず/闅愯棌`
    - `閿佸畾/瑙ｉ攣`
    - `瀵煎嚭`
    - `鍒犻櫎`
- Verified the live `鍙戦€佽嚦瀵硅瘽` effect:
  - after clicking the image-context `鍙戦€佽嚦瀵硅瘽`, the composer switches into an attachment state above the textbox
  - the attachment state visibly renders the selected image thumbnail plus a `+` affordance before the text input
  - the underlying prompt textbox, model selector, ratio selector, template selector, and send button remain in place
- this confirms the real product promotes selected canvas assets into conversation context without replacing the main composer layout

## Phase 7 Batch 3 Canvas Rail Contraction: 2026-04-15

- The largest previously open shell gap on local `/canvas` was the tool presentation layer, not the right-click logic.
  - real product:
    - left compact rail with `閫夋嫨 / 娣诲姞 / 褰㈢姸 / 娑傞甫 / 鏂囧瓧`
  - old Loomic runtime:
    - bottom floating toolbar with `鎷栨嫿鐢诲竷 / 鐭╁舰 / 妞渾 / 绠ご / 鐩寸嚎 / AI 鐢熸垚鍥剧墖 / AI 鐢熸垚瑙嗛`
- The bounded fix that preserved the already-validated composer and context-menu behavior was to contract only `CanvasToolMenu`, not to rewrite the page-level context flows.
- The implemented mapping is now frozen:
  - `娣诲姞` flyout reuses existing architecture actions:
    - `涓婁紶鍙傝€冨浘`
    - `鎻掑叆鍙傝€冩澘`
    - `閾哄紑寤虹瓚鏉垮潡`
  - `褰㈢姸` flyout keeps the previously available drawing tools but hides them behind the compact shell:
    - `鐭╁舰`
    - `妞渾`
    - `绠ご`
    - `鐩寸嚎`
- Fresh browser-level local runtime evidence confirms the compact rail is live:
  - screenshot:
    - `D:/97-CodingProject/Loomic-ArcIns/.playwright-cli/page-2026-04-15T04-29-12-843Z.png`
  - `娣诲姞` flyout snapshot:
    - `D:/97-CodingProject/Loomic-ArcIns/.playwright-cli/page-2026-04-15T04-30-54-287Z.yml`
  - `褰㈢姸` flyout snapshot:
    - `D:/97-CodingProject/Loomic-ArcIns/.playwright-cli/page-2026-04-15T04-32-19-044Z.yml`
- Practical conclusion:
  - Loomic now materially matches the verified 寤虹瓚瀛﹂暱 canvas shell on the most visible left-side interaction region
  - the next most notable canvas-shell deltas are no longer the rail itself
  - the remaining visually obvious gaps are:
    - selected-image top floating action bar
    - collapsed-state bottom-floating composer behavior outside the open right panel

## Phase 7 Batch 4 Selected-Image Floating Action Bar: 2026-04-15

- The safest implementation path for the selected-image floating action bar was not to rebuild the canvas interaction stack again.
  - existing Loomic already had the correct downstream primitives:
    - page-level `composerCommand`
    - `ChatSidebar` handling for:
      - `attach-selection`
      - `apply-template`
      - `attachSelection: true`
    - live Excalidraw tool switching through `setActiveTool()`
  - the missing layer was only the thin trigger shell that 寤虹瓚瀛﹂暱 exposes above the selected image
- The new bounded architecture is now explicit:
  - `CanvasEditor` is responsible only for reporting the live viewport transform:
    - `scrollX`
    - `scrollY`
    - `zoom`
  - `/canvas` page owns:
    - the selected image semantic
    - overlay position calculation
    - dispatching `缂栬緫 / 娑傞甫 / 鏂囧瓧`
  - `CanvasSelectionActionBar` owns:
    - the visible action bar
    - local preview modal open state
    - direct download affordance
- The selected-image quick-action mapping is intentionally aligned to the verified 寤虹瓚瀛﹂暱 shell:
  - `缂栬緫`
    - mapped to a composer `apply-template` command
    - preserves image context with `attachSelection: true`
    - this is the current Loomic-compatible bridge for 鈥滃熀浜庡凡閫夊浘鐗囩户缁敓鎴愨€?rather than plain text-only prompting
  - `娑傞甫`
    - mapped to Excalidraw `freedraw`
  - `鏂囧瓧`
    - mapped to Excalidraw `text`
  - `鏌ョ湅澶у浘`
    - reuses the existing shared `ImageLightbox`
  - `涓嬭浇`
    - uses a direct anchor download from the selected image URL
- Practical product implication:
  - Loomic now differentiates 鈥滃崟绾枃鐢熷浘鈥?and 鈥滃熀浜庡綋鍓嶅凡閫夊浘鐗囩户缁紪杈戔€?more clearly at the UI trigger layer
  - the real remaining delta is no longer whether the user can enter image-editing mode, but whether the local runtime browser walkthrough can show the same path end-to-end with a deterministic seeded image in the canvas

## Phase 7 Home Recent-Project Entry Hardening: 2026-04-15

- The user-reported `/home` entry bug was real and narrow:
  - while `fetchProjects()` was pending, the page rendered only `HomeProjectsSkeleton`
  - this temporarily removed the real `鏂板缓椤圭洰` card
  - practical effect:
    - users could arrive on `/home` and have no immediate path into `/canvas`
- The corrected product rule is now explicit:
  - `鏈€杩戦」鐩甡 must always start with a real, clickable `鏂板缓椤圭洰` card
  - loading state may only occupy the remaining project slots
  - this mirrors the real 寤虹瓚瀛﹂暱 `/canvas/home` hierarchy more faithfully than a full-section skeleton
- The implementation decision is intentionally minimal:
  - `apps/web/src/app/(workspace)/home/page.tsx`
    - now always renders the real `鏂板缓椤圭洰` button first
    - uses a dedicated `handleCreateProject()` callback for the entry action
    - scopes `projectsLoading` to the non-primary project cards only
  - `apps/web/src/components/skeletons/home-skeleton.tsx`
    - now supports `includeNewProjectPlaceholder` and `projectCount`
    - uses a `contents` wrapper so placeholder cards can share the real page grid without introducing another layout container
- Fresh browser evidence confirms the fix on the rebuilt runtime:
  - login with the local verification account redirects to `/home`
  - the first recent-project card text is:
    - `+鏂板缓椤圭洰浠庝竴鍙ラ渶姹傛垨涓€寮犲弬鑰冨浘寮€濮嬫柊鐨勬棤闄愮敾甯冨垱浣溿€俙
  - evidence files:
    - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/home-first-card-verify-2026-04-15.json`
    - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/home-first-card-verify-2026-04-15.png`

## Phase 7 Selected-Image Action Bar Browser-Proof Investigation: 2026-04-15

- The current browser-proof gap is now narrower and better understood after re-checking the runtime code path instead of guessing from the UI:
  - `CanvasSelectionActionBar` already renders correctly once `/canvas` page receives exactly one selected image with `storageUrl` or `dataUrl`
  - `CanvasEditor` only reports selection changes when Excalidraw `appState.selectedElementIds` changes
  - `insertImageOnCanvas()` inserts the new image element and backing file, but does not mark that element as selected
- Practical implication:
  - an upload alone is not enough to make the floating action bar appear
  - the deterministic browser proof must include a second explicit selection step after insertion
- The most promising proof path in the current local runtime is now explicit:
  - seed a small local SVG through the existing hidden `input[type=file]`
  - wait for the upload-and-insert path to finish
  - on an otherwise empty canvas, click the viewport center, because `insertImageOnCanvas()` places the first image at the center of the current viewport
  - only then assert `缂栬緫 / 娑傞甫 / 鏂囧瓧 / 鏌ョ湅澶у浘 / 涓嬭浇`
- This means the next browser pass should optimize for deterministic seeding and timing, not for another production rewrite of the floating action bar itself.

## Phase 7 Selected-Image Action Bar Browser Proof Closure: 2026-04-15

- The real browser proof is now complete on the rebuilt local WSL Docker runtime.
  - verification command:
    - `wsl.exe -e bash /mnt/d/97-CodingProject/Loomic-ArcIns/output/playwright/canvas-selection-action-bar-verify-2026-04-15.sh`
  - proof artifacts:
    - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/canvas-selection-action-bar-verify-2026-04-15.json`
    - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/canvas-selection-action-bar-verify-2026-04-15.png`
- The successful screenshot now proves all three things in one frame:
  - the selected runtime image is actually on the canvas
  - the floating action bar is rendered above that selected image
  - the right immersive panel still coexists with the overlay and generated-files list
- The browser-proof assertion needed one important correction:
  - direct `getByRole("button", { name: "娑傞甫" })` / `鏂囧瓧` checks were ambiguous because those labels also exist in the left compact rail
  - the stable proof path is to assert a single DOM button cluster that contains all five labels together:
    - `缂栬緫`
    - `娑傞甫`
    - `鏂囧瓧`
    - `鏌ョ湅澶у浘`
    - `涓嬭浇`
- A secondary but useful runtime finding also emerged:
  - the script's `waitForResponse("/api/uploads")` remained unreliable in this flow, even though the generated-files list and final screenshot prove the seed image was accepted and rendered
  - for this particular canvas proof, DOM-and-screenshot evidence is therefore more trustworthy than waiting on that upload response event alone
- Product implication:
  - the previously open 鈥渟elected-image floating action bar still only has test-level proof鈥?gap is now closed at the live browser level
  - the next visually obvious parity gap shifts to the right-side / bottom composer shell and any remaining deeper selected-element atomic operations

## Phase 7 Context-Menu Scene Operations: 2026-04-15

- After re-checking the local `/canvas` implementation against the previously verified 寤虹瓚瀛﹂暱 menu inventory, the biggest remaining right-click gap was no longer chat coupling.
  - existing local runtime already had:
    - `鍙戦€佽嚦瀵硅瘽`
    - template injection into the right composer
    - multi-image grouping
  - but it still lacked the more editor-like scene-organization operations that the real product exposes in the image context menu
- The safest bounded slice turned out to be the scene-only operations that do not change the right-side composer contract:
  - `涓婄Щ涓€灞俙
  - `涓嬬Щ涓€灞俙
  - `绉诲埌椤跺眰`
  - `绉诲埌搴曞眰`
  - `閿佸畾 / 瑙ｉ攣`
  - `鍒犻櫎`
- The codebase already pointed toward this helper-layer architecture before implementation:
  - `apps/web/test/canvas-context-actions.test.ts` already expected:
    - `reorderSelectedCanvasElements()`
    - `toggleLockSelectedCanvasElements()`
    - `deleteSelectedCanvasElements()`
  - but `apps/web/src/lib/canvas-context-actions.ts` only implemented:
    - `getCanvasContextMenuMode()`
    - `groupSelectedCanvasElements()`
- The implemented direction therefore stayed intentionally incremental:
  - extend `apps/web/src/lib/canvas-context-actions.ts` with scene mutation helpers instead of inventing a new action system
  - keep `composerCommand` untouched for these operations
  - let `CanvasEditor` `onChange -> onSelectionChange` remain the only source of truth for how the right-side selection state updates after a scene mutation
- One additional state detail was required to support correct menu labeling:
  - `CanvasSelectedElement` and `extractSelectedCanvasElements()` now carry `locked`
  - this allows `/canvas` to switch the menu label between `閿佸畾` and `瑙ｉ攣` without consulting stale state
- Browser-level proof on the rebuilt WSL Docker runtime is now available for the new single-image menu shape:
  - verification command:
    - `wsl.exe -e bash /mnt/d/97-CodingProject/Loomic-ArcIns/output/playwright/canvas-context-menu-scene-actions-verify-2026-04-15.sh`
  - proven labels:
    - `鍙戦€佽嚦瀵硅瘽`
    - `涓婄Щ涓€灞俙
    - `涓嬬Щ涓€灞俙
    - `绉诲埌椤跺眰`
    - `绉诲埌搴曞眰`
    - `閿佸畾`
    - `鍒犻櫎`
  - proof artifacts:
    - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/canvas-context-menu-scene-actions-verify-2026-04-15.json`
    - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/canvas-context-menu-scene-actions-verify-2026-04-15.png`
- The next low-risk image-menu candidates remain visible but intentionally deferred from this batch:
  - `澶嶅埗`
  - `鏌ョ湅澶у浘`
  - `涓嬭浇`
  - these are still good follow-ups, but the scene-organization operations were the higher-value structural gap for the current local runtime
- `鏄剧ず / 闅愯棌` remains the least safe item and should stay out of the current bounded slice:
  - there is no stable existing hidden-element model in the current Excalidraw integration
  - forcing it now would spill across selection, save, export, and right-side reference semantics


## Phase 7 Context-Menu Copy / Export Closure: 2026-04-15

- The previously deferred single-image right-click follow-up is now partially closed with the two lowest-risk actions:
  - `??`
  - `??`
- Implementation stayed on the existing helper path instead of branching the menu logic again:
  - `apps/web/src/lib/canvas-context-actions.ts`
    - added `duplicateSelectedCanvasElements()`
  - `apps/web/src/components/canvas-logo-menu.tsx`
    - now reuses the same duplicate helper instead of maintaining a separate duplication path
  - `apps/web/src/app/canvas/page.tsx`
    - single-image context menu now exposes `??` and `??`
- Fresh local verification evidence now covers all three layers for this bounded slice:
  - focused tests:
    - `wsl.exe -e bash -lc 'cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/canvas-context-actions.test.ts test/canvas-page-context-menu.test.tsx --reporter=dot --pool forks'`
    - result: `2` files passed, `10` tests passed
  - bounded suite:
    - `wsl.exe -e bash -lc 'cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/canvas-context-actions.test.ts test/canvas-context-menu.test.tsx test/canvas-page-context-menu.test.tsx test/canvas-page-selection-action-bar.test.tsx test/canvas-editor-context-menu.test.tsx test/canvas-tool-menu.test.tsx test/chat-input.test.tsx test/chat-sidebar.test.tsx --reporter=dot --pool forks'`
    - result: `8` files passed, `36` tests passed
  - browser proof:
    - `wsl.exe -e bash /mnt/d/97-CodingProject/Loomic-ArcIns/output/playwright/canvas-context-menu-scene-actions-verify-2026-04-15.sh`
    - result: `passed: true`
- The rebuilt WSL Docker runtime now exposes this single-image right-click set together:
  - `?????`
  - `??`
  - `????`
  - `????`
  - `????`
  - `????`
  - `??`
  - `??`
  - `??`
- Proof artifacts:
  - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/canvas-context-menu-scene-actions-verify-2026-04-15.json`
  - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/canvas-context-menu-scene-actions-verify-2026-04-15.png`
- The right-click parity gap is now more focused:
  - browser-proven editor semantics are in place for copy, layering, locking, export, and delete
  - the larger remaining parity target has shifted back to the right-side / bottom composer shell and its state transitions


## Phase 7 Collapsed Composer Shell: 2026-04-15

- The next high-value parity gap after the right-click menu work was the immersive canvas composer when the right panel is collapsed.
- Root cause in the local runtime was straightforward after code inspection:
  - `ChatSidebar` returned early on `open={false}`
  - immersive architecture mode therefore lost the real composer entirely and fell back to a small top-right `??` button
  - this diverged from the studied ???? behavior where users can keep a bottom-floating composer available outside the expanded history/files panel
- The bounded implementation stayed on the existing chat/composer contract instead of inventing a second input system:
  - `apps/web/src/components/chat-sidebar.tsx`
    - immersive collapsed state now renders a bottom-floating composer shell on desktop
    - it reuses the same `ChatInput` pipeline and existing `composerCommand` handling
    - selection-to-conversation actions therefore continue to flow through one shared path
- The most important behavioral consequence is not only visual:
  - after collapsing the right panel, selected-image `?????` still promotes the canvas asset into conversation context
  - browser proof now shows the collapsed composer placeholder switching from the default prompt state to the attached-reference state
- Fresh verification evidence for this slice is complete:
  - focused tests:
    - `wsl.exe -e bash -lc 'cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/chat-sidebar.test.tsx --reporter=dot --pool forks'`
    - result: `1` file passed, `12` tests passed
  - bounded suite:
    - `wsl.exe -e bash -lc 'cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/chat-sidebar.test.tsx test/chat-input.test.tsx test/canvas-page-shell.test.tsx test/canvas-page-context-menu.test.tsx test/canvas-page-selection-action-bar.test.tsx test/canvas-editor-context-menu.test.tsx test/canvas-context-menu.test.tsx test/canvas-context-actions.test.ts test/canvas-tool-menu.test.tsx --reporter=dot --pool forks'`
    - result: `9` files passed, `39` tests passed
  - browser proof:
    - `wsl.exe -e bash /mnt/d/97-CodingProject/Loomic-ArcIns/output/playwright/canvas-collapsed-composer-verify-2026-04-15.sh`
    - result: `passed: true`
- Browser-proven collapsed composer facts now include:
  - shell labels visible together:
    - `????`
    - `Banana Pro`
    - `?? 1K`
  - placeholder before attach:
    - `???????????????????? @ ?????`
  - placeholder after right-click `?????`:
    - `???????????????????????`
- This closes an important part of the user-requested ?canvas edit action <-> right-side input state? mapping in the collapsed-shell path, not only in the expanded panel path.

## Subagent Model Default Hardening: 2026-04-15

- C:\Users\admin\.codex\config.toml was already correct: the parent model is gpt-5.4.
- The more actionable failure mode was instruction-level drift, not config drift.
- subagent-driven-development contained a cost-first heuristic (least powerful model, fast, cheap model) that could encourage mini-model dispatch.
- Hardening the instruction layer is the safest local fix available in this environment:
  - global superpowers skill copies now tell future agents to pass model: "gpt-5.4"
  - repo AGENTS.md now makes that explicit for this workspace
  - global .codex/AGENTS.md mirror files now carry the same rule
- Until proven otherwise, subagent reliability in this workspace should prefer consistent gpt-5.4 selection over cost optimization.

## 建筑学长 Canvas 实站复核: 2026-04-15

- 已用真实账号登录建筑学长，并保存会话到：
  - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/reference-audit/jzxz-storage-state.json`
- 空白 canvas 的真实基线结构已经确认：
  - 左侧固定 5 个竖向入口：`选择 / 添加 / 形状 / 涂鸦 / 文字`
  - 顶部右侧固定控制：`缩放 / 次数 / 充值 / 对话`
  - 底部是居中的大输入框，内含 `+`、模型、比例、模板、发送按钮
  - 证据：
    - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/reference-audit/jzxz-canvas-detail-baseline.png`
- 空白处右键菜单已经确认是固定 4 项：
  - `粘贴`
  - `显示画布所有元素`
  - `导出画布`
  - `导入画布`
  - 证据：
    - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/reference-audit/audit-2-blank-right-click.png`
- 左侧 `添加` 的真实行为不是小型 flyout，而是完整素材弹窗，顶部标签为：
  - `本地上传`
  - `官方图库`
  - `企业图库`
  - `我的创作`
  - 证据：
    - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/reference-audit/audit-4-left-shape-open.png`
- 非空项目中，单图选中后会立即出现两类联动：
  - 图片上方浮出快捷条：`编辑 / 涂鸦 / 文字 / 查看大图 / 下载`
  - 底部输入框左侧立即出现该图片缩略图 chip，不需要先右键发送
  - 证据：
    - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/reference-audit/content-2-top-image-selected.png`
- 单图右键菜单已确认包含以下原子项：
  - `复制`
  - `粘贴`
  - `上移一层`
  - `下移一层`
  - `移到顶层`
  - `移到底层`
  - `发送至对话`
  - `创建编组`
  - `解除编组`
  - `合并图层`
  - `显示/隐藏`
  - `锁定/解锁`
  - `导出`
  - `删除`
  - 证据：
    - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/reference-audit/content-3-top-image-right-click.png`
- 多图选中后，顶部快捷条收敛为：
  - `创建编组`
  - `合并图层`
  - 以及一个图标按钮
  - 底部输入框会同步出现多个图片缩略图 chip
  - 证据：
    - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/reference-audit/content-4-multi-selected.png`
- 多图右键菜单与单图右键菜单主干一致，依然保留：
  - `发送至对话`
  - `创建编组`
  - `解除编组`
  - `合并图层`
  - `显示/隐藏`
  - `锁定/解锁`
  - `导出`
  - `删除`
  - 证据：
    - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/reference-audit/content-5-multi-right-click.png`
- 右侧 `对话` 展开后的真实形态不是“只有侧栏，没有输入框”，而是：
  - 右侧出现 `创作记录` 面板
  - 右下仍保留输入框，但它不再是居中悬浮，而是与右侧面板对齐的 docked composer
  - 已选图片的缩略图状态会保留到该 composer 中
  - 证据：
    - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/reference-audit/inspect-panel-after-click.png`
    - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/reference-audit/send-dialog-4-panel-open.png`
- 这意味着对本地实现最关键的纠偏不是“自由设计一个更像的版本”，而是按建筑学长的真实三段式布局重做：
  - 折叠态：居中底部 composer + 右上 `对话` 按钮
  - 展开态：右侧 `创作记录` 面板 + 右下 docked composer
  - 选区联动：选图即写入 composer 缩略图，而不依赖右键后才附加

## Phase 7 Batch 5 Test-Gap Freeze: 2026-04-15

- The highest-value remaining test gaps are now explicit:
  - `apps/web/test/canvas-tool-menu.test.tsx` still proves an add flyout, not the real modal tabs.
  - `apps/web/test/canvas-context-menu.test.tsx` still proves title/description cards and template-style actions that do not exist in the real right-click menu.
  - `apps/web/test/canvas-page-context-menu.test.tsx` does not yet freeze a real multi-image menu inventory/order.
  - `apps/web/test/chat-input.test.tsx` still encodes an outdated rule that immersive mode hides selection helper UI entirely, while the real product shows thumbnail chips.
  - `apps/web/test/chat-sidebar.test.tsx` proves collapsed immersive composer existence, but does not yet freeze the centered-vs-docked layout contract tightly enough.
- Batch 5 should therefore start with red tests in exactly those files before any more production changes.


## Phase 7 Batch 5 Closure: 2026-04-15

- The strict Jianzhuxuezhang parity slice for the architecture canvas is now closed at three layers: component tests, page-integration tests, and live container/browser proof.
- New product truths confirmed in the local runtime after implementation:
  - architecture canvas now boots with the right panel collapsed by default on desktop, matching the audited centered-bottom composer baseline instead of forcing the panel open
  - left `添加` now opens a real modal shell with the audited tabs `本地上传 / 官方图库 / 企业图库 / 我的创作`
  - blank-canvas right-click now exposes exactly `粘贴 / 显示画布所有元素 / 导出画布 / 导入画布`
  - single-image right-click now exposes the audited compact family including `复制 / 粘贴 / 层级移动 / 发送至对话 / 创建编组 / 解除编组 / 合并图层 / 显示/隐藏 / 锁定 / 导出 / 删除`
  - `发送至对话` now keeps the canvas in collapsed-composer mode and flips the placeholder into attached-reference state instead of forcing the side panel open
- Root-cause finding from live browser debugging:
  - the initial browser-proof failure was not an agent/composer state bug; it was a viewport-positioning bug in `CanvasContextMenu`
  - when the single-image menu opened near the lower half of the canvas, the menu extended under the centered composer, so `发送至对话` became unclickable in the real page
  - fixing the menu required viewport clamping plus scrollable overflow, not another change to composer command handling
- New evidence artifacts:
  - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/canvas-batch5-parity-verify-2026-04-15.json`
  - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/canvas-batch5-parity-verify-2026-04-15.png`
  - `D:/97-CodingProject/Loomic-ArcIns/output/playwright/canvas-batch5-parity-verify-2026-04-15-debug.png` (failed intermediate proof retained for debugging trace)
- Local seeded account confirmed from repository docs:
  - `starter@test.loomic.com / opensourceloomic`
  - source: `README.md` seed-account section and `.tmp/auth-body.json`

## Phase 7 Right-Panel Shell Follow-Up: 2026-04-15

- The latest user complaints about the right-side record shell were valid even after Batch 5 closed:
  - collapsed immersive mode still embedded a local record button inside the bottom composer card
  - expanded immersive mode still used the older helper sentence instead of the audited retention copy
  - several active panel shells still exceeded the requested 10px radius cap
  - the immersive bottom control strip had drifted from the audited template wording
- The safest bounded correction was a shell-only pass instead of widening back into scene logic:
  - keep page.tsx orchestration and context-menu behavior intact
  - only adjust ChatSidebar, ChatInput, and the affected panel/flyout shells
- Product truths frozen by this slice:
  - the page-level top-right record trigger remains the sole entry point when the immersive panel is collapsed
  - the collapsed immersive composer should not duplicate that trigger inside the centered bottom card
  - the expanded right panel should present the audited retention copy and avoid the older helper sentence
  - the generated-files block can sit above the docked composer without changing the canvas-to-chat command contract
  - the audited immersive bottom-bar template wording has been restored
- Radius audit result for the bounded slice:
  - the highest-value shells to normalize were the collapsed composer shell, immersive right panel shell, context menu shell, add modal shell, left tool rail shell, and embedded empty-state panels
  - small icon buttons and count chips can remain pill-shaped when they act as controls rather than panel containers

## Phase 7 Right-Panel Proof Refresh: 2026-04-16

- The interrupted `chat-sidebar` repair did not leave a behavior bug behind first; it left a syntax/encoding bug:
  - `apps/web/src/components/chat-sidebar.tsx` still contained a second mojibake string near line `821`
  - the failing symptom was an `Unterminated string literal` during Vite/esbuild transform, not a failing UI assertion
  - additional visible mojibake remained in the immersive header badge, `收起` control, reconnect labels, and empty-state copy
- The safest repair for this slice was still a narrow one:
  - keep the right-panel structure unchanged
  - only repair the corrupted strings and let the existing focused tests surface any true behavioral mismatch afterward
- The Playwright proof path also had its own tooling root cause:
  - `output/playwright/phase7-right-panel-review-2026-04-16.js` is a browser-code snippet of the form `async (page) => { ... }`
  - running it as `node <file>.js` does not execute the scenario; it only loads the snippet and exits successfully
  - the correct execution path is the same wrapper already proven elsewhere in this repo:
    - `playwright_cli.sh open ...`
    - `playwright_cli.sh --raw run-code "$CODE"`
    - capture stdout into the JSON evidence file
- Fresh live-browser truths from the corrected proof:
  - the collapsed architecture composer now exposes the intended Chinese placeholder and still keeps the top-right `创作记录` entry visible
  - `发送至对话` still promotes the selected canvas image into conversation context and switches the placeholder into attached-reference mode
  - the expanded record panel now visibly includes:
    - `创作记录`
    - `个人创作记录只保留30天`
    - `收起`
  - `generatedFilesVisible` is `false` when the current canvas interaction only attached a reference image; this confirms the earlier fix that uploaded references should not leak into the generated-files area
- The new screenshot comparison against `send-dialog-4-panel-open.png` clarifies the remaining right-panel delta:
  - the current local shell matches the high-level structure
  - the reference still has a richer content layer with:
    - header icon actions on the top row
    - a warm-toned notice banner below the header
    - more record/history card content in the scroll area instead of the current mostly-empty state
  - this should be treated as the next bounded Phase 7 parity batch rather than another shell-only pass

## Phase 7 Right-Panel Content Layer Batch 1: 2026-04-16

- The subagent/code review convergence was useful here:
  - immersive `创作记录` still does not have its own real record renderer; it mostly wraps the normal transcript flow in a right-side shell
  - because of that, a safe first content-layer batch should improve the obvious immersive-only chrome first, not prematurely redesign the transcript data layer
- Three product truths are now explicitly frozen by tests:
  - the top-right `创作记录` trigger is the authoritative open/close control for the immersive right panel
  - `发送至对话` keeps the composer in `attach-selection` mode even if the user opens the right panel afterwards
  - immersive panel content can add a dismissible notice block without breaking the bottom docked composer contract
- The notice block was a good low-risk parity target because:
  - it is clearly visible in the audited reference screenshot
  - it belongs entirely to the immersive right-panel chrome
  - it does not require agent runtime, message schema, or generated-file protocol changes
- Fresh live-browser proof after the implementation confirms:
  - the warm notice block is now visible in the local runtime
  - the local right panel still keeps the correct placeholder transition and `generatedFilesVisible: false` fix
  - the next remaining deltas are more concentrated and easier to isolate:
    - top-row icon actions
    - record/history card rendering
    - generated result card richness/styling

## Phase 7 Right-Panel Record Card Batch 2: 2026-04-16

- The next useful split is now clearer:
  - a pre-run pending card for `发送至对话` / `attach-selection` can safely derive from current composer state
  - persisted history/result cards should not derive from `CanvasFilesPanel`; they should eventually derive from chat messages plus assistant tool blocks
- For the current local-first batch, the safest pre-run source was:
  - `readyAttachments.filter((attachment) => attachment.source === "canvas-ref")`
  - rationale:
    - it already reflects the exact references currently pushed into the conversation composer
    - it supports the no-external-model path the user is testing most often
    - it avoids widening any server or websocket contracts while we are still tightening the canvas-to-chat parity loop
- `externalDraft` / `setExternalDraft` is now confirmed as the correct reuse point for immersive record-card quick actions:
  - it already pushes a prompt into `ChatInput`
  - it already focuses the composer
  - it avoids inventing a second draft state or bypassing the existing send flow
- `CanvasFilesPanel` remains a scene-level generated-file view, not a history source:
  - it only knows current Excalidraw elements with `customData.source === "generated"`
  - it cannot recover per-run prompt/model/intent grouping
  - it is still useful for the embedded result area below the transcript, but not as the authoritative source for record cards
- A new verification nuance is now important:
  - the Playwright proof script currently marks `generatedFilesVisible` by checking whether body text contains `生成文件列表`
  - after this batch, that boolean turns `true` as soon as the immersive record card renders its reviewed loading-state block
  - this no longer means uploaded references leaked into the actual scene-generated files panel
- The clean long-term path for richer record cards is now explicit:
  - derive card view models from `messages`
  - use assistant tool blocks for prompt/model/artifact metadata
  - if card-level time is needed, thread through the already-existing `ChatMessage.createdAt` field into `use-chat-sessions.ts` instead of inventing a new timestamp source

## Jianzhuxuezhang Canvas PRD Freeze: 2026-04-16

- The active user request changed from implementation back to documentation-first:
  - do not continue coding in this turn
  - produce a formal PRD for the real `建筑学长` AI canvas product first
- A new PRD has been written at:
  - `docs/prd/2026-04-16-jianzhuxuezhang-ai-canvas-agent-prd.md`
- The PRD uses explicit evidence tiers:
  - `A级`: real-site audit screenshots / OCR / JSON captured on `2026-04-15`
  - `B级`: user-provided teaching-flow markdown
  - `C级`: visible-but-unconfirmed items that still require browser re-check
- Newly frozen product truths for the PRD:
  - `/canvas/home` includes the title area, hero composer, `视频教程`, `最近项目`, and a first-card `新建项目` entry
  - `/canvas/detail` keeps the left tool rail `选择 / 添加 / 形状 / 涂鸦 / 文字`, top-right zoom / quota / recharge / dialogue controls, bottom composer, and left-bottom layer entry
  - blank-canvas right click is exactly `粘贴 / 显示画布所有元素 / 导出画布 / 导入画布`
  - single-image quick bar is exactly `编辑 / 涂鸦 / 文字 / 查看大图 / 下载`
  - single-image and multi-image context menus share the audited scene-action family including `发送至对话 / 创建编组 / 解除编组 / 合并图层 / 显示/隐藏 / 锁定/解锁 / 导出 / 删除`
  - right-side `创作记录` keeps a docked composer when open instead of replacing the composer entirely
- The teaching-flow markdown supplied several important clarifications that are now frozen into the PRD:
  - selecting an image and locking it for generation are not the same action
  - multi-image input has an order concept
  - local edit must support both `保存` and `保存为副本`
  - generation is a derived child-node flow with loading placeholders and lineage arrows
- Current review debt remains explicit:
  - the browser MCP transport is still closed in this session, so header icon semantics, shape-tool submenu details, and some deep panel/menu internals remain `待二次复核`

## Jianzhuxuezhang Final Follow-Up Audit: 2026-04-16

- A final follow-up audit has now closed the most important remaining factual gaps before implementation resumes.
- Verified with saved login state plus local Playwright scripts under:
  - `output/playwright/reference-audit/verify-pending-2026-04-16.js`
  - `output/playwright/reference-audit/verify-pending-followup-2026-04-16.js`
  - result summary:
    - `output/playwright/reference-audit/pending-review-followup-summary-2026-04-16.json`
- Newly frozen product truths from this final round:
  - `/canvas/home` first-card `新建项目` does not jump straight into a blank canvas.
  - it opens an `添加项目` modal first.
  - modal fields/buttons confirmed:
    - `项目名称`
    - `导入画布项目`
    - `上传项目文件`
    - `取消`
    - `确定`
  - evidence:
    - `output/playwright/reference-audit/pending-home-new-project-after-2026-04-16.png`
  - left `添加` and `形状` are definitively different controls:
    - `添加` opens the large resource modal with tabs
    - `形状` opens a compact flyout
  - `形状` flyout now has stronger visual evidence:
    - a top style bar is visible
    - the bar includes line/fill styling plus a thickness slider showing `16px`
    - five shape buttons are visible underneath
    - the first four are visually identifiable as rectangle, circle, arrow, and line
    - the fifth appears to be a polygon/closed-shape icon and should remain name-level `待二次复核`
  - evidence:
    - `output/playwright/reference-audit/pending-detail-add-open-2026-04-16.png`
    - `output/playwright/reference-audit/pending-detail-shape-open-2026-04-16.png`
  - left-bottom `图层` button is now confirmed as a real panel trigger, not just an icon hint.
    - clicking it opens a left-side panel titled `图层`
  - evidence:
    - `output/playwright/reference-audit/pending-layer-after-click-followup-2026-04-16.png`
  - `发送至对话` must no longer be modeled as an independently persistent attachment that survives deselection.
    - on a non-empty canvas, the composer already shows the selected image chip before the context-menu action
    - after right-click `发送至对话`, the chip still exists while that selection remains
    - after clicking blank space and clearing selection, the chip disappears
    - therefore current real-site evidence supports “selection-bound explicit conversation handoff”, not “persistent detached attachment state”
  - evidence:
    - `output/playwright/reference-audit/pending-send-followup-after-send-2026-04-16.png`
    - `output/playwright/reference-audit/pending-send-followup-after-deselect-2026-04-16.png`
    - `output/playwright/reference-audit/pending-review-followup-summary-2026-04-16.json`
- Remaining explicit review debt after this final audit:
  - the 4 pure icon buttons in the right-side panel header are still not semantically confirmed
  - do not invent their meanings during implementation

## Phase 7 Batch 6 Local Runtime Closure: 2026-04-16

- The corrected follow-up facts are now re-verified against the local rebuilt Loomic runtime, not only against the saved `建筑学长` audit package.
- Verified locally with:
  - targeted web tests:
    - `test/chat-sidebar.test.tsx`
    - `test/chat-input.test.tsx`
    - `test/canvas-page-shell.test.tsx`
    - `test/canvas-tool-menu.test.tsx`
    - `test/home-page-shell.test.tsx`
    - `test/use-create-project.test.tsx`
  - WSL Docker rebuild:
    - `docker compose -f docker-compose.local.yml --env-file .tmp/loomic-local.env build web`
    - `docker compose -f docker-compose.local.yml --env-file .tmp/loomic-local.env up -d --no-deps web`
  - local Playwright proof:
    - `output/playwright/phase7-batch6-verify-2026-04-16.js`
    - `output/playwright/phase7-batch6-verify-2026-04-16.sh`
- Newly frozen local-runtime truths:
  - the local `/home` first-card `新建项目` now opens `添加项目` before project creation
  - confirming that dialog still opens a new canvas tab only after `确定`, because `useCreateProject()` calls `window.open("/loading-preview", "_blank")` first and then routes the new tab once the API returns
  - the local `/canvas` bottom-left `图层` trigger opens the left `图层` panel in the rebuilt container runtime
  - the local `/canvas` `形状` flyout exposes a visible style strip plus 5 buttons:
    - `矩形`
    - `圆形`
    - `菱形`
    - `箭头`
    - `直线`
  - the local composer placeholder after deselection is now explicitly observed as:
    - `描述建筑效果图、镜头脚本或评审目标，输入 @ 可引用素材`
- Important verification-method finding:
  - for this product, “click blank space” must mean clicking actual blank canvas coordinates
  - clicking the left `图层` panel or other non-canvas chrome does not clear selection
  - proof scripts must therefore either:
    - click a verified blank canvas coordinate, or
    - assert that the top selected-image quick bar disappears in addition to placeholder changes
- Workspace hygiene finding:
  - `git diff --check` still reports broad historical trailing-whitespace / CRLF noise in the dirty repo
  - treat that as separate cleanup debt unless a bounded implementation slice specifically touches those lines

## Phase 7 Batch 7 Canvas Export Findings: 2026-04-16

- The first safest post-PRD implementation slice is now confirmed:
  - `多选导出` was the clearest real gap because the product code explicitly logged:
    - `multi-selection export is not implemented yet, falling back to canvas export`
  - this made it a high-confidence PRD mismatch and a low-risk first repair target
- The bounded implementation path that worked without widening contracts is:
  - keep the action in `apps/web/src/app/canvas/page.tsx`
  - read the live Excalidraw selection from `selectedElementIds`
  - resolve each image source from `file.dataURL`, `dataUrl`, `storageUrl`, `customData.storageUrl`, or `link`
  - rasterize the selected image nodes into a temporary browser canvas
  - download a selection-local PNG instead of exporting the whole canvas JSON
- Freshly verified behavior from tests:
  - multi-image context-menu `导出` now calls a raster export path
  - it draws the selected images onto a canvas
  - it downloads `canvas-selection-export.png`
  - it no longer falls back to whole-canvas export for this path
- Freshly verified regression boundary:
  - context menus
  - selection action bars
  - chat-sidebar / composer linkage
  - canvas files panel
  - canvas tool flyouts
  all remained green in the bounded `58`-test suite after the export change
- Important runtime finding from the interrupted container step:
  - the latest slowdown was not primarily a mirror-source failure
  - mirrors are configured correctly at three layers:
    - Docker registry mirror:
      - `/etc/docker/daemon.json` -> `https://docker.m.daocloud.io`
    - npm/pnpm registry:
      - `https://registry.npmmirror.com/`
    - Debian / pip mirrors:
      - `http://mirrors.tuna.tsinghua.edu.cn/debian`
      - `https://pypi.tuna.tsinghua.edu.cn/simple/`
  - the immediate pressure came from a lingering root-owned `docker compose build web` chain that kept running `pnpm ... build`, `next build`, and a `jest-worker`
  - killing that chain removed the active build pressure without touching the running `web/server/worker` containers
- Memory-profile finding after cleanup:
  - the running app containers are not the main cause of 30G-class UI slowdown once the stuck build is removed
  - the heavy steady-state containers on this host remain:
    - `supabase_db_loomic` around `2.645GiB`
    - `supabase_analytics_loomic` around `0.74GiB`
    - `loomic-arcins-server-1` around `554MiB`
  - `loomic-arcins-web-1` itself is light at roughly `16.84MiB`
- Process-hygiene rule reinforced for the next passes:
  - close completed subagents immediately after their results are integrated
  - never leave a long-running `docker compose build web` unattended while continuing other work on this host
  - prefer one bounded build attempt only after code/test stabilization, then check for lingering root-owned build processes before proceeding

## Phase 7 Batch 7 Runtime Closure Findings: 2026-04-16

- The repeated slow `web` rebuilds were rooted in the build graph, not the package mirrors:
  - Docker layers were mostly cached
  - the real stall was `apps/web` -> `next build`
  - source inspection identified `next/font/google` in `apps/web/src/app/layout.tsx`
  - that import forces a build-time Google Fonts fetch, which matches the observed `socket hang up` + retry loop in the current network environment
- The bounded build fix that worked:
  - remove `next/font/google` from `apps/web/src/app/layout.tsx`
  - replace it with a local Chinese-friendly system font stack in `apps/web/src/app/globals.css`
  - freeze this requirement with `apps/web/test/root-layout.test.tsx`
- Fresh post-fix build evidence:
  - `docker compose -f docker-compose.local.yml --env-file .tmp/loomic-local.env build web`
  - succeeded in about `3m02s`
  - completed without the previous Google-font retry loop
- Additional process finding:
  - an interrupted Codex turn does not guarantee the in-flight `docker compose build web` process has stopped
  - one such lingering build chain was still running in WSL and had to be terminated manually before re-running the build
- Final local browser proof conclusion for Batch 7:
  - the rebuilt runtime exposes the audited multi-image context menu items:
    - `发送至对话`
    - `创建编组`
    - `合并图层`
    - `导出`
  - triggering `导出` on the real runtime logs:
    - `[canvas-page] exported selected canvas images {exportedCount: 2, width: 600, height: 394}`
  - Playwright CLI did not emit a stable browser `download` event for the `blob + anchor.download` export path
  - therefore the final live proof should treat the runtime export log as the authoritative completion signal for this exact export mechanism
- Residual runtime stability finding:
  - during fresh-canvas seeding in the browser proof, one early `PUT /api/canvases/:id` returned `500`
  - subsequent save attempts and thumbnail upload succeeded
  - this looks like a first-save persistence issue worth isolating in the next bounded batch

## 2026-04-16 Build Speed Analysis

- The user-provided slow build log was analyzed against the current local fix state.
- The important conclusion is unchanged:
  - Docker layer cache was mostly healthy.
  - The expensive step was the final web production build (`pnpm --filter @loomic/web build` -> `next build`).
  - The earlier `socket hang up` / `Retrying` pattern matched `next/font/google` in `apps/web/src/app/layout.tsx`, not general compose cache failure.
- Noise vs root cause:
  - `Docker Compose is configured to build using Bake, but buildx isn't installed` is only a capability warning.
  - It does not explain the long stall shown in step `#26`.
- Current repo state after the bounded fix:
  - `apps/web/src/app/layout.tsx` no longer imports `next/font/google`.
  - `apps/web/src/app/globals.css` now uses a local Chinese-friendly system font stack.
  - `apps/web/test/root-layout.test.tsx` guards this contract.
- Practical speed conclusion:
  - repeated `docker compose build web` runs still perform a real production `next build`
  - so they will never feel like hot reloads even when dependency layers are cached
  - the fix removed the pathological foreign-network retries, but a production build still costs minutes in this monorepo
- Recommended next acceleration options:
  - do not rebuild the production `web` image for every UI tweak; use a dev container or mounted-source workflow for inner-loop work
  - keep production image rebuilds for milestone verification
  - if we need faster repeated production rebuilds, add BuildKit cache mounts for Next build cache and optionally install `docker buildx`

## 2026-04-16 Dev Container Inner Loop

- A dedicated WSL Docker dev override now exists for the `web` service:
  - `docker-compose.dev.yml`
  - `apps/web/Dockerfile.dev`
- The dev override keeps production verification and inner-loop development separate:
  - production verification still uses `docker-compose.local.yml`
  - day-to-day frontend iteration can now use `docker-compose.local.yml` + `docker-compose.dev.yml`
- The dev image is optimized for CN conditions and mounted-source iteration:
  - registry stays on `https://registry.npmmirror.com/`
  - the image pre-installs workspace dependencies from manifests only
  - the running container bind-mounts source and keeps `node_modules`, pnpm store, and `.next` in named Docker volumes
  - polling is enabled with `CHOKIDAR_USEPOLLING=true` and `WATCHPACK_POLLING=true` for `/mnt/d/...` file watching reliability
- Important runtime behavior now frozen:
  - first cold dev-volume initialization still performs one `pnpm install --prefer-offline` reconciliation inside the container
  - in this environment the cold initialization completed in about `4m27s`
  - after the dev volumes are warm, the restart path is much faster:
    - unchanged dev image rebuild: about `7.5s`
    - `docker compose ... up -d --no-deps web`: about `0.6s`
    - `next dev` readiness after warm restart: about `3.4s`
    - `/home` returned `HTTP/1.1 200 OK`
- Root-cause note from debugging:
  - the initial dev-container restart loop was caused by `pnpm install` aborting module-directory replacement in a non-TTY context
  - this was fixed by running the install in CI mode and by making `web` the primary foreground process while `shared/config/ui` watchers run as companion processes
- Practical guidance:
  - do not use production `build web` for normal UI iteration anymore
  - keep the production image path for milestone/container acceptance only

## 2026-04-16 Layer Panel Real Actions

- The current frozen PRD section `9.2 图层入口要求` now has one additional confirmed implementation layer in the local project:
  - layer rows in `CanvasLayersPanel` are no longer shell-only
  - row-level `锁定图层` and `显示或隐藏图层` now reuse the existing `canvas-context-actions.ts` scene mutation helpers
  - clicking a layer row still selects the corresponding canvas element
- This batch also removed a structural DOM bug in the local implementation:
  - the previous panel rendered nested `button` elements inside a layer-row `button`
  - the row is now split into a primary select button plus sibling action buttons, which avoids invalid interactive nesting
- The bounded runtime blocker observed after the host reboot is environmental rather than product-semantic:
  - `write-local-docker-env.sh` failed while `supabase status -o env` was unavailable during local Supabase startup
  - after recovery, `supabase status -o env` returned successfully again
  - the current dev-web container path still shows unstable local port reachability during startup, so container proof for this batch should remain marked pending until that dev-runtime issue is isolated

## 2026-04-16 Batch 8 Review Follow-Up

- External review surfaced a real state-sync risk in the first Batch 8 implementation:
  - row-level lock / visibility mutations should not depend on `updateScene({ appState })` becoming visible synchronously before helper execution
- The local fix now routes layer-row actions through explicit-id scene helpers in `canvas-context-actions.ts`, which removes that timing dependency.
- External review also surfaced an a11y gap:
  - the currently selected layer must be exposed to assistive technology, not just via background color
- The local fix now marks the primary layer-row button with `aria-current="true"` when the corresponding canvas element is selected.

## 2026-04-16 Windows Localhost Dev Runtime Closure

- The previously observed `127.0.0.1:3000` failure on Windows was not a canvas-feature regression. It was a dev-runtime networking contract gap:
  - base `docker-compose.local.yml` uses `network_mode: host`
  - the original `docker-compose.dev.yml` only overrode `web` build/runtime shape, so the merged stack still inherited `host`
  - on this machine, WSL Docker `host` networking is not a reliable way to expose container ports back to Windows localhost
- The approved fallback is now frozen and implemented:
  - dev override explicitly forces `server/web/worker` onto `bridge`
  - `web` publishes `3000:3000`
  - `server` publishes `3001:3001`
  - `host.docker.internal:host-gateway` is injected for bridge containers
- Bridge containers cannot keep using the browser-facing Supabase URLs:
  - browser-safe URLs remain `http://127.0.0.1:54321` and `postgresql://...@127.0.0.1:54322/...`
  - server/worker now require separate container-safe variants routed through `host.docker.internal`
  - `scripts/wsl/write-local-docker-env.sh` now emits both:
    - `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
    - `SUPABASE_INTERNAL_URL` / `SUPABASE_INTERNAL_DB_URL`
- Cold-start timing note:
  - `supabase status -o env` can temporarily fail during reboot recovery while `supabase_auth_loomic` is still waiting for Postgres
  - this is a startup-order symptom, not evidence of broken secrets or a permanent Supabase misconfiguration
  - once `supabase_auth_loomic` becomes healthy, env generation resumes normally
- Current practical rule:
  - use `docker-compose.local.yml + docker-compose.dev.yml` for day-to-day web iteration on this Windows + WSL machine
  - keep the base `docker-compose.local.yml` path for milestone acceptance unless and until the broader local runtime contract is intentionally revised

## 2026-04-17 WSL Lifecycle Finding

- A second, separate host-environment issue exists beyond the bridge-networking fix:
  - on this machine, the WSL distro itself may terminate after the shell session exits
  - when that happens, `docker.service` is stopped by system shutdown semantics, and the whole local stack disappears from Windows localhost until WSL is re-entered and Docker is started again
- Evidence:
  - Windows browser-side localhost checks failed while all containers showed `Up 7-8 seconds` immediately after the next `wsl.exe` call
  - WSL `uptime` had just reset
  - `journalctl -u docker` showed `Started docker.service` followed seconds later by `Stopping docker.service`
- Important nuance:
  - `docker.service` itself is not misconfigured; the unit file looks standard
  - the problem is WSL instance lifecycle, not the Docker unit definition
- Low-risk mitigation that worked in-session:
  - start a lightweight keepalive user process inside WSL
  - start Docker as `root`
  - then bring the `loomic` compose stack up
  - with that keepalive still alive, Windows `3000/home` and `3001/api/health` remained reachable after an additional idle wait
- Product-impact conclusion:
  - future local-run instructions should distinguish:
    - source/runtime contract: already fixed by `bridge + host-gateway`
    - host lifecycle contract: still needs a durable launcher/wake strategy for this specific WSL setup

## 2026-04-17 Runtime Launcher Closure

- The host-lifecycle mitigation is now promoted from an ad-hoc session trick to a repo-level runtime workflow:
  - `scripts/windows/start-local-runtime.ps1`
  - `scripts/windows/stop-local-runtime.ps1`
  - `scripts/windows/status-local-runtime.ps1`
  - `scripts/wsl/start-local-runtime.sh`
  - `scripts/wsl/stop-local-runtime.sh`
  - `scripts/wsl/status-local-runtime.sh`
  - `scripts/wsl/start-keepalive.sh`
- A strict test contract now guards the launcher shape:
  - `tests/workspace.test.mjs` asserts the presence of:
    - explicit `wsl.exe -u root`
    - `systemctl start docker`
    - `Invoke-WebRequest`
    - WSL runtime scripts
    - `supabase start`
    - compose up/down flow
    - `nohup` keepalive loop
- The first real regression found after resuming was not functional:
  - the launcher script used a helper abstraction, but the test intentionally required the literal `wsl.exe -u root` string
  - replacing the helper-only path with an explicit root call satisfied the contract without broadening behavior
- Important environment fact for this machine:
  - Windows PowerShell currently does not expose `pnpm` in `PATH`
  - the repo-level launcher still works when invoked directly via:
    - `powershell -ExecutionPolicy Bypass -File scripts/windows/start-local-runtime.ps1`
  - this is a host setup fact, not a Loomic runtime regression
- Stable host-facing evidence now exists for the launcher workflow itself:
  - initial start returned working local Supabase, `web`, `server`, and `worker`
  - immediate status check returned:
    - `http://127.0.0.1:3000/home => 200`
    - `http://127.0.0.1:3001/api/health => 200`
  - an additional `45s` idle wait preserved both `200` responses

## 2026-04-17 Layer Tree Reorder Closure

- PRD item `9.2.1 图层树拖拽调整 Z-index` is now implemented in the local codebase:
  - `apps/web/src/lib/canvas-context-actions.ts` exports `reorderCanvasElementsByLayerOrder`
  - `apps/web/src/components/canvas-layers-panel.tsx` now supports row drag-start / drag-over / drop / drag-end
- The implementation contract is intentionally aligned with the visual layer ordering model:
  - the layer panel presents items top-to-bottom
  - dropping one row above another transforms that display order back into the scene stack order used by the canvas
- Bounded proof now exists at two levels:
  - pure action helper regression in `apps/web/test/canvas-context-actions.test.ts`
  - live component interaction regression in `apps/web/test/canvas-layers-panel.test.tsx`
- Current verified result:
  - the focused two-file suite passed with `14` tests on 2026-04-17 after the reorder implementation was present

## 2026-04-17 Immersive Right-Panel Header Closure

- The local immersive right-panel header is now structurally aligned with the audited `建筑学长` 4-icon cluster:
  - `添加对话`
  - `历史对话`
  - `文件列表`
  - `收起`
- The safest currently-supported local behavior mapping is:
  - `收起` -> real existing `onToggle`
  - `文件列表` -> real existing scroll-to-section behavior inside the panel
  - `添加对话` -> conservative reuse of the existing local `handleNewChat` path
  - `历史对话` -> structure aligned, but full hover-popup contents intentionally deferred until another live-site audit freezes the popup body
- An important product-detail gap was also closed in this slice:
  - `CanvasFilesPanel` embedded mode no longer disappears when there are `0` generated files
  - the panel now keeps a stable shell with:
    - title `生成文件列表`
    - count/status `暂无文件`
    - empty copy `暂无生成文件`
- This resolves a real parity problem:
  - the right-panel header `文件列表` icon now always has a deterministic in-panel target to scroll to
  - the previous implementation could render no target at all, which made the audited click handler impossible to mirror honestly
- Verified locally by focused regressions:
  - `test/chat-sidebar.test.tsx`
  - `test/canvas-files-panel.test.tsx`
  - bounded combined regression with `test/chat-input.test.tsx`

## 2026-04-17 Right-Panel Follow-up Audit

- A new real-site audit round closed the last ambiguous right-panel facts after dismissing the current full-screen pricing notice on canvas entry.
- `历史对话` is now frozen as a real hover popover rather than a generic placeholder:
  - DOM shell:
    - `micro-popover-content`
    - `micro-popover-inner`
    - `micro-popover-inner-content`
  - visible content:
    - title `历史对话`
    - session-item row list
  - audited active row text in the current logged-in state:
    - `改为夜景`
  - evidence:
    - `output/playwright/reference-audit/pending-history-hover-fixed-2026-04-17.png`
    - `output/playwright/reference-audit/pending-history-popover-element-2026-04-17.png`
    - `output/playwright/reference-audit/pending-history-popover-rows-2026-04-17.json`
- `文件列表` is also now frozen more precisely:
  - clicking the header icon does not scroll to an embedded section
  - it switches the right side into a dedicated `生成文件列表` panel
  - the dedicated panel currently shows:
    - title `生成文件列表`
    - top-right close button
    - generated-image thumbnail list
    - terminal copy `没有更多了`
  - while this file panel is active, the bottom composer remains centered on the canvas instead of staying docked in the records panel
  - evidence:
    - `output/playwright/reference-audit/pending-file-view-clicked-2026-04-17.png`
    - `output/playwright/reference-audit/pending-file-view-clicked-2026-04-17.txt`
- Important correction to the previous local interpretation:
  - the earlier fallback `文件列表 -> scroll to embedded shell` is now known to be wrong for parity work
  - this audit round did not support the hypothesis of a deeper right-panel `文件/模板` internal tab switch
  - the next implementation slice should target:
    - immersive `历史对话` popover
    - immersive dedicated `生成文件列表` panel
    - centered composer placement while the file panel is active

## 2026-04-17 Right-Panel Follow-up Implementation Closure

- The local right-panel now matches the frozen post-audit semantics for the bounded slice:
  - `历史对话` is implemented as a real hover popover with:
    - title `历史对话`
    - session-row list
    - active-row highlighting
    - click-to-switch session behavior
  - `文件列表` now switches to the dedicated immersive `生成文件列表` panel instead of scrolling to an embedded panel section
  - the dedicated file panel now preserves the centered floating composer while active, which matches the live site
- A previously failing regression exposed the real implementation bug rather than a product mismatch:
  - `ChatSidebar` referenced `immersivePanelView` before the `useState` declaration
  - this produced `ReferenceError: Cannot access 'immersivePanelView' before initialization`
  - the fix was only to reorder the derived `showingImmersiveFilePanel` expression after state initialization
- One local test expectation was intentionally corrected because it encoded the superseded fallback behavior:
  - the immersive records view should not require the old panel-level embedded `canvas-files-panel-embedded` shell
  - the record-card-local `生成文件列表 / 加载中...` block remains valid, because it belongs to the record card itself rather than the header-triggered dedicated file-list view
- Verified locally after the correction:
  - focused right-panel suite: `26` tests passed
  - bounded web regression: `37` tests passed

## 2026-04-17 Empty-Canvas Shell Parity Closure

- The next highest-signal mismatch after the right-panel slice was the architecture empty-canvas shell rather than another deep context-menu branch.
- The frozen live-site facts that governed this implementation are now enforced locally:
  - the top-right blank-canvas trigger text is `对话`, not `创作记录`
  - the top-right shell includes:
    - `缩小画布`
    - current zoom percentage
    - `放大画布`
    - credits / `充值`
  - the architecture empty canvas should not show the local centered helper copy overlay
  - the left-bottom `图层` affordance should read as a compact icon-only floating button, not a pill with visible text
  - the immersive blank-canvas composer placeholder should be `添加图片输入文案开始创作之旅...`
  - the immersive attachment affordance should be named `添加图片`
- Implementation decisions taken for this slice:
  - used `useCredits()` directly in `apps/web/src/app/canvas/page.tsx` rather than the older `CreditHeaderButton`, because the live blank canvas shows a lightweight credits/recharge cluster instead of the full Lovart-style popover entry
  - wired `缩小画布 / 放大画布` to Excalidraw `appState.zoom`, so the new shell is functional rather than decorative
  - hid `CanvasEmptyHint` only for architecture mode, preserving classic-mode behavior for now
- Verified locally after implementation:
  - focused shell suite: `2` files passed, `14` tests passed
  - bounded web regression: `4` files passed, `40` tests passed

## 2026-04-17 Home Creation-First Shell Recheck

- Before opening another `/home` implementation slice, I re-ran the dedicated home-shell regression to verify whether the task-plan item was truly open or merely stale.
- Result:
  - `apps/web/test/home-page-shell.test.tsx` passed (`4` tests)
- This means the current source already satisfies the bounded creation-first home contract that matters for the frozen PRD:
  - white architecture shell
  - prompt-first top area
  - `最近项目` with `新建项目` as the first card
  - new-project card opens `添加项目` dialog before creating anything
  - bottom area stays on the case/example entry path rather than the older discovery-gallery shell
- Conclusion:
  - the remaining “open” appearance in the historical Batch-1 checklist is bookkeeping drift, not a current source gap

## 2026-04-17 Neutral Visual Constraint Closure

- The user’s latest visual override supersedes any earlier warm-toned exploration and also overrides the `ui-ux-pro-max` design-system suggestion that proposed a gold CTA accent.
- The authoritative visible-shell palette for the current `home + canvas` primary experience is now:
  - white primary backgrounds
  - slate-200 class borders / separators
  - slate-50 / slate-100 supporting surfaces
  - slate-500 / slate-700 iconography and helper text
  - neutral shadows derived from `rgba(15,23,42,...)`
- To prevent regression, the repo now includes a source-level guard:
  - `apps/web/test/architecture-neutral-palette.test.ts`
  - it forbids the previously observed warm palette tokens, warm shadow values, accent utility usage in the touched files, and oversized home-facing panel radii
- The current neutralization batch explicitly covered:
  - `apps/web/src/app/(workspace)/home/page.tsx`
  - `apps/web/src/components/home-prompt.tsx`
  - `apps/web/src/components/home-example-browser.tsx`
  - `apps/web/src/components/new-project-dialog.tsx`
  - `apps/web/src/app/canvas/page.tsx`
  - `apps/web/src/components/chat-input.tsx`
  - `apps/web/src/components/canvas/canvas-context-menu.tsx`
  - `apps/web/src/components/canvas/canvas-selection-action-bar.tsx`
  - `apps/web/src/components/canvas-tool-menu.tsx`
- An additional copy/localization cleanup was completed inside the same bounded slice:
  - the `形状` flyout header no longer leaves the English word `Style` in the visible architecture canvas flow; it now uses Chinese `样式`
- Radius rule now concretely enforced for touched home-facing panels:
  - `最近项目`
  - `参考案例`
  - `HomePrompt`
  - `添加项目` dialog shell buttons
  - the regression test treats radii above `10px` in these source files as invalid

## 2026-04-17 Logged-In Home Composer Re-Audit

- The persistent Playwright browser session is currently holding a valid logged-in `建筑学长` home state again:
  - URL: `https://www.jianzhuxuezhang.com/canvas/home`
  - authenticated header text visible: `187****4299`
- The homepage composer state visible in the real product at this moment includes:
  - an already attached reference thumbnail on the left side of the input
  - placeholder still matching the previously frozen copy: `添加图片输入文案开始创作之旅...`
  - current visible model chip: `Banana Pro`
  - current visible quality chip: `自动 / 1K`
  - `模版` trigger present inside the composer control row
- Reopening the live `模版` popover from the logged-in home session again confirms:
  - the panel is a full category + item browser, not a flat list
  - visible category set still includes:
    - `全部`
    - `热度`
    - `最新`
    - `效果渲染`
    - `总平填色`
    - `户型填色`
    - `风格迁移`
    - `剖立面`
    - `分析图`
    - `展板生成`
    - `灵感方案`
    - `氛围转换`
    - `画风转换`
    - `视角转换`
    - `方案设计`
    - `旧房改造`
    - `室内装修`
    - `局部修改`
    - `分镜图`
- The current popover text dump also confirms the item rail remains dense and scrollable; visible sampled entries include:
  - `建筑晴天渲染`
  - `鸟瞰晴天渲染`
  - `建筑平面清新填色`
  - `景观晴天渲染`
  - `平面图转鸟瞰图`
  - `室内质感渲染`
  - `极简区位mapping图`
  - `景观爆炸图`
  - `基地现状分析`
  - `体块生成分析`
  - `室内光影渲染`
  - `写实建筑渲染`
  - `空白地块生成景观方案`
  - `建筑平面写实填色`
  - `城市路网分析`
  - `景观平面清新填色`
  - `空白场地生成建筑方案`
  - `景观平面丰富及填色`
  - `景观插画轴测分析图`
  - `建筑设计灵感`
  - `室内平面填色1`
  - `sasaki风格区位分析图`
  - `室内平面方案设计`
  - `建筑清晨渲染`
  - `简约莫兰迪室内平面填色`
  - `一键生成6张多角度图`
  - `景观展板生成`
  - `鸟瞰图转平面图`
  - `景观平面写实填色`
  - `建筑夜晚渲染`
- This round closed one more environment doubt:
  - the live session can be re-entered without re-triggering SMS login when the persistent browser tab is still alive
  - therefore the remaining template-to-model work can continue inside the existing session instead of using a fresh login flow

## 2026-04-17 Multi-Category Template-to-Model Sampling

- After stabilizing the audit against the composer-local DOM instead of whole-page text matches, the remaining `23.4` question advanced from a single proof point to a partial real sample matrix.
- Stable audited local selectors on the real page:
  - composer controls live under `.operate_container_otq-6x`
  - model / quality / template triggers are the three `.option_title_UZ62BC` children in order
  - template categories live under `.left_list_VdFR7D .first_level_eJSoJ1`
  - template items live under `.template-grid_So0IP0 .subject_ttc0Lf`
- Real sampled behavior, all from the logged-in homepage composer after first forcing the current model to `Banana2`:
  - `效果渲染 -> 建筑晴天渲染 -> Banana Pro`
  - `总平填色 -> 建筑平面清新填色 -> Banana Pro`
  - `户型填色 -> 室内平面填色1 -> Banana Pro`
  - `分析图 -> 基地现状分析 -> Banana Pro`
  - `分镜图 -> 室内分镜图生成 -> Banana Pro`
- The same samples also confirm that each category owns its own concrete item list rather than sharing one global flat catalog:
  - `效果渲染` sample list included:
    - `建筑晴天渲染`
    - `鸟瞰晴天渲染`
    - `景观晴天渲染`
    - `室内质感渲染`
    - `室内光影渲染`
    - `写实建筑渲染`
    - `建筑清晨渲染`
    - `建筑夜晚渲染`
  - `总平填色` sample list included:
    - `建筑平面清新填色`
    - `建筑平面写实填色`
    - `景观平面清新填色`
    - `景观平面丰富及填色`
    - `景观平面写实填色`
  - `户型填色` sample list included:
    - `室内平面填色1`
    - `简约莫兰迪室内平面填色`
    - `公装室内平面填色2`
    - `室内平面填色2`
    - `公装室内平面填色1`
  - `分析图` sample list included:
    - `极简区位mapping图`
    - `景观爆炸图`
    - `基地现状分析`
    - `体块生成分析`
    - `城市路网分析`
    - `景观插画轴测分析图`
  - `分镜图` currently exposed a single sampled item:
    - `室内分镜图生成`
- Evidence-weighted interpretation:
  - the live product strongly suggests `Banana Pro` is the recommended default across the categories sampled so far
  - however, it is still not safe to claim that every remaining category or every single template maps to `Banana Pro` without more samples

## 2026-04-17 Historical Batch-1 Checklist Drift

- The older Batch 1 open checkpoints in `task_plan.md` were re-verified against current source and are now clearly bookkeeping drift rather than active product gaps.
- Fresh targeted evidence collected on 2026-04-17:
  - shell/prompt bundle: `5` files, `27` tests passed
  - `ChatSidebar` bundle: `1` file, `25` tests passed
- What this recheck closed at the evidence level:
  - the home shell is still creation-first with `新建项目` as the first recent-project card
  - the current architecture canvas flow uses the immersive shell path instead of relying on the older always-on left rail
  - the right-side composer path now uses real reference-image chips rather than a plain English selection summary
  - template injection and Chinese copy paths are already covered by focused regressions

## 2026-04-17 Add Modal Baseline Re-Audit

- Re-entered the real logged-in canvas detail page:
  - URL: `https://www.jianzhuxuezhang.com/canvas/detail?projectId=69dee2c31f0f9e40898b2322`
- Opened the left-rail `添加` entry on the live site and confirmed the baseline modal shell directly:
  - it is a large overlay dialog, not a narrow flyout
  - top-left action is `返回`
  - top source tabs are:
    - `本地上传`
    - `官方图库`
    - `企业图库`
    - `我的创作`
  - default visible tab is `本地上传`
  - default visible body shows a single centered primary action:
    - `上传图片`
- Important parity implication for the local repo:
  - the current local `CanvasToolMenu` shell already matches the high-level dialog-vs-flyout decision
  - but its `本地上传` tab currently exposes extra architecture-specific shortcut cards (`上传参考图 / 插入参考板 / 铺开建筑板块`), which are not part of the live baseline shell just observed

## 2026-04-17 Add Modal Tab Semantics Audit

- `官方图库` is not a placeholder tab.
- The live `官方图库` tab currently exposes a richer browsing structure:
  - a top horizontal first-level category strip with items including:
    - `建筑效果图`
    - `室内效果图`
    - `景观效果图`
    - `城市效果图`
    - `彩平参考图`
    - `拼贴效果图`
    - `插画效果图`
    - `竞赛效果图`
    - `夜景效果图`
    - `平立剖参考`
    - `室内平面图`
  - a second horizontal subtype strip with entries such as:
    - `默认`
    - `别墅`
    - `小区住宅`
    - `办公楼`
    - `办公园区`
    - `文化建筑`
    - `酒店`
    - `商业综合体`
    - `学校`
    - `幼儿园`
    - `体育馆`
    - `售楼部`
    - `会所`
    - `商业街`
    - `商业门头`
    - `医院`
    - `工业厂房`
    - `交通建筑`
    - `文旅`
    - `民宿`
  - a dense image grid below the two filter rows
- `企业图库` is not rendered as a normal asset list in the current logged-in personal account state.
- Clicking `企业图库` opened a dedicated entitlement/paywall dialog instead:
  - headline: `开通【企业会员】解锁企业图库`
  - explanatory copy about enterprise members uploading / managing / using internal image assets
  - actions:
    - `取消`
    - `去开通`
- Product implication:
  - local parity should not model `企业图库` as the same browsing shell as `官方图库` by default
  - it needs an explicit gated-state branch

## 2026-04-17 Add Modal Gallery Insertion Behavior

- The last missing high-signal action on the live `添加` flow is now confirmed:
  - clicking an image inside `官方图库` does not merely preview or select it inside the modal
  - it closes the modal and inserts the chosen image into the live canvas immediately
- Real evidence observed after clicking the first `官方图库` image:
  - the add dialog disappeared
  - the left `图层` panel gained a new top row:
    - label observed: `Image_3`
  - existing older image rows remained below it
- Product implication for the local repo:
  - `官方图库` image cards need a real insert-to-canvas action, not a decorative gallery shell
  - the expected local parity is:
    - click image
    - close modal
    - append/insert image element into the Excalidraw scene
    - surface the new image in the layer list immediately

## 2026-04-17 Add Modal Local Contract Closure

- The bounded local implementation is now aligned with the audited live baseline inside `CanvasToolMenu`:
  - `本地上传` keeps only the centered `上传图片` action
  - `官方图库` uses the real two-level filter shell plus insertable image cards
  - `企业图库` uses a gated entitlement overlay instead of pretending to be a normal gallery
  - `我的创作` now exposes the source strip and current empty-state branch
- The remaining uncertainty is intentionally narrow:
  - deeper `官方图库` interactions such as search / pagination / hover preview
  - `我的创作` non-empty state and reinsertion semantics
  - `企业图库` post-`去开通` downstream flow
- Planning implication:
  - the next slice should move away from re-litigating the `添加素材` shell and back to the next unresolved live-auditable PRD item
  - `25.2` follow-ups such as `查看大图` or `导出` downstream menus are now better candidates

## 2026-04-17 Large-Image Viewer Audit

- The live `查看大图` flow is now materially clearer than the earlier teaching-doc-only understanding.
- Real-site audit from the logged-in canvas page confirmed:
  - clicking the single-image floating action-bar entry `查看大图` opens a fullscreen preview overlay rather than navigating away
  - the overlay root uses a dedicated preview shell (`micro-image-preview`)
  - the top-right operation strip is a 5-item icon cluster, not a text toolbar
  - the visible operation classes are:
    - `micro-image-preview-operations-operation-rotateLeft`
    - `micro-image-preview-operations-operation-rotateRight`
    - `micro-image-preview-operations-operation-zoomOut`
    - `micro-image-preview-operations-operation-zoomIn`
    - `micro-image-preview-operations-operation-close`
  - the initial `zoomOut` item carries a disabled class until the user first zooms in
  - clicking `zoomIn` removes the disabled class from `zoomOut`
  - clicking `rotateRight` changes the preview image transform
  - the bottom of the viewport renders a full-width drawer shell with a centered primary action:
    - `立即下载`
- Important parity implication for the local repo:
  - the old generic `ImageLightbox` toolbar with `左右翻转 / 上下翻转 / 重置 / 下载` does not match the audited canvas viewer
  - the canvas-selected-image path needs its own architecture-style viewer variant

## 2026-04-17 Large-Image Viewer Local Closure

- The local canvas path now uses a dedicated architecture preview variant instead of the old generic lightbox.
- The bounded local contract is:
  - `CanvasSelectionActionBar -> 查看大图` opens a dialog named `查看大图`
  - top-right icon-only controls: `逆时针旋转 / 顺时针旋转 / 缩小 / 放大 / 关闭查看大图`
  - `缩小` is disabled on open and becomes enabled after `放大`
  - bottom drawer exposes `立即下载`
  - canvas viewer no longer renders `左右翻转 / 上下翻转 / 重置`
- Remaining uncertainty is now limited to deeper enhancement branches rather than the viewer shell itself.

## 2026-04-17 Single-Image Export Semantics Audit

- Re-opened the live authenticated `建筑学长` canvas detail page and re-triggered the single-image context menu directly on the selected image.
- Real-site DOM audit confirms the current menu structure is flat, not hierarchical:
  - the `导出` menu item has no `aria-haspopup`
  - the `导出` menu item has no `aria-expanded`
  - the `导出` menu item contains no nested `[role="menu"]`
  - the full right-click menu DOM contains only flat sibling `menuitem` nodes
- Action audit result:
  - clicking `导出` closes the menu immediately
  - no PNG / JPG submenu appeared before close
  - Playwright did not capture a `download` event in this session
  - patched `HTMLAnchorElement.click` / `URL.createObjectURL` probes also did not observe a direct browser-managed download path from the live site in this run
- Local code audit closed the implementation ambiguity:
  - `apps/web/src/app/canvas/page.tsx` already wires single-image `导出` directly to `handleExportSelectedCanvasImage`
  - the handler downloads the current image immediately as `canvas-export-<id>.png`
  - `CanvasContextMenu` is a flat action list component and does not model nested submenu children
- Product conclusion:
  - freeze `单图右键 -> 导出` as a direct export action
  - stop treating `PNG / JPG 二级菜单` as an open IA question
  - remaining uncertainty is only automation evidence for the exact live browser download side effect, not the menu structure itself

## 2026-04-17 Shape Flyout Icon Audit

- Re-opened the live authenticated canvas detail page, clicked the left-rail `形状` button, and inspected the resulting flyout DOM.
- The visible shape flyout contract is now materially clearer:
  - it is a compact popover rather than a large card list
  - the internal grid is `3 + 2`, not `2 + 3`
  - the buttons are icon-only; the flyout does not render visible text labels or hint copy
- Real-site DOM / React-props evidence confirmed the exact visible icon order:
  - `micro-icon-frame-square-box`
  - `micro-icon-frame-ellipse`
  - `micro-icon-leafer-12`
  - `micro-icon-frame-line`
  - `micro-icon-lasso`
- Interpretation that can be frozen safely:
  - the first four icons map cleanly to方框、圆形、箭头、直线
  - the fifth icon is not the local `菱形` card; it is a lasso-shaped closed-figure icon
  - the live DOM still does not surface a human-readable tooltip or label for the fifth item, so its exact product copy remains narrower than its icon-level identity
- Product implication for the local repo:
  - the old text-card shape flyout is off-spec
  - visible local parity should be based on the live icon grid and icon order first, not on invented hint labels

## 2026-04-17 Shape Flyout Local Shell Closure

- The local architecture shape flyout now matches the audited visible shell much more closely:
  - `CanvasToolMenu` no longer renders the off-spec text-card layout
  - it now renders a compact `3 + 2` icon-only grid
  - the visible icon order matches the live-site DOM order
  - the old visible `菱形 / 基础块面 / 流程决策 / 关联路径 / 辅助分隔` copy has been removed from the flyout
- Important honesty note:
  - the fifth local button now uses a lasso-like closed-figure icon shell and accessible label `闭合图形`
  - deeper human-readable naming and full behavioral equivalence for that fifth tool are still narrower than the visible-shell parity we closed in this batch

## 2026-04-17 Shape Flyout Polyline Naming Closure

- The remaining ambiguity on the fifth `micro-icon-lasso` button is now closed by an authoritative user clarification tied to the real product workflow:
  - the fifth button means `连续多段线`
  - it should no longer be modeled locally as `闭合图形`
- Local implementation constraint discovered during the closure work:
  - bundled Excalidraw `ToolType` exposes `line` but not a dedicated `polyline`
  - the upstream codebase still contains the linear-element multi-point editing path (`multiElement`, `editingLinearElement`, `points.length > 2`)
- Stable product decision now frozen in source:
  - the 4th flyout button remains `直线`
  - the 5th flyout button is `连续多段线`
  - both map to the upstream `line` tool, but the local UI keeps separate button identity and active-state handling so the 4th/5th buttons do not light up together
  - selecting an existing `line` element with more than two points should resolve back to the 5th button

## 2026-04-17 Right Panel Add-Dialog / File-Dock Data-State Closure

- Re-entered the live authenticated `建筑学长` canvas detail page and completed the last real data-state audit for the right-side header actions instead of relying on earlier inference.
- `添加对话` is now confirmed at the behavior level:
  - clicking the header `micro-icon-add-dialog` button switches into a fresh conversation state
  - the previous record body is cleared
  - the middle body shows a welcome empty state
  - the visible guidance copy is `在下方输入你的创意来生成图片吧`
  - the composer remains docked inside the right panel rather than jumping to a centered floating shell
- `文件列表` is now confirmed more tightly than the older PRD wording:
  - clicking the header `micro-icon-file-list` button does **not** replace the whole right panel
  - it opens or refreshes a bottom `生成文件列表` dock inside the same right column
  - the dock contains:
    - title `生成文件列表`
    - close icon button
    - image grid / masonry area
    - footer state such as `没有更多了` or `加载中...`
  - the creation-record area above remains visible
  - the docked input composer also remains inside the right panel
- Product implication:
  - the earlier local assumption of a dedicated full-height right-side file view was off-spec
  - the correct local parity is “same column, bottom dock”, not “swap the whole sidebar body”

## 2026-04-17 File / Asset / Template Surface Split Closure

- Re-audited the live site specifically against the stale PRD question “右侧文件库 / 资产库 / 模板库在同一面板中的切换结构”.
- Live-site DOM evidence now shows the current product does **not** implement these as one unified right-side multi-tab panel:
  - `文件列表` lives inside the right column as the bottom `生成文件列表` dock.
  - `模版` opens its own popover surface from the composer trigger:
    - root class observed: `popover_card_JX-Nxr`
    - internal structure observed: left category tree + right template item grid
  - `+` / 添加图片 opens its own large add-material dialog:
    - header `返回 / 本地上传 / 官方图库 / 企业图库 / 我的创作`
  - during audit, the template popover and add-material dialog could coexist as separate overlay roots, which further proves they are not one shared container.
- Teaching-doc implication:
  - the wording “右侧抽屉面板包含对话记录、图库列表、提示词模板库” is too coarse to freeze as a single implementation container
  - the real information architecture is split by surface and trigger, not unified by one right-side state machine
- Local-repo implication:
  - `25.2.4` should be closed as a documentation-correction item rather than expanded into a forced “unified right-side library container” refactor
  - the current repo’s split structure across `chat-sidebar` / `chat-input` / `canvas-tool-menu` is directionally closer to the live site than the old PRD wording suggested

## 2026-04-17 Multi-Image Pending Chip Order Audit

- Re-entered the live authenticated `建筑学长` canvas detail page and created a real multi-image pending-input state by框选两张画布图片。
- Live DOM / geometry evidence now closes the last open ambiguity around the multi-image order arrows:
  - pending chips use class `select_image_item_Z1mi1Y temporary_q79S78`
  - each chip is a `60x60` thumbnail
  - the close affordance uses class `close_icon_srVHw9`
  - the reorder affordances use class `move_image_btn_0zcdXp`
  - button geometry captured from the live DOM:
    - close button: `18x18`, floating at the chip’s top-right outside edge
    - left arrow: `24x18`, anchored inside the lower-left edge
    - right arrow: `24x18`, anchored inside the lower-right edge
- Live computed-style evidence:
  - enabled and disabled reorder buttons both stay visible
  - both use dark translucent backgrounds (`rgba(0, 0, 0, 0.5)`)
  - disabled state changes cursor to `not-allowed` and dims icon color instead of removing the control
- Live behavior evidence:
  - clicking a chip close button removes that image from the pending input list
  - the canvas multi-selection frame remains in place after closing a chip
  - therefore “pending input references” and “canvas selection” are separate state layers and must not be collapsed into one local source of truth
- Evidence captured during this audit:
  - `C:/Users/admin/.codex/mcp/playwright/output/page-2026-04-17T12-45-44-101Z.png`
  - `C:/Users/admin/.codex/mcp/playwright/output/page-2026-04-17T12-54-40-459Z.png`

## 2026-04-17 Multi-Image Pending Chip Local Closure

- The local repo now matches the audited pending-chip contract more closely:
  - `apps/web/src/components/chat-input.tsx`
    - removed the old “thumbnail + below-arrow strip” shell
    - now renders a `60x60` chip with top-right dismiss button and in-chip bottom arrows
    - keeps the boundary arrows visible but disabled
  - `apps/web/src/components/chat-sidebar.tsx`
    - introduced a small dismissed-id state so removing one pending chip only affects input context
    - filtered pending send/focus confirmation flows through that dismissed-id layer
- Product consequence now frozen locally:
  - reordering still works on the remaining pending chips
  - dismissing one pending chip no longer forces a canvas deselection side effect
  - confirmed attachment behavior remains separate from pending-selection behavior

## 2026-04-17 Template-to-Recommended-Model Local Closure

- The local product had one real parity gap even after the live `23.4` audit:
  - home and immersive canvas were rendering the visible `Banana Pro` chip through `AgentModelSelector`
  - that meant the chip was actually bound to agent-runtime model state rather than image-generation model state
  - consequence: template clicks could inject the prompt, but the visible model chip could not truthfully mirror the real-site `Banana2 -> Banana Pro` reset path
- The bounded local fix now frozen in source:
  - added `apps/web/src/lib/image-model-utils.ts`
  - short-form image-model chip labels now map as:
    - `google/nano-banana-pro` -> `Banana Pro`
    - `google/nano-banana-2` -> `Banana2`
    - `google/nano-banana` -> `Banana`
  - `AgentModelSelector` now supports `source="image"` and, in that mode, reads from `useImageModelPreference` and opens `ImageModelPreferencePopover`
  - `ChatInput` template application now sets the recommended image-generation preference before injecting the template prompt
  - `HomePrompt` template application now does the same, so homepage and immersive canvas stay aligned
- Product consequence:
  - the visible home / immersive `Banana Pro` chip is now tied to image-model state instead of agent-model state
  - clicking a template item locally resets a manually changed `Banana2` selection back to the recommended `Banana Pro`, matching the audited live behavior already frozen in PRD
- Remaining boundary:
  - this closes the local implementation gap
  - the still-open `23.4` uncertainty is only the live long-tail matrix, i.e. whether every un-sampled template category also resets to `Banana Pro`

## 2026-04-17 Template-to-Model Long-Tail Sampling Closure

- A parallel live-site audit reused the authenticated首页 session and expanded the remaining `23.4` matrix across the previously un-sampled main categories.
- Newly sampled representative categories and outcomes:
  - `风格迁移 -> 建筑效果迁移1`: `Banana2` -> `Banana Pro`
  - `剖立面 -> 立面真实风格`: `Banana2` -> `Banana Pro`
  - `展板生成 -> 景观展板生成`: `Banana2` -> `Banana Pro`
  - `灵感方案 -> 建筑设计灵感`: `Banana2` -> `Banana Pro`
  - `氛围转换 -> 夜晚时间转换`: `Banana2` -> `Banana Pro`
  - `画风转换 -> 小清新插画转换`: `Banana2` -> `Banana Pro`
  - `视角转换 -> 平面图转鸟瞰图`: `Banana2` -> `Banana Pro`
  - `方案设计 -> 空白地块生成景观方案`: `Banana2` -> `Banana Pro`
  - `旧房改造 -> 建筑立面改造`: `Banana2` -> `Banana Pro`
  - `室内装修 -> 现代奶油室内装修`: `Banana2` -> `Banana Pro`
  - `局部修改 -> 建筑表皮修改`: `Banana2` -> `Banana Pro`
- Combined with the earlier sampled categories:
  - `效果渲染`
  - `总平填色`
  - `户型填色`
  - `分析图`
  - `分镜图`
- Evidence-weighted freeze:
  - all sampled main categories currently point to the same recommendation outcome
  - no sampled exception has been found that resets to anything other than `Banana Pro`
  - it is still theoretically possible that an unsampled edge template differs, but that is no longer strong enough to block freezing the product default
- Recommended product contract:
  - treat `Banana Pro` as the unified default recommended model for template clicks
  - only introduce per-template overrides if future real-site evidence proves an exception
- Evidence paths returned by the parallel audit:
  - `C:/Users/admin/.codex/mcp/playwright/output/jzxz-home-probe.png`
  - `C:/Users/admin/.codex/mcp/playwright/output/jzxz-template-panel-open.png`
  - `C:/Users/admin/.codex/mcp/playwright/output/template-audit-01.png`
  - `C:/Users/admin/.codex/mcp/playwright/output/template-audit-02.png`
  - `C:/Users/admin/.codex/mcp/playwright/output/template-audit-03.png`
  - `C:/Users/admin/.codex/mcp/playwright/output/template-audit-04.png`
  - `C:/Users/admin/.codex/mcp/playwright/output/template-audit-05.png`
  - `C:/Users/admin/.codex/mcp/playwright/output/template-audit-06.png`
  - `C:/Users/admin/.codex/mcp/playwright/output/template-audit-07.png`
  - `C:/Users/admin/.codex/mcp/playwright/output/template-audit-08.png`
  - `C:/Users/admin/.codex/mcp/playwright/output/template-audit-09.png`
  - `C:/Users/admin/.codex/mcp/playwright/output/template-audit-10.png`
  - `C:/Users/admin/.codex/mcp/playwright/output/template-audit-11.png`

## 2026-04-18 Composer / Toolbar Stabilization Closure

- Session restart confirmed the immediate memory pressure was not coming from active WSL containers:
  - `wsl.exe -l -v` showed the Ubuntu distro stopped
  - `docker ps` returned no running containers
  - the remaining memory pressure was dominated by duplicated Codex Desktop MCP helper processes
- Safe cleanup pattern validated for this machine:
  - close stale subagents first
  - collapse duplicate `@playwright/mcp`, `chrome-devtools-mcp`, and `mcp_server_fetch` helper processes
  - keep WSL runtime off until a fresh test/build command is needed
- Product-side findings frozen by the new local slice:
  - `HomePrompt` needs the same split-pill + in-shell upload layout as the immersive canvas composer; otherwise homepage and canvas drift apart again
  - immersive composer stability depends on separating the pending reference strip from the text input shell; if chips stay inside the main column, the shell height becomes content-driven and diverges from建筑学长
  - image floating toolbars cannot follow dragged selections reliably if `CanvasEditor` only keys off selected ids; geometry must be part of the emitted selection snapshot
  - shape editing parity requires two distinct toolbar behaviors:
    - `tool mode`: top fixed strip while a shape tool is armed
    - `selection mode`: anchored floating strip with real color pickers while a concrete shape is selected
  - add-material dialog parity depends on a fixed shell with an internal scroll region, not on content-driven modal height
- Fresh planning read of PRD/task plan after this slice confirms:
  - the just-finished fixed-composer / anchored-toolbar slice is closed
  - the next best local front-end closures are `25.1-4 输入焦点冲突`, `25.1-7 历史定位失败提示`, and `18.4-2 我的创作非空态 + 回插画布`
