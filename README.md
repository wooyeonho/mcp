# 오늘길 (OneulGil) MCP

> 오늘길은 길을 보여주지 않습니다.
> 오늘길은 **지금 해야 할 행동**을 골라줍니다.

KakaoTalk 안에서 사용자가 다음에 무엇을 해야 하는지 바로 결정하도록 돕는 PlayMCP용 원격 MCP 서버입니다.

지도 앱처럼 경로를 그리지 않습니다. 대신 항상 이 세 가지를 답합니다:

1. **결론** — 지금 뭘 하세요
2. **지금 할 행동** — 구체적 스텝 ①②③
3. **놓쳤을 때 대안** — 다음 수

## 제공 MCP 도구

서버가 외부에 노출하는 도구는 정확히 3개입니다.

| 도구 | 설명 | 대표 질의 |
|------|------|-----------|
| `save_user_places` | 집, 회사, 자주 가는 장소 저장 | "집은 신림역 근처, 회사는 강남역 근처야" |
| `get_fastest_route_action` | 최단 행동, 도착 마감, 늦음 회복, 교통 비교, 날씨 대응 | "퇴근", "비 오는데 퇴근", "약속 늦었어" |
| `get_good_route` | 낭만, 카페, 산책, 혼밥, 분위기, 돌아가는 길 | "퇴근 낭만", "집 가는 길 카페", "20분만 산책" |

## v0.3.0 신규 기능

| 기능 | 설명 |
|------|------|
| **Kakao Local API** | `KAKAO_REST_API_KEY` 설정 시 경로상 실제 장소 검색 (카페·맛집·좌표) |
| **Kakao Mobility API** | `KAKAO_REST_API_KEY` 설정 시 실제 택시 경로·요금 조회 |
| **실시간 날씨 감지** | Open-Meteo 무료 API — API 키 불필요, 서울 현재 날씨 자동 반영 |
| **카카오맵 딥링크** | 모든 응답에 `카카오맵 길찾기` / `카카오T 택시` 링크 포함 |
| **안정적인 유저 ID** | `x-kakao-user-id` 헤더 지원 — 세션 재연결 시에도 프로필 유지 |
| **서울 경로 목 확장** | 강남↔신림, 여의도↔강남, 잠실, 성수/건대, 공항 등 추가 |

## 아키텍처: Mock-first + Optional Enhancement

```
지하철 · 버스  → Mock provider (항상 동작, fallback 보장)
택시 · 자동차  → Kakao Mobility API (차량 경로·요금 보강, 키 없으면 mock)
장소 검색     → Kakao Local API (좌표·카테고리 검색, 키 없으면 내장 데이터)
날씨 context  → Open-Meteo (실시간, 키 불필요, 실패 시 조용히 skip)
```

**Kakao Mobility는 자동차/택시 경로 API입니다.** 지하철·버스 실시간 API가 아닙니다.  
대중교통은 mock-based 경로를 사용하며, 실제 API 장애와 무관하게 항상 한국어 응답을 반환합니다.

## 카카오 API 연동

### 한 개의 키로 모든 기능

`KAKAO_REST_API_KEY` 하나로 세 가지 기능이 활성화됩니다:

```bash
KAKAO_REST_API_KEY=your_kakao_rest_api_key
```

| 기능 | API | 엔드포인트 | 없으면 |
|------|-----|-----------|--------|
| 장소 검색 | Kakao Local | `dapi.kakao.com/v2/local/search/keyword.json` | 내장 좌표 테이블 |
| 좌표 조회 | Kakao Local | 장소명 → 위도/경도 변환 | 주요 50개 역 내장 |
| 택시 경로·요금 | Kakao Mobility Directions | `apis-navi.kakaomobility.com/v1/directions` | mock 택시 데이터 |

키가 없어도 데모 13개 시나리오 전부 동작합니다.

### Open-Meteo (키 불필요, 실패 시 조용히 skip)

서울 실시간 날씨를 자동 감지합니다. 사용자가 "비 오는데"를 말하지 않아도 오늘길이 먼저 알려줍니다.  
API 실패 · 타임아웃 시 아무 말 없이 날씨 없는 응답을 반환합니다 (MCP 응답이 깨지지 않음).

```
https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=precipitation,rain,snowfall
```

## v0.2.0 기능 (유지)

| 기능 | 설명 |
|------|------|
| 날씨 context | "비 오는데 퇴근" → 도보 +2분, 택시 대기 경고, 실내 추천 |
| 긴급도 감지 | "늦었어", "급해" → 택시 우선 전환 + 카카오T 안내 |
| 도착 마감 | "3시까지 강남역" → 남은 시간 계산, 빠듯하면 택시 권유 |
| 최근 목적지 | "약속 늦었어" → 이전 경로의 목적지 자동 활용 |
| CORS 지원 | PlayMCP 및 웹 기반 MCP 클라이언트 호환 |
| 세분화 에러 | origin/destination/network 에러별 다른 안내 |

## 답변 스타일

모든 답변은 "옆에서 말해주는 비서" 톤입니다.

**빠른 길 예시:**
```
지금 바로 강남역 쪽으로 걸어가세요.
5분 안에 도착하면 19:08 도착 가능합니다.

지금 할 행동:
① 강남역까지 걸어가기 (보통 5분 / 빠른 걸음 4분)
② 2호선 신림 방면 탑승
③ 신림역 하차 → 도보 6분

비교:
- 지하철: 38분, 1,550원
- 버스(146번): 47분, 1,500원
- 택시: 32분, 약 18,000원

놓치면:
다음 열차 4~6분 뒤 출발합니다. 2호선 배차가 짧으니 걱정 마세요.

카카오 바로 이동:
- 카카오맵 길찾기: https://map.kakao.com/link/to/신림역,37.4844,126.9294
- 카카오T 택시: https://t.kakao.com/
```

**비 오는 날 예시 (자동 감지):**
```
현재 서울 날씨: 비 오는 중입니다.

비 오는 날입니다. 도보 시간 +2분, 택시 대기 길어질 수 있습니다.

지금 바로 강남역 쪽으로 걸어가세요.
...
```

**늦었을 때 예시:**
```
늦었습니다. 지금 바로 택시 타세요.
강남역 2번 출구에서 잡으면 32분, 약 18,000원입니다.

카카오 바로 이동:
- 카카오맵 길찾기: https://map.kakao.com/link/to/신림역,37.4844,126.9294
- 카카오T 택시: https://t.kakao.com/
```

## 오늘길의 차별점

오늘길은 다른 길찾기 MCP와 다릅니다:

- **지도를 그리지 않습니다** — 결론 한 문장, 행동 스텝, 대안. 끝.
- **도구 3개만 노출합니다** — 모델이 헷갈리지 않습니다.
- **한국어 전용입니다** — 카카오톡 사용자를 위해 설계되었습니다.
- **카카오 API만 씁니다** — Kakao Local + Kakao Mobility, T Map 없음.
- **날씨를 실시간으로 읽습니다** — 말 안 해도 오늘길이 먼저 알려줍니다.
- **카카오 딥링크를 줍니다** — 카카오맵, 카카오T 링크가 답변 안에 있습니다.
- **긴급도를 판단합니다** — 늦었으면 택시, 빠듯하면 빠른 걸음, 여유 있으면 카페.
- **대화를 기억합니다** — 최근 목적지를 자동 활용합니다.

## 데모 시나리오 (13개)

```bash
npm run test:demo
```

| # | 시나리오 | 도구 | 기대 동작 |
|---|----------|------|-----------|
| 1 | 집/회사 저장 | `save_user_places` | 프로필 저장 확인 |
| 2 | 출근 | `get_fastest_route_action` | 신림→강남 비교+행동+딥링크 |
| 3 | 퇴근 | `get_fastest_route_action` | 강남→신림 비교+행동+딥링크 |
| 4 | 퇴근 낭만 | `get_good_route` | 카페 우회 추천+딥링크 |
| 5 | 회사에서 홍대입구 빨리 | `get_fastest_route_action` | 강남→홍대 비교+행동 |
| 6 | 강남역 빨리 | `get_fastest_route_action` | 출발지 질문 (clarification) |
| 7 | 집 가는 길 카페 | `get_good_route` | 강남→신림 카페 우회 |
| 8 | 퇴근 20분만 산책길 | `get_good_route` | 산책 코스 추천 |
| 9 | 약속 늦었어 | `get_fastest_route_action` | 최근 목적지 자동 활용 + 택시 우선 |
| 10 | 약속 전에 혼밥 | `get_good_route` | 강남→홍대 식당 추천 |
| 11 | 비 오는데 퇴근 | `get_fastest_route_action` | 날씨 경고 + 도보 시간 보정 |
| 12 | 비 오는 날 퇴근 낭만 | `get_good_route` | 실내 위주 추천 |
| 13 | 약속 늦었어 (목적지 모름) | `get_fastest_route_action` | 목적지 질문 (clarification) |

## Mock 지원 경로

| 출발 | 도착 | 특징 |
|------|------|------|
| 강남역 | 신림역 | 2호선/146번/택시 비교, 카페/산책/혼밥 우회 |
| 신림역 | 강남역 | 출근 시나리오, 테이크아웃 카페 |
| 강남역 | 홍대입구/합정 | 2호선 내선순환, 합정 카페/혼밥 우회 |
| 여의도 | 강남 | 9호선 급행, 한강공원 산책 코스 |
| 아무 곳 | 잠실 | 2호선, 석촌호수 코스 |
| 아무 곳 | 성수/건대 | 성수동 카페거리 코스 |
| 아무 곳 | 서울역 | 1/4호선, KTX 연계 |
| 아무 곳 | 공항 | 인천/김포 공항리무진·철도·택시 |
| 아무 곳 | 병원 | 병원 예약 시나리오, 산책 정리 코스 |
| fallback | fallback | 모든 미지원 경로에 합리적 기본값 |

## 설치 및 실행

```bash
npm install
cp .env.example .env
# KAKAO_REST_API_KEY 입력 (선택 — 없어도 동작)
npm run dev
```

Health check:
```bash
curl http://localhost:3000/health
```

## 빌드 및 실행

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t oneulgil-mcp .
docker run -p 3000:3000 -e KAKAO_REST_API_KEY=your_key oneulgil-mcp
```

## PlayMCP 등록

| 항목 | 값 |
|------|-----|
| Remote MCP URL | `https://<배포도메인>/mcp` |
| Health check | `https://<배포도메인>/health` |
| 사용자 ID 헤더 | `x-kakao-user-id` (PlayMCP에서 자동 전송 시 프로필 영속) |

Tool 선택 가이드:
- 빠른 길, 최단, 늦음, 도착 마감, 출근/퇴근, 비 오는 날 → `get_fastest_route_action`
- 낭만, 카페, 산책, 혼밥, 분위기, 돌아가는 길 → `get_good_route`
- 집/회사/별칭 저장 → `save_user_places`

## Koyeb Free 배포

[상세 배포 가이드](docs/koyeb-deploy.md)

| 항목 | 값 |
|------|-----|
| Build command | `npm install && npm run build` |
| Run command | `npm start` |
| Port | `3000` |
| Health check path | `/health` |
| 환경변수 | `KAKAO_REST_API_KEY` |
