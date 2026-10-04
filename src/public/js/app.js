(() => {
  'use strict';
  const heroText = document.getElementById('hero-text');
  const heroToggle = document.querySelector('.hero-animation-toggle');
  if (heroText && heroToggle) {
    const phrases = [
      ['Are you hungry?', 'en', 'hungry?'],
      ['Gutom ka na ba?', 'fil', 'Gutom'],
      ['¿Tienes hambre?', 'es', 'hambre?'],
      ['你饿了吗', 'zh', '饿'],
      ['Vous avez faim?', 'fr', 'faim?'],
      ['Hast du Hunger?', 'de', 'Hunger?'],
      ['Hai fame?', 'it', 'fame?'],
    ];
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let phrase = 0;
    let length = phrases[0][0].length;
    let erasing = true;
    let paused = false;
    let timer;
    function renderPhrase() {
      const [text, language, emphasis] = phrases[phrase];
      const visible = text.slice(0, length);
      const start = text.indexOf(emphasis);
      const end = start + emphasis.length;
      const italic = document.createElement('em');
      italic.textContent = visible.slice(start, end);
      heroText.replaceChildren(visible.slice(0, start), italic, visible.slice(end));
      heroText.lang = language;
    }
    function step() {
      if (paused || reducedMotion.matches) return;
      const [text] = phrases[phrase];
      length += erasing ? -1 : 1;
      renderPhrase();
      let delay = erasing ? 35 : 65;
      if (length === 0) {
        phrase = (phrase + 1) % phrases.length;
        erasing = false;
        delay = 300;
      } else if (length === text.length && !erasing) {
        erasing = true;
        delay = 2000;
      }
      timer = setTimeout(step, delay);
    }
    function syncAnimation() {
      clearTimeout(timer);
      heroToggle.hidden = reducedMotion.matches;
      heroToggle.textContent = paused ? 'Resume animation' : 'Pause animation';
      heroToggle.setAttribute('aria-pressed', String(paused));
      heroText.closest('.hero').classList.toggle('animation-paused', paused);
      if (reducedMotion.matches) {
        phrase = 0;
        length = phrases[0][0].length;
        erasing = true;
        renderPhrase();
      } else if (!paused) timer = setTimeout(step, 2000);
    }
    heroToggle.addEventListener('click', () => {
      paused = !paused;
      syncAnimation();
    });
    reducedMotion.addEventListener('change', syncAnimation);
    syncAnimation();
  }
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
  let toastTimer;
  function notify(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 6000);
  }
  async function request(url, { method = 'POST', body } = {}) {
    const headers = { 'X-CSRF-Token': csrf, Accept: 'application/json' };
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    const response = await fetch(url, { method, headers, body, credentials: 'same-origin' });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('The service is unavailable. Please try again.');
    }
    if (!response.ok) throw new Error(data.message || 'Please try again.');
    return data;
  }
  function showError(form, message) {
    const el = form.querySelector('.form-message');
    el.textContent = message;
    el.classList.add('error');
    el.hidden = false;
    el.tabIndex = -1;
    el.focus({ preventScroll: true });
    el.scrollIntoView({
      block: 'nearest',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }
  const toggle = document.getElementById('theme-toggle');
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    toggle?.setAttribute('aria-pressed', String(theme === 'dark'));
    toggle?.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  }
  try {
    setTheme(
      localStorage.getItem('theme') ||
        (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    );
  } catch {
    setTheme('light');
  }
  toggle?.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* Optional preference storage. */
    }
  });

  document.querySelectorAll('[data-rich-editor]').forEach((editor) => {
    editor.addEventListener('paste', (event) => {
      event.preventDefault();
      const text = event.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    });
    editor.addEventListener('drop', (event) => event.preventDefault());
  });
  document.querySelectorAll('[data-format]').forEach((button) => {
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => {
      button.closest('form').querySelector('[data-rich-editor]').focus();
      document.execCommand(button.dataset.format);
    });
  });
  document.querySelectorAll('[data-api-form]').forEach((form) =>
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (form.dataset.busy) return;
      const editor = form.querySelector('[data-rich-editor]');
      if (editor && !editor.textContent.trim()) {
        showError(form, 'Write your story before submitting.');
        editor.focus();
        return;
      }
      if (editor && editor.innerHTML.length > 10000) {
        showError(form, 'Your story is too long. Keep it under 10,000 characters.');
        return;
      }
      if (editor) form.elements.body.value = editor.innerHTML;
      const files = [...form.querySelectorAll('input[type="file"]')].flatMap((input) => [
        ...input.files,
      ]);
      if (files.reduce((sum, file) => sum + file.size, 0) > 3 * 1024 * 1024 || files.length > 10) {
        showError(form, 'Choose up to 10 files with a combined size no larger than 3 MB.');
        return;
      }
      const button = form.querySelector('button[type="submit"]');
      form.dataset.busy = 'true';
      button.disabled = true;
      form.setAttribute('aria-busy', 'true');
      try {
        const data = await request(form.action, {
          method: form.dataset.method || 'POST',
          body:
            form.enctype === 'multipart/form-data'
              ? new FormData(form)
              : Object.fromEntries(new FormData(form)),
        });
        if (data.redirect) location.assign(data.redirect);
        else location.reload();
      } catch (error) {
        showError(form, error.message);
      } finally {
        delete form.dataset.busy;
        button.disabled = false;
        form.removeAttribute('aria-busy');
      }
    }),
  );
  document.querySelectorAll('[data-vote]').forEach((button) =>
    button.addEventListener('click', async () => {
      const buttons = [...document.querySelectorAll('[data-vote]')];
      buttons.forEach((b) => {
        b.disabled = true;
      });
      try {
        const data = await request(`/reviews/${button.dataset.id}/vote`, {
          body: { voteType: button.dataset.vote },
        });
        buttons.forEach((b) => {
          b.setAttribute('aria-pressed', String(data.userVote === b.dataset.vote));
          b.textContent = `${b.dataset.vote === 'helpful' ? 'Helpful' : 'Not helpful'} · ${b.dataset.vote === 'helpful' ? data.helpfulCount : data.unhelpfulCount}`;
        });
        notify('Your vote has been updated.');
      } catch (error) {
        notify(error.message);
      } finally {
        buttons.forEach((b) => {
          b.disabled = false;
        });
      }
    }),
  );
  document.querySelectorAll('[data-delete-review], [data-delete-message]').forEach((button) =>
    button.addEventListener('click', async () => {
      const review = button.dataset.deleteReview;
      if (
        !confirm(
          review
            ? 'Permanently delete this review and its conversation?'
            : 'Remove your last message?',
        )
      )
        return;
      button.disabled = true;
      try {
        const data = await request(
          review
            ? `/reviews/${review}`
            : `/reviews/${button.dataset.deleteMessage}/thread-last-message`,
          { method: 'DELETE' },
        );
        if (data.redirect) location.assign(data.redirect);
        else location.reload();
      } catch (error) {
        notify(error.message);
        button.disabled = false;
      }
    }),
  );
  document.querySelector('[data-delete-account]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!confirm('Permanently delete your account and reviews? This cannot be undone.')) return;
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const data = await request(`/profile/${form.dataset.deleteAccount}/delete`, {
        method: 'DELETE',
        body: { password: form.elements.password.value },
      });
      location.assign(data.redirect);
    } catch (error) {
      showError(form, error.message);
      button.disabled = false;
    }
  });

  const profile = document.querySelector('[data-profile]');
  if (profile) {
    let page = 1;
    let loadedPage = 0;
    const load = document.getElementById('load-more');
    const status = document.getElementById('activity-status');
    const date = (value) =>
      new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(
        new Date(value),
      );
    function element(tag, className, content) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (content) node.textContent = content;
      return node;
    }
    function card({ title, body, id, meta }) {
      const article = element('article', 'review-card');
      const heading = element('h3');
      const link = element('a', '', title);
      link.href = `/reviews/${encodeURIComponent(id)}`;
      heading.append(link);
      const copy = element('div', 'rich-text review-excerpt');
      // Display API rich text as text in the activity preview. No user HTML is interpolated.
      const parsed = new DOMParser().parseFromString(body, 'text/html');
      copy.textContent = parsed.body.textContent;
      article.append(heading, element('p', 'review-byline', meta), copy);
      return article;
    }
    async function activity() {
      load.disabled = true;
      try {
        const response = await fetch(
          `/api/user/profile-activity?userId=${encodeURIComponent(profile.dataset.profile)}&page=${page}`,
          { headers: { Accept: 'application/json' } },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        const feed = document.getElementById('activity-feed');
        data.posts.forEach((r) =>
          feed.append(
            card({
              title: r.title,
              body: r.body,
              id: r._id,
              meta: `${r.establishment?.name || 'Removed restaurant'} · ★ ${r.rating} · ${date(r.createdAt)}`,
            }),
          ),
        );
        status.textContent = data.count
          ? `${data.count} reviews shared with the community.`
          : 'No reviews yet. Every good food journal starts somewhere.';
        if (page === 1) {
          const replies = document.getElementById('reply-feed');
          data.replies.forEach((r) =>
            replies.append(
              card({
                title: r.reviewTitle,
                body: r.body,
                id: r.reviewId,
                meta: `${r.establishmentName} · ${date(r.createdAt)}`,
              }),
            ),
          );
          if (!data.replies.length) replies.append(element('p', 'muted', 'No conversations yet.'));
        }
        loadedPage = page;
        load.textContent = 'Load more reviews';
        load.hidden = page >= data.pages;
      } catch (error) {
        status.textContent = error.message || 'Could not load activity. Please refresh.';
        load.hidden = false;
        load.textContent = 'Try again';
      } finally {
        load.disabled = false;
      }
    }
    load.addEventListener('click', () => {
      page = loadedPage + 1;
      activity();
    });
    activity();
  }
})();
