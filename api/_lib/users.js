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
  { u: "admin",  p: "Oman1970",  name: "Admin" },
  { u: "mazin968",  p: "Oman1970",        name: "Almajid" },
  // { u: "client1", p: "set-a-password", name: "Client One" },
  // add more lines here...
];

module.exports = { users };
