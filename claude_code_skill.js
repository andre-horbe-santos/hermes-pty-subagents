const { run } = require("./runner");

async function runClaudeCode(prompt) {
  const { stdout, stderr } = await run({
    command: "claude",
    args: ["-p", prompt],
  });
  return { agent: "claude-code", output: stdout.trim() || stderr.trim() };
}

module.exports = { runClaudeCode };
