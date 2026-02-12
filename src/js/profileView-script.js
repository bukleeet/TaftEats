
// Hardcoded User Profiles (name, desc, pfp)
const userProfiles = {
    "jane_d": ["jane_d", "I am a student who likes trying out food.", "images/jane_d-Avatar.jpg"],
    "marky": ["marky", "I am a food entusiast.", "images/marky-Avatar.jpg"],
    "ella_s": ["ella_s", "I am a food entusiast.", "images/ella_s-Avatar.jpg"],
    "miggy": ["miggy", "I am a food entusiast.", "images/miggy-Avatar.png"],
    "kiks_m": ["kiks_m", "I am a food entusiast.", "images/kiks_m-Avatar.jpg"],
    "sophia": ["sophia", "I am a food entusiast.", "images/sophia-Avatar.png"],
    "daniella": ["daniella", "I am a food entusiast.", "images/daniella-Avatar.jpg"]
}


// Hardcoded User Activity (Reviews, Posts, Comments)
const userActivity = {
    "@jane_d": [],
    "@marky": [],
    "@ella_s": [],
    "@miggy": [],
    "@kiks_m": [],
    "@sophia": [],
    "@daniella": []
}


const tabRadios   = document.querySelectorAll('.tabs input[type="radio"]');
const tabContents = document.querySelectorAll('.tab-content');

// Tab Navigation Functionality
tabRadios.forEach(radio => {
    radio.addEventListener('change', function() {
        tabContents.forEach(content => content.classList.remove('active'));
        const tabId = this.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});


// Loads Profile Data from LocalStorage
function loadProfile() {
    // Gets viewed username & current logged in username
    const urlParams = new URLSearchParams(window.location.search);
    const viewedUser = urlParams.get('username');
    const currUser = localStorage.getItem('currentUser');
    let desc, avatarUrl;
    

    // Identifies the viewedUser 
    if (viewedUser === currUser) {
        desc = localStorage.getItem('userDesc');
        avatarUrl = localStorage.getItem('userProfile'); 
    } 
    else {
        // Gets viewed user's info
        if (viewedUser in userProfiles) {
            const profile = userProfiles[viewedUser];
            desc = profile[1] || 'No description available.';
            avatarUrl = profile[2] || 'images/defaultprofile.png';
        } else {
            desc = 'Uh, Oh. This user does not seem to exist.'
            avatarUrl = 'images/defaultprofile.png';
        }

        // Removes Edit Profile Button
        const editBtn = document.getElementById('editProfileBtn')
        if (editBtn) {
            editBtn.style.display = 'none';
        }
    }

    // Sets Text Content
    document.getElementById('username-display').textContent = '@'+viewedUser || 'unknown_user';
    document.getElementById('desc-display').textContent = desc;
    document.querySelector('.profile-avatar img').src = avatarUrl;
}

loadProfile();
