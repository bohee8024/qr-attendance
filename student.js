// 세션 정보
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
function goToStep2(name, checkTypeText = '출석') {
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
    document.getElementById('completionMessage').textContent =
        `${name}님의 ${checkTypeText}이 완료되었습니다.`;
    document.getElementById('completionSession').textContent = scannedSessionName;
    hideError();
}

// 홈으로 돌아가기
function goBackToHome() {
    window.location.href = 'index.html';
}

// 출석/퇴실 제출
async function submitAttendance() {
    const name = document.getElementById('employeeName').value.trim();
    const hasParking = document.getElementById('hasParking').checked;
    const checkType = document.querySelector('input[name="checkType"]:checked').value;

    if (!name) {
        showError('이름을 입력해주세요.');
        return;
    }

    // 버튼 비활성화 (중복 클릭 방지)
    const submitBtn = document.getElementById('submitAttendance');
    submitBtn.disabled = true;
    submitBtn.textContent = '처리 중...';

    const checkTypeText = checkType === 'in' ? '출석' : '퇴실';

    try {
        // 중복 체크 확인
        const attendanceRef = database.ref('attendance');
        const snapshot = await attendanceRef
            .orderByChild('sessionId')
            .equalTo(scannedSessionId)
            .once('value');

        const existingRecords = snapshot.val();
        if (existingRecords) {
            const duplicate = Object.values(existingRecords).find(r =>
                r.name === name && r.checkType === checkType
            );

            if (duplicate) {
                showError(`이미 ${checkTypeText} 체크를 완료했습니다.`);
                submitBtn.disabled = false;
                submitBtn.textContent = '체크하기';
                return;
            }
        }

        // 기록 추가
        const newAttendanceRef = attendanceRef.push();
        await newAttendanceRef.set({
            sessionId: scannedSessionId,
            sessionName: scannedSessionName,
            name: name,
            hasParking: hasParking,
            checkType: checkType,
            timestamp: new Date().toISOString()
        });

        // 단계 2로 이동 (완료)
        goToStep2(name, checkTypeText);

    } catch (error) {
        console.error('저장 실패:', error);
        showError('저장에 실패했습니다. 다시 시도해주세요.');
        submitBtn.disabled = false;
        submitBtn.textContent = '체크하기';
    }
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
