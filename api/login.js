/* POST /api/login  { username, password }  ->  sets session cookie */
'use strict';
const { users } = require('./_lib/users.js');
const { sign, TTL_MS } = require('./_lib/auth.js');

module.exports = function(req, res){
  if(req.method !== 'POST'){ res.status(405).json({ ok:false, error:'method' }); return; }
  let body = req.body;
  if(typeof body === 'string'){ try{ body = JSON.parse(body); }catch(e){ body = {}; } }
  body = body || {};
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  const u = users.find(function(x){ return x.u === username && x.p === password; });
  if(!u){
    res.status(401).json({ ok:false, error:'\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062f\u062e\u0648\u0644 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629 / Invalid login' });
    return;
  }
  const token = sign(username);
  const maxAge = Math.floor(TTL_MS / 1000);
  res.setHeader('Set-Cookie',
    'am_session=' + token + '; HttpOnly; Path=/; Max-Age=' + maxAge + '; SameSite=Lax; Secure');
  res.status(200).json({ ok:true, name: u.name || username });
};
