# 7차 개발 — 육성 덱·카드 제작 환경 실행 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. 현재 세션에서 직접 순차 구현하고 마지막에 독립 리뷰를 수행한다.

**Goal:** 시작 덱 전체로 육성하고 두 번의 인카운터와 서포트 고유 상위 스킬을 제공하며, 이미지 포함 카드팩을 별도 제작 도구와 게임 사이에 교환한다.

**Architecture:** 공통 카드 정의와 검증을 `src/cards`에 두고 게임 상태가 선택한 콘텐츠의 스냅샷을 보유한다. 기존 경기·성장 규칙에 선언적 스킬과 사건을 연결하고 별도 웹 편집기에서 같은 정의·계산을 사용한다. 카드팩은 ZIP(JSON·PNG/JPEG/WebP), 라이브러리·진행 저장·초안은 IndexedDB에 분리 보관한다.

**Tech Stack:** 현재 React·TypeScript·Vite·Zod, fflate 0.8.3, 개발 검증용 fake-indexeddb 6.2.5, node:test, 별도 Edge Playwright 프로필.

**Spec:** [카드 제작 설계](../specs/2026-10-01-card-authoring-design.md), [서포트 확장](../specs/2026-10-01-support-expansion-notes.md).

## Global Constraints

- 현재 변경이 누적된 `codex/development-loop-intelligence` 브랜치에서 이어서 작업한다. 기존 v5/v6 변경을 되돌리거나 별도 체크아웃에 누락하지 않는다. 자동 커밋·푸시는 이번 범위가 아니다.
- 사용자의 개발 시작 요청에 따라 앞선 제안의 구현값을 6장 시작 덱·18장 기본 카드·신규 여캐 12명으로 정한다. 월별 재선택을 제거하고 덱 전체를 동행·사건 후보로 사용한다.
- 3~6월 16주, 전반·후반·주말, 두 역할, 선발 경쟁·라이벌리·여름 대회, 1차/숙련 규칙을 유지한다. 연애·7월 이후·별도 돌파 시스템은 추가하지 않는다.
- 매 평일 활동 뒤 75% 사건 추첨, 연속 두 슬롯 미발생 뒤 보장. 고유 사건은 인연 20/40/60·선행 사건으로 개방하며 일상보다 우선한다. 보상은 1회다.
- 일반→상위는 대체 관계다. 서포트의 마지막 고유 사건이 상위를 개방하고 일반 스킬·능력 조건·SP를 갖춰 습득한다. 지능은 실제 발동 확률에 적용한다.
- 새 카드/수정판은 새 육성부터 반영한다. 진행 중 덱의 정의는 고정한다. 저장 v7, 구형 이관 제외·원문 자동 삭제 금지.
- 현재 사용자의 브라우저 저장을 테스트에 사용하지 않는다.

## Review Focus

- 다른 팩과의 ID 충돌·선행 사건/스킬 순환·없는 파일 참조가 라이브러리 일부만 바꾸는 경우.
- 후반 사건 재개가 활동/차준서 성장/선발 평가를 재처리하거나 주말을 생략하는 경우.
- 같은 계열의 상위·일반 동시 적용과 다수 발동 후보에서 미리 보기 확률·실행 속도가 달라지는 경우.
- 카드 라이브러리 수정/삭제가 진행 중 스냅샷이나 이미지 참조를 깨뜨리는 경우.
- 도구에서 만든 외부 카드가 편집기에서는 보이지만 타자·투수의 동행/사건/경기에서 실제로 사용되지 않는 경우.

## Task 1: 카드 규격과 카드팩 왕복

**Files:** `src/cards/schema.ts`, `src/cards/pack.ts`, `src/cards/pack.test.ts`, package scripts.
**Interfaces:** `CardPack`, `CardContent`, `SupportCard`, `SkillDefinition`, `EncounterDefinition`; `validatePack(input): CardPack`; `encodePack(pack): Uint8Array`; `decodePack(bytes): CardPack`; `subsetPack(pack, cardIds): CardPack`.

- [x] 역할·선행 참조·중복 ID·순환·잘못된 이미지, 단일 카드 의존성 포함의 실패 테스트를 작성하고 실행한다.
- [x] 엄격한 데이터 규격과 선언적 조건/효과를 구현한다. 임의 코드·HTML 실행과 외부 파일 자동 로드를 허용하지 않는다.
- [x] ZIP 왕복과 크기 제한, 버전 거부·이미지 참조 검사, 카드 선택 내보내기를 구현한다.
- [x] `node --experimental-strip-types --test src/cards/*.test.ts` 통과를 확인한다.

## Task 2: 기본 카드 18장과 동적 조회

**Files:** `src/cards/builtin.ts`, `src/cards/catalog.ts`, `src/cards/stories.ts`, `src/content/supports.ts`, `src/content/skills.ts`.
**Interfaces:** `builtinPack`; `catalogFromPacks(packs): CardContent`; 상태의 `content`에서 카드·스킬·사건을 조회한다. 기존 핵심 NPC ID는 안정적으로 유지한다.

- [x] 모든 기본 카드의 양 역할 훈련, 고유 사건 3단계 도달·역할별 개방 보상을 검증하는 테스트를 작성한다.
- [x] 기존 6명과 초안 신규 12명을 카드 정의로 만들고, 일상 2개·고유 3개 대사/선택지를 각각 작성한다.
- [x] 기존 스킬은 정의 기반 조건·효과로 옮기고 구종/개성 계열과 상위 보상을 연결한다.
- [x] 기본 팩 전체 검증과 각 카드 단일 내보내기/가져오기 검사 통과를 확인한다.

## Task 3: 시작 덱·두 번의 사건·자동 스킬

**Files:** `src/game/types.ts`, `engine.ts`, `support.ts`, `skill-activation.ts`, `match.ts`, `src/content/encounters.ts`, `events.ts`, 관련 game tests.
**Interfaces:** `createGame(name,role,seed,content?,deck?)`; `GameState.content`, `unlockedSkills`, 고유 사건 완료 이력; 사건 이력의 주차+전반/후반. `transition`의 오래된 revision 차단 유지.

- [x] 중복/부족 덱 거부, 월 변경 후 덱 유지, 두 사건의 각 복귀 경로, 같은 보상 중복 방지 테스트를 먼저 실행한다.
- [x] 시작 6장 전체로 동행·사건을 구성하고 월별 재선택을 없앤다. 인연은 카드별로 저장하되 기존 rival/catcher의 단일 값 원칙을 유지한다.
- [x] 선언적 효과의 조건/발동/실제 결과와 상위 대체·개방/SP 학습을 구현한다. 입력 검증 및 동일 시드 재현을 보존한다.
- [x] 손으로 계산한 확률·부담 사례, 많은 스킬 후보, 두 역할 전체 시즌의 저장 재개 회귀를 확인한다.

## Task 4: 저장·카드 라이브러리

**Files:** `src/persistence/save.ts`, `loop-validation.ts`, `database.ts`, persistence tests.
**Interfaces:** `openDatabase`, `loadSession/saveSession`, `listPacks/importPack/removePack`, `readDraft/writeDraft`; 같은 ID·개정·내용은 중복, 높은 개정은 명시적 갱신, 동일 개정 다른 내용은 충돌.

- [x] 팩 등록/충돌/갱신의 원자성과 세션 스냅샷 불변, 이미지 보존, 저장 실패 테스트를 먼저 실행한다.
- [x] IndexedDB 트랜잭션과 v7 상태 검증을 구현한다. 라이브러리·진행·초안을 구분하고 실패 시 원래 데이터를 유지한다.
- [x] 구형 저장 안내를 유지하며 새 게임 확인 전 기존 저장을 쓰지 않는다.
- [x] 실제 IndexedDB 의미를 제공하는 fake-indexeddb와 브라우저 재개로 검증한다.

## Task 5: 게임 덱 화면·별도 카드 제작 도구

**Files:** `src/App.tsx`, `src/ui/DeckBuilder.tsx`, `CardLibrary.tsx`, `GrowthPanels.tsx`, `StatusDialog.tsx`, `src/card-editor/*`, Vite 진입점, styles.
**Interfaces:** 제작기는 같은 `CardPack`과 검증기·미리 보기 계산을 사용하며 파일 교환으로 게임에 전달한다. `/card-editor/` 별도 진입점.

- [x] 카드 가져오기→6장 선택→입학→외부 카드 동행/사건→상위 개방→재개를 실제 화면에서 검사할 브라우저 시나리오를 작성한다.
- [x] 게임에서 가져오기 미리 보기·충돌·오류·내보내기·삭제, 역할/전문 필터·추천 덱, 덱 전체 카드 표시를 구현한다.
- [x] 제작기의 인물/훈련/스킬/사건/이미지 입력, 카드 복제·삭제, 초안 자동 저장, 검사 위치, 카드/전체 팩 내보내기, 실제 규칙 미리 보기를 구현한다.
- [x] 모바일·키보드·오류 복구·새 선수 취소와 사용자 저장 보호를 검사한다.

## Task 6: 전체 검증·밸런스·문서·리뷰

- [x] 기존 테스트를 v7의 의도된 변경에 맞게 갱신하되 경기·성장·재개 회귀는 유지한다. `npm test`, `npm run build`, `git diff --check`를 실행한다.
- [x] 타자·투수 × 서로 다른 육성 방침의 16주 진행, 사건 32추첨/32활동/16주말, 카드별 상위 개방, 덱 집중과 다양한 덱의 성장 차이를 검사한다.
- [x] 제작기→이미지 포함 카드팩→게임→재내보내기→제작기 왕복, 팩 갱신 중 진행 보존, 모바일·키보드를 독립 브라우저로 확인한다.
- [x] 실행 계획·README·tesk·개발 기록에 실제 결과와 제한을 기록한다.
- [x] executing-plans의 최종 독립 리뷰를 요청하고 확인된 주요 문제를 회귀 테스트와 함께 수정한다.

## 실행 기록

작업별 RED/GREEN·결정·검증은 `.artifacts/v7-progress.md`에 기록한다. 시작 기준선은 100/100 테스트 통과(2026-10-01), `.artifacts/v7-baseline-tests.log`다.


## 최종 결과 — 2026-10-01

- Task 1~6 구현. 외부 도구 자료는 [규격·예제](../../cardpacks/README.md), 실제 편집 범위와 초기 제안 대비 차이는 [구현 기준](../specs/2026-10-01-card-authoring-design.md)을 따른다.
- 최종 `npm test` 128/128, TypeScript·Vite 빌드 통과. 회귀 전체 로그 `.artifacts/v7-final-tests.log`, 빌드 `.artifacts/v7-final-build.log`.
- 양 역할×훈련/균형/지능×20시드 120시즌 저장 왕복, 기본 18장×양 역할 고유 3단계 검증. 추가 40시즌 집중/균형 덱 비교 및 외부 투수 카드 개방·습득·효과 확인.
- 별도 Edge에서 이미지 제작→카드팩→게임→고유 사건→상위 학습→후반 재개→라이브러리 수정/삭제→왕복을 검증했다. `.artifacts/v7-browser-result.json`.
- 최종 독립 리뷰의 주요 4건을 재현·수정했다. 그림 복제 독립성, 역할 능력·조건 도달성, 미완성 카드 삭제, 스킬 해제 보상 정리. 대형 팩 내보내기/가져오기 크기 한도도 일치시켰다.
- 구현 세부 결정: 해시/별도 에셋 저장소 대신 깊은 내용 비교와 이미지 포함 스냅샷. 미리 보기는 입학 능력 기준. 원화·연애·돌파 훈련·후속 경기 개편은 포함하지 않는다.
- 시작 작업 트리와 사용자 경기 기획 문서를 보존했다. 자동 커밋·푸시는 하지 않았다.
