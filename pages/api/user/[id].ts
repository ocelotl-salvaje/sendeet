import assert from "assert";
import { NextApiRequest } from "next";
import DAO from "../../../data/dao";
import { validateSignedRequest, validateUser } from "../../../data/validation";
import { connectWeb3, defineHandlers } from "../util";

const dao = new DAO();

function userId(req: NextApiRequest): string {
    const id = req.query.id;
    return typeof id === 'string' ? id : id[0];
}

export default defineHandlers({
    'GET': async (req, res) => {
        console.log(`Requested user: ${userId(req)}`);
        const user = await dao.getUser(userId(req));
        if (!user) {
            res.status(404).end();
            return;
        }
        res.status(200).json(user);
    },
    'PUT': async (req, res) => {
        const signedReq = validateSignedRequest(JSON.parse(req.body));
        if (!signedReq) {
            res.status(400).end();
            return;
        }
        const web3 = connectWeb3(signedReq.network);
        if (!web3) {
            res.status(400).end();
            return;
        }
        const hexData = web3.utils.utf8ToHex(signedReq.data);
        const account = await web3.eth.accounts.recover(hexData, signedReq.signature, false);
        const user = validateUser(JSON.parse(signedReq.data));
        if (!user) {
            res.status(400).end();
            return;
        }
        console.log(`Update for user ${user.address} signed by account ${account}`);
        if (user.address.toLowerCase() !== account.toLowerCase()) {
            res.status(403).end();
            return;
        }
        console.log(`Signature for address ${user.address}: ${signedReq.signature}`);
        assert(req.query.id === user.address);

        if (user.alias) {
            const existingWithAlias = await dao.getUserByAlias(user.alias);
            if (existingWithAlias) {
                res.status(409).end();
                return;
            }
        }

        const overwrite = !!req.query['overwrite'];
        const savedUser = await dao.saveUser(user, overwrite);
        res.status(200).json(savedUser);
    },
});
