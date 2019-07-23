const debug = require("debug")("server");
const { assign, chunk, zip } = require("lodash");
const { json, send } = require("micro");

const Multicall = require("@makerdao/multicall");
const multicall = new Multicall("mainnet");
multicall.config = {
  ...multicall.config,
  rpcNode: process.env.HTTP_PROVIDER_URL
};

const ETHERDELTA_ABI = require("./etherdelta.abi.json");
const MAX_AGGREGATE_CALLS = 200;

function makeMulticallCall({ abi, to, methodName, arguments, returnNames }) {
  const { inputs, outputs } = abi.find(({ name }) => name === methodName);
  const argTypes = inputs.map(({ type }) => type);

  const retval = {
    to,
    method: `${methodName}(${argTypes.join(",")})`,
    args: zip(arguments, argTypes),
    returns: zip(returnNames, outputs.map(({ type }) => type))
  };

  return retval;
}

function makeAmountFilledCall(to, key, arguments) {
  const methodName = "amountFilled";
  return makeMulticallCall({
    abi: ETHERDELTA_ABI,
    to,
    methodName,
    arguments,
    returnNames: [`${methodName}/${key}`]
  });
}

function makeAvailableVolumeCall(to, key, arguments) {
  const methodName = "availableVolume";
  return makeMulticallCall({
    abi: ETHERDELTA_ABI,
    to,
    methodName,
    arguments,
    returnNames: [`${methodName}/${key}`]
  });
}

module.exports = async (req, res) => {
  const { contractAddr, orders } = await json(req);

  const orderKeys = Object.keys(orders);
  const calls = [
    ...orderKeys.map(key =>
      makeAmountFilledCall(contractAddr, key, orders[key])
    ),
    ...orderKeys.map(key =>
      makeAvailableVolumeCall(contractAddr, key, orders[key])
    )
  ];

  const results = await Promise.all(
    chunk(calls, MAX_AGGREGATE_CALLS).map(subcalls =>
      multicall.aggregate(subcalls)
    )
  ).then(subcallResults => assign({}, ...subcallResults));

  const { blockNumber } = results;
  const returnOrders = Object.fromEntries(
    orderKeys.map(key => [
      key,
      {
        amountFilled: results[`amountFilled/${key}`],
        availableVolume: results[`availableVolume/${key}`]
      }
    ])
  );

  send(res, 200, {
    blockNumber,
    orders: returnOrders
  });
};
