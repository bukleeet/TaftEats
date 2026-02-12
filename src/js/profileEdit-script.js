
// Loads Profile Data from LocalStorage
function loadProfile() {
    // Gets user profile
    const user = localStorage.getItem('currentUser');
    const desc = localStorage.getItem('userDesc');
    const profileImg = localStorage.getItem('userProfile');

    // Sets Text Content
    document.getElementById('username-txt').textContent = user;
    document.getElementById('desc-txt').textContent = desc;
    document.querySelector('.edit-profile-avatar img').src = profileImg;
}

loadProfile();


// Saves Edits Made to Profile
function saveEdits() {
    const user  = document.getElementById('username-txt').value;
    const desc = document.getElementById('desc-txt').value;
    const pfp  = document.getElementById('profileImage');

    localStorage.setItem('currentUser', user);
    localStorage.setItem('userDesc', desc);
    
    // Store Image as Base64 string
    if (pfp.files && pfp.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            localStorage.setItem('userProfile', e.target.result);
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
    window.location.href = `profile-view.html?username=${encodeURIComponent(user)}`;
}


// Ensures Discard Button Returns to Correct Page
const profileLink = document.querySelector('a.discard-btn[href="profile-view.html"]');

// Gets current username from localStorage & includes it as parameter in href
if (profileLink) {
    const username = localStorage.getItem('currentUser');
    profileLink.href = `profile-view.html?username=${encodeURIComponent(username)}`;
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