
document.getElementById('profileForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const user  = document.getElementById('username').value;
    const email = document.getElementById('userEmail').value;
    const pass  = document.getElementById('userPassword').value;
    const desc = document.getElementById('userDesc').value;
    const pfp  = document.getElementById('profileImage').value;

    // Checks if Description & Profile Image is added
    if (!pfp) {
        alert('Please upload a profile image.');
        return;  // Stop submission
    } else if  (!desc) {
        alert('Please enter a description.');
        return;
    }

    // Store Account Data in Local Storage
    localStorage.setItem('currentUser', user);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userPassword', pass);
    localStorage.setItem('userDesc', desc);
    localStorage.setItem('userProfile', pfp);
    localStorage.setItem('isLoggedIn', 'true');

    alert('Account Created Successfully!');
    document.getElementById('profileModal').classList.remove("active");
    window.location.href = 'reviews.html'; // Redirects to reviews page
});

// Function to Open Modal
function openModal(id) {
    // Gets Form input values & Checks if they are empty
    const user = document.getElementById('username').value;
    const email = document.getElementById('userEmail').value;
    const pass  = document.getElementById('userPassword').value;

    if (!user) {
        alert('Please enter a username.');
        return;  // Stop submission
    } else if  (!email) {
        alert('Please enter an email.');
        return;
    } else if (!pass) {
        alert('Please enter a password.');
        return;
    }

    const emailRegEx = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegEx.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    document.getElementById(id).classList.add("active");
}

// Image Preview
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagePreview').src = e.target.result;
            document.getElementById('imagePreviewContainer').style.display = 'block';
            currentImageSrc = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function removeImage() {
    document.getElementById('profileImage').value = "";
    document.getElementById('imagePreviewContainer').style.display = 'none';
    currentImageSrc = null;
}
