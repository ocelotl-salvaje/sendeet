import { Box, IconButton, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { DataGrid, GridColumns } from "@mui/x-data-grid";
import { useEffect, useRef, useState } from "react";
import Web3 from "web3";
import { Transaction } from "../../data/model";
import { WEI_IN_ETH } from "../api/util";

export type TransactionListProps = {
    web3: Web3,
    address: string,
    lastUpdate: number,
}

const MAX_BLOCKS = 100;

type TransactionViewModel = Transaction & {
    id: string,
    friend: string,
    friendName?: string,
    sent: boolean,
}

const columns: GridColumns = [
    {
        field: 'ethTransactionId',
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
        valueGetter: params => new Date(params.row.timestamp * 1000),
        valueFormatter: params => params.value.toString(),
        minWidth: 50,
        flex: 0.5,
    },
];

export default function TransactionList(props: TransactionListProps) {
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const prevProps = useRef(props);
    useEffect(() => {
        if (props.lastUpdate === prevProps.current.lastUpdate) {
            return;
        }
        if (isLoading) {
            return;
        }
        setIsLoading(true);
        setRows([]);
        getTransactions(props.web3, props.address, txs => setRows(prev => prev.concat(txs)))
            .catch(err => alert(`Failed to fetch transactions: ${err}`))
            .finally(() => setIsLoading(false));
    }, [props.lastUpdate]);

    return <Box>
        <h3>Recent transactions</h3>
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

async function getTransactions(web3: Web3, address: string, consumer: (txs: TransactionViewModel[]) => void): Promise<void> {
    console.log(`Loading transactions for ${address}`);
    let transactions: TransactionViewModel[] = [];
    const currentBlock = await web3.eth.getBlockNumber();
    console.log(`Current block: ${currentBlock}`);
    let total = 0;
    for (let i = 0; i < Math.min(MAX_BLOCKS, currentBlock); i++) {
        const block = await web3.eth.getBlock(currentBlock - i, true);
        if (!block) {
            continue;
        }
        if (i % 10 === 0) {
            console.log(`Checking block ${currentBlock - i}`);
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
                    ethTransactionId: t.hash,
                    amount: Number.parseFloat(t.value) / WEI_IN_ETH,
                    timestamp: typeof block.timestamp === 'string'
                        ? Number.parseFloat(block.timestamp)
                        : block.timestamp,
                };
            });
        transactions.push(...trans);
        total += trans.length;
        if (transactions.length >= 10) {
            await resolveNames(transactions);
            consumer(transactions);
            transactions = [];
        }
    }
    await resolveNames(transactions);
    consumer(transactions);
    console.log(`Loaded ${total} transactions`);

}

async function resolveNames(transactions: TransactionViewModel[]): Promise<void> {
    if (!transactions) {
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

