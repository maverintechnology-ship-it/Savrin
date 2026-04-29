import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDxOihzUd66eRD6gjGafIP9CdO3RsGrQHU",
  authDomain: "savrin-5e784.firebaseapp.com",
  projectId: "savrin-5e784"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const policies = [
  {
    title: "1. Employee Conduct Policy 2026",
    content: "1.1 Professional Behavior\nAll employees must maintain respectful and professional behavior in the workplace.\nHarassment, discrimination, bullying, or abusive language will not be tolerated.\nMaintain positive communication with team members, clients, and management.\n\n1.2 Attendance & Punctuality\nEmployees must report to work on time.\nLate arrivals or unapproved absences may lead to disciplinary action.\nAttendance must be marked daily through the HRMS Log Time system.\n\n1.3 Dress Code\nSmart casual or professional attire is expected during office hours.\nClean and presentable appearance is mandatory.\n\n1.4 Confidentiality\nEmployees must protect company data, client information, and internal documents.\nSharing confidential data without permission is prohibited.\n\n1.5 Use of Company Property\nCompany laptops, systems, IDs, and resources should be used only for official work.\nDamage caused by negligence may be chargeable."
  },
  {
    title: "2. Remote Work Guidelines",
    content: "2.1 Work Hours\nEmployees working remotely must be available during official working hours.\nDaily login and logout must be updated in HRMS.\n\n2.2 Communication\nEmployees must respond to emails/messages within reasonable time.\nAttend scheduled meetings on time.\n\n2.3 Productivity\nComplete assigned tasks before deadlines.\nDaily progress updates may be required.\n\n2.4 Security\nUse secure internet connections.\nDo not share passwords or access company files on public devices."
  },
  {
    title: "3. IT Security Protocols",
    content: "3.1 Password Policy\nUse strong passwords with letters, numbers, and symbols.\nChange passwords regularly.\n\n3.2 Data Protection\nBackup important files regularly.\nDo not install unauthorized software.\n\n3.3 Email Safety\nAvoid clicking suspicious links or attachments.\nReport phishing attempts immediately.\n\n3.4 Device Usage\nLock screens when away from desk.\nAntivirus updates must remain active."
  },
  {
    title: "4. Leave Policy",
    content: "All leave requests must be submitted through HRMS.\nEmergency leave must be informed to manager immediately.\nUnapproved leave may be considered absent."
  },
  {
    title: "5. Workplace Discipline",
    content: "The following may lead to warning or termination:\n- Repeated lateness\n- Misconduct\n- Data theft\n- Harassment\n- Poor performance without improvement\n- Unauthorized absence\n- Violation of company rules"
  },
  {
    title: "6. Employee Responsibilities",
    content: "Complete assigned tasks sincerely.\nRespect deadlines.\nMaintain teamwork.\nProtect company reputation.\nFollow management instructions."
  },
  {
    title: "7. Management Rights",
    content: "Management reserves the right to:\n- Update policies anytime\n- Monitor work systems\n- Take disciplinary actions\n- Assign tasks based on business needs"
  },
  {
    title: "8. Acknowledgement",
    content: "All employees are expected to read, understand, and follow this Company Policy & Rule Book."
  }
];

async function seed() {
  try {
    console.log("Authenticating as admin...");
    // Try with the email found in the create-user script
    const userCredential = await signInWithEmailAndPassword(auth, "gskarthikkrishnan@gmail.com", "admin123");
    console.log("Authenticated as:", userCredential.user.email);

    console.log("Seeding policies...");
    for (const p of policies) {
      await addDoc(collection(db, "policies"), {
        ...p,
        createdAt: new Date().toISOString()
      });
      console.log(`Added: ${p.title}`);
    }
    console.log("Seeding complete!");
    setTimeout(() => process.exit(0), 1000);
  } catch (e) {
    console.error("Error during seeding:", e);
    process.exit(1);
  }
}

seed();
