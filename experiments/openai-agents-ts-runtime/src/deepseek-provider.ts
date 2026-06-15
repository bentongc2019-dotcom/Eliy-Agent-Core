import { OpenAI } from "openai";
import {
  setDefaultOpenAIClient,
  setOpenAIAPI,
  setTracingDisabled
} from "@openai/agents";

export const DEEPSEEK_DEFAULT_BASE_URL = "https://api.deepseek.com";
export const DEEPSEEK_DEFAULT_MODEL = "deepseek-v4-flash";

export type DeepSeekProviderConfig = {
  apiKeyPresent: boolean;
  baseURL: string;
  model: string;
  runtimeAllowedDomain: string;
};

export function getDeepSeekProviderConfig(): DeepSeekProviderConfig {
  const baseURL = process.env.DEEPSEEK_BASE_URL || DEEPSEEK_DEFAULT_BASE_URL;
  const model = process.env.DEEPSEEK_MODEL || DEEPSEEK_DEFAULT_MODEL;
  const runtimeAllowedDomain = new URL(baseURL).host;
  return {
    apiKeyPresent: Boolean(process.env.DEEPSEEK_API_KEY),
    baseURL,
    model,
    runtimeAllowedDomain
  };
}

export function configureDeepSeekProvider(): DeepSeekProviderConfig {
  const config = getDeepSeekProviderConfig();
  process.env.RUNTIME_ALLOWED_MODEL_DOMAIN = config.runtimeAllowedDomain;

  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || "missing-deepseek-api-key",
    baseURL: config.baseURL
  });

  setDefaultOpenAIClient(client as unknown as Parameters<typeof setDefaultOpenAIClient>[0]);
  setOpenAIAPI("chat_completions");
  setTracingDisabled(true);

  return config;
}

export function createDeepSeekClient(): OpenAI {
  const config = getDeepSeekProviderConfig();
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || "missing-deepseek-api-key",
    baseURL: config.baseURL
  });
}
