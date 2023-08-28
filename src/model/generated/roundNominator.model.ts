import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, OneToMany as OneToMany_} from "typeorm"
import * as marshal from "./marshal"
import {Round} from "./round.model"
import {RoundNomination} from "./roundNomination.model"
import {Staker} from "./staker.model"

@Entity_()
export class RoundNominator {
  constructor(props?: Partial<RoundNominator>) {
    Object.assign(this, props)
  }

  @PrimaryColumn_()
  id!: string

  @Index_()
  @ManyToOne_(() => Round, {nullable: false})
  round!: Round

  @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
  bond!: bigint

  @OneToMany_(() => RoundNomination, e => e.nominator)
  collators!: RoundNomination[]

  @Column_("int4", {nullable: false})
  collatorsCount!: number

  @Column_("text", {nullable: false})
  stakerId!: string

  @Index_()
  @ManyToOne_(() => Staker, {nullable: false})
  staker!: Staker
}
