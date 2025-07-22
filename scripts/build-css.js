const { exec } = require("child_process");
const path = require("path");

const tailwindCliPath = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "tailwindcss",
  "lib",
  "cli.js"
);
const inputFile = path.resolve(__dirname, "..", "src", "input.css");
const outputFile = path.resolve(__dirname, "..", "public", "styles.css");

const command = `node "${tailwindCliPath}" -i "${inputFile}" -o "${outputFile}" --watch`;

console.log("Starting Tailwind CSS build...");
console.log(`Executing: ${command}`);

const tailwindProcess = exec(command);

tailwindProcess.stdout.on("data", (data) => {
  console.log(`[tailwindcss] ${data.toString().trim()}`);
});

tailwindProcess.stderr.on("data", (data) => {
  console.error(`[tailwindcss-error] ${data.toString().trim()}`);
});

tailwindProcess.on("close", (code) => {
  console.log(`Tailwind CSS process exited with code ${code}`);
});
