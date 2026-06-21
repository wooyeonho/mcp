# Koyeb Free 배포 가이드

오늘길 MCP 서버는 DB 없이 Node.js/Express로 실행되므로 Koyeb Free Web Service에 바로 올릴 수 있습니다.

## 권장 설정

- Deployment method: GitHub repository
- Builder: Node.js buildpack
- Instance: Free web service
- Build command: `npm install && npm run build`
- Run command: `npm start`
- Port: Koyeb가 주입하는 `PORT` 환경변수 사용
- Health check path: `/health`

## 배포 순서

1. Koyeb 대시보드에서 **Create Web Service**를 선택합니다.
2. GitHub repository로 `wooyeonho/mcp` 또는 fork한 repository를 연결합니다.
3. Branch는 배포 대상 branch를 선택합니다.
4. Build command를 입력합니다.

   ```bash
   npm install && npm run build
   ```

5. Run command를 입력합니다.

   ```bash
   npm start
   ```

6. HTTP health check path를 `/health`로 설정합니다.
7. 배포가 끝나면 아래 주소를 확인합니다.

   ```bash
   curl https://<koyeb-app>.koyeb.app/health
   ```

8. PlayMCP에는 아래 URL을 등록합니다.

   ```text
   https://<koyeb-app>.koyeb.app/mcp
   ```

## PlayMCP 등록 전 최종 확인

`/health` 응답에 아래 3개 도구가 보여야 합니다.

- `save_user_places`
- `get_fastest_route_action`
- `get_good_route`

## 무료 배포 주의사항

- Free instance는 성능이 낮을 수 있으므로 시연 직전에 `/health`를 한 번 호출해 상태를 확인하세요.
- 서버는 인메모리 프로필 저장소를 사용합니다. 인스턴스가 재시작되면 저장된 집/회사 정보는 초기화될 수 있습니다.
- API 키는 아직 필요 없습니다. 향후 Kakao Local, TMAP, ODsay를 연결할 때만 Koyeb Secrets에 저장하세요.
