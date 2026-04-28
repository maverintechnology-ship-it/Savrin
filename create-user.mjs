import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDxOihzUd66eRD6gjGafIP9CdO3RsGrQHU",
  authDomain: "savrin-5e784.firebaseapp.com",
  projectId: "savrin-5e784"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

console.log("Creating user gskarthikkrishnan@gmail.com with password admin123...");

createUserWithEmailAndPassword(auth, "gskarthikkrishnan@gmail.com", "admin123")
  .then((userCredential) => {
    console.log("Successfully created user!", userCredential.user.uid);
    process.exit(0);
  })
  .catch((error) => {
    if (error.code === 'auth/email-already-in-use') {
        console.log("User already exists!");
        process.exit(0);
    } else {
        console.error("Error creating user:", error);
        process.exit(1);
    }
  });
