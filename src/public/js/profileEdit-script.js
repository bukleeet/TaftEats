// Saves Edits Made to Profile
async function saveEdits() {
    const username    = document.getElementById('username-txt').value;
    const description = document.getElementById('desc-txt').value;
    const avatar      = document.getElementById('profileImage');

    // Send Alert if fields are empty
    if (!username) {
        alert("Username cannot be empty.");
        return;
    }
    if (!description) {
        alert("Description cannot be empty.");
        return;
    }

    // FormData to contain updated values
    const formData = new FormData();
    formData.append('username', username);
    formData.append('description', description);
    
    // Stores Image if file is uploaded
    if (avatar.files && avatar.files[0]) {
        formData.append('profileImage', avatar.files[0]); 
    }

    try {
        // Send form data as POST request
        const response = await fetch(`/profile/${userId}/edit`, {
            method: 'POST',
            body: formData
        });

        // Checks result of fetch
        const result = await response.json();
        if (result.success) {
            alert("User profile updated successfully.");
            window.location.href = `/profile/${userId}`;
        } else {
            alert("Failed to update user profile.");
        }
    } catch (err) {
        console.error(err);
        alert("Error in updating user profile.");
    }
}


// Upload Profile Photo
const avatar = document.querySelector('.edit-profile-avatar');
const fileInput = document.getElementById('profileImage');
const avatarImg = avatar.querySelector('img');

// Opens file selector when avatar is clicked
avatar.addEventListener('click', function () {
    fileInput.click();
});

// Preview Image
fileInput.addEventListener('change', function () {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            avatarImg.src = e.target.result;
        };
        reader.readAsDataURL(this.files[0]);
    }
});
