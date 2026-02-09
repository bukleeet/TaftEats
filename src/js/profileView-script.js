
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
    const profileData = JSON.parse(localStorage.getItem('userProfile')) || {
        username: '@tafteats',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam sed felis non eros gravida fringilla. Donec nibh risus, scelerisque at aliquet quis, facilisis non nunc. Cras sem ligula, placerat in erat quis, consectetur mollis arcu. Donec tempor augue sed nisi imperdiet, eget volutpat nisl rutrum.',
        avatarUrl: 'images/sample pfp.png'
    };

    document.getElementById('username-display').textContent = profileData.username;
    document.getElementById('description-display').textContent = profileData.description;
    document.querySelector('.profile-avatar img').src = profileData.avatarUrl;
}
loadProfile(); // Call on page load