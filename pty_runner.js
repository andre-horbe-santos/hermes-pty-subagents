const pty = require("node-pty");

process.env.PATH = [
  "/home/hermes/.local/bin",
  "/home/hermes/.hermes/node/bin",
  process.env.PATH
].join(":");

const SAFE_ENV = Object.assign({}, process.env, {
  TERM: "xterm-256color",
  NO_COLOR: "1",
});

function stripAnsi(str) {
  return str
    .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, " ")
    .replace(/\x1B\][^\x07]*\x07/g, "")
    .replace(/\x1B[()][AB012]/g, "")
    .replace(/\x1B[=>]/g, "")
    .replace(/[\x00-\x08\x0e-\x1f\x7f]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/ {2,}/g, " ");
}

// Estados: TRUST → READY → SENT → DONE
const S = { TRUST: 0, READY: 1, SENT: 2, DONE: 3 };

function runCLI({ command, args = [], prompt, trustSignals = [], readySignals, doneSignals, timeoutMs = 120000 }) {
  return new Promise((resolve) => {
    let raw = "";
    let cleanSeen = "";           // acumulado limpo, para matching
    let state = trustSignals.length > 0 ? S.TRUST : S.READY;
    let settled = false;
    let doneTimer = null;
    let lastWrite = 0;

    const proc = pty.spawn(command, args, {
      name: "xterm-256color",
      cols: 200,
      rows: 50,
      cwd: process.env.HOME,
      env: SAFE_ENV,
    });

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(globalTimer);
      clearTimeout(doneTimer);
      try { proc.kill(); } catch (_) {}
      resolve(stripAnsi(raw));
    };

    const send = (text, delay = 400) => {
      const now = Date.now();
      if (now - lastWrite < 800) return;   // debounce global
      lastWrite = now;
      setTimeout(() => proc.write(text), delay);
    };

    const globalTimer = setTimeout(finish, timeoutMs);

    proc.onData((data) => {
      raw += data;
      cleanSeen = stripAnsi(raw);

      switch (state) {

        case S.TRUST:
          if (trustSignals.some(s => cleanSeen.includes(s))) {
            send("1\r");
            state = S.READY;   // avança independente do debounce
          }
          break;

        case S.READY:
          // Re-trust se o dialog reaparecer (ex: Gemini reinicia)
          if (trustSignals.some(s => cleanSeen.includes(s))) {
            send("1\r", 500);
            break;
          }
          if (readySignals.some(s => cleanSeen.includes(s))) {
            state = S.SENT;
            send(prompt + "\r", 700);
          }
          break;

        case S.SENT:
          if (doneSignals.some(s => cleanSeen.includes(s))) {
            clearTimeout(doneTimer);
            doneTimer = setTimeout(finish, 2500);
            state = S.DONE;
          }
          break;

        case S.DONE:
          // já agendado, não faz nada
          break;
      }
    });

    proc.onExit(() => finish());
  });
}

module.exports = { runCLI, stripAnsi };
