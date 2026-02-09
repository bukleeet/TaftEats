
document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const user  = document.getElementById('username').value;
    const email = document.getElementById('user-email').value;
    const pass  = document.getElementById('user-password').value;

    // Store Account Data in Local Storage
    localStorage.setItem('currentUser', user);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userPassword', pass);

    alert('Account Created Successfully!');
    window.location.href = 'reviews.html'; // Redirects to reviews page
});