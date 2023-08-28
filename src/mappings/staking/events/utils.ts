import assert from 'assert'
import { saturatingSumBigInt } from '../../../common/tools'
import { Bond, BondType } from '../../../model'
import { CommonHandlerContext, EventHandlerContext } from '../../types/contexts'
import { ActionData } from '../../types/data'
import { getMeta } from '../../util/actions'
import { getOrCreateStaker } from '../../util/entities'

export interface BondData extends ActionData {
    amount: bigint
    accountId: string
    type: BondType
    success: boolean
    newTotal?: bigint
    candidateId?: string
}

export async function saveBond(ctx: CommonHandlerContext, data: BondData) {
    const staker = await getOrCreateStaker(ctx, data.accountId)
    assert(staker != null)

    if (data.success) {
        staker.activeBond = data.newTotal
            ? data.newTotal
            : saturatingSumBigInt(staker.activeBond, data.amount * (data.type === BondType.Bond ? 1n : -1n))
    }

    await ctx.store.save(staker)

    await ctx.store.insert(
        new Bond({
            ...getMeta(data),
            account: staker.stash,
            candidate: data.candidateId,
            type: data.type,
            amount: data.amount,
            success: data.success,
            staker,
        })
    )
}

export async function isDoubleEvent(ctx: EventHandlerContext, accountId: string, amount: bigint, type: BondType) {
    return (
        (await ctx.store.count(Bond, {
            where: {
                extrinsicHash: ctx.event.extrinsic?.hash,
                blockNumber: ctx.block.height,
                accountId,
                amount,
                type,
            },
        })) > 0
    )
}
