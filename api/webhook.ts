import { NowRequest, NowResponse } from "@now/node";
import Telegraf from "telegraf";
import { Update } from "telegraf/typings/telegram-types";

const { telegram } = new Telegraf(process.env.BOT_TOKEN as string);

export default async (req: NowRequest, res: NowResponse) => {
  const update: Update = req.body;
  const chatId = update.message?.chat.id;
  const inputPoints = update.message?.text;
  const sender = update?.message?.from;
  const recipient = update?.message?.reply_to_message?.from;

  console.log("chatId", chatId);
  console.log("inputPoints", inputPoints);
  console.log("sender", sender);
  console.log("recipient", recipient);

  res.status(200).send("ok");
};
