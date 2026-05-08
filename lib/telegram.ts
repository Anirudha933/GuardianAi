import { Bot } from "grammy";
import dotenv from "dotenv";

dotenv.config();
const token =
  process.env.TELEGRAM_BOT_TOKEN!;

export const bot =
  new Bot(token);

export async function sendTelegramMessage(
  chatId: number,
  text: string
) {

  try {

    await bot.api.sendMessage(
      chatId,
      text
    );

  } catch (err) {

    console.error(
      "[TELEGRAM SEND ERROR]",
      err
    );

  }
}