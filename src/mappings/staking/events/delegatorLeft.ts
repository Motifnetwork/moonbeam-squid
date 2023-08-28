import { UnknownVersionError } from '../../../common/errors'
import { encodeId } from '../../../common/tools'
import { BondType } from '../../../model'
import { ParachainStakingDelegatorLeftEvent } from '../../../types/generated/events'
import { EventContext, EventHandlerContext } from '../../types/contexts'
import { isDoubleEvent, saveBond } from './utils'

interface EventData {
    account: Uint8Array
    amount: bigint
    newTotal: bigint
}

function getEventData(ctx: EventContext): EventData {
    const event = new ParachainStakingDelegatorLeftEvent(ctx)

    if (event.isV1001) {
        const [account, amount] = event.asV1001
        return {
            account,
            amount,
            newTotal: 0n,
        }
    } else if (event.isV1300) {
        const { delegator: account, unstakedAmount: amount } = event.asV1300
        return {
            account,
            amount,
            newTotal: 0n,
        }
    }
    throw new UnknownVersionError(event.constructor.name)
}

export async function handleDelegatorLeft(ctx: EventHandlerContext) {
    const data = getEventData(ctx)

    const accountId = encodeId(data.account)

    if (await isDoubleEvent(ctx, accountId, data.amount, BondType.Unbond)) return

    await saveBond(ctx, {
        id: ctx.event.id,
        blockNumber: ctx.block.height,
        timestamp: new Date(ctx.block.timestamp),
        extrinsicHash: ctx.event.extrinsic?.hash,
        accountId,
        amount: data.amount,
        type: BondType.Unbond,
        success: true,
        newTotal: data.newTotal,
    })
}
