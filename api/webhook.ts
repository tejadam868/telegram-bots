import { NowRequest, NowResponse } from "@now/node";
import Telegraf from "telegraf";
import { Update } from "telegraf/typings/telegram-types";

const { telegram } = new Telegraf(process.env.BOT_TOKEN as string);

export default async (req: NowRequest, res: NowResponse) => {
  const update: Update = req.body;
  const chatId = update.message?.chat.id;

  console.log("update", update);
  console.log("entities", update.message?.entities);

  if (!chatId) {
    return;
  }

  res.setHeader("Content-Type", "application/json");

  res.send(
    JSON.stringify({
      method: "sendMessage",
      chat_id: chatId,
      text: `Message received! ${update.message?.text}`
    })
  );
};
