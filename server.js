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
app.use(express.json());

const JWT_SECRET = 'yasmin-2310637-karelia-ict-2026-super-secret-key';
const JWT_EXPIRY = '24h'; // Token expiry implemented 

// In-memory database
let users = [{ 
  id: 1, 
  email: '2310637@edu.karelia.fi', 
  password: bcrypt.hashSync('Yasmin2026?', 10) 
}];

let persons = [
  { id: uuidv4(), name: 'Nimali', email: 'nimali@karelia.fi', createdAt: new Date(), updatedAt: new Date() },
  { id: uuidv4(), name: 'Niku',   email: 'niku@karelia.fi',   createdAt: new Date(), updatedAt: new Date() }
];

let todos = [];

// Middleware for token verification
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

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is running' });
});

// --- Auth Endpoints ---
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  const user = users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  res.json({ token });
});

// --- Persons Endpoints ---
app.get('/persons', authenticateToken, (req, res) => {
  res.json(persons);
});

app.get('/persons/:id', authenticateToken, (req, res) => {
  const person = persons.find(p => p.id === req.params.id);
  if (!person) return res.status(404).json({ error: 'Person not found' });
  res.json(person);
});

app.post('/persons', authenticateToken, (req, res) => {
  const { name, email } = req.body;
  
  // Validate required fields
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  // Email format validation (basic)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  // Check for duplicate email
  if (persons.find(p => p.email === email)) {
    return res.status(409).json({ error: 'Email already exists' });
  }

  const now = new Date();
  const person = { 
    id: uuidv4(), 
    name, 
    email, 
    createdAt: now, 
    updatedAt: now 
  };
  persons.push(person);
  res.status(201).json(person);
});

app.put('/persons/:id', authenticateToken, (req, res) => {
  const person = persons.find(p => p.id === req.params.id);
  if (!person) return res.status(404).json({ error: 'Person not found' });

  const { name, email } = req.body;
  
  // Validate email format if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check for duplicate email (excluding current person)
    if (email !== person.email && persons.find(p => p.email === email)) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    person.email = email;
  }
  
  if (name) person.name = name;
  person.updatedAt = new Date();
  res.json(person);
});

// 🎯 BONUS FEATURE 1: Prevent delete person with assigned todos
app.delete('/persons/:id', authenticateToken, (req, res) => {
  const person = persons.find(p => p.id === req.params.id);
  if (!person) return res.status(404).json({ error: 'Person not found' });

  // Check for assigned todos
  const assignedTodos = todos.filter(t => t.assigneeId === req.params.id);
  if (assignedTodos.length > 0) {
    return res.status(400).json({ 
      error: 'Cannot delete person with assigned todos. Unassign todos first.',
      assignedTodos: assignedTodos.map(t => ({ id: t.id, title: t.title }))
    });
  }

  persons = persons.filter(p => p.id !== req.params.id);
  res.status(204).send();
});

// --- Todos Endpoints ---
// 🎯 BONUS FEATURE 2: Pagination + Sorting on /todos
app.get('/todos', authenticateToken, (req, res) => {
  let result = [...todos];
  const { 
    page = 1, 
    limit = 10, 
    sortBy = 'createdAt', 
    order = 'desc',
    assigneeId, 
    unassigned, 
    state 
  } = req.query;

  // Apply filters
  if (assigneeId) {
    result = result.filter(t => t.assigneeId === assigneeId);
  }
  
  if (unassigned === 'true') {
    result = result.filter(t => t.assigneeId === null);
  }
  
  if (state) {
    const validStates = ['todo', 'doing', 'done'];
    if (!validStates.includes(state)) {
      return res.status(400).json({ error: 'Invalid state parameter. Must be todo, doing, or done' });
    }
    result = result.filter(t => t.state === state);
  }

  // Apply sorting
  result.sort((a, b) => {
    if (sortBy === 'title' || sortBy === 'state') {
      // String comparison
      if (order === 'desc') {
        return b[sortBy].localeCompare(a[sortBy]);
      }
      return a[sortBy].localeCompare(b[sortBy]);
    } else {
      // Date comparison (createdAt, updatedAt, dueDate)
      const dateA = new Date(a[sortBy] || 0);
      const dateB = new Date(b[sortBy] || 0);
      if (order === 'desc') {
        return dateB - dateA;
      }
      return dateA - dateB;
    }
  });

  // Apply pagination
  const start = (parseInt(page) - 1) * parseInt(limit);
  const end = start + parseInt(limit);
  const paginatedResult = result.slice(start, end);

  res.json({
    data: paginatedResult,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.length,
      pages: Math.ceil(result.length / parseInt(limit))
    }
  });
});

app.get('/todos/:id', authenticateToken, (req, res) => {
  const todo = todos.find(t => t.id === req.params.id);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  res.json(todo);
});

app.get('/persons/:id/todos', authenticateToken, (req, res) => {
  const person = persons.find(p => p.id === req.params.id);
  if (!person) return res.status(404).json({ error: 'Person not found' });
  
  const personTodos = todos.filter(t => t.assigneeId === req.params.id);
  res.json(personTodos);
});

app.post('/todos', authenticateToken, (req, res) => {
  const { title, description, assigneeId, state = 'todo', dueDate } = req.body;
  
  // Validate required fields
  if (!title) {
    return res.status(400).json({ error: 'Todo title is required' });
  }

  // State validation
  const validStates = ['todo', 'doing', 'done'];
  if (!validStates.includes(state)) {
    return res.status(400).json({ error: 'State must be todo, doing, or done' });
  }

  // Assignee validation
  if (assigneeId && !persons.find(p => p.id === assigneeId)) {
    return res.status(400).json({ error: 'Invalid assigneeId: person not found' });
  }

  // Due date validation (if provided)
  if (dueDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dueDate)) {
      return res.status(400).json({ error: 'Invalid dueDate format. Use YYYY-MM-DD' });
    }
  }

  const now = new Date();
  const todo = { 
    id: uuidv4(), 
    title, 
    description: description || null,
    assigneeId: assigneeId || null, 
    state,
    dueDate: dueDate || null,
    createdAt: now, 
    updatedAt: now
  };
  todos.push(todo);
  res.status(201).json(todo);
});

app.put('/todos/:id', authenticateToken, (req, res) => {
  const todo = todos.find(t => t.id === req.params.id);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });

  const { title, description, state, assigneeId, dueDate } = req.body;

  // Validate state if provided
  if (state !== undefined) {
    const validStates = ['todo', 'doing', 'done'];
    if (!validStates.includes(state)) {
      return res.status(400).json({ error: 'Invalid state. Must be todo, doing, or done' });
    }
    todo.state = state;
  }

  // Validate assigneeId if provided
  if (assigneeId !== undefined) {
    if (assigneeId !== null && !persons.find(p => p.id === assigneeId)) {
      return res.status(400).json({ error: 'Person not found' });
    }
    todo.assigneeId = assigneeId;
  }

  // Validate due date if provided
  if (dueDate !== undefined && dueDate !== null) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dueDate)) {
      return res.status(400).json({ error: 'Invalid dueDate format. Use YYYY-MM-DD' });
    }
  }

  if (title) todo.title = title;
  if (description !== undefined) todo.description = description;
  if (dueDate !== undefined) todo.dueDate = dueDate;
  
  todo.updatedAt = new Date();
  res.status(200).json(todo);
});

app.delete('/todos/:id', authenticateToken, (req, res) => {
  const index = todos.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Todo not found' });
  
  todos.splice(index, 1);
  res.status(204).send();
});

// 🎯 BONUS FEATURE 3: Stats endpoint
app.get('/stats', authenticateToken, (req, res) => {
  const stats = {
    persons: {
      total: persons.length,
      list: persons.map(p => ({ id: p.id, name: p.name, email: p.email }))
    },
    todos: {
      total: todos.length,
      byState: {
        todo: todos.filter(t => t.state === 'todo').length,
        doing: todos.filter(t => t.state === 'doing').length,
        done: todos.filter(t => t.state === 'done').length
      },
      byAssignment: {
        assigned: todos.filter(t => t.assigneeId !== null).length,
        unassigned: todos.filter(t => t.assigneeId === null).length
      },
      recentTodos: todos
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(t => ({ id: t.id, title: t.title, state: t.state }))
    }
  };
  
  res.json(stats);
});

// Swagger Setup
try {
  const file = fs.readFileSync('./openapi.yaml', 'utf8');
  const openapiSpec = YAML.load(file);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
  console.log('✅ Swagger UI available at http://localhost:3000/api-docs');
} catch (e) {
  console.log('⚠️ Swagger UI disabled: openapi.yaml not found or invalid');
}

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
    console.log(`📊 Stats: http://localhost:${PORT}/stats`);
    console.log(`🔑 Test login: {"email": "2310637@edu.karelia.fi", "password": "Yasmin2026?"}`);
  });
}

module.exports = app;