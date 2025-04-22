const auth = firebase.auth();
const db = firebase.firestore();

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();

    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            console.log("User signed in:", user);

            db.collection("profiles").doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        window.location.href = "requests.html";
                    } else {
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
    const imageFile = document.getElementById("image").files[0]; 

    const user = auth.currentUser;

    if (!user) {
        console.log("No user logged in.");
        return;
    }

    if (!title || !description) {
        alert("Please fill in all fields.");
        return;
    }

    const fileSizeLimit = 1 * 1024 * 1024;

    if (imageFile && imageFile.size > fileSizeLimit) {
        alert("File size exceeds the 1 MB limit. Please upload a smaller file.");
        return;
    }

    if (imageFile) {
        uploadImageToImgur(imageFile)
            .then((imageUrl) => {
                savePost(title, description, imageUrl, user);
            })
            .catch((error) => {
                console.error("Error uploading image to Imgur:", error);
                alert("Failed to upload image. Please try again.");
            });
    } else {
        savePost(title, description, "", user);
    }
}

function savePost(title, description, imageUrl, user) {
    db.collection("posts").add({
        title: title,
        description: description,
        imageUrl: imageUrl, 
        posterId: user.uid,
        posterName: user.displayName,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    })
    .then((docRef) => {
        console.log("Document written with ID: ", docRef.id);
        document.getElementById("title").value = "";
        document.getElementById("description").value = "";
        document.getElementById("image").value = ""; 
        loadPosts(user.uid); 
    })
    .catch((error) => {
        console.error("Error adding document: ", error);
    });
}

function loadPosts(currentUserId) {
    const postsContainer = document.getElementById("postsContainer");
    postsContainer.innerHTML = ""; 

    db.collection("posts").orderBy("timestamp", "desc").get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const post = doc.data();
                const postId = doc.id;

               
                const postDiv = document.createElement("div");
                postDiv.classList.add("post");

             
                if (post.imageUrl) {
                    const imageElement = document.createElement("img");
                    imageElement.classList.add("post-image");
                    imageElement.src = post.imageUrl; 
                    imageElement.alt = "Post Image"; 
                    postDiv.appendChild(imageElement);
                }

                const postContent = document.createElement("div");
                postContent.classList.add("post-content");

                const titleElement = document.createElement("h2");
                titleElement.classList.add("post-title");
                titleElement.textContent = post.title;
                postContent.appendChild(titleElement);

                const descriptionElement = document.createElement("p");
                descriptionElement.classList.add("post-description");
                descriptionElement.textContent = post.description;
                postContent.appendChild(descriptionElement);

                const posterElement = document.createElement("p");
                posterElement.classList.add("post-poster");
                posterElement.innerHTML = `Posted by: <a href="profileTemplate.html?userId=${post.posterId}">${post.posterName}</a>`;
                postContent.appendChild(posterElement);

                if (post.posterId === currentUserId) {
                    const deleteButton = document.createElement("button");
                    deleteButton.classList.add("delete-button");
                    deleteButton.textContent = "Delete Post";
                    deleteButton.onclick = () => deletePost(postId);
                    postContent.appendChild(deleteButton);
                }

                postDiv.appendChild(postContent);

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
            Authorization: "Client-ID 21715d0fd0bed38", 
        },
        body: formData,
    });

    if (!response.ok) {
        throw new Error("Failed to upload image to Imgur");
    }

    const data = await response.json();
    return data.data.link; 
}
