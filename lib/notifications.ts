import nodemailer from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
}

export async function sendEmailNotification(
  config: SmtpConfig,
  subject: string,
  body: string
) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  await transporter.sendMail({
    from: config.from,
    to: config.to,
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
  });
}

export async function sendDiscordNotification(webhookUrl: string, message: string) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
  if (!res.ok) throw new Error(`Discord webhook returned ${res.status}: ${res.statusText}`);
}

/**
 * Send a Discord DM to a user via a bot token.
 * Requires the bot to have a common server with the user, or the user to allow DMs from server members.
 */
export async function sendDiscordDmNotification(botToken: string, userId: string, message: string) {
  // Open / fetch the DM channel for this user
  const dmRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify({ recipient_id: userId }),
  });
  if (!dmRes.ok) {
    const text = await dmRes.text().catch(() => "");
    throw new Error(`Discord DM channel open failed (${dmRes.status}): ${text}`);
  }
  const { id: channelId } = (await dmRes.json()) as { id: string };

  // Send the message
  const msgRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify({ content: message }),
  });
  if (!msgRes.ok) {
    const text = await msgRes.text().catch(() => "");
    throw new Error(`Discord DM send failed (${msgRes.status}): ${text}`);
  }
}
