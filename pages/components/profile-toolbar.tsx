import { Button, IconButton, Typography } from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import React, { useEffect, useState } from "react";
import Web3 from "web3";
import { SignedRequest, User } from "../../data/model";
import ProfileDialog from "./profile-dialog";
import { validateUser } from "../../data/validation";

export type ProfileToolbarProps = {
    ethereum: any,
    web3: Web3,
    onUserChanged?: (u: User) => void,
}

export default function ProfileToolbar(props: ProfileToolbarProps) {
    const [user, setUser] = useState(null as User);
    const updateUser = (u: User) => {
        setIsProfileOpen(false);
        setUser(u);
        props.onUserChanged?.(u);
    };
    const [isConnectDisabled, setIsConnectDisabled] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [firstTime, setFirstTime] = useState(false);

    const handleNewUser = () => {
        setFirstTime(true);
        setIsProfileOpen(true);
    };
    const login = () => getOrCreateUser(props.ethereum, props.web3, updateUser, handleNewUser);

    useEffect(() => {
        if (!user) {
            login();
        }
    }, []);

    useEffect(() => {
        props.ethereum.on('accountsChanged', accounts => {
            console.log(`Connected with accounts: ${accounts.join(', ')}`);
            login();
        });
    }, []);

    const connectEthereum = async () => {
        setIsConnectDisabled(true);
        await props.web3.eth.requestAccounts();
    };

    const loggedInUser = () => {
        const address = user?.address;
        const truncatedAddress = !address || address.length <= 10
            ? address
            : address.substring(0, 7) + '...';
        return [
            <Typography key="welcome" variant="subtitle1">Welcome, {user.name} ({truncatedAddress})!</Typography>,
            <IconButton key="profileBtn" size="large" edge="end" color="inherit"
                onClick={() => {
                    setFirstTime(false);
                    setIsProfileOpen(true);
                }}>
                <AccountCircle />
            </IconButton>,
            <ProfileDialog key="profileDlg" isOpen={isProfileOpen} user={user}
                caption={firstTime ? 'Create profile' : 'Edit profile'}
                allowCancel={!firstTime}
                onSave={async u => {
                    const saved = await saveUser(props.web3, u, true);
                    updateUser(saved);
                    setIsProfileOpen(false);
                }}
                onCancel={() => {
                    if (!firstTime) {
                        setIsProfileOpen(false);
                    }
                }} />,
        ];
    };

    return user
        ? loggedInUser() as any
        : <Button color="inherit" disabled={isConnectDisabled}
            onClick={connectEthereum}>Connect to wallet</Button>;
}

async function getOrCreateUser(ethereum, web3: Web3, setUser: (u: User) => void, onNewUser?: (u: User) => void) {
    const address = ethereum.selectedAddress;
    if (!address) {
        setUser(null);
        return;
    }
    const resp = await fetch(`/api/user/${address}`);
    if (resp.ok) {
        const data = await resp.json();
        setUser(validateUser(data));
    } else if (resp.status === 404) {
        const user: User = {
            address: address,
            name: 'Anon',
        };
        setUser(user);
        onNewUser?.(user);
    }
}

async function saveUser(web3: Web3, user: User, overwrite: boolean): Promise<User> {
    let url = `/api/user/${user.address}`;
    if (overwrite) {
        url += '?overwrite=true';
    }

    const data = JSON.stringify(user);
    const signature = await web3.eth.personal.sign(data, user.address, '');
    const network = await web3.eth.net.getNetworkType();
    console.log('Network: ' + network);
    const request: SignedRequest = {
        signature: signature,
        data: data,
        network: network,
    };

    const saveResp = await fetch(url, {
        method: 'PUT',
        body: JSON.stringify(request),
    });
    if (saveResp.ok) {
        const data = await saveResp.json();
        return validateUser(data);
    }
    return null;
}
