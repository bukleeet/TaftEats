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


// Loads Edit Button if viewedUser is currentUser
function loadEditBtn() {
    
    // Adds edit profile button
    const editBtn = document.getElementById('editProfileBtn');

    if (viewedUserID === currentUserID) {
        if (editBtn) {
            editBtn.style.display = 'inline-block';
        }
    }
}

loadEditBtn();
