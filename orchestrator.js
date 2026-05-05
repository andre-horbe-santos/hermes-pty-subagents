const { runClaudeCode } = require("./claude_code_skill");
const { runGemini }     = require("./gemini_skill");
const { runCodex }      = require("./codex_skill");

// Detecta modo automaticamente baseado no prompt
function detectMode(prompt) {
  const p = prompt.toLowerCase();

  // Tarefa de código → codex é especialista
  if (/\b(code|código|codi|função|function|script|bug|erro|error|api|sql|query|algoritmo|implementa|desenvolve|programa)\b/.test(p)) {
    return { mode: "single", agent: "codex", reason: "tarefa de código → Codex" };
  }

  // Comparação, opinião, decisão → parallel
  if (/\b(melhor|compare|comparar|diferença|versus|vs|qual escolher|opinião|recomenda|vantagem|desvantagem)\b/.test(p)) {
    return { mode: "parallel", agent: null, reason: "comparação → Parallel" };
  }

  // Perguntas factuais simples → claude (mais rápido e barato)
  if (/\b(o que é|what is|explique|explica|define|definição|como funciona|resumo|resume)\b/.test(p)) {
    return { mode: "single", agent: "claude", reason: "factual simples → Claude" };
  }

  // Pesquisa, tendências, notícias → gemini (acesso Google)
  if (/\b(pesquisa|pesquise|busca|busque|notícia|tendência|trend|atual|recente|2024|2025|2026)\b/.test(p)) {
    return { mode: "single", agent: "gemini", reason: "pesquisa/atual → Gemini" };
  }

  // Default: claude para tudo mais
  return { mode: "single", agent: "claude", reason: "default → Claude" };
}

async function orchestrate({ prompt, mode = null, agent = null }) {
  let reason = "";

  // Se modo não foi passado, detecta automaticamente
  if (!mode) {
    const detected = detectMode(prompt);
    mode   = detected.mode;
    agent  = detected.agent;
    reason = detected.reason;
  }

  console.log(`\n[Hermes] ${reason || "modo=" + mode} | prompt="${prompt}"\n`);

  if (mode === "single") {
    const runners = { claude: runClaudeCode, gemini: runGemini, codex: runCodex };
    return [await runners[agent](prompt)];
  }

  if (mode === "race") {
    return [await Promise.race([
      runClaudeCode(prompt),
      runGemini(prompt),
      runCodex(prompt),
    ])];
  }

  if (mode === "parallel") {
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
}

module.exports = { orchestrate };

if (require.main === module) {
  const prompt = process.argv[2] || "Olá!";
  const mode   = process.argv[3] || null;
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
