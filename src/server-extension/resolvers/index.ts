import { Field, ObjectType, Query, Resolver } from 'type-graphql'
import 'reflect-metadata'
import chains from '../../chains'
import config from '../../config'
import assert from 'assert'

@ObjectType()
export class Token {
    @Field(() => String, { nullable: false })
    symbol!: string

    @Field(() => String, { nullable: true })
    decimals!: number | null

    constructor(props: Partial<Token>) {
        Object.assign(this, props)
    }
}

@ObjectType()
export class ChainInfo {
    @Field(() => Number, { nullable: true })
    prefix!: number | null

    @Field(() => String, { nullable: false })
    name!: string

    @Field(() => [Token], { nullable: false })
    tokens!: Token[]

    constructor(props?: Partial<ChainInfo>) {
        Object.assign(this, props)
    }
}

@Resolver()
export class ChainInfoResolver {
    @Query(() => ChainInfo)
    chainInfo(): ChainInfo {
        const info = chains.find((ch) => ch.name === config.chainName)
        assert(info != null)

        return new ChainInfo({
            prefix: info.prefix,
            name: info.name,
            tokens: info.tokens.map(({ symbol, decimals }) => new Token({ symbol, decimals })),
        })
    }
}
