const { runClaudeCode } = require("./claude_code_skill");
const { runGemini }     = require("./gemini_skill");
const { runCodex }      = require("./codex_skill");

async function orchestrate({ prompt, mode = "parallel", agent = null }) {
  console.log(`\n[Hermes Orchestrator] modo=${mode} | prompt="${prompt}"\n`);

  if (mode === "single") {
    const runners = { claude: runClaudeCode, gemini: runGemini, codex: runCodex };
    if (!runners[agent]) throw new Error(`Agente desconhecido: ${agent}`);
    return [await runners[agent](prompt)];
  }

  if (mode === "race") {
    return [await Promise.race([
      runClaudeCode(prompt),
      runGemini(prompt),
      runCodex(prompt),
    ])];
  }

  const results = await Promise.allSettled([
    runClaudeCode(prompt),
    runGemini(prompt),
    runCodex(prompt),
  ]);

  return results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { agent: "unknown", output: `[ERRO] ${r.reason}` }
  );
}

module.exports = { orchestrate };

if (require.main === module) {
  const prompt = process.argv[2] || "Qual é seu modelo e versão?";
  const mode   = process.argv[3] || "parallel";
  const agent  = process.argv[4] || null;

  orchestrate({ prompt, mode, agent }).then((results) => {
    console.log("\n===== RESULTADOS =====");
    results.forEach(({ agent, output }) => {
      console.log(`\n--- ${agent.toUpperCase()} ---`);
      console.log(output);
    });
    process.exit(0);
  }).catch((err) => {
    console.error("[FATAL]", err);
    process.exit(1);
  });
}
