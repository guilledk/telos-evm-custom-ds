import {LegacyTransaction} from "@ethereumjs/tx";
import {BlockHeader} from "@ethereumjs/block";

declare module 'telos-evm-custom-ds' {
    class TEVMTransaction extends LegacyTransaction {}

    class TEVMBlockHeader extends BlockHeader {}
}