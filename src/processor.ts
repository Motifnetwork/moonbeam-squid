import config from './config'
import { SubstrateProcessor } from '@subsquid/substrate-processor'
import { DEFAULT_BATCH_SIZE, DEFAULT_PORT } from './common/consts'
import * as modules from './mappings'
import { TypeormDatabase } from '@subsquid/typeorm-store'

const database = new TypeormDatabase()
const processor = new SubstrateProcessor(database)

processor.setTypesBundle(config.typesBundle)
processor.setBatchSize(config.batchSize || DEFAULT_BATCH_SIZE)
processor.setDataSource(config.dataSource)
processor.setPrometheusPort(config.port || DEFAULT_PORT)
processor.setBlockRange(config.blockRange || { from: 0 })

//events handlers
processor.addEventHandler('ParachainStaking.NewRound', modules.staking.events.handleNewRound)
processor.addEventHandler('ParachainStaking.Rewarded', modules.staking.events.handleRewarded)
processor.addEventHandler('ParachainStaking.Compounded', modules.staking.events.handleCompounded)
processor.addEventHandler('ParachainStaking.CandidateBondedMore', modules.staking.events.handleBondedMore)
processor.addEventHandler('ParachainStaking.CandidateBondedLess', modules.staking.events.handleBondedLess)
processor.addEventHandler('ParachainStaking.Delegation', modules.staking.events.handleDelegation)
processor.addEventHandler('ParachainStaking.DelegationDecreased', modules.staking.events.handleDelegationDecreased)
processor.addEventHandler('ParachainStaking.DelegationIncreased', modules.staking.events.handleDelegationIncreased)
processor.addEventHandler('ParachainStaking.DelegationRevoked', modules.staking.events.handleDelegationRevoked)
processor.addEventHandler('ParachainStaking.DelegatorLeft', modules.staking.events.handleDelegatorLeft)
processor.addEventHandler(
    'ParachainStaking.DelegatorLeftCandidate',
    modules.staking.events.handleDelegatorLeftCandidate
)
processor.addEventHandler('ParachainStaking.CandidateLeft', modules.staking.events.handleCandidateLeft)
processor.addEventHandler(
    'ParachainStaking.JoinedCollatorCandidates',
    modules.staking.events.handleJoinedCollatorCandidates
)

//old events
processor.addEventHandler('ParachainStaking.CollatorBondedMore', modules.staking.events.old.handleCollatorBondedMore)
processor.addEventHandler('ParachainStaking.CollatorBondedLess', modules.staking.events.old.handleCollatorBondedLess)
processor.addEventHandler('ParachainStaking.Nomination', modules.staking.events.old.handleNomination)
processor.addEventHandler('ParachainStaking.NominationDecreased', modules.staking.events.old.handleNominationDecreased)
processor.addEventHandler('ParachainStaking.NominationIncreased', modules.staking.events.old.handleNominationIncreased)
processor.addEventHandler('ParachainStaking.NominatorLeft', modules.staking.events.old.handleNominatorLeft)
processor.addEventHandler(
    'ParachainStaking.NominatorLeftCollator',
    modules.staking.events.old.handleNominatorLeftCandidate
)
processor.addEventHandler('ParachainStaking.CollatorLeft', modules.staking.events.old.handleCollatorLeft)

//extrinsics handlers
processor.addCallHandler('Balances.transfer', modules.balances.extrinsics.handleTransfer)
processor.addCallHandler('Balances.transfer_keep_alive', modules.balances.extrinsics.handleTransferKeepAlive)
processor.addCallHandler('Balances.force_transfer', modules.balances.extrinsics.handleForceTransfer)
processor.addCallHandler('Balances.transfer_all', modules.balances.extrinsics.handleTransferAll)

processor.run()
