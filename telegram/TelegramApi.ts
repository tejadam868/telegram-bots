import { NowRequest, NowResponse } from "@now/node";
import { User, Update } from "telegraf/typings/telegram-types";
import fetch from "node-fetch";

export type SendMessageResponse = {
  method: "sendMessage";
  chat_id: number;
  reply_to_message_id?: number;
  text: string;
};

export type SendPhotoResponse = {
  method: "sendPhoto";
  chat_id: number;
  reply_to_message_id?: number;
  photo: string;
};

export type WebhookResponse = SendMessageResponse | SendPhotoResponse;

export type Webhook = (update: Update) => Promise<WebhookResponse | null>;

export function createWebhook(handleUpdate: Webhook) {
  return async (req: NowRequest, res: NowResponse) => {
    const update: Update | null = req.body;

    if (!update) {
      res.status(200).send("ok");
      return;
    }

    let response;

    try {
      response = await handleUpdate(update);
    } catch (err) {
      console.error("Failed to handle update", err, update);
    }

    // Return any response to telegram since they may include actions.
    if (response) {
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(response));
      return;
    }

    res.status(200).send("");
  };
}

export async function getUser(
  chatId: number,
  userId: number
): Promise<User | undefined> {
  const params = new URLSearchParams();
  params.set("chat_id", String(chatId));
  params.set("user_id", String(userId));
  const response = await fetch(
    `https://api.telegram.org/bot${process.env.POINTZ_BOT_TOKEN}/getChatMember?${params}`
  );
  const { result } = await response.json();
  return result.user;
}
