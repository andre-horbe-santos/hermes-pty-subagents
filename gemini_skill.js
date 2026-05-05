const { run } = require("./runner");

async function runGemini(prompt) {
  const { stdout, stderr } = await run({
    command: "gemini",
    args: ["-p", prompt],
  });
  // Remove warnings de terminal que vêm no stderr
  const clean = stdout.trim() || stderr.replace(/^Warning:.*\n/gm, "").trim();
  return { agent: "gemini", output: clean };
}

module.exports = { runGemini };
