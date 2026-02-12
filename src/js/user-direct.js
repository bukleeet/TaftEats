// Directs user to others' profiles
function updateProfileLink() {
    // Ensures Profile Opens Logged User Profile
    const profileLink = document.querySelectorAll('p.review-meta a[href="profile-view.html"]');

    // Gets username includes it as parameter in href
    profileLink.forEach(link => {
        const rawUsername = link.textContent;
        const username = rawUsername.charAt(0)==='@' ? rawUsername.slice(1) : rawUsername;

        link.href = `profile-view.html?username=${encodeURIComponent(username)}`;
    });
}

updateProfileLink();
