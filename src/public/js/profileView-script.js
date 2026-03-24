const tabRadios   = document.querySelectorAll('.tabs input[type="radio"]');
const tabContents = document.querySelectorAll('.tab-content');

tabRadios.forEach(radio => {
    radio.addEventListener('change', function() {
        tabContents.forEach(content => content.classList.remove('active'));
        const tabId = this.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

function loadEditBtn() {
    const editBtn = document.getElementById('editProfileBtn');
    if (viewedUserID === currentUserID && editBtn) {
        editBtn.style.display = 'inline-block';
    }
}
loadEditBtn();

function renderStars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (rating >= i)          html += '<span class="star star-filled">★</span>';
        else if (rating >= i - 0.5) html += '<span class="star half">★</span>';
        else                       html += '<span class="star">★</span>';
    }
    return html;
}

function renderReviewCard(post) {
    const estName  = post.establishment ? post.establishment.name : 'Unknown';
    const estId    = post.establishment ? post.establishment._id  : '';
    const reviewId = post._id;
    const date     = new Date(post.createdAt).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric'
    });

    const card = document.createElement('a');
    card.href      = `/reviews/${reviewId}`;
    card.className = 'profile-activity-card';

    card.innerHTML = `
        <div class="pac-header">
            <span class="pac-est">${estName}</span>
            <span class="pac-date">${date}</span>
        </div>
        <div class="pac-title">${post.title}</div>
        <div class="pac-stars">${renderStars(post.rating)} <span class="pac-rating">${parseFloat(post.rating).toFixed(1)} / 5</span></div>
    `;
    return card;
}

function renderReplyCard(reply) {
    const date = new Date(reply.createdAt).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric'
    });

    const card = document.createElement('a');
    card.href      = `/reviews/${reply.reviewId}`;
    card.className = 'profile-activity-card';

    card.innerHTML = `
        <div class="pac-header">
            <span class="pac-est">${reply.establishmentName}</span>
            <span class="pac-date">${date}</span>
        </div>
        <div class="pac-title">Reply on: <em>${reply.reviewTitle}</em></div>
        <div class="pac-body">${reply.body}</div>
    `;
    return card;
}

function setEmpty(containerId, message) {
    const el = document.getElementById(containerId);
    el.innerHTML = `<p style="color:#6b7280;padding:1rem 0;">${message}</p>`;
}

async function loadProfileActivity() {
    try {
        const response = await fetch(`/api/user/profile-activity?userId=${viewedUserID}`);
        const data     = await response.json();

        if (!data.success) {
            ['recent-activity','all-reviews','all-replies'].forEach(id =>
                setEmpty(id, 'Could not load activity.')
            );
            return;
        }

        // Recent Activity — 3 most recent reviews only
        const recentEl = document.getElementById('recent-activity');
        recentEl.innerHTML = '';
        const recent = data.posts.slice(0, 3);
        if (recent.length === 0) {
            setEmpty('recent-activity', 'No recent activity.');
        } else {
            recent.forEach(post => recentEl.appendChild(renderReviewCard(post)));
        }

        // All Reviews
        const reviewsEl = document.getElementById('all-reviews');
        reviewsEl.innerHTML = '';
        if (data.posts.length === 0) {
            setEmpty('all-reviews', 'No reviews yet.');
        } else {
            data.posts.forEach(post => reviewsEl.appendChild(renderReviewCard(post)));
        }

        // All Replies
        const repliesEl = document.getElementById('all-replies');
        repliesEl.innerHTML = '';
        if (data.replies.length === 0) {
            setEmpty('all-replies', 'No replies yet.');
        } else {
            data.replies.forEach(reply => repliesEl.appendChild(renderReplyCard(reply)));
        }

    } catch (err) {
        console.error('Failed to load profile activity:', err);
    }
}

window.addEventListener('load', loadProfileActivity);