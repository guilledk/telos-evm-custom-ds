export * from './txs/index.js';
export * from './block.js';

import {TransactionType, TxOptions} from "@ethereumjs/tx";
import {
    TEVMTransaction,
    TEVMTransactionEIP1559,
    TEVMTransactionEIP2930,
    TEVMTransactionEIP4844,
    TEVMTransactionTypes
} from "./txs/index.js";

export function fromSerializedTEVMData(
    data: Uint8Array,
    txOptions: TxOptions = {}
): TEVMTransactionTypes {
    if (data[0] <= 0x7f) {
        // Determine the type.
        switch (data[0]) {
            case TransactionType.AccessListEIP2930:
                return TEVMTransactionEIP2930.fromSerializedTx(data.slice(1), txOptions)
            case TransactionType.FeeMarketEIP1559:
                return TEVMTransactionEIP1559.fromSerializedTx(data.slice(1), txOptions)
            case TransactionType.BlobEIP4844:
                return TEVMTransactionEIP4844.fromSerializedTx(data.slice(1), txOptions)
            default:
                throw new Error(`TypedTransaction with ID ${data[0]} unknown`)
        }
    } else {
        return TEVMTransaction.fromSerializedTx(data, txOptions)
    }
}
