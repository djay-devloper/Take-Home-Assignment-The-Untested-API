const express = require('express');
const taskRoutes = require('./routes/tasks');

const app = express();

app.use(express.json());

// Health check endpoint for container probes and deployment monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/tasks', taskRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Task API running on port ${PORT}`);
  });

  const gracefulShutdown = () => {
    console.log('Received kill signal, shutting down gracefully...');
    server.close(() => {
      console.log('Closed out remaining connections');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

module.exports = app;

