import { OpenAIProvider } from "kagent-ts";
import { loadConfig } from "./config.js";

const config = loadConfig();

export function createLLM() {
  return new OpenAIProvider({
    apiKey: config.apiKey,
    model: config.model,
    baseURL: config.baseURL,
    temperature: 0.7,
    timeout: 30000,
  });
}
