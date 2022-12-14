const express = require("express");
const router = express.Router();
const request = require('request');
const cakeabi = require('./abis/pankakeRouter.json');
const bnbabi = require('./abis/bnbabis.json');
const botabi = require('./abis/bot.json');
const Web3 = require('web3-eth');
require('dotenv').config();
const { toChecksumAddress } = require('ethereum-checksum-address')
const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config();

const provider = new HDWalletProvider({
    mnemonic: process.env.SECRET_PHRASE,
    providerOrUrl: `https://bsc-dataseed1.binance.org/`
})
const web3 = new Web3(provider);
//test providerOrUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
//variaveis uteis
const usdt = "0x55d398326f99059fF775485246999027B3197955";
const wbnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const wallet = process.env.ADDRESS;
const botCT = "0xdA25BA288C333CF04E129065BdEE3133CD81f423";
const gwei = 5000000000;
//contratos principais
const pancake = new web3.Contract(cakeabi, "0x10ED43C718714eb63d5aA57B78B54704E256024E");
const bot = new web3.Contract(botabi, botCT);
//funçoes
function er(e) {
    if (e.toString().includes(".")) {
        return "."
    } else {
        if (e.toString().includes(",")) {
            return ","
        } else {
            return ""
        }
    }
}
function valuetojson(bool, value) {
    if (bool) {
        return 0
    } else {
        return value
    }
}
function value(av, tax, dec) {
    let a = []
    let e = (parseFloat(av) / 100) * parseInt(tax)
    if (er(e).includes(".") || er(e).includes(",")) {
        a = e.toString().split(er(e))
        let repeat = a[1].toString().length <= dec
            ? "0".repeat((dec - a[1].toString().length))
            : ""
        b = a[1] + repeat
        if (a[0] <= 0) {
            return b
        } else {
            return a[0] + b
        }
    } else {
        return e.toString() + "0".repeat(dec)
    }
}


function nextblock(accountBalancemctTB, d) {
    a = (accountBalancemctTB / (10 ** d)).toString()
    if (er(a).includes(".") || er(a).includes(",")) {
        if (accountBalancemctTB.toString().length >= d) {
            return (
                a.split(er(a))[0] + '.' + a.split(er(a))[1].slice(0, 2)
            );
        } else {
            return (
                '0.' +
                '0'.repeat(d - accountBalancemctTB.toString().length) +
                accountBalancemctTB.toString().slice(0, 2)
            );
        }
    } else {
        return a;
    }
}
async function gasTX(func, ...args) {
    const data = await func(...args).estimateGas({ from: wallet })
    return data;
}
async function callTX(func, ...args) {
    const data = await func(...args).call()
    return data;
}
async function sendTX(func, callback, res, _value, ...args) {
    func(...args).estimateGas({ from: wallet })
        .then((gas) => {
            func(...args).send(
                {
                    from: wallet,
                    value: _value,
                    gas: gas
                })
                .then((gg) => {
                    var jsn = {
                        status: "success",
                        amountIn: callback[1],
                        gas: gas,
                        BNBUsage: (gas) * gwei
                    }
                    console.log(jsn)
                    res.send(jsn);
                })
        })
}

async function buydata(data, res) {
    const h = await fetch('https://connect.smartpay.com.vc/api/swapix/swapquote?currency=brl&type=buy&conv=bxbrz&profile=transfer&target=amount&amount=' + data.amount).then((response) => response.json())
    if (h.status == "ok") {
        let datap = {
            account: data.account,
            amount: value(h.data.amount_usd, 100, 18),
            amountax: 0,
            tokenACT: data.tokenACT,
            tokenBCT: data.tokenBCT
        }
        const array = await onbuytwt(datap, res, h)
        res.send(array)
    } else {
        errorreturn(h.msg)
    }
}

function inArray() {
    return {
        status: "ok",
        msg: "[100] Request ok.",
        data: {
            amount_usd: "0",
            total_brl: "0",
            fee_brl: "0",
            send_brl: "0",
            timeout: "0",
            amount_bxbrz: "0",
            price_bxbrz: "0",
            value_usd: "0",
            total_bxbrz: "0",
        }
    }
}
async function buydatain(data, res) {
    const array = await onbuytwt(data, res, inArray())
    res.send(array)
}

async function gettax(data, res) {
    const h = await onbuytwt(data, res, inArray())
    const usd = data.tokenACT == wbnb
        ? [0, h.data.BNBGasUsage]
        : await pancake.methods.getAmountsOut((h.data.BNBGasUsage).toString(), [wbnb, data.tokenACT]).call()
    let datap = {
        account: data.account,
        amount: (data.amount - usd[1]).toLocaleString('fullwide', { useGrouping: false }),
        amountax: usd[1],
        tokenACT: data.tokenACT,
        tokenBCT: data.tokenBCT
    }

    if (data.tokenACT == wbnb) {
        sendTX(bot.methods._swapWBNBpT, [datap.account, data.amount], res, 0, datap.account, datap.amount, datap.amountax, datap.tokenACT, datap.tokenBCT)
    } else {
        if (datap.tokenBCT == wbnb) {
            sendTX(bot.methods._swapTpWBNB, [datap.account, data.amount], res, 0, datap.account, datap.amount, datap.amountax, datap.tokenACT, datap.tokenBCT)
        } else {
            sendTX(bot.methods._swapTpT, [datap.account, data.amount], res, 0, datap.account, datap.amount, datap.amountax, datap.tokenACT, datap.tokenBCT)
        }
    }
}

async function approve(data, res) {
    const tk = await new web3.Contract(bnbabi, data.tokenACT);
    sendTX(tk.methods.approve, [], res, 0, data.account, (data.amount).toString())
}
async function returnusdt(account, amount, tokenACT, res) {
    const tk = await new web3.Contract(bnbabi, tokenACT);
    sendTX(tk.methods.transfer, [], res, 0, account, (amount).toString())
}


async function onbuytwt(data, res, h) {
    let account = data.account
    let amount = data.amount
    let amountax = data.amountax
    let tokenACT = data.tokenACT
    let tokenBCT = data.tokenBCT
    const tkA = new web3.Contract(bnbabi, tokenACT);
    const tk = new web3.Contract(bnbabi, tokenBCT);

    const balanceTA = await tkA.methods.balanceOf(wallet).call()

    const dec = await tk.methods.decimals().call()
    const decA = await tkA.methods.decimals().call()
    if (tokenACT != wbnb) {
        const h = await fetch('https://aywt3wreda.execute-api.eu-west-1.amazonaws.com/default/IsHoneypot?chain=bsc2&token=' + tokenACT).then((response) => response.json())
        amount = value(nextblock(amount, decA), (100 - h.BuyTax), decA);
    }
    if (tokenBCT == tokenACT) {
        errorreturn("Cannot Swap Same Token", res)
    } else {
        if (tokenACT == wbnb) {
            const gas = await gasTX(bot.methods._swapWBNBpT, account, value(nextblock(balanceTA, decA), 80, decA), value(nextblock(balanceTA, decA), 20, decA), tokenACT, tokenBCT)
            const tax = await callTX(bot.methods.quoteBNBpT, ((gas) * gwei).toString(), wbnb, tokenBCT)
            const usd = await callTX(bot.methods.quoteBNBpT, ((gas) * gwei).toString(), wbnb, usdt)
            const a = await callTX(bot.methods.quoteBNBpT, amount, tokenACT, tokenBCT)
            return ongetRequest(dec, gas, tax, usd, a, tokenACT, tokenBCT, res, h)
        } else {
            if (tokenBCT == wbnb) {
                const gas = await gasTX(bot.methods._swapTpWBNB, account, value(nextblock(balanceTA, decA), 80, decA), value(nextblock(balanceTA, decA), 20, decA), tokenACT, tokenBCT)
                const tax = ((gas) * gwei).toString()
                const usd = await callTX(bot.methods.quoteBNBpT, ((gas) * gwei).toString(), wbnb, usdt)
                const a = await callTX(bot.methods.quoteTpBNB, amount, tokenACT, tokenBCT)
                return ongetRequest(dec, gas, tax, usd, a, tokenACT, tokenBCT, res, h)
            } else {
                const gas = await gasTX(bot.methods._swapTpT, account, value(nextblock(balanceTA, decA), 80, decA), value(nextblock(balanceTA, decA), 20, decA), tokenACT, tokenBCT)
                const tax = await callTX(bot.methods.quoteBNBpT, ((gas) * gwei).toString(), wbnb, tokenBCT)
                const usd = await callTX(bot.methods.quoteBNBpT, ((gas) * gwei).toString(), wbnb, usdt)
                const a = await callTX(bot.methods.quotetpt, amount, tokenACT, tokenBCT)
                return ongetRequest(dec, gas, tax, usd, a, tokenACT, tokenBCT, res, h)
            }
        }
    }
}
async function ongetRequest(dec, gas, tax, usd, a, tokenACT, tokenBCT, res, h) {
    const p = await fetch('https://aywt3wreda.execute-api.eu-west-1.amazonaws.com/default/IsHoneypot?chain=bsc2&token=' + tokenBCT).then((response) => response.json())
    const BuyTax = 100 - parseInt(p.BuyTax)
    const aa = jsondata(
        h,
        gas,
        value(nextblock(a, dec), 100, dec),
        valuetojson(a - tax <= 0, value(nextblock(a - tax, dec), BuyTax, dec)),
        valuetojson(a - tax <= 0, nextblock(value(nextblock(a - tax, dec), BuyTax, dec), dec)),
        (gas) * gwei,
        nextblock(usd, 18)
    )
    return aa
}
async function errorreturn(error, res) {
    var e = {
        status: "error",
        msg: error,
        data: []
    }
    console.log(e)
    res.send(e);
}
function jsondata(h, _Gas, _amountOutNoGas, _amountOutGas, _amountOutGasFormated, _BNBGasUsage, _BNBGasUsageUSD) {
    var m = {
        status: h.status,
        msg: h.msg,
        data: {
            amount_usd: h.data.amount_usd,
            price_brl: h.data.price_brl,
            total_brl: h.data.total_brl,
            fee_brl: h.data.fee_brl,
            send_brl: h.data.send_brl,
            timeout: h.data.timeout,
            amount_bxbrz: h.data.amount_bxbrz,
            price_bxbrz: h.data.price_bxbrz,
            value_usd: h.data.value_usd,
            total_bxbrz: h.data.total_bxbrz,
            Gas: _Gas,
            amountOutNoGas: _amountOutNoGas,
            amountOutGas: _amountOutGas,
            amountOutGasFormated: _amountOutGasFormated,
            BNBGasUsage: _BNBGasUsage,
            BNBGasUsageUSD: _BNBGasUsageUSD
        }
    }
    return m;
}
//endpoints

router.post('/swap', function (req, res) {
    console.log("trade started");
    let data = {
        account: toChecksumAddress(req.body.who),
        amount: (req.body.amount).toString(),
        amountax: 0,
        tokenACT: toChecksumAddress(req.body.from),
        tokenBCT: toChecksumAddress(req.body.what)
    }
    try {
        gettax(data, res)
    } catch (error) {
        errorreturn(error, res)
        returnusdt(data.account, data.amount, data.tokenACT, res)
    }
});
router.get('/swapquote', function (req, res) {
    console.log("started");

    const account = req.query.account;
    const amount = req.query.amount;
    const tokenA = req.query.tokenA;
    const tokenB = req.query.tokenB;

    if (req.url == "/swapquote") { } else {
        if (req.url.includes("?")) {
            let data = {
                account: toChecksumAddress(account),
                amount: (amount).toString(),
                amountax: 0,
                tokenACT: toChecksumAddress(tokenA),
                tokenBCT: toChecksumAddress(tokenB)
            }
            try {
                buydata(data, res)
            } catch (error) {
                errorreturn(error, res)
            }

        }
    }
});
router.get('/swapquotein', function (req, res) {
    const account = req.query.account;
    const amount = req.query.amount;
    const tokenA = req.query.tokenA;
    const tokenB = req.query.tokenB;

    if (req.url == "/swapquotein") { } else {
        if (req.url.includes("?")) {
            let data = {
                account: toChecksumAddress(account),
                amount: (amount).toString(),
                amountax: 0,
                tokenACT: toChecksumAddress(tokenA),
                tokenBCT: toChecksumAddress(tokenB)
            }
            try {
                buydatain(data, res)
            } catch (error) {
                errorreturn(error, res)
            }
        }
    }
});
router.post('/approve', function (req, res) {
    let data = {
        account: botCT,
        amount: req.body.amount,
        tokenACT: toChecksumAddress(req.body.from),
    }
    try {
        approve(data, res)
    } catch (error) {
        errorreturn(error, res)
    }

});

module.exports = router;
