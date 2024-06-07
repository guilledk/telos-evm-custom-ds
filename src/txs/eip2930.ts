import {
    AccessList,
    AccessListEIP2930Transaction, AccessListEIP2930TxData,
    TransactionType,
    TxOptions,
    TxValuesArray
} from "@ethereumjs/tx";
import RLP from "rlp";
import {bytesToBigInt} from "@ethereumjs/util";
import type {Common} from "@ethereumjs/common";

export class TEVMTransactionEIP2930 extends AccessListEIP2930Transaction {

    declare public readonly common: Common;

    /**
     * Instantiate a transaction from a data dictionary.
     *
     * Format: { nonce, gasPrice, gasLimit, to, value, data, v, r, s }
     *
     * Notes:
     * - All parameters are optional and have some basic default values
     */
    public static fromTxData(txData: AccessListEIP2930TxData, opts: TxOptions = {}) {
        return new TEVMTransactionEIP2930(txData, opts)
    }

    /**
     * Instantiate a transaction from the serialized tx.
     *
     * Format: `rlp([nonce, gasPrice, gasLimit, to, value, data, v, r, s])`
     */
    public static fromSerializedTx(serialized: Uint8Array, opts: TxOptions = {}) {
        // this tx on testnet fails due to having non zero remainder bytes
        //     https://explorer-test.telos.net/transaction/1fdc14c0b1729533d5a88108dfb1d273dab00e1be4095064e9f65195ffbb14e7
        //     thanks tom! ;)
        // set stream to true to allow for non-zero remainder
        let decoded = RLP.decode(serialized, true);
        let values;

        if (!Array.isArray(decoded)) {
            if (decoded.hasOwnProperty('data')) {
                // @ts-ignore
                values = decoded.data;
            } else
                throw new Error('Invalid serialized tx input. Must be array')
        } else
            values = decoded;

        return this.fromValuesArray(values, opts)
    }

    /**
     * Create a transaction from a values array.
     *
     * Format: `[chainId, nonce, gasPrice, gasLimit, to, value, data, accessList,
     * signatureYParity (v), signatureR (r), signatureS (s)]`
     */
    public static fromValuesArray(values: TxValuesArray[TransactionType.AccessListEIP2930], opts: TxOptions = {}) {
        if (values.length !== 8 && values.length !== 11) {
            throw new Error(
                'Invalid EIP-2930 transaction. Only expecting 8 values (for unsigned tx) or 11 values (for signed tx).'
            )
        }

        const [chainId, nonce, gasPrice, gasLimit, to, value, data, accessList, v, r, s] = values

        this._validateNotArray({ chainId, v })
        // TELOS: dont validate leading zeros
        // validateNoLeadingZeroes({ nonce, gasPrice, gasLimit, value, v, r, s })

        const emptyAccessList: AccessList = []

        return new TEVMTransactionEIP2930(
            {
                chainId: bytesToBigInt(chainId),
                nonce,
                gasPrice,
                gasLimit,
                to,
                value,
                data,
                accessList: accessList ?? emptyAccessList,
                v: v !== undefined ? bytesToBigInt(v) : undefined, // EIP2930 supports v's with value 0 (empty Uint8Array)
                r,
                s,
            },
            opts
        )
    }

    public isSigned(): boolean {
        const { v, r, s } = this
        if ((v === undefined || r === undefined || s === undefined)) {
            return false;
        } else if ((v == this.common.chainId()) && (r === BigInt(0)) && (s === BigInt(0))) {
            return false;
        } else if ((v === BigInt(0)) && (r === BigInt(0)) && (s === BigInt(0))) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * Validates tx's `v` value
     */
    protected _validateTxV(_v?: bigint, common?: Common): Common {
        return common;
    }

}
