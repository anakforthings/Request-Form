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
        // Upload the image to Imgur
        uploadImageToImgur(imageFile)
            .then((imageUrl) => {
                // Save the post data to Firestore with the image URL
                savePost(title, description, imageUrl, user);
            })
            .catch((error) => {
                console.error("Error uploading image to Imgur:", error);
                alert("Failed to upload image. Please try again.");
            });
    } else {
        // If no image is selected, save the post without an image URL
        savePost(title, description, "", user);
    }
}

function savePost(title, description, imageUrl, user) {
    // Save the post data to Firestore
    db.collection("posts").add({
        title: title,
        description: description,
        imageUrl: imageUrl, // Save the image URL
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

                if (post.imageUrl) {
                    const imageElement = document.createElement("img");
                    imageElement.classList.add("post-image");
                    imageElement.src = post.imageUrl; // Use the image URL
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
async function uploadImageToImgur(imageFile) {
    const formData = new FormData();
    formData.append("image", imageFile);

    const response = await fetch("https://api.imgur.com/3/image", {
        method: "POST",
        headers: {
            Authorization: "ded28a6c3f4c403", // Replace with your Imgur Client ID
        },
        body: formData,
    });

    if (!response.ok) {
        throw new Error("Failed to upload image to Imgur");
    }

    const data = await response.json();
    return data.data.link; // Return the image URL
}
