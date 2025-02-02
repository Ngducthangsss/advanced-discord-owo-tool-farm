import { timeHandler } from "../utils/utils.js";
const infoCommand = {
    name: "info",
    description: "Tool Information",
    execute: (agent, message, ...args) => {
        const status = agent.captchaDetected ? agent.paused ? "**PAUSED**" : "**PENDING CAPTCHA**" : "HUNTING";
        message.reply(`__Uptime:__ **${timeHandler(agent.readyTimestamp ?? 0, Date.now())}**\n__Status:__ ${status}`);
    }
};
export default infoCommand;
