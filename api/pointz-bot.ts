import { NowRequest, NowResponse } from "@now/node";
import fetch from "node-fetch";
import { Update, Message, User } from "telegraf/typings/telegram-types";
import * as airtable from "airtable";

type PointsRecord = {
  chat_id: number;
  user_id: number;
  points: number;
};

type TelegramActionResponse = {
  method: string;
  chat_id: number;
  reply_to_message_id?: number;
  text: string;
};

export default async (req: NowRequest, res: NowResponse) => {
  const update: Update = req.body;

  if (!req.body) {
    res.status(200).send("ok");
    return;
  }

  const message = update.message;

  if (!message) {
    console.error("Update received with no message", update);
    res.status(200).send("ok");
    return;
  }

  let response;

  try {
    response = await handleMessage(message);
  } catch (err) {
    console.error("Failed to handle message", err, message);
  }

  // Return any response to telegram since they may include actions.
  if (response) {
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(response));
    return;
  }

  res.status(200).send("");
};

async function handleMessage(
  message: Message
): Promise<TelegramActionResponse | void> {
  // Ignore everything except mentions
  if (!message.text?.startsWith("@pointz_bot ")) {
    return;
  }

  if (shouldAssignPoints(message)) {
    return handleAssignPoints(message);
  }

  if (shouldListPoints(message)) {
    return handleListPoints(message);
  }
}

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

function parsePointAmount(text: string) {
  return parseInt(text.replace("@pointz_bot ", ""), 10);
}

async function handleAssignPoints(
  message: Message
): Promise<TelegramActionResponse> {
  const sender = message.from;
  const recipient = message.reply_to_message?.from;
  const text = message.text ?? "";
  const amount = parsePointAmount(text) || 0;

  let response;

  if (sender?.id === recipient?.id && amount > 0) {
    response = `You can't give points to yourself lol`;
  } else if (Math.abs(amount) > 10) {
    response = "Nope!";
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
    text: response
  };
}

function getDisplayName(user?: User) {
  if (!user) {
    return "Unknown";
  }

  return user.first_name ?? user.username;
}

async function handleListPoints(
  message: Message
): Promise<TelegramActionResponse> {
  const topPoints = await getTopThreePoints(message.chat.id);
  const topUsers = await Promise.all(
    topPoints.map(r => getUser(r.get("chat_id"), r.get("user_id")))
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
      .join("\n")
  };
}

const table = airtable.base("app3AKqySx0bYlNue");
const pointsTable = table<PointsRecord>("points");

async function assignPointsToUser(
  chatId: number,
  userId: number,
  points: number
): Promise<airtable.Record<PointsRecord>> {
  const record = await getPointsRecordForUser(chatId, userId);
  const newPoints = record.get("points") + points;
  record.set("points", newPoints);

  return new Promise((res, rej) =>
    record.save((err, _) => {
      if (err) {
        rej(err);
      } else {
        res(record);
      }
    })
  );
}

async function getTopThreePoints(
  chatId: number
): Promise<airtable.Record<PointsRecord>[]> {
  return new Promise((res, rej) => {
    pointsTable
      .select({
        filterByFormula: `{chat_id} = ${chatId}`,
        pageSize: 3,
        sort: [{ field: "points", direction: "desc" }]
      })
      .firstPage(async (err, records) => {
        if (err) {
          return rej(err);
        }

        res(records);
      });
  });
}

async function getPointsRecordForUser(
  chatId: number,
  userId: number,
  initialPoints: number = 0
): Promise<airtable.Record<PointsRecord>> {
  return new Promise((res, rej) => {
    pointsTable
      .select({
        filterByFormula: `AND({chat_id} = ${chatId}, {user_id} = ${userId})`,
        pageSize: 1
      })
      .firstPage(async (err, records) => {
        if (err) {
          return rej(err);
        }

        const record = records[0];

        res(record ?? createPointsRecord(chatId, userId, initialPoints));
      });
  });
}

async function createPointsRecord(
  chatId: number,
  userId: number,
  initialPoints: number
): Promise<airtable.Record<PointsRecord>> {
  return new Promise((res, rej) => {
    pointsTable.create(
      [
        {
          fields: {
            chat_id: chatId,
            user_id: userId,
            points: initialPoints
          }
        }
      ],
      (err, records) => {
        if (err) {
          rej(err);
        } else {
          res(records[0]);
        }
      }
    );
  });
}

async function getUser(
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
