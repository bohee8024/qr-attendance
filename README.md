# QR 출석 체크 시스템

## 로컬에서 실행하기

### 방법 1: Python 서버 (추천)

```bash
# qr-attendance 폴더에서 실행
python -m http.server 8000
```

그 다음 브라우저에서 `http://localhost:8000` 접속

같은 Wi-Fi에 있는 다른 기기에서는:
- Windows: `ipconfig` 명령으로 IP 주소 확인
- `http://[내IP주소]:8000` 으로 접속 (예: http://192.168.0.10:8000)

### 방법 2: Node.js 서버

```bash
# npx 사용 (Node.js 설치 필요)
npx http-server -p 8000
```

### 방법 3: VS Code Live Server 확장

1. VS Code에서 "Live Server" 확장 설치
2. index.html 우클릭 → "Open with Live Server"

---

## 인터넷에 배포하기

### GitHub Pages (무료, 추천)

1. GitHub 계정 생성 및 저장소 생성
2. 파일 업로드
3. Settings → Pages → Source: main branch 선택
4. 배포된 URL로 접속 가능 (예: https://username.github.io/qr-attendance)

### Netlify (무료, 가장 쉬움)

1. https://www.netlify.com 접속
2. "Add new site" → "Deploy manually"
3. qr-attendance 폴더를 드래그 앤 드롭
4. 자동으로 URL 생성 (예: https://random-name-123.netlify.app)

### Vercel (무료)

1. https://vercel.com 접속
2. GitHub 연동 또는 수동 배포
3. 자동으로 URL 생성

---

## 주의사항

- 카메라 접근은 **HTTPS 환경**에서만 작동합니다
- 로컬 서버(http://localhost)는 예외적으로 허용됩니다
- GitHub Pages, Netlify, Vercel은 자동으로 HTTPS를 제공합니다
