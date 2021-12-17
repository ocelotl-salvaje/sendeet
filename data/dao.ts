import { Transaction, User } from "./model";
import { Datastore } from "@google-cloud/datastore";

const
    KIND_USER = 'user',
    KIND_TRANSACTION = 'transaction';
const NAMESPACE = 'default';
const PROJECT = 'sendeet';

function datastore(): Datastore {
    return new Datastore({
        projectId: PROJECT,
        namespace: NAMESPACE,
    });
}

export default class DAO {

    public async getUser(id: string): Promise<User> {
        const ds = datastore();
        const [ent] = await ds.get(ds.key([KIND_USER, id]));
        return ent;
    }

    public async getUserByAlias(alias: string): Promise<User> {
        const ds = datastore();
        const query = ds.createQuery(KIND_USER)
            .filter('alias', alias);
        const [ents] = await ds.runQuery(query);
        return ents ? ents[0] : null;
    }

    public async saveUser(user: User, overwrite: boolean): Promise<User> {
        const ds = datastore();
        const tran = ds.transaction();
        try {
            const key = ds.key([KIND_USER, user.address]);
            if (!overwrite) {
                const [existing] = await tran.get(key);
                if (existing) {
                    return existing;
                }
            }
            tran.save({ key: key, data: user });
            await tran.commit();
            return user;
        } catch (e) {
            console.log(`Error saving user ${user.address}: ${e}`);
            await tran.rollback();
        }
    }

    public async getUserTransactions(userId: string, network?: string): Promise<Transaction[]> {
        const ds = datastore();
        const fromQuery = ds.createQuery(KIND_TRANSACTION)
            .filter('addressFrom', userId);
        const toQuery = ds.createQuery(KIND_TRANSACTION)
            .filter('addressTo', userId);
        if (network) {
            fromQuery.filter('network', network);
            toQuery.filter('network', network);
        }
        const [[fromTxs], [toTxs]] = await Promise.all([
            ds.runQuery(fromQuery),
            ds.runQuery(toQuery),
        ]);
        return fromTxs.concat(toTxs);
    }

    public async saveTransaction(transaction: Transaction, overwrite: boolean) {
        const ds = datastore();
        const tran = ds.transaction();
        try {
            const key = ds.key([KIND_TRANSACTION, transaction.txHash]);
            const [ent] = await tran.get(key);
            if (ent && !overwrite) {
                return;
            }
            tran.save({
                key: key,
                data: transaction,
            });
            await tran.commit();
        } catch (e) {
            tran.rollback();
            throw e;
        }
    }
}
