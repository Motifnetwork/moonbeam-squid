import { UnknownVersionError } from '../../../common/errors'
import { encodeId } from '../../../common/tools'
import { BondType, StakingRole } from '../../../model'
import { ParachainStakingJoinedCollatorCandidatesEvent } from '../../../types/generated/events'
import { EventContext, EventHandlerContext } from '../../types/contexts'
import { createStaker, getOrCreateStaker } from '../../util/entities'
import { saveBond } from './utils'

interface EventData {
    account: Uint8Array
    amount: bigint
}

function getEventData(ctx: EventContext): EventData {
    const event = new ParachainStakingJoinedCollatorCandidatesEvent(ctx)

    if (event.isV900) {
        const [account, amount] = event.asV900
        return {
            account,
            amount,
        }
    } else if (event.isV1300) {
        const { account, amountLocked: amount } = event.asV1300
        return {
            account,
            amount,
        }
    }
    throw new UnknownVersionError(event.constructor.name)
}

export async function handleJoinedCollatorCandidates(ctx: EventHandlerContext) {
    const data = getEventData(ctx)

    const accountId = encodeId(data.account)

    const staker = await getOrCreateStaker(ctx, accountId)
    if (!staker) {
        await createStaker(ctx, {
            stashId: accountId,
            activeBond: 0n,
            role: StakingRole.Collator,
        })
    }

    await saveBond(ctx, {
        id: ctx.event.id,
        blockNumber: ctx.block.height,
        timestamp: new Date(ctx.block.timestamp),
        extrinsicHash: ctx.event.extrinsic?.hash,
        accountId,
        amount: data.amount,
        type: BondType.Bond,
        success: true,
    })
}
