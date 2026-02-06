// 전역 변수
let qrCodeInstance = null;
let currentSessionId = null;
let currentSessionName = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 이벤트 리스너 등록
    document.getElementById('generateQR').addEventListener('click', generateQRCode);
    document.getElementById('endSession').addEventListener('click', endSession);
    document.getElementById('sessionFilter').addEventListener('change', filterAttendance);
    document.getElementById('clearData').addEventListener('click', clearAllData);
    document.getElementById('downloadCSV').addEventListener('click', downloadCSV);

    // 세션 목록 로드
    loadSessions();

    // 진행 중인 세션 로드
    loadActiveSessions();

    // 실시간 출석 데이터 리스닝
    listenToAttendance();

    // 브라우저 알림 권한 요청
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
});

// 출석 페이지 URL 생성
function getAttendanceUrl(sessionId, sessionName) {
    const baseUrl = window.location.href.replace('admin.html', 'student.html');
    const url = new URL(baseUrl);
    url.searchParams.set('session', sessionId);
    url.searchParams.set('name', sessionName);
    return url.toString();
}

// QR 코드 생성
async function generateQRCode() {
    const sessionName = document.getElementById('sessionName').value.trim();

    if (!sessionName) {
        alert('출석 세션 이름을 입력해주세요.');
        return;
    }

    // 세션 ID 생성
    const sessionId = Date.now() + '-' + Math.random().toString(36).substring(2, 11);

    try {
        // Firebase에 세션 저장
        await database.ref('sessions/' + sessionId).set({
            id: sessionId,
            name: sessionName,
            startTime: new Date().toISOString(),
            active: true
        });

        // 현재 세션 정보 저장
        currentSessionId = sessionId;
        currentSessionName = sessionName;

        // QR 코드 표시 영역 초기화
        const qrDisplay = document.getElementById('qrDisplay');
        const qrcodeDiv = document.getElementById('qrcode');
        qrcodeDiv.innerHTML = '';

        // 출석 페이지 URL 생성
        const attendanceUrl = getAttendanceUrl(sessionId, sessionName);

        // QR 코드 생성
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

        // 세션 목록 새로고침
        loadSessions();

        alert('QR 코드가 생성되었습니다! 직원들에게 이 QR 코드를 스캔하도록 안내하세요.');

    } catch (error) {
        console.error('세션 생성 실패:', error);
        alert('세션 생성에 실패했습니다. 다시 시도해주세요.');
    }
}

// 세션 종료
async function endSession() {
    if (!currentSessionId) {
        alert('활성 세션이 없습니다.');
        return;
    }

    const confirmEnd = confirm('현재 세션을 종료하시겠습니까?');
    if (!confirmEnd) return;

    try {
        await database.ref('sessions/' + currentSessionId).update({
            active: false,
            endTime: new Date().toISOString()
        });

        document.getElementById('qrDisplay').style.display = 'none';
        currentSessionId = null;
        currentSessionName = null;

        alert('세션이 종료되었습니다.');

    } catch (error) {
        console.error('세션 종료 실패:', error);
        alert('세션 종료에 실패했습니다.');
    }
}

// 세션 목록 로드
function loadSessions() {
    const sessionsRef = database.ref('sessions');
    sessionsRef.once('value', (snapshot) => {
        const sessions = snapshot.val();
        const select = document.getElementById('sessionFilter');

        // 기존 옵션 제거 (전체 세션 제외)
        while (select.options.length > 1) {
            select.remove(1);
        }

        if (sessions) {
            // 세션을 시간 역순으로 정렬
            const sortedSessions = Object.values(sessions).sort((a, b) =>
                new Date(b.startTime) - new Date(a.startTime)
            );

            sortedSessions.forEach(session => {
                const option = document.createElement('option');
                option.value = session.id;
                option.textContent = session.name + (session.active ? ' (진행중)' : '');
                select.appendChild(option);
            });
        }
    });
}

// 진행 중인 세션 로드
function loadActiveSessions() {
    const sessionsRef = database.ref('sessions');
    sessionsRef.on('value', (snapshot) => {
        const sessions = snapshot.val();
        const section = document.getElementById('activeSessionsSection');
        const list = document.getElementById('activeSessionsList');

        if (!sessions) {
            section.style.display = 'none';
            return;
        }

        // 진행 중인 세션만 필터링
        const activeSessions = Object.values(sessions).filter(s => s.active);

        if (activeSessions.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        list.innerHTML = activeSessions.map(session => {
            const startTime = new Date(session.startTime).toLocaleString('ko-KR');
            const escapedName = session.name.replace(/'/g, "\\'").replace(/"/g, "&quot;");
            return `
                <div class="active-session-item" onclick="showQRForSession('${session.id}', '${escapedName}')">
                    <div class="session-name">${session.name}</div>
                    <div class="session-time">시작: ${startTime}</div>
                    <button class="btn btn-primary btn-small">QR 코드 보기</button>
                </div>
            `;
        }).join('');
    });
}

// 특정 세션의 QR 코드 표시
function showQRForSession(sessionId, sessionName) {
    currentSessionId = sessionId;
    currentSessionName = sessionName;

    const qrDisplay = document.getElementById('qrDisplay');
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = '';

    const attendanceUrl = getAttendanceUrl(sessionId, sessionName);

    qrCodeInstance = new QRCode(qrcodeDiv, {
        text: attendanceUrl,
        width: 256,
        height: 256,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L
    });

    document.getElementById('currentSession').textContent = sessionName;
    qrDisplay.style.display = 'block';

    // QR 코드가 보이도록 스크롤
    qrDisplay.scrollIntoView({ behavior: 'smooth' });
}

// 실시간 출석 데이터 리스닝
function listenToAttendance() {
    const attendanceRef = database.ref('attendance');

    // 새 출석 데이터 감지
    attendanceRef.on('child_added', (snapshot) => {
        const record = snapshot.val();

        // 알림 표시
        showNotification(record);

        // 출석 명단 새로고침
        const filterValue = document.getElementById('sessionFilter').value;
        loadAttendanceList(filterValue);
    });

    // 초기 데이터 로드
    loadAttendanceList('all');
}

// 알림 표시
function showNotification(record) {
    const notificationSection = document.getElementById('notificationSection');
    const notificationList = document.getElementById('notificationList');

    notificationSection.style.display = 'block';

    const time = new Date(record.timestamp).toLocaleTimeString('ko-KR');
    const checkTypeText = record.checkType === 'out' ? '퇴실' : '출석';

    const parkingText = record.hasParking ? '주차 O' : '주차 X';

    const notificationItem = document.createElement('div');
    notificationItem.className = 'notification-item new';
    notificationItem.innerHTML = `
        <div class="notification-content">
            <strong>${record.name}</strong>님이 ${checkTypeText}했습니다! (${parkingText})
            <span class="notification-meta">${record.sessionName} · ${time}</span>
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
        new Notification(`${checkTypeText} 알림`, {
            body: `${record.name}님이 ${checkTypeText}했습니다! (${parkingText}, ${record.sessionName})`,
            icon: '👔'
        });
    }
}

// 출석 명단 로드
function loadAttendanceList(filterSessionId = 'all') {
    const attendanceRef = database.ref('attendance');
    const listDiv = document.getElementById('attendanceList');

    attendanceRef.once('value', (snapshot) => {
        const records = snapshot.val();

        if (!records) {
            listDiv.innerHTML = '<p class="empty-message">출석 기록이 없습니다.</p>';
            return;
        }

        // 배열로 변환
        let recordsArray = Object.values(records);

        // 필터링
        if (filterSessionId !== 'all') {
            recordsArray = recordsArray.filter(r => r.sessionId === filterSessionId);
        }

        if (recordsArray.length === 0) {
            listDiv.innerHTML = '<p class="empty-message">출석 기록이 없습니다.</p>';
            return;
        }

        // 최신 순으로 정렬
        recordsArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // 출석 목록 생성
        listDiv.innerHTML = recordsArray.map(record => {
            const time = new Date(record.timestamp).toLocaleString('ko-KR');
            const checkTypeText = record.checkType === 'out' ? '퇴실' : '출석';
            const checkTypeClass = record.checkType === 'out' ? 'check-out' : 'check-in';
            const parkingText = record.hasParking ? '주차 O' : '주차 X';

            return `
                <div class="attendance-item">
                    <div class="employee-info">
                        <div class="name">${record.name}</div>
                        <div class="id">${parkingText}</div>
                    </div>
                    <div class="attendance-badges">
                        <span class="check-type-badge ${checkTypeClass}">${checkTypeText}</span>
                        <span class="session-badge">${record.sessionName}</span>
                        <span class="time-badge">${time}</span>
                    </div>
                </div>
            `;
        }).join('');
    });
}

// 출석 필터링
function filterAttendance() {
    const filterValue = document.getElementById('sessionFilter').value;
    loadAttendanceList(filterValue);
}

// 전체 데이터 삭제
async function clearAllData() {
    const confirmClear = confirm('모든 출석 데이터와 세션 정보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    if (!confirmClear) return;

    const confirmAgain = confirm('정말로 삭제하시겠습니까?');
    if (!confirmAgain) return;

    try {
        await database.ref('attendance').remove();
        await database.ref('sessions').remove();

        document.getElementById('qrDisplay').style.display = 'none';
        document.getElementById('notificationSection').style.display = 'none';
        document.getElementById('notificationList').innerHTML = '';

        currentSessionId = null;
        currentSessionName = null;

        loadAttendanceList();
        loadSessions();

        alert('모든 데이터가 삭제되었습니다.');

    } catch (error) {
        console.error('데이터 삭제 실패:', error);
        alert('데이터 삭제에 실패했습니다.');
    }
}

// CSV 다운로드
async function downloadCSV() {
    try {
        const filterValue = document.getElementById('sessionFilter').value;
        const attendanceRef = database.ref('attendance');
        const snapshot = await attendanceRef.once('value');
        const records = snapshot.val();

        if (!records) {
            alert('다운로드할 데이터가 없습니다.');
            return;
        }

        let recordsArray = Object.values(records);

        // 필터링 적용
        if (filterValue !== 'all') {
            recordsArray = recordsArray.filter(r => r.sessionId === filterValue);
        }

        if (recordsArray.length === 0) {
            alert('다운로드할 데이터가 없습니다.');
            return;
        }

        // 시간순 정렬
        recordsArray.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // CSV 헤더
        const headers = ['세션명', '이름', '구분', '주차여부', '시간'];

        // CSV 데이터 생성
        const csvRows = [headers.join(',')];

        recordsArray.forEach(record => {
            const time = new Date(record.timestamp).toLocaleString('ko-KR');
            const checkTypeText = record.checkType === 'out' ? '퇴실' : '출석';
            const parkingText = record.hasParking ? 'O' : 'X';
            const row = [
                `"${record.sessionName}"`,
                `"${record.name}"`,
                `"${checkTypeText}"`,
                `"${parkingText}"`,
                `"${time}"`
            ];
            csvRows.push(row.join(','));
        });

        // CSV 파일 생성 및 다운로드
        const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM 추가 (한글 깨짐 방지)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `출석데이터_${new Date().toLocaleDateString('ko-KR')}.csv`;
        link.click();

        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('CSV 다운로드 실패:', error);
        alert('CSV 다운로드에 실패했습니다.');
    }
}
