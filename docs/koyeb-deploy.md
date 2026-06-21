# Koyeb Free 배포 가이드

## 1. Koyeb 가입 및 앱 생성

1. [Koyeb](https://www.koyeb.com/) 가입 (GitHub 연동)
2. Create App → GitHub 선택 → `wooyeonho/mcp` 리포 연결
3. Builder: **Buildpack** (Node.js 자동 감지) 또는 **Dockerfile** 선택

## 2. 환경 설정

| 항목 | 값 |
|------|-----|
| Build command | `npm install && npm run build` |
| Run command | `npm start` |
| Port | `3000` |
| Health check path | `/health` |
| Instance type | Free (nano) |

환경변수 (선택):
```
PORT=3000
NODE_ENV=production
```

## 3. Dockerfile 배포 (권장)

Dockerfile이 프로젝트 루트에 포함되어 있습니다. Koyeb에서 Dockerfile builder를 선택하면 자동으로 빌드됩니다.

```dockerfile
# 멀티스테이지 빌드 — 프로덕션 이미지 ~60MB
FROM node:20-slim AS builder
...
FROM node:20-slim
...
CMD ["node", "dist/index.js"]
```

## 4. 배포 후 확인

```bash
# Health check
curl https://<app-name>.koyeb.app/health

# 기대 응답:
# {"ok":true,"service":"oneulgil-mcp","version":"0.2.0","tools":["save_user_places","get_fastest_route_action","get_good_route"],"features":["weather_context","urgency_detection","recent_destination","fixture_routing"]}
```

## 5. PlayMCP 등록

- Remote MCP URL: `https://<app-name>.koyeb.app/mcp`
- 프로토콜: Streamable HTTP (JSON-RPC)
- 세션 관리: `mcp-session-id` 헤더 자동 처리

## 6. 무료 플랜 주의사항

- Free nano 인스턴스는 비활성 시 슬립됩니다 (cold start ~10초)
- 첫 요청 시 약간의 지연이 있을 수 있습니다
- 월 사용량 제한이 있으므로 contest 기간에만 활성화 권장
- 커스텀 도메인은 유료 플랜에서 가능

## 7. 트러블슈팅

| 증상 | 해결 |
|------|------|
| Health check 실패 | PORT 환경변수 확인, `/health` 경로 확인 |
| Build 실패 | `npm run build` 로컬에서 먼저 확인 |
| MCP 연결 안 됨 | CORS 헤더 확인, `POST /mcp` 엔드포인트 확인 |
| Cold start 느림 | 배포 전 한 번 health check 호출로 워밍업 |
