// 로컬 스토리지 키
const STORAGE_KEYS = {
    CURRENT_SESSION: 'currentSession',
    ATTENDANCE: 'attendanceRecords',
    SESSIONS: 'sessions'
};

let qrCodeInstance = null;
let lastAttendanceCount = 0;
let notificationSound = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadAttendanceList();
    loadSessionFilter();
    checkActiveSession();
    initNotificationSystem();

    // 이벤트 리스너 등록
    document.getElementById('generateQR').addEventListener('click', generateQRCode);
    document.getElementById('endSession').addEventListener('click', endSession);
    document.getElementById('sessionFilter').addEventListener('change', filterAttendance);
    document.getElementById('clearData').addEventListener('click', clearAllData);
});

// 알림 시스템 초기화
function initNotificationSystem() {
    // 현재 출석 수 저장
    const records = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]');
    lastAttendanceCount = records.length;

    // 2초마다 새 출석 확인
    setInterval(checkNewAttendance, 2000);

    // storage 이벤트 리스너 (다른 탭에서 변경 시)
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEYS.ATTENDANCE) {
            checkNewAttendance();
            loadAttendanceList(document.getElementById('sessionFilter').value);
        }
    });
}

// 새 출석 확인
function checkNewAttendance() {
    const records = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]');

    if (records.length > lastAttendanceCount) {
        // 새 출석자 찾기
        const newRecords = records.filter(r => r.isNew);

        newRecords.forEach(record => {
            showNotification(record);
            // isNew 플래그 제거
            record.isNew = false;
        });

        // 업데이트된 레코드 저장
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));

        // 출석 명단 새로고침
        loadAttendanceList(document.getElementById('sessionFilter').value);
    }

    lastAttendanceCount = records.length;
}

// 알림 표시
function showNotification(record) {
    const notificationSection = document.getElementById('notificationSection');
    const notificationList = document.getElementById('notificationList');

    notificationSection.style.display = 'block';

    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '[]');
    const session = sessions.find(s => s.id === record.sessionId);
    const sessionName = session ? session.name : '알 수 없는 세션';
    const time = new Date(record.timestamp).toLocaleTimeString('ko-KR');

    const notificationItem = document.createElement('div');
    notificationItem.className = 'notification-item new';
    notificationItem.innerHTML = `
        <div class="notification-content">
            <strong>${record.name}</strong>님이 출석했습니다!
            <span class="notification-meta">${sessionName} · ${time}</span>
        </div>
    `;

    // 맨 위에 추가
    notificationList.insertBefore(notificationItem, notificationList.firstChild);

    // 애니메이션 후 하이라이트 제거
    setTimeout(() => {
        notificationItem.classList.remove('new');
    }, 3000);

    // 최대 10개 알림만 유지
    while (notificationList.children.length > 10) {
        notificationList.removeChild(notificationList.lastChild);
    }

    // 브라우저 알림
    if (Notification.permission === 'granted') {
        new Notification('출석 알림', {
            body: `${record.name}님이 출석했습니다! (${sessionName})`,
            icon: '👔'
        });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

// 출석 페이지 URL 생성
function getAttendanceUrl(sessionId, sessionName) {
    // 현재 페이지 URL을 기반으로 출석 페이지 URL 생성
    const baseUrl = window.location.href.replace('admin.html', 'student.html');
    const url = new URL(baseUrl);
    url.searchParams.set('session', sessionId);
    url.searchParams.set('name', sessionName);
    return url.toString();
}

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
    const sessionId = Date.now() + '-' + Math.random().toString(36).substring(2, 11);

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

    // 출석 페이지 URL 생성
    const attendanceUrl = getAttendanceUrl(sessionId, sessionName);

    // QR 코드 생성 (URL 포함)
    qrCodeInstance = new QRCode(qrcodeDiv, {
        text: attendanceUrl,
        width: 256,
        height: 256,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L
    });

    // 세션 정보 표시
    document.getElementById('currentSession').textContent = sessionName;
    qrDisplay.style.display = 'block';

    // 입력 필드 초기화
    document.getElementById('sessionName').value = '';

    // 브라우저 알림 권한 요청
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }

    alert('QR 코드가 생성되었습니다! 직원들에게 이 QR 코드를 스캔하도록 안내하세요.');
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

        // 출석 페이지 URL 생성
        const attendanceUrl = getAttendanceUrl(sessionData.id, sessionData.name);

        qrCodeInstance = new QRCode(qrcodeDiv, {
            text: attendanceUrl,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.L
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
                <div class="employee-info">
                    <div class="name">${record.name}</div>
                    <div class="id">사번: ${record.employeeId || '-'}</div>
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
    document.getElementById('notificationSection').style.display = 'none';
    document.getElementById('notificationList').innerHTML = '';
    loadAttendanceList();
    loadSessionFilter();

    alert('모든 데이터가 삭제되었습니다.');
}
