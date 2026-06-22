# 오늘길 (OneulGil) MCP

> 빠르게 갈 땐 최단 행동, 여유 있을 땐 좋은 길.

오늘길은 KakaoTalk 안에서 사용자가 **다음에 무엇을 해야 하는지** 바로 결정하도록 돕는 PlayMCP용 원격 MCP 서버입니다. 지도 앱이 아니라, 빠른 이동/좋은 길 선택을 짧고 실행 가능한 한국어 답변으로 제공합니다.

## 제공 MCP 도구

서버가 외부에 노출하는 도구는 정확히 3개입니다.

1. `save_user_places` — 집, 회사, 자주 가는 장소 저장
2. `get_fastest_route_action` — 최단/빠른 길/도착 마감/늦음 회복/교통 비교
3. `get_good_route` — 낭만, 카페, 산책, 혼밥, 분위기, 돌아가는 길

`resolveIntent`, `fillFromProfile`, `askClarification`, provider 비교 로직은 내부 모듈이며 MCP 도구로 노출하지 않습니다.

## 현재 MVP 범위

- TypeScript + Node.js
- `@modelcontextprotocol/sdk` Streamable HTTP remote MCP
- `/health` 헬스 체크
- Mock route/place providers 우선 동작
- 도보 접근 시간에 횡단보도 대기 시간을 포함한 현실 소요시간 안내
- 인메모리 프로필 저장소
- 모든 사용자 응답 한국어
- 출발지가 없으면 현재 위치를 추측하지 않고 출발지만 질문
- 개인 주소는 평문 로그로 남기지 않음

## 설치

```bash
npm install
cp .env.example .env
```

## 실행

```bash
npm run dev
```

기본 포트는 `3000`입니다.

```bash
curl http://localhost:3000/health
```

## 빌드 및 실행

```bash
npm run build
npm start
```

## 로컬 데모 테스트

아래 스크립트는 mock provider demo, 핵심 assertion, HTTP/CORS protocol smoke test를 확인합니다.

```bash
npm run test:demo
npm run test:assertions
npm run test:protocol
npm run test:all
```

확인 시나리오:

1. 집=`신림역 근처`, 회사=`강남역 근처` 저장
2. `퇴근` → 지하철/버스/택시 비교와 최종 행동
3. `강남역 빨리` → 출발지만 질문
4. `퇴근 낭만` → 카페/산책 우회 추천
5. `약속 늦었어` → 목적지만 질문


## Docker/Koyeb 배포

Docker 기반 배포가 필요하면 포함된 `Dockerfile`을 사용할 수 있습니다. Koyeb buildpack 배포는 아래 Koyeb Free 설정을 그대로 쓰면 됩니다.

## Koyeb Free 배포

돈이 들지 않는 데모 배포는 Koyeb Free Web Service를 권장합니다.

- Build command: `npm install && npm run build`
- Run command: `npm start`
- Health check path: `/health`
- PlayMCP 등록 URL: `https://<koyeb-app>.koyeb.app/mcp`

자세한 배포 순서는 [`docs/koyeb-deploy.md`](docs/koyeb-deploy.md)를 참고하세요.
PlayMCP 등록/시연 체크리스트는 [`docs/playmcp-registration.md`](docs/playmcp-registration.md)를 참고하세요.

## PlayMCP 등록 메모

- Remote MCP URL: `https://<배포도메인>/mcp`
- Health check: `https://<배포도메인>/health`
- Tool selection guide:
  - 빠른 길, 최단, 늦음, 도착 마감, 출근/퇴근 기본 질의는 `get_fastest_route_action`
  - 낭만, 카페, 산책, 혼밥, 분위기, 돌아가는 길은 `get_good_route`
  - 집/회사/별칭 저장은 `save_user_places`
- PlayMCP가 세션 metadata나 `currentLocation`을 명시적으로 제공할 때만 그 값을 tool input의 `origin` 또는 `currentLocation`으로 전달하세요. 제공되지 않으면 오늘길은 자동 GPS를 가정하지 않습니다.

## 향후 실제 API 연동

`src/providers/types.ts`의 인터페이스를 구현하면 provider 교체가 가능합니다.

- Kakao Local provider: 장소명/주소 해석용으로 선택 연동
- TMAP Transit 또는 ODsay provider: 대중교통 실시간 경로용으로 선택 연동

Mock provider가 기본이며, API 키가 없어도 MVP는 동작합니다. API 키는 `.env`에만 두고 저장소에 커밋하지 마세요.
