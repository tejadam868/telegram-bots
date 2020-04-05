import * as airtable from "airtable";

export type PointsRecord = {
  chat_id: number;
  user_id: number;
  points: number;
};

const table = airtable.base("app3AKqySx0bYlNue");
const pointsTable = table<PointsRecord>("points");

export async function assignPointsToUser(
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

export async function getPointsLeaderboard(
  chatId: number
): Promise<airtable.Record<PointsRecord>[]> {
  return new Promise((res, rej) => {
    pointsTable
      .select({
        filterByFormula: `{chat_id} = ${chatId}`,
        sort: [{ field: "points", direction: "desc" }],
      })
      .firstPage(async (err, records) => {
        if (err) {
          return rej(err);
        }

        res(records);
      });
  });
}

export async function getPointsRecordForUser(
  chatId: number,
  userId: number,
  initialPoints: number = 0
): Promise<airtable.Record<PointsRecord>> {
  return new Promise((res, rej) => {
    pointsTable
      .select({
        filterByFormula: `AND({chat_id} = ${chatId}, {user_id} = ${userId})`,
        pageSize: 1,
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

export async function createPointsRecord(
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
            points: initialPoints,
          },
        },
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
