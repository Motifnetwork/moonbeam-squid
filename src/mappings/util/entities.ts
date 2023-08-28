import {
    Account,
    AccountTransfer,
    Staker,
    StakingRole,
    Transfer,
    TransferAssetToken,
    TransferDirection,
    TransferLocationAccount,
    TransferType,
} from '../../model'
import { CommonHandlerContext } from '../types/contexts'
import { createPrevBlockContext, getMeta } from './actions'
import { In } from 'typeorm'
import { getCollatorsData, getNominatorsData } from './stakers'
import { DefaultCollatorCommission } from './consts'
import { ActionData } from '../types/data'
import { ArrayContains } from 'typeorm'

export async function getOrCreateAccount(ctx: CommonHandlerContext, id: string): Promise<Account> {
    let account = await ctx.store.get(Account, id)
    if (!account) {
        account = new Account({
            id,
            lastUpdateBlock: ctx.block.height - 1,
        })
        await ctx.store.insert(account)
    }

    return account
}

export async function getOrCreateAccounts(ctx: CommonHandlerContext, ids: string[]): Promise<Account[]> {
    const query = await ctx.store.findBy(Account, { id: ArrayContains(ids) })

    const accountsMap: Map<string, Account> = new Map()
    for (const q of query) accountsMap.set(q.id, q)

    const newAccounts: Set<Account> = new Set()
    for (const id of ids) {
        if (accountsMap.has(id)) continue

        const account = new Account({
            id,
            lastUpdateBlock: ctx.block.height - 1,
        })
        newAccounts.add(account)
    }

    if (newAccounts.size > 0) await ctx.store.save([...newAccounts])

    return [...accountsMap.values(), ...newAccounts]
}

export async function getOrCreateStaker(ctx: CommonHandlerContext, id: string): Promise<Staker | undefined> {
    let staker = await ctx.store.get<Staker>(Staker, {
        where: { stashId: id },
        relations: { stash: true },
    })
    if (!staker) {
        const prevCtx = createPrevBlockContext(ctx)

        const collatorData = (await getCollatorsData(prevCtx, [id]))?.[0]
        if (collatorData != null) {
            staker = await createStaker(ctx, {
                stashId: id,
                activeBond: collatorData.bond,
                role: StakingRole.Collator,
            })
        }

        const nominatorData = (await getNominatorsData(prevCtx, [id]))?.[0]
        if (nominatorData != null) {
            staker = await createStaker(ctx, {
                stashId: id,
                activeBond: nominatorData.bond,
                role: StakingRole.Nominator,
            })
        }

        if (collatorData == null && nominatorData == null) return undefined
    }

    return staker
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export async function getOrCreateStakers(ctx: CommonHandlerContext, ids: string[]): Promise<Staker[]> {
    const query = await ctx.store.find<Staker>(Staker, {
        where: { stashId: In(ids) },
        relations: { stash: true },
    })

    const stakersMap: Map<string, Staker> = new Map()
    for (const q of query) stakersMap.set(q.stashId, q)

    const missingIds = ids.filter((id) => !stakersMap.has(id))

    // const newStakers: Set<Staker> = new Set()
    if (missingIds.length === 0) return [...stakersMap.values()]
    const prevCtx = createPrevBlockContext(ctx)

    const collatorsData = await getCollatorsData(prevCtx, missingIds)

    // if (!collatorsData && !nominatorsData) return [...stakersMap.values()]

    const newStakers: Map<string, Staker> = new Map()

    if (collatorsData) {
        for (const collatorData of collatorsData) {
            if (!collatorData) continue

            const stashId = collatorData.id

            const staker = await createStaker(ctx, {
                stashId,
                activeBond: collatorData.bond,
                role: StakingRole.Collator,
                commission: DefaultCollatorCommission,
            })
            newStakers.set(stashId, staker)
        }
    }

    const notCollatorIds = missingIds.filter((id, i) => collatorsData?.[i] == null)
    const nominatorsData = await getNominatorsData(prevCtx, notCollatorIds)

    if (nominatorsData) {
        for (const nominatorData of nominatorsData) {
            if (!nominatorData) continue

            const stashId = nominatorData.id

            const staker = await createStaker(ctx, {
                stashId,
                activeBond: nominatorData.bond,
                role: StakingRole.Nominator,
            })
            newStakers.set(stashId, staker)
        }
    }

    return [...stakersMap.values(), ...newStakers.values()]
}

interface StakerData {
    stashId: string
    activeBond?: bigint
    role?: StakingRole
    commission?: number
}

export async function createStaker(ctx: CommonHandlerContext, data: StakerData) {
    const stash = await getOrCreateAccount(ctx, data.stashId)

    const staker = new Staker({
        id: data.stashId,
        stash,
        role: data.role || StakingRole.Idle,
        activeBond: data.activeBond || 0n,
        totalReward: 0n,
        commission: data.commission || DefaultCollatorCommission,
    })
    await ctx.store.save(staker)

    return staker
}

export interface TransferData extends ActionData {
    fromId: string
    toId: string | null
    amount: bigint
    success: boolean
    type: TransferType
}

export async function saveTransfer(ctx: CommonHandlerContext, data: TransferData) {
    const { fromId, toId, amount, success, type } = data

    const from = await getOrCreateAccount(ctx, fromId)
    const to = toId ? await getOrCreateAccount(ctx, toId) : null

    const transfer = new Transfer({
        ...getMeta(data),
        from: new TransferLocationAccount({
            id: fromId,
        }),
        to: toId
            ? new TransferLocationAccount({
                  id: toId,
              })
            : null,
        asset: new TransferAssetToken({
            symbol: 'GLMR',
            amount,
        }),
        success,
        type,
    })

    await ctx.store.insert(transfer)

    await ctx.store.insert(
        new AccountTransfer({
            id: `${transfer.id}-from`,
            transfer,
            account: from,
            direction: TransferDirection.From,
        })
    )

    if (to) {
        await ctx.store.insert(
            new AccountTransfer({
                id: `${transfer.id}-to`,
                transfer,
                account: to,
                direction: TransferDirection.To,
            })
        )
    }
}
