import {BlockHeader, BlockOptions, HeaderData} from "@ethereumjs/block";

/*
 * Custom BlockHeader without dao-hard-fork validation
 */

export class TEVMBlockHeader extends BlockHeader {

    /**
     * Static constructor to create a block header from a header data dictionary
     *
     * @param headerData
     * @param opts
     */
    public static fromHeaderData(headerData: HeaderData = {}, opts: BlockOptions = {}) {
        return new TEVMBlockHeader(headerData, opts)
    }

    /**
     * Validates extra data is DAO_ExtraData for DAO_ForceExtraDataRange blocks after DAO
     * activation block (see: https://blog.slock.it/hard-fork-specification-24b889e70703)
     */
    protected _validateDAOExtraData() {}

}
