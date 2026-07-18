// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ⚠️ SUBSTITUA ESTES VALORES COM SUAS CREDENCIAIS DO FIREBASE
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function saveData(key, value) {
  try {
    await set(ref(database, key), value);
    return true;
  } catch (error) {
    console.error("Erro ao salvar:", error);
    return false;
  }
}

async function loadData(key) {
  try {
    const snapshot = await get(child(ref(database), key));
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Erro ao carregar:", error);
    return null;
  }
}

function listenToData(key, callback) {
  const dbRef = ref(database, key);
  onValue(dbRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });
}

export { database, saveData, loadData, listenToData };