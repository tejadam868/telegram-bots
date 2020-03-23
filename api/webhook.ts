import { NowRequest, NowResponse } from "@now/node";
import { Update } from "telegraf/typings/telegram-types";

export default async (req: NowRequest, res: NowResponse) => {
  const update: Update = req.body;
  const chatId = update.message?.chat.id;
  const messageId = update.message?.message_id;

  if (!chatId) {
    throw new Error("Update provided with no chat ID");
  }

  if (!messageId) {
    throw new Error("Update provided with no message ID");
  }

  const response = await handleUpdate(req.body);

  res.setHeader("Content-Type", "application/json");
  res.send(
    JSON.stringify({
      method: "sendMessage",
      chat_id: chatId,
      reply_to_message_id: messageId,
      text: response
    })
  );
};

async function handleUpdate(update: Update): Promise<string> {
  console.log("update", update);
  console.log("entities", update.message?.entities);

  const sender = update.message?.from;
  const recipient = update.message?.reply_to_message?.from;
  const text = update.message?.text ?? "";
  const amount = parseInt(text.replace("@pointz_bot ", "") ?? "", 10) || 0;

  return `${sender?.username} send ${recipient?.username} ${amount} points`;
}
