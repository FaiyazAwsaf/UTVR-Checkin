import { openai } from "@ai-sdk/openai";
import {
  SEARCH_INTERPRETER_PROMPT,
  SEARCH_QUERY_REWRITE_PROMPT,
} from "./constants";
import rag from "./rag";
import { generateText } from "ai";

type RagContext = Parameters<typeof rag.search>[0];

const hasNonAsciiText = (value: string) => /[^\x00-\x7F]/.test(value);

const getSearchQuery = async (query: string) => {
  if (!hasNonAsciiText(query)) {
    return query;
  }

  const rewritten = await generateText({
    messages: [
      {
        role: "system",
        content: SEARCH_QUERY_REWRITE_PROMPT,
      },
      {
        role: "user",
        content: query,
      },
    ],
    model: openai.chat("gpt-4o-mini"),
  });

  return rewritten.text.trim() || query;
};

export const searchKnowledgeBase = async (
  ctx: RagContext,
  organizationId: string,
  query: string,
): Promise<string> => {
  const searchQuery = await getSearchQuery(query);
  const searchResult = await rag.search(ctx, {
    namespace: organizationId,
    query: searchQuery,
    limit: 5,
  });

  const contextText = `Found results in ${searchResult.entries
    .map((entry) => entry.title || null)
    .filter((title) => title !== null)
    .join(", ")}. Here is the context:\n\n${searchResult.text}`;

  const response = await generateText({
    messages: [
      {
        role: "system",
        content: SEARCH_INTERPRETER_PROMPT,
      },
      {
        role: "user",
        content: `User asked: "${query}"\n\nSearch results: ${contextText}`,
      },
    ],
    model: openai.chat("gpt-4o-mini"),
  });

  return response.text;
};
