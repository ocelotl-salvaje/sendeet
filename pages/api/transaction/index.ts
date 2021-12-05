import { validateTransaction } from "../../../data/validation";
import { defineHandlers } from "../util";

export default defineHandlers({
    'GET': async (req, res) => {

    },
    'PUT': async (req, res) => {
        const tran = validateTransaction(JSON.parse(req.body));
        if (!tran) {
            res.status(400).write('Invalid transaction');
            return;
        }

    }
})