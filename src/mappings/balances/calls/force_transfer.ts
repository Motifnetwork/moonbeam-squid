import { BalancesForceTransferCall } from '../../../types/generated/calls'
import { encodeId } from '../../../common/tools'
import { UnknownVersionError } from '../../../common/errors'
import { CallContext, CallHandlerContext } from '../../types/contexts'
import { saveTransfer } from '../../util/entities'
import { TransferType } from '../../../model'

interface EventData {
    from: Uint8Array
    to: Uint8Array
    amount: bigint
}

function getCallData(ctx: CallContext): EventData {
    const call = new BalancesForceTransferCall(ctx)
    if (call.isV900) {
        const { source, dest, value } = call.asV900
        return {
            from: source as Uint8Array,
            to: dest as Uint8Array,
            amount: value,
        }
    } else {
        throw new UnknownVersionError(call.constructor.name)
    }
}

export async function handleForceTransfer(ctx: CallHandlerContext) {
    const data = getCallData(ctx)
    if (!data) return

    await saveTransfer(ctx, {
        id: ctx.call.id,
        timestamp: new Date(ctx.block.timestamp),
        blockNumber: ctx.block.height,
        extrinsicHash: ctx.extrinsic.hash,
        fromId: encodeId(data.from),
        toId: encodeId(data.to),
        amount: data.amount,
        success: ctx.call.success,
        type: TransferType.Native,
    })
}
