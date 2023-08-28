import { BalancesTransferAllCall } from '../../../types/generated/calls'
import { encodeId, getOriginAccountId } from '../../../common/tools'
import { UnknownVersionError } from '../../../common/errors'
import { CallContext, CallHandlerContext } from '../../types/contexts'
import { saveTransfer } from '../../util/entities'
import { TransferType } from '../../../model'

interface EventData {
    to: Uint8Array
}

function getCallData(ctx: CallContext): EventData {
    const call = new BalancesTransferAllCall(ctx)

    if (call.isV900) {
        const { dest } = call.asV900
        return {
            to: dest,
        }
    } else {
        throw new UnknownVersionError(call.constructor.name)
    }
}

export async function handleTransferAll(ctx: CallHandlerContext) {
    const data = getCallData(ctx)

    await saveTransfer(ctx, {
        id: ctx.call.id,
        timestamp: new Date(ctx.block.timestamp),
        blockNumber: ctx.block.height,
        extrinsicHash: ctx.extrinsic.hash,
        fromId: getOriginAccountId(ctx.call.origin),
        toId: encodeId(data.to),
        amount: 0n,
        success: ctx.call.success,
        type: TransferType.Native,
    })
}
