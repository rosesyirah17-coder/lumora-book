// firebase.js

/*
=========================================================
LUMORA BOOK - FIREBASE
=========================================================

Firebase configuration for the Lumora Book project.

The existing project can use localStorage for its
personal library and favourites.

=========================================================
*/

const firebaseConfig = {

  apiKey: "YOUR_FIREBASE_API_KEY",

  authDomain:
    "YOUR_PROJECT.firebaseapp.com",

  projectId:
    "YOUR_PROJECT_ID",

  storageBucket:
    "YOUR_PROJECT.firebasestorage.app",

  messagingSenderId:
    "YOUR_MESSAGING_SENDER_ID",

  appId:
    "YOUR_FIREBASE_APP_ID"

};

/*
=========================================================
OPTIONAL FIREBASE INITIALIZATION
=========================================================

Firebase initialization can be added when the actual
Firebase project configuration is available.

=========================================================
*/

window.LumoraFirebase = {

  config: firebaseConfig,

  enabled:
    firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY"

};