import { CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "user_rankings"})
export class userRanking {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @CreateDateColumn()
    created_at: Date
}