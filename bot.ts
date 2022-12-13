import { config } from "./config.ts";
import { 
  FileFlavor,
  grammy,
  hydrate,
  hydrateFiles,
  HydrateFlavor,
  autoQuote,
  autoRetry,
  Image,
  apiThrottler
} from "./deps.ts";
import { addOrUpdateUser } from "./db.ts";

export type BotContext = HydrateFlavor<FileFlavor<grammy.Context>>;

export const middleware = async (
  ctx: grammy.Context,
  next: grammy.NextFunction,
) => {
  await next();
  if (ctx.has("message") && ctx.chat?.type === "private") {
    let name: string = "";
    if (ctx.msg.from?.first_name) {
      name += ctx.msg.from?.first_name;
    }
    name += " ";
    if (ctx.msg.from?.last_name) {
      name += ctx.msg.from?.last_name;
    }
    await addOrUpdateUser(
      ctx.msg.from?.id!,
      name.trim(),
      ctx.msg.from?.username,
    );
  }
};


const handleError = async (error: grammy.BotError<grammy.Context>) => {
  const { ctx } = error;
  const err = error.error;
  console.log({
    update_id: ctx.update.update_id,
    err,
  });
};
const handlers = new grammy.Composer<BotContext>();

handlers.command(["start", "help"], async (ctx) => {
  ctx.reply(
    `Hello ${ctx.from?.first_name},\nSend me a photo or a document (less than 20 MB) and I can resize it for <a href='https://telegram.org/blog/custom-emoji'>custom emojis creations</a>.<b></b> ;)`,
    { parse_mode: "HTML" },
  );
});

handlers.on([":photo", ":document"], async (ctx) => {
  const status = await ctx.reply(
    "Checking the received input...",
    { reply_to_message_id: ctx.msg.message_id }
  )
  const file = await ctx.getFile();
  if (file.file_size && file.file_size > (20 * 1024 * 1024)) {
    return ctx.reply("The file is too big, please send me a smaller file.")
  }
  const url = await file.getUrl();
  if (!url.endsWith(".jpg") && !url.endsWith(".jpeg") && !url.endsWith(".png") && !url.endsWith(".jpg")) {
    return ctx.reply("The file is not an image.")
  }
  const response = await fetch(url);
  const data = await response.arrayBuffer();
  await status.editText("Resizing...");
  const bg = new Image(100, 100);
  let image = await Image.decode(data);
  image.resize(80, 80);
  const x = (bg.width / 2) - (image.width / 2);
  const y = (bg.height / 2) - (image.height / 2);
  bg.composite(image, x, y);
  const buffer = await bg.encode();
  await status.editText("Uploading...");
  const message = await ctx.replyWithDocument(new grammy.InputFile(buffer, "emoji.png"), {
    caption: "Size: `100x100`\nPadding: `20px`\n\nForward this to @stickers",
    parse_mode: "MarkdownV2",
    reply_markup: new grammy.InlineKeyboard().switchInlineCurrent("..."),
  });
  await message.editReplyMarkup(new grammy.InlineKeyboard().switchInline("Share", `get_${message.document.file_id}`));
});

handlers.inlineQuery(/get_(.+)/,async (ctx) => {
  const file_id = ctx.match![1];
  try {
    const file = await ctx.api.getFile(file_id);
    return await ctx.answerInlineQuery(
      [
        {
          id: Math.random().toString(10),
          type: "document",
          title: "Press to send",
          document_file_id: file.file_id,
          description: "Your file is ready to send."
        }
      ], {cache_time: 300}
    )
  } catch (error) {
    if (error instanceof grammy.BotError){
      return ctx.answerInlineQuery(
        [], {switch_pm_parameter: "start", switch_pm_text: "Invalid file id", cache_time: 300}
      )
    }
    console.log(error);
  }
  
})

handlers.on("inline_query", async (ctx) => {
  return await ctx.answerInlineQuery([], {
    switch_pm_parameter: "start",
    switch_pm_text: "Nothing's here (yet)",
    cache_time: 300,
  })
})

export const bot = new grammy.Bot<BotContext>(config.BOT_TOKEN);
bot.use(hydrate());
bot.api.config.use(hydrateFiles(bot.token));
bot.use(autoQuote);
bot.api.config.use(autoRetry());
const throttler = apiThrottler();
bot.api.config.use(throttler);
bot.catch(handleError);
bot.use(middleware);
bot.use(handlers);

await bot.api.setMyCommands([
  { command: "start", description: "Start the bot." },
]);


export default bot;
