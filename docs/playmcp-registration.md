# PlayMCP 최종 등록/시연 체크리스트

오늘길은 `/mcp` 하나만 PlayMCP에 등록하면 됩니다. `/health`는 배포 상태 확인용입니다.

## 1. 배포 전 로컬 최종 검증

```bash
npm install
npm run test:all
```

`test:all`은 아래 순서로 실행됩니다.

1. TypeScript build
2. behavior assertions
3. HTTP/MCP protocol smoke test
4. demo scenario 출력

성공 기준:

- `npm run build` 통과
- assertion suite 통과
- MCP initialize → initialized notification → tools/list → tools/call 통과
- demo output이 한국어로 출력

## 2. Koyeb 배포 설정

- Branch: 배포할 최신 브랜치
- Build command: `npm install && npm run build`
- Run command: `npm start`
- Health check path: `/health`

선택 환경변수:

```text
PORT=<Koyeb 자동 주입>
PROFILE_STORE_PATH=./data/profiles.json
KAKAO_REST_API_KEY=<선택: Kakao Local/Mobility 사용 시>
```

API 키가 없어도 mock provider fallback으로 동작해야 합니다.

## 3. 배포 후 health check

```bash
curl https://<app>.koyeb.app/health
```

기대 응답 형태:

```json
{
  "ok": true,
  "service": "oneulgil-mcp",
  "version": "0.2.0",
  "tools": [
    "save_user_places",
    "get_fastest_route_action",
    "get_good_route"
  ]
}
```

## 4. PlayMCP 등록

등록 URL:

```text
https://<app>.koyeb.app/mcp
```

PlayMCP에 노출되어야 하는 도구는 정확히 3개입니다.

- `save_user_places`
- `get_fastest_route_action`
- `get_good_route`

노출되면 안 되는 내부 로직:

- `resolveIntent`
- `fillFromProfile`
- `askClarification`
- provider 비교 함수

## 5. 최종 시연 스크립트

아래 순서대로 실행하면 저장 → 빠른 길 → 방어 질문 → 좋은 길 → 날씨/횡단보도 디테일 → 목적지 방어가 모두 보입니다.

```text
집은 신림역 근처고 회사는 강남역 근처야
퇴근
강남역 빨리
퇴근 낭만
비 오는데 퇴근
약속 늦었어
약속 전에 혼밥
```

## 6. 심사위원에게 보일 핵심 포인트

- 지도 앱이 아니라 “지금 할 행동”을 결정하는 MCP
- 빠른 길은 결론 → 이동 행동 → 놓쳤을 때 대안으로 답변
- 좋은 길은 카페/산책/혼밥 같은 mood route로 답변
- 횡단보도 대기시간을 포함해 실제 체감 시간을 더 현실적으로 안내
- 위치를 추측하지 않고 출발지/목적지가 없으면 하나만 짧게 질문
- mock-first 구조라 외부 API 장애와 무관하게 항상 한국어 응답
