import { Box, IconButton, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import NotesIcon from '@mui/icons-material/Notes';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DataGrid, GridColumns, gridColumnsTotalWidthSelector } from "@mui/x-data-grid";
import { useEffect, useRef, useState } from "react";
import Web3 from "web3";
import { Transaction } from "../../data/model";
import { WEI_IN_ETH } from "../api/util";
import { validateTransaction } from "../../data/validation";

export type TransactionListProps = {
    web3: Web3,
    address: string,
    lastUpdate: number,
}

const MAX_BLOCKS = 1000;

type TransactionViewModel = Transaction & {
    id: string,
    friend: string,
    friendName?: string,
    sent: boolean,
}

const columns: GridColumns = [
    {
        field: 'txHash',
        headerName: 'Tx Hash',
        minWidth: 100,
        flex: 0.5,
    },
    {
        field: 'friend',
        headerName: 'From / To',
        renderCell: params => {
            const val = params.row.friendName ?? params.row.friend;
            return <span>
                {val}
                {params.row.friendName &&
                    <Tooltip title={params.row.friend}>
                        <IconButton onClick={() => navigator.clipboard.writeText(params.row.friend)}>
                            <ContentCopyIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>}
            </span>;
        },
        minWidth: 100,
        flex: 1,
    },
    {
        field: 'amount',
        headerName: 'Amount (ETH)',
        minWidth: 50,
        renderCell: params =>
            <span style={{ color: params.row.sent ? '#d00' : '#0a0' }}>
                {(params.row.sent ? '-' : '+') + ' ' + params.value}
            </span>,
        flex: 0.2,
    },
    {
        field: 'timestamp',
        headerName: 'Time',
        valueGetter: params => new Date(params.row.timestamp),
        valueFormatter: params => params.value.toString(),
        minWidth: 50,
        flex: 0.5,
    },
    {
        field: 'note',
        headerName: 'N',
        renderCell: params => params.row.note && <Tooltip title={params.row.note}>
            <IconButton>
                <NotesIcon fontSize="small" />
            </IconButton>
        </Tooltip>,
        width: 20,
    }
];

export default function TransactionList(props: TransactionListProps) {
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadTransactions = () => {
        setIsLoading(true);
        setRows([]);
        getTransactions(props.address)
            .then(setRows)
            .catch(err => alert(`Failed to fetch transactions: ${err}`))
            .finally(() => setIsLoading(false));
    };

    const prevProps = useRef(props);
    useEffect(() => {
        if (props.lastUpdate === prevProps.current.lastUpdate) {
            return;
        }
        if (isLoading) {
            return;
        }
        loadTransactions();
    }, [props.lastUpdate]);

    return <Box>
        <h3>
            Recent transactions
            <IconButton onClick={loadTransactions}>
                <RefreshIcon />
            </IconButton>
        </h3>
        <Box sx={{ width: '100%', height: 370, marginTop: 2, marginBottom: 2 }}>
            <DataGrid
                columns={columns}
                rows={rows}
                pageSize={5}
                loading={isLoading && rows.length === 0}
                disableSelectionOnClick={true}
                disableColumnSelector={true} />
        </Box>
    </Box>;
}

async function getTransactions(userAddr: string): Promise<TransactionViewModel[]> {
    const resp = await fetch(`/api/transactions/${userAddr}`);
    if (!resp.ok) {
        console.log(`Failed to fetch transactions for user ${userAddr}: ${resp.status}`);
        return [];
    }
    const data = await resp.json() as any[];
    return data.map(validateTransaction)
        .filter(x => x)
        .map(tx => {
            const sent = tx.addressFrom === userAddr;
            return {
                ...tx,
                id: tx.txHash,
                sent: sent,
                friend: sent ? tx.addressTo : tx.addressFrom,
                friendName: sent ? tx.nameTo : tx.nameFrom,
            };
        })
        .sort((tx1, tx2) => tx2.timestamp - tx1.timestamp);
}

async function getTransactionsFromChain(web3: Web3, address: string, consumer: (txs: TransactionViewModel[]) => void): Promise<void> {
    console.log(`Loading transactions for ${address}`);
    const currentBlock = await web3.eth.getBlockNumber();
    console.log(`Current block: ${currentBlock}`);
    const network = await web3.eth.net.getNetworkType();
    let total = 0;
    const tasks = []
    for (let i = 0; i < Math.min(MAX_BLOCKS, currentBlock); i++) {
        const promise = web3.eth.getBlock(currentBlock - i, true)
            .then(async block => {
                if (!block) {
                    return;
                }
                if (i % 10 === 0) {
                    console.log(`Checking block ${block.number}`);
                }
                const trans = block.transactions
                    .filter(t => t.to && (t.from.toLowerCase() === address ||
                        t.to.toLowerCase() === address))
                    .map(t => {
                        const sent = t.from.toLowerCase() === address;
                        return {
                            id: t.hash,
                            sent: sent,
                            friend: sent
                                ? t.to.toLowerCase()
                                : t.from.toLowerCase(),
                            txHash: t.hash,
                            network: network,
                            amount: Number.parseFloat(t.value) / WEI_IN_ETH,
                            timestamp: typeof block.timestamp === 'string'
                                ? Number.parseFloat(block.timestamp)
                                : block.timestamp,
                        };
                    });
                total += trans.length;
                await resolveNames(trans);
                consumer(trans);
            });
        tasks.push(promise);
    }
    await Promise.all(tasks);
    console.log(`Loaded ${total} transactions`);
}

async function resolveNames(transactions: TransactionViewModel[]): Promise<void> {
    if (transactions.length === 0) {
        return;
    }
    const friendAddresses = Array.from(new Set(transactions.map(t => t.friend))).join(',');
    const resp = await fetch(`/api/user/names/${friendAddresses}`);
    if (resp.ok) {
        const data = await resp.json();
        transactions.forEach(tran => {
            const name = data[tran.friend];
            if (name) {
                tran.friendName = name;
            }
        });
    }
}

