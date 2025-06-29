const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const session = require('express-session');
const multer = require('multer');
const path = require('path');

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

let users = {
  danieldev: {
    pass: 'danielot',
    verified: true,
    followers: 100000000000,
    friends: [],
    requests: [],
    posts: [],
    inbox: {}
  }
};
let posts = [];
let messages = {};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  if (users[username]) return res.json({ success: false, msg: 'User exists' });
  users[username] = { pass: password, verified: false, followers: 0, friends: [], requests: [], posts: [], inbox: {} };
  req.session.user = username;
  res.json({ success: true });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!users[username] || users[username].pass !== password) return res.json({ success: false });
  req.session.user = username;
  res.json({ success: true, user: users[username] });
});

app.post('/post', upload.single('media'), (req, res) => {
  const user = req.session.user;
  if (!user) return res.sendStatus(403);
  const newPost = {
    id: Date.now(),
    author: user,
    content: req.body.content,
    media: req.file ? '/uploads/' + req.file.filename : null,
    comments: [],
    reactions: {}
  };
  posts.unshift(newPost);
  res.json({ success: true, post: newPost });
});

app.get('/posts', (req, res) => {
  res.json(posts);
});

app.get('/session', (req, res) => {
  const user = req.session.user;
  if (user) res.json({ loggedIn: true, user, data: users[user] });
  else res.json({ loggedIn: false });
});

io.on('connection', socket => {
  socket.on('message', ({ from, to, text }) => {
    if (!messages[from]) messages[from] = {};
    if (!messages[to]) messages[to] = {};
    if (!messages[from][to]) messages[from][to] = [];
    if (!messages[to][from]) messages[to][from] = [];
    const msg = { from, text, time: new Date().toLocaleTimeString() };
    messages[from][to].push(msg);
    messages[to][from].push(msg);
    io.emit('message', { from, to, text });
  });
});

http.listen(3000, () => console.log('Server running'));


app.post('/react', (req, res) => {
  const { id, type } = req.body;
  const post = posts.find(p => p.id == id);
  if (!post.reactions[type]) post.reactions[type] = 0;
  post.reactions[type]++;
  res.json({ success: true });
});

app.post('/comment', (req, res) => {
  const { id, text } = req.body;
  const user = req.session.user;
  const post = posts.find(p => p.id == id);
  if (!post.comments) post.comments = [];
  post.comments.push({ user, text });
  res.json({ success: true });
});


app.post('/broadcast', (req, res) => {
  const user = req.session.user;
  const msg = req.body.msg;
  if (users[user] && users[user].verified) {
    Object.keys(users).forEach(u => {
      if (!users[u].inbox[user]) users[u].inbox[user] = [];
      users[u].inbox[user].push({ from: user, text: '[Broadcast] ' + msg, time: new Date().toLocaleTimeString() });
    });
    res.json({ success: true });
  } else res.sendStatus(403);
});