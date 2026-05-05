const { spawn } = require("child_process");

process.env.PATH = [
  "/home/hermes/.local/bin",
  "/home/hermes/.hermes/node/bin",
  process.env.PATH
].join(":");

function run({ command, args = [], timeoutMs = 60000 }) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn(command, args, {
      env: process.env,
      cwd: process.env.HOME,
      stdio: ["ignore", "pipe", "pipe"],
    });

    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill();
      resolve({ stdout, stderr, timedOut: true });
    }, timeoutMs);

    proc.on("close", () => {
      clearTimeout(timer);
      resolve({ stdout, stderr, timedOut: false });
    });
  });
}

module.exports = { run };
