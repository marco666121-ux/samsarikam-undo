import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyCh4ZjVFItHhCH2oD8MSKMopfBoUIq3uKs",
  authDomain: "samsarikanundo-sms.firebaseapp.com",
  projectId: "samsarikanundo-sms",
  storageBucket: "samsarikanundo-sms.firebasestorage.app",
  messagingSenderId: "549176305522",
  appId: "1:549176305522:web:d4d8ae8e5950c922789feb",
  measurementId: "G-DZFFVT7KK6",
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  return _auth;
}