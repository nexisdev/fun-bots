export class Logger {
    private service: string;

    constructor(service: string) {
        this.service = service;
    }

    private formatMessage(level: string, message: string, ...args: any[]): string {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? `, ${JSON.stringify(args)}` : '';
        return `${level}: ${message}${formattedArgs} {"service":"${this.service}","timestamp":"${timestamp}"}`;
    }

    info(message: string, ...args: any[]): void {
        console.log(this.formatMessage('info', message, ...args));
    }

    warn(message: string, ...args: any[]): void {
        console.warn(this.formatMessage('warn', message, ...args));
    }

    error(message: string, ...args: any[]): void {
        console.error(this.formatMessage('error', message, ...args));
    }

    debug(message: string, ...args: any[]): void {
        if (process.env.DEBUG) {
            console.debug(this.formatMessage('debug', message, ...args));
        }
    }
} 