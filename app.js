import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import expressLayouts from 'express-ejs-layouts';
import { fileURLToPath } from 'url';

// Import our routes
import homeRouter from './routes/home.js';
import selectRouter from './routes/select.js';
import saveRouter from './routes/save.js';
import exportRouter from './routes/export.js';

// Import our setup parser
import { buildMasterJson } from './lib/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

async function startServer() {
  console.log('--- University Timetable Generator Starting ---');
  
  // 1. Ensure Directories exist
  await fs.ensureDir('data');
  await fs.ensureDir('data/saved');

  // 2. Initialize database / download JSON files & generate master.json
  try {
    console.log('Initializing data schedules...');
    await buildMasterJson();
    console.log('Schedule data is ready.');
  } catch (err) {
    console.error('CRITICAL: Failed to download and parse initial schedule files:', err.message);
  }

  // 3. Configure Express Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Static files
  app.use(express.static(path.join(__dirname, 'public')));

  // 4. Set EJS View Engine & Layouts
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  
  app.use(expressLayouts);
  app.set('layout', 'layout'); // Set views/layout.ejs as default layout
  app.set('layout extractScripts', false);
  app.set('layout extractStyles', false);

  // 5. Register Modular Routers
  app.use('/', homeRouter);
  app.use('/select', selectRouter);
  app.use('/save', saveRouter);
  app.use('/export', exportRouter);

  // 6. Generic 404 handler
  app.use((req, res, next) => {
    res.status(404).render('home', {
      title: '404 - Page Not Found',
      departments: [],
      semesters: [],
      savedTimetables: [],
      errorMsg: 'The requested page was not found.'
    });
  });

  // 7. Global Error Handler
  app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).send('<h3>An unexpected server-side error occurred.</h3><p>' + err.message + '</p>');
  });

  // 8. Bind to Port 3000 on Host 0.0.0.0
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running in development mode on port ${PORT}`);
    console.log(`Access local preview at http://localhost:${PORT}`);
  });
}

startServer();
export default app;
