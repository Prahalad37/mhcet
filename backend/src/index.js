import { createApp } from "./app.js";
import { isExplainKillSwitchActive } from "./services/ai/index.js";
import { logWarn } from "./utils/logger.js";

if (isExplainKillSwitchActive()) {
  logWarn({
    msg: "explain_kill_switch",
    hint: "EXPLAIN_KILL_SWITCH is on — explanations use mock provider only (no OpenAI/local outbound calls).",
  });
}

const port = Number(process.env.PORT) || 4000;
const app = createApp();

app.listen(port, () => {
  console.log(
    JSON.stringify({
      level: "info",
      msg: "server_listen",
      ts: new Date().toISOString(),
      port,
      nodeEnv: process.env.NODE_ENV || "development",
    })
  );
});
