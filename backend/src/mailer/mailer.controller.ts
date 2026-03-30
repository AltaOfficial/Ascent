import { Controller, Get, Post } from "@nestjs/common";
import { MailerService } from "./mailer.service";

@Controller('mailer')
export class MailerController {
    constructor(private readonly mailerService: MailerService) {}

    @Get()
    sendMail(): string {
        this.mailerService.sendEmail({ from: "invite@ascentapp.cc", to: "jaedonfarr@gmail.com", subject: "Testing testing", html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#08080f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<div style="background-color:#08080f;padding:48px 24px;width:100%;">
<div style="max-width:560px;margin:0 auto;">

  <div style="text-align:center;padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,0.07);margin-bottom:36px;">
    <span style="font-size:16px;font-weight:700;color:#e8e8ec;letter-spacing:.02em;">▲ Ascent</span>
  </div>

  <div style="background-color:#111114;border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden;">
    <div style="height:2px;background:linear-gradient(to right,transparent,rgba(200,200,215,0.4),transparent);"></div>
    <div style="padding:40px 40px 36px;">

      <div style="display:inline-block;background:rgba(107,187,138,0.1);border:1px solid rgba(107,187,138,0.22);border-radius:3px;padding:4px 12px;font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#6bbb8a;margin-bottom:24px;">● Beta Access</div>

      <div style="font-size:32px;font-weight:700;letter-spacing:-.03em;color:#e8e8ec;line-height:1.1;margin-bottom:6px;">
        You're off<br>the waitlist.<span style="font-style:italic;font-weight:300;color:#7a7a8a;"> Finally.</span>
      </div>

      <p style="font-size:14px;color:#6a6a7a;line-height:1.8;margin-top:18px;margin-bottom:0;">
        Hey <strong style="color:#b8b8c8;font-weight:500;">{{name}}</strong> — your spot just opened up. You're one of the first people getting access to Ascent.
      </p>
      <p style="font-size:14px;color:#6a6a7a;line-height:1.8;margin-top:10px;">
        Use the invite code below to create your account. It's tied to this email and expires in <strong style="color:#b8b8c8;font-weight:500;">7 days</strong>.
      </p>

      <div style="background:#0a0a0f;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:20px 24px;margin:28px 0;">
        <div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#4a4a58;margin-bottom:10px;">Your invite code</div>
        <div style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;color:#e8e8ec;letter-spacing:.18em;margin-bottom:6px;">{{code}}</div>
        <div style="font-size:11px;color:#4a4a58;">Valid for <strong style="color:#6a6a7a;">{{email}}</strong> only · Expires {{expiresAt}}</div>
      </div>

      <div style="text-align:center;margin:32px 0 24px;">
        <a href="{{signupUrl}}" style="display:inline-block;background:#e8e8ec;color:#08080f;font-size:13px;font-weight:600;letter-spacing:.06em;text-decoration:none;padding:14px 36px;border-radius:6px;">
          Create my account →
        </a>
      </div>

      <div style="text-align:center;margin:16px 0;">
        <span style="font-size:11px;color:#3a3a48;letter-spacing:.08em;">or copy this link manually</span>
      </div>

      <a href="{{signupUrl}}" style="display:block;background:#0d0d14;border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:10px 14px;font-family:'Courier New',Courier,monospace;font-size:11px;color:#5a5a6a;word-break:break-all;text-decoration:none;">{{signupUrl}}</a>

      <div style="height:1px;background:rgba(255,255,255,0.06);margin:28px 0;"></div>

      <p style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#4a4a58;margin-bottom:18px;">What you're getting access to</p>

      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
        <div style="min-width:28px;height:28px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:5px;text-align:center;line-height:28px;font-size:12px;color:#7a7a8a;">◆</div>
        <div style="font-size:13px;color:#6a6a7a;line-height:1.6;padding-top:4px;"><strong style="color:#b8b8c8;font-weight:500;">Dashboard</strong> — rank, compliance score, drift allocation, rolling average</div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
        <div style="min-width:28px;height:28px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:5px;text-align:center;line-height:28px;font-size:12px;color:#7a7a8a;">□</div>
        <div style="font-size:13px;color:#6a6a7a;line-height:1.6;padding-top:4px;"><strong style="color:#b8b8c8;font-weight:500;">Tasks + Timer</strong> — kanban and list views, per-task session timer</div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
        <div style="min-width:28px;height:28px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:5px;text-align:center;line-height:28px;font-size:12px;color:#7a7a8a;">◇</div>
        <div style="font-size:13px;color:#6a6a7a;line-height:1.6;padding-top:4px;"><strong style="color:#b8b8c8;font-weight:500;">Compliance</strong> — daily rule grid, weekly % score, 30-day heatmap</div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
        <div style="min-width:28px;height:28px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:5px;text-align:center;line-height:28px;font-size:12px;color:#7a7a8a;">△</div>
        <div style="font-size:13px;color:#6a6a7a;line-height:1.6;padding-top:4px;"><strong style="color:#b8b8c8;font-weight:500;">Analytics</strong> — volatility score, drift watch, session length trends</div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
        <div style="min-width:28px;height:28px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:5px;text-align:center;line-height:28px;font-size:12px;color:#7a7a8a;">○</div>
        <div style="font-size:13px;color:#6a6a7a;line-height:1.6;padding-top:4px;"><strong style="color:#b8b8c8;font-weight:500;">AI Advisor</strong> — strategic operator. Direct. Context-aware. No fluff.</div>
      </div>

      <div style="height:1px;background:rgba(255,255,255,0.06);margin:28px 0;"></div>

      <p style="font-size:12px;color:#6a6a7a;line-height:1.8;">
        If you have any issues creating your account, reply to this email and we'll sort it out. Feedback during beta is genuinely appreciated — you're helping shape what this becomes.
      </p>

    </div>
  </div>

  <div style="text-align:center;padding-top:32px;">
    <div style="font-size:13px;font-weight:700;color:#3a3a48;letter-spacing:.04em;margin-bottom:10px;">▲ Ascent</div>
    <div style="margin-bottom:14px;">
      <a href="https://ascentapp.cc/privacy" style="font-size:11px;color:#3a3a48;text-decoration:none;margin:0 10px;">Privacy</a>
      <a href="https://ascentapp.cc/terms" style="font-size:11px;color:#3a3a48;text-decoration:none;margin:0 10px;">Terms</a>
      <a href="#" style="font-size:11px;color:#3a3a48;text-decoration:none;margin:0 10px;">Unsubscribe</a>
    </div>
    <div style="font-size:11px;color:#2a2a38;line-height:1.8;">
      You're receiving this because you joined the Ascent waitlist.<br>
      Columbus, Ohio · hello@ascentapp.cc
    </div>
  </div>

</div>
</div>

</body>
</html>`})
        return "mail sent";
    }
}