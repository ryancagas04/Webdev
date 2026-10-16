"use strict";

const STORAGE_KEYS = {
  users: "orbit.users",
  session: "orbit.session",
  posts: "orbit.posts"
};

const starterPosts = [
  {
    id: "starter-1",
    userId: "community-maya",
    name: "Maya Chen",
    text: "Took the long way home today and found a tiny bookshop I had never noticed before. A good reminder to leave a little room for wandering.",
    createdAt: Date.now() - 1000 * 60 * 18,
    likes: []
  },
  {
    id: "starter-2",
    userId: "community-jules",
    name: "Jules Rivera",
    text: "What is one small thing that made your week better? Mine was a friend remembering how I take my tea.",
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    likes: []
  },
  {
    id: "starter-3",
    userId: "community-sam",
    name: "Sam Okafor",
    text: "Finished a project I had been putting off. It was less about finding motivation and more about making the first five minutes easy.",
    createdAt: Date.now() - 1000 * 60 * 60 * 20,
    likes: []
  }
];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`Could not read ${key} from localStorage.`, error);
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getUsers() {
  return readStorage(STORAGE_KEYS.users, []);
}

function getPosts() {
  const savedPosts = readStorage(STORAGE_KEYS.posts, null);
  if (savedPosts) return savedPosts;
  saveStorage(STORAGE_KEYS.posts, starterPosts);
  return [...starterPosts];
}

function getSession() {
  return readStorage(STORAGE_KEYS.session, null);
}

function initials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatTime(timestamp) {
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function updateHeader() {
  const session = getSession();

  document.querySelectorAll("[data-guest]").forEach((element) => {
    element.hidden = Boolean(session);
  });

  document.querySelectorAll("[data-member-avatar]").forEach((element) => {
    element.hidden = !session;
    if (session) {
      element.textContent = initials(session.name);
      element.title = `${session.name}'s profile`;
    }
  });

  document.querySelectorAll("[data-logout]").forEach((element) => {
    element.hidden = !session;
  });

  document.querySelectorAll("[data-current-avatar]").forEach((element) => {
    element.textContent = session ? initials(session.name) : "?";
  });
}

function renderPost(post, session) {
  const liked = Boolean(session && post.likes.includes(session.id));
  const safeName = escapeHTML(post.name);
  const safeText = escapeHTML(post.text);

  return `
    <article class="post-card card">
      <div class="post-head">
        <div class="avatar" aria-hidden="true">${escapeHTML(initials(post.name))}</div>
        <div>
          <div class="post-author">${safeName}</div>
          <time class="post-time" datetime="${new Date(post.createdAt).toISOString()}">
            ${escapeHTML(formatTime(post.createdAt))}
          </time>
        </div>
      </div>
      <p class="post-body">${safeText}</p>
      <div class="post-footer">
        <button class="like-button ${liked ? "liked" : ""}" type="button"
          data-like="${escapeHTML(post.id)}" aria-pressed="${liked}">
          ${liked ? "♥ Liked" : "♡ Like"}
        </button>
        <span class="post-count">${post.likes.length} ${post.likes.length === 1 ? "like" : "likes"}</span>
      </div>
    </article>
  `;
}

function renderPosts(container, posts) {
  if (!container) return;

  const session = getSession();
  if (!posts.length) {
    container.innerHTML = '<div class="empty-state">No posts yet. Share the first thought.</div>';
    return;
  }

  container.innerHTML = posts.map((post) => renderPost(post, session)).join("");
}

function renderFeed() {
  const posts = [...getPosts()].sort((a, b) => b.createdAt - a.createdAt);
  const container = document.querySelector("#feed-list");
  renderPosts(container, posts);

  const count = document.querySelector("#feed-count");
  if (count) count.textContent = `${posts.length} ${posts.length === 1 ? "post" : "posts"}`;
}

function renderExplore() {
  const posts = [...getPosts()].sort((a, b) => b.createdAt - a.createdAt);
  renderPosts(document.querySelector("#explore-list"), posts);
}

function renderProfile() {
  const session = getSession();
  const name = document.querySelector("#profile-name");
  const email = document.querySelector("#profile-email");
  const count = document.querySelector("#profile-post-count");
  const list = document.querySelector("#profile-post-list");

  if (!session) {
    if (name) name.textContent = "Your profile";
    if (email) email.textContent = "Log in to see your account details.";
    if (list) {
      list.innerHTML = '<div class="empty-state">Your profile is available after you <a class="text-link" href="login.html">log in</a>.</div>';
    }
    if (count) count.textContent = "";
    return;
  }

  if (name) name.textContent = session.name;
  if (email) email.textContent = session.email;

  const ownPosts = getPosts()
    .filter((post) => post.userId === session.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (count) count.textContent = `${ownPosts.length} ${ownPosts.length === 1 ? "post" : "posts"}`;
  renderPosts(list, ownPosts);
}

function showMessage(id, message) {
  const element = document.querySelector(id);
  if (element) element.textContent = message;
}

function handleSignup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !email || password.length < 6) {
    showMessage("#signup-message", "Enter a name, valid email, and password of at least 6 characters.");
    return;
  }

  const users = getUsers();
  if (users.some((user) => user.email === email)) {
    showMessage("#signup-message", "An account with that email already exists. Try logging in.");
    return;
  }

  const user = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    email,
    // Demo only: do not store real passwords in a client-side application.
    password
  };

  users.push(user);
  saveStorage(STORAGE_KEYS.users, users);
  saveStorage(STORAGE_KEYS.session, { id: user.id, name: user.name, email: user.email });
  window.location.href = "profile.html";
}

function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const user = getUsers().find((item) => item.email === email && item.password === password);

  if (!user) {
    showMessage("#login-message", "Those details do not match an account. Check them and try again.");
    return;
  }

  saveStorage(STORAGE_KEYS.session, { id: user.id, name: user.name, email: user.email });
  window.location.href = "../index.html";
}

function handleNewPost(event) {
  event.preventDefault();
  const session = getSession();

  if (!session) {
    window.location.href = "pages/login.html";
    return;
  }

  const textInput = document.querySelector("#post-text");
  const text = textInput.value.trim();
  if (!text) return;

  const posts = getPosts();
  posts.push({
    id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: session.id,
    name: session.name,
    text,
    createdAt: Date.now(),
    likes: []
  });

  saveStorage(STORAGE_KEYS.posts, posts);
  textInput.value = "";
  renderFeed();
}

function handleLikeClick(event) {
  const button = event.target.closest("[data-like]");
  if (!button) return;

  const session = getSession();
  if (!session) {
    window.location.href = document.body.dataset.page === "feed"
      ? "pages/login.html"
      : "login.html";
    return;
  }

  const postId = button.dataset.like;
  const posts = getPosts();
  const post = posts.find((item) => item.id === postId);
  if (!post) return;

  if (!Array.isArray(post.likes)) post.likes = [];
  const likeIndex = post.likes.indexOf(session.id);

  if (likeIndex === -1) post.likes.push(session.id);
  else post.likes.splice(likeIndex, 1);

  saveStorage(STORAGE_KEYS.posts, posts);
  renderCurrentPage();
}

function handleLogout() {
  localStorage.removeItem(STORAGE_KEYS.session);
  window.location.href = document.body.dataset.page === "feed"
    ? "index.html"
    : "../index.html";
}

function renderCurrentPage() {
  const page = document.body.dataset.page;
  updateHeader();

  if (page === "feed") renderFeed();
  if (page === "explore") renderExplore();
  if (page === "profile") renderProfile();
}

document.addEventListener("DOMContentLoaded", () => {
  getPosts();
  updateHeader();

  document.querySelector("#signup-form")?.addEventListener("submit", handleSignup);
  document.querySelector("#login-form")?.addEventListener("submit", handleLogin);
  document.querySelector("#post-form")?.addEventListener("submit", handleNewPost);
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", handleLogout);
  });

  document.addEventListener("click", handleLikeClick);
  renderCurrentPage();
});"use strict";

const STORAGE_KEYS = {
  users: "orbit.users",
  session: "orbit.session",
  posts: "orbit.posts"
};

const starterPosts = [
  {
    id: "starter-1",
    userId: "community-maya",
    name: "Maya Chen",
    text: "Took the long way home today and found a tiny bookshop I had never noticed before. A good reminder to leave a little room for wandering.",
    createdAt: Date.now() - 1000 * 60 * 18,
    likes: []
  },
  {
    id: "starter-2",
    userId: "community-jules",
    name: "Jules Rivera",
    text: "What is one small thing that made your week better? Mine was a friend remembering how I take my tea.",
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    likes: []
  },
  {
    id: "starter-3",
    userId: "community-sam",
    name: "Sam Okafor",
    text: "Finished a project I had been putting off. It was less about finding motivation and more about making the first five minutes easy.",
    createdAt: Date.now() - 1000 * 60 * 60 * 20,
    likes: []
  }
];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`Could not read ${key} from localStorage.`, error);
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getUsers() {
  return readStorage(STORAGE_KEYS.users, []);
}

function getPosts() {
  const savedPosts = readStorage(STORAGE_KEYS.posts, null);
  if (savedPosts) return savedPosts;
  saveStorage(STORAGE_KEYS.posts, starterPosts);
  return [...starterPosts];
}

function getSession() {
  return readStorage(STORAGE_KEYS.session, null);
}

function initials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatTime(timestamp) {
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function updateHeader() {
  const session = getSession();

  document.querySelectorAll("[data-guest]").forEach((element) => {
    element.hidden = Boolean(session);
  });

  document.querySelectorAll("[data-member-avatar]").forEach((element) => {
    element.hidden = !session;
    if (session) {
      element.textContent = initials(session.name);
      element.title = `${session.name}'s profile`;
    }
  });

  document.querySelectorAll("[data-logout]").forEach((element) => {
    element.hidden = !session;
  });

  document.querySelectorAll("[data-current-avatar]").forEach((element) => {
    element.textContent = session ? initials(session.name) : "?";
  });
}

function renderPost(post, session) {
  const liked = Boolean(session && post.likes.includes(session.id));
  const safeName = escapeHTML(post.name);
  const safeText = escapeHTML(post.text);

  return `
    <article class="post-card card">
      <div class="post-head">
        <div class="avatar" aria-hidden="true">${escapeHTML(initials(post.name))}</div>
        <div>
          <div class="post-author">${safeName}</div>
          <time class="post-time" datetime="${new Date(post.createdAt).toISOString()}">
            ${escapeHTML(formatTime(post.createdAt))}
          </time>
        </div>
      </div>
      <p class="post-body">${safeText}</p>
      <div class="post-footer">
        <button class="like-button ${liked ? "liked" : ""}" type="button"
          data-like="${escapeHTML(post.id)}" aria-pressed="${liked}">
          ${liked ? "♥ Liked" : "♡ Like"}
        </button>
        <span class="post-count">${post.likes.length} ${post.likes.length === 1 ? "like" : "likes"}</span>
      </div>
    </article>
  `;
}

function renderPosts(container, posts) {
  if (!container) return;

  const session = getSession();
  if (!posts.length) {
    container.innerHTML = '<div class="empty-state">No posts yet. Share the first thought.</div>';
    return;
  }

  container.innerHTML = posts.map((post) => renderPost(post, session)).join("");
}

function renderFeed() {
  const posts = [...getPosts()].sort((a, b) => b.createdAt - a.createdAt);
  const container = document.querySelector("#feed-list");
  renderPosts(container, posts);

  const count = document.querySelector("#feed-count");
  if (count) count.textContent = `${posts.length} ${posts.length === 1 ? "post" : "posts"}`;
}

function renderExplore() {
  const posts = [...getPosts()].sort((a, b) => b.createdAt - a.createdAt);
  renderPosts(document.querySelector("#explore-list"), posts);
}

function renderProfile() {
  const session = getSession();
  const name = document.querySelector("#profile-name");
  const email = document.querySelector("#profile-email");
  const count = document.querySelector("#profile-post-count");
  const list = document.querySelector("#profile-post-list");

  if (!session) {
    if (name) name.textContent = "Your profile";
    if (email) email.textContent = "Log in to see your account details.";
    if (list) {
      list.innerHTML = '<div class="empty-state">Your profile is available after you <a class="text-link" href="login.html">log in</a>.</div>';
    }
    if (count) count.textContent = "";
    return;
  }

  if (name) name.textContent = session.name;
  if (email) email.textContent = session.email;

  const ownPosts = getPosts()
    .filter((post) => post.userId === session.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (count) count.textContent = `${ownPosts.length} ${ownPosts.length === 1 ? "post" : "posts"}`;
  renderPosts(list, ownPosts);
}

function showMessage(id, message) {
  const element = document.querySelector(id);
  if (element) element.textContent = message;
}

function handleSignup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !email || password.length < 6) {
    showMessage("#signup-message", "Enter a name, valid email, and password of at least 6 characters.");
    return;
  }

  const users = getUsers();
  if (users.some((user) => user.email === email)) {
    showMessage("#signup-message", "An account with that email already exists. Try logging in.");
    return;
  }

  const user = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    email,
    // Demo only: do not store real passwords in a client-side application.
    password
  };

  users.push(user);
  saveStorage(STORAGE_KEYS.users, users);
  saveStorage(STORAGE_KEYS.session, { id: user.id, name: user.name, email: user.email });
  window.location.href = "profile.html";
}

function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const user = getUsers().find((item) => item.email === email && item.password === password);

  if (!user) {
    showMessage("#login-message", "Those details do not match an account. Check them and try again.");
    return;
  }

  saveStorage(STORAGE_KEYS.session, { id: user.id, name: user.name, email: user.email });
  window.location.href = "../index.html";
}

function handleNewPost(event) {
  event.preventDefault();
  const session = getSession();

  if (!session) {
    window.location.href = "pages/login.html";
    return;
  }

  const textInput = document.querySelector("#post-text");
  const text = textInput.value.trim();
  if (!text) return;

  const posts = getPosts();
  posts.push({
    id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: session.id,
    name: session.name,
    text,
    createdAt: Date.now(),
    likes: []
  });

  saveStorage(STORAGE_KEYS.posts, posts);
  textInput.value = "";
  renderFeed();
}

function handleLikeClick(event) {
  const button = event.target.closest("[data-like]");
  if (!button) return;

  const session = getSession();
  if (!session) {
    window.location.href = document.body.dataset.page === "feed"
      ? "pages/login.html"
      : "login.html";
    return;
  }

  const postId = button.dataset.like;
  const posts = getPosts();
  const post = posts.find((item) => item.id === postId);
  if (!post) return;

  if (!Array.isArray(post.likes)) post.likes = [];
  const likeIndex = post.likes.indexOf(session.id);

  if (likeIndex === -1) post.likes.push(session.id);
  else post.likes.splice(likeIndex, 1);

  saveStorage(STORAGE_KEYS.posts, posts);
  renderCurrentPage();
}

function handleLogout() {
  localStorage.removeItem(STORAGE_KEYS.session);
  window.location.href = document.body.dataset.page === "feed"
    ? "index.html"
    : "../index.html";
}

function renderCurrentPage() {
  const page = document.body.dataset.page;
  updateHeader();

  if (page === "feed") renderFeed();
  if (page === "explore") renderExplore();
  if (page === "profile") renderProfile();
}

document.addEventListener("DOMContentLoaded", () => {
  getPosts();
  updateHeader();

  document.querySelector("#signup-form")?.addEventListener("submit", handleSignup);
  document.querySelector("#login-form")?.addEventListener("submit", handleLogin);
  document.querySelector("#post-form")?.addEventListener("submit", handleNewPost);
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", handleLogout);
  });

  document.addEventListener("click", handleLikeClick);
  renderCurrentPage();
});