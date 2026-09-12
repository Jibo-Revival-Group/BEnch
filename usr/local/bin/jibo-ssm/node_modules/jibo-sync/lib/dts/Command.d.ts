/**
 * Commandline executable
 * @class Command
 */
export default class Command {
    allowedCommands: string[][];
    allowedOptions: string[][];
    rootPath: string;
    constructor(binDir: any);
    parse(): Promise<boolean>;
    printUsage(): void;
    processCommand(command: string, args: string[], verbose?: boolean): Promise<string>;
}
