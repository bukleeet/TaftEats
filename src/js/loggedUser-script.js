function updateNavbarAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentUser = localStorage.getItem('currentUser');
    const loginBtn = document.getElementById('navLoginBtn');
    const writeBtn = document.getElementById('writeReviewBtn'); // Only on reviews page

    if (isLoggedIn === 'true') {
        // Change "Login" button to "Logout"
        if (loginBtn) {
            loginBtn.textContent = 'Logout';
            loginBtn.href = '#';
            loginBtn.onclick = handleLogout;
        }

        // Show "Write Review" button if it exists on the page
        if (writeBtn) {
            writeBtn.style.display = 'inline-block';
        }
    }
}

function handleLogout() {
    if (confirm("Are you sure you want to log out?")) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser');
        window.location.href = 'establishments.html';
    }
}

// Automatically check auth status whenever any page finishes loading
window.addEventListener('load', updateNavbarAuth);
