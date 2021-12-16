import DAO from "../../data/dao";
import { validateSignedRequest } from "../../data/validation";
import { connectWeb3, defineHandlers } from "./util";

const dao = new DAO();

export default defineHandlers({
    'GET': async (req, res) => {
        const loggedInUser = req.session.user;
        if (loggedInUser) {
            res.status(200).json(loggedInUser);
        } else {
            res.status(401).end();
        }
    },
    'POST': async (req, res) => {
        const signedRequest = validateSignedRequest(JSON.parse(req.body));
        if (!signedRequest) {
            res.status(400).end();
            return;
        }
        const userAddr = signedRequest.data;
        const user = await dao.getUser(userAddr);
        if (!user) {
            res.status(403).end();
            return;
        }

        const web3 = connectWeb3(signedRequest.network);
        if (!web3) {
            res.status(400).end();
            return;
        }

        const signedAddr = await web3.eth.accounts.recover(userAddr, signedRequest.signature, false);
        if (signedAddr.toLowerCase() !== userAddr.toLowerCase()) {
            res.status(401).end();
            return;
        }

        req.session.user = user;
        await req.session.save();
        res.status(200).end();
    },
});
