import { Redis } from "@upstash/redis";
import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

console.log("Testing initialization...");

try {
  console.log("Initializing OpenAI...");
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy", // Prevent immediate throw if empty to test connection hang
  });
  console.log("OpenAI Initialized.");
} catch (e) {
  console.error("OpenAI Init Failed:", e);
}

try {
  console.log("Initializing Redis...");
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "https://dummy.upstash.io",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "dummy",
  });
  console.log("Redis Initialized.");

  // Test a simple operation
  // console.log("Testing Redis Ping...");
  // await redis.ping(); // This would definitely fail/hang if URL is bad
} catch (e) {
  console.error("Redis Init Failed:", e);
}

console.log("Done initialization tests.");
