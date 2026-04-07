// Form Submission 
document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username    = document.getElementById('username').value;
    const email       = document.getElementById('userEmail').value;
    const password    = document.getElementById('userPassword').value;
    const description = document.getElementById('userDesc').value;
    const avatar      = document.getElementById('profileImage');

    // Checks if Description & Profile Image is added
    if (!avatar.files || !avatar.files[0]) {
        alert('Please upload a profile image.');
        return;  // Stop submission
    } else if  (!description) {
        alert('Please enter a description.');
        return;
    }

    // Form Data to contain values
    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('description', description);
    formData.append('profileImage', avatar.files[0]);

    try {
        // Send form data as POST request
        const response = await fetch('/register', {
            method: 'POST',
            body: formData
        });

        // Checks result of fetch
        const result = await response.json();
        if (result.success) {
            alert("Account created successfully.");
            window.location.href = "/login";  // redirects to login page
        } else {
            alert(result.message || "Failed to create an account.");
        }
    } catch (err) {
        console.error(err);
        alert("Error in account creation.");
    }

    // Reset form and removes modal
    document.getElementById('registerForm').reset();
    document.getElementById('profileModal').classList.remove("active");
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

// Remove Image
function removeImage() {
    document.getElementById('profileImage').value = "";
    document.getElementById('imagePreviewContainer').style.display = 'none';
    currentImageSrc = null;
}
