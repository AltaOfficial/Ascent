import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "invites"})
export class InviteEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column()
    email: string

    @Column({ type: "char", length: 12 })
    inviteCode: string

    @CreateDateColumn()
    createdAt: Date
}