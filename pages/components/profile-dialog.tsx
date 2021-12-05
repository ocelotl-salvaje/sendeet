import { Button, Dialog, DialogActions, DialogContent, DialogContentText, TextField } from "@mui/material";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { clone, User } from "../../data/model";
import { isEthAddress, isValidAlias } from "../../data/validation";
import { getAddressFromAlias } from "../api/util";

export type ProfileDialogProps = {
    isOpen: boolean,
    user: User,
    caption: string,
    allowCancel: boolean,
    onSave: (user: User) => void,
    onCancel?: () => void,
}

export default function ProfileDialog(props: ProfileDialogProps) {
    const [user, setUser] = useState(props.user);
    const prevProps = useRef(props);
    useEffect(() => {
        if (props.user !== prevProps.current.user) {
            setUser(props.user);
        }
    }, [props]);
    const userUpdater = (field: string) => {
        return (e: ChangeEvent<HTMLInputElement>) => {
            const u = clone(user);
            u[field] = e.target.value;
            setUser(u);
        };
    };
    const [nameError, setNameError] = useState('');
    const [aliasError, setAliasError] = useState('');
    const onCancel = () => {
        props.onCancel?.();
    };
    const onSave = async () => {
        setNameError('');
        setAliasError('');
        if (!user.name) {
            setNameError('Must not be empty');
            return;
        }
        if (isEthAddress(user.alias)) {
            setAliasError('Must not be an ETH address');
            return;
        }
        if (!isValidAlias(user.alias)) {
            setAliasError('Alias can only contain [a-z, 0-9, _, -]');
            return;
        }
        const aliasAddress = await getAddressFromAlias(user.alias);
        if (aliasAddress && aliasAddress.toLowerCase() !== user.address.toLowerCase()) {
            setAliasError(`Alias ${user.alias} is already taken`);
            return;
        }
        props.onSave(user);
    };

    return <Dialog open={props.isOpen} onClose={onCancel}>
        <DialogContent>
            <DialogContentText>{props.caption}</DialogContentText>
            <TextField id="address" label="ETH Address" value={user?.address} fullWidth margin="dense"
                disabled />
            <TextField id="name" label="Name" value={user?.name} fullWidth margin="dense"
                onChange={userUpdater('name')}
                error={!!nameError} helperText={nameError} />
            <TextField id="alias" label="Alias (optional)" value={user?.alias ?? ''} fullWidth margin="dense"
                onChange={userUpdater('alias')}
                error={!!aliasError} helperText={aliasError} />
        </DialogContent>
        <DialogActions>
            {props.allowCancel && <Button onClick={onCancel}>Cancel</Button>}
            <Button onClick={onSave}>Save</Button>
        </DialogActions>
    </Dialog>;
}
