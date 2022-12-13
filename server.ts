import bot from "./bot.ts";
import { config } from "./config.ts";
import { grammy, serve as httpServe } from "./deps.ts";

const handleUpdate = grammy.webhookCallback(bot, "std/http");

export async function serve() {
  if (config.DEV) {
    console.warn("WARNING: Development mode is turned ON");
  }
  await new Promise((_, __) =>
    setTimeout(() =>
      httpServe(async (req) => {
        if (req.method === "POST") {
          const url = new URL(req.url);
          if (url.pathname.slice(1) === bot.token) {
            try {
              return await handleUpdate(req);
            } catch (err) {
              console.error(err);
            }
          }
        }
        return Response.json(
          {
            "prod": !config.DEV,
            "bot": "@" + bot.botInfo.username,
          },
        );
      }, { port: config.PORT }), 1000)
  );
}
