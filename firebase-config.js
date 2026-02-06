// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyDywvAv-ycLxdtqzxQ_Hwcsa3_d1VzJ_mA",
    authDomain: "vms-winter-workshop.firebaseapp.com",
    databaseURL: "https://vms-winter-workshop-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "vms-winter-workshop",
    storageBucket: "vms-winter-workshop.firebasestorage.app",
    messagingSenderId: "840404759908",
    appId: "1:840404759908:web:8b3678b5b4fed90f637671"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Realtime Database 참조
const database = firebase.database();
