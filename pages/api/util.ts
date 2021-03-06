import { NextApiRequest, NextApiResponse } from "next";
import { withIronSessionApiRoute } from "iron-session/next";
import Web3 from "web3";
import Keys from "./keys";
import { User } from "../../data/model";

type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void;

type HandlerMap = { [method: string]: Handler };

const COOKIE_NAME = 'sendeet_session';

declare module "iron-session" {
    interface IronSessionData {
        user?: User;
    }
}

export function defineHandlers(handlers: HandlerMap): Handler {
    return withIronSessionApiRoute(
        async (req: NextApiRequest, res: NextApiResponse) => {
            const handler = handlers[req.method];
            if (handler) {
                await handler(req, res);
            } else {
                res.status(400).end();
            }
        },
        {
            cookieName: COOKIE_NAME,
            password: Keys.cookiePassword,
            cookieOptions: {
                secure: process.env.NODE_ENV === 'production',
            },
        },
    );
}

const ENDPOINTS = {
    'main': `wss://mainnet.infura.io/ws/v3/${Keys.projectId}`,
    'rinkeby': `wss://rinkeby.infura.io/ws/v3/${Keys.projectId}`,
    'kovan': `wss://kovan.infura.io/ws/v3/${Keys.projectId}`,
    'ropsten': `wss://ropsten.infura.io/ws/v3/${Keys.projectId}`,
    'goerli': `wss://goerli.infura.io/ws/v3/${Keys.projectId}`,
    'private': 'ws://localhost:8545',
};

export function connectWeb3(network: string): Web3 {
    const endpoint = ENDPOINTS[network];
    return endpoint ? new Web3(endpoint) : null;
}

export const WEI_IN_ETH = 1e18;

export async function getAddressFromAlias(alias: string): Promise<string> {
    const resp = await fetch(`/api/user/alias/${alias}`);
    if (resp.status === 404) {
        return null;
    }
    if (resp.status === 200) {
        return await resp.text();
    }
    throw new Error('Failed to fetch by alias: ' + resp.status);
}
