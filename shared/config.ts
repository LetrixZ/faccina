import { camelizeSchema, configSchema } from './config.schema';
import { parseTOML } from 'confbox';
import { readFileSync } from 'fs';

const configFile = process.env.CONFIG_FILE ?? 'config.toml';
const content = readFileSync(configFile, 'utf8');
const config = camelizeSchema(configSchema).parse(parseTOML(content));

export default config;
