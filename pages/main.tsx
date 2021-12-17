import { AppBar, Backdrop, Box, Container, Paper, Toolbar, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import Web3 from 'web3';
import { User } from '../data/model';
import PayPanel from './components/pay-panel';
import ProfileToolbar from './components/profile-toolbar';
import TransactionList from './components/transaction-list';

export default function MainLayout({ ethereum }) {
    const web3 = new Web3(ethereum);

    const [user, setUser] = useState(null as User);
    const [isUserChanging, setIsUserChanging] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(0);
    const [network, setNetwork] = useState('');
    const updateChildren = () => {
        setLastUpdate(n => n + 1);
    };

    useEffect(() => {
        web3.eth.net.getNetworkType().then(setNetwork);
        ethereum.on('networkChanged', network => {
            console.log(`Connected to network ${network}`);
            updateChildren();
            web3.eth.net.getNetworkType().then(setNetwork);
        });
    }, []);

    if (network === 'main') {
        return <h1>Mainnet is not supported (yet). Please use one of the testnets.</h1>
    }

    const mainContent = !user
        ? welcome()
        : <Container>
            <TransactionList web3={web3} address={user.address} lastUpdate={lastUpdate} />
            <PayPanel web3={web3} user={user} onConfirmed={updateChildren} />
        </Container>;

    return <Box>
        <AppBar position="static">
            <Toolbar>
                <Typography sx={{ flexGrow: 1 }}>Sendeet</Typography>
                <ProfileToolbar ethereum={ethereum} web3={web3} onUserChanged={user => {
                    setUser(user);
                    updateChildren();
                    setIsUserChanging(false);
                }}
                    onUserChanging={() => setIsUserChanging(true)} />
            </Toolbar>
        </AppBar>
        {mainContent}
        <Backdrop open={isUserChanging}>
            <Container>
                <Typography variant="h2" color="#ccc">Open wallet extension to sign login request</Typography>
            </Container>
        </Backdrop>
    </Box>;
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
