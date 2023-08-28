import storage from '../../storage'
import { BlockContext } from '../../types/generated/support'

interface CollatorData {
    id: string
    bond: bigint
    nominators: {
        id: string
        amount: bigint
    }[]
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export async function getCollatorsData(
    ctx: BlockContext,
    accounts: string[]
): Promise<(CollatorData | undefined)[] | undefined> {
    const candidateInfo = await storage.parachainStaking.getCandidateInfo(ctx, accounts)
    if (candidateInfo) {
        const bottomDelegations = await storage.parachainStaking.getBottomDelegations(ctx, accounts)
        const topDelegations = await storage.parachainStaking.getTopDelegations(ctx, accounts)

        return candidateInfo.map((d, i) => {
            if (!d) return undefined

            const nominators = topDelegations?.[i]?.delegations
                ? topDelegations?.[i]?.delegations.concat(bottomDelegations?.[i]?.delegations || []) || []
                : []

            return {
                id: d.id,
                bond: d.bond,
                nominators,
            }
        })
    }

    const candidateState = await storage.parachainStaking.getCandidateState(ctx, accounts)
    if (candidateState) {
        return candidateState.map((d) => {
            if (!d) return undefined

            const nominators = d.topDelegations.concat(d.bottomDelegations)

            return {
                id: d.id,
                bond: d.bond,
                nominators,
            }
        })
    }

    const collatorState = await storage.parachainStaking.old.getCollatorState(ctx, accounts)
    if (collatorState) {
        return collatorState.map((d) => {
            if (!d) return undefined

            const nominators = d.topNominators.concat(d.bottomNominators)

            return {
                id: d.id,
                bond: d.bond,
                nominators,
            }
        })
    }

    return undefined
}

interface NominatorData {
    id: string
    bond: bigint
}

export async function getNominatorsData(
    ctx: BlockContext,
    accounts: string[]
): Promise<(NominatorData | undefined)[] | undefined> {
    const delegatorState = await storage.parachainStaking.getDelegatorState(ctx, accounts)
    if (delegatorState) {
        return delegatorState
    }

    const nominatorState = await storage.parachainStaking.old.getNominatorState(ctx, accounts)
    if (nominatorState) {
        return nominatorState
    }

    return undefined
}
