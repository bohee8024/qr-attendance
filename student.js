// 로컬 스토리지 키
const STORAGE_KEYS = {
    CURRENT_SESSION: 'currentSession',
    ATTENDANCE: 'attendanceRecords',
    SESSIONS: 'sessions'
};

let html5QrCode = null;
let isScanning = false;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 이벤트 리스너 등록
    document.getElementById('startScan').addEventListener('click', startQRScanner);
    document.getElementById('stopScan').addEventListener('click', stopQRScanner);
    document.getElementById('submitAttendance').addEventListener('click', submitManualAttendance);

    // 로컬 스토리지에서 이름/학번 불러오기
    const savedName = localStorage.getItem('studentName');
    const savedId = localStorage.getItem('studentId');
    if (savedName) document.getElementById('studentName').value = savedName;
    if (savedId) document.getElementById('studentId').value = savedId;
});

// QR 스캐너 시작
function startQRScanner() {
    const name = document.getElementById('studentName').value.trim();
    const studentId = document.getElementById('studentId').value.trim();

    if (!name || !studentId) {
        showResult('이름과 학번을 입력해주세요.', 'error');
        return;
    }

    // 이름/학번 저장
    localStorage.setItem('studentName', name);
    localStorage.setItem('studentId', studentId);

    if (isScanning) {
        showResult('이미 스캔이 진행 중입니다.', 'error');
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
        showResult('카메라를 시작할 수 없습니다. 카메라 권한을 확인해주세요.', 'error');
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

    // 스캐너 중지
    stopQRScanner();

    // 출석 처리
    processAttendance(decodedText);
}

// QR 코드 스캔 에러 (무시)
function onScanError(errorMessage) {
    // 스캔 중 발생하는 일반적인 에러는 무시
}

// 수동 출석 제출
function submitManualAttendance() {
    const name = document.getElementById('studentName').value.trim();
    const studentId = document.getElementById('studentId').value.trim();
    const qrCode = document.getElementById('qrCode').value.trim();

    if (!name || !studentId) {
        showResult('이름과 학번을 입력해주세요.', 'error');
        return;
    }

    if (!qrCode) {
        showResult('QR 코드 값을 입력해주세요.', 'error');
        return;
    }

    // 이름/학번 저장
    localStorage.setItem('studentName', name);
    localStorage.setItem('studentId', studentId);

    // 출석 처리
    processAttendance(qrCode);
}

// 출석 처리
function processAttendance(sessionId) {
    const name = document.getElementById('studentName').value.trim();
    const studentId = document.getElementById('studentId').value.trim();

    // 현재 세션 확인
    const currentSessionStr = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);

    if (!currentSessionStr) {
        showResult('현재 진행 중인 출석 세션이 없습니다.', 'error');
        return;
    }

    const currentSession = JSON.parse(currentSessionStr);

    // 세션 ID 확인
    if (currentSession.id !== sessionId) {
        showResult('유효하지 않은 QR 코드입니다. 최신 QR 코드를 스캔해주세요.', 'error');
        return;
    }

    // 중복 출석 확인
    const records = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]');
    const duplicate = records.find(r =>
        r.sessionId === sessionId &&
        r.studentId === studentId
    );

    if (duplicate) {
        showResult('이미 출석 체크를 완료했습니다.', 'error');
        return;
    }

    // 출석 기록 추가
    const attendanceRecord = {
        sessionId: sessionId,
        name: name,
        studentId: studentId,
        timestamp: new Date().toISOString()
    };

    records.push(attendanceRecord);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));

    showResult(`출석 체크가 완료되었습니다! (${currentSession.name})`, 'success');

    // 수동 입력 필드 초기화
    document.getElementById('qrCode').value = '';
}

// 결과 메시지 표시
function showResult(message, type) {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = message;
    resultDiv.className = 'result-message ' + type;

    // 3초 후 메시지 숨기기
    setTimeout(() => {
        resultDiv.className = 'result-message';
    }, 3000);
}
