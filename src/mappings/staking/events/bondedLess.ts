import { UnknownVersionError } from '../../../common/errors'
import { encodeId } from '../../../common/tools'
import { BondType } from '../../../model'
import { ParachainStakingCandidateBondedLessEvent } from '../../../types/generated/events'
import { EventContext, EventHandlerContext } from '../../types/contexts'
import { saveBond } from './utils'

interface EventData {
    account: Uint8Array
    amount: bigint
    newTotal: bigint
}

function getEventData(ctx: EventContext): EventData {
    const event = new ParachainStakingCandidateBondedLessEvent(ctx)

    if (event.isV1001) {
        const [account, amount, newTotal] = event.asV1001
        return {
            account,
            amount,
            newTotal,
        }
    } else if (event.isV1300) {
        const { candidate: account, amount, newBond: newTotal } = event.asV1300
        return {
            account,
            amount,
            newTotal,
        }
    }
    throw new UnknownVersionError(event.constructor.name)
}

export async function handleBondedLess(ctx: EventHandlerContext) {
    const data = getEventData(ctx)

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
