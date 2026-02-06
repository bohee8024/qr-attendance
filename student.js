// 로컬 스토리지 키
const STORAGE_KEYS = {
    CURRENT_SESSION: 'currentSession',
    ATTENDANCE: 'attendanceRecords',
    SESSIONS: 'sessions'
};

let scannedSessionId = null;
let scannedSessionName = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 이벤트 리스너 등록
    document.getElementById('backToHome').addEventListener('click', goBackToHome);
    document.getElementById('submitAttendance').addEventListener('click', submitAttendance);

    // URL 파라미터 확인
    checkUrlParameters();
});

// URL 파라미터 확인 및 처리
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    const sessionName = urlParams.get('name');

    if (sessionId && sessionName) {
        // URL에서 세션 정보를 받음 - 바로 출석 입력 단계로
        scannedSessionId = sessionId;
        scannedSessionName = decodeURIComponent(sessionName);

        document.getElementById('scannedSession').textContent = scannedSessionName;
        goToStep1();
    } else {
        // URL 파라미터 없음 - 에러 표시
        showInvalidAccess();
    }
}

// 잘못된 접근 표시
function showInvalidAccess() {
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('invalidAccess').style.display = 'block';
}

// 단계 1: 정보 입력
function goToStep1() {
    document.getElementById('step1').style.display = 'block';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('invalidAccess').style.display = 'none';
    hideError();
}

// 단계 2: 완료
function goToStep2(name) {
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
    document.getElementById('completionMessage').textContent =
        `${name}님의 출석이 완료되었습니다.`;
    document.getElementById('completionSession').textContent = scannedSessionName;
    hideError();
}

// 홈으로 돌아가기
function goBackToHome() {
    window.location.href = 'index.html';
}

// 출석 제출
function submitAttendance() {
    const name = document.getElementById('employeeName').value.trim();
    const employeeId = document.getElementById('employeeId').value.trim();

    if (!name) {
        showError('이름을 입력해주세요.');
        return;
    }

    // 이름/사번 저장 (다음 사용을 위해)
    localStorage.setItem('employeeName', name);
    if (employeeId) {
        localStorage.setItem('employeeId', employeeId);
    }

    // 중복 출석 확인
    const records = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]');
    const duplicate = records.find(r =>
        r.sessionId === scannedSessionId &&
        r.name === name &&
        (employeeId ? r.employeeId === employeeId : true)
    );

    if (duplicate) {
        showError('이미 출석 체크를 완료했습니다.');
        return;
    }

    // 출석 기록 추가
    const attendanceRecord = {
        sessionId: scannedSessionId,
        sessionName: scannedSessionName,
        name: name,
        employeeId: employeeId || '-',
        timestamp: new Date().toISOString(),
        isNew: true  // 새 출석 표시 (알림용)
    };

    records.push(attendanceRecord);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));

    // 단계 2로 이동 (완료)
    goToStep2(name);
}

// 에러 메시지 표시
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    // 5초 후 자동 숨김
    setTimeout(() => {
        hideError();
    }, 5000);
}

// 에러 메시지 숨기기
function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}
