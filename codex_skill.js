const { run } = require("./runner");

async function runCodex(prompt) {
  const { stdout, stderr } = await run({
    command: "codex",
    args: ["exec", "--skip-git-repo-check", prompt],
    timeoutMs: 60000,
  });

  const combined = stdout + "\n" + stderr;

  const lines = combined.split("\n").filter(l => {
    const t = l.trim();
    return t.length > 0
      && !/^codex$/i.test(t)
      && !/^tokens used$/i.test(t)
      && !/^workdir:/i.test(t)
      && !/^model:/i.test(t)
      && !/^provider:/i.test(t)
      && !/^approval:/i.test(t)
      && !/^sandbox:/i.test(t)
      && !/^reasoning/i.test(t)
      && !/^session id:/i.test(t)
      && !/^OpenAI Codex/i.test(t)
      && !/^-{4,}/.test(t)
      && !/^\d[\d,]+$/.test(t)
      && !/^warning:/i.test(t)
      && !/^Reading additional/i.test(t)
      && !/^user$/i.test(t)
      && !t.startsWith("Responda")
      && !t.startsWith("Qual");
  });

  const unique = [...new Set(lines)];
  return { agent: "codex", output: unique.join("\n").trim() };
}

module.exports = { runCodex };
