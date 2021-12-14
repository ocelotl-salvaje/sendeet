import DAO from "../../../../data/dao";
import { defineHandlers } from "../../util";

const dao = new DAO();

export default defineHandlers({
    'GET': async (req, res) => {
        const idString = req.query.ids;
        if (typeof idString !== 'string') {
            res.status(400).end();
            return;
        }
        const ids = idString.toLowerCase().split(',');
        const result = {};
        const users = await Promise.all(ids.map(dao.getUser));
        for (let i = 0; i<ids.length; i++) {
            const user = users[i];
            if (user) {
                result[users[i].address] = users[i].name;
            }
        }
        res.status(200).json(result);
    },
});
