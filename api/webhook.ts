import { NowRequest, NowResponse } from "@now/node";
import { Update, Message, User } from "telegraf/typings/telegram-types";
import * as airtable from "airtable";

type PointsRecord = {
  chat_id: string;
  user_id: string;
  points: number;
};

export default async (req: NowRequest, res: NowResponse) => {
  const update: Update = req.body;
  const message = update.message;

  if (!message?.text?.startsWith("@pointz_bot ")) {
    return res.status(200).send("ok");
  }

  const response = await handleMessage(message);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(response));
};

async function handleMessage(message: Message) {
  if (shouldAssignPoints(message)) {
    return handleAssignPoints(message);
  }

  //   if (shouldListPoints(message)) {
  //     return handleListPoints(message);
  //   }

  return;
}

function shouldAssignPoints(message: Message) {
  return (
    message.reply_to_message != null &&
    Number.isInteger(parsePointAmount(message.text ?? ""))
  );
}

function parsePointAmount(text: string) {
  return parseInt(text.replace("@pointz_bot ", ""), 10);
}

async function handleAssignPoints(message: Message) {
  const sender = message.from;
  const recipient = message.reply_to_message?.from;
  const text = message.text ?? "";
  const amount = parsePointAmount(text) || 0;

  if (sender?.id === recipient?.id && amount > 0) {
    return `You can't give points to yourself lol.`;
  }

  if (Math.abs(amount) > 10) {
    return "Nope!";
  }

  const record = await assignPointsToUser(
    String(message.chat.id),
    String(recipient?.id),
    amount
  );

  const totalPoints = record.get("points");
  const pointLabel = totalPoints === 1 ? "point" : "points";

  const response = `${getDisplayName(
    recipient
  )} has ${totalPoints} ${pointLabel}!`;

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

const table = airtable.base("app3AKqySx0bYlNue");
const pointsTable = table<PointsRecord>("points");

async function assignPointsToUser(
  chatId: string,
  userId: string,
  points: number
): Promise<airtable.Record<PointsRecord>> {
  const record = await getPointsRecord(chatId, userId);
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

async function getPointsRecord(
  chatId: string,
  userId: string,
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
  chatId: string,
  userId: string,
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
