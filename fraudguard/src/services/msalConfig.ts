import type { Configuration, PopupRequest } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: "edd4fae2-7e3d-4bf4-a3b2-4af5d8e6f087",
    authority: "https://login.microsoftonline.com/d8c32232-86a9-4094-8164-d94b4ae5b5a1",
    // Back to app root — main.tsx now detects the popup and closes it
    // before React renders, so no second tab appears.
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
  },
};

// Minimal scopes at login = fastest popup
export const loginRequest: PopupRequest = {
  scopes: ["User.Read"],
};

// Full scopes for Graph API calls after login
export const graphRequest: PopupRequest = {
  scopes: ["User.Read", "Files.Read.All", "Sites.Read.All"],
};