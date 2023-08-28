import assert from 'assert'
import { UnknownVersionError } from '../../../common/errors'
import { encodeId } from '../../../common/tools'
import { Reward, Round } from '../../../model'
import { ParachainStakingRewardedEvent } from '../../../types/generated/events'
import { CommonHandlerContext, EventContext, EventHandlerContext } from '../../types/contexts'
import { ActionData } from '../../types/data'
import { getMeta } from '../../util/actions'
import { RewardPaymentDelay } from '../../util/consts'
import { getOrCreateStaker } from '../../util/entities'

interface EventData {
    amount: bigint
    account: Uint8Array
}

function getEventData(ctx: EventContext): EventData {
    const event = new ParachainStakingRewardedEvent(ctx)

    if (event.isV900) {
        const [account, amount] = event.asV900
        return {
            account,
            amount,
        }
    } else if (event.isV1300) {
        const { account, rewards: amount } = event.asV1300
        return {
            account,
            amount,
        }
    } else {
        throw new UnknownVersionError(event.constructor.name)
    }
}

export async function handleRewarded(ctx: EventHandlerContext) {
    const data = getEventData(ctx)

    await saveReward(ctx, {
        id: ctx.event.id,
        blockNumber: ctx.block.height,
        timestamp: new Date(ctx.block.timestamp),
        extrinsicHash: ctx.event.extrinsic?.hash,
        accountId: encodeId(data.account),
        amount: data.amount,
    })
}

export interface RewardData extends ActionData {
    amount: bigint
    accountId: string
}

export async function saveReward(ctx: CommonHandlerContext, data: RewardData) {
    const staker = await getOrCreateStaker(ctx, data.accountId)
    assert(staker != null)

    staker.totalReward += data.amount

    await ctx.store.save(staker)

    const round = await ctx.store.get(Round, { where: {}, order: { index: 'DESC' } })

    await ctx.store.insert(
        new Reward({
            ...getMeta(data),
            account: staker.stash,
            amount: data.amount,
            round: Math.min((round?.index || 0) - RewardPaymentDelay, 0),
            staker,
        })
    )
}
