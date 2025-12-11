import NextAuth, { type NextAuthOptions } from "next-auth"
import GitHubProvider from "next-auth/providers/github"
import FacebookProvider from "next-auth/providers/facebook"
import DiscordProvider from "next-auth/providers/discord";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EMAIL_TABLE = "notbryancannoyUsers";

const EmailSchema = z.object({
  email: z.string().email(),
});

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
      authorization: { params: { scope: "read:user user:email" } },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_ID ?? "",
      clientSecret: process.env.FACEBOOK_SECRET ?? "",
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async signIn({ user, profile }) {
      console.log("Full user object:", user);
      console.log("Full profile object:", profile);
      const email = user.email || profile?.email;
      console.log("Attempting sign-in for email:", email);
      const parsed = EmailSchema.safeParse({ email });
      if (!parsed.success) {
        console.log("Email validation failed:", email);
        return false;
      }
      try {
        const result = await dynamo.send(
          new GetCommand({ TableName: EMAIL_TABLE, Key: { email } })
        );
        console.log("DynamoDB result for email", email, ":", result);
        if (result.Item) {
          return true; // Email found, allow sign-in
        } else {
          console.log("Email not found in DynamoDB:", email);
          return false; // Email not found, deny sign-in
        }
      } catch (err) {
        console.error("DynamoDB error", err);
        return false;
      }
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
export default handler
