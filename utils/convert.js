const BigNumber = require('big.js');

function fromRaw(raw){
    const value = BigNumber(raw.toString());
    return value.shiftedBy((config.currency.precision || 30) * -1).toNumber();
}
exports.fromRaw = fromRaw;

function toRaw(mvalue){
    const value = BigNumber(mvalue.toString());
    return value.shiftedBy(30).toString();
}
exports.toRaw = toRaw;