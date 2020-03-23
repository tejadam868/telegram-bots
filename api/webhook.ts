import { NowRequest, NowResponse } from "@now/node";
import Telegraf from "telegraf";

const { telegram } = new Telegraf(process.env.BOT_TOKEN as string);

export default async (req: NowRequest, res: NowResponse) => {
  const update = JSON.parse(req.body);
  console.log(update);

  res.status(200).send("ok");
};
