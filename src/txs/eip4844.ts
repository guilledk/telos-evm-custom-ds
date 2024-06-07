import {
    BlobEIP4844Transaction, BlobEIP4844TxData,
    TransactionType,
    TxOptions,
    TxValuesArray
} from "@ethereumjs/tx";
import RLP from "rlp";
import {bytesToBigInt} from "@ethereumjs/util";
import type {Common} from "@ethereumjs/common";

export class TEVMTransactionEIP4844 extends BlobEIP4844Transaction {

    declare public readonly common: Common;

    /**
     * Instantiate a transaction from a data dictionary.
     *
     * Format: { nonce, gasPrice, gasLimit, to, value, data, v, r, s }
     *
     * Notes:
     * - All parameters are optional and have some basic default values
     */
    public static fromTxData(txData: BlobEIP4844TxData, opts: TxOptions = {}) {
        return new TEVMTransactionEIP4844(txData, opts)
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
     * Format: `[chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data,
     * accessList, signatureYParity, signatureR, signatureS]`
     */
    public static fromValuesArray(values: TxValuesArray[TransactionType.BlobEIP4844], opts: TxOptions = {}) {
        if (opts.common?.customCrypto?.kzg === undefined) {
            throw new Error(
                'A common object with customCrypto.kzg initialized required to instantiate a 4844 blob tx'
            )
        }

        if (values.length !== 11 && values.length !== 14) {
            throw new Error(
                'Invalid EIP-4844 transaction. Only expecting 11 values (for unsigned tx) or 14 values (for signed tx).'
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
            maxFeePerBlobGas,
            blobVersionedHashes,
            v,
            r,
            s,
        ] = values

        this._validateNotArray({ chainId, v })
        // TELOS: dont validate leading zeros
        // validateNoLeadingZeroes({
        //     nonce,
        //     maxPriorityFeePerGas,
        //     maxFeePerGas,
        //     gasLimit,
        //     value,
        //     maxFeePerBlobGas,
        //     v,
        //     r,
        //     s,
        // })

        return new TEVMTransactionEIP4844(
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
                maxFeePerBlobGas,
                blobVersionedHashes,
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
