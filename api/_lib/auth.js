/* auth.js — signs and verifies a login session cookie (server-only). */
'use strict';
const crypto = require('crypto');
const SECRET = process.env.AUTH_SECRET || 'PLEASE-SET-AUTH_SECRET-IN-VERCEL';
const TTL_MS = 12 * 60 * 60 * 1000; // session lasts 12 hours

function sign(username){
  const exp = Date.now() + TTL_MS;
  const payload = username + '.' + exp;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(payload + '.' + sig).toString('base64');
}
function verify(token){
  try{
    const decoded = Buffer.from(String(token), 'base64').toString('utf8');
    const parts = decoded.split('.');
    if(parts.length !== 3) return null;
    const username = parts[0], exp = parts[1], sig = parts[2];
    const expected = crypto.createHmac('sha256', SECRET).update(username + '.' + exp).digest('hex');
    if(sig.length !== expected.length) return null;
    if(!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    if(Date.now() > Number(exp)) return null;
    return username;
  }catch(e){ return null; }
}
function readCookie(req, name){
  const h = req.headers.cookie || '';
  const found = h.split(';').map(function(s){return s.trim();})
                 .find(function(s){return s.indexOf(name + '=') === 0;});
  return found ? decodeURIComponent(found.split('=').slice(1).join('=')) : null;
}
module.exports = { sign, verify, readCookie, TTL_MS };
