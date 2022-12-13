import { configAsync, cleanEnv, num, str, bool, parse } from "./deps.ts"

let dev: boolean = parse(Deno.args).dev
await configAsync({ export: dev })

export const config = cleanEnv(Deno.env.toObject(), {
    PORT: num({
      default: 80,
    }),
    BOT_TOKEN: str(),
    DEV: bool(
      {default: dev}
    ),
    DENO_APP_NAME: str({
      default: ''
    }),
    DB_URL: str(),
  })