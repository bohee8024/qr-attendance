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

    // 세션 목록 로드
    loadSessions();

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

    const notificationItem = document.createElement('div');
    notificationItem.className = 'notification-item new';
    notificationItem.innerHTML = `
        <div class="notification-content">
            <strong>${record.name}</strong>님이 출석했습니다!
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
        new Notification('출석 알림', {
            body: `${record.name}님이 출석했습니다! (${record.sessionName})`,
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

            return `
                <div class="attendance-item">
                    <div class="employee-info">
                        <div class="name">${record.name}</div>
                        <div class="id">사번: ${record.employeeId || '-'}</div>
                    </div>
                    <div>
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
