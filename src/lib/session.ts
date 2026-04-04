import { SessionOptions } from "iron-session";

// Required env vars:
// SESSION_SECRET — 32+ char random string for iron-session
// DASHBOARD_PASSWORD — simple password gate for member routes

export interface SessionData {
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  cookieName: "acq-vantage-session",
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};
