import bot from "./bot.ts";
import { config } from "./config.ts";
import { serve } from "./server.ts";

console.log("Initializing ...");

let FQDN: string;

if (config.DENO_APP_NAME) {
  FQDN = `https://${config.DENO_APP_NAME}.deno.dev/`;
  console.log("Using webhooks");
  const resp = await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/setWebhook?url=${FQDN}${config.BOT_TOKEN}`)
  console.log(await resp.text())
  await serve();
} else {
  await bot.init()
  console.log(`Started bot as @${bot.botInfo.username}`);
  bot.start();
}