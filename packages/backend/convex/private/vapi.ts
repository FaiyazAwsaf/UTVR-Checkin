import { VapiClient, Vapi } from "@vapi-ai/server-sdk";
import { internal } from "../_generated/api";
import { action, ActionCtx } from "../_generated/server";
import {
  areCredentialsComplete,
  getCredentialsFromEnv,
  VapiCredentials,
} from "../lib/secrets";
import { ConvexError } from "convex/values";

/**
 * Resolves the Vapi credentials for the calling organization: the keys stored
 * on the org's plugin row, falling back to the deployment-wide keys in `.env`.
 */
async function resolveVapiCredentials(
  ctx: ActionCtx
): Promise<VapiCredentials> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    });
  }

  const orgId = identity.org_id as string;

  if (!orgId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    });
  }

  const plugin = await ctx.runQuery(
    internal.system.plugins.getByOrganizationIdAndService,
    {
      organizationId: orgId,
      service: "vapi",
    },
  );

  const credentials = plugin?.credentials ?? getCredentialsFromEnv("vapi");

  if (!credentials) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Plugin not found",
    });
  }

  if (!areCredentialsComplete("vapi", credentials)) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Credentials incomplete. Please reconnect your Vapi account.",
    });
  }

  return credentials;
}

export const getAssistants = action({
  args: {},
  handler: async (ctx): Promise<Vapi.Assistant[]> => {
    const { privateApiKey } = await resolveVapiCredentials(ctx);

    const vapiClient = new VapiClient({
      token: privateApiKey,
    });

    const assistants = await vapiClient.assistants.list();

    return assistants;
  },
});

export const getPhoneNumbers = action({
  args: {},
  handler: async (ctx): Promise<Vapi.PhoneNumbersListResponseItem[]> => {
    const { privateApiKey } = await resolveVapiCredentials(ctx);

    const vapiClient = new VapiClient({
      token: privateApiKey,
    });

    const phoneNumbers = await vapiClient.phoneNumbers.list();

    return phoneNumbers;
  },
});
