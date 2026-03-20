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

async function loadProfileActivity() {
    const response = await fetch('/api/user/profile-activity');
    const data = await response.json();

    if (data.success) {
        // Clear static placeholders
        document.getElementById('recent-activity').innerHTML = '';
        document.getElementById('all-posts').innerHTML = '';
        document.getElementById('all-comments').innerHTML = '';

        // Render Posts
        data.posts.forEach(post => {
            renderActivityCard(post, 'all-posts', post.establishment.name);
        });

        // Render Comments
        data.comments.forEach(comment => {
            renderCommentCard(comment, 'all-comments');
        });

        // Render Recent Activity (Mixed)
        data.recentActivity.forEach(item => {
            if (item.title) { // It's a review/post
                renderActivityCard(item, 'recent-activity', item.establishment.name);
            } else { // It's a comment
                renderCommentCard(item, 'recent-activity');
            }
        });
    }
}

function renderActivityCard(item, containerId, restoName) {
    const container = document.getElementById(containerId);
    const card = document.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `
        <div class="review-content">
            <h2>${restoName}</h2>
            <p class="review-meta">${item.title} · ${'⭐'.repeat(Math.round(item.rating))}</p>
            <p class="review-text">${item.body}</p>
            <small>${new Date(item.createdAt).toLocaleDateString()}</small>
        </div>
    `;
    container.appendChild(card);
}

function renderCommentCard(comment, containerId) {
    const container = document.getElementById(containerId);
    const card = document.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `
        <div class="review-content">
            <h2>Reply to: ${comment.establishmentName}</h2>
            <p class="review-meta">On: "${comment.reviewTitle}"</p>
            <p class="review-text">${comment.body}</p>
            <small>${new Date(comment.createdAt).toLocaleDateString()}</small>
        </div>
    `;
    container.appendChild(card);
}

window.addEventListener('load', loadProfileActivity);
