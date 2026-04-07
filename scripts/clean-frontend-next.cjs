"use strict";

const fs = require("fs");
const path = require("path");

const nextDir = path.join(__dirname, "..", "frontend", ".next");

if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed frontend/.next");
} else {
  console.log("frontend/.next not present (nothing to clean)");
}
