import { Message, MessageEmbed, WebhookClient } from "discord.js-selfbot-v13"
import { Configuration } from "../typings/typings.js"
import { spawn } from "child_process"
import { musicCommand } from "../utils/utils.js"
import { logger } from "../utils/logger.js"


export class Notifier {
    private message: Message
    private config: Configuration
    private status: boolean = false
    private attachmentUrl?: string
    private content: string
    private unixTime: string

    private static instance: Notifier

    constructor(message: Message, config: Configuration, solved = false) {
        this.unixTime = `<t:${Math.floor(message.createdTimestamp / 1000 + 600)}:f>`
        this.message = message
        this.config = config
        this.status = solved
        this.attachmentUrl = message.attachments.first()?.url
        this.content = `${config.adminID ? `<@${config.adminID}>` : ""} Captcha Found in Channel: ${message.channel.toString()}`
    }

    public static getInstance = (message: Message, config: Configuration, solved = false) => {
        if (!Notifier.instance) {
            Notifier.instance = new Notifier(message, config, solved)
        }
        return Notifier.instance.notify()
    }

    public playSound = async () => {
        if (!this.config.musicPath) return logger.debug("Music path not found, skipping sound notification")
        try {
            spawn(musicCommand(this.config.musicPath), { shell: true, detached: true }).unref()
        } catch (error) {
            logger.error("Error playing sound notification")
            logger.error(error as Error)
        }
    }

    public sendWebhook = async () => {
        if (!this.config.webhookURL) return logger.debug("Webhook URL not found, skipping webhook notification");
        try {
            const webhook = new WebhookClient({ url: this.config.webhookURL })
            const embed = new MessageEmbed()
                .setTitle("Captcha Detected!")
                .setURL(this.message.url)
                .setDescription("**Status**: " + this.status ? "✅ **SOLVED**" : "⚠ ⚠ **UNSOLVED** ⚠ ⚠")
                .addFields([
                    { name: "Captcha type: ", value: this.attachmentUrl ? `[Image Captcha](${this.message.url})` : "[Link Captcha](https://owobot.com/captcha)" }
                ])
                .setColor("#00ddff")
                .setFooter({ text: "Copyright B2KI ADOS © since 2022", iconURL: this.message.guild?.iconURL({ format: "png" }) ?? "https://i.imgur.com/EqChQK1.png" })
                .setTimestamp()

            if (this.attachmentUrl) embed.setImage(this.attachmentUrl)
            if (!this.status) embed.addFields({ name: "Please solve the captcha before: ", value: this.unixTime })

            webhook.send({
                avatarURL: this.message.client.user?.avatarURL({ dynamic: true }) ?? "https://i.imgur.com/9wrvM38.png",
                username: "Captcha The Detective",
                content: (this.config.adminID ? `<@${this.config.adminID}>` : "" + this.content),
                embeds: embed ? [embed] : embed
            })
        } catch (error) {
            logger.error("Error sending webhook notification")
            logger.error(error as Error)
        }
    }

    public sendDM = async () => {
        if (!this.config.adminID) return logger.debug("Admin ID not found, skipping DM notification")
        const admin = this.message.client.users.cache.get(this.config.adminID)

        if (!admin) return logger.debug("Admin not found, skipping DM notification")
        try {
            if (!admin.dmChannel) await admin.createDM()
            await admin.send({
                content: (this.content + "\n**Status**: " + this.status ? "✅ **SOLVED**" : "⚠ ⚠ **UNSOLVED** ⚠ ⚠"),
                files: this.attachmentUrl ? [this.attachmentUrl] : []
            })
        } catch (error) {
            logger.error("Error sending DM notification")
            logger.error(error as Error)
        }
    }

    public callDM = async () => {
        if (!this.config.adminID) return logger.debug("Admin ID not found, skipping call notification")
        const admin = this.message.client.users.cache.get(this.config.adminID)

        if (!admin) return logger.debug("Admin not found, skipping DM notification")
        try {
            (await admin.createDM()).ring()
        } catch (error) {
            logger.error("Error calling user")
            logger.error(error as Error)
        }
    }

    public notify = async () => {
        logger.debug("Enabled notifications: " + this.config.wayNotify.join(", "))
        if (this.config.wayNotify.includes("music")) await this.playSound()
        if (this.config.wayNotify.includes("webhook")) await this.sendWebhook()
        if (this.config.wayNotify.includes("dms")) await this.sendDM()
        if (this.config.wayNotify.includes("call")) await this.callDM()
    }
}