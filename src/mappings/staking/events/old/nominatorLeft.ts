import { UnknownVersionError } from '../../../../common/errors'
import { encodeId } from '../../../../common/tools'
import { BondType } from '../../../../model'
import { ParachainStakingNominatorLeftEvent } from '../../../../types/generated/events'
import { EventContext, EventHandlerContext } from '../../../types/contexts'
import { isDoubleEvent, saveBond } from '.././utils'

interface EventData {
    account: Uint8Array
    amount: bigint
    newTotal: bigint
}

function getEventData(ctx: EventContext): EventData {
    const event = new ParachainStakingNominatorLeftEvent(ctx)

    if (event.isV900) {
        const [account, amount] = event.asV900
        return {
            account,
            amount,
            newTotal: 0n,
        }
    }
    throw new UnknownVersionError(event.constructor.name)
}

export async function handleNominatorLeft(ctx: EventHandlerContext) {
    const data = getEventData(ctx)

    const accountId = encodeId(data.account)

    if (await isDoubleEvent(ctx, accountId, data.amount, BondType.Unbond)) return

    await saveBond(ctx, {
        id: ctx.event.id,
        blockNumber: ctx.block.height,
        timestamp: new Date(ctx.block.timestamp),
        extrinsicHash: ctx.event.extrinsic?.hash,
        accountId: encodeId(data.account),
        newTotal: data.newTotal,
        amount: data.amount,
        type: BondType.Unbond,
        success: true,
    })
}
