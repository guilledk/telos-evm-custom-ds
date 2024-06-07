import {
    FeeMarketEIP1559Transaction,
    FeeMarketEIP1559TxData,
    LegacyTransaction,
    LegacyTxData,
    TransactionType, TxValuesArray,
} from "@ethereumjs/tx";
import type { Common } from '@ethereumjs/common';

import type {
    TxOptions,
} from '@ethereumjs/tx';
import RLP from "rlp";
import {bytesToBigInt} from "@ethereumjs/util";


export class TEVMTransaction extends LegacyTransaction {

    /**
     * Instantiate a transaction from a data dictionary.
     *
     * Format: { nonce, gasPrice, gasLimit, to, value, data, v, r, s }
     *
     * Notes:
     * - All parameters are optional and have some basic default values
     */
    public static fromTxData(txData: LegacyTxData, opts: TxOptions = {}) {
        return new TEVMTransaction(txData, opts)
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
     * Format: `[nonce, gasPrice, gasLimit, to, value, data, v, r, s]`
     */
    public static fromValuesArray(values: TxValuesArray[TransactionType.Legacy], opts: TxOptions = {}) {
        // If length is not 6, it has length 9. If v/r/s are empty Uint8Arrays, it is still an unsigned transaction
        // This happens if you get the RLP data from `raw()`
        if (values.length !== 6 && values.length !== 9) {
            // TELOS: allow for bigger than 9 values.length but only if no trailing bytes
            if (values.length > 10) {
                let i = 10;
                while (i < values.length) {
                    if (values[i].length !== 0) {
                        throw new Error(
                            'Invalid transaction. Only expecting 6 values (for unsigned tx) or 9 values (for signed tx).'
                        )
                    }
                }
            }
        }

        const [nonce, gasPrice, gasLimit, to, value, data, v, r, s] = values

        // TELOS: dont validate leading zeros
        // validateNoLeadingZeroes({ nonce, gasPrice, gasLimit, value, v, r, s })

        return new TEVMTransaction(
            {
                nonce,
                gasPrice,
                gasLimit,
                to,
                value,
                data,
                v,
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

export class TEVMTransactionEIP1559 extends FeeMarketEIP1559Transaction {

    /**
     * Instantiate a transaction from a data dictionary.
     *
     * Format: { nonce, gasPrice, gasLimit, to, value, data, v, r, s }
     *
     * Notes:
     * - All parameters are optional and have some basic default values
     */
    public static fromTxData(txData: FeeMarketEIP1559TxData, opts: TxOptions = {}) {
        return new TEVMTransactionEIP1559(txData, opts)
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
     * Format: `[nonce, gasPrice, gasLimit, to, value, data, v, r, s]`
     */
    public static fromValuesArray(values: TxValuesArray[TransactionType.FeeMarketEIP1559], opts: TxOptions = {}) {
        if (values.length !== 9 && values.length !== 12) {
            throw new Error(
                'Invalid EIP-1559 transaction. Only expecting 9 values (for unsigned tx) or 12 values (for signed tx).'
            )
        }

        const [
            chainId,
            nonce,
            maxPriorityFeePerGas,
            maxFeePerGas,
            gasLimit,
            to,
            value,
            data,
            accessList,
            v,
            r,
            s,
        ] = values

        this._validateNotArray({ chainId, v })
        // TELOS: dont validate leading zeros
        // validateNoLeadingZeroes({ nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, value, v, r, s })

        return new FeeMarketEIP1559Transaction(
            {
                chainId: bytesToBigInt(chainId),
                nonce,
                maxPriorityFeePerGas,
                maxFeePerGas,
                gasLimit,
                to,
                value,
                data,
                accessList: accessList ?? [],
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
