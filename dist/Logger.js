"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor(service) {
        this.service = service;
    }
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? `, ${JSON.stringify(args)}` : '';
        return `${level}: ${message}${formattedArgs} {"service":"${this.service}","timestamp":"${timestamp}"}`;
    }
    info(message, ...args) {
        console.log(this.formatMessage('info', message, ...args));
    }
    warn(message, ...args) {
        console.warn(this.formatMessage('warn', message, ...args));
    }
    error(message, ...args) {
        console.error(this.formatMessage('error', message, ...args));
    }
    debug(message, ...args) {
        if (process.env.DEBUG) {
            console.debug(this.formatMessage('debug', message, ...args));
        }
    }
}
exports.Logger = Logger;
