
// Form Submission 
document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const email    = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;
    const description     = document.getElementById('userDesc').value;

    // Checks if Description & Profile Image is added
    if (!imgUploaded) {
        alert('Please upload a profile image.');
        return;  // Stop submission
    } else if  (!description) {
        alert('Please enter a description.');
        return;
    }

    // Form Data
    const formData = { 
        username, 
        email, 
        password, 
        description, 
        avatar: profileBase64 
    };

    // Send form data as POST request
    const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData) 
    });

    const result = await response.json();
    if (result.success) {
        alert("Account created successfully.");
        window.location.href = "/login";    // redirects to login page
    } else {
        alert("Failed to create an account.");
    }

    // Clears all input fields and removes modal
    imgUploaded = false;
    document.getElementById('username').value = "";
    document.getElementById('userEmail').value = "";
    document.getElementById('userPassword').value = "";
    document.getElementById('userDesc').value = "";
    document.getElementById('profileImage').value = "";
    document.getElementById('profileModal').classList.remove("active");
});

// Image Upload
let imgUploaded = false;
let profileBase64 = '';
document.getElementById('profileImage').addEventListener('change', function(e) {
    const imageFile = this.files[0];
    if (!imageFile) return;  // Return if file is empty

    // Store Image as Base64 string
    const reader = new FileReader();
    reader.onload = function (e) {
        // Stores base64 image in hidden input
        profileBase64 = e.target.result;
        imgUploaded = true;
    };
    reader.readAsDataURL(imageFile);

    console.log("IMAGE: " + imgUploaded);
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
