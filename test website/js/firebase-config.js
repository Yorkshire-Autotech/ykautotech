/* Yorkshire Autotech — Firebase configuration.
 *
 * HOW TO GO LIVE (one-time, ~5 minutes):
 *   1. Go to https://console.firebase.google.com and create a project (e.g. "yorkshire-autotech").
 *   2. In the project, click the web icon (</>) to register a web app — no hosting needed.
 *   3. Copy the firebaseConfig values it shows you into the object below.
 *   4. In the console, open Build → Firestore Database → Create database (production mode).
 *   5. Open Firestore → Rules, paste in the contents of firestore.rules from this site, and Publish.
 *   6. Open Build → Authentication → Get started → enable "Email/Password",
 *      then on the Users tab add yourself as a user — that's your admin.html login.
 *
 * Until real values are entered here the site runs in DEMO MODE:
 * bookings are stored in this browser only (localStorage), so you can
 * test the whole flow — including admin.html — without a Firebase account.
 */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAz6b07k6UQIO-PUW09CCojbXZGa671s1I",
  authDomain: "yorkshire-autotech.firebaseapp.com",
  projectId: "yorkshire-autotech",
  storageBucket: "yorkshire-autotech.firebasestorage.app",
  messagingSenderId: "942032279652",
  appId: "1:942032279652:web:75cb2f290097f60a386771",
};
