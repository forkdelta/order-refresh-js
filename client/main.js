const fetch = require("isomorphic-unfetch");

const API_BASE = "http://localhost:3000";
const ORDERS = require("./orders.json");

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

(async () => {
  const orders = Object.fromEntries(
    ORDERS.map(
      ({
        hash,
        tokenGet,
        amountGet,
        tokenGive,
        amountGive,
        expires,
        nonce,
        user,
        v,
        r,
        s
      }) => [
        hash,
        [
          tokenGet,
          amountGet,
          tokenGive,
          amountGive,
          expires,
          nonce,
          user,
          v || 0,
          r || ZERO_BYTES32,
          s || ZERO_BYTES32
        ]
      ]
    )
  );

  const body = JSON.stringify({
    contractAddr: "0x8d12A197cB00D4747a1fe03395095ce2A5CC6819",
    orders
  });

  console.log(body);

  const response = await fetch(API_BASE, {
    method: "POST",
    body
  });
  const jsonResponse = await response.json();

  console.log(jsonResponse);
})();
