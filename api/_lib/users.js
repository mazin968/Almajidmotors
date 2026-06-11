/* ============================================================
   users.js  —  YOUR ACCOUNTS LIST.  (server-only, never exposed)

   HOW TO ADD A USER:  copy a line, change the values.
   HOW TO REMOVE A USER:  delete its line.
   After any change: save, commit, and Vercel redeploys automatically.

     u    = username (what they type to log in)
     p    = password
     name = display name shown after login (optional)

   Tip: use different passwords for each person so you can revoke one
        without affecting the others.
   ============================================================ */
'use strict';

const users = [
  { u: "admin",  p: "Change-This-123",  name: "Almajid Admin" },
  { u: "majid",  p: "Majid-2026",        name: "Almajid Motors" },
  // { u: "client1", p: "set-a-password", name: "Client One" },
  // add more lines here...
];

module.exports = { users };
