#!/usr/bin/env bash
set -euo pipefail
C=/usr/bin/curl
B=http://localhost:3000
J=/tmp/full_nonexcluded_cookie.txt
rm -f "$J"

req(){
  local m="$1"; local p="$2"; local b="${3-}"
  if [ -n "$b" ]; then
    "$C" -sS -w '\nHTTP_STATUS:%{http_code}\n' -X "$m" "$B$p" -H 'Content-Type: application/json' -c "$J" -b "$J" --data "$b"
  else
    "$C" -sS -w '\nHTTP_STATUS:%{http_code}\n' -X "$m" "$B$p" -c "$J" -b "$J"
  fi
}
status(){ sed -n 's/^HTTP_STATUS://p' | tail -n1; }
body(){ sed '/^HTTP_STATUS:/d'; }
exp(){ [ "$1" = "$2" ] || { echo "Expected $2 got $1"; exit 1; }; }

TODAY=$(date +%F)
SFX=$(date +%s)

# AUTH endpoints
R=$(req POST /api/auth/sign-in/email '{"email":"admin@fjpshop.com","password":"admin123456"}')
exp "$(echo "$R"|status)" 200
R=$(req GET /api/auth/get-session)
exp "$(echo "$R"|status)" 200

echo "[PASS] auth sign-in/get-session"

# categories endpoints
CAT1=$(req POST /api/categories "{\"name\":\"FULL-CAT-$SFX\"}")
exp "$(echo "$CAT1"|status)" 201
CAT1_ID=$(echo "$CAT1"|body|jq -r '.data.id')
R=$(req GET /api/categories); exp "$(echo "$R"|status)" 200
R=$(req PUT "/api/categories/$CAT1_ID" "{\"name\":\"FULL-CAT-$SFX-UPD\"}"); exp "$(echo "$R"|status)" 200
CAT_TMP=$(req POST /api/categories "{\"name\":\"FULL-CAT-DEL-$SFX\"}")
CAT_TMP_ID=$(echo "$CAT_TMP"|body|jq -r '.data.id')
R=$(req DELETE "/api/categories/$CAT_TMP_ID"); exp "$(echo "$R"|status)" 200

echo "[PASS] categories endpoints"

# vendors endpoints + subroutes
V1=$(req POST /api/vendors "{\"name\":\"FULL-VENDOR-A-$SFX\",\"phone\":\"08123\",\"address\":\"Addr\",\"isActive\":true}")
V1_ID=$(echo "$V1"|body|jq -r '.data.id')
V2=$(req POST /api/vendors "{\"name\":\"FULL-VENDOR-B-$SFX\",\"phone\":\"08124\",\"address\":\"Addr\",\"isActive\":true}")
V2_ID=$(echo "$V2"|body|jq -r '.data.id')
R=$(req GET "/api/vendors?search=FULL-VENDOR-A-$SFX"); exp "$(echo "$R"|status)" 200
R=$(req GET "/api/vendors/$V2_ID"); exp "$(echo "$R"|status)" 200
R=$(req PUT "/api/vendors/$V2_ID" "{\"name\":\"FULL-VENDOR-B-$SFX-UPD\",\"phone\":\"08999\",\"address\":\"Addr2\",\"isActive\":true}"); exp "$(echo "$R"|status)" 200

echo "[PASS] vendors base endpoints"

# users endpoints
R=$(req GET /api/users); exp "$(echo "$R"|status)" 200
USR=$(req POST /api/users "{\"name\":\"Full Test User\",\"email\":\"fulltest+$SFX@example.com\",\"password\":\"password123\"}")
exp "$(echo "$USR"|status)" 201
USR_ID=$(echo "$USR"|body|jq -r '.data.id')
R=$(req GET "/api/users/$USR_ID"); exp "$(echo "$R"|status)" 200
R=$(req PUT "/api/users/$USR_ID" "{\"name\":\"Full Test User Updated\"}"); exp "$(echo "$R"|status)" 200
R=$(req DELETE "/api/users/$USR_ID"); exp "$(echo "$R"|status)" 200

echo "[PASS] users endpoints"

# customers endpoints + subroutes
C1=$(req POST /api/customers "{\"name\":\"FULL-CUSTOMER-A-$SFX\",\"phone\":\"08111\",\"address\":\"Addr\",\"isActive\":true}")
C1_ID=$(echo "$C1"|body|jq -r '.data.id')
C2=$(req POST /api/customers "{\"name\":\"FULL-CUSTOMER-B-$SFX\",\"phone\":\"08112\",\"address\":\"Addr\",\"isActive\":true}")
C2_ID=$(echo "$C2"|body|jq -r '.data.id')
R=$(req GET "/api/customers?search=FULL-CUSTOMER-A-$SFX"); exp "$(echo "$R"|status)" 200
R=$(req GET "/api/customers/$C2_ID"); exp "$(echo "$R"|status)" 200
R=$(req PUT "/api/customers/$C2_ID" "{\"name\":\"FULL-CUSTOMER-B-$SFX-UPD\",\"phone\":\"08222\",\"address\":\"Addr2\",\"isActive\":true}"); exp "$(echo "$R"|status)" 200

echo "[PASS] customers base endpoints"

# products endpoints + vendor-prices
P1=$(req POST /api/products "{\"code\":\"FULLP1$SFX\",\"name\":\"FULL PROD 1 $SFX\",\"categoryId\":\"$CAT1_ID\",\"vendorId\":\"$V1_ID\",\"unit\":\"pcs\",\"buyPrice\":10000,\"sellPrice\":15000,\"minStock\":1,\"isActive\":true}")
P1_ID=$(echo "$P1"|body|jq -r '.data.id')
P2=$(req POST /api/products "{\"code\":\"FULLP2$SFX\",\"name\":\"FULL PROD 2 $SFX\",\"categoryId\":\"$CAT1_ID\",\"vendorId\":\"$V1_ID\",\"unit\":\"pcs\",\"buyPrice\":20000,\"sellPrice\":30000,\"minStock\":1,\"isActive\":true}")
P2_ID=$(echo "$P2"|body|jq -r '.data.id')
R=$(req GET "/api/products?search=FULLP1$SFX"); exp "$(echo "$R"|status)" 200
R=$(req GET "/api/products/$P1_ID"); exp "$(echo "$R"|status)" 200
R=$(req PUT "/api/products/$P2_ID" "{\"name\":\"FULL PROD 2 $SFX UPD\",\"unit\":\"pack\",\"buyPrice\":21000,\"sellPrice\":32000,\"isActive\":true}"); exp "$(echo "$R"|status)" 200

# vendor prices routes
R=$(req GET "/api/products/$P1_ID/vendor-prices"); exp "$(echo "$R"|status)" 200
R=$(req POST "/api/products/$P1_ID/vendor-prices" "{\"vendorId\":\"$V2_ID\",\"buyPrice\":9800,\"isPreferred\":false,\"notes\":\"extra vendor\"}"); exp "$(echo "$R"|status)" 201
R=$(req GET "/api/products/$P1_ID/vendor-prices/$V2_ID"); exp "$(echo "$R"|status)" 200
R=$(req PUT "/api/products/$P1_ID/vendor-prices/$V2_ID" "{\"buyPrice\":9700,\"isPreferred\":true,\"notes\":\"preferred now\"}"); exp "$(echo "$R"|status)" 200
R=$(req DELETE "/api/products/$P1_ID/vendor-prices/$V2_ID"); exp "$(echo "$R"|status)" 200

echo "[PASS] products + vendor-prices endpoints"

# purchases routes
R=$(req POST /api/purchases/detect-price-changes "{\"items\":[{\"productId\":\"$P1_ID\",\"buyPrice\":11000},{\"productId\":\"$P2_ID\",\"buyPrice\":21000}]}")
exp "$(echo "$R"|status)" 200

# PO scenarios: partial, overpay, unpaid
PO1=$(req POST /api/purchases "{\"vendorId\":\"$V1_ID\",\"purchaseDate\":\"$TODAY\",\"items\":[{\"productId\":\"$P1_ID\",\"quantity\":10,\"buyPrice\":10000},{\"productId\":\"$P2_ID\",\"quantity\":5,\"buyPrice\":20000}],\"paidAmount\":50000,\"paymentMethod\":\"CASH\"}")
exp "$(echo "$PO1"|status)" 201
PO1_ID=$(echo "$PO1"|body|jq -r '.data.id')
PO2=$(req POST /api/purchases "{\"vendorId\":\"$V1_ID\",\"purchaseDate\":\"$TODAY\",\"items\":[{\"productId\":\"$P1_ID\",\"quantity\":1,\"buyPrice\":10000}],\"paidAmount\":15000,\"paymentMethod\":\"CASH\"}")
exp "$(echo "$PO2"|status)" 201
PO3=$(req POST /api/purchases "{\"vendorId\":\"$V1_ID\",\"purchaseDate\":\"$TODAY\",\"items\":[{\"productId\":\"$P2_ID\",\"quantity\":1,\"buyPrice\":20000}],\"paidAmount\":0,\"paymentMethod\":\"CASH\"}")
exp "$(echo "$PO3"|status)" 201

R=$(req GET "/api/purchases?vendorId=$V1_ID&page=1&limit=20"); exp "$(echo "$R"|status)" 200
R=$(req GET "/api/purchases/$PO1_ID"); exp "$(echo "$R"|status)" 200

echo "[PASS] purchases endpoints"

# stock movements routes
R=$(req GET "/api/stock-movements?productId=$P1_ID&limit=50"); exp "$(echo "$R"|status)" 200
R=$(req POST /api/stock-movements/adjust "{\"productId\":\"$P1_ID\",\"type\":\"ADJUSTMENT_IN\",\"quantity\":1,\"notes\":\"stock opname plus\"}")
exp "$(echo "$R"|status)" 201
R=$(req POST /api/stock-movements/adjust "{\"productId\":\"$P1_ID\",\"type\":\"ADJUSTMENT_OUT\",\"quantity\":1,\"notes\":\"stock opname minus\"}")
exp "$(echo "$R"|status)" 201

echo "[PASS] stock-movements endpoints"

# transactions routes scenarios
# Draft A -> PATCH -> confirm partial
TA=$(req POST /api/transactions "{\"customerId\":\"$C1_ID\",\"items\":[{\"productId\":\"$P1_ID\",\"quantity\":1,\"sellPrice\":15000,\"discountAmount\":0}],\"discountAmount\":0}")
TA_ID=$(echo "$TA"|body|jq -r '.data.id')
R=$(req PATCH "/api/transactions/$TA_ID" "{\"items\":[{\"productId\":\"$P1_ID\",\"quantity\":2,\"sellPrice\":15000,\"discountAmount\":0},{\"productId\":\"$P2_ID\",\"quantity\":1,\"sellPrice\":30000,\"discountAmount\":0}],\"discountAmount\":0}")
exp "$(echo "$R"|status)" 200
R=$(req POST "/api/transactions/$TA_ID/confirm" '{"paidAmount":10000,"paymentMethod":"CASH","packingFee":0}')
exp "$(echo "$R"|status)" 200

# Draft B -> overpay clears old debt
TB=$(req POST /api/transactions "{\"customerId\":\"$C1_ID\",\"items\":[{\"productId\":\"$P1_ID\",\"quantity\":1,\"sellPrice\":20000,\"discountAmount\":0}],\"discountAmount\":0}")
TB_ID=$(echo "$TB"|body|jq -r '.data.id')
R=$(req POST "/api/transactions/$TB_ID/confirm" '{"paidAmount":70000,"paymentMethod":"CASH","packingFee":0}')
exp "$(echo "$R"|status)" 200

# Draft C -> overpayAction deposit (no debt currently)
TC=$(req POST /api/transactions "{\"customerId\":\"$C1_ID\",\"items\":[{\"productId\":\"$P1_ID\",\"quantity\":1,\"sellPrice\":15000,\"discountAmount\":0}],\"discountAmount\":0}")
TC_ID=$(echo "$TC"|body|jq -r '.data.id')
R=$(req POST "/api/transactions/$TC_ID/confirm" '{"paidAmount":20000,"paymentMethod":"CASH","packingFee":0,"overpayAction":"deposit"}')
exp "$(echo "$R"|status)" 200

# Draft D -> unpaid debt 30000
TD=$(req POST /api/transactions "{\"customerId\":\"$C1_ID\",\"items\":[{\"productId\":\"$P2_ID\",\"quantity\":1,\"sellPrice\":30000,\"discountAmount\":0}],\"discountAmount\":0}")
TD_ID=$(echo "$TD"|body|jq -r '.data.id')
R=$(req POST "/api/transactions/$TD_ID/confirm" '{"paidAmount":0,"paymentMethod":"CASH","packingFee":0}')
exp "$(echo "$R"|status)" 200

# Draft E -> cancel
TE=$(req POST /api/transactions "{\"customerId\":\"$C1_ID\",\"items\":[{\"productId\":\"$P1_ID\",\"quantity\":1,\"sellPrice\":15000,\"discountAmount\":0}],\"discountAmount\":0}")
TE_ID=$(echo "$TE"|body|jq -r '.data.id')
R=$(req POST "/api/transactions/$TE_ID/cancel")
exp "$(echo "$R"|status)" 200

R=$(req GET "/api/transactions?page=1&limit=20"); exp "$(echo "$R"|status)" 200
R=$(req GET "/api/transactions?confirmationStatus=DRAFT&page=1&limit=20"); exp "$(echo "$R"|status)" 200
R=$(req GET "/api/transactions/$TA_ID"); exp "$(echo "$R"|status)" 200

echo "[PASS] transactions endpoints"

# debts endpoints
R=$(req GET /api/debts); exp "$(echo "$R"|status)" 200
DEBT_ID=$(echo "$R"|body|jq -r '.data[0].id')
R=$(req GET "/api/debts/$DEBT_ID"); exp "$(echo "$R"|status)" 200
R=$(req GET /api/debts/summary); exp "$(echo "$R"|status)" 200
R=$(req POST /api/debts/preview "{\"customerId\":\"$C1_ID\",\"amount\":10000}"); exp "$(echo "$R"|status)" 200
R=$(req POST /api/debts/pay "{\"customerId\":\"$C1_ID\",\"amount\":10000,\"notes\":\"full e2e pay\"}")
exp "$(echo "$R"|status)" 201

echo "[PASS] debts endpoints"

# customer subroutes
R=$(req GET "/api/customers/$C1_ID/debts"); exp "$(echo "$R"|status)" 200
R=$(req GET "/api/customers/$C1_ID/payments"); exp "$(echo "$R"|status)" 200
R=$(req GET "/api/customers/$C1_ID/ledger"); exp "$(echo "$R"|status)" 200
R=$(req GET "/api/customers/$C1_ID/deposit"); exp "$(echo "$R"|status)" 200

echo "[PASS] customer subroutes"

# vendor debts endpoints + vendor subroutes
R=$(req GET /api/vendor-debts); exp "$(echo "$R"|status)" 200
R=$(req GET /api/vendor-debts/summary); exp "$(echo "$R"|status)" 200
VDEBT_ID=$(req GET "/api/vendor-debts?vendorId=$V1_ID"|body|jq -r '.data[0].id')
R=$(req POST /api/vendor-debts/preview "{\"vendorId\":\"$V1_ID\",\"amount\":50000}"); exp "$(echo "$R"|status)" 200
R=$(req POST /api/vendor-debts/pay "{\"vendorId\":\"$V1_ID\",\"amount\":50000,\"paymentMethod\":\"CASH\",\"mode\":\"fifo\"}"); exp "$(echo "$R"|status)" 201
R=$(req POST /api/vendor-debts/pay "{\"vendorId\":\"$V1_ID\",\"vendorDebtId\":\"$VDEBT_ID\",\"amount\":120000,\"paymentMethod\":\"TRANSFER\",\"mode\":\"invoice\"}"); exp "$(echo "$R"|status)" 201
R=$(req POST /api/vendor-debts/pay "{\"vendorId\":\"$V1_ID\",\"amount\":20000,\"paymentMethod\":\"CASH\",\"mode\":\"fifo\"}"); exp "$(echo "$R"|status)" 201

R=$(req GET "/api/vendors/$V1_ID/debts"); exp "$(echo "$R"|status)" 200
R=$(req GET "/api/vendors/$V1_ID/payments"); exp "$(echo "$R"|status)" 200
R=$(req GET "/api/vendors/$V1_ID/deposit"); exp "$(echo "$R"|status)" 200
R=$(req GET "/api/vendors/$V1_ID/ledger"); exp "$(echo "$R"|status)" 200
R=$(req POST "/api/vendors/$V1_ID/ledger"); exp "$(echo "$R"|status)" 200

echo "[PASS] vendor-debt + vendor subroutes"

# deposits endpoints: list/use/return + negative
VDEP_LIST=$(req GET "/api/deposits?partyType=VENDOR&partyId=$V1_ID")
exp "$(echo "$VDEP_LIST"|status)" 200
VDEP_ID=$(echo "$VDEP_LIST"|body|jq -r '.data[0].id')
# negative cross-party use
NEG=$(req POST "/api/deposits/$VDEP_ID/use" "{\"amount\":1000,\"referenceType\":\"TEST\",\"referenceId\":\"NEG\",\"partyType\":\"CUSTOMER\",\"partyId\":\"$C2_ID\"}")
exp "$(echo "$NEG"|status)" 400
# return deposit 1000
R=$(req POST "/api/deposits/$VDEP_ID/return" '{"amount":1000,"paymentMethod":"CASH","notes":"full e2e return"}')
exp "$(echo "$R"|status)" 200

# customer deposit positive use
CDEP=$(req GET "/api/customers/$C1_ID/deposit")
CDEP_ID=$(echo "$CDEP"|body|jq -r '.data.deposits[0].id')
if [ "$CDEP_ID" != "null" ] && [ -n "$CDEP_ID" ]; then
  R=$(req POST "/api/deposits/$CDEP_ID/use" "{\"amount\":1000,\"referenceType\":\"TEST\",\"referenceId\":\"POSITIVE\",\"partyType\":\"CUSTOMER\",\"partyId\":\"$C1_ID\"}")
  exp "$(echo "$R"|status)" 200
fi

echo "[PASS] deposits endpoints"

# reports + dashboard
R=$(req GET "/api/reports/sales?dateFrom=$TODAY&dateTo=$TODAY&groupBy=day"); exp "$(echo "$R"|status)" 200
R=$(req GET "/api/reports/products?dateFrom=$TODAY&dateTo=$TODAY&categoryId=$CAT1_ID"); exp "$(echo "$R"|status)" 200
R=$(req GET /api/reports/debts); exp "$(echo "$R"|status)" 200
R=$(req GET "/api/reports/profit?dateFrom=$TODAY&dateTo=$TODAY"); exp "$(echo "$R"|status)" 200
R=$(req GET /api/dashboard); exp "$(echo "$R"|status)" 200

echo "[PASS] reports + dashboard endpoints"

# accounting reconciliation checks
# stock final expected after operations:
# purchases p1:+11 p2:+6 ; sales p1:-4 (TA2 + TB1 + TC1) p2:-2 (TA1 + TD1); adjust +1 -1 no net
# => p1=7 p2=4
P1_STOCK=$(req GET "/api/products/$P1_ID"|body|jq -r '.data.stock|tonumber')
P2_STOCK=$(req GET "/api/products/$P2_ID"|body|jq -r '.data.stock|tonumber')
[ "$P1_STOCK" = "7" ] && [ "$P2_STOCK" = "4" ] || { echo "Stock recon mismatch p1=$P1_STOCK p2=$P2_STOCK"; exit 1; }

# customer debt expected 20000 after manual pay 10000 from TD debt 30000
DEBT_REM=$(req GET "/api/debts?customerId=$C1_ID"|body|jq '[.data[].remainingAmount|tonumber]|add')
[ "$DEBT_REM" = "20000" ] || { echo "Debt recon mismatch remain=$DEBT_REM"; exit 1; }

# vendor no outstanding debt
V_OUT=$(req GET "/api/vendor-debts?vendorId=$V1_ID"|body|jq '.data|length')
[ "$V_OUT" -eq 0 ] || { echo "Vendor outstanding not zero: $V_OUT"; exit 1; }

# vendor ledger numeric integrity after payments/overpay/return
VLED=$(req GET "/api/vendors/$V1_ID/ledger"|body)
V_BAL=$(echo "$VLED"|jq -r '.data.balance|tonumber')
V_DEBIT=$(echo "$VLED"|jq -r '.data.totalDebit|tonumber')
V_CREDIT=$(echo "$VLED"|jq -r '.data.totalCredit|tonumber')
# with return 1000, expected final vendor balance = -(25000-1000)= -24000
[ "$V_DEBIT" = "231000" ] && [ "$V_CREDIT" = "255000" ] && [ "$V_BAL" = "-24000" ] || { echo "Vendor ledger recon mismatch debit=$V_DEBIT credit=$V_CREDIT bal=$V_BAL"; exit 1; }

# customer ledger balance expected: 19000 after using deposit 1000 from 5000 then debt 20000?
# deposit use creates DEPOSIT_OUT DEBIT reducing credit effect, so customer balance increases by 1000.
CLED=$(req GET "/api/customers/$C1_ID/ledger"|body)
C_BAL=$(echo "$CLED"|jq -r '.data.currentBalance|tonumber')
[ "$C_BAL" = "20000" ] || { echo "Customer ledger balance mismatch got $C_BAL"; exit 1; }

# auth sign-out endpoint
R=$(/usr/bin/curl -sS -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$B/api/auth/sign-out" -H "Content-Type: application/json" -H "Origin: $B" -c "$J" -b "$J" --data "{}")
exp "$(echo "$R"|status)" 200
R=$(req GET /api/auth/get-session)
exp "$(echo "$R"|status)" 200

echo "FULL_NONEXCLUDED_E2E_PASS"
