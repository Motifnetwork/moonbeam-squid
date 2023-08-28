import assert from 'assert'
import { UnknownVersionError } from '../../../common/errors'
import { encodeId, saturatingSumBigInt } from '../../../common/tools'
import { ParachainStakingCompoundedEvent } from '../../../types/generated/events'
import { EventContext, EventHandlerContext } from '../../types/contexts'
import { getOrCreateStaker } from '../../util/entities'

interface EventData {
    amount: bigint
    account: Uint8Array
}

function getEventData(ctx: EventContext): EventData {
    const event = new ParachainStakingCompoundedEvent(ctx)

    if (event.isV1901) {
        const { delegator, amount } = event.asV1901
        return {
            account: delegator,
            amount,
        }
    } else {
        throw new UnknownVersionError(event.constructor.name)
    }
}

export async function handleCompounded(ctx: EventHandlerContext) {
    const data = getEventData(ctx)

    const accountId = encodeId(data.account)

    const staker = await getOrCreateStaker(ctx, accountId)
    assert(staker != null)

    staker.activeBond = saturatingSumBigInt(staker.activeBond, data.amount)
    await ctx.store.save(staker)
}
