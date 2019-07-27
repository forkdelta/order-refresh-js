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

    orders_data = {
        "0x64ada1eec9c11bcddad659ec9bab29f380d3ee0c40a87d25470d7118c2b693b7": [
            '0xf4134146af2d511dd5ea8cdb1c4ac88c57d60404',
            '198000000000000000000000000000000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '1980000000000000000', '10000000000005693000', '271215277',
            '0x6cdea8e07bf82d7a07dbf36642d6e5be8623845c', '27',
            '0x7d69499e14919cce2b71f5964fb7c38fc518317c88f2124628db1b0b5d22a345',
            '0x6da1a6345b515f6f3dabd9087c911e337c4accad01e498f87ab8c5996b5297c1'
        ]
    }

    orders_data.update({
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

    orders_data.update({
        "0x64ada1eec9c11bcddad659ec9bab29f380d3ee0c40a87d25470d7118c2b693b7_2":
        [
            '0xf4134146af2d511dd5ea8cdb1c4ac88c57d60404',
            '198000000000000000000000000000000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '1980000000000000000', '10000000000005693000', '271215277',
            '0x6cdea8e07bf82d7a07dbf36642d6e5be8623845c', '27',
            '0x7d69499e14919cce2b71f5964fb7c38fc518317c88f2124628db1b0b5d22a345',
            '0x6da1a6345b515f6f3dabd9087c911e337c4accad01e498f87ab8c5996b5297c1'
        ]
    })

    data = dict(
        contractAddr="0x8d12A197cB00D4747a1fe03395095ce2A5CC6819",
        orders=orders_data)

    r = requests.post(API_BASE, json=data)
    response = r.json()

    print(response)
    print("Update block timestamped", response["blockNumber"])
    print("Sent", len(order_keys), "orders, got back",
          len(response["orders"].keys()), "orders")


if __name__ == "__main__":
    main()
