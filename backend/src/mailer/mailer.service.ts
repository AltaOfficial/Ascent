import { Injectable } from "@nestjs/common";
import { Resend } from "resend";


@Injectable()
export class MailerService {
    private resend = new Resend(process.env.RESEND_API_KEY);

    sendEmail({from, to, subject, html, template}: { from?: string, to: string, subject?: string, html?: string, template?: {id: string, variables: {}} }) {

        if(template){
            this.resend.emails.send({
                to: to,
                template: template
            })
        } else if(from && to && subject && html) {
            this.resend.emails.send({
                from: from,
                to: to,
                subject: subject,
                html: html
            })
        }
    }
}