import { AppBar, Box, Container, Paper, Toolbar, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import Web3 from 'web3';
import { User } from '../data/model';
import { isEthAddress } from '../data/validation';
import { getAddressFromAlias } from './api/util';
import PayDialog from './components/pay-dialog';
import ProfileToolbar from './components/profile-toolbar';
import TransactionList from './components/transaction-list';

export default function MainLayout({ ethereum }) {
    const web3 = new Web3(ethereum);

    const [user, setUser] = useState(null as User);
    const [status, setStatus] = useState('Press send ETH');
    const [lastUpdate, setLastUpdate] = useState(0);
    const updateChildren = () => {
        setLastUpdate(n => n + 1);
    };
    const appendStatus = (s: String) => {
        setStatus(prev => prev + '\n' + s);
    };

    useEffect(() => {
        ethereum.on('networkChanged', network => {
            console.log(`Connected to network ${network}`);
            updateChildren();
        });
    }, []);

    const mainContent = !user
        ? welcome()
        : <Container>
            <TransactionList web3={web3} address={user.address} lastUpdate={lastUpdate} />
            <PayDialog
                onOpen={() => setStatus('')}
                onConfirm={(to, amount, note) =>
                    sendMoney(web3, user.address, to, amount, note, appendStatus, updateChildren)} />
            <h5>Transfer log</h5>
            <Paper elevation={3} sx={{ padding: 1, overflowWrap: 'anywhere' }}>
                <pre style={{ whiteSpace: 'pre-wrap' }}>
                    {status}
                </pre>
            </Paper>
        </Container>;

    return <Box>
        <AppBar position="static">
            <Toolbar>
                <Typography sx={{ flexGrow: 1 }}>Sendeet</Typography>
                <ProfileToolbar ethereum={ethereum} web3={web3} onUserChanged={user => {
                    setUser(user);
                    updateChildren();
                }} />
            </Toolbar>
        </AppBar>
        {mainContent}
    </Box>;
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

    const amountWei = amount * 1e18;
    web3.eth.sendTransaction({
        from: from,
        to: to,
        value: amountWei,
        // data: web3.utils.utf8ToHex(note),
    })
        .on('confirmation', (confNumber, receipt, latestBlockHash) => {
            logStatus(`Confirmation number: ${confNumber}\nReceipt: ${JSON.stringify(receipt)}\nLatest block hash: ${latestBlockHash}`);
            onConfirmed();
        })
        .on('sending', payload => logStatus(`Sending: ${JSON.stringify(payload)}`))
        .on('sent', payload => logStatus(`Sent: ${JSON.stringify(payload)}`))
        .on('transactionHash', payload => logStatus(`Transaction hash: ${JSON.stringify(payload)}`))
        .on('error', err => logStatus(`ERROR: ${JSON.stringify(err)}`))
        .catch(err => logStatus(`RUNTIME ERROR: ${JSON.stringify(err)}`));
}

function welcome() {
    return <Container>
        <Paper elevation={3} sx={{ padding: 2, margin: 2 }}>
            <h1>Welcome to Sendeet!</h1>
            <p>
                Sendeet is a Venmo-like app that allows you to send ETH to your friends or pay for goods and services.
                Press &apos;Connect to wallet&apos; to create a profile and start sending/receiving money.
            </p>
            <p>
                All transactions made through this app are initiated on the client and go through your browser plugin wallet.
                Sendeet does not retain any private sensitive data. Your private keys are kept securely on your machine and are never sent to our servers.
            </p>
            <p>
                When you create or edit your profile we request you to sign the edit using your wallet.
                This is completely secure and free of charge. We need it to verify that request is coming from you, so that
                malicious actors don&apos;t gain access to your Sendeet profile.
            </p>
        </Paper>
    </Container>;
}
