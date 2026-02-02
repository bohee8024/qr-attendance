// 로컬 스토리지 키
const STORAGE_KEYS = {
    CURRENT_SESSION: 'currentSession',
    ATTENDANCE: 'attendanceRecords',
    SESSIONS: 'sessions'
};

let qrCodeInstance = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadAttendanceList();
    loadSessionFilter();
    checkActiveSession();

    // 이벤트 리스너 등록
    document.getElementById('generateQR').addEventListener('click', generateQRCode);
    document.getElementById('endSession').addEventListener('click', endSession);
    document.getElementById('sessionFilter').addEventListener('change', filterAttendance);
    document.getElementById('clearData').addEventListener('click', clearAllData);
});

// QR 코드 생성
function generateQRCode() {
    const sessionName = document.getElementById('sessionName').value.trim();

    if (!sessionName) {
        alert('출석 세션 이름을 입력해주세요.');
        return;
    }

    // 현재 활성 세션 확인
    const currentSession = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    if (currentSession) {
        const confirmEnd = confirm('이미 진행 중인 세션이 있습니다. 이전 세션을 종료하고 새로운 세션을 시작하시겠습니까?');
        if (!confirmEnd) return;
    }

    // 세션 ID 생성 (타임스탬프 + 랜덤)
    const sessionId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    // 세션 정보 저장
    const sessionData = {
        id: sessionId,
        name: sessionName,
        startTime: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(sessionData));

    // 세션 목록에 추가
    addSessionToList(sessionData);

    // QR 코드 표시 영역 초기화
    const qrDisplay = document.getElementById('qrDisplay');
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = '';

    // QR 코드 생성
    qrCodeInstance = new QRCode(qrcodeDiv, {
        text: sessionId,
        width: 256,
        height: 256,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });

    // 세션 정보 표시
    document.getElementById('currentSession').textContent = sessionName;
    qrDisplay.style.display = 'block';

    // 입력 필드 초기화
    document.getElementById('sessionName').value = '';

    alert('QR 코드가 생성되었습니다!');
}

// 세션 종료
function endSession() {
    const confirmEnd = confirm('현재 세션을 종료하시겠습니까?');
    if (!confirmEnd) return;

    localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
    document.getElementById('qrDisplay').style.display = 'none';

    alert('세션이 종료되었습니다.');
}

// 활성 세션 확인
function checkActiveSession() {
    const currentSession = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    if (currentSession) {
        const sessionData = JSON.parse(currentSession);

        // QR 코드 재생성
        const qrcodeDiv = document.getElementById('qrcode');
        qrcodeDiv.innerHTML = '';

        qrCodeInstance = new QRCode(qrcodeDiv, {
            text: sessionData.id,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });

        document.getElementById('currentSession').textContent = sessionData.name;
        document.getElementById('qrDisplay').style.display = 'block';
    }
}

// 세션 목록에 추가
function addSessionToList(sessionData) {
    let sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '[]');

    // 중복 체크
    if (!sessions.find(s => s.id === sessionData.id)) {
        sessions.push(sessionData);
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
        loadSessionFilter();
    }
}

// 세션 필터 로드
function loadSessionFilter() {
    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '[]');
    const select = document.getElementById('sessionFilter');

    // 기존 옵션 제거 (전체 세션 제외)
    while (select.options.length > 1) {
        select.remove(1);
    }

    // 세션 옵션 추가
    sessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session.id;
        option.textContent = session.name;
        select.appendChild(option);
    });
}

// 출석 명단 로드
function loadAttendanceList(filterSessionId = 'all') {
    const records = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]');
    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '[]');
    const listDiv = document.getElementById('attendanceList');

    // 필터링
    const filteredRecords = filterSessionId === 'all'
        ? records
        : records.filter(r => r.sessionId === filterSessionId);

    if (filteredRecords.length === 0) {
        listDiv.innerHTML = '<p class="empty-message">출석 기록이 없습니다.</p>';
        return;
    }

    // 최신 순으로 정렬
    filteredRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 출석 목록 생성
    listDiv.innerHTML = filteredRecords.map(record => {
        const session = sessions.find(s => s.id === record.sessionId);
        const sessionName = session ? session.name : '알 수 없는 세션';
        const time = new Date(record.timestamp).toLocaleString('ko-KR');

        return `
            <div class="attendance-item">
                <div class="student-info">
                    <div class="name">${record.name}</div>
                    <div class="id">학번: ${record.studentId}</div>
                </div>
                <div>
                    <span class="session-badge">${sessionName}</span>
                    <span class="time-badge">${time}</span>
                </div>
            </div>
        `;
    }).join('');
}

// 출석 필터링
function filterAttendance() {
    const filterValue = document.getElementById('sessionFilter').value;
    loadAttendanceList(filterValue);
}

// 전체 데이터 삭제
function clearAllData() {
    const confirmClear = confirm('모든 출석 데이터와 세션 정보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    if (!confirmClear) return;

    const confirmAgain = confirm('정말로 삭제하시겠습니까?');
    if (!confirmAgain) return;

    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);

    document.getElementById('qrDisplay').style.display = 'none';
    loadAttendanceList();
    loadSessionFilter();

    alert('모든 데이터가 삭제되었습니다.');
}
