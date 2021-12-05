import { Button, Dialog, DialogActions, DialogContent, DialogContentText, TextField } from "@mui/material"
import { useState } from "react";

export type PayDialogProps = {
    onOpen?: () => void,
    onConfirm: (to: string, amount: number, note: string) => void,
    onCancel?: () => void,
}

const DEFAULT_TO = '';
const DEFAULT_AMOUNT = 0.0;

export default function PayDialog(props: PayDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [to, setTo] = useState(DEFAULT_TO);
    const [amount, setAmount] = useState(DEFAULT_AMOUNT);
    const [note, setNote] = useState('');

    const resetInputs = () => {
        setTo(DEFAULT_TO);
        setAmount(DEFAULT_AMOUNT);
        setNote('');
    };

    const onCancel = () => {
        setIsOpen(false);
        props.onCancel?.();
        resetInputs();
    };
    const onConfirm = () => {
        if (!confirm(`You're sending ${amount} ETH to ${to}. Are you sure?`)) {
            return;
        }
        setIsOpen(false);
        props.onConfirm(to, amount, note);
        resetInputs();
    };
    return <div>
        <Button variant="contained" onClick={() => {
            props.onOpen?.();
            setIsOpen(true);
        }}>Send ETH</Button>
        <Dialog open={isOpen} onClose={onCancel}>
            <DialogContent>
                <DialogContentText>Send ETH to a friend</DialogContentText>
                <TextField id="to" label="Send to (alias or ETH address)" value={to} fullWidth margin="dense"
                    onChange={e => setTo(e.target.value)} />
                <TextField id="amount" label="Amount (ETH)" type="number" value={amount} fullWidth margin="dense"
                    onChange={e => setAmount(Number.parseFloat(e.target.value))} />
                {/* <TextField id="note" label="Note (optional)" type="string" value={note}
                    onChange={e => setNote(e.target.value)} /> */}
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                <Button onClick={onConfirm}>Send</Button>
            </DialogActions>
        </Dialog>
    </div>;
}