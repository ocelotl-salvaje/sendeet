
export type User = {
    address: string,
    name: string,
    alias?: string,
}

export type SignedRequest = {
    data: string,
    signature: string,
    network: string,
}

export type TransactionStatus =
    'STARTED' |
    'SENDING' |
    'SENT' |
    'CONFIRMED' |
    'ERROR';

export type Transaction = {
    txHash: string,
    network: string,
    addressFrom?: string,
    addressTo?: string,
    amount?: number,
    status?: TransactionStatus,
    timestamp?: number,
    nameFrom?: string,
    nameTo?: string,
    note?: string,
}

export function clone<T>(src: T): T {
    return Object.assign({}, src);
}
