// importing express for our API server
const express = require('express');
// importing task routes
const taskRoutes = require('./routes/tasks');

// creating the express application
const app = express();

// middleware to parse incoming JSON request bodies
app.use(express.json());

// mounting the tasks routes at /tasks
app.use('/tasks', taskRoutes);

// error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// port configuration - default to 3000 if not specified in env
const PORT = process.env.PORT || 3000;

// only start server if run directly (so tests don't start a second server)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task API running on port ${PORT}`);
  });
}

// exporting app for supertest testing
module.exports = app;
