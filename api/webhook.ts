import { NowRequest, NowResponse } from "@now/node";
import Telegraf from "telegraf";

const { telegram } = new Telegraf(process.env.BOT_TOKEN as string);

export default async (req: NowRequest, res: NowResponse) => {
  const me = await telegram.getMe();
  res.json(me);
};
