/* ============================================================
   pricing.js  —  SECRET. Runs only on the server (Vercel function).
   Never sent to the browser. Holds all rate tables + the math.
   Edit numbers here whenever your costs change.
   ============================================================ */
'use strict';
const DATA = require('./_data.json'); // { copart:{CITY:{port:towing}}, iaai:{...} }

/* ---- Editable rate constants ---- */
/* 40ft container TOTAL price by port (p3 = shared by 3 autos, p4 = shared by 4) */
const CT = {
  s:{name:"Savannah, GA", p3:3400, p4:3500},
  c:{name:"California",    p3:5400, p4:5500},
  n:{name:"New York",      p3:3650, p4:3750},
  t:{name:"Houston, TX",   p3:4050, p4:4150},
  w:{name:"Seattle, WA",   p3:6100, p4:6200},
  v:{name:"Norfolk, VA",   p3:3450, p4:3550}
};
const US_DEALER  = 50;
const OMAN_FEES  = 450;
const LARGE_ADDON= 150;
const HYBRID_ADDON=150;
const USD_TO_OMR = 0.385;

/* ---- Auction fee engine (verified against 6 real invoices) ---- */
const BF_BOUNDS=[49.99,99.99,199.99,299.99,349.99,399.99,449.99,499.99,549.99,599.99,699.99,799.99,899.99,999.99,1199.99,1299.99,1399.99,1499.99,1599.99,1699.99,1799.99,1999.99,2399.99,2499.99,2999.99,3499.99,3999.99,4499.99,4999.99,5499.99,5999.99,6499.99,6999.99,7499.99,7999.99,8499.99,8999.99,9999.99,10499.99,10999.99,11499.99,11999.99,12499.99,14999.99];
const BF_COPART_SECURED=[25,45,80,130,137.5,145,175,185,205,210,240,270,295,320,375,395,410,430,445,465,485,510,535,570,610,655,705,725,750,775,800,825,845,880,900,925,945,945,1000,1000,1000,1000,1000,1000];
const BF_COPART_UNSECURED=[27.5,50,90,145,155,167.5,200,210,235,240,275,312.5,342.5,370,440,460,482.5,510,530,555,582.5,620,662.5,705,775,830,927.5,935,1000,1025,1055,1085,1110,1145,1175,1200,1225,1225,1390,1390,1390,1400,1400,1400];
const BF_IAAI=[1,1,25,60,85,100,125,135,145,155,170,195,215,230,250,270,285,300,315,330,350,370,390,425,460,505,555,600,625,650,675,700,720,755,775,800,820,820,850,850,850,860,875,890];
const BID_BOUNDS=[99.99,499.99,999.99,1499.99,1999.99,3999.99,5999.99,7999.99];
const BID_PROXY=[0,40,55,75,85,100,110,125];
const BID_LIVE =[0,50,65,85,95,110,125,145];
const FIXED_COPART=130;
const FIXED_IAAI=180;

function tierVal(table,price,pct){ for(var i=0;i<BF_BOUNDS.length;i++){ if(price<=BF_BOUNDS[i]) return table[i]; } return price*pct; }
function buyerFee(auction,price,payMethod){
  if(price<=0) return 0;
  if(auction==='iaai') return tierVal(BF_IAAI,price,0.06);
  return payMethod==='unsecured' ? tierVal(BF_COPART_UNSECURED,price,0.125) : tierVal(BF_COPART_SECURED,price,0.075);
}
function bidFee(price,bidType){
  if(price<=0) return 0;
  var t=bidType==='live'?BID_LIVE:BID_PROXY;
  for(var i=0;i<BID_BOUNDS.length;i++){ if(price<=BID_BOUNDS[i]) return t[i]; }
  return bidType==='live'?160:140;
}
function fixedAuctionFee(auction){ return auction==='iaai'?FIXED_IAAI:FIXED_COPART; }
function auctionFeeFor(st,price){ if(price<=0) return 0; return buyerFee(st.auction,price,st.pay)+bidFee(price,st.bid)+fixedAuctionFee(st.auction); }

function containerShare(st,pk){ return Number(st.cars)===3 ? CT[pk].p3/3 : CT[pk].p4/4; }
function money(n){return Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function omr(n){return Number(n).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3});}
function row(label,val){return '<tr><td>'+label+'</td><td>$'+money(val)+'</td></tr>';}

function bestRoute(st){
  if(!st.city || !DATA[st.auction] || !DATA[st.auction][st.city]) return null;
  var rates=DATA[st.auction][st.city], best=null;
  for(var pk in rates){
    var tow=rates[pk], cont=containerShare(st,pk), sum=tow+cont;
    if(!best||sum<best.sum) best={port:pk,towing:tow,container:cont,sum:sum};
  }
  return best;
}

/* Returns list of city NAMES only (no prices) for the dropdown. */
function cities(auction){
  auction = (auction==='iaai')?'iaai':'copart';
  return Object.keys(DATA[auction]).sort();
}

/* Main: takes sanitized inputs, returns { html, autoFee } — numbers only, no tables. */
function compute(s){
  s = s || {};
  var st = {
    mode:   (s.mode==='ship'||s.mode==='bid')?s.mode:'buy',
    auction:(s.auction==='iaai')?'iaai':'copart',
    cars:   Number(s.cars)===3?3:4,
    size:   s.size==='large'?'large':'small',
    fuel:   s.fuel==='ev'?'ev':'gas',
    pay:'secured', bid:'live',
    customs: !!s.customs, vat: !!s.vat,
    city: (typeof s.city==='string' && s.city) ? s.city : null
  };
  var priceVal = parseFloat(s.price);
  var addlVal  = parseFloat(s.addl)||0;
  var override = parseFloat(s.auctionOverride);

  var route = bestRoute(st);
  if(!route){
    var hint = st.mode==='ship'
      ? '\u0627\u062e\u062a\u0631 \u0645\u0648\u0642\u0639 \u0627\u0644\u0645\u0632\u0627\u062f \u0644\u0639\u0631\u0636 \u0642\u064a\u0645\u0629 \u0627\u0644\u0634\u062d\u0646.<br>Select an auction location to see the shipping cost.'
      : '\u0627\u062e\u062a\u0631 \u0645\u0648\u0642\u0639 \u0627\u0644\u0645\u0632\u0627\u062f \u0648\u0623\u062f\u062e\u0644 \u0627\u0644\u0633\u0639\u0631 \u0644\u0639\u0631\u0636 \u0627\u0644\u062a\u0642\u062f\u064a\u0631.<br>Select a location and enter a price to see the estimate.';
    return { html:'<div class="res-hint">'+hint+'</div>', autoFee:null };
  }

  var sizeAdd=(st.mode!=='ship'&&st.size==='large')?LARGE_ADDON:0;
  var fuelAdd=(st.mode!=='ship'&&st.fuel==='ev')?HYBRID_ADDON:0;
  var fixed=route.towing+route.container+US_DEALER+OMAN_FEES+sizeAdd+fuelAdd+addlVal;

  var pill='<div class="route-pill">\uD83D\uDE9A Route: <b>'+escapeHtml(st.city)+'</b> &rarr; <b>'+CT[route.port].name+'</b> port</div>';

  function shipRows(){
    var s2='';
    s2+=row('Towing (auction \u2192 port) \u00b7 \u0633\u062d\u0628 \u062f\u0627\u062e\u0644\u064a', route.towing);
    s2+=row('Container share \u00b7 \u062d\u0635\u0629 \u0627\u0644\u062d\u0627\u0648\u064a\u0629 ('+CT[route.port].name+', \u00f7'+Number(st.cars)+')', route.container);
    s2+=row('US dealer fee \u00b7 \u0631\u0633\u0648\u0645 \u0648\u0643\u064a\u0644 \u0623\u0645\u0631\u064a\u0643\u0627', US_DEALER);
    s2+=row('Oman clearance &amp; fees \u00b7 \u062a\u062e\u0644\u064a\u0635 \u0639\u0645\u0627\u0646', OMAN_FEES);
    if(sizeAdd) s2+=row('Large vehicle \u00b7 \u0633\u064a\u0627\u0631\u0629 \u0643\u0628\u064a\u0631\u0629', sizeAdd);
    if(fuelAdd) s2+=row('Hybrid / EV \u00b7 \u0647\u0627\u064a\u0628\u0631\u062f/\u0643\u0647\u0631\u0628\u0627\u0626\u064a', fuelAdd);
    if(addlVal) s2+=row('Additional fee \u00b7 \u0631\u0633\u0648\u0645 \u0625\u0636\u0627\u0641\u064a\u0629', addlVal);
    return s2;
  }
  var CUST_LABEL='Customs 5% \u00b7 \u062c\u0645\u0627\u0631\u0643 5%';
  var VAT_LABEL='VAT 5% \u00b7 \u0636\u0631\u064a\u0628\u0629 5%';

  var bd='<table class="bd">', top='', autoFee=null;

  if(st.mode==='ship'){
    var shipUSD=fixed;
    bd+=shipRows();
    bd+='<tr class="total"><td>Total shipping \u00b7 \u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0634\u062d\u0646</td><td>$'+money(shipUSD)+'</td></tr>';
    top='<div class="res-top">'+
      '<div class="res-big"><div class="rl">Shipping Total (USD)</div><div class="rv">$'+money(shipUSD)+'</div></div>'+
      '<div class="res-big"><div class="rl">Shipping (OMR) \u00b7 \u0631\u064a\u0627\u0644 \u0639\u0645\u0627\u0646\u064a</div><div class="rv">'+omr(shipUSD*USD_TO_OMR)+' <small>OMR</small></div></div>'+
      '</div>';
  } else if(st.mode==='buy'){
    var priceP=isNaN(priceVal)?0:priceVal;
    var autoFeeVal=auctionFeeFor(st,priceP);
    var aFee=isNaN(override)?autoFeeVal:override;
    autoFee = priceP>0 ? autoFeeVal : null;
    var carTotal=priceP+aFee;
    var customsVal=st.customs?carTotal*0.05:0;
    var vatVal=st.vat?(carTotal+fixed+customsVal)*0.05:0;
    bd+=row('Vehicle price \u00b7 \u0633\u0639\u0631 \u0627\u0644\u0633\u064a\u0627\u0631\u0629', priceP);
    if(aFee) bd+=row('Auction fees ('+(st.auction==='iaai'?'IAAI':'Copart')+(isNaN(override)?', auto':', manual')+') \u00b7 \u0631\u0633\u0648\u0645 \u0627\u0644\u0645\u0632\u0627\u062f', aFee);
    bd+=shipRows();
    if(st.customs) bd+=row(CUST_LABEL, customsVal);
    if(st.vat) bd+=row(VAT_LABEL, vatVal);
    var totalUSD=carTotal+fixed+customsVal+vatVal;
    bd+='<tr class="total"><td>Total to Muscat \u00b7 \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a</td><td>$'+money(totalUSD)+'</td></tr>';
    top='<div class="res-top">'+
      '<div class="res-big"><div class="rl">Total (USD)</div><div class="rv">$'+money(totalUSD)+'</div></div>'+
      '<div class="res-big"><div class="rl">Total (OMR) \u00b7 \u0631\u064a\u0627\u0644 \u0639\u0645\u0627\u0646\u064a</div><div class="rv">'+omr(totalUSD*USD_TO_OMR)+' <small>OMR</small></div></div>'+
      '</div>';
  } else {
    var budget=isNaN(priceVal)?0:priceVal;
    var F=fixed;
    function totalForBid(P){
      if(P<=0) return F;
      var af2=auctionFeeFor(st,P), ct=P+af2;
      var c=st.customs?ct*0.05:0;
      var v=st.vat?(ct+F+c)*0.05:0;
      return P+af2+F+c+v;
    }
    var lo=0, hi=budget, P=0;
    if(budget>totalForBid(0)){
      for(var it=0; it<60; it++){ var mid=(lo+hi)/2; if(totalForBid(mid)<=budget){ P=mid; lo=mid; } else { hi=mid; } }
    }
    var maxBid=Math.max(P,0);
    var af=auctionFeeFor(st,maxBid);
    var customsV=st.customs?(maxBid+af)*0.05:0;
    var vatV=st.vat?(maxBid+af+F+customsV)*0.05:0;
    autoFee = maxBid>0 ? af : null;
    if(af) bd+=row('Auction fees ('+(st.auction==='iaai'?'IAAI':'Copart')+', auto) \u00b7 \u0631\u0633\u0648\u0645 \u0627\u0644\u0645\u0632\u0627\u062f', af);
    bd+=shipRows();
    if(st.customs) bd+=row(CUST_LABEL, customsV);
    if(st.vat) bd+=row(VAT_LABEL, vatV);
    bd+='<tr class="total"><td>Total deducted \u00b7 \u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062a\u0643\u0627\u0644\u064a\u0641</td><td>$'+money(af+F+customsV+vatV)+'</td></tr>';
    var warn='';
    if(budget>0 && maxBid<=0){warn='<div class="res-warn">\u26a0\ufe0f \u0627\u0644\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0623\u0642\u0644 \u0645\u0646 \u0627\u0644\u062a\u0643\u0627\u0644\u064a\u0641 \u0627\u0644\u062b\u0627\u0628\u062a\u0629 \u2014 \u0627\u0631\u0641\u0639 \u0627\u0644\u0645\u064a\u0632\u0627\u0646\u064a\u0629. / Budget is below fixed costs.</div>';}
    top='<div class="res-top">'+
      '<div class="res-big"><div class="rl">Max bid in US auction \u00b7 \u0623\u0642\u0635\u0649 \u0645\u0632\u0627\u064a\u062f\u0629</div><div class="rv">$'+money(maxBid)+'</div></div>'+
      '<div class="res-big"><div class="rl">Your budget (OMR)</div><div class="rv">'+omr(budget*USD_TO_OMR)+' <small>OMR</small></div></div>'+
      '</div>'+warn;
  }
  bd+='</table>';
  return { html: pill+top+bd, autoFee: autoFee };
}

function escapeHtml(x){ return String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

module.exports = { compute, cities };
