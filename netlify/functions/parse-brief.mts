import type { Config } from "@netlify/functions";
import { handleParseBrief } from "../lib/parse-brief-handler";

export default (req: Request) => handleParseBrief(req, { apiKey: process.env.ANTHROPIC_API_KEY });

export const config: Config = { path: "/api/parse-brief" };
