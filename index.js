const debug = require("debug")("server");
const { assign, chunk, zip } = require("lodash");
const { json, send } = require("micro");
const allSettled = require("promise.allsettled");

const Multicall = require("@makerdao/multicall");
const multicall = new Multicall("mainnet");
multicall.config = {
  ...multicall.config,
  rpcNode: process.env.HTTP_PROVIDER_URL
};

const ETHERDELTA_ABI = require("./etherdelta.abi.json");
const MAX_AGGREGATE_CALLS = 256;

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

function aggregateGetState(contractAddr, orders, orderKeys) {
  const calls = [
    ...orderKeys.map(key =>
      makeAmountFilledCall(contractAddr, key, orders[key])
    ),
    ...orderKeys.map(key =>
      makeAvailableVolumeCall(contractAddr, key, orders[key])
    )
  ];

  return multicall.aggregate(subcalls);
}

function promiseIsFulfilled({ status }) {
  return status === "fulfilled";
}

function promiseIsRejected({ status }) {
  return status === "rejected";
}

module.exports = async (req, res) => {
  let aggregateCallsCounter = 0;
  const aggregateWithCounter = calls => {
    aggregateCallsCounter += 1;
    return multicall.aggregate(calls);
  };

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

  let iteration = 1;
  let chunks = chunk(calls, MAX_AGGREGATE_CALLS);
  let results = {};
  while (chunks.length > 0) {
    debug(
      "Iteration %d, got chunks with lengths: %j",
      iteration,
      chunks.map(c => c.length)
    );

    const settledPromises = await allSettled(
      chunks.map(subcalls => aggregateWithCounter(subcalls))
    );

    debug(
      "aggregation promises: fulfilled: %d, rejected: %d",
      settledPromises.filter(promiseIsFulfilled).length,
      settledPromises.filter(promiseIsRejected).length
    );

    results = assign(
      results,
      ...settledPromises.filter(promiseIsFulfilled).map(({ value }) => value)
    );

    iteration += 1;
    chunks = chunk(
      settledPromises.flatMap((promise, index) =>
        promiseIsRejected(promise) && chunks[index].length > 1
          ? chunks[index]
          : []
      ),
      MAX_AGGREGATE_CALLS / 3 ** iteration
    );
  }

  debug(
    "%d orders processed in %d iterations, %d calls",
    orderKeys.length,
    iteration - 1,
    aggregateCallsCounter
  );

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
