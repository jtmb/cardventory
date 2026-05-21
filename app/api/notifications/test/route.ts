import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendEmailNotification, sendDiscordNotification, sendDiscordDmNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, config } = body as {
    type: "email" | "discord";
    config: Record<string, string>;
  };

  try {
    if (type === "email") {
      if (!config.smtp_host || !config.email_to) {
        return NextResponse.json({ error: "SMTP host and recipient are required" }, { status: 400 });
      }
      await sendEmailNotification(
        {
          host: config.smtp_host,
          port: parseInt(config.smtp_port, 10) || 587,
          secure: config.smtp_secure === "true",
          user: config.smtp_user ?? "",
          pass: config.smtp_pass ?? "",
          from: config.email_from || config.smtp_user,
          to: config.email_to,
        },
        "Cardventory — Test Notification",
        "This is a test notification from Cardventory.\n\nYour email notifications are working correctly!"
      );
    } else if (type === "discord") {
      const msg = "🧪 **Cardventory — Test Notification**\nYour Discord notifications are working correctly!";
      if (config.discord_mode === "dm") {
        if (!config.discord_bot_token || !config.discord_user_id) {
          return NextResponse.json({ error: "Bot token and user ID are required for DM notifications" }, { status: 400 });
        }
        await sendDiscordDmNotification(config.discord_bot_token, config.discord_user_id, msg);
      } else {
        if (!config.discord_webhook) {
          return NextResponse.json({ error: "Webhook URL is required" }, { status: 400 });
        }
        await sendDiscordNotification(config.discord_webhook, msg);
      }
    } else {
      return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send notification" },
      { status: 500 }
    );
  }
}
