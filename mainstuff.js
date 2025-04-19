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

function createPost() {
    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const imageFile = document.getElementById("image").files[0]; // Get the image file

    const user = auth.currentUser;

    if (!user) {
        console.log("No user logged in.");
        return;
    }

    if (!title || !description) {
        alert("Please fill in all fields.");
        return;
    }

    // File size limit (e.g., 1 MB = 1,048,576 bytes)
    const fileSizeLimit = 1 * 1024 * 1024; // 1 MB

    if (imageFile && imageFile.size > fileSizeLimit) {
        alert("File size exceeds the 1 MB limit. Please upload a smaller file.");
        return;
    }

    if (imageFile) {
        // Convert the image to Base64
        const reader = new FileReader();
        reader.onload = function (event) {
            const base64String = event.target.result.split(",")[1]; // Get the Base64 string
            savePost(title, description, base64String, user);
        };
        reader.readAsDataURL(imageFile); // Read the file as a data URL
    } else {
        // If no image is selected, save the post without an image
        savePost(title, description, "", user);
    }
}

function savePost(title, description, base64Image, user) {
    // Save the post data to Firestore
    db.collection("posts").add({
        title: title,
        description: description,
        imageBase64: base64Image, // Save the Base64 string
        posterId: user.uid,
        posterName: user.displayName, // Or whatever you use for the name
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    })
    .then((docRef) => {
        console.log("Document written with ID: ", docRef.id);
        // Clear the form
        document.getElementById("title").value = "";
        document.getElementById("description").value = "";
        document.getElementById("image").value = ""; // Clear the image input
        // Optionally, display a success message
        loadPosts(); // Reload the posts after creating a new one
    })
    .catch((error) => {
        console.error("Error adding document: ", error);
    });
}
function loadPosts() {
    const postsContainer = document.getElementById("postsContainer");
    postsContainer.innerHTML = ""; // Clear existing posts

    db.collection("posts").orderBy("timestamp", "desc").get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const post = doc.data();

                // Create post elements
                const postDiv = document.createElement("div");
                postDiv.classList.add("post");

                const titleElement = document.createElement("h2");
                titleElement.classList.add("post-title");
                titleElement.textContent = post.title;
                postDiv.appendChild(titleElement);

                if (post.imageBase64) {
                    const imageElement = document.createElement("img");
                    imageElement.classList.add("post-image");
                    imageElement.src = `data:image/jpeg;base64,${post.imageBase64}`; // Decode Base64
                    postDiv.appendChild(imageElement);
                }

                const descriptionElement = document.createElement("p");
                descriptionElement.classList.add("post-description");
                descriptionElement.textContent = post.description;
                postDiv.appendChild(descriptionElement);

                const posterElement = document.createElement("p");
                posterElement.classList.add("post-poster");
                posterElement.innerHTML = `Posted by: <a href="profile.html?userId=${post.posterId}">${post.posterName}</a>`;
                postDiv.appendChild(posterElement);

                postsContainer.appendChild(postDiv);
            });
        })
        .catch((error) => {
            console.error("Error getting posts: ", error);
        });
}
