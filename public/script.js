const socket = io();
let currentUser = null;

async function login() {
  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.value, password: password.value })
  });
  const data = await res.json();
  if (data.success) {
    currentUser = username.value;
    displayUser.innerText = currentUser;
    badge.innerText = data.user.verified ? '✅ Verified' : '';
    userInfo.innerHTML = `<b>Followers:</b> ${data.user.followers}`;
    login.style.display = 'none';
    main.style.display = 'block';
    loadPosts();
  } else alert('Invalid login');
}

async function signup() {
  const res = await fetch('/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.value, password: password.value })
  });
  const data = await res.json();
  if (data.success) login();
  else alert('Username exists');
}

function logout() {
  location.reload();
}

async function createPost() {
  const text = postText.value;
  const file = media.files[0];
  const formData = new FormData();
  formData.append('content', text);
  if (file) formData.append('media', file);
  const res = await fetch('/post', { method: 'POST', body: formData });
  const data = await res.json();
  if (data.success) loadPosts();
}

async function loadPosts() {
  const res = await fetch('/posts');
  const posts = await res.json();
  feed.innerHTML = '';
  posts.forEach(post => {
    const div = document.createElement('div');
    div.className = 'post';
    div.innerHTML = '<b>' + post.author + '</b>' +
      (post.media ? `<br><img src="${post.media}" width="200"/>` : '') +
      `<p>${post.content}</p>` +
      `<div class='reactions'>
        <span onclick="react(${post.id}, 'like')">👍</span>
        <span onclick="react(${post.id}, 'love')">❤️</span>
        <span onclick="react(${post.id}, 'haha')">😂</span>
      </div>
      <div><input type='text' placeholder='Comment...' onkeydown="if(event.key==='Enter') comment(${post.id}, this.value)"></div>
      <div class='comment-list'>${(post.comments || []).map(c => '<div class="comment"><b>' + c.user + ':</b> ' + c.text + '</div>').join('')}</div>`;
    feed.appendChild(div);
  });
}

async function react(id, type) {
  await fetch('/react', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, type })
  });
  loadPosts();
}

async function comment(id, text) {
  await fetch('/comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, text })
  });
  loadPosts();
}

async function broadcast() {
  const msg = document.getElementById("broadcastMsg").value;
  await fetch('/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msg })
  });
  alert("Message sent to all users.");
}

async function loadInbox() {
  const res = await fetch('/session');
  const data = await res.json();
  const user = data.user;
  const inboxEl = document.getElementById("inbox");
  inboxEl.innerHTML = '';
  const inbox = data.data.inbox || {};
  for (const friend in inbox) {
    const chatDiv = document.createElement('div');
    chatDiv.innerHTML = `<b>${friend}</b><br>`;
    (inbox[friend] || []).forEach(m => {
      chatDiv.innerHTML += `<div><b>${m.from}:</b> ${m.text}</div>`;
    });
    chatDiv.innerHTML += `<input placeholder='Message ${friend}' onkeydown="if(event.key==='Enter') sendMsg('${friend}', this.value)" />`;
    inboxEl.appendChild(chatDiv);
  }
}

function sendMsg(to, text) {
  socket.emit('message', { from: currentUser, to, text });
  loadInbox();
}