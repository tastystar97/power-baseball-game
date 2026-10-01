# 외부 카드팩 제작 규격 — summer-7

현재 게임과 제작기는 같은 [Zod 규격](../../src/cards/schema.ts)과 [참조 검증기](../../src/cards/pack.ts)를 사용한다. [JSON Schema](cardpack.schema.json)는 구조와 수치 검사용이며 역할·참조·순환·이미지 검사는 별도로 필요하다. [예제 JSON](example.cardpack.json)을 제작기에서 열어 수정하거나 직접 게임에 가져올 수 있다.

## 사용하기

1. 게임과 같은 주소의 `/card-editor/`에서 예제를 연다. 인물·훈련·스킬·사건·그림을 편집하고 **카드팩 검사**를 실행한다.
2. **전체 팩 내보내기** 또는 **현재 카드 내보내기**로 `.cardpack`을 만든다.
3. 게임 첫 화면 → 카드 라이브러리 → 가져오기 → 미리 보기 → 등록. 새 선수의 덱에 넣으면 적용된다.
4. 수정판은 ID를 유지하고 개정 `revision`을 올린다. 별도 배포할 단일 카드는 다른 팩 ID를 사용한다. 게임의 수정판 등록은 팩 전체를 교체한다.

## 파일 구성

```text
my-team.cardpack  (ZIP)
├─ manifest.json
├─ content.json
└─ assets/
   └─ portrait.png
```

`manifest.json`은 `format`, `version`, `ruleset`, `id`, `revision`, `name`, `author`, `description`, `images`를 가진다. `images`는 파일명→MIME의 사전이다. `content.json`은 `cards`, `skills`, `events`만 가진다. assets의 모든 파일을 images에 등록하고 카드의 portrait에는 파일명만 넣는다.

```json
{
  "format": "last-summer-cardpack",
  "version": 1,
  "ruleset": "summer-7",
  "id": "my-team",
  "revision": 1,
  "name": "나의 서포트 팩",
  "author": "제작자",
  "description": "새로운 야구 파트너",
  "images": {"portrait.png": "image/png"}
}
```

단일 JSON은 위 팩 정보에 cards/skills/events를 더하고 `images` 값을 `{ "portrait.png": { "mime": "image/png", "data": "base64..." } }`로 바꾼 전체 CardPack이다. 그림이 없으면 `images: {}`로 두고 portrait를 생략한다. `$schema` 등 스키마에 없는 필드를 파일에 추가하지 않는다.

## ID와 관계

- 팩 ID는 영문 소문자로 시작하며 소문자·숫자·밑줄·하이픈, 3~64자다. `core`는 예약되어 있다.
- 내부 카드·스킬·사건 ID도 같은 문자 집합이며 최대 150자, `/`는 금지한다. 게임에서는 팩 ID를 앞에 붙인다. 다른 팩을 참조하지 않는다.
- 카드의 `hints`·`ultimates`는 batter/pitcher별 ID 또는 null이다. 상위의 prerequisite는 같은 계열의 일반 스킬, owner는 해당 카드다.
- 사건 owner는 카드 ID, previous는 같은 카드의 성장 사건이다. 순환과 인연 역전은 거부한다. 선택지는 정확히 2개다.
- 상위 스킬에는 양쪽 선택지에서 그 상위를 개방하는 성장 사건이 있어야 한다. 일상 사건에서는 상위를 개방하지 않는다.
- 사건의 hints/unlocks는 해당 카드에 연결된 일반/상위만 참조한다. 양 역할에 연결된 보상 중 실제 선수 역할에 맞는 것만 받는다.
- 능력 요구는 타자 contact/power/eye/speed/field/mental, 투수 velocity/control/breaking/stamina/field/mental, 공통 field/mental을 사용한다. 실제 능력은 기반+숙련에서 계산한다.
- 스킬 conditions는 AND, effects는 순서대로 적용한다. 같은 계열에서 상위를 배우면 일반 효과는 적용하지 않는다. 스킬 발동률은 지능 규칙을 따른다.

## 크기와 저장

ZIP 20MiB, 압축 전 각 파일 2MiB, 전체 25MiB, 최대 102파일. 그림 PNG/JPEG/WebP 1개 2MiB·총20MiB·100개. 단일 JSON은 2MiB다. 팩/통합 라이브러리는 카드100·스킬240·사건1,000 한도이며 라이브러리는 기본 팩을 포함해 검사한다. 큰 콘텐츠는 다른 팩 ID로 나눈다. ZIP에는 위에 정한 파일만 담는다.

검증 오류는 등록 전에 보여 주고 일부만 적용하지 않는다. 라이브러리 수정·삭제는 새 육성에 적용하며 진행 중 선수의 카드 정의·그림은 보존한다. 파일에는 플레이 저장·개인 기록을 넣지 않는다. 실행 코드·HTML·외부 이미지 URL을 지원하지 않는다.

Node.js에서 개발할 때는 `validatePack(value)`, `encodePack(pack)`, `decodePack(bytes)`, `subsetPack(pack, ids)`를 사용할 수 있다. 게임 버전이 바뀌면 ruleset 호환 여부를 확인한다. 이 문서는 규격 v1 / summer-7 기준이다.
