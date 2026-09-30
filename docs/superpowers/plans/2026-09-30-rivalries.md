# 주전 경쟁과 해솔고 라이벌 관계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 3~6월 안에서 차준서와 선발을 경쟁하고 실제 해솔고전 결과로 학교·개인 라이벌 관계를 쌓는다.

**Architecture:** 경쟁자 성장·선발 평가는 순수 규칙으로 만들고 기존 상태 전이에 연결한다. 개인 맞대결은 실제 타석 결과를 기록하고 학교 전적은 완료 경기에서 계산한다. v3 검증을 고정한 뒤 v4로 이관하며 기존 확정 명단과 진행 중 경기는 유지한다.

**Tech Stack:** 기존 React 19.3.0 / TypeScript 5.9.3 / Vite 7.3.6 / Zod 4.6.5 / node:test. 새 의존성 없음.

**Spec:** [승인된 4차 설계](../specs/2026-09-30-rivalries-design.md).

**Status:** v0.4.0 구현·검증 완료. 직접 순차 구현과 최종 독립 리뷰를 마쳤다. 아래 단계의 결과와 실제 수행 순서 차이는 마지막 실행 기록에 남겼다.

## Global Constraints

- 첫 범위는 청람고 동기 차준서와의 주전 경쟁, 해솔고와의 학교 관계, 해솔고 간판 선수와의 개인 맞대결이다. 기존 3~6월 16주 안에 넣는다.
- 월별 서포트 편성, 인연, 훈련형 스타일, 평일·주말 슬롯을 유지한다. 미연시는 보류한다.
- 차준서의 경쟁 자료는 능력·연습 평가·감독 신뢰이며, 계산하지 않은 공식전 개인 기록을 만들어 표시하지 않는다.
- 기존 중요 승부 횟수와 타석 진행을 유지한다. 경기 확률·대진·스킬 가격을 라이벌 추가와 함께 변경하지 않는다.
- 한국어와 기존 디자인 유지. 사용자 원본 저장·프로토타입 보존. QA는 별도 localhost origin에서 한다.
- 현재 저장 v3 → v4, 저장 키 `last-summer.save.v1` 유지. 읽기는 저장 쓰기를 하지 않는다.
- 계획 작성 당시 저장소는 최초 커밋이 없고 .git 쓰기가 제한되어 있었다. 승인대로 현재 폴더에서 수행하며 task별 커밋·워크트리 생성·병합·공개 배포 단계는 생략한다.

## Review Focus

1. 기존 selection 저장을 열었을 때 새 점수로 선발이 바뀌지 않아야 한다. → Task 4의 구형 확정 평가 회귀 검사.
2. 구원·대타가 간판 선수를 못 만난 경기는 ‘대결 없음’, 과거 상세 데이터가 없는 경기는 ‘세부 기록 없음’이어야 한다. → Tasks 3–4의 출전/이관 검사.
3. 명단이 이미 history에 들어간 상태에서 현재 명단을 자기 자신의 동점 우선권으로 사용하지 않아야 한다. → Tasks 2/4의 동점과 저장 왕복 검사.
4. 끝내기·연장·마지막 타석·요약 진행에서도 타순 증가 전 상대를 기록하고 중복 타석을 남기지 않아야 한다. → Tasks 3/4의 타석 회귀 검사.
5. 공동 훈련의 상대 성장 미리 보기와 실제 값이 고능력·실패·중복 입력에서 같아야 한다. → Tasks 2/4의 합산 성장 검사와 Task 6 브라우저 확인.

## 파일 책임과 공통 인터페이스

두 관계는 같은 경기·명단·저장 상태에 연결되므로 한 계획으로 구현한다. 규칙 단위는 분리하고 상태 통합은 Task 4에서 한 번 수행한다.

- 새 `src/persistence/v3-schema.ts`, `v3.ts`: 현재 v3 형식 및 검증을 고정. 구형 평가 계산은 최신 경쟁 모듈을 호출하지 않는다.
- 새 `src/game/rival-types.ts`: 아래 자료형. `Role`, `Stats`, `StatKey`, `Outcome`은 기존 타입을 type-only로 참조한다.
- 새 `src/content/rivals.ts`: 차준서 초기값·성장 계획, 정태오/서지환 정의, 학교·선발 변화 대사.
- 새 `src/game/rivalry.ts`: 경쟁자 성장, 학교 전적, 개인 상대 식별·기록 집계. RNG를 읽거나 쓰지 않는다.
- 수정 `src/game/competition.ts`: 기존 능력/성적 계산, 새 후보 비교와 선발 판단. 구형 공식은 persistence 안에 고정한다.
- 수정 `src/game/types.ts`, `engine.ts`, `match.ts`, `src/persistence/save.ts`: v4 스키마·전이·경기·이관 통합.
- 새 `src/ui/RivalryPanel.tsx`; 수정 `GrowthPanels.tsx`, `StatusDialog.tsx`, `MatchScreen.tsx`, `App.tsx`, `styles.css`: 기존 화면 안의 경쟁·관계·기록 표시.

다음 공통 자료형을 Task 2에서 정의하고 이후 작업은 이름을 유지한다.

```ts
type Starter = 'player' | 'junseo' | 'other';
type NamedRivalId = 'taeo' | 'jihwan';
type RivalWeek = {
  key: number; gains: Gains; trustDelta: number;
  sharedPrimary: StatKey | null; source: 'played' | 'migrated';
};
type RivalProgress = { stats: Stats; trust: number; weeks: RivalWeek[] };
type CandidateScore = {
  ability: number; practice: number; performance: number | null;
  readiness: number; readinessSource: 'practice' | 'match'; trust: number; total: number;
};
type CompetitionSnapshot = {
  matchId: string; month: number; week: number;
  player: CandidateScore; junseo: CandidateScore;
  starter: Starter; previous: Starter | null;
  reason: 'lead' | 'incumbent' | 'first_chance' | 'below_threshold';
};
type DuelEntry = {
  half: 0 | 1; order: number; inning: number; opponent: NamedRivalId;
  tactic: string; source: 'manual' | 'auto'; outcome: Outcome;
};
type DuelSummary = { ab: number; hits: number; hr: number; walks: number; k: number; sacrifices: number };
type SchoolRivalry = {
  games: number; wins: number; losses: number;
  stage: 'first' | 'rematch' | 'rival'; lastWon: boolean | null;
  closeLast: boolean; revenge: boolean;
};
```

`Gains`도 기존 타입을 type-only로 참조한다. 게임 문구·주석·문서는 한국어를 기본으로 작성한다.

v4에서는 `GameState.competitor: RivalProgress`, `selectionHistory: CompetitionSnapshot[]`를 추가한다. 기존 숫자 `rival`은 차준서 인연이므로 의미를 바꾸지 않는다. `Match.duels`는 `DuelEntry[] | null`; 새 경기 `[]`, 구형 경기 `null`이다. 기존 evaluation의 다섯 점수/rank 필드는 보존하고 `basis: 'legacy' | 'rival'`, `competition: CompetitionSnapshot | null`을 더한다. 새 평가의 `performance` 필드는 준비도 값이며 UI에는 ‘준비도’라고 표시한다.

### Task 1: 실제 v3 fixture와 검증 규칙 고정

**Files:** Create `src/persistence/v3-schema.ts`, `src/persistence/v3.ts`, `src/persistence/v3.test.ts`, `src/persistence/fixtures/v3-{batter,pitcher}-{start,weekday,event,support-event,selection,match,match-result,weekend,complete}.json`. Modify `src/persistence/v2.ts` only if shared defaults/types must be isolated.

**Interfaces:** `parseV3(raw: string): V3GameState` exported from v3.ts; reads validated v1/v2 via existing frozen parser and v3 directly. It does not return v4 or access storage.

- [x] 1. Before changing current runtime, generate the 18 fixtures by valid `transition` calls in the current v3 app. Capture pending selection/match/result in 4월 and complete in 6월. Check each with current `parseSave`; do not read user browser storage. Keep fixtures as captured rather than rebuilding them from future v4.
- [x] 2. Add a failing test for the new parser: `assert.deepEqual(parseV3(raw), JSON.parse(raw))` for each v3 fixture; `assert.throws` for changed rank, consumed weekday awaiting action, duplicate record and inconsistent bracket. Run `node --experimental-strip-types --test src/persistence/v3.test.ts` and confirm the missing export failure.
- [x] 3. Copy current schema and validation into v3 files, retaining current checks and v1/v2 conversion behavior. Freeze its old evaluateSelection locally. Read-only schedule/support helpers may be shared only with narrow structural inputs and unchanged behavior; avoid importing latest state constructors or new competition behavior. Isolate legacy defaults/snapshot locally where necessary instead of broad casts or ts-ignore.
- [x] 4. Run the new parser tests, `npm test`, `npm run typecheck`; all must pass. Record baseline fixture coverage. Runtime remains v3 at this point.

### Task 2: 차준서 성장과 선발 판단 규칙

**Files:** Create `src/game/rival-types.ts`, `src/content/rivals.ts`, `src/game/rivalry.ts`, `src/game/rivalry.test.ts`; modify `src/game/competition.ts`, `src/game/competition.test.ts`.

**Interfaces:**
- `createCompetitor(role: Role): RivalProgress`.
- `growCompetitor(current: RivalProgress, role: Role, key: number, sharedPrimary: StatKey | null, source: 'played' | 'migrated'): RivalProgress` returns a new progress, same object for an already processed key. Keys must be consecutive 1..16.
- `candidateScore(role: Role, stats: Stats, trust: number, records: GameState['records'] | null): CandidateScore`; null records means NPC practice only.
- `decideStarter(playerTotal: number, rivalTotal: number, previous: Starter | null): {starter: Starter; reason: CompetitionSnapshot['reason']}`.
- `compareCandidates(s: Pick<GameState, 'role' | 'stats' | 'trust' | 'records' | 'month' | 'week'>, competitor: RivalProgress, history: CompetitionSnapshot[], matchId: string): CompetitionSnapshot` excludes current matchId from previous history and performance.

- [x] 1. Write RED assertions: batter start `contact===42`, `power===40`, trust25; pitcher start velocity42/control38; week1 batter power44/trust26; week2 contact46/field39/trust27; repeated key returns unchanged. Add pitcher odd/even growth, stats59/60/79/80/89/90/100 and input immutability checks.
- [x] 2. Write RED assertions for same-week shared growth: combine basic +4 and shared +1 before `trainingGrowth(start, raw, 0)` once; power60 becomes63, not64. With null sharedPrimary only planned growth applies. Ensure migrated history never receives shared growth and growth does not read player stats, RNG or current lineup.
- [x] 3. Write RED selection assertions: `decideStarter(64,64,null).starter==='other'`; `(65,64,null)` player; `(65,65,null)` player; `(65,65,'junseo')` junseo; `(78,76,'junseo')` player; `(72,75,'player')` junseo. If previous starter was other, equal eligible candidates give player first chance. Player appearance remains starter if selected, otherwise substitute at52+, reserve below52.
- [x] 4. Write score tests: ability uses the existing role weights, practice is round((contact+power)/10) or round((control+velocity)/10), readiness is max(practice, actual appearance performance average). Filter match.id=current and reserve before taking last3; include a played zero-hit game. Equal practice/match values use practice as source. NPC performance is null. History containing the current match must not alter tie resolution.
- [x] 5. Run `node --experimental-strip-types --test src/game/rivalry.test.ts src/game/competition.test.ts`; confirm new tests fail, then implement these pure interfaces and definitions with the exact spec initial values. Keep existing v3 evaluateSelection until Task 4 integration.
- [x] 6. Run these tests and `npm run typecheck`; new rules must pass without changing existing game progression.

### Task 3: 실제 개인 맞대결과 학교 관계 계산

**Files:** Modify `src/game/rival-types.ts`, `src/content/rivals.ts`, `src/game/rivalry.ts`, `src/game/rivalry.test.ts`; add `src/game/duels.test.ts`.

**Interfaces:**
- `identifyDuel(role: Role, match: Match, playerTurn: boolean): NamedRivalId | null` uses current pre-outcome half/order/inning; false playerTurn always null.
- `duelEntry(match: Match, opponent: NamedRivalId, tactic: string, source: 'manual' | 'auto', outcome: Outcome): DuelEntry` captures pre-outcome metadata without mutations.
- `summarizeDuels(entries: DuelEntry[]): DuelSummary`; no hits/AB for walks or sacrifices, homer also counts hit.
- `schoolRivalry(records: GameState['records'], excludeMatchId?: string): SchoolRivalry` includes completed haesol games only.
- `schoolDialogue(history: SchoolRivalry, when: 'before' | 'after'): string` and `duelDialogue(role: Role, entries: DuelEntry[] | null): string`; data strings in content/rivals.ts.

- [x] 1. Add failing identity cases: haesol batter6회→taeo,7회→null; pitcher order3 and12→jihwan, order4→null; non-haesol/retired pitcher/non-player turn→null. Ensure reserve has no opponent and substitute respects 7회 entry.
- [x] 2. Add failing summary assertions: single, walk, strikeout, sacrifice, homer → `{ab:3,hits:2,hr:1,walks:1,k:1,sacrifices:1}`. Capture half/order before outcome. A repeated half/order is invalid when later appended/validated.
- [x] 3. Add failing relationship cases for 0/1/2/3 meetings, win-win/loss-loss/win-loss/loss-win, previous loss then win revenge only, score gap1/2 close and3 not close. Current match exclusion must not create premature revenge; other schools do not count. Dialogue must distinguish null details from [] no meeting and never count bench as personal defeat.
- [x] 4. Run the two test files to confirm RED; implement the pure functions. New identities use existing opponent characteristics and add no probability modifier or random draw.
- [x] 5. Run `node --experimental-strip-types --test src/game/rivalry.test.ts src/game/duels.test.ts` and typecheck. At this boundary rules are independently testable; gameplay wiring follows next.

### Task 4: v4 전이·실제 경기·기존 저장 이관 통합

**Files:** Modify `src/game/types.ts`, `engine.ts`, `match.ts`, `competition.ts`, `src/persistence/save.ts`; create `src/persistence/rivalry-migration.test.ts`, `src/persistence/rivalry-validation.ts`; modify `engine.test.ts`, `match.test.ts`, `duels.test.ts`, `competition.test.ts`, `src/persistence/save.test.ts`, `progression.test.ts`, `migration.test.ts`, `src/game/season.test.ts`.

**Interfaces:** `evaluateSelection(s: GameState)` returns extended evaluation. `migrateToV4(raw: string): GameState` in save.ts calls parseV3 before conversion. `validateRivalryState(s: GameState): void` in new `src/persistence/rivalry-validation.ts` owns new invariants. Existing transition, parseSave, loadGame/saveGame API signatures stay unchanged.

- [x] 1. Write failing v4 migration assertions across new v3 and existing v1/v2 fixtures: stats/RNG/skills/bonds/match score/last choice unchanged; version4; current evaluation basis legacy; current and past match.duels null; no invented selectionHistory. v3 complete stays complete; v1/v2 completion retains existing April/May extension. Read-only load makes zero writes.
- [x] 2. Write failing save assertions for backup key `last-summer.backup.v3`, no overwrite when backup write throws, repeated migration deterministic. Existing v1/v2 keys and original raw preservation remain unchanged.
- [x] 3. Add transition tests: createGame has competitor and empty history; valid weekday commits exactly one growth even on rest/failure; only successful partnered baseball weekday training passes primary stat; other actions/repeated revision don't grow NPC. Expose `previewActivity(...).competitorGrowth` with success/failure planned gains so UI reuses the exact rule.
- [x] 4. Add selection tests: snapshot appended once at selection, `evaluation.competition` equals corresponding history, previous excludes same match. Ineligible candidates use other. Replacement appearance derives from the new result and uses existing actual entry rules. March creates no selection history. Legacy selection/ongoing match continue with the old appearance; next unconfirmed evaluation uses rival basis.
- [x] 5. Add actual match regressions: manual and auto capture entry before `applyOutcome`; auto tactic ids are contact/control as currently used. Compare games with tracked [] versus disabled null duels under same seed/actions: scores, personal totals, RNG, highlights and burden must match. Exercise role/appearance combinations, 6→7 inning boundary, 4番 next batter, extra innings and final plate appearance. No actual meeting yields [] and no duplicated current record.
- [x] 6. Run affected tests for RED, then add the v4 fields and integrate rules. Fresh createMatch starts duels[]; when starting an already legacy-evaluated game, set duels null even though match did not exist at migration. `opponent` uses named identity only on tracked games. Track entries only while playerTurn is true; generic team at-bats never add personal entries. No changes to choose/advance highlight limits or sampling.
- [x] 7. Implement migration and validator. Rebuild NPC from count of consumed weekdays with source migrated/sharedPrimary null; newly processed weeks use played. Validate consecutive keys/role stats/trust and replay growth. Legacy snapshots preserve old score/rank; rivalry snapshots require correct arithmetic, histories and prior starter. Validate 52/65-based appearance, unique IDs and current snapshot equality before and after game trust rewards.
- [x] 8. Validate duels: half matches role; entry order < current order; inning range; taeo only batter/haesol/inning≤6, jihwan only pitcher/haesol/order%9===3; unique increasing half/order; supported tactic/source; tracked personal totals bound AB/hits/HR/walks/K/sacrifices by actual record or faced/outs as available. Reject entries for reserve and current-record disagreement. Keep all existing schedule/bracket/baserunner checks.
- [x] 9. Update version assertions and competition tests to the approved rules, preserving old expectations in frozen v3 tests. Shared save helpers take narrow structural inputs if legacy types differ; do not relax old schemas to make fixtures pass. Run `npm test` and `npm run typecheck`; all suites pass before UI work.

### Task 5: 주전 경쟁·재대결 이야기를 기존 화면에 연결

**Files:** Create `src/ui/RivalryPanel.tsx`; modify `src/ui/GrowthPanels.tsx`, `StatusDialog.tsx`, `MatchScreen.tsx`, `src/App.tsx`, `src/content/events.ts`, `src/styles.css`; add rule dialogue tests to rivalry.test.ts.

**Interfaces:** React components `CompetitionComparison({s,detail?})`, `SchoolRivalryPanel({s})`, `DuelRecords({role,match})` in RivalryPanel.tsx. Existing CompetitionPanel delegates comparison display. Formatting is pure and never updates the game.

- [x] 1. Add failing narrative tests for first selection, kept/lost/regained starter. Cases with other starter or no new history must not imply either candidate previously started. Put narrative selection in pure `selectionDialogue(snapshot: CompetitionSnapshot, history: CompetitionSnapshot[]): string` in rivalry.ts; implement then pass tests.
- [x] 2. Show role/ability/readiness source/trust/total comparison, current lead and week changes, exact tie/minimum rules. Legacy current decision says 이전 기준으로 확정 and retains the original score/rank. Include comparison in lineup and status ability view; expose it in mobile gameplay without relying on hidden desktop sidebar.
- [x] 3. Show competitor growth on activity preview with success/failure values, then actual weekly history in status. The player bonus and NPC bonus use separate labels. Leave original support portraits and bond values intact.
- [x] 4. Add school history and named-rival totals to status 시즌; add per-game DuelRecords to 기록. Before haesol games show prior history excluding current ID; after completion show current team score alongside actual duel outcome and record completeness. End screen includes this season's rivalry outcome. Other schools retain existing scouting information.
- [x] 5. Use existing 4월 competition event/selection/match-end areas for dynamic dialogue without new time slots or automatic rewards. Actual duel screen shows correct name and prior completed encounter summary; generic or legacy opponent remains generic. Add no extra modal between actions.
- [x] 6. Run `npm test` and `npm run build`. Inspect visible role names, unknown/none distinctions, numeric labels and threshold messages for contradictions. Keep the existing design responsive with stacked comparisons at mobile width.

### Task 6: 전체 회차·저장·균형 확인과 완료 문서

**Files:** Extend `src/persistence/progression.test.ts`, `src/game/tournament.test.ts`; create `src/game/rivalry-season.test.ts`; update `README.md`, `tesk.md`, `docs/development-log.md`, approved spec status, this execution ledger, `package.json`/`package-lock.json` to0.4.0 after successful implementation.

- [x] 1. Add end-to-end assertions for both roles × training/balanced/study across seeds1..20: complete16weeks/allweekends, per-phase parse equality, sixteen competitor weeks, at most5 new selection snapshots, actual3 haesol results, no duplicate duels, player growth log totals unchanged. Existing tournament win/loss coverage remains tested, without requiring old seeds to keep the same win result when appearances legitimately change.
- [x] 2. Collect starter/substitute/reserve counts, relative score gaps and changes between player/junseo/other for these runs. Report whether deliberate recovery/training can overtake after a loss of place. Do not silently adjust approved weights to force equal win rates; distinguish functional failure from balance feedback.
- [x] 3. Run `npm test` and `npm run build` after final fixes/version update; record actual test totals and warnings. Obtain an independent final code review as required by the selected execution skill, examine findings and add focused regressions for real defects.
- [x] 4. Browser-play both roles in separate test origins through haesol first meeting, rematch and summer matchup. Inspect actual role assignment, rival growth preview, team loss with positive personal outcome when observed, no-meeting/legacy cases, selection/match/result reload, mobile390px and keyboard focus. Do not inject hidden browser state to manufacture successes. Use deterministic test cases for branches not observed naturally.
- [x] 5. Update README current behavior and backup format, tesk completed checklist and development log with actual evidence and balance limitations. Verify local Markdown links. Refresh the user's127.0.0.1:4173 preview read-only, preserve player phase and open panel, and inspect errors. Do not advance their game or overwrite their save.

## Execution ledger and handoff

- 2026-09-30: 사용자 ‘ㄱㄱ’로 설계 검토와 구현 계획 작성 승인. 기존 코드·테스트·구형 저장 연결을 읽고 이 계획을 작성했다. 아직 구현에 착수하지 않았다.
- 추천 실행 방식: **이 작업에서 직접 순차 구현 후 마지막 독립 리뷰**. 공유 상태와 저장 검증의 변경이 서로 밀접해 한 구현자가 Task1–6을 이어서 처리하는 편이 적합하다.
- 대안: 단계별 구현 에이전트와 검토 에이전트로 진행. 단계마다 독립 검토를 받지만 문맥 전달과 검토 비용이 늘어난다.
- 셀프 리뷰: 설계1–9절을 Tasks1–6에 대응시켰다. Review Focus 다섯 항목의 테스트 위치를 명시했고, 구형 확정 평가/개인 기록 없음/중복 타석/동점 이력/공동 성장 합산의 구체적인 처리를 계획에 포함했다.

- 실행 완료: 사용자가 직접 순차 구현 방식을 승인했다. Tasks 1–6 complete. v3 실제 fixture18개와 검증기/기본값 고정, 경쟁·맞대결 규칙, v4 전이·이관·검증, 화면과 문서까지 구현했다. 규칙·이관 및 최종 리뷰 회귀는 RED→GREEN을 확인했다. 일부 대사 검사는 구현 이후 추가했으므로 해당 검사의 선행 RED를 주장하지 않는다.
- Ruling: 최초 커밋과 .git 쓰기가 없는 승인된 작업 폴더에서 진행하며 실행 기록은 이 문서에 보존한다. 임시 브리프/커밋 스크립트 대신 파일과 실제 테스트 결과를 기록한다. 원본 시안은 건드리지 않는다.
- Ruling: 공동 훈련 성장도 주간 기본 성장에 합산한 뒤 능력 구간 배율을 한 번 적용한다. 고능력 구간의 반올림 중복을 방지하며 계획의 power60 +5 → +3 기준을 따른다.
- Ruling: 전술 공부는 기존 인연 보너스에서도 주력 야구 능력이 있는 안전한 야구 활동이다. 실패 없는 공동 성장 대상으로 유지한다. 설계의 학업 제외는 학교 공부를 가리킨다. 리뷰와 함께 이 해석을 확인했다.
- 최종 독립 리뷰: 성장·선발·맞대결·저장 핵심 흐름을 확인했고 두 표시 문제를 보고했다. 홈런/희생번트 요약 누락과 주말 개인 연습 후 평일 준서 성장 재표시를 회귀 검사 후 한 수정 단계에서 해결했다. 전술 공부 공동 성장은 위 Ruling으로 유지했고, 전체 선수단·추가 확률 보정은 범위 밖이다.
- 자동 검증: `npm test` 90/90 통과, `npm run build` 타입·프로덕션 빌드 통과. 기존 Zod PURE 주석 경고2건. 120시즌 모든 단계 저장 왕복, 구형 진행16개 시즌 완료, 실제 v3 fixture18개, 추적 유무48경기의 동일 결과를 검사했다.
- 균형 확인: 일정한 훈련/균형 경로는 선발 유지, 학업은3월 이후 교체 경향. 학업(3~4월)→훈련(5~6월) 전환20시드에서 선발 탈환 타자12/20·투수11/20. 강제로 선발 교체를 만들기 위한 수치 변경은 하지 않았다.
- 브라우저: localhost의 별도 타자/투수 회차를16주 완주. 세 차례 해솔고전, 타자4월 대타→5월 선발, 투수구원→선발, 실제 직접/요약 타석, 미대결 구분, 결과·명단·완료 재개, 모바일390px·키보드 검사. 런타임 error/warn0건. 모바일 결과에서도 개인 기록을 표시하도록 보완했다.
- 최종 사용자 미리보기: 사용자는 검증 중 기존 회차를6월 완료까지 진행했다. 새로고침 직전의 최신 상태(123·투수·준우승·혼합형·6경기·26 1/3이닝·11K·1BB·8실점)를 기준으로 읽기만 수행했다. 동일 완료 상태와 기록을 유지했고, 과거 해솔고3전은 세부 기록 없음으로 표시했다. 기존의4월 상태로 되돌리지 않았다.
- 완료 문서: README·tesk·상세 설계·개발 기록 갱신, 패키지0.4.0. 실행 폴더에서 구현했으며 커밋·머지·공개 배포는 수행하지 않았다.
