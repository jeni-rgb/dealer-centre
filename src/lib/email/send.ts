import { Resend } from "resend";
import { env } from "@/lib/env";
import type { Letter } from "./letters";

export async function sendBranded(to: string[], letter: Letter): Promise<"sent" | "skipped" | "failed"> {
  if (process.env.DEMO_MODE === "1" || !process.env.RESEND_API_KEY || to.length === 0) return "skipped";
  try {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: env.emailFrom(),
      to,
      subject: letter.subject,
      text: letter.text,
      html: letter.html,
    });
    return error ? "failed" : "sent";
  } catch (e) {
    console.error("[email]", e);
    return "failed";
  }
}
