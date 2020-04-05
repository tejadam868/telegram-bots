import { Message, User } from "telegraf/typings/telegram-types";
import {
  createWebhook,
  WebhookResponse,
  getUser,
} from "../telegram/TelegramApi";
import { assignPointsToUser, getTopThreePoints } from "../airtable/PointsTable";

export default createWebhook(async (update) => {
  const message = update.message;

  if (!message || !message.text?.startsWith("@pointz_bot ")) {
    return null;
  }

  if (shouldAssignPoints(message)) {
    return handleAssignPoints(message);
  }

  if (shouldListPoints(message)) {
    return handleListPoints(message);
  }

  console.log("Message ignored", JSON.stringify(message, null, 2));

  return null;
});

function shouldAssignPoints(message: Message) {
  return (
    message.reply_to_message != null &&
    Number.isInteger(parsePointAmount(message.text ?? ""))
  );
}

function shouldListPoints(message: Message) {
  return (
    message.reply_to_message == null && message.text === "@pointz_bot list"
  );
}

async function handleAssignPoints(message: Message): Promise<WebhookResponse> {
  const sender = message.from;
  const recipient = message.reply_to_message?.from;
  const text = message.text ?? "";
  const amount = parsePointAmount(text) || 0;

  let response;

  if (sender?.id === recipient?.id && amount > 0) {
    response = `You can't give points to yourself lol`;
  } else if (Math.abs(amount) > 10) {
    response = "Nope!";
  } else if (
    Math.abs(amount) === 10 &&
    sender?.first_name.toLowerCase() === "shannon"
  ) {
    response = "Lol calm down Shannon";
  } else {
    const record = await assignPointsToUser(
      message.chat.id,
      recipient?.id as number,
      amount
    );

    const totalPoints = record.get("points");
    const pointLabel = totalPoints === 1 ? "point" : "points";

    response = `${getDisplayName(recipient)} has ${totalPoints} ${pointLabel} ${
      amount > 0 ? "📈" : "📉"
    }`;
  }

  return {
    method: "sendMessage",
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text: response,
  };
}

async function handleListPoints(message: Message): Promise<WebhookResponse> {
  const topPoints = await getTopThreePoints(message.chat.id);
  const topUsers = await Promise.all(
    topPoints.map((r) => getUser(r.get("chat_id"), r.get("user_id")))
  );

  return {
    method: "sendMessage",
    chat_id: message.chat.id,
    text: topUsers
      .map(
        (u, i) =>
          `${i === 0 ? "🥇" : i === 2 ? "🥈" : "🥉"}: ${getDisplayName(
            u
          )} (${topPoints[i].get("points")})`
      )
      .join("\n"),
  };
}

function parsePointAmount(text: string) {
  return parseInt(text.replace("@pointz_bot ", ""), 10);
}

function getDisplayName(user?: User) {
  if (!user) {
    return "Unknown";
  }

  return user.first_name ?? user.username;
}
