process.env.IS_BUILD = 'true';

import { buildMasterJson } from './lib/parser.js';

console.log("Building master.json...");
buildMasterJson()
  .then(() => {
    console.log("master.json built successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error building master.json:", err);
    process.exit(1);
  });
