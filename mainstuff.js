const auth = firebase.auth();
const db = firebase.firestore();

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();

    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            console.log("User signed in:", user);

            // Check if user has a profile in Firestore
            db.collection("profiles").doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        // User has a profile, redirect to requests page
                        window.location.href = "requests.html";
                    } else {
                        // User doesn't have a profile, redirect to profile creation page
                        window.location.href = "create-profile.html";
                    }
                })
                .catch((error) => {
                    console.error("Error checking profile:", error);
                    document.getElementById("message").innerText = "Error checking profile.";
                });
        })
        .catch((error) => {
            console.error("Error signing in with Google:", error);
            document.getElementById("message").innerText = "Error signing in with Google.";
        });
}

