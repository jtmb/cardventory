import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendEmailNotification, sendDiscordNotification, sendDiscordDmNotification } from "@/lib/notifications";

// Webhook URLs must originate from Discord's own webhook service
const DISCORD_WEBHOOK_PREFIX = "https://discord.com/api/webhooks/";
// Restrict SMTP to known mail submission ports — prevents probing arbitrary internal services
const ALLOWED_SMTP_PORTS = new Set([25, 465, 587, 2525]);

export async function POST(req: NextRequest) {
  const session = await auth();
  // Admin-only: this endpoint makes live outbound HTTP and SMTP connections
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      // Prevent SSRF to loopback and link-local addresses
      if (/^(localhost|127\.|169\.254\.|0\.0\.0\.0|::1|\[::1\])/i.test(config.smtp_host)) {
        return NextResponse.json({ error: "SMTP host not allowed" }, { status: 400 });
      }
      const smtpPort = parseInt(config.smtp_port, 10) || 587;
      if (!ALLOWED_SMTP_PORTS.has(smtpPort)) {
        return NextResponse.json({ error: `SMTP port ${smtpPort} is not permitted` }, { status: 400 });
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
        // Validate this is a genuine Discord webhook to prevent SSRF
        if (!config.discord_webhook.startsWith(DISCORD_WEBHOOK_PREFIX)) {
          return NextResponse.json(
            { error: "Webhook URL must be a valid Discord webhook (https://discord.com/api/webhooks/...)" },
            { status: 400 }
          );
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
