import { Auth0Client } from "@auth0/nextjs-auth0/server";
// The real identity is used only for Auth0 protocol operations and assistance control.
export const realAuth0 = new Auth0Client();
