import { readFileSync } from 'fs';
import { parseTOML } from 'confbox';
import { camelizeSchema, configSchema } from './config.schema';

const configFile = process.env.CONFIG_FILE ?? 'config.toml';
const content = readFileSync(configFile, 'utf8');
const config = camelizeSchema(configSchema).parse(parseTOML(content));

export default config;
