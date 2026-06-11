/* POST /api/calculate  { ...inputs }  ->  { html, autoFee }  (auth required) */
'use strict';
const { verify, readCookie } = require('./_lib/auth.js');
const pricing = require('./_lib/pricing.js');

module.exports = function(req, res){
  if(req.method !== 'POST'){ res.status(405).json({ ok:false, error:'method' }); return; }
  const user = verify(readCookie(req, 'am_session'));
  if(!user){ res.status(401).json({ ok:false, error:'auth' }); return; }
  let body = req.body;
  if(typeof body === 'string'){ try{ body = JSON.parse(body); }catch(e){ body = {}; } }
  try{
    const out = pricing.compute(body || {});
    res.status(200).json({ ok:true, html: out.html, autoFee: out.autoFee });
  }catch(e){
    res.status(500).json({ ok:false, error:'calc' });
  }
};
