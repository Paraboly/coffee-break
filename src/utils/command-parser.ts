interface ICommandResponse {
    command: string;
    parameter: string;
}

export default function parseCommand(text: string): ICommandResponse {
    const regex = /schedule:(.*)\((.)\)/;
    const groups = regex.exec(text);
    console.log(groups);
    const command = groups?.[1];
    const parameter = groups?.[2];
    return { command, parameter };
}