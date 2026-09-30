# Summer Season Implementation Plan

> **For agentic workers:** Use the existing session to implement task by task; apply TDD and verification-before-completion. A final independent review checks the completed change.

**Goal:** 훈련으로 스타일을 만들며 3~6월 16주와 첫 여름 대회를 완주한다.
**Architecture:** 기존 순수 상태 전이를 유지하고 시즌/대진 규칙과 훈련 성장 규칙을 작은 모듈로 분리한다. 기존 저장 검증기를 고정하여 v3으로 이관한다.
**Tech Stack:** 기존 React 19 / TypeScript 5.9 / Vite 7 / Zod 4 / node:test.
**Spec:** ../specs/2026-09-30-summer-season.md

## Global Constraints

- 한국어, 타자/투수, 주간+주말, 월별 편성, 야구 중심 유지.
- 기존 사용자 저장·프로토타입 보존. 추가 의존성·외부 배포 없음.
- 저장 v3, v1/v2 검증 후 이관. 과거 성장과 경기 결과 소급 변경 없음.
- 저장소는 최초 커밋이 없는 상태이며 .git 쓰기가 제한되어 있으므로 현재 작업 폴더에서 수정하고 커밋/워크트리 단계는 수행하지 않는다.

## Review Focus

1. 탈락 후에도 다음 주와 6월 마지막 주말까지 진행할 수 있어야 한다.
2. 4월 완료·진행 중 경기 등 실제 v2 저장을 그대로 이어갈 수 있어야 한다.
3. 같은 달의 여러 경기 기록·제목·상대가 서로 섞이지 않아야 한다.
4. 특화 스킬은 표시뿐 아니라 수동/요약 경기 확률과 투구 부담에 적용되어야 한다.
5. 높은 능력·높은 스트레스·여러 파트너에서도 미리 보기와 실제 보상이 같아야 한다.

## Tasks

- [x] 1. 기존 v2 시작/경기/평가/완료 fixture를 보관하고 v3 이관과 16주 진행의 실패 테스트를 만든다. Files: src/game/season.test.ts, src/persistence/fixtures/v2-*.json.
- [x] 2. 성장 곡선·특화 스킬 조건·스타일 표시 자료를 구현한다. Files: src/game/training.ts, src/content/skills.ts, src/game/types.ts, src/game/engine.ts, src/game/match.ts. Tests: 특화 조건 경계, 중복/역할 거부, 확률·투구 부담, 성장 59/60/79/80/89/90/100.
- [x] 3. 시즌 일정·8팀 대진·상대 효과와 상태 전이를 구현한다. Files: src/content/teams.ts, src/game/season.ts, src/game/engine.ts, src/game/competition.ts, src/content/events.ts. Interfaces: matchPlan(s) -> {id,month,week,title,opponentId}|null; pairings(s,round); finishRound(s); trainingGrowth(value,raw,stress); skillRequirements(s,id). Tests: 8강/4강/결승 승패·탈락·주말·결정성.
- [x] 4. v1/v2 검증 고정 및 v3 저장 검사·백업을 구현한다. Files: src/persistence/v2-schema.ts, v2.ts, save.ts. Tests: fixtures 이관, 각 단계 왕복, 중복/불가능한 대진과 경기 거부. 전체 npm test 및 npm run typecheck.
- [x] 5. 성장 방향·잠긴 스킬·시즌 일정·대진·종료·누적 기록 UI를 연결한다. Files: src/ui/SeasonPanel.tsx, GrowthPanels.tsx, StatusDialog.tsx, MatchScreen.tsx, common.tsx, App.tsx, styles.css. 기존 경기 제목/상대/날짜 하드코딩을 공통 일정 자료로 바꾼다.
- [x] 6. 전체 테스트·빌드 후 별도 검증 origin에서 실제 진행, 모바일/키보드/새로고침 확인. 변경 내용을 독립 검토하고 발견 문제를 재현 테스트로 수정한다.
- [x] 7. README/tesk/설계/개발 로그에 실제 구현과 검증 결과를 기록하고 사용자 미리보기를 갱신한다.

## Verification commands

`node --experimental-strip-types --test src/game/season.test.ts` → 새 규칙의 첫 실패 확인, 구현 후 통과.
`npm test` → 전체 테스트 실패 0.
`npm run build` → 타입 검사와 빌드 종료 코드0.

## Execution ledger

- 시작: 승인된 훈련형 육성과 여름 대회까지의 범위를 위 수치/일정으로 구체화. 코드·저장 구조 확인 완료.

- Tasks 1–5: 기존 v2 fixture 8개 보관. 시즌/특화 테스트 5개의 실제 실패 후 구현. 대진·이관·구간별 성장·특화 효과·UI 연결 완료. 초기 전체 71/71, 타입 검사와 빌드 통과.
- 독립 검토: summer_review가 실제 파일과 50시즌/5,170개 상태를 점검. 진행 중단·저장 재개 실패 없음. 대회 전 달력 탈락 표시, 필수 선행 스킬과 특화 효과 표기 불일치, 5월 사건 인물 그림 불일치 발견.
- 수정: 첫 두 건을 재현하는 테스트 2개 RED→GREEN. 미정 라운드는 진출 시로 안내. 효율적인 투구는 선행 제구 스킬과 함께 실제로 제공 가능한 볼넷 1%p 감소로 수치와 설명을 통일했다. 사건 그림은 사건 화자에 맞춘다.
- Task 6: 최종 73/73 테스트·타입 검사·프로덕션 빌드 성공. 신규 타자는 16주·혼합형·결승 준우승, 구형 투수는 이관·제구형·8강 탈락 후 마지막 주말과 타 학교 결승까지 브라우저에서 완료. 경기 및 시즌 완료의 새로고침·재개, 390px 모바일·키보드·오류 로그 점검 완료. 실제 기록은 개발 로그에 보존했다.
- Task 7: README/tesk/설계/개발 로그를 현재 3~6월 범위로 갱신. 사용자 미리보기의 4월 4주 투수·출전 평가 74점·체력 72·스트레스 9 및 모든 능력이 새 버전에서도 같음을 확인하고 열린 능력 상태창을 복원했다. 게임 행동을 실행하거나 저장 원문을 덮어쓰지 않았다. 갱신된 미리보기 error/warn 0건.
