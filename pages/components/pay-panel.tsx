import { Paper } from "@mui/material";
import { useState } from "react";
import Web3 from "web3";
import { Transaction, User } from "../../data/model";
import { isEthAddress } from "../../data/validation";
import PayDialog from "./pay-dialog";
import { getAddressFromAlias, WEI_IN_ETH } from "../api/util";

export type PayPanelProps = {
    web3: Web3,
    user: User,
    onConfirmed: () => void,
}

export default function PayPanel(props: PayPanelProps) {
    const [status, setStatus] = useState('Press send ETH');
    const appendStatus = (s: String) => {
        setStatus(prev => prev + '\n' + s);
    };
    return <div>
        <PayDialog
            onOpen={() => setStatus('')}
            onConfirm={(to, amount, note) =>
                sendMoney(props.web3, props.user.address, to, amount, note, appendStatus, props.onConfirmed)} />
        <h5>Transfer log</h5>
        <Paper elevation={3} sx={{ padding: 1, overflowWrap: 'anywhere' }}>
            <pre style={{ whiteSpace: 'pre-wrap' }}>
                {status}
            </pre>
        </Paper>
    </div>;
}

async function sendMoney(web3: Web3, from: string, to: string, amount: number, note: string,
    logStatus: (status: string) => void,
    onConfirmed: () => void) {

    if (!isEthAddress(to)) {
        const aliasAddress = await getAddressFromAlias(to);
        if (!aliasAddress) {
            alert(`Unknown alias '${to}'!`);
            return;
        }
        to = aliasAddress;
    }

    if (to.toLowerCase() === from.toLowerCase()) {
        alert(`Dont't send money to yourself!`);
        return;
    }

    const amountWei = amount * WEI_IN_ETH;
    web3.eth.sendTransaction({
        from: from,
        to: to,
        value: amountWei,
    })
        .on('confirmation', async (confNumber, receipt, latestBlockHash) => {
            logStatus(`Confirmation number: ${confNumber}\nReceipt: ${JSON.stringify(receipt)}\nLatest block hash: ${latestBlockHash}`);
            const network = await web3.eth.net.getNetworkType();
            await uploadTransaction(from, {
                txHash: receipt.transactionHash,
                network: network,
                note: note,
            })
            onConfirmed();
        })
        .on('sending', payload => logStatus(`Sending: ${JSON.stringify(payload)}`))
        .on('sent', payload => logStatus(`Sent: ${JSON.stringify(payload)}`))
        .on('transactionHash', payload => logStatus(`Transaction hash: ${JSON.stringify(payload)}`))
        .on('error', err => logStatus(`ERROR: ${JSON.stringify(err)}`))
        .catch(err => logStatus(`RUNTIME ERROR: ${JSON.stringify(err)}`));
}

async function uploadTransaction(userAddr: string, transaction: Transaction) {
    const resp = await fetch(`/api/transactions/${userAddr}`, {
        method: 'PUT',
        body: JSON.stringify(transaction),
    });
    if (!resp.ok) {
        console.log(`Warning: failed to upload transaction ${transaction.txHash}: ${resp.status}`);
    }
}
