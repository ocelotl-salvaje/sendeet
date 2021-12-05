import DAO from "../../../../data/dao";
import { defineHandlers } from "../../util";

const dao = new DAO();

export default defineHandlers({
    'GET': async (req, res) => {
        const alias = <string>req.query.alias;
        const user = await dao.getUserByAlias(alias.toLowerCase());
        if (!user) {
            res.status(404).end();
            return;
        }
        res.status(200).json(user.address);
    },
});
