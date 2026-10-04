/* Firebase: inicio de sesión con Google y Analytics.
   Es un módulo (type="module"), por eso importa el SDK desde la CDN de Firebase.
   Deja disponible window.rutinaAuth para que app.js lo use. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA80l29AWAR3x1NCDoRPyhtM6c0JOYqoAA",
  authDomain: "elpolodancer.firebaseapp.com",
  projectId: "elpolodancer",
  storageBucket: "elpolodancer.firebasestorage.app",
  messagingSenderId: "397139900415",
  appId: "1:397139900415:web:871542e766c157a063d9ca",
  measurementId: "G-V7ZNVN2EN7"
};

const app = initializeApp(firebaseConfig);

/* Analytics solo se activa si el navegador lo permite (no funciona en todos los entornos) */
isSupported()
  .then(function (permitido) { if (permitido) getAnalytics(app); })
  .catch(function () { /* sin analytics: la app sigue igual */ });

const auth = getAuth(app);
const proveedor = new GoogleAuthProvider();
proveedor.setCustomParameters({ prompt: "select_account" });

window.rutinaAuth = {
  alCambiar: function (funcion) { return onAuthStateChanged(auth, funcion); },
  iniciarSesion: function () { return signInWithPopup(auth, proveedor); },
  cerrarSesion: function () { return signOut(auth); },
  obtenerToken: function () {
    if (!auth.currentUser) return Promise.reject(new Error("Inicia sesión para continuar"));
    return auth.currentUser.getIdToken();
  }
};
