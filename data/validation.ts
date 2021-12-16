import { SignedRequest, Transaction, TransactionStatus, User } from "./model";

const REGEX_ETH_ADDRESS = /^0x[a-z0-9]{40}$/i;
const REGEX_ALIAS = /^[a-z0-9_\-]+$/i;

export function isEthAddress(s: string): boolean {
    return REGEX_ETH_ADDRESS.test(s);
}

export function isValidAlias(s: string): boolean {
    return REGEX_ALIAS.test(s);
}

export function validateSignedRequest(data: any): SignedRequest {
    const req = data as SignedRequest;
    if (!req.data || !req.signature || !req.network) {
        return null;
    }
    return {
        data: req.data,
        signature: req.signature,
        network: req.network,
    };
}

export function validateUser(data: any): User {
    const user = data as User;
    if (!user.address || !user.name) {
        return null;
    }
    if (!isValidAlias(user.alias)) {
        return null;
    }
    if (isEthAddress(user.alias)) {
        return null;
    }
    return {
        address: user.address.toLowerCase(),
        name: user.name,
        alias: user.alias?.toLowerCase(),
    };
}

export function validateTransaction(data: any): Transaction {
    const tran = data as Transaction;
    if (!tran.txHash || !tran.network) {
        return null;
    }
    return {
        txHash: tran.txHash,
        network: tran.network,
        addressFrom: tran.addressFrom,
        addressTo: tran.addressTo,
        amount: tran.amount,
        timestamp: tran.timestamp,
        status: tran.status,
        nameFrom: tran.nameFrom,
        nameTo: tran.nameTo,
        note: tran.note,
    };
}

