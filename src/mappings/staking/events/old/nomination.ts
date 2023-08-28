import { UnknownVersionError } from '../../../../common/errors'
import { encodeId } from '../../../../common/tools'
import { BondType, StakingRole } from '../../../../model'
import { ParachainStakingNominationEvent } from '../../../../types/generated/events'
import { EventContext, EventHandlerContext } from '../../../types/contexts'
import { createStaker, getOrCreateStaker } from '../../../util/entities'
import { saveBond } from '.././utils'

interface EventData {
    account: Uint8Array
    amount: bigint
    candidate: Uint8Array
}

function getEventData(ctx: EventContext): EventData {
    const event = new ParachainStakingNominationEvent(ctx)

    if (event.isV900) {
        const [account, amount, candidate] = event.asV900
        return {
            account,
            amount,
            candidate,
        }
    }
    throw new UnknownVersionError(event.constructor.name)
}

export async function handleNomination(ctx: EventHandlerContext) {
    const data = getEventData(ctx)

    const accountId = encodeId(data.account)

    const staker = await getOrCreateStaker(ctx, accountId)
    if (!staker) {
        await createStaker(ctx, {
            stashId: accountId,
            activeBond: 0n,
            role: StakingRole.Nominator,
        })
    }

    await saveBond(ctx, {
        id: ctx.event.id,
        blockNumber: ctx.block.height,
        timestamp: new Date(ctx.block.timestamp),
        extrinsicHash: ctx.event.extrinsic?.hash,
        accountId: encodeId(data.account),
        candidateId: encodeId(data.candidate),
        amount: data.amount,
        type: BondType.Bond,
        success: true,
    })
}
