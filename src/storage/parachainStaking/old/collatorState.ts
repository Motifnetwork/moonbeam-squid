import { UnknownVersionError } from '../../../common/errors'
import { decodeId, encodeId } from '../../../common/tools'
import { ParachainStakingCollatorState2Storage } from '../../../types/generated/storage'
import { BlockContext } from '../../../types/generated/support'

interface StorageData {
    bond: bigint
    topNominators: {
        owner: Uint8Array
        amount: bigint
    }[]
    bottomNominators: {
        owner: Uint8Array
        amount: bigint
    }[]
}

async function getStorageData(
    ctx: BlockContext,
    accounts: Uint8Array[]
): Promise<(StorageData | undefined)[] | undefined> {
    const storage = new ParachainStakingCollatorState2Storage(ctx)
    if (!storage.isExists) return undefined

    if (storage.isV900) {
        return await storage.asV900.getMany(accounts)
    } else {
        throw new UnknownVersionError(storage.constructor.name)
    }
}

interface CollatorState {
    id: string
    bond: bigint
    topNominators: {
        id: string
        amount: bigint
    }[]
    bottomNominators: {
        id: string
        amount: bigint
    }[]
}

async function queryStorageFunction(
    ctx: BlockContext,
    accounts: string[]
): Promise<(CollatorState | undefined)[] | undefined> {
    if (accounts.length === 0) return []

    const u8 = accounts.map((a) => decodeId(a))

    const data = await getStorageData(ctx, u8)
    if (!data) return undefined

    return data.map((d, i) =>
        d != null
            ? {
                  id: accounts[i],
                  bond: d.bond,
                  topNominators: d.topNominators.map((delegation) => ({
                      id: encodeId(delegation.owner),
                      amount: delegation.amount,
                  })),
                  bottomNominators: d.bottomNominators.map((delegation) => ({
                      id: encodeId(delegation.owner),
                      amount: delegation.amount,
                  })),
              }
            : undefined
    )
}

export async function getCollatorState(ctx: BlockContext, account: string): Promise<CollatorState | undefined>
export async function getCollatorState(
    ctx: BlockContext,
    accounts: string[]
): Promise<(CollatorState | undefined)[] | undefined>
export async function getCollatorState(ctx: BlockContext, accountOrAccounts: string | string[]) {
    if (Array.isArray(accountOrAccounts)) {
        return await queryStorageFunction(ctx, accountOrAccounts)
    } else {
        return (await queryStorageFunction(ctx, [accountOrAccounts]))?.[0]
    }
}
