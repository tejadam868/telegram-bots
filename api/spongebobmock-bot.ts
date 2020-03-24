import { NowRequest, NowResponse } from "@now/node";
import fetch from "node-fetch";
import * as FormData from "form-data";
import { Update, Message } from "telegraf/typings/telegram-types";

type SendMessageMethod = {
  method: "sendMessage";
  chat_id: number;
  reply_to_message_id?: number;
  text: string;
};

type SendPhotoMethod = {
  method: "sendPhoto";
  chat_id: number;
  reply_to_message_id?: number;
  photo: string;
};

type TelegramMethod = SendMessageMethod | SendPhotoMethod;

type ImgFlipResponse =
  | {
      success: true;
      data: {
        url: string;
        page_url: string;
      };
    }
  | {
      success: false;
      error_message: string;
    };

export default async (req: NowRequest, res: NowResponse) => {
  let response;

  try {
    response = await handleUpdate(req.body);
  } catch (err) {
    console.error("Failed to handle request", err, req.body);
  }

  // Return any response to telegram since they may include actions.
  if (response) {
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(response));
    return;
  }

  res.status(200).send("");
};

async function handleUpdate(update?: Update): Promise<TelegramMethod | void> {
  if (!update) {
    return;
  }

  if (!update || !update.message) {
    console.error("Update received with no message", update);
    return;
  }

  const message = update.message;
  const parent = message.reply_to_message;

  // Ignore everything except mentions
  if (message.text !== "@spongebobmock_bot" || !parent || !parent.text) {
    return;
  }

  const form = new FormData();
  form.append("template_id", "102156234");
  form.append("username", process.env.IMGFLIP_USERNAME as string);
  form.append("password", process.env.IMGFLIP_PASSWORD as string);
  form.append("boxes[0][text]", spongebobCase(parent.text));

  const fetchResponse = await fetch("https://api.imgflip.com/caption_image", {
    method: "POST",
    body: form
  });

  const response: ImgFlipResponse = await fetchResponse.json();

  if (!response.success) {
    console.error(response);
    return;
  }

  return {
    chat_id: message.chat.id,
    method: "sendPhoto",
    reply_to_message_id: message.reply_to_message?.message_id,
    photo: response.data.url
  };
}

function spongebobCase(text: string) {
  const bobbed = [];

  for (let char of text) {
    bobbed.push(Math.random() > 0.5 ? char.toUpperCase() : char.toLowerCase());
  }

  return bobbed.join("");
}
