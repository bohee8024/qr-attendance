// 로컬 스토리지 키
const STORAGE_KEYS = {
    CURRENT_SESSION: 'currentSession',
    ATTENDANCE: 'attendanceRecords',
    SESSIONS: 'sessions'
};

let html5QrCode = null;
let isScanning = false;
let scannedSessionId = null;
let scannedSessionName = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 이벤트 리스너 등록
    document.getElementById('startScan').addEventListener('click', startQRScanner);
    document.getElementById('stopScan').addEventListener('click', stopQRScanner);
    document.getElementById('submitCode').addEventListener('click', submitManualCode);
    document.getElementById('backToStep1').addEventListener('click', goToStep1);
    document.getElementById('submitAttendance').addEventListener('click', submitAttendance);
    document.getElementById('resetProcess').addEventListener('click', resetProcess);

    // 이전에 저장된 이름 불러오기
    const savedName = localStorage.getItem('employeeName');
    const savedId = localStorage.getItem('employeeId');
    if (savedName) document.getElementById('employeeName').value = savedName;
    if (savedId) document.getElementById('employeeId').value = savedId;
});

// 단계 1: QR 스캐너 시작
function startQRScanner() {
    if (isScanning) {
        showError('이미 스캔이 진행 중입니다.');
        return;
    }

    document.getElementById('qrReader').style.display = 'block';
    document.getElementById('startScan').style.display = 'none';

    html5QrCode = new Html5Qrcode("reader");

    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 }
    };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanError
    ).then(() => {
        isScanning = true;
    }).catch(err => {
        console.error('카메라 시작 실패:', err);
        showError('카메라를 시작할 수 없습니다. 카메라 권한을 확인해주세요.');
        document.getElementById('qrReader').style.display = 'none';
        document.getElementById('startScan').style.display = 'inline-block';
    });
}

// QR 스캐너 중지
function stopQRScanner() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
            isScanning = false;
            document.getElementById('qrReader').style.display = 'none';
            document.getElementById('startScan').style.display = 'inline-block';
        }).catch(err => {
            console.error('스캔 중지 실패:', err);
        });
    }
}

// QR 코드 스캔 성공
function onScanSuccess(decodedText, decodedResult) {
    console.log('QR 코드 스캔 성공:', decodedText);
    stopQRScanner();
    validateAndProceed(decodedText);
}

// QR 코드 스캔 에러 (무시)
function onScanError(errorMessage) {
    // 스캔 중 발생하는 일반적인 에러는 무시
}

// 수동 코드 입력
function submitManualCode() {
    const code = document.getElementById('manualCode').value.trim();
    if (!code) {
        showError('코드를 입력해주세요.');
        return;
    }
    validateAndProceed(code);
}

// QR 코드 유효성 검사 및 다음 단계로 진행
function validateAndProceed(sessionId) {
    hideError();

    // 현재 세션 확인
    const currentSessionStr = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);

    if (!currentSessionStr) {
        showError('현재 진행 중인 출석 세션이 없습니다. 관리자에게 문의하세요.');
        return;
    }

    const currentSession = JSON.parse(currentSessionStr);

    // 세션 ID 확인
    if (currentSession.id !== sessionId) {
        showError('유효하지 않은 QR 코드입니다. 최신 QR 코드를 스캔해주세요.');
        return;
    }

    // 세션 정보 저장
    scannedSessionId = sessionId;
    scannedSessionName = currentSession.name;

    // 단계 2로 이동
    goToStep2();
}

// 단계 1로 이동
function goToStep1() {
    document.getElementById('step1').style.display = 'block';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'none';
    document.getElementById('manualCode').value = '';
    hideError();
}

// 단계 2로 이동
function goToStep2() {
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
    document.getElementById('step3').style.display = 'none';
    document.getElementById('scannedSession').textContent = scannedSessionName;
    hideError();
}

// 단계 3으로 이동
function goToStep3(name) {
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'block';
    document.getElementById('completionMessage').textContent =
        `${name}님의 출석이 완료되었습니다. (${scannedSessionName})`;
    hideError();
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
        name: name,
        employeeId: employeeId || '-',
        timestamp: new Date().toISOString(),
        isNew: true  // 새 출석 표시 (알림용)
    };

    records.push(attendanceRecord);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));

    // 단계 3으로 이동 (완료)
    goToStep3(name);
}

// 프로세스 리셋
function resetProcess() {
    scannedSessionId = null;
    scannedSessionName = null;
    document.getElementById('manualCode').value = '';
    goToStep1();
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
    document.getElementById('errorMessage').style.display = 'none';
}
