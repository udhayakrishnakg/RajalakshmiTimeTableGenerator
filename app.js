import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import expressLayouts from 'express-ejs-layouts';
import { fileURLToPath } from 'url';
import os from 'os';

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

    try {
        const savedDir = process.env.VERCEL ? path.join(os.tmpdir(), "saved") : "data/saved";
        await fs.ensureDir(savedDir);

        const masterExists = await fs.pathExists("data/master.json");
        if (!masterExists) {
            console.log("master.json not found. Building schedule data...");
            await buildMasterJson();
            console.log("Schedule data ready.");
        } else {
            console.log("master.json already exists. Skipping build.");
        }
    } catch (err) {
        console.error("Initialization setup failed:", err);
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

const isMain = process.argv[1] && (
    path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]) ||
    path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] + '.js')
);

if (isMain) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

export default app;
