/* GET /api/cities?auction=copart|iaai  ->  { names:[...] }  (auth required) */
'use strict';
const { verify, readCookie } = require('./_lib/auth.js');
const pricing = require('./_lib/pricing.js');

module.exports = function(req, res){
  const user = verify(readCookie(req, 'am_session'));
  if(!user){ res.status(401).json({ ok:false, error:'auth' }); return; }
  const auction = (req.query && req.query.auction === 'iaai') ? 'iaai' : 'copart';
  res.status(200).json({ ok:true, names: pricing.cities(auction) });
};
