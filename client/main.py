import json
import logging

import requests

API_BASE = "http://localhost:3000"

EMPTY_BYTES32 = "0x000000000000000000000000000000000000000000000000000000000000000"

logging.basicConfig(level=logging.DEBUG)


def main():
    with open("orders.json") as f:
        orders = json.load(f)

    order_keys = set([order["hash"] for order in orders])

    data = dict(
        contractAddr="0x8d12A197cB00D4747a1fe03395095ce2A5CC6819",
        orders={
            order["hash"]: [
                order["tokenGet"],
                order["amountGet"],
                order["tokenGive"],
                order["amountGive"],
                order["expires"],
                order["nonce"],
                order["user"],
                order.get("v") or 0,
                order.get("r") or EMPTY_BYTES32,
                order.get("s") or EMPTY_BYTES32,
            ]
            for order in orders
        })

    r = requests.post(API_BASE, json=data)
    response = r.json()

    print(response)
    print("Sent", len(order_keys), "orders, got back ", len(response.keys()),
          "orders")


if __name__ == "__main__":
    main()
