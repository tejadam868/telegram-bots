import { NowRequest, NowResponse } from "@now/node";
import { Update } from "telegraf/typings/telegram-types";
import * as airtable from "airtable";

type PointsRecord = {
  chat_id: string;
  user_id: string;
  points: number;
};

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

  const response = await handleUpdate(chatId, req.body);

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

async function handleUpdate(chatId: number, update: Update): Promise<string> {
  const sender = update.message?.from;
  const recipient = update.message?.reply_to_message?.from;
  const text = update.message?.text ?? "";
  const amount = parseInt(text.replace("@pointz_bot ", "") ?? "", 10) || 0;

  if (sender?.id === recipient?.id && amount > 0) {
    return `You can't give points to yourself lol.`;
  }

  const record = await setPointsForUser(
    String(chatId),
    String(recipient?.id),
    amount
  );

  const totalPoints = record.get("points");
  const pointLabel = totalPoints === 1 ? "points" : "point";

  return `${recipient?.username} has ${totalPoints} ${pointLabel}!`;
}

const table = airtable.base("app3AKqySx0bYlNue");
const pointsTable = table<PointsRecord>("points");

async function setPointsForUser(
  chatId: string,
  userId: string,
  points: number
): Promise<airtable.Record<PointsRecord>> {
  const record = await getPointsRecord(chatId, userId);
  const newPoints = record.get("points") + points;
  record.set("points", newPoints);

  return new Promise((res, rej) =>
    record.save((err, record) => {
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
