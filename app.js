import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import expressLayouts from 'express-ejs-layouts';
import { fileURLToPath } from 'url';

import homeRouter from './routes/home.js';
import selectRouter from './routes/select.js';
import saveRouter from './routes/save.js';
import exportRouter from './routes/export.js';

import { buildMasterJson } from './lib/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

let initialized = false;

async function initialize() {
    if (initialized) return;
    initialized = true;

    console.log("Initializing application...");

    await fs.ensureDir("data");
    await fs.ensureDir("data/saved");

    try {
        await buildMasterJson();
        console.log("Schedule data ready.");
    } catch (err) {
        console.error(err);
    }

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(express.static(path.join(__dirname, "public")));

    app.set("view engine", "ejs");
    app.set("views", path.join(__dirname, "views"));

    app.use(expressLayouts);
    app.set("layout", "layout");

    app.use("/", homeRouter);
    app.use("/select", selectRouter);
    app.use("/save", saveRouter);
    app.use("/export", exportRouter);

    app.use((req, res) => {
        res.status(404).render("home", {
            title: "404",
            departments: [],
            semesters: [],
            savedTimetables: [],
            errorMsg: "Page not found."
        });
    });

    app.use((err, req, res, next) => {
        console.error(err);
        res.status(500).send(err.message);
    });
}

await initialize();

export default app;
