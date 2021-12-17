import DAO from "../../../data/dao";
import { validateTransaction } from "../../../data/validation";
import { connectWeb3, defineHandlers, WEI_IN_ETH } from "../util";

const dao = new DAO();

export default defineHandlers({
    'GET': async (req, res) => {
        const userAddr = <string>req.query.user;
        if (!userAddr) {
            res.status(400).end();
            return;
        }

        const network = <string>req.query.network;

        const trans = await dao.getUserTransactions(userAddr, network);
        const addresses = Array.from(new Set(trans.flatMap(tx => [tx.addressFrom, tx.addressTo])));
        const names = await Promise.all(addresses.map(addr =>
            dao.getUser(addr).then(u => u?.name)));
        const nameMap = new Map(addresses.map((addr, i) => [addr, names[i]]));
        for (let tran of trans) {
            tran.nameFrom = nameMap.get(tran.addressFrom);
            tran.nameTo = nameMap.get(tran.addressTo);
        }

        res.status(200).json(trans);
    },
    'PUT': async (req, res) => {
        const userAddr = (<string>req.query.user).toLowerCase();
        if (!userAddr) {
            res.status(400).send('No user specified');
            return;
        }

        if (!req.session.user || req.session.user.address !== userAddr) {
            res.status(401).end();
            return;
        }

        const tran = validateTransaction(JSON.parse(req.body));
        if (!tran) {
            console.log(`Invalid transaction: ${req.body}`);
            res.status(400).send('Invalid transaction');
            return;
        }

        const web3 = connectWeb3(tran.network);
        if (!web3) {
            res.status(400).send('Invalid network ' + tran.network);
            return;
        }

        const chainTran = await web3.eth.getTransaction(tran.txHash);
        if (!chainTran) {
            res.status(404).end();
            return;
        }

        tran.addressFrom = chainTran.from?.toLowerCase();
        if (tran.addressFrom !== userAddr) {
            res.status(401).end();
            return;
        }

        tran.addressTo = chainTran.to?.toLowerCase();
        tran.amount = Number.parseFloat(chainTran.value) / WEI_IN_ETH;
        tran.timestamp = new Date().getTime();

        await dao.saveTransaction(tran, true);
        res.status(201).end();
    }
})