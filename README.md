# 테크무진 타임테이블

테크무진 행사 일정을 확인하고, 선택한 세션을 로그인 없이 브라우저 `localStorage`에 저장하는 React 웹앱입니다.

현재 타임테이블은 아래 API를 한 개 트랙 일정으로 해석해 표시합니다.

```text
https://timetable.t-funabiki08.workers.dev/v1/events/techmujin-2026/timetable
```

응답은 Zod로 검증한 뒤 화면에 필요한 형식으로 변환합니다.

## 실행

```bash
pnpm install
pnpm dev
```

타입 검사와 배포용 빌드:

```bash
pnpm typecheck
pnpm build
```

## 다국어 설정

기본값은 일본어 전용입니다. JP/EN/KR 언어 선택기를 활성화하려면 `.env.local` 또는 배포 서비스의 환경변수에 다음 값을 설정합니다.

```env
VITE_ENABLE_I18N=true
```

환경변수가 없거나 `false`이면 일본어만 표시됩니다. Vite 환경변수는 빌드 시점에 반영되므로 값을 변경한 뒤 다시 빌드하거나 배포해야 합니다.

## 디자인 시스템과 색상

조작 버튼은 SEED Design을 사용하고 타임테이블은 커스텀 CSS로 구성합니다. 현재는 SEED의 당근 기본 색상을 사용합니다. 테크무진 색상이 확정되면 `src/theme.css`에서 `TODO(TECHMUJIN-COLOR)`로 표시한 `--tm-color-*` 값만 수정하면 됩니다.

## 일정 저장

사용자가 고른 일정은 세션 객체가 아닌 세션 ID만 아래 키에 저장됩니다.

```text
techmujin:timetable:v3
```

브라우저나 기기가 바뀌면 선택한 일정은 동기화되지 않습니다.
