import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "users"})
export class UserEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column()
    email: string

    @Column()
    password: string // in the future they will be hashes
}