
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
    "@jane_d": [
        {establishment: "Prelude", stars: "⭐⭐⭐⭐⭐", title:"Perfect study spot", text:"The atmosphere is calm and the coffee is amazing. WiFi is stable too!"},
        {establishment: "La Elotes", stars: "⭐⭐⭐⭐", title:"Loved the place", text:"Cozy vibe and great food, though it gets crowded sometimes."},
        {establishment: "Illo", stars: "⭐⭐⭐⭐", title:"Great for students", text:"Easy to grab meals before class. Tasty sandwiches!"},
    ],
    "@marky": [
        {establishment: "Prelude", stars: "⭐⭐⭐⭐", title:"Good but crowded", text:"Love the drinks, but it gets really full during afternoons."},
    ],
    "@ella_s": [
        {establishment: "Barn by Borro", stars: "⭐⭐⭐⭐⭐", title:"Affordable and tasty", text:"Generous servings and super affordable. Perfect for lunch!"},
        {establishment: "La Elotes", stars: "⭐⭐⭐⭐⭐", title:"Comfort food heaven", text:"Affordable and really tasty meals. Perfect for students."},
        {establishment: "Illo", stars: "⭐⭐⭐⭐", title:"Budget-friendly", text:"Good food at a reasonable price. Quick service too."},
    ],
    "@miggy": [
        {establishment: "Barn by Borro", stars: "⭐⭐⭐⭐", title:"Noisy at peak hours", text:"Food is great but the place can be really noisy at peak hours."},
        {establishment: "KuhMeal", stars: "⭐⭐⭐⭐⭐", title:"Fast service", text:"Service is quick and friendly, definitely coming back."},
        {establishment: "Calle Cafe", stars: "⭐⭐⭐⭐", title:"Trendy but pricey", text:"Love the vibe, but meals are a bit expensive for students."},
        {establishment: "Dapit-Hapon Cafe & Bistro", stars: "⭐⭐⭐⭐⭐", title:"Nice menu", text:"Lots of options and very tasty meals."},
    ],
    "@kiks_m": [
        {establishment: "Asterisko", stars: "⭐⭐⭐⭐⭐", title:"Fun hangout spot", text:"Board games and drinks are amazing! Great place to chill with friends."},
        {establishment: "Gang Gang Chicken", stars: "⭐⭐⭐⭐", title:"Good quick meals", text:"Perfect for a quick bite, loved the chicken."},
        {establishment: "Angrydobo", stars: "⭐⭐⭐⭐⭐", title:"Delicious adobo", text:"Classic Filipino dishes done right. Highly recommended!"},
    ],
    "@sophia": [
        {establishment: "Asterisko", stars: "⭐⭐⭐⭐", title:"Good drinks but limited seating", text:"The drinks are refreshing but seating is a bit limited."},
        {establishment: "Gang Gang Chicken", stars: "⭐⭐⭐⭐", title:"Nice spot", text:"Small but cozy. Staff are friendly too!"},
        {establishment: "Angrydobo", stars: "⭐⭐⭐⭐", title:"Cozy vibes", text:"Loved the adobo, place is small but comfy."},
    ],
    "@daniella": [
        {establishment: "KuhMeal", stars: "⭐⭐⭐⭐", title:"Tasty chicken", text:"Chicken and fries are yummy, perfect for a quick snack!"},
        {establishment: "Calle Cafe", stars: "⭐⭐⭐⭐⭐", title:"Aesthetic spot", text:"Great interiors, perfect for photos. Drinks are amazing."},
        {establishment: "Dapit-Hapon Cafe & Bistro", stars: "⭐⭐⭐⭐", title:"Chill café", text:"Perfect place to relax with friends. Drinks are great."},
    ]
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

        // Adds Edit Profile Button
        const editBtn = document.getElementById('editProfileBtn')
        if (editBtn) {
            editBtn.style.display = 'inline-block';
        }
    } 
    else {
        // Gets viewed user's info (hardcoded)
        if (viewedUser in userProfiles) {
            const profile = userProfiles[viewedUser];
            desc = profile[1];
            avatarUrl = profile[2];
        } else {
            desc = 'Uh, Oh. This user does not seem to exist.'
            avatarUrl = 'images/defaultprofile.png';
        }
    }

    // Sets Text Content
    document.getElementById('username-display').textContent = '@'+viewedUser || 'unknown_user';
    document.getElementById('desc-display').textContent = desc;
    document.querySelector('.profile-avatar img').src = avatarUrl;
}

loadProfile();

// Loads User's Activity
function loadActivity() {

}
