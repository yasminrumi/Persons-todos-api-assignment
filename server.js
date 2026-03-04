// =========================================
// 👩‍💻 Yasmin Akter - Karelia UAS ICT 2026
// 📧 2310637@edu.karelia.fi
// 📚 Token Authenticated Persons + Todos API
// 🎓 Extra Assignment Submission - March 2026
// =========================================

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');
const fs = require('fs');

const app = express();
app.use(express.json()); // Use express's built-in parser

// Yasmin's Personal JWT Config
const JWT_SECRET = 'yasmin-2310637-karelia-ict-2026-super-secret-key';
const JWT_EXPIRY = '24h';

// Admin user with updated password
let users = [{ 
  id: 1, 
  email: '2310637@edu.karelia.fi', 
  password: bcrypt.hashSync('Yasmin2026?', 10) 
}];

// Pre-loaded Persons
let persons = [
  { id: uuidv4(), name: 'Nimali', email: 'nimali@karelia.fi', createdAt: new Date() },
  { id: uuidv4(), name: 'Niku', email: 'niku@karelia.fi', createdAt: new Date() },
  { id: uuidv4(), name: 'Elmi', email: 'elmi@karelia.fi', createdAt: new Date() }
];

let todos = [];

// JWT Auth Middleware (Cleaned up messages)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied. Bearer token required.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden. Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Yasmin\'s API is Running',
    student: 'Yasmin Akter (2310637@edu.karelia.fi)',
    uptime: process.uptime()
  });
});

// Login
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  res.json({ token });
});

// ===== PERSONS CRUD =====
app.get('/persons', authenticateToken, (req, res) => res.json(persons));

app.post('/persons', authenticateToken, (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
  if (persons.find(p => p.email === email)) return res.status(409).json({ error: 'Email already exists' });

  const person = { id: uuidv4(), name, email, createdAt: new Date() };
  persons.push(person);
  res.status(201).json(person);
});

app.get('/persons/:id', authenticateToken, (req, res) => {
  const person = persons.find(p => p.id === req.params.id);
  person ? res.json(person) : res.status(404).json({ error: 'Person not found' });
});

app.put('/persons/:id', authenticateToken, (req, res) => {
  const index = persons.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Person not found' });
  
  const { id, ...updateData } = req.body; // Protect ID
  persons[index] = { ...persons[index], ...updateData };
  res.json(persons[index]);
});

app.delete('/persons/:id', authenticateToken, (req, res) => {
  // Unassign todos before deleting person
  todos.forEach(todo => { if (todo.assigneeId === req.params.id) todo.assigneeId = null; });
  persons = persons.filter(p => p.id !== req.params.id);
  res.status(204).send();
});

// ===== TODOS CRUD =====
app.get('/todos', authenticateToken, (req, res) => {
  let result = todos;
  if (req.query.assigneeId) result = result.filter(t => t.assigneeId === req.query.assigneeId);
  if (req.query.unassigned === 'true') result = result.filter(t => t.assigneeId === null);
  if (req.query.state) result = result.filter(t => t.state === req.query.state);
  res.json(result);
});

app.post('/todos', authenticateToken, (req, res) => {
  const { title, assigneeId, state = 'todo' } = req.body;
  if (!title) return res.status(400).json({ error: 'Todo title is required' });
  if (assigneeId && !persons.find(p => p.id === assigneeId)) return res.status(400).json({ error: 'Invalid assignee ID' });
  
  const todo = { id: uuidv4(), title, assigneeId: assigneeId || null, state, createdAt: new Date() };
  todos.push(todo);
  res.status(201).json(todo);
});

app.put('/todos/:id', authenticateToken, (req, res) => {
  const todo = todos.find(t => t.id === req.params.id);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  
  const { id, ...updateData } = req.body; 
  Object.assign(todo, updateData);
  res.json(todo);
});

app.delete('/todos/:id', authenticateToken, (req, res) => {
  const index = todos.findIndex(t => t.id === req.params.id);
  if (index > -1) todos.splice(index, 1);
  res.status(204).send();
});

// Swagger Setup
try {
  const file = fs.readFileSync('./openapi.yaml', 'utf8');
  const openapiSpec = YAML.parse(file);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
} catch (e) {
  console.log('💡 Tip: Create an openapi.yaml file to enable Swagger documentation at /api-docs');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server: http://localhost:${PORT}`);
  console.log(`🔑 Login: 2310637@edu.karelia.fi | Yasmin2026?`);
  console.log(`📜 Docs: http://localhost:${PORT}/api-docs`);
});