import { NowRequest, NowResponse } from "@now/node";
import Telegraf from "telegraf";

const { telegram } = new Telegraf(process.env.BOT_TOKEN as string);

export default async (req: NowRequest, res: NowResponse) => {
  const me = await telegram.getMe();
  console.log(JSON.stringify(me, null, 2));
  res.status(200);
};
