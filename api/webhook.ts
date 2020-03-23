import { NowRequest, NowResponse } from "@now/node";
import Telegraf from "telegraf";

const { telegram } = new Telegraf(process.env.BOT_TOKEN as string);

export default async (req: NowRequest, res: NowResponse) => {
  console.log(req.body);
  res.status(200).send("ok");
};
