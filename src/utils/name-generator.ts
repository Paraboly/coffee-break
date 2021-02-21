import { uniqueNamesGenerator, Config, adjectives, colors, animals } from 'unique-names-generator';

const customConfig: Config = {
    dictionaries: [adjectives, colors, animals],
    separator: '-',
    length: 3,
  };

export default function randomName(): string {
    return uniqueNamesGenerator(customConfig);
}