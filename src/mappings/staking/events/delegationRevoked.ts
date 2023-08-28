import { UnknownVersionError } from '../../../common/errors'
import { encodeId } from '../../../common/tools'
import { BondType } from '../../../model'
import { ParachainStakingDelegationRevokedEvent } from '../../../types/generated/events'
import { EventContext, EventHandlerContext } from '../../types/contexts'
import { isDoubleEvent, saveBond } from './utils'

interface EventData {
    account: Uint8Array
    amount: bigint
    candidate: Uint8Array
}

function getEventData(ctx: EventContext): EventData {
    const event = new ParachainStakingDelegationRevokedEvent(ctx)

    if (event.isV1001) {
        const [account, candidate, amount] = event.asV1001
        return {
            account,
            amount,
            candidate,
        }
    } else if (event.isV1300) {
        const { delegator: account, unstakedAmount: amount, candidate } = event.asV1300
        return {
            account,
            amount,
            candidate,
        }
    }
    throw new UnknownVersionError(event.constructor.name)
}

export async function handleDelegationRevoked(ctx: EventHandlerContext) {
    const data = getEventData(ctx)

    const accountId = encodeId(data.account)

    if (await isDoubleEvent(ctx, accountId, data.amount, BondType.Unbond)) return

    await saveBond(ctx, {
        id: ctx.event.id,
        blockNumber: ctx.block.height,
        timestamp: new Date(ctx.block.timestamp),
        extrinsicHash: ctx.event.extrinsic?.hash,
        accountId,
        candidateId: encodeId(data.candidate),
        amount: data.amount,
        type: BondType.Unbond,
        success: true,
    })
}
